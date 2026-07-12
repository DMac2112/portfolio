import { describe, it, expect } from 'vitest';
import { ROOM_SPAWN } from './npc-spawn.js';

describe('npc-spawn', () => {
  const plaza = ROOM_SPAWN.plaza;
  const { bounds, capacity, roamPoints, gatherPoints, rosterPoolIds, maxConcurrentChat } = plaza;

  it('all roamPoints are within bounds', () => {
    for (const point of roamPoints) {
      expect(point.x).toBeGreaterThanOrEqual(bounds.x0);
      expect(point.x).toBeLessThanOrEqual(bounds.x1);
      expect(point.y).toBeGreaterThanOrEqual(bounds.y0);
      expect(point.y).toBeLessThanOrEqual(bounds.y1);
    }
  });

  it('all gatherPoints are within bounds', () => {
    for (const point of gatherPoints) {
      expect(point.x).toBeGreaterThanOrEqual(bounds.x0);
      expect(point.x).toBeLessThanOrEqual(bounds.x1);
      expect(point.y).toBeGreaterThanOrEqual(bounds.y0);
      expect(point.y).toBeLessThanOrEqual(bounds.y1);
    }
  });

  it('capacity.min <= capacity.max and both are positive integers', () => {
    expect(Number.isInteger(capacity.min)).toBe(true);
    expect(Number.isInteger(capacity.max)).toBe(true);
    expect(capacity.min).toBeGreaterThan(0);
    expect(capacity.max).toBeGreaterThan(0);
    expect(capacity.min).toBeLessThanOrEqual(capacity.max);
  });

  it('rosterPoolIds has no duplicates', () => {
    const unique = new Set(rosterPoolIds);
    expect(unique.size).toBe(rosterPoolIds.length);
  });

  it('maxConcurrentChat is a positive integer less than capacity.max', () => {
    expect(Number.isInteger(maxConcurrentChat)).toBe(true);
    expect(maxConcurrentChat).toBeGreaterThan(0);
    expect(maxConcurrentChat).toBeLessThan(capacity.max);
  });
});
