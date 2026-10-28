import { useEffect, useState } from "react";
import { renderThumbnail } from "../canvas/thumbnail";
import { useAppStore } from "../store/appStore";
import { TEMPLATES, type Template } from "../templates";
import { PAPERS } from "../theme";

/** Template previews are drawn once and reused. */
const previews = new Map<string, Promise<string | undefined>>();

function preview(template: Template) {
  if (!previews.has(template.id)) {
    previews.set(template.id, renderThumbnail({ objects: template.build() }, PAPERS[template.paper].color));
  }
  return previews.get(template.id)!;
}

function TemplateCard({ template, onPick, disabled }: { template: Template; onPick: () => void; disabled: boolean }) {
  const [src, setSrc] = useState<string>();
  useEffect(() => {
    let live = true;
    void preview(template).then((url) => live && setSrc(url));
    return () => {
      live = false;
    };
  }, [template]);

  return (
    <button className="template-card" onClick={onPick} disabled={disabled}>
      <div className="thumbnail" style={{ background: PAPERS[template.paper].color }}>
        {src ? <img src={src} alt="" /> : <span>{template.id === "blank" ? "Empty sheet" : ""}</span>}
      </div>
      <strong>{template.name}</strong>
      <span>{template.description}</span>
    </button>
  );
}

/** Dialog shown by "New board": start blank or from a ready-made layout. */
export function TemplatePicker() {
  const open = useAppStore((s) => s.showTemplates);
  const setShowTemplates = useAppStore((s) => s.setShowTemplates);
  const createBoard = useAppStore((s) => s.createBoard);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setBusy(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowTemplates(false);
      e.stopPropagation();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, setShowTemplates]);

  if (!open) return null;
  return (
    <div className="dialog-backdrop" onMouseDown={() => setShowTemplates(false)}>
      <div
        className="dialog templates-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="templates-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id="templates-title">New board</h2>
        <p>Start with an empty sheet or a ready-made layout. You can change everything afterwards.</p>
        <div className="template-grid">
          {TEMPLATES.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              disabled={busy}
              onPick={() => {
                setBusy(true);
                void createBoard(t.id);
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
