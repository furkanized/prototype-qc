import type { ReactNode } from "react";
import type { PageId, Scenario, Settings } from "../types";
import qcLogo from "../assets/qc-experience-logo.svg";
import { Icon } from "../components/Icon";
import { GlobalSearch } from "../components/GlobalSearch";
import { CHECKIN_PROTOTYPE } from "../services/prototypeRegistry";

const NAV_ITEMS: Array<{ id: PageId; icon: string; label: string }> = [
  { id: "dashboard", icon: "space_dashboard", label: "Dashboard" },
  { id: "scenarios", icon: "movie", label: "Scenarios" },
  { id: "creator", icon: "add_circle", label: "Scenario Creator" },
  { id: "freemode", icon: "explore", label: "Free Mode" },
  { id: "library", icon: "inventory_2", label: "Prototype Library" },
  { id: "activity", icon: "history", label: "Recent Activity" },
  { id: "settings", icon: "settings", label: "Settings" },
];

interface AppShellProps {
  page: PageId;
  onNavigate: (page: PageId) => void;
  scenarios: Scenario[];
  settings: Settings;
  activeScenario: Scenario | null;
  onLaunchScenario: (scenario: Scenario) => void;
  onLaunchScreen: (command: string) => void;
  children: ReactNode;
}

export function AppShell({ page, onNavigate, scenarios, settings, activeScenario, onLaunchScenario, onLaunchScreen, children }: AppShellProps) {
  return (
    <div className="qcx-shell">
      <header className="qcx-topbar">
        <button className="qcx-brand" onClick={() => onNavigate("dashboard")} aria-label="QC Experience home">
          <img src={qcLogo} alt="QC Experience" height={22} />
        </button>
        <GlobalSearch scenarios={scenarios} onNavigate={onNavigate} onLaunchScenario={onLaunchScenario} onLaunchScreen={onLaunchScreen} />
        <div className="qcx-topbar-right">
          <span className="qcx-env-pill"><span className="qcx-pulse" />Environment Stable</span>
          <span className="qcx-avatar" title={settings.designerName}>{settings.designerName.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span>
        </div>
      </header>

      <div className="qcx-body">
        <nav className="qcx-sidebar" aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`qcx-nav-item ${page === item.id ? "active" : ""}`}
              aria-current={page === item.id ? "page" : undefined}
              onClick={() => onNavigate(item.id)}
            >
              <Icon icon={item.icon} size={20} fill={page === item.id} />
              <span>{item.label}</span>
            </button>
          ))}
          <div className="qcx-sidebar-foot">
            <span className="qcx-sidebar-version">QC Experience 1.0</span>
          </div>
        </nav>

        <main className="qcx-page" key={page}>
          {children}
        </main>

        <aside className="qcx-context" aria-label="Session context">
          <h2>Session</h2>
          <dl>
            <div><dt>Current Screen</dt><dd>{NAV_ITEMS.find((item) => item.id === page)?.label}</dd></div>
            <div><dt>Active Components</dt><dd>Takeoff UI · {CHECKIN_PROTOTYPE.screens.length} screens</dd></div>
            <div>
              <dt>Flow Progress</dt>
              <dd>
                <span className="qcx-progress"><span style={{ width: activeScenario ? "45%" : "0%" }} /></span>
                <small>{activeScenario ? `Scenario armed — ${activeScenario.title}` : "No scenario armed"}</small>
              </dd>
            </div>
            <div><dt>Prototype Version</dt><dd>{CHECKIN_PROTOTYPE.version}</dd></div>
            <div><dt>Estimated Demo Time</dt><dd>{CHECKIN_PROTOTYPE.estimatedDemoTime}</dd></div>
          </dl>
          {activeScenario ? (
            <div className="qcx-context-card">
              <span className="qcx-context-card-title"><Icon icon={activeScenario.icon} size={16} fill /> {activeScenario.title}</span>
              {activeScenario.flightNumber ? <span>{activeScenario.flightNumber} · {activeScenario.departure} → {activeScenario.arrival}</span> : null}
              {activeScenario.passengerName ? <span>{activeScenario.passengerName}</span> : null}
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
