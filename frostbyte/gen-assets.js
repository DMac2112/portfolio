// gen-assets.js — generates all pixel-art assets for Frostbyte (no dependencies).
// Run:  node gen-assets.js   → writes PNGs into ./assets/
// Everything here is hand-generated pixel art, code-drawn at build time (ASSET-CREDITS.md).
// Forked from game1/gen-assets.js's PNG encoder + draw helpers (same technique, own content/palette).
import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'assets');
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(path.join(OUT, 'props'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'cosmetics'), { recursive: true });

/* ----------------------------- PNG encoder (verbatim technique from game1) --------------- */
const CRC = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const body = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePNG(img) {
  const { w, h, buf } = img;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; buf.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

/* ----------------------------- draw helpers ---------------------------- */
function Img(w, h) { return { w, h, buf: Buffer.alloc(w * h * 4, 0) }; }
function px(img, x, y, c) {
  x |= 0; y |= 0; if (x < 0 || y < 0 || x >= img.w || y >= img.h) return;
  const a = c[3] === undefined ? 255 : c[3];
  const i = (y * img.w + x) * 4;
  if (a >= 255) { img.buf[i] = c[0]; img.buf[i + 1] = c[1]; img.buf[i + 2] = c[2]; img.buf[i + 3] = 255; return; }
  if (a <= 0) return;
  const af = a / 255, ia = 1 - af, j = i;
  img.buf[j] = c[0] * af + img.buf[j] * ia;
  img.buf[j + 1] = c[1] * af + img.buf[j + 1] * ia;
  img.buf[j + 2] = c[2] * af + img.buf[j + 2] * ia;
  img.buf[j + 3] = Math.max(img.buf[j + 3], a);
}
function rect(img, x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(img, x + i, y + j, c); }
function disc(img, cx, cy, r, c) { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) px(img, cx + x, cy + y, c); }
function rrect(img, x, y, w, h, c) { rect(img, x + 1, y, w - 2, h, c); rect(img, x, y + 1, w, h - 2, c); }
function save(name, img) { fs.writeFileSync(path.join(OUT, name), encodePNG(img)); return `${name} ${img.w}x${img.h}`; }

// seeded PRNG (project LCG, independent seed from game1's 1337 — see engine/rng.js)
let SEED = 2600;
function rnd() { SEED = (SEED * 1664525 + 1013904223) >>> 0; return (SEED >>> 16) / 0xffff; }

/* ----------------------------- palette --------------------------------- */
const C = {
  out: [22, 28, 38],
  snow: [235, 242, 248], snowD: [214, 224, 234], snowL: [250, 252, 255],
  water: [110, 178, 214], waterD: [80, 140, 180], waterL: [168, 220, 244],
  stone: [186, 192, 202], stoneD: [148, 154, 166],
  pine: [46, 110, 86], pineD: [30, 80, 64], trunk: [92, 64, 42],
  belly: [246, 249, 252], beak: [255, 176, 64], beakD: [222, 140, 38],
};
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const shade = (c, f) => [Math.max(0, Math.min(255, c[0] * f)), Math.max(0, Math.min(255, c[1] * f)), Math.max(0, Math.min(255, c[2] * f))];

/* ----------------------------- PENGUIN -------------------------------- */
// 4 cols x 5 rows, 16x16 cells (§4.3): row0 down, row1 side (left = flipX), row2 up, row3 emote, row4 throw.
function buildPenguin(bodyHex) {
  const body = hex(bodyHex), bodyD = shade(body, 0.72), bodyL = shade(body, 1.2);
  const CW = 16, CH = 16, COLS = 4, ROWS = 5;
  const img = Img(CW * COLS, CH * ROWS);
  const cell = (fx, fy, draw) => draw((x, y, c) => px(img, fx * CW + x, fy * CH + y, c));
  const legA = [0, -1, 0, 1]; // waddle bob per frame, matches game1's leg-offset convention

  function bodyShape(p) {
    // egg-shaped body, x3..12, y3..14
    for (let y = 3; y <= 14; y++) {
      const halfW = y < 8 ? 3 + ((y - 3) * 0.4) : 4.3 - ((y - 8) * 0.35);
      for (let x = Math.round(8 - halfW); x <= Math.round(8 + halfW); x++) p(x, y, body);
    }
    for (let y = 3; y <= 14; y++) p(Math.round(8 - (y < 8 ? 3 + (y - 3) * 0.4 : 4.3 - (y - 8) * 0.35)), y, bodyD);
    for (let y = 3; y <= 14; y++) p(Math.round(8 + (y < 8 ? 3 + (y - 3) * 0.4 : 4.3 - (y - 8) * 0.35)), y, bodyL);
  }
  function belly(p) { for (let y = 7; y <= 13; y++) { const halfW = 2.6 - Math.abs(y - 10) * 0.35; for (let x = Math.round(8 - halfW); x <= Math.round(8 + halfW); x++) p(x, y, C.belly); } }
  function foot(p, x, y) { p(x, y, C.beak); p(x + 1, y, C.beakD); }

  for (let f = 0; f < COLS; f++) {
    const la = legA[f], lb = -legA[f];
    // ---- DOWN ----
    cell(f, 0, (p) => {
      for (let x = 5; x <= 10; x++) p(x, 15, [0, 0, 0, 50]); // shadow
      bodyShape(p); belly(p);
      p(6, 5, C.out); p(9, 5, C.out); // eyes
      p(7, 6, C.beak); p(8, 6, C.beak); p(7, 7, C.beakD); p(8, 7, C.beakD); // beak
      foot(p, 6, 14 + la); foot(p, 9, 14 + lb);
    });
    // ---- SIDE (facing right; left = flipX) ----
    cell(f, 1, (p) => {
      for (let x = 5; x <= 10; x++) p(x, 15, [0, 0, 0, 50]);
      bodyShape(p); belly(p);
      p(10, 5, C.out); // one eye
      p(10, 6, C.beak); p(11, 6, C.beak); p(10, 7, C.beakD); // side beak, points right
      foot(p, 7 + la, 14); foot(p, 9 + lb, 14);
    });
    // ---- UP (back of the head — no face) ----
    cell(f, 2, (p) => {
      for (let x = 5; x <= 10; x++) p(x, 15, [0, 0, 0, 50]);
      bodyShape(p);
      foot(p, 6, 14 + la); foot(p, 9, 14 + lb);
    });
    // ---- EMOTE (row3): non-directional bounce + sparkle, one-shot 4-frame loop ----
    cell(f, 3, (p) => {
      const bob = [0, -1, -2, -1][f];
      for (let x = 5; x <= 10; x++) p(x, 15, [0, 0, 0, 50]);
      const shift = (draw) => (x, y, c) => draw(x, y + bob, c);
      bodyShape(shift(p)); belly(shift(p));
      p(6, 5 + bob, C.out); p(9, 5 + bob, C.out);
      p(7, 6 + bob, C.beak); p(8, 6 + bob, C.beak);
      foot(p, 6, 14); foot(p, 9, 14);
      if (f >= 1) { p(11 + f, 2, [255, 240, 160, 220]); p(12 + f, 3, [255, 240, 160, 160]); } // sparkle
    });
    // ---- THROW (row4): wind-up/release, one-shot 4-frame ----
    cell(f, 4, (p) => {
      for (let x = 5; x <= 10; x++) p(x, 15, [0, 0, 0, 50]);
      bodyShape(p); belly(p);
      p(10, 5, C.out);
      p(10, 6, C.beak); p(11, 6, C.beak);
      foot(p, 7, 14); foot(p, 9, 14);
      // flipper swings from low (f0) to raised overhead (f2/f3 = release)
      const wingY = [12, 9, 5, 6][f], wingX = [11, 12, 12, 13][f];
      p(wingX, wingY, bodyD); p(wingX, wingY + 1, bodyD);
    });
  }
  return save('penguin.png', img);
}

/* ----------------------------- ROOM: Chillmere Plaza -------------------- */
// Native 480x320 (30x20 tiles @ 16px); KAPLAY scales by SCALE=3 at render time (world = 1440x960).
// World-px landmark centers below are /3 to place them in native space (matches content/rooms.js).
function buildRoomPlaza() {
  const W = 480, H = 320;
  const img = Img(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let col = C.snow; const n = rnd();
    if (n > 0.9) col = C.snowD; else if (n > 0.8) col = C.snowL;
    px(img, x, y, col);
  }
  // scattered snow-dusted pines near the four corners (kept clear of the pond + spawn path)
  const pineAt = (cx, cy) => {
    disc(img, cx, cy - 6, 6, C.pineD); disc(img, cx, cy - 9, 5, C.pine); disc(img, cx, cy - 12, 4, C.pine);
    rect(img, cx - 1, cy - 1, 2, 5, C.trunk);
    disc(img, cx, cy - 13, 2, C.snowL); // snow cap
  };
  for (const [cx, cy] of [[18, 20], [38, 22], [462, 20], [442, 22], [18, 300], [38, 296], [462, 300], [442, 296]]) pineAt(cx, cy);

  // Driftback's Fountain — world (792,264) -> native (264,88), matches content/rooms.js hotspot + solid.
  const fx = 264, fy = 88;
  disc(img, fx, fy, 42, C.water);
  disc(img, fx, fy, 42, C.waterD); disc(img, fx - 6, fy - 6, 36, C.water); // shoreline shading
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; px(img, fx + Math.round(Math.cos(a) * 30), fy + Math.round(Math.sin(a) * 30), C.waterL); }
  disc(img, fx, fy, 11, C.stoneD); disc(img, fx, fy, 9, C.stone);
  px(img, fx, fy - 12, C.waterL); px(img, fx - 1, fy - 10, C.waterL); px(img, fx + 1, fy - 9, C.waterL); // spray

  return save('room-plaza.png', img);
}

/* ----------------------------- run -------------------------------------- */
const made = [
  buildPenguin('#2b3346'),
  buildRoomPlaza(),
];
console.log('Generated:\n  ' + made.join('\n  '));
