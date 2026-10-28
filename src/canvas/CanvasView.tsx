import { useEffect, useRef } from "react";
import { Canvas } from "fabric";
import { useAppStore } from "../store/appStore";
import { PAPERS } from "../theme";
import { attachEditor } from "./editor";
import { SHEET_WIDTH, pageHeight } from "./sheet";
import { attachViewport, viewportResized } from "./viewport";

export function CanvasView() {
  const hostRef = useRef<HTMLDivElement>(null);
  const background = useAppStore((s) => s.boards.find((b) => b.id === s.activeBoardId)?.background);
  const paper = useAppStore((s) => s.boards.find((b) => b.id === s.activeBoardId)?.paper);
  const { color, mark } = PAPERS[paper ?? "warm"];

  useEffect(() => {
    const host = hostRef.current!;
    // Fabric wraps the <canvas> in its own elements, so it is created here
    // rather than rendered by React.
    const el = document.createElement("canvas");
    host.appendChild(el);

    const canvas = new Canvas(el, {
      preserveObjectStacking: true,
      fireMiddleClick: true,
      selectionColor: "rgba(99, 102, 241, 0.08)",
      selectionBorderColor: "#6366f1",
    });

    const resize = () => {
      canvas.setDimensions({ width: host.clientWidth, height: host.clientHeight });
      viewportResized();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);

    const detachViewport = attachViewport(canvas, host);
    const detachEditor = attachEditor(canvas, host);

    return () => {
      observer.disconnect();
      detachEditor();
      detachViewport();
      void canvas.dispose().then(() => el.remove());
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className="canvas-host"
      data-pattern={background ?? "dots"}
      style={
        {
          "--paper": color,
          "--mark": mark,
          "--sheet-width": `${SHEET_WIDTH}px`,
          "--page-height": `${pageHeight("a4")}px`,
        } as React.CSSProperties
      }
    >
      {/* The paper behind the canvas; Fabric's canvas is added after it. */}
      <div className="sheet" />
    </div>
  );
}
