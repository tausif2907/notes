import {
  ActiveSelection,
  IText,
  InteractiveFabricObject,
  type Canvas,
  type FabricObject,
  type TPointerEvent,
} from "fabric";
import { useAppStore, type Tool } from "../store/appStore";
import { History } from "./history";
import { NOTE_PRESETS, NoteText, type NoteKind } from "./noteText";
import { session } from "./session";
import { publishSelection, toggleTextStyle } from "./styling";
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

/** Tools that place a new item where you click. */
const CREATE_TOOLS: Partial<Record<Tool, NoteKind>> = {
  text: "text",
  sticky: "sticky",
  textbox: "box",
  bubble: "bubble",
};

const isEditingText = (obj: FabricObject | undefined): obj is IText =>
  obj instanceof IText && obj.isEditing;

function stopEditing() {
  const active = session.canvas?.getActiveObject();
  if (isEditingText(active)) active.exitEditing();
}

/** Creates an item at the pointer and starts typing in it. */
function addNoteAt(canvas: Canvas, e: TPointerEvent, kind: NoteKind) {
  const p = canvas.getScenePoint(e);
  const note = new NoteText("", NOTE_PRESETS[kind]);
  // Plain text starts at the click like a text cursor; cards centre on it.
  if (kind === "text") note.set({ left: p.x, top: p.y - note.fontSize * 0.65 });
  else note.set({ left: p.x - note.width / 2, top: p.y - note.height / 2 });
  canvas.add(note);
  canvas.setActiveObject(note);
  note.enterEditing();
  canvas.requestRenderAll();
}

export function undo() {
  stopEditing();
  return session.history?.undo();
}

export function redo() {
  stopEditing();
  return session.history?.redo();
}

export function deleteSelection() {
  const canvas = session.canvas;
  if (!canvas) return;
  const objects = canvas.getActiveObjects();
  if (objects.length === 0) return;
  canvas.discardActiveObject();
  canvas.remove(...objects);
  canvas.requestRenderAll();
  session.history?.record();
}

export async function duplicateSelection() {
  const canvas = session.canvas;
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
  session.history?.record();
}

export function selectAll() {
  const canvas = session.canvas;
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
 * Create tools, editing shortcuts, undo history and per-board content.
 * Must be attached after the viewport so pan gestures are seen first.
 */
export function attachEditor(canvas: Canvas) {
  const store = useAppStore.getState;
  const history = new History(canvas, store().setHistoryState);
  session.canvas = canvas;
  session.history = history;
  history.reset();

  // A click (not a drag-to-pan) with a create tool places a new item.
  // With the text tool, clicking existing text edits it instead.
  let createKind: NoteKind | undefined;
  canvas.on("mouse:down", ({ e }) => {
    const leftButton = !("button" in e) || e.button === 0;
    createKind = leftButton && !isPanning() ? CREATE_TOOLS[store().tool] : undefined;
  });
  canvas.on("mouse:up", ({ e, target }) => {
    if (!createKind) return;
    const kind = createKind;
    createKind = undefined;
    if (kind === "text" && target instanceof IText) {
      canvas.setActiveObject(target);
      if (!target.isEditing) target.enterEditing();
    } else {
      addNoteAt(canvas, e, kind);
    }
    store().setTool("select");
  });

  // Double-clicking empty board with the select tool also starts new text.
  canvas.on("mouse:dblclick", ({ e, target }) => {
    if (!target && store().tool === "select" && !isPanning()) addNoteAt(canvas, e, "text");
  });

  canvas.on("text:editing:exited", ({ target }) => {
    if (target.text.trim() === "") canvas.remove(target);
    history.record();
  });
  canvas.on("object:modified", () => history.record());

  for (const event of [
    "selection:created",
    "selection:updated",
    "selection:cleared",
    "text:selection:changed",
    "text:editing:entered",
    "text:editing:exited",
  ] as const) {
    canvas.on(event, publishSelection);
  }

  const isTyping = (e: KeyboardEvent) =>
    e.target instanceof HTMLInputElement ||
    e.target instanceof HTMLTextAreaElement ||
    (e.target as HTMLElement | null)?.isContentEditable;

  const onKeyDown = (e: KeyboardEvent) => {
    const active = canvas.getActiveObject();
    const key = e.key.toLowerCase();
    if (e.key === "Escape") {
      if (isEditingText(active)) active.exitEditing();
      else canvas.discardActiveObject();
      canvas.requestRenderAll();
      return;
    }
    // Formatting shortcuts work both while typing and on selected items.
    if (e.ctrlKey && !e.shiftKey && (key === "b" || key === "i" || key === "u")) {
      if (canvas.getActiveObjects().some((o) => o instanceof NoteText)) {
        toggleTextStyle(key === "b" ? "bold" : key === "i" ? "italic" : "underline");
        e.preventDefault();
      }
      return;
    }
    if (isTyping(e) || isEditingText(active)) return;

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
    stopEditing();
    contents.set(prev.activeBoardId, history.snapshot());
    await history.load(contents.get(s.activeBoardId) ?? '{"objects":[]}');
    history.reset();
    resetView();
  });

  return () => {
    window.removeEventListener("keydown", onKeyDown);
    unsubscribe();
    if (session.canvas === canvas) {
      session.canvas = null;
      session.history = null;
    }
  };
}
