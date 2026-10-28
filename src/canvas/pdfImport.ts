import { nanoid } from "nanoid";
import { util } from "fabric";
import { restoreBackup } from "../db/backup";
import { db } from "../db/db";
import { putBoard, saveContent } from "../db/persistence";
import { isStickyBoardPdf, readBoardData, readPageImages, readPdfTitle } from "../platform/pdfAttachment";
import { useAppStore } from "../store/appStore";
import type { Board } from "../types/board";
import { registerAsset } from "./assets";
import { NoteImage } from "./noteImage";
import { SHEET_WIDTH } from "./sheet";

const SUFFIX = "from PDF";

/**
 * A PDF exported before boards were attached to PDFs: its pages become
 * pictures stacked down the sheet, ready to write over.
 */
async function boardFromPageImages(bytes: Uint8Array): Promise<Board> {
  const pages = await readPageImages(bytes);
  if (pages.length === 0) throw new Error("This PDF has no pages that StickyBoard can open.");

  const objects: object[] = [];
  let top = 0;
  for (const page of pages) {
    const { id, url } = registerAsset(page.blob);
    const image = new NoteImage(await util.loadImage(url), { assetId: id, left: 0, top });
    image.scale(SHEET_WIDTH / image.width);
    objects.push(image.toObject());
    top += image.getScaledHeight();
  }

  const title = readPdfTitle(bytes) ?? "Imported PDF";
  const taken = await db.boards.filter((b) => b.title === title).count();
  const now = Date.now();
  const board: Board = {
    id: nanoid(),
    title: taken > 0 ? `${title} (${SUFFIX})` : title,
    createdAt: now,
    updatedAt: now,
    background: "plain",
    paper: "white",
  };
  await saveContent(board.id, { objects });
  await putBoard(board);
  return board;
}

/**
 * Opens a PDF exported from StickyBoard as a new board. Boards already here
 * are never changed. Returns the new board and whether it is fully editable.
 */
export async function importPdf(bytes: Uint8Array) {
  const data = await readBoardData(bytes).catch(() => null);
  if (data) {
    const boards = await restoreBackup(data, { suffix: SUFFIX, asNew: true }).catch(() => {
      throw new Error("The board inside this PDF could not be read.");
    });
    if (boards.length > 0) return { board: boards[0], editable: true };
  }
  if (!isStickyBoardPdf(bytes)) {
    throw new Error("Only PDFs exported from StickyBoard can be opened for editing.");
  }
  return { board: await boardFromPageImages(bytes), editable: false };
}

/** Imports a PDF, shows the new board and says how it was opened. */
export async function openPdf(bytes: Uint8Array) {
  const { addBoards, showNotice } = useAppStore.getState();
  try {
    const { board, editable } = await importPdf(bytes);
    addBoards([board]);
    showNotice(
      editable
        ? `Opened “${board.title}” from the PDF. Everything on it can be edited.`
        : `Opened “${board.title}”. This PDF is from an older StickyBoard, so its pages were added as pictures you can write on.`,
    );
  } catch (err) {
    console.error(err);
    showNotice(err instanceof Error ? err.message : "Could not open that PDF.");
  }
}
