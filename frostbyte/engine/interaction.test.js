import { describe, it, expect } from 'vitest';
import {
  AUTO_VENUE_R,
  findAutoEnterVenue,
  findNearestInteractable,
  mergeInteractables,
  INTERACT_R,
} from './interaction.js';

describe('findNearestInteractable', () => {
  it('picks the closest of several candidates within range', () => {
    const pos = { x: 0, y: 0 };
    const candidates = [
      { id: 'far', pos: { x: 150, y: 0 }, kind: 'landmark' },    // 150 away
      { id: 'close', pos: { x: 50, y: 0 }, kind: 'shop' },       // 50 away
      { id: 'medium', pos: { x: 100, y: 0 }, kind: 'npc' },      // 100 away
    ];
    const result = findNearestInteractable(pos, candidates);
    expect(result.id).toBe('close');
  });

  it('returns null when all candidates exceed maxDist', () => {
    const pos = { x: 0, y: 0 };
    const candidates = [
      { id: 'a', pos: { x: 200, y: 0 }, kind: 'landmark' },
      { id: 'b', pos: { x: 300, y: 0 }, kind: 'shop' },
    ];
    const result = findNearestInteractable(pos, candidates, 100);
    expect(result).toBeNull();
  });

  it('returns null for an empty candidates array', () => {
    const pos = { x: 0, y: 0 };
    const result = findNearestInteractable(pos, []);
    expect(result).toBeNull();
  });

  it('breaks ties deterministically: first candidate in array wins', () => {
    const pos = { x: 0, y: 0 };
    // Two candidates at identical distance from pos
    const candidates = [
      { id: 'first', pos: { x: 50, y: 0 }, kind: 'landmark' },
      { id: 'second', pos: { x: 50, y: 0 }, kind: 'shop' },
    ];
    const result = findNearestInteractable(pos, candidates);
    expect(result.id).toBe('first');
  });

  it('respects a custom maxDist override', () => {
    const pos = { x: 0, y: 0 };
    const candidates = [
      { id: 'within', pos: { x: 50, y: 0 }, kind: 'landmark' },
      { id: 'outside', pos: { x: 150, y: 0 }, kind: 'shop' },
    ];
    // Use custom maxDist of 100
    const result = findNearestInteractable(pos, candidates, 100);
    expect(result.id).toBe('within');
  });

  it('uses INTERACT_R as default maxDist', () => {
    const pos = { x: 0, y: 0 };
    const candidates = [
      { id: 'inside', pos: { x: 100, y: 0 }, kind: 'landmark' },
      { id: 'outside', pos: { x: INTERACT_R + 10, y: 0 }, kind: 'shop' },
    ];
    const result = findNearestInteractable(pos, candidates);
    expect(result.id).toBe('inside');
  });

  it('excludes a candidate exactly at distance maxDist (boundary test)', () => {
    const pos = { x: 0, y: 0 };
    const candidates = [
      { id: 'at-boundary', pos: { x: 100, y: 0 }, kind: 'landmark' },
    ];
    // maxDist = 100, but candidate is exactly 100 away, so should be excluded
    const result = findNearestInteractable(pos, candidates, 100);
    expect(result).toBeNull();
  });

  it('uses hypot distance (2D Euclidean)', () => {
    const pos = { x: 0, y: 0 };
    // Candidate at (3, 4) has distance sqrt(3^2 + 4^2) = sqrt(25) = 5
    const candidates = [
      { id: 'target', pos: { x: 3, y: 4 }, kind: 'landmark' },
    ];
    const result = findNearestInteractable(pos, candidates, 6);
    expect(result.id).toBe('target');
  });

  it('returns null when 2D distance exceeds maxDist', () => {
    const pos = { x: 0, y: 0 };
    // Candidate at (3, 4) has distance 5
    const candidates = [
      { id: 'target', pos: { x: 3, y: 4 }, kind: 'landmark' },
    ];
    const result = findNearestInteractable(pos, candidates, 4);
    expect(result).toBeNull();
  });

  describe('opts.isActionable (nearest-ACTIONABLE, Home Plan §8.2)', () => {
    const isActionable = (c) => c.kind !== 'npc'; // mirrors main.js's actionFor(...) !== null shape

    it('an action-less nearer candidate no longer shadows a farther actionable one', () => {
      const pos = { x: 0, y: 0 };
      const candidates = [
        { id: 'npc-nearby', pos: { x: 10, y: 0 }, kind: 'npc' },   // 10 away, not actionable
        { id: 'shop-far', pos: { x: 80, y: 0 }, kind: 'shop' },    // 80 away, actionable
      ];
      const result = findNearestInteractable(pos, candidates, INTERACT_R, { isActionable });
      expect(result.id).toBe('shop-far');
    });

    it('returns null when every candidate within range is non-actionable', () => {
      const pos = { x: 0, y: 0 };
      const candidates = [
        { id: 'npc-a', pos: { x: 10, y: 0 }, kind: 'npc' },
        { id: 'npc-b', pos: { x: 20, y: 0 }, kind: 'npc' },
      ];
      const result = findNearestInteractable(pos, candidates, INTERACT_R, { isActionable });
      expect(result).toBeNull();
    });

    it('still picks the nearest among multiple actionable candidates when npcs are interspersed', () => {
      const pos = { x: 0, y: 0 };
      const candidates = [
        { id: 'npc', pos: { x: 5, y: 0 }, kind: 'npc' },
        { id: 'shop-close', pos: { x: 50, y: 0 }, kind: 'shop' },
        { id: 'minigame-far', pos: { x: 100, y: 0 }, kind: 'minigame' },
      ];
      const result = findNearestInteractable(pos, candidates, INTERACT_R, { isActionable });
      expect(result.id).toBe('shop-close');
    });

    it('maxDist is still enforced together with the isActionable filter', () => {
      const pos = { x: 0, y: 0 };
      const candidates = [
        { id: 'npc-close', pos: { x: 10, y: 0 }, kind: 'npc' },
        { id: 'shop-out-of-range', pos: { x: 150, y: 0 }, kind: 'shop' },
      ];
      const result = findNearestInteractable(pos, candidates, 100, { isActionable });
      expect(result).toBeNull();
    });

    it('ties among actionable candidates still go to the first entry in the array', () => {
      const pos = { x: 0, y: 0 };
      const candidates = [
        { id: 'npc', pos: { x: 50, y: 0 }, kind: 'npc' },       // same distance as the two below, but filtered out
        { id: 'first', pos: { x: 50, y: 0 }, kind: 'shop' },
        { id: 'second', pos: { x: 50, y: 0 }, kind: 'minigame' },
      ];
      const result = findNearestInteractable(pos, candidates, INTERACT_R, { isActionable });
      expect(result.id).toBe('first');
    });

    it('default path (no opts) is unchanged: everything is actionable', () => {
      const pos = { x: 0, y: 0 };
      const candidates = [
        { id: 'npc-nearest', pos: { x: 10, y: 0 }, kind: 'npc' },
        { id: 'shop-far', pos: { x: 80, y: 0 }, kind: 'shop' },
      ];
      const result = findNearestInteractable(pos, candidates);
      expect(result.id).toBe('npc-nearest'); // no filter supplied -> nearest overall, old behavior
    });
  });
});

describe('findAutoEnterVenue', () => {
  const venue = {
    id: 'venue-petshop', kind: 'venue', entryDirection: 'up', pos: { x: 398, y: 296 },
  };

  it('opens a venue when the player touches its doorway while walking inward', () => {
    expect(findAutoEnterVenue(
      { x: 398, y: 296 + AUTO_VENUE_R },
      { x: 0, y: -4 },
      [venue],
    )).toBe(venue);
  });

  it('does not open the venue while moving away from its doorway', () => {
    expect(findAutoEnterVenue(
      { x: 398, y: 306 },
      { x: 0, y: 4 },
      [venue],
    )).toBeNull();
  });

  it('does not auto-open non-venue interactables', () => {
    expect(findAutoEnterVenue(
      { x: 398, y: 306 },
      { x: 0, y: -4 },
      [{ ...venue, kind: 'shop' }],
    )).toBeNull();
  });

  it('does not auto-open a venue without a declared entry direction', () => {
    const { entryDirection, ...withoutDirection } = venue;
    expect(findAutoEnterVenue(
      { x: 398, y: 306 },
      { x: 0, y: -4 },
      [withoutDirection],
    )).toBeNull();
  });

  it('does not open a venue outside its physical contact radius', () => {
    expect(findAutoEnterVenue(
      { x: 398, y: 296 + AUTO_VENUE_R + 1 },
      { x: 0, y: -4 },
      [venue],
    )).toBeNull();
  });
});

describe('mergeInteractables', () => {
  it('combines hotspots and npcs into one list', () => {
    const hotspots = [
      { id: 'fountain', pos: { x: 100, y: 200 }, kind: 'landmark' },
      { id: 'shop', pos: { x: 300, y: 400 }, kind: 'shop' },
    ];
    const npcs = [
      { id: 'npc1', pos: { x: 50, y: 60 } },
      { id: 'npc2', pos: { x: 70, y: 80 } },
    ];
    const result = mergeInteractables(hotspots, npcs);
    expect(result).toHaveLength(4);
  });

  it('tags every NPC entry with kind:npc', () => {
    const hotspots = [
      { id: 'fountain', pos: { x: 100, y: 200 }, kind: 'landmark' },
    ];
    const npcs = [
      { id: 'npc1', pos: { x: 50, y: 60 } },
      { id: 'npc2', pos: { x: 70, y: 80 } },
    ];
    const result = mergeInteractables(hotspots, npcs);
    const npcEntries = result.filter((entry) => entry.kind === 'npc');
    expect(npcEntries).toHaveLength(2);
    expect(npcEntries[0].id).toBe('npc1');
    expect(npcEntries[1].id).toBe('npc2');
  });

  it('preserves hotspot kind values', () => {
    const hotspots = [
      { id: 'fountain', pos: { x: 100, y: 200 }, kind: 'landmark' },
      { id: 'shop', pos: { x: 300, y: 400 }, kind: 'shop' },
    ];
    const npcs = [];
    const result = mergeInteractables(hotspots, npcs);
    expect(result[0].kind).toBe('landmark');
    expect(result[1].kind).toBe('shop');
  });

  it('ignores extra properties on npc objects', () => {
    const hotspots = [];
    const npcs = [
      { id: 'npc1', pos: { x: 50, y: 60 }, name: 'Alice', health: 100, texture: 'penguin.png' },
    ];
    const result = mergeInteractables(hotspots, npcs);
    expect(result[0]).toEqual({
      id: 'npc1',
      pos: { x: 50, y: 60 },
      kind: 'npc',
    });
    expect(result[0].name).toBeUndefined();
    expect(result[0].health).toBeUndefined();
  });

  it('handles empty hotspots array', () => {
    const hotspots = [];
    const npcs = [
      { id: 'npc1', pos: { x: 50, y: 60 } },
    ];
    const result = mergeInteractables(hotspots, npcs);
    expect(result).toHaveLength(1);
    expect(result[0].kind).toBe('npc');
  });

  it('handles empty npcs array', () => {
    const hotspots = [
      { id: 'fountain', pos: { x: 100, y: 200 }, kind: 'landmark' },
    ];
    const npcs = [];
    const result = mergeInteractables(hotspots, npcs);
    expect(result).toHaveLength(1);
    expect(result[0].kind).toBe('landmark');
  });

  it('handles both arrays empty', () => {
    const result = mergeInteractables([], []);
    expect(result).toHaveLength(0);
  });
});
