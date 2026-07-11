// iconLayout.ts — pure desktop-icon grid math (BROWSER-PLAN §1.3, LOCKED, unit-tested).
// No DOM, no React, no wall clock. The grid is column-major like today's auto-flow CSS grid:
// index i flows to col = floor(i/rows), row = i%rows. Explicit (dragged) entries claim their
// cell; everything else keeps flowing into the remaining default slots in manifest order.

export interface CellPos { col: number; row: number }
export type IconLayout = Record<string, CellPos>; // appId → cell (sparse: dragged icons only)

export const USER_ID = 'dominik'; // single login tile today (§5.7); future-proof constant

// Pixel geometry mirrors .icon-grid CSS: 88px cells, columns advance by (88 - 6) = 82px
// (grid-auto-columns: calc(var(--icon-cell) - 6px)), content box padded 4px left / 6px top.
export const CELL_W = 82;
export const CELL_H = 88;
export const PAD_X = 4;
export const PAD_Y = 6;

const key = (c: CellPos): string => `${c.col},${c.row}`;

const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n));

/** Snap a pixel point (icon top-left, grid-relative) to the nearest cell, clamped in-bounds. */
export function cellFromPoint(x: number, y: number, rows: number, cols: number): CellPos {
  return {
    col: clamp(Math.round((x - PAD_X) / CELL_W), 0, Math.max(0, cols - 1)),
    row: clamp(Math.round((y - PAD_Y) / CELL_H), 0, Math.max(0, rows - 1)),
  };
}

/** Cell → pixel top-left (grid-relative). */
export function pointFromCell(c: CellPos): { x: number; y: number } {
  return { x: PAD_X + c.col * CELL_W, y: PAD_Y + c.row * CELL_H };
}

/** Nearest free cell: the target itself when free, else the closest in-bounds free cell by
 *  ring search (Chebyshev distance 1, 2, …), deterministic scan order. Bounded: on a full
 *  grid it falls back to the (occupied) target rather than looping. */
export function nearestFree(target: CellPos, taken: Set<string>, rows: number, cols: number): CellPos {
  const t: CellPos = {
    col: clamp(target.col, 0, Math.max(0, cols - 1)),
    row: clamp(target.row, 0, Math.max(0, rows - 1)),
  };
  if (!taken.has(key(t))) return t;
  const maxR = Math.max(rows, cols);
  for (let r = 1; r <= maxR; r++) {
    for (let dc = -r; dc <= r; dc++) {
      for (let dr = -r; dr <= r; dr++) {
        if (Math.max(Math.abs(dc), Math.abs(dr)) !== r) continue; // ring cells only
        const c: CellPos = { col: t.col + dc, row: t.row + dr };
        if (c.col < 0 || c.row < 0 || c.col >= cols || c.row >= rows) continue;
        if (!taken.has(key(c))) return c;
      }
    }
  }
  return t; // grid full — stay put (total, never loops)
}

/** Resolve every icon to a cell: explicit entries first (clamped into the row band; collisions
 *  bump to the nearest free cell), then the rest flow column-major into the remaining default
 *  slots in `ids` order. Total (every id gets a cell) and deterministic. Columns are unbounded
 *  to the right, exactly like today's auto-flow grid. */
export function resolveLayout(ids: string[], explicit: IconLayout, rows: number): Record<string, CellPos> {
  const r = Math.max(1, rows);
  const out: Record<string, CellPos> = {};
  const taken = new Set<string>();
  // wide virtual column budget for collision search: everything fits with headroom
  const cols = Math.max(1, Math.ceil(ids.length / r)) + ids.length;

  for (const id of ids) {
    const e = explicit[id];
    if (!e) continue;
    const pos = nearestFree({ col: Math.max(0, e.col), row: e.row }, taken, r, cols);
    out[id] = pos;
    taken.add(key(pos));
  }

  let cursor = 0; // column-major flow index over default slots
  for (const id of ids) {
    if (out[id]) continue;
    let pos: CellPos;
    do {
      pos = { col: Math.floor(cursor / r), row: cursor % r };
      cursor++;
    } while (taken.has(key(pos)));
    out[id] = pos;
    taken.add(key(pos));
  }
  return out;
}
