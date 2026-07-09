import { useState, type FormEvent } from "react";
import type { ScenarioDraft } from "../services/scenarioService";
import { Icon } from "../components/Icon";
import { RippleButton } from "../components/RippleButton";

const CABIN_CLASSES = ["Economy", "Comfort", "Business"];

const EMPTY_DRAFT: ScenarioDraft = {
  title: "",
  passengerName: "",
  flightNumber: "",
  departure: "IST",
  arrival: "",
  date: new Date().toISOString().slice(0, 10),
  passengerCount: 1,
  cabinClass: "Economy",
  notes: "",
};

export function ScenarioCreatorPage({ onCreate }: { onCreate: (draft: ScenarioDraft) => void }) {
  const [draft, setDraft] = useState<ScenarioDraft>(EMPTY_DRAFT);
  const [saved, setSaved] = useState(false);

  const set = <K extends keyof ScenarioDraft>(key: K, value: ScenarioDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));

  const valid = draft.title.trim() && draft.flightNumber.trim() && draft.departure.trim() && draft.arrival.trim();

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    onCreate(draft);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
    setDraft(EMPTY_DRAFT);
  };

  return (
    <div className="qcx-page-inner qcx-creator">
      <header className="qcx-page-head">
        <div>
          <h1>Scenario Creator</h1>
          <p>Compose a new demo scenario. It becomes launchable from the dashboard immediately.</p>
        </div>
      </header>

      <form className="qcx-form qcx-card" onSubmit={handleSubmit}>
        <div className="qcx-form-grid">
          <label className="span-2">
            <span>Scenario Name *</span>
            <input value={draft.title} onChange={(event) => set("title", event.target.value)} placeholder="e.g. Group Check-in with Infant" required />
          </label>
          <label>
            <span>Passenger Name</span>
            <input value={draft.passengerName} onChange={(event) => set("passengerName", event.target.value)} placeholder="Ayşe Aydın" />
          </label>
          <label>
            <span>Flight Number *</span>
            <input value={draft.flightNumber} onChange={(event) => set("flightNumber", event.target.value.toUpperCase())} placeholder="TK1951" required />
          </label>
          <label>
            <span>Departure *</span>
            <input value={draft.departure} onChange={(event) => set("departure", event.target.value.toUpperCase())} placeholder="IST" maxLength={3} required />
          </label>
          <label>
            <span>Arrival *</span>
            <input value={draft.arrival} onChange={(event) => set("arrival", event.target.value.toUpperCase())} placeholder="AMS" maxLength={3} required />
          </label>
          <label>
            <span>Date</span>
            <input type="date" value={draft.date} onChange={(event) => set("date", event.target.value)} />
          </label>
          <label>
            <span>Passenger Count</span>
            <input type="number" min={1} max={9} value={draft.passengerCount} onChange={(event) => set("passengerCount", Math.max(1, Math.min(9, Number(event.target.value) || 1)))} />
          </label>
          <label>
            <span>Cabin Class</span>
            <select value={draft.cabinClass} onChange={(event) => set("cabinClass", event.target.value)}>
              {CABIN_CLASSES.map((cabin) => <option key={cabin}>{cabin}</option>)}
            </select>
          </label>
          <label className="span-2">
            <span>Notes</span>
            <textarea value={draft.notes} onChange={(event) => set("notes", event.target.value)} rows={3} placeholder="What should this scenario demonstrate?" />
          </label>
        </div>
        <footer className="qcx-form-actions">
          <RippleButton type="submit" className={`qcx-button primary ${saved ? "success" : ""}`} disabled={!valid}>
            <Icon icon={saved ? "check" : "add_circle"} size={18} fill />
            {saved ? "Scenario Created" : "Create Scenario"}
          </RippleButton>
        </footer>
      </form>
    </div>
  );
}
