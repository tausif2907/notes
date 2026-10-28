import { useEffect } from "react";
import { CanvasView } from "./canvas/CanvasView";
import { Sidebar } from "./components/Sidebar";
import { StatusBar } from "./components/StatusBar";
import { Toolbar, TOOL_SHORTCUTS } from "./components/Toolbar";
import { useAppStore } from "./store/appStore";

export default function App() {
  const board = useAppStore((s) => s.boards.find((b) => b.id === s.activeBoardId));

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const tool = TOOL_SHORTCUTS[e.key.toLowerCase()];
      if (tool) useAppStore.getState().setTool(tool);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="app">
      <Sidebar />
      <main className="workspace">
        <header className="workspace-header">
          <h1 className="board-title">{board?.title}</h1>
        </header>
        <div className="stage">
          <CanvasView />
          <div className="toolbar-dock">
            <Toolbar />
          </div>
          <div className="status-dock">
            <StatusBar />
          </div>
        </div>
      </main>
    </div>
  );
}
