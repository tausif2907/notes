import { StaticCanvas } from "fabric";

const WIDTH = 320;
const HEIGHT = 200;
const MARGIN = 16;

/**
 * Draws a board's content, fitted to a small card, as a JPEG data URL.
 * Rendered off-screen so the visible board does not flicker.
 */
export async function renderThumbnail(json: object, paper: string): Promise<string | undefined> {
  const canvas = new StaticCanvas(undefined, {
    width: WIDTH,
    height: HEIGHT,
    renderOnAddRemove: false,
    enableRetinaScaling: false,
  });
  try {
    await canvas.loadFromJSON(json);
    const objects = canvas.getObjects();
    if (objects.length === 0) return undefined;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const obj of objects) {
      const r = obj.getBoundingRect();
      minX = Math.min(minX, r.left);
      minY = Math.min(minY, r.top);
      maxX = Math.max(maxX, r.left + r.width);
      maxY = Math.max(maxY, r.top + r.height);
    }
    const scale = Math.min((WIDTH - 2 * MARGIN) / (maxX - minX), (HEIGHT - 2 * MARGIN) / (maxY - minY), 1);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    canvas.setViewportTransform([scale, 0, 0, scale, WIDTH / 2 - cx * scale, HEIGHT / 2 - cy * scale]);
    canvas.backgroundColor = paper;
    canvas.renderAll();
    return canvas.toDataURL({ format: "jpeg", quality: 0.8, multiplier: 1 });
  } finally {
    void canvas.dispose();
  }
}
