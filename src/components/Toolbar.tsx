import {
  Eraser,
  Highlighter,
  Image,
  MessageCircle,
  MousePointer2,
  PenLine,
  RectangleHorizontal,
  StickyNote,
  Type,
  type LucideIcon,
} from "lucide-react";
import { useAppStore, type Tool } from "../store/appStore";
import { StickerPicker } from "./StickerPicker";

interface ToolDef {
  id: Tool;
  label: string;
  shortcut: string;
  icon: LucideIcon;
}

const TOOLS: ToolDef[] = [
  { id: "select", label: "Select", shortcut: "V", icon: MousePointer2 },
  { id: "text", label: "Text", shortcut: "T", icon: Type },
  { id: "sticky", label: "Sticky note", shortcut: "S", icon: StickyNote },
  { id: "textbox", label: "Text box", shortcut: "B", icon: RectangleHorizontal },
  { id: "bubble", label: "Speech bubble", shortcut: "U", icon: MessageCircle },
  { id: "image", label: "Image", shortcut: "I", icon: Image },
  { id: "pen", label: "Pen", shortcut: "P", icon: PenLine },
  { id: "highlighter", label: "Highlighter", shortcut: "M", icon: Highlighter },
  { id: "eraser", label: "Eraser", shortcut: "E", icon: Eraser },
];

/** Groups get a divider before them: select, add items, draw. */
const DIVIDER_BEFORE = new Set<Tool>(["text", "pen"]);

export const TOOL_SHORTCUTS = Object.fromEntries(
  TOOLS.map((t) => [t.shortcut.toLowerCase(), t.id]),
) as Record<string, Tool>;

export function Toolbar() {
  const tool = useAppStore((s) => s.tool);
  const setTool = useAppStore((s) => s.setTool);

  return (
    <div className="toolbar" role="toolbar" aria-label="Tools">
      {TOOLS.map(({ id, label, shortcut, icon: Icon }) => (
        <span key={id} className="toolbar-slot">
          {DIVIDER_BEFORE.has(id) && <span className="toolbar-divider" />}
          <button
            className={`tool-button${tool === id ? " active" : ""}`}
            title={`${label} (${shortcut})`}
            aria-label={label}
            aria-pressed={tool === id}
            onClick={() => setTool(id)}
          >
            <Icon size={18} strokeWidth={1.8} />
          </button>
        </span>
      ))}
      <StickerPicker />
    </div>
  );
}
