import { Point, type Canvas, type TMat2D, type TPointerEvent } from "fabric";
import { useAppStore } from "../store/appStore";

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 5;
const DOT_SPACING = 24;

let activeCanvas: Canvas | null = null;
let onViewportChange: ((vpt: TMat2D) => void) | null = null;

const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

function notify(canvas: Canvas) {
  canvas.requestRenderAll();
  onViewportChange?.(canvas.viewportTransform);
  useAppStore.getState().setZoom(canvas.getZoom());
}

/** Zoom by a factor, keeping the given screen point fixed (defaults to centre). */
export function zoomBy(factor: number, at?: Point) {
  const canvas = activeCanvas;
  if (!canvas) return;
  const point = at ?? new Point(canvas.getWidth() / 2, canvas.getHeight() / 2);
  canvas.zoomToPoint(point, clampZoom(canvas.getZoom() * factor));
  notify(canvas);
}

export function resetView() {
  const canvas = activeCanvas;
  if (!canvas) return;
  canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
  notify(canvas);
}

/** Moves the dotted background so it pans and scales with the board. */
export function paintDots(host: HTMLElement, vpt: TMat2D) {
  const size = DOT_SPACING * vpt[0];
  host.style.backgroundSize = `${size}px ${size}px`;
  host.style.backgroundPosition = `${vpt[4]}px ${vpt[5]}px`;
}

/**
 * Wheel to pan (Ctrl+wheel or pinch to zoom), and drag to pan with the
 * hand tool, a held Space key, or the middle mouse button.
 */
export function attachViewport(canvas: Canvas, host: HTMLElement) {
  activeCanvas = canvas;
  onViewportChange = (vpt) => paintDots(host, vpt);
  paintDots(host, canvas.viewportTransform);

  let spaceHeld = false;
  let panning = false;
  let last = { x: 0, y: 0 };

  const wantsPan = (e: TPointerEvent) =>
    useAppStore.getState().tool === "hand" ||
    spaceHeld ||
    ("button" in e && e.button === 1);

  const updateCursor = () => {
    const pan = useAppStore.getState().tool === "hand" || spaceHeld;
    canvas.defaultCursor = panning ? "grabbing" : pan ? "grab" : "default";
    canvas.selection = !pan;
    canvas.setCursor(canvas.defaultCursor);
  };

  canvas.on("mouse:wheel", ({ e }) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.ctrlKey) {
      zoomBy(0.999 ** e.deltaY, canvas.getViewportPoint(e));
    } else {
      const dx = e.shiftKey ? e.deltaY : e.deltaX;
      const dy = e.shiftKey ? 0 : e.deltaY;
      canvas.relativePan(new Point(-dx, -dy));
      notify(canvas);
    }
  });

  canvas.on("mouse:down", ({ e }) => {
    if (!wantsPan(e)) return;
    panning = true;
    canvas.discardActiveObject();
    const p = canvas.getViewportPoint(e);
    last = { x: p.x, y: p.y };
    updateCursor();
  });

  canvas.on("mouse:move", ({ e }) => {
    if (!panning) return;
    const p = canvas.getViewportPoint(e);
    canvas.relativePan(new Point(p.x - last.x, p.y - last.y));
    last = { x: p.x, y: p.y };
    notify(canvas);
  });

  canvas.on("mouse:up", () => {
    if (!panning) return;
    panning = false;
    updateCursor();
  });

  const isTyping = (e: KeyboardEvent) =>
    e.target instanceof HTMLInputElement ||
    e.target instanceof HTMLTextAreaElement ||
    (e.target as HTMLElement | null)?.isContentEditable;

  const onKeyDown = (e: KeyboardEvent) => {
    if (isTyping(e)) return;
    if (e.code === "Space" && !spaceHeld) {
      spaceHeld = true;
      updateCursor();
      e.preventDefault();
    } else if (e.ctrlKey && (e.key === "=" || e.key === "+")) {
      zoomBy(1.2);
      e.preventDefault();
    } else if (e.ctrlKey && e.key === "-") {
      zoomBy(1 / 1.2);
      e.preventDefault();
    } else if (e.ctrlKey && e.key === "0") {
      resetView();
      e.preventDefault();
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    if (e.code === "Space") {
      spaceHeld = false;
      updateCursor();
    }
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  const unsubscribe = useAppStore.subscribe((s, prev) => {
    if (s.tool !== prev.tool) updateCursor();
  });

  return () => {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    unsubscribe();
    if (activeCanvas === canvas) {
      activeCanvas = null;
      onViewportChange = null;
    }
  };
}
