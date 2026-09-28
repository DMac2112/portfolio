// Check whether each authored interaction has a legal feet point within click range.
import { ROOM_REGISTRY, bodyFactor } from '../../dominikos/frostbyte/content/rooms.js';
import { resolveDocksRoom } from '../../dominikos/frostbyte/content/docks.js';
import { resolveRoomCollision } from '../../dominikos/frostbyte/world/room-collision.js';

const rooms = Object.values(ROOM_REGISTRY).flatMap((room) => room.id === 'docks'
  ? [
    ['docks-away', resolveDocksRoom(room, '2026-07-23')],
    ['docks-port', resolveDocksRoom(room, '2026-07-25')],
  ] : [[room.id, room]]);
let total = 0;
let failed = 0;
for (const [name, room] of rooms) {
  const radius = 12 * bodyFactor(room);
  const pad = radius - 12;
  const entries = [
    ...(room.clickables ?? []).map((entry) => [entry.id, entry, 120 + pad]),
    ...(room.hotspots ?? []).map((entry) => [entry.id, entry, (entry.promptRadius ?? (entry.kind === 'landmark' ? 300 : 168)) + pad]),
    ...(room.anchors ?? []).map((entry) => [`anchor-${entry.characterId}`, entry, (entry.promptRadius ?? 168) + pad]),
    ...(room.id === 'whisperpine' ? room.vesperDens.map((entry) => [`anchor-vesper:${entry.id}`, entry, 168 + pad]) : []),
  ];
  for (const [id, entry, range] of entries) {
    let nearest = Infinity;
    // Four-pixel lattice, tested outward so distant props do not scan the whole room.
    for (let ring = 0; ring <= 400 && ring <= nearest; ring += 4) {
      for (let dy = -ring; dy <= ring; dy += 4) {
        for (let dx = -ring; dx <= ring; dx += 4) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
          const point = { x: Math.round(entry.x + dx), y: Math.round(entry.y + dy) };
          if (point.x < room.bounds.x0 || point.x > room.bounds.x1 || point.y < room.bounds.y0 || point.y > room.bounds.y1) continue;
          const resolved = resolveRoomCollision(room, point, radius);
          if (Math.hypot(resolved.x - point.x, resolved.y - point.y) <= 0.5) {
            nearest = Math.min(nearest, Math.hypot(dx, dy));
          }
        }
      }
    }
    const ok = nearest <= range;
    total++;
    if (!ok) failed++;
    console.log(`${name} ${id} (${entry.x},${entry.y}) ${Number.isFinite(nearest) ? nearest.toFixed(1) : 'none'} / ${range.toFixed(1)} ${ok ? 'OK' : 'FAIL'}`);
  }
}
console.log(`SUMMARY ${total} targets, ${failed} FAIL`);
if (failed) process.exitCode = 1;
