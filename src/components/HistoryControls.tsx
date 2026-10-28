import { Redo2, Undo2 } from "lucide-react";
import { useAppStore } from "../store/appStore";
import { redo, undo } from "../canvas/editor";

export function HistoryControls() {
  const canUndo = useAppStore((s) => s.canUndo);
  const canRedo = useAppStore((s) => s.canRedo);

  return (
    <div className="history-controls">
      <button title="Undo (Ctrl Z)" aria-label="Undo" disabled={!canUndo} onClick={() => void undo()}>
        <Undo2 size={17} />
      </button>
      <button title="Redo (Ctrl Y)" aria-label="Redo" disabled={!canRedo} onClick={() => void redo()}>
        <Redo2 size={17} />
      </button>
    </div>
  );
}
