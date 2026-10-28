import type { Canvas } from "fabric";
import type { History } from "./history";

/** The live canvas and its undo history, shared by the editor modules. */
export const session: { canvas: Canvas | null; history: History | null } = {
  canvas: null,
  history: null,
};
