// Bubble Shooter — original engine for DominikOS (game #4). PURE TypeScript: NO DOM, NO React.
// All rules, geometry and state are plain data + functions so it unit-tests headlessly
// (engine.test.ts). Classic Puzzle-Bobble / Bubble-Shooter genre; every constant, the palette
// and the rank ladder are authored here — nothing sampled or copied from any product.
//
// ============================ CONTRACT (LOCKED) ============================
// The public API below is the contract the UI (BubbleApp.tsx) builds against. Implementations may
// add private helpers but MUST NOT change these signatures or semantics.
//
// Grid: rectangular backing store number[ROWS_MAX][COLS], grid[row][col] = color id or EMPTY(-1).
//   Offset "brick" hex grid. Parity = (row + rowOffset) & 1. EVEN-parity rows hold COLS cells
//   (x starts at R); ODD-parity rows are shifted +R and hold COLS-1 cells (their last column is
//   permanently EMPTY). Geometry & neighbors are pure functions of (state,row,col) via parity, so a
//   compression is a data down-shift + rowOffset flip — existing bubbles keep identical neighbors.
// Flow: phase 'aim' -> setAim/fire -> 'fly' -> step() integrates the circle (fixed substeps),
//   reflects off side walls, and on hitting a bubble/ceiling snaps to the nearest FREE cell adjacent
//   to the contact and resolves: a connected same-color group of >=3 pops (score); then bubbles no
//   longer connected to row 0 drop (bonus). Every SHOTS_PER_DROP shots a new row is pushed in; a
//   settled bubble crossing the danger line loses; clearing the board wins. Shooter colors are
//   drawn only from colors still present on the board.
// Events: fire()/step() append a GameEvent to a caller-owned array (same out-param model as
//   pinball physics.ts) so the UI plays tone() sfx and spawns pop/drop/score FX. Engine is silent.
// RNG: one 32-bit LCG on the state (Numerical-Recipes constants, upper-16-bit extraction, exactly
//   like pasjans) drives the initial fill, every current/next color pick and each pushed row. A
//   given seed replays byte-identically; unseeded (seed===undefined) uses Math.random.
// ==========================================================================

// -------------------------------- constants -------------------------------

export const COLS = 13;                     // cells in an EVEN-parity row (busier board)
// Backing-store height. Must be deep enough that a bubble can actually reach DANGER_Y: with R=15
// the first row whose center+R >= DANGER_Y(575) is row 21 (15 + 21*ROW_H + R = 575.6), so the
// store holds rows 0..21. (A shallower store would leave the danger line unreachable.)
export const ROWS_MAX = 22;                 // grid backing-store height (rows tracked)
export const ROWS_START = 8;                // packed rows dealt at newGame (denser = harder)
export const R = 15;                        // bubble radius, px (smaller + more columns = more bubbles)
export const D = 2 * R;                     // 30 — diameter == horizontal cell pitch
export const ROW_H = R * Math.sqrt(3);      // ~25.98 — vertical pitch (true hex packing)
export const FIELD_W = COLS * D;            // 390 — playfield width
export const FIELD_H = 620;                 // playfield height, px
export const WALL_L = R;                     // 15 — left reflect plane (center min x)
export const WALL_R = FIELD_W - R;           // 375 — right reflect plane (center max x)

export const COLOR_COUNT = 6;              // playable colors, ids 0..5
export const EMPTY = -1;                    // empty cell sentinel
export const MIN_CLUSTER = 3;              // pop threshold (>=3)
export const SHOTS_PER_DROP = 6;           // shots between top-row insertions

export const SHOOTER_X = FIELD_W / 2;       // 195
export const SHOOTER_Y = FIELD_H - R;       // 605 — muzzle just above the bottom
export const DANGER_Y = FIELD_H - D * 1.5;  // 575 — lose if a settled bubble center + R crosses this
export const SHOT_SPEED = 780;             // flying-bubble speed, px/s
export const SUBSTEPS = 4;                 // fixed integration substeps per step()

// Aim angle convention: radians from straight UP, signed; 0 = vertical, + = toward +x (right).
// Launch velocity: vx = sin(a)*speed, vy = -cos(a)*speed. Clamped to +/-MAX_AIM.
export const MAX_AIM = 1.30;               // ~74.5deg off vertical; beyond is unplayable

export const CONTACT = D * 0.92;           // 33.12 — center-distance contact threshold (slight overlap)

// Original palette (authored for DominikOS; NOT sampled from any product). Index === color id.
export const COLORS: readonly string[] = [
  '#e8483f', // 0 red
  '#f2a33c', // 1 amber
  '#f5d94a', // 2 yellow
  '#4fb85f', // 3 green
  '#3fa9e8', // 4 blue
  '#a866d8', // 5 purple
];

// Scoring
export const PTS_POP = 10;                  // per popped bubble
export const PTS_COMBO = 5;                 // extra per popped bubble beyond the 3rd
export const PTS_DROP = 20;                 // per dropped (disconnected) bubble

// Rank ladder — RANKS[i] is a string, indexed by state.rank (pinball idiom).
export const RANKS: readonly string[] = ['NOVICE', 'ROOKIE', 'SHOOTER', 'SHARPSHOOTER', 'ACE', 'LEGEND'];
export const RANK_AT: readonly number[] = [0, 1500, 4000, 8000, 15000, 25000];

// --------------------------------- types ----------------------------------

export type Phase = 'aim' | 'fly' | 'won' | 'lost';

export interface Cell { row: number; col: number; }

export interface Shot { x: number; y: number; vx: number; vy: number; color: number; }

/** Transient hand-off for the UI's pop/drop animations; engine only appends, never reads back. */
export interface FxBubble { row: number; col: number; x: number; y: number; color: number; }

export interface BubbleState {
  grid: number[][];        // [ROWS_MAX][COLS] color id or EMPTY. Odd-parity last col always EMPTY.
  rowOffset: number;       // 0/1 parity source; # of compressions mod 2
  descents: number;        // total rows pushed in (telemetry / pacing)
  current: number;         // color id loaded in the shooter
  next: number;            // previewed next color id
  angle: number;           // aim angle, radians from vertical, clamped +/-MAX_AIM
  phase: Phase;
  shot: Shot | null;       // non-null iff phase === 'fly'
  popping: FxBubble[];     // cells removed by a pop this shot (UI drains & animates)
  dropping: FxBubble[];    // cells that fell this shot (UI drains & animates)
  score: number;
  best: number;            // high score; UI seeds from localStorage, engine maxes it
  shotsUntilDrop: number;  // counts DOWN from SHOTS_PER_DROP; hits 0 => push row on resolve
  shotsFired: number;
  rank: number;            // index into RANKS
  seed: number;            // original seed (0 if unseeded); informational
  rng: number;             // live 32-bit LCG state
  seeded: boolean;         // false => Math.random path
}

export type GameEvent =
  | { type: 'shoot';  value: number; x: number; y: number }
  | { type: 'bounce'; value: number; x: number; y: number }
  | { type: 'land';   value: number; x: number; y: number; row: number; col: number }
  | { type: 'pop';    value: number; x: number; y: number; count: number }
  | { type: 'drop';   value: number; x: number; y: number; count: number }
  | { type: 'dud';    value: number; x: number; y: number }
  | { type: 'row';    value: number; x: number; y: number }
  | { type: 'swap';   value: number; x: number; y: number }
  | { type: 'win';    value: number; x: number; y: number }
  | { type: 'lose';   value: number; x: number; y: number };

// -------------------------------- private ---------------------------------

const NEIGH_EVEN = [[0, -1], [0, 1], [-1, -1], [-1, 0], [1, -1], [1, 0]] as const;
const NEIGH_ODD = [[0, -1], [0, 1], [-1, 0], [-1, 1], [1, 0], [1, 1]] as const;

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Cell hash — col is always < COLS (even-row max col = COLS-1), so r*COLS+c is unique. */
function keyOf(row: number, col: number): number {
  return row * COLS + col;
}

/** Upper-16-bit LCG draw (pasjans idiom); unseeded games fall back to Math.random. */
function randInt(s: BubbleState, bound: number): number {
  if (bound <= 0) return 0;
  if (!s.seeded) return Math.floor(Math.random() * bound);
  s.rng = (s.rng * 1664525 + 1013904223) >>> 0;
  return (s.rng >>> 16) % bound;
}

function addScore(s: BubbleState, pts: number): void {
  s.score += pts;
  s.best = Math.max(s.best, s.score);
  s.rank = rankFor(s.score);
}

function fxOf(s: BubbleState, cell: Cell): FxBubble {
  const p = cellToPixel(s, cell.row, cell.col);
  return { row: cell.row, col: cell.col, x: p.x, y: p.y, color: s.grid[cell.row][cell.col] };
}

/** Closest occupied cell whose center is within `thresh` of (x,y), else null. Deterministic:
 *  nearest wins, ties break to the first in row-major order. Scans only rows near y. */
function nearestOccupiedWithin(s: BubbleState, x: number, y: number, thresh: number): Cell | null {
  const guess = Math.floor((y - R) / ROW_H);
  const r0 = Math.max(0, guess - 2);
  const r1 = Math.min(ROWS_MAX - 1, guess + 2);
  let best: Cell | null = null;
  let bestD2 = thresh * thresh;
  for (let row = r0; row <= r1; row++) {
    const n = colsInRow(s, row);
    for (let col = 0; col < n; col++) {
      if (s.grid[row][col] === EMPTY) continue;
      const p = cellToPixel(s, row, col);
      const d2 = (x - p.x) ** 2 + (y - p.y) ** 2;
      if (d2 < bestD2) { bestD2 = d2; best = { row, col }; }
    }
  }
  return best;
}

/** Globally-nearest EMPTY in-bounds cell to (x,y). Seeded from pixelToCell, widening to a full
 *  scan only if the local window is somehow ringed in. Never returns an occupied/OOB cell. */
function nearestFreeCell(s: BubbleState, x: number, y: number): Cell {
  const seed = pixelToCell(s, x, y);
  let best: Cell | null = null;
  let bestD2 = Infinity;
  const consider = (row: number, col: number): void => {
    if (!inBounds(s, row, col) || s.grid[row][col] !== EMPTY) return;
    const p = cellToPixel(s, row, col);
    const d2 = (x - p.x) ** 2 + (y - p.y) ** 2;
    if (d2 < bestD2) { bestD2 = d2; best = { row, col }; }
  };
  for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) consider(seed.row + dr, seed.col + dc);
  if (best) return best;
  for (let row = 0; row < ROWS_MAX; row++) for (let col = 0; col < COLS; col++) consider(row, col);
  return best ?? { row: 0, col: 0 };
}

/** Nearest FREE cell adjacent to the contact (a bubble hit, or the ceiling). */
function snapCell(s: BubbleState, b: Shot, hit: 'ceiling' | Cell): Cell {
  if (hit === 'ceiling') {
    let best: Cell | null = null;
    let bestDx = Infinity;
    const n = colsInRow(s, 0);
    for (let c = 0; c < n; c++) {
      if (s.grid[0][c] !== EMPTY) continue;
      const dx = Math.abs(b.x - cellToPixel(s, 0, c).x);
      if (dx < bestDx) { bestDx = dx; best = { row: 0, col: c }; }
    }
    return best ?? nearestFreeCell(s, b.x, b.y);
  }
  let best: Cell | null = null;
  let bestD2 = Infinity;
  for (const nb of neighbors(s, hit.row, hit.col)) {
    if (s.grid[nb.row][nb.col] !== EMPTY) continue;
    const p = cellToPixel(s, nb.row, nb.col);
    const d2 = (b.x - p.x) ** 2 + (b.y - p.y) ** 2;
    if (d2 < bestD2) { bestD2 = d2; best = nb; }
  }
  return best ?? nearestFreeCell(s, b.x, b.y);
}

/** A color id drawn (LCG) from the live palette; falls back to any color if the board is empty. */
function pickFillColor(s: BubbleState): number {
  const pal = livePalette(s);
  if (pal.length === 0) return randInt(s, COLOR_COUNT);
  return pal[randInt(s, pal.length)];
}

/** Shift color data down one row, flip parity so bubbles keep neighbors, deal a fresh top row. */
function pushTopRow(s: BubbleState, events: GameEvent[]): void {
  for (let r = ROWS_MAX - 1; r >= 1; r--) {
    for (let c = 0; c < COLS; c++) s.grid[r][c] = s.grid[r - 1][c];
  }
  s.rowOffset ^= 1;
  s.descents++;
  const n0 = colsInRow(s, 0);
  for (let c = 0; c < n0; c++) s.grid[0][c] = pickFillColor(s);
  for (let c = n0; c < COLS; c++) s.grid[0][c] = EMPTY; // inert tail on an odd top row
  events.push({ type: 'row', value: 0, x: SHOOTER_X, y: R });
}

/** pop / drop / score / win / compress / lose / reload — ORDER IS FIXED. */
function resolveLanding(s: BubbleState, landed: Cell, events: GameEvent[]): void {
  const p = cellToPixel(s, landed.row, landed.col);
  const cluster = clusterAt(s, landed.row, landed.col);
  if (cluster.length >= MIN_CLUSTER) {
    for (const cell of cluster) { s.popping.push(fxOf(s, cell)); s.grid[cell.row][cell.col] = EMPTY; }
    const pts = cluster.length * PTS_POP + Math.max(0, cluster.length - 3) * PTS_COMBO;
    addScore(s, pts);
    events.push({ type: 'pop', value: pts, count: cluster.length, x: p.x, y: p.y });
    const floaters = floatingCells(s);
    if (floaters.length > 0) {
      for (const cell of floaters) { s.dropping.push(fxOf(s, cell)); s.grid[cell.row][cell.col] = EMPTY; }
      const dpts = floaters.length * PTS_DROP;
      addScore(s, dpts);
      events.push({ type: 'drop', value: dpts, count: floaters.length, x: p.x, y: p.y });
    }
  } else {
    events.push({ type: 'dud', value: 0, x: p.x, y: p.y });
  }

  if (isCleared(s)) { s.phase = 'won'; events.push({ type: 'win', value: s.score, x: SHOOTER_X, y: SHOOTER_Y }); return; }

  if (s.shotsUntilDrop <= 0) {
    pushTopRow(s, events);
    s.shotsUntilDrop = SHOTS_PER_DROP;
  }

  if (crossedDanger(s)) { s.phase = 'lost'; events.push({ type: 'lose', value: s.score, x: SHOOTER_X, y: SHOOTER_Y }); return; }

  // Reload. The stored `next` was sampled at a PRIOR resolve, so this shot's pop may have removed
  // the last of its colour — re-validate the promoted `current` against the live palette so we
  // never hand the player a guaranteed-dud dead colour (contract §20). Board is non-empty here
  // (isCleared already won above), so a re-pick always yields a live colour.
  s.current = s.next;
  s.next = pickShooterColor(s);
  if (!livePalette(s).includes(s.current)) s.current = pickShooterColor(s);
  s.phase = 'aim';
}

// ------------------------------ public API --------------------------------

/** Deterministic new game: fills ROWS_START rows; phase 'aim'; current/next from the live palette. */
export function newGame(seed?: number, best?: number): BubbleState {
  const s: BubbleState = {
    grid: Array.from({ length: ROWS_MAX }, () => new Array<number>(COLS).fill(EMPTY)),
    rowOffset: 0,
    descents: 0,
    current: 0,
    next: 0,
    angle: 0,
    phase: 'aim',
    shot: null,
    popping: [],
    dropping: [],
    score: 0,
    best: best ?? 0,
    shotsUntilDrop: SHOTS_PER_DROP,
    shotsFired: 0,
    rank: 0,
    seed: seed ?? 0,
    rng: (seed ?? 0) >>> 0,
    seeded: seed !== undefined,
  };
  for (let row = 0; row < ROWS_START; row++) {
    const n = colsInRow(s, row);
    for (let col = 0; col < n; col++) s.grid[row][col] = randInt(s, COLOR_COUNT);
  }
  s.current = pickShooterColor(s);
  s.next = pickShooterColor(s);
  return s;
}

/** In-place reset; reuses the same seed unless a new one is given; preserves `best`. */
export function restart(state: BubbleState, seed?: number): void {
  const useSeed = seed !== undefined ? seed : state.seeded ? state.seed : undefined;
  Object.assign(state, newGame(useSeed, state.best));
}

/** Clamp to +/-MAX_AIM and store on state.angle. No-op unless phase==='aim'. */
export function setAim(state: BubbleState, angle: number): void {
  if (state.phase !== 'aim') return;
  state.angle = clamp(angle, -MAX_AIM, MAX_AIM);
}

/** setAim(state, state.angle + delta). For keyboard rotate. */
export function nudgeAim(state: BubbleState, delta: number): void {
  setAim(state, state.angle + delta);
}

/** Angle (radians from vertical, + = right) from the muzzle toward (px,py), clamped. Pure. */
export function aimFromPointer(px: number, py: number): number {
  return clamp(Math.atan2(px - SHOOTER_X, -(py - SHOOTER_Y)), -MAX_AIM, MAX_AIM);
}

/** Preview polyline from the muzzle through wall reflections to first bubble/ceiling contact.
 *  Uses the SAME planes + CONTACT test as step(). PURE, never mutates. */
export function aimPath(state: BubbleState): { x: number; y: number }[] {
  const a = clamp(state.angle, -MAX_AIM, MAX_AIM);
  let x = SHOOTER_X;
  let y = SHOOTER_Y;
  let vx = Math.sin(a);
  let vy = -Math.cos(a);
  const pts: { x: number; y: number }[] = [{ x, y }];
  const STEP = 2;
  for (let i = 0; i < 3000; i++) {
    x += vx * STEP;
    y += vy * STEP;
    if (x < WALL_L) { x = 2 * WALL_L - x; vx = -vx; pts.push({ x, y }); }
    if (x > WALL_R) { x = 2 * WALL_R - x; vx = -vx; pts.push({ x, y }); }
    if (y - R <= 0) { pts.push({ x, y: R }); break; }
    if (nearestOccupiedWithin(state, x, y, CONTACT)) { pts.push({ x, y }); break; }
  }
  return pts;
}

/** aim -> fly. Spawns state.shot at the muzzle along state.angle; shotsUntilDrop--; pushes 'shoot'. */
export function fire(state: BubbleState, events: GameEvent[]): boolean {
  if (state.phase !== 'aim' || isCleared(state)) return false;
  const a = clamp(state.angle, -MAX_AIM, MAX_AIM);
  state.shot = {
    x: SHOOTER_X, y: SHOOTER_Y,
    vx: Math.sin(a) * SHOT_SPEED,
    vy: -Math.cos(a) * SHOT_SPEED,
    color: state.current,
  };
  state.phase = 'fly';
  state.shotsFired++;
  state.shotsUntilDrop--;
  events.push({ type: 'shoot', value: state.current, x: SHOOTER_X, y: SHOOTER_Y });
  return true;
}

/** Advance the flying bubble by dt in SUBSTEPS fixed substeps; reflect off side walls; on
 *  bubble/ceiling contact snap to the nearest free adjacent cell and resolve. No-op unless 'fly'. */
export function step(state: BubbleState, dt: number, events: GameEvent[]): void {
  if (state.phase !== 'fly' || !state.shot) return;
  const b = state.shot;
  const sub = dt / SUBSTEPS;
  for (let i = 0; i < SUBSTEPS; i++) {
    b.x += b.vx * sub;
    b.y += b.vy * sub;
    if (b.x < WALL_L) { b.x = 2 * WALL_L - b.x; b.vx = -b.vx; events.push({ type: 'bounce', value: 0, x: b.x, y: b.y }); }
    if (b.x > WALL_R) { b.x = 2 * WALL_R - b.x; b.vx = -b.vx; events.push({ type: 'bounce', value: 0, x: b.x, y: b.y }); }
    const ceiling = b.y - R <= 0;
    const hit = nearestOccupiedWithin(state, b.x, b.y, CONTACT);
    if (ceiling || hit) {
      const target = snapCell(state, b, ceiling ? 'ceiling' : hit!);
      state.grid[target.row][target.col] = b.color;
      const p = cellToPixel(state, target.row, target.col);
      events.push({ type: 'land', value: b.color, x: p.x, y: p.y, row: target.row, col: target.col });
      state.shot = null;
      resolveLanding(state, target, events);
      return;
    }
  }
}

/** Exchange current<->next; push 'swap'. No-op unless phase==='aim'. */
export function swap(state: BubbleState, events: GameEvent[]): void {
  if (state.phase !== 'aim') return;
  const t = state.current;
  state.current = state.next;
  state.next = t;
  events.push({ type: 'swap', value: state.current, x: SHOOTER_X, y: SHOOTER_Y });
}

/** Distinct color ids currently on the board, ascending. */
export function livePalette(state: BubbleState): number[] {
  const set = new Set<number>();
  for (let row = 0; row < ROWS_MAX; row++) {
    const n = colsInRow(state, row);
    for (let col = 0; col < n; col++) {
      const v = state.grid[row][col];
      if (v !== EMPTY) set.add(v);
    }
  }
  return [...set].sort((a, b) => a - b);
}

/** A color id sampled via the LCG from the live palette (or 0 if the board is empty). */
export function pickShooterColor(state: BubbleState): number {
  const pal = livePalette(state);
  if (pal.length === 0) return 0;
  return pal[randInt(state, pal.length)];
}

// ---- pure geometry / queries (exported for tests + renderer) ----

export function parity(state: BubbleState, row: number): number {
  return (row + state.rowOffset) & 1;
}

export function colsInRow(state: BubbleState, row: number): number {
  return parity(state, row) ? COLS - 1 : COLS;
}

export function inBounds(state: BubbleState, row: number, col: number): boolean {
  return row >= 0 && row < ROWS_MAX && col >= 0 && col < colsInRow(state, row);
}

export function cellToPixel(state: BubbleState, row: number, col: number): { x: number; y: number } {
  const shift = parity(state, row) ? R : 0;
  return { x: R + col * D + shift, y: R + row * ROW_H };
}

/** Nearest cell to (x,y): row first, then that row's shift-aware column. Clamped in-bounds. */
export function pixelToCell(state: BubbleState, x: number, y: number): Cell {
  let row = Math.round((y - R) / ROW_H);
  row = Math.max(0, Math.min(ROWS_MAX - 1, row));
  const shift = parity(state, row) ? R : 0;
  let col = Math.round((x - R - shift) / D);
  col = Math.max(0, Math.min(colsInRow(state, row) - 1, col));
  return { row, col };
}

/** Up-to-6 in-bounds hex neighbors (parity-aware). */
export function neighbors(state: BubbleState, row: number, col: number): Cell[] {
  const set = parity(state, row) ? NEIGH_ODD : NEIGH_EVEN;
  const out: Cell[] = [];
  for (const [dr, dc] of set) {
    const r = row + dr;
    const c = col + dc;
    if (inBounds(state, r, c)) out.push({ row: r, col: c });
  }
  return out;
}

/** Same-color connected component including the start cell (empty start -> []). */
export function clusterAt(state: BubbleState, row: number, col: number): Cell[] {
  const color = state.grid[row][col];
  if (color === EMPTY) return [];
  const seen = new Set<number>([keyOf(row, col)]);
  const stack: Cell[] = [{ row, col }];
  const out: Cell[] = [];
  while (stack.length) {
    const cur = stack.pop()!;
    out.push(cur);
    for (const nb of neighbors(state, cur.row, cur.col)) {
      const k = keyOf(nb.row, nb.col);
      if (!seen.has(k) && state.grid[nb.row][nb.col] === color) {
        seen.add(k);
        stack.push(nb);
      }
    }
  }
  return out;
}

/** Occupied cells NOT connected (any-color) to a row-0 bubble — i.e. floating, they drop. */
export function floatingCells(state: BubbleState): Cell[] {
  const supported = new Set<number>();
  const stack: Cell[] = [];
  const n0 = colsInRow(state, 0);
  for (let c = 0; c < n0; c++) {
    if (state.grid[0][c] !== EMPTY) { supported.add(keyOf(0, c)); stack.push({ row: 0, col: c }); }
  }
  while (stack.length) {
    const cur = stack.pop()!;
    for (const nb of neighbors(state, cur.row, cur.col)) {
      const k = keyOf(nb.row, nb.col);
      if (!supported.has(k) && state.grid[nb.row][nb.col] !== EMPTY) {
        supported.add(k);
        stack.push(nb);
      }
    }
  }
  const out: Cell[] = [];
  for (let row = 0; row < ROWS_MAX; row++) {
    const n = colsInRow(state, row);
    for (let col = 0; col < n; col++) {
      if (state.grid[row][col] !== EMPTY && !supported.has(keyOf(row, col))) out.push({ row, col });
    }
  }
  return out;
}

/** Any occupied cell whose center + R reaches the danger line. */
export function crossedDanger(state: BubbleState): boolean {
  for (let row = 0; row < ROWS_MAX; row++) {
    const n = colsInRow(state, row);
    for (let col = 0; col < n; col++) {
      if (state.grid[row][col] === EMPTY) continue;
      if (cellToPixel(state, row, col).y + R >= DANGER_Y) return true;
    }
  }
  return false;
}

/** No occupied cells anywhere. */
export function isCleared(state: BubbleState): boolean {
  for (let row = 0; row < ROWS_MAX; row++) {
    const n = colsInRow(state, row);
    for (let col = 0; col < n; col++) if (state.grid[row][col] !== EMPTY) return false;
  }
  return true;
}

/** Highest RANK_AT index whose threshold is <= score. */
export function rankFor(score: number): number {
  let r = 0;
  for (let i = 0; i < RANK_AT.length; i++) if (score >= RANK_AT[i]) r = i;
  return r;
}
