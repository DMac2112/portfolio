import { describe, it, expect } from 'vitest';
import { newGame, tick, SURFACE_Y, DEPTHS, MAX_COINS } from './minigame-floe.js';

const fish = (humming = false) => ({ id: 7, x: 480, y: DEPTHS[2], dir: 1, speed: 0, color: '#66869d', humming });
const quiet = (state) => ({ ...state, spawnMs: 100000, crabs: [], jellies: [] });

describe('Floe Fishing', () => {
  it('hooks an empty line and lands a fish at the surface', () => {
    const start = quiet({ ...newGame(1), hookY: DEPTHS[2], targetY: DEPTHS[2], fish: [fish()] });
    const caught = tick(start, {}, 0);
    expect(caught.carrying?.id).toBe(7);
    expect(caught.fish).toHaveLength(0);
    const landed = tick({ ...caught, hookY: SURFACE_Y, targetY: SURFACE_Y }, {}, 0);
    expect(landed.carrying).toBeNull();
    expect(landed.landed).toBe(1);
    expect(landed.coins).toBe(2);
  });
  it('snaps a carried fish on a crab and ends when all three lines are lost', () => {
    let state = quiet({ ...newGame(2), hookY: DEPTHS[3], targetY: DEPTHS[3] });
    state.crabs = [{ id: 'crab', x: 480, y: DEPTHS[3], dir: 1, speed: 0 }];
    for (let lines = 2; lines >= 0; lines--) {
      state = tick({ ...state, carrying: fish(), snapSafeMs: 0 }, {}, 0);
      expect(state.lines).toBe(lines);
      expect(state.carrying).toBeNull();
    }
    expect(state.phase).toBe('over');
  });
  it('stuns on a jellyfish for 1.5 seconds', () => {
    const start = quiet({ ...newGame(3), hookY: 300, targetY: 300 });
    start.jellies = [{ id: 'jelly', x: 480, y: 300, dir: 1, speed: 0 }];
    const stunned = tick(start, {}, 0);
    expect(stunned.stunMs).toBe(1500);
    expect(tick(stunned, { targetY: 416 }, 100).hookY).toBe(300);
  });
  it('spawns the humming fish once after six landed fish and wins when landed', () => {
    const before = tick(quiet({ ...newGame(4), landed: 5 }), {}, 0);
    expect(before.fish.some((entry) => entry.humming)).toBe(false);
    const after = tick({ ...before, landed: 6 }, {}, 0);
    expect(after.fish.filter((entry) => entry.humming)).toHaveLength(1);
    expect(tick(after, {}, 0).fish.filter((entry) => entry.humming)).toHaveLength(1);
    const won = tick({ ...after, fish: [], carrying: fish(true), hookY: SURFACE_Y, targetY: SURFACE_Y }, {}, 0);
    expect(won.won).toBe(true);
    expect(won.event).toBe('note');
  });
  it('caps coins at 24 and reproduces spawns for the same seed', () => {
    const start = quiet({ ...newGame(5), coins: MAX_COINS, carrying: fish(), hookY: SURFACE_Y });
    expect(tick(start, {}, 0).coins).toBe(MAX_COINS);
    expect(tick(newGame(11), {}, 700).fish).toEqual(tick(newGame(11), {}, 700).fish);
  });
});
