import { Control, FabricImage, Point, util, type TransformActionHandler } from "fabric";
import { NoteImage } from "./noteImage";
import { session } from "./session";

/** Smallest crop, in source-image pixels. */
const MIN_CROP = 20;
const HANDLE = "#1f1f1f";

type Edge = "left" | "right" | "top" | "bottom";

interface CropState {
  image: NoteImage;
  /** Faded copy of the whole image so you can see what is being cut off. */
  ghost: FabricImage;
  original: Pick<NoteImage, "cropX" | "cropY" | "width" | "height" | "left" | "top">;
  controls: NoteImage["controls"];
  lockMovementX: boolean;
  lockMovementY: boolean;
}

let crop: CropState | null = null;
const listeners = new Set<() => void>();

export const isCropping = () => crop !== null;
export const croppingImage = () => crop?.image ?? null;

export function onCropChange(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/**
 * Moves the given edges of the visible area to positions in the image's own
 * coordinates (unscaled, relative to its centre), keeping the opposite edges
 * fixed on the board.
 */
function moveEdges(image: NoteImage, edges: Partial<Record<Edge, number>>) {
  const { width: w, height: h, cropX, cropY } = image;
  const natural = image.getOriginalSize();
  let left = -w / 2;
  let right = w / 2;
  let top = -h / 2;
  let bottom = h / 2;
  if (edges.left !== undefined) left = clamp(edges.left, -w / 2 - cropX, right - MIN_CROP);
  if (edges.right !== undefined) right = clamp(edges.right, left + MIN_CROP, w / 2 + natural.width - cropX - w);
  if (edges.top !== undefined) top = clamp(edges.top, -h / 2 - cropY, bottom - MIN_CROP);
  if (edges.bottom !== undefined) bottom = clamp(edges.bottom, top + MIN_CROP, h / 2 + natural.height - cropY - h);

  const topLeft = new Point(left, top).transform(image.calcTransformMatrix());
  image.set({
    cropX: cropX + left + w / 2,
    cropY: cropY + top + h / 2,
    width: right - left,
    height: bottom - top,
  });
  image.setPositionByOrigin(topLeft, "left", "top");
  image.setCoords();
}

/** Lines the faded full image up behind the cropped one. */
function placeGhost(state: CropState) {
  const { image, ghost } = state;
  const natural = image.getOriginalSize();
  const corner = new Point(-image.width / 2 - image.cropX, -image.height / 2 - image.cropY).transform(
    image.calcTransformMatrix(),
  );
  ghost.set({
    cropX: 0,
    cropY: 0,
    width: natural.width,
    height: natural.height,
    scaleX: image.scaleX,
    scaleY: image.scaleY,
    angle: image.angle,
    flipX: image.flipX,
    flipY: image.flipY,
  });
  ghost.setPositionByOrigin(corner, "left", "top");
  ghost.setCoords();
}

function cropControl(x: number, y: number, edges: Edge[]): Control {
  const actionHandler: TransformActionHandler = (_e, transform, px, py) => {
    const image = transform.target as NoteImage;
    const local = new Point(px, py).transform(util.invertTransform(image.calcTransformMatrix()));
    const target: Partial<Record<Edge, number>> = {};
    for (const edge of edges) target[edge] = edge === "left" || edge === "right" ? local.x : local.y;
    moveEdges(image, target);
    if (crop) placeGhost(crop);
    return true;
  };
  const corner = edges.length === 2;
  return new Control({
    x,
    y,
    actionName: "crop",
    cursorStyle: corner ? (x * y > 0 ? "nwse-resize" : "nesw-resize") : x === 0 ? "ns-resize" : "ew-resize",
    sizeX: corner ? 24 : 28,
    sizeY: corner ? 24 : 28,
    actionHandler,
    render: (ctx, left, top, _style, obj) => {
      // Corner brackets and edge bars, rotated with the image.
      ctx.save();
      ctx.translate(left, top);
      ctx.rotate(util.degreesToRadians(obj.angle));
      ctx.lineCap = "square";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 6;
      const draw = () => {
        ctx.beginPath();
        if (corner) {
          const sx = x < 0 ? 1 : -1;
          const sy = y < 0 ? 1 : -1;
          ctx.moveTo(0, sy * 14);
          ctx.lineTo(0, 0);
          ctx.lineTo(sx * 14, 0);
        } else if (x === 0) {
          ctx.moveTo(-10, 0);
          ctx.lineTo(10, 0);
        } else {
          ctx.moveTo(0, -10);
          ctx.lineTo(0, 10);
        }
        ctx.stroke();
      };
      draw();
      ctx.strokeStyle = HANDLE;
      ctx.lineWidth = 3;
      draw();
      ctx.restore();
    },
  });
}

const createCropControls = () => ({
  cropTL: cropControl(-0.5, -0.5, ["left", "top"]),
  cropTR: cropControl(0.5, -0.5, ["right", "top"]),
  cropBL: cropControl(-0.5, 0.5, ["left", "bottom"]),
  cropBR: cropControl(0.5, 0.5, ["right", "bottom"]),
  cropT: cropControl(0, -0.5, ["top"]),
  cropB: cropControl(0, 0.5, ["bottom"]),
  cropL: cropControl(-0.5, 0, ["left"]),
  cropR: cropControl(0.5, 0, ["right"]),
});

export function startCrop(image: NoteImage) {
  const canvas = session.canvas;
  if (!canvas || crop) return;
  const ghost = new FabricImage(image.getElement() as HTMLImageElement, {
    opacity: 0.35,
    selectable: false,
    evented: false,
    excludeFromExport: true,
    objectCaching: false,
  });
  crop = {
    image,
    ghost,
    original: {
      cropX: image.cropX,
      cropY: image.cropY,
      width: image.width,
      height: image.height,
      left: image.left,
      top: image.top,
    },
    controls: image.controls,
    lockMovementX: image.lockMovementX,
    lockMovementY: image.lockMovementY,
  };
  placeGhost(crop);
  canvas.insertAt(canvas.getObjects().indexOf(image), ghost);
  image.controls = createCropControls();
  image.set({ lockMovementX: true, lockMovementY: true, hasBorders: true });
  canvas.setActiveObject(image);
  image.setCoords();
  canvas.requestRenderAll();
  listeners.forEach((l) => l());
}

/** Leaves crop mode, keeping the new crop or restoring the original one. */
export function finishCrop(apply: boolean) {
  const canvas = session.canvas;
  if (!crop || !canvas) return;
  const { image, ghost, original, controls, lockMovementX, lockMovementY } = crop;
  crop = null;
  canvas.remove(ghost);
  image.controls = controls;
  image.set({ lockMovementX, lockMovementY });
  if (!apply) image.set(original);
  image.setCoords();
  canvas.requestRenderAll();
  session.history?.record();
  listeners.forEach((l) => l());
}
