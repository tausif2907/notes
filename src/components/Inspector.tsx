import type { ReactNode } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDownToLine,
  ArrowUpToLine,
  Bold,
  Copy,
  Italic,
  Minus,
  Plus,
  Strikethrough,
  Trash2,
  Underline,
} from "lucide-react";
import { useAppStore } from "../store/appStore";
import {
  applyCardStyle,
  applyTextStyle,
  bringToFront,
  sendToBack,
  setTextAlign,
  toggleTextStyle,
} from "../canvas/styling";
import { deleteSelection, duplicateSelection } from "../canvas/editor";
import {
  BORDER_COLORS,
  BORDER_WIDTHS,
  CARD_FILLS,
  CORNERS,
  FONTS,
  FONT_SIZES,
  HIGHLIGHTS,
  TEXT_COLORS,
} from "../theme";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="inspector-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function Swatches({
  colors,
  value,
  onPick,
  noneLabel,
}: {
  colors: string[];
  value: string;
  onPick: (color: string) => void;
  noneLabel?: string;
}) {
  return (
    <div className="swatches">
      {colors.map((color) => (
        <button
          key={color || "none"}
          className={`swatch${color === "" ? " none" : ""}${value.toLowerCase() === color ? " active" : ""}`}
          style={color ? { background: color } : undefined}
          title={color || noneLabel}
          aria-label={color || noneLabel}
          onClick={() => onPick(color)}
        />
      ))}
    </div>
  );
}

function IconButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      className={`icon-button${active ? " active" : ""}`}
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function stepFontSize(current: number, direction: 1 | -1) {
  const next =
    direction > 0 ? FONT_SIZES.find((s) => s > current) : [...FONT_SIZES].reverse().find((s) => s < current);
  return next ?? current;
}

/** Style panel for the current selection. */
export function Inspector() {
  const selection = useAppStore((s) => s.selection);
  if (!selection) return null;
  const { text, card, textRange } = selection;

  return (
    // Keeping focus on the canvas means styling never interrupts typing.
    <aside className="inspector" onMouseDown={(e) => e.preventDefault()}>
      {text && (
        <Section title={textRange ? "Selected text" : "Text"}>
          <div className="font-list">
            {FONTS.map((font) => (
              <button
                key={font.id}
                className={`font-option${text.fontFamily === font.family ? " active" : ""}`}
                style={{ fontFamily: font.family }}
                onClick={() => applyTextStyle({ fontFamily: font.family })}
              >
                {font.label}
              </button>
            ))}
          </div>

          <div className="row">
            <div className="stepper">
              <IconButton label="Smaller text" onClick={() => applyTextStyle({ fontSize: stepFontSize(text.fontSize, -1) })}>
                <Minus size={14} />
              </IconButton>
              <span className="stepper-value">{Math.round(text.fontSize)}</span>
              <IconButton label="Larger text" onClick={() => applyTextStyle({ fontSize: stepFontSize(text.fontSize, 1) })}>
                <Plus size={14} />
              </IconButton>
            </div>
            <div className="button-group">
              <IconButton label="Bold (Ctrl B)" active={text.bold} onClick={() => toggleTextStyle("bold")}>
                <Bold size={15} />
              </IconButton>
              <IconButton label="Italic (Ctrl I)" active={text.italic} onClick={() => toggleTextStyle("italic")}>
                <Italic size={15} />
              </IconButton>
              <IconButton label="Underline (Ctrl U)" active={text.underline} onClick={() => toggleTextStyle("underline")}>
                <Underline size={15} />
              </IconButton>
              <IconButton label="Strikethrough" active={text.linethrough} onClick={() => toggleTextStyle("linethrough")}>
                <Strikethrough size={15} />
              </IconButton>
            </div>
          </div>

          <div className="button-group">
            <IconButton label="Align left" active={text.textAlign === "left"} onClick={() => setTextAlign("left")}>
              <AlignLeft size={15} />
            </IconButton>
            <IconButton label="Align centre" active={text.textAlign === "center"} onClick={() => setTextAlign("center")}>
              <AlignCenter size={15} />
            </IconButton>
            <IconButton label="Align right" active={text.textAlign === "right"} onClick={() => setTextAlign("right")}>
              <AlignRight size={15} />
            </IconButton>
          </div>

          <h3>Colour</h3>
          <Swatches colors={TEXT_COLORS} value={text.fill} onPick={(fill) => applyTextStyle({ fill })} />
          <h3>Highlight</h3>
          <Swatches
            colors={HIGHLIGHTS}
            value={text.highlight}
            noneLabel="No highlight"
            onPick={(textBackgroundColor) => applyTextStyle({ textBackgroundColor })}
          />
        </Section>
      )}

      {card && (
        <Section title="Card">
          <h3>Fill</h3>
          <Swatches colors={CARD_FILLS} value={card.cardFill} onPick={(cardFill) => applyCardStyle({ cardFill })} />
          <h3>Border</h3>
          <Swatches
            colors={BORDER_COLORS}
            value={card.cardStrokeWidth > 0 ? card.cardStroke : ""}
            noneLabel="No border"
            onPick={(cardStroke) =>
              applyCardStyle({
                cardStroke,
                cardStrokeWidth: cardStroke ? card.cardStrokeWidth || 2 : 0,
              })
            }
          />
          {card.cardStrokeWidth > 0 && (
            <div className="segmented">
              {BORDER_WIDTHS.map(({ label, value }) => (
                <button
                  key={value}
                  className={card.cardStrokeWidth === value ? "active" : ""}
                  onClick={() => applyCardStyle({ cardStrokeWidth: value })}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          <h3>Corners</h3>
          <div className="segmented">
            {CORNERS.map(({ label, value }) => (
              <button
                key={value}
                className={card.cornerRadius === value ? "active" : ""}
                onClick={() => applyCardStyle({ cornerRadius: value })}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={card.cardShadow}
              onChange={(e) => applyCardStyle({ cardShadow: e.target.checked })}
            />
            Shadow
          </label>
        </Section>
      )}

      <Section title={selection.count > 1 ? `${selection.count} items` : "Arrange"}>
        <div className="button-group">
          <IconButton label="Bring to front" onClick={bringToFront}>
            <ArrowUpToLine size={15} />
          </IconButton>
          <IconButton label="Send to back" onClick={sendToBack}>
            <ArrowDownToLine size={15} />
          </IconButton>
          <IconButton label="Duplicate (Ctrl D)" onClick={() => void duplicateSelection()}>
            <Copy size={15} />
          </IconButton>
          <IconButton label="Delete (Del)" onClick={deleteSelection}>
            <Trash2 size={15} />
          </IconButton>
        </div>
      </Section>
    </aside>
  );
}
