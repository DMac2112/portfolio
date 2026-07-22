// Pasjans Pająk (Spider) engine tests — exercises the LOCKED contract in engine.ts headlessly:
// unique global ids, deal shape across all three suit-difficulty variants, single-card any-suit
// builds, same-suit-only multi-card runs (mixed-suit rejected), King-to-Ace auto-completion with
// the exposed-card flip, blocked/legal stock deals, the win condition, and a full undo round trip
// across a move+flip, a run completion, and a stock deal. Targeted cases hand-build GameState
// fixtures (plain data — the engine never checks global pile integrity, only local rules).
import { describe, it, expect } from 'vitest';
import {
  newGame, canMoveStack, moveStack, dealStock, canDeal, movableRunLength, isWon, undo,
  type Card, type GameState, type PileRef, type Suit,
} from './engine';

/* ------------------------------ fixtures ------------------------------- */

let uid = 0;
/** Card literal with a fresh id each call — id value never matters to rule logic in isolation. */
const C = (suit: Suit, rank: number, faceUp = true): Card => ({ id: uid++, suit, rank, faceUp });

/** 10 empty columns, with just the listed indices overridden. */
function cols(over: Record<number, Card[]>): Card[][] {
  const base: Card[][] = Array.from({ length: 10 }, () => [] as Card[]);
  for (const [i, pile] of Object.entries(over)) base[Number(i)] = pile;
  return base;
}

/** 10 columns, each built by `make(i)` — handy when every column must be non-empty. */
function tenCols(make: (i: number) => Card[]): Card[][] {
  return Array.from({ length: 10 }, (_, i) => make(i));
}

/** Minimal empty state; override just the piles a test cares about. */
function makeState(over: Partial<GameState> = {}): GameState {
  return {
    tableau: Array.from({ length: 10 }, () => [] as Card[]),
    stock: [],
    completed: 0,
    suitCount: 1,
    score: 500,
    moves: 0,
    won: false,
    history: [],
    ...over,
  };
}

const T = (index: number): PileRef => ({ pile: 'tableau', index });
const clone = <V,>(v: V): V => JSON.parse(JSON.stringify(v)) as V;

/* -------------------------------- deal --------------------------------- */

describe('deal shape', () => {
  it.each([1, 2, 4] as const)('%i-suit deals all 104 unique ids exactly once, 0..103', (suitCount) => {
    const g = newGame(suitCount, 9);
    const ids = [...g.stock, ...g.tableau.flat()].map((c) => c.id);
    expect(ids).toHaveLength(104);
    expect(new Set(ids).size).toBe(104);
    expect([...ids].sort((a, b) => a - b)).toEqual(Array.from({ length: 104 }, (_, id) => id));
  });

  it.each([1, 2, 4] as const)('%i-suit deals 6/6/6/6/5/5/5/5/5/5 with face-up tops and a 50-card stock', (suitCount) => {
    const g = newGame(suitCount, 5);
    expect(g.tableau.map((col) => col.length)).toEqual([6, 6, 6, 6, 5, 5, 5, 5, 5, 5]);
    for (const col of g.tableau) {
      for (let i = 0; i < col.length - 1; i++) expect(col[i].faceUp).toBe(false);
      expect(col[col.length - 1].faceUp).toBe(true);
    }
    expect(g.stock).toHaveLength(50);
    expect(g.stock.every((c) => !c.faceUp)).toBe(true);
    expect(g.score).toBe(500);
    expect(g.moves).toBe(0);
    expect(g.completed).toBe(0);
    expect(g.won).toBe(false);
  });

  it('the same seed deals the identical layout twice; a different seed differs', () => {
    expect(newGame(1, 42)).toEqual(newGame(1, 42));
    expect(JSON.stringify(newGame(1, 42))).not.toBe(JSON.stringify(newGame(1, 43)));
  });
});

describe('suit composition', () => {
  it('1 suit deals 104 spades — 8 copies of every rank', () => {
    const g = newGame(1, 3);
    const all = [...g.stock, ...g.tableau.flat()];
    expect(all.every((c) => c.suit === 'S')).toBe(true);
    const byRank = new Map<number, number>();
    for (const c of all) byRank.set(c.rank, (byRank.get(c.rank) ?? 0) + 1);
    for (let r = 1; r <= 13; r++) expect(byRank.get(r)).toBe(8);
  });

  it('2 suits deal 52 spades + 52 hearts, nothing else', () => {
    const g = newGame(2, 3);
    const all = [...g.stock, ...g.tableau.flat()];
    const bySuit = new Map<string, number>();
    for (const c of all) bySuit.set(c.suit, (bySuit.get(c.suit) ?? 0) + 1);
    expect(bySuit.get('S')).toBe(52);
    expect(bySuit.get('H')).toBe(52);
    expect(bySuit.has('D')).toBe(false);
    expect(bySuit.has('C')).toBe(false);
  });

  it('4 suits deal two full 52-card decks — 26 of each suit', () => {
    const g = newGame(4, 3);
    const all = [...g.stock, ...g.tableau.flat()];
    const bySuit = new Map<string, number>();
    for (const c of all) bySuit.set(c.suit, (bySuit.get(c.suit) ?? 0) + 1);
    expect(bySuit.get('S')).toBe(26);
    expect(bySuit.get('H')).toBe(26);
    expect(bySuit.get('D')).toBe(26);
    expect(bySuit.get('C')).toBe(26);
  });
});

/* ------------------------------ legality ------------------------------- */

describe('move legality', () => {
  it('any face-up card may build onto a card one rank higher, regardless of suit', () => {
    const s = makeState({ tableau: cols({ 0: [C('S', 8)], 1: [C('H', 7)] }) });
    expect(canMoveStack(s, T(1), 0, T(0))).toBe(true); // 7H onto 8S: legal despite suit/color mismatch
  });

  it('a rank gap (not exactly one lower) is rejected', () => {
    const s = makeState({ tableau: cols({ 0: [C('S', 8)], 1: [C('D', 6)] }) });
    expect(canMoveStack(s, T(1), 0, T(0))).toBe(false);
  });

  it('any single card may move to an empty column, any rank', () => {
    const s = makeState({ tableau: cols({ 0: [], 1: [C('H', 5)] }) });
    expect(canMoveStack(s, T(1), 0, T(0))).toBe(true);
  });

  it('a King can only ever move to an empty column — nothing outranks it', () => {
    const s = makeState({ tableau: cols({ 0: [C('S', 13)], 1: [], 2: [C('H', 5)] }) });
    expect(canMoveStack(s, T(0), 0, T(1))).toBe(true);  // king → empty column
    expect(canMoveStack(s, T(0), 0, T(2))).toBe(false); // king → non-empty column: never legal
  });

  it('face-down cards never move', () => {
    const s = makeState({ tableau: cols({ 0: [C('S', 8)], 1: [C('H', 7, false)] }) });
    expect(canMoveStack(s, T(1), 0, T(0))).toBe(false);
  });

  it('a pile onto itself is not a move', () => {
    const s = makeState({ tableau: cols({ 2: [C('S', 8)] }) });
    expect(canMoveStack(s, T(2), 0, T(2))).toBe(false);
  });

  it('an out-of-range column index is rejected', () => {
    const s = makeState({ tableau: cols({ 0: [C('S', 8)] }) });
    expect(canMoveStack(s, T(0), 0, { pile: 'tableau', index: 99 })).toBe(false);
    expect(canMoveStack(s, { pile: 'tableau', index: -1 }, 0, T(0))).toBe(false);
  });
});

describe('multi-card runs', () => {
  it('accepts a same-suit descending run as a single unit and flips the exposed card', () => {
    const s = makeState({
      tableau: cols({
        0: [C('S', 9, false), C('S', 8), C('S', 7), C('S', 6)],
        1: [C('H', 9)],
      }),
    });
    expect(canMoveStack(s, T(0), 1, T(1))).toBe(true); // 8-7-6 of spades onto 9H
    expect(moveStack(s, T(0), 1, T(1))).toBe(true);
    expect(s.tableau[1].map((c) => c.rank)).toEqual([9, 8, 7, 6]);
    expect(s.tableau[0]).toHaveLength(1);
    expect(s.tableau[0][0].faceUp).toBe(true); // exposed card auto-flips
    expect(s.score).toBe(499);
    expect(s.moves).toBe(1);
  });

  it('rejects a mixed-suit descending run as a multi-card move', () => {
    const s = makeState({
      tableau: cols({
        0: [C('S', 9, false), C('S', 8), C('H', 7), C('S', 6)], // 8S,7H,6S — descending but not same-suit
        1: [C('H', 10)],
      }),
    });
    expect(canMoveStack(s, T(0), 1, T(1))).toBe(false); // the 8S..6S run is mixed suit: rejected as a unit
    expect(moveStack(s, T(0), 1, T(1))).toBe(false);
    expect(s.tableau[0]).toHaveLength(4); // nothing moved
  });

  it('rejects a mixed-suit run moving to an empty column too', () => {
    const s = makeState({
      tableau: cols({
        0: [C('C', 9, false), C('D', 8), C('H', 7)], // 8D,7H — descending, different suits
        1: [],
      }),
    });
    expect(canMoveStack(s, T(0), 1, T(1))).toBe(false);
  });

  it('movableRunLength reports the maximal same-suit run at a column top', () => {
    const s = makeState({
      tableau: cols({ 0: [C('D', 9, false), C('S', 8), C('S', 7), C('H', 6), C('H', 5)] }),
    });
    // top-down: H5 on H6 (same suit, consecutive) → run of 2; H6 on S7 breaks suit → stops there
    expect(movableRunLength(s, 0)).toBe(2);
  });
});

/* ---------------------------- run completion ---------------------------- */

describe('run completion', () => {
  it('an auto-forming King-to-Ace same-suit run clears to completed, scores +100, and flips exposed cards', () => {
    // column 0: a buried face-down filler under a complete K..2 run of spades (12 cards)
    const kTo2: Card[] = [];
    for (let r = 13; r >= 2; r--) kTo2.push(C('S', r));
    // column 1: a buried face-down filler under the lone Ace of spades
    const s = makeState({
      score: 500,
      tableau: cols({
        0: [C('C', 4, false), ...kTo2],
        1: [C('D', 9, false), C('S', 1)],
      }),
    });
    expect(moveStack(s, T(1), 1, T(0))).toBe(true); // the ace of spades completes the run
    expect(s.completed).toBe(1);
    expect(s.score).toBe(500 - 1 + 100);
    expect(s.tableau[0]).toHaveLength(1); // the 13-card run is gone
    expect(s.tableau[0][0].rank).toBe(4);
    expect(s.tableau[0][0].faceUp).toBe(true); // newly exposed filler flips
    expect(s.tableau[1]).toHaveLength(1);
    expect(s.tableau[1][0].faceUp).toBe(true); // exposed filler in the source column flips too
  });

  it('a stack with correctly descending ranks but alternating suits never completes', () => {
    const stack: Card[] = [];
    for (let r = 13; r >= 2; r--) stack.push(C(r % 2 === 0 ? 'H' : 'S', r)); // K..2, alternating suits
    const s = makeState({
      tableau: cols({
        0: [C('C', 9, false), ...stack],   // buried filler + the 12-card alternating-suit stack
        1: [C('D', 6, false), C('H', 1)],  // ace of hearts, single card, atop a filler
      }),
    });
    expect(moveStack(s, T(1), 1, T(0))).toBe(true); // single-card build ignores suit — this lands
    expect(s.completed).toBe(0);        // but the run is NOT same-suit throughout, so no completion
    expect(s.tableau[0]).toHaveLength(14); // filler(1) + stack(12) + the just-moved ace(1)
  });

  it('sets state.won true once the 8th run completes', () => {
    const kTo2: Card[] = [];
    for (let r = 13; r >= 2; r--) kTo2.push(C('D', r));
    const s = makeState({
      completed: 7,
      tableau: cols({
        0: [C('H', 5, false), ...kTo2],
        1: [C('S', 2, false), C('D', 1)],
      }),
    });
    expect(isWon(s)).toBe(false);
    expect(moveStack(s, T(1), 1, T(0))).toBe(true);
    expect(s.completed).toBe(8);
    expect(s.won).toBe(true);
    expect(isWon(s)).toBe(true);
  });
});

/* ------------------------------ stock deal ------------------------------ */

describe('stock deal', () => {
  it('is blocked while any column is empty', () => {
    const s = makeState({
      tableau: tenCols((i) => (i === 3 ? [] : [C('S', 5)])),
      stock: Array.from({ length: 50 }, () => C('S', 1, false)),
    });
    expect(canDeal(s)).toBe(false);
    expect(dealStock(s)).toBe(false);
    expect(s.moves).toBe(0);
    expect(s.history).toHaveLength(0);
  });

  it('deals exactly one face-up card onto each of the 10 columns when none is empty', () => {
    const s = makeState({
      tableau: tenCols(() => [C('S', 5)]),
      stock: Array.from({ length: 50 }, () => C('H', 2, false)),
    });
    expect(canDeal(s)).toBe(true);
    expect(dealStock(s)).toBe(true);
    for (const col of s.tableau) {
      expect(col).toHaveLength(2);
      expect(col[col.length - 1].faceUp).toBe(true);
    }
    expect(s.stock).toHaveLength(40);
    expect(s.moves).toBe(1);
    expect(s.score).toBe(499);
  });

  it('is blocked once the stock itself is empty', () => {
    const s = makeState({ tableau: tenCols(() => [C('S', 5)]), stock: [] });
    expect(dealStock(s)).toBe(false);
  });

  it('a deal can complete a run: the newly-dealt card lands on top of an existing K..2 run', () => {
    const kTo2: Card[] = [];
    for (let r = 13; r >= 2; r--) kTo2.push(C('C', r));
    const stock: Card[] = [];
    for (let i = 0; i < 9; i++) stock.push(C('H', 3, false)); // filler for the other 9 columns
    stock.push(C('C', 1, false)); // dealt LAST → lands on column 0 first (stock pops from the end)
    const s = makeState({
      tableau: [
        [C('D', 8, false), ...kTo2],
        ...tenCols(() => [C('S', 5)]).slice(1),
      ],
      stock,
    });
    expect(dealStock(s)).toBe(true);
    expect(s.completed).toBe(1);
    expect(s.tableau[0]).toHaveLength(1); // filler exposed, run cleared
    expect(s.tableau[0][0].faceUp).toBe(true);
  });
});

/* --------------------------------- undo -------------------------------- */

describe('undo', () => {
  it('undoes a move+flip, a run completion, and a stock deal back to the exact prior states', () => {
    const s = makeState({
      tableau: cols({
        0: [C('C', 4, false), C('S', 8)],              // source of move 1 (flip on expose)
        1: [C('H', 9)],                                 // destination of move 1
        2: [C('D', 3, false), ...(() => {                // K..2 of spades, buried filler beneath
          const run: Card[] = [];
          for (let r = 13; r >= 2; r--) run.push(C('S', r));
          return run;
        })()],
        3: [C('D', 6, false), C('S', 1)],                // source of move 2 (the completing ace)
        4: [C('D', 3)], 5: [C('D', 3)], 6: [C('D', 3)],
        7: [C('D', 3)], 8: [C('D', 3)], 9: [C('D', 3)],
      }),
      stock: Array.from({ length: 20 }, () => C('H', 4, false)),
    });
    const snap0 = clone(s);

    // action 1: a move that exposes and flips a buried card
    expect(moveStack(s, T(0), 1, T(1))).toBe(true);
    expect(s.tableau[0][0].faceUp).toBe(true);
    const snap1 = clone(s);

    // action 2: a move that completes a King-to-Ace run (two flips: source + the cleared column)
    expect(moveStack(s, T(3), 1, T(2))).toBe(true);
    expect(s.completed).toBe(1);
    const snap2 = clone(s);

    // action 3: a stock deal
    expect(dealStock(s)).toBe(true);
    expect(s.moves).toBe(3);

    expect(undo(s)).toBe(true);
    expect(s).toEqual(snap2);
    expect(undo(s)).toBe(true);
    expect(s).toEqual(snap1);
    expect(undo(s)).toBe(true);
    expect(s).toEqual(snap0);
  });

  it('undo on a fresh game returns false', () => {
    const g = newGame(1, 11);
    expect(undo(g)).toBe(false);
  });
});

/* --------------------------------- win ---------------------------------- */

describe('win', () => {
  it('is won only at exactly 8 complete runs', () => {
    expect(isWon(makeState({ completed: 7 }))).toBe(false);
    expect(isWon(makeState({ completed: 8 }))).toBe(true);
    expect(isWon(makeState({ completed: 9 }))).toBe(false);
  });
});
