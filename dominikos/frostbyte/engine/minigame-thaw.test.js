import { describe, it, expect } from 'vitest';
import { FLOORS, MAX_COINS, newGame, move, legalMoves, restart, nextFloor, solutionSteps } from './minigame-thaw.js';

describe('Thaw Path', () => {
  it('allows one adjacent ice tile per move and leaves water behind', () => {
    const start = newGame();
    expect(move(start, 'U')).toBe(start);
    expect(move(start, 'R').x).toBe(1);
    const moved = move(start, 'R');
    expect(moved.tiles[0][0]).toBe(0);
    expect(legalMoves(moved)).not.toContain('L');
  });
  it('thaws a thick tile on its second departure', () => {
    let state = newGame(4);
    for (const direction of solutionSteps(FLOORS[4]).slice(0, -2)) state = move(state, direction);
    expect(state.x).toBe(0);
    expect(state.tiles[6][1]).toBe(1);
    state = move(state, 'R');
    expect(state.tiles[6][1]).toBe(1);
    state = move(state, 'U');
    expect(state.tiles[6][1]).toBe(0);
    expect(state.phase).toBe('won');
  });
  it('refreezes after a move with no legal continuation', () => {
    const start = newGame();
    const tiles = start.tiles.map((row) => [...row]);
    tiles[0][2] = 0;
    tiles[1][1] = 0;
    const trapped = move({ ...start, tiles, coins: 4 }, 'R');
    expect(trapped.event).toBe('refreeze');
    expect(trapped.x).toBe(0);
    expect(trapped.tiles[0][0]).toBe(1);
    expect(trapped.coins).toBe(4);
    expect(legalMoves({ ...start, tiles: [[0, 1, 0], [0, 0, 0]], x: 1 })).toEqual([]);
    expect(restart(trapped).floorIndex).toBe(0);
  });
  it('replays every stored solution to a full-coverage clear', () => {
    let state = newGame();
    FLOORS.forEach((floor, index) => {
      expect(state.floorIndex).toBe(index);
      for (const direction of solutionSteps(floor)) state = move(state, direction);
      expect(state.fullCoverage).toBe(true);
      expect(state.tiles.every((row) => row.every((tile) => tile === 0))).toBe(true);
      expect(state.phase).toBe(index === FLOORS.length - 1 ? 'won' : 'clear');
      if (index < FLOORS.length - 1) state = nextFloor(state);
    });
    expect(state.coins).toBe(MAX_COINS);
  });
  it('permits an early exit without the coverage bonus', () => {
    let state = newGame();
    for (const direction of 'RRRRDDDD'.split('')) state = move(state, direction);
    expect(state.phase).toBe('play');
    state = move(state, 'R');
    expect(state.phase).toBe('clear');
    expect(state.fullCoverage).toBe(false);
    expect(state.coins).toBe(2);
  });
});
