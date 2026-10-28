import { FabricImage, classRegistry, type ImageProps } from "fabric";

export interface ImageStyleProps {
  /** Id of the image file in the asset store. */
  assetId: string;
  /** Corner radius in board units, independent of the image's scale. */
  cornerRadius: number;
  imageShadow: boolean;
  frameColor: string;
  /** Border width in board units; 0 means no border. */
  frameWidth: number;
}

const IMAGE_STYLE_PROPERTIES: (keyof ImageStyleProps)[] = [
  "assetId",
  "cornerRadius",
  "imageShadow",
  "frameColor",
  "frameWidth",
];

const IMAGE_DEFAULTS: Partial<ImageProps & ImageStyleProps> = {
  assetId: "",
  cornerRadius: 0,
  imageShadow: false,
  frameColor: "",
  frameWidth: 0,
  originX: "left",
  originY: "top",
  // Shadows and borders paint outside the image, which a cache would clip.
  objectCaching: false,
};

/** An image on the board, with optional rounded corners, shadow and border. */
export class NoteImage extends FabricImage {
  static type = "NoteImage";
  static customProperties = IMAGE_STYLE_PROPERTIES;

  declare assetId: string;
  declare cornerRadius: number;
  declare imageShadow: boolean;
  declare frameColor: string;
  declare frameWidth: number;

  constructor(element: HTMLImageElement, options: Partial<ImageProps & ImageStyleProps> = {}) {
    super(element, { ...IMAGE_DEFAULTS, ...options });
    // Photos only scale from the corners so they never get stretched.
    this.setControlsVisibility({ ml: false, mr: false, mt: false, mb: false });
  }

  _render(ctx: CanvasRenderingContext2D) {
    const w = this.width;
    const h = this.height;
    // Styles are in board units; the context is already scaled by the image.
    const unit = 1 / this.scaleX;
    const radius = Math.min(this.cornerRadius * unit, w / 2, h / 2);
    const shape = () => {
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, radius);
    };

    ctx.save();
    if (this.imageShadow) {
      // Shadow sizes are in screen pixels, so scale them with zoom.
      const zoom = this.canvas?.getZoom() ?? 1;
      ctx.shadowColor = "rgba(30, 25, 15, 0.3)";
      ctx.shadowBlur = 18 * zoom;
      ctx.shadowOffsetY = 8 * zoom;
      ctx.fillStyle = "#ffffff";
      shape();
      ctx.fill();
      ctx.shadowColor = "transparent";
    }
    if (this.frameColor && this.frameWidth > 0) {
      // Double-width stroke; the image covers the inner half.
      ctx.lineWidth = this.frameWidth * unit * 2;
      ctx.strokeStyle = this.frameColor;
      shape();
      ctx.stroke();
    }
    shape();
    ctx.clip();
    super._render(ctx);
    ctx.restore();
  }
}

classRegistry.setClass(NoteImage);
