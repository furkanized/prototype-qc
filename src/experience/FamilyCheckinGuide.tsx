import { useEffect, useState } from "react";
import { Icon } from "../components/Icon";
import { searchPrototypePassengers, sendPrototypeCommand } from "../services/prototypeRegistry";

// Hands-free step guide for the Family Check-in scenario. The prototype opens
// in a compact workspace with a 3-flight board; the guide only watches the
// presenter's real actions via headless telemetry and ticks steps off as they
// happen — no manual "complete" clicks.

// Board narrows to three flights; default selection is NOT Amsterdam so the
// presenter genuinely has to pick TK2070 as step 2.
const SCENARIO_FLIGHTS = "TK2070,TK1037,TK2911";
const SCENARIO_DEFAULT_FLIGHT = "TK1037";

const STEPS = [
  "Yolcunun nereye gideceği sorulur.",
  "Flight List'ten şehir seçilir: Amsterdam (TK2070).",
  "Yolcu soyadı sorulur.",
  "“AYIN” soyismi ile arama yapılır.",
  "Aynı soyisimdeki yolcular için tekli veya çoklu check-in yapılır.",
];

export function FamilyCheckinGuide() {
  const [doneCount, setDoneCount] = useState(0);
  const [open, setOpen] = useState(true);
  const allDone = doneCount >= STEPS.length;

  // Stage the scenario: compact workspace, board narrowed to three flights.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      sendPrototypeCommand("compact");
      sendPrototypeCommand(`flights-only:${SCENARIO_FLIGHTS}|default=${SCENARIO_DEFAULT_FLIGHT}`);
    }, 80);
    return () => window.clearTimeout(timer);
  }, []);

  // Watch the presenter's real actions and tick steps off automatically.
  useEffect(() => {
    const complete = (step: number) => setDoneCount((prev) => Math.max(prev, step));

    const handleScreen = (event: Event) => {
      const screen = (event as CustomEvent<{ screen: string }>).detail?.screen;
      // Opening the flight board = asking where the passenger is flying.
      if (screen === "Flight Board" || screen === "Flight Overview") complete(1);
    };
    const handleFlightSelected = (event: Event) => {
      const code = (event as CustomEvent<{ code?: string }>).detail?.code;
      if (code === "TK2070") complete(2);
    };
    const handleQuery = (event: Event) => {
      const query = ((event as CustomEvent<{ query: string }>).detail?.query ?? "").trim().toLowerCase();
      if (query.length > 0) complete(3);
      if (query.includes("ayin") || query.includes("ayın")) complete(4);
    };
    const handleSelection = (event: Event) => {
      const count = (event as CustomEvent<{ count: number }>).detail?.count ?? 0;
      // Only counts once the family search has actually happened.
      if (count > 0) setDoneCount((prev) => (prev >= 4 ? Math.max(prev, 5) : prev));
    };

    window.addEventListener("qcx-screen", handleScreen);
    window.addEventListener("qcx-flight-selected", handleFlightSelected);
    window.addEventListener("qcx-passenger-query", handleQuery);
    window.addEventListener("qcx-passenger-selected", handleSelection);
    return () => {
      window.removeEventListener("qcx-screen", handleScreen);
      window.removeEventListener("qcx-flight-selected", handleFlightSelected);
      window.removeEventListener("qcx-passenger-query", handleQuery);
      window.removeEventListener("qcx-passenger-selected", handleSelection);
    };
  }, []);

  const restart = () => {
    setDoneCount(0);
    // preselect with an empty surname matches nobody → clears row selection too.
    searchPrototypePassengers("", true);
    sendPrototypeCommand("restart");
    sendPrototypeCommand("compact");
    // restart resets selection to the first flight; re-apply the non-AMS default.
    sendPrototypeCommand(`flights-only:${SCENARIO_FLIGHTS}|default=${SCENARIO_DEFAULT_FLIGHT}`);
  };

  if (!open) {
    return (
      <button className="qcx-guide-fab" aria-label="Senaryo adımlarını göster" onClick={() => setOpen(true)}>
        <Icon icon="family_restroom" size={20} fill />
        <em>{doneCount}/{STEPS.length}</em>
      </button>
    );
  }

  return (
    <aside className="qcx-guide" aria-label="Family Check-in senaryo adımları">
      <header className="qcx-guide-head">
        <span className="qcx-guide-icon"><Icon icon="family_restroom" size={17} fill /></span>
        <div>
          <strong>Family Check-in</strong>
          <small>AYIN ailesi · IST → AMS · TK2070</small>
        </div>
        <button className="qcx-guide-mini" aria-label="Paneli küçült" onClick={() => setOpen(false)}>
          <Icon icon="keyboard_arrow_down" size={18} />
        </button>
      </header>

      <ol className="qcx-guide-steps">
        {STEPS.map((step, index) => {
          const done = index < doneCount;
          const current = index === doneCount;
          return (
            <li key={step} className={done ? "done" : current ? "current" : ""}>
              <span className="qcx-guide-check">
                {done ? <Icon icon="check" size={13} fill /> : <b>{index + 1}</b>}
              </span>
              <span>{step}</span>
            </li>
          );
        })}
      </ol>

      <footer className="qcx-guide-actions">
        <button className="qcx-guide-button ghost" onClick={restart} disabled={doneCount === 0} aria-label="Akışı yeniden başlat" title="Akışı Yeniden Başlat">
          <Icon icon="restart_alt" size={17} />
        </button>
        <span className={`qcx-guide-hint ${allDone ? "ready" : ""}`}>
          {allDone ? "Senaryo tamamlandı" : "Adımlar siz ilerledikçe işaretlenir"}
        </span>
        <span className="qcx-guide-progress">{doneCount}/{STEPS.length}</span>
      </footer>
    </aside>
  );
}
