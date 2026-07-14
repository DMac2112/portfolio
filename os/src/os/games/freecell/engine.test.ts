// FreeCell engine tests — exercises the LOCKED contract in engine.ts headlessly: deal shape,
// seeded determinism, the supermove capacity formula (including the empty-destination carve-
// out), move legality per pile kind (accept AND reject cases), win detection, and undo.
import { describe, it, expect } from 'vitest';
import {
  newGame, maxMovable, canMoveStack, moveStack, autoMoveTarget, movableRunLength, isWon, undo,
  type Card, type GameState, type PileRef, type Suit,
} from './engine';

/* ------------------------------ fixtures ------------------------------- */

/** Card literal with the engine's stable id scheme (suitIndex*13 + rank−1). */
const C = (suit: Suit, rank: number): Card => ({
  id: 'SHDC'.indexOf(suit) * 13 + (rank - 1),
  suit,
  rank,
  faceUp: true,
});

/** Minimal empty state; override just the piles a test cares about. */
function makeState(over: Partial<GameState> = {}): GameState {
  return {
    freeCells: [null, null, null, null],
    foundations: [[], [], [], []],
    tableau: [[], [], [], [], [], [], [], []],
    score: 0,
    moves: 0,
    won: false,
    history: [],
    ...over,
  };
}

const Free = (index: number): PileRef => ({ pile: 'free', index });
const F = (index: number): PileRef => ({ pile: 'foundation', index });
const T = (index: number): PileRef => ({ pile: 'tableau', index });

/** Ace..upTo of one suit, face-up — for pre-filled foundations. */
function suitRun(suit: Suit, upTo: number): Card[] {
  const pile: Card[] = [];
  for (let r = 1; r <= upTo; r++) pile.push(C(suit, r));
  return pile;
}

const clone = <V,>(v: V): V => JSON.parse(JSON.stringify(v)) as V;

/* -------------------------------- deal --------------------------------- */

describe('deal shape', () => {
  it('deals columns 0-3 at 7 cards and columns 4-7 at 6, all face-up', () => {
    const g = newGame(5);
    expect(g.tableau.map((col) => col.length)).toEqual([7, 7, 7, 7, 6, 6, 6, 6]);
    for (const col of g.tableau) {
      expect(col.every((c) => c.faceUp)).toBe(true);
    }
  });

  it('leaves all free cells empty and all foundations empty', () => {
    const g = newGame(5);
    expect(g.freeCells).toEqual([null, null, null, null]);
    expect(g.foundations).toEqual([[], [], [], []]);
    expect(g.score).toBe(0);
    expect(g.moves).toBe(0);
    expect(g.won).toBe(false);
  });

  it('uses all 52 unique card ids exactly once', () => {
    const g = newGame(9);
    const ids = g.tableau.flat().map((c) => c.id);
    expect(ids).toHaveLength(52);
    expect(new Set(ids).size).toBe(52);
    expect(ids.every((id) => id >= 0 && id <= 51)).toBe(true);
  });
});

describe('seeded determinism', () => {
  it('the same seed deals the identical layout twice', () => {
    expect(newGame(42)).toEqual(newGame(42));
  });

  it('a different seed deals a different layout', () => {
    expect(JSON.stringify(newGame(42))).not.toBe(JSON.stringify(newGame(43)));
  });
});

/* ----------------------------- maxMovable ------------------------------- */

describe('maxMovable', () => {
  it('is (freeCellsFree + 1) with no empty columns and no free cells open', () => {
    const s = makeState({
      freeCells: [C('S', 2), C('H', 2), C('D', 2), C('C', 2)],
      tableau: [[C('S', 5)], [C('H', 4)], [C('D', 3)], [C('C', 2)], [C('S', 6)], [C('H', 7)], [C('D', 8)], [C('C', 9)]],
    });
    expect(maxMovable(s, T(0))).toBe(1); // (0 + 1) * 2^0
  });

  it('scales with open free cells: (freeCellsFree + 1) * 2^0', () => {
    const s = makeState({
      freeCells: [null, null, C('D', 2), C('C', 2)],
      tableau: [[C('S', 5)], [C('H', 4)], [C('D', 3)], [C('C', 2)], [C('S', 6)], [C('H', 7)], [C('D', 8)], [C('C', 9)]],
    });
    expect(maxMovable(s, T(0))).toBe(3); // (2 + 1) * 2^0
  });

  it('scales with empty columns: (freeCellsFree + 1) * 2^emptyColumns', () => {
    const s = makeState({
      freeCells: [C('S', 2), C('H', 2), C('D', 2), C('C', 2)],
      tableau: [[C('S', 5)], [], [], [C('C', 2)], [C('S', 6)], [C('H', 7)], [C('D', 8)], [C('C', 9)]],
    });
    // destination T(3) is non-empty, so both empty columns (1 and 2) count fully
    expect(maxMovable(s, T(3))).toBe(4); // (0 + 1) * 2^2
  });

  it('excludes the destination itself from the empty-column count when it is empty', () => {
    const s = makeState({
      freeCells: [null, C('H', 2), C('D', 2), C('C', 2)],
      tableau: [[C('S', 5)], [], [], [C('C', 2)], [C('S', 6)], [C('H', 7)], [C('D', 8)], [C('C', 9)]],
    });
    // 2 empty columns total (1 and 2); moving TO column 1 excludes it → exponent drops to 1
    expect(maxMovable(s, T(1))).toBe(4); // (1 + 1) * 2^1
  });

  it('combines open free cells and empty columns, still excluding the empty destination', () => {
    const s = makeState({
      freeCells: [null, null, C('D', 2), C('C', 2)],
      tableau: [[C('S', 5)], [], [], [], [C('S', 6)], [C('H', 7)], [C('D', 8)], [C('C', 9)]],
    });
    // 3 empty columns (1, 2, 3); destination is column 2 → excluded → 2 remain; 2 free cells open
    expect(maxMovable(s, T(2))).toBe(12); // (2 + 1) * 2^2
  });
});

/* ------------------------------ legality ------------------------------- */

describe('move legality — tableau', () => {
  it('builds descending in alternating colors only', () => {
    const s = makeState({ tableau: [[C('S', 10)], [C('H', 9)], [C('C', 9)], [C('D', 8)], [], [], [], []] });
    expect(canMoveStack(s, T(1), 0, T(0))).toBe(true);   // red 9 on black 10
    expect(canMoveStack(s, T(2), 0, T(0))).toBe(false);  // black 9 on black 10 (same color)
    expect(canMoveStack(s, T(3), 0, T(0))).toBe(false);  // 8 skips a rank
  });

  it('any card (not just a King) may open an empty column', () => {
    const s = makeState({ tableau: [[C('H', 7)], [], [], [], [], [], [], []] });
    expect(canMoveStack(s, T(0), 0, T(1))).toBe(true);
  });

  it('a pile onto itself is not a move', () => {
    const s = makeState({ tableau: [[], [], [C('S', 5)], [], [], [], [], []] });
    expect(canMoveStack(s, T(2), 0, T(2))).toBe(false);
  });

  it('a buried card cannot move alone if it breaks the run', () => {
    const s = makeState({
      tableau: [[C('C', 9), C('H', 2)], [C('D', 8)], [], [], [], [], [], []],
    });
    // 2H sits on 9C — not a valid descending/alternating pair, so index 0 is not a movable run
    expect(canMoveStack(s, T(0), 0, T(1))).toBe(false);
    // but the top card 2H alone still can't land on 8D (rank gap)
    expect(canMoveStack(s, T(0), 1, T(1))).toBe(false);
  });

  it('a valid multi-card run may move as a unit onto a legal target', () => {
    const s = makeState({
      tableau: [[C('C', 9), C('H', 8), C('S', 7)], [C('D', 10)], [], [], [], [], [], []],
    });
    expect(canMoveStack(s, T(0), 0, T(1))).toBe(true);
    expect(movableRunLength(s, 0)).toBe(3);
  });

  it('a multi-card run is rejected when it exceeds supermove capacity', () => {
    const s = makeState({
      freeCells: [C('S', 2), C('H', 2), C('D', 2), C('C', 2)], // 0 free cells open
      tableau: [
        [C('C', 9), C('H', 8), C('S', 7)], [C('D', 10)], [C('S', 3)], [C('H', 4)],
        [C('D', 5)], [C('C', 6)], [C('S', 4)], [C('H', 6)],
      ], // no empty columns anywhere
    });
    // capacity here is (0+1)*2^0 = 1, but the run is 3 cards
    expect(maxMovable(s, T(1))).toBe(1);
    expect(canMoveStack(s, T(0), 0, T(1))).toBe(false);
  });
});

describe('move legality — foundations', () => {
  it('starts with an Ace and climbs the same suit', () => {
    const s = makeState({
      foundations: [[], [C('S', 1)], [], []],
      tableau: [[C('S', 1)], [C('D', 1)], [C('S', 2)], [C('H', 2)], [C('S', 3)], [], [], []],
    });
    expect(canMoveStack(s, T(0), 0, F(0))).toBe(true);   // Ace to empty foundation
    expect(canMoveStack(s, T(2), 0, F(0))).toBe(false);  // 2 to empty foundation
    expect(canMoveStack(s, T(2), 0, F(1))).toBe(true);   // 2S on AS
    expect(canMoveStack(s, T(3), 0, F(1))).toBe(false);  // 2H on AS — wrong suit
    expect(canMoveStack(s, T(4), 0, F(1))).toBe(false);  // 3S on AS — rank gap
  });

  it('only a single top card ever reaches a foundation, never a run', () => {
    const s = makeState({ tableau: [[C('S', 1), C('H', 2)], [], [], [], [], [], [], []] });
    // 2H on top is not an Ace and buries the Ace beneath it
    expect(canMoveStack(s, T(0), 0, F(0))).toBe(false); // buried Ace — index 0 is not the top
    expect(canMoveStack(s, T(0), 1, F(0))).toBe(false); // 2H is not an Ace
  });

  it('a free cell card may also fly to a matching foundation', () => {
    const s = makeState({ freeCells: [C('S', 2), null, null, null], foundations: [[C('S', 1)], [], [], []] });
    expect(canMoveStack(s, Free(0), 0, F(0))).toBe(true);
  });
});

describe('move legality — free cells', () => {
  it('only a single exposed card may enter an empty free cell', () => {
    const s = makeState({ tableau: [[C('C', 9), C('H', 8)], [], [], [], [], [], [], []] });
    expect(canMoveStack(s, T(0), 1, Free(0))).toBe(true);  // top card alone
    expect(canMoveStack(s, T(0), 0, Free(0))).toBe(false); // the 2-card run may not enter as a unit
  });

  it('an occupied free cell rejects an incoming card', () => {
    const s = makeState({
      freeCells: [C('D', 5), null, null, null],
      tableau: [[C('C', 9)], [], [], [], [], [], [], []],
    });
    expect(canMoveStack(s, T(0), 0, Free(0))).toBe(false);
    expect(canMoveStack(s, T(0), 0, Free(1))).toBe(true);
  });

  it('a free cell card may return to a legal tableau spot', () => {
    const s = makeState({ freeCells: [C('H', 9), null, null, null], tableau: [[C('S', 10)], [], [], [], [], [], [], []] });
    expect(canMoveStack(s, Free(0), 0, T(0))).toBe(true);
    expect(canMoveStack(s, Free(0), 0, T(1))).toBe(true); // empty column accepts any card too
  });

  it('all four free cells full rejects a fifth card', () => {
    const s = makeState({
      freeCells: [C('S', 2), C('H', 3), C('D', 4), C('C', 5)],
      tableau: [[C('C', 9)], [], [], [], [], [], [], []],
    });
    for (let i = 0; i < 4; i++) expect(canMoveStack(s, T(0), 0, Free(i))).toBe(false);
  });
});

/* --------------------------------- move --------------------------------- */

describe('moveStack', () => {
  it('moves a card to a foundation, scores +10, and increments moves', () => {
    const s = makeState({ tableau: [[C('S', 1)], [], [], [], [], [], [], []] });
    expect(moveStack(s, T(0), 0, F(0))).toBe(true);
    expect(s.foundations[0].map((c) => c.rank)).toEqual([1]);
    expect(s.tableau[0]).toHaveLength(0);
    expect(s.score).toBe(10);
    expect(s.moves).toBe(1);
  });

  it('moves a card into a free cell', () => {
    const s = makeState({ tableau: [[C('C', 9)], [], [], [], [], [], [], []] });
    expect(moveStack(s, T(0), 0, Free(2))).toBe(true);
    expect(s.freeCells[2]).toEqual(C('C', 9));
    expect(s.tableau[0]).toHaveLength(0);
  });

  it('moves a valid run within the tableau as one unit', () => {
    const s = makeState({
      tableau: [[C('C', 9), C('H', 8), C('S', 7)], [C('D', 10)], [], [], [], [], [], []],
    });
    expect(moveStack(s, T(0), 0, T(1))).toBe(true);
    expect(s.tableau[1].map((c) => c.rank)).toEqual([10, 9, 8, 7]);
    expect(s.tableau[0]).toHaveLength(0);
  });

  it('an illegal move mutates nothing and returns false', () => {
    const s = makeState({ tableau: [[C('S', 5)], [C('H', 5)], [], [], [], [], [], []] });
    const before = clone(s);
    expect(moveStack(s, T(0), 0, T(1))).toBe(false);
    expect(s).toEqual(before);
  });
});

/* -------------------------------- winning -------------------------------- */

describe('win detection', () => {
  it('isWon is false until all four foundations hold 13 cards', () => {
    const s = makeState({ foundations: [suitRun('S', 13), suitRun('H', 13), suitRun('D', 13), suitRun('C', 12)] });
    expect(isWon(s)).toBe(false);
  });

  it('isWon is true, and moveStack flips won, once the last card lands', () => {
    const s = makeState({
      foundations: [suitRun('S', 13), suitRun('H', 13), suitRun('D', 13), suitRun('C', 12)],
      tableau: [[C('C', 13)], [], [], [], [], [], [], []],
    });
    expect(moveStack(s, T(0), 0, F(3))).toBe(true);
    expect(isWon(s)).toBe(true);
    expect(s.won).toBe(true);
  });
});

/* ---------------------------- autoMoveTarget ----------------------------- */

describe('autoMoveTarget', () => {
  it('sends an Ace to the first empty foundation', () => {
    const s = makeState({ tableau: [[C('S', 1)], [], [], [], [], [], [], []] });
    expect(autoMoveTarget(s, T(0), 0)).toEqual(F(0));
  });

  it('returns null for a buried card or one with no home foundation yet', () => {
    const s = makeState({ tableau: [[C('C', 7), C('H', 2)], [], [], [], [], [], [], []] });
    expect(autoMoveTarget(s, T(0), 0)).toBeNull(); // buried
    expect(autoMoveTarget(s, T(0), 1)).toBeNull(); // 2H has no Ace of hearts down yet
  });

  it('never mutates the state', () => {
    const s = makeState({ tableau: [[C('S', 1)], [], [], [], [], [], [], []] });
    const before = JSON.stringify(s);
    autoMoveTarget(s, T(0), 0);
    expect(JSON.stringify(s)).toBe(before);
  });
});

/* --------------------------------- undo ---------------------------------- */

describe('undo', () => {
  it('two undos after a tableau move + a foundation move restore the exact prior state', () => {
    const s = makeState({
      tableau: [[C('S', 10)], [C('H', 9)], [C('D', 1)], [], [], [], [], []],
    });
    const before = clone(s);
    expect(moveStack(s, T(1), 0, T(0))).toBe(true);
    expect(moveStack(s, T(2), 0, F(2))).toBe(true);
    expect(s).not.toEqual(before);
    expect(undo(s)).toBe(true);
    expect(undo(s)).toBe(true);
    expect(s).toEqual(before); // score/moves/won included, history back to []
  });

  it('undo on a fresh game returns false', () => {
    const g = newGame(11);
    expect(undo(g)).toBe(false);
  });
});
