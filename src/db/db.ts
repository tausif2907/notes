import Dexie, { type EntityTable } from "dexie";
import type { Asset, Board, BoardContent } from "../types/board";

// Local database (IndexedDB inside the app's WebView2 profile).
export const db = new Dexie("stickyboard") as Dexie & {
  boards: EntityTable<Board, "id">;
  contents: EntityTable<BoardContent, "boardId">;
  assets: EntityTable<Asset, "id">;
};

db.version(1).stores({
  boards: "id, createdAt",
  contents: "boardId",
  assets: "id",
});
