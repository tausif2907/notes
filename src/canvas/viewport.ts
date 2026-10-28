import { Point, type Canvas, type TMat2D, type TPointerEvent } from "fabric";
import { useAppStore } from "../store/appStore";
import { SHEET_MARGIN, SHEET_WIDTH } from "./sheet";

export const MIN_ZOOM = 0.2;
export const MAX_ZOOM = 5;

let activeCanvas: Canvas | null = null;
let onViewportChange: ((vpt: TMat2D) => void) | null = null;

/** True while a pan drag is in progress; other handlers should ignore the gesture. */
export let isPanning = () => false;

const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

/**
 * Keeps the sheet in view: centred when it fits across the screen, its
 * side edges never pulled past the screen's sides, and nothing above its
 * top edge. Scrolling down is unlimited.
 */
function clampToSheet(canvas: Canvas) {
  const vpt = [...canvas.viewportTransform] as TMat2D;
  const width = canvas.getWidth();
  const sheet = SHEET_WIDTH * vpt[0];
  if (sheet + 2 * SHEET_MARGIN <= width) vpt[4] = (width - sheet) / 2;
  else vpt[4] = Math.min(SHEET_MARGIN, Math.max(width - SHEET_MARGIN - sheet, vpt[4]));
  vpt[5] = Math.min(SHEET_MARGIN, vpt[5]);
  canvas.setViewportTransform(vpt);
}

function notify(canvas: Canvas) {
  clampToSheet(canvas);
  canvas.requestRenderAll();
  onViewportChange?.(canvas.viewportTransform);
  useAppStore.getState().setZoom(canvas.getZoom());
}

/** True until the user zooms; while true the sheet keeps fitting the width. */
let fitWidth = true;

/** Zoom that fits the whole sheet width on screen, at most 100%. */
const fittingZoom = (canvas: Canvas) =>
  clampZoom(Math.min(1, (canvas.getWidth() - 2 * SHEET_MARGIN) / SHEET_WIDTH));

/**
 * After the window or style panel changes size: re-fit the sheet (unless
 * the user chose a zoom), keeping the same part of the sheet at the top.
 */
export function viewportResized() {
  const canvas = activeCanvas;
  if (!canvas) return;
  if (fitWidth) {
    const vpt = canvas.viewportTransform;
    const topOfView = (SHEET_MARGIN - vpt[5]) / vpt[0];
    const zoom = fittingZoom(canvas);
    canvas.setViewportTransform([zoom, 0, 0, zoom, 0, SHEET_MARGIN - topOfView * zoom]);
  }
  notify(canvas);
}

/** Zoom by a factor, keeping the given screen point fixed (defaults to centre). */
export function zoomBy(factor: number, at?: Point) {
  const canvas = activeCanvas;
  if (!canvas) return;
  const point = at ?? new Point(canvas.getWidth() / 2, canvas.getHeight() / 2);
  canvas.zoomToPoint(point, clampZoom(canvas.getZoom() * factor));
  fitWidth = false;
  notify(canvas);
}

/** Shows the top of the sheet at 100%, or smaller if the sheet is too wide to fit. */
export function resetView() {
  const canvas = activeCanvas;
  if (!canvas) return;
  const zoom = fittingZoom(canvas);
  canvas.setViewportTransform([zoom, 0, 0, zoom, 0, SHEET_MARGIN]);
  fitWidth = true;
  notify(canvas);
}

/** Feeds zoom and pan to the CSS sheet and pattern so they move with the board. */
export function paintBackground(host: HTMLElement, vpt: TMat2D) {
  host.style.setProperty("--zoom", String(vpt[0]));
  host.style.setProperty("--pan-x", `${vpt[4]}px`);
  host.style.setProperty("--pan-y", `${vpt[5]}px`);
}

/**
 * Wheel to pan (Ctrl+wheel or pinch to zoom), and drag to pan with the
 * hand tool, a held Space key, or the middle mouse button.
 */
export function attachViewport(canvas: Canvas, host: HTMLElement) {
  activeCanvas = canvas;
  onViewportChange = (vpt) => paintBackground(host, vpt);
  paintBackground(host, canvas.viewportTransform);

  let spaceHeld = false;
  let panning = false;
  let last = { x: 0, y: 0 };

  const wantsPan = (e: TPointerEvent) =>
    useAppStore.getState().tool === "hand" ||
    spaceHeld ||
    ("button" in e && e.button === 1);

  const updateCursor = () => {
    const tool = useAppStore.getState().tool;
    const pan = tool === "hand" || spaceHeld;
    const cursor = tool === "text" ? "text" : tool === "select" ? "default" : "crosshair";
    canvas.defaultCursor = panning ? "grabbing" : pan ? "grab" : cursor;
    canvas.selection = !pan && tool === "select";
    canvas.isDrawingMode = !pan && (tool === "pen" || tool === "highlighter");
    // Panning and placing new items must not grab or drag existing ones.
    canvas.skipTargetFind = pan || (tool !== "select" && tool !== "text");
    canvas.setCursor(canvas.defaultCursor);
  };
  updateCursor();
  isPanning = () => panning;

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
