import { isTauri } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { readFile, writeFile } from "@tauri-apps/plugin-fs";

export interface FileType {
  name: string;
  extension: string;
  mimeType: string;
}

export const PDF: FileType = { name: "PDF document", extension: "pdf", mimeType: "application/pdf" };
export const PNG: FileType = { name: "PNG image", extension: "png", mimeType: "image/png" };
export const BACKUP: FileType = { name: "StickyBoard backup", extension: "json", mimeType: "application/json" };

/** Makes a board title safe to use as a Windows file name. */
export function fileName(title: string, type: FileType) {
  const safe = title.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "").trim().slice(0, 80) || "Board";
  return `${safe}.${type.extension}`;
}

/**
 * Asks where to save with the system Save dialog, then writes the file.
 * Returns where it was saved, or null if the user cancelled.
 */
export async function saveFile(bytes: Uint8Array, suggestedName: string, type: FileType) {
  if (isTauri()) {
    const path = await save({
      defaultPath: suggestedName,
      filters: [{ name: type.name, extensions: [type.extension] }],
    });
    if (!path) return null;
    await writeFile(path, bytes);
    return path;
  }
  // Browser preview: an ordinary download.
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: type.mimeType }));
  const link = document.createElement("a");
  link.href = url;
  link.download = suggestedName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return suggestedName;
}

/** Asks for a file with the system Open dialog. Returns null if cancelled. */
export async function openFile(type: FileType): Promise<Uint8Array | null> {
  if (isTauri()) {
    const path = await open({
      multiple: false,
      directory: false,
      filters: [{ name: type.name, extensions: [type.extension] }],
    });
    if (!path) return null;
    return readFile(path);
  }
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = `.${type.extension},${type.mimeType}`;
    input.onchange = async () => {
      const file = input.files?.[0];
      resolve(file ? new Uint8Array(await file.arrayBuffer()) : null);
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}
