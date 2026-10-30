import { ActiveSelection, IText, Point, type FabricObject } from "fabric";
import { nanoid } from "nanoid";
import { finishCrop } from "./crop";
import { session } from "./session";

/** How far each paste or duplicate lands from the one before, in board units. */
export const COPY_OFFSET = 20;
/** Longest side of the picture other apps get when board items are copied. */
const MAX_PICTURE_SIDE = 2000;
/** Marks copied HTML so pasting it back here restores the real items. */
const CLIP_ATTRIBUTE = "data-stickyboard-clip";

/**
 * The last items copied from a board, kept as live copies so pasting
 * restores them exactly (also onto another board). Other apps get a
 * picture and the text instead.
 */
let clip: { id: string; items: Promise<FabricObject>; pastes: number } | null = null;

const escapeHtml = (text: string) =>
  text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/**
 * Puts the selected items on the clipboard during a copy or cut event.
 * Returns false (and leaves the event alone) when nothing is selected.
 */
export function copySelection(data: DataTransfer) {
  const canvas = session.canvas;
  finishCrop(true);
  const active = canvas?.getActiveObject();
  if (!canvas || !active) return false;

  const id = nanoid();
  clip = { id, items: active.clone(), pastes: 0 };

  const objects = canvas.getActiveObjects();
  const texts = objects.filter((o): o is IText => o instanceof IText).map((o) => o.text);
  if (texts.length > 0) data.setData("text/plain", texts.join("\n\n"));
  if (texts.length === objects.length) {
    // Only text: other apps get it as paragraphs they can edit.
    const paragraphs = texts.map((t) => `<p>${escapeHtml(t).replace(/\n/g, "<br>")}</p>`).join("");
    data.setData("text/html", `<div ${CLIP_ATTRIBUTE}="${id}">${paragraphs}</div>`);
  } else {
    const side = Math.max(active.getScaledWidth(), active.getScaledHeight());
    const picture = active.toDataURL({ format: "png", multiplier: Math.min(2, MAX_PICTURE_SIDE / side) });
    data.setData("text/html", `<img ${CLIP_ATTRIBUTE}="${id}" src="${picture}" alt="${escapeHtml(texts.join(" "))}">`);
  }
  return true;
}

/** True if the copied HTML came from this run of StickyBoard and can be pasted as items. */
export function isOwnClip(html: string) {
  return !!clip && html.includes(`${CLIP_ATTRIBUTE}="${clip.id}"`);
}

export const hasClip = () => !!clip;

/**
 * Adds a copy to the board, selected, as one undo step. A selection of
 * several items is added as separate items.
 */
export function placeCopy(copy: FabricObject, at?: Point) {
  const canvas = session.canvas;
  if (!canvas) return;
  if (at) copy.setPositionByOrigin(at, "center", "center");
  canvas.discardActiveObject();
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

/**
 * Pastes the copied items: at `at` if given, otherwise a little below and
 * right of the last copy, or in the middle of the view if that is out of sight.
 */
export async function pasteClip(at?: Point) {
  const canvas = session.canvas;
  if (!canvas || !clip) return;
  const current = clip;
  const copy = await (await current.items).clone();
  current.pastes++;
  if (!at) {
    const offset = COPY_OFFSET * current.pastes;
    copy.set({ left: copy.left + offset, top: copy.top + offset });
    copy.setCoords();
    const { tl, br } = canvas.vptCoords;
    const box = copy.getBoundingRect();
    const inView = box.left < br.x && box.left + box.width > tl.x && box.top < br.y && box.top + box.height > tl.y;
    if (!inView) at = canvas.getVpCenter();
  }
  placeCopy(copy, at);
}

/** Pictures in copied HTML that can be fetched (data, web and blob addresses). */
export function imageSources(html: string) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return [...doc.images].map((img) => img.getAttribute("src") ?? "").filter((src) => /^(data:image\/|https?:|blob:)/.test(src));
}

/**
 * Text that is only a link to a picture inside another app, such as
 * GoodNotes' "![](app://api/attachments/…)". Other apps cannot open these.
 */
export const isPrivateImageLink = (text: string) => /^!\[[^\]]*\]\((?!https?:|data:)[a-z][\w+.-]*:\/\/[^)]*\)$/i.test(text.trim());
