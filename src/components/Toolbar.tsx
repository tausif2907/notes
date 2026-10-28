import {
  Hand,
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

interface ToolDef {
  id: Tool;
  label: string;
  shortcut: string;
  icon: LucideIcon;
  /** Phase in which the tool gets wired up; undefined means it works now. */
  comingIn?: number;
}

const TOOLS: ToolDef[] = [
  { id: "select", label: "Select", shortcut: "V", icon: MousePointer2 },
  { id: "hand", label: "Pan", shortcut: "H", icon: Hand },
  { id: "text", label: "Text", shortcut: "T", icon: Type },
  { id: "sticky", label: "Sticky note", shortcut: "S", icon: StickyNote },
  { id: "textbox", label: "Text box", shortcut: "B", icon: RectangleHorizontal },
  { id: "bubble", label: "Speech bubble", shortcut: "U", icon: MessageCircle },
  { id: "image", label: "Image", shortcut: "I", icon: Image },
  { id: "pen", label: "Pen", shortcut: "P", icon: PenLine, comingIn: 6 },
  { id: "highlighter", label: "Highlighter", shortcut: "M", icon: Highlighter, comingIn: 6 },
];

export const TOOL_SHORTCUTS = Object.fromEntries(
  TOOLS.filter((t) => !t.comingIn).map((t) => [t.shortcut.toLowerCase(), t.id]),
) as Record<string, Tool>;

export function Toolbar() {
  const tool = useAppStore((s) => s.tool);
  const setTool = useAppStore((s) => s.setTool);

  return (
    <div className="toolbar" role="toolbar" aria-label="Tools">
      {TOOLS.map(({ id, label, shortcut, icon: Icon, comingIn }, i) => (
        <span key={id} className="toolbar-slot">
          {i === 2 && <span className="toolbar-divider" />}
          <button
            className={`tool-button${tool === id ? " active" : ""}`}
            title={comingIn ? `${label} (coming in Phase ${comingIn})` : `${label} (${shortcut})`}
            aria-label={label}
            aria-pressed={tool === id}
            disabled={comingIn !== undefined}
            onClick={() => setTool(id)}
          >
            <Icon size={18} strokeWidth={1.8} />
          </button>
        </span>
      ))}
    </div>
  );
}
