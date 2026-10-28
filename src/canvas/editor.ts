import {
  ActiveSelection,
  IText,
  InteractiveFabricObject,
  Textbox,
  type Canvas,
  type FabricObject,
  type TPointerEvent,
} from "fabric";
import { useAppStore } from "../store/appStore";
import { History } from "./history";
import { isPanning, resetView } from "./viewport";

const ACCENT = "#6366f1";
const DUPLICATE_OFFSET = 20;

// Selection handles for every object on the board.
Object.assign(InteractiveFabricObject.ownDefaults, {
  borderColor: ACCENT,
  cornerColor: "#ffffff",
  cornerStrokeColor: ACCENT,
  cornerStyle: "circle",
  cornerSize: 10,
  transparentCorners: false,
  borderScaleFactor: 1.5,
  padding: 6,
});

const TEXT_DEFAULTS = {
  width: 260,
  fontSize: 20,
  lineHeight: 1.3,
  fontFamily: '"Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif',
  fill: "#2b2a27",
  originX: "left",
  originY: "top",
  editingBorderColor: ACCENT,
  cursorColor: ACCENT,
  selectionColor: "rgba(99, 102, 241, 0.25)",
} as const;

let activeCanvas: Canvas | null = null;
let history: History | null = null;

const isEditingText = (obj: FabricObject | undefined): obj is IText =>
  obj instanceof IText && obj.isEditing;

/** Creates an empty text box at the pointer and starts typing in it. */
function addTextAt(canvas: Canvas, e: TPointerEvent) {
  const p = canvas.getScenePoint(e);
  const text = new Textbox("", {
    ...TEXT_DEFAULTS,
    left: p.x,
    top: p.y - TEXT_DEFAULTS.fontSize * 0.65,
  });
  canvas.add(text);
  canvas.setActiveObject(text);
  text.enterEditing();
  canvas.requestRenderAll();
}

export function undo() {
  const canvas = activeCanvas;
  const active = canvas?.getActiveObject();
  if (isEditingText(active)) active.exitEditing();
  return history?.undo();
}

export function redo() {
  const canvas = activeCanvas;
  const active = canvas?.getActiveObject();
  if (isEditingText(active)) active.exitEditing();
  return history?.redo();
}

export function deleteSelection() {
  const canvas = activeCanvas;
  if (!canvas) return;
  const objects = canvas.getActiveObjects();
  if (objects.length === 0) return;
  canvas.discardActiveObject();
  canvas.remove(...objects);
  canvas.requestRenderAll();
  history?.record();
}

export async function duplicateSelection() {
  const canvas = activeCanvas;
  const active = canvas?.getActiveObject();
  if (!canvas || !active) return;
  const copy = await active.clone();
  canvas.discardActiveObject();
  copy.set({ left: copy.left + DUPLICATE_OFFSET, top: copy.top + DUPLICATE_OFFSET });
  if (copy instanceof ActiveSelection) {
    copy.canvas = canvas;
    copy.forEachObject((obj) => canvas.add(obj));
    copy.setCoords();
  } else {
    canvas.add(copy);
  }
  canvas.setActiveObject(copy);
  canvas.requestRenderAll();
  history?.record();
}

export function selectAll() {
  const canvas = activeCanvas;
  if (!canvas) return;
  const objects = canvas.getObjects();
  if (objects.length === 0) return;
  canvas.discardActiveObject();
  canvas.setActiveObject(
    objects.length === 1 ? objects[0] : new ActiveSelection(objects, { canvas }),
  );
  canvas.requestRenderAll();
}

/**
 * Text tool, editing shortcuts, undo history and per-board content.
 * Must be attached after the viewport so pan gestures are seen first.
 */
export function attachEditor(canvas: Canvas) {
  activeCanvas = canvas;
  const store = useAppStore.getState;
  const hist = new History(canvas, store().setHistoryState);
  history = hist;
  hist.reset();

  // Text tool: a click (not a drag-to-pan) creates text, or edits the text clicked.
  let textClick = false;
  canvas.on("mouse:down", ({ e }) => {
    textClick = store().tool === "text" && !isPanning() && !("button" in e && e.button !== 0);
  });
  canvas.on("mouse:up", ({ e, target }) => {
    if (!textClick) return;
    textClick = false;
    if (target instanceof IText) {
      canvas.setActiveObject(target);
      if (!target.isEditing) target.enterEditing();
    } else {
      addTextAt(canvas, e);
    }
    store().setTool("select");
  });

  // Double-clicking empty board with the select tool also starts new text.
  canvas.on("mouse:dblclick", ({ e, target }) => {
    if (!target && store().tool === "select" && !isPanning()) addTextAt(canvas, e);
  });

  canvas.on("text:editing:exited", ({ target }) => {
    if (target.text.trim() === "") canvas.remove(target);
    hist.record();
  });
  canvas.on("object:modified", () => hist.record());

  const isTyping = (e: KeyboardEvent) =>
    e.target instanceof HTMLInputElement ||
    e.target instanceof HTMLTextAreaElement ||
    (e.target as HTMLElement | null)?.isContentEditable;

  const onKeyDown = (e: KeyboardEvent) => {
    const active = canvas.getActiveObject();
    if (e.key === "Escape") {
      if (isEditingText(active)) active.exitEditing();
      else canvas.discardActiveObject();
      canvas.requestRenderAll();
      return;
    }
    if (isTyping(e) || isEditingText(active)) return;

    const key = e.key.toLowerCase();
    if (e.ctrlKey && key === "z" && !e.shiftKey) void undo();
    else if (e.ctrlKey && (key === "y" || key === "z")) void redo();
    else if (e.ctrlKey && key === "d") void duplicateSelection();
    else if (e.ctrlKey && key === "a") selectAll();
    else if (!e.ctrlKey && (e.key === "Delete" || e.key === "Backspace")) deleteSelection();
    else return;
    e.preventDefault();
  };
  window.addEventListener("keydown", onKeyDown);

  // Each board keeps its own content (in memory until saving lands in Phase 4).
  const contents = new Map<string, string>();
  const unsubscribe = useAppStore.subscribe(async (s, prev) => {
    if (s.activeBoardId === prev.activeBoardId) return;
    const active = canvas.getActiveObject();
    if (isEditingText(active)) active.exitEditing();
    contents.set(prev.activeBoardId, hist.snapshot());
    await hist.load(contents.get(s.activeBoardId) ?? '{"objects":[]}');
    hist.reset();
    resetView();
  });

  return () => {
    window.removeEventListener("keydown", onKeyDown);
    unsubscribe();
    if (activeCanvas === canvas) {
      activeCanvas = null;
      history = null;
    }
  };
}
