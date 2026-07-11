import { useEffect, useMemo, useState } from "react";
import { Icon } from "../../components/Icon";
import { decodeSessionResult } from "../../services/remoteTesting";
import { computeAnalytics, exportCsv, exportPdf, formatClock, prototypeName } from "../../services/testingService";
import type { TestSession, UsabilityTest } from "../../types/testing";
import { TEST_TYPE_LABELS } from "../../types/testing";
import { InviteManager } from "./InviteManager";
import { LiveBoard, useLiveParticipants } from "./LiveBoard";
import { SessionTimeline } from "./SessionTimeline";
import { MetricBar, StarRating, TestStatusBadge } from "./shared";

const EVENT_META: Record<string, { icon: string; label: string }> = {
  screen: { icon: "swap_horiz", label: "Navigated to" },
  click: { icon: "ads_click", label: "Click on" },
  misclick: { icon: "error", label: "Misclick on" },
  hover: { icon: "front_hand", label: "Hovered on" },
  scroll: { icon: "swipe_vertical", label: "Scrolled on" },
  input: { icon: "keyboard", label: "Filled a field on" },
  idle: { icon: "hourglass_empty", label: "Idle on" },
  back: { icon: "undo", label: "Back navigation on" },
  task_start: { icon: "flag", label: "Started task" },
  task_complete: { icon: "check_circle", label: "Completed task" },
  task_fail: { icon: "cancel", label: "Failed task" },
  session_start: { icon: "flag_circle", label: "Session started on" },
  session_end: { icon: "sports_score", label: "Session ended on" },
};

function SessionReplay({ session }: { session: TestSession }) {
  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    setPlayhead(0);
    setPlaying(false);
    setSpeed(1);
  }, [session.id]);

  useEffect(() => {
    if (!playing) return;
    const interval = window.setInterval(() => {
      setPlayhead((current) => {
        if (current >= session.durationSec) {
          setPlaying(false);
          return session.durationSec;
        }
        return current + speed;
      });
    }, 250);
    return () => window.clearInterval(interval);
  }, [playing, session.durationSec, speed]);

  const visibleEvents = session.events.filter((event) => event.at <= playhead);
  const screenEvents = visibleEvents.filter((event) => event.kind === "screen");
  const currentScreen = screenEvents[screenEvents.length - 1]?.screen ?? "—";
  const currentScreenSince = screenEvents[screenEvents.length - 1]?.at ?? 0;
  const clicks = visibleEvents.filter((event) => event.kind === "click" || event.kind === "misclick").length;
  const misclicks = visibleEvents.filter((event) => event.kind === "misclick").length;
  const allTaskEvents = session.events.filter((event) => event.kind === "task_start" || event.kind === "task_complete" || event.kind === "task_fail");

  return (
    <div className="uts-replay">
      <div className="uts-replay-stage">
        <div className="uts-replay-screen">
          <Icon icon="web_asset" size={22} />
          <strong>{currentScreen}</strong>
          <small>on screen for {formatClock(playhead - currentScreenSince)}</small>
        </div>
        <div className="uts-replay-counters">
          <span><Icon icon="timer" size={14} />{formatClock(playhead)} / {formatClock(session.durationSec)}</span>
          <span><Icon icon="ads_click" size={14} />{clicks} clicks</span>
          <span className={misclicks ? "uts-warn" : ""}><Icon icon="error" size={14} />{misclicks} misclicks</span>
        </div>
      </div>
      <div className="uts-replay-controls">
        <button className="qcx-icon-button" aria-label={playing ? "Pause replay" : "Play replay"} onClick={() => setPlaying((current) => (playhead >= session.durationSec ? (setPlayhead(0), true) : !current))}>
          <Icon icon={playing ? "pause" : "play_arrow"} size={22} fill />
        </button>
        <input
          type="range"
          min={0}
          max={session.durationSec}
          value={playhead}
          aria-label="Replay timeline"
          onChange={(event) => { setPlaying(false); setPlayhead(Number(event.target.value)); }}
        />
        <select className="uts-speed-select" aria-label="Playback speed" value={speed} onChange={(event) => setSpeed(Number(event.target.value))}>
          {[1, 2, 4, 8].map((option) => <option key={option} value={option}>{option}×</option>)}
        </select>
        <button className="qcx-icon-button" aria-label="Restart replay" onClick={() => { setPlayhead(0); setPlaying(true); }}><Icon icon="restart_alt" size={19} /></button>
      </div>
      {allTaskEvents.length > 0 ? (
        <div className="uts-replay-jump">
          <small>Jump to event</small>
          <div className="uts-replay-jump-row">
            {allTaskEvents.map((event, index) => (
              <button key={`${event.at}-${index}`} className="qcx-chip" onClick={() => { setPlaying(false); setPlayhead(event.at); }}>
                {formatClock(event.at)} · {event.kind === "task_start" ? "Start" : event.kind === "task_complete" ? "Done" : "Failed"}: {event.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <ol className="uts-event-log">
        {[...visibleEvents].reverse().slice(0, 12).map((event, index) => {
          const meta = EVENT_META[event.kind];
          return (
            <li key={`${event.at}-${event.kind}-${index}`} className={`kind-${event.kind}`}>
              <em>{formatClock(event.at)}</em>
              <Icon icon={meta.icon} size={14} fill={event.kind === "task_complete" || event.kind === "task_fail"} />
              <span>{meta.label} {event.kind.startsWith("task") ? `“${event.label}”` : event.screen}</span>
            </li>
          );
        })}
        {visibleEvents.length === 0 ? <li className="muted">Press play to replay the session.</li> : null}
      </ol>
    </div>
  );
}

export function TestDetailView({ test, sessions, onBack, onGoLive, onImport }: { test: UsabilityTest; sessions: TestSession[]; onBack: () => void; onGoLive: () => void; onImport: (session: TestSession) => void }) {
  const analytics = useMemo(() => computeAnalytics(test, sessions), [test, sessions]);
  const sorted = useMemo(() => [...sessions].sort((a, b) => b.startedAt.localeCompare(a.startedAt)), [sessions]);
  const [selectedId, setSelectedId] = useState<string | null>(sorted[0]?.id ?? null);
  const [detailTab, setDetailTab] = useState<"replay" | "timeline">("replay");
  const selected = sorted.find((session) => session.id === selectedId) ?? sorted[0];
  const hardestTask = test.tasks.find((task) => task.id === analytics.hardestTaskId);
  const maxScreenTime = Math.max(1, ...analytics.screenStats.map((entry) => entry.totalTimeSec));
  const liveParticipants = useLiveParticipants(test.id);
  const [importing, setImporting] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");

  const runImport = () => {
    const session = decodeSessionResult(importText);
    if (!session) {
      setImportError("That doesn't look like a valid result code — check that the whole code was pasted.");
      return;
    }
    if (session.testId !== test.id) {
      setImportError("This result code belongs to a different usability test.");
      return;
    }
    onImport(session);
    setImporting(false);
    setImportText("");
    setImportError("");
  };

  return (
    <>
      <header className="qcx-page-head">
        <div>
          <h1>{test.name} <TestStatusBadge status={test.status} /></h1>
          <p>{prototypeName(test.prototypeId)} · {TEST_TYPE_LABELS[test.type]} · Moderator {test.moderator} · Scenario: {test.scenario}</p>
        </div>
        <div className="uts-live-actions">
          <button className="qcx-button ghost" onClick={onBack}><Icon icon="arrow_back" size={17} />Studio</button>
          {test.status !== "completed" && test.tasks.length > 0 ? (
            <button className="qcx-button ghost" onClick={onGoLive}><Icon icon="sensors" size={17} />Run Session</button>
          ) : null}
          <button className="qcx-button ghost" onClick={() => { setImporting((current) => !current); setImportError(""); }}><Icon icon="upload" size={17} />Import Session</button>
          <button className="qcx-button ghost" onClick={() => exportCsv(test, sorted, analytics)}><Icon icon="download" size={17} />Export CSV</button>
          <button className="qcx-button primary" onClick={() => exportPdf(test, sorted, analytics)}><Icon icon="picture_as_pdf" size={17} />Export PDF</button>
        </div>
      </header>

      {importing ? (
        <section className="qcx-card uts-import-panel" aria-label="Import a remote session">
          <div className="qcx-section-head" style={{ marginBottom: 0 }}>
            <h2>Import Remote Session</h2>
          </div>
          <p className="muted">Paste the result code the participant received on their completion screen. Their full session — events, task results and feedback — will appear in the results below.</p>
          <textarea rows={3} value={importText} onChange={(event) => { setImportText(event.target.value); setImportError(""); }} placeholder="Paste result code…" aria-label="Result code" />
          {importError ? <p className="uts-import-error" role="alert">{importError}</p> : null}
          <div className="uts-live-actions">
            <button className="qcx-button ghost" onClick={() => { setImporting(false); setImportText(""); setImportError(""); }}>Cancel</button>
            <button className="qcx-button primary" disabled={!importText.trim()} onClick={runImport}><Icon icon="download_done" size={17} />Import</button>
          </div>
        </section>
      ) : null}

      <InviteManager test={test} live={liveParticipants} />

      <section aria-label="Live research dashboard">
        <div className="qcx-section-head">
          <h2>Live Research Dashboard</h2>
          <span>{liveParticipants.length} active now</span>
        </div>
        <LiveBoard participants={liveParticipants} />
      </section>

      <section className="qcx-hero-stats uts-stats" aria-label="Test analytics">
        {[
          { icon: "groups", label: "Participants", value: `${analytics.sessionCount}/${test.participantTarget}` },
          { icon: "military_tech", label: "Success Rate", value: `${analytics.successRate}%`, tone: analytics.successRate >= 70 ? "good" : undefined },
          { icon: "timer", label: "Avg Completion Time", value: formatClock(analytics.avgDurationSec) },
          { icon: "trending_down", label: "Drop-off Rate", value: `${analytics.dropOffRate}%` },
          { icon: "ads_click", label: "Avg Click Count", value: String(analytics.avgClicks) },
          { icon: "error", label: "Avg Errors", value: String(analytics.avgErrors) },
          { icon: "report", label: "Misclick Rate", value: `${analytics.misclickRate}%` },
          { icon: "route", label: "Navigation Efficiency", value: `${analytics.navigationEfficiency}%`, tone: analytics.navigationEfficiency >= 70 ? "good" : undefined },
          { icon: "hourglass_top", label: "Avg Time / Screen", value: formatClock(analytics.avgTimePerScreenSec) },
          { icon: "sentiment_satisfied", label: "Satisfaction", value: analytics.avgSatisfaction ? `${analytics.avgSatisfaction}/5` : "—" },
        ].map((stat) => (
          <div className="qcx-stat" key={stat.label}>
            <span className={`qcx-stat-icon ${stat.tone ?? ""}`}><Icon icon={stat.icon} size={18} fill /></span>
            <div><small>{stat.label}</small><strong>{stat.value}</strong></div>
          </div>
        ))}
      </section>

      {analytics.sessionCount === 0 ? (
        <div className="qcx-empty">
          <Icon icon="sensors" size={28} />
          <strong>No sessions recorded yet</strong>
          <p>Share a remote testing link or run a moderated session to start collecting interaction data for this test.</p>
        </div>
      ) : (
        <>
          <div className="uts-analytics-grid">
            <section className="qcx-card" aria-label="Task results">
              <h3 className="uts-card-title"><Icon icon="checklist" size={18} /> Task Results</h3>
              {analytics.taskStats.map((entry, index) => {
                const task = test.tasks.find((candidate) => candidate.id === entry.taskId);
                const rate = entry.attempts ? Math.round((entry.successes / entry.attempts) * 100) : 0;
                const isHardest = entry.taskId === analytics.hardestTaskId;
                return (
                  <div className={`uts-task-result ${isHardest ? "hardest" : ""}`} key={entry.taskId}>
                    <div className="uts-task-result-head">
                      <strong>{index + 1}. {task?.title ?? entry.taskId}</strong>
                      {isHardest ? <em className="qcx-status qcx-status-draft">Most Difficult Step</em> : null}
                    </div>
                    {task?.successCriteria || task?.timeLimitSec ? (
                      <small className="uts-task-criteria">
                        <Icon icon="rule" size={12} /> Evaluated against: {task?.successCriteria || "moderator judgement"}{task?.timeLimitSec ? ` · time limit ${formatClock(task.timeLimitSec)}` : ""}
                      </small>
                    ) : null}
                    {task?.conditionScript ? (
                      <small className="uts-task-criteria">
                        <Icon icon="automation" size={12} /> Auto-tracked: <code className="uts-task-script">{task.conditionScript.split("\n").join(" ")}</code>
                      </small>
                    ) : null}
                    <MetricBar label={`${entry.successes}/${entry.attempts} succeeded · avg ${formatClock(entry.avgTimeSec)} · ${entry.avgMisclicks} misclicks`} value={rate} tone={rate >= 70 ? "green" : rate >= 40 ? "amber" : "red"} />
                  </div>
                );
              })}
            </section>

            <section className="qcx-card" aria-label="Screen heat ranking">
              <h3 className="uts-card-title"><Icon icon="local_fire_department" size={18} /> Screen Heat Ranking</h3>
              {analytics.screenStats.map((entry) => (
                <div className="uts-heat-row" key={entry.screen}>
                  <div className="uts-heat-label">
                    <span>{entry.screen}</span>
                    <small>{formatClock(Math.round(entry.totalTimeSec / Math.max(1, analytics.sessionCount)))} avg · {entry.clicks} clicks · {entry.misclicks} misclicks{entry.abandons ? ` · ${entry.abandons} abandoned` : ""}</small>
                  </div>
                  <span className="uts-track"><span className={`uts-fill ${entry.screen === analytics.mostAbandonedScreen ? "red" : "amber"}`} style={{ width: `${(entry.totalTimeSec / maxScreenTime) * 100}%` }} /></span>
                </div>
              ))}
              <div className="uts-analytics-callouts">
                {hardestTask ? <p><Icon icon="report" size={15} /> Most difficult step: <strong>{hardestTask.title}</strong></p> : null}
                {analytics.mostAbandonedScreen ? <p><Icon icon="logout" size={15} /> Most abandoned screen: <strong>{analytics.mostAbandonedScreen}</strong></p> : null}
              </div>
            </section>
          </div>

          <section aria-label="Session recordings">
            <div className="qcx-section-head">
              <h2>Session Recording &amp; Replay</h2>
              <span>{sorted.length} sessions</span>
            </div>
            <div className="uts-replay-grid">
              <div className="uts-session-list" role="listbox" aria-label="Recorded sessions">
                {sorted.map((session) => (
                  <button
                    key={session.id}
                    role="option"
                    aria-selected={session.id === selected?.id}
                    className={`uts-session-row ${session.id === selected?.id ? "active" : ""}`}
                    onClick={() => setSelectedId(session.id)}
                  >
                    <span className="qcx-avatar uts-avatar-sm">{session.participant.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span>
                    <span className="uts-session-copy">
                      <strong>{session.participant}{session.remote ? <em className="uts-remote-pill">Remote</em> : null}</strong>
                      <small>{new Date(session.startedAt).toLocaleString()} · {formatClock(session.durationSec)}</small>
                    </span>
                    <em className={`qcx-status ${session.completed ? "qcx-status-ready" : "qcx-status-draft"}`}>{session.completed ? "Completed" : "Dropped"}</em>
                  </button>
                ))}
              </div>
              {selected ? (
                <div className="qcx-card uts-replay-card">
                  <div className="uts-detail-tabs" role="tablist">
                    <button role="tab" aria-selected={detailTab === "replay"} className={detailTab === "replay" ? "active" : ""} onClick={() => setDetailTab("replay")}><Icon icon="smart_display" size={15} />Replay</button>
                    <button role="tab" aria-selected={detailTab === "timeline"} className={detailTab === "timeline" ? "active" : ""} onClick={() => setDetailTab("timeline")}><Icon icon="timeline" size={15} />Timeline</button>
                  </div>
                  {detailTab === "replay" ? <SessionReplay session={selected} /> : <SessionTimeline session={selected} />}
                  {selected.participantInfo && Object.values(selected.participantInfo).some(Boolean) ? (
                    <div className="uts-participant-chips">
                      {selected.participantInfo.email ? <span><Icon icon="mail" size={13} />{selected.participantInfo.email}</span> : null}
                      {selected.participantInfo.ageRange ? <span><Icon icon="cake" size={13} />{selected.participantInfo.ageRange}</span> : null}
                      {selected.participantInfo.deviceType ? <span><Icon icon="devices" size={13} />{selected.participantInfo.deviceType}</span> : null}
                      {selected.participantInfo.browser ? <span><Icon icon="public" size={13} />{selected.participantInfo.browser}</span> : null}
                      {selected.participantInfo.os ? <span><Icon icon="dns" size={13} />{selected.participantInfo.os}</span> : null}
                      {selected.participantInfo.experienceLevel ? <span><Icon icon="school" size={13} />{selected.participantInfo.experienceLevel}</span> : null}
                      {selected.idleSec ? <span><Icon icon="hourglass_empty" size={13} />{formatClock(selected.idleSec)} idle</span> : null}
                    </div>
                  ) : null}
                  <div className="uts-session-extra">
                    <div>
                      <h4><Icon icon="edit_note" size={16} /> Research Notes</h4>
                      {selected.notes.length === 0 ? <p className="muted">No notes for this session.</p> : selected.notes.map((note) => (
                        <div className="uts-note" key={note.id}><em>{formatClock(note.at)}</em><span>{note.text}</span></div>
                      ))}
                    </div>
                    <div>
                      <h4><Icon icon="reviews" size={16} /> Feedback</h4>
                      {selected.feedback ? (
                        <div className="uts-session-feedback">
                          {[
                            ["Overall", selected.feedback.overall],
                            ["Ease of Use", selected.feedback.easeOfUse],
                            ["Visual Clarity", selected.feedback.visualClarity],
                            ["Confidence", selected.feedback.confidence],
                            ["Task Difficulty", selected.feedback.taskDifficulty ?? selected.feedback.satisfaction],
                          ].map(([label, value]) => (
                            <div className="uts-rating-row compact" key={label as string}><span>{label}</span><StarRating value={value as number} /></div>
                          ))}
                          {selected.feedback.confused ? <p><strong>Confused:</strong> {selected.feedback.confused}</p> : null}
                          {selected.feedback.workedWell ? <p><strong>Worked well:</strong> {selected.feedback.workedWell}</p> : null}
                          {selected.feedback.improve ? <p><strong>Improve:</strong> {selected.feedback.improve}</p> : null}
                        </div>
                      ) : (
                        <p className="muted">Session ended before the feedback form{selected.dropOffScreen ? ` — dropped on ${selected.dropOffScreen}` : ""}.</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        </>
      )}
    </>
  );
}
