import type { ActivityEntry } from "../types";
import { formatRelativeTime } from "../services/activityService";
import { Icon } from "../components/Icon";

export function ActivityPage({ activity }: { activity: ActivityEntry[] }) {
  return (
    <div className="qcx-page-inner">
      <header className="qcx-page-head">
        <div>
          <h1>Recent Activity</h1>
          <p>Launches, scenario changes and platform events from this workstation.</p>
        </div>
      </header>

      {activity.length === 0 ? (
        <div className="qcx-empty">
          <Icon icon="history" size={32} />
          <strong>No activity yet</strong>
          <p>Launch a scenario or create one to see it here.</p>
        </div>
      ) : (
        <ol className="qcx-activity-list">
          {activity.map((entry, index) => (
            <li key={entry.id} style={{ animationDelay: `${Math.min(index * 25, 250)}ms` }}>
              <span className="qcx-activity-icon"><Icon icon={entry.icon} size={17} fill /></span>
              <div>
                <strong>{entry.label}</strong>
                <small>{entry.detail}</small>
              </div>
              <time>{formatRelativeTime(entry.at)}</time>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
