import Dexie, { type EntityTable } from "dexie";
import type { Asset, Board, BoardItem } from "../types/board";

// Local database (IndexedDB inside the app's WebView2 profile).
// Wired up to the UI in Phase 4; the schema is defined now so the
// data model is settled early.
export const db = new Dexie("stickyboard") as Dexie & {
  boards: EntityTable<Board, "id">;
  items: EntityTable<BoardItem, "id">;
  assets: EntityTable<Asset, "id">;
};

db.version(1).stores({
  boards: "id, updatedAt",
  items: "id, boardId",
  assets: "id",
});
