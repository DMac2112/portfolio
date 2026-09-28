import { describe, it, expect } from 'vitest';
import { createGame, legalLines, applyLine, toveMove, score, isOver, boxLines } from './minigame-boxes.js';

describe('Window Boxes', () => {
  it('starts with 40 legal lines and 16 empty boxes', () => {
    const game = createGame();
    expect(legalLines(game)).toHaveLength(40);
    expect(game.boxes).toHaveLength(16);
    expect(score(game)).toEqual({ you: 0, tove: 0 });
  });

  it('completing a box scores it and keeps the turn', () => {
    let game = createGame();
    for (const line of boxLines(0).slice(0, 3)) game = applyLine(game, line).state;
    const move = applyLine(game, boxLines(0)[3]);
    expect(move.boxesCompleted).toEqual([0]);
    expect(move.extraTurn).toBe(true);
    expect(move.state.turn).toBe(game.turn);
    expect(score(move.state)[game.turn]).toBe(1);
    expect(() => applyLine(move.state, boxLines(0)[3])).toThrow();
  });

  it('Tove takes a free box', () => {
    const game = createGame();
    game.turn = 'tove';
    for (const line of boxLines(0).slice(0, 3)) game.lines[line] = 'you';
    expect(toveMove(game, () => 0)).toBe(boxLines(0)[3]);
  });

  it('Tove avoids creating a third side while safe lines remain', () => {
    const game = createGame();
    game.turn = 'tove';
    for (const line of boxLines(0).slice(0, 2)) game.lines[line] = 'you';
    const move = toveMove(game, () => 0);
    expect(boxLines(0)).not.toContain(move);
  });

  it('a full game terminates with every box owned', () => {
    let game = createGame();
    while (!isOver(game)) {
      const line = game.turn === 'tove' ? toveMove(game, () => 0) : legalLines(game)[0];
      game = applyLine(game, line).state;
    }
    expect(legalLines(game)).toHaveLength(0);
    expect(score(game).you + score(game).tove).toBe(16);
  });
});
