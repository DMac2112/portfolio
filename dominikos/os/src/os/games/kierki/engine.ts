// Kierki (Hearts) — pure deterministic rules engine. No DOM or React.
// Cards share the Pasjans renderer contract: stable id, suit, rank and faceUp.

import type { Card, Suit } from '../pasjans/engine';

export type { Card, Suit } from '../pasjans/engine';

export type Player = 0 | 1 | 2 | 3;
export type PassDirection = 'left' | 'right' | 'across' | 'hold';
export type Phase = 'passing' | 'playing' | 'roundEnd' | 'gameOver';
export type Four<T> = [T, T, T, T];

export interface TrickPlay {
  player: Player;
  card: Card;
}

export interface GameState {
  hands: Four<Card[]>;
  trick: TrickPlay[];
  tricksTaken: Four<Card[]>;
  scores: Four<number>;
  roundScores: Four<number>;
  phase: Phase;
  passDir: PassDirection;
  pendingPass: Card[];
  leader: Player;
  heartsBroken: boolean;
  round: number;
}

const SUITS: readonly Suit[] = ['S', 'H', 'D', 'C'];
const PLAYERS: readonly Player[] = [0, 1, 2, 3];

function asPlayer(value: number): Player {
  return ((value % 4 + 4) % 4) as Player;
}

function rankStrength(card: Card): number {
  return card.rank === 1 ? 14 : card.rank;
}

function sortHand(hand: Card[]): void {
  hand.sort((a, b) => SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit)
    || rankStrength(a) - rankStrength(b)
    || a.id - b.id);
}

function shuffledDeck(seed?: number): Card[] {
  const deck: Card[] = [];
  for (let suitIndex = 0; suitIndex < SUITS.length; suitIndex++) {
    for (let rank = 1; rank <= 13; rank++) {
      deck.push({ id: suitIndex * 13 + rank - 1, suit: SUITS[suitIndex], rank, faceUp: true });
    }
  }

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
  return deck;
}

function deal(seed?: number): Four<Card[]> {
  const hands: Four<Card[]> = [[], [], [], []];
  const deck = shuffledDeck(seed);
  for (let i = 0; i < deck.length; i++) hands[i % 4].push(deck[i]);
  for (const hand of hands) sortHand(hand);
  return hands;
}

function twoOfClubsHolder(hands: Four<Card[]>): Player {
  const holder = hands.findIndex((hand) => hand.some((card) => card.suit === 'C' && card.rank === 2));
  return asPlayer(holder < 0 ? 0 : holder);
}

function freshRound(
  scores: Four<number>,
  passDir: PassDirection,
  round: number,
  seed?: number,
): GameState {
  const hands = deal(seed);
  return {
    hands,
    trick: [],
    tricksTaken: [[], [], [], []],
    scores: [...scores] as Four<number>,
    roundScores: [0, 0, 0, 0],
    phase: passDir === 'hold' ? 'playing' : 'passing',
    passDir,
    pendingPass: [],
    leader: twoOfClubsHolder(hands),
    heartsBroken: false,
    round,
  };
}

/** Start a game at the left-pass round. Supplying a seed makes the deal repeatable. */
export function newGame(seed?: number): GameState {
  return freshRound([0, 0, 0, 0], 'left', 1, seed);
}

export function nextPassDirection(direction: PassDirection): PassDirection {
  switch (direction) {
    case 'left': return 'right';
    case 'right': return 'across';
    case 'across': return 'hold';
    case 'hold': return 'left';
  }
}

export function passTarget(player: Player, direction: PassDirection): Player {
  switch (direction) {
    case 'left': return asPlayer(player + 1);
    case 'right': return asPlayer(player - 1);
    case 'across': return asPlayer(player + 2);
    case 'hold': return player;
  }
}

/** Replace a completed round while preserving cumulative scores and rotating pass direction. */
export function startNextRound(state: GameState, seed?: number): boolean {
  if (state.phase !== 'roundEnd') return false;
  const next = freshRound(state.scores, nextPassDirection(state.passDir), state.round + 1, seed);
  Object.assign(state, next);
  return true;
}

/** Toggle one human card in the pending three-card pass. */
export function togglePassCard(state: GameState, cardId: number): boolean {
  if (state.phase !== 'passing' || state.passDir === 'hold') return false;
  const selectedIndex = state.pendingPass.findIndex((card) => card.id === cardId);
  if (selectedIndex >= 0) {
    state.pendingPass.splice(selectedIndex, 1);
    return true;
  }
  const card = state.hands[0].find((candidate) => candidate.id === cardId);
  if (!card || state.pendingPass.length >= 3) return false;
  state.pendingPass.push(card);
  return true;
}

/** Deterministic passing heuristic used by the three computer players. */
export function choosePassCards(hand: readonly Card[]): Card[] {
  const burden = (card: Card): number => {
    if (card.suit === 'S' && card.rank === 12) return 10_000;
    if (card.suit === 'S' && (card.rank === 1 || card.rank === 13)) return 8_000 + rankStrength(card);
    if (card.suit === 'H') return 4_000 + rankStrength(card) * 10;
    return rankStrength(card) * 10 + card.id / 100;
  };
  return [...hand].sort((a, b) => burden(b) - burden(a) || a.id - b.id).slice(0, 3);
}

/** Apply all four passes simultaneously after the human has selected exactly three cards. */
export function confirmPass(state: GameState): boolean {
  if (state.phase !== 'passing' || state.passDir === 'hold' || state.pendingPass.length !== 3) return false;
  const humanIds = new Set(state.hands[0].map((card) => card.id));
  if (new Set(state.pendingPass.map((card) => card.id)).size !== 3
    || state.pendingPass.some((card) => !humanIds.has(card.id))) return false;

  const humanCards = state.pendingPass.map((selected) => state.hands[0].find((card) => card.id === selected.id)!);
  const passing: Four<Card[]> = [
    humanCards,
    choosePassCards(state.hands[1]),
    choosePassCards(state.hands[2]),
    choosePassCards(state.hands[3]),
  ];

  for (const player of PLAYERS) {
    const ids = new Set(passing[player].map((card) => card.id));
    state.hands[player] = state.hands[player].filter((card) => !ids.has(card.id));
  }
  for (const player of PLAYERS) {
    state.hands[passTarget(player, state.passDir)].push(...passing[player]);
  }
  for (const hand of state.hands) sortHand(hand);

  state.pendingPass = [];
  state.leader = twoOfClubsHolder(state.hands);
  state.heartsBroken = false;
  state.phase = 'playing';
  return true;
}

export function currentPlayer(state: GameState): Player | null {
  if (state.phase !== 'playing') return null;
  return asPlayer(state.leader + state.trick.length);
}

export function cardPoints(card: Card): number {
  if (card.suit === 'H') return 1;
  if (card.suit === 'S' && card.rank === 12) return 13;
  return 0;
}

export function trickWinner(trick: readonly TrickPlay[]): Player | null {
  if (trick.length === 0) return null;
  const leadSuit = trick[0].card.suit;
  let best = trick[0];
  for (const play of trick.slice(1)) {
    if (play.card.suit === leadSuit && rankStrength(play.card) > rankStrength(best.card)) best = play;
  }
  return best.player;
}

function completedTricks(state: GameState): number {
  return state.tricksTaken.reduce((total, pile) => total + pile.length, 0) / 4;
}

/** Legal cards for the active player. All reachable playing states return at least one card. */
export function legalMoves(state: GameState, player: number): Card[] {
  if (currentPlayer(state) !== player || player < 0 || player > 3) return [];
  const hand = state.hands[player];
  if (hand.length === 0) return [];
  const firstTrick = completedTricks(state) === 0;

  if (state.trick.length === 0) {
    if (firstTrick) {
      const twoClubs = hand.find((card) => card.suit === 'C' && card.rank === 2);
      return twoClubs ? [twoClubs] : [];
    }
    if (!state.heartsBroken) {
      const nonHearts = hand.filter((card) => card.suit !== 'H');
      if (nonHearts.length > 0) return nonHearts;
    }
    return [...hand];
  }

  const leadSuit = state.trick[0].card.suit;
  const following = hand.filter((card) => card.suit === leadSuit);
  if (following.length > 0) return following;
  if (!firstTrick) return [...hand];

  const nonPoints = hand.filter((card) => cardPoints(card) === 0);
  return nonPoints.length > 0 ? nonPoints : [...hand];
}

function finishRound(state: GameState): void {
  const shooter = state.roundScores.findIndex((score) => score === 26);
  if (shooter >= 0) {
    state.roundScores = PLAYERS.map((player) => player === shooter ? 0 : 26) as Four<number>;
  }
  state.scores = PLAYERS.map((player) => state.scores[player] + state.roundScores[player]) as Four<number>;
  state.phase = state.scores.some((score) => score >= 100) ? 'gameOver' : 'roundEnd';
}

/** Play by stable card id. Returns false without mutation when the play is illegal. */
export function playCard(state: GameState, player: number, cardId: number): boolean {
  const legal = legalMoves(state, player);
  if (!legal.some((card) => card.id === cardId)) return false;
  const hand = state.hands[player];
  const index = hand.findIndex((card) => card.id === cardId);
  if (index < 0) return false;

  const [card] = hand.splice(index, 1);
  state.trick.push({ player: player as Player, card });
  if (card.suit === 'H') state.heartsBroken = true;

  if (state.trick.length === 4) {
    const winner = trickWinner(state.trick)!;
    const wonCards = state.trick.map((play) => play.card);
    state.tricksTaken[winner].push(...wonCards);
    state.roundScores[winner] += wonCards.reduce((points, wonCard) => points + cardPoints(wonCard), 0);
    state.trick = [];
    state.leader = winner;
    if (state.hands.every((remaining) => remaining.length === 0)) finishRound(state);
  }
  return true;
}

function lowToHigh(a: Card, b: Card): number {
  return rankStrength(a) - rankStrength(b) || a.id - b.id;
}

/** Deterministic, non-search computer choice. It always returns one of legalMoves. */
export function chooseAiCard(state: GameState, player: number): Card | null {
  const legal = legalMoves(state, player);
  if (legal.length === 0) return null;
  const ordered = [...legal].sort(lowToHigh);
  if (state.trick.length === 0) return ordered[0];

  const leadSuit = state.trick[0].card.suit;
  const winningPlayer = trickWinner(state.trick)!;
  const winningCard = state.trick.find((play) => play.player === winningPlayer)!.card;
  const queenSpades = ordered.find((card) => card.suit === 'S' && card.rank === 12);

  // A queen of spades is safe under a king or ace already winning a spade trick.
  if (queenSpades && leadSuit === 'S' && winningCard.suit === 'S' && rankStrength(winningCard) > 12) {
    return queenSpades;
  }

  if (ordered[0].suit === leadSuit) {
    const losing = ordered.filter((card) => rankStrength(card) < rankStrength(winningCard));
    return losing[0] ?? ordered[0];
  }

  // When void, shed the queen first, then the highest heart, then the highest remaining card.
  if (queenSpades) return queenSpades;
  const hearts = ordered.filter((card) => card.suit === 'H');
  if (hearts.length > 0) return hearts[hearts.length - 1];
  return ordered[ordered.length - 1];
}

export function playAiTurn(state: GameState): boolean {
  const player = currentPlayer(state);
  if (player === null) return false;
  const card = chooseAiCard(state, player);
  return card !== null && playCard(state, player, card.id);
}

/** The lowest cumulative score wins once the threshold-ending round is complete. */
export function gameWinner(state: GameState): Player | null {
  if (state.phase !== 'gameOver') return null;
  let winner: Player = 0;
  for (const player of PLAYERS.slice(1)) {
    if (state.scores[player] < state.scores[winner]) winner = player;
  }
  return winner;
}
