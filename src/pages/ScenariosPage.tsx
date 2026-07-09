import { useMemo, useState } from "react";
import type { Scenario, ScenarioStatus } from "../types";
import { ScenarioCard } from "../components/ScenarioCard";
import { Icon } from "../components/Icon";

const FILTERS: Array<{ id: ScenarioStatus | "all"; label: string }> = [
  { id: "all", label: "All" },
  { id: "ready", label: "Ready" },
  { id: "draft", label: "Draft" },
  { id: "archived", label: "Archived" },
];

export function ScenariosPage({ scenarios, onLaunch, onDelete }: { scenarios: Scenario[]; onLaunch: (scenario: Scenario) => void; onDelete: (scenario: Scenario) => void }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ScenarioStatus | "all">("all");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return scenarios.filter((scenario) => {
      if (filter !== "all" && scenario.status !== filter) return false;
      if (!needle) return true;
      return `${scenario.title} ${scenario.description} ${scenario.flightNumber ?? ""} ${scenario.departure ?? ""} ${scenario.arrival ?? ""}`.toLowerCase().includes(needle);
    });
  }, [scenarios, query, filter]);

  return (
    <div className="qcx-page-inner">
      <header className="qcx-page-head">
        <div>
          <h1>Scenarios</h1>
          <p>All demo scenarios across built-in flows and your custom creations.</p>
        </div>
      </header>

      <div className="qcx-toolbar">
        <label className="qcx-inline-search">
          <Icon icon="search" size={17} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search scenarios" aria-label="Search scenarios" />
        </label>
        <div className="qcx-chip-row" role="tablist" aria-label="Status filter">
          {FILTERS.map((item) => (
            <button key={item.id} className={`qcx-chip ${filter === item.id ? "active" : ""}`} onClick={() => setFilter(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="qcx-empty">
          <Icon icon="travel_explore" size={34} />
          <strong>No scenarios match</strong>
          <p>Try a different search or status filter.</p>
        </div>
      ) : (
        <div className="qcx-card-grid">
          {visible.map((scenario, index) => (
            <ScenarioCard key={scenario.id} scenario={scenario} query={query} onLaunch={onLaunch} onDelete={onDelete} style={{ animationDelay: `${Math.min(index * 30, 240)}ms` }} />
          ))}
        </div>
      )}
    </div>
  );
}
