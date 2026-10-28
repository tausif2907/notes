import { useState } from "react";
import { FileUp, LayoutGrid, Plus, StickyNote } from "lucide-react";
import { openPdf } from "../canvas/pdfImport";
import { PDF, openFile } from "../platform/files";
import { useAppStore } from "../store/appStore";
import { BackupControls } from "./BackupControls";
import { BoardMenu } from "./BoardMenu";
import { TitleInput } from "./TitleInput";
import { Thumbnail } from "./Thumbnail";

export function Sidebar() {
  const boards = useAppStore((s) => s.boards);
  const activeBoardId = useAppStore((s) => s.activeBoardId);
  const view = useAppStore((s) => s.view);
  const setShowTemplates = useAppStore((s) => s.setShowTemplates);
  const selectBoard = useAppStore((s) => s.selectBoard);
  const updateBoard = useAppStore((s) => s.updateBoard);
  const setView = useAppStore((s) => s.setView);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);

  const openPdfFile = async () => {
    if (opening) return;
    setOpening(true);
    try {
      const bytes = await openFile(PDF);
      if (bytes) await openPdf(bytes);
    } finally {
      setOpening(false);
    }
  };

  return (
    <aside className="sidebar">
      <div className="brand">
        <StickyNote size={20} />
        <span>StickyBoard</span>
      </div>

      <button className="new-board" onClick={() => setShowTemplates(true)}>
        <Plus size={16} />
        New board
      </button>
      <button className={`nav-link${view === "home" ? " active" : ""}`} onClick={() => setView("home")}>
        <LayoutGrid size={16} />
        All boards
      </button>
      <button
        className="nav-link"
        onClick={() => void openPdfFile()}
        disabled={opening}
        title="Open a PDF exported from StickyBoard and keep editing it"
      >
        <FileUp size={16} />
        {opening ? "Opening PDF…" : "Open PDF"}
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
