import { describe, expect, it, vi } from 'vitest';
import { addDodgeWisps, dodgeWispPosition } from './will-o-wisps.js';

function fakeKaplay() {
  const updates = [];
  const objects = [];
  return {
    rect: vi.fn(() => ({})), pos: vi.fn(() => ({})), anchor: vi.fn(() => ({})),
    color: vi.fn(() => ({})), opacity: vi.fn(() => ({})), z: vi.fn(() => ({})),
    Color: { fromHex: (value) => value },
    add: vi.fn(() => {
      const obj = { pos: { x: 0, y: 0 }, opacity: 1, z: 0, onUpdate: vi.fn((fn) => updates.push(fn)) };
      objects.push(obj);
      return obj;
    }),
    dt: () => 0.05,
    mousePos: () => ({ x: 5, y: 5 }),
    toWorld: (point) => point,
    objects,
    tick: () => updates.forEach((fn) => fn()),
  };
}

describe('will-o-glow cursor dodge', () => {
  it('pushes away from a nearby cursor but stays near its authored origin', () => {
    const origin = { x: 100, y: 100 };
    const near = dodgeWispPosition(origin, { x: 100, y: 100 }, 0, 0);
    const far = dodgeWispPosition(origin, { x: 1000, y: 1000 }, 0, 0);
    expect(Math.hypot(near.x - origin.x, near.y - origin.y)).toBeGreaterThan(
      Math.hypot(far.x - origin.x, far.y - origin.y),
    );
    expect(Math.hypot(near.x - origin.x, near.y - origin.y)).toBeLessThan(90);
    expect(dodgeWispPosition(origin, { x: 100, y: 100 }, 5, 2, true)).toEqual(origin);
  });

  it('spawns only in Whisperpine and removes cursor motion under reduced-motion', () => {
    const room = { id: 'whisperpine', wisps: [
      { id: 'a', x: 100, y: 110, phase: 0 }, { id: 'b', x: 150, y: 170, phase: 2 },
    ] };
    const moving = fakeKaplay();
    expect(addDodgeWisps(moving, room, false)).toHaveLength(2);
    expect(moving.objects.every((object) => object.onUpdate.mock.calls.length === 1)).toBe(true);
    moving.tick();
    expect(moving.objects[0].pos).not.toEqual({ x: 0, y: 0 });

    const still = fakeKaplay();
    expect(addDodgeWisps(still, room, true)).toHaveLength(2);
    expect(still.objects.every((object) => object.onUpdate.mock.calls.length === 0)).toBe(true);
    expect(addDodgeWisps(still, { id: 'trail' }, false)).toEqual([]);
  });
});
