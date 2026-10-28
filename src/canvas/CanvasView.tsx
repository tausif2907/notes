import { useEffect, useRef } from "react";
import { Canvas } from "fabric";
import { attachViewport } from "./viewport";

export function CanvasView() {
  const hostRef = useRef<HTMLDivElement>(null);

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

    const resize = () =>
      canvas.setDimensions({ width: host.clientWidth, height: host.clientHeight });
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);

    const detach = attachViewport(canvas, host);

    return () => {
      observer.disconnect();
      detach();
      void canvas.dispose().then(() => el.remove());
    };
  }, []);

  return <div ref={hostRef} className="canvas-host" />;
}
