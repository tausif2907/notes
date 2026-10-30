import { useEffect, useState } from "react";
import { CanvasView } from "./canvas/CanvasView";
import { BackgroundPicker } from "./components/BackgroundPicker";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { ContextMenu } from "./components/ContextMenu";
import { ExportButton } from "./components/ExportDialog";
import { HistoryControls } from "./components/HistoryControls";
import { HomeView } from "./components/HomeView";
import { Inspector } from "./components/Inspector";
import { Notice } from "./components/Notice";
import { Sidebar } from "./components/Sidebar";
import { StatusBar } from "./components/StatusBar";
import { TemplatePicker } from "./components/TemplatePicker";
import { TitleInput } from "./components/TitleInput";
import { Toolbar, TOOL_SHORTCUTS } from "./components/Toolbar";
import { useAppStore } from "./store/appStore";

export default function App() {
  const ready = useAppStore((s) => s.ready);
  const view = useAppStore((s) => s.view);
  const panelOpen = useAppStore((s) => s.panelOpen);
  const board = useAppStore((s) => s.boards.find((b) => b.id === s.activeBoardId));
  const updateBoard = useAppStore((s) => s.updateBoard);
  const [renaming, setRenaming] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    useAppStore
      .getState()
      .init()
      .catch((err) => {
        console.error(err);
        setLoadError(true);
      });
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey || useAppStore.getState().view !== "board") return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const tool = TOOL_SHORTCUTS[e.key.toLowerCase()];
      if (tool) useAppStore.getState().setTool(tool);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!ready) {
    return (
      <div className="splash">
        {loadError ? "Your boards could not be loaded. Please restart StickyBoard." : "Opening your boards…"}
      </div>
    );
  }

  return (
    <div className="app">
      <Sidebar />
      <main className="workspace">
        <header className="workspace-header">
          {board && renaming ? (
            <TitleInput
              className="board-title"
              value={board.title}
              onDone={(title) => {
                setRenaming(false);
                if (title) updateBoard(board.id, { title });
              }}
            />
          ) : (
            <h1 className="board-title" title="Click to rename" onClick={() => setRenaming(true)}>
              {board?.title}
            </h1>
          )}
          <div className="header-actions">
            <ExportButton />
            <BackgroundPicker />
            <HistoryControls />
          </div>
        </header>
        {/* Tools, board and style panel each get their own space, so
            nothing ever covers the notes on the sheet. */}
        <div className="toolbar-row">
          <Toolbar />
          <StatusBar />
        </div>
        <div className="workspace-body">
          <div className="stage">
            <CanvasView />
            <Notice />
          </div>
          {panelOpen && <Inspector />}
        </div>
        {/* The board stays mounted underneath so switching back is instant. */}
        {view === "home" && <HomeView />}
      </main>
      <ConfirmDialog />
      <ContextMenu />
      <TemplatePicker />
    </div>
  );
}
