import { describe, expect, it } from 'vitest';
import { createGame, tick, fill, addTopping, serve, result } from './minigame-cocoa.js';

const plain = () => createGame(() => 0);

function active(state) { return state.orders.filter(Boolean).length; }

describe('Cocoa Rounds', () => {
  it('starts with one order and ramps from one to three simultaneous orders', () => {
    let state = plain();
    expect(active(state)).toBe(1);
    state = tick(state, 19.9);
    expect(active(state)).toBe(1);
    state = tick(state, 6.1);
    expect(active(state)).toBe(2);
    state = tick(state, 14);
    expect(active(state)).toBe(3);
  });

  it('lets patience expire and records a missed order', () => {
    const state = tick(plain(), 12);
    expect(state.missed).toBe(1);
    expect(state.orders[0].patience).toBe(12);
  });

  it('serves matching mugs and wastes wrong mugs', () => {
    let state = fill(plain());
    const wrong = serve(addTopping(state, 'cinnamon'), 1);
    expect(wrong.outcome).toBe('wrong');
    expect(wrong.state.mug).toBeNull();
    expect(wrong.state.orders[0]).not.toBeNull();
    state = serve(fill(wrong.state), 1).state;
    expect(state.served).toBe(1);
    expect(state.orders[0]).toBeNull();
    const cinnamon = createGame(() => 0.5);
    const served = serve(addTopping(fill(cinnamon), 'cinnamon'), 3);
    expect(served.outcome).toBe('right');
    expect(served.state.served).toBe(1);
  });

  it('matches a fill without a topping only to plain', () => {
    let state = plain();
    expect(serve(fill(state), 1).outcome).toBe('right');
    state = createGame(() => 0.99);
    expect(serve(fill(state), 4).outcome).toBe('wrong');
  });

  it('ends at sixty seconds and caps reward at sixteen coins', () => {
    const state = tick(plain(), 90);
    expect(state.time).toBe(60);
    expect(tick(state, 10)).toBe(state);
    expect(fill(state)).toBe(state);
    expect(result({ ...state, served: 9 })).toEqual({ won: true, coinsEarned: 16 });
  });
});
