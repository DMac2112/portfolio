import { describe, expect, it } from 'vitest';
import { resolveDocksRoom } from '../content/docks.js';
import { ROOM_SPAWN } from '../content/npc-spawn.js';
import { ROOM_REGISTRY } from '../content/rooms.js';
import { collisionProfileForRoom, resolveRoomCollision } from './room-collision.js';

const PLAYER_RADIUS = 12;
const GRID_STEP = 24;

const roomVariants = [
  ...Object.values(ROOM_REGISTRY)
    .filter((room) => room.id !== 'docks')
    .map((room) => ({ key: room.id, room })),
  {
    key: 'docks-away',
    room: resolveDocksRoom(ROOM_REGISTRY.docks, '2026-07-23'),
  },
  {
    key: 'docks-port',
    room: resolveDocksRoom(ROOM_REGISTRY.docks, '2026-07-25'),
  },
];

const BLOCKED_SAMPLES = {
  plaza: [
    { label: 'northwest roof', x: 180, y: 180 },
    { label: 'fountain basin', x: 993, y: 330 },
    { label: 'den igloo body', x: 620, y: 795 },
    { label: 'southeast roof', x: 1200, y: 870 },
  ],
  den: [
    { label: 'fireplace', x: 720, y: 210 },
    { label: 'bed', x: 300, y: 405 },
    { label: 'side table', x: 1150, y: 405 },
    { label: 'igloo wall', x: 50, y: 465 },
  ],
  trail: [
    { label: 'frozen falls', x: 720, y: 180 },
    { label: 'west boulder', x: 270, y: 365 },
    { label: 'west trees', x: 30, y: 600 },
    { label: 'east trees', x: 1410, y: 700 },
  ],
  court: [
    { label: 'Snowtail roof', x: 200, y: 180 },
    { label: 'market cart', x: 495, y: 535 },
    { label: 'patio brazier', x: 760, y: 825 },
    { label: 'southwest roof', x: 300, y: 850 },
  ],
  workshop: [
    { label: 'north wall', x: 720, y: 120 },
    { label: 'forge', x: 235, y: 475 },
    { label: 'Weather Bell', x: 710, y: 330 },
    { label: 'east workbench', x: 1250, y: 500 },
  ],
  'docks-away': [
    { label: 'empty berth water', x: 720, y: 500 },
    { label: 'warehouse', x: 270, y: 150 },
    { label: 'crane', x: 1260, y: 210 },
    { label: 'southwest roof', x: 180, y: 840 },
  ],
  'docks-port': [
    { label: 'west harbor water', x: 90, y: 600 },
    { label: 'warehouse', x: 270, y: 150 },
    { label: 'crane', x: 1260, y: 210 },
    { label: 'southwest roof', x: 180, y: 840 },
  ],
  'lighthouse-rest': [
    { label: 'west wall', x: 30, y: 480 },
    { label: 'keeper stove', x: 465, y: 295 },
    { label: 'logbook table', x: 300, y: 495 },
    { label: 'keeper cot', x: 1060, y: 705 },
  ],
  'lighthouse-gallery': [
    { label: 'balcony edge', x: 1390, y: 760 },
    { label: 'great lamp', x: 720, y: 300 },
    { label: 'telescope', x: 1140, y: 375 },
    { label: 'supply chest', x: 370, y: 700 },
  ],
  whisperpine: [
    { label: 'listening grove pines', x: 720, y: 450 },
    { label: 'root den', x: 245, y: 285 },
    { label: 'west trees', x: 40, y: 700 },
    { label: 'fallen root', x: 1160, y: 480 },
  ],
  moonwell: [
    { label: 'moonwell pool', x: 720, y: 450 },
    { label: 'west forest', x: 90, y: 120 },
    { label: 'east forest', x: 1350, y: 720 },
    { label: 'bench', x: 450, y: 680 },
  ],
  caverns: [
    { label: 'west crystals', x: 270, y: 300 },
    { label: 'east crystals', x: 1080, y: 240 },
    { label: 'black-glass pool', x: 720, y: 780 },
    { label: 'southwest crystals', x: 180, y: 780 },
  ],
};

function distanceMoved(room, point) {
  const resolved = resolveRoomCollision(room, point, PLAYER_RADIUS);
  return Math.hypot(resolved.x - point.x, resolved.y - point.y);
}

function stable(room, point) {
  return distanceMoved(room, point) < 0.01;
}

function authoredClearPoints(room) {
  return [
    ...Object.entries(room.spawnPoints ?? {}).map(([id, point]) => ({ ...point, label: `spawn:${id}` })),
    ...(room.doors ?? []).map((point) => ({ ...point, label: `door:${point.id}` })),
    ...(room.anchors ?? []).map((point) => ({ ...point, label: `anchor:${point.characterId}` })),
    ...(room.hotspots ?? [])
      .filter((point) => point.kind === 'venue' || point.kind === 'trader')
      .map((point) => ({ ...point, label: `hotspot:${point.id}` })),
    ...(ROOM_SPAWN[room.id]?.roamPoints ?? []).map((point, index) => ({ ...point, label: `roam:${index}` })),
    ...(ROOM_SPAWN[room.id]?.gatherPoints ?? []).map((point) => ({ ...point, label: `gather:${point.label}` })),
  ];
}

function buildWalkableGrid(room) {
  const walkable = new Set();
  for (let y = 0; y <= 960; y += GRID_STEP) {
    for (let x = 0; x <= 1440; x += GRID_STEP) {
      if (stable(room, { x, y })) walkable.add(`${x},${y}`);
    }
  }
  return walkable;
}

function closestGridKey(point, walkable) {
  let closest = null;
  let closestDistance = Infinity;
  for (const key of walkable) {
    const [x, y] = key.split(',').map(Number);
    const distance = Math.hypot(point.x - x, point.y - y);
    if (distance < closestDistance) {
      closest = key;
      closestDistance = distance;
    }
  }
  return { key: closest, distance: closestDistance };
}

function reachableGridKeys(startKey, walkable) {
  const visited = new Set([startKey]);
  const queue = [startKey];
  const directions = [
    [-1, 0], [1, 0], [0, -1], [0, 1],
    [-1, -1], [-1, 1], [1, -1], [1, 1],
  ];

  while (queue.length) {
    const key = queue.shift();
    const [x, y] = key.split(',').map(Number);
    for (const [dx, dy] of directions) {
      const nextKey = `${x + dx * GRID_STEP},${y + dy * GRID_STEP}`;
      if (!walkable.has(nextKey) || visited.has(nextKey)) continue;
      visited.add(nextKey);
      queue.push(nextKey);
    }
  }
  return visited;
}

describe('painted-room collision coverage', () => {
  it('has a collision profile for every painted room and distinct docks states', () => {
    for (const { key, room } of roomVariants) {
      expect(collisionProfileForRoom(room), key).toBeDefined();
    }
    expect(collisionProfileForRoom(roomVariants.find(({ key }) => key === 'docks-away').room))
      .not.toBe(collisionProfileForRoom(roomVariants.find(({ key }) => key === 'docks-port').room));
  });

  it('opens the repainted plaza igloo toward the plaza', () => {
    const plaza = ROOM_REGISTRY.plaza;
    const igloo = collisionProfileForRoom(plaza).obstacles.find(({ id }) => id === 'den-igloo');
    expect(igloo).toMatchObject({
      type: 'ellipse', x: 720, y: 795, rx: 125, ry: 110,
      opening: { x0: 648, x1: 792, y0: 670, y1: 900, passThrough: true },
    });
    expect(plaza.doors.find(({ id }) => id === 'door-den')).toMatchObject({ x: 720, y: 812 });
    expect(plaza.spawnPoints.fromDen).toEqual({ x: 720, y: 740, facing: 'up' });
    expect(stable(plaza, { x: 720, y: 812 })).toBe(true);
    expect(stable(plaza, { x: 720, y: 740 })).toBe(true);
    expect(stable(plaza, { x: 620, y: 795 })).toBe(false);
  });

  it.each(roomVariants)('$key keeps all authored travel, character, venue, and crowd points clear', ({ key, room }) => {
    for (const point of authoredClearPoints(room)) {
      expect(distanceMoved(room, point), `${key} ${point.label} at ${point.x},${point.y}`).toBeLessThan(0.01);
    }
  });

  it.each(roomVariants)('$key blocks representative painted structures and terrain', ({ key, room }) => {
    for (const point of BLOCKED_SAMPLES[key]) {
      expect(distanceMoved(room, point), `${key} ${point.label} at ${point.x},${point.y}`).toBeGreaterThan(1);
    }
  });

  it.each(roomVariants)('$key keeps every authored spawn and door in one walkable component', ({ key, room }) => {
    const walkable = buildWalkableGrid(room);
    const start = closestGridKey(room.spawnPoints.default, walkable);
    expect(start.distance, `${key} default spawn has no nearby walkable grid point`).toBeLessThanOrEqual(GRID_STEP * 1.5);
    const reachable = reachableGridKeys(start.key, walkable);

    const targets = [
      ...Object.entries(room.spawnPoints ?? {}).map(([id, point]) => ({ ...point, label: `spawn:${id}` })),
      ...(room.doors ?? []).map((point) => ({ ...point, label: `door:${point.id}` })),
    ];
    for (const target of targets) {
      const nearest = closestGridKey(target, walkable);
      expect(nearest.distance, `${key} ${target.label} has no nearby walkable grid point`)
        .toBeLessThanOrEqual(GRID_STEP * 1.5);
      expect(reachable.has(nearest.key), `${key} cannot walk from default to ${target.label}`).toBe(true);
    }
  });
});

describe('Glasswind Court storefront collision', () => {
  const court = ROOM_REGISTRY.court;
  const venues = court.hotspots.filter((hotspot) => hotspot.kind === 'venue');

  it('keeps each painted threshold and its approach clear', () => {
    for (const venue of venues) {
      const approach = venue.entryDirection === 'up'
        ? { x: venue.x, y: venue.y + 36 }
        : { x: venue.x - 36, y: venue.y };
      expect(stable(court, venue), venue.id).toBe(true);
      expect(stable(court, approach), `${venue.id} approach`).toBe(true);
    }
  });

  it('blocks the building behind every threshold', () => {
    for (const venue of venues) {
      const inside = venue.entryDirection === 'up'
        ? { x: venue.x, y: venue.y - 120 }
        : { x: venue.x + 120, y: venue.y };
      expect(distanceMoved(court, inside), venue.id).toBeGreaterThan(1);
    }
  });
});
