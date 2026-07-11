import { useEffect, useRef, useState } from "react";
import { Icon } from "../../components/Icon";
import { clampZoom, ZOOM_MAX, ZOOM_MIN } from "./useZoomController";
import type { ZoomController } from "./useZoomController";

interface ZoomToolbarProps {
  controller: ZoomController;
  presenting: boolean;
  onTogglePresent: () => void;
}

// Inline-editable percentage readout: click to type a custom 25–300 value.
function ZoomReadout({ zoom, onCommit }: { zoom: number; onCommit: (value: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(zoom));
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  if (!editing) {
    return (
      <button
        className="qcx-zoom-readout"
        title={`Zoom level (click to type ${ZOOM_MIN}–${ZOOM_MAX}%)`}
        onClick={() => { setDraft(String(zoom)); setEditing(true); }}
      >
        {zoom}%
      </button>
    );
  }

  const commit = () => {
    const parsed = Number(draft.replace("%", "").trim());
    if (Number.isFinite(parsed) && parsed > 0) onCommit(clampZoom(parsed));
    setEditing(false);
  };

  return (
    <input
      ref={inputRef}
      className="qcx-zoom-input"
      value={draft}
      inputMode="numeric"
      aria-label={`Custom zoom percentage, ${ZOOM_MIN} to ${ZOOM_MAX}`}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") commit();
        if (event.key === "Escape") setEditing(false);
        event.stopPropagation();
      }}
    />
  );
}

export function ZoomToolbar({ controller, presenting, onTogglePresent }: ZoomToolbarProps) {
  const { zoom, setZoom, zoomIn, zoomOut, reset, fitWidth, fitHeight, fitScreen } = controller;

  return (
    <div
      className={`qcx-zoom-toolbar ${presenting ? "presenting" : ""}`}
      role="toolbar"
      aria-label="Preview zoom controls"
    >
      <button className="qcx-dock-button" aria-label="Zoom out" title="Zoom out (Ctrl/Cmd −)" disabled={zoom <= ZOOM_MIN} onClick={zoomOut}>
        <Icon icon="remove" size={18} />
      </button>
      <ZoomReadout zoom={zoom} onCommit={setZoom} />
      <button className="qcx-dock-button" aria-label="Zoom in" title="Zoom in (Ctrl/Cmd +)" disabled={zoom >= ZOOM_MAX} onClick={zoomIn}>
        <Icon icon="add" size={18} />
      </button>
      <span className="qcx-dock-divider" />
      <button className="qcx-dock-button" aria-label="Reset zoom to 100%" title="Reset to 100% (Ctrl/Cmd 0)" onClick={reset}>
        <Icon icon="refresh" size={17} />
      </button>
      {!presenting ? (
        <>
          <button className="qcx-dock-button" aria-label="Fit width" title="Fit width" onClick={fitWidth}>
            <Icon icon="width" size={18} />
          </button>
          <button className="qcx-dock-button" aria-label="Fit height" title="Fit height" onClick={fitHeight}>
            <Icon icon="height" size={18} />
          </button>
          <button className="qcx-dock-button" aria-label="Fit screen" title="Fit screen" onClick={fitScreen}>
            <Icon icon="fit_screen" size={18} />
          </button>
          <span className="qcx-dock-divider" />
        </>
      ) : null}
      <button
        className="qcx-dock-button"
        aria-label={presenting ? "Exit presentation mode" : "Enter presentation mode"}
        title={presenting ? "Exit presentation mode" : "Presentation mode"}
        onClick={onTogglePresent}
      >
        <Icon icon={presenting ? "fullscreen_exit" : "present_to_all"} size={18} />
      </button>
    </div>
  );
}
