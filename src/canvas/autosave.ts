import { saveContent } from "../db/persistence";
import { useAppStore } from "../store/appStore";
import { PAPERS } from "../theme";
import { session } from "./session";
import { renderThumbnail } from "./thumbnail";

const SAVE_DELAY = 500;
const THUMBNAIL_DELAY = 1500;

let saveTimer: ReturnType<typeof setTimeout> | undefined;
let thumbnailTimer: ReturnType<typeof setTimeout> | undefined;
/** The last save, so a flush can wait for one already running. */
let saving: Promise<void> = Promise.resolve();

/** Saves the open board shortly after the latest change. */
export function scheduleSave() {
  if (!session.boardId) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => void saveNow(), SAVE_DELAY);
}

/** Saves now if a change is waiting; resolves once everything is written. */
export async function flushSave() {
  if (saveTimer !== undefined) saveNow();
  await saving;
}

function saveNow() {
  clearTimeout(saveTimer);
  saveTimer = undefined;
  const { canvas, boardId } = session;
  if (!canvas || !boardId) return;
  // Take the snapshot right away, before anything else can change the board.
  const json = canvas.toObject();
  saving = saving
    .then(() => saveContent(boardId, json))
    .then(() => {
      const store = useAppStore.getState();
      // The board may have been deleted while the save was running.
      if (!store.boards.some((b) => b.id === boardId)) return;
      store.updateBoard(boardId, {}, true);
      scheduleThumbnail(boardId, json);
    })
    .catch((err) => {
      console.error(err);
      useAppStore.getState().showNotice("Could not save this board. Your latest change may be lost.");
    });
}

function scheduleThumbnail(boardId: string, json: object) {
  clearTimeout(thumbnailTimer);
  thumbnailTimer = setTimeout(async () => {
    const board = useAppStore.getState().boards.find((b) => b.id === boardId);
    if (!board) return;
    try {
      const thumbnail = await renderThumbnail(json, PAPERS[board.paper].color);
      useAppStore.getState().updateBoard(boardId, { thumbnail }, false);
    } catch (err) {
      console.error("Thumbnail failed", err);
    }
  }, THUMBNAIL_DELAY);
}
