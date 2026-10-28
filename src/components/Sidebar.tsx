import { Plus, StickyNote } from "lucide-react";
import { useAppStore } from "../store/appStore";

export function Sidebar() {
  const boards = useAppStore((s) => s.boards);
  const activeBoardId = useAppStore((s) => s.activeBoardId);
  const createBoard = useAppStore((s) => s.createBoard);
  const selectBoard = useAppStore((s) => s.selectBoard);

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

      <div className="sidebar-heading">Boards</div>
      <nav className="board-list">
        {boards.map((b) => (
          <button
            key={b.id}
            className={`board-link${b.id === activeBoardId ? " active" : ""}`}
            onClick={() => selectBoard(b.id)}
          >
            {b.title}
          </button>
        ))}
      </nav>
    </aside>
  );
}
