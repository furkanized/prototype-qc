import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

export const ZOOM_STEPS = [50, 67, 75, 80, 90, 100, 110, 125, 150, 175, 200];
export const ZOOM_MIN = 25;
export const ZOOM_MAX = 300;
const STORAGE_KEY = "qcx-preview-zoom";

export const clampZoom = (value: number) =>
  Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(value)));

function readStoredZoom(): number {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw === null ? NaN : Number(raw);
    return Number.isFinite(parsed) ? clampZoom(parsed) : 100;
  } catch {
    return 100;
  }
}

export interface ZoomController {
  zoom: number;
  setZoom: (value: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
  fitWidth: () => void;
  fitHeight: () => void;
  fitScreen: () => void;
  viewportRef: RefObject<HTMLDivElement | null>;
  canvasRef: RefObject<HTMLDivElement | null>;
}

// Drives the preview zoom: stepped/custom levels, fit-to-viewport modes,
// Ctrl/Cmd shortcuts and wheel zoom, persisted across sessions.
export function useZoomController(): ZoomController {
  const [zoom, setZoomState] = useState(readStoredZoom);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  const setZoom = useCallback((value: number) => {
    const next = clampZoom(value);
    setZoomState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      // Private browsing or blocked storage: zoom still works, just not remembered.
    }
  }, []);

  const zoomIn = useCallback(() => {
    const current = zoomRef.current;
    const next = ZOOM_STEPS.find((step) => step > current);
    setZoom(next ?? Math.min(current + 25, ZOOM_MAX));
  }, [setZoom]);

  const zoomOut = useCallback(() => {
    const current = zoomRef.current;
    const prev = [...ZOOM_STEPS].reverse().find((step) => step < current);
    setZoom(prev ?? Math.max(current - 25, ZOOM_MIN));
  }, [setZoom]);

  const reset = useCallback(() => setZoom(100), [setZoom]);

  // The canvas renders under CSS zoom, so its bounding rect is in real viewport
  // pixels. Fit = current zoom scaled by how much the rendered size must change.
  const measure = useCallback(() => {
    const viewport = viewportRef.current;
    const canvas = canvasRef.current;
    if (!viewport || !canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return null;
    return {
      widthZoom: (viewport.clientWidth / rect.width) * zoomRef.current,
      heightZoom: (viewport.clientHeight / rect.height) * zoomRef.current,
    };
  }, []);

  const fitWidth = useCallback(() => {
    const m = measure();
    if (m) setZoom(m.widthZoom);
  }, [measure, setZoom]);

  const fitHeight = useCallback(() => {
    const m = measure();
    if (m) setZoom(m.heightZoom);
  }, [measure, setZoom]);

  const fitScreen = useCallback(() => {
    const m = measure();
    if (m) setZoom(Math.min(m.widthZoom, m.heightZoom));
  }, [measure, setZoom]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        zoomIn();
      } else if (event.key === "-") {
        event.preventDefault();
        zoomOut();
      } else if (event.key === "0") {
        event.preventDefault();
        reset();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [zoomIn, zoomOut, reset]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const handleWheel = (event: WheelEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      event.preventDefault();
      // Multiplicative steps feel uniform across the whole 25–300 range.
      const factor = Math.exp(-event.deltaY * 0.0015);
      setZoom(zoomRef.current * factor);
    };
    viewport.addEventListener("wheel", handleWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", handleWheel);
  }, [setZoom]);

  return { zoom, setZoom, zoomIn, zoomOut, reset, fitWidth, fitHeight, fitScreen, viewportRef, canvasRef };
}
