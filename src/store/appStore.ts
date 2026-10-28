import { create } from "zustand";
import { nanoid } from "nanoid";
import type { Board } from "../types/board";

export type Tool =
  | "select"
  | "hand"
  | "text"
  | "sticky"
  | "textbox"
  | "bubble"
  | "image"
  | "pen"
  | "highlighter";

interface AppState {
  tool: Tool;
  zoom: number;
  boards: Board[];
  activeBoardId: string;
  setTool: (tool: Tool) => void;
  setZoom: (zoom: number) => void;
  createBoard: () => void;
  selectBoard: (id: string) => void;
}

function newBoard(title: string): Board {
  const now = Date.now();
  return { id: nanoid(), title, createdAt: now, updatedAt: now, background: "dots" };
}

// Boards are in memory for now; Phase 4 loads and saves them through Dexie.
const firstBoard = newBoard("My first board");

export const useAppStore = create<AppState>((set) => ({
  tool: "select",
  zoom: 1,
  boards: [firstBoard],
  activeBoardId: firstBoard.id,
  setTool: (tool) => set({ tool }),
  setZoom: (zoom) => set({ zoom }),
  createBoard: () =>
    set((s) => {
      const board = newBoard(`Untitled board ${s.boards.length + 1}`);
      return { boards: [board, ...s.boards], activeBoardId: board.id };
    }),
  selectBoard: (id) => set({ activeBoardId: id }),
}));
