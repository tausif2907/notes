import type { Canvas } from "fabric";

const MAX_STEPS = 100;

/**
 * Snapshot-based undo/redo. Each committed change stores the whole board as
 * JSON; identical consecutive snapshots are skipped, so it is safe to call
 * record() from several events that fire for the same change.
 */
export class History {
  private stack: string[] = [];
  private index = -1;
  private busy = false;
  /** True while a snapshot is being loaded; changes then must not be recorded. */
  restoring = false;
  /** Goes up by one each time a step is recorded. */
  version = 0;

  constructor(
    private canvas: Canvas,
    private onChange: (canUndo: boolean, canRedo: boolean) => void,
    /** Called when the board's content changes through an edit, undo or redo. */
    private onCommit: () => void = () => {},
  ) {}

  snapshot() {
    return JSON.stringify(this.canvas.toObject());
  }

  /** Starts a fresh history whose first entry is the current board. */
  reset() {
    this.stack = [this.snapshot()];
    this.index = 0;
    this.notify();
  }

  record() {
    if (this.restoring) return;
    const json = this.snapshot();
    if (json === this.stack[this.index]) return;
    this.stack = this.stack.slice(0, this.index + 1);
    this.stack.push(json);
    if (this.stack.length > MAX_STEPS) this.stack.shift();
    this.index = this.stack.length - 1;
    this.version++;
    this.notify();
    this.onCommit();
  }

  undo() {
    if (this.index > 0) return this.goTo(this.index - 1);
  }

  redo() {
    if (this.index < this.stack.length - 1) return this.goTo(this.index + 1);
  }

  /** Replaces the board with the given JSON without recording it. */
  async load(json: string) {
    this.restoring = true;
    try {
      this.canvas.discardActiveObject();
      await this.canvas.loadFromJSON(json);
      this.canvas.requestRenderAll();
    } finally {
      this.restoring = false;
    }
  }

  private async goTo(index: number) {
    if (this.busy) return;
    this.busy = true;
    try {
      await this.load(this.stack[index]);
      this.index = index;
      this.notify();
      this.onCommit();
    } finally {
      this.busy = false;
    }
  }

  private notify() {
    this.onChange(this.index > 0, this.index < this.stack.length - 1);
  }
}
