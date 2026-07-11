import { describe, it, expect } from 'vitest';
import { resolveMoveVector, clampToBounds, resolveObstacles, resolveFacing, SPEED, ARRIVE_EPS } from './movement.js';

describe('resolveMoveVector', () => {
  it('zero input -> zero vector', () => {
    const r = resolveMoveVector({ keys: {}, moveTarget: null, pos: { x: 0, y: 0 }, dt: 1 / 60 });
    expect(r.vx).toBe(0); expect(r.vy).toBe(0); expect(r.moving).toBe(false);
  });

  it('diagonal WASD is normalized (no 1.41x speed)', () => {
    const r = resolveMoveVector({ keys: { right: true, down: true }, moveTarget: null, pos: { x: 0, y: 0 }, dt: 1 / 60 });
    const speed = Math.hypot(r.vx, r.vy);
    expect(speed).toBeCloseTo(SPEED, 5);
  });

  it('moveTarget steering converges within ARRIVE_EPS and clears (arrived) within N frames', () => {
    let pos = { x: 0, y: 0 };
    const target = { x: 500, y: 0 };
    const dt = 1 / 60;
    let arrived = false;
    for (let i = 0; i < 10000 && !arrived; i++) {
      const r = resolveMoveVector({ keys: {}, moveTarget: target, pos, dt });
      pos = { x: pos.x + r.dxPx, y: pos.y + r.dyPx };
      arrived = r.arrived;
    }
    expect(arrived).toBe(true);
    expect(Math.hypot(pos.x - target.x, pos.y - target.y)).toBeLessThanOrEqual(ARRIVE_EPS + SPEED * dt);
  });

  it('keyboard input cancels an active moveTarget', () => {
    const r = resolveMoveVector({ keys: { left: true }, moveTarget: { x: 100, y: 100 }, pos: { x: 0, y: 0 }, dt: 1 / 60 });
    expect(r.keysCancelTarget).toBe(true);
    expect(r.vx).toBeLessThan(0); // moving left per keys, not toward the (ignored) target
  });
});

describe('clampToBounds', () => {
  const bounds = { x0: 0, x1: 100, y0: 0, y1: 200 };
  it('pins exactly at each of the 4 edges', () => {
    expect(clampToBounds({ x: -50, y: 50 }, bounds)).toEqual({ x: 0, y: 50 });
    expect(clampToBounds({ x: 500, y: 50 }, bounds)).toEqual({ x: 100, y: 50 });
    expect(clampToBounds({ x: 50, y: -50 }, bounds)).toEqual({ x: 50, y: 0 });
    expect(clampToBounds({ x: 50, y: 500 }, bounds)).toEqual({ x: 50, y: 200 });
  });
});

describe('resolveObstacles', () => {
  it('pushes a point fully inside a solid out to radius from the nearest edge', () => {
    const solids = [{ id: 's', x: 100, y: 100, w: 40, h: 40 }]; // AABB 80..120 x 80..120
    const result = resolveObstacles({ x: 110, y: 100 }, 12, solids);
    const dist = Math.hypot(result.x - 120, result.y - 100); // nearest edge at x=120
    expect(dist).toBeCloseTo(12, 5);
  });

  it('leaves a point outside the influence radius untouched', () => {
    const solids = [{ id: 's', x: 100, y: 100, w: 40, h: 40 }];
    const far = { x: 500, y: 500 };
    expect(resolveObstacles(far, 12, solids)).toEqual(far);
  });
});

describe('resolveFacing', () => {
  it('holds previous facing on zero delta (no idle jitter)', () => {
    expect(resolveFacing(0, 0, 'down')).toBe('down');
  });
  it('picks the dominant axis', () => {
    expect(resolveFacing(5, 1, 'up')).toBe('right');
    expect(resolveFacing(-5, 1, 'up')).toBe('left');
    expect(resolveFacing(1, 5, 'up')).toBe('down');
    expect(resolveFacing(1, -5, 'down')).toBe('up');
  });
});
