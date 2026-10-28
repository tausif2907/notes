import { PAPERS } from "../theme";
import type { Board } from "../types/board";

/** Board preview image, or the board's paper colour while it is empty. */
export function Thumbnail({ board, small }: { board: Board; small?: boolean }) {
  return (
    <div
      className={`thumbnail${small ? " small" : ""}`}
      style={{ background: PAPERS[board.paper].color }}
      aria-hidden="true"
    >
      {board.thumbnail ? <img src={board.thumbnail} alt="" draggable={false} /> : !small && <span>Empty board</span>}
    </div>
  );
}
