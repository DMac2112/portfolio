import { describe, it, expect } from 'vitest';
import { computeCamPos, computeCamScale, CAM_LEAD } from './camera.js';

describe('computeCamPos', () => {
  it('applies the fixed lead offset', () => {
    const r = computeCamPos({ x: 100, y: 200 });
    expect(r).toEqual({ x: 100 + CAM_LEAD.x, y: 200 + CAM_LEAD.y });
  });
});

describe('computeCamScale', () => {
  it('returns 0.85 below aspect ratio 1 (portrait)', () => {
    expect(computeCamScale(0.5)).toBe(0.85);
    expect(computeCamScale(0.999)).toBe(0.85);
  });
  it('returns 1.15 at/above aspect ratio 1 (landscape)', () => {
    expect(computeCamScale(1)).toBe(1.15);
    expect(computeCamScale(1.78)).toBe(1.15);
  });
});
