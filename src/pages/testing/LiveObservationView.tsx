import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../../components/Icon";
import { RippleButton } from "../../components/RippleButton";
import { FlightSearchPage } from "../../features/cargo/FlightSearchPage";
import { sendPrototypeCommand } from "../../services/prototypeRegistry";
import { formatClock, makeId } from "../../services/testingService";
import type { FeedbackAnswers, ResearchNote, SessionEvent, TaskResult, TestSession, UsabilityTest } from "../../types/testing";
import { StarRating } from "./shared";

const RATING_FIELDS: Array<{ key: keyof Pick<FeedbackAnswers, "overall" | "easeOfUse" | "visualClarity" | "confidence" | "satisfaction">; label: string }> = [
  { key: "overall", label: "Overall Experience" },
  { key: "easeOfUse", label: "Ease of Use" },
  { key: "visualClarity", label: "Visual Clarity" },
  { key: "confidence", label: "Confidence" },
  { key: "satisfaction", label: "Satisfaction" },
];

// A click counts as a misclick when it lands on nothing interactive: no native
// control, Takeoff web component, ARIA role or pointer-cursor styling upstream.
function isInteractive(start: Element | null): boolean {
  const roles = new Set(["button", "tab", "option", "link", "checkbox", "radio", "menuitem", "switch", "combobox", "row", "gridcell", "listbox"]);
  for (let el: Element | null = start; el && el !== document.body; el = el.parentElement) {
    if (el.tagName.startsWith("TK-")) return true;
    if (["BUTTON", "A", "INPUT", "SELECT", "TEXTAREA", "LABEL", "SUMMARY"].includes(el.tagName)) return true;
    const role = el.getAttribute("role");
    if (role && roles.has(role)) return true;
    if (el.hasAttribute("tabindex")) return true;
    if (el instanceof HTMLElement && window.getComputedStyle(el).cursor === "pointer") return true;
  }
  return false;
}

function labelFor(target: Element): string | undefined {
  const source = target.closest("button, a, [role], tk-button, label") ?? target;
  const text = (source.getAttribute?.("aria-label") || source.textContent || "").trim().replace(/\s+/g, " ");
  return text ? text.slice(0, 48) : undefined;
}

// Hosts the real Passenger Check-in prototype full-screen while recording the
// participant's actual clicks, misclicks and screen transitions. The moderator
// marks tasks done/failed and takes timestamped notes from the side panel.
export function LiveObservationView({ test, onFinish, onCancel }: { test: UsabilityTest; onFinish: (session: TestSession) => void; onCancel: () => void }) {
  const startMs = useMemo(() => Date.now(), []);
  const startedAt = useMemo(() => new Date(startMs).toISOString(), [startMs]);
  const now = useCallback(() => Math.floor((Date.now() - startMs) / 1000), [startMs]);

  const [participant, setParticipant] = useState("");
  const [phase, setPhase] = useState<"setup" | "running" | "feedback">("setup");
  const [elapsed, setElapsed] = useState(0);
  const [events, setEvents] = useState<SessionEvent[]>([]);
  const [taskResults, setTaskResults] = useState<TaskResult[]>([]);
  const [taskIndex, setTaskIndex] = useState(0);
  const [taskStartedAt, setTaskStartedAt] = useState(0);
  const [taskMisclicks, setTaskMisclicks] = useState(0);
  const [notes, setNotes] = useState<ResearchNote[]>([]);
  const [noteDraft, setNoteDraft] = useState("");
  const [panelOpen, setPanelOpen] = useState(true);
  const [ratings, setRatings] = useState({ overall: 0, easeOfUse: 0, visualClarity: 0, confidence: 0, satisfaction: 0 });
  const [openAnswers, setOpenAnswers] = useState({ confused: "", workedWell: "", improve: "" });

  const stageRef = useRef<HTMLDivElement | null>(null);
  const screenRef = useRef("Flight Overview");
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const stateRef = useRef({ events, taskResults, taskIndex, notes });
  stateRef.current = { events, taskResults, taskIndex, notes };

  // The platform shell is responsive; the prototype needs its fixed canvas.
  useEffect(() => {
    document.documentElement.classList.remove("qcx-mode");
    return () => document.documentElement.classList.add("qcx-mode");
  }, []);

  // Wall-clock session timer (immune to background-tab throttling).
  useEffect(() => {
    if (phase !== "running") return;
    const interval = window.setInterval(() => setElapsed(now()), 500);
    return () => window.clearInterval(interval);
  }, [phase, now]);

  // Real screen transitions, announced by the prototype via qcx-screen.
  useEffect(() => {
    const handleScreen = (event: Event) => {
      const screen = (event as CustomEvent<{ screen: string }>).detail?.screen;
      if (!screen || screen === screenRef.current) return;
      screenRef.current = screen;
      if (phaseRef.current !== "running") return;
      setEvents((current) => [...current, { at: now(), kind: "screen", screen }]);
    };
    window.addEventListener("qcx-screen", handleScreen);
    return () => window.removeEventListener("qcx-screen", handleScreen);
  }, [now]);

  // Real click capture on the prototype stage only (capture phase, so clicks
  // swallowed by components are still recorded).
  useEffect(() => {
    const node = stageRef.current;
    if (!node || phase !== "running") return;
    const handlePointer = (pointerEvent: PointerEvent) => {
      const target = pointerEvent.target as Element | null;
      if (!target) return;
      const interactive = isInteractive(target);
      setEvents((current) => [
        ...current,
        { at: now(), kind: interactive ? "click" : "misclick", screen: screenRef.current, label: interactive ? labelFor(target) : "Missed target" },
      ]);
      if (!interactive) setTaskMisclicks((count) => count + 1);
    };
    node.addEventListener("pointerdown", handlePointer, true);
    return () => node.removeEventListener("pointerdown", handlePointer, true);
  }, [phase, now]);

  const startSession = () => {
    sendPrototypeCommand("restart");
    setEvents([
      { at: 0, kind: "screen", screen: screenRef.current },
      { at: 0, kind: "task_start", screen: screenRef.current, taskId: test.tasks[0]?.id, label: test.tasks[0]?.title },
    ]);
    setTaskStartedAt(0);
    setPhase("running");
  };

  const finishTask = (success: boolean) => {
    const task = test.tasks[taskIndex];
    if (!task) return;
    const at = now();
    const result: TaskResult = { taskId: task.id, success, timeSec: at - taskStartedAt, misclicks: taskMisclicks };
    const nextTask = test.tasks[taskIndex + 1];
    setEvents((current) => {
      const next: SessionEvent[] = [...current, { at, kind: success ? "task_complete" : "task_fail", screen: screenRef.current, taskId: task.id, label: task.title }];
      if (nextTask) next.push({ at, kind: "task_start", screen: screenRef.current, taskId: nextTask.id, label: nextTask.title });
      return next;
    });
    setTaskResults((current) => [...current, result]);
    setTaskMisclicks(0);
    setTaskStartedAt(at);
    if (nextTask) {
      setTaskIndex(taskIndex + 1);
    } else {
      setPhase("feedback");
    }
  };

  const addNote = () => {
    const text = noteDraft.trim();
    if (!text) return;
    setNotes((current) => [...current, { id: makeId("note"), at: now(), text }]);
    setNoteDraft("");
  };

  const buildSession = (completed: boolean, feedback?: FeedbackAnswers): TestSession => {
    const state = stateRef.current;
    return {
      id: makeId("session"),
      testId: test.id,
      participant: participant.trim() || "Anonymous participant",
      startedAt,
      durationSec: now(),
      completed,
      dropOffScreen: completed ? undefined : screenRef.current,
      events: state.events,
      notes: state.notes,
      taskResults: state.taskResults,
      feedback,
    };
  };

  const currentTask = test.tasks[taskIndex];
  const clicks = events.filter((event) => event.kind === "click" || event.kind === "misclick").length;
  const misclicks = events.filter((event) => event.kind === "misclick").length;
  const navigationHistory = events.filter((event) => event.kind === "screen");
  const lastScreenAt = navigationHistory[navigationHistory.length - 1]?.at ?? 0;
  const doneCount = taskResults.length;
  const feedbackValid = RATING_FIELDS.every((field) => ratings[field.key] > 0);

  if (phase === "setup") {
    return (
      <div className="qcx-page-inner uts-studio">
        <header className="qcx-page-head">
          <div>
            <h1>Start Live Session</h1>
            <p>{test.name} · The participant will use the real prototype; every click and screen change is recorded.</p>
          </div>
          <button className="qcx-button ghost" onClick={onCancel}><Icon icon="arrow_back" size={17} />Back</button>
        </header>
        <form
          className="qcx-card uts-setup-card"
          onSubmit={(event) => { event.preventDefault(); startSession(); }}
        >
          <div className="qcx-form-grid">
            <label className="span-2">
              <span>Participant Name</span>
              <input value={participant} onChange={(event) => setParticipant(event.target.value)} placeholder="e.g. Deniz Kaya" autoFocus />
            </label>
          </div>
          <div className="uts-setup-tasks">
            <strong>Tasks the participant will attempt</strong>
            <ol>
              {test.tasks.map((task) => (
                <li key={task.id}>{task.title}{task.timeLimitSec ? <em> · limit {formatClock(task.timeLimitSec)}</em> : null}</li>
              ))}
            </ol>
          </div>
          <footer className="qcx-form-actions">
            <RippleButton type="submit" className="qcx-button primary large">
              <Icon icon="sensors" size={18} fill />Launch Prototype &amp; Start Recording
            </RippleButton>
          </footer>
        </form>
      </div>
    );
  }

  return (
    <div className="uts-live-host">
      <div className="uts-live-stage" ref={stageRef} aria-label="Prototype under test">
        <FlightSearchPage />
      </div>

      {phase === "feedback" ? (
        <div className="uts-feedback-overlay" role="dialog" aria-label="Participant feedback">
          <form
            className="qcx-card uts-feedback-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (!feedbackValid) return;
              onFinish(buildSession(true, { ...ratings, ...openAnswers }));
            }}
          >
            <header>
              <h2>Participant Feedback</h2>
              <p>{participant.trim() || "The participant"} finished all tasks in {formatClock(elapsed)}.</p>
            </header>
            <div className="uts-rating-grid">
              {RATING_FIELDS.map((field) => (
                <div className="uts-rating-row" key={field.key}>
                  <span>{field.label}</span>
                  <StarRating label={field.label} value={ratings[field.key]} onChange={(value) => setRatings((current) => ({ ...current, [field.key]: value }))} />
                </div>
              ))}
            </div>
            <div className="qcx-form-grid uts-open-questions">
              <label className="span-2">
                <span>What confused you?</span>
                <textarea rows={2} value={openAnswers.confused} onChange={(event) => setOpenAnswers((current) => ({ ...current, confused: event.target.value }))} />
              </label>
              <label className="span-2">
                <span>What worked well?</span>
                <textarea rows={2} value={openAnswers.workedWell} onChange={(event) => setOpenAnswers((current) => ({ ...current, workedWell: event.target.value }))} />
              </label>
              <label className="span-2">
                <span>What would you improve?</span>
                <textarea rows={2} value={openAnswers.improve} onChange={(event) => setOpenAnswers((current) => ({ ...current, improve: event.target.value }))} />
              </label>
            </div>
            <footer className="qcx-form-actions">
              <RippleButton type="submit" className="qcx-button primary" disabled={!feedbackValid}>
                <Icon icon="check_circle" size={17} fill />Submit &amp; Save Session
              </RippleButton>
            </footer>
          </form>
        </div>
      ) : null}

      <aside className={`uts-observer ${panelOpen ? "" : "collapsed"}`} aria-label="Live observation panel">
        {panelOpen ? (
          <>
            <header className="uts-observer-head">
              <span className="uts-live-dot" aria-hidden="true" />
              <div>
                <strong>Live Observation</strong>
                <small>{test.name} · {participant.trim() || "Anonymous"}</small>
              </div>
              <span className="uts-clock uts-observer-clock">{formatClock(elapsed)}</span>
              <button className="qcx-icon-button" aria-label="Collapse panel" onClick={() => setPanelOpen(false)}><Icon icon="right_panel_close" size={18} /></button>
            </header>

            <div className="uts-observer-kpis">
              <div><small>Current Screen</small><strong>{screenRef.current}</strong></div>
              <div><small>Time on Screen</small><strong>{formatClock(Math.max(0, elapsed - lastScreenAt))}</strong></div>
              <div><small>Clicks</small><strong>{clicks}</strong></div>
              <div><small>Misclicks</small><strong className={misclicks ? "uts-warn" : ""}>{misclicks}</strong></div>
            </div>

            <div className="uts-live-task">
              <small>Current Task ({doneCount + (currentTask ? 1 : 0)}/{test.tasks.length})</small>
              {currentTask ? (
                <>
                  <strong>{taskIndex + 1}. {currentTask.title}</strong>
                  {currentTask.description ? <p>{currentTask.description}</p> : null}
                  {currentTask.expectedOutcome || currentTask.successCriteria ? (
                    <div className="uts-criteria">
                      {currentTask.expectedOutcome ? <p><Icon icon="flag" size={13} /> <strong>Expected:</strong> {currentTask.expectedOutcome}</p> : null}
                      {currentTask.successCriteria ? <p><Icon icon="rule" size={13} /> <strong>Success if:</strong> {currentTask.successCriteria}</p> : null}
                    </div>
                  ) : null}
                  {currentTask.timeLimitSec ? (
                    <span className="uts-track">
                      <span
                        className={`uts-fill ${elapsed - taskStartedAt > currentTask.timeLimitSec ? "red" : "blue"}`}
                        style={{ width: `${Math.min(100, ((elapsed - taskStartedAt) / currentTask.timeLimitSec) * 100)}%` }}
                      />
                    </span>
                  ) : null}
                  {currentTask.timeLimitSec && elapsed - taskStartedAt > currentTask.timeLimitSec ? (
                    <p className="uts-overtime"><Icon icon="warning" size={13} fill /> Time limit exceeded ({formatClock(elapsed - taskStartedAt)} / {formatClock(currentTask.timeLimitSec)}) — counts against the success criteria.</p>
                  ) : null}
                  <div className="uts-task-verdict">
                    <button className="qcx-button primary" onClick={() => finishTask(true)}><Icon icon="check" size={16} />Task Done</button>
                    <button className="qcx-button ghost" onClick={() => finishTask(false)}><Icon icon="close" size={16} />Failed</button>
                  </div>
                </>
              ) : null}
            </div>

            <div className="uts-observer-tasks">
              {test.tasks.map((task, index) => {
                const result = taskResults.find((candidate) => candidate.taskId === task.id);
                const current = index === taskIndex && !result;
                return (
                  <div key={task.id} className={`uts-observer-task ${result ? (result.success ? "done" : "failed") : current ? "current" : ""}`}>
                    <Icon icon={result ? (result.success ? "check_circle" : "cancel") : current ? "radio_button_checked" : "radio_button_unchecked"} size={15} fill={Boolean(result)} />
                    <span>{task.title}</span>
                    {result ? <em>{formatClock(result.timeSec)}</em> : null}
                  </div>
                );
              })}
            </div>

            <div className="uts-observer-notes">
              <small>Research Notes</small>
              <div className="uts-notes-list">
                {[...notes].reverse().map((note) => (
                  <div className="uts-note" key={note.id}><em>{formatClock(note.at)}</em><span>{note.text}</span></div>
                ))}
              </div>
              <div className="uts-note-input">
                <input
                  value={noteDraft}
                  placeholder={`Observation at ${formatClock(elapsed)}...`}
                  onChange={(event) => setNoteDraft(event.target.value)}
                  onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addNote(); } }}
                />
                <button className="qcx-icon-button" aria-label="Add note" onClick={addNote} disabled={!noteDraft.trim()}><Icon icon="add" size={18} /></button>
              </div>
            </div>

            <div className="uts-observer-history">
              <small>Navigation History</small>
              <ol className="uts-nav-history">
                {[...navigationHistory].reverse().slice(0, 6).map((event, index) => (
                  <li key={`${event.at}-${index}`} className={index === 0 ? "current" : ""}>
                    <em>{formatClock(event.at)}</em>
                    <span>{event.screen}</span>
                  </li>
                ))}
              </ol>
            </div>

            <footer className="uts-observer-foot">
              <button className="qcx-button ghost" onClick={onCancel}><Icon icon="delete" size={16} />Discard</button>
              <button className="qcx-button primary" onClick={() => onFinish(buildSession(false))}><Icon icon="stop_circle" size={16} fill />End Early</button>
            </footer>
          </>
        ) : (
          <button className="uts-observer-pill" onClick={() => setPanelOpen(true)} aria-label="Show observation panel">
            <span className="uts-live-dot" aria-hidden="true" />
            <span className="uts-clock">{formatClock(elapsed)}</span>
            <Icon icon="right_panel_open" size={17} />
          </button>
        )}
      </aside>
    </div>
  );
}
