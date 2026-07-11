// Bubble Shooter engine tests (vitest, headless — no DOM/canvas/React). These lock the
// error-prone geometry (brick-grid neighbours, snap), the pop/floating-drop resolution, the
// drop-row pacing, win/lose, palette rules, and seeded determinism.
import { describe, it, expect } from 'vitest';
import {
  newGame, restart, setAim, nudgeAim, aimFromPointer, fire, step, swap,
  cellToPixel, pixelToCell, neighbors, colsInRow, inBounds, parity,
  clusterAt, floatingCells, crossedDanger, isCleared, livePalette, pickShooterColor, rankFor,
  COLS, ROWS_MAX, R, D, ROW_H, WALL_L, WALL_R, MAX_AIM, SHOOTER_X, SHOOTER_Y,
  SHOT_SPEED, SHOTS_PER_DROP, PTS_POP, PTS_COMBO, PTS_DROP, EMPTY,
  type BubbleState, type GameEvent, type Cell,
} from './engine';

/* --------------------------------- helpers -------------------------------- */

function blank(seed = 1): BubbleState {
  const s = newGame(seed);
  for (let r = 0; r < ROWS_MAX; r++) for (let c = 0; c < COLS; c++) s.grid[r][c] = EMPTY;
  return s;
}
const place = (s: BubbleState, row: number, col: number, color: number): void => { s.grid[row][col] = color; };
/** Straight-up shot from (x,y) — deterministic, no aim math. */
function launch(s: BubbleState, x: number, y: number, color: number): void {
  s.shot = { x, y, vx: 0, vy: -SHOT_SPEED, color };
  s.phase = 'fly';
}
function settle(s: BubbleState, events: GameEvent[]): void {
  for (let i = 0; i < 4000 && s.phase === 'fly'; i++) step(s, 1 / 60, events);
}
const occupied = (s: BubbleState): number => {
  let n = 0;
  for (let r = 0; r < ROWS_MAX; r++) for (let c = 0; c < colsInRow(s, r); c++) if (s.grid[r][c] !== EMPTY) n++;
  return n;
};

/* ------------------------------- determinism ------------------------------ */

describe('determinism', () => {
  it('same seed replays byte-identically', () => {
    const a = newGame(42);
    const b = newGame(42);
    expect(a.grid).toEqual(b.grid);
    expect([a.current, a.next, a.rng]).toEqual([b.current, b.next, b.rng]);
  });

  it('different seeds diverge', () => {
    expect(newGame(42).grid).not.toEqual(newGame(43).grid);
  });

  it('an identical fire/step loop reaches an identical end state', () => {
    const run = (): BubbleState => {
      const s = newGame(7);
      for (let shot = 0; shot < 12 && s.phase === 'aim'; shot++) {
        setAim(s, ((shot % 5) - 2) * 0.4);
        fire(s, []);
        settle(s, []);
      }
      return s;
    };
    const a = run();
    const b = run();
    expect([a.score, a.phase]).toEqual([b.score, b.phase]);
    expect(a.grid).toEqual(b.grid);
  });
});

/* --------------------------- geometry / neighbours ------------------------ */

describe('geometry', () => {
  it('cellToPixel places the brick rows correctly', () => {
    const s = blank();
    expect(cellToPixel(s, 0, 0)).toEqual({ x: R, y: R });
    expect(cellToPixel(s, 2, 0).x).toBe(R);                       // even row, no shift
    expect(cellToPixel(s, 1, 0).x).toBe(R + R);                   // odd row, +half bubble
    expect(cellToPixel(s, 1, 0).y).toBeCloseTo(R + ROW_H, 5);
  });

  it('an odd top row (rowOffset=1) shifts right by R', () => {
    const s = blank();
    s.rowOffset = 1;
    expect(cellToPixel(s, 0, 0).x).toBe(R + R);
  });

  it('pixelToCell round-trips both parities', () => {
    const s = blank();
    for (const [r, c] of [[0, 0], [2, 3], [1, 0], [3, 4], [4, 9]] as const) {
      const p = cellToPixel(s, r, c);
      expect(pixelToCell(s, p.x, p.y)).toEqual({ row: r, col: c });
    }
  });

  it('ragged row widths and bounds', () => {
    const s = blank();
    expect(colsInRow(s, 0)).toBe(COLS);
    expect(colsInRow(s, 1)).toBe(COLS - 1);
    expect(inBounds(s, 1, COLS - 1)).toBe(false);   // odd row holds only COLS-1 cells
    expect(inBounds(s, 0, COLS - 1)).toBe(true);
  });

  it('neighbour sets differ by parity', () => {
    const s = blank();
    const key = (cs: Cell[]): string => cs.map((c) => `${c.row},${c.col}`).sort().join(' ');
    expect(key(neighbors(s, 2, 3))).toBe(key([
      { row: 1, col: 2 }, { row: 1, col: 3 }, { row: 2, col: 2 },
      { row: 2, col: 4 }, { row: 3, col: 2 }, { row: 3, col: 3 },
    ]));
    // odd (1,0): left (1,-1) is out of bounds and filtered
    expect(key(neighbors(s, 1, 0))).toBe(key([
      { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 },
      { row: 2, col: 0 }, { row: 2, col: 1 },
    ]));
  });

  it('every neighbour center is exactly D away (both parities)', () => {
    const s = blank();
    for (const [r, c] of [[2, 3], [3, 4], [5, 2]] as const) {
      const p = cellToPixel(s, r, c);
      for (const nb of neighbors(s, r, c)) {
        const q = cellToPixel(s, nb.row, nb.col);
        expect(Math.hypot(p.x - q.x, p.y - q.y)).toBeCloseTo(D, 6);
      }
    }
  });

  it('a corner returns only in-bounds neighbours', () => {
    const s = blank();
    for (const nb of neighbors(s, 0, 0)) expect(inBounds(s, nb.row, nb.col)).toBe(true);
  });
});

/* ------------------------------ cluster / pop ----------------------------- */

describe('cluster & pop', () => {
  it('exactly 3 pops for 3*PTS_POP (no combo)', () => {
    const s = blank();
    place(s, 0, 0, 0); place(s, 0, 1, 0);
    const ev: GameEvent[] = [];
    launch(s, cellToPixel(s, 1, 0).x, 300, 0); // straight up into (0,0), snaps to (1,0) => cluster of 3
    settle(s, ev);
    expect(s.score).toBe(3 * PTS_POP);
    expect(ev.some((e) => e.type === 'pop' && e.count === 3)).toBe(true);
  });

  it('4 pops for 4*PTS_POP + 1*PTS_COMBO and empties the cells', () => {
    const s = blank();
    place(s, 0, 0, 0); place(s, 0, 1, 0); place(s, 0, 2, 0);
    const ev: GameEvent[] = [];
    launch(s, cellToPixel(s, 1, 1).x, 300, 0); // snaps to (1,1) => cluster {(1,1),(0,0),(0,1),(0,2)}
    settle(s, ev);
    expect(s.score).toBe(4 * PTS_POP + 1 * PTS_COMBO);
    expect(s.popping.length).toBe(4);
    expect(occupied(s)).toBe(0);
  });

  it('a cluster of 2 does not pop (sticks, dud)', () => {
    const s = blank();
    place(s, 0, 0, 0);
    const ev: GameEvent[] = [];
    launch(s, cellToPixel(s, 1, 0).x, 300, 0);
    settle(s, ev);
    expect(s.score).toBe(0);
    expect(s.popping.length).toBe(0);
    expect(occupied(s)).toBe(2);
    expect(ev.some((e) => e.type === 'dud')).toBe(true);
  });

  it('clusterAt excludes an adjacent different colour', () => {
    const s = blank();
    place(s, 0, 0, 0); place(s, 0, 1, 1);
    expect(clusterAt(s, 0, 0)).toEqual([{ row: 0, col: 0 }]);
  });
});

/* ------------------------------ floating drop ----------------------------- */

describe('floating drop', () => {
  it('a shelf hung off the popped anchors drops for PTS_DROP each', () => {
    const s = blank();
    place(s, 0, 1, 0); place(s, 0, 2, 0);                 // ceiling anchors (popped by the shot)
    place(s, 1, 1, 1); place(s, 2, 1, 1); place(s, 2, 2, 1); // shelf hanging off them
    const ev: GameEvent[] = [];
    launch(s, cellToPixel(s, 0, 0).x, 300, 0); // flies to ceiling, snaps (0,0) => pops {(0,0),(0,1),(0,2)}
    settle(s, ev);
    expect(s.dropping.length).toBe(3);
    const drop = ev.find((e) => e.type === 'drop') as Extract<GameEvent, { type: 'drop' }>;
    expect(drop?.count).toBe(3);
    expect(s.score).toBe(3 * PTS_POP + 3 * PTS_DROP);
  });

  it('no false drop when everything stays ceiling-connected', () => {
    const s = blank();
    place(s, 0, 0, 0); place(s, 0, 1, 0); place(s, 0, 2, 1);
    const ev: GameEvent[] = [];
    launch(s, cellToPixel(s, 1, 0).x, 300, 0); // snaps (1,0) => pops the three 0s; the lone 1 stays on the ceiling
    settle(s, ev);
    expect(floatingCells(s)).toEqual([]);
    expect(s.dropping.length).toBe(0);
  });
});

/* ------------------------------- snap / flight ---------------------------- */

describe('snap & flight', () => {
  it('a shot snaps into a free neighbour of the bubble it hits', () => {
    const s = blank();
    const col = pixelToCell(s, SHOOTER_X, R).col;  // the cell directly above the muzzle
    place(s, 0, col, 3);
    s.current = 4;                         // different colour: no pop, just land
    const ev: GameEvent[] = [];
    fire(s, ev);                           // straight up (angle 0) into (0,col)
    settle(s, ev);
    const land = ev.find((e) => e.type === 'land') as Extract<GameEvent, { type: 'land' }>;
    expect(land).toBeTruthy();
    expect(neighbors(s, 0, col).some((n) => n.row === land.row && n.col === land.col)).toBe(true);
    expect(s.grid[land.row][land.col]).toBe(4);
  });

  it('a steep shot bounces off a wall and stays inside the field', () => {
    const s = blank();
    place(s, 0, 0, 0);                     // keep the board non-empty so fire() is legal
    setAim(s, 1.28);
    const ev: GameEvent[] = [];
    fire(s, ev);
    for (let i = 0; i < 4000 && s.phase === 'fly'; i++) {
      step(s, 1 / 60, ev);
      if (s.shot) {
        expect(s.shot.x).toBeGreaterThanOrEqual(WALL_L - 1e-6);
        expect(s.shot.x).toBeLessThanOrEqual(WALL_R + 1e-6);
      }
    }
    expect(ev.some((e) => e.type === 'bounce')).toBe(true);
    const land = ev.find((e) => e.type === 'land') as Extract<GameEvent, { type: 'land' }>;
    expect(inBounds(s, land.row, land.col)).toBe(true);
  });

  it('a shot up an empty column lands on the ceiling row', () => {
    const s = blank();
    place(s, 0, 0, 0);
    s.current = 5;
    const ev: GameEvent[] = [];
    fire(s, ev);                           // straight up at x=198, nothing there => ceiling
    settle(s, ev);
    const land = ev.find((e) => e.type === 'land') as Extract<GameEvent, { type: 'land' }>;
    expect(land.row).toBe(0);
  });

  it('snap only ever targets a free, in-bounds cell over a long replay', () => {
    const s = newGame(11);
    for (let shot = 0; shot < 40 && s.phase === 'aim'; shot++) {
      const before = occupied(s);
      setAim(s, ((shot * 7) % 11 - 5) * 0.24);
      const ev: GameEvent[] = [];
      fire(s, ev);
      settle(s, ev);
      const land = ev.find((e) => e.type === 'land') as Extract<GameEvent, { type: 'land' }> | undefined;
      if (land) {
        expect(inBounds(s, land.row, land.col)).toBe(true);
        // On shots without a compression, the net change is exactly +1 (landed) - popped - dropped;
        // any snap onto an occupied cell would show up as one fewer than that. (Push-shots carry a
        // parity-dependent new-row width and are covered by the descent tests instead.)
        const pushed = ev.some((e) => e.type === 'row');
        if (!pushed && s.phase === 'aim') {
          const popped = ev.filter((e) => e.type === 'pop').reduce((n, e) => n + (e as { count: number }).count, 0);
          const dropped = ev.filter((e) => e.type === 'drop').reduce((n, e) => n + (e as { count: number }).count, 0);
          expect(occupied(s)).toBe(before + 1 - popped - dropped);
        }
      }
    }
  });
});

/* ---------------------- descent / pacing / win / lose --------------------- */

describe('descent, win & lose', () => {
  it('a top row is pushed in exactly on the SHOTS_PER_DROP-th shot', () => {
    const s = newGame(3);
    let rowEvents = 0;
    for (let i = 0; i < SHOTS_PER_DROP && s.phase === 'aim'; i++) {
      setAim(s, 0);
      const ev: GameEvent[] = [];
      fire(s, ev);
      settle(s, ev);
      rowEvents += ev.filter((e) => e.type === 'row').length;
    }
    expect(rowEvents).toBe(1);
    expect(s.descents).toBe(1);
    expect(s.rowOffset).toBe(1);
    expect(s.shotsUntilDrop).toBe(SHOTS_PER_DROP);
  });

  it('a compression preserves every bubble’s neighbour pattern (parity design)', () => {
    const a = blank(); a.rowOffset = 0;              // bubble at (2,3)
    const b = blank(); b.rowOffset = 1;              // same bubble after one push is at (3,3)
    const pattern = (s: BubbleState, r: number, c: number): string => {
      const p = cellToPixel(s, r, c);
      return neighbors(s, r, c)
        .map((n) => cellToPixel(s, n.row, n.col))
        .map((q) => `${(q.x - p.x).toFixed(3)},${(q.y - p.y).toFixed(3)}`)
        .sort().join(' ');
    };
    expect(pattern(b, 3, 3)).toBe(pattern(a, 2, 3));
  });

  it('shotsUntilDrop stays within [0, SHOTS_PER_DROP] across a replay', () => {
    const s = newGame(9);
    for (let i = 0; i < 30 && s.phase === 'aim'; i++) {
      setAim(s, ((i % 7) - 3) * 0.3);
      fire(s, []);
      settle(s, []);
      expect(s.shotsUntilDrop).toBeGreaterThanOrEqual(0);
      expect(s.shotsUntilDrop).toBeLessThanOrEqual(SHOTS_PER_DROP);
    }
  });

  it('loses when a pushed row carries a bubble across the danger line', () => {
    const s = blank();
    place(s, 20, 0, 0);            // one row above the first losing row (21)
    s.current = 0; s.next = 0;
    s.shotsUntilDrop = 1;          // next fire triggers the compression
    const ev: GameEvent[] = [];
    fire(s, ev);                   // lands harmlessly on the ceiling, then the push shifts (15,0)->(16,0)
    settle(s, ev);
    expect(crossedDanger(s)).toBe(true);
    expect(s.phase).toBe('lost');
    expect(ev.some((e) => e.type === 'lose')).toBe(true);
  });

  it('wins when the final cluster is cleared, drawing no new colour', () => {
    const s = blank();
    place(s, 0, 0, 0); place(s, 0, 1, 0);
    const beforeCurrent = s.current;
    const beforeNext = s.next;
    const ev: GameEvent[] = [];
    launch(s, cellToPixel(s, 1, 0).x, 300, 0);
    settle(s, ev);
    expect(isCleared(s)).toBe(true);
    expect(s.phase).toBe('won');
    const win = ev.find((e) => e.type === 'win') as Extract<GameEvent, { type: 'win' }>;
    expect(win.value).toBe(s.score);
    expect(s.best).toBeGreaterThanOrEqual(s.score);
    expect([s.current, s.next]).toEqual([beforeCurrent, beforeNext]); // no reload on a win
  });
});

/* --------------------------------- palette -------------------------------- */

describe('palette', () => {
  it('pickShooterColor is always a colour on the board', () => {
    const s = blank(5);
    place(s, 0, 0, 2); place(s, 0, 1, 4);
    for (let i = 0; i < 60; i++) expect([2, 4]).toContain(pickShooterColor(s));
  });

  it('a colour absent from the board is never drawn', () => {
    const s = blank(6);
    place(s, 0, 0, 1); place(s, 1, 0, 3);
    for (let i = 0; i < 60; i++) {
      const c = pickShooterColor(s);
      expect(c === 0 || c === 2 || c === 4 || c === 5).toBe(false);
    }
    expect(livePalette(s)).toEqual([1, 3]);
  });
});

/* ------------------------------- invariants ------------------------------- */

describe('invariants & misc', () => {
  it('grid shape, odd-tail emptiness, phase/shot coupling and score monotonicity hold', () => {
    const s = newGame(13);
    let prevScore = 0;
    for (let i = 0; i < 45 && s.phase === 'aim'; i++) {
      setAim(s, ((i * 5) % 9 - 4) * 0.28);
      fire(s, []);
      settle(s, []);
      expect(s.grid.length).toBe(ROWS_MAX);
      for (let r = 0; r < ROWS_MAX; r++) {
        expect(s.grid[r].length).toBe(COLS);
        if (parity(s, r) === 1) expect(s.grid[r][COLS - 1]).toBe(EMPTY);
      }
      expect((s.phase as string) === 'fly').toBe(s.shot !== null);
      expect(s.score).toBeGreaterThanOrEqual(prevScore);
      prevScore = s.score;
    }
  });

  it('aim clamps at the extremes', () => {
    const s = blank();
    setAim(s, 10);
    expect(s.angle).toBeCloseTo(MAX_AIM, 6);
    setAim(s, -10);
    expect(s.angle).toBeCloseTo(-MAX_AIM, 6);
    s.angle = 0; nudgeAim(s, 10);
    expect(s.angle).toBeCloseTo(MAX_AIM, 6);
    expect(aimFromPointer(SHOOTER_X + 9999, SHOOTER_Y - 1)).toBeCloseTo(MAX_AIM, 6);
    expect(aimFromPointer(SHOOTER_X, SHOOTER_Y - 100)).toBeCloseTo(0, 6); // straight up
  });

  it('swap exchanges current and next only while aiming', () => {
    const s = blank();
    s.current = 1; s.next = 4;
    swap(s, []);
    expect([s.current, s.next]).toEqual([4, 1]);
    s.phase = 'fly';
    swap(s, []);
    expect([s.current, s.next]).toEqual([4, 1]); // no-op mid-flight
  });

  it('restart preserves best and reuses the seed', () => {
    const s = newGame(21);
    s.score = 500; s.best = 500;
    restart(s);
    expect(s.best).toBe(500);
    expect(s.score).toBe(0);
    expect(s.grid).toEqual(newGame(21, 500).grid);
  });

  it('rankFor climbs the ladder', () => {
    expect(rankFor(0)).toBe(0);
    expect(rankFor(1499)).toBe(0);
    expect(rankFor(1500)).toBe(1);
    expect(rankFor(999999)).toBe(5);
  });
});
