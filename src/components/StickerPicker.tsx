import { useEffect, useRef, useState } from "react";
import { Smile } from "lucide-react";
import { addBadge, addEmoji } from "../canvas/editor";
import { BADGE_STICKERS, EMOJI_FONT, EMOJI_STICKERS } from "../theme";

/** Toolbar button with a grid of emoji and word-badge stickers. */
export function StickerPicker() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (add: () => void) => () => {
    add();
    setOpen(false);
  };

  return (
    <div className="popover-root" ref={rootRef}>
      <button
        className={`tool-button${open ? " active" : ""}`}
        title="Stickers"
        aria-label="Stickers"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <Smile size={18} strokeWidth={1.8} />
      </button>
      {open && (
        <div className="popover sticker-popover">
          <h3>Stickers</h3>
          <div className="emoji-grid">
            {EMOJI_STICKERS.map((emoji) => (
              <button key={emoji} style={{ fontFamily: EMOJI_FONT }} onClick={pick(() => addEmoji(emoji))}>
                {emoji}
              </button>
            ))}
          </div>
          <h3>Labels</h3>
          <div className="badge-list">
            {BADGE_STICKERS.map((badge) => (
              <button key={badge.text} style={{ background: badge.fill }} onClick={pick(() => addBadge(badge))}>
                {badge.text}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
