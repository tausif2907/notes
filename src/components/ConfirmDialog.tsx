import { useEffect, useRef } from "react";
import { useAppStore } from "../store/appStore";

export function ConfirmDialog() {
  const confirm = useAppStore((s) => s.confirm);
  const askConfirm = useAppStore((s) => s.askConfirm);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!confirm) return;
    // Focus Cancel so a stray Enter never deletes anything.
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") askConfirm(null);
      e.stopPropagation();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [confirm, askConfirm]);

  if (!confirm) return null;
  return (
    <div className="dialog-backdrop" onMouseDown={() => askConfirm(null)}>
      <div
        className="dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id="dialog-title">{confirm.title}</h2>
        <p>{confirm.message}</p>
        <div className="dialog-actions">
          <button ref={cancelRef} className="secondary-button" onClick={() => askConfirm(null)}>
            Cancel
          </button>
          <button
            className="danger-button"
            onClick={() => {
              askConfirm(null);
              confirm.onConfirm();
            }}
          >
            {confirm.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
