// Render authored interactions over their 1440 x 960 painted backdrop.
import fs from 'node:fs/promises';
import path from 'node:path';
import { FB, sharp } from './art.mjs';
import { ROOM_REGISTRY } from '../../dominikos/frostbyte/content/rooms.js';
import { resolveDocksRoom } from '../../dominikos/frostbyte/content/docks.js';

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index < 0 ? fallback : args.splice(index, 2)[1];
};
const variant = option('--variant', 'away');
const width = Number(option('--width', '1440'));
const [roomId, output] = args;
if (!ROOM_REGISTRY[roomId] || !output || !Number.isFinite(width) || width <= 0 ||
    (roomId === 'docks' && !['away', 'in-port'].includes(variant))) {
  console.error('usage: hitbox-overlay.mjs <roomId> <out.png> [--variant away|in-port] [--width 1100]');
  process.exit(1);
}
const room = roomId === 'docks'
  ? resolveDocksRoom(ROOM_REGISTRY.docks, variant === 'away' ? '2026-07-23' : '2026-07-25')
  : ROOM_REGISTRY[roomId];
const escape = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const marks = [];
const label = (id, x, y, color) => marks.push(`<text x="${Math.min(1430, Math.max(8, x + 8))}" y="${Math.max(18, y - 7)}" fill="${color}" stroke="#101b28" stroke-width="3" paint-order="stroke" font-size="16" font-family="sans-serif">${escape(id)}</text>`);
for (const entry of room.clickables ?? []) {
  marks.push(`<rect x="${entry.x - entry.w / 2}" y="${entry.y - entry.h / 2}" width="${entry.w}" height="${entry.h}" fill="none" stroke="#ffb541" stroke-width="2"/>`);
  label(entry.id, entry.x - entry.w / 2, entry.y - entry.h / 2, '#ffcf68');
}
for (const entry of room.hotspots ?? []) {
  marks.push(`<path d="M${entry.x - 8} ${entry.y}h16 M${entry.x} ${entry.y - 8}v16" stroke="#65e2ff" stroke-width="2"/>`);
  label(entry.id, entry.x, entry.y, '#93efff');
}
const anchors = roomId === 'whisperpine'
  ? room.vesperDens.map((den) => ({ id: `vesper:${den.id}`, ...den }))
  : (room.anchors ?? []).map((anchor) => ({ id: anchor.characterId, ...anchor }));
for (const entry of anchors) {
  marks.push(`<circle cx="${entry.x}" cy="${entry.y}" r="5" fill="#f46cf0"/>`);
  label(entry.id, entry.x, entry.y, '#ffc4fc');
}
for (const entry of room.doors ?? []) {
  if (!entry.autoEnterRadius) continue;
  marks.push(`<circle cx="${entry.x}" cy="${entry.y}" r="${entry.autoEnterRadius}" fill="none" stroke="#a6ff70" stroke-width="2"/>`);
  label(entry.id, entry.x, entry.y, '#caff9f');
}
const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="960">${marks.join('')}</svg>`);
const image = await sharp(path.join(FB, 'assets', `${room.mapAsset}.jpg`))
  .composite([{ input: svg }]).png().toBuffer();
await fs.mkdir(path.dirname(output), { recursive: true });
await sharp(image).resize({ width }).png().toFile(output);
console.log(`${roomId}${roomId === 'docks' ? ` (${variant})` : ''}: ${output}`);
