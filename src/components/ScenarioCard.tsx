import type { Scenario } from "../types";
import { Icon } from "./Icon";
import { RippleButton } from "./RippleButton";
import { StatusBadge } from "./StatusBadge";
import { Highlight } from "./Highlight";

interface ScenarioCardProps {
  scenario: Scenario;
  query?: string;
  onLaunch: (scenario: Scenario) => void;
  onDelete?: (scenario: Scenario) => void;
  style?: React.CSSProperties;
}

export function ScenarioCard({ scenario, query = "", onLaunch, onDelete, style }: ScenarioCardProps) {
  const routeLine = scenario.departure && scenario.arrival ? `${scenario.departure} → ${scenario.arrival}` : null;
  return (
    <article className="qcx-card qcx-scenario-card" style={style}>
      <header className="qcx-card-head">
        <span className={`qcx-card-icon ${scenario.builtin ? "" : "custom"}`}><Icon icon={scenario.icon} size={22} fill /></span>
        <StatusBadge status={scenario.status} />
      </header>
      <h3><Highlight text={scenario.title} query={query} /></h3>
      <p><Highlight text={scenario.description} query={query} /></p>
      <div className="qcx-card-meta">
        {scenario.flightNumber ? <span><Icon icon="flight" size={14} />{scenario.flightNumber}</span> : null}
        {routeLine ? <span><Icon icon="route" size={14} />{routeLine}</span> : null}
        {scenario.passengerCount ? <span><Icon icon="group" size={14} />{scenario.passengerCount} pax</span> : null}
      </div>
      <footer className="qcx-card-actions">
        <RippleButton
          className="qcx-button primary"
          onClick={() => onLaunch(scenario)}
          disabled={scenario.status === "archived"}
        >
          <Icon icon="play_arrow" size={18} fill />
          Launch
        </RippleButton>
        {!scenario.builtin && onDelete ? (
          <button className="qcx-icon-button" aria-label={`Delete ${scenario.title}`} onClick={() => onDelete(scenario)}>
            <Icon icon="delete" size={18} />
          </button>
        ) : null}
      </footer>
    </article>
  );
}
