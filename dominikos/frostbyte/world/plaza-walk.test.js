// Frame-by-frame walks through every plaza doorway and narrow passage, plus the Emberlight
// Workshop threshold. Static point checks miss a threshold the avatar can never step across;
// these move at the real 60 FPS step and resolve collision every frame, like main.js does.
import { describe, expect, it } from 'vitest';
import { ROOM_REGISTRY } from '../content/rooms.js';
import { SPEED } from '../engine/movement.js';
import { findAutoEnterDoor } from '../engine/travel.js';
import { findAutoEnterVenue } from '../engine/interaction.js';
import { GROUND as PLAZA_GROUND } from './ground/room-plaza.js';
import { resolveRoomCollision } from './room-collision.js';

const R = 12;
const STEP = SPEED / 60;
const plaza = ROOM_REGISTRY.plaza;
const workshop = ROOM_REGISTRY.workshop;
const door = (room, id) => room.doors.find((d) => d.id === id);

// Walk toward each waypoint in turn; stop as soon as an auto-door fires.
function walk(room, start, waypoints, maxFrames = 240) {
  let pos = { ...start };
  let wp = 0;
  const path = [pos];
  for (let frame = 0; frame < maxFrames && wp < waypoints.length; frame++) {
    const target = waypoints[wp];
    const dx = target.x - pos.x, dy = target.y - pos.y, dist = Math.hypot(dx, dy);
    if (dist < STEP) { wp++; continue; }
    const movement = { x: (dx / dist) * STEP, y: (dy / dist) * STEP };
    pos = resolveRoomCollision(room, { x: pos.x + movement.x, y: pos.y + movement.y }, R);
    path.push(pos);
    const hit = findAutoEnterDoor(pos, movement, room.doors, room.bounds);
    if (hit) return { pos, door: hit, frames: frame + 1, path };
  }
  return { pos, door: null, path };
}

function straight(room, start, dir, frames) {
  return walk(room, start, [{ x: start.x + dir.x * STEP * frames, y: start.y + dir.y * STEP * frames }], frames + 2);
}

function inside(p, pts) {
  let hit = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > p.y) !== (yj > p.y) && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

describe('plaza: painted doors, frame by frame', () => {
  it('enters the Emberlight Workshop by walking up into the painted door under the sign', () => {
    const d = door(plaza, 'door-workshop');
    const spawn = plaza.spawnPoints.fromWorkshop;
    expect(Math.hypot(spawn.x - d.x, spawn.y - d.y)).toBeGreaterThan(d.autoEnterRadius);
    const run = walk(plaza, spawn, [{ x: d.x, y: d.y - 40 }]);
    expect(run.door?.id).toBe('door-workshop');
  });

  it('opens Glimmer & Wool by walking up into its painted door, from every lane of the door', () => {
    const shop = plaza.hotspots.find((h) => h.id === 'shop-glimmerwool');
    const candidates = plaza.hotspots.map((h) => ({ ...h, pos: { x: h.x, y: h.y } }));
    for (const dx of [-12, 0, 12]) {
      let pos = { x: shop.x + dx, y: shop.y + 90 };
      let opened = null;
      for (let f = 0; f < 60 && !opened; f++) {
        const movement = { x: 0, y: -STEP };
        pos = resolveRoomCollision(plaza, { x: pos.x, y: pos.y + movement.y }, R);
        opened = findAutoEnterVenue(pos, movement, candidates);
      }
      expect(opened?.id, `lane dx=${dx}`).toBe('shop-glimmerwool');
    }
  });

  it('does not pull in players strolling past the workshop door along the snow', () => {
    const run = walk(plaza, { x: 240, y: 470 }, [{ x: 420, y: 470 }, { x: 240, y: 470 }]);
    expect(run.door).toBeNull();
  });

  it('leaves for the trail from every lane at the top of the painted path', () => {
    for (const x of [690, 720, 750]) {
      const run = walk(plaza, { x, y: 230 }, [{ x, y: 60 }]);
      expect(run.door?.id, `lane x=${x}`).toBe('door-trail');
    }
    const spawn = plaza.spawnPoints.fromTrail;
    const d = door(plaza, 'door-trail');
    expect(spawn.y - d.y).toBeGreaterThan(d.autoEnterRadius);
  });

  it('stops at the tree line instead of walking into the forest or the sky', () => {
    // Beside the path the avatar meets the painted tree/lamp line and slides; it never climbs
    // past the top of the painted path, whether or not the slide carries it onto the threshold.
    for (const x of [630, 660, 790, 820]) {
      const run = straight(plaza, { x, y: 300 }, { x: 0, y: -1 }, 150);
      expect(Math.min(...run.path.map((p) => p.y)), `tree lane x=${x}`).toBeGreaterThan(125);
    }
  });

  it('walks through the rink gap and along the lane to the court gate', () => {
    const run = walk(plaza, { x: 1040, y: 540 }, [
      { x: 1180, y: 540 }, { x: 1320, y: 535 }, { x: 1361, y: 511 }, { x: 1440, y: 490 },
    ], 400);
    expect(run.door?.id).toBe('door-court');
    const spawn = plaza.spawnPoints.fromCourt;
    expect(walk(plaza, spawn, [{ x: 1040, y: 540 }]).pos.x).toBeLessThan(1060);
  });

  it('never leaves the painted ground on a long random walk', () => {
    let seed = 7;
    const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
    let pos = { ...plaza.spawnPoints.default };
    for (let leg = 0; leg < 400; leg++) {
      const a = rand() * Math.PI * 2;
      for (let f = 0; f < 20; f++) {
        pos = resolveRoomCollision(plaza, { x: pos.x + Math.cos(a) * STEP, y: pos.y + Math.sin(a) * STEP }, R);
        expect(inside(pos, PLAZA_GROUND), `left the ground at ${pos.x.toFixed(1)},${pos.y.toFixed(1)}`).toBe(true);
      }
    }
  });
});

describe('Emberlight Workshop threshold, frame by frame', () => {
  it('steps from the doorway onto the floor and around the room', () => {
    for (const x of [660, 700, 740, 800]) {
      const run = straight(workshop, { x, y: 840 }, { x: 0, y: -1 }, 90);
      expect(run.pos.y, `doorway lane x=${x}`).toBeLessThan(690);
    }
    const inRoom = straight(workshop, workshop.spawnPoints.fromPlaza, { x: 0, y: -1 }, 90).pos;
    expect(straight(workshop, inRoom, { x: -1, y: 0 }, 90).pos.x).toBeLessThan(560);
    expect(straight(workshop, inRoom, { x: 1, y: 0 }, 90).pos.x).toBeGreaterThan(880);
  });

  it('walks back out through the door without catching on the jambs', () => {
    const run = walk(workshop, { x: 500, y: 650 }, [{ x: 720, y: 700 }, { x: 720, y: 960 }]);
    expect(run.door?.id).toBe('door-back');
    const spawn = workshop.spawnPoints.fromPlaza;
    const back = door(workshop, 'door-back');
    expect(Math.hypot(spawn.x - back.x, spawn.y - back.y)).toBeGreaterThan(back.autoEnterRadius ?? 56);
  });
});
