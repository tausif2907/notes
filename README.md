# StickyBoard

A Windows desktop app for free-form sticky-note boards: write anywhere, paste images,
highlight text, add text boxes and speech bubbles, save boards locally and export them as PDF.

Built with Tauri 2, React, TypeScript and Fabric.js.

## Prerequisites (Windows)

- [Node.js](https://nodejs.org/) 20+
- [Rust](https://www.rust-lang.org/tools/install) (`rustup`, MSVC toolchain)
- Visual Studio 2022 Build Tools with the **Desktop development with C++** workload
- WebView2 runtime (preinstalled on Windows 11)

## Development

```bash
npm install
npm run tauri dev      # desktop app with hot reload
npm run dev            # frontend only, in the browser at http://localhost:1420
npm run tauri build    # installer in src-tauri/target/release/bundle
```

## Controls

| Action | How |
|---|---|
| Pan | Scroll wheel, hold Space and drag, middle-mouse drag, or the Pan tool (H) |
| Zoom | Ctrl + scroll, Ctrl +/-, or the zoom buttons |
| Reset view | Ctrl 0 |
| Select tool | V |
| Add text | Text tool (T) then click, or double-click empty board |
| Sticky note / text box / speech bubble | S / B / U then click |
| Point a speech bubble | Select it and drag the blue dot at the tail's tip |
| Highlight or style words | Select words while typing, then use the style panel |
| Bold / italic / underline | Ctrl B / Ctrl I / Ctrl U |
| Board pattern and paper colour | Background button in the header |
| Add images | Ctrl V (e.g. a Win+Shift+S screenshot), drag files onto the board, or the Image tool (I) |
| Crop an image | Double-click it (or "Crop image" in the panel), drag the black handles, Enter to keep, Esc to cancel |
| Paste text | Ctrl V on the board creates a text item |
| Rename a board | Click its title in the header, double-click it in the sidebar, or use its ⋯ menu |
| Duplicate / delete a board | ⋯ menu next to the board in the sidebar or on All boards |
| Find a board | All boards → search |

Boards save automatically to this computer (IndexedDB in the app's WebView2 profile)
about half a second after each change, while you type, and before the window closes.
| Finish editing / deselect | Esc |
| Delete | Delete or Backspace |
| Duplicate / select all | Ctrl D / Ctrl A |
| Undo / redo | Ctrl Z / Ctrl Y (or Ctrl Shift Z) |

## Roadmap

1. **Phase 0, setup:** project scaffold, app shell, zoomable/pannable canvas ✅
2. **Phase 1, core canvas:** text anywhere, select/move/resize/delete, undo/redo ✅
3. **Phase 2, styling:** sticky notes, text boxes, bubbles, highlighting, colours, backgrounds ✅
4. **Phase 3, images:** paste, drag and drop, crop, corners, shadows ✅
5. **Phase 4, saving:** autosave to local database, board list with thumbnails ✅
6. **Phase 5, export:** PDF/PNG via native Save dialog, backup and restore
7. **Phase 6, extras:** pen/highlighter, stickers, templates, dark mode, installer polish

## Project layout

```
src/
  canvas/       Fabric canvas view and viewport (pan/zoom) controls
  components/   Sidebar, toolbar, zoom controls
  store/        Zustand app state
  db/           Dexie (IndexedDB) schema
  types/        Board / item data model
src-tauri/      Rust host for the desktop app
```
