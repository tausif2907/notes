import { StaticCanvas } from "fabric";
import { jsPDF } from "jspdf";
import { PAPERS } from "../theme";
import type { Board } from "../types/board";
import { session } from "./session";
import { PAGE_SIZES, SHEET_WIDTH, contentBottom, pageHeight, type PageSize } from "./sheet";

/** Pixels per board unit in exported files (about 240 dpi on A4). */
const EXPORT_SCALE = 2;
/** Browsers refuse canvases much taller than this. */
const MAX_IMAGE_HEIGHT = 16000;
const PNG_BOTTOM_MARGIN = 40;

export interface ExportOptions {
  pageSize: PageSize;
  /** Draw the board's dots, grid or lines, not just its paper colour. */
  pattern: boolean;
}

/** Number of PDF pages the open board needs. */
export function countPages(pageSize: PageSize) {
  const objects = session.canvas?.getObjects() ?? [];
  return Math.max(1, Math.ceil(contentBottom(objects) / pageHeight(pageSize)));
}

/** Paper colour and pattern for a strip of the sheet starting at `top`. */
function drawPaper(
  ctx: CanvasRenderingContext2D,
  board: Board,
  options: ExportOptions,
  top: number,
  scale: number,
) {
  const { width, height } = ctx.canvas;
  const paper = PAPERS[board.paper];
  ctx.fillStyle = paper.color;
  ctx.fillRect(0, 0, width, height);
  if (!options.pattern || board.background === "plain") return;

  // Same spacing as the on-screen pattern, in board units.
  const cell = board.background === "lines" ? 32 : 24;
  const bottom = top + height / scale;
  const firstRow = Math.floor(top / cell);
  ctx.fillStyle = paper.mark;
  for (let row = firstRow; row * cell <= bottom; row++) {
    const y = (row * cell - top) * scale;
    if (board.background === "lines") {
      ctx.fillRect(0, y + (cell - 1) * scale, width, scale);
    } else if (board.background === "grid") {
      ctx.fillRect(0, y, width, scale);
      if (row === firstRow) for (let x = 0; x <= SHEET_WIDTH; x += cell) ctx.fillRect(x * scale, 0, scale, height);
    } else {
      for (let x = 0; x < SHEET_WIDTH; x += cell) {
        ctx.beginPath();
        ctx.arc((x + cell / 2) * scale, y + (cell / 2) * scale, 1.2 * scale, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

/**
 * Renders strips of the sheet. Items are drawn by an off-screen copy of the
 * board so the visible board does not change while exporting.
 */
async function renderStrips(board: Board, options: ExportOptions, stripHeight: number, count: number, scale: number) {
  const canvas = session.canvas;
  if (!canvas) throw new Error("No board is open.");
  const width = Math.round(SHEET_WIDTH * scale);
  const height = Math.round(stripHeight * scale);
  const renderer = new StaticCanvas(undefined, {
    width,
    height,
    renderOnAddRemove: false,
    enableRetinaScaling: false,
  });
  try {
    await renderer.loadFromJSON(canvas.toObject());
    const strips: HTMLCanvasElement[] = [];
    for (let i = 0; i < count; i++) {
      const top = i * stripHeight;
      renderer.setViewportTransform([scale, 0, 0, scale, 0, -top * scale]);
      renderer.renderAll();
      const strip = document.createElement("canvas");
      strip.width = width;
      strip.height = height;
      const ctx = strip.getContext("2d")!;
      drawPaper(ctx, board, options, top, scale);
      ctx.drawImage(renderer.getElement(), 0, 0);
      strips.push(strip);
    }
    return strips;
  } finally {
    void renderer.dispose();
  }
}

/** The open board as a PDF, cut into pages from the top of the sheet down. */
export async function exportPdf(board: Board, options: ExportOptions) {
  const size = PAGE_SIZES[options.pageSize];
  const pages = await renderStrips(
    board,
    options,
    pageHeight(options.pageSize),
    countPages(options.pageSize),
    EXPORT_SCALE,
  );
  const pdf = new jsPDF({ orientation: "portrait", unit: size.unit, format: [size.width, size.height], compress: true });
  pdf.setProperties({ title: board.title, creator: "StickyBoard" });
  pages.forEach((page, i) => {
    if (i > 0) pdf.addPage([size.width, size.height], "portrait");
    pdf.addImage(page.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, size.width, size.height);
  });
  return { bytes: new Uint8Array(pdf.output("arraybuffer")), pages: pages.length };
}

/** The open board as one tall PNG, from the top of the sheet to the last item. */
export async function exportPng(board: Board, options: ExportOptions) {
  const objects = session.canvas?.getObjects() ?? [];
  const height = Math.max(contentBottom(objects), 200) + PNG_BOTTOM_MARGIN;
  // Very long boards are exported at a lower resolution to stay within limits.
  const scale = Math.min(EXPORT_SCALE, MAX_IMAGE_HEIGHT / height);
  const [image] = await renderStrips(board, options, height, 1, scale);
  const blob = await new Promise<Blob>((resolve, reject) =>
    image.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not create the image."))), "image/png"),
  );
  return new Uint8Array(await blob.arrayBuffer());
}
