# StickyBoard

A Windows desktop app for free-form sticky-note boards: write anywhere on a long sheet,
paste images, highlight text, add sticky notes, text boxes, speech bubbles, stickers and
drawings, save boards locally and export them as PDF or PNG.

Built with Tauri 2, React, TypeScript and Fabric.js.

## Install

Run `StickyBoard_1.0.0_x64-setup.exe` (built into `src-tauri/target/release/bundle/nsis/`).
It installs for the current Windows user and needs no administrator rights.

The installed app keeps its boards separately from the development version
(`npm run tauri dev`). To move boards across, use **Back up all boards** in one and
**Restore from backup** in the other.

## Prerequisites for development (Windows)

- [Node.js](https://nodejs.org/) 20+
- [Rust](https://www.rust-lang.org/tools/install) (`rustup`, MSVC toolchain)
- Visual Studio 2022 Build Tools with the C++ compiler (MSVC) and a Windows SDK
- WebView2 runtime (preinstalled on Windows 11)

## Development

```bash
npm install
npm run tauri dev      # desktop app with hot reload
npm run dev            # frontend only, in the browser at http://localhost:1420
npm run tauri build    # installer in src-tauri/target/release/bundle/nsis
```

The app icon is generated from `src-tauri/app-icon.svg` with `npx tauri icon src-tauri/app-icon.svg`.

## Controls

| Action | How |
|---|---|
| Scroll / pan | Scroll wheel, hold Space and drag, middle-mouse drag, or the Pan tool (H) |
| Zoom | Ctrl + scroll, Ctrl +/-, or the zoom buttons |
| Reset view | Ctrl 0 |
| Select tool | V |
| Add text | Text tool (T) then click, or double-click empty board |
| Sticky note / text box / speech bubble | S / B / U then click |
| Point a speech bubble | Select it and drag the blue dot at the tail's tip |
| Highlight or style words | Select words while typing, then use the style panel |
| Bold / italic / underline | Ctrl B / Ctrl I / Ctrl U |
| Draw / highlight freehand | Pen (P) or Highlighter (M); colour and thickness in the style panel; Esc to stop |
| Stickers | Smiley button at the end of the toolbar |
| Board pattern and paper colour | Background button in the header |
| Add images | Ctrl V (e.g. a Win+Shift+S screenshot), drag files onto the board, or the Image tool (I) |
| Crop an image | Double-click it (or "Crop image" in the panel), drag the black handles, Enter to keep, Esc to cancel |
| Paste text | Ctrl V on the board creates a text item |
| Finish editing / deselect | Esc |
| Delete | Delete or Backspace |
| Duplicate / select all | Ctrl D / Ctrl A |
| Undo / redo | Ctrl Z / Ctrl Y (or Ctrl Shift Z) |
| New board | New board → pick blank or a template |
| Rename a board | Click its title in the header, double-click it in the sidebar, or use its ⋯ menu |
| Duplicate / delete a board | ⋯ menu next to the board in the sidebar or on All boards |
| Find a board | All boards → search |
| Export | Export in the header → PDF (A4 or Letter pages) or one long PNG, saved with the Windows Save dialog |
| Back up / restore | Bottom of the sidebar; restoring adds the boards next to your existing ones |
| Light / dark | Switch at the bottom of the sidebar (or match Windows) |
| More room for the board | Hide the style panel with the button left of the zoom controls |

Each board is one long sheet: a fixed width with top, left and right edges, and no end
at the bottom. Faint lines on the sheet show where A4 pages break in a PDF.

Boards save automatically to this computer (IndexedDB in the app's WebView2 profile)
about half a second after each change, while you type, and before the window closes.

## Roadmap

1. **Phase 0, setup:** project scaffold, app shell, zoomable/pannable canvas ✅
2. **Phase 1, core canvas:** text anywhere, select/move/resize/delete, undo/redo ✅
3. **Phase 2, styling:** sticky notes, text boxes, bubbles, highlighting, colours, backgrounds ✅
4. **Phase 3, images:** paste, drag and drop, crop, corners, shadows ✅
5. **Phase 4, saving:** autosave to local database, board list with thumbnails ✅
6. **Phase 5, export:** PDF/PNG via native Save dialog, backup and restore ✅
7. **Phase 6, extras:** pen/highlighter, stickers, templates, dark mode, installer ✅

## Project layout

```
src/
  canvas/       Fabric board: viewport and sheet, editor, notes, images, crop,
                undo history, autosave, thumbnails, export
  components/   Sidebar, toolbar, style panel, dialogs, home screen
  db/           Dexie (IndexedDB) schema, saving, backup and restore
  platform/     Native Save/Open dialogs (browser download fallback)
  store/        Zustand app state
  templates.ts  New-board templates
  theme.ts      Palettes, fonts, stickers
src-tauri/      Rust host for the desktop app, icons and installer settings
```
