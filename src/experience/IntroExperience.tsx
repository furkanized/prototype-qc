import { useEffect, useMemo, useRef, useState } from "react";
import { playBoardClatter, playStartupSound } from "../services/startupSound";

// White, cloud-lit departure-board moment. Only the hero word flips through
// mechanical split-flap cells; everything else is plain type. The sonic
// identity plays once loading completes, right as the board dissolves
// straight into the dashboard — no intermediate landing screen.

const DURATION = 3400;
const FLAP_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const TICK_MS = 70;
const SOUND_AT = 2500;

const STATUS_STEPS: Array<{ text: string; at: number }> = [
  { text: "Preparing experience...", at: 700 },
  { text: "Loading components...", at: 1350 },
  { text: "Initializing prototype environment...", at: 1900 },
  { text: "Loading scenarios...", at: 2300 },
  { text: "Experience ready", at: SOUND_AT },
];

function randomChar(cellIndex: number, tick: number) {
  const seed = Math.sin(cellIndex * 127.1 + tick * 311.7) * 43758.5453;
  return FLAP_CHARS[Math.floor((seed - Math.floor(seed)) * FLAP_CHARS.length)];
}

function FlapRow({ text, startAt, stagger = 55, spinMs = 620, now }: { text: string; startAt: number; stagger?: number; spinMs?: number; now: number }) {
  const cells = useMemo(() => text.split(""), [text]);
  return (
    <div className="qcx-flap-row hero">
      {cells.map((target, index) => {
        if (target === " ") return <span key={index} className="qcx-flap-gap" />;
        const cellStart = startAt + index * stagger * 0.4;
        const settleAt = startAt + index * stagger + spinMs;
        const started = now >= cellStart;
        const settled = now >= settleAt;
        const char = !started ? "" : settled ? target : randomChar(index, Math.floor(now / TICK_MS));
        return (
          <span key={index} className={`qcx-flap-cell ${settled ? "settled" : started ? "spinning" : ""}`}>
            <span className="qcx-flap-char">{char}</span>
          </span>
        );
      })}
    </div>
  );
}

export function IntroExperience({ soundEnabled, onDone }: { soundEnabled: boolean; onDone: () => void }) {
  const [now, setNow] = useState(0);
  const soundPlayed = useRef(false);
  const reducedMotion =
    typeof window !== "undefined" &&
    (window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      document.documentElement.classList.contains("qcx-reduced-motion"));

  const playSound = () => {
    if (soundPlayed.current || !soundEnabled) return;
    const padOk = playStartupSound();
    const clickOk = reducedMotion ? true : playBoardClatter(360);
    soundPlayed.current = padOk && clickOk;
  };

  useEffect(() => {
    if (!soundEnabled || reducedMotion) return;
    // Autoplay may be blocked without a prior gesture; retry on the first one.
    const unlock = () => playSound();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soundEnabled, reducedMotion]);

  useEffect(() => {
    if (reducedMotion) {
      setNow(DURATION);
      playSound();
      const timer = window.setTimeout(onDone, 900);
      return () => window.clearTimeout(timer);
    }
    const start = performance.now();
    let frame = 0;
    const loop = (time: number) => {
      const elapsed = time - start;
      setNow(elapsed);
      if (elapsed >= DURATION) {
        onDone();
        return;
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onDone, reducedMotion]);

  useEffect(() => {
    if (reducedMotion || now < SOUND_AT) return;
    playSound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, reducedMotion]);

  const status = [...STATUS_STEPS].reverse().find((step) => now >= step.at) ?? null;
  const isFinal = status?.text === "Experience ready";
  const leaving = now >= DURATION - 320;
  const boardOn = now >= 60;

  return (
    <div className={`qcx-intro qcx-board ${leaving ? "leaving" : ""}`} aria-label="QC Experience starting">
      <div className="qcx-board-sky" aria-hidden="true">
        <span className="qcx-cloud c1" />
        <span className="qcx-cloud c2" />
        <span className="qcx-cloud c3" />
      </div>

      <div className={`qcx-board-frame ${boardOn ? "on" : ""}`}>
        <FlapRow text="QC EXPERIENCE" startAt={200} stagger={65} spinMs={640} now={now} />
        <p className={`qcx-intro-subtitle ${now >= 550 ? "visible" : ""}`}>Quick Check-in Prototype Platform</p>

        <div className="qcx-intro-loader">
          <div className="qcx-intro-track"><div className="qcx-intro-bar" style={{ transform: `scaleX(${Math.min(now / (SOUND_AT - 100), 1)})` }} /></div>
          <span className={`qcx-intro-status ${isFinal ? "ready" : ""}`} key={status?.text}>{status?.text}</span>
        </div>
      </div>
    </div>
  );
}
