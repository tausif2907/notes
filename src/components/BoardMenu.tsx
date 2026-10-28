import { useEffect, useRef, useState } from "react";
import { Copy, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useAppStore } from "../store/appStore";
import type { Board } from "../types/board";

/** "More" menu for a board: rename, duplicate, delete. */
export function BoardMenu({ board, onRename }: { board: Board; onRename: () => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const duplicateBoard = useAppStore((s) => s.duplicateBoard);
  const deleteBoard = useAppStore((s) => s.deleteBoard);
  const askConfirm = useAppStore((s) => s.askConfirm);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [open]);

  const choose = (action: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(false);
    action();
  };

  return (
    <div className={`board-menu${open ? " open" : ""}`} ref={rootRef}>
      <button
        className="board-menu-trigger"
        title="Board options"
        aria-label={`Options for ${board.title}`}
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div className="menu" role="menu">
          <button role="menuitem" onClick={choose(onRename)}>
            <Pencil size={14} /> Rename
          </button>
          <button role="menuitem" onClick={choose(() => void duplicateBoard(board.id))}>
            <Copy size={14} /> Duplicate
          </button>
          <button
            role="menuitem"
            className="danger"
            onClick={choose(() =>
              askConfirm({
                title: `Delete "${board.title}"?`,
                message: "The board and everything on it will be permanently deleted. This can't be undone.",
                confirmLabel: "Delete board",
                onConfirm: () => void deleteBoard(board.id),
              }),
            )}
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}
