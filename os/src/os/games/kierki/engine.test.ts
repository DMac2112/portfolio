import { describe, expect, it } from 'vitest';
import {
  cardPoints,
  chooseAiCard,
  choosePassCards,
  confirmPass,
  currentPlayer,
  gameWinner,
  legalMoves,
  newGame,
  nextPassDirection,
  passTarget,
  playCard,
  startNextRound,
  togglePassCard,
  trickWinner,
  type Card,
  type Four,
  type GameState,
  type Suit,
  type TrickPlay,
} from './engine';

const C = (suit: Suit, rank: number): Card => ({
  id: 'SHDC'.indexOf(suit) * 13 + rank - 1,
  suit,
  rank,
  faceUp: true,
});

const pastTrick = (): Four<Card[]> => [[C('C', 3), C('C', 4), C('C', 5), C('C', 6)], [], [], []];

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    hands: [[], [], [], []],
    trick: [],
    tricksTaken: [[], [], [], []],
    scores: [0, 0, 0, 0],
    roundScores: [0, 0, 0, 0],
    phase: 'playing',
    passDir: 'left',
    pendingPass: [],
    leader: 0,
    heartsBroken: false,
    round: 1,
    ...overrides,
  };
}

function selectedIds(cards: readonly Card[]): number[] {
  return cards.map((card) => card.id).sort((a, b) => a - b);
}

describe('deal and passing', () => {
  it('deals a deterministic, globally unique 52-card pack as four hands of 13', () => {
    const first = newGame(42);
    const again = newGame(42);
    const different = newGame(43);
    const cards = first.hands.flat();

    expect(first).toEqual(again);
    expect(first.hands).not.toEqual(different.hands);
    expect(first.hands.map((hand) => hand.length)).toEqual([13, 13, 13, 13]);
    expect(cards).toHaveLength(52);
    expect(new Set(cards.map((card) => card.id)).size).toBe(52);
    expect(cards.every((card) => card.faceUp)).toBe(true);
    expect(first.phase).toBe('passing');
    expect(first.passDir).toBe('left');
  });

  it('maps every pass direction and rotates left, right, across, hold', () => {
    expect([0, 1, 2, 3].map((player) => passTarget(player as 0 | 1 | 2 | 3, 'left'))).toEqual([1, 2, 3, 0]);
    expect([0, 1, 2, 3].map((player) => passTarget(player as 0 | 1 | 2 | 3, 'right'))).toEqual([3, 0, 1, 2]);
    expect([0, 1, 2, 3].map((player) => passTarget(player as 0 | 1 | 2 | 3, 'across'))).toEqual([2, 3, 0, 1]);
    expect([0, 1, 2, 3].map((player) => passTarget(player as 0 | 1 | 2 | 3, 'hold'))).toEqual([0, 1, 2, 3]);

    let direction = nextPassDirection('left');
    expect(direction).toBe('right');
    direction = nextPassDirection(direction);
    expect(direction).toBe('across');
    direction = nextPassDirection(direction);
    expect(direction).toBe('hold');
    expect(nextPassDirection(direction)).toBe('left');
  });

  it('passes three cards from every player simultaneously and preserves 52 unique cards', () => {
    const state = newGame(7);
    const selected = state.hands[0].slice(0, 3);
    for (const card of selected) expect(togglePassCard(state, card.id)).toBe(true);

    expect(confirmPass(state)).toBe(true);
    expect(state.phase).toBe('playing');
    expect(state.pendingPass).toEqual([]);
    expect(state.hands.map((hand) => hand.length)).toEqual([13, 13, 13, 13]);
    expect(selected.every((card) => state.hands[1].some((received) => received.id === card.id))).toBe(true);
    expect(selected.every((card) => state.hands[0].every((remaining) => remaining.id !== card.id))).toBe(true);
    expect(new Set(state.hands.flat().map((card) => card.id)).size).toBe(52);
  });

  it('rejects an incomplete human pass without changing phase or hand sizes', () => {
    const state = newGame(9);
    expect(togglePassCard(state, state.hands[0][0].id)).toBe(true);
    expect(togglePassCard(state, state.hands[0][1].id)).toBe(true);
    expect(confirmPass(state)).toBe(false);
    expect(state.phase).toBe('passing');
    expect(state.hands.map((hand) => hand.length)).toEqual([13, 13, 13, 13]);
  });

  it('rotates new rounds and skips passing on hold before returning to left', () => {
    const state = newGame(1);
    state.scores = [11, 22, 33, 44];

    state.phase = 'roundEnd';
    expect(startNextRound(state, 2)).toBe(true);
    expect(state.passDir).toBe('right');
    expect(state.phase).toBe('passing');
    expect(state.scores).toEqual([11, 22, 33, 44]);

    state.phase = 'roundEnd';
    expect(startNextRound(state, 3)).toBe(true);
    expect(state.passDir).toBe('across');

    state.phase = 'roundEnd';
    expect(startNextRound(state, 4)).toBe(true);
    expect(state.passDir).toBe('hold');
    expect(state.phase).toBe('playing');
    const opener = currentPlayer(state)!;
    expect(legalMoves(state, opener)).toEqual([C('C', 2)]);

    state.phase = 'roundEnd';
    expect(startNextRound(state, 5)).toBe(true);
    expect(state.passDir).toBe('left');
    expect(state.phase).toBe('passing');
    expect(state.round).toBe(5);
  });
});

describe('play rules', () => {
  it('requires the two of clubs as the opening lead', () => {
    const state = makeState({ hands: [[C('C', 2), C('C', 1), C('H', 2)], [], [], []] });
    expect(legalMoves(state, 0)).toEqual([C('C', 2)]);
    expect(playCard(state, 0, C('C', 1).id)).toBe(false);
    expect(state.hands[0]).toHaveLength(3);
    expect(playCard(state, 0, C('C', 2).id)).toBe(true);
  });

  it('requires following the led suit whenever the player can', () => {
    const state = makeState({
      hands: [[], [C('C', 5), C('H', 7), C('S', 1)], [], []],
      trick: [{ player: 0, card: C('C', 2) }],
    });
    expect(legalMoves(state, 1)).toEqual([C('C', 5)]);
    expect(playCard(state, 1, C('H', 7).id)).toBe(false);
  });

  it('blocks point cards on trick one when a safe discard exists', () => {
    const state = makeState({
      hands: [[], [C('H', 5), C('S', 12), C('D', 7)], [], []],
      trick: [{ player: 0, card: C('C', 2) }],
    });
    expect(legalMoves(state, 1)).toEqual([C('D', 7)]);
  });

  it('allows point cards on trick one only when every available discard is a point card', () => {
    const state = makeState({
      hands: [[], [C('H', 5), C('S', 12)], [], []],
      trick: [{ player: 0, card: C('C', 2) }],
    });
    expect(selectedIds(legalMoves(state, 1))).toEqual(selectedIds(state.hands[1]));
    expect(legalMoves(state, 1)).not.toHaveLength(0);
  });

  it('blocks a heart lead until broken, except when the hand contains only hearts', () => {
    const mixed = makeState({
      hands: [[C('H', 2), C('H', 13), C('D', 4)], [], [], []],
      tricksTaken: pastTrick(),
    });
    expect(legalMoves(mixed, 0)).toEqual([C('D', 4)]);

    const heartsOnly = makeState({ hands: [[C('H', 2), C('H', 13)], [], [], []], tricksTaken: pastTrick() });
    expect(selectedIds(legalMoves(heartsOnly, 0))).toEqual(selectedIds(heartsOnly.hands[0]));

    mixed.heartsBroken = true;
    expect(selectedIds(legalMoves(mixed, 0))).toEqual(selectedIds(mixed.hands[0]));
  });

  it('marks hearts broken as soon as a heart is legally discarded', () => {
    const state = makeState({
      hands: [[], [C('H', 8)], [], []],
      trick: [{ player: 0, card: C('C', 2) }],
    });
    expect(playCard(state, 1, C('H', 8).id)).toBe(true);
    expect(state.heartsBroken).toBe(true);
  });
});

describe('tricks and scoring', () => {
  it('awards a trick to the highest card of the led suit with ace high', () => {
    const trick: TrickPlay[] = [
      { player: 0, card: C('D', 10) },
      { player: 1, card: C('D', 1) },
      { player: 2, card: C('S', 13) },
      { player: 3, card: C('D', 13) },
    ];
    expect(trickWinner(trick)).toBe(1);
  });

  it('values each heart at one and the queen of spades at thirteen', () => {
    expect(cardPoints(C('H', 2))).toBe(1);
    expect(cardPoints(C('H', 1))).toBe(1);
    expect(cardPoints(C('S', 12))).toBe(13);
    expect(cardPoints(C('S', 13))).toBe(0);
    expect(cardPoints(C('D', 12))).toBe(0);
  });

  it('collects four trick cards and adds heart plus queen points to the winner', () => {
    const state = makeState({
      hands: [[], [], [], [C('S', 12)]],
      trick: [
        { player: 0, card: C('S', 13) },
        { player: 1, card: C('S', 2) },
        { player: 2, card: C('H', 5) },
      ],
    });
    expect(playCard(state, 3, C('S', 12).id)).toBe(true);
    expect(state.tricksTaken[0]).toHaveLength(4);
    expect(state.roundScores).toEqual([14, 0, 0, 0]);
    expect(state.scores).toEqual([14, 0, 0, 0]);
    expect(state.phase).toBe('roundEnd');
  });

  it('scores shooting the moon as zero for the shooter and twenty-six for all opponents', () => {
    const state = makeState({
      hands: [[], [], [], [C('H', 2)]],
      trick: [
        { player: 0, card: C('C', 1) },
        { player: 1, card: C('C', 3) },
        { player: 2, card: C('C', 4) },
      ],
      roundScores: [25, 0, 0, 0],
    });
    expect(playCard(state, 3, C('H', 2).id)).toBe(true);
    expect(state.roundScores).toEqual([0, 26, 26, 26]);
    expect(state.scores).toEqual([0, 26, 26, 26]);
    expect(state.phase).toBe('roundEnd');
  });

  it('ends the game at one hundred and selects the lowest cumulative score', () => {
    const state = makeState({
      hands: [[], [], [], [C('H', 2)]],
      trick: [
        { player: 0, card: C('C', 1) },
        { player: 1, card: C('C', 3) },
        { player: 2, card: C('C', 4) },
      ],
      scores: [99, 50, 60, 40],
    });
    expect(playCard(state, 3, C('H', 2).id)).toBe(true);
    expect(state.scores).toEqual([100, 50, 60, 40]);
    expect(state.phase).toBe('gameOver');
    expect(gameWinner(state)).toBe(3);
    expect(startNextRound(state, 2)).toBe(false);
  });
});

describe('computer player legality and heuristics', () => {
  it('follows suit low and avoids taking an existing point trick when possible', () => {
    const low = makeState({
      hands: [[], [C('C', 2), C('C', 9), C('H', 13)], [], []],
      trick: [{ player: 0, card: C('C', 10) }],
    });
    expect(chooseAiCard(low, 1)).toEqual(C('C', 2));

    const points = makeState({
      hands: [[], [], [C('C', 2), C('C', 12)], []],
      trick: [{ player: 0, card: C('C', 10) }, { player: 1, card: C('H', 5) }],
    });
    expect(chooseAiCard(points, 2)).toEqual(C('C', 2));
  });

  it('dumps the queen of spades, then a high heart, when void in the led suit', () => {
    const queen = makeState({
      hands: [[], [C('S', 12), C('H', 13), C('D', 3)], [], []],
      trick: [{ player: 0, card: C('C', 10) }],
      tricksTaken: pastTrick(),
    });
    expect(chooseAiCard(queen, 1)).toEqual(C('S', 12));

    queen.hands[1] = [C('H', 2), C('H', 13), C('D', 3)];
    expect(chooseAiCard(queen, 1)).toEqual(C('H', 13));
  });

  it('safely sheds the queen under a king or ace already winning a spade trick', () => {
    const state = makeState({
      hands: [[], [C('S', 2), C('S', 12)], [], []],
      trick: [{ player: 0, card: C('S', 1) }],
      tricksTaken: pastTrick(),
    });
    expect(chooseAiCard(state, 1)).toEqual(C('S', 12));
  });

  it('always chooses a legal card through complete thirteen-trick rounds across varied deals', () => {
    for (let seed = 0; seed < 24; seed++) {
      const state = newGame(seed);
      for (const card of choosePassCards(state.hands[0])) expect(togglePassCard(state, card.id)).toBe(true);
      expect(confirmPass(state)).toBe(true);

      let plays = 0;
      while (state.phase === 'playing') {
        const player = currentPlayer(state)!;
        const legal = legalMoves(state, player);
        const chosen = chooseAiCard(state, player);
        expect(legal.length).toBeGreaterThan(0);
        expect(chosen).not.toBeNull();
        expect(legal.some((card) => card.id === chosen!.id)).toBe(true);
        expect(playCard(state, player, chosen!.id)).toBe(true);
        plays += 1;
        expect(plays).toBeLessThanOrEqual(52);
      }

      expect(plays).toBe(52);
      expect(state.trick).toEqual([]);
      expect(state.tricksTaken.flat()).toHaveLength(52);
      expect(state.tricksTaken.reduce((count, pile) => count + pile.length / 4, 0)).toBe(13);
      expect(state.phase).toBe('roundEnd');
    }
  });
});
