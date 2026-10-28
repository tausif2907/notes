import {
  Control,
  Point,
  Textbox,
  classRegistry,
  controlsUtils,
  util,
  type InteractiveFabricObject,
  type TextboxProps,
  type TransformActionHandler,
} from "fabric";
import { FONTS, INK } from "../theme";

/** "text" is plain text; the others draw a card behind the text. */
export type NoteKind = "text" | "sticky" | "box" | "bubble";

export interface CardProps {
  kind: NoteKind;
  cardFill: string;
  cardStroke: string;
  cardStrokeWidth: number;
  cornerRadius: number;
  cardPadding: number;
  minCardHeight: number;
  cardShadow: boolean;
  /** Speech-bubble tail tip, relative to the item's centre (unscaled units). */
  tailX: number;
  tailY: number;
}

const CARD_PROPERTIES: (keyof CardProps)[] = [
  "kind",
  "cardFill",
  "cardStroke",
  "cardStrokeWidth",
  "cornerRadius",
  "cardPadding",
  "minCardHeight",
  "cardShadow",
  "tailX",
  "tailY",
];

const ACCENT = "#6366f1";

/**
 * Keeps the top edge in place when the width handles re-wrap the text.
 * Fabric anchors the vertical centre, which makes the item jump up or down.
 */
const keepTopEdge =
  (handler: TransformActionHandler): TransformActionHandler =>
  (e, transform, x, y) => {
    const target = transform.target;
    const oldHeight = target.height;
    const changed = handler(e, transform, x, y);
    const dh = ((target.height - oldHeight) / 2) * target.scaleY;
    if (dh) {
      const shift = util.rotateVector(new Point(0, dh), util.degreesToRadians(target.angle));
      target.set({ left: target.left + shift.x, top: target.top + shift.y });
      target.setCoords();
    }
    return changed;
  };

/** Draggable handle on the tip of a speech bubble's tail. */
function createTailControl() {
  const control = new Control({
    cursorStyle: "crosshair",
    actionName: "moveTail",
    positionHandler: (_dim, _matrix, obj) => {
      const note = obj as unknown as NoteText;
      const matrix = util.multiplyTransformMatrices(note.getViewportTransform(), note.calcTransformMatrix());
      return new Point(note.tailX, note.tailY).transform(matrix);
    },
    actionHandler: (_e, transform, x, y) => {
      const note = transform.target as NoteText;
      const local = new Point(x, y).transform(util.invertTransform(note.calcTransformMatrix()));
      note.set({ tailX: local.x, tailY: local.y });
      return true;
    },
    render: (ctx, left, top) => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(left, top, 6, 0, Math.PI * 2);
      ctx.fillStyle = ACCENT;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    },
  });
  control.getVisibility = (obj: InteractiveFabricObject) => (obj as unknown as NoteText).kind === "bubble";
  return control;
}

/**
 * A text box that can draw a card behind its text: sticky note, bordered
 * text box or speech bubble. Padding is applied by shifting Fabric's text
 * offsets, so typing, the cursor and text selection all keep working.
 */
export class NoteText extends Textbox {
  static type = "NoteText";
  static customProperties = CARD_PROPERTIES;
  static textLayoutProperties = [...Textbox.textLayoutProperties, "cardPadding", "minCardHeight"];

  declare kind: NoteKind;
  declare cardFill: string;
  declare cardStroke: string;
  declare cardStrokeWidth: number;
  declare cornerRadius: number;
  declare cardPadding: number;
  declare minCardHeight: number;
  declare cardShadow: boolean;
  declare tailX: number;
  declare tailY: number;

  static createControls() {
    const { controls } = Textbox.createControls();
    controls.ml.actionHandler = keepTopEdge(controlsUtils.changeWidth);
    controls.mr.actionHandler = keepTopEdge(controlsUtils.changeWidth);
    return { controls: { ...controls, tail: createTailControl() } };
  }

  constructor(text: string, options: Partial<TextboxProps & CardProps> = {}) {
    super(text, { ...NOTE_DEFAULTS, ...options });
    this.editingBorderColor = ACCENT;
    this.cursorColor = ACCENT;
    this.selectionColor = "rgba(99, 102, 241, 0.25)";
  }

  private get pad() {
    return this.cardPadding ?? 0;
  }

  initDimensions() {
    if (!this.initialized) return;
    super.initDimensions();
    const pad = this.pad;
    if (this.dynamicMinWidth + 2 * pad > this.width) this._set("width", this.dynamicMinWidth + 2 * pad);
    this.height = Math.max(this.calcTextHeight() + 2 * pad, this.minCardHeight ?? 0);
  }

  _wrapText(lines: string[], desiredWidth: number) {
    return super._wrapText(lines, desiredWidth - 2 * this.pad);
  }

  _getLeftOffset() {
    return super._getLeftOffset() + this.pad;
  }

  _getTopOffset() {
    return super._getTopOffset() + this.pad;
  }

  _getLineLeftOffset(lineIndex: number) {
    // Align lines within the padded area rather than the full card width.
    const width = this.width;
    this.width = width - 2 * this.pad;
    try {
      return super._getLineLeftOffset(lineIndex);
    } finally {
      this.width = width;
    }
  }

  _renderBackground(ctx: CanvasRenderingContext2D) {
    if (this.kind === "text") return super._renderBackground(ctx);
    const w = this.width;
    const h = this.height;
    const radius = Math.min(this.cornerRadius, w / 2, h / 2);
    const tail = this.kind === "bubble" ? this.tailPoints() : null;

    const body = () => {
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, radius);
    };
    const tailPath = () => {
      if (!tail) return false;
      ctx.beginPath();
      ctx.moveTo(tail[0].x, tail[0].y);
      ctx.lineTo(tail[1].x, tail[1].y);
      ctx.lineTo(tail[2].x, tail[2].y);
      ctx.closePath();
      return true;
    };

    ctx.save();
    if (this.cardShadow) {
      // Shadow sizes are in screen pixels, so scale them with zoom.
      const scale = (this.canvas?.getZoom() ?? 1) * this.scaleY;
      ctx.shadowColor = "rgba(60, 45, 10, 0.3)";
      ctx.shadowBlur = 18 * scale;
      ctx.shadowOffsetY = 8 * scale;
    }
    // Stroke at double width, then fill on top: only the outer half of the
    // outline survives, so the bubble and its tail read as one shape.
    if (this.cardStroke && this.cardStrokeWidth > 0) {
      ctx.lineJoin = "round";
      ctx.lineWidth = this.cardStrokeWidth * 2;
      ctx.strokeStyle = this.cardStroke;
      body();
      ctx.stroke();
      if (tailPath()) ctx.stroke();
      ctx.shadowColor = "transparent";
    }
    ctx.fillStyle = this.cardFill || "#ffffff";
    body();
    ctx.fill();
    ctx.shadowColor = "transparent";
    if (tailPath()) ctx.fill();
    ctx.restore();
  }

  /** Base corners and tip of the tail, or null when the tip is inside the card. */
  private tailPoints() {
    const w = this.width / 2;
    const h = this.height / 2;
    const { tailX: tx, tailY: ty } = this;
    const outX = Math.abs(tx) - w;
    const outY = Math.abs(ty) - h;
    if (outX <= 0 && outY <= 0) return null;

    const radius = Math.min(this.cornerRadius, w, h);
    const half = Math.max(4, Math.min(16, w / 3, h / 3));
    const clamp = (v: number, limit: number) => Math.max(-limit, Math.min(limit, v));
    const tip = new Point(tx, ty);
    if (outY >= outX) {
      // Tail leaves from the top or bottom edge, 1px inside so the shapes overlap.
      const edge = Math.sign(ty) * (h - 1);
      const cx = clamp(tx * 0.5, Math.max(0, w - radius - half));
      return [new Point(cx - half, edge), tip, new Point(cx + half, edge)];
    }
    const edge = Math.sign(tx) * (w - 1);
    const cy = clamp(ty * 0.5, Math.max(0, h - radius - half));
    return [new Point(edge, cy - half), tip, new Point(edge, cy + half)];
  }
}

classRegistry.setClass(NoteText);

const NOTE_DEFAULTS: Partial<TextboxProps & CardProps> = {
  kind: "text",
  cardFill: "",
  cardStroke: "",
  cardStrokeWidth: 0,
  cornerRadius: 0,
  cardPadding: 0,
  minCardHeight: 0,
  cardShadow: false,
  tailX: 0,
  tailY: 0,
  // Cards and tails paint outside the text area, which a cache would clip.
  objectCaching: false,
  originX: "left",
  originY: "top",
  fontFamily: FONTS[0].family,
  fontSize: 20,
  lineHeight: 1.3,
  fill: INK,
};

/** Starting look for each kind of item the toolbar creates. */
export const NOTE_PRESETS: Record<NoteKind, Partial<TextboxProps & CardProps>> = {
  text: { width: 260, minWidth: 40 },
  sticky: {
    kind: "sticky",
    width: 220,
    minWidth: 100,
    minCardHeight: 220,
    cardPadding: 20,
    cardFill: "#fff1a8",
    cornerRadius: 4,
    cardShadow: true,
    fontFamily: FONTS[1].family,
    fontSize: 22,
  },
  box: {
    kind: "box",
    width: 280,
    minWidth: 80,
    cardPadding: 16,
    cardFill: "#ffffff",
    cardStroke: INK,
    cardStrokeWidth: 2,
    cornerRadius: 12,
  },
  bubble: {
    kind: "bubble",
    width: 240,
    minWidth: 100,
    cardPadding: 18,
    cardFill: "#ffffff",
    cardStroke: INK,
    cardStrokeWidth: 2,
    cornerRadius: 28,
    textAlign: "center",
    tailX: -60,
    tailY: 80,
  },
};
