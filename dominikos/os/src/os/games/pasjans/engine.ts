// Pasjans (Klondike solitaire) — pure rules engine. NO DOM, NO React: everything here is
// plain data + functions so it unit-tests headlessly (see engine.test.ts).
//
// ============================ CONTRACT (LOCKED) ============================
// The public API below is the locked contract the UI builds against. Implementations may
// add private helpers but MUST NOT change these signatures or semantics.
//
// Rules (classic Klondike, era-standard behavior):
//  · deal: 7 tableau columns, column i gets i+1 cards, only the top face-up; 24 to stock.
//  · draw(): flips drawCount (1 or 3) cards stock→waste face-up. Empty stock + non-empty
//    waste → recycle waste (reversed, face-down) back to stock, passes++ and score −20 for
//    every recycle after the first pass (score floors at 0). Empty stock + empty waste → false.
//  · tableau builds DOWN in alternating colors; only Kings (or stacks led by a King) may move
//    to an empty column. Any face-up run may move as a unit within the tableau.
//  · foundations build UP per suit from Ace. Only single cards move to a foundation
//    (from waste top, tableau top, or another foundation top — same-suit sequence only).
//  · a foundation top card MAY move back to a legal tableau spot (score −15).
//  · exposing a face-down tableau card flips it automatically (+5).
//  · scoring (standard): waste→tableau +5 · waste→foundation +10 · tableau→foundation +10 ·
//    foundation→tableau −15 · flip +5 · recycle −20 (after first pass). Score never < 0.
//  · won when all four foundations hold 13 cards.
//  · undo: full-snapshot history (score/moves included), capped at 100 entries.
// ==========================================================================

export type Suit = 'S' | 'H' | 'D' | 'C';

export interface Card {
  id: number;       // 0..51, stable per game
  suit: Suit;
  rank: number;     // 1 (Ace) .. 13 (King)
  faceUp: boolean;
}

export type PileRef =
  | { pile: 'waste' }
  | { pile: 'foundation'; index: number }  // 0..3
  | { pile: 'tableau'; index: number };    // 0..6

export interface GameState {
  stock: Card[];            // top of stock = last element
  waste: Card[];            // top of waste = last element
  foundations: Card[][];    // 4 piles, top = last element
  tableau: Card[][];        // 7 columns, bottom-to-top order (last = exposed)
  drawCount: 1 | 3;
  score: number;
  moves: number;
  passes: number;           // completed passes through the stock
  won: boolean;
  history: string[];        // undo snapshots (JSON of state sans history); private-ish
}

export const isRed = (s: Suit): boolean => s === 'H' || s === 'D';

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

const SUITS: readonly Suit[] = ['S', 'H', 'D', 'C'];
const HISTORY_CAP = 100;

/** The card array behind a pile ref, or null when the index is out of range. */
function pileAt(state: GameState, ref: PileRef): Card[] | null {
  switch (ref.pile) {
    case 'waste':
      return state.waste;
    case 'foundation':
      return ref.index >= 0 && ref.index < 4 ? state.foundations[ref.index] : null;
    case 'tableau':
      return ref.index >= 0 && ref.index < 7 ? state.tableau[ref.index] : null;
  }
}

function samePile(a: PileRef, b: PileRef): boolean {
  if (a.pile === 'waste' || b.pile === 'waste') return a.pile === b.pile;
  return a.pile === b.pile && a.index === b.index;
}

/** Undo snapshot — everything EXCEPT the history array itself. */
function snapshot(state: GameState): string {
  return JSON.stringify({
    stock: state.stock,
    waste: state.waste,
    foundations: state.foundations,
    tableau: state.tableau,
    drawCount: state.drawCount,
    score: state.score,
    moves: state.moves,
    passes: state.passes,
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

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** New shuffled game. `seed` (tests) drives a deterministic LCG Fisher-Yates shuffle. */
export function newGame(drawCount: 1 | 3, seed?: number): GameState {
  // Fresh pack: id = suitIndex*13 + (rank−1), suits S,H,D,C, ranks A..K.
  const deck: Card[] = [];
  for (let s = 0; s < 4; s++) {
    for (let r = 1; r <= 13; r++) {
      deck.push({ id: s * 13 + (r - 1), suit: SUITS[s], rank: r, faceUp: false });
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

  // Deal off the top of the pack: column i receives i+1 cards, only the last one face-up.
  const tableau: Card[][] = [];
  for (let col = 0; col < 7; col++) {
    const pile: Card[] = [];
    for (let k = 0; k <= col; k++) {
      const card = deck.pop()!;
      card.faceUp = k === col;
      pile.push(card);
    }
    tableau.push(pile);
  }

  return {
    stock: deck, // the remaining 24, face-down
    waste: [],
    foundations: [[], [], [], []],
    tableau,
    drawCount,
    score: 0,
    moves: 0,
    passes: 0,
    won: false,
    history: [],
  };
}

/** Stock→waste deal (or recycle). Returns false only when nothing could happen. Undoable. */
export function draw(state: GameState): boolean {
  if (state.stock.length === 0 && state.waste.length === 0) return false;
  pushHistory(state);

  if (state.stock.length === 0) {
    // Recycle: turn the waste over as one block, so the card drawn first comes up first again.
    // Top of stock = LAST element, hence the reverse.
    const recycled = state.waste.slice().reverse();
    for (const c of recycled) c.faceUp = false;
    state.stock = recycled;
    state.waste = [];
    state.passes += 1;
    // The first recycle merely completes pass #1; every later one costs 20.
    if (state.passes > 1) bumpScore(state, -20);
  } else {
    // Deal up to drawCount; a short stock just yields fewer cards (last flipped lands on top).
    const n = Math.min(state.drawCount, state.stock.length);
    for (let i = 0; i < n; i++) {
      const card = state.stock.pop()!;
      card.faceUp = true;
      state.waste.push(card);
    }
  }

  state.moves += 1;
  return true;
}

/** Pure legality check — never mutates. cardIndex is the index INTO the source pile array. */
export function canMoveStack(state: GameState, from: PileRef, cardIndex: number, to: PileRef): boolean {
  const src = pileAt(state, from);
  const dst = pileAt(state, to);
  if (!src || !dst) return false;
  if (to.pile === 'waste') return false;          // nothing ever moves INTO the waste
  if (samePile(from, to)) return false;           // a pile onto itself is a no-op, not a move
  if (cardIndex < 0 || cardIndex >= src.length) return false;

  const moving = src[cardIndex];
  if (!moving.faceUp) return false;               // face-down cards never move
  if (from.pile === 'tableau') {
    // the whole run from cardIndex up must be face-up to travel as a unit
    for (let i = cardIndex; i < src.length; i++) if (!src[i].faceUp) return false;
  } else if (cardIndex !== src.length - 1) {
    return false;                                  // waste/foundation: top card only
  }

  if (to.pile === 'foundation') {
    if (cardIndex !== src.length - 1) return false; // single cards only, never a run
    const top = dst[dst.length - 1];
    if (!top) return moving.rank === 1;             // empty foundation takes an Ace
    return top.suit === moving.suit && moving.rank === top.rank + 1;
  }

  // tableau target: King (or King-led run) to an empty column, else down + alternating color
  const top = dst[dst.length - 1];
  if (!top) return moving.rank === 13;
  if (!top.faceUp) return false;                    // can't build on a face-down card
  return moving.rank === top.rank - 1 && isRed(moving.suit) !== isRed(top.suit);
}

/** Perform a move (validates via canMoveStack). Mutates, scores, flips, moves++. Undoable. */
export function moveStack(state: GameState, from: PileRef, cardIndex: number, to: PileRef): boolean {
  if (!canMoveStack(state, from, cardIndex, to)) return false;
  pushHistory(state);

  const src = pileAt(state, from)!;
  const dst = pileAt(state, to)!;
  dst.push(...src.splice(cardIndex));

  // Scoring table (see header). Tableau→tableau and foundation→foundation score nothing.
  let delta = 0;
  if (to.pile === 'foundation') {
    if (from.pile === 'waste' || from.pile === 'tableau') delta = 10;
  } else if (from.pile === 'waste') {
    delta = 5;
  } else if (from.pile === 'foundation') {
    delta = -15;
  }
  bumpScore(state, delta);

  // Exposing a face-down tableau card flips it automatically (+5).
  if (from.pile === 'tableau' && src.length > 0 && !src[src.length - 1].faceUp) {
    src[src.length - 1].faceUp = true;
    bumpScore(state, 5);
  }

  state.moves += 1;
  if (isWon(state)) state.won = true;
  return true;
}

/** Double-click helper: the foundation a top card can fly to right now, else null. Never mutates. */
export function autoMoveTarget(state: GameState, from: PileRef, cardIndex: number): PileRef | null {
  const src = pileAt(state, from);
  if (!src || src.length === 0 || cardIndex !== src.length - 1) return null; // top cards only
  for (let i = 0; i < 4; i++) {
    const to: PileRef = { pile: 'foundation', index: i };
    if (canMoveStack(state, from, cardIndex, to)) return to;
  }
  return null;
}

export function isWon(state: GameState): boolean {
  return state.foundations.every((f) => f.length === 13);
}

/** True when stock+waste are empty and every tableau card is face-up (nothing left to solve). */
export function canAutoComplete(state: GameState): boolean {
  return (
    state.stock.length === 0 &&
    state.waste.length === 0 &&
    state.tableau.every((col) => col.every((c) => c.faceUp))
  );
}

/** Move ONE card to a foundation (lowest legal first) — the UI animates repeated calls. */
export function autoCompleteStep(state: GameState): boolean {
  // Lowest movable rank first (tableau tops, then the waste top on ties) guarantees repeated
  // calls never wedge: a rank-r card can only be waiting on ranks < r, which sort earlier.
  let best: { from: PileRef; index: number; to: PileRef; rank: number } | null = null;

  const consider = (from: PileRef): void => {
    const src = pileAt(state, from);
    if (!src || src.length === 0) return;
    const index = src.length - 1;
    const to = autoMoveTarget(state, from, index);
    if (to && (!best || src[index].rank < best.rank)) {
      best = { from, index, to, rank: src[index].rank };
    }
  };

  for (let t = 0; t < 7; t++) consider({ pile: 'tableau', index: t });
  consider({ pile: 'waste' });

  if (!best) return false;
  const b: { from: PileRef; index: number; to: PileRef } = best;
  return moveStack(state, b.from, b.index, b.to); // snapshots + scores + sets won
}

/** Restore the previous snapshot (incl. score/moves). False when history is empty. */
export function undo(state: GameState): boolean {
  const snap = state.history.pop();
  if (snap === undefined) return false;
  const prev = JSON.parse(snap) as Omit<GameState, 'history'>;
  state.stock = prev.stock;
  state.waste = prev.waste;
  state.foundations = prev.foundations;
  state.tableau = prev.tableau;
  state.drawCount = prev.drawCount;
  state.score = prev.score;
  state.moves = prev.moves;
  state.passes = prev.passes;
  state.won = prev.won;
  return true;
}
