import { useMemo, useState } from "react";
import { PROTOTYPES } from "../services/prototypeRegistry";
import type { ScenarioStatus } from "../types";
import { Icon } from "../components/Icon";
import { RippleButton } from "../components/RippleButton";
import { StatusBadge } from "../components/StatusBadge";
import { Highlight } from "../components/Highlight";

type LibraryFilter = ScenarioStatus | "all" | "recent";

const FILTERS: Array<{ id: LibraryFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "ready", label: "Ready" },
  { id: "draft", label: "Draft" },
  { id: "archived", label: "Archived" },
  { id: "recent", label: "Recently Updated" },
];

export function LibraryPage({ onLaunch }: { onLaunch: (prototypeId: string) => void }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<LibraryFilter>("all");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return PROTOTYPES.filter((prototype) => {
      if (filter === "recent") {
        if (prototype.id !== "passenger-checkin") return false;
      } else if (filter !== "all" && prototype.status !== filter) {
        return false;
      }
      if (!needle) return true;
      return `${prototype.name} ${prototype.description}`.toLowerCase().includes(needle);
    });
  }, [query, filter]);

  return (
    <div className="qcx-page-inner">
      <header className="qcx-page-head">
        <div>
          <h1>Prototype Library</h1>
          <p>Every prototype module registered in QC Experience.</p>
        </div>
      </header>

      <div className="qcx-toolbar">
        <label className="qcx-inline-search">
          <Icon icon="search" size={17} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search prototypes" aria-label="Search prototypes" />
        </label>
        <div className="qcx-chip-row" role="tablist" aria-label="Library filter">
          {FILTERS.map((item) => (
            <button key={item.id} className={`qcx-chip ${filter === item.id ? "active" : ""}`} onClick={() => setFilter(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="qcx-empty">
          <Icon icon="inventory_2" size={32} />
          <strong>No prototypes match</strong>
        </div>
      ) : (
        <div className="qcx-card-grid library">
          {visible.map((prototype, index) => (
            <article key={prototype.id} className="qcx-card qcx-proto-card" style={{ animationDelay: `${index * 35}ms` }}>
              <div className={`qcx-proto-preview ${prototype.available ? "live" : ""}`}>
                <Icon icon={prototype.icon} size={34} />
                {prototype.available ? <span className="qcx-proto-live">LIVE</span> : null}
              </div>
              <header className="qcx-card-head">
                <h3><Highlight text={prototype.name} query={query} /></h3>
                <StatusBadge status={prototype.status} />
              </header>
              <p><Highlight text={prototype.description} query={query} /></p>
              <div className="qcx-card-meta">
                <span><Icon icon="commit" size={14} />{prototype.version}</span>
                <span><Icon icon="timer" size={14} />{prototype.estimatedDemoTime}</span>
              </div>
              <footer className="qcx-card-actions">
                <RippleButton className="qcx-button primary" disabled={!prototype.available} onClick={() => onLaunch(prototype.id)}>
                  <Icon icon="play_arrow" size={18} fill />
                  {prototype.available ? "Launch" : "Coming Soon"}
                </RippleButton>
              </footer>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
