import { describe, it, expect } from 'vitest';
import {
  SNAP, addToInventory, canPlace, place, move, flip, store, hitTest,
} from './home-editor.js';

// Minimal catalog-entry fixtures ({id,w,h} in 4px grid units) — the engine is content-agnostic
// (like npc-fsm.js), so we never import content/furniture-catalog.js.
const POINT = { id: 'test-point', w: 0, h: 0 }; // zero half-extents: isolates snap from clamp
const STOOL = { id: 'ice-stool', w: 2, h: 2 };  // world half-extents (3,3)
const SOFA = { id: 'snow-sofa', w: 6, h: 4 };   // world half-extents (9,6)
const TABLE = { id: 'ice-table', w: 4, h: 2 };  // world half-extents (6,3)

const WIDE_BOUNDS = { x0: -300, x1: 300, y0: -300, y1: 300 }; // generous — clamp is a no-op here
const TIGHT_BOUNDS = { x0: 0, x1: 120, y0: 0, y1: 90 };        // small — forces clamp on big items

function mkHome(over = {}) {
  return { placed: [], ...over };
}

describe('SNAP', () => {
  it('is 12 world px', () => {
    expect(SNAP).toBe(12);
  });
});

describe('addToInventory', () => {
  it('creates the key at 1 when absent', () => {
    const furniture = {};
    const ev = [];
    addToInventory(furniture, STOOL.id, ev);
    expect(furniture[STOOL.id]).toBe(1);
    expect(ev).toEqual([{ type: 'furniture-added', id: STOOL.id }]);
  });
  it('increments an existing count and appends one event per call', () => {
    const furniture = { [STOOL.id]: 3 };
    const ev = [];
    addToInventory(furniture, STOOL.id, ev);
    addToInventory(furniture, STOOL.id, ev);
    expect(furniture[STOOL.id]).toBe(5);
    expect(ev).toEqual([
      { type: 'furniture-added', id: STOOL.id },
      { type: 'furniture-added', id: STOOL.id },
    ]);
  });
});

describe('canPlace', () => {
  it('is true while under the cap and false at/over it', () => {
    const home = mkHome({ placed: [{}, {}] });
    expect(canPlace(home, 3)).toBe(true);
    expect(canPlace(home, 2)).toBe(false);
    expect(canPlace(home, 1)).toBe(false);
  });
  it('is true for an empty placed array with any positive cap', () => {
    expect(canPlace(mkHome(), 1)).toBe(true);
  });
});

describe('snap math (isolated from clamp via a zero-extent fixture item)', () => {
  it('rounds to the nearest 12px grid line, ties rounding up', () => {
    const cases = [
      [5, 0], [7, 12], [0, 0], [6, 12], [12, 12], [18, 24],
      [100, 96], [101, 96], [102, 108], [106, 108], [107, 108],
    ];
    for (const [input, expected] of cases) {
      const home = mkHome();
      const furniture = { [POINT.id]: 1 };
      const res = place(home, furniture, POINT, input, input, WIDE_BOUNDS, 30);
      expect(res.ok).toBe(true);
      expect(home.placed[0].x).toBe(expected);
      expect(home.placed[0].y).toBe(expected);
    }
  });
  it('handles negative-ish values with the same half-up-toward-+Infinity rounding as Math.round', () => {
    const cases = [[-7, -12], [-13, -12], [-19, -24], [-25, -24], [-30, -24], [-31, -36]];
    for (const [input, expected] of cases) {
      const home = mkHome();
      const furniture = { [POINT.id]: 1 };
      const res = place(home, furniture, POINT, input, input, WIDE_BOUNDS, 30);
      expect(res.ok).toBe(true);
      expect(home.placed[0].x).toBe(expected);
    }
  });
});

describe('clamp respects item half-extents against all four bounds edges', () => {
  it('clamps far-outside placements to the inset edge on left/right/top/bottom', () => {
    const home = mkHome();
    const furniture = { [SOFA.id]: 4 };
    place(home, furniture, SOFA, -9999, 45, TIGHT_BOUNDS, 30); // left
    expect(home.placed[0].x).toBe(9); // x0 + hw (9)
    place(home, furniture, SOFA, 9999, 45, TIGHT_BOUNDS, 30); // right
    expect(home.placed[1].x).toBe(111); // x1 - hw
    place(home, furniture, SOFA, 60, -9999, TIGHT_BOUNDS, 30); // top
    expect(home.placed[2].y).toBe(6); // y0 + hh (6)
    place(home, furniture, SOFA, 60, 9999, TIGHT_BOUNDS, 30); // bottom
    expect(home.placed[3].y).toBe(84); // y1 - hh
  });
  it('leaves an already-in-bounds, already-snapped placement untouched', () => {
    const home = mkHome();
    const furniture = { [TABLE.id]: 1 };
    const res = place(home, furniture, TABLE, 60, 48, TIGHT_BOUNDS, 30);
    expect(res.ok).toBe(true);
    expect(home.placed[0]).toMatchObject({ x: 60, y: 48 });
  });
  it('move() applies the same snap+clamp as place()', () => {
    const home = mkHome({ placed: [{ id: SOFA.id, x: 60, y: 45, flip: false }] });
    const res = move(home, 0, 99999, -9999, SOFA, TIGHT_BOUNDS, []);
    expect(res.ok).toBe(true);
    expect(home.placed[0].x).toBe(111); // x1 - hw
    expect(home.placed[0].y).toBe(6);   // y0 + hh
  });
});

describe('place rejections', () => {
  it('rejects no-stock when furniture[item.id] is undefined, without mutating state or ev', () => {
    const home = mkHome();
    const furniture = {};
    const ev = [];
    const res = place(home, furniture, STOOL, 24, 24, WIDE_BOUNDS, 30, ev);
    expect(res).toEqual({ ok: false, reason: 'no-stock' });
    expect(home.placed).toEqual([]);
    expect(ev).toEqual([]);
  });
  it('rejects no-stock when furniture[item.id] is exactly 0', () => {
    const home = mkHome();
    const furniture = { [STOOL.id]: 0 };
    const res = place(home, furniture, STOOL, 24, 24, WIDE_BOUNDS, 30);
    expect(res).toEqual({ ok: false, reason: 'no-stock' });
    expect(furniture[STOOL.id]).toBe(0);
  });
  it('rejects cap when placed.length has reached maxPlaced, without touching inventory', () => {
    const home = mkHome({ placed: [{ id: 'x', x: 0, y: 0, flip: false }] });
    const furniture = { [STOOL.id]: 5 };
    const ev = [];
    const res = place(home, furniture, STOOL, 24, 24, WIDE_BOUNDS, 1, ev);
    expect(res).toEqual({ ok: false, reason: 'cap' });
    expect(furniture[STOOL.id]).toBe(5);
    expect(home.placed.length).toBe(1);
    expect(ev).toEqual([]);
  });
  it('prefers no-stock over cap when both conditions hold', () => {
    const home = mkHome({ placed: [{ id: 'x', x: 0, y: 0, flip: false }] });
    const furniture = {};
    const res = place(home, furniture, STOOL, 24, 24, WIDE_BOUNDS, 1);
    expect(res).toEqual({ ok: false, reason: 'no-stock' });
  });
});

describe('place -> move -> flip -> store round trip', () => {
  it('restores the inventory count exactly and empties placed again', () => {
    const home = mkHome();
    const furniture = { [STOOL.id]: 1 };
    const ev = [];

    const placeRes = place(home, furniture, STOOL, 48, 48, WIDE_BOUNDS, 30, ev);
    expect(placeRes).toEqual({ ok: true, index: 0 });
    expect(furniture[STOOL.id]).toBe(0);
    expect(home.placed).toEqual([{ id: STOOL.id, x: 48, y: 48, flip: false }]);

    const moveRes = move(home, placeRes.index, 96, 84, STOOL, WIDE_BOUNDS, ev);
    expect(moveRes).toEqual({ ok: true, index: 0 });
    expect(home.placed[0]).toMatchObject({ x: 96, y: 84 });

    const flipRes = flip(home, placeRes.index, ev);
    expect(flipRes).toEqual({ ok: true, index: 0 });
    expect(home.placed[0].flip).toBe(true);
    flip(home, placeRes.index, ev); // flip back
    expect(home.placed[0].flip).toBe(false);

    const storeRes = store(home, furniture, placeRes.index, ev);
    expect(storeRes).toEqual({ ok: true, id: STOOL.id });
    expect(furniture[STOOL.id]).toBe(1); // restored exactly
    expect(home.placed).toEqual([]);
  });

  it('pushes exactly one correctly-typed event per action, in order', () => {
    const home = mkHome();
    const furniture = { [STOOL.id]: 1 };
    const ev = [];
    const { index } = place(home, furniture, STOOL, 48, 48, WIDE_BOUNDS, 30, ev);
    move(home, index, 60, 60, STOOL, WIDE_BOUNDS, ev);
    flip(home, index, ev);
    store(home, furniture, index, ev);
    expect(ev.map((e) => e.type)).toEqual([
      'furniture-placed', 'furniture-moved', 'furniture-flipped', 'furniture-stored',
    ]);
    expect(ev[0]).toEqual({ type: 'furniture-placed', id: STOOL.id, x: 48, y: 48 });
    expect(ev[1]).toEqual({ type: 'furniture-moved', id: STOOL.id, x: 60, y: 60 });
    expect(ev[2]).toEqual({ type: 'furniture-flipped', id: STOOL.id, flip: true });
    expect(ev[3]).toEqual({ type: 'furniture-stored', id: STOOL.id });
  });

  it('all mutators work with the default ev=[] param omitted, and never throw', () => {
    const home = mkHome();
    const furniture = { [STOOL.id]: 1 };
    expect(() => {
      const { index } = place(home, furniture, STOOL, 24, 24, WIDE_BOUNDS, 30);
      move(home, index, 36, 36, STOOL, WIDE_BOUNDS);
      flip(home, index);
      store(home, furniture, index);
    }).not.toThrow();
    expect(furniture[STOOL.id]).toBe(1);
  });
});

describe('multiples', () => {
  it('placing two of the same item decrements inventory by 2; storing one restores it to 1', () => {
    const home = mkHome();
    const furniture = { [STOOL.id]: 2 };
    const ev = [];
    const r1 = place(home, furniture, STOOL, 24, 24, WIDE_BOUNDS, 30, ev);
    const r2 = place(home, furniture, STOOL, 60, 24, WIDE_BOUNDS, 30, ev);
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    expect(furniture[STOOL.id]).toBe(0);
    expect(home.placed.length).toBe(2);

    const storeRes = store(home, furniture, r1.index, ev);
    expect(storeRes).toEqual({ ok: true, id: STOOL.id });
    expect(furniture[STOOL.id]).toBe(1);
    expect(home.placed.length).toBe(1);
    // the surviving entry is the second stool, now shifted down to index 0
    expect(home.placed[0]).toMatchObject({ x: 60, y: 24 });

    store(home, furniture, 0, ev);
    expect(furniture[STOOL.id]).toBe(2); // both restored, exactly the starting count
    expect(home.placed).toEqual([]);
  });

  it('owning N lets you place N, and the N+1th attempt is a clean no-stock rejection', () => {
    const home = mkHome();
    const furniture = { [STOOL.id]: 2 };
    expect(place(home, furniture, STOOL, 0, 0, WIDE_BOUNDS, 30).ok).toBe(true);
    expect(place(home, furniture, STOOL, 12, 0, WIDE_BOUNDS, 30).ok).toBe(true);
    const third = place(home, furniture, STOOL, 24, 0, WIDE_BOUNDS, 30);
    expect(third).toEqual({ ok: false, reason: 'no-stock' });
    expect(home.placed.length).toBe(2);
  });
});

describe('bad-index guards never throw', () => {
  const badIndices = [-1, 1, 99, 1.5, NaN, -Infinity, Infinity];

  it('move/flip/store all reject out-of-range indices cleanly, without mutating state or ev', () => {
    const home = mkHome({ placed: [{ id: STOOL.id, x: 24, y: 24, flip: false }] });
    const furniture = { [STOOL.id]: 0 };
    for (const idx of badIndices) {
      const ev = [];
      expect(() => move(home, idx, 0, 0, STOOL, WIDE_BOUNDS, ev)).not.toThrow();
      expect(move(home, idx, 0, 0, STOOL, WIDE_BOUNDS, ev)).toEqual({ ok: false, reason: 'bad-index' });

      expect(() => flip(home, idx, ev)).not.toThrow();
      expect(flip(home, idx, ev)).toEqual({ ok: false, reason: 'bad-index' });

      expect(() => store(home, furniture, idx, ev)).not.toThrow();
      expect(store(home, furniture, idx, ev)).toEqual({ ok: false, reason: 'bad-index' });

      expect(ev).toEqual([]);
    }
    // the one real entry was never touched by any of the bad-index calls above
    expect(home.placed).toEqual([{ id: STOOL.id, x: 24, y: 24, flip: false }]);
    expect(furniture[STOOL.id]).toBe(0);
  });

  it('guards the same way against an entirely empty placed array', () => {
    const home = mkHome();
    expect(move(home, 0, 0, 0, STOOL, WIDE_BOUNDS, [])).toEqual({ ok: false, reason: 'bad-index' });
    expect(flip(home, 0, [])).toEqual({ ok: false, reason: 'bad-index' });
    expect(store(home, {}, 0, [])).toEqual({ ok: false, reason: 'bad-index' });
  });
});

describe('hitTest', () => {
  const catalogById = { [STOOL.id]: STOOL, [SOFA.id]: SOFA };

  it('returns -1 on a miss (including an empty placed array)', () => {
    expect(hitTest(mkHome(), catalogById, 0, 0)).toBe(-1);
    const home = mkHome({ placed: [{ id: STOOL.id, x: 24, y: 24, flip: false }] });
    expect(hitTest(home, catalogById, 200, 200)).toBe(-1);
  });

  it('hits when (x,y) falls within the item world rect, inclusive of its edges', () => {
    const home = mkHome({ placed: [{ id: STOOL.id, x: 24, y: 24, flip: false }] });
    // half-extents (3,3) -> rect [21,27] x [21,27]
    expect(hitTest(home, catalogById, 24, 24)).toBe(0);
    expect(hitTest(home, catalogById, 21, 21)).toBe(0);
    expect(hitTest(home, catalogById, 27, 27)).toBe(0);
    expect(hitTest(home, catalogById, 20, 24)).toBe(-1); // just past the left edge
    expect(hitTest(home, catalogById, 28, 24)).toBe(-1); // just past the right edge
  });

  it('returns the topmost (last-placed) index when rects overlap', () => {
    const home = mkHome({
      placed: [
        { id: SOFA.id, x: 60, y: 45, flip: false },  // big rect, placed first (bottom)
        { id: STOOL.id, x: 60, y: 45, flip: false }, // fully overlapping, placed later (top)
      ],
    });
    expect(hitTest(home, catalogById, 60, 45)).toBe(1);
  });

  it('skips placed entries whose id is missing from the catalog rather than throwing', () => {
    const home = mkHome({
      placed: [
        { id: 'unknown-item', x: 24, y: 24, flip: false },
        { id: STOOL.id, x: 24, y: 24, flip: false },
      ],
    });
    expect(() => hitTest(home, catalogById, 24, 24)).not.toThrow();
    expect(hitTest(home, catalogById, 24, 24)).toBe(1); // falls through the unknown entry to the real one
  });
});

describe('determinism', () => {
  it('the same sequence of operations from the same start produces identical resulting state', () => {
    function run() {
      const home = mkHome();
      const furniture = { [STOOL.id]: 2, [SOFA.id]: 1 };
      const ev = [];
      const p1 = place(home, furniture, STOOL, 24, 24, WIDE_BOUNDS, 30, ev);
      const p2 = place(home, furniture, SOFA, 60, 60, WIDE_BOUNDS, 30, ev);
      move(home, p1.index, 36, 36, STOOL, WIDE_BOUNDS, ev);
      flip(home, p2.index, ev);
      place(home, furniture, STOOL, 96, 24, WIDE_BOUNDS, 30, ev);
      store(home, furniture, 0, ev);
      return { home, furniture, ev };
    }
    const a = run();
    const b = run();
    expect(a.home).toEqual(b.home);
    expect(a.furniture).toEqual(b.furniture);
    expect(a.ev).toEqual(b.ev);
  });
});
