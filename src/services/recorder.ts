import type { SessionEvent } from "../types/testing";

// Event-driven interaction recorder. The prototype knows nothing about
// testing: it just renders and (headlessly) announces screen changes via
// window "qcx-screen" events. The recorder attaches DOM listeners to a root
// node, converts raw interactions into structured SessionEvents (with
// viewport coordinates for future heatmaps) and notifies a single consumer.
// Swapping localStorage/BroadcastChannel for a backend later only means
// changing the consumer, not this engine or the prototype.

export interface RecorderSnapshot {
  elapsed: number;
  screen: string;
  clicks: number;
  misclicks: number;
  idleSec: number;
  lastEvent?: SessionEvent;
}

const IDLE_THRESHOLD_SEC = 12;
const HOVER_SAMPLE_MS = 1500;
const SCROLL_SAMPLE_MS = 1200;

function isInteractive(start: Element | null): boolean {
  const roles = new Set(["button", "tab", "option", "link", "checkbox", "radio", "menuitem", "switch", "combobox", "row", "gridcell", "listbox"]);
  for (let el: Element | null = start; el && el !== document.body; el = el.parentElement) {
    if (el.tagName.startsWith("TK-")) return true;
    if (["BUTTON", "A", "INPUT", "SELECT", "TEXTAREA", "LABEL", "SUMMARY"].includes(el.tagName)) return true;
    const role = el.getAttribute("role");
    if (role && roles.has(role)) return true;
    if (el.hasAttribute("tabindex")) return true;
    if (el instanceof HTMLElement && window.getComputedStyle(el).cursor === "pointer") return true;
  }
  return false;
}

function labelFor(target: Element): string | undefined {
  const source = target.closest("button, a, [role], tk-button, label") ?? target;
  const text = (source.getAttribute?.("aria-label") || source.textContent || "").trim().replace(/\s+/g, " ");
  return text ? text.slice(0, 48) : undefined;
}

export class SessionRecorder {
  readonly startMs: number;
  private events: SessionEvent[] = [];
  private screen = "Flight Overview";
  private clicks = 0;
  private misclicks = 0;
  private idleSec = 0;
  private lastActivityAt = 0;
  private lastHoverAt = 0;
  private lastScrollAt = 0;
  private cleanup: Array<() => void> = [];
  private idleTimer: number | null = null;

  constructor(private onEvent: (event: SessionEvent, snapshot: RecorderSnapshot) => void) {
    this.startMs = Date.now();
  }

  now() {
    return Math.floor((Date.now() - this.startMs) / 1000);
  }

  currentScreen() {
    return this.screen;
  }

  snapshot(): RecorderSnapshot {
    return {
      elapsed: this.now(),
      screen: this.screen,
      clicks: this.clicks,
      misclicks: this.misclicks,
      idleSec: this.idleSec,
      lastEvent: this.events[this.events.length - 1],
    };
  }

  allEvents(): SessionEvent[] {
    return [...this.events];
  }

  totalIdleSec() {
    return this.idleSec;
  }

  record(partial: Omit<SessionEvent, "at" | "screen"> & { screen?: string }) {
    const event: SessionEvent = { at: this.now(), screen: this.screen, ...partial };
    this.events.push(event);
    if (event.kind !== "idle") this.lastActivityAt = event.at;
    this.onEvent(event, this.snapshot());
  }

  attach(root: HTMLElement) {
    const coords = (pointer: { clientX: number; clientY: number }) => ({
      x: Math.round(pointer.clientX),
      y: Math.round(pointer.clientY),
      vw: window.innerWidth,
      vh: window.innerHeight,
    });

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (!target) return;
      const interactive = isInteractive(target);
      if (interactive) this.clicks += 1; else this.misclicks += 1;
      this.record({
        kind: interactive ? "click" : "misclick",
        label: interactive ? labelFor(target) : "Missed target",
        ...coords(event),
      });
    };
    root.addEventListener("pointerdown", onPointerDown, true);
    this.cleanup.push(() => root.removeEventListener("pointerdown", onPointerDown, true));

    const onPointerOver = (event: PointerEvent) => {
      if (Date.now() - this.lastHoverAt < HOVER_SAMPLE_MS) return;
      const target = event.target as Element | null;
      if (!target || !isInteractive(target)) return;
      this.lastHoverAt = Date.now();
      this.record({ kind: "hover", label: labelFor(target), ...coords(event) });
    };
    root.addEventListener("pointerover", onPointerOver, true);
    this.cleanup.push(() => root.removeEventListener("pointerover", onPointerOver, true));

    const onScroll = (event: Event) => {
      if (Date.now() - this.lastScrollAt < SCROLL_SAMPLE_MS) return;
      this.lastScrollAt = Date.now();
      const node = event.target as HTMLElement | null;
      this.record({ kind: "scroll", scrollY: Math.round(node?.scrollTop ?? window.scrollY), vw: window.innerWidth, vh: window.innerHeight });
    };
    root.addEventListener("scroll", onScroll, true);
    this.cleanup.push(() => root.removeEventListener("scroll", onScroll, true));

    const onInput = (event: Event) => {
      const target = event.target as HTMLInputElement | null;
      if (!target || !("value" in target)) return;
      this.record({ kind: "input", label: labelFor(target), value: String(target.value).slice(0, 32) });
    };
    root.addEventListener("change", onInput, true);
    this.cleanup.push(() => root.removeEventListener("change", onInput, true));

    const onScreen = (event: Event) => {
      const screen = (event as CustomEvent<{ screen: string }>).detail?.screen;
      if (!screen || screen === this.screen) return;
      this.screen = screen;
      this.record({ kind: "screen", screen });
    };
    window.addEventListener("qcx-screen", onScreen);
    this.cleanup.push(() => window.removeEventListener("qcx-screen", onScreen));

    // Idle detection: one event per continuous quiet stretch.
    this.idleTimer = window.setInterval(() => {
      const quietFor = this.now() - this.lastActivityAt;
      if (quietFor >= IDLE_THRESHOLD_SEC && this.events[this.events.length - 1]?.kind !== "idle") {
        this.record({ kind: "idle", label: `No interaction for ${quietFor}s` });
      }
      if (quietFor >= IDLE_THRESHOLD_SEC) this.idleSec += 1;
    }, 1000);
    this.cleanup.push(() => { if (this.idleTimer) window.clearInterval(this.idleTimer); });
  }

  detach() {
    this.cleanup.forEach((fn) => fn());
    this.cleanup = [];
  }
}
