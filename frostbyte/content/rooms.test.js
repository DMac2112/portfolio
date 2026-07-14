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

  it('den and plaza: mutual door reachability (den→plaza and plaza→den)', () => {
    const den = ROOM_REGISTRY.den;
    const plaza = ROOM_REGISTRY.plaza;
    expect(den).toBeDefined();

    // Den's door-out should reach plaza
    const denDoorOut = den.doors.find(d => d.id === 'door-out');
    expect(denDoorOut).toBeDefined();
    expect(denDoorOut.targetRoom).toBe('plaza');
    expect(denDoorOut.locked).toBe(false);

    // Plaza's door-den should reach den
    const plazaDoorDen = plaza.doors.find(d => d.id === 'door-den');
    expect(plazaDoorDen).toBeDefined();
    expect(plazaDoorDen.targetRoom).toBe('den');
    expect(plazaDoorDen.locked).toBe(false);
  });

  it('den: solids do not contain any spawn point (collision-free spawn)', () => {
    const den = ROOM_REGISTRY.den;
    for (const sp of Object.values(den.spawnPoints)) {
      for (const solid of den.solids ?? []) {
        const leftEdge = solid.x - solid.w / 2;
        const rightEdge = solid.x + solid.w / 2;
        const topEdge = solid.y - solid.h / 2;
        const bottomEdge = solid.y + solid.h / 2;
        const isInside = sp.x >= leftEdge && sp.x <= rightEdge && sp.y >= topEdge && sp.y <= bottomEdge;
        expect(isInside).toBe(false);
      }
    }
  });

  it('den: door-sign-den hotspot is inside bounds, outside every solid, and clears INTERACT_R from door-out/hearth-den', () => {
    const den = ROOM_REGISTRY.den;
    const sign = den.hotspots.find(h => h.id === 'door-sign-den');
    expect(sign).toBeDefined();

    // Inside bounds (also covered by the generic loop above; asserted here for clarity of intent).
    expect(sign.x).toBeGreaterThanOrEqual(den.bounds.x0);
    expect(sign.x).toBeLessThanOrEqual(den.bounds.x1);
    expect(sign.y).toBeGreaterThanOrEqual(den.bounds.y0);
    expect(sign.y).toBeLessThanOrEqual(den.bounds.y1);

    // Outside every solid (the hearth is the only one today, but this stays generic).
    for (const solid of den.solids ?? []) {
      const leftEdge = solid.x - solid.w / 2;
      const rightEdge = solid.x + solid.w / 2;
      const topEdge = solid.y - solid.h / 2;
      const bottomEdge = solid.y + solid.h / 2;
      const isInside = sign.x >= leftEdge && sign.x <= rightEdge && sign.y >= topEdge && sign.y <= bottomEdge;
      expect(isInside).toBe(false);
    }

    // Clears the nearest-ACTIONABLE interaction radius from the other den interactables
    // (also covered by the generic "no two interactables" loop above; named here per-pair for a
    // clearer failure message if the sign's position ever moves).
    const doorOut = den.doors.find(d => d.id === 'door-out');
    const hearth = den.hotspots.find(h => h.id === 'hearth-den');
    expect(Math.hypot(sign.x - doorOut.x, sign.y - doorOut.y)).toBeGreaterThanOrEqual(INTERACT_R);
    expect(Math.hypot(sign.x - hearth.x, sign.y - hearth.y)).toBeGreaterThanOrEqual(INTERACT_R);
  });

  it('plaza: fromMap spawn is inside bounds and outside fountain solid', () => {
    const plaza = ROOM_REGISTRY.plaza;
    const fromMapSpawn = plaza.spawnPoints.fromMap;
    expect(fromMapSpawn).toBeDefined();

    // Inside bounds
    expect(fromMapSpawn.x).toBeGreaterThanOrEqual(plaza.bounds.x0);
    expect(fromMapSpawn.x).toBeLessThanOrEqual(plaza.bounds.x1);
    expect(fromMapSpawn.y).toBeGreaterThanOrEqual(plaza.bounds.y0);
    expect(fromMapSpawn.y).toBeLessThanOrEqual(plaza.bounds.y1);

    // Outside fountain solid
    const fountain = plaza.solids.find(s => s.id === 'fountain-driftback');
    expect(fountain).toBeDefined();
    const leftEdge = fountain.x - fountain.w / 2;
    const rightEdge = fountain.x + fountain.w / 2;
    const topEdge = fountain.y - fountain.h / 2;
    const bottomEdge = fountain.y + fountain.h / 2;
    const isInFountain = fromMapSpawn.x >= leftEdge && fromMapSpawn.x <= rightEdge && fromMapSpawn.y >= topEdge && fromMapSpawn.y <= bottomEdge;
    expect(isInFountain).toBe(false);
  });

  it('trail: spawn points inside bounds and outside solids', () => {
    const trail = ROOM_REGISTRY.trail;
    expect(trail).toBeDefined();

    for (const sp of Object.values(trail.spawnPoints)) {
      // Inside bounds
      expect(sp.x).toBeGreaterThanOrEqual(trail.bounds.x0);
      expect(sp.x).toBeLessThanOrEqual(trail.bounds.x1);
      expect(sp.y).toBeGreaterThanOrEqual(trail.bounds.y0);
      expect(sp.y).toBeLessThanOrEqual(trail.bounds.y1);

      // Outside every solid
      for (const solid of trail.solids ?? []) {
        const leftEdge = solid.x - solid.w / 2;
        const rightEdge = solid.x + solid.w / 2;
        const topEdge = solid.y - solid.h / 2;
        const bottomEdge = solid.y + solid.h / 2;
        const isInside = sp.x >= leftEdge && sp.x <= rightEdge && sp.y >= topEdge && sp.y <= bottomEdge;
        expect(isInside).toBe(false);
      }
    }
  });

  it('trail: pickup glints have unique ids, inside bounds, outside solids', () => {
    const trail = ROOM_REGISTRY.trail;
    expect(trail.pickups).toBeDefined();

    // Unique ids
    const pickupIds = trail.pickups.map(p => p.id);
    const unique = new Set(pickupIds);
    expect(unique.size).toBe(pickupIds.length);

    for (const pickup of trail.pickups) {
      // Inside bounds
      expect(pickup.x).toBeGreaterThanOrEqual(trail.bounds.x0);
      expect(pickup.x).toBeLessThanOrEqual(trail.bounds.x1);
      expect(pickup.y).toBeGreaterThanOrEqual(trail.bounds.y0);
      expect(pickup.y).toBeLessThanOrEqual(trail.bounds.y1);

      // Outside every solid
      for (const solid of trail.solids ?? []) {
        const leftEdge = solid.x - solid.w / 2;
        const rightEdge = solid.x + solid.w / 2;
        const topEdge = solid.y - solid.h / 2;
        const bottomEdge = solid.y + solid.h / 2;
        const isInside = pickup.x >= leftEdge && pickup.x <= rightEdge && pickup.y >= topEdge && pickup.y <= bottomEdge;
        expect(isInside).toBe(false);
      }
    }
  });

  it('trail and plaza: mutual door reachability (trail→plaza and plaza→trail)', () => {
    const trail = ROOM_REGISTRY.trail;
    const plaza = ROOM_REGISTRY.plaza;
    expect(trail).toBeDefined();

    // Trail's door-back should reach plaza
    const trailDoorBack = trail.doors.find(d => d.id === 'door-back');
    expect(trailDoorBack).toBeDefined();
    expect(trailDoorBack.targetRoom).toBe('plaza');
    expect(trailDoorBack.locked).toBe(false);
    expect(plaza.spawnPoints[trailDoorBack.targetSpawn]).toBeDefined();

    // Plaza's door-trail should reach trail
    const plazaDoorTrail = plaza.doors.find(d => d.id === 'door-trail');
    expect(plazaDoorTrail).toBeDefined();
    expect(plazaDoorTrail.targetRoom).toBe('trail');
    expect(plazaDoorTrail.locked).toBe(false);
    expect(trail.spawnPoints[plazaDoorTrail.targetSpawn]).toBeDefined();
  });

  it('trail: hotspots and door spacing clears INTERACT_R', () => {
    const trail = ROOM_REGISTRY.trail;
    const interactables = [...trail.hotspots, ...trail.doors];

    // falls-frostline (720, 220) to signpost-trail (1100, 760) = 660 >= 168 ✓
    // falls-frostline (720, 220) to door-back (720, 880) = 660 >= 168 ✓
    // signpost-trail (1100, 760) to door-back (720, 880) = 398 >= 168 ✓
    for (let i = 0; i < interactables.length; i++) {
      for (let j = i + 1; j < interactables.length; j++) {
        const d = Math.hypot(interactables[i].x - interactables[j].x, interactables[i].y - interactables[j].y);
        expect(d).toBeGreaterThanOrEqual(INTERACT_R);
      }
    }
  });
});
