import { create } from "zustand";
import { nanoid } from "nanoid";
import type { Board } from "../types/board";
import type { SelectionInfo } from "../canvas/styling";
import * as persistence from "../db/persistence";

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

export interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
}

interface AppState {
  /** False until boards have been loaded from the database. */
  ready: boolean;
  view: "board" | "home";
  tool: Tool;
  zoom: number;
  boards: Board[];
  activeBoardId: string;
  canUndo: boolean;
  canRedo: boolean;
  selection: SelectionInfo | null;
  /** Short message shown briefly at the bottom of the board. */
  notice: { id: number; text: string } | null;
  confirm: ConfirmRequest | null;
  init: () => Promise<void>;
  setView: (view: AppState["view"]) => void;
  setTool: (tool: Tool) => void;
  setZoom: (zoom: number) => void;
  setHistoryState: (canUndo: boolean, canRedo: boolean) => void;
  setSelection: (selection: SelectionInfo | null) => void;
  showNotice: (text: string) => void;
  clearNotice: (id: number) => void;
  askConfirm: (request: ConfirmRequest | null) => void;
  createBoard: () => void;
  selectBoard: (id: string) => void;
  /** Changes board details; `touch` also marks the board as just edited. */
  updateBoard: (id: string, patch: Partial<Omit<Board, "id">>, touch?: boolean) => void;
  duplicateBoard: (id: string) => Promise<void>;
  deleteBoard: (id: string) => Promise<void>;
}

const LAST_BOARD_KEY = "stickyboard:lastBoardId";

let initOnce: Promise<void> | undefined;

function rememberBoard(id: string) {
  try {
    localStorage.setItem(LAST_BOARD_KEY, id);
  } catch {
    // Only a convenience; the first board opens instead.
  }
}

function lastBoardId() {
  try {
    return localStorage.getItem(LAST_BOARD_KEY);
  } catch {
    return null;
  }
}

function newBoard(title: string): Board {
  const now = Date.now();
  return { id: nanoid(), title, createdAt: now, updatedAt: now, background: "dots", paper: "warm" };
}

export const useAppStore = create<AppState>((set, get) => {
  /** Saves board changes, telling the user if the database refuses. */
  const persist = (work: Promise<unknown>) =>
    work.catch((err) => {
      console.error(err);
      get().showNotice("Could not save to this computer. Your latest change may be lost.");
    });

  return {
    ready: false,
    view: "board",
    tool: "select",
    zoom: 1,
    boards: [],
    activeBoardId: "",
    canUndo: false,
    canRedo: false,
    selection: null,
    notice: null,
    confirm: null,

    // Runs once even if called twice (React mounts twice in development).
    init: () =>
      (initOnce ??= (async () => {
        let boards = await persistence.loadBoards();
        if (boards.length === 0) {
          const first = newBoard("My first board");
          await persistence.putBoard(first);
          boards = [first];
        }
        const last = lastBoardId();
        const active = boards.find((b) => b.id === last) ?? boards[0];
        set({ boards, activeBoardId: active.id, ready: true });
        // Tidy up image files left behind by deleted items or boards.
        void persistence.removeUnusedAssets().catch(console.error);
      })()),

    setView: (view) => set({ view }),
    setTool: (tool) => set({ tool }),
    setZoom: (zoom) => set({ zoom }),
    setHistoryState: (canUndo, canRedo) => set({ canUndo, canRedo }),
    setSelection: (selection) => set({ selection }),
    showNotice: (text) => set({ notice: { id: Date.now(), text } }),
    clearNotice: (id) => set((s) => (s.notice?.id === id ? { notice: null } : {})),
    askConfirm: (confirm) => set({ confirm }),

    createBoard: () => {
      const board = newBoard(`Untitled board ${get().boards.length + 1}`);
      set((s) => ({ boards: [board, ...s.boards], activeBoardId: board.id, view: "board" }));
      rememberBoard(board.id);
      void persist(persistence.putBoard(board));
    },

    selectBoard: (id) => {
      set({ activeBoardId: id, view: "board" });
      rememberBoard(id);
    },

    updateBoard: (id, patch, touch = true) => {
      const change = touch ? { ...patch, updatedAt: Date.now() } : patch;
      set((s) => ({ boards: s.boards.map((b) => (b.id === id ? { ...b, ...change } : b)) }));
      void persist(persistence.patchBoard(id, change));
    },

    duplicateBoard: async (id) => {
      const source = get().boards.find((b) => b.id === id);
      if (!source) return;
      // The open board may have an unsaved change waiting.
      const { flushSave } = await import("../canvas/autosave");
      await flushSave();
      const now = Date.now();
      const copy: Board = { ...source, id: nanoid(), title: `${source.title} copy`, createdAt: now, updatedAt: now };
      await persist(persistence.duplicateBoard(source, copy));
      set((s) => {
        const at = s.boards.findIndex((b) => b.id === id);
        const boards = [...s.boards];
        boards.splice(at, 0, copy);
        return { boards };
      });
    },

    deleteBoard: async (id) => {
      await persist(persistence.deleteBoard(id));
      const remaining = get().boards.filter((b) => b.id !== id);
      if (remaining.length === 0) {
        set({ boards: [] });
        get().createBoard();
        return;
      }
      const active = get().activeBoardId === id ? remaining[0].id : get().activeBoardId;
      set({ boards: remaining, activeBoardId: active });
      rememberBoard(active);
    },
  };
});
