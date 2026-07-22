import { describe, expect, it } from 'vitest';
import { ROOM_SPAWN } from '../content/npc-spawn.js';
import { ROOM_REGISTRY } from '../content/rooms.js';
import { resolveRoomCollision } from './room-collision.js';

const PLAYER_RADIUS = 12;

describe('Glasswind Court storefront collision', () => {
  const court = ROOM_REGISTRY.court;
  const venues = court.hotspots.filter(h => h.kind === 'venue');

  it('keeps every venue doorway reachable from the open square', () => {
    for (const venue of venues) {
      const resolved = resolveRoomCollision(court, { x: venue.x, y: venue.y }, PLAYER_RADIUS);
      expect(resolved.x).toBeCloseTo(venue.x, 5);
      expect(resolved.y).toBeCloseTo(venue.y, 5);
    }
  });

  it('blocks movement behind each doorway instead of in front of it', () => {
    const inwardStep = {
      up: { x: 0, y: -8 },
      right: { x: 8, y: 0 },
    };
    for (const venue of venues) {
      const step = inwardStep[venue.entryDirection];
      expect(step).toBeDefined();
      const resolved = resolveRoomCollision(court, { x: venue.x + step.x, y: venue.y + step.y }, PLAYER_RADIUS);
      expect(resolved.x).toBeCloseTo(venue.x, 5);
      expect(resolved.y).toBeCloseTo(venue.y, 5);
    }
  });

  it('keeps player spawns and every crowd route clear of precise props', () => {
    const crowd = ROOM_SPAWN.court;
    const points = [
      ...Object.values(court.spawnPoints),
      ...crowd.roamPoints,
      ...crowd.gatherPoints,
    ];
    for (const point of points) {
      const resolved = resolveRoomCollision(court, { x: point.x, y: point.y }, PLAYER_RADIUS);
      expect(resolved.x).toBeCloseTo(point.x, 5);
      expect(resolved.y).toBeCloseTo(point.y, 5);
    }
  });
});
