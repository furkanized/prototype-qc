import { useMemo, useState } from "react";
import { CHECKIN_PROTOTYPE } from "../services/prototypeRegistry";
import { Icon } from "../components/Icon";
import { RippleButton } from "../components/RippleButton";
import { Highlight } from "../components/Highlight";

export function FreeModePage({ onEnter }: { onEnter: (screenCommand?: string) => void }) {
  const [query, setQuery] = useState("");
  const screens = CHECKIN_PROTOTYPE.screens;

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return screens;
    return screens.filter((screen) => `${screen.name} ${screen.description}`.toLowerCase().includes(needle));
  }, [screens, query]);

  return (
    <div className="qcx-page-inner">
      <header className="qcx-page-head">
        <div>
          <h1>Free Mode</h1>
          <p>Unrestricted playground — move through any screen of the Passenger Check-in prototype.</p>
        </div>
        <RippleButton className="qcx-button primary" onClick={() => onEnter()}>
          <Icon icon="explore" size={18} fill />
          Enter Free Mode
        </RippleButton>
      </header>

      <div className="qcx-toolbar">
        <label className="qcx-inline-search">
          <Icon icon="search" size={17} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search screens" aria-label="Search screens" />
        </label>
        <span className="qcx-toolbar-note">{visible.length} of {screens.length} screens</span>
      </div>

      <div className="qcx-screen-list">
        {visible.map((screen, index) => (
          <button key={screen.id} className="qcx-screen-row" onClick={() => onEnter(screen.command)} style={{ animationDelay: `${index * 30}ms` }}>
            <span className="qcx-screen-index">{String(screens.indexOf(screen) + 1).padStart(2, "0")}</span>
            <span className="qcx-screen-icon"><Icon icon={screen.icon} size={20} /></span>
            <span className="qcx-screen-copy">
              <strong><Highlight text={screen.name} query={query} /></strong>
              <small><Highlight text={screen.description} query={query} /></small>
            </span>
            <span className="qcx-screen-go"><Icon icon="arrow_forward" size={18} /></span>
          </button>
        ))}
        {visible.length === 0 ? (
          <div className="qcx-empty">
            <Icon icon="search_off" size={30} />
            <strong>No screens found</strong>
          </div>
        ) : null}
      </div>
    </div>
  );
}
