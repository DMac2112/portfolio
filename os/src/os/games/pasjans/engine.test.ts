// Pasjans (Klondike) engine tests — exercises the LOCKED contract in engine.ts headlessly:
// deal shape, seeded determinism, draw/recycle, move legality (positive AND negative per
// rule), the standard scoring table, multi-card run moves, undo snapshots, the double-click
// autoMoveTarget helper, and the auto-complete loop. Targeted cases hand-build GameState
// fixtures (plain data — the engine never checks global pile integrity, only local rules).
import { describe, it, expect } from 'vitest';
import {
  newGame, draw, canMoveStack, moveStack, autoMoveTarget,
  isWon, canAutoComplete, autoCompleteStep, undo,
  type Card, type GameState, type PileRef, type Suit,
} from './engine';

/* ------------------------------ fixtures ------------------------------- */

/** Card literal with the engine's stable id scheme (suitIndex*13 + rank−1). */
const C = (suit: Suit, rank: number, faceUp = true): Card => ({
  id: 'SHDC'.indexOf(suit) * 13 + (rank - 1),
  suit,
  rank,
  faceUp,
});

/** Minimal empty state; override just the piles a test cares about. */
function makeState(over: Partial<GameState> = {}): GameState {
  return {
    stock: [],
    waste: [],
    foundations: [[], [], [], []],
    tableau: [[], [], [], [], [], [], []],
    drawCount: 1,
    score: 0,
    moves: 0,
    passes: 0,
    won: false,
    history: [],
    ...over,
  };
}

const T = (index: number): PileRef => ({ pile: 'tableau', index });
const F = (index: number): PileRef => ({ pile: 'foundation', index });
const W: PileRef = { pile: 'waste' };

/** Ace..upTo of one suit, face-up — for pre-filled foundations. */
function suitRun(suit: Suit, upTo: number): Card[] {
  const pile: Card[] = [];
  for (let r = 1; r <= upTo; r++) pile.push(C(suit, r));
  return pile;
}

const clone = <V,>(v: V): V => JSON.parse(JSON.stringify(v)) as V;

/* -------------------------------- deal --------------------------------- */

describe('deal shape', () => {
  it('deals 7 columns sized 1..7 with only the top card face-up', () => {
    const g = newGame(1, 5);
    expect(g.tableau.map((col) => col.length)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    for (const col of g.tableau) {
      for (let i = 0; i < col.length - 1; i++) expect(col[i].faceUp).toBe(false);
      expect(col[col.length - 1].faceUp).toBe(true);
    }
  });

  it('leaves a 24-card face-down stock, empty waste and empty foundations', () => {
    const g = newGame(3, 5);
    expect(g.stock).toHaveLength(24);
    expect(g.stock.every((c) => !c.faceUp)).toBe(true);
    expect(g.waste).toHaveLength(0);
    expect(g.foundations).toEqual([[], [], [], []]);
    expect(g.score).toBe(0);
    expect(g.moves).toBe(0);
    expect(g.passes).toBe(0);
    expect(g.won).toBe(false);
  });

  it('uses all 52 unique card ids exactly once', () => {
    const g = newGame(1, 9);
    const ids = [...g.stock, ...g.waste, ...g.foundations.flat(), ...g.tableau.flat()]
      .map((c) => c.id);
    expect(ids).toHaveLength(52);
    expect(new Set(ids).size).toBe(52);
    expect(ids.every((id) => id >= 0 && id <= 51)).toBe(true);
  });
});

describe('seeded determinism', () => {
  it('the same seed deals the identical layout twice', () => {
    expect(newGame(1, 42)).toEqual(newGame(1, 42));
  });

  it('a different seed deals a different layout', () => {
    expect(JSON.stringify(newGame(1, 42))).not.toBe(JSON.stringify(newGame(1, 43)));
  });
});

/* -------------------------------- draw --------------------------------- */

describe('draw', () => {
  it('drawCount 1 flips exactly one stock card face-up onto the waste', () => {
    const g = newGame(1, 3);
    const expectedId = g.stock[g.stock.length - 1].id;
    expect(draw(g)).toBe(true);
    expect(g.waste.map((c) => c.id)).toEqual([expectedId]);
    expect(g.waste[0].faceUp).toBe(true);
    expect(g.stock).toHaveLength(23);
    expect(g.moves).toBe(1);
  });

  it('drawCount 3 flips three cards, last one dealt landing on top', () => {
    const g = newGame(3, 3);
    const expectedIds = g.stock.slice(-3).reverse().map((c) => c.id);
    expect(draw(g)).toBe(true);
    expect(g.waste.map((c) => c.id)).toEqual(expectedIds);
    expect(g.waste.every((c) => c.faceUp)).toBe(true);
    expect(g.stock).toHaveLength(21);
  });

  it('a short stock deals fewer than drawCount', () => {
    const s = makeState({
      drawCount: 3,
      stock: [C('S', 4, false), C('H', 9, false)],
    });
    expect(draw(s)).toBe(true);
    expect(s.waste).toHaveLength(2);
    expect(s.stock).toHaveLength(0);
  });

  it('empty stock + empty waste is a no-op returning false', () => {
    const s = makeState();
    expect(draw(s)).toBe(false);
    expect(s.moves).toBe(0);
    expect(s.history).toHaveLength(0);
  });
});

describe('recycle', () => {
  it('turns the waste over face-down so the first-drawn card comes up first again', () => {
    const s = makeState({ waste: [C('H', 2), C('S', 5), C('D', 9)] });
    expect(draw(s)).toBe(true);
    expect(s.waste).toHaveLength(0);
    expect(s.stock.map((c) => c.id)).toEqual([C('D', 9).id, C('S', 5).id, C('H', 2).id]);
    expect(s.stock.every((c) => !c.faceUp)).toBe(true);
    expect(s.passes).toBe(1);
  });

  it('the first recycle costs nothing; the second costs 20', () => {
    const first = makeState({ waste: [C('H', 2)], score: 30, passes: 0 });
    draw(first);
    expect(first.score).toBe(30);

    const second = makeState({ waste: [C('H', 2)], score: 30, passes: 1 });
    draw(second);
    expect(second.passes).toBe(2);
    expect(second.score).toBe(10);
  });

  it('the recycle penalty floors the score at 0', () => {
    const s = makeState({ waste: [C('H', 2)], score: 5, passes: 1 });
    draw(s);
    expect(s.score).toBe(0);
  });
});

/* ------------------------------ legality ------------------------------- */

describe('move legality', () => {
  it('only a King (or King-led run) may take an empty tableau column', () => {
    const s = makeState({ tableau: [[], [C('S', 13)], [C('H', 12)], [C('S', 13), C('H', 12)], [], [], []] });
    expect(canMoveStack(s, T(1), 0, T(0))).toBe(true);   // lone King
    expect(canMoveStack(s, T(2), 0, T(0))).toBe(false);  // Queen may not
    expect(canMoveStack(s, T(3), 0, T(0))).toBe(true);   // King-led run
    expect(canMoveStack(s, T(3), 1, T(0))).toBe(false);  // Queen off the run may not
  });

  it('tableau builds descending in alternating colors only', () => {
    const s = makeState({ tableau: [[C('S', 10)], [C('H', 9)], [C('C', 9)], [C('D', 8)], [], [], []] });
    expect(canMoveStack(s, T(1), 0, T(0))).toBe(true);   // red 9 on black 10
    expect(canMoveStack(s, T(2), 0, T(0))).toBe(false);  // black 9 on black 10
    expect(canMoveStack(s, T(3), 0, T(0))).toBe(false);  // 8 skips a rank
  });

  it('foundations start with an Ace and climb the same suit', () => {
    const s = makeState({
      foundations: [[], [C('S', 1)], [], []],
      tableau: [[C('S', 1)], [C('D', 1)], [C('S', 2)], [C('H', 2)], [C('S', 3)], [], []],
    });
    expect(canMoveStack(s, T(0), 0, F(0))).toBe(true);   // Ace to empty
    expect(canMoveStack(s, T(2), 0, F(0))).toBe(false);  // 2 to empty
    expect(canMoveStack(s, T(2), 0, F(1))).toBe(true);   // 2S on AS
    expect(canMoveStack(s, T(3), 0, F(1))).toBe(false);  // 2H on AS (wrong suit)
    expect(canMoveStack(s, T(4), 0, F(1))).toBe(false);  // 3S on AS (rank gap)
  });

  it('only single top cards reach a foundation, never a run', () => {
    const s = makeState({ tableau: [[C('S', 1), C('H', 5)], [], [], [], [], [], []] });
    expect(canMoveStack(s, T(0), 0, F(0))).toBe(false);  // buried Ace can't fly out
    expect(canMoveStack(s, T(0), 1, F(0))).toBe(false);  // and the 5 is no Ace
  });

  it('only the waste TOP is movable', () => {
    const s = makeState({ waste: [C('H', 5), C('S', 1)] });
    expect(canMoveStack(s, W, 1, F(0))).toBe(true);
    expect(canMoveStack(s, W, 0, F(0))).toBe(false);
  });

  it('face-down cards never move and never accept a build', () => {
    const s = makeState({ tableau: [[C('S', 13, false)], [C('S', 10, false)], [C('H', 9)], [], [], [], []] });
    expect(canMoveStack(s, T(0), 0, T(3))).toBe(false);  // face-down King stays put
    expect(canMoveStack(s, T(2), 0, T(1))).toBe(false);  // 9H onto a face-down 10S
  });

  it('a foundation top may return to a legal tableau spot', () => {
    const s = makeState({ foundations: [[C('H', 9)], [], [], []], tableau: [[C('S', 10)], [], [], [], [], [], []] });
    expect(canMoveStack(s, F(0), 0, T(0))).toBe(true);
    expect(canMoveStack(s, F(0), 0, T(1))).toBe(false);  // 9 to an empty column: no
  });

  it('a pile onto itself is not a move', () => {
    const s = makeState({ foundations: [[C('S', 1)], [], [], []], tableau: [[], [], [C('S', 13)], [], [], [], []] });
    expect(canMoveStack(s, T(2), 0, T(2))).toBe(false);
    expect(canMoveStack(s, F(0), 0, F(0))).toBe(false);
  });
});

/* ------------------------------- scoring ------------------------------- */

describe('scoring', () => {
  it('waste→tableau scores +5', () => {
    const s = makeState({ waste: [C('H', 9)], tableau: [[C('S', 10)], [], [], [], [], [], []] });
    expect(moveStack(s, W, 0, T(0))).toBe(true);
    expect(s.score).toBe(5);
    expect(s.tableau[0].map((c) => c.rank)).toEqual([10, 9]);
  });

  it('waste→foundation scores +10', () => {
    const s = makeState({ waste: [C('S', 1)] });
    expect(moveStack(s, W, 0, F(0))).toBe(true);
    expect(s.score).toBe(10);
  });

  it('tableau→foundation scores +10', () => {
    const s = makeState({ tableau: [[C('S', 1)], [], [], [], [], [], []] });
    expect(moveStack(s, T(0), 0, F(0))).toBe(true);
    expect(s.score).toBe(10);
  });

  it('foundation→tableau scores −15', () => {
    const s = makeState({
      score: 20,
      foundations: [[C('H', 9)], [], [], []],
      tableau: [[C('S', 10)], [], [], [], [], [], []],
    });
    expect(moveStack(s, F(0), 0, T(0))).toBe(true);
    expect(s.score).toBe(5);
  });

  it('exposing a face-down tableau card flips it for +5', () => {
    const s = makeState({ tableau: [[C('C', 5, false), C('S', 1)], [], [], [], [], [], []] });
    expect(moveStack(s, T(0), 1, F(0))).toBe(true);
    expect(s.score).toBe(15); // +10 foundation, +5 flip
    expect(s.tableau[0]).toHaveLength(1);
    expect(s.tableau[0][0].faceUp).toBe(true);
  });
});

/* ----------------------------- run moves ------------------------------- */

describe('multi-card runs', () => {
  it('moves a face-up run within the tableau as one unit', () => {
    const s = makeState({
      tableau: [
        [C('C', 4, false), C('H', 9), C('S', 8), C('D', 7)],
        [C('S', 10)],
        [], [], [], [], [],
      ],
    });
    expect(moveStack(s, T(0), 1, T(1))).toBe(true);
    expect(s.tableau[1].map((c) => c.rank)).toEqual([10, 9, 8, 7]);
    expect(s.tableau[0].map((c) => c.rank)).toEqual([4]);
    expect(s.tableau[0][0].faceUp).toBe(true); // exposed card flipped…
    expect(s.score).toBe(5);                   // …and tableau→tableau scores flip only
  });
});

/* --------------------------------- undo -------------------------------- */

describe('undo', () => {
  it('two undos after a move + a draw restore the exact prior state', () => {
    const s = makeState({
      stock: [C('C', 4, false), C('D', 12, false)],
      tableau: [[C('S', 10)], [C('H', 9)], [], [], [], [], []],
    });
    const before = clone(s);
    expect(moveStack(s, T(1), 0, T(0))).toBe(true);
    expect(draw(s)).toBe(true);
    expect(s).not.toEqual(before);
    expect(undo(s)).toBe(true);
    expect(undo(s)).toBe(true);
    expect(s).toEqual(before); // score/moves/passes/won included, history back to []
  });

  it('undo on a fresh game returns false', () => {
    const g = newGame(1, 11);
    expect(undo(g)).toBe(false);
  });
});

/* ---------------------------- autoMoveTarget --------------------------- */

describe('autoMoveTarget', () => {
  it('sends an Ace to the first empty foundation', () => {
    const s = makeState({ waste: [C('S', 1)] });
    expect(autoMoveTarget(s, W, 0)).toEqual(F(0));
  });

  it('finds the foundation already holding the previous rank of the suit', () => {
    const s = makeState({
      foundations: [[], [], [C('D', 1)], []],
      tableau: [[C('D', 2)], [], [], [], [], [], []],
    });
    expect(autoMoveTarget(s, T(0), 0)).toEqual(F(2));
  });

  it('returns null for non-top cards and unplayable cards', () => {
    const s = makeState({
      waste: [C('S', 1), C('H', 5)],
      tableau: [[C('C', 7)], [], [], [], [], [], []],
    });
    expect(autoMoveTarget(s, W, 0)).toBeNull();   // buried Ace
    expect(autoMoveTarget(s, W, 1)).toBeNull();   // 5H fits no foundation
    expect(autoMoveTarget(s, T(0), 0)).toBeNull(); // nor does 7C
  });

  it('never mutates the state', () => {
    const s = makeState({
      waste: [C('S', 1)],
      foundations: [[], [C('D', 1)], [], []],
      tableau: [[C('D', 2)], [], [], [], [], [], []],
    });
    const before = JSON.stringify(s);
    autoMoveTarget(s, W, 0);
    autoMoveTarget(s, T(0), 0);
    autoMoveTarget(s, T(1), 0);
    expect(JSON.stringify(s)).toBe(before);
  });
});

/* ----------------------------- auto-complete --------------------------- */

describe('auto-complete', () => {
  it('drains an all-exposed endgame to a win', () => {
    const s = makeState({
      foundations: [suitRun('S', 11), suitRun('H', 11), suitRun('D', 11), suitRun('C', 11)],
      tableau: [
        [C('S', 13), C('S', 12)],
        [C('H', 13), C('H', 12)],
        [C('D', 13), C('D', 12)],
        [C('C', 13), C('C', 12)],
        [], [], [],
      ],
    });
    expect(canAutoComplete(s)).toBe(true);
    expect(isWon(s)).toBe(false);

    let steps = 0;
    while (autoCompleteStep(s)) {
      steps += 1;
      expect(steps).toBeLessThanOrEqual(8); // 8 cards left — never wedge, never loop
    }
    expect(steps).toBe(8);
    expect(isWon(s)).toBe(true);
    expect(s.won).toBe(true);
    expect(s.foundations.every((f) => f.length === 13)).toBe(true);
  });

  it('a face-down card or a stocked card blocks auto-complete', () => {
    const faceDown = makeState({ tableau: [[C('S', 13, false)], [], [], [], [], [], []] });
    expect(canAutoComplete(faceDown)).toBe(false);
    const stocked = makeState({ stock: [C('S', 13, false)] });
    expect(canAutoComplete(stocked)).toBe(false);
  });
});
