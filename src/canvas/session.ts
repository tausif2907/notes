import type { Canvas } from "fabric";
import type { History } from "./history";

/** The live canvas, its undo history and the board it shows. */
export const session: { canvas: Canvas | null; history: History | null; boardId: string | null } = {
  canvas: null,
  history: null,
  // Null while a board is loading, so nothing half-loaded is ever saved.
  boardId: null,
};
