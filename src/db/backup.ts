import { nanoid } from "nanoid";
import type { Board, BoardContent } from "../types/board";
import { db } from "./db";

const BACKUP_APP = "StickyBoard";
const BACKUP_VERSION = 1;

interface BackupFile {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: string;
  boards: Board[];
  contents: BoardContent[];
  /** Image files as data URLs, so the backup is one self-contained file. */
  assets: { id: string; mimeType: string; dataUrl: string }[];
}

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

/** Every board, its content and its images, as the bytes of a backup file. */
export async function createBackup() {
  const [boards, contents, assets] = await Promise.all([
    db.boards.toArray(),
    db.contents.toArray(),
    db.assets.toArray(),
  ]);
  const backup: BackupFile = {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    boards,
    contents,
    assets: await Promise.all(
      assets.map(async (a) => ({ id: a.id, mimeType: a.mimeType, dataUrl: await blobToDataUrl(a.blob) })),
    ),
  };
  return { bytes: new TextEncoder().encode(JSON.stringify(backup)), boards: boards.length };
}

function parseBackup(bytes: Uint8Array): BackupFile {
  let data: Partial<BackupFile>;
  try {
    data = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new Error("That file is not a StickyBoard backup.");
  }
  if (data?.app !== BACKUP_APP || !Array.isArray(data.boards) || !Array.isArray(data.contents) || !Array.isArray(data.assets)) {
    throw new Error("That file is not a StickyBoard backup.");
  }
  if (typeof data.version !== "number" || data.version > BACKUP_VERSION) {
    throw new Error("This backup was made by a newer version of StickyBoard.");
  }
  return data as BackupFile;
}

/**
 * Adds the boards from a backup alongside the existing ones. Restored boards
 * get new ids, so nothing already here is ever overwritten.
 */
export async function restoreBackup(bytes: Uint8Array) {
  const backup = parseBackup(bytes);
  const newIds = new Map(backup.boards.map((b) => [b.id, nanoid()]));
  const existingTitles = new Set((await db.boards.toArray()).map((b) => b.title));

  const boards: Board[] = backup.boards.map((b) => ({
    ...b,
    id: newIds.get(b.id)!,
    title: existingTitles.has(b.title) ? `${b.title} (restored)` : b.title,
  }));
  const contents: BoardContent[] = backup.contents
    .filter((c) => newIds.has(c.boardId))
    .map((c) => ({ ...c, boardId: newIds.get(c.boardId)! }));
  // Image ids are unique and never reused, so one already stored is the same file.
  const stored = new Set(await db.assets.toCollection().primaryKeys());
  const assets = await Promise.all(
    backup.assets
      .filter((a) => !stored.has(a.id))
      .map(async (a) => ({ id: a.id, mimeType: a.mimeType, blob: await (await fetch(a.dataUrl)).blob() })),
  );

  await db.transaction("rw", db.boards, db.contents, db.assets, async () => {
    await db.boards.bulkAdd(boards);
    await db.contents.bulkAdd(contents);
    await db.assets.bulkAdd(assets);
  });
  return boards;
}
