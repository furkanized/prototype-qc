import { Icon } from "../../components/Icon";
import { formatClock } from "../../services/testingService";
import type { SessionEvent, TestSession } from "../../types/testing";

const TIMELINE_META: Record<SessionEvent["kind"], { icon: string; describe: (event: SessionEvent) => string }> = {
  session_start: { icon: "flag_circle", describe: () => "Session Started" },
  session_end: { icon: "sports_score", describe: (event) => event.label ?? "Session Ended" },
  screen: { icon: "swap_horiz", describe: (event) => `Opened ${event.screen}` },
  click: { icon: "ads_click", describe: (event) => (event.label ? `Clicked “${event.label}”` : `Clicked on ${event.screen}`) },
  misclick: { icon: "error", describe: (event) => `Misclick on ${event.screen}` },
  hover: { icon: "front_hand", describe: (event) => (event.label ? `Hovered “${event.label}”` : `Hovered on ${event.screen}`) },
  scroll: { icon: "swipe_vertical", describe: (event) => `Scrolled on ${event.screen}` },
  input: { icon: "keyboard", describe: (event) => (event.label ? `Filled “${event.label}”` : "Filled a field") },
  idle: { icon: "hourglass_empty", describe: (event) => event.label ?? "Idle" },
  back: { icon: "undo", describe: () => "Navigated back" },
  task_start: { icon: "play_circle", describe: (event) => `Started task “${event.label}”` },
  task_complete: { icon: "check_circle", describe: (event) => `Completed “${event.label}”` },
  task_fail: { icon: "cancel", describe: (event) => `Failed “${event.label}”` },
};

const NOTABLE: Set<SessionEvent["kind"]> = new Set(["session_start", "session_end", "screen", "task_start", "task_complete", "task_fail", "misclick", "back", "idle"]);

// A chronological, human-readable narrative of one participant's session —
// distinct from the scrubbable replay log: this is the "read it like a story"
// view researchers skim before deciding whether to watch the replay.
export function SessionTimeline({ session }: { session: TestSession }) {
  const events = session.events.filter((event) => NOTABLE.has(event.kind));
  if (events.length === 0) {
    return <p className="muted">No timeline events recorded for this session.</p>;
  }
  return (
    <ol className="uts-timeline">
      {events.map((event, index) => {
        const meta = TIMELINE_META[event.kind];
        const clock = new Date(new Date(session.startedAt).getTime() + event.at * 1000);
        return (
          <li key={`${event.at}-${event.kind}-${index}`} className={`kind-${event.kind}`}>
            <div className="uts-timeline-time">
              <span>{clock.toLocaleTimeString([], { hour12: false })}</span>
              <em>+{formatClock(event.at)}</em>
            </div>
            <span className="uts-timeline-dot"><Icon icon={meta.icon} size={13} fill={event.kind === "task_complete"} /></span>
            <span className="uts-timeline-label">{meta.describe(event)}</span>
          </li>
        );
      })}
    </ol>
  );
}
