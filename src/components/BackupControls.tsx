import { useState } from "react";
import { ArchiveRestore, HardDriveDownload } from "lucide-react";
import { flushSave } from "../canvas/autosave";
import { createBackup, restoreBackup } from "../db/backup";
import { BACKUP, openFile, saveFile } from "../platform/files";
import { useAppStore } from "../store/appStore";
import { ThemeSwitch } from "./ThemeSwitch";

const today = () => new Date().toISOString().slice(0, 10);

/** Save every board to one file, or add the boards from such a file. */
export function BackupControls() {
  const showNotice = useAppStore((s) => s.showNotice);
  const addBoards = useAppStore((s) => s.addBoards);
  const [busy, setBusy] = useState(false);

  const run = (work: () => Promise<void>) => async () => {
    if (busy) return;
    setBusy(true);
    try {
      await work();
    } catch (err) {
      console.error(err);
      showNotice(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const backup = run(async () => {
    await flushSave();
    const { bytes, boards } = await createBackup();
    const path = await saveFile(bytes, `StickyBoard backup ${today()}.json`, BACKUP);
    if (path) showNotice(`Backed up ${boards} board${boards === 1 ? "" : "s"} to ${path}`);
  });

  const restore = run(async () => {
    const bytes = await openFile(BACKUP);
    if (!bytes) return;
    const boards = await restoreBackup(bytes);
    addBoards(boards);
    showNotice(
      boards.length === 0
        ? "That backup has no boards in it."
        : `Restored ${boards.length} board${boards.length === 1 ? "" : "s"}. Your existing boards were kept.`,
    );
  });

  return (
    <div className="backup-controls">
      <ThemeSwitch />
      <button className="nav-link" onClick={backup} disabled={busy} title="Save all boards to one file">
        <HardDriveDownload size={16} />
        Back up all boards
      </button>
      <button className="nav-link" onClick={restore} disabled={busy} title="Add the boards from a backup file">
        <ArchiveRestore size={16} />
        Restore from backup
      </button>
    </div>
  );
}
