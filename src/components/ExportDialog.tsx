import { useEffect, useRef, useState } from "react";
import { IText } from "fabric";
import { Download, FileImage, FileText } from "lucide-react";
import { countPages, exportPdf, exportPng } from "../canvas/exporter";
import { session } from "../canvas/session";
import { PAGE_SIZES, type PageSize } from "../canvas/sheet";
import { PDF, PNG, fileName, saveFile } from "../platform/files";
import { useAppStore } from "../store/appStore";

type Format = "pdf" | "png";

/** Header button and dialog for saving the open board as a PDF or PNG. */
export function ExportButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="header-button" title="Save as PDF or image" onClick={() => setOpen(true)}>
        <Download size={16} />
        Export
      </button>
      {open && <ExportDialog onClose={() => setOpen(false)} />}
    </>
  );
}

function ExportDialog({ onClose }: { onClose: () => void }) {
  const board = useAppStore((s) => s.boards.find((b) => b.id === s.activeBoardId));
  const showNotice = useAppStore((s) => s.showNotice);
  const [format, setFormat] = useState<Format>("pdf");
  const [pageSize, setPageSize] = useState<PageSize>("a4");
  const [pattern, setPattern] = useState(true);
  const [busy, setBusy] = useState(false);
  const exportRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Finish any typing so the export includes it without a text cursor.
    const active = session.canvas?.getActiveObject();
    if (active instanceof IText && active.isEditing) active.exitEditing();
    exportRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
      e.stopPropagation();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [busy, onClose]);

  if (!board) return null;
  const pages = countPages(pageSize);

  const run = async () => {
    setBusy(true);
    try {
      const options = { pageSize, pattern };
      if (format === "pdf") {
        const { bytes, pages } = await exportPdf(board, options);
        const path = await saveFile(bytes, fileName(board.title, PDF), PDF);
        if (path) showNotice(`Saved ${pages} page${pages === 1 ? "" : "s"} to ${path}`);
      } else {
        const bytes = await exportPng(board, options);
        const path = await saveFile(bytes, fileName(board.title, PNG), PNG);
        if (path) showNotice(`Saved image to ${path}`);
      }
      onClose();
    } catch (err) {
      console.error(err);
      showNotice("Export failed. Please try again.");
      setBusy(false);
    }
  };

  return (
    <div className="dialog-backdrop" onMouseDown={() => !busy && onClose()}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id="export-title">Export “{board.title}”</h2>

        <div className="format-options">
          <button className={format === "pdf" ? "active" : ""} onClick={() => setFormat("pdf")}>
            <FileText size={20} />
            <strong>PDF</strong>
            <span>For printing and sharing</span>
          </button>
          <button className={format === "png" ? "active" : ""} onClick={() => setFormat("png")}>
            <FileImage size={20} />
            <strong>PNG image</strong>
            <span>One long picture</span>
          </button>
        </div>

        {format === "pdf" && (
          <>
            <h3>Page size</h3>
            <div className="segmented">
              {(Object.keys(PAGE_SIZES) as PageSize[]).map((size) => (
                <button key={size} className={pageSize === size ? "active" : ""} onClick={() => setPageSize(size)}>
                  {PAGE_SIZES[size].label}
                </button>
              ))}
            </div>
            <p className="hint">
              {pages} page{pages === 1 ? "" : "s"}. The faint lines on the board show where A4 pages break.
            </p>
          </>
        )}

        <label className="toggle">
          <input type="checkbox" checked={pattern} onChange={(e) => setPattern(e.target.checked)} />
          Include the background pattern
        </label>

        <div className="dialog-actions">
          <button className="secondary-button" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button ref={exportRef} className="primary-button" onClick={() => void run()} disabled={busy}>
            {busy ? "Exporting…" : format === "pdf" ? "Save PDF…" : "Save image…"}
          </button>
        </div>
      </div>
    </div>
  );
}
