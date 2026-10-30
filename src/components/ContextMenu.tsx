import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Point } from "fabric";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDownToLine,
  ArrowUpToLine,
  Captions,
  ChevronRight,
  ClipboardPaste,
  Copy,
  CopyPlus,
  Crop,
  Scissors,
  SquareDashed,
  TextSelect,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import {
  addCaption,
  alignSelection,
  copyFromMenu,
  cropSelection,
  deleteSelection,
  duplicateSelection,
  pasteAt,
  pasteIntoText,
  selectAll,
  selectAllText,
} from "../canvas/editor";
import { NoteImage } from "../canvas/noteImage";
import { NoteText } from "../canvas/noteText";
import { session } from "../canvas/session";
import { bringToFront, sendToBack } from "../canvas/styling";
import { useAppStore, type ContextMenuRequest } from "../store/appStore";

/** Gap kept between the menu and the window's edges. */
const EDGE = 8;

function Item({
  icon: Icon,
  label,
  shortcut,
  danger,
  onSelect,
  children,
}: {
  icon: LucideIcon;
  label: string;
  shortcut?: string;
  danger?: boolean;
  onSelect?: () => void;
  /** A submenu, shown beside the item on hover. */
  children?: ReactNode;
}) {
  const closeContextMenu = useAppStore((s) => s.closeContextMenu);
  return (
    <div className={`context-item-wrap${children ? " has-submenu" : ""}`}>
      <button
        className={`context-item${danger ? " danger" : ""}`}
        role="menuitem"
        aria-haspopup={children ? "menu" : undefined}
        onClick={() => {
          if (!onSelect) return;
          closeContextMenu();
          onSelect();
        }}
      >
        <span className="context-label">{label}</span>
        {shortcut && <kbd>{shortcut}</kbd>}
        {children ? <ChevronRight size={15} /> : <Icon size={16} />}
      </button>
      {children && (
        <div className="context-menu submenu" role="menu">
          {children}
        </div>
      )}
    </div>
  );
}

const Separator = () => <div className="context-separator" role="separator" />;

function ItemsMenu({ at }: { at: Point }) {
  const objects = session.canvas?.getActiveObjects() ?? [];
  const onlyText = objects.length > 0 && objects.every((o) => o instanceof NoteText);
  const image = objects.length === 1 && objects[0] instanceof NoteImage;
  const place = onlyText ? "Text" : "On page";
  return (
    <>
      <Item icon={Scissors} label="Cut" shortcut="Ctrl+X" onSelect={() => copyFromMenu(true)} />
      <Item icon={Copy} label="Copy" shortcut="Ctrl+C" onSelect={() => copyFromMenu()} />
      <Item icon={ClipboardPaste} label="Paste" shortcut="Ctrl+V" onSelect={() => void pasteAt(at)} />
      <Item icon={CopyPlus} label="Duplicate" shortcut="Ctrl+D" onSelect={() => void duplicateSelection()} />
      <Separator />
      <Item icon={AlignLeft} label="Align">
        <Item icon={AlignLeft} label={`${place}: left`} onSelect={() => alignSelection("left")} />
        <Item icon={AlignCenter} label={`${place}: centre`} onSelect={() => alignSelection("center")} />
        <Item icon={AlignRight} label={`${place}: right`} onSelect={() => alignSelection("right")} />
      </Item>
      {image && <Item icon={Captions} label="Caption" onSelect={addCaption} />}
      {image && <Item icon={Crop} label="Crop" onSelect={cropSelection} />}
      <Item icon={ArrowUpToLine} label="Bring to front" onSelect={bringToFront} />
      <Item icon={ArrowDownToLine} label="Send to back" onSelect={sendToBack} />
      <Separator />
      <Item icon={Trash2} label="Delete" shortcut="Del" danger onSelect={deleteSelection} />
    </>
  );
}

function TypingMenu() {
  return (
    <>
      <Item icon={Scissors} label="Cut" shortcut="Ctrl+X" onSelect={() => document.execCommand("cut")} />
      <Item icon={Copy} label="Copy" shortcut="Ctrl+C" onSelect={() => document.execCommand("copy")} />
      <Item icon={ClipboardPaste} label="Paste" shortcut="Ctrl+V" onSelect={() => void pasteIntoText()} />
      <Separator />
      <Item icon={TextSelect} label="Select all" shortcut="Ctrl+A" onSelect={selectAllText} />
    </>
  );
}

function BoardMenu({ at }: { at: Point }) {
  return (
    <>
      <Item icon={ClipboardPaste} label="Paste here" shortcut="Ctrl+V" onSelect={() => void pasteAt(at)} />
      <Item icon={SquareDashed} label="Select all" shortcut="Ctrl+A" onSelect={selectAll} />
    </>
  );
}

/** The right-click menu on the board. */
export function ContextMenu() {
  const menu = useAppStore((s) => s.contextMenu);
  return menu ? <OpenMenu key={`${menu.x},${menu.y},${menu.kind}`} menu={menu} /> : null;
}

function OpenMenu({ menu }: { menu: ContextMenuRequest }) {
  const closeContextMenu = useAppStore((s) => s.closeContextMenu);
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: menu.x, top: menu.y, flipSubmenus: false });

  // Keep the menu on screen, opening up or left of the pointer if needed.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const left = menu.x + width + EDGE > window.innerWidth ? Math.max(EDGE, menu.x - width) : menu.x;
    const top = menu.y + height + EDGE > window.innerHeight ? Math.max(EDGE, window.innerHeight - height - EDGE) : menu.y;
    setPosition({ left, top, flipSubmenus: left + 2 * width + EDGE > window.innerWidth });
  }, [menu]);

  useLayoutEffect(() => {
    const close = () => closeContextMenu();
    const onPointerDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      close();
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("wheel", close, true);
    window.addEventListener("resize", close);
    window.addEventListener("blur", close);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("wheel", close, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("blur", close);
    };
  }, [closeContextMenu]);

  const at = new Point(menu.at.x, menu.at.y);
  return (
    <div
      ref={ref}
      className={`context-menu${position.flipSubmenus ? " flip-submenus" : ""}`}
      role="menu"
      style={{ left: position.left, top: position.top }}
      // Keeps the text cursor in a note while its menu is used.
      onMouseDown={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {menu.kind === "items" && <ItemsMenu at={at} />}
      {menu.kind === "typing" && <TypingMenu />}
      {menu.kind === "board" && <BoardMenu at={at} />}
    </div>
  );
}
