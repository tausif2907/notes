import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { useAppStore } from "../store/appStore";
import { BoardMenu } from "./BoardMenu";
import { Thumbnail } from "./Thumbnail";
import { TitleInput } from "./TitleInput";

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

function editedLabel(time: number) {
  const minutes = Math.round((Date.now() - time) / 60000);
  if (minutes < 1) return "Edited just now";
  if (minutes < 60) return `Edited ${minutes} min ago`;
  return `Edited ${dateFormat.format(time)}`;
}

/** Grid of every board with previews, search and board actions. */
export function HomeView() {
  const boards = useAppStore((s) => s.boards);
  const setShowTemplates = useAppStore((s) => s.setShowTemplates);
  const selectBoard = useAppStore((s) => s.selectBoard);
  const updateBoard = useAppStore((s) => s.updateBoard);
  const [query, setQuery] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = q ? boards.filter((b) => b.title.toLowerCase().includes(q)) : boards;
    return [...matches].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [boards, query]);

  return (
    <section className="home" aria-label="All boards">
      <header className="home-header">
        <h1>All boards</h1>
        <label className="search">
          <Search size={16} />
          <input
            type="search"
            placeholder="Search boards"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <button className="primary-button" onClick={() => setShowTemplates(true)}>
          <Plus size={16} /> New board
        </button>
      </header>

      {shown.length === 0 ? (
        <p className="home-empty">No boards match “{query}”.</p>
      ) : (
        <div className="board-grid">
          {shown.map((b) => (
            <article key={b.id} className="board-card" onClick={() => selectBoard(b.id)}>
              <Thumbnail board={b} />
              <div className="board-card-info">
                <div className="board-card-text">
                  {renamingId === b.id ? (
                    <TitleInput
                      value={b.title}
                      onDone={(title) => {
                        setRenamingId(null);
                        if (title) updateBoard(b.id, { title });
                      }}
                    />
                  ) : (
                    <h2>{b.title}</h2>
                  )}
                  <p>{editedLabel(b.updatedAt)}</p>
                </div>
                <BoardMenu board={b} onRename={() => setRenamingId(b.id)} />
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
