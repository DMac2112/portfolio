// Checks one traced backdrop against everything the game needs walkable or solid, without vitest.
//   node scripts/frostbyte-art/check.mjs room-trail
// Run it after trace.mjs (it reads the generated world/ground module). Prints only problems, then
// writes $TRACE_OUT/check-<asset>.png: the trace overlay with every checked point marked
// (white ring = fine, magenta dot = must be walkable but isn't, yellow dot = must be solid but isn't,
// orange dot = coin pickup off the ground).
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { FB, sharp } from './art.mjs';

const asset = process.argv[2];
if (!asset) throw new Error('usage: node check.mjs <asset>');
const OUT = process.env.TRACE_OUT ?? '.';
const load = (rel) => import(pathToFileURL(path.join(FB, rel)));
const { ROOM_REGISTRY } = await load('content/rooms.js');
const { ROOM_SPAWN } = await load('content/npc-spawn.js');
const { resolveDocksRoom } = await load('content/docks.js');
const { resolveRoomCollision } = await load('world/room-collision.js');

// The collision test's representative solid points, read straight from the test so they never drift.
const testSrc = fs.readFileSync(path.join(FB, 'world/room-collision.test.js'), 'utf8');
const BLOCKED = Function(`return ${testSrc.match(/const BLOCKED_SAMPLES = (\{[\s\S]*?\n\});/)[1]}`)();

const variants = [
  ...Object.values(ROOM_REGISTRY).filter((r) => r.id !== 'docks').map((room) => ({ key: room.id, room })),
  { key: 'docks-away', room: resolveDocksRoom(ROOM_REGISTRY.docks, '2026-07-23'), ledge: { x: 1050, y: 665 } },
  { key: 'docks-port', room: resolveDocksRoom(ROOM_REGISTRY.docks, '2026-07-25'), ledge: { x: 1120, y: 810 } },
].filter(({ room }) => room.mapAsset === asset || `room-docks-${room.mapAsset}` === asset);
if (!variants.length) throw new Error(`no room uses ${asset}`);

const R = 12;
const moved = (room, p) => { const r = resolveRoomCollision(room, p, R); return Math.hypot(r.x - p.x, r.y - p.y); };
const stable = (room, p) => moved(room, p) < 0.01;
const marks = [];
let problems = 0;

for (const { key, room, ledge } of variants) {
  const spawn = ROOM_SPAWN[room.id] ?? {};
  const mustWalk = [
    ...Object.entries(room.spawnPoints ?? {}).map(([id, p]) => ({ ...p, label: `spawn:${id}` })),
    ...(room.doors ?? []).map((p) => ({ ...p, label: `door:${p.id}` })),
    ...(room.anchors ?? []).map((p) => ({ ...p, label: `anchor:${p.characterId}` })),
    ...(room.hotspots ?? []).filter((p) => p.kind === 'venue' || p.kind === 'trader').map((p) => ({ ...p, label: `hotspot:${p.id}` })),
    ...(room.hotspots ?? []).filter((p) => p.kind === 'venue' && p.entryDirection === 'up').map((p) => ({ x: p.x, y: p.y + 36, label: `approach:${p.id}` })),
    ...(spawn.roamPoints ?? []).map((p, i) => ({ ...p, label: `roam:${i}` })),
    ...(spawn.gatherPoints ?? []).map((p) => ({ ...p, label: `gather:${p.label}` })),
    ...(ledge ? [{ ...ledge, label: 'under-pier ledge' }, { x: 990, y: 300, label: 'palefire causeway' }] : []),
  ];
  const mustBlock = [
    ...(BLOCKED[key] ?? []).map((p) => ({ ...p, label: `sample:${p.label}` })),
    ...(room.hotspots ?? []).filter((p) => p.kind === 'venue' && p.entryDirection === 'up').map((p) => ({ x: p.x, y: p.y - 120, label: `inside:${p.id}` })),
  ];
  for (const p of mustWalk) {
    const d = moved(room, p);
    if (d >= 0.01) { problems++; console.log(`${key} NOT WALKABLE ${p.label} at ${p.x},${p.y} (pushed ${d.toFixed(1)}px)`); }
    marks.push({ ...p, kind: d < 0.01 ? 'ok' : 'walk' });
  }
  // Walk-over coin glints: content data, so an unreachable one is reported, not counted.
  for (const p of room.pickups ?? []) {
    const d = moved(room, p);
    if (d >= 0.01) console.log(`${key} PICKUP OFF-GROUND ${p.id} at ${p.x},${p.y} (pushed ${d.toFixed(1)}px)`);
    marks.push({ ...p, kind: d < 0.01 ? 'ok' : 'pickup' });
  }
  for (const p of mustBlock) {
    const d = moved(room, p);
    if (d <= 1) { problems++; console.log(`${key} NOT SOLID ${p.label} at ${p.x},${p.y}`); }
    marks.push({ ...p, kind: d > 1 ? 'ok' : 'block' });
  }

  // One walkable component: every spawn and door reachable from the default spawn on a 24px grid.
  const G = 24, walk = new Set();
  for (let y = 0; y <= 960; y += G) for (let x = 0; x <= 1440; x += G) if (stable(room, { x, y })) walk.add(`${x},${y}`);
  const nearest = (p) => {
    let best = null, bd = Infinity;
    for (const k of walk) { const [x, y] = k.split(',').map(Number); const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = k; } }
    return { key: best, d: bd };
  };
  const start = nearest(room.spawnPoints.default);
  const seen = new Set([start.key]), queue = [start.key];
  while (queue.length) {
    const [x, y] = queue.shift().split(',').map(Number);
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]]) {
      const k = `${x + dx * G},${y + dy * G}`;
      if (walk.has(k) && !seen.has(k)) { seen.add(k); queue.push(k); }
    }
  }
  for (const p of mustWalk.filter((q) => q.label.startsWith('spawn:') || q.label.startsWith('door:'))) {
    const n = nearest(p);
    if (n.d > G * 1.5 || !seen.has(n.key)) { problems++; console.log(`${key} UNREACHABLE ${p.label} at ${p.x},${p.y} from spawn:default`); marks.push({ ...p, kind: 'walk' }); }
  }
}
console.log(problems ? `${asset}: ${problems} problem(s)` : `${asset}: OK`);

const overlay = path.join(OUT, `trace-${asset}.png`);
if (fs.existsSync(overlay)) {
  const { width, height } = await sharp(overlay).metadata();
  const s = width / 1440;
  const colour = { ok: 'none', walk: '#ff00ff', block: '#ffee00', pickup: '#ff8800' };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${marks.map((m) =>
    `<circle cx="${m.x * s}" cy="${m.y * s}" r="${m.kind === 'ok' ? 5 : 7}" fill="${colour[m.kind]}" stroke="${m.kind === 'ok' ? '#fff' : '#000'}" stroke-width="2"/>`).join('')}</svg>`;
  await sharp(overlay).composite([{ input: Buffer.from(svg) }]).toFile(path.join(OUT, `check-${asset}.png`));
}
process.exitCode = problems ? 1 : 0;
