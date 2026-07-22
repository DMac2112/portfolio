// Minesweeper engine tests (vitest, headless — no DOM). Controlled hand-built boards + a seeded
// board for placement/determinism. Every loop is a bounded for-loop; the only while-loop lives in
// the engine's flood-fill and is bounded by the cell count, so nothing here can hang.
import { describe, it, expect } from 'vitest';
import {
  newGame, restart, reveal, toggleFlag, chord, idx, inBounds, neighbors, remaining,
  BEGINNER, type MineState, type GameEvent,
} from './engine';

/** Hand-build a fully-placed board with mines at the given indices (bypasses lazy placement). */
function build(w: number, h: number, mines: number[]): MineState {
  const s = newGame({ w, h, mines: mines.length }, 1);
  for (const i of mines) s.cells[i].mine = true;
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      let a = 0;
      for (const nb of neighbors(s, r, c)) if (s.cells[nb].mine) a++;
      s.cells[idx(s, r, c)].adj = a;
    }
  }
  s.placed = true;
  s.status = 'play';
  return s;
}
const mineList = (s: MineState): number[] => s.cells.map((x, i) => (x.mine ? i : -1)).filter((i) => i >= 0);
const has = (ev: GameEvent[], type: GameEvent['type']): boolean => ev.some((e) => e.type === type);

/* ------------------------------- new game --------------------------------- */

describe('new game', () => {
  it('is all-hidden and unplaced', () => {
    const s = newGame(BEGINNER);
    expect(s.cells.length).toBe(81);
    expect(s.cells.every((c) => c.state === 'hidden' && !c.mine)).toBe(true);
    expect(s.status).toBe('ready');
    expect(s.placed).toBe(false);
    expect(s.mines).toBe(10);
  });
});

/* ------------------------- placement & determinism ------------------------ */

describe('mine placement', () => {
  it('the first click and its 8 neighbours are always mine-free', () => {
    for (const seed of [1, 2, 3, 7, 42]) {
      for (const [r, c] of [[0, 0], [4, 4], [8, 8], [3, 6]] as const) {
        const s = newGame(BEGINNER, seed);
        reveal(s, r, c, []);
        expect(s.placed).toBe(true);
        expect(s.cells.filter((x) => x.mine).length).toBe(10);
        for (const i of [idx(s, r, c), ...neighbors(s, r, c)]) expect(s.cells[i].mine).toBe(false);
      }
    }
  });

  it('is deterministic for a given seed + first click', () => {
    const a = newGame(BEGINNER, 123); reveal(a, 2, 2, []);
    const b = newGame(BEGINNER, 123); reveal(b, 2, 2, []);
    const c = newGame(BEGINNER, 124); reveal(c, 2, 2, []);
    expect(mineList(b)).toEqual(mineList(a));
    expect(a.rng).toBe(b.rng);
    expect(mineList(c)).not.toEqual(mineList(a));
  });

  it('adjacency counts are correct', () => {
    const s = build(3, 3, [4]); // one mine, dead centre
    for (let i = 0; i < 9; i++) expect(s.cells[i].adj).toBe(i === 4 ? 0 : 1);
  });

  it('falls back safely when a custom board is over-mined', () => {
    const s = newGame({ w: 5, h: 5, mines: 20 }, 3); // 20 > 25 - 9 available
    reveal(s, 2, 2, []);
    expect(s.mines).toBe(16);                        // clamped to the pool size
    expect(s.cells.filter((x) => x.mine).length).toBe(16);
    for (const i of [idx(s, 2, 2), ...neighbors(s, 2, 2)]) expect(s.cells[i].mine).toBe(false);
    expect(s.cells[idx(s, 2, 2)].state).toBe('revealed');
  });
});

/* -------------------------------- reveal ---------------------------------- */

describe('reveal', () => {
  it('flood-fills a zero-region and stops at the numbered border and the mine wall', () => {
    const s = build(5, 5, [10, 11, 12, 13, 14]); // a wall of mines across row 2
    const ev: GameEvent[] = [];
    reveal(s, 0, 0, ev);
    expect(s.status).toBe('play');
    expect(s.revealed).toBe(10);                     // rows 0–1 only
    for (let i = 0; i < 10; i++) expect(s.cells[i].state).toBe('revealed');
    for (let i = 10; i < 25; i++) expect(s.cells[i].state).toBe('hidden');
    expect(has(ev, 'reveal')).toBe(true);
  });

  it('stepping on a mine loses and shows every mine', () => {
    const s = build(3, 3, [4]);
    const ev: GameEvent[] = [];
    reveal(s, 1, 1, ev);
    expect(s.status).toBe('lost');
    expect(s.boom).toBe(4);
    expect(s.cells[4].state).toBe('revealed');
    expect(has(ev, 'boom')).toBe(true);
    expect(has(ev, 'lose')).toBe(true);
  });

  it('clearing every safe cell wins and auto-flags the mines', () => {
    const s = build(3, 3, [0]);
    const ev: GameEvent[] = [];
    for (let i = 1; i < 9; i++) reveal(s, Math.floor(i / 3), i % 3, ev);
    expect(s.status).toBe('won');
    expect(s.revealed).toBe(8);
    expect(has(ev, 'win')).toBe(true);
    expect(s.cells[0].state).toBe('flagged');
    expect(s.flags).toBe(1);
  });
});

/* --------------------------------- flags ---------------------------------- */

describe('flags', () => {
  it('cycles hidden -> flag -> hidden (marks off) and tracks the counter', () => {
    const s = build(3, 3, [0]);
    toggleFlag(s, 1, 1, []);
    expect(s.cells[4].state).toBe('flagged');
    expect(s.flags).toBe(1);
    expect(remaining(s)).toBe(0); // 1 mine - 1 flag
    toggleFlag(s, 1, 1, []);
    expect(s.cells[4].state).toBe('hidden');
    expect(s.flags).toBe(0);
  });

  it('cycles through a question mark when marks are on', () => {
    const s = newGame({ w: 3, h: 3, mines: 1, allowMarks: true }, 1);
    s.placed = true; s.status = 'play';
    toggleFlag(s, 1, 1, []); expect(s.cells[4].state).toBe('flagged');
    toggleFlag(s, 1, 1, []); expect(s.cells[4].state).toBe('question'); expect(s.flags).toBe(0);
    toggleFlag(s, 1, 1, []); expect(s.cells[4].state).toBe('hidden');
  });

  it('remaining goes negative when over-flagged', () => {
    const s = build(3, 3, [0]);
    toggleFlag(s, 1, 1, []); toggleFlag(s, 1, 2, []);
    expect(s.flags).toBe(2);
    expect(remaining(s)).toBe(-1);
  });
});

/* --------------------------------- chord ---------------------------------- */

describe('chord', () => {
  it('opens the remaining neighbours when the flag count matches', () => {
    const s = build(3, 3, [0]);
    reveal(s, 1, 1, []);      // a "1"
    toggleFlag(s, 0, 0, []);  // flag the real mine
    const ev: GameEvent[] = [];
    chord(s, 1, 1, ev);
    expect(has(ev, 'chord')).toBe(true);
    expect(s.status).toBe('won');
  });

  it('detonates when a flag is misplaced', () => {
    const s = build(3, 3, [0]);
    reveal(s, 1, 1, []);
    toggleFlag(s, 2, 2, []);  // wrong flag; the real mine at (0,0) is uncovered
    const ev: GameEvent[] = [];
    chord(s, 1, 1, ev);
    expect(s.status).toBe('lost');
    expect(has(ev, 'boom')).toBe(true);
  });

  it('is a no-op on covered, zero, or flag-mismatched cells', () => {
    const s = build(5, 5, [10, 11, 12, 13, 14]); // mine wall across row 2 leaves rows 3–4 covered
    expect(chord(s, 2, 2, [])).toBe(false);   // (2,2) is covered
    reveal(s, 0, 0, []);                       // floods rows 0–1 only
    expect(s.status).toBe('play');
    expect(chord(s, 0, 0, [])).toBe(false);   // revealed but adj === 0
    expect(s.cells[idx(s, 1, 1)].state).toBe('revealed');
    expect(chord(s, 1, 1, [])).toBe(false);   // a numbered cell with 0 flags around it
  });
});

/* ------------------------------ over & helpers ---------------------------- */

describe('lifecycle & helpers', () => {
  it('ignores actions once the game is over', () => {
    const s = build(3, 3, [4]);
    reveal(s, 1, 1, []); // boom
    expect(s.status).toBe('lost');
    expect(reveal(s, 0, 0, [])).toBe(false);
    expect(toggleFlag(s, 0, 0, [])).toBe(false);
    expect(chord(s, 0, 0, [])).toBe(false);
  });

  it('idx / inBounds / neighbours are correct', () => {
    const s = newGame(BEGINNER);
    expect(idx(s, 0, 0)).toBe(0);
    expect(idx(s, 2, 3)).toBe(21);
    expect(inBounds(s, -1, 0)).toBe(false);
    expect(inBounds(s, 0, 9)).toBe(false);
    expect(inBounds(s, 8, 8)).toBe(true);
    expect(neighbors(s, 0, 0).length).toBe(3);
    expect(neighbors(s, 0, 4).length).toBe(5);
    expect(neighbors(s, 4, 4).length).toBe(8);
  });

  it('restart clears the board and reuses the seed', () => {
    const s = newGame(BEGINNER, 55);
    reveal(s, 0, 0, []);
    restart(s, 55);
    expect(s.status).toBe('ready');
    expect(s.placed).toBe(false);
    expect(s.revealed).toBe(0);
    expect(s.cells.every((c) => c.state === 'hidden')).toBe(true);
    reveal(s, 0, 0, []);
    const ref = newGame(BEGINNER, 55); reveal(ref, 0, 0, []);
    expect(mineList(s)).toEqual(mineList(ref));
  });
});
