// Shared palettes and fonts for board items and backgrounds.

export const INK = "#2b2a27";

export const FONTS = [
  { id: "sans", label: "Sans", family: '"Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif' },
  { id: "hand", label: "Handwriting", family: '"Segoe Print", "Comic Sans MS", cursive' },
  { id: "marker", label: "Marker", family: '"Ink Free", "Segoe Print", cursive' },
  { id: "serif", label: "Serif", family: 'Georgia, "Times New Roman", serif' },
  { id: "mono", label: "Mono", family: '"Cascadia Code", Consolas, monospace' },
] as const;

export const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 64, 80];

export const TEXT_COLORS = [
  INK, "#6b7280", "#dc2626", "#ea580c", "#16a34a", "#2563eb", "#7c3aed", "#db2777", "#ffffff",
];

/** Marker-pen highlight colours; "" removes the highlight. */
export const HIGHLIGHTS = ["", "#fff176", "#b9f6ca", "#ffccbc", "#f8bbd0", "#b3e5fc", "#e1bee7"];

export const PEN_COLORS = TEXT_COLORS.slice(0, 8);

export const PEN_SIZES = [
  { label: "Fine", value: 2 },
  { label: "Medium", value: 4 },
  { label: "Bold", value: 8 },
];

export const HIGHLIGHTER_COLORS = HIGHLIGHTS.filter(Boolean);

export const HIGHLIGHTER_SIZES = [
  { label: "Thin", value: 12 },
  { label: "Medium", value: 20 },
  { label: "Wide", value: 32 },
];

export const CARD_FILLS = [
  "#fff1a8", "#ffd6a5", "#ffc8dd", "#cdeac0", "#bde0fe", "#e2cfff", "#ffffff", "#f1f0ec",
];

/** Border colours; "" means no border. */
export const BORDER_COLORS = ["", INK, "#6b7280", "#dc2626", "#2563eb", "#16a34a", "#7c3aed"];

export const BORDER_WIDTHS = [
  { label: "Thin", value: 1 },
  { label: "Medium", value: 2 },
  { label: "Thick", value: 4 },
];

export const CORNERS = [
  { label: "Square", value: 2 },
  { label: "Rounded", value: 12 },
  { label: "Round", value: 28 },
];

export const IMAGE_CORNERS = [
  { label: "Square", value: 0 },
  { label: "Rounded", value: 16 },
  { label: "Round", value: 40 },
];

export const EMOJI_FONT = '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';

export const EMOJI_STICKERS = [
  "⭐", "❤️", "✅", "❌", "⚠️", "💡", "📌", "📎", "🔥", "🎉",
  "👍", "👀", "😊", "😂", "😍", "🤔", "😴", "😎", "📅", "⏰",
  "📚", "✏️", "🎯", "🚀", "☕", "🌈", "✨", "🍀", "🎵", "🏆",
];

export const BADGE_STICKERS = [
  { text: "TO DO", fill: "#ffd6a5" },
  { text: "DONE", fill: "#cdeac0" },
  { text: "IMPORTANT", fill: "#ffc8dd" },
  { text: "IDEA", fill: "#fff1a8" },
  { text: "QUESTION", fill: "#bde0fe" },
  { text: "URGENT", fill: "#ff9e95" },
];

export const PAPERS = {
  warm: { label: "Warm", color: "#f6f5f2", mark: "#cfcbc2" },
  white: { label: "White", color: "#ffffff", mark: "#dcdcdc" },
  cool: { label: "Cool", color: "#f1f4f8", mark: "#c8d0db" },
  cream: { label: "Cream", color: "#fbf6e9", mark: "#e0d4b4" },
  mint: { label: "Mint", color: "#eef6f0", mark: "#c2d9c8" },
  blush: { label: "Blush", color: "#fbf0f0", mark: "#e6c9c9" },
} as const;
