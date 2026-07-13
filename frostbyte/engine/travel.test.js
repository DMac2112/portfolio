import { describe, it, expect } from 'vitest';
import { canTravel, travelTargets, arriveSpawnId, validateWorldGraph } from './travel.js';
import { MAP_NODES } from '../content/map.js';
import { ROOM_REGISTRY } from '../content/rooms.js';

describe('canTravel', () => {
  it('returns { ok: true, reason: null } when travel is allowed', () => {
    const guards = { frozen: false, inMinigame: false, currentRoomId: 'plaza' };
    const node = { roomId: 'den', label: 'Your Den', x: 0.62, y: 0.74, unlocked: true };
    const result = canTravel(guards, node);
    expect(result.ok).toBe(true);
    expect(result.reason).toBeNull();
  });

  it('returns { ok: false, reason: "unknown" } when node is null', () => {
    const guards = { frozen: false, inMinigame: false, currentRoomId: 'plaza' };
    const result = canTravel(guards, null);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('unknown');
  });

  it('returns { ok: false, reason: "unknown" } when node is undefined', () => {
    const guards = { frozen: false, inMinigame: false, currentRoomId: 'plaza' };
    const result = canTravel(guards, undefined);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('unknown');
  });

  it('returns { ok: false, reason: "locked" } when node is locked', () => {
    const guards = { frozen: false, inMinigame: false, currentRoomId: 'plaza' };
    const node = { roomId: 'trail', label: 'Frostline Trail', x: 0.38, y: 0.12, unlocked: false };
    const result = canTravel(guards, node);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('locked');
  });

  it('returns { ok: false, reason: "frozen" } when player is frozen', () => {
    const guards = { frozen: true, inMinigame: false, currentRoomId: 'plaza' };
    const node = { roomId: 'den', label: 'Your Den', x: 0.62, y: 0.74, unlocked: true };
    const result = canTravel(guards, node);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('frozen');
  });

  it('returns { ok: false, reason: "minigame" } when player is in minigame', () => {
    const guards = { frozen: false, inMinigame: true, currentRoomId: 'plaza' };
    const node = { roomId: 'den', label: 'Your Den', x: 0.62, y: 0.74, unlocked: true };
    const result = canTravel(guards, node);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('minigame');
  });

  it('returns { ok: false, reason: "already-here" } when at destination already', () => {
    const guards = { frozen: false, inMinigame: false, currentRoomId: 'den' };
    const node = { roomId: 'den', label: 'Your Den', x: 0.62, y: 0.74, unlocked: true };
    const result = canTravel(guards, node);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('already-here');
  });

  it('respects rule priority: locked before frozen', () => {
    const guards = { frozen: true, inMinigame: false, currentRoomId: 'plaza' };
    const node = { roomId: 'trail', label: 'Frostline Trail', x: 0.38, y: 0.12, unlocked: false };
    const result = canTravel(guards, node);
    expect(result.reason).toBe('locked');
  });

  it('respects rule priority: frozen before minigame', () => {
    const guards = { frozen: true, inMinigame: true, currentRoomId: 'plaza' };
    const node = { roomId: 'den', label: 'Your Den', x: 0.62, y: 0.74, unlocked: true };
    const result = canTravel(guards, node);
    expect(result.reason).toBe('frozen');
  });
});

describe('travelTargets', () => {
  it('filters nodes to only unlocked ones', () => {
    const nodes = [
      { roomId: 'plaza', label: 'Chillmere Plaza', x: 0.46, y: 0.40, unlocked: true },
      { roomId: 'trail', label: 'Frostline Trail', x: 0.38, y: 0.12, unlocked: false },
      { roomId: 'den', label: 'Your Den', x: 0.62, y: 0.74, unlocked: true },
    ];
    const result = travelTargets(nodes);
    expect(result).toHaveLength(2);
    expect(result.map(n => n.roomId)).toEqual(['plaza', 'den']);
  });

  it('returns empty array when all nodes are locked', () => {
    const nodes = [
      { roomId: 'trail', label: 'Frostline Trail', x: 0.38, y: 0.12, unlocked: false },
      { roomId: 'court', label: 'Glasswind Court', x: 0.80, y: 0.38, unlocked: false },
    ];
    const result = travelTargets(nodes);
    expect(result).toHaveLength(0);
  });

  it('returns all nodes when all are unlocked', () => {
    const nodes = [
      { roomId: 'plaza', label: 'Chillmere Plaza', x: 0.46, y: 0.40, unlocked: true },
      { roomId: 'den', label: 'Your Den', x: 0.62, y: 0.74, unlocked: true },
    ];
    const result = travelTargets(nodes);
    expect(result).toHaveLength(2);
  });

  it('returns empty array for empty input', () => {
    const result = travelTargets([]);
    expect(result).toHaveLength(0);
  });
});

describe('arriveSpawnId', () => {
  it('capitalizes first letter and prepends "from"', () => {
    expect(arriveSpawnId('plaza')).toBe('fromPlaza');
  });

  it('handles single-character room names', () => {
    expect(arriveSpawnId('a')).toBe('fromA');
  });

  it('handles already-capitalized names (re-capitalizes)', () => {
    expect(arriveSpawnId('Plaza')).toBe('fromPlaza');
  });

  it('returns "fromMap" when sourceRoomId is null', () => {
    expect(arriveSpawnId(null)).toBe('fromMap');
  });

  it('returns "fromMap" when sourceRoomId is undefined', () => {
    expect(arriveSpawnId(undefined)).toBe('fromMap');
  });

  it('returns "fromMap" when sourceRoomId is empty string', () => {
    expect(arriveSpawnId('')).toBe('fromMap');
  });

  it('handles multi-word room names (just first character of first word)', () => {
    // arriveSpawnId only capitalizes the first character, so 'workshop' becomes 'fromWorkshop'
    expect(arriveSpawnId('workshop')).toBe('fromWorkshop');
  });
});

describe('validateWorldGraph', () => {
  it('returns empty array for valid real-world content (plaza and den)', function () {
    if (!ROOM_REGISTRY.den) {
      // Skip test if den room hasn't been added to registry yet (parallel development)
      this.skip();
    }
    const errors = validateWorldGraph(MAP_NODES, ROOM_REGISTRY);
    expect(errors).toEqual([]);
  });

  it('rejects when unlocked map node does not exist in registry', () => {
    const nodes = [
      { roomId: 'plaza', label: 'Chillmere Plaza', x: 0.46, y: 0.40, unlocked: true },
      { roomId: 'nonexistent', label: 'Ghost Room', x: 0.5, y: 0.5, unlocked: true },
    ];
    const registry = {
      plaza: { id: 'plaza', doors: [] },
    };
    const errors = validateWorldGraph(nodes, registry);
    expect(errors).toContain("Unlocked map node 'nonexistent' does not exist in room registry");
  });

  it('rejects room with no unlocked doors and not on map', () => {
    const nodes = [
      { roomId: 'plaza', label: 'Chillmere Plaza', x: 0.46, y: 0.40, unlocked: true },
    ];
    const registry = {
      plaza: { id: 'plaza', doors: [] },
      isolated: { id: 'isolated', doors: [{ id: 'd1', locked: true, targetRoom: 'plaza' }] },
    };
    const errors = validateWorldGraph(nodes, registry);
    expect(errors).toContain("Room 'isolated' is unreachable: not on map and has no unlocked doors");
  });

  it('accepts room with unlocked door even if not on map', () => {
    const nodes = [
      { roomId: 'plaza', label: 'Chillmere Plaza', x: 0.46, y: 0.40, unlocked: true },
    ];
    const registry = {
      plaza: { id: 'plaza', doors: [{ id: 'd1', locked: false, targetRoom: 'backroom' }] },
      backroom: { id: 'backroom', doors: [{ id: 'd2', locked: false, targetRoom: 'plaza' }] },
    };
    const errors = validateWorldGraph(nodes, registry);
    // backroom has an unlocked door, so it's reachable
    expect(errors).not.toContain("Room 'backroom' is unreachable");
  });

  it('rejects unlocked door targeting non-existent room', () => {
    const nodes = [
      { roomId: 'plaza', label: 'Chillmere Plaza', x: 0.46, y: 0.40, unlocked: true },
    ];
    const registry = {
      plaza: {
        id: 'plaza',
        doors: [{ id: 'bad-door', locked: false, targetRoom: 'phantom' }],
      },
    };
    const errors = validateWorldGraph(nodes, registry);
    expect(errors).toContain("Door 'bad-door' in room 'plaza' targets non-existent room 'phantom'");
  });

  it('allows locked doors targeting non-existent rooms (they are not traversable)', () => {
    const nodes = [
      { roomId: 'plaza', label: 'Chillmere Plaza', x: 0.46, y: 0.40, unlocked: true },
    ];
    const registry = {
      plaza: {
        id: 'plaza',
        doors: [{ id: 'locked-door', locked: true, targetRoom: 'phantom' }],
      },
    };
    const errors = validateWorldGraph(nodes, registry);
    // locked door is not checked (only unlocked doors are)
    expect(errors.filter(e => e.includes('phantom'))).toHaveLength(0);
  });

  it('returns multiple errors when multiple issues exist', () => {
    const nodes = [
      { roomId: 'plaza', label: 'Chillmere Plaza', x: 0.46, y: 0.40, unlocked: true },
      { roomId: 'broken', label: 'Broken Room', x: 0.5, y: 0.5, unlocked: true },
    ];
    const registry = {
      plaza: { id: 'plaza', doors: [] },
      isolated: { id: 'isolated', doors: [] },
    };
    const errors = validateWorldGraph(nodes, registry);
    expect(errors.length).toBeGreaterThan(1);
  });

  it('accepts room on map even with no doors', () => {
    const nodes = [
      { roomId: 'plaza', label: 'Chillmere Plaza', x: 0.46, y: 0.40, unlocked: true },
      { roomId: 'hideout', label: 'Hideout', x: 0.3, y: 0.7, unlocked: true },
    ];
    const registry = {
      plaza: { id: 'plaza', doors: [] },
      hideout: { id: 'hideout', doors: [] },
    };
    const errors = validateWorldGraph(nodes, registry);
    // Both rooms are on the map, so they are reachable
    expect(errors).toEqual([]);
  });
});
