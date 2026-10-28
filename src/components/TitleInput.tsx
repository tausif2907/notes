import { useEffect, useRef, useState } from "react";

const MAX_TITLE = 80;

/** Inline text field for renaming; Enter or clicking away saves, Esc cancels. */
export function TitleInput({
  value,
  onDone,
  className,
}: {
  value: string;
  onDone: (title: string | null) => void;
  className?: string;
}) {
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement>(null);
  const done = useRef(false);

  useEffect(() => {
    ref.current?.select();
  }, []);

  const finish = (save: boolean) => {
    if (done.current) return;
    done.current = true;
    const title = draft.trim();
    onDone(save && title && title !== value ? title : null);
  };

  return (
    <input
      ref={ref}
      className={`title-input ${className ?? ""}`}
      value={draft}
      maxLength={MAX_TITLE}
      aria-label="Board name"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => finish(true)}
      onKeyDown={(e) => {
        if (e.key === "Enter") finish(true);
        if (e.key === "Escape") finish(false);
        e.stopPropagation();
      }}
      onClick={(e) => e.stopPropagation()}
    />
  );
}
