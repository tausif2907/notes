import type { FabricObject } from "fabric";

/**
 * Every board is one long sheet: a fixed width in board units, a top edge,
 * and no end at the bottom. PDF pages are slices of it from the top down.
 */
export const SHEET_WIDTH = 1000;

/** Screen space kept around the sheet's edges, in pixels. */
export const SHEET_MARGIN = 32;

export const PAGE_SIZES = {
  a4: { label: "A4", width: 210, height: 297, unit: "mm" },
  letter: { label: "Letter", width: 8.5, height: 11, unit: "in" },
} as const;

export type PageSize = keyof typeof PAGE_SIZES;

/** Height of one printed page on the sheet, in board units. */
export const pageHeight = (size: PageSize) =>
  (SHEET_WIDTH * PAGE_SIZES[size].height) / PAGE_SIZES[size].width;

/**
 * Moves an item (or a multi-selection) back onto the sheet: never left of,
 * right of, or above it. Returns true if it moved.
 */
export function keepInside(obj: FabricObject) {
  const box = obj.getBoundingRect();
  let dx = 0;
  if (box.left < 0 || box.width >= SHEET_WIDTH) dx = -box.left;
  else if (box.left + box.width > SHEET_WIDTH) dx = SHEET_WIDTH - box.left - box.width;
  const dy = box.top < 0 ? -box.top : 0;
  if (!dx && !dy) return false;
  obj.set({ left: obj.left + dx, top: obj.top + dy });
  obj.setCoords();
  return true;
}

/** Lowest point used on the sheet, in board units (0 for an empty board). */
export function contentBottom(objects: FabricObject[]) {
  let bottom = 0;
  for (const obj of objects) {
    if (obj.excludeFromExport) continue;
    const box = obj.getBoundingRect();
    bottom = Math.max(bottom, box.top + box.height);
  }
  return bottom;
}
