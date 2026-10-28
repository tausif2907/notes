import { useEffect, useRef, useState } from "react";
import { Grid3x3, Paintbrush, Rows3, Square, Grip } from "lucide-react";
import { scheduleSave } from "../canvas/autosave";
import { useAppStore } from "../store/appStore";
import { PAPERS } from "../theme";
import type { BoardBackground, BoardPaper } from "../types/board";

const PATTERNS: { id: BoardBackground; label: string; icon: typeof Grip }[] = [
  { id: "dots", label: "Dots", icon: Grip },
  { id: "grid", label: "Grid", icon: Grid3x3 },
  { id: "lines", label: "Lines", icon: Rows3 },
  { id: "plain", label: "Plain", icon: Square },
];

export function BackgroundPicker() {
  const board = useAppStore((s) => s.boards.find((b) => b.id === s.activeBoardId));
  const updateBoard = useAppStore((s) => s.updateBoard);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [open]);

  if (!board) return null;

  return (
    <div className="popover-root" ref={rootRef}>
      <button
        className={`header-button${open ? " active" : ""}`}
        title="Board background"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <Paintbrush size={16} />
        Background
      </button>
      {open && (
        <div className="popover">
          <h3>Pattern</h3>
          <div className="pattern-options">
            {PATTERNS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={board.background === id ? "active" : ""}
                onClick={() => updateBoard(board.id, { background: id })}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </div>
          <h3>Paper</h3>
          <div className="swatches">
            {(Object.keys(PAPERS) as BoardPaper[]).map((id) => (
              <button
                key={id}
                className={`swatch large${board.paper === id ? " active" : ""}`}
                style={{ background: PAPERS[id].color }}
                title={PAPERS[id].label}
                aria-label={PAPERS[id].label}
                onClick={() => {
                  updateBoard(board.id, { paper: id });
                  // Re-saving refreshes the thumbnail with the new paper colour.
                  scheduleSave();
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
