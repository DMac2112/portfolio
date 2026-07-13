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
];
// The single-sheet S1 penguin.png is superseded by the layered body/belly sheets.
try { fs.rmSync(path.join(OUT, 'penguin.png')); } catch { /* already gone */ }
console.log('Generated:\n  ' + made.join('\n  '));
