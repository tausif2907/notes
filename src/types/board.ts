import type { PAPERS } from "../theme";

// Core data model. A board's items are stored together as one Fabric JSON
// document; images live in a separate asset table so each file is stored
// once as a binary blob and referenced by id.

export interface Board {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  background: BoardBackground;
  paper: BoardPaper;
  /** Small JPEG data URL used in the board lists. */
  thumbnail?: string;
}

export type BoardBackground = "dots" | "grid" | "lines" | "plain";

export type BoardPaper = keyof typeof PAPERS;

export interface BoardContent {
  boardId: string;
  /** Fabric canvas JSON; image sources are blank and restored from assetIds. */
  json: string;
  /** Images this board uses, so unused image files can be cleaned up. */
  assetIds: string[];
}

export interface Asset {
  id: string;
  blob: Blob;
  mimeType: string;
}
