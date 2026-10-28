import type { ReactNode } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDownToLine,
  ArrowUpToLine,
  Bold,
  Check,
  Copy,
  Crop,
  Italic,
  Minus,
  Plus,
  Strikethrough,
  Trash2,
  Underline,
} from "lucide-react";
import { useAppStore, type DrawingTool } from "../store/appStore";
import { finishCrop, startCrop } from "../canvas/crop";
import { NoteImage } from "../canvas/noteImage";
import { session } from "../canvas/session";
import {
  applyCardStyle,
  applyImageStyle,
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
  HIGHLIGHTER_COLORS,
  HIGHLIGHTER_SIZES,
  HIGHLIGHTS,
  IMAGE_CORNERS,
  PEN_COLORS,
  PEN_SIZES,
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

/** White first: a white border makes a photo look like a printed snapshot. */
const IMAGE_BORDERS = ["", "#ffffff", ...BORDER_COLORS.slice(1)];

const IMAGE_BORDER_WIDTHS = [
  { label: "Thin", value: 3 },
  { label: "Medium", value: 6 },
  { label: "Thick", value: 12 },
];

function startCropOnSelection() {
  const image = session.canvas?.getActiveObject();
  if (image instanceof NoteImage) startCrop(image);
}

function stepFontSize(current: number, direction: 1 | -1) {
  const next =
    direction > 0 ? FONT_SIZES.find((s) => s > current) : [...FONT_SIZES].reverse().find((s) => s < current);
  return next ?? current;
}

/** Colour and thickness for the pen or highlighter while drawing. */
function DrawingOptions({ kind }: { kind: DrawingTool }) {
  const { color, size } = useAppStore((s) => s.drawing[kind]);
  const setDrawing = useAppStore((s) => s.setDrawing);
  const pen = kind === "pen";
  return (
    <Section title={pen ? "Pen" : "Highlighter"}>
      <h3>Colour</h3>
      <Swatches
        colors={pen ? PEN_COLORS : HIGHLIGHTER_COLORS}
        value={color}
        onPick={(c) => setDrawing(kind, { color: c })}
      />
      <h3>Thickness</h3>
      <div className="segmented">
        {(pen ? PEN_SIZES : HIGHLIGHTER_SIZES).map(({ label, value }) => (
          <button key={value} className={size === value ? "active" : ""} onClick={() => setDrawing(kind, { size: value })}>
            {label}
          </button>
        ))}
      </div>
      <p className="hint">
        Draw anywhere on the sheet. Press <kbd>Esc</kbd> or <kbd>V</kbd> to stop drawing.
      </p>
    </Section>
  );
}

/**
 * Style panel, docked beside the board so it never covers notes. It is
 * always shown (so the board does not shift when you select something).
 */
export function Inspector() {
  return (
    // Keeping focus on the canvas means styling never interrupts typing.
    <aside className="inspector" aria-label="Style" onMouseDown={(e) => e.preventDefault()}>
      <InspectorContent />
    </aside>
  );
}

function InspectorContent() {
  const selection = useAppStore((s) => s.selection);
  const tool = useAppStore((s) => s.tool);

  if (tool === "pen" || tool === "highlighter") return <DrawingOptions kind={tool} />;

  if (tool === "eraser") {
    return (
      <Section title="Eraser">
        <p className="hint">Drag over pen and highlighter lines to erase them. Notes, text and images are not affected.</p>
        <p className="hint">
          Press <kbd>Ctrl Z</kbd> to bring back what you erased, or <kbd>Esc</kbd> to stop erasing.
        </p>
      </Section>
    );
  }

  if (!selection) {
    return (
      <Section title="Style">
        <p className="hint">Select a note, text or image to change how it looks.</p>
        <p className="hint">Tip: select words while typing to highlight or colour just those words.</p>
      </Section>
    );
  }

  if (selection.cropping) {
    return (
      <Section title="Crop">
        <p className="hint">Drag the black handles to trim the image. The faded part will be cut off.</p>
        <div className="row">
          <button className="secondary-button" onClick={() => finishCrop(false)}>
            Cancel <kbd>Esc</kbd>
          </button>
          <button className="primary-button" onClick={() => finishCrop(true)}>
            <Check size={15} /> Done <kbd>Enter</kbd>
          </button>
        </div>
      </Section>
    );
  }

  const { text, card, image, textRange } = selection;
  return (
    <>
      {image && (
        <Section title="Image">
          <button className="secondary-button" onClick={startCropOnSelection}>
            <Crop size={15} /> Crop image
          </button>
          <h3>Corners</h3>
          <div className="segmented">
            {IMAGE_CORNERS.map(({ label, value }) => (
              <button
                key={value}
                className={image.cornerRadius === value ? "active" : ""}
                onClick={() => applyImageStyle({ cornerRadius: value })}
              >
                {label}
              </button>
            ))}
          </div>
          <h3>Border</h3>
          <Swatches
            colors={IMAGE_BORDERS}
            value={image.frameWidth > 0 ? image.frameColor : ""}
            noneLabel="No border"
            onPick={(frameColor) =>
              applyImageStyle({ frameColor, frameWidth: frameColor ? image.frameWidth || 6 : 0 })
            }
          />
          {image.frameWidth > 0 && (
            <div className="segmented">
              {IMAGE_BORDER_WIDTHS.map(({ label, value }) => (
                <button
                  key={value}
                  className={image.frameWidth === value ? "active" : ""}
                  onClick={() => applyImageStyle({ frameWidth: value })}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          <label className="toggle">
            <input
              type="checkbox"
              checked={image.imageShadow}
              onChange={(e) => applyImageStyle({ imageShadow: e.target.checked })}
            />
            Shadow
          </label>
        </Section>
      )}

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
    </>
  );
}
