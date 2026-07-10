import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../../components/Icon";
import { RippleButton } from "../../components/RippleButton";
import { FlightSearchPage } from "../../features/cargo/FlightSearchPage";
import { sendPrototypeCommand } from "../../services/prototypeRegistry";
import { SessionRecorder } from "../../services/recorder";
import { adoptInviteFromLocation, encodeSessionResult, findInviteByCode, inviteState, publishPresence, publishSessionSaved, updateInvite } from "../../services/remoteTesting";
import { formatClock, getTests, makeId, prototypeName, saveSession } from "../../services/testingService";
import type { FeedbackAnswers, ParticipantFieldKey, ParticipantInfo, SessionEvent, TaskResult, TestSession, UsabilityTest } from "../../types/testing";
import { StarRating } from "./shared";

type Stage = "invalid" | "welcome" | "consent" | "info" | "instructions" | "prototype" | "feedback" | "done";

const RATING_FIELDS = [
  { key: "overall", label: "Overall Satisfaction" },
  { key: "easeOfUse", label: "Ease of Use" },
  { key: "visualClarity", label: "Visual Clarity" },
  { key: "confidence", label: "Confidence" },
  { key: "taskDifficulty", label: "Task Difficulty" },
] as const;

const INFO_FIELDS: Array<{ key: ParticipantFieldKey; label: string; options?: string[] }> = [
  { key: "name", label: "Your Name" },
  { key: "email", label: "Email" },
  { key: "ageRange", label: "Age Range", options: ["18–24", "25–34", "35–44", "45–54", "55+"] },
  { key: "deviceType", label: "Device Type", options: ["Desktop", "Laptop", "Tablet", "Mobile"] },
  { key: "browser", label: "Browser" },
  { key: "os", label: "Operating System" },
  { key: "experienceLevel", label: "Experience Level", options: ["First time", "Occasional", "Regular", "Expert"] },
];

function detectEnvironment(): Pick<ParticipantInfo, "browser" | "os" | "deviceType"> {
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : /Firefox\//.test(ua) ? "Firefox" : "Other";
  const os = /Mac/.test(ua) ? "macOS" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : "Other";
  const deviceType = /Mobi|Android|iPhone/.test(ua) ? "Mobile" : /iPad|Tablet/.test(ua) ? "Tablet" : "Desktop";
  return { browser, os, deviceType };
}

// The remote participant experience: a distraction-free flow with no QC
// Experience chrome. Welcome → consent → optional info → instructions →
// prototype (one task at a time, auto-recorded) → feedback → completion.
export function ParticipantTestPage({ code }: { code: string }) {
  const invite = useMemo(() => {
    // On another device the invite/test only exist inside the link's payload —
    // adopt them into local storage before resolving the code.
    if (!findInviteByCode(code)) adoptInviteFromLocation(code);
    return findInviteByCode(code);
  }, [code]);
  const test: UsabilityTest | undefined = useMemo(
    () => (invite ? getTests().find((candidate) => candidate.id === invite.testId) : undefined),
    [invite],
  );
  const usable = invite && test && inviteState(invite) === "active" && test.tasks.length > 0;

  const [stage, setStage] = useState<Stage>(usable ? "welcome" : "invalid");
  const [consent, setConsent] = useState(false);
  const [info, setInfo] = useState<ParticipantInfo>(() => detectEnvironment());
  const [taskIndex, setTaskIndex] = useState(0);
  const [taskResults, setTaskResults] = useState<TaskResult[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [ratings, setRatings] = useState({ overall: 0, easeOfUse: 0, visualClarity: 0, confidence: 0, taskDifficulty: 0 });
  const [openAnswers, setOpenAnswers] = useState({ confused: "", workedWell: "", improve: "" });
  const [resultCode, setResultCode] = useState("");
  const [resultCopied, setResultCopied] = useState(false);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const sessionId = useMemo(() => makeId("session"), []);
  const startedAtRef = useRef<string>("");
  const taskStartedAtRef = useRef(0);
  const taskMisclickBaseRef = useRef(0);
  const recorderRef = useRef<SessionRecorder | null>(null);
  const savedRef = useRef(false);

  const enabledFields = INFO_FIELDS.filter((field) => test?.participantFields?.[field.key] ?? false);
  const participantName = () => info.name?.trim() || invite?.participantId || "Remote participant";

  const broadcast = useCallback((currentStage: Stage, recorder?: SessionRecorder | null) => {
    if (!invite || !test) return;
    const snapshot = recorder?.snapshot();
    publishPresence({
      sessionId,
      testId: test.id,
      inviteCode: invite.code,
      participant: participantName(),
      stage: currentStage,
      screen: snapshot?.screen ?? currentStage,
      taskIndex: Math.min(taskIndex, test.tasks.length - 1),
      taskCount: test.tasks.length,
      completedTasks: taskResults.length,
      elapsed: snapshot?.elapsed ?? 0,
      lastEventAt: snapshot?.lastEvent?.at ?? 0,
      lastEventLabel: snapshot?.lastEvent ? `${snapshot.lastEvent.kind}${snapshot.lastEvent.label ? `: ${snapshot.lastEvent.label}` : ""}` : currentStage,
      sentAt: Date.now(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invite, test, sessionId, taskIndex, taskResults.length, info.name]);

  // Presence heartbeat for every stage so researchers see pre-prototype steps too.
  useEffect(() => {
    if (stage === "invalid" || stage === "done") return;
    broadcast(stage, recorderRef.current);
    const interval = window.setInterval(() => broadcast(stage, recorderRef.current), 2000);
    return () => window.clearInterval(interval);
  }, [stage, broadcast]);

  const buildSession = useCallback((completed: boolean, feedback?: FeedbackAnswers): TestSession => {
    const recorder = recorderRef.current;
    const events: SessionEvent[] = recorder ? recorder.allEvents() : [];
    return {
      id: sessionId,
      testId: test?.id ?? "",
      participant: participantName(),
      startedAt: startedAtRef.current || new Date().toISOString(),
      durationSec: recorder?.now() ?? 0,
      completed,
      dropOffScreen: completed ? undefined : recorder?.currentScreen(),
      events,
      notes: [],
      taskResults,
      feedback,
      remote: true,
      inviteCode: invite?.code,
      participantInfo: info,
      idleSec: recorder?.totalIdleSec() ?? 0,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, test, invite, info, taskResults]);

  const persist = useCallback((completed: boolean, feedback?: FeedbackAnswers) => {
    if (savedRef.current || !test || !invite) return;
    savedRef.current = true;
    recorderRef.current?.record({ kind: "session_end", label: completed ? "Completed test" : "Left before completing" });
    const session = buildSession(completed, feedback);
    saveSession(session);
    updateInvite(invite.id, { usedBySessionId: session.id });
    publishSessionSaved(test.id, session.id);
    if (completed) setResultCode(encodeSessionResult(session));
    recorderRef.current?.detach();
  }, [test, invite, buildSession]);

  // Best-effort save if the participant closes the tab mid-test.
  useEffect(() => {
    const handleUnload = () => {
      if (stage === "prototype" || stage === "feedback") persist(false);
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [stage, persist]);

  // Record browser back navigation as a structured event.
  useEffect(() => {
    const onPop = () => recorderRef.current?.record({ kind: "back", label: "Browser back navigation" });
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const startPrototype = () => {
    startedAtRef.current = new Date().toISOString();
    const recorder = new SessionRecorder((event, snapshot) => {
      setElapsed(snapshot.elapsed);
      if (event.kind !== "hover" && event.kind !== "scroll") broadcast("prototype", recorder);
    });
    recorderRef.current = recorder;
    recorder.record({ kind: "session_start", label: "Session started" });
    recorder.record({ kind: "task_start", taskId: test?.tasks[0]?.id, label: test?.tasks[0]?.title });
    setStage("prototype");
    window.setTimeout(() => {
      if (stageRef.current) recorder.attach(stageRef.current);
      sendPrototypeCommand("restart");
    }, 80);
  };

  // UI clock while the prototype is live.
  useEffect(() => {
    if (stage !== "prototype") return;
    const interval = window.setInterval(() => setElapsed(recorderRef.current?.now() ?? 0), 500);
    return () => window.clearInterval(interval);
  }, [stage]);

  const completeTask = () => {
    const recorder = recorderRef.current;
    if (!recorder || !test) return;
    const task = test.tasks[taskIndex];
    const snapshot = recorder.snapshot();
    const result: TaskResult = {
      taskId: task.id,
      success: true,
      timeSec: recorder.now() - taskStartedAtRef.current,
      misclicks: snapshot.misclicks - taskMisclickBaseRef.current,
    };
    recorder.record({ kind: "task_complete", taskId: task.id, label: task.title });
    setTaskResults((current) => [...current, result]);
    taskStartedAtRef.current = recorder.now();
    taskMisclickBaseRef.current = snapshot.misclicks;
    const next = test.tasks[taskIndex + 1];
    if (next) {
      recorder.record({ kind: "task_start", taskId: next.id, label: next.title });
      setTaskIndex(taskIndex + 1);
    } else {
      setStage("feedback");
    }
  };

  const submitFeedback = () => {
    persist(true, {
      overall: ratings.overall,
      easeOfUse: ratings.easeOfUse,
      visualClarity: ratings.visualClarity,
      confidence: ratings.confidence,
      satisfaction: ratings.overall,
      taskDifficulty: ratings.taskDifficulty,
      ...openAnswers,
    });
    setStage("done");
  };

  if (stage === "invalid" || !test || !invite) {
    return (
      <div className="uts-participant">
        <div className="uts-participant-card">
          <span className="uts-participant-glyph muted"><Icon icon="link_off" size={30} /></span>
          <h1>This testing link is not active</h1>
          <p>The link may have expired, been disabled, or already used. Please contact the researcher who sent it to you for a new link.</p>
        </div>
      </div>
    );
  }

  if (stage === "prototype") {
    const task = test.tasks[taskIndex];
    return (
      <div className="uts-live-host">
        <div className="uts-live-stage" ref={stageRef} aria-label="Prototype under test">
          <FlightSearchPage />
        </div>
        <div className="uts-taskbar" role="region" aria-label="Current task">
          <span className="uts-taskbar-step">Task {taskIndex + 1} / {test.tasks.length}</span>
          <div className="uts-taskbar-copy">
            <strong>{task.title}</strong>
            {task.description ? <small>{task.description}</small> : null}
          </div>
          <span className="uts-taskbar-clock">{formatClock(elapsed)}</span>
          <button className="qcx-button primary" onClick={completeTask}>
            <Icon icon="check" size={16} />Mark Completed
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="uts-participant">
      <div className="uts-participant-card">
        {stage === "welcome" ? (
          <>
            <span className="uts-participant-glyph"><Icon icon="waving_hand" size={30} fill /></span>
            <h1>Welcome!</h1>
            <p>You have been invited to try the <strong>{prototypeName(test.prototypeId)}</strong> prototype. Your session helps us make it better — there are no right or wrong answers, and we are testing the design, not you.</p>
            <p className="uts-participant-meta">Scenario: {test.scenario} · About {test.expectedDurationMin} minutes · {test.tasks.length} short tasks</p>
            <RippleButton className="qcx-button primary large" onClick={() => setStage("consent")}>Get Started<Icon icon="arrow_forward" size={18} /></RippleButton>
          </>
        ) : stage === "consent" ? (
          <>
            <span className="uts-participant-glyph"><Icon icon="verified_user" size={30} fill /></span>
            <h1>Before we begin</h1>
            <p>During the session we automatically record your interactions with the prototype — screens visited, clicks and timing. No screen video or audio is captured, and the data is used only for this usability study.</p>
            <label className="uts-consent">
              <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
              <span>I understand and agree that my interactions will be recorded for research purposes.</span>
            </label>
            <RippleButton className="qcx-button primary large" disabled={!consent} onClick={() => setStage(enabledFields.length ? "info" : "instructions")}>
              Continue<Icon icon="arrow_forward" size={18} />
            </RippleButton>
          </>
        ) : stage === "info" ? (
          <>
            <span className="uts-participant-glyph"><Icon icon="badge" size={30} fill /></span>
            <h1>About you</h1>
            <p>All fields are optional — share only what you are comfortable with.</p>
            <div className="uts-participant-form">
              {enabledFields.map((field) => (
                <label key={field.key}>
                  <span>{field.label}</span>
                  {field.options ? (
                    <select value={info[field.key] ?? ""} onChange={(event) => setInfo((current) => ({ ...current, [field.key]: event.target.value }))}>
                      <option value="">Prefer not to say</option>
                      {field.options.map((option) => <option key={option}>{option}</option>)}
                    </select>
                  ) : (
                    <input value={info[field.key] ?? ""} onChange={(event) => setInfo((current) => ({ ...current, [field.key]: event.target.value }))} />
                  )}
                </label>
              ))}
            </div>
            <RippleButton className="qcx-button primary large" onClick={() => setStage("instructions")}>Continue<Icon icon="arrow_forward" size={18} /></RippleButton>
          </>
        ) : stage === "instructions" ? (
          <>
            <span className="uts-participant-glyph"><Icon icon="checklist" size={30} fill /></span>
            <h1>Your tasks</h1>
            <p>You will see one task at a time in a bar at the bottom of the screen. Work at your own pace and press <strong>Mark Completed</strong> when you finish each task.</p>
            <ol className="uts-participant-tasks">
              {test.tasks.map((task, index) => (
                <li key={task.id}><em>{index + 1}</em><span>{task.title}</span></li>
              ))}
            </ol>
            <RippleButton className="qcx-button primary large" onClick={startPrototype}>
              <Icon icon="play_arrow" size={19} fill />Start the Prototype
            </RippleButton>
          </>
        ) : stage === "feedback" ? (
          <>
            <span className="uts-participant-glyph"><Icon icon="reviews" size={30} fill /></span>
            <h1>How was it?</h1>
            <p>All tasks completed in {formatClock(elapsed)} — thank you! A few final questions:</p>
            <div className="uts-rating-grid uts-participant-ratings">
              {RATING_FIELDS.map((field) => (
                <div className="uts-rating-row" key={field.key}>
                  <span>{field.label}</span>
                  <StarRating label={field.label} value={ratings[field.key]} onChange={(value) => setRatings((current) => ({ ...current, [field.key]: value }))} />
                </div>
              ))}
            </div>
            <div className="uts-participant-form">
              <label><span>What confused you?</span><textarea rows={2} value={openAnswers.confused} onChange={(event) => setOpenAnswers((current) => ({ ...current, confused: event.target.value }))} /></label>
              <label><span>What worked well?</span><textarea rows={2} value={openAnswers.workedWell} onChange={(event) => setOpenAnswers((current) => ({ ...current, workedWell: event.target.value }))} /></label>
              <label><span>What would you improve?</span><textarea rows={2} value={openAnswers.improve} onChange={(event) => setOpenAnswers((current) => ({ ...current, improve: event.target.value }))} /></label>
            </div>
            <RippleButton className="qcx-button primary large" disabled={RATING_FIELDS.some((field) => ratings[field.key] === 0)} onClick={submitFeedback}>
              <Icon icon="send" size={17} fill />Submit Feedback
            </RippleButton>
          </>
        ) : (
          <>
            <span className="uts-participant-glyph good"><Icon icon="celebration" size={30} fill /></span>
            <h1>All done — thank you!</h1>
            <p>Your session was recorded successfully and will help the team improve the {prototypeName(test.prototypeId)} experience.</p>
            {resultCode ? (
              <div className="uts-result-code">
                <p><strong>One last step:</strong> send this result code back to the researcher so they can see your session.</p>
                <textarea readOnly rows={3} value={resultCode} onFocus={(event) => event.target.select()} aria-label="Session result code" />
                <RippleButton
                  className="qcx-button primary"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(resultCode);
                      setResultCopied(true);
                    } catch {
                      // Select the textarea so manual copy is one keystroke away.
                      (document.querySelector(".uts-result-code textarea") as HTMLTextAreaElement | null)?.select();
                    }
                  }}
                >
                  <Icon icon={resultCopied ? "check" : "content_copy"} size={16} />{resultCopied ? "Copied" : "Copy Result Code"}
                </RippleButton>
              </div>
            ) : null}
            <p>You can now close this tab.</p>
          </>
        )}
        <footer className="uts-participant-foot">Powered by QC Experience · User Testing Studio</footer>
      </div>
    </div>
  );
}
