import { describe, it, expect } from 'vitest';
import { ROOM_REGISTRY } from './rooms.js';

const INTERACT_R = 168; // must match main.js's interaction radius (P3's interaction.js)

describe('room configs', () => {
  for (const room of Object.values(ROOM_REGISTRY)) {
    it(`${room.id}: every spawn point is inside bounds`, () => {
      for (const sp of Object.values(room.spawnPoints)) {
        expect(sp.x).toBeGreaterThanOrEqual(room.bounds.x0);
        expect(sp.x).toBeLessThanOrEqual(room.bounds.x1);
        expect(sp.y).toBeGreaterThanOrEqual(room.bounds.y0);
        expect(sp.y).toBeLessThanOrEqual(room.bounds.y1);
      }
    });

    it(`${room.id}: every hotspot and door is inside bounds`, () => {
      for (const h of [...room.hotspots, ...room.doors]) {
        expect(h.x).toBeGreaterThanOrEqual(room.bounds.x0);
        expect(h.x).toBeLessThanOrEqual(room.bounds.x1);
        expect(h.y).toBeGreaterThanOrEqual(room.bounds.y0);
        expect(h.y).toBeLessThanOrEqual(room.bounds.y1);
      }
    });

    it(`${room.id}: no two interactables are closer than INTERACT_R (ambiguous nearest-scan)`, () => {
      const all = [...room.hotspots, ...room.doors];
      for (let i = 0; i < all.length; i++) {
        for (let j = i + 1; j < all.length; j++) {
          const d = Math.hypot(all[i].x - all[j].x, all[i].y - all[j].y);
          expect(d).toBeGreaterThanOrEqual(INTERACT_R);
        }
      }
    });

    it(`${room.id}: every door target room+spawn resolves`, () => {
      for (const d of room.doors) {
        expect(ROOM_REGISTRY[d.targetRoom] || d.locked).toBeTruthy();
        if (!d.locked) {
          expect(ROOM_REGISTRY[d.targetRoom].spawnPoints[d.targetSpawn]).toBeDefined();
        }
      }
    });

    it(`${room.id}: NPC wander anchors stay fully inside bounds`, () => {
      for (const a of room.npcSpawnAnchors ?? []) {
        expect(a.x - a.roamRadius).toBeGreaterThanOrEqual(room.bounds.x0);
        expect(a.x + a.roamRadius).toBeLessThanOrEqual(room.bounds.x1);
        expect(a.y - a.roamRadius).toBeGreaterThanOrEqual(room.bounds.y0);
        expect(a.y + a.roamRadius).toBeLessThanOrEqual(room.bounds.y1);
      }
    });

    it(`${room.id}: solids sit inside bounds`, () => {
      for (const s of room.solids ?? []) {
        expect(s.x - s.w / 2).toBeGreaterThanOrEqual(room.bounds.x0);
        expect(s.x + s.w / 2).toBeLessThanOrEqual(room.bounds.x1);
        expect(s.y - s.h / 2).toBeGreaterThanOrEqual(room.bounds.y0);
        expect(s.y + s.h / 2).toBeLessThanOrEqual(room.bounds.y1);
      }
    });
  }

  it('door graph: locked doors in the vignette point at real (future) ids, not typos', () => {
    const knownFutureIds = ['plaza', 'den', 'court', 'workshop', 'trail'];
    for (const room of Object.values(ROOM_REGISTRY)) {
      for (const d of room.doors) {
        expect(knownFutureIds).toContain(d.targetRoom);
      }
    }
  });
});
