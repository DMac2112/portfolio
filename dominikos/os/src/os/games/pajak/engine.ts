// Pasjans Pająk (Spider solitaire) — pure rules engine. NO DOM, NO React: everything here is
// plain data + functions so it unit-tests headlessly (see engine.test.ts). Self-contained
// (does not import the pasjans engine) but structurally compatible with ../pasjans/cards' Card/
// Suit shape so the UNMODIFIED pasjans card renderer can draw our cards too.
//
// ============================ CONTRACT (LOCKED) ============================
// The public API below is the locked contract the UI builds against. Implementations may
// add private helpers but MUST NOT change these signatures or semantics.
//
// Rules:
//  · two decks, 104 cards, GLOBALLY UNIQUE ids 0..103 — ids are assigned once at deal time and
//    never reset, so both the undo snapshot and the UI's per-card element registry can key on id.
//  · suit composition depends on suitCount (default 1): 1 → 104 spades (8 copies of A..K),
//    2 → 52 spades + 52 hearts (4 copies each), 4 → two full 52-card decks (2 copies each suit).
//  · deal: 10 tableau columns; columns 0-3 get 6 cards, columns 4-9 get 5 (54 total), only the
//    top card of each column face-up; the remaining 50 go to the stock, face-down.
//  · tableau builds DOWN one rank at a time regardless of suit/color (so a King can only ever
//    land on an empty column — nothing outranks it). Only a SAME-SUIT descending run may travel
//    as a multi-card unit; a mixed-suit run is never a legal multi-card move (single cards off
//    it are still fine). Any single card, or a legal same-suit run, may move to an empty column.
//  · exposing a face-down tableau card (by moving cards off it, or by a run auto-completing)
//    flips it face-up automatically.
//  · a King-to-Ace same-suit run sitting face-up atop a column auto-removes to `completed`
//    (+1) the instant it forms — after a move OR after a stock deal — scoring +100.
//  · stock deal: blocked while any tableau column is empty; otherwise deals exactly one
//    face-up card onto the top of each of the 10 columns (50 cards = 5 deals).
//  · scoring: start at 500, −1 per move (a stock deal counts as one move), +100 per completed
//    run. The score is not floored at 0 (a long unlucky game may go negative).
//  · won when completed === 8 (all eight runs cleared).
//  · undo: full-snapshot history (score/moves/completed included), capped at 100 entries.
//  · changing suitCount always starts a brand-new deal (newGame again).
// ==========================================================================

export type Suit = 'S' | 'H' | 'D' | 'C';

export interface Card {
  id: number;       // 0..103, stable per game — NEVER reset per "deck"
  suit: Suit;
  rank: number;     // 1 (Ace) .. 13 (King)
  faceUp: boolean;
}

/** Every move in Spider is tableau→tableau; the stock is dealt via dealStock(), never addressed
 *  as a move source/destination (mirrors pasjans treating its stock as click-only, from:null). */
export type PileRef = { pile: 'tableau'; index: number }; // 0..9

export interface GameState {
  tableau: Card[][];    // 10 columns, bottom-to-top order (last = exposed top)
  stock: Card[];         // face-down reserve, top = last element (50 at deal, in 5 blocks of 10)
  completed: number;     // 0..8 finished King-to-Ace same-suit runs
  suitCount: 1 | 2 | 4;
  score: number;
  moves: number;
  won: boolean;
  history: string[];     // undo snapshots (JSON of state sans history); private-ish
}

const TABLEAU_COLS = 10;
const HISTORY_CAP = 100;
const RUN_LEN = 13; // King..Ace

const SUITS_BY_COUNT: Record<1 | 2 | 4, readonly Suit[]> = {
  1: ['S'],
  2: ['S', 'H'],
  4: ['S', 'H', 'D', 'C'],
};

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/** Undo snapshot — everything EXCEPT the history array itself. */
function snapshot(state: GameState): string {
  return JSON.stringify({
    tableau: state.tableau,
    stock: state.stock,
    completed: state.completed,
    suitCount: state.suitCount,
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

/** A contiguous same-suit, one-rank-apart-descending sequence (single card always qualifies). */
function isUniformRun(cards: readonly Card[]): boolean {
  for (let i = 0; i < cards.length - 1; i++) {
    const cur = cards[i];
    const next = cards[i + 1];
    if (next.rank !== cur.rank - 1 || next.suit !== cur.suit) return false;
  }
  return true;
}

/** If the top RUN_LEN cards of a column form a face-up King..Ace same-suit run, remove it to
 *  `completed` (+1 · +100 score) and flip the newly-exposed top card, if any. */
function checkCompletion(state: GameState, col: number): void {
  const pile = state.tableau[col];
  if (pile.length < RUN_LEN) return;
  const top = pile.slice(pile.length - RUN_LEN);
  if (top[0].rank !== 13 || !top[0].faceUp) return;
  for (let i = 0; i < top.length - 1; i++) {
    if (!top[i + 1].faceUp) return;
  }
  if (!isUniformRun(top)) return;

  pile.splice(pile.length - RUN_LEN, RUN_LEN);
  state.completed += 1;
  state.score += 100;
  const newTop = pile[pile.length - 1];
  if (newTop && !newTop.faceUp) newTop.faceUp = true;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** New shuffled game. `seed` (tests) drives a deterministic LCG Fisher-Yates shuffle.
 *  suitCount picks the pack composition (see CONTRACT); defaults to the easiest, 1 suit. */
export function newGame(suitCount: 1 | 2 | 4 = 1, seed?: number): GameState {
  const suits = SUITS_BY_COUNT[suitCount];
  const repeats = 8 / suits.length; // 1→8, 2→4, 4→2 — always 104 cards total

  // Fresh pack: ids assigned once, sequentially, across every suit/repeat — never reset, so
  // both decks together span exactly 0..103 with no collisions.
  const deck: Card[] = [];
  let nextId = 0;
  for (const suit of suits) {
    for (let rep = 0; rep < repeats; rep++) {
      for (let r = 1; r <= 13; r++) {
        deck.push({ id: nextId++, suit, rank: r, faceUp: false });
      }
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

  // Deal off the top of the pack: columns 0-3 get 6 cards, 4-9 get 5, only the last one face-up.
  const tableau: Card[][] = [];
  for (let col = 0; col < TABLEAU_COLS; col++) {
    const count = col < 4 ? 6 : 5;
    const pile: Card[] = [];
    for (let k = 0; k < count; k++) {
      const card = deck.pop()!;
      card.faceUp = k === count - 1;
      pile.push(card);
    }
    tableau.push(pile);
  }

  return {
    tableau,
    stock: deck, // the remaining 50, face-down
    completed: 0,
    suitCount,
    score: 500,
    moves: 0,
    won: false,
    history: [],
  };
}

/** Pure legality check — never mutates. cardIndex is the index INTO the source column array;
 *  the run considered is cardIndex..end (everything above it in the pile). */
export function canMoveStack(state: GameState, from: PileRef, cardIndex: number, to: PileRef): boolean {
  if (from.index < 0 || from.index >= TABLEAU_COLS) return false;
  if (to.index < 0 || to.index >= TABLEAU_COLS) return false;
  if (from.index === to.index) return false; // a pile onto itself is a no-op, not a move

  const src = state.tableau[from.index];
  if (cardIndex < 0 || cardIndex >= src.length) return false;
  const run = src.slice(cardIndex);
  if (run.some((c) => !c.faceUp)) return false;          // face-down cards never move
  if (run.length > 1 && !isUniformRun(run)) return false; // mixed-suit runs never travel as a unit

  const dst = state.tableau[to.index];
  const top = dst[dst.length - 1];
  if (!top) return true; // empty column: any single card, or any legal same-suit run
  // build DOWN one rank, regardless of suit/color — a King (rank 13) can thus only ever reach
  // an empty column, since no rank-14 destination card can exist
  return run[0].rank === top.rank - 1;
}

/** Perform a move (validates via canMoveStack). Mutates, scores, flips, checks completion,
 *  moves++. Undoable. */
export function moveStack(state: GameState, from: PileRef, cardIndex: number, to: PileRef): boolean {
  if (!canMoveStack(state, from, cardIndex, to)) return false;
  pushHistory(state);

  const src = state.tableau[from.index];
  const dst = state.tableau[to.index];
  const moving = src.splice(cardIndex);
  dst.push(...moving);

  // exposing a face-down tableau card flips it automatically (no score change — see CONTRACT)
  const newTop = src[src.length - 1];
  if (newTop && !newTop.faceUp) newTop.faceUp = true;

  state.score -= 1;
  state.moves += 1;

  checkCompletion(state, to.index);
  state.won = isWon(state);
  return true;
}

/** The length of the maximal same-suit descending run sitting at a column's top — the largest
 *  unit that could ever move off it in one go. UI convenience for keyboard pickup, mirroring
 *  freecell's movableRunLength. */
export function movableRunLength(state: GameState, tableauIndex: number): number {
  const pile = state.tableau[tableauIndex];
  if (pile.length === 0) return 0;
  let n = 1;
  for (let i = pile.length - 1; i > 0; i--) {
    const cur = pile[i];
    const prev = pile[i - 1];
    if (!prev.faceUp) break;
    if (cur.rank === prev.rank - 1 && cur.suit === prev.suit) n++;
    else break;
  }
  return n;
}

/** True when a stock deal would be legal right now (no empty column, cards remain). */
export function canDeal(state: GameState): boolean {
  return state.stock.length >= TABLEAU_COLS && state.tableau.every((col) => col.length > 0);
}

/** Stock → tableau: one face-up card onto EACH of the 10 columns. Blocked (returns false,
 *  no mutation) while any column is empty or the stock can't fill a full round. Undoable. */
export function dealStock(state: GameState): boolean {
  if (!canDeal(state)) return false;
  pushHistory(state);

  for (let col = 0; col < TABLEAU_COLS; col++) {
    const card = state.stock.pop()!;
    card.faceUp = true;
    state.tableau[col].push(card);
  }
  state.score -= 1;
  state.moves += 1;

  for (let col = 0; col < TABLEAU_COLS; col++) checkCompletion(state, col);
  state.won = isWon(state);
  return true;
}

export function isWon(state: GameState): boolean {
  return state.completed === 8;
}

/** Restore the previous snapshot (incl. score/moves/completed). False when history is empty. */
export function undo(state: GameState): boolean {
  const snap = state.history.pop();
  if (snap === undefined) return false;
  const prev = JSON.parse(snap) as Omit<GameState, 'history'>;
  state.tableau = prev.tableau;
  state.stock = prev.stock;
  state.completed = prev.completed;
  state.suitCount = prev.suitCount;
  state.score = prev.score;
  state.moves = prev.moves;
  state.won = prev.won;
  return true;
}
