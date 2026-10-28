import type { PAPERS } from "../theme";

// Core data model. Boards hold items; images live in a separate asset table
// so pasted files are stored once as binary blobs and referenced by id.

export type ItemType =
  | "text"
  | "sticky"
  | "textbox"
  | "bubble"
  | "image"
  | "stroke";

export interface Board {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  background: BoardBackground;
  paper: BoardPaper;
  /** Small PNG data URL used on the home screen. */
  thumbnail?: string;
}

export type BoardBackground = "dots" | "grid" | "lines" | "plain";

export type BoardPaper = keyof typeof PAPERS;

export interface BoardItem {
  id: string;
  boardId: string;
  type: ItemType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  /** Type-specific styling (colours, fonts, border, tail position, ...). */
  style: Record<string, unknown>;
  /** Type-specific content (rich text, asset id, stroke path, ...). */
  content: unknown;
}

export interface Asset {
  id: string;
  blob: Blob;
  mimeType: string;
}
