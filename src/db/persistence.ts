import { getAsset, registerAsset } from "../canvas/assets";
import type { Board, BoardContent } from "../types/board";
import { db } from "./db";

const EMPTY_BOARD = '{"objects":[]}';

interface SerializedObject {
  assetId?: string;
  src?: string;
  [key: string]: unknown;
}

export const loadBoards = () => db.boards.orderBy("createdAt").reverse().toArray();

export const putBoard = (board: Board) => db.boards.put(board);

export const patchBoard = (id: string, patch: Partial<Board>) => db.boards.update(id, patch);

/**
 * Saves a board's canvas JSON. Image sources are object URLs that only live
 * for this session, so they are blanked and the image files saved by id.
 */
export async function saveContent(boardId: string, canvasJson: { objects: object[] }) {
  const assetIds = new Set<string>();
  const objects = (canvasJson.objects as SerializedObject[]).map((obj) => {
    if (!obj.assetId) return obj;
    assetIds.add(obj.assetId);
    return { ...obj, src: "" };
  });
  await persistAssets([...assetIds]);
  const content: BoardContent = {
    boardId,
    json: JSON.stringify({ ...canvasJson, objects }),
    assetIds: [...assetIds],
  };
  await db.contents.put(content);
}

/** Writes any images that are in memory but not yet in the database. */
async function persistAssets(ids: string[]) {
  if (ids.length === 0) return;
  const stored = await db.assets.bulkGet(ids);
  const missing = ids
    .filter((_, i) => !stored[i])
    .map((id) => ({ id, asset: getAsset(id) }))
    .filter((entry) => entry.asset);
  if (missing.length === 0) return;
  await db.assets.bulkPut(
    missing.map(({ id, asset }) => ({ id, blob: asset!.blob, mimeType: asset!.blob.type })),
  );
}

/**
 * Loads a board's canvas JSON with image sources pointing at fresh object
 * URLs. Images whose file is missing are dropped rather than breaking the
 * whole board.
 */
export async function loadContent(boardId: string): Promise<string> {
  const content = await db.contents.get(boardId);
  if (!content) return EMPTY_BOARD;
  const parsed = JSON.parse(content.json) as { objects: SerializedObject[] };
  const needed = content.assetIds.filter((id) => !getAsset(id));
  if (needed.length > 0) {
    const assets = await db.assets.bulkGet(needed);
    for (const asset of assets) if (asset) registerAsset(asset.blob, asset.id);
  }
  parsed.objects = parsed.objects.flatMap((obj) => {
    if (!obj.assetId) return [obj];
    const asset = getAsset(obj.assetId);
    return asset ? [{ ...obj, src: asset.url }] : [];
  });
  return JSON.stringify(parsed);
}

export async function deleteBoard(id: string) {
  await db.transaction("rw", db.boards, db.contents, async () => {
    await db.boards.delete(id);
    await db.contents.delete(id);
  });
}

/** Copies a board and its content; image files are shared, not copied. */
export async function duplicateBoard(source: Board, copy: Board) {
  await db.transaction("rw", db.boards, db.contents, async () => {
    const content = await db.contents.get(source.id);
    await db.boards.put(copy);
    if (content) await db.contents.put({ ...content, boardId: copy.id });
  });
}

/** Deletes image files that no saved board uses any more. */
export async function removeUnusedAssets() {
  const used = new Set<string>();
  await db.contents.each((content) => content.assetIds.forEach((id) => used.add(id)));
  const unused = (await db.assets.toCollection().primaryKeys()).filter((id) => !used.has(id));
  if (unused.length > 0) await db.assets.bulkDelete(unused);
}
