// Minesweeper — original grid-logic engine for DominikOS (game #6). PURE TypeScript: NO DOM, NO
// React. Plain-data state + functions, unit-tested headlessly (engine.test.ts). Classic mine-finding
// genre; every constant, the number palette and the difficulty presets are authored here — nothing
// sampled or copied.
//
// ============================ CONTRACT (LOCKED) ============================
// The public API below is the contract the UI (MinesApp.tsx) builds against.
//
// Board: cells[] length w*h, ROW-MAJOR (index = r*w + c). Each cell = { mine, adj, state }, where
//   state in 'hidden'|'revealed'|'flagged'|'question'. Mines are placed LAZILY on the FIRST reveal so
//   that cell AND its 8 neighbours are guaranteed mine-free (first-click-safe). adj = # of the up-to-8
//   neighbouring mines, computed once after placement.
// Flow: 'ready' (no mines yet) -> first reveal() places mines + -> 'play' -> reveal/flag/chord until a
//   mine is revealed ('lost', all mines shown) or every non-mine cell is revealed ('won').
// Events: reveal()/toggleFlag()/chord() append GameEvents to a caller-owned array (out-param model,
//   like the other engines) so the UI plays tone() sfx + updates the smiley/live-region. Engine silent.
// RNG: one 32-bit LCG on the state (Numerical-Recipes constants, upper-16-bit extraction, exactly like
//   pasjans/bubble/flappy) shuffles the mine positions. seed + first-click cell -> byte-identical board.
// ==========================================================================

// -------------------------------- constants -------------------------------

export interface Difficulty { w: number; h: number; mines: number; }
export const BEGINNER: Difficulty = { w: 9, h: 9, mines: 10 };
export const INTERMEDIATE: Difficulty = { w: 16, h: 16, mines: 40 };
export const EXPERT: Difficulty = { w: 30, h: 16, mines: 99 };
export const MIN_W = 5, MIN_H = 5, MAX_W = 30, MAX_H = 24;
export const MAX_TIME = 999; // UI clock cap (the engine itself is timeless)

// Classic functional number colours (a convention, not copyrightable) — index === adjacency count.
export const NUMBER_COLORS: readonly string[] = [
  '',        // 0 (blank)
  '#0000ff', // 1 blue
  '#008000', // 2 green
  '#ff0000', // 3 red
  '#000080', // 4 navy
  '#800000', // 5 maroon
  '#008080', // 6 teal
  '#000000', // 7 black
  '#808080', // 8 grey
];

// --------------------------------- types ----------------------------------

export type CellState = 'hidden' | 'revealed' | 'flagged' | 'question';
export type Status = 'ready' | 'play' | 'won' | 'lost';

export interface Cell { mine: boolean; adj: number; state: CellState; }

export interface MineState {
  w: number; h: number; mines: number;
  cells: Cell[];            // w*h, row-major
  status: Status;
  flags: number;            // # flagged cells
  revealed: number;         // # revealed cells
  placed: boolean;          // mines placed yet?
  boom: number;             // index of the fatal mine, else -1
  allowMarks: boolean;      // '?' cycle enabled
  seed: number; rng: number; seeded: boolean;
}

export type GameEvent =
  | { type: 'reveal'; count: number }
  | { type: 'flag'; index: number; on: boolean }
  | { type: 'chord'; index: number }
  | { type: 'boom'; index: number }
  | { type: 'win' }
  | { type: 'lose' };

// -------------------------------- private ---------------------------------

function randInt(s: MineState, bound: number): number {
  if (bound <= 0) return 0;
  if (!s.seeded) return Math.floor(Math.random() * bound);
  s.rng = (s.rng * 1664525 + 1013904223) >>> 0;
  return (s.rng >>> 16) % bound;
}

/** Place mines avoiding the first-clicked cell and its 8 neighbours; then compute all adjacencies. */
function placeMines(s: MineState, safeR: number, safeC: number): void {
  const safe = new Set<number>([idx(s, safeR, safeC)]);
  for (const nb of neighbors(s, safeR, safeC)) safe.add(nb);
  const pool: number[] = [];
  for (let i = 0; i < s.cells.length; i++) if (!safe.has(i)) pool.push(i);
  const n = Math.min(s.mines, pool.length); // fallback for tiny/over-mined custom boards
  for (let i = pool.length - 1; i > 0; i--) { // seeded Fisher-Yates
    const j = randInt(s, i + 1);
    const t = pool[i]; pool[i] = pool[j]; pool[j] = t;
  }
  for (let k = 0; k < n; k++) s.cells[pool[k]].mine = true;
  s.mines = n;
  for (let r = 0; r < s.h; r++) {
    for (let c = 0; c < s.w; c++) {
      let a = 0;
      for (const nb of neighbors(s, r, c)) if (s.cells[nb].mine) a++;
      s.cells[idx(s, r, c)].adj = a;
    }
  }
  s.placed = true;
}

/** Flag every still-covered mine (called on a win so the counter reads zero). */
function autoFlag(s: MineState): void {
  for (const cell of s.cells) if (cell.mine && cell.state !== 'flagged') cell.state = 'flagged';
  s.flags = s.mines;
}

// ------------------------------ public API --------------------------------

/** All-hidden 'ready' board (no mines yet). seed -> deterministic placement on the first reveal. */
export function newGame(cfg: Difficulty & { allowMarks?: boolean }, seed?: number): MineState {
  const cells: Cell[] = [];
  for (let i = 0; i < cfg.w * cfg.h; i++) cells.push({ mine: false, adj: 0, state: 'hidden' });
  return {
    w: cfg.w, h: cfg.h, mines: cfg.mines,
    cells,
    status: 'ready',
    flags: 0,
    revealed: 0,
    placed: false,
    boom: -1,
    allowMarks: cfg.allowMarks ?? false,
    seed: seed ?? 0,
    rng: (seed ?? 0) >>> 0,
    seeded: seed !== undefined,
  };
}

/** In-place reset to a fresh board with the same config; reuses the seed unless a new one is given. */
export function restart(state: MineState, seed?: number): void {
  const useSeed = seed !== undefined ? seed : state.seeded ? state.seed : undefined;
  Object.assign(state, newGame({ w: state.w, h: state.h, mines: state.mines, allowMarks: state.allowMarks }, useSeed));
}

/** Reveal (r,c). First reveal places mines (first-click-safe). Flood-fills zero-regions. */
export function reveal(state: MineState, r: number, c: number, ev: GameEvent[]): boolean {
  if (state.status === 'won' || state.status === 'lost') return false;
  if (!inBounds(state, r, c)) return false;
  if (!state.placed) { placeMines(state, r, c); state.status = 'play'; }
  const start = idx(state, r, c);
  const cell = state.cells[start];
  if (cell.state !== 'hidden' && cell.state !== 'question') return false; // flagged/revealed -> ignore

  if (cell.mine) {
    cell.state = 'revealed';
    state.boom = start;
    for (const m of state.cells) if (m.mine && m.state !== 'flagged') m.state = 'revealed';
    state.status = 'lost';
    ev.push({ type: 'boom', index: start });
    ev.push({ type: 'lose' });
    return true;
  }

  // flood fill: open this cell; a 0-adj cell keeps opening its neighbours (never crosses a mine,
  // since a 0-adj cell has no mine neighbours). Flags block; question marks do not.
  let opened = 0;
  const stack: number[] = [start];
  while (stack.length) {
    const i = stack.pop()!;
    const cc = state.cells[i];
    if (cc.state === 'revealed' || cc.state === 'flagged') continue;
    cc.state = 'revealed';
    state.revealed++;
    opened++;
    if (cc.adj === 0) {
      const ir = Math.floor(i / state.w);
      const ic = i - ir * state.w;
      for (const nb of neighbors(state, ir, ic)) {
        const ns = state.cells[nb].state;
        if (ns === 'hidden' || ns === 'question') stack.push(nb);
      }
    }
  }
  ev.push({ type: 'reveal', count: opened });

  if (isWon(state)) { state.status = 'won'; autoFlag(state); ev.push({ type: 'win' }); }
  return true;
}

/** Cycle a covered cell hidden -> flagged -> (question if allowMarks) -> hidden. */
export function toggleFlag(state: MineState, r: number, c: number, ev: GameEvent[]): boolean {
  if (state.status === 'won' || state.status === 'lost') return false;
  if (!inBounds(state, r, c)) return false;
  const i = idx(state, r, c);
  const cell = state.cells[i];
  if (cell.state === 'revealed') return false;
  if (cell.state === 'hidden') {
    cell.state = 'flagged'; state.flags++; ev.push({ type: 'flag', index: i, on: true });
  } else if (cell.state === 'flagged') {
    cell.state = state.allowMarks ? 'question' : 'hidden'; state.flags--; ev.push({ type: 'flag', index: i, on: false });
  } else {
    cell.state = 'hidden'; // question -> hidden
  }
  return true;
}

/** On a revealed number whose flagged-neighbour count === adj, reveal the other covered neighbours. */
export function chord(state: MineState, r: number, c: number, ev: GameEvent[]): boolean {
  if (state.status !== 'play') return false;
  if (!inBounds(state, r, c)) return false;
  const cell = state.cells[idx(state, r, c)];
  if (cell.state !== 'revealed' || cell.adj === 0) return false;
  const nbs = neighbors(state, r, c);
  let flagged = 0;
  for (const nb of nbs) if (state.cells[nb].state === 'flagged') flagged++;
  if (flagged !== cell.adj) return false;
  ev.push({ type: 'chord', index: idx(state, r, c) });
  for (const nb of nbs) {
    const ns = state.cells[nb].state;
    if (ns === 'hidden' || ns === 'question') {
      reveal(state, Math.floor(nb / state.w), nb % state.w, ev); // may detonate a mis-flagged mine
      if ((state.status as Status) === 'lost') break;
    }
  }
  return true;
}

// ---- pure helpers (exported for tests + UI) ----

export function idx(state: MineState, r: number, c: number): number {
  return r * state.w + c;
}

export function inBounds(state: MineState, r: number, c: number): boolean {
  return r >= 0 && r < state.h && c >= 0 && c < state.w;
}

/** Up-to-8 in-bounds neighbour indices of (r,c). */
export function neighbors(state: MineState, r: number, c: number): number[] {
  const out: number[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr, nc = c + dc;
      if (inBounds(state, nr, nc)) out.push(nr * state.w + nc);
    }
  }
  return out;
}

/** mines - flags (may be negative when over-flagged). */
export function remaining(state: MineState): number {
  return state.mines - state.flags;
}

/** True once every non-mine cell has been revealed. */
export function isWon(state: MineState): boolean {
  return state.revealed === state.w * state.h - state.mines;
}
