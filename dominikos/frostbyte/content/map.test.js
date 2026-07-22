import { describe, it, expect } from 'vitest';
import { MAP_NODES, nodeByRoom } from './map.js';
import { ROOM_REGISTRY } from './rooms.js';

describe('MAP_NODES', () => {
  it('has unique roomIds', () => {
    const roomIds = MAP_NODES.map(n => n.roomId);
    const unique = new Set(roomIds);
    expect(unique.size).toBe(roomIds.length);
  });

  it('all nodes have x within (0, 1)', () => {
    for (const node of MAP_NODES) {
      expect(node.x).toBeGreaterThan(0);
      expect(node.x).toBeLessThan(1);
    }
  });

  it('all nodes have y within (0, 1)', () => {
    for (const node of MAP_NODES) {
      expect(node.y).toBeGreaterThan(0);
      expect(node.y).toBeLessThan(1);
    }
  });

  it('has exactly eight surface nodes through W6', () => {
    const unlockedCount = MAP_NODES.filter(n => n.unlocked).length;
    expect(unlockedCount).toBe(8);
  });

  it('unlocked nodes include Palefire Light and discovery-gated Whisperpine', () => {
    const unlockedRoomIds = MAP_NODES.filter(n => n.unlocked).map(n => n.roomId);
    expect(unlockedRoomIds).toEqual(expect.arrayContaining([
      'plaza', 'den', 'trail', 'court', 'workshop', 'docks', 'lighthouse-rest', 'whisperpine',
    ]));
    expect(unlockedRoomIds).toHaveLength(8);
    expect(MAP_NODES.some((node) => node.roomId === 'moonwell')).toBe(false);
    expect(MAP_NODES.some((node) => node.roomId === 'caverns')).toBe(false);
  });

  it('locked node labels exactly match plaza locked door labels', () => {
    const lockedNodes = MAP_NODES.filter(n => !n.unlocked);
    const plazaRoom = ROOM_REGISTRY.plaza;

    // Extract any future locked door labels from plaza.
    const lockedDoorLabels = plazaRoom.doors
      .filter(d => d.locked)
      .map(d => d.label);

    // Extract locked node labels
    const lockedNodeLabels = lockedNodes.map(n => n.label);

    // All locked door labels should be present in locked node labels
    for (const label of lockedDoorLabels) {
      expect(lockedNodeLabels).toContain(label);
    }

    // All locked node labels should be present in locked door labels
    for (const label of lockedNodeLabels) {
      expect(lockedDoorLabels).toContain(label);
    }

    // Should have the same count
    expect(lockedNodeLabels.length).toBe(lockedDoorLabels.length);
  });

  it('all node labels are strings', () => {
    for (const node of MAP_NODES) {
      expect(typeof node.label).toBe('string');
      expect(node.label.length).toBeGreaterThan(0);
    }
  });

  it('all roomIds are strings', () => {
    for (const node of MAP_NODES) {
      expect(typeof node.roomId).toBe('string');
      expect(node.roomId.length).toBeGreaterThan(0);
    }
  });
});

describe('nodeByRoom', () => {
  it('returns the node for a valid roomId', () => {
    const node = nodeByRoom('plaza');
    expect(node).toBeDefined();
    expect(node.roomId).toBe('plaza');
    expect(node.label).toBe('Chillmere Plaza');
  });

  it('returns undefined for a non-existent roomId', () => {
    const node = nodeByRoom('nonexistent');
    expect(node).toBeUndefined();
  });

  it('finds all nodes in MAP_NODES', () => {
    for (const mapNode of MAP_NODES) {
      const found = nodeByRoom(mapNode.roomId);
      expect(found).toEqual(mapNode);
    }
  });

  it('returns undefined for null input', () => {
    const node = nodeByRoom(null);
    expect(node).toBeUndefined();
  });

  it('returns undefined for undefined input', () => {
    const node = nodeByRoom(undefined);
    expect(node).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    const node = nodeByRoom('');
    expect(node).toBeUndefined();
  });
});
