// iconLayout tests (vitest, headless — no DOM, no wall clock; every loop bounded).
import { describe, it, expect } from 'vitest';
import {
  resolveLayout, cellFromPoint, nearestFree, pointFromCell,
  CELL_W, CELL_H, PAD_X, PAD_Y, type CellPos, type IconLayout,
} from './iconLayout';

const k = (c: CellPos): string => `${c.col},${c.row}`;
const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

describe('resolveLayout — default flow', () => {
  it('empty layout equals today’s column-major order', () => {
    const out = resolveLayout(ids, {}, 3);
    expect(out.a).toEqual({ col: 0, row: 0 });
    expect(out.b).toEqual({ col: 0, row: 1 });
    expect(out.c).toEqual({ col: 0, row: 2 });
    expect(out.d).toEqual({ col: 1, row: 0 });
    expect(out.g).toEqual({ col: 2, row: 0 });
  });

  it('is total — every id gets a cell, no two ids share one', () => {
    const out = resolveLayout(ids, { c: { col: 5, row: 1 } }, 4);
    expect(Object.keys(out)).toHaveLength(ids.length);
    expect(new Set(Object.values(out).map(k)).size).toBe(ids.length);
  });

  it('is deterministic', () => {
    const explicit: IconLayout = { b: { col: 2, row: 2 }, f: { col: 0, row: 0 } };
    expect(resolveLayout(ids, explicit, 3)).toEqual(resolveLayout(ids, explicit, 3));
  });
});

describe('resolveLayout — explicit entries', () => {
  it('a dragged icon claims its cell and the flow skips it', () => {
    const out = resolveLayout(ids, { a: { col: 1, row: 1 } }, 3);
    expect(out.a).toEqual({ col: 1, row: 1 });
    expect(out.b).toEqual({ col: 0, row: 0 }); // flow fills the freed slot
    expect(out.c).toEqual({ col: 0, row: 1 });
    expect(out.d).toEqual({ col: 0, row: 2 });
    expect(out.e).toEqual({ col: 1, row: 0 });
    expect(out.f).toEqual({ col: 1, row: 2 }); // (1,1) skipped — claimed by a
  });

  it('an explicit cell displaces a flowing icon that would have landed there', () => {
    const out = resolveLayout(ids, { g: { col: 0, row: 0 } }, 3);
    expect(out.g).toEqual({ col: 0, row: 0 });
    expect(out.a).toEqual({ col: 0, row: 1 });
  });

  it('two icons dragged to the same cell — second bumps to the nearest free', () => {
    const out = resolveLayout(ids, { a: { col: 2, row: 1 }, b: { col: 2, row: 1 } }, 3);
    expect(out.a).toEqual({ col: 2, row: 1 });
    expect(out.b).not.toEqual(out.a);
    expect(Math.max(Math.abs(out.b.col - 2), Math.abs(out.b.row - 1))).toBe(1); // ring 1
  });

  it('re-clamps an out-of-band row after a shrink (resize survival)', () => {
    const out = resolveLayout(ids, { a: { col: 1, row: 9 } }, 3); // only rows 0..2 exist now
    expect(out.a.row).toBeLessThan(3);
    expect(out.a.col).toBeGreaterThanOrEqual(0);
  });
});

describe('cellFromPoint — snap + clamp', () => {
  it('rounds to the nearest cell', () => {
    expect(cellFromPoint(PAD_X + 1 * CELL_W + 10, PAD_Y + 2 * CELL_H - 10, 5, 5)).toEqual({ col: 1, row: 2 });
    expect(cellFromPoint(PAD_X + CELL_W * 0.6, PAD_Y, 5, 5)).toEqual({ col: 1, row: 0 }); // .6 rounds up
    expect(cellFromPoint(PAD_X + CELL_W * 0.4, PAD_Y, 5, 5)).toEqual({ col: 0, row: 0 }); // .4 rounds down
  });

  it('clamps at all four edges', () => {
    expect(cellFromPoint(-500, -500, 4, 6)).toEqual({ col: 0, row: 0 });
    expect(cellFromPoint(99999, -500, 4, 6)).toEqual({ col: 5, row: 0 });
    expect(cellFromPoint(-500, 99999, 4, 6)).toEqual({ col: 0, row: 3 });
    expect(cellFromPoint(99999, 99999, 4, 6)).toEqual({ col: 5, row: 3 });
  });

  it('inverts pointFromCell', () => {
    for (const c of [{ col: 0, row: 0 }, { col: 3, row: 2 }, { col: 7, row: 5 }]) {
      const p = pointFromCell(c);
      expect(cellFromPoint(p.x, p.y, 6, 8)).toEqual(c);
    }
  });
});

describe('nearestFree — ring search', () => {
  it('returns the target when free', () => {
    expect(nearestFree({ col: 2, row: 2 }, new Set(), 5, 5)).toEqual({ col: 2, row: 2 });
  });

  it('returns a ring-1 neighbour when the target is taken', () => {
    const got = nearestFree({ col: 2, row: 2 }, new Set(['2,2']), 5, 5);
    expect(k(got)).not.toBe('2,2');
    expect(Math.max(Math.abs(got.col - 2), Math.abs(got.row - 2))).toBe(1);
  });

  it('skips out-of-bounds ring cells (corner target)', () => {
    const got = nearestFree({ col: 0, row: 0 }, new Set(['0,0']), 3, 3);
    expect(got.col).toBeGreaterThanOrEqual(0);
    expect(got.row).toBeGreaterThanOrEqual(0);
    expect(Math.max(got.col, got.row)).toBe(1);
  });

  it('never loops on a full grid — falls back to the target', () => {
    const taken = new Set<string>();
    for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++) taken.add(`${c},${r}`);
    expect(nearestFree({ col: 1, row: 1 }, taken, 3, 3)).toEqual({ col: 1, row: 1 });
  });

  it('clamps an out-of-bounds target before searching', () => {
    const got = nearestFree({ col: 99, row: 99 }, new Set(), 4, 6);
    expect(got).toEqual({ col: 5, row: 3 });
  });
});
