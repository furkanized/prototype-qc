import type { Settings } from "../types";
import { Icon } from "../components/Icon";
import { playStartupSound } from "../services/startupSound";

function ToggleRow({ icon, label, description, checked, onChange }: { icon: string; label: string; description: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="qcx-setting-row">
      <span className="qcx-setting-icon"><Icon icon={icon} size={19} /></span>
      <div>
        <strong>{label}</strong>
        <small>{description}</small>
      </div>
      <button role="switch" aria-checked={checked} aria-label={label} className={`qcx-switch ${checked ? "on" : ""}`} onClick={() => onChange(!checked)}>
        <span />
      </button>
    </div>
  );
}

export function SettingsPage({ settings, onUpdate }: { settings: Settings; onUpdate: (patch: Partial<Settings>) => void }) {
  return (
    <div className="qcx-page-inner qcx-creator">
      <header className="qcx-page-head">
        <div>
          <h1>Settings</h1>
          <p>Personalize the QC Experience environment on this workstation.</p>
        </div>
      </header>

      <div className="qcx-card qcx-settings-card">
        <div className="qcx-setting-row">
          <span className="qcx-setting-icon"><Icon icon="badge" size={19} /></span>
          <div className="grow">
            <strong>Designer Name</strong>
            <input className="qcx-setting-input" value={settings.designerName} onChange={(event) => onUpdate({ designerName: event.target.value })} aria-label="Designer name" />
          </div>
        </div>
        <ToggleRow icon="volume_up" label="Startup Sound" description="Play the sonic identity during the intro sequence." checked={settings.soundEnabled} onChange={(value) => onUpdate({ soundEnabled: value })} />
        <ToggleRow icon="animation" label="Reduced Motion" description="Minimize animations across the platform." checked={settings.reducedMotion} onChange={(value) => onUpdate({ reducedMotion: value })} />
        <ToggleRow icon="skip_next" label="Skip Intro" description="Go straight to the landing screen on refresh." checked={settings.skipIntro} onChange={(value) => onUpdate({ skipIntro: value })} />
        <div className="qcx-setting-row">
          <span className="qcx-setting-icon"><Icon icon="music_note" size={19} /></span>
          <div>
            <strong>Preview Sonic Identity</strong>
            <small>Hear the startup sound again.</small>
          </div>
          <button className="qcx-button ghost" onClick={() => playStartupSound()}><Icon icon="play_arrow" size={17} fill />Play</button>
        </div>
      </div>
    </div>
  );
}
