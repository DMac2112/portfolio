// gen-assets.js — generates all pixel-art assets for Frostbyte (no dependencies).
// Run:  node gen-assets.js   → writes PNGs into ./assets/
// Everything here is hand-generated pixel art, code-drawn at build time (ASSET-CREDITS.md).
// Forked from game1/gen-assets.js's PNG encoder + draw helpers (same technique, own content/palette).
import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ITEM_CATALOG } from './content/cosmetics.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'assets');
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(path.join(OUT, 'props'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'cosmetics'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'minigame'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'furniture'), { recursive: true });

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

/* ----------------------------- PENGUIN (layered) ---------------------- */
// Avatar §1: the penguin is a stack of alignment-locked 4x3 sheets (64x48, 16px cells):
//   penguin-body  = GRAYSCALE silhouette, recoloured at runtime by k.color(bodyHex)
//   penguin-belly = untinted detail: cream belly + dark eyes + orange beak/feet
//   cosmetics/*   = GRAYSCALE overlays, recoloured at runtime by the item's catalog tint
// row0 down (0-3), row1 side/right (4-7; left = flipX), row2 up (8-11). Head is stationary
// during a walk cycle (only feet bob), so every layer shares one frame index via syncFrame().
const CW = 16, CH = 16, COLS = 4, ROWS = 3;
const LEG_A = [0, -1, 0, 1]; // waddle bob per walk frame

// grayscale body palette (tinted at runtime)
const G = { hi: [230, 230, 234], mid: [174, 174, 180], lo: [112, 112, 120], out: [46, 46, 54] };
// untinted detail palette
const D = { belly: [246, 249, 252], eye: [26, 32, 42], beak: [255, 176, 64], beakD: [222, 140, 38], foot: [255, 176, 64], footD: [222, 140, 38] };

function eggBody(p) {
  for (let y = 3; y <= 14; y++) {
    const halfW = y < 8 ? 3 + (y - 3) * 0.4 : 4.3 - (y - 8) * 0.35;
    const xL = Math.round(8 - halfW), xR = Math.round(8 + halfW);
    for (let x = xL; x <= xR; x++) p(x, y, G.mid);
    p(xL, y, G.out); p(xR, y, G.out);       // side outline
    p(xL + 1, y, G.lo); p(xR - 1, y, G.hi);  // inner shade / light
  }
  for (let x = 6; x <= 10; x++) { p(x, 3, G.out); p(x, 14, G.out); } // top/bottom caps
}
function bellyPatch(p) {
  for (let y = 7; y <= 13; y++) {
    const halfW = 2.6 - Math.abs(y - 10) * 0.35;
    for (let x = Math.round(8 - halfW); x <= Math.round(8 + halfW); x++) p(x, y, D.belly);
  }
}
function footG(p, x, y) { p(x, y, G.mid); p(x + 1, y, G.lo); }
function footD(p, x, y) { p(x, y, D.foot); p(x + 1, y, D.footD); }

function buildPenguinBody() {
  const img = Img(CW * COLS, CH * ROWS);
  const cell = (fx, fy, draw) => draw((x, y, c) => px(img, fx * CW + x, fy * CH + y, c));
  for (let f = 0; f < COLS; f++) {
    const la = LEG_A[f], lb = -LEG_A[f];
    cell(f, 0, (p) => { for (let x = 5; x <= 10; x++) p(x, 15, [0, 0, 0, 45]); eggBody(p); footG(p, 6, 14 + la); footG(p, 9, 14 + lb); });
    cell(f, 1, (p) => { for (let x = 5; x <= 10; x++) p(x, 15, [0, 0, 0, 45]); eggBody(p); footG(p, 7 + la, 14); footG(p, 9 + lb, 14); });
    cell(f, 2, (p) => { for (let x = 5; x <= 10; x++) p(x, 15, [0, 0, 0, 45]); eggBody(p); footG(p, 6, 14 + la); footG(p, 9, 14 + lb); });
  }
  return save('penguin-body.png', img);
}

function buildPenguinBelly() {
  const img = Img(CW * COLS, CH * ROWS);
  const cell = (fx, fy, draw) => draw((x, y, c) => px(img, fx * CW + x, fy * CH + y, c));
  for (let f = 0; f < COLS; f++) {
    const la = LEG_A[f], lb = -LEG_A[f];
    // down: belly + two eyes + centred beak + orange feet
    cell(f, 0, (p) => { bellyPatch(p); p(6, 5, D.eye); p(9, 5, D.eye); p(7, 6, D.beak); p(8, 6, D.beak); p(7, 7, D.beakD); p(8, 7, D.beakD); footD(p, 6, 14 + la); footD(p, 9, 14 + lb); });
    // side: belly + one eye + side beak + orange feet
    cell(f, 1, (p) => { bellyPatch(p); p(10, 5, D.eye); p(10, 6, D.beak); p(11, 6, D.beak); p(10, 7, D.beakD); footD(p, 7 + la, 14); footD(p, 9 + lb, 14); });
    // up: back of head — no belly/eyes/beak, just orange feet
    cell(f, 2, (p) => { footD(p, 6, 14 + la); footD(p, 9, 14 + lb); });
  }
  return save('penguin-belly.png', img);
}

/* ----------------------------- COSMETIC OVERLAYS ---------------------- */
// Grayscale shapes, tinted per-item at runtime. Head is stationary during a walk cycle, so each
// row's 4 frames are identical. Drawn only on facings where the item is visible.
const CG = { fill: [212, 212, 218], edge: [116, 116, 126], hi: [244, 244, 248] };

function drawHat(p, id) {
  if (id === 'snug-beanie') {
    for (let x = 5; x <= 10; x++) { p(x, 3, CG.fill); p(x, 4, CG.fill); }
    for (let x = 6; x <= 9; x++) p(x, 2, CG.fill);
    for (let x = 5; x <= 10; x++) p(x, 5, CG.edge); // brim
    p(6, 3, CG.hi);
  } else if (id === 'party-cone') {
    p(8, 0, CG.fill); for (let x = 7; x <= 8; x++) p(x, 1, CG.fill);
    for (let x = 6; x <= 9; x++) p(x, 2, CG.fill); for (let x = 5; x <= 10; x++) p(x, 3, CG.fill);
    for (let x = 5; x <= 10; x++) p(x, 4, CG.edge);
    p(8, 1, CG.hi);
  } else if (id === 'propeller-cap') {
    for (let x = 5; x <= 10; x++) { p(x, 3, CG.fill); p(x, 4, CG.fill); }
    p(8, 2, CG.fill);
    for (let x = 4; x <= 11; x++) p(x, 1, CG.edge); // propeller bar
    p(8, 0, CG.hi);
  } else if (id === 'ice-crown') {
    for (let x = 5; x <= 10; x++) p(x, 4, CG.fill);
    p(5, 3, CG.fill); p(5, 2, CG.hi); p(8, 3, CG.fill); p(8, 1, CG.hi); p(10, 3, CG.fill); p(10, 2, CG.hi);
  }
}

function drawEyewear(p, id, facing) {
  const lens = facing === 'down' ? [[6, 5], [9, 5]] : [[10, 5]];
  for (const [lx, ly] of lens) { p(lx, ly, CG.fill); p(lx, ly - 1, CG.edge); p(lx, ly + 1, CG.edge); }
  if (facing === 'down') { p(7, 5, CG.edge); p(8, 5, CG.edge); } // bridge
  if (id === 'star-specs') for (const [lx, ly] of lens) p(lx, ly, CG.hi);
  if (id === 'goggles') for (let x = 5; x <= 10; x++) if (facing === 'down') p(x, 5, x % 2 ? CG.edge : CG.fill); // strap
}

function drawNeck(p, id) {
  if (id === 'striped-scarf') {
    for (let x = 5; x <= 10; x++) p(x, 8, CG.fill);
    for (let x = 5; x <= 10; x++) p(x, 9, CG.edge);
    p(9, 10, CG.fill); p(10, 10, CG.fill); p(9, 11, CG.hi); // hanging end
  } else if (id === 'bandana') {
    for (let x = 6; x <= 9; x++) p(x, 8, CG.fill); for (let x = 7; x <= 8; x++) p(x, 9, CG.fill); p(8, 10, CG.edge);
  } else if (id === 'bowtie') {
    p(7, 8, CG.fill); p(7, 9, CG.fill); p(9, 8, CG.fill); p(9, 9, CG.fill); p(8, 8, CG.edge); p(8, 9, CG.hi);
  }
}

function drawHeld(p, id) {
  if (id === 'mini-flag') {
    for (let y = 7; y <= 12; y++) p(12, y, CG.edge); // pole
    for (let x = 13; x <= 15; x++) { p(x, 7, CG.fill); p(x, 8, CG.fill); } p(13, 7, CG.hi);
  } else if (id === 'bubble-wand') {
    for (let y = 9; y <= 12; y++) p(12, y, CG.edge);
    p(12, 7, CG.fill); p(14, 7, CG.fill); p(13, 6, CG.fill); p(13, 8, CG.fill); // ring
  } else if (id === 'snowball') {
    p(12, 10, CG.fill); p(13, 10, CG.fill); p(12, 11, CG.fill); p(13, 11, CG.fill); p(13, 10, CG.hi);
  } else if (id === 'sparkler-wand') {
    for (let y = 9; y <= 12; y++) p(12, y, CG.edge);
    p(13, 6, CG.hi); p(14, 7, CG.fill); p(12, 6, CG.fill); p(13, 8, CG.hi);
  }
}

function buildCosmetic(item) {
  const img = Img(CW * COLS, CH * ROWS);
  const cell = (fx, fy, draw) => draw((x, y, c) => px(img, fx * CW + x, fy * CH + y, c));
  const rowOf = { down: 0, side: 1, up: 2 };
  const drawer = { hat: drawHat, eyewear: drawEyewear, neck: drawNeck, held: drawHeld }[item.slot];
  const facings = item.slot === 'eyewear' || item.slot === 'held' ? ['down', 'side'] : ['down', 'side', 'up'];
  for (let f = 0; f < COLS; f++) for (const facing of facings) cell(f, rowOf[facing], (p) => drawer(p, item.id, facing));
  return save(path.join('cosmetics', `${item.slot}-${item.id}.png`), img);
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

/* ----------------------------- ROOM: Your Den (igloo interior) --------- */
// Native 480x320, same technique/dims as buildRoomPlaza. Floor disc ~127r centered on the frame;
// the hearth solid sits at world (720,240,120,90) -> native (240,80,40,30) /scale(3), matching
// content/rooms.js `den.solids`, so the painted ember glow lines up with the real collision box.
const ICE = {
  floor: [220, 233, 244], floorD: [198, 215, 230], floorL: [240, 248, 254],
  wall: [172, 202, 222], wallD: [132, 166, 190], wallEdge: [92, 128, 156],
  mat: [178, 108, 70], matD: [140, 82, 54],
  stone: [156, 156, 166], stoneD: [116, 116, 128],
  ember: [255, 150, 58], emberL: [255, 210, 132], emberD: [176, 62, 38],
  aurora: [140, 232, 214],
  crate: [150, 108, 74], crateD: [114, 80, 52],
  void: [22, 32, 46],
};

function buildRoomDen() {
  const W = 480, H = 320;
  const img = Img(W, H);
  const cx = 240, cy = 160, rFloor = 127, wallT = 26, rWall = rFloor + wallT;

  // Dark vignette beyond the dome's round silhouette (the canvas is square; the dome reads as round).
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = Math.hypot(x - cx, y - cy);
    const t = Math.min(1, Math.max(0, (d - (rWall - 14)) / 120));
    px(img, x, y, shade(ICE.void, 1 - t * 0.5));
  }

  // Packed-snow floor disc.
  for (let y = -rFloor; y <= rFloor; y++) for (let x = -rFloor; x <= rFloor; x++) {
    if (x * x + y * y > rFloor * rFloor + rFloor * 0.6) continue;
    let col = ICE.floor; const n = rnd();
    if (n > 0.9) col = ICE.floorD; else if (n > 0.8) col = ICE.floorL;
    px(img, cx + x, cy + y, col);
  }

  // Ice-block ring wall: angular "blocks" (alternating tint) with light-from-above gradation.
  const segs = 30, bands = 2;
  for (let y = -rWall; y <= rWall; y++) for (let x = -rWall; x <= rWall; x++) {
    const r = Math.hypot(x, y);
    if (r < rFloor - 1 || r > rWall) continue;
    const theta = Math.atan2(y, x);
    const frac = ((theta + Math.PI) / (Math.PI * 2)) * segs;
    const segIdx = Math.floor(frac), segFrac = frac - segIdx;
    const bandIdx = Math.min(bands - 1, Math.floor((r - rFloor) / (wallT / bands)));
    const lightF = 1 - ((y + rWall) / (2 * rWall)) * 0.4; // north (top) reads brighter than south
    let col = shade((segIdx + bandIdx) % 2 === 0 ? ICE.wall : ICE.wallD, lightF);
    if (segFrac < 0.05 || segFrac > 0.95 || Math.abs((r - rFloor) - wallT / bands) < 1.1) col = ICE.wallEdge;
    px(img, cx + x, cy + y, col);
  }

  // Door gap: south wall opening (~x 225-255 native) — lit threshold + doormat, a snow sliver beyond.
  for (let y = 0; y <= rWall + 16; y++) for (let x = -15; x <= 15; x++) {
    const wx = cx + x, wy = cy + y;
    if (wx < 0 || wy < 0 || wx >= W || wy >= H) continue;
    const r = Math.hypot(x, y);
    if (r < rFloor - 1) continue;
    px(img, wx, wy, r > rWall ? shade(C.snowD, 0.6) : ICE.mat);
  }
  rect(img, cx - 14, cy + rFloor - 20, 28, 15, ICE.mat);
  for (let i = 0; i < 28; i++) { px(img, cx - 14 + i, cy + rFloor - 20, ICE.matD); px(img, cx - 14 + i, cy + rFloor - 6, ICE.matD); }
  for (let j = 0; j < 15; j++) { px(img, cx - 14, cy + rFloor - 20 + j, ICE.matD); px(img, cx + 13, cy + rFloor - 20 + j, ICE.matD); }

  // Window slits (3), each carved into the wall with a faint teal aurora glow bleeding outward.
  for (const deg of [-104, -16, 154]) {
    const a = (deg * Math.PI) / 180;
    const sx = cx + Math.cos(a) * ((rFloor + rWall) / 2), sy = cy + Math.sin(a) * ((rFloor + rWall) / 2);
    for (let y = -rWall; y <= rWall; y++) for (let x = -rWall; x <= rWall; x++) {
      const r = Math.hypot(x, y);
      if (r < rFloor + 3 || r > rWall - 3) continue;
      const theta = Math.atan2(y, x);
      let da = theta - a; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
      if (Math.abs(da) < 0.045) px(img, cx + x, cy + y, ICE.aurora);
    }
    for (let layer = 12; layer >= 3; layer -= 3) disc(img, Math.round(sx), Math.round(sy), layer, [...ICE.aurora, Math.round(80 * (1 - layer / 12))]);
  }

  // Hearth — matches the world (720,240,120,90) solid, native (240,80,40,30): stone ring + embers.
  const hx = 240, hy = 80;
  disc(img, hx, hy, 21, ICE.stoneD); disc(img, hx, hy, 18, ICE.stone);
  for (let layer = 16; layer >= 3; layer -= 3) disc(img, hx, hy, layer, [...ICE.ember, Math.round(70 * (1 - layer / 16))]);
  disc(img, hx, hy, 8, ICE.ember); disc(img, hx, hy - 2, 5, ICE.emberL); disc(img, hx, hy - 3, 2, ICE.emberD);

  // Floor flourishes, kept sparse — a knit-rug outline and a small crate. Furniture proper is H2.
  for (let y = -22; y <= 22; y++) for (let x = -34; x <= 34; x++) {
    const e = (x * x) / (34 * 34) + (y * y) / (22 * 22);
    if (e >= 0.82 && e <= 1) px(img, cx - 58 + x, cy + 40 + y, ICE.matD);
  }
  rrect(img, cx + 64, cy + 18, 20, 20, ICE.crateD);
  rect(img, cx + 66, cy + 20, 16, 16, ICE.crate);
  rect(img, cx + 66, cy + 20, 16, 3, shade(ICE.crate, 1.25));

  return save('room-den.png', img);
}

/* ----------------------------- MAP: Chillmere Isle ---------------------- */
// 480x320 painted-look travel map (island only — pins/labels are DOM, content/map.js owns them).
// The three mist patches are centered exactly on MAP_NODES' locked x/y so the future-area pins land
// on the cloud cover; the plaza/den glyphs sit under the 'plaza'/'den' pins for the same reason.
const ISLE = {
  sea: [42, 66, 92], seaD: [30, 50, 72], seaL: [64, 98, 128],
  land: [204, 219, 234], landD: [176, 195, 214], landL: [226, 238, 248],
  coast: [126, 158, 184],
  plaza: [200, 202, 212], plazaD: [166, 168, 180], fountain: [110, 178, 214],
  dome: [236, 244, 250], domeSh: [176, 202, 220], domeDoor: [96, 72, 52],
  roof: [176, 92, 84], roofD: [140, 68, 62],
  mist: [250, 251, 253], mistShadow: [172, 194, 214],
};

function buildMapIsle() {
  const W = 480, H = 320;
  const img = Img(W, H);
  const cx0 = W / 2, cy0 = H / 2, diag = Math.hypot(cx0, cy0);

  // Cool sea backdrop with a soft painted-paper vignette (lighter center, deeper at the corners).
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = Math.hypot(x - cx0, y - cy0) / diag;
    let col = shade(ISLE.sea, 1 + (1 - t) * 0.18);
    const n = rnd();
    if (n > 0.96) col = shade(ISLE.seaL, 1 + (1 - t) * 0.1); else if (n > 0.9) col = ISLE.seaD;
    px(img, x, y, col);
  }

  // Island landmass — a union of overlapping blobs, sized to host every map node (incl. locked ones).
  const blobs = [
    [220, 150, 130], [300, 220, 90], [190, 55, 72], [372, 128, 76],
    [90, 150, 82], [250, 88, 58], [150, 232, 68],
  ];
  const isLand = (x, y) => blobs.some(([bx, by, br]) => (x - bx) ** 2 + (y - by) ** 2 <= br * br);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!isLand(x, y)) continue;
    let col = ISLE.land; const n = rnd();
    if (n > 0.92) col = ISLE.landD; else if (n > 0.85) col = ISLE.landL;
    px(img, x, y, col);
  }
  // Coastline: darker fringe just inside the shore, lighter shallow-water fringe just outside it.
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const land = isLand(x, y);
    const edge = isLand(x - 2, y) !== land || isLand(x + 2, y) !== land || isLand(x, y - 2) !== land || isLand(x, y + 2) !== land;
    if (!edge) continue;
    px(img, x, y, land ? ISLE.coast : [...ISLE.seaL, 190]);
  }

  // Pine clusters — flavor only, a scaled-down version of the plaza's disc-stack pine.
  const pineAt = (px0, py0, s) => {
    disc(img, px0, py0 - 3 * s, 3.4 * s, [30, 80, 64]);
    disc(img, px0, py0 - 5 * s, 2.7 * s, [46, 110, 86]);
    disc(img, px0, py0 - 6.6 * s, 2 * s, [46, 110, 86]);
  };
  for (const [bx, by] of [[150, 210], [270, 200], [320, 145], [175, 100]]) pineAt(bx, by, 1.15);

  // Snowfield, northwest — a brighter, sparkly patch of terrain (flavor; no baked label).
  for (let y = 16; y <= 100; y++) for (let x = 30; x <= 150; x++) {
    if (!isLand(x, y)) continue;
    if (rnd() > 0.55) px(img, x, y, ISLE.landL);
    if (rnd() > 0.985) px(img, x, y, [255, 255, 255]);
  }

  // Plaza square — small painted town glyph under the 'plaza' pin at normalized (0.46, 0.40).
  const ppx = Math.round(0.46 * W), ppy = Math.round(0.40 * H);
  rect(img, ppx - 12, ppy - 12, 24, 24, ISLE.plazaD);
  rect(img, ppx - 10, ppy - 10, 20, 20, ISLE.plaza);
  rect(img, ppx - 1, ppy - 10, 2, 20, ISLE.plazaD);
  rect(img, ppx - 10, ppy - 1, 20, 2, ISLE.plazaD);
  disc(img, ppx, ppy, 3, ISLE.fountain);
  for (const [ox, oy] of [[-20, -14], [18, -16], [-18, 16], [20, 14]]) {
    rect(img, ppx + ox - 4, ppy + oy - 4, 8, 8, ISLE.roofD);
    rect(img, ppx + ox - 4, ppy + oy - 5, 8, 3, ISLE.roof);
  }

  // Igloo dome — small painted dome glyph under the 'den' pin at normalized (0.62, 0.74).
  const dpx = Math.round(0.62 * W), dpy = Math.round(0.74 * H);
  disc(img, dpx, dpy, 12, ISLE.domeSh);
  disc(img, dpx, dpy - 2, 11, ISLE.dome);
  rect(img, dpx - 3, dpy + 5, 6, 4, ISLE.domeDoor);

  // Mist/cloud patches over the three locked areas — centers match MAP_NODES exactly. Painted as
  // tight scalloped puffs (not a broad soft glow) so each patch reads as a discrete cloud sitting
  // on the island, rather than washing the whole map out to white-on-white.
  const puffs = [[0, -2, 17], [-13, 5, 14], [13, 5, 14], [0, 10, 13]];
  for (const [nx, ny] of [[0.38, 0.12], [0.80, 0.38], [0.14, 0.46]]) {
    const mx = Math.round(nx * W), my = Math.round(ny * H);
    // faint haze rim so the cloud doesn't have a hard cutoff against the land
    for (let layer = 30; layer >= 20; layer -= 5) disc(img, mx, my, layer, [...ISLE.mist, Math.round(60 * (1 - layer / 30))]);
    // cool shadowed underside, offset down-right, for a puffy 3-D read
    for (const [ox, oy, r] of puffs) disc(img, mx + ox + 3, my + oy + 4, r, [...ISLE.mistShadow, 130]);
    // opaque cloud body
    for (const [ox, oy, r] of puffs) disc(img, mx + ox, my + oy, r, [...ISLE.mist, 235]);
    // small bright highlight, upper-left
    disc(img, mx - 6, my - 9, 7, [255, 255, 255, 170]);
  }

  return save('map-isle.png', img);
}

/* ----------------------------- MINIGAME: Snowdrift Toss ------------------ */
// Extra tones not already in C, matching the spec for this minigame's art.
const MG = { shadow: [170, 190, 210], dark: [40, 46, 54], orange: [255, 150, 60], sky: [214, 228, 240] };

function buildSnowpal() {
  const img = Img(32, 32);
  // fills a disc with `color` only on the +x side (a flat one-side shade), masked to the same circle.
  const shadeDiscSide = (cx, cy, r, color) => {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      if (x * x + y * y <= r * r + r * 0.6 && x > r * 0.3) px(img, cx + x, cy + y, color);
    }
  };
  // body (bottom, larger), then head (top, smaller) drawn after so it sits cleanly on the body
  disc(img, 16, 23, 10, C.snow);
  shadeDiscSide(16, 23, 10, MG.shadow);
  disc(img, 16, 9, 7, C.snow);
  shadeDiscSide(16, 9, 7, MG.shadow);

  // dot eyes
  px(img, 13, 8, MG.dark); px(img, 19, 8, MG.dark);
  // small orange triangle nose, pointing right
  px(img, 17, 10, MG.orange); px(img, 18, 10, MG.orange); px(img, 17, 11, MG.orange);
  // dark buttons down the body
  px(img, 16, 18, MG.dark); px(img, 16, 22, MG.dark); px(img, 16, 26, MG.dark);

  return save(path.join('minigame', 'snowpal.png'), img);
}

function buildSnowball() {
  const img = Img(12, 12);
  disc(img, 6, 6, 5, C.snow);
  // lighter highlight, top-left
  px(img, 4, 3, C.snowL); px(img, 3, 4, C.snowL);
  // faint blue-grey shadow arc, bottom-right
  const shadow = [...MG.shadow, 130];
  px(img, 8, 8, shadow); px(img, 9, 7, shadow); px(img, 8, 9, shadow); px(img, 7, 9, shadow);
  return save(path.join('minigame', 'snowball.png'), img);
}

function buildMinigameBg() {
  const W = 480, H = 270;
  const img = Img(W, H);
  const bandH = Math.round(H * 0.4); // upper ~40% gradient band; lower ~60% is solid snow ground
  for (let y = 0; y < H; y++) {
    const t = y / bandH;
    const base = y <= bandH
      ? MG.sky.map((v, i) => v + (C.snow[i] - v) * t)
      : C.snow;
    for (let x = 0; x < W; x++) {
      let col = base;
      const n = rnd();
      if (n > 0.97) col = C.snowD; else if (n > 0.94) col = C.snowL;
      px(img, x, y, col);
    }
  }
  // subtle horizon line
  const horizonC = shade(C.snow, 0.94);
  for (let x = 0; x < W; x++) px(img, x, bandH, horizonC);
  return save(path.join('minigame', 'toss-bg.png'), img);
}

/* ----------------------------- FURNITURE (Home Plan §4, §10) ------------ */
// One PNG per item at the EXACT native size pinned by content/furniture-catalog.js (world scale is
// x3 at render time). Chunky pixel art in the room's cool-blue/ice palette family (reuses ICE.* from
// buildRoomDen) with warm accents (F.cush/F.wood/F.glow/F.gold) so furniture reads distinctly against
// the icy room shell. Non-rug items read as front-facing objects with a 1px dark outline (F.out) and
// a soft grounding shadow; rugs are flat top-down shapes (no outline/shadow — they lie under the
// penguin, per plan §4.2 "rugs render under everything"). No shared-PRNG (`rnd()`) calls here, so
// registering buildFurniture() after every existing builder cannot perturb their output.
const F = {
  out: C.out,
  wood: ICE.crate, woodD: ICE.crateD, woodL: shade(ICE.crate, 1.25),
  ice: ICE.floor, iceD: ICE.floorD, iceL: ICE.floorL,
  wall: ICE.wall, wallD: ICE.wallD,
  cush: [222, 140, 82], cushD: [186, 106, 58], cushL: [242, 178, 122],
  metal: [104, 116, 130], metalD: [76, 86, 98], metalL: [154, 166, 180],
  glow: ICE.ember, glowL: ICE.emberL, glowD: ICE.emberD,
  aur: ICE.aurora, aurD: [92, 176, 160],
  gold: [214, 176, 88], goldD: [170, 132, 58],
  dark: [40, 46, 54],
  cream: D.belly,
};

// Outlined rectangle: fill, then a 1px border of `edge` traced on top (chunky-sprite convention).
function obox(img, x, y, w, h, fill, edge = F.out) {
  rect(img, x, y, w, h, fill);
  for (let i = 0; i < w; i++) { px(img, x + i, y, edge); px(img, x + i, y + h - 1, edge); }
  for (let j = 0; j < h; j++) { px(img, x, y + j, edge); px(img, x + w - 1, y + j, edge); }
}
// Thin outlined post/leg: dark side columns (or a solid dark peg when w<=2) with a capped top.
function legRect(img, x, y, w, h, fill, edge = F.out) {
  rect(img, x, y, w, h, fill);
  for (let j = 0; j < h; j++) { px(img, x, y + j, edge); if (w > 1) px(img, x + w - 1, y + j, edge); }
  for (let i = 0; i < w; i++) px(img, x + i, y, edge);
}
function oval(img, cx, cy, rx, ry, c) {
  for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++)
    if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1) px(img, cx + x, cy + y, c);
}
function ovalRing(img, cx, cy, rx, ry, c, steps = 180) {
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    px(img, Math.round(cx + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry), c);
  }
}
// Soft grounding shadow for front-facing items (mirrors the penguin body's under-foot shadow).
function groundShadow(img, cx, cy, rx, ry) { oval(img, cx, cy, rx, ry, [0, 0, 0, 50]); }

/* seating */
function furnSnowSofa() { // 32x24
  const img = Img(32, 24);
  groundShadow(img, 16, 22, 13, 3);
  obox(img, 0, 2, 6, 19, F.wall);   // left arm
  obox(img, 26, 2, 6, 19, F.wall);  // right arm
  obox(img, 4, 2, 24, 8, F.wallD);  // backrest
  rect(img, 4, 2, 24, 2, F.wall);   // backrest highlight
  obox(img, 1, 8, 30, 12, F.ice);   // seat cushions
  rect(img, 1, 9, 30, 2, F.iceL);
  for (let y = 9; y <= 18; y++) { px(img, 13, y, F.iceD); px(img, 19, y, F.iceD); } // cushion seams
  rect(img, 1, 17, 30, 2, F.cush);  // front trim (warm accent)
  rect(img, 1, 17, 30, 1, F.cushL);
  return save(path.join('furniture', 'snow-sofa.png'), img);
}
function furnIceStool() { // 16x16
  const img = Img(16, 16);
  groundShadow(img, 8, 14, 6, 2);
  legRect(img, 3, 8, 2, 6, F.wallD);
  legRect(img, 11, 8, 2, 6, F.wallD);
  oval(img, 8, 6, 6, 4, F.out);
  oval(img, 8, 6, 5, 3, F.ice);
  oval(img, 8, 5, 5, 2, F.iceL);
  rect(img, 4, 6, 8, 1, F.cush); // seam trim
  return save(path.join('furniture', 'ice-stool.png'), img);
}
function furnBeanDriftChair() { // 24x20
  const img = Img(24, 20);
  groundShadow(img, 12, 18, 9, 2);
  const blobs = [[12, 15, 9], [12, 10, 8], [7, 8, 5], [17, 8, 5], [12, 6, 5]];
  for (const [bx, by, br] of blobs) disc(img, bx, by, br + 1, F.out);
  for (const [bx, by, br] of blobs) disc(img, bx, by, br, F.wall);
  disc(img, 10, 7, 3, F.wallD);
  disc(img, 15, 11, 4, F.iceL);
  rect(img, 6, 17, 12, 2, F.cush); // base seam (warm accent)
  return save(path.join('furniture', 'bean-drift-chair.png'), img);
}
function furnLogBench() { // 32x16
  const img = Img(32, 16);
  groundShadow(img, 16, 14, 14, 2);
  obox(img, 2, 4, 28, 7, F.wood);
  rect(img, 2, 4, 28, 2, F.woodL);
  for (let x = 5; x < 29; x += 4) { px(img, x, 6, F.woodD); px(img, x, 8, F.woodD); } // bark rings
  legRect(img, 5, 11, 3, 4, F.woodD);
  legRect(img, 24, 11, 3, 4, F.woodD);
  return save(path.join('furniture', 'log-bench.png'), img);
}

/* tables */
function furnIceSlabTable() { // 32x20
  const img = Img(32, 20);
  groundShadow(img, 16, 18, 14, 2);
  legRect(img, 6, 9, 5, 9, F.wall);
  legRect(img, 21, 9, 5, 9, F.wall);
  obox(img, 1, 3, 30, 6, F.iceL);
  rect(img, 1, 3, 30, 2, [255, 255, 255, 90]);
  for (let i = 0; i < 5; i++) px(img, 5 + i * 6, 5, F.iceD); // facet cracks
  return save(path.join('furniture', 'ice-slab-table.png'), img);
}
function furnDriftwoodSideTable() { // 20x16
  const img = Img(20, 16);
  groundShadow(img, 10, 14, 8, 2);
  legRect(img, 3, 7, 3, 7, F.woodD);
  legRect(img, 14, 7, 3, 7, F.woodD);
  obox(img, 1, 2, 18, 5, F.wood);
  rect(img, 1, 2, 18, 1, F.woodL);
  return save(path.join('furniture', 'driftwood-side-table.png'), img);
}

/* lighting */
function furnGlowlamp() { // 16x28
  const img = Img(16, 28);
  groundShadow(img, 8, 26, 5, 2);
  legRect(img, 7, 14, 2, 11, F.metal);
  obox(img, 5, 22, 6, 3, F.metalD);
  for (let r = 8; r >= 2; r -= 2) disc(img, 8, 9, r, [...F.glow, Math.round(65 * (1 - r / 8) + 25)]);
  disc(img, 8, 9, 6, F.out);
  disc(img, 8, 9, 5, F.glowL);
  disc(img, 8, 8, 3, [255, 255, 255, 130]);
  return save(path.join('furniture', 'glowlamp.png'), img);
}
function furnAuroraLantern() { // 16x24
  const img = Img(16, 24);
  groundShadow(img, 8, 22, 5, 2);
  for (let y = 2; y <= 5; y++) { px(img, 7, y, F.metalD); px(img, 8, y, F.metalD); } // hanging loop
  for (let r = 7; r >= 2; r -= 2) disc(img, 8, 12, r, [...F.aur, Math.round(60 * (1 - r / 7) + 20)]);
  obox(img, 4, 8, 8, 9, F.metalD);
  rect(img, 5, 9, 6, 7, F.aur);
  rect(img, 5, 9, 6, 2, [255, 255, 255, 90]);
  legRect(img, 6, 17, 4, 2, F.metal);
  return save(path.join('furniture', 'aurora-lantern.png'), img);
}
function furnStringLights() { // 48x12
  const img = Img(48, 12);
  const bulbCols = [F.glow, F.aur, F.cushL, F.iceL];
  for (let x = 0; x < 48; x++) {
    const t = (x % 24) / 24;
    px(img, x, 2 + Math.round(Math.sin(t * Math.PI) * 5), F.metalD); // drooping wire
  }
  for (let i = 0; i < 6; i++) {
    const x = 4 + i * 8, t = (x % 24) / 24;
    const y = 2 + Math.round(Math.sin(t * Math.PI) * 5) + 1;
    const c = bulbCols[i % bulbCols.length];
    disc(img, x, y + 1, 3, [...c, 110]);
    disc(img, x, y + 1, 2, c);
  }
  return save(path.join('furniture', 'string-lights.png'), img);
}

/* rugs — flat top-down shapes, no outline/shadow (they sit under the penguin, plan §4.2) */
function furnOvalKnitRug() { // 48x32
  const img = Img(48, 32);
  oval(img, 24, 16, 22, 14, F.cushD);
  oval(img, 24, 16, 20, 12, F.cush);
  for (let ring = 3; ring < 12; ring += 3) ovalRing(img, 24, 16, 20 - ring, 12 - ring * 0.6, F.cushL, 200);
  ovalRing(img, 24, 16, 20, 12, F.cushD, 220);
  return save(path.join('furniture', 'oval-knit-rug.png'), img);
}
function furnFishRug() { // 40x28
  const img = Img(40, 28);
  oval(img, 15, 14, 12, 9, F.wallD);
  oval(img, 15, 14, 10, 7, F.wall);
  for (let y = -8; y <= 8; y++) { const w = 9 - Math.abs(y) * 0.7; for (let x = 0; x <= w; x++) px(img, 27 + x, 14 + y, F.wallD); }
  for (let y = -6; y <= 6; y++) { const w = 7 - Math.abs(y) * 0.55; for (let x = 0; x <= w; x++) px(img, 27 + x, 14 + y, F.wall); }
  oval(img, 15, 17, 7, 3, F.cush); // belly accent
  disc(img, 10, 11, 2, F.out);     // eye dot
  return save(path.join('furniture', 'fish-rug.png'), img);
}
function furnStarRug() { // 36x36
  const cx = 18, cy = 18;
  const img = Img(36, 36);
  const starFill = (rO, rI, c) => {
    for (let y = 0; y < 36; y++) for (let x = 0; x < 36; x++) {
      const dx = x - cx, dy = y - cy;
      const ang = Math.atan2(dy, dx) + Math.PI / 2;
      const seg = (((ang / (Math.PI * 2)) * 5) % 1 + 1) % 1;
      const spikeT = (seg < 0.5 ? seg : 1 - seg) * 2;
      const rEdge = rI + (rO - rI) * spikeT;
      if (Math.hypot(dx, dy) <= rEdge) px(img, x, y, c);
    }
  };
  starFill(17, 8, F.aurD);
  starFill(16, 7, F.aur);
  disc(img, cx, cy, 4, F.cush);
  return save(path.join('furniture', 'star-rug.png'), img);
}

/* decor */
function furnFrostFern() { // 16x28
  const img = Img(16, 28);
  groundShadow(img, 8, 26, 5, 2);
  obox(img, 4, 20, 8, 6, F.wood);
  rect(img, 4, 20, 8, 1, F.woodL);
  const fronds = [[-6, -14], [-3, -18], [0, -20], [3, -18], [6, -14]];
  const green = [64, 132, 108], greenD = [40, 96, 78], greenL = [124, 196, 172];
  for (const [dx, dy] of fronds) {
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const x = Math.round(8 + dx * t), y = Math.round(20 + dy * t);
      px(img, x, y, i > 7 ? greenL : green);
      px(img, x + 1, y, greenD);
    }
  }
  return save(path.join('furniture', 'frost-fern.png'), img);
}
function furnSnowBonsai() { // 20x24
  const img = Img(20, 24);
  groundShadow(img, 10, 22, 6, 2);
  obox(img, 5, 17, 10, 6, F.wood);
  rect(img, 5, 17, 10, 1, F.woodL);
  for (let y = 16; y >= 8; y--) { const x = 10 + Math.round(Math.sin(y * 0.6) * 2); px(img, x, y, F.woodD); px(img, x + 1, y, F.woodD); }
  const clumps = [[7, 7, 4], [12, 6, 4], [10, 3, 4]];
  for (const [cx, cy, r] of clumps) disc(img, cx, cy, r + 1, F.out);
  for (const [cx, cy, r] of clumps) disc(img, cx, cy, r, C.pine);
  for (const [cx, cy] of clumps) disc(img, cx, cy - 1, 2, C.snowL); // snow caps
  return save(path.join('furniture', 'snow-bonsai.png'), img);
}
function furnPenguinPortrait() { // 24x28 — framed generic-penguin silhouette
  const img = Img(24, 28);
  obox(img, 1, 1, 22, 26, F.gold);
  rect(img, 1, 1, 22, 2, F.goldD);
  obox(img, 4, 4, 16, 20, F.iceL, F.goldD);
  const cx = 12, cy = 17;
  for (let y = -8; y <= 6; y++) {
    const halfW = y < -2 ? 3 + (y + 8) * 0.35 : 4.2 - (y + 2) * 0.3;
    for (let x = -Math.round(halfW); x <= Math.round(halfW); x++) px(img, cx + x, cy + y, F.dark);
  }
  disc(img, cx, cy - 6, 2, F.cush); // beak dot
  return save(path.join('furniture', 'penguin-portrait.png'), img);
}
function furnTrophyShelf() { // 32x20
  const img = Img(32, 20);
  obox(img, 2, 12, 28, 4, F.wood);
  rect(img, 2, 12, 28, 1, F.woodL);
  legRect(img, 4, 16, 2, 3, F.woodD);
  legRect(img, 26, 16, 2, 3, F.woodD);
  for (const cx of [7, 16, 25]) {
    disc(img, cx, 7, 3, F.gold);
    rect(img, cx - 1, 9, 2, 3, F.goldD);
    px(img, cx - 3, 6, F.goldD); px(img, cx + 3, 6, F.goldD); // handles
    disc(img, cx - 1, 6, 1, [255, 255, 255, 150]);
  }
  return save(path.join('furniture', 'trophy-shelf.png'), img);
}

/* tech / fun */
function furnSnowputer() { // 24x24 — chunky CRT
  const img = Img(24, 24);
  groundShadow(img, 12, 22, 8, 2);
  obox(img, 8, 17, 8, 5, F.metalD); // base stand
  obox(img, 3, 3, 18, 14, F.iceL);  // case
  obox(img, 6, 5, 12, 8, F.dark);   // screen
  rect(img, 7, 6, 10, 6, F.aur);
  for (let y = 6; y < 12; y += 2) rect(img, 7, y, 10, 1, [...F.aurD, 140]); // scanlines
  disc(img, 20, 5, 1, F.cush); // power LED
  return save(path.join('furniture', 'snowputer.png'), img);
}
function furnRecordBox() { // 20x20
  const img = Img(20, 20);
  groundShadow(img, 10, 18, 7, 2);
  obox(img, 1, 8, 18, 9, F.wood);
  rect(img, 1, 8, 18, 1, F.woodL);
  disc(img, 10, 7, 7, F.out);
  disc(img, 10, 7, 6, F.dark);
  ovalRing(img, 10, 7, 4, 4, F.metalL, 120);
  disc(img, 10, 7, 1, F.cush);
  return save(path.join('furniture', 'record-box.png'), img);
}
function furnCocoaMachine() { // 20x28
  const img = Img(20, 28);
  groundShadow(img, 10, 26, 6, 2);
  obox(img, 6, 19, 8, 6, F.iceL); // cup
  rect(img, 6, 19, 8, 1, F.iceD);
  obox(img, 3, 4, 14, 17, F.cream);
  rect(img, 3, 4, 14, 2, [255, 255, 255, 90]);
  obox(img, 5, 6, 10, 6, F.metalD); // reservoir window
  rect(img, 6, 7, 8, 4, F.wood);    // cocoa fill
  disc(img, 10, 10, 2, F.woodL);
  rect(img, 8, 14, 4, 3, F.metal);  // spout
  disc(img, 14, 9, 1, F.cush);      // dial light
  return save(path.join('furniture', 'cocoa-machine.png'), img);
}

function buildFurniture() {
  return [
    furnSnowSofa(), furnIceStool(), furnBeanDriftChair(), furnLogBench(),
    furnIceSlabTable(), furnDriftwoodSideTable(),
    furnGlowlamp(), furnAuroraLantern(), furnStringLights(),
    furnOvalKnitRug(), furnFishRug(), furnStarRug(),
    furnFrostFern(), furnSnowBonsai(), furnPenguinPortrait(), furnTrophyShelf(),
    furnSnowputer(), furnRecordBox(), furnCocoaMachine(),
  ];
}

/* ----------------------------- DEN: door sign (Home Plan §7 "Open House") --------------- */
// 16x20 native (world 48x60 @ scale 3) — a small wooden signpost beside the den's door hotspot
// (content/rooms.js `den.hotspots` 'door-sign-den'). The post/bracket stay warm wood in both
// states; only the board FACE flips: warm/lit (open, tiny door-ajar glyph) vs cool/grey (closed,
// moon glyph) — no baked text, so the toggle reads purely by color + glyph at a glance, matching
// the furniture set's "1px dark outline, chunky pixel" convention above. Reuses F.*/ICE.* — no new
// palette entries, and (like buildFurniture) no shared-PRNG calls, so registering this after every
// existing builder cannot perturb their output.
function buildSignBase(img) {
  groundShadow(img, 8, 19, 5, 2);
  rect(img, 3, 9, 10, 2, F.woodD);            // bracket
  rect(img, 3, 9, 10, 1, F.wood);             // bracket highlight (top row)
  px(img, 4, 8, F.metalD); px(img, 11, 8, F.metalD); // short hanging chain links
  legRect(img, 7, 11, 2, 8, F.wood, F.woodD); // post
}

function buildDenSignOpen() { // 16x20
  const img = Img(16, 20);
  buildSignBase(img);
  obox(img, 1, 0, 14, 8, F.glowL);            // warm/lit face
  rect(img, 1, 0, 14, 1, [255, 255, 255, 90]); // top sheen
  rect(img, 8, 2, 3, 5, F.dark);               // doorway, ajar — dark interior beyond the gap
  for (let y = 2; y <= 6; y++) px(img, 7, y, y === 2 || y === 6 ? F.woodL : F.wood); // door leaf swung open
  px(img, 10, 4, F.gold);                      // doorknob
  return save('den-sign-open.png', img);
}

function buildDenSignClosed() { // 16x20
  const img = Img(16, 20);
  buildSignBase(img);
  obox(img, 1, 0, 14, 8, F.metal);            // cool/grey face
  rect(img, 1, 0, 14, 1, F.metalL);           // top sheen
  disc(img, 9, 4, 3, F.iceL);                 // moon
  disc(img, 10, 3, 3, F.metal);               // cut into a crescent
  px(img, 4, 2, F.iceL); px(img, 5, 5, F.iceL); // stars
  return save('den-sign-closed.png', img);
}

function buildDenSigns() {
  return [buildDenSignOpen(), buildDenSignClosed()];
}

/* ----------------------------- ROOM: Frostline Trail (H4) --------------- */
// Native 480x320, same technique as the plaza. World-px landmarks /3 into native space,
// matching content/rooms.js `trail`: falls (720,220)->(240,73), pines solids (300,400)+(1100,300)
// -> (100,133)+(367,100) at 40x47, boulder (500,700)->(167,233) at 33x27, signpost
// (1100,760)->(367,253). Path enters at the south door (720,880)->(240,293) and winds to the falls.
function buildRoomTrail() {
  const W = 480, H = 320;
  const img = Img(W, H);

  // High-altitude snowfield base — a touch brighter than the plaza.
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let col = C.snowL; const n = rnd();
    if (n > 0.88) col = C.snowD; else if (n > 0.72) col = C.snow;
    px(img, x, y, col);
  }

  // Winding packed-snow path, south door up to the falls pool (S-curve through the pickups' line).
  const pathPts = [[240, 312], [232, 280], [214, 244], [204, 214], [216, 178], [242, 148], [250, 118], [240, 92]];
  for (let i = 0; i < pathPts.length - 1; i++) {
    const [x0, y0] = pathPts[i], [x1, y1] = pathPts[i + 1];
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const cx = Math.round(x0 + (x1 - x0) * t), cy = Math.round(y0 + (y1 - y0) * t);
      disc(img, cx, cy, 11, C.snowD);
      disc(img, cx + 1, cy, 8, shade(C.snowD, 1.04));
    }
  }
  // Sparse footprints along the path.
  for (const [fx, fy] of [[236, 292], [226, 262], [210, 228], [212, 196], [230, 162], [246, 132]]) {
    px(img, fx, fy, C.stoneD); px(img, fx + 2, fy + 3, C.stoneD);
  }

  // The Frozen Falls — dark rock cliff band across the top, glassy ice columns, frozen plunge pool.
  for (let y = 0; y < 58; y++) for (let x = 0; x < W; x++) {
    const ridge = 46 + Math.sin(x * 0.06) * 6 + (rnd() - 0.5) * 3;
    if (y < ridge) px(img, x, y, shade([70, 78, 92], 1 - y / 90));
  }
  for (let x = 0; x < W; x += 3) px(img, x, Math.round(46 + Math.sin(x * 0.06) * 6), C.snowL); // snow lip
  const fcx = 240;
  for (const [dx, w, tint] of [[-26, 9, C.waterD], [-10, 12, C.water], [6, 10, C.waterL], [22, 8, C.water]]) {
    for (let y = 18; y <= 78; y++) {
      for (let i = 0; i < w; i++) {
        const wobble = Math.sin(y * 0.22 + dx) * 1.6;
        px(img, fcx + dx + i + wobble, y, shade(tint, 0.9 + (i / w) * 0.25));
      }
    }
    px(img, fcx + dx + 1, 24, C.snowL); px(img, fcx + dx + 2, 44, C.snowL); // glassy highlights
  }
  disc(img, fcx, 84, 26, C.waterD); disc(img, fcx - 3, 82, 22, C.water); disc(img, fcx - 6, 80, 12, C.waterL);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; px(img, fcx + Math.round(Math.cos(a) * 24), 84 + Math.round(Math.sin(a) * 12), C.snowL); } // frozen rim

  // Pine stands matching the two collision solids (clusters inside 40x47 native boxes).
  const pineAt = (cx, cy) => {
    disc(img, cx, cy - 6, 6, C.pineD); disc(img, cx, cy - 9, 5, C.pine); disc(img, cx, cy - 12, 4, C.pine);
    rect(img, cx - 1, cy - 1, 2, 5, C.trunk);
    disc(img, cx, cy - 13, 2, C.snowL);
  };
  for (const [cx, cy] of [[90, 140], [104, 150], [112, 130], [96, 122]]) pineAt(cx, cy);       // pines-west (100,133)
  for (const [cx, cy] of [[357, 108], [371, 116], [379, 96], [363, 88]]) pineAt(cx, cy);       // pines-east (367,100)

  // Boulder — snow-capped dark rock at (167,233), ~33x27.
  disc(img, 167, 236, 15, C.stoneD); disc(img, 164, 232, 13, C.stone);
  disc(img, 163, 227, 9, C.snowL); px(img, 172, 230, C.snowL);

  // Old signpost at (367,253): post + two arrow boards.
  rect(img, 366, 240, 3, 22, C.trunk);
  rect(img, 356, 242, 18, 5, shade(C.trunk, 1.3)); px(img, 374, 244, shade(C.trunk, 0.7));   // upper board (points E)
  rect(img, 361, 250, 16, 5, shade(C.trunk, 1.15)); px(img, 360, 252, shade(C.trunk, 0.7));  // lower board (points W)
  disc(img, 367, 239, 2, C.snowL); // snow cap

  // Exposed rocks + snow tufts scattered off-path.
  for (const [rx, ry] of [[64, 220], [312, 190], [420, 150], [140, 90], [300, 280]]) {
    disc(img, rx, ry, 3, C.stoneD); px(img, rx - 1, ry - 2, C.stone);
  }

  return save('room-trail.png', img);
}

/* ----------------------------- Pickup glint (H4) ------------------------ */
// 12x12 walk-over coin token: warm gold dot + 4-point sparkle cross, dark outline.
function buildPickupGlint() {
  const img = Img(12, 12);
  const gold = [244, 196, 72], goldD = [196, 142, 38], goldL = [255, 236, 168];
  disc(img, 6, 6, 4, goldD);            // outline ring reads as the dark edge
  disc(img, 6, 6, 3, gold);
  px(img, 5, 5, goldL); px(img, 6, 5, goldL);
  // sparkle cross
  px(img, 6, 0, goldL); px(img, 6, 1, gold);
  px(img, 6, 11, goldL); px(img, 6, 10, gold);
  px(img, 0, 6, goldL); px(img, 1, 6, gold);
  px(img, 11, 6, goldL); px(img, 10, 6, gold);
  return save('pickup-glint.png', img);
}

/* ----------------------------- run -------------------------------------- */
const made = [
  buildPenguinBody(),
  buildPenguinBelly(),
  buildRoomPlaza(),
  ...ITEM_CATALOG.map(buildCosmetic),
  buildSnowpal(),
  buildSnowball(),
  buildMinigameBg(),
  buildRoomDen(),
  buildMapIsle(),
  ...buildFurniture(),
  ...buildDenSigns(),
  buildRoomTrail(),
  buildPickupGlint(),
];
// The single-sheet S1 penguin.png is superseded by the layered body/belly sheets.
try { fs.rmSync(path.join(OUT, 'penguin.png')); } catch { /* already gone */ }
console.log('Generated:\n  ' + made.join('\n  '));
