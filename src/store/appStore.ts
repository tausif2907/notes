import { create } from "zustand";
import { nanoid } from "nanoid";
import type { Board } from "../types/board";
import type { SelectionInfo } from "../canvas/styling";
import * as persistence from "../db/persistence";
import { findTemplate } from "../templates";
import { INK } from "../theme";

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

export type DrawingTool = "pen" | "highlighter";

/** "system" follows the Windows light/dark setting. */
export type ThemeChoice = "system" | "light" | "dark";

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
  drawing: Record<DrawingTool, { color: string; size: number }>;
  theme: ThemeChoice;
  setTheme: (theme: ThemeChoice) => void;
  /** Whether the style panel is shown beside the board. */
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  init: () => Promise<void>;
  setDrawing: (tool: DrawingTool, patch: Partial<{ color: string; size: number }>) => void;
  setView: (view: AppState["view"]) => void;
  setTool: (tool: Tool) => void;
  setZoom: (zoom: number) => void;
  setHistoryState: (canUndo: boolean, canRedo: boolean) => void;
  setSelection: (selection: SelectionInfo | null) => void;
  showNotice: (text: string) => void;
  clearNotice: (id: number) => void;
  askConfirm: (request: ConfirmRequest | null) => void;
  /** True while the "new board" template picker is open. */
  showTemplates: boolean;
  setShowTemplates: (show: boolean) => void;
  createBoard: (templateId?: string) => Promise<void>;
  selectBoard: (id: string) => void;
  /** Changes board details; `touch` also marks the board as just edited. */
  updateBoard: (id: string, patch: Partial<Omit<Board, "id">>, touch?: boolean) => void;
  duplicateBoard: (id: string) => Promise<void>;
  /** Shows boards that were just written to the database (e.g. restored). */
  addBoards: (boards: Board[]) => void;
  deleteBoard: (id: string) => Promise<void>;
}

const LAST_BOARD_KEY = "stickyboard:lastBoardId";
const THEME_KEY = "stickyboard:theme";
const PANEL_KEY = "stickyboard:panel";

let initOnce: Promise<void> | undefined;

// Small per-computer preferences. Storage can be unavailable, in which case
// the app simply uses its defaults.
function remember(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Not saved; the default is used next time.
  }
}

function recall(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

const rememberBoard = (id: string) => remember(LAST_BOARD_KEY, id);
const lastBoardId = () => recall(LAST_BOARD_KEY);

function savedTheme(): ThemeChoice {
  const value = recall(THEME_KEY);
  return value === "light" || value === "dark" ? value : "system";
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
    showTemplates: false,
    setShowTemplates: (showTemplates) => set({ showTemplates }),
    theme: savedTheme(),
    setTheme: (theme) => {
      remember(THEME_KEY, theme);
      set({ theme });
    },
    panelOpen: recall(PANEL_KEY) !== "closed",
    setPanelOpen: (panelOpen) => {
      remember(PANEL_KEY, panelOpen ? "open" : "closed");
      set({ panelOpen });
    },
    drawing: {
      pen: { color: INK, size: 4 },
      highlighter: { color: "#fff176", size: 20 },
    },
    setDrawing: (tool, patch) =>
      set((s) => ({ drawing: { ...s.drawing, [tool]: { ...s.drawing[tool], ...patch } } })),

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

    createBoard: async (templateId = "blank") => {
      const template = findTemplate(templateId);
      const title = template.id === "blank" ? `Untitled board ${get().boards.length + 1}` : template.name;
      const board = { ...newBoard(title), background: template.background, paper: template.paper };
      const objects = template.build();
      // Write the content first so the board opens with its template items.
      await persist(
        (async () => {
          await persistence.putBoard(board);
          if (objects.length > 0) await persistence.saveContent(board.id, { objects });
        })(),
      );
      set((s) => ({ boards: [board, ...s.boards], activeBoardId: board.id, view: "board", showTemplates: false }));
      rememberBoard(board.id);
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

    addBoards: (added) => {
      if (added.length === 0) return;
      set((s) => ({
        boards: [...added, ...s.boards].sort((a, b) => b.createdAt - a.createdAt),
        activeBoardId: added[0].id,
        view: "board",
      }));
      rememberBoard(added[0].id);
    },

    deleteBoard: async (id) => {
      await persist(persistence.deleteBoard(id));
      const remaining = get().boards.filter((b) => b.id !== id);
      if (remaining.length === 0) {
        set({ boards: [] });
        await get().createBoard();
        return;
      }
      const active = get().activeBoardId === id ? remaining[0].id : get().activeBoardId;
      set({ boards: remaining, activeBoardId: active });
      rememberBoard(active);
    },
  };
});
