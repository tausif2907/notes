import {
  ActiveSelection,
  FabricText,
  IText,
  InteractiveFabricObject,
  Path,
  PencilBrush,
  Point,
  util,
  type Canvas,
  type FabricObject,
  type TPointerEvent,
} from "fabric";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { loadContent } from "../db/persistence";
import { useAppStore, type Tool } from "../store/appStore";
import { EMOJI_FONT } from "../theme";
import { prepareImageBlob, registerAsset } from "./assets";
import { flushSave, scheduleSave } from "./autosave";
import { croppingImage, finishCrop, onCropChange, startCrop } from "./crop";
import { History } from "./history";
import { NoteImage } from "./noteImage";
import { openPdf } from "./pdfImport";
import { NOTE_PRESETS, NoteText, type NoteKind } from "./noteText";
import { session } from "./session";
import { keepInside } from "./sheet";
import { publishSelection, toggleTextStyle } from "./styling";
import { ERASER_RADIUS, isPanning, resetView } from "./viewport";

const ACCENT = "#6366f1";
const DUPLICATE_OFFSET = 20;
const MAX_NEW_IMAGE = 480;

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

/** "#rrggbb" to "rgba(r, g, b, alpha)". */
function withAlpha(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

const isEditingText = (obj: FabricObject | undefined): obj is IText =>
  obj instanceof IText && obj.isEditing;

/** Finishes any typing or cropping in progress before a board-wide action. */
function settle() {
  const active = session.canvas?.getActiveObject();
  if (isEditingText(active)) active.exitEditing();
  finishCrop(true);
}

const imageFiles = (files: Iterable<File | null>) =>
  [...files].filter((f): f is File => !!f && f.type.startsWith("image/"));

/** Adds image files to the board, centred on a point (default: the view's centre). */
export async function insertImages(files: Blob[], at?: Point) {
  const canvas = session.canvas;
  if (!canvas || files.length === 0) return;
  settle();
  const center = at ?? canvas.getVpCenter();
  // New images show at most about 480px on screen at the current zoom.
  const maxSide = MAX_NEW_IMAGE / canvas.getZoom();
  const added: NoteImage[] = [];
  for (const [i, file] of files.entries()) {
    try {
      const { id, url } = registerAsset(await prepareImageBlob(file));
      const element = await util.loadImage(url);
      const image = new NoteImage(element, { assetId: id });
      image.scale(Math.min(1, maxSide / Math.max(image.width, image.height)));
      const offset = i * DUPLICATE_OFFSET;
      image.setPositionByOrigin(new Point(center.x + offset, center.y + offset), "center", "center");
      canvas.add(image);
      added.push(image);
    } catch (err) {
      useAppStore.getState().showNotice(err instanceof Error ? err.message : "Could not add that image.");
    }
  }
  if (added.length === 0) return;
  canvas.discardActiveObject();
  canvas.setActiveObject(added.length === 1 ? added[0] : new ActiveSelection(added, { canvas }));
  canvas.requestRenderAll();
  session.history?.record();
}

/** Adds an item in the middle of the view, selected, as one undo step. */
function placeInView(obj: FabricObject) {
  const canvas = session.canvas;
  if (!canvas) return;
  settle();
  obj.setPositionByOrigin(canvas.getVpCenter(), "center", "center");
  canvas.add(obj);
  canvas.setActiveObject(obj);
  canvas.requestRenderAll();
  useAppStore.getState().setTool("select");
  session.history?.record();
}

export function addEmoji(emoji: string) {
  placeInView(new FabricText(emoji, { fontSize: 72, fontFamily: EMOJI_FONT, originX: "left", originY: "top" }));
}

/** A coloured pill label such as "TO DO"; it stays editable like any text. */
export function addBadge({ text, fill }: { text: string; fill: string }) {
  const badge = new NoteText(text, {
    ...NOTE_PRESETS.box,
    cardFill: fill,
    cardStroke: "",
    cardStrokeWidth: 0,
    cornerRadius: 28,
    cardPadding: 10,
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  });
  // Shrink the pill to fit its word.
  badge.set({ width: badge.getLineWidth(0) + 2 * badge.cardPadding + 4 });
  placeInView(badge);
}

/** Opens the system file picker for images. */
function pickImages() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.multiple = true;
  input.onchange = () => void insertImages(imageFiles(input.files ?? []));
  input.click();
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
  settle();
  return session.history?.undo();
}

export function redo() {
  settle();
  return session.history?.redo();
}

export function deleteSelection() {
  const canvas = session.canvas;
  if (!canvas) return;
  finishCrop(true);
  const objects = canvas.getActiveObjects();
  if (objects.length === 0) return;
  canvas.discardActiveObject();
  canvas.remove(...objects);
  canvas.requestRenderAll();
  session.history?.record();
}

export async function duplicateSelection() {
  const canvas = session.canvas;
  finishCrop(true);
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
export function attachEditor(canvas: Canvas, host: HTMLElement) {
  const store = useAppStore.getState;
  const history = new History(canvas, store().setHistoryState, scheduleSave);
  session.canvas = canvas;
  session.history = history;

  // Loads a board from the database. A newer request wins if boards are
  // switched quickly; saving is paused until the board is fully on screen.
  let loadToken = 0;
  const openBoard = async (boardId: string) => {
    const token = ++loadToken;
    settle();
    await flushSave();
    session.boardId = null;
    let json: string;
    try {
      json = await loadContent(boardId);
    } catch (err) {
      console.error(err);
      store().showNotice("This board could not be opened.");
      json = '{"objects":[]}';
    }
    if (token !== loadToken) return;
    await history.load(json);
    if (token !== loadToken) return;
    session.boardId = boardId;
    history.reset();
    resetView();
  };
  void openBoard(store().activeBoardId);

  // Typing is only an undo step once it finishes, but it is saved as you go.
  canvas.on("text:changed", scheduleSave);

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

  // Double-click: empty board starts new text, an image starts cropping.
  canvas.on("mouse:dblclick", ({ e, target }) => {
    if (store().tool !== "select" || isPanning()) return;
    if (!target) addNoteAt(canvas, e, "text");
    else if (target instanceof NoteImage && !croppingImage()) startCrop(target);
  });

  // Selecting something else, or nothing, keeps the crop so far.
  const keepCropOnDeselect = () => {
    const image = croppingImage();
    if (image && canvas.getActiveObject() !== image) finishCrop(true);
  };
  canvas.on("selection:updated", keepCropOnDeselect);
  canvas.on("selection:cleared", keepCropOnDeselect);
  const stopCropListener = onCropChange(publishSelection);

  canvas.on("text:editing:exited", ({ target }) => {
    if (target.text.trim() === "") canvas.remove(target);
    history.record();
  });
  // Items always stay on the sheet: while dragging, after resizing or
  // rotating, and when added (which also pulls in items from older boards).
  // Pen and highlighter: the brush follows the chosen colour and size.
  // Highlighter strokes multiply with what is underneath, like a real
  // marker, so text under them stays readable.
  const applyBrush = () => {
    const { tool, drawing } = store();
    if (tool !== "pen" && tool !== "highlighter") return;
    const { color, size } = drawing[tool];
    const brush = new PencilBrush(canvas);
    brush.width = size;
    brush.decimate = 2;
    brush.strokeLineCap = "round";
    brush.strokeLineJoin = "round";
    // While drawing, a see-through preview; the finished stroke multiplies.
    brush.color = tool === "highlighter" ? withAlpha(color, 0.55) : color;
    canvas.freeDrawingBrush = brush;
  };
  applyBrush();
  canvas.on("path:created", ({ path }) => {
    if (store().tool === "highlighter") {
      path.set({ stroke: store().drawing.highlighter.color, globalCompositeOperation: "multiply" });
    }
    keepInside(path);
    history.record();
  });

  // Eraser: drag over pen and highlighter strokes to remove them, whole
  // stroke at a time. Hits are pixel-accurate; notes and images are never
  // erased. One drag is one undo step.
  let erasing = false;
  let erasedAny = false;
  let lastErase: Point | null = null;
  const eraseAt = (at: Point) => {
    const radius = ERASER_RADIUS / canvas.getZoom();
    const scene = at.transform(util.invertTransform(canvas.viewportTransform));
    for (const obj of canvas.getObjects()) {
      if (!(obj instanceof Path)) continue;
      const box = obj.getBoundingRect();
      const near =
        scene.x > box.left - radius && scene.x < box.left + box.width + radius &&
        scene.y > box.top - radius && scene.y < box.top + box.height + radius;
      if (near && !canvas.isTargetTransparent(obj, at.x, at.y)) {
        canvas.remove(obj);
        erasedAny = true;
      }
    }
  };
  // Fast drags jump between pointer events, so test the points in between.
  const eraseAlong = (to: Point) => {
    const from = lastErase ?? to;
    const steps = Math.max(1, Math.ceil(from.distanceFrom(to) / ERASER_RADIUS));
    for (let i = 1; i <= steps; i++) eraseAt(from.lerp(to, i / steps));
    lastErase = to;
    canvas.requestRenderAll();
  };
  canvas.on("mouse:down", ({ e }) => {
    if (store().tool !== "eraser" || isPanning()) return;
    erasing = true;
    erasedAny = false;
    lastErase = null;
    canvas.setTargetFindTolerance(ERASER_RADIUS);
    eraseAlong(canvas.getViewportPoint(e));
  });
  canvas.on("mouse:move", ({ e }) => {
    if (erasing) eraseAlong(canvas.getViewportPoint(e));
  });
  canvas.on("mouse:up", () => {
    if (!erasing) return;
    erasing = false;
    canvas.setTargetFindTolerance(0);
    if (erasedAny) history.record();
  });

  canvas.on("object:moving", ({ target }) => keepInside(target));
  canvas.on("object:added", ({ target }) => {
    if (!target.excludeFromExport) keepInside(target);
  });
  canvas.on("object:modified", ({ target }) => {
    keepInside(target);
    history.record();
  });

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

  const isTyping = (e: Event) =>
    e.target instanceof HTMLInputElement ||
    e.target instanceof HTMLTextAreaElement ||
    (e.target as HTMLElement | null)?.isContentEditable;

  const onKeyDown = (e: KeyboardEvent) => {
    if (store().view !== "board") return;
    const active = canvas.getActiveObject();
    const key = e.key.toLowerCase();
    if (croppingImage() && (e.key === "Escape" || e.key === "Enter")) {
      finishCrop(e.key === "Enter");
      e.preventDefault();
      return;
    }
    if (e.key === "Escape") {
      if (isEditingText(active)) active.exitEditing();
      else if (store().tool !== "select") store().setTool("select");
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

  // Ctrl+V: images from the clipboard (e.g. screenshots) go on the board;
  // plain text becomes a new text item unless you are typing somewhere.
  const onPaste = (e: ClipboardEvent) => {
    const data = e.clipboardData;
    if (!data || store().view !== "board") return;
    const images = imageFiles([...data.items].map((item) => item.getAsFile()));
    if (images.length > 0) {
      e.preventDefault();
      void insertImages(images);
      return;
    }
    if (isTyping(e) || isEditingText(canvas.getActiveObject())) return;
    const text = data.getData("text/plain").trim();
    if (!text) return;
    e.preventDefault();
    settle();
    const note = new NoteText(text, NOTE_PRESETS.text);
    note.setPositionByOrigin(canvas.getVpCenter(), "center", "center");
    canvas.add(note);
    canvas.setActiveObject(note);
    canvas.requestRenderAll();
    history.record();
  };
  window.addEventListener("paste", onPaste);

  // Dropping image files places them where they are dropped.
  const hasFiles = (e: DragEvent) => e.dataTransfer?.types.includes("Files") ?? false;
  const onDragOver = (e: DragEvent) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    e.dataTransfer!.dropEffect = "copy";
    host.classList.add("drop-target");
  };
  const onDragLeave = (e: DragEvent) => {
    if (!host.contains(e.relatedTarget as Node | null)) host.classList.remove("drop-target");
  };
  const onDrop = (e: DragEvent) => {
    host.classList.remove("drop-target");
    if (!hasFiles(e)) return;
    e.preventDefault();
    // A dropped StickyBoard PDF opens as its own board.
    const pdf = [...e.dataTransfer!.files].find((f) => f.type === "application/pdf" || /\.pdf$/i.test(f.name));
    if (pdf) {
      void pdf.arrayBuffer().then((buffer) => openPdf(new Uint8Array(buffer)));
      return;
    }
    const files = imageFiles(e.dataTransfer!.files);
    if (files.length === 0) {
      store().showNotice("Only images and StickyBoard PDFs can be dropped onto the board.");
      return;
    }
    void insertImages(files, canvas.getScenePoint(e));
  };
  host.addEventListener("dragover", onDragOver);
  host.addEventListener("dragleave", onDragLeave);
  host.addEventListener("drop", onDrop);

  const unsubscribe = useAppStore.subscribe((s, prev) => {
    if (s.tool !== prev.tool || s.drawing !== prev.drawing) applyBrush();
    // The Image tool opens the file picker, then hands back to Select.
    if (s.tool === "image" && prev.tool !== "image") {
      s.setTool("select");
      pickImages();
    }
    if (s.activeBoardId !== prev.activeBoardId) void openBoard(s.activeBoardId);
    // Going to the board list finishes any typing so it gets saved.
    if (s.view === "home" && prev.view !== "home") {
      settle();
      void flushSave();
    }
  });

  // Save before the app closes. The desktop window waits for the save;
  // the browser fallback is best effort.
  const onPageHide = () => void flushSave();
  window.addEventListener("pagehide", onPageHide);
  let stopCloseListener: (() => void) | undefined;
  if (isTauri()) {
    void getCurrentWindow()
      .onCloseRequested(async () => {
        settle();
        await flushSave();
      })
      .then((unlisten) => (stopCloseListener = unlisten));
  }

  return () => {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("paste", onPaste);
    host.removeEventListener("dragover", onDragOver);
    host.removeEventListener("dragleave", onDragLeave);
    host.removeEventListener("drop", onDrop);
    stopCropListener();
    unsubscribe();
    window.removeEventListener("pagehide", onPageHide);
    stopCloseListener?.();
    void flushSave();
    loadToken++;
    if (session.canvas === canvas) {
      session.canvas = null;
      session.history = null;
      session.boardId = null;
    }
  };
}
