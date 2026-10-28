import type { TextStyleDeclaration } from "fabric";
import { useAppStore } from "../store/appStore";
import { NoteText, type CardProps } from "./noteText";
import { session } from "./session";

export interface TextStyleInfo {
  fontFamily: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  linethrough: boolean;
  fill: string;
  highlight: string;
  textAlign: string;
}

export type CardStyleInfo = Pick<
  CardProps,
  "cardFill" | "cardStroke" | "cardStrokeWidth" | "cornerRadius" | "cardShadow"
>;

export interface SelectionInfo {
  count: number;
  /** Styling applies to the highlighted characters rather than whole items. */
  textRange: boolean;
  text: TextStyleInfo | null;
  card: CardStyleInfo | null;
}

const isBold = (weight: unknown) => weight === "bold" || Number(weight) >= 600;

function selectedNotes() {
  return (session.canvas?.getActiveObjects() ?? []).filter((o): o is NoteText => o instanceof NoteText);
}

const hasTextRange = (note: NoteText) => note.isEditing && note.selectionStart !== note.selectionEnd;

/** Effective style of the highlighted characters, or of the whole item. */
function readTextStyle(note: NoteText): TextStyleInfo {
  const [start, end] = hasTextRange(note)
    ? [note.selectionStart, note.selectionEnd]
    : [0, note.text.length];
  const chars: Partial<TextStyleDeclaration>[] =
    end > start ? note.getSelectionStyles(start, end, true) : [note];
  const first = chars[0];
  const every = (test: (s: Partial<TextStyleDeclaration>) => boolean) => chars.every(test);
  return {
    fontFamily: String(first.fontFamily ?? note.fontFamily),
    fontSize: Number(first.fontSize ?? note.fontSize),
    bold: every((s) => isBold(s.fontWeight)),
    italic: every((s) => s.fontStyle === "italic"),
    underline: every((s) => !!s.underline),
    linethrough: every((s) => !!s.linethrough),
    fill: String(first.fill ?? ""),
    highlight: String(first.textBackgroundColor ?? ""),
    textAlign: note.textAlign,
  };
}

/** Pushes the current selection's styles to the store for the style panel. */
export function publishSelection() {
  const objects = session.canvas?.getActiveObjects() ?? [];
  const { setSelection } = useAppStore.getState();
  if (objects.length === 0) return setSelection(null);
  const notes = selectedNotes();
  const cardNote = notes.find((n) => n.kind !== "text");
  setSelection({
    count: objects.length,
    textRange: notes.some(hasTextRange),
    text: notes[0] ? readTextStyle(notes[0]) : null,
    card: cardNote
      ? {
          cardFill: cardNote.cardFill,
          cardStroke: cardNote.cardStroke,
          cardStrokeWidth: cardNote.cardStrokeWidth,
          cornerRadius: cardNote.cornerRadius,
          cardShadow: cardNote.cardShadow,
        }
      : null,
  });
}

function commit() {
  session.canvas?.requestRenderAll();
  session.history?.record();
  publishSelection();
}

/**
 * Styles the highlighted characters while typing, otherwise every selected
 * item as a whole (clearing per-character overrides of the same style).
 */
export function applyTextStyle(style: Partial<TextStyleDeclaration>) {
  const notes = selectedNotes();
  if (notes.length === 0) return;
  for (const note of notes) {
    if (hasTextRange(note)) {
      note.setSelectionStyles(style);
    } else {
      for (const key of Object.keys(style)) note.removeStyle(key as keyof TextStyleDeclaration);
      note.set(style);
    }
    note.initDimensions();
    note.setCoords();
  }
  commit();
}

export function setTextAlign(textAlign: string) {
  for (const note of selectedNotes()) note.set({ textAlign });
  commit();
}

export function applyCardStyle(style: Partial<CardProps>) {
  for (const note of selectedNotes()) {
    if (note.kind !== "text") note.set(style);
  }
  commit();
}

/** Toggles bold, italic, underline or strikethrough from the current state. */
export function toggleTextStyle(kind: "bold" | "italic" | "underline" | "linethrough") {
  const text = useAppStore.getState().selection?.text;
  if (!text) return;
  if (kind === "bold") applyTextStyle({ fontWeight: text.bold ? "normal" : "bold" });
  if (kind === "italic") applyTextStyle({ fontStyle: text.italic ? "normal" : "italic" });
  if (kind === "underline") applyTextStyle({ underline: !text.underline });
  if (kind === "linethrough") applyTextStyle({ linethrough: !text.linethrough });
}

export function bringToFront() {
  const canvas = session.canvas;
  if (!canvas) return;
  for (const obj of canvas.getActiveObjects()) canvas.bringObjectToFront(obj);
  commit();
}

export function sendToBack() {
  const canvas = session.canvas;
  if (!canvas) return;
  for (const obj of [...canvas.getActiveObjects()].reverse()) canvas.sendObjectToBack(obj);
  commit();
}
