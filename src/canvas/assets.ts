import { nanoid } from "nanoid";

/** Longest side kept for imported images; bigger photos are scaled down. */
const MAX_IMAGE_SIDE = 2400;

/**
 * Image files added to boards, kept once in memory and referenced by id.
 * Board items point at an object URL, so undo snapshots stay small.
 * Phase 4 persists these blobs in the database's asset table.
 */
const assets = new Map<string, { blob: Blob; url: string }>();

export function registerAsset(blob: Blob, id: string = nanoid()) {
  const existing = assets.get(id);
  if (existing) return { id, url: existing.url };
  const url = URL.createObjectURL(blob);
  assets.set(id, { blob, url });
  return { id, url };
}

export function getAsset(id: string) {
  return assets.get(id);
}

/** Scales down very large images so boards stay quick to draw and save. */
export async function prepareImageBlob(file: Blob): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("This file is not an image that can be opened.");
  }
  const scale = MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height);
  if (scale >= 1 || file.type === "image/gif" || file.type === "image/svg+xml") {
    bitmap.close();
    return file;
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  // Keep PNG for images that may have transparency; photos become JPEG.
  const type = file.type === "image/png" || file.type === "image/webp" ? "image/png" : "image/jpeg";
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not resize image."))), type, 0.9),
  );
}
