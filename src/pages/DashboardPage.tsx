import { useEffect, useState } from "react";
import type { Scenario, Settings } from "../types";
import { CHECKIN_PROTOTYPE } from "../services/prototypeRegistry";
import { ScenarioCard } from "../components/ScenarioCard";
import { SkeletonGrid } from "../components/Skeleton";
import { Icon } from "../components/Icon";

const HERO_STATS = (settings: Settings) => [
  { icon: "monitor_heart", label: "Environment Status", value: "Stable", tone: "good" },
  { icon: "commit", label: "Current Build", value: "2026.07.9" },
  { icon: "airplane_ticket", label: "Active Prototype", value: CHECKIN_PROTOTYPE.name },
  { icon: "person", label: "Designer", value: settings.designerName },
  { icon: "update", label: "Last Updated", value: "Today, 09:40" },
];

export function DashboardPage({
  scenarios,
  settings,
  onLaunch,
  onDelete,
  onCreate,
}: {
  scenarios: Scenario[];
  settings: Settings;
  onLaunch: (scenario: Scenario) => void;
  onDelete: (scenario: Scenario) => void;
  onCreate: () => void;
}) {
  // Brief skeleton pass so the grid settles in rather than popping.
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 450);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="qcx-page-inner">
      <header className="qcx-page-head">
        <div>
          <h1>QC Experience</h1>
          <p>Prototype management hub for the Quick Check-in platform.</p>
        </div>
        <button className="qcx-button ghost" onClick={onCreate}><Icon icon="add" size={18} />New Scenario</button>
      </header>

      <section className="qcx-hero-stats" aria-label="Environment overview">
        {HERO_STATS(settings).map((stat) => (
          <div className="qcx-stat" key={stat.label}>
            <span className={`qcx-stat-icon ${stat.tone ?? ""}`}><Icon icon={stat.icon} size={18} fill /></span>
            <div>
              <small>{stat.label}</small>
              <strong>{stat.value}</strong>
            </div>
          </div>
        ))}
      </section>

      <section aria-label="Scenarios">
        <div className="qcx-section-head">
          <h2>Scenarios</h2>
          <span>{scenarios.length} available</span>
        </div>
        {loading ? (
          <SkeletonGrid count={6} />
        ) : (
          <div className="qcx-card-grid">
            {scenarios.map((scenario, index) => (
              <ScenarioCard
                key={scenario.id}
                scenario={scenario}
                onLaunch={onLaunch}
                onDelete={onDelete}
                style={{ animationDelay: `${Math.min(index * 35, 300)}ms` }}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
