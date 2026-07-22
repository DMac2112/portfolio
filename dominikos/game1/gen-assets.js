// gen-assets.js — generates all pixel-art assets for the game (no dependencies).
// Run:  node game/gen-assets.js   → writes PNGs into game/assets/
// Everything here is hand-generated pixel art (CC0 / original), so there are no licensing concerns.
const fs = require("fs");
const zlib = require("zlib");
const path = require("path");

const OUT = path.join(__dirname, "assets");
fs.mkdirSync(OUT, { recursive: true });

/* ----------------------------- PNG encoder ----------------------------- */
const CRC = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, "ascii");
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
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
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

// tiny seeded PRNG for repeatable texture
let SEED = 1337;
function rnd() { SEED = (SEED * 1103515245 + 12345) & 0x7fffffff; return SEED / 0x7fffffff; }

/* ----------------------------- palette --------------------------------- */
const C = {
  out: [26, 19, 32], grass: [86, 150, 78], grassD: [70, 130, 64], grassL: [110, 176, 96],
  dirt: [196, 162, 110], dirtD: [172, 138, 90], dirtL: [214, 184, 132],
  wood: [150, 104, 58], woodD: [110, 74, 40], cork: [201, 162, 104],
  paper: [248, 246, 236], glass: [255, 214, 110], skin: [255, 207, 168], skinD: [226, 170, 132],
  hair: [70, 48, 38], shoe: [40, 40, 52], stone: [150, 156, 170], stoneD: [110, 116, 132],
  cyan: [110, 226, 230], red: [214, 80, 80], blue: [70, 110, 210],
};
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const shade = (c, f) => [Math.max(0, Math.min(255, c[0] * f)), Math.max(0, Math.min(255, c[1] * f)), Math.max(0, Math.min(255, c[2] * f))];

/* ----------------------------- MAP (ground) ---------------------------- */
const COLS = 64, ROWS = 16, T = 16;
function buildMap() {
  const img = Img(COLS * T, ROWS * T);
  const pathTop = 7, pathBot = 9; // rows of the dirt street
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const onPath = r >= pathTop && r <= pathBot;
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      let col;
      if (onPath) { col = C.dirt; const n = rnd(); if (n > 0.86) col = C.dirtD; else if (n > 0.72) col = C.dirtL; }
      else { col = C.grass; const n = rnd(); if (n > 0.9) col = C.grassD; else if (n > 0.78) col = C.grassL; }
      px(img, c * T + x, r * T + y, col);
    }
    // soft edge between grass and path
    if (r === pathTop - 1) rect(img, c * T, r * T + T - 2, T, 2, shade(C.dirt, 0.85));
    if (r === pathBot + 1) rect(img, c * T, r * T, T, 2, shade(C.dirt, 0.85));
  }
  // scatter scenery on grass (avoid the path rows)
  const grassRows = [...Array(ROWS).keys()].filter(r => r < pathTop - 1 || r > pathBot + 1);
  for (let i = 0; i < 90; i++) {
    const c = (rnd() * COLS) | 0, r = grassRows[(rnd() * grassRows.length) | 0];
    const X = c * T + ((rnd() * 10) | 0) + 3, Y = r * T + ((rnd() * 10) | 0) + 3;
    const k = rnd();
    if (k > 0.8) { // little tree
      disc(img, X, Y - 2, 4, shade(C.grass, 0.7)); disc(img, X, Y - 3, 3, C.grassL); rect(img, X - 1, Y + 1, 2, 4, C.woodD);
    } else if (k > 0.5) { // bush
      disc(img, X, Y, 3, shade(C.grass, 0.78)); disc(img, X - 1, Y, 2, C.grassD);
    } else { // flower
      const fc = [[255, 120, 140], [255, 214, 110], [150, 150, 240], [255, 255, 255]][(rnd() * 4) | 0];
      px(img, X, Y, fc); px(img, X + 1, Y, fc); px(img, X, Y + 1, fc); px(img, X + 1, Y + 1, fc); px(img, X, Y - 1, shade(C.grass, 0.6));
    }
  }
  return save("map.png", img);
}

/* ----------------------------- CHARACTER ------------------------------- */
// 4 frames x 3 rows (row0 down, row1 side-right, row2 up), 16x16 cells.
function buildCharacter(bodyHex) {
  const body = hex(bodyHex), bodyD = shade(body, 0.72), bodyL = shade(body, 1.18);
  const CW = 16, CH = 16, FR = 4, ROWSC = 3;
  const img = Img(CW * FR, CH * ROWSC);
  function cell(fx, fy, draw) { draw((x, y, c) => px(img, fx * CW + x, fy * CH + y, c)); }
  // leg offsets per walk frame: [still, stepA, still, stepB]
  const legA = [0, -1, 0, 1];
  for (let f = 0; f < FR; f++) {
    const la = legA[f], lb = -legA[f];
    // ---- DOWN ----
    cell(f, 0, (p) => {
      for (let x = -5; x <= 5; x++) p(8 + x, 14, [0, 0, 0, 60]); // shadow
      // body capsule
      drawBody(p, body, bodyD, bodyL);
      // hood/hair top
      rect2(p, 5, 1, 6, 3, C.hair);
      // face
      rrect2(p, 5, 4, 6, 4, C.skin);
      p(6, 5, C.out); p(9, 5, C.out); // eyes
      p(7, 7, C.skinD); p(8, 7, C.skinD); // mouth/chin
      // feet
      foot(p, 5, 14 + la); foot(p, 9, 14 + lb);
    });
    // ---- SIDE (facing right) ----
    cell(f, 1, (p) => {
      for (let x = -5; x <= 5; x++) p(8 + x, 14, [0, 0, 0, 60]);
      drawBody(p, body, bodyD, bodyL);
      rect2(p, 5, 1, 6, 3, C.hair);
      // face on the right side
      rrect2(p, 7, 4, 4, 4, C.skin);
      p(9, 5, C.out); // single eye
      p(8, 7, C.skinD);
      // little backpack hint on the left
      rect2(p, 4, 6, 2, 4, bodyD);
      foot(p, 6 + la, 14); foot(p, 8 + lb, 14);
    });
    // ---- UP (back) ----
    cell(f, 2, (p) => {
      for (let x = -5; x <= 5; x++) p(8 + x, 14, [0, 0, 0, 60]);
      drawBody(p, body, bodyD, bodyL);
      rect2(p, 5, 1, 6, 4, C.hair); // back of head = hair
      p(6, 4, shade(C.hair, 1.3)); p(9, 4, shade(C.hair, 1.3));
      foot(p, 5, 14 + la); foot(p, 9, 14 + lb);
    });
  }
  function drawBody(p, b, bd, bl) {
    // capsule x4..11, y3..13
    rrect2(p, 4, 3, 8, 11, b);
    rect2(p, 4, 3, 2, 11, bd);   // left shade
    rect2(p, 10, 3, 1, 11, bl);  // right light
    // outline
    outlineShape(p, 4, 3, 8, 11);
  }
  function foot(p, x, y) { rect2(p, x, y, 3, 2, C.shoe); }
  function rect2(p, x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) p(x + i, y + j, c); }
  function rrect2(p, x, y, w, h, c) { rect2(p, x + 1, y, w - 2, h, c); rect2(p, x, y + 1, w, h - 2, c); }
  function outlineShape(p, x, y, w, h) {
    for (let i = 0; i < w; i++) { p(x + i, y - 0, C.out); p(x + i, y + h - 1, C.out); }
    for (let j = 0; j < h; j++) { p(x - 0, y + j, C.out); p(x + w - 1, y + j, C.out); }
  }
  return save("character.png", img);
}

/* ----------------------------- BUILDINGS ------------------------------- */
function buildBuilding(name, w, h, mainHex) {
  const m = hex(mainHex), mD = shade(m, 0.78), mL = shade(m, 1.12);
  const img = Img(w, h);
  // wall
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let c = m; if (x < 2) c = mD; else if (x > w - 3) c = mL;
    px(img, x, y, c);
  }
  // roof band + eave line
  rect(img, 0, 0, w, 7, shade(m, 0.6));
  rect(img, 0, 6, w, 1, shade(m, 0.42));
  // outline
  for (let y = 0; y < h; y++) { px(img, 0, y, C.out); px(img, w - 1, y, C.out); }
  for (let x = 0; x < w; x++) { px(img, x, 0, C.out); px(img, x, h - 1, C.out); }

  // door — centered, framed, with panels, knob and a step (drawn flush to the ground)
  const dw = 10, dh = 15, dx = ((w - dw) / 2) | 0, dy = h - dh;
  rect(img, dx - 1, dy - 1, dw + 2, dh + 1, C.out);          // frame
  rect(img, dx, dy, dw, dh, C.wood);                          // door
  rect(img, dx, dy, 2, dh, C.woodD);                          // hinge-side shade
  rect(img, dx + 2, dy + 2, dw - 4, 1, C.woodD);              // upper panel line
  rect(img, dx + 2, dy + (dh >> 1), dw - 4, 1, C.woodD);      // mid panel line
  px(img, dx + dw - 3, dy + (dh >> 1) - 1, C.glass);          // knob
  px(img, dx + dw - 3, dy + (dh >> 1), shade(C.glass, 0.7));
  rect(img, dx - 2, h - 2, dw + 4, 2, shade(m, 0.5));         // doorstep

  // windows — rows strictly above the door, centered grid (never overlap the door)
  const winBottom = dy - 3;
  for (let wy = 10; wy + 8 <= winBottom; wy += 12) {
    for (let wx = 4; wx <= w - 10; wx += 10) {
      rect(img, wx, wy, 7, 8, C.out);
      rect(img, wx + 1, wy + 1, 5, 6, C.glass);
      rect(img, wx + 1, wy + 1, 5, 1, shade(C.glass, 1.25));
      rect(img, wx + 3, wy + 1, 1, 6, shade(C.glass, 0.78)); // mullion
    }
  }
  return save(`build_${name}.png`, img);
}

/* ----------------------------- PROPS ----------------------------------- */
function buildSignpost() {
  const img = Img(16, 22);
  rect(img, 7, 9, 2, 12, C.woodD); // post
  rect(img, 7, 9, 1, 12, C.wood);
  rrect(img, 2, 2, 12, 9, C.wood); // board
  for (let x = 2; x < 14; x++) { px(img, x, 2, C.out); px(img, x, 10, C.out); }
  for (let y = 2; y < 11; y++) { px(img, 2, y, C.out); px(img, 13, y, C.out); }
  rect(img, 4, 4, 8, 1, C.woodD); rect(img, 4, 7, 6, 1, C.woodD); // text lines
  px(img, 3, 3, [255, 255, 255, 120]); px(img, 12, 3, [255, 255, 255, 120]); // nails
  return save("signpost.png", img);
}
function buildCorkboard() {
  const img = Img(18, 16);
  rrect(img, 0, 0, 18, 16, C.woodD);          // frame
  rect(img, 2, 2, 14, 12, C.cork);            // cork
  rrect(img, 4, 3, 9, 10, C.paper);           // note
  rect(img, 5, 5, 7, 1, C.stoneD); rect(img, 5, 7, 7, 1, C.stoneD); rect(img, 5, 9, 5, 1, C.stoneD);
  px(img, 8, 3, C.red); px(img, 8, 4, shade(C.red, 0.7)); // pin
  return save("corkboard.png", img);
}
function buildMailbox() {
  const img = Img(16, 18);
  rect(img, 7, 8, 2, 10, C.woodD); // post
  rrect(img, 2, 2, 12, 8, C.blue); // box
  rect(img, 2, 2, 12, 1, shade(C.blue, 1.3));
  for (let x = 2; x < 14; x++) { px(img, x, 2, C.out); px(img, x, 9, C.out); }
  for (let y = 2; y < 10; y++) { px(img, 2, y, C.out); px(img, 13, y, C.out); }
  rect(img, 4, 5, 8, 2, C.out); // slot
  rect(img, 13, 1, 2, 4, C.red); // flag
  return save("mailbox.png", img);
}
function buildPortal() {
  const img = Img(22, 26);
  // stone arch
  for (let y = 0; y < 26; y++) for (let x = 0; x < 22; x++) {
    const inArch = (x >= 5 && x <= 16 && y >= 9) || (Math.hypot(x - 10.5, y - 9) <= 6 && Math.hypot(x - 10.5, y - 9) >= 0);
  }
  rrect(img, 1, 1, 20, 25, C.stoneD);
  rrect(img, 2, 2, 18, 24, C.stone);
  // glowing doorway
  for (let y = 8; y < 25; y++) for (let x = 6; x < 16; x++) {
    const t = (y - 8) / 17; px(img, x, y, [C.cyan[0] * (0.5 + t * 0.5), C.cyan[1] * (0.5 + t * 0.5), C.cyan[2], 230]);
  }
  disc(img, 10, 8, 5, C.stone); rect(img, 6, 8, 10, 2, shade(C.cyan, 1.2));
  for (let x = 6; x < 16; x++) px(img, x, 24, shade(C.cyan, 1.4));
  return save("portal.png", img);
}

/* ----------------------------- run ------------------------------------- */
const made = [
  buildMap(),
  buildCharacter("#5b6ee1"),
  buildBuilding("ou", 32, 54, "#8a7dff"),
  buildBuilding("norbert", 32, 46, "#3fb6a8"),
  buildBuilding("rubicall", 34, 58, "#4f9dde"),
  buildBuilding("welcominn", 34, 60, "#e0915b"),
  buildBuilding("deloitte", 38, 80, "#86bc25"),
  buildBuilding("projects", 34, 56, "#a06bd0"),
  buildSignpost(),
  buildCorkboard(),
  buildMailbox(),
  buildPortal(),
];
console.log("Generated:\n  " + made.join("\n  "));
