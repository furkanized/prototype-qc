import { useEffect, useState } from "react";
import { Icon } from "../../components/Icon";
import { PRESENCE_TIMEOUT_MS, subscribeLive } from "../../services/remoteTesting";
import { formatClock } from "../../services/testingService";
import type { LiveParticipantStatus } from "../../types/testing";

const STAGE_LABEL: Record<string, string> = {
  welcome: "Welcome screen",
  consent: "Consent",
  info: "Participant info",
  instructions: "Task instructions",
  prototype: "In prototype",
  feedback: "Feedback form",
  done: "Completed",
};

// Subscribes to the cross-tab presence channel and renders currently-active
// participants without any page refresh — the studio's "watch it happen live"
// surface. Backed by BroadcastChannel today; a websocket push would slot in
// behind the same subscribeLive() contract.
export function useLiveParticipants(testId: string) {
  const [byId, setById] = useState<Record<string, LiveParticipantStatus>>({});

  useEffect(() => {
    const unsubscribe = subscribeLive({
      onPresence: (status) => {
        if (status.testId !== testId) return;
        setById((current) => ({ ...current, [status.sessionId]: status }));
      },
      onSessionSaved: (savedTestId, sessionId) => {
        if (savedTestId !== testId) return;
        setById((current) => {
          const next = { ...current };
          delete next[sessionId];
          return next;
        });
      },
    });
    // Sweep stale presence entries (tab closed without a clean save).
    const sweep = window.setInterval(() => {
      setById((current) => {
        const next: typeof current = {};
        Object.values(current).forEach((status) => {
          if (Date.now() - status.sentAt < PRESENCE_TIMEOUT_MS * 4) next[status.sessionId] = status;
        });
        return next;
      });
    }, 4000);
    return () => {
      unsubscribe();
      window.clearInterval(sweep);
    };
  }, [testId]);

  return Object.values(byId).sort((a, b) => b.sentAt - a.sentAt);
}

export function LiveBoard({ participants }: { participants: LiveParticipantStatus[] }) {
  const [, forceTick] = useState(0);
  useEffect(() => {
    const interval = window.setInterval(() => forceTick((tick) => tick + 1), 1000);
    return () => window.clearInterval(interval);
  }, []);

  if (participants.length === 0) {
    return (
      <div className="qcx-empty">
        <Icon icon="sensor_occupied" size={28} />
        <strong>No one is testing right now</strong>
        <p>Share a remote testing link — active participants appear here in real time, no refresh needed.</p>
      </div>
    );
  }

  return (
    <div className="uts-live-board">
      {participants.map((status) => {
        const connected = Date.now() - status.sentAt < PRESENCE_TIMEOUT_MS;
        const percent = status.taskCount ? Math.round((status.completedTasks / status.taskCount) * 100) : status.stage === "done" ? 100 : 0;
        return (
          <div className="uts-live-participant-row" key={status.sessionId}>
            <span className="qcx-avatar uts-avatar-sm">
              {status.participant.split(" ").map((part) => part[0]).join("").slice(0, 2)}
              <span className={`uts-conn-dot ${connected ? "" : "stale"}`} title={connected ? "Connected" : "Connection lost"} />
            </span>
            <div className="uts-live-copy">
              <strong>{status.participant}</strong>
              <small>{STAGE_LABEL[status.stage] ?? status.stage} · {status.screen} · {status.lastEventLabel}</small>
            </div>
            <div className="uts-live-progress">
              <small>Task {Math.min(status.taskIndex + 1, status.taskCount || 1)}/{status.taskCount || "—"} · {percent}%</small>
              <span className="uts-track"><span className="uts-fill blue" style={{ width: `${percent}%` }} /></span>
            </div>
            <span className="uts-live-time">{formatClock(status.elapsed)}</span>
            <span className={`qcx-status ${connected ? "qcx-status-ready" : "qcx-status-draft"}`}>{connected ? "Connected" : "Reconnecting"}</span>
          </div>
        );
      })}
    </div>
  );
}
