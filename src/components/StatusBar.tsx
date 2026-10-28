import { Maximize, Minus, PanelRightClose, PanelRightOpen, Plus } from "lucide-react";
import { useAppStore } from "../store/appStore";
import { resetView, zoomBy } from "../canvas/viewport";

export function StatusBar() {
  const zoom = useAppStore((s) => s.zoom);
  const panelOpen = useAppStore((s) => s.panelOpen);
  const setPanelOpen = useAppStore((s) => s.setPanelOpen);

  return (
    <div className="zoom-controls">
      <button
        title={panelOpen ? "Hide style panel (more room for the board)" : "Show style panel"}
        aria-label={panelOpen ? "Hide style panel" : "Show style panel"}
        aria-pressed={panelOpen}
        onClick={() => setPanelOpen(!panelOpen)}
      >
        {panelOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
      </button>
      <button title="Zoom out (Ctrl -)" aria-label="Zoom out" onClick={() => zoomBy(1 / 1.2)}>
        <Minus size={16} />
      </button>
      <button className="zoom-value" title="Reset view (Ctrl 0)" onClick={resetView}>
        {Math.round(zoom * 100)}%
      </button>
      <button title="Zoom in (Ctrl +)" aria-label="Zoom in" onClick={() => zoomBy(1.2)}>
        <Plus size={16} />
      </button>
      <button title="Reset view (Ctrl 0)" aria-label="Reset view" onClick={resetView}>
        <Maximize size={15} />
      </button>
    </div>
  );
}
