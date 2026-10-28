import type { TextboxProps } from "fabric";
import { NOTE_PRESETS, NoteText, type CardProps, type NoteKind } from "./canvas/noteText";
import { FONTS, INK } from "./theme";
import type { BoardBackground, BoardPaper } from "./types/board";

export interface Template {
  id: string;
  name: string;
  description: string;
  background: BoardBackground;
  paper: BoardPaper;
  /** Serialised board items, laid out on the 1000-unit-wide sheet. */
  build: () => object[];
}

const HAND = FONTS[1].family;
const MARKER = FONTS[2].family;
const MUTED = "#6b7280";

function item(kind: NoteKind, text: string, props: Partial<TextboxProps & CardProps>) {
  return new NoteText(text, { ...NOTE_PRESETS[kind], ...props }).toObject();
}

const title = (text: string, props: Partial<TextboxProps & CardProps> = {}) =>
  item("text", text, { left: 60, top: 48, width: 880, fontSize: 44, fontWeight: "bold", fontFamily: HAND, ...props });

const card = (kind: NoteKind, text: string, left: number, top: number, width: number, height: number, props: Partial<TextboxProps & CardProps> = {}) =>
  item(kind, text, { left, top, width, minCardHeight: height, ...props });

export const TEMPLATES: Template[] = [
  {
    id: "blank",
    name: "Blank",
    description: "An empty sheet",
    background: "dots",
    paper: "warm",
    build: () => [],
  },
  {
    id: "todo",
    name: "To-do list",
    description: "Today, this week and later",
    background: "lines",
    paper: "cream",
    build: () => [
      title("My to-do list"),
      card("sticky", "Today\n☐ \n☐ \n☐ ", 60, 150, 260, 320, { cardFill: "#fff1a8" }),
      card("sticky", "This week\n☐ \n☐ \n☐ ", 370, 150, 260, 320, { cardFill: "#ffd6a5" }),
      card("sticky", "Later\n☐ \n☐ \n☐ ", 680, 150, 260, 320, { cardFill: "#cdeac0" }),
    ],
  },
  {
    id: "weekly",
    name: "Weekly planner",
    description: "A box for every day",
    background: "dots",
    paper: "white",
    build: () => {
      const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
      const cell = (i: number) => ({ left: 60 + (i % 3) * 300, top: 140 + Math.floor(i / 3) * 270 });
      return [
        title("This week"),
        ...days.map((day, i) =>
          card("box", `${day}\n`, cell(i).left, cell(i).top, 280, 240, { fontWeight: "normal" }),
        ),
        card("sticky", "Goals\n• ", cell(7).left, cell(7).top, 280, 240, { cardFill: "#bde0fe" }),
        card("sticky", "Notes\n", cell(8).left, cell(8).top, 280, 240, { cardFill: "#fff1a8" }),
      ];
    },
  },
  {
    id: "meeting",
    name: "Meeting notes",
    description: "Agenda, notes, actions, decisions",
    background: "lines",
    paper: "white",
    build: () => [
      title("Meeting notes", { fontFamily: FONTS[0].family, fontSize: 40 }),
      item("text", "Date:              Attendees:", { left: 60, top: 112, width: 880, fill: MUTED }),
      card("box", "Agenda\n1. \n2. \n3. ", 60, 170, 420, 280),
      card("box", "Notes\n", 520, 170, 420, 280),
      card("sticky", "Action items\n☐ \n☐ \n☐ ", 60, 490, 420, 260, { cardFill: "#ffd6a5", fontFamily: FONTS[0].family, fontSize: 20 }),
      item("bubble", "Decisions\n", { left: 520, top: 500, width: 420, minCardHeight: 180, tailX: -150, tailY: 150 }),
    ],
  },
  {
    id: "mood",
    name: "Mood board",
    description: "Colours, words and pictures",
    background: "plain",
    paper: "blush",
    build: () => [
      title("Mood board", { fontFamily: MARKER, fontSize: 52 }),
      item("text", "Paste or drop pictures anywhere on the sheet (Ctrl+V)", { left: 60, top: 120, width: 880, fill: MUTED, fontSize: 18 }),
      card("sticky", "Colours", 80, 190, 240, 240, { cardFill: "#ffc8dd", angle: -3 }),
      card("sticky", "Words", 390, 210, 240, 240, { cardFill: "#e2cfff", angle: 2 }),
      card("sticky", "Inspiration", 690, 190, 240, 240, { cardFill: "#bde0fe", angle: -2 }),
    ],
  },
  {
    id: "study",
    name: "Study notes",
    description: "Cornell layout: cues, notes, summary",
    background: "dots",
    paper: "cream",
    build: () => [
      title("Topic: ", { fontFamily: FONTS[0].family, fontSize: 36, fill: INK }),
      card("box", "Key questions\n", 60, 130, 280, 680, { cardStroke: MUTED }),
      card("box", "Notes\n", 370, 130, 570, 680, { cardStroke: MUTED }),
      card("box", "Summary\n", 60, 840, 880, 220, { cardStroke: MUTED, cardFill: "#fffbea" }),
    ],
  },
];

export const findTemplate = (id: string) => TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
