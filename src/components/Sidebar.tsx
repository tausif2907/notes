import { useState } from "react";
import { LayoutGrid, Plus, StickyNote } from "lucide-react";
import { useAppStore } from "../store/appStore";
import { BackupControls } from "./BackupControls";
import { BoardMenu } from "./BoardMenu";
import { TitleInput } from "./TitleInput";
import { Thumbnail } from "./Thumbnail";

export function Sidebar() {
  const boards = useAppStore((s) => s.boards);
  const activeBoardId = useAppStore((s) => s.activeBoardId);
  const view = useAppStore((s) => s.view);
  const createBoard = useAppStore((s) => s.createBoard);
  const selectBoard = useAppStore((s) => s.selectBoard);
  const updateBoard = useAppStore((s) => s.updateBoard);
  const setView = useAppStore((s) => s.setView);
  const [renamingId, setRenamingId] = useState<string | null>(null);

  return (
    <aside className="sidebar">
      <div className="brand">
        <StickyNote size={20} />
        <span>StickyBoard</span>
      </div>

      <button className="new-board" onClick={createBoard}>
        <Plus size={16} />
        New board
      </button>
      <button className={`nav-link${view === "home" ? " active" : ""}`} onClick={() => setView("home")}>
        <LayoutGrid size={16} />
        All boards
      </button>

      <div className="sidebar-heading">Boards</div>
      <nav className="board-list">
        {boards.map((b) => (
          <div
            key={b.id}
            className={`board-link${view === "board" && b.id === activeBoardId ? " active" : ""}`}
            onClick={() => selectBoard(b.id)}
          >
            <Thumbnail board={b} small />
            {renamingId === b.id ? (
              <TitleInput
                value={b.title}
                onDone={(title) => {
                  setRenamingId(null);
                  if (title) updateBoard(b.id, { title });
                }}
              />
            ) : (
              <button className="board-link-title" onDoubleClick={() => setRenamingId(b.id)}>
                {b.title}
              </button>
            )}
            <BoardMenu board={b} onRename={() => setRenamingId(b.id)} />
          </div>
        ))}
      </nav>
      <BackupControls />
    </aside>
  );
}
