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
      const all = [
        ...room.hotspots,
        ...room.doors,
        ...(room.anchors ?? []).map((anchor) => ({ ...anchor, id: `anchor-${anchor.characterId}` })),
      ];
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

    it(`${room.id}: anchor placements and clickable hitboxes stay inside bounds`, () => {
      for (const anchor of room.anchors ?? []) {
        expect(anchor.x).toBeGreaterThanOrEqual(room.bounds.x0);
        expect(anchor.x).toBeLessThanOrEqual(room.bounds.x1);
        expect(anchor.y).toBeGreaterThanOrEqual(room.bounds.y0);
        expect(anchor.y).toBeLessThanOrEqual(room.bounds.y1);
      }
      for (const prop of room.clickables ?? []) {
        expect(prop.x - prop.w / 2).toBeGreaterThanOrEqual(room.bounds.x0);
        expect(prop.x + prop.w / 2).toBeLessThanOrEqual(room.bounds.x1);
        expect(prop.y - prop.h / 2).toBeGreaterThanOrEqual(room.bounds.y0);
        expect(prop.y + prop.h / 2).toBeLessThanOrEqual(room.bounds.y1);
      }
    });
  }

  it('door graph: locked doors in the vignette point at real (future) ids, not typos', () => {
    const knownFutureIds = [
      'plaza', 'den', 'court', 'workshop', 'trail', 'docks',
      'lighthouse-rest', 'lighthouse-gallery', 'whisperpine', 'moonwell', 'caverns',
    ];
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

  it('court and plaza: mutual door reachability', () => {
    const court = ROOM_REGISTRY.court;
    const plaza = ROOM_REGISTRY.plaza;
    const courtDoorBack = court.doors.find(d => d.id === 'door-back');
    const plazaDoorCourt = plaza.doors.find(d => d.id === 'door-court');

    expect(courtDoorBack).toMatchObject({ targetRoom: 'plaza', locked: false, targetSpawn: 'fromCourt' });
    expect(plazaDoorCourt).toMatchObject({ targetRoom: 'court', locked: false, targetSpawn: 'fromPlaza' });
  });

  it('court: exposes one pet shop, one coffee shop, and one restaurant as venues', () => {
    const venues = ROOM_REGISTRY.court.hotspots.filter(h => h.kind === 'venue');
    expect(venues.map(v => v.label)).toEqual([
      'Snowtail Pet Shop',
      'Bluehour Coffee',
      'Lantern Ladle Restaurant',
    ]);
    for (const venue of venues) {
      expect(venue.prompt.length).toBeGreaterThan(0);
      expect(venue.copy.length).toBeGreaterThan(0);
      const solid = ROOM_REGISTRY.court.solids.find(s => s.id === venue.solidId);
      expect(solid).toBeDefined();
      if (venue.entryDirection === 'up') {
        expect(venue.x).toBeGreaterThanOrEqual(solid.x - solid.w / 2);
        expect(venue.x).toBeLessThanOrEqual(solid.x + solid.w / 2);
        expect(venue.y).toBeGreaterThan(solid.y + solid.h / 2);
      } else if (venue.entryDirection === 'right') {
        expect(venue.y).toBeGreaterThanOrEqual(solid.y - solid.h / 2);
        expect(venue.y).toBeLessThanOrEqual(solid.y + solid.h / 2);
        expect(venue.x).toBeLessThan(solid.x - solid.w / 2);
      } else {
        throw new Error(`Unsupported venue entry direction: ${venue.entryDirection}`);
      }
    }
  });

  it('court: breaks the top row with a side-facing restaurant and occupied lower plaza', () => {
    const court = ROOM_REGISTRY.court;
    const restaurant = court.hotspots.find(h => h.id === 'venue-lantern-ladle');
    expect(restaurant.entryDirection).toBe('right');
    expect(restaurant.y).toBeGreaterThan(500);
    expect(court.solids.filter(s => s.y > 700).map(s => s.id)).toEqual(expect.arrayContaining([
      'patio-table-a',
      'patio-table-b',
      'patio-brazier',
      'court-bench',
      'menu-board',
    ]));
  });

  it('court: ships Edda, the Chirper board, six Curios, and one non-Curio secret', () => {
    const court = ROOM_REGISTRY.court;
    expect(court.anchors).toEqual([{ characterId: 'edda-quill', x: 925, y: 790 }]);
    expect(court.hotspots.find((hotspot) => hotspot.id === 'noticeboard-chirper')).toMatchObject({
      kind: 'newspaper', label: 'The Chillmere Chirper',
    });
    expect(court.clickables.filter((prop) => prop.curioId)).toHaveLength(6);
    expect(court.clickables.find((prop) => prop.id === 'loose-cobble')).toMatchObject({ reaction: 'hum' });
  });

  it('workshop and plaza: mutual W2 door reachability', () => {
    const workshop = ROOM_REGISTRY.workshop;
    const plaza = ROOM_REGISTRY.plaza;
    expect(plaza.doors.find((door) => door.id === 'door-workshop')).toMatchObject({
      targetRoom: 'workshop', locked: false, targetSpawn: 'fromPlaza',
    });
    expect(workshop.doors.find((door) => door.id === 'door-back')).toMatchObject({
      targetRoom: 'plaza', locked: false, targetSpawn: 'fromWorkshop',
    });
  });

  it('workshop: ships Pat, the Weather Bell, five Curios, two recoverable parts, and the locked hatch', () => {
    const workshop = ROOM_REGISTRY.workshop;
    expect(workshop.anchors).toEqual([{ characterId: 'pat-hocket', x: 1080, y: 480 }]);
    expect(workshop.hotspots.find((hotspot) => hotspot.id === 'weather-bell')).toMatchObject({
      kind: 'landmark', label: 'The Weather Bell',
    });
    expect(workshop.clickables.filter((prop) => prop.curioId)).toHaveLength(5);
    expect(workshop.clickables.find((prop) => prop.id === 'weather-bell-test').favorStep).toMatchObject({
      favorId: 'edda-tip-workshop-test', stepId: 'witness-workshop-test',
    });
    expect(workshop.clickables.find((prop) => prop.id === 'dumbwaiter-hatch')).toMatchObject({ reaction: 'hum' });
    expect(ROOM_REGISTRY.court.clickables.find((prop) => prop.id === 'weather-bell-coil').favorStep.stepId)
      .toBe('recover-court-coil');
    expect(ROOM_REGISTRY.trail.clickables.find((prop) => prop.id === 'weather-bell-vane').favorStep.stepId)
      .toBe('recover-trail-vane');
  });

  it('docks and court: mutual W3 reachability plus the open W4 Palefire trailhead', () => {
    const docks = ROOM_REGISTRY.docks;
    expect(ROOM_REGISTRY.court.doors.find((door) => door.id === 'door-docks')).toMatchObject({
      targetRoom: 'docks', locked: false, targetSpawn: 'fromCourt',
    });
    expect(docks.doors.find((door) => door.id === 'door-court')).toMatchObject({
      targetRoom: 'court', locked: false, targetSpawn: 'fromDocks',
    });
    expect(docks.doors.find((door) => door.id === 'door-lighthouse')).toMatchObject({
      targetRoom: 'lighthouse-rest', locked: false, targetSpawn: 'fromDocks',
    });
  });

  it('docks: ships Salka, seven Curios, the under-pier ledge, and the final Bell part', () => {
    const docks = ROOM_REGISTRY.docks;
    expect(docks.anchors).toEqual([
      { characterId: 'captain-salka', x: 870, y: 500, bargeState: 'in-port' },
    ]);
    expect(docks.hotspots.find((hotspot) => hotspot.id === 'salka-trader-stall')).toMatchObject({
      kind: 'trader', bargeState: 'in-port',
    });
    expect(docks.clickables.filter((prop) => prop.curioId)).toHaveLength(7);
    expect(docks.clickables.find((prop) => prop.id === 'underpier-cache')).toMatchObject({
      curioId: 'docks-underpier-cache', requiresProximity: true,
    });
    expect(docks.clickables.find((prop) => prop.id === 'weather-bell-clapper').favorStep).toMatchObject({
      favorId: 'pat-weather-bell-parts', stepId: 'recover-docks-clapper',
    });
  });

  it('docks: keeps both arrival spawns, the Palefire causeway, and the under-pier ledge walkable', () => {
    const docks = ROOM_REGISTRY.docks;
    const contains = (solid, point, radius = 12) =>
      point.x + radius > solid.x - solid.w / 2 && point.x - radius < solid.x + solid.w / 2 &&
      point.y + radius > solid.y - solid.h / 2 && point.y - radius < solid.y + solid.h / 2;
    for (const spawn of Object.values(docks.spawnPoints)) {
      expect(docks.solids.some((solid) => contains(solid, spawn))).toBe(false);
    }

    const northWest = docks.solids.find((solid) => solid.id === 'water-north-west');
    const northEast = docks.solids.find((solid) => solid.id === 'water-north-east');
    const causewayGap = (northEast.x - northEast.w / 2) - (northWest.x + northWest.w / 2);
    expect(causewayGap).toBeGreaterThan(24);
    expect(docks.doors.find((door) => door.id === 'door-lighthouse').x)
      .toBeGreaterThan(northWest.x + northWest.w / 2);
    expect(docks.doors.find((door) => door.id === 'door-lighthouse').x)
      .toBeLessThan(northEast.x - northEast.w / 2);

    const southWater = docks.solids.find((solid) => solid.id === 'water-south-main');
    const ledgeGap = docks.bounds.y1 - (southWater.y + southWater.h / 2);
    expect(ledgeGap).toBeGreaterThan(24);
    const cache = docks.clickables.find((prop) => prop.id === 'underpier-cache');
    expect(contains(southWater, cache, 0)).toBe(false);
  });

  it('Palefire Light: opens the W3 trailhead and connects both lighthouse rooms in order', () => {
    const docksDoor = ROOM_REGISTRY.docks.doors.find((door) => door.id === 'door-lighthouse');
    const rest = ROOM_REGISTRY['lighthouse-rest'];
    const gallery = ROOM_REGISTRY['lighthouse-gallery'];
    expect(docksDoor).toMatchObject({
      targetRoom: 'lighthouse-rest', targetSpawn: 'fromDocks', locked: false,
    });
    expect(rest.doors.find((door) => door.id === 'door-docks')).toMatchObject({
      targetRoom: 'docks', targetSpawn: 'fromLighthouse', locked: false,
    });
    expect(rest.doors.find((door) => door.id === 'stairs-gallery')).toMatchObject({
      targetRoom: 'lighthouse-gallery', targetSpawn: 'fromRest', locked: false,
    });
    expect(gallery.doors.find((door) => door.id === 'stairs-rest')).toMatchObject({
      targetRoom: 'lighthouse-rest', targetSpawn: 'fromGallery', locked: false,
    });
  });

  it('Palefire Light: ships Maren, the growing logbook, telescope, and four Curios per room', () => {
    const rest = ROOM_REGISTRY['lighthouse-rest'];
    const gallery = ROOM_REGISTRY['lighthouse-gallery'];
    expect(rest.anchors).toEqual([{ characterId: 'old-maren', x: 750, y: 590 }]);
    expect(rest.hotspots.find((hotspot) => hotspot.id === 'keeper-logbook')).toMatchObject({ kind: 'logbook' });
    expect(gallery.hotspots.find((hotspot) => hotspot.id === 'palefire-telescope')).toMatchObject({ kind: 'telescope' });
    expect(rest.clickables.filter((prop) => prop.curioId)).toHaveLength(4);
    expect(gallery.clickables.filter((prop) => prop.curioId)).toHaveLength(4);
    expect(gallery.clickables.find((prop) => prop.id === 'balcony-wind-carving')).toMatchObject({
      reaction: 'hum', requiresProximity: true,
    });
    expect(ROOM_REGISTRY.trail.clickables.find((prop) => prop.id === 'palefire-trail-ribbon').favorStep)
      .toMatchObject({ favorId: 'maren-sighting-trail', stepId: 'witness-trail-event' });
  });

  it('Whisperpine: branches mutually from the Trail and authors three daily Vesper dens', () => {
    const trailDoor = ROOM_REGISTRY.trail.doors.find((door) => door.id === 'door-whisperpine');
    const hollow = ROOM_REGISTRY.whisperpine;
    expect(trailDoor).toMatchObject({
      targetRoom: 'whisperpine', targetSpawn: 'fromTrail', locked: false,
    });
    expect(hollow.doors.find((door) => door.id === 'door-trail')).toMatchObject({
      targetRoom: 'trail', targetSpawn: 'fromWhisperpine', locked: false,
    });
    expect(hollow.vesperDens.map((den) => den.id)).toEqual(['root-den', 'owl-den', 'fallen-den']);
    expect(hollow.anchors).toEqual([]);
  });

  it('Whisperpine: ships the six specified Curios, cursor-dodging wisps, and W6 crack foreshadow', () => {
    const hollow = ROOM_REGISTRY.whisperpine;
    expect(hollow.clickables.filter((prop) => prop.curioId)).toHaveLength(6);
    expect(hollow.clickables.map((prop) => prop.id)).toEqual(expect.arrayContaining([
      'whisperpine-hare', 'whisperpine-owl', 'whisperpine-icicle',
      'whisperpine-echo-log', 'whisperpine-berries', 'whisperpine-wisps',
    ]));
    expect(hollow.wisps).toHaveLength(3);
    expect(hollow.doors.find((door) => door.id === 'door-cavern-crack')).toMatchObject({
      targetRoom: 'caverns', locked: true,
    });
  });

  it('Moonwell: remains a hidden one-Curio quiet room with no character or map dependency', () => {
    const hollow = ROOM_REGISTRY.whisperpine;
    const moonwell = ROOM_REGISTRY.moonwell;
    expect(hollow.doors.find((door) => door.id === 'door-moonwell')).toMatchObject({
      targetRoom: 'moonwell', locked: true, hidden: true,
    });
    expect(moonwell.doors).toEqual([expect.objectContaining({
      targetRoom: 'whisperpine', targetSpawn: 'fromMoonwell', locked: false,
    })]);
    expect(moonwell.anchors).toEqual([]);
    expect(moonwell.npcSpawnAnchors).toEqual([]);
    expect(moonwell.clickables.filter((prop) => prop.curioId)).toHaveLength(1);
    expect(moonwell.solids.map((solid) => solid.id)).toEqual(expect.arrayContaining([
      'moonwell-pool', 'moonwell-bench',
    ]));
  });
});
