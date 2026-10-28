import { create } from "zustand";
import { nanoid } from "nanoid";
import type { Board } from "../types/board";
import type { SelectionInfo } from "../canvas/styling";

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
  canUndo: boolean;
  canRedo: boolean;
  selection: SelectionInfo | null;
  setTool: (tool: Tool) => void;
  setZoom: (zoom: number) => void;
  setHistoryState: (canUndo: boolean, canRedo: boolean) => void;
  setSelection: (selection: SelectionInfo | null) => void;
  createBoard: () => void;
  selectBoard: (id: string) => void;
  updateBoard: (id: string, patch: Partial<Pick<Board, "title" | "background" | "paper">>) => void;
}

function newBoard(title: string): Board {
  const now = Date.now();
  return { id: nanoid(), title, createdAt: now, updatedAt: now, background: "dots", paper: "warm" };
}

// Boards are in memory for now; Phase 4 loads and saves them through Dexie.
const firstBoard = newBoard("My first board");

export const useAppStore = create<AppState>((set) => ({
  tool: "select",
  zoom: 1,
  boards: [firstBoard],
  activeBoardId: firstBoard.id,
  canUndo: false,
  canRedo: false,
  selection: null,
  setTool: (tool) => set({ tool }),
  setZoom: (zoom) => set({ zoom }),
  setHistoryState: (canUndo, canRedo) => set({ canUndo, canRedo }),
  setSelection: (selection) => set({ selection }),
  createBoard: () =>
    set((s) => {
      const board = newBoard(`Untitled board ${s.boards.length + 1}`);
      return { boards: [board, ...s.boards], activeBoardId: board.id };
    }),
  selectBoard: (id) => set({ activeBoardId: id }),
  updateBoard: (id, patch) =>
    set((s) => ({
      boards: s.boards.map((b) => (b.id === id ? { ...b, ...patch, updatedAt: Date.now() } : b)),
    })),
}));
