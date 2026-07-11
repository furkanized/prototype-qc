import { useCallback, useEffect, useRef, useState } from "react";
import { FlightSearchPage } from "../features/cargo/FlightSearchPage";
import { CHECKIN_PROTOTYPE, sendPrototypeCommand } from "../services/prototypeRegistry";
import type { Scenario } from "../types";
import { Icon } from "../components/Icon";
import { FamilyCheckinGuide } from "./FamilyCheckinGuide";
import { ScenarioTaskGuide } from "./ScenarioTaskGuide";
import { useZoomController } from "./zoom/useZoomController";
import { ZoomToolbar } from "./zoom/ZoomToolbar";

interface PrototypeHostProps {
  scenario: Scenario | null;
  freeMode: boolean;
  initialScreen?: string;
  onExit: () => void;
}

// Hosts the untouched Passenger Check-in prototype full-screen, layering only
// the platform affordances on top: a Back pill and (in Free Mode) a nav dock.
export function PrototypeHost({ scenario, freeMode, initialScreen, onExit }: PrototypeHostProps) {
  const [entered, setEntered] = useState(false);
  const screens = CHECKIN_PROTOTYPE.screens;
  const [screenIndex, setScreenIndex] = useState(() => {
    const index = screens.findIndex((screen) => screen.command === initialScreen);
    return index === -1 ? 0 : index;
  });
  const [dockOpen, setDockOpen] = useState(freeMode);
  const isFamilyScenario = scenario?.id === "family-checkin";
  const hostRef = useRef<HTMLDivElement | null>(null);
  const zoomController = useZoomController();
  const [presenting, setPresenting] = useState(false);

  const togglePresent = useCallback(() => {
    setPresenting((wasPresenting) => {
      if (wasPresenting) {
        if (document.fullscreenElement) void document.exitFullscreen();
        return false;
      }
      // Fullscreen may be denied (e.g. no user-gesture); presentation chrome
      // still applies so the presenter keeps the minimal toolbar either way.
      document.querySelector<HTMLElement>(".qcx-proto-host")?.requestFullscreen?.().catch(() => {});
      return true;
    });
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) setPresenting(false);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!freeMode) return;
    // Defer the first jump until the prototype has mounted its listener.
    const timer = window.setTimeout(() => sendPrototypeCommand(screens[screenIndex].command), 60);
    return () => window.clearTimeout(timer);
  }, [freeMode, screenIndex, screens]);

  const jumpTo = useCallback((index: number) => {
    setScreenIndex((index + screens.length) % screens.length);
  }, [screens.length]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onExit();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onExit]);

  const current = screens[screenIndex];

  return (
    <div className={`qcx-proto-host ${entered ? "entered" : ""} ${presenting ? "presenting" : ""}`} ref={hostRef}>
      <div className="qcx-zoom-viewport" ref={zoomController.viewportRef}>
        <div
          className="qcx-zoom-canvas"
          ref={zoomController.canvasRef}
          style={{ zoom: zoomController.zoom / 100 }}
        >
          <FlightSearchPage />
        </div>
      </div>

      <ZoomToolbar controller={zoomController} presenting={presenting} onTogglePresent={togglePresent} />

      <button className="qcx-back-pill" onClick={onExit}>
        <Icon icon="arrow_back" size={16} />
        <span>Back to QC Experience</span>
        {scenario ? <em>{scenario.title}</em> : null}
      </button>

      {isFamilyScenario ? <FamilyCheckinGuide /> : null}

      {scenario?.tasks?.length ? <ScenarioTaskGuide tasks={scenario.tasks} hostRef={hostRef} /> : null}

      {freeMode ? (
        <div className={`qcx-freemode-dock ${dockOpen ? "" : "collapsed"}`} role="toolbar" aria-label="Free Mode controls">
          {dockOpen ? (
            <>
              <button className="qcx-dock-button" aria-label="Previous screen" onClick={() => jumpTo(screenIndex - 1)}><Icon icon="chevron_left" size={20} /></button>
              <div className="qcx-dock-screen">
                <label>
                  <span className="qcx-dock-label">Jump to screen</span>
                  <select value={screenIndex} onChange={(event) => jumpTo(Number(event.target.value))} aria-label="Jump to screen">
                    {screens.map((screen, index) => (
                      <option key={screen.id} value={index}>{index + 1}. {screen.name}</option>
                    ))}
                  </select>
                </label>
                <small>{screenIndex + 1} / {screens.length} · {current.description}</small>
              </div>
              <button className="qcx-dock-button" aria-label="Next screen" onClick={() => jumpTo(screenIndex + 1)}><Icon icon="chevron_right" size={20} /></button>
              <span className="qcx-dock-divider" />
              <button className="qcx-dock-button" aria-label="Restart flow" title="Restart Flow" onClick={() => { setScreenIndex(0); sendPrototypeCommand("restart"); }}><Icon icon="restart_alt" size={19} /></button>
              <button className="qcx-dock-button" aria-label="Hide controls" title="Hide controls" onClick={() => setDockOpen(false)}><Icon icon="keyboard_arrow_down" size={20} /></button>
            </>
          ) : (
            <button className="qcx-dock-button" aria-label="Show Free Mode controls" onClick={() => setDockOpen(true)}><Icon icon="explore" size={20} fill /></button>
          )}
        </div>
      ) : null}
    </div>
  );
}
