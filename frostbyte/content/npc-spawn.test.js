import { describe, it, expect } from 'vitest';
import { ROOM_SPAWN } from './npc-spawn.js';
import { ROOM_REGISTRY } from './rooms.js';
import { personaById } from './npc-roster.js';

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

describe('Glasswind Court activity', () => {
  it('uses a busier crowd and gathers at the lower-room destinations', () => {
    const court = ROOM_SPAWN.court;
    expect(court.capacity).toEqual({ min: 4, max: 6 });
    expect(court.gatherPoints.map(point => point.label)).toEqual(expect.arrayContaining([
      'lantern-ladle-patio',
      'snowtail-playpen',
    ]));
  });
});

describe('ROOM_SPAWN generic invariants', () => {
  for (const [roomId, config] of Object.entries(ROOM_SPAWN)) {
    const { bounds, capacity, roamPoints, gatherPoints, rosterPoolIds, maxConcurrentChat } = config;

    it(`${roomId}: all roamPoints are within bounds`, () => {
      for (const point of roamPoints) {
        expect(point.x).toBeGreaterThanOrEqual(bounds.x0);
        expect(point.x).toBeLessThanOrEqual(bounds.x1);
        expect(point.y).toBeGreaterThanOrEqual(bounds.y0);
        expect(point.y).toBeLessThanOrEqual(bounds.y1);
      }
    });

    it(`${roomId}: all gatherPoints are within bounds`, () => {
      for (const point of gatherPoints) {
        expect(point.x).toBeGreaterThanOrEqual(bounds.x0);
        expect(point.x).toBeLessThanOrEqual(bounds.x1);
        expect(point.y).toBeGreaterThanOrEqual(bounds.y0);
        expect(point.y).toBeLessThanOrEqual(bounds.y1);
      }
    });

    it(`${roomId}: all rosterPoolIds resolve to valid personas`, () => {
      for (const personaId of rosterPoolIds) {
        const persona = personaById(personaId);
        expect(persona).not.toBeNull();
      }
    });

    it(`${roomId}: roamPoints are clear of room solids`, () => {
      const room = ROOM_REGISTRY[roomId];
      if (!room?.solids?.length) return;

      for (const point of roamPoints) {
        for (const solid of room.solids) {
          const leftEdge = solid.x - solid.w / 2;
          const rightEdge = solid.x + solid.w / 2;
          const topEdge = solid.y - solid.h / 2;
          const bottomEdge = solid.y + solid.h / 2;
          const isInside = point.x >= leftEdge && point.x <= rightEdge && point.y >= topEdge && point.y <= bottomEdge;
          expect(isInside).toBe(false);
        }
      }
    });
  }
});
