// FreeCell — pure rules engine. NO DOM, NO React: everything here is plain data + functions so
// it unit-tests headlessly (see engine.test.ts). Self-contained (does not import the pasjans
// engine) but structurally compatible with ../pasjans/cards' Card/Suit shape so the UNMODIFIED
// pasjans card renderer can draw our cards too.
//
// ============================ CONTRACT (LOCKED) ============================
// The public API below is the locked contract the UI builds against. Implementations may
// add private helpers but MUST NOT change these signatures or semantics.
//
// Rules:
//  · deal: 52 cards dealt ONE AT A TIME, round-robin across 8 tableau columns → columns 0-3
//    land at 7 cards, columns 4-7 at 6; every card is dealt face-up (FreeCell has no stock).
//  · tableau builds DOWN in alternating colors; ANY column (including empty ones) accepts a
//    legal card or run — there is no King-only rule for empty columns (unlike Klondike).
//  · foundations build UP per suit from Ace; only a single top card ever lands on one.
//  · a free cell holds exactly one card; only a single exposed card may enter an empty one.
//  · supermove capacity: maxMovable = (freeCellsFree + 1) * 2^emptyColumns. When the
//    DESTINATION is itself an empty column, that column is excluded from the multiplier:
//    (freeCellsFree + 1) * 2^(emptyColumns − 1). A multi-card tableau→tableau move additionally
//    requires the moving cards to already form a valid descending alternating-color run.
//  · scoring: +10 for any card landed on a foundation; every other legal move scores 0
//    (FreeCell has no stock/waste/flip/recycle events to score, unlike Klondike).
//  · won when all four foundations hold 13 cards.
//  · undo: full-snapshot history (score/moves included), capped at 100 entries.
// ==========================================================================

export type Suit = 'S' | 'H' | 'D' | 'C';

export interface Card {
  id: number;       // 0..51, stable per game
  suit: Suit;
  rank: number;     // 1 (Ace) .. 13 (King)
  faceUp: boolean;  // always true in FreeCell — kept only for structural parity with ../pasjans/cards
}

export type PileRef =
  | { pile: 'free'; index: number }        // 0..3
  | { pile: 'foundation'; index: number }  // 0..3
  | { pile: 'tableau'; index: number };    // 0..7

export interface GameState {
  freeCells: (Card | null)[];  // 4 slots, each holding at most one card
  foundations: Card[][];       // 4 piles, top = last element
  tableau: Card[][];           // 8 columns, bottom-to-top order (last = exposed top)
  score: number;
  moves: number;
  won: boolean;
  history: string[];           // undo snapshots (JSON of state sans history); private-ish
}

export const isRed = (s: Suit): boolean => s === 'H' || s === 'D';

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

const SUITS: readonly Suit[] = ['S', 'H', 'D', 'C'];
const HISTORY_CAP = 100;
const FREE_CELLS = 4;
const FOUNDATIONS = 4;
const TABLEAU_COLS = 8;

function samePile(a: PileRef, b: PileRef): boolean {
  return a.pile === b.pile && a.index === b.index;
}

/** Undo snapshot — everything EXCEPT the history array itself. */
function snapshot(state: GameState): string {
  return JSON.stringify({
    freeCells: state.freeCells,
    foundations: state.foundations,
    tableau: state.tableau,
    score: state.score,
    moves: state.moves,
    won: state.won,
  });
}

/** Called right BEFORE every successful mutating action. Oldest entries drop past the cap. */
function pushHistory(state: GameState): void {
  state.history.push(snapshot(state));
  if (state.history.length > HISTORY_CAP) state.history.shift();
}

/** Every score change funnels through here so the never-below-zero rule holds everywhere. */
function bumpScore(state: GameState, delta: number): void {
  state.score = Math.max(0, state.score + delta);
}

/** The cards a move would carry, bottom-of-run first, or null when nothing legal sits there.
 *  Free cells and foundations only ever yield a single card at their one meaningful index;
 *  a tableau source yields the whole suffix from cardIndex to the column top (a "run",
 *  possibly of length 1) — legality of that run as a UNIT is checked by the caller. */
function movingRun(state: GameState, from: PileRef, cardIndex: number): Card[] | null {
  if (from.pile === 'free') {
    if (from.index < 0 || from.index >= FREE_CELLS) return null;
    const c = state.freeCells[from.index];
    return c && cardIndex === 0 ? [c] : null;
  }
  if (from.pile === 'tableau') {
    if (from.index < 0 || from.index >= TABLEAU_COLS) return null;
    const pile = state.tableau[from.index];
    if (cardIndex < 0 || cardIndex >= pile.length) return null;
    return pile.slice(cardIndex);
  }
  return null; // foundations are never a move SOURCE — cards only ever leave via undo
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** New shuffled game. `seed` (tests) drives a deterministic LCG Fisher-Yates shuffle. */
export function newGame(seed?: number): GameState {
  // Fresh pack: id = suitIndex*13 + (rank−1), suits S,H,D,C, ranks A..K.
  const deck: Card[] = [];
  for (let s = 0; s < 4; s++) {
    for (let r = 1; r <= 13; r++) {
      deck.push({ id: s * 13 + (r - 1), suit: SUITS[s], rank: r, faceUp: true });
    }
  }

  // Fisher-Yates. Seeded games use a 32-bit LCG (the classic Numerical-Recipes constants);
  // the LOW bits of an LCG are weak, so indices come from the upper 16. No seed → Math.random.
  let lcg = (seed ?? 0) >>> 0;
  const pick = (bound: number): number => {
    if (seed === undefined) return Math.floor(Math.random() * bound);
    lcg = (lcg * 1664525 + 1013904223) >>> 0;
    return (lcg >>> 16) % bound;
  };
  for (let i = deck.length - 1; i > 0; i--) {
    const j = pick(i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  // Deal one at a time, round-robin over 8 columns: 52 = 6*8 + 4, so the first four columns
  // (residues 0-3 of the deal index) end up with the extra card — 7/7/7/7/6/6/6/6.
  const tableau: Card[][] = Array.from({ length: TABLEAU_COLS }, () => [] as Card[]);
  for (let i = 0; i < deck.length; i++) {
    tableau[i % TABLEAU_COLS].push(deck[i]);
  }

  return {
    freeCells: [null, null, null, null],
    foundations: [[], [], [], []],
    tableau,
    score: 0,
    moves: 0,
    won: false,
    history: [],
  };
}

/** Supermove capacity for a move landing at `to`: (free cells open + 1) * 2^(empty columns),
 *  EXCLUDING the destination itself from the empty-column count when it is one. Exported so
 *  tests can exercise the formula directly against hand-built states. */
export function maxMovable(state: GameState, to: PileRef): number {
  const freeCellsFree = state.freeCells.filter((c) => c === null).length;
  let emptyColumns = state.tableau.filter((col) => col.length === 0).length;
  const destIsEmptyColumn = to.pile === 'tableau' && state.tableau[to.index].length === 0;
  if (destIsEmptyColumn) emptyColumns -= 1;
  return (freeCellsFree + 1) * Math.pow(2, emptyColumns);
}

/** Pure legality check — never mutates. cardIndex is the index INTO the source pile array
 *  (for 'free' sources, the only legal value is 0 — a free cell holds a single card). */
export function canMoveStack(state: GameState, from: PileRef, cardIndex: number, to: PileRef): boolean {
  if (samePile(from, to)) return false; // a pile onto itself is a no-op, not a move
  const run = movingRun(state, from, cardIndex);
  if (!run || run.length === 0) return false;

  if (to.pile === 'free') {
    if (to.index < 0 || to.index >= FREE_CELLS) return false;
    return run.length === 1 && state.freeCells[to.index] === null;
  }

  if (to.pile === 'foundation') {
    if (to.index < 0 || to.index >= FOUNDATIONS) return false;
    if (run.length !== 1) return false; // foundations only ever take a single exposed card
    const pile = state.foundations[to.index];
    const moving = run[0];
    const top = pile[pile.length - 1];
    if (!top) return moving.rank === 1;
    return top.suit === moving.suit && moving.rank === top.rank + 1;
  }

  // to.pile === 'tableau'
  if (to.index < 0 || to.index >= TABLEAU_COLS) return false;
  // the run must already be a valid descending alternating-color sequence to travel as a unit
  for (let i = 1; i < run.length; i++) {
    const prev = run[i - 1];
    const cur = run[i];
    if (cur.rank !== prev.rank - 1 || isRed(cur.suit) === isRed(prev.suit)) return false;
  }
  if (run.length > maxMovable(state, to)) return false;

  const destPile = state.tableau[to.index];
  const top = destPile[destPile.length - 1];
  if (!top) return true; // any legal run may open an empty column — capacity already checked
  const lead = run[0];
  return lead.rank === top.rank - 1 && isRed(lead.suit) !== isRed(top.suit);
}

/** Perform a move (validates via canMoveStack). Mutates, scores, moves++. Undoable. */
export function moveStack(state: GameState, from: PileRef, cardIndex: number, to: PileRef): boolean {
  if (!canMoveStack(state, from, cardIndex, to)) return false;
  pushHistory(state);

  let moving: Card[];
  if (from.pile === 'free') {
    moving = [state.freeCells[from.index]!];
    state.freeCells[from.index] = null;
  } else {
    moving = state.tableau[from.index].splice(cardIndex);
  }

  if (to.pile === 'free') {
    state.freeCells[to.index] = moving[0];
  } else if (to.pile === 'foundation') {
    state.foundations[to.index].push(moving[0]);
    bumpScore(state, 10);
  } else {
    state.tableau[to.index].push(...moving);
  }

  state.moves += 1;
  if (isWon(state)) state.won = true;
  return true;
}

/** Double-click / keyboard "send up" helper: the foundation a single exposed card can fly to
 *  right now, else null. Never mutates. */
export function autoMoveTarget(state: GameState, from: PileRef, cardIndex: number): PileRef | null {
  const run = movingRun(state, from, cardIndex);
  if (!run || run.length !== 1) return null;
  for (let i = 0; i < FOUNDATIONS; i++) {
    const to: PileRef = { pile: 'foundation', index: i };
    if (canMoveStack(state, from, cardIndex, to)) return to;
  }
  return null;
}

/** The length of the maximal descending alternating-color run sitting at a tableau column's
 *  top — the largest unit that could ever move off it in one go. UI convenience (keyboard
 *  pickup grabs this whole run, mirroring how a klondike column exposes one face-up run). */
export function movableRunLength(state: GameState, tableauIndex: number): number {
  const pile = state.tableau[tableauIndex];
  if (pile.length === 0) return 0;
  let n = 1;
  for (let i = pile.length - 1; i > 0; i--) {
    const cur = pile[i];
    const prev = pile[i - 1];
    if (cur.rank === prev.rank - 1 && isRed(cur.suit) !== isRed(prev.suit)) n++;
    else break;
  }
  return n;
}

export function isWon(state: GameState): boolean {
  return state.foundations.every((f) => f.length === 13);
}

/** Restore the previous snapshot (incl. score/moves). False when history is empty. */
export function undo(state: GameState): boolean {
  const snap = state.history.pop();
  if (snap === undefined) return false;
  const prev = JSON.parse(snap) as Omit<GameState, 'history'>;
  state.freeCells = prev.freeCells;
  state.foundations = prev.foundations;
  state.tableau = prev.tableau;
  state.score = prev.score;
  state.moves = prev.moves;
  state.won = prev.won;
  return true;
}
