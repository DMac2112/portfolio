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
fs.mkdirSync(path.join(OUT, 'characters'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'portraits'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'vistas'), { recursive: true });

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
function halfMoonFrame(img, cx, cy, rx, ry, c, thickness = 1) {
  rect(img, cx - rx, cy, rx * 2 + 1, thickness, c);
  const steps = Math.max(16, rx * 6);
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * Math.PI;
    const x = Math.round(cx + Math.cos(angle) * rx);
    const y = Math.round(cy + Math.sin(angle) * ry);
    for (let t = 0; t < thickness; t++) px(img, x, y + t, c);
  }
}
function save(name, img) { fs.writeFileSync(path.join(OUT, name), encodePNG(img)); return `${name} ${img.w}x${img.h}`; }

// seeded PRNG (project LCG, independent seed from game1's 1337 — see engine/rng.js)
let SEED = 2600;
function rnd() { SEED = (SEED * 1664525 + 1013904223) >>> 0; return (SEED >>> 16) / 0xffff; }

/* ----------------------------- palette --------------------------------- */
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const ARCTIC_DUSK = Object.freeze({
  ink: hex('#122a42'), inkDeep: hex('#091827'), night: hex('#0d2238'), nightL: hex('#193d59'),
  snow: hex('#dcecff'), snowD: hex('#b9d2e7'), snowL: hex('#f7fbff'), frost: hex('#8eacc6'),
  ice: hex('#7fd6ff'), iceD: hex('#3b8fb8'), iceL: hex('#c8f4ff'), water: hex('#4fa9d2'),
  pine: hex('#245c62'), pineD: hex('#173c49'), wood: hex('#76513d'), woodL: hex('#a97550'),
  stone: hex('#60758b'), stoneL: hex('#8ca1b5'), amber: hex('#ffba5c'), amberL: hex('#ffe2a1'),
  ember: hex('#ff784f'), aurora: hex('#72e2bd'), violet: hex('#a78bfa'), mist: hex('#eaf7ff'),
  belly: hex('#f7fbff'), beak: hex('#ffad4a'), beakD: hex('#d8792e'),
});
const C = {
  out: ARCTIC_DUSK.inkDeep,
  snow: ARCTIC_DUSK.snow, snowD: ARCTIC_DUSK.snowD, snowL: ARCTIC_DUSK.snowL,
  water: ARCTIC_DUSK.water, waterD: ARCTIC_DUSK.iceD, waterL: ARCTIC_DUSK.iceL,
  stone: ARCTIC_DUSK.stoneL, stoneD: ARCTIC_DUSK.stone,
  pine: ARCTIC_DUSK.pine, pineD: ARCTIC_DUSK.pineD, trunk: ARCTIC_DUSK.wood,
  belly: ARCTIC_DUSK.belly, beak: ARCTIC_DUSK.beak, beakD: ARCTIC_DUSK.beakD,
};
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
const mono = (c) => { const v = Math.round((c[0] + c[1] + c[2]) / 3); return [v, v, v]; };
const G = {
  hi: mono(ARCTIC_DUSK.snowL), mid: mono(ARCTIC_DUSK.frost),
  lo: mono(ARCTIC_DUSK.stone), out: mono(ARCTIC_DUSK.inkDeep),
};
// untinted detail palette
const D = {
  belly: ARCTIC_DUSK.belly, bellyD: ARCTIC_DUSK.snowD,
  eye: ARCTIC_DUSK.inkDeep, eyeHi: ARCTIC_DUSK.snowL,
  beak: ARCTIC_DUSK.beak, beakD: ARCTIC_DUSK.beakD,
  foot: ARCTIC_DUSK.beak, footD: ARCTIC_DUSK.beakD,
};

function eggBody(p) {
  const rows = [[6, 9], [5, 10], [4, 11], [4, 11], [3, 12], [3, 12], [3, 12], [3, 12], [4, 11], [4, 11], [5, 10], [6, 9]];
  for (let i = 0; i < rows.length; i++) {
    const y = i + 2, [xL, xR] = rows[i];
    for (let x = xL; x <= xR; x++) p(x, y, G.mid);
    p(xL, y, G.out); p(xR, y, G.out);
    if (xR - xL > 3) { p(xL + 1, y, G.lo); p(xR - 1, y, G.hi); }
  }
}
function bellyPatch(p) {
  const rows = [[6, 9], [5, 10], [5, 10], [5, 10], [6, 9], [7, 8]];
  for (let i = 0; i < rows.length; i++) {
    const y = i + 8, [xL, xR] = rows[i];
    for (let x = xL; x <= xR; x++) p(x, y, x === xL ? D.bellyD : D.belly);
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
    cell(f, 0, (p) => {
      bellyPatch(p);
      for (const x of [5, 9]) { p(x, 4, D.eyeHi); p(x + 1, 4, D.eye); p(x, 5, D.eye); p(x + 1, 5, D.eye); }
      p(7, 6, D.beak); p(8, 6, D.beak); p(7, 7, D.beakD); p(8, 7, D.beakD);
      footD(p, 6, 14 + la); footD(p, 9, 14 + lb);
    });
    // side: belly + one eye + side beak + orange feet
    cell(f, 1, (p) => {
      bellyPatch(p); p(10, 4, D.eyeHi); p(11, 4, D.eye); p(10, 5, D.eye); p(11, 5, D.eye);
      p(11, 6, D.beak); p(12, 6, D.beak); p(11, 7, D.beakD);
      footD(p, 7 + la, 14); footD(p, 9 + lb, 14);
    });
    // up: back of head — no belly/eyes/beak, just orange feet
    cell(f, 2, (p) => { footD(p, 6, 14 + la); footD(p, 9, 14 + lb); });
  }
  return save('penguin-belly.png', img);
}

/* ----------------------------- ANCHOR: Edda Quill (W1) ---------------- */
// One-off front-facing sprite: emperor markings, half-moon spectacles, plum cardigan, notebook.
// Deliberately not assembled from the roaming-NPC layers; anchors keep distinct silhouettes.
function buildEddaSprite() {
  const img = Img(24, 32), A = ARCTIC_DUSK;
  oval(img, 12, 29, 9, 2, [A.inkDeep[0], A.inkDeep[1], A.inkDeep[2], 70]);
  oval(img, 12, 18, 10, 13, A.inkDeep);
  oval(img, 12, 12, 9, 10, A.ink);
  oval(img, 12, 15, 6, 8, A.snowL);
  oval(img, 12, 23, 7, 7, A.violet);
  rect(img, 6, 20, 12, 2, shade(A.violet, 0.72));
  rect(img, 11, 21, 2, 8, A.inkDeep);
  // Emperor-penguin amber ear patches and beak.
  oval(img, 5, 11, 2, 4, A.amber); oval(img, 19, 11, 2, 4, A.amber);
  rect(img, 10, 14, 5, 2, A.beak); rect(img, 11, 16, 3, 1, A.beakD);
  // Half-moon spectacles, joined by a short bridge.
  halfMoonFrame(img, 8, 10, 4, 3, A.amberL); halfMoonFrame(img, 16, 10, 4, 3, A.amberL);
  rect(img, 11, 10, 3, 1, A.amberL);
  px(img, 8, 11, A.inkDeep); px(img, 16, 11, A.inkDeep);
  // Notebook and ink-smudged flipper.
  rrect(img, 17, 20, 6, 8, A.wood); rect(img, 18, 21, 4, 6, A.amberL);
  rect(img, 19, 22, 2, 1, A.ink); rect(img, 19, 24, 3, 1, A.ink);
  disc(img, 17, 20, 2, A.ink); px(img, 18, 18, A.violet);
  rect(img, 6, 28, 4, 2, A.beak); rect(img, 14, 28, 4, 2, A.beak);
  return save(path.join('characters', 'edda-quill.png'), img);
}

// 128px framed-dialogue portrait. This code-drawn fallback ships because the configured painted-
// master generator exhausted its credits; Graphics/Frostbyte/prompts.md preserves the swap prompt.
function buildEddaPortrait() {
  const W = 128, H = 128, img = Img(W, H), A = ARCTIC_DUSK;
  let noise = 0x0edda123;
  const nextNoise = () => { noise = (noise * 1664525 + 1013904223) >>> 0; return noise / 0xffffffff; };

  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = y / (H - 1);
    const base = [
      A.nightL[0] * (1 - t) + A.night[0] * t,
      A.nightL[1] * (1 - t) + A.night[1] * t,
      A.nightL[2] * (1 - t) + A.night[2] * t,
    ];
    const grain = (nextNoise() - 0.5) * 12;
    px(img, x, y, base.map((channel) => Math.max(0, Math.min(255, channel + grain))));
  }
  // Abstract newsroom papers and amber desk light behind the bust.
  rrect(img, 8, 13, 28, 20, shade(A.snowD, 0.88));
  rect(img, 12, 18, 18, 2, A.frost); rect(img, 12, 24, 13, 2, A.frost);
  rrect(img, 94, 19, 25, 28, shade(A.snowD, 0.82));
  rect(img, 99, 25, 14, 2, A.frost); rect(img, 99, 31, 17, 2, A.frost);
  for (let r = 34; r > 2; r -= 3) disc(img, 102, 73, r, [...A.amber, Math.max(3, 28 - r / 2)]);

  // Warm rim, body, head, white bib and emperor patches.
  oval(img, 64, 112, 48, 46, A.amber);
  oval(img, 64, 113, 45, 45, A.inkDeep);
  oval(img, 64, 61, 42, 43, A.amber);
  oval(img, 64, 62, 39, 41, A.ink);
  oval(img, 64, 67, 28, 31, A.snowL);
  oval(img, 32, 58, 8, 20, A.amber); oval(img, 96, 58, 8, 20, A.amber);
  oval(img, 64, 111, 33, 29, A.violet);
  rect(img, 34, 93, 60, 8, shade(A.violet, 0.72));
  rect(img, 61, 97, 6, 31, A.inkDeep);

  // Face and distinctive half-moon spectacles.
  halfMoonFrame(img, 49, 54, 15, 12, A.amberL, 2);
  halfMoonFrame(img, 79, 54, 15, 12, A.amberL, 2);
  rect(img, 62, 54, 5, 3, A.amberL);
  disc(img, 50, 59, 3, A.inkDeep); disc(img, 78, 59, 3, A.inkDeep);
  px(img, 49, 58, A.snowL); px(img, 77, 58, A.snowL);
  oval(img, 64, 72, 9, 6, A.beak); rect(img, 58, 73, 13, 3, A.beakD);

  // Reporter notebook at frame edge and the small ink mark called out in the prompt.
  rrect(img, 87, 91, 34, 35, A.wood); rect(img, 92, 96, 24, 25, A.amberL);
  rect(img, 97, 101, 14, 2, A.wood); rect(img, 97, 108, 18, 2, A.wood);
  rect(img, 97, 115, 11, 2, A.wood); disc(img, 86, 96, 8, A.ink);
  disc(img, 89, 91, 2, A.violet); disc(img, 84, 99, 2, A.violet);

  // Sparse painterly flecks unify the large flat forms without muddying facial readability.
  for (let i = 0; i < 90; i++) {
    const x = 18 + Math.floor(nextNoise() * 92), y = 36 + Math.floor(nextNoise() * 84);
    const color = nextNoise() > 0.5 ? [...A.snowL, 28] : [...A.amberL, 24];
    px(img, x, y, color);
  }
  return save(path.join('portraits', 'edda-quill.png'), img);
}

/* ----------------------------- ANCHOR: Pat Hocket (W2) ---------------- */
// Stocky puffin silhouette: broad striped beak, pushed-up goggles, ember apron, tool belt.
function buildPatSprite() {
  const img = Img(24, 32), A = ARCTIC_DUSK;
  oval(img, 12, 29, 10, 2, [A.inkDeep[0], A.inkDeep[1], A.inkDeep[2], 70]);
  oval(img, 11, 20, 10, 12, A.inkDeep);
  oval(img, 11, 11, 9, 9, A.ink);
  oval(img, 8, 12, 5, 6, A.snowL); oval(img, 14, 12, 5, 6, A.snowL);
  // Puffin beak projects farther than any penguin anchor silhouette.
  rect(img, 11, 12, 11, 2, A.amberL); rect(img, 10, 14, 12, 3, A.beak);
  rect(img, 12, 17, 8, 2, A.ember); rect(img, 15, 14, 2, 5, A.beakD);
  disc(img, 7, 10, 2, A.inkDeep); disc(img, 15, 10, 2, A.inkDeep);
  px(img, 7, 9, A.snowL); px(img, 15, 9, A.snowL);
  // Goggles rest above the eyes, joined by a leather strap.
  ovalRing(img, 7, 6, 4, 3, A.ice, 80); ovalRing(img, 15, 6, 4, 3, A.ice, 80);
  rect(img, 10, 6, 3, 1, A.woodL); rect(img, 3, 5, 2, 1, A.woodL); rect(img, 18, 5, 2, 1, A.woodL);
  // Apron and a lopsided belt of tiny tools.
  rrect(img, 6, 20, 11, 9, A.amber); rect(img, 8, 19, 7, 2, A.woodL);
  rect(img, 5, 24, 14, 2, A.wood); rect(img, 7, 23, 2, 4, A.ice); rect(img, 15, 23, 2, 5, A.ember);
  rect(img, 5, 28, 5, 2, A.beak); rect(img, 13, 28, 5, 2, A.beak);
  return save(path.join('characters', 'pat-hocket.png'), img);
}

// Repo-native framed portrait; Graphics/Frostbyte/prompts.md preserves the future painted swap.
function buildPatPortrait() {
  const W = 128, H = 128, img = Img(W, H), A = ARCTIC_DUSK;
  let noise = 0x0a7c0c37;
  const nextNoise = () => { noise = (noise * 1664525 + 1013904223) >>> 0; return noise / 0xffffffff; };

  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = y / (H - 1);
    const base = [
      A.nightL[0] * (1 - t) + A.inkDeep[0] * t,
      A.nightL[1] * (1 - t) + A.inkDeep[1] * t,
      A.nightL[2] * (1 - t) + A.inkDeep[2] * t,
    ];
    const grain = (nextNoise() - 0.5) * 12;
    px(img, x, y, base.map((channel) => Math.max(0, Math.min(255, channel + grain))));
  }

  // Workshop pipes, pegboard, and forge glow frame the bust without readable markings.
  rect(img, 7, 13, 7, 80, A.wood); rect(img, 14, 17, 21, 6, A.woodL);
  rect(img, 17, 28, 17, 44, shade(A.wood, 0.82));
  for (const [x, y] of [[21, 34], [29, 34], [21, 45], [29, 45], [21, 56], [29, 56]]) disc(img, x, y, 2, A.amber);
  rect(img, 101, 8, 9, 65, A.stone); rect(img, 106, 12, 15, 8, A.stoneL);
  for (let r = 38; r >= 3; r -= 4) disc(img, 105, 93, r, [...A.ember, Math.max(3, 33 - r / 2)]);

  // Warm rim, stocky puffin body, white cheek disks, and the oversized striped beak.
  oval(img, 61, 114, 47, 43, A.amber);
  oval(img, 60, 115, 44, 43, A.inkDeep);
  oval(img, 58, 64, 39, 40, A.ink);
  oval(img, 45, 66, 25, 29, A.snowL); oval(img, 69, 66, 24, 29, A.snowL);
  oval(img, 59, 112, 32, 28, A.amber); rect(img, 29, 96, 60, 8, A.wood);
  rect(img, 57, 99, 5, 29, A.woodL);

  // Beak planes read as a puffin at thumbnail size.
  oval(img, 79, 71, 32, 15, A.beak);
  rect(img, 61, 70, 48, 5, A.amberL); rect(img, 68, 76, 34, 7, A.ember);
  rect(img, 83, 58, 5, 27, A.beakD); oval(img, 108, 72, 7, 6, A.beakD);
  disc(img, 43, 58, 4, A.inkDeep); disc(img, 70, 57, 4, A.inkDeep);
  px(img, 42, 57, A.snowL); px(img, 69, 56, A.snowL);

  // Goggles pushed up, plus a spanner and two belt tools.
  ovalRing(img, 42, 43, 15, 10, A.ice, 120); ovalRing(img, 70, 42, 15, 10, A.ice, 120);
  rect(img, 55, 42, 4, 3, A.woodL); rect(img, 26, 40, 4, 3, A.woodL); rect(img, 84, 39, 5, 3, A.woodL);
  rect(img, 36, 102, 6, 24, A.ice); rect(img, 76, 101, 6, 27, A.ember);
  rect(img, 104, 91, 5, 30, A.stoneL); ovalRing(img, 106, 88, 8, 8, A.stoneL, 90);
  disc(img, 102, 116, 7, A.ink);

  for (let i = 0; i < 90; i++) {
    const x = 15 + Math.floor(nextNoise() * 100), y = 25 + Math.floor(nextNoise() * 98);
    px(img, x, y, nextNoise() > 0.5 ? [...A.amberL, 26] : [...A.iceL, 23]);
  }
  return save(path.join('portraits', 'pat-hocket.png'), img);
}

/* ----------------------------- ANCHOR: Captain Salka (W3) ------------- */
// Chinstrap markings, weathered oilskin, short captain's cap, and a coil of mooring line.
function buildSalkaSprite() {
  const img = Img(24, 32), A = ARCTIC_DUSK;
  oval(img, 12, 29, 10, 2, [A.inkDeep[0], A.inkDeep[1], A.inkDeep[2], 70]);
  oval(img, 12, 20, 10, 12, A.inkDeep); oval(img, 12, 11, 9, 10, A.ink);
  oval(img, 12, 12, 7, 7, A.snowL); oval(img, 12, 19, 6, 8, A.snowL);
  // The crisp chinstrap and square cap make Salka distinct at room scale.
  rect(img, 5, 14, 3, 2, A.inkDeep); rect(img, 16, 14, 3, 2, A.inkDeep);
  rect(img, 7, 16, 10, 2, A.inkDeep); rect(img, 10, 13, 5, 2, A.beak);
  disc(img, 9, 10, 1, A.inkDeep); disc(img, 15, 10, 1, A.inkDeep);
  rect(img, 5, 3, 14, 4, A.wood); rect(img, 7, 1, 10, 4, A.ink);
  rect(img, 15, 5, 6, 2, A.woodL); px(img, 12, 3, A.amberL);
  // Short oilskin coat with brass toggles and a rope coil at one flipper.
  rrect(img, 5, 19, 14, 10, A.wood); rect(img, 7, 20, 4, 8, A.woodL);
  rect(img, 12, 20, 2, 9, A.inkDeep); disc(img, 14, 22, 1, A.amberL); disc(img, 14, 26, 1, A.amberL);
  ovalRing(img, 20, 23, 4, 5, A.amber, 210); rect(img, 5, 28, 5, 2, A.beak); rect(img, 14, 28, 5, 2, A.beak);
  return save(path.join('characters', 'captain-salka.png'), img);
}

function buildSalkaPortrait() {
  const W = 128, H = 128, img = Img(W, H), A = ARCTIC_DUSK;
  let noise = 0x5a1ca731;
  const nextNoise = () => { noise = (noise * 1664525 + 1013904223) >>> 0; return noise / 0xffffffff; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = y / (H - 1);
    const base = [
      A.nightL[0] * (1 - t) + A.inkDeep[0] * t,
      A.nightL[1] * (1 - t) + A.inkDeep[1] * t,
      A.nightL[2] * (1 - t) + A.inkDeep[2] * t,
    ];
    const grain = (nextNoise() - 0.5) * 11;
    px(img, x, y, base.map((channel) => Math.max(0, Math.min(255, channel + grain))));
  }
  // Harbor pilings, rigging, and an amber ship lamp behind the bust.
  for (const x of [10, 24, 105, 117]) rect(img, x, 13, 6, 99, A.wood);
  for (let i = 0; i < 72; i++) {
    const x = 4 + i * 2, y = 89 + Math.round(Math.sin(i * 0.42) * 4);
    px(img, x, y, [...A.ice, 110]); px(img, x, y + 1, [...A.iceD, 95]);
  }
  for (let r = 31; r > 2; r -= 3) disc(img, 105, 42, r, [...A.amber, Math.max(3, 26 - r / 2)]);
  rect(img, 101, 34, 9, 15, A.inkDeep); rect(img, 103, 36, 5, 10, A.amberL);

  // Oilskin shoulders, chinstrap face, and hard-edged captain's cap.
  oval(img, 64, 114, 48, 43, A.amber); oval(img, 64, 115, 45, 43, A.inkDeep);
  oval(img, 64, 112, 37, 31, A.wood); rect(img, 31, 93, 66, 9, A.woodL);
  rect(img, 60, 95, 8, 33, A.inkDeep); disc(img, 72, 105, 3, A.amberL); disc(img, 72, 116, 3, A.amberL);
  oval(img, 64, 62, 39, 41, A.ink); oval(img, 64, 67, 29, 31, A.snowL);
  disc(img, 50, 58, 4, A.inkDeep); disc(img, 78, 58, 4, A.inkDeep);
  px(img, 49, 57, A.snowL); px(img, 77, 57, A.snowL);
  oval(img, 64, 72, 9, 6, A.beak); rect(img, 58, 74, 13, 3, A.beakD);
  rect(img, 34, 75, 10, 5, A.inkDeep); rect(img, 84, 75, 10, 5, A.inkDeep);
  rect(img, 42, 79, 44, 5, A.inkDeep);
  rect(img, 30, 27, 69, 14, A.wood); rrect(img, 39, 17, 51, 18, A.ink);
  rect(img, 86, 36, 22, 5, A.woodL); disc(img, 64, 27, 4, A.amberL);
  ovalRing(img, 103, 106, 15, 17, A.amber, 190); ovalRing(img, 103, 106, 10, 12, A.woodL, 170);
  for (let i = 0; i < 80; i++) {
    const x = 16 + Math.floor(nextNoise() * 98), y = 22 + Math.floor(nextNoise() * 102);
    px(img, x, y, nextNoise() > 0.55 ? [...A.iceL, 24] : [...A.amberL, 22]);
  }
  return save(path.join('portraits', 'captain-salka.png'), img);
}

/* ----------------------------- ANCHOR: Old Maren (W4) ---------------- */
// Elder gentoo keeper: white head-band, salt-grey vest, brass key, and a weathered field log.
function buildMarenSprite() {
  const img = Img(24, 32), A = ARCTIC_DUSK;
  oval(img, 12, 29, 10, 2, [A.inkDeep[0], A.inkDeep[1], A.inkDeep[2], 70]);
  oval(img, 12, 20, 10, 12, A.inkDeep); oval(img, 12, 11, 9, 10, A.ink);
  oval(img, 12, 13, 7, 8, A.snowL); oval(img, 12, 20, 6, 8, A.snowL);
  // Gentoo brow-band and one pale, weathered eye.
  rect(img, 5, 6, 4, 3, A.snowL); rect(img, 8, 5, 9, 2, A.snowL); rect(img, 16, 6, 3, 3, A.snowL);
  disc(img, 9, 11, 1, A.inkDeep); disc(img, 15, 11, 1, A.iceD); px(img, 15, 10, A.iceL);
  rect(img, 10, 14, 5, 2, A.beak); rect(img, 11, 16, 3, 1, A.beakD);
  // Keeper's knit vest, lantern key, and the log tucked beneath one flipper.
  rrect(img, 5, 19, 14, 10, A.stone); rect(img, 7, 20, 3, 8, A.stoneL);
  rect(img, 11, 19, 2, 10, A.inkDeep); disc(img, 14, 22, 1, A.amberL);
  rect(img, 18, 20, 5, 8, A.wood); rect(img, 19, 21, 3, 6, A.amberL);
  ovalRing(img, 4, 24, 3, 4, A.amber, 90); rect(img, 3, 17, 2, 6, A.amber);
  rect(img, 5, 28, 5, 2, A.beak); rect(img, 14, 28, 5, 2, A.beak);
  return save(path.join('characters', 'old-maren.png'), img);
}

function buildMarenPortrait() {
  const W = 128, H = 128, img = Img(W, H), A = ARCTIC_DUSK;
  let noise = 0x0a1d4a2e;
  const nextNoise = () => { noise = (noise * 1664525 + 1013904223) >>> 0; return noise / 0xffffffff; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = y / (H - 1);
    const base = [
      A.nightL[0] * (1 - t) + A.inkDeep[0] * t,
      A.nightL[1] * (1 - t) + A.inkDeep[1] * t,
      A.nightL[2] * (1 - t) + A.inkDeep[2] * t,
    ];
    const grain = (nextNoise() - 0.5) * 12;
    px(img, x, y, base.map((channel) => Math.max(0, Math.min(255, channel + grain))));
  }
  // Curving lighthouse masonry, logbook shelves, and a warm lamp halo behind the bust.
  for (let r = 46; r > 2; r -= 4) disc(img, 105, 32, r, [...A.amber, Math.max(3, 29 - r / 2)]);
  rect(img, 101, 21, 9, 24, A.inkDeep); rect(img, 103, 23, 5, 18, A.amberL);
  for (const x of [8, 19, 112]) rect(img, x, 13, 6, 103, A.stone);
  rect(img, 9, 26, 23, 5, A.wood); rect(img, 10, 31, 21, 28, A.woodL);
  for (const [x, c] of [[13, A.violet], [19, A.iceD], [25, A.amber]]) rect(img, x, 35, 4, 20, c);

  // Salt-grey shoulders, gentoo head, brow-band, and the one pale sea-worn eye.
  oval(img, 63, 115, 48, 43, A.amber); oval(img, 63, 116, 45, 43, A.inkDeep);
  oval(img, 63, 113, 37, 32, A.stone); rect(img, 31, 94, 64, 8, A.stoneL);
  rect(img, 60, 96, 7, 32, A.inkDeep); disc(img, 72, 107, 3, A.amberL);
  oval(img, 63, 62, 39, 41, A.ink); oval(img, 63, 68, 29, 31, A.snowL);
  rect(img, 30, 38, 18, 10, A.snowL); rect(img, 43, 32, 43, 8, A.snowL); rect(img, 80, 37, 17, 10, A.snowL);
  disc(img, 49, 59, 4, A.inkDeep); disc(img, 77, 59, 4, A.iceD);
  px(img, 48, 58, A.snowL); px(img, 76, 57, A.iceL);
  oval(img, 63, 73, 9, 6, A.beak); rect(img, 57, 75, 13, 3, A.beakD);

  // Field log at frame edge and a long brass lamp key.
  rrect(img, 89, 91, 32, 35, A.wood); rect(img, 94, 96, 22, 25, A.amberL);
  rect(img, 98, 102, 13, 2, A.wood); rect(img, 98, 109, 17, 2, A.wood);
  ovalRing(img, 27, 102, 10, 12, A.amber, 150); rect(img, 25, 72, 4, 31, A.amber);
  for (let i = 0; i < 90; i++) {
    const x = 15 + Math.floor(nextNoise() * 101), y = 22 + Math.floor(nextNoise() * 103);
    px(img, x, y, nextNoise() > 0.52 ? [...A.iceL, 25] : [...A.amberL, 22]);
  }
  return save(path.join('portraits', 'old-maren.png'), img);
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
  const A = ARCTIC_DUSK;

  // Blue-hour snow: quiet texture in the middle, deeper blue at the perimeter.
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const edge = Math.min(1, Math.hypot((x - W / 2) / (W / 2), (y - H / 2) / (H / 2)));
    let col = shade(A.snow, 1.02 - edge * 0.1); const n = rnd();
    if (n > 0.965) col = shade(A.snowD, 0.96 + edge * 0.03);
    else if (n > 0.91) col = A.snowL;
    px(img, x, y, col);
  }

  const stroke = (points, radius, color) => {
    for (let i = 0; i < points.length - 1; i++) {
      const [x0, y0] = points[i], [x1, y1] = points[i + 1];
      const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let s = 0; s <= steps; s++) {
        const t = steps ? s / steps : 0;
        disc(img, Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), radius, color);
      }
    }
  };

  // Four packed paths meet at the social square while preserving authored door coordinates.
  const paths = [
    [[240, -6], [240, 50], [225, 108], [228, 158]],
    [[240, 326], [240, 273], [220, 222], [228, 158]],
    [[-6, 120], [68, 126], [136, 146], [228, 158]],
    [[486, 152], [406, 154], [332, 148], [228, 158]],
  ];
  for (const pathPts of paths) { stroke(pathPts, 15, [...A.frost, 125]); stroke(pathPts, 11, [...A.snowL, 178]); }
  oval(img, 228, 158, 63, 45, [...A.frost, 95]);
  oval(img, 228, 156, 58, 40, [...A.snowL, 150]);
  for (let i = 0; i < 34; i++) {
    const a = (i / 34) * Math.PI * 2;
    px(img, 228 + Math.round(Math.cos(a) * 53), 156 + Math.round(Math.sin(a) * 36), A.iceL);
  }

  const glow = (cx, cy, r = 12) => {
    for (let rr = r; rr >= 3; rr -= 3) disc(img, cx, cy, rr, [...A.amber, Math.round(16 + (r - rr) * 2.5)]);
  };
  const lampAt = (cx, cy) => {
    glow(cx, cy - 9, 14); rect(img, cx - 1, cy - 8, 3, 15, A.ink);
    rect(img, cx - 4, cy - 12, 9, 7, A.inkDeep); rect(img, cx - 3, cy - 11, 7, 5, A.amberL);
    px(img, cx - 2, cy - 10, A.snowL); rect(img, cx - 4, cy + 6, 9, 2, A.inkDeep);
  };
  for (const p of [[184, 114], [318, 129], [169, 202], [303, 211]]) lampAt(...p);

  const pineAt = (cx, cy, s = 1) => {
    rect(img, cx - Math.max(1, Math.round(s)), cy - 3, Math.max(2, Math.round(s * 2)), 7, A.wood);
    for (const [oy, r, c] of [[-5, 8, A.pineD], [-10, 7, A.pine], [-15, 5, A.pine]]) disc(img, cx, cy + oy * s, r * s, c);
    disc(img, cx - 2 * s, cy - 17 * s, 3 * s, A.snowL);
    px(img, cx + Math.round(3 * s), cy - Math.round(10 * s), A.snowD);
  };
  for (const [cx, cy, s] of [[18, 30, 1.15], [42, 25, 0.9], [457, 28, 1.1], [435, 21, 0.82], [18, 306, 1.05], [42, 298, 0.82], [460, 307, 1.15], [435, 299, 0.86]]) pineAt(cx, cy, s);

  const benchAt = (cx, cy, flip = 1) => {
    oval(img, cx, cy + 5, 18, 4, [...A.inkDeep, 45]);
    rect(img, cx - 17, cy - 5, 34, 6, A.wood); rect(img, cx - 17, cy - 5, 34, 2, A.woodL);
    rect(img, cx - 14, cy + 1, 28, 4, shade(A.wood, 0.88));
    rect(img, cx - 13, cy + 5, 3, 5, A.ink); rect(img, cx + 10, cy + 5, 3, 5, A.ink);
    px(img, cx + flip * 13, cy - 4, A.snowL); px(img, cx + flip * 12, cy - 4, A.snowL);
  };
  benchAt(136, 88); benchAt(184, 232, -1);

  // North: open trail gate with a dark timber arch, lit signboard, and snow-heavy roof.
  rect(img, 198, 0, 84, 26, A.nightL); rect(img, 204, 0, 72, 6, A.ink);
  disc(img, 240, 16, 24, A.inkDeep); rrect(img, 227, 5, 26, 34, A.night);
  rect(img, 219, 1, 42, 7, A.wood); rect(img, 224, 2, 32, 4, A.amberL);
  for (let x = 197; x <= 283; x += 5) disc(img, x, 0, 5, A.snowL);
  glow(216, 19, 9); glow(264, 19, 9); disc(img, 216, 19, 3, A.amberL); disc(img, 264, 19, 3, A.amberL);

  // South: the player's welcoming igloo entrance, clipped naturally by the canvas edge.
  disc(img, 240, 325, 51, A.frost); disc(img, 240, 321, 47, A.snowL);
  for (let y = 283; y < 320; y += 8) for (let x = 198 + ((y / 8) % 2) * 5; x < 282; x += 12) rect(img, x, y, 10, 1, A.snowD);
  rrect(img, 226, 286, 28, 38, A.ink); rrect(img, 230, 290, 20, 32, A.nightL);
  glow(240, 302, 16); rect(img, 232, 282, 16, 5, A.wood); rect(img, 235, 283, 10, 2, A.amberL);

  // West/east locked destinations: distinct silhouettes under opaque wind-blown frost.
  rect(img, 0, 91, 43, 61, A.nightL); rect(img, 0, 97, 37, 49, A.wood);
  rrect(img, 0, 106, 28, 35, A.inkDeep); rect(img, 2, 109, 24, 28, A.ember);
  rect(img, 3, 112, 21, 23, shade(A.ember, 0.48)); rect(img, 0, 91, 43, 8, A.snowL);
  rect(img, 7, 102, 25, 5, A.woodL); px(img, 18, 103, A.amberL); px(img, 20, 103, A.amberL);
  for (const [x, y, r] of [[5, 111, 11], [17, 121, 14], [8, 137, 12]]) disc(img, x, y, r, [...A.mist, 205]);
  rect(img, 6, 115, 2, 23, A.iceL); rect(img, 20, 110, 2, 26, A.iceL);

  rect(img, 443, 119, 37, 67, A.iceD); disc(img, 463, 137, 31, A.frost);
  rrect(img, 451, 132, 29, 43, A.inkDeep); rect(img, 457, 139, 23, 31, A.night);
  rect(img, 444, 119, 36, 8, A.iceL); rect(img, 450, 125, 28, 5, A.violet);
  for (const [x, y, r] of [[474, 137, 13], [460, 151, 16], [476, 167, 14]]) disc(img, x, y, r, [...A.mist, 210]);
  rect(img, 459, 140, 2, 27, A.iceL); rect(img, 471, 136, 2, 33, A.iceL);

  // Shop awning, toss kiosk, chronicle board, snow piles, and an ice sculpture.
  rect(img, 13, 170, 42, 30, A.wood); rrect(img, 19, 177, 30, 23, A.nightL);
  for (let x = 12; x < 56; x += 8) rect(img, x, 166, 8, 8, (x / 8) % 2 ? A.ice : A.amber);
  rect(img, 18, 181, 32, 3, A.amberL); glow(34, 186, 11);

  disc(img, 376, 188, 24, A.frost); disc(img, 376, 185, 21, A.snowL);
  rrect(img, 365, 175, 22, 28, A.nightL); rect(img, 369, 178, 14, 11, A.iceD);
  disc(img, 376, 183, 5, A.snowL); px(img, 374, 182, A.ink); px(img, 378, 182, A.ink); px(img, 376, 184, A.beak);

  rect(img, 54, 249, 4, 29, A.wood); rect(img, 36, 250, 40, 24, A.wood);
  rect(img, 39, 253, 34, 18, A.amberL); rect(img, 42, 256, 28, 2, A.wood); rect(img, 42, 262, 22, 2, A.wood);
  disc(img, 56, 247, 5, A.snowL);

  for (const [x, y, rx, ry] of [[103, 285, 22, 8], [397, 274, 26, 9], [91, 47, 19, 7], [386, 64, 18, 7]]) {
    oval(img, x, y, rx, ry, A.snowD); oval(img, x - 3, y - 2, rx - 3, Math.max(2, ry - 2), A.snowL);
  }
  oval(img, 344, 264, 19, 5, [...A.inkDeep, 50]); disc(img, 344, 248, 12, A.iceD);
  disc(img, 350, 239, 7, A.ice); rect(img, 342, 248, 5, 18, A.ice); px(img, 353, 237, A.iceL); px(img, 355, 239, A.iceL);

  // Driftback's Fountain: exact authored center (792,264 world -> 264,88 native).
  const fx = 264, fy = 88;
  oval(img, fx, fy + 3, 40, 29, A.frost); oval(img, fx, fy, 37, 26, A.iceD);
  oval(img, fx - 2, fy - 2, 33, 22, A.water);
  for (const [x, y, w] of [[246, 78, 20], [266, 91, 18], [252, 99, 13]]) rect(img, x, y, w, 2, [...A.iceL, 175]);
  disc(img, fx, fy, 11, A.ink); disc(img, fx, fy - 1, 9, A.stoneL);
  glow(fx, fy - 10, 8); px(img, fx, fy - 14, A.iceL); px(img, fx - 1, fy - 12, A.iceL); px(img, fx + 1, fy - 11, A.iceL);

  // A restrained navy vignette frames the room without obscuring the walkable center.
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = Math.max(Math.abs(x - W / 2) / (W / 2), Math.abs(y - H / 2) / (H / 2));
    if (d > 0.78) px(img, x, y, [...A.inkDeep, Math.round((d - 0.78) * 190)]);
  }

  return save('room-plaza.png', img);
}

/* ----------------------------- ROOM: Your Den (igloo interior) --------- */
// Native 480x320, same technique/dims as buildRoomPlaza. Floor disc ~127r centered on the frame;
// the hearth solid sits at world (720,240,120,90) -> native (240,80,40,30) /scale(3), matching
// content/rooms.js `den.solids`, so the painted ember glow lines up with the real collision box.
const ICE = {
  floor: ARCTIC_DUSK.snowD, floorD: ARCTIC_DUSK.frost, floorL: ARCTIC_DUSK.snowL,
  wall: ARCTIC_DUSK.ice, wallD: ARCTIC_DUSK.iceD, wallEdge: ARCTIC_DUSK.ink,
  mat: ARCTIC_DUSK.woodL, matD: ARCTIC_DUSK.wood,
  stone: ARCTIC_DUSK.stoneL, stoneD: ARCTIC_DUSK.stone,
  ember: ARCTIC_DUSK.ember, emberL: ARCTIC_DUSK.amberL, emberD: ARCTIC_DUSK.beakD,
  aurora: ARCTIC_DUSK.aurora,
  crate: ARCTIC_DUSK.woodL, crateD: ARCTIC_DUSK.wood,
  void: ARCTIC_DUSK.inkDeep,
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
    if (n > 0.965) col = ICE.floorD; else if (n > 0.91) col = ICE.floorL;
    px(img, cx + x, cy + y, col);
  }

  // The hearth warms the ice underfoot; restrained alpha keeps furniture readable above it.
  for (let y = -rFloor; y <= rFloor; y++) for (let x = -rFloor; x <= rFloor; x++) {
    if (x * x + y * y > rFloor * rFloor) continue;
    const d = Math.hypot(x, y + 78);
    if (d < 118) px(img, cx + x, cy + y, [...ARCTIC_DUSK.amber, Math.round((1 - d / 118) * 78)]);
  }
  for (let yy = 66; yy <= 270; yy += 22) {
    const half = Math.sqrt(Math.max(0, rFloor * rFloor - (yy - cy) ** 2));
    for (let x = Math.ceil(cx - half + 8); x < cx + half - 8; x += 7) px(img, x, yy, [...ICE.floorL, 100]);
  }

  // Ice-block ring wall: angular blocks with alternating tint and top light.
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

  // One readable window replaces the placeholder-like slits: night, stars, and an aurora ribbon.
  const wx = 155, wy = 72;
  oval(img, wx, wy, 36, 24, ARCTIC_DUSK.iceL); oval(img, wx, wy, 32, 20, ARCTIC_DUSK.ink); oval(img, wx, wy, 28, 16, ARCTIC_DUSK.night);
  for (let x = -24; x <= 24; x++) {
    const y = Math.round(Math.sin(x * 0.12) * 3);
    px(img, wx + x, wy + y, [...ARCTIC_DUSK.aurora, 175]);
    px(img, wx + x, wy + y + 1, [...ARCTIC_DUSK.violet, 95]);
  }
  for (const [sx, sy] of [[-18, -9], [-7, 7], [6, -7], [18, 4], [23, -10]]) px(img, wx + sx, wy + sy, ARCTIC_DUSK.snowL);
  rect(img, wx, wy - 16, 2, 33, ICE.wallD); rect(img, wx - 28, wy, 57, 2, ICE.wallD);
  rect(img, wx - 33, wy + 20, 66, 5, ICE.wallD); rect(img, wx - 29, wy + 20, 58, 2, ICE.floorL);

  // A sparse string of amber bulbs ties the cool shell to the hearth.
  for (const deg of [205, 225, 245, 285, 305, 325]) {
    const a = (deg * Math.PI) / 180, lx = Math.round(cx + Math.cos(a) * 118), ly = Math.round(cy + Math.sin(a) * 118);
    disc(img, lx, ly, 4, [...ARCTIC_DUSK.amber, 65]); disc(img, lx, ly, 2, ARCTIC_DUSK.amberL);
  }

  // Hearth matches the world (720,240,120,90) solid at native (240,80,40,30).
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
// Every unlocked destination gets a painted glyph and route beneath its DOM pin.
const ISLE = {
  sea: ARCTIC_DUSK.night, seaD: ARCTIC_DUSK.inkDeep, seaL: ARCTIC_DUSK.nightL,
  land: ARCTIC_DUSK.snowD, landD: ARCTIC_DUSK.frost, landL: ARCTIC_DUSK.snowL,
  coast: ARCTIC_DUSK.iceD,
  plaza: ARCTIC_DUSK.stoneL, plazaD: ARCTIC_DUSK.stone, fountain: ARCTIC_DUSK.ice,
  dome: ARCTIC_DUSK.snowL, domeSh: ARCTIC_DUSK.frost, domeDoor: ARCTIC_DUSK.wood,
  roof: ARCTIC_DUSK.amber, roofD: ARCTIC_DUSK.wood,
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
  // Aurora strokes and sparse stars make the surrounding sea feel like a night chart.
  for (let x = 22; x < W - 22; x++) {
    const y = 20 + Math.round(Math.sin(x * 0.028) * 5);
    px(img, x, y, [...ARCTIC_DUSK.aurora, 90]); px(img, x, y + 1, [...ARCTIC_DUSK.violet, 52]);
  }
  for (const [x, y] of [[25, 35], [55, 279], [107, 28], [392, 284], [445, 38], [421, 248], [74, 72]]) px(img, x, y, ARCTIC_DUSK.iceL);

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

  // Dotted snow routes connect the available destinations without duplicating DOM labels.
  const route = (x0, y0, x1, y1) => {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let s = 0; s <= steps; s += 8) {
      const t = s / steps;
      disc(img, Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), 2, [...ARCTIC_DUSK.iceD, 150]);
    }
  };
  route(221, 128, 298, 237); route(221, 128, 182, 38); route(221, 128, 384, 122);
  route(221, 128, 67, 147);
  route(384, 122, 302, 58);
  route(302, 58, 355, 26);

  // Pine clusters — flavor only, a scaled-down version of the plaza's disc-stack pine.
  const pineAt = (px0, py0, s) => {
    disc(img, px0, py0 - 3 * s, 3.4 * s, ARCTIC_DUSK.pineD);
    disc(img, px0, py0 - 5 * s, 2.7 * s, ARCTIC_DUSK.pine);
    disc(img, px0, py0 - 6.6 * s, 2 * s, ARCTIC_DUSK.pine);
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

  // Trail glyph: a tiny waterfall between two pines under the unlocked north pin.
  const tpx = Math.round(0.38 * W), tpy = Math.round(0.12 * H);
  rect(img, tpx - 3, tpy - 7, 7, 15, ARCTIC_DUSK.iceD); rect(img, tpx - 1, tpy - 7, 3, 15, ARCTIC_DUSK.iceL);
  disc(img, tpx, tpy + 8, 6, ARCTIC_DUSK.water); pineAt(tpx - 11, tpy + 7, 0.8); pineAt(tpx + 12, tpy + 7, 0.8);

  // Glasswind Court glyph: three warm storefronts around a tiny ice court.
  const gpx = Math.round(0.80 * W), gpy = Math.round(0.38 * H);
  disc(img, gpx, gpy, 9, ARCTIC_DUSK.iceD); disc(img, gpx, gpy, 6, ARCTIC_DUSK.iceL);
  for (const [ox, oy, c] of [[-12, -10, ARCTIC_DUSK.violet], [12, -10, ARCTIC_DUSK.amber], [12, 10, ARCTIC_DUSK.ember]]) {
    rect(img, gpx + ox - 5, gpy + oy - 4, 10, 8, ISLE.roofD);
    rect(img, gpx + ox - 4, gpy + oy - 3, 8, 5, c);
  }

  // Emberlight Workshop glyph: warm window, chimney, and a tiny brass bell.
  const wpx = Math.round(0.14 * W), wpy = Math.round(0.46 * H);
  rrect(img, wpx - 16, wpy - 11, 32, 24, ISLE.roofD);
  rect(img, wpx - 12, wpy - 7, 24, 18, ARCTIC_DUSK.wood);
  rect(img, wpx - 8, wpy - 3, 11, 9, ARCTIC_DUSK.amber);
  rect(img, wpx + 7, wpy - 23, 6, 15, ARCTIC_DUSK.stone);
  disc(img, wpx + 10, wpy - 25, 5, [...ARCTIC_DUSK.frost, 130]);
  oval(img, wpx + 8, wpy + 5, 5, 4, ARCTIC_DUSK.amberL);
  rect(img, wpx + 4, wpy + 5, 9, 2, ARCTIC_DUSK.beakD);

  // Driftgate Docks glyph: a timber finger pier with The Driftwood Gull at its outer berth.
  const dockX = Math.round(0.63 * W), dockY = Math.round(0.18 * H);
  rect(img, dockX - 18, dockY - 2, 24, 5, ARCTIC_DUSK.woodL);
  for (const postX of [dockX - 16, dockX - 5, dockX + 4]) rect(img, postX, dockY - 5, 2, 12, ARCTIC_DUSK.wood);
  oval(img, dockX + 13, dockY + 2, 14, 6, ARCTIC_DUSK.inkDeep);
  rect(img, dockX + 3, dockY - 2, 21, 5, ARCTIC_DUSK.wood);
  rect(img, dockX + 14, dockY - 13, 2, 13, ARCTIC_DUSK.stoneL);
  rect(img, dockX + 16, dockY - 11, 7, 4, ARCTIC_DUSK.ember);

  // Palefire Light glyph: a narrow white tower, amber lantern, and one eastward beam.
  const lightX = Math.round(0.74 * W), lightY = Math.round(0.08 * H);
  rect(img, lightX - 5, lightY - 4, 11, 21, ARCTIC_DUSK.stone);
  rect(img, lightX - 3, lightY - 3, 7, 19, ARCTIC_DUSK.snowL);
  rect(img, lightX - 8, lightY - 9, 17, 7, ARCTIC_DUSK.inkDeep);
  rect(img, lightX - 5, lightY - 8, 11, 5, ARCTIC_DUSK.amberL);
  rect(img, lightX + 9, lightY - 7, 18, 2, [...ARCTIC_DUSK.amberL, 130]);
  rect(img, lightX - 8, lightY + 16, 17, 4, ARCTIC_DUSK.inkDeep);

  // Small compass rose in open water, kept away from every pin.
  const crx = 432, cry = 263;
  disc(img, crx, cry, 13, [...ARCTIC_DUSK.inkDeep, 150]); ovalRing(img, crx, cry, 11, 11, ARCTIC_DUSK.iceD, 90);
  rect(img, crx, cry - 9, 1, 19, ARCTIC_DUSK.iceL); rect(img, crx - 9, cry, 19, 1, ARCTIC_DUSK.iceL);
  px(img, crx, cry - 11, ARCTIC_DUSK.amber); px(img, crx - 1, cry - 9, ARCTIC_DUSK.amber);

  return save('map-isle.png', img);
}

/* ----------------------------- MINIGAME: Snowdrift Toss ------------------ */
// Extra tones not already in C, matching the spec for this minigame's art.
const MG = {
  shadow: ARCTIC_DUSK.frost, dark: ARCTIC_DUSK.inkDeep,
  orange: ARCTIC_DUSK.beak, sky: ARCTIC_DUSK.nightL,
};

function buildSnowpal() {
  const img = Img(32, 32);
  // fills a disc with `color` only on the +x side (a flat one-side shade), masked to the same circle.
  const shadeDiscSide = (cx, cy, r, color) => {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      if (x * x + y * y <= r * r + r * 0.6 && x > r * 0.3) px(img, cx + x, cy + y, color);
    }
  };
  // body (bottom, larger), then head (top, smaller) drawn after so it sits cleanly on the body
  oval(img, 16, 30, 12, 2, [...ARCTIC_DUSK.inkDeep, 55]);
  disc(img, 16, 23, 11, MG.dark); disc(img, 16, 23, 10, C.snow);
  shadeDiscSide(16, 23, 10, MG.shadow);
  disc(img, 16, 9, 8, MG.dark); disc(img, 16, 9, 7, C.snow);
  shadeDiscSide(16, 9, 7, MG.shadow);

  // Twig arms and a tiny violet scarf keep the target readable at native scale.
  for (let i = 0; i < 7; i++) { px(img, 6 - i, 19 - Math.floor(i / 2), ARCTIC_DUSK.wood); px(img, 26 + i, 19 - Math.floor(i / 2), ARCTIC_DUSK.wood); }
  rect(img, 10, 14, 12, 3, ARCTIC_DUSK.violet); rect(img, 20, 16, 3, 7, shade(ARCTIC_DUSK.violet, 0.78));

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
  disc(img, 6, 6, 5, ARCTIC_DUSK.ink); disc(img, 6, 6, 4, C.snow);
  // lighter highlight, top-left
  px(img, 4, 3, C.snowL); px(img, 3, 4, C.snowL);
  // faint blue-grey shadow arc, bottom-right
  const shadow = [...MG.shadow, 130];
  px(img, 8, 8, shadow); px(img, 9, 7, shadow); px(img, 8, 9, shadow); px(img, 7, 9, shadow);
  return save(path.join('minigame', 'snowball.png'), img);
}

function buildMinigameBg() {
  const W = 480, H = 270, horizon = 112;
  const img = Img(W, H), A = ARCTIC_DUSK;

  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (y < horizon) {
      const t = y / horizon;
      const sky = A.night.map((v, i) => v + (A.nightL[i] - v) * t);
      px(img, x, y, sky);
    } else {
      const t = (y - horizon) / (H - horizon);
      let col = A.snowD.map((v, i) => v + (A.snow[i] - v) * t * 0.65);
      const n = rnd(); if (n > 0.965) col = A.snowL; else if (n > 0.92) col = A.frost;
      px(img, x, y, col);
    }
  }

  for (const [x, y] of [[32, 28], [74, 62], [128, 20], [203, 48], [279, 18], [338, 58], [411, 24], [454, 72]]) {
    px(img, x, y, A.iceL); if (x % 2) px(img, x + 1, y, [...A.iceL, 110]);
  }
  for (let x = 0; x < W; x++) {
    const y1 = 28 + Math.round(Math.sin(x * 0.022) * 8), y2 = 42 + Math.round(Math.sin(x * 0.018 + 1.4) * 7);
    px(img, x, y1, [...A.aurora, 115]); px(img, x, y1 + 1, [...A.aurora, 55]);
    px(img, x, y2, [...A.violet, 72]);
  }

  // Layered ridge and pines add depth without competing with the target lane.
  for (let x = 0; x < W; x++) {
    const ridge = 80 + Math.sin(x * 0.017) * 13 + Math.sin(x * 0.051) * 6;
    for (let y = Math.round(ridge); y < horizon + 8; y++) px(img, x, y, y < ridge + 4 ? A.frost : A.stone);
    px(img, x, Math.round(ridge), A.snowL);
  }
  const pine = (cx, cy, s) => {
    rect(img, cx - 1, cy - 3, 2, 7, A.wood);
    disc(img, cx, cy - 5 * s, 7 * s, A.pineD); disc(img, cx, cy - 11 * s, 6 * s, A.pine); disc(img, cx, cy - 16 * s, 4 * s, A.pine);
    disc(img, cx - 2, cy - 18 * s, 2 * s, A.snowL);
  };
  for (const p of [[44, 119, 0.9], [70, 115, 0.65], [415, 117, 0.85], [444, 120, 0.65], [357, 114, 0.5]]) pine(...p);

  // A cool packed lane points toward the snowpal, with warm pennants as contrast.
  for (let y = 132; y < H; y++) {
    const t = (y - 132) / (H - 132), half = Math.round(27 + t * 82);
    for (let x = 240 - half; x <= 240 + half; x++) px(img, x, y, [...A.iceL, 56]);
    if (y % 18 === 0) for (let x = 240 - half + 8; x < 240 + half - 8; x += 12) px(img, x, y, [...A.iceD, 115]);
  }
  for (const x of [136, 344]) {
    rect(img, x, 126, 3, 48, A.wood); disc(img, x + 1, 125, 3, A.snowL);
    for (let y = 131; y <= 161; y += 10) {
      rect(img, x + (x < 240 ? 3 : -9), y, 7, 5, y % 20 ? A.amber : A.violet);
    }
  }
  for (const [x, y, rx, ry] of [[82, 211, 78, 20], [405, 218, 72, 22]]) {
    oval(img, x, y, rx, ry, A.frost); oval(img, x - 4, y - 4, rx - 4, ry - 5, A.snowL);
  }

  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = Math.max(Math.abs(x - W / 2) / (W / 2), Math.abs(y - H / 2) / (H / 2));
    if (d > 0.84) px(img, x, y, [...A.inkDeep, Math.round((d - 0.84) * 160)]);
  }
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
  cush: ARCTIC_DUSK.amber, cushD: ARCTIC_DUSK.beakD, cushL: ARCTIC_DUSK.amberL,
  metal: ARCTIC_DUSK.stone, metalD: ARCTIC_DUSK.ink, metalL: ARCTIC_DUSK.stoneL,
  glow: ICE.ember, glowL: ICE.emberL, glowD: ICE.emberD,
  aur: ICE.aurora, aurD: shade(ARCTIC_DUSK.aurora, 0.72),
  gold: ARCTIC_DUSK.amber, goldD: ARCTIC_DUSK.woodL,
  dark: ARCTIC_DUSK.inkDeep,
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
function groundShadow(img, cx, cy, rx, ry) { oval(img, cx, cy, rx, ry, [...ARCTIC_DUSK.inkDeep, 50]); }

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
  const green = ARCTIC_DUSK.pine, greenD = ARCTIC_DUSK.pineD, greenL = ARCTIC_DUSK.aurora;
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
  const W = 480, H = 320, horizon = 96;
  const img = Img(W, H), A = ARCTIC_DUSK;

  // Night sky above a softly rising snowfield.
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (y < horizon) {
      const t = y / horizon;
      px(img, x, y, A.night.map((v, i) => v + (A.nightL[i] - v) * t));
    } else {
      const edge = Math.abs(x - W / 2) / (W / 2);
      let col = shade(A.snow, 0.99 - edge * 0.055); const n = rnd();
      if (n > 0.965) col = A.snowL; else if (n > 0.91) col = A.snowD;
      px(img, x, y, col);
    }
  }
  for (const [x, y] of [[31, 24], [79, 47], [130, 18], [313, 31], [378, 15], [447, 54]]) px(img, x, y, A.iceL);
  for (let x = 0; x < W; x++) {
    const ay = 27 + Math.round(Math.sin(x * 0.025) * 7);
    px(img, x, ay, [...A.aurora, 90]); px(img, x, ay + 1, [...A.violet, 55]);
  }

  // Two ridge layers create distance, capped with irregular snow lips.
  for (let x = 0; x < W; x++) {
    const far = 59 + Math.sin(x * 0.018) * 12 + Math.sin(x * 0.047) * 5;
    for (let y = Math.round(far); y < horizon + 18; y++) px(img, x, y, y < far + 5 ? A.frost : A.stone);
    px(img, x, Math.round(far), A.snowL);
  }
  for (let x = 0; x < W; x++) {
    const near = 86 + Math.sin(x * 0.013 + 1.1) * 10 + Math.sin(x * 0.039) * 4;
    for (let y = Math.round(near); y < horizon + 30; y++) px(img, x, y, A.snowD);
    px(img, x, Math.round(near), A.snowL);
  }

  // Winding packed path from the plaza door to the falls.
  const pathPts = [[240, 325], [238, 292], [224, 256], [210, 223], [214, 190], [235, 156], [247, 125], [240, 94]];
  for (let i = 0; i < pathPts.length - 1; i++) {
    const [x0, y0] = pathPts[i], [x1, y1] = pathPts[i + 1];
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps, cx = Math.round(x0 + (x1 - x0) * t), cy = Math.round(y0 + (y1 - y0) * t);
      disc(img, cx, cy, 13, [...A.frost, 150]); disc(img, cx + 1, cy - 1, 9, [...A.snowL, 160]);
    }
  }
  for (const [fx, fy, turn] of [[238, 296, 1], [229, 271, -1], [216, 239, 1], [211, 208, -1], [222, 178, 1], [240, 144, -1]]) {
    oval(img, fx, fy, 2, 4, [...A.stone, 135]); oval(img, fx + turn * 5, fy + 5, 2, 4, [...A.stone, 135]);
  }

  // Frozen falls, aligned to the authored landmark center at (240,73 native).
  for (let x = 190; x <= 290; x++) {
    const top = 48 + Math.round(Math.sin(x * 0.13) * 4);
    for (let y = top; y < 91; y++) px(img, x, y, y < top + 4 ? A.snowL : A.ink);
  }
  for (const [dx, w, c] of [[-24, 10, A.iceD], [-9, 13, A.ice], [8, 11, A.iceL], [23, 8, A.water]]) {
    for (let y = 52; y <= 92; y++) for (let i = 0; i < w; i++) {
      const wobble = Math.round(Math.sin(y * 0.18 + dx) * 1.2);
      px(img, 240 + dx + i + wobble, y, i === 1 ? A.iceL : c);
    }
  }
  oval(img, 240, 96, 34, 16, A.iceD); oval(img, 237, 93, 29, 12, A.water);
  for (const [x, y, w] of [[220, 90, 20], [244, 98, 22], [228, 103, 15]]) rect(img, x, y, w, 2, [...A.iceL, 180]);

  // Layered drifts make the snowfield feel carved by wind.
  for (const [x, y, rx, ry] of [[73, 184, 74, 13], [401, 199, 86, 15], [85, 286, 82, 17], [395, 286, 76, 14]]) {
    oval(img, x, y, rx, ry, A.frost); oval(img, x - 4, y - 4, rx - 4, Math.max(3, ry - 4), A.snowL);
  }

  const pineAt = (cx, cy, s = 1) => {
    oval(img, cx, cy + 3, 8 * s, 3 * s, [...A.inkDeep, 48]);
    rect(img, cx - Math.max(1, Math.round(s)), cy - 3, Math.max(2, Math.round(s * 2)), 8, A.wood);
    disc(img, cx, cy - 7 * s, 8 * s, A.pineD); disc(img, cx, cy - 14 * s, 7 * s, A.pine); disc(img, cx, cy - 20 * s, 5 * s, A.pine);
    disc(img, cx - 2 * s, cy - 22 * s, 3 * s, A.snowL); px(img, cx + 3 * s, cy - 13 * s, A.snowD);
  };
  for (const p of [[90, 145, 1], [104, 151, 0.9], [112, 132, 0.95], [96, 122, 0.8], [357, 111, 1], [371, 118, 0.9], [379, 99, 0.95], [363, 89, 0.8]]) pineAt(...p);
  for (const p of [[46, 113, 0.55], [429, 150, 0.58], [61, 244, 0.62], [420, 245, 0.56]]) pineAt(...p);

  // Snow-capped boulder at the tested solid, plus the old signpost at its authored hotspot.
  oval(img, 167, 246, 19, 5, [...A.inkDeep, 45]); disc(img, 167, 236, 16, A.ink);
  disc(img, 164, 232, 13, A.stoneL); oval(img, 161, 228, 10, 5, A.snowL);
  rect(img, 366, 239, 4, 25, A.wood); rect(img, 354, 241, 22, 6, A.woodL); px(img, 377, 244, A.wood);
  rect(img, 361, 250, 18, 6, A.wood); px(img, 360, 253, A.woodL); disc(img, 368, 238, 4, A.snowL);
  glowTrail: {
    for (let r = 9; r >= 3; r -= 3) disc(img, 368, 250, r, [...A.amber, Math.round(18 + (9 - r) * 4)]);
    px(img, 369, 249, A.amberL);
  }

  // South trailhead posts visually anchor the return door without changing its DOM label.
  for (const x of [220, 260]) {
    rect(img, x, 292, 4, 28, A.wood); rect(img, x - 3, 291, 10, 5, A.snowL);
    disc(img, x + 2, 300, 5, [...A.amber, 55]); disc(img, x + 2, 300, 2, A.amberL);
  }
  rect(img, 222, 294, 38, 5, A.wood); rect(img, 228, 295, 26, 2, A.iceL);

  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = Math.max(Math.abs(x - W / 2) / (W / 2), Math.abs(y - H / 2) / (H / 2));
    if (d > 0.84) px(img, x, y, [...A.inkDeep, Math.round((d - 0.84) * 155)]);
  }
  return save('room-trail.png', img);
}

/* ----------------------------- ROOM: Glasswind Court ------------------- */
function buildRoomCourt() {
  const W = 480, H = 320;
  const img = Img(W, H), A = ARCTIC_DUSK;

  // Wind-polished snow with a cooler glassy center and darker perimeter.
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const edge = Math.min(1, Math.hypot((x - W / 2) / (W / 2), (y - H / 2) / (H / 2)));
    let col = shade(A.snow, 1.02 - edge * 0.09); const n = rnd();
    if (n > 0.965) col = A.snowL; else if (n > 0.91) col = A.snowD;
    px(img, x, y, col);
  }

  const stroke = (points, radius, color) => {
    for (let i = 0; i < points.length - 1; i++) {
      const [x0, y0] = points[i], [x1, y1] = points[i + 1];
      const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let s = 0; s <= steps; s++) {
        const t = steps ? s / steps : 0;
        disc(img, Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), radius, color);
      }
    }
  };
  const paths = [
    [[-8, 160], [68, 160], [125, 170], [195, 163]],
    [[195, 163], [165, 128], [142, 104]],
    [[195, 163], [214, 134], [234, 108]],
    [[220, 170], [292, 188], [368, 216]],
    [[205, 188], [250, 220], [315, 240]],
    [[150, 184], [126, 208], [150, 236]],
  ];
  for (const p of paths) { stroke(p, 14, [...A.frost, 150]); stroke(p, 10, [...A.snowL, 180]); }
  oval(img, 195, 165, 67, 48, [...A.iceD, 130]); oval(img, 193, 162, 61, 43, [...A.iceL, 120]);
  for (let y = 132; y <= 198; y += 12) rect(img, 143, y, 104, 1, [...A.iceD, 120]);
  for (let x = 151; x <= 239; x += 16) rect(img, x, 124, 1, 76, [...A.iceD, 100]);

  const warmGlow = (cx, cy, r = 12) => {
    for (let rr = r; rr >= 3; rr -= 3) disc(img, cx, cy, rr, [...A.amber, Math.round(14 + (r - rr) * 3)]);
  };
  const lampAt = (cx, cy) => {
    warmGlow(cx, cy - 9, 14); rect(img, cx - 1, cy - 8, 3, 15, A.ink);
    rect(img, cx - 4, cy - 12, 9, 7, A.inkDeep); rect(img, cx - 3, cy - 11, 7, 5, A.amberL);
    rect(img, cx - 4, cy + 6, 9, 2, A.inkDeep);
  };
  const snowtailAt = (cx, cy, body = A.snowL, ear = A.violet, s = 1) => {
    oval(img, cx, cy + 6 * s, 9 * s, 6 * s, body); disc(img, cx, cy - 1 * s, 6 * s, body);
    px(img, Math.round(cx - 4 * s), Math.round(cy - 7 * s), ear);
    px(img, Math.round(cx + 4 * s), Math.round(cy - 7 * s), ear);
    px(img, Math.round(cx - 2 * s), Math.round(cy - 1 * s), A.ink);
    px(img, Math.round(cx + 2 * s), Math.round(cy - 1 * s), A.ink);
    disc(img, cx + 9 * s, cy + 4 * s, 3 * s, ear);
  };

  // Snowtail Pet Shop — broad north-west frontage with a busy companion window.
  rrect(img, 20, 18, 150, 82, A.nightL); rect(img, 24, 24, 142, 72, A.ink);
  for (let x = 18; x < 172; x += 7) disc(img, x, 18, 7, A.snowL);
  for (let x = 24; x < 166; x += 12) rect(img, x, 40, 12, 8, (x / 12) % 2 ? A.violet : A.aurora);
  rect(img, 34, 51, 78, 35, A.iceD); rect(img, 38, 55, 70, 27, A.night);
  rrect(img, 128, 49, 28, 47, A.wood); rrect(img, 133, 55, 18, 41, A.nightL);
  warmGlow(142, 69, 14); px(img, 149, 76, A.amberL);
  disc(img, 96, 32, 10, A.inkDeep); disc(img, 96, 35, 4, A.violet);
  for (const [ox, oy] of [[-5, -4], [0, -6], [5, -4]]) disc(img, 96 + ox, 35 + oy, 2, A.aurora);
  snowtailAt(58, 65, A.snowL, A.violet, 1);
  snowtailAt(88, 67, A.frost, A.aurora, 0.9);

  // Bluehour Coffee — set back and offset from the pet shop, with deliveries on the path.
  rrect(img, 205, 25, 150, 79, A.nightL); rect(img, 210, 31, 140, 69, A.ink);
  for (let x = 203; x < 357; x += 7) disc(img, x, 25, 7, A.snowL);
  for (let x = 210; x < 350; x += 12) rect(img, x, 47, 12, 8, (x / 12) % 2 ? A.ice : A.amber);
  rrect(img, 220, 57, 28, 47, A.wood); rrect(img, 225, 63, 18, 41, A.nightL);
  rect(img, 258, 57, 82, 34, A.iceD); rect(img, 262, 61, 74, 26, shade(A.amber, 0.72));
  rect(img, 264, 79, 70, 5, A.woodL); rect(img, 282, 67, 22, 9, A.amberL);
  disc(img, 318, 72, 5, A.snowL); disc(img, 323, 72, 5, A.snowL);
  disc(img, 282, 39, 10, A.inkDeep); rect(img, 277, 38, 10, 6, A.amberL);
  ovalRing(img, 287, 41, 4, 4, A.amber, 255); px(img, 279, 35, A.snowL); px(img, 282, 33, A.snowL);
  warmGlow(234, 75, 14);
  rect(img, 296, 110, 35, 7, A.wood); rect(img, 301, 105, 13, 7, A.woodL);
  rect(img, 318, 105, 10, 12, A.violet); px(img, 323, 103, A.snowL);

  // Lantern Ladle Restaurant — a west-facing side building, approached horizontally from court.
  rrect(img, 370, 110, 118, 172, A.nightL); rect(img, 378, 118, 102, 158, A.wood);
  for (let x = 370; x < 486; x += 8) disc(img, x, 111, 8, A.snowL);
  for (let y = 136; y < 268; y += 14) rect(img, 368, y, 11, 14, (y / 14) % 2 ? A.ember : A.amberL);
  rrect(img, 376, 194, 30, 46, A.inkDeep); rrect(img, 381, 200, 20, 40, A.nightL);
  warmGlow(389, 216, 17); px(img, 399, 224, A.amberL);
  rect(img, 412, 174, 58, 50, A.inkDeep); rect(img, 417, 179, 48, 40, shade(A.amber, 0.65));
  rect(img, 421, 203, 40, 5, A.woodL); oval(img, 441, 193, 13, 5, A.snowL);
  disc(img, 408, 146, 12, A.inkDeep); oval(img, 408, 148, 8, 5, A.amberL);
  rect(img, 399, 151, 19, 2, A.amber); px(img, 408, 141, A.snowL);
  rect(img, 360, 204, 17, 27, [...A.violet, 150]); rect(img, 362, 206, 13, 23, [...A.snowL, 130]);
  rect(img, 454, 94, 14, 27, A.inkDeep); rect(img, 457, 97, 8, 23, A.wood);
  disc(img, 461, 91, 6, [...A.frost, 150]); disc(img, 468, 84, 8, [...A.frost, 100]);

  // An off-centre provisions cart keeps the ice court from reading as a sterile roundabout.
  oval(img, 235, 185, 23, 8, [...A.inkDeep, 45]);
  rect(img, 216, 163, 38, 20, A.wood); rect(img, 220, 167, 30, 12, A.woodL);
  rect(img, 213, 155, 44, 7, A.inkDeep);
  for (let x = 214; x < 258; x += 8) rect(img, x, 156, 8, 6, (x / 8) % 2 ? A.amberL : A.violet);
  rect(img, 219, 180, 3, 10, A.ink); rect(img, 249, 180, 3, 10, A.ink);
  disc(img, 222, 186, 5, A.inkDeep); disc(img, 250, 186, 5, A.inkDeep);
  disc(img, 228, 173, 4, A.snowL); oval(img, 240, 173, 7, 3, A.ember); disc(img, 247, 171, 3, A.aurora);

  // Lantern Ladle's outdoor patio fills the lower court with mismatched seating and warm light.
  oval(img, 318, 258, 80, 50, [...A.violet, 28]); oval(img, 318, 258, 74, 45, [...A.amber, 18]);
  stroke([[244, 214], [315, 207], [394, 222]], 1, A.inkDeep);
  for (const [bx, by, bc] of [[257, 213, A.amberL], [279, 211, A.aurora], [302, 209, A.amberL], [326, 210, A.violet], [350, 215, A.amberL], [376, 220, A.aurora]]) {
    disc(img, bx, by, 2, bc); warmGlow(bx, by, 5);
  }
  lampAt(244, 222); lampAt(394, 230);

  const patioTableAt = (cx, cy, cloth) => {
    oval(img, cx, cy + 7, 18, 6, [...A.inkDeep, 45]);
    oval(img, cx, cy, 14, 8, cloth); ovalRing(img, cx, cy, 14, 8, A.wood, 190);
    rect(img, cx - 2, cy + 5, 5, 14, A.wood); rect(img, cx - 8, cy + 17, 17, 3, A.inkDeep);
    oval(img, cx - 20, cy + 2, 6, 5, A.woodL); oval(img, cx + 20, cy + 2, 6, 5, A.woodL);
    disc(img, cx - 4, cy - 1, 2, A.snowL); disc(img, cx + 4, cy - 1, 2, A.amberL);
  };
  patioTableAt(280, 248, A.violet); patioTableAt(345, 270, A.ember);

  // Shared brazier, chalkboard menu, dropped mittens, and dishes make the patio feel occupied.
  oval(img, 245, 289, 14, 6, [...A.inkDeep, 55]); disc(img, 245, 282, 10, A.inkDeep);
  disc(img, 245, 280, 7, A.ember); disc(img, 242, 276, 4, A.amberL); disc(img, 248, 275, 3, A.snowL);
  rect(img, 242, 288, 3, 8, A.wood); rect(img, 248, 288, 3, 8, A.wood);
  rrect(img, 357, 260, 16, 24, A.wood); rect(img, 360, 263, 10, 15, A.inkDeep);
  rect(img, 361, 266, 8, 1, A.snowL); rect(img, 362, 270, 6, 1, A.amberL);
  rect(img, 359, 284, 3, 8, A.wood); rect(img, 369, 284, 3, 8, A.wood);
  oval(img, 320, 294, 5, 3, A.violet); oval(img, 329, 297, 5, 3, A.aurora);
  disc(img, 300, 281, 4, A.snowL); disc(img, 309, 285, 4, A.snowL); rect(img, 299, 280, 12, 1, A.iceD);

  // Snowtail playpen in the lower-left: an open gate, toys, bowls, and pawprints.
  oval(img, 94, 252, 58, 38, [...A.violet, 22]); oval(img, 92, 250, 51, 32, [...A.snowL, 80]);
  stroke([[40, 220], [110, 220]], 2, A.wood);
  stroke([[40, 220], [40, 286], [150, 286], [150, 252]], 2, A.wood);
  for (const [fx, fy] of [[40, 220], [75, 220], [110, 220], [40, 253], [40, 286], [75, 286], [110, 286], [150, 286], [150, 252]]) {
    rect(img, fx - 2, fy - 5, 5, 11, A.woodL); disc(img, fx, fy - 5, 3, A.snowL);
  }
  snowtailAt(72, 248, A.snowL, A.violet, 1.1);
  snowtailAt(112, 265, A.frost, A.aurora, 0.95);
  disc(img, 93, 271, 5, A.ember); px(img, 91, 269, A.amberL);
  oval(img, 127, 240, 9, 4, A.iceD); oval(img, 127, 239, 7, 3, A.amberL);
  for (const [px0, py0] of [[139, 232], [149, 224], [157, 213]]) {
    disc(img, px0, py0, 2, A.violet); px(img, px0 - 2, py0 - 2, A.violet); px(img, px0 + 2, py0 - 2, A.violet);
  }

  // A used bench faces the patio; a parcel and thermos imply somebody just stepped away.
  oval(img, 180, 281, 21, 5, [...A.inkDeep, 45]); rect(img, 162, 270, 36, 7, A.wood);
  rect(img, 165, 277, 4, 8, A.ink); rect(img, 192, 277, 4, 8, A.ink);
  rect(img, 166, 263, 10, 8, A.violet); rect(img, 177, 265, 5, 9, A.amberL);

  // West return gate and irregular edge planting keep the room tied to Chillmere Plaza.
  rect(img, 0, 132, 24, 18, A.iceD); rect(img, 0, 170, 24, 18, A.iceD);
  rect(img, 0, 144, 10, 32, A.night); rect(img, 5, 148, 5, 24, A.amber);

  const pineAt = (cx, cy, s = 1) => {
    rect(img, cx - 1, cy - 3, 3, 8, A.wood);
    disc(img, cx, cy - 8 * s, 9 * s, A.pineD); disc(img, cx, cy - 16 * s, 7 * s, A.pine);
    disc(img, cx, cy - 22 * s, 5 * s, A.pine); disc(img, cx - 2 * s, cy - 24 * s, 3 * s, A.snowL);
  };
  pineAt(25, 205, 1); pineAt(18, 78, 0.8); pineAt(462, 300, 0.75);
  rect(img, 16, 304, 35, 6, A.iceD); disc(img, 20, 302, 8, A.snowL); disc(img, 37, 303, 10, A.snowL);
  rect(img, 334, 116, 24, 6, A.wood); rect(img, 338, 110, 9, 7, A.woodL); rect(img, 349, 111, 7, 6, A.violet);

  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const edge = Math.max(Math.abs(x - W / 2) / (W / 2), Math.abs(y - H / 2) / (H / 2));
    if (edge > 0.86) px(img, x, y, [...A.inkDeep, Math.round((edge - 0.86) * 145)]);
  }
  return save('room-court.png', img);
}

/* ----------------------------- ROOM: Emberlight Workshop -------------- */
function buildRoomWorkshop() {
  const W = 480, H = 320;
  const img = Img(W, H), A = ARCTIC_DUSK;

  // Timber-and-stone interior at blue hour: cool rafters above, forge-warm plank floor below.
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (y < 174) {
      const t = y / 174;
      const wall = [
        A.night[0] * (1 - t) + A.wood[0] * t * 0.72,
        A.night[1] * (1 - t) + A.wood[1] * t * 0.72,
        A.night[2] * (1 - t) + A.wood[2] * t * 0.72,
      ];
      px(img, x, y, wall);
    } else {
      const plank = Math.floor((y - 174) / 14) % 2;
      const grain = (x + (plank ? 17 : 0)) % 58;
      const base = plank ? shade(A.wood, 0.88) : shade(A.woodL, 0.72);
      px(img, x, y, grain < 2 ? shade(base, 0.74) : base);
    }
  }

  // Heavy rounded frame and roof ribs make the room feel carved into an old service building.
  rect(img, 0, 0, W, 12, A.inkDeep); rect(img, 0, 0, 14, H, A.inkDeep); rect(img, W - 14, 0, 14, H, A.inkDeep);
  for (const x of [42, 160, 320, 438]) {
    rect(img, x - 5, 0, 10, 178, A.wood); rect(img, x - 2, 0, 4, 178, A.woodL);
    disc(img, x, 22, 8, A.inkDeep); disc(img, x, 22, 4, A.amber);
  }
  rect(img, 0, 166, W, 13, A.inkDeep); rect(img, 0, 169, W, 5, A.woodL);

  const glow = (cx, cy, radius, color = A.amber) => {
    for (let r = radius; r >= 3; r -= 3) {
      disc(img, cx, cy, r, [...color, Math.round(10 + (radius - r) * 2.6)]);
    }
  };
  const stroke = (points, radius, color) => {
    for (let i = 0; i < points.length - 1; i++) {
      const [x0, y0] = points[i], [x1, y1] = points[i + 1];
      const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let s = 0; s <= steps; s++) {
        const t = steps ? s / steps : 0;
        disc(img, Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), radius, color);
      }
    }
  };

  // Rotating blueprints: three clipped sheets above the machine, with abstract arrow-only plans.
  rrect(img, 181, 30, 118, 63, A.wood); rect(img, 187, 36, 106, 51, A.iceD);
  for (const [x, y, tilt] of [[193, 42, 0], [226, 39, 1], [258, 44, 0]]) {
    rrect(img, x, y, 29, 37, A.iceL); rect(img, x + 5, y + 7, 18, 2, A.iceD);
    ovalRing(img, x + 14, y + 21 + tilt, 8, 6, A.iceD, 60);
    rect(img, x + 9, y + 30, 12, 2, A.iceD);
  }
  rect(img, 194, 38, 5, 5, A.violet); rect(img, 260, 40, 5, 5, A.amber);

  // Left gizmo shelf: an intentionally over-connected seven-step mechanism.
  rrect(img, 39, 39, 121, 84, A.inkDeep); rect(img, 45, 45, 109, 72, A.wood);
  for (const y of [68, 93]) rect(img, 45, y, 109, 5, A.woodL);
  for (const [x, y, c] of [[58, 57, A.aurora], [80, 58, A.amber], [105, 56, A.violet], [132, 58, A.ember],
    [67, 83, A.ice], [96, 84, A.amberL], [127, 84, A.aurora]]) {
    disc(img, x, y, 8, A.inkDeep); disc(img, x, y, 5, c); disc(img, x - 2, y - 2, 2, A.snowL);
  }
  stroke([[58, 57], [80, 58], [105, 56], [132, 58], [127, 84], [96, 84], [67, 83]], 1, A.amberL);
  rect(img, 51, 103, 94, 8, A.night); rect(img, 54, 105, 22, 4, A.ember);

  // Forge and bellows occupy the lower-left work bay.
  glow(77, 205, 42, A.ember);
  rrect(img, 42, 165, 72, 58, A.inkDeep); rrect(img, 49, 171, 58, 45, A.stone);
  oval(img, 78, 199, 21, 13, A.inkDeep); disc(img, 77, 199, 12, A.ember); disc(img, 74, 195, 6, A.amberL);
  rect(img, 83, 136, 15, 38, A.stone); rect(img, 87, 139, 8, 35, A.stoneL);
  oval(img, 121, 211, 31, 16, A.wood); oval(img, 121, 207, 27, 12, A.ember);
  stroke([[145, 207], [164, 194], [174, 185]], 3, A.woodL);

  // The half-built Weather Bell: broad brass arch, exposed heart, and three empty component sockets.
  glow(240, 133, 48, A.amber);
  oval(img, 240, 151, 48, 14, [...A.inkDeep, 60]);
  rect(img, 198, 119, 10, 61, A.wood); rect(img, 272, 119, 10, 61, A.wood);
  rect(img, 194, 174, 92, 12, A.inkDeep); rect(img, 202, 169, 76, 10, A.woodL);
  ovalRing(img, 240, 124, 40, 45, A.amber, 180); ovalRing(img, 240, 124, 35, 40, A.amberL, 180);
  oval(img, 240, 132, 26, 23, A.beakD); oval(img, 240, 128, 24, 20, A.amber);
  rect(img, 217, 130, 47, 9, A.amber); oval(img, 240, 145, 31, 8, A.amberL);
  rect(img, 237, 99, 7, 18, A.wood); disc(img, 240, 97, 8, A.inkDeep);
  for (const [x, y] of [[214, 150], [240, 107], [266, 150]]) {
    disc(img, x, y, 7, A.inkDeep); ovalRing(img, x, y, 7, 7, A.iceD, 60);
  }
  // A loose test lever gives the centerpiece a readable click target.
  rect(img, 285, 145, 6, 28, A.stone); disc(img, 288, 141, 8, A.ember);

  // Pat's bench stays visually occupied without drawing Pat into the backdrop.
  rrect(img, 305, 79, 113, 54, A.inkDeep); rect(img, 311, 85, 101, 42, A.woodL);
  rect(img, 303, 125, 119, 10, A.wood); rect(img, 315, 135, 7, 28, A.inkDeep); rect(img, 402, 135, 7, 28, A.inkDeep);
  for (const [x, y, w, h, c] of [[320, 102, 26, 16, A.violet], [353, 95, 18, 23, A.stoneL], [379, 103, 24, 15, A.amber]]) {
    rrect(img, x, y, w, h, c);
  }
  rect(img, 327, 89, 4, 15, A.ice); rect(img, 390, 87, 5, 17, A.ember);

  // Pneumatic post tube on the right wall, ending in a satisfyingly oversized receiver.
  rect(img, 386, 19, 12, 71, A.stone); rect(img, 390, 22, 5, 66, A.stoneL);
  rrect(img, 373, 78, 39, 34, A.inkDeep); rrect(img, 379, 83, 27, 23, A.ember);
  rect(img, 382, 91, 21, 5, A.amberL); disc(img, 392, 113, 8, A.stoneL);

  // Prototype snowputer at floor-right: chunky CRT, fan, and frost-speckled screen.
  oval(img, 381, 247, 31, 8, [...A.inkDeep, 58]);
  rrect(img, 357, 205, 51, 39, A.inkDeep); rrect(img, 363, 211, 39, 27, A.stone);
  rrect(img, 368, 215, 29, 18, A.night); rect(img, 372, 219, 20, 2, A.aurora);
  for (const [x, y] of [[374, 226], [383, 221], [392, 228]]) disc(img, x, y, 2, A.snowL);
  rect(img, 376, 244, 13, 8, A.stoneL); rect(img, 364, 252, 38, 7, A.inkDeep);
  ovalRing(img, 412, 225, 10, 10, A.iceD, 70); disc(img, 412, 225, 3, A.ice);

  // Locked dumbwaiter hatch: deliberately cold amid the warm floor, foreshadowing stone below.
  rrect(img, 96, 249, 70, 39, A.inkDeep); rrect(img, 102, 255, 58, 27, A.stone);
  for (let x = 107; x < 158; x += 10) rect(img, x, 258, 3, 21, A.stoneL);
  disc(img, 151, 269, 5, A.iceD); rect(img, 148, 267, 7, 4, A.iceL);
  for (let r = 22; r >= 5; r -= 4) oval(img, 131, 270, r, Math.max(2, Math.round(r / 4)), [...A.ice, 12]);

  // South door and open central floor keep travel geometry obvious at game scale.
  rect(img, 221, 283, 38, 37, A.inkDeep); rect(img, 228, 290, 24, 30, A.night);
  glow(240, 296, 18, A.ice); rect(img, 216, 304, 48, 8, A.stone); rect(img, 222, 303, 36, 3, A.iceL);
  stroke([[172, 222], [200, 215], [279, 216], [319, 235]], 2, [...A.amber, 90]);

  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const edge = Math.max(Math.abs(x - W / 2) / (W / 2), Math.abs(y - H / 2) / (H / 2));
    if (edge > 0.87) px(img, x, y, [...A.inkDeep, Math.round((edge - 0.87) * 170)]);
  }
  return save('room-workshop.png', img);
}

/* ----------------------------- ROOM: Driftgate Docks ------------------ */
// One authored harbor layout with two ritual states. The shoreline, pier, ledge, and collisions stay
// identical; only The Driftwood Gull, gangplank, cargo stall, and harbor mood change by date.
function buildRoomDocks(inPort) {
  const W = 480, H = 320, img = Img(W, H), A = ARCTIC_DUSK;
  let noise = 0xd0c45003;
  const nextNoise = () => { noise = (noise * 1664525 + 1013904223) >>> 0; return noise / 0xffffffff; };

  // Deep water first, with horizontal current scratches and a colder open-sea edge.
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const edge = x / W;
    const base = shade(A.water, 0.63 + edge * 0.10 + Math.sin(y * 0.045) * 0.018);
    const grain = (nextNoise() - 0.5) * 9;
    px(img, x, y, base.map((channel) => Math.max(0, Math.min(255, channel + grain))));
  }
  for (let y = 17; y < H; y += 13) {
    for (let x = (y * 7) % 31; x < W; x += 43) rect(img, x, y, 18 + (x % 17), 1, [...A.iceL, 75]);
  }

  // Uneven snow shore on the west. Tide pools and wind-scoured shelves interrupt the clean edge.
  for (let y = 0; y < H; y++) {
    const shore = 183 + Math.round(Math.sin(y * 0.031) * 19 + Math.sin(y * 0.087) * 7);
    for (let x = 0; x <= shore; x++) {
      const n = nextNoise();
      px(img, x, y, n > 0.94 ? A.snowL : n > 0.86 ? A.frost : A.snowD);
    }
    for (let x = shore - 3; x <= shore + 2; x++) px(img, x, y, x <= shore ? A.iceD : [...A.iceL, 175]);
  }
  oval(img, 110, 240, 27, 16, A.iceD); oval(img, 108, 239, 22, 12, shade(A.water, 0.72));
  for (const [x, y, c] of [[101, 236, A.aurora], [115, 243, A.violet], [121, 234, A.amber]]) {
    disc(img, x, y, 3, c); px(img, x - 2, y - 3, A.iceL); px(img, x + 2, y - 3, A.iceL);
  }

  // Packed route from Glasswind Court, marked by paired harbor posts.
  oval(img, 66, 160, 77, 31, [...A.snowL, 180]); oval(img, 133, 165, 65, 27, [...A.frost, 130]);
  for (const x of [23, 58]) {
    rect(img, x, 139, 5, 42, A.wood); disc(img, x + 2, 138, 5, A.snowL);
    rect(img, x - 3, 148, 11, 5, A.woodL);
  }

  // Old salt warehouse occupies the high west bank and makes the shore read as a working port.
  rrect(img, 42, 42, 99, 74, A.inkDeep); rect(img, 48, 50, 87, 61, A.wood);
  for (let x = 45; x <= 138; x += 8) disc(img, x, 43, 8, A.snowL);
  rect(img, 58, 71, 31, 40, A.night); rect(img, 64, 77, 20, 34, A.woodL);
  rect(img, 98, 63, 26, 22, A.ink); rect(img, 102, 67, 18, 14, shade(A.amber, 0.65));
  rect(img, 46, 104, 91, 7, A.inkDeep);

  // Bottle post and its weekly sealed dispatch.
  rect(img, 158, 119, 5, 44, A.wood); rect(img, 147, 124, 28, 7, A.woodL);
  rect(img, 154, 132, 13, 23, A.iceD); rect(img, 157, 136, 7, 14, A.iceL); disc(img, 160, 130, 4, A.amber);

  // Main timber pier exactly fills the walkable band between the two water collision fields.
  rect(img, 176, 110, 304, 94, A.inkDeep); rect(img, 181, 115, 299, 84, A.wood);
  for (let y = 119; y < 199; y += 14) rect(img, 181, y, 299, 3, shade(A.woodL, 0.78));
  for (let x = 190; x < 480; x += 31) {
    rect(img, x, 115, 2, 84, A.inkDeep); disc(img, x + 1, 119, 2, A.amberL); disc(img, x + 1, 193, 2, A.amberL);
  }
  for (const x of [188, 222, 448, 474]) { rect(img, x, 101, 6, 113, A.wood); disc(img, x + 3, 101, 5, A.snowL); }

  // Narrow raised causeway reaches the future Palefire trailhead through the split north water.
  rect(img, 359, 27, 49, 91, A.inkDeep); rect(img, 364, 31, 39, 84, A.frost);
  for (let y = 37; y < 113; y += 13) rect(img, 365, y, 37, 2, A.snowL);
  for (const x of [360, 406]) { rect(img, x, 25, 5, 91, A.wood); disc(img, x + 2, 26, 4, A.snowL); }
  rect(img, 365, 29, 38, 7, A.wood); rect(img, 372, 31, 24, 3, A.iceL);

  // Harbor bell, working crane, crates, rope coils, and waiting gulls create six readable props.
  rect(img, 258, 77, 5, 43, A.wood); rect(img, 244, 79, 34, 5, A.woodL);
  oval(img, 261, 101, 9, 8, A.amber); rect(img, 252, 100, 19, 3, A.beakD); px(img, 261, 110, A.amberL);
  rect(img, 351, 112, 40, 55, A.inkDeep); rect(img, 357, 117, 28, 47, A.wood);
  rect(img, 368, 76, 7, 52, A.woodL); rect(img, 371, 76, 56, 7, A.woodL);
  rect(img, 422, 81, 3, 40, A.inkDeep); ovalRing(img, 423, 123, 6, 8, A.amber, 210);
  for (const [x, y, c] of [[214, 170, A.violet], [235, 174, A.iceD], [452, 171, A.amber]]) {
    rrect(img, x - 9, y - 8, 18, 16, A.wood); rect(img, x - 6, y - 5, 12, 10, c);
  }
  ovalRing(img, 326, 176, 13, 9, A.amber, 180); ovalRing(img, 326, 176, 8, 5, A.woodL, 160);
  for (const [x, y] of [[221, 57], [240, 60], [259, 54], [278, 62]]) {
    rect(img, x - 5, y, 5, 2, A.snowL); rect(img, x, y - 1, 5, 2, A.snowL);
  }

  // Outer buoy remains in the open-water pocket east of the pier.
  oval(img, 410, 211, 13, 7, [...A.inkDeep, 75]); rect(img, 405, 196, 11, 23, A.ember);
  oval(img, 410, 197, 7, 5, A.amberL); rect(img, 402, 204, 17, 5, A.snowL); rect(img, 409, 188, 3, 9, A.inkDeep);

  // The secret under-pier ledge is one-avatar wide and reached around the outer east piling.
  rect(img, 178, 277, 255, 21, A.inkDeep); rect(img, 183, 281, 244, 13, A.stone);
  for (let x = 188; x < 424; x += 22) rect(img, x, 283, 14, 2, A.stoneL);
  rect(img, 402, 196, 45, 101, A.inkDeep); rect(img, 407, 199, 35, 93, A.wood);
  for (let y = 207; y < 290; y += 14) rect(img, 408, y, 33, 3, A.woodL);
  // Sea-glass knot at the end of the ledge.
  disc(img, 393, 285, 7, [...A.aurora, 70]); disc(img, 393, 285, 4, A.aurora);
  px(img, 391, 283, A.iceL); px(img, 396, 287, A.violet);

  if (inPort) {
    // The Driftwood Gull: broad work-barge hull, deck cargo, oilskin pennant, and gangplank down.
    oval(img, 342, 245, 77, 31, A.inkDeep); oval(img, 344, 237, 71, 27, shade(A.wood, 0.72));
    rect(img, 282, 215, 125, 31, A.wood); rect(img, 289, 219, 111, 22, A.woodL);
    for (let x = 292; x < 398; x += 18) rect(img, x, 220, 2, 19, shade(A.wood, 0.66));
    rect(img, 329, 161, 7, 59, A.stoneL); rect(img, 335, 166, 41, 5, A.inkDeep);
    rect(img, 336, 168, 35, 17, A.ember); rect(img, 339, 171, 28, 11, A.amber);
    rect(img, 300, 199, 9, 22, A.inkDeep); rect(img, 304, 197, 35, 6, A.woodL);
    // Diagonal gangplank from main pier to the deck.
    for (let i = 0; i < 48; i++) {
      const x = 268 + i, y = 196 + Math.round(i * 0.43);
      rect(img, x, y, 4, 10, A.woodL); if (i % 8 === 0) rect(img, x, y, 3, 10, A.amberL);
    }
    // Two open cargo crates visually match the two rotating ledger slots.
    for (const [x, c] of [[342, A.violet], [374, A.ice]]) {
      rrect(img, x - 12, 222, 24, 19, A.inkDeep); rect(img, x - 9, 225, 18, 13, A.wood);
      rect(img, x - 7, 226, 14, 7, c); rect(img, x - 12, 219, 24, 4, A.woodL);
    }
    rect(img, 384, 178, 3, 39, A.inkDeep); rect(img, 387, 179, 19, 8, A.ember);
    for (let r = 13; r > 2; r -= 3) disc(img, 392, 186, r, [...A.amber, Math.max(3, 26 - r)]);
  } else {
    // Empty berth: slack ropes, exposed bumpers, cold wake lines, and no warm cargo light.
    for (const [x, y] of [[285, 222], [336, 239], [382, 226]]) {
      oval(img, x, y, 31, 7, [...A.iceL, 60]); ovalRing(img, x, y, 25, 5, A.iceD, 80);
    }
    for (const x of [276, 319, 366]) {
      rect(img, x, 193, 6, 32, A.wood); disc(img, x + 3, 194, 5, A.snowL);
      ovalRing(img, x + 4, 219, 8, 6, A.amber, 150);
    }
    rect(img, 277, 202, 92, 3, [...A.woodL, 140]);
  }

  // Vignette seals the painted room edges without obscuring the two exits.
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const edge = Math.max(Math.abs(x - W / 2) / (W / 2), Math.abs(y - H / 2) / (H / 2));
    if (edge > 0.89) px(img, x, y, [...A.inkDeep, Math.round((edge - 0.89) * 125)]);
  }
  return save(inPort ? 'room-docks-port.png' : 'room-docks-away.png', img);
}

/* ----------------------------- ROOMS: Palefire Light (W4) ------------ */
function buildRoomLighthouseRest() {
  const W = 480, H = 320, img = Img(W, H), A = ARCTIC_DUSK;
  let noise = 0x1a17e57;
  const nextNoise = () => { noise = (noise * 1664525 + 1013904223) >>> 0; return noise / 0xffffffff; };

  // Round tower floor: cold masonry at the rim, worn timber and a braided rug within.
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = Math.hypot((x - W / 2) / 1.25, y - H / 2);
    const base = d > 178 ? A.inkDeep : d > 150 ? A.stone : d > 128 ? A.stoneL : A.wood;
    const grain = (nextNoise() - 0.5) * 10;
    px(img, x, y, base.map((channel) => Math.max(0, Math.min(255, channel + grain))));
  }
  for (let r = 156; r >= 145; r -= 4) ovalRing(img, 240, 160, Math.round(r * 1.28), r, r % 8 ? A.stone : A.stoneL, 420);
  for (let y = 52; y < 275; y += 20) {
    const half = Math.round(Math.sqrt(Math.max(0, 146 ** 2 - (y - 160) ** 2)) * 1.25);
    rect(img, 240 - half, y, half * 2, 2, [...A.inkDeep, 72]);
  }

  // Iron cedar stove on the west wall, kettle, stacked wood, and a gentle amber pool.
  for (let r = 42; r > 2; r -= 4) disc(img, 120, 96, r, [...A.amber, Math.max(3, 30 - r / 2)]);
  rrect(img, 91, 66, 58, 58, A.inkDeep); rrect(img, 97, 72, 46, 45, A.stone);
  rrect(img, 105, 88, 31, 22, A.night); disc(img, 120, 101, 10, A.ember); disc(img, 120, 98, 5, A.amberL);
  rect(img, 111, 39, 18, 34, A.inkDeep); rect(img, 115, 43, 10, 29, A.stoneL);
  oval(img, 164, 94, 17, 9, A.inkDeep); oval(img, 164, 91, 14, 7, A.stoneL); rect(img, 178, 88, 8, 4, A.stone);
  for (const [x, y] of [[71, 121], [82, 126], [93, 122]]) { rect(img, x, y, 22, 6, A.woodL); rect(img, x + 3, y + 1, 16, 2, A.amber); }

  // Keeper's table and growing logbook. The blank page remains a deliberate focal point.
  oval(img, 130, 181, 42, 12, [...A.inkDeep, 65]); rrect(img, 95, 151, 70, 36, A.inkDeep);
  rrect(img, 101, 157, 58, 25, A.woodL); rect(img, 107, 184, 7, 32, A.wood); rect(img, 146, 184, 7, 32, A.wood);
  rrect(img, 111, 160, 34, 20, A.amberL); rect(img, 128, 161, 2, 18, A.wood);
  for (const y of [165, 170, 175]) { rect(img, 115, y, 10, 1, A.stone); rect(img, 133, y, 8, 1, A.stone); }
  rect(img, 148, 153, 3, 20, A.ink); disc(img, 149, 151, 3, A.violet);

  // Cot and stitched current-map quilt on the lower-right curve.
  oval(img, 318, 253, 52, 13, [...A.inkDeep, 58]); rrect(img, 278, 220, 80, 35, A.inkDeep);
  rrect(img, 284, 225, 68, 24, A.snowD); rrect(img, 285, 226, 23, 21, A.snowL);
  rect(img, 310, 226, 40, 21, A.violet); rect(img, 310, 232, 40, 3, shade(A.violet, 0.72));
  for (let x = 314; x < 348; x += 8) rect(img, x, 226, 2, 21, A.iceL);

  // Spiral stair core at east, seen as a deliberate sequence of iron crescents.
  disc(img, 370, 140, 39, A.inkDeep); disc(img, 370, 140, 29, A.stone);
  for (let i = 0; i < 10; i++) {
    const a = i * 0.64, x = Math.round(370 + Math.cos(a) * (17 + i * 1.5)), y = Math.round(140 + Math.sin(a) * (12 + i));
    rrect(img, x - 14, y - 4, 28, 8, i % 2 ? A.stoneL : A.frost);
  }
  disc(img, 370, 140, 6, A.amber); rect(img, 367, 99, 6, 83, A.inkDeep);
  // East stair threshold and the south door back to the docks.
  rect(img, 438, 139, 42, 42, A.inkDeep); rect(img, 441, 145, 39, 30, A.night); rect(img, 437, 151, 6, 18, A.amber);
  rect(img, 221, 287, 38, 33, A.inkDeep); rect(img, 228, 293, 24, 27, A.night);
  rect(img, 215, 302, 50, 7, A.stoneL); rect(img, 221, 301, 38, 3, A.iceL);

  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const edge = Math.max(Math.abs(x - W / 2) / (W / 2), Math.abs(y - H / 2) / (H / 2));
    if (edge > 0.9) px(img, x, y, [...A.inkDeep, Math.round((edge - 0.9) * 120)]);
  }
  return save('room-lighthouse-rest.png', img);
}

function buildRoomLighthouseGallery() {
  const W = 480, H = 320, img = Img(W, H), A = ARCTIC_DUSK;
  let noise = 0x1a47e22;
  const nextNoise = () => { noise = (noise * 1664525 + 1013904223) >>> 0; return noise / 0xffffffff; };

  // Open night beyond the glass, then the circular gallery floor and frost-ribbed window wall.
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = y / H, grain = (nextNoise() - 0.5) * 9;
    const base = A.night.map((channel, i) => channel * (1 - t * 0.22) + A.inkDeep[i] * t * 0.22 + grain);
    px(img, x, y, base.map((channel) => Math.max(0, Math.min(255, channel))));
  }
  for (const [x, y] of [[44, 36], [84, 73], [145, 25], [329, 48], [421, 79], [451, 32]]) disc(img, x, y, 1, A.iceL);
  oval(img, 240, 194, 210, 125, A.inkDeep); oval(img, 240, 190, 199, 113, A.stone);
  oval(img, 240, 191, 187, 102, A.stoneL); oval(img, 240, 195, 174, 91, shade(A.stone, 0.9));
  for (let y = 150; y < 280; y += 19) rect(img, 66, y, 348, 2, [...A.iceL, 45]);
  // Window ribs and balcony rail preserve the sense of an exposed lantern room.
  for (const x of [74, 126, 178, 302, 354, 406]) { rect(img, x, 56, 5, 109, A.inkDeep); rect(img, x + 2, 59, 2, 103, A.frost); }
  rect(img, 59, 258, 362, 7, A.inkDeep); rect(img, 65, 254, 350, 4, A.iceL);
  for (let x = 69; x < 416; x += 24) rect(img, x, 255, 4, 34, A.stoneL);
  for (const x of [222, 232, 242, 252]) disc(img, x, 259, 4, A.iceL);

  // The great lamp owns the room: brass carriage, faceted lens, and one pocket sunrise.
  for (let r = 72; r > 5; r -= 5) disc(img, 240, 111, r, [...A.amber, Math.max(2, 29 - r / 3)]);
  oval(img, 240, 114, 52, 18, A.inkDeep); rect(img, 203, 69, 74, 86, A.inkDeep);
  rect(img, 210, 75, 60, 72, A.amber); rect(img, 216, 80, 48, 61, A.iceL);
  for (let x = 218; x < 264; x += 9) rect(img, x, 82, 3, 56, x % 2 ? A.amberL : A.ice);
  oval(img, 240, 74, 39, 10, A.amberL); oval(img, 240, 148, 42, 11, A.woodL);
  rect(img, 235, 145, 10, 64, A.inkDeep); disc(img, 240, 205, 20, A.amber); disc(img, 240, 205, 13, A.inkDeep);
  // The loose prism is drawn outside the rigid lens grid.
  for (let i = 0; i < 9; i++) { rect(img, 275 + i, 167 + i, 13 - i, 2, [...A.violet, 175]); rect(img, 275 + i, 165 + i, 11 - i, 1, [...A.aurora, 150]); }

  // Brass telescope at the right windows, trained over the floes.
  oval(img, 382, 145, 48, 12, [...A.inkDeep, 65]);
  for (let i = 0; i < 74; i++) {
    const x = 354 + i, y = 111 - Math.round(i * 0.34);
    rect(img, x, y, 4, 15, i % 13 < 3 ? A.amberL : A.woodL);
  }
  oval(img, 427, 92, 8, 12, A.inkDeep); oval(img, 426, 92, 5, 9, A.iceL);
  rect(img, 378, 122, 7, 73, A.amber); rect(img, 350, 190, 65, 7, A.inkDeep);
  rect(img, 357, 195, 5, 35, A.wood); rect(img, 405, 195, 5, 35, A.wood);

  // Supply chest, orange storm pennant, west stair door, and the three-note wind carving.
  rrect(img, 96, 221, 69, 34, A.inkDeep); rrect(img, 102, 227, 57, 22, A.wood);
  rect(img, 124, 225, 11, 26, A.amber); disc(img, 129, 237, 3, A.amberL);
  rect(img, 113, 48, 4, 56, A.wood); rect(img, 117, 50, 35, 5, A.inkDeep); rect(img, 120, 55, 28, 17, A.ember);
  rect(img, 0, 139, 43, 42, A.inkDeep); rect(img, 0, 145, 39, 30, A.night); rect(img, 37, 151, 6, 18, A.amber);
  for (const [x, len] of [[367, 15], [389, 23], [415, 31]]) {
    rect(img, x, 266, len, 3, A.iceD); rect(img, x + 4, 263, len - 4, 1, A.iceL);
  }

  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const edge = Math.max(Math.abs(x - W / 2) / (W / 2), Math.abs(y - H / 2) / (H / 2));
    if (edge > 0.91) px(img, x, y, [...A.inkDeep, Math.round((edge - 0.91) * 125)]);
  }
  return save('room-lighthouse-gallery.png', img);
}

/* ----------------------------- TELESCOPE VISTAS (W4) ----------------- */
function vistaCanvas(seed) {
  const W = 320, H = 200, img = Img(W, H), A = ARCTIC_DUSK;
  let noise = seed >>> 0;
  const nextNoise = () => { noise = (noise * 1664525 + 1013904223) >>> 0; return noise / 0xffffffff; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = y / H;
    const base = t < 0.57
      ? A.night.map((channel, i) => channel + (A.nightL[i] - channel) * (t / 0.57))
      : A.water.map((channel) => channel * (0.67 - (t - 0.57) * 0.33));
    const grain = (nextNoise() - 0.5) * 10;
    px(img, x, y, base.map((channel) => Math.max(0, Math.min(255, channel + grain))));
  }
  for (let y = 118; y < H; y += 11) for (let x = (y * 3) % 31; x < W; x += 42) rect(img, x, y, 23, 1, [...A.iceL, 90]);
  for (const [x, y] of [[22, 28], [58, 51], [105, 21], [207, 38], [274, 19], [301, 66]]) disc(img, x, y, 1, A.iceL);
  return img;
}

function buildWhaleVista() {
  const img = vistaCanvas(0x7a11e001), A = ARCTIC_DUSK;
  // Broken floes frame a broad whale rising in one slow, readable arc.
  for (const [x, y, rx, ry] of [[44, 151, 48, 13], [267, 162, 61, 16], [136, 184, 56, 10]]) {
    oval(img, x, y, rx, ry, A.iceD); oval(img, x, y - 3, rx - 4, ry - 4, A.snowD);
  }
  oval(img, 173, 126, 27, 52, A.inkDeep); oval(img, 166, 123, 18, 43, A.nightL);
  oval(img, 157, 88, 20, 14, A.inkDeep); rect(img, 166, 90, 31, 10, A.inkDeep);
  for (let i = 0; i < 28; i++) { px(img, 141 - i, 82 - Math.round(i * 0.5), [...A.iceL, 120]); px(img, 190 + i, 82 - Math.round(i * 0.35), [...A.iceL, 110]); }
  for (let r = 24; r > 3; r -= 4) ovalRing(img, 173, 170, r * 2, Math.round(r / 2), [...A.iceL, 55], 100);
  return save(path.join('vistas', 'breaching-whale.png'), img);
}

function buildAuroraVista() {
  const img = vistaCanvas(0xa0904a11), A = ARCTIC_DUSK;
  // A crown of layered light hangs over a still pressure ridge.
  for (let x = 18; x < 304; x++) {
    const arch = 42 + Math.round(Math.cos((x - 160) / 150 * Math.PI) * 29);
    for (let y = arch; y < 111; y++) {
      const alpha = Math.max(10, Math.round(65 * (1 - (y - arch) / 77)));
      if ((x + y) % 3 === 0) px(img, x, y, [...((x / 24) % 2 < 1 ? A.aurora : A.violet), alpha]);
    }
    px(img, x, arch, x % 5 ? [...A.aurora, 165] : [...A.violet, 145]);
  }
  oval(img, 160, 165, 143, 25, A.iceD); oval(img, 160, 159, 137, 19, A.snowD);
  for (let x = 40; x < 281; x += 24) { rect(img, x, 142 - (x % 3) * 4, 3, 20 + (x % 3) * 4, A.iceL); }
  return save(path.join('vistas', 'aurora-crown.png'), img);
}

function buildGullVista() {
  const img = vistaCanvas(0x5a1ca5ea), A = ARCTIC_DUSK;
  // The Driftwood Gull under way: low work-barge hull, cargo cabin, mast, and signal pennant.
  oval(img, 177, 151, 78, 24, A.inkDeep); oval(img, 177, 145, 70, 18, shade(A.wood, 0.72));
  rect(img, 112, 123, 126, 25, A.wood); rect(img, 120, 127, 109, 16, A.woodL);
  rrect(img, 145, 104, 43, 23, A.inkDeep); rect(img, 151, 109, 31, 15, A.stone);
  rect(img, 165, 58, 6, 67, A.inkDeep); rect(img, 170, 63, 49, 5, A.woodL);
  rect(img, 172, 66, 40, 19, A.ember); rect(img, 176, 69, 32, 12, A.amber);
  for (const [x, c] of [[126, A.violet], [199, A.ice]]) { rrect(img, x, 129, 21, 15, A.inkDeep); rect(img, x + 4, 132, 13, 9, c); }
  for (let r = 40; r > 4; r -= 5) ovalRing(img, 177, 173, r * 2, Math.max(3, Math.round(r / 5)), [...A.iceL, 48], 100);
  return save(path.join('vistas', 'driftwood-gull.png'), img);
}

/* ----------------------------- Pickup glint (H4) ------------------------ */
// 12x12 walk-over coin token: warm gold dot + 4-point sparkle cross, dark outline.
function buildPickupGlint() {
  const img = Img(12, 12);
  const gold = ARCTIC_DUSK.amber, goldD = ARCTIC_DUSK.beakD, goldL = ARCTIC_DUSK.amberL;
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
  buildEddaSprite(),
  buildEddaPortrait(),
  buildPatSprite(),
  buildPatPortrait(),
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
  buildRoomCourt(),
  buildRoomWorkshop(),
  buildSalkaSprite(),
  buildSalkaPortrait(),
  buildRoomDocks(true),
  buildRoomDocks(false),
  buildMarenSprite(),
  buildMarenPortrait(),
  buildRoomLighthouseRest(),
  buildRoomLighthouseGallery(),
  buildWhaleVista(),
  buildAuroraVista(),
  buildGullVista(),
];
// The single-sheet S1 penguin.png is superseded by the layered body/belly sheets.
try { fs.rmSync(path.join(OUT, 'penguin.png')); } catch { /* already gone */ }
console.log('Generated:\n  ' + made.join('\n  '));
