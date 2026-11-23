export type Step = { text?: unknown; done?: unknown };
export type Card = { id?: unknown; title?: unknown; steps?: unknown };
export type Column = { name?: unknown; cards?: unknown };
export type Board = { title?: unknown; columns?: unknown; labels?: unknown; accent?: unknown };

export function asBoard(value: unknown): Board | null {
  if (!value || typeof value !== "object") return null;
  const board = value as Board;
  if (typeof board.title !== "string" || board.title.length > 120) return null;
  if (!Array.isArray(board.columns) || board.columns.length > 40) return null;
  const encoded = JSON.stringify(board);
  if (encoded.length > 400000) return null;
  return board;
}

type Snap = { title: string; column: string; done: number; total: number };

function snaps(board: Board | null): Map<string, Snap> {
  const map = new Map<string, Snap>();
  if (!board || !Array.isArray(board.columns)) return map;
  for (const column of board.columns as Column[]) {
    const name = String(column?.name || "Group").slice(0, 80);
    const cards = Array.isArray(column?.cards) ? column.cards as Card[] : [];
    for (const card of cards) {
      const id = String(card?.id || "");
      if (!id) continue;
      const steps = Array.isArray(card?.steps) ? card.steps as Step[] : [];
      const written = steps.filter((step) => String(step?.text || "").trim());
      map.set(id, {
        title: String(card?.title || "Untitled").slice(0, 80),
        column: name,
        done: written.filter((step) => step?.done).length,
        total: written.length,
      });
    }
  }
  return map;
}

export function summarize(prev: Board | null, next: Board): string {
  if (!prev) return "started the board";
  const bits: string[] = [];
  if (String(prev.title || "") !== String(next.title || "")) {
    bits.push("renamed the board to “" + String(next.title || "Untitled").slice(0, 80) + "”");
  }
  const before = snaps(prev);
  const after = snaps(next);
  let added = 0;
  let removed = 0;
  const renamed: string[] = [];
  const moved: string[] = [];
  const checked: string[] = [];
  for (const [id, card] of after) {
    const old = before.get(id);
    if (!old) { added += 1; continue; }
    if (old.title !== card.title) renamed.push(card.title);
    if (old.column !== card.column) moved.push(card.title);
    if (card.done > old.done) checked.push(card.title);
  }
  for (const id of before.keys()) if (!after.has(id)) removed += 1;
  if (added) bits.push(added === 1 ? "added an item" : "added " + added + " items");
  if (removed) bits.push(removed === 1 ? "removed an item" : "removed " + removed + " items");
  if (renamed.length) bits.push("renamed “" + renamed[0] + "”");
  if (moved.length) bits.push("moved “" + moved[0] + "”");
  if (checked.length) bits.push("checked off a story point on “" + checked[0] + "”");
  if (!bits.length) return "edited the board";
  return bits.slice(0, 3).join(", ");
}
