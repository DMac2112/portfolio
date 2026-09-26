// Traces Frostbyte room collision + occluders off the painted backdrops.
//   node scripts/frostbyte-art/trace.mjs [room-plaza room-court ...]   (default: every room in rooms.mjs)
// Writes, per backdrop:
//   dominikos/frostbyte/world/ground/<asset>.js    GROUND polygon, HOLES (obstacles), OCCLUDERS
//   dominikos/frostbyte/assets/occluders/<asset>.png   the props' painted pixels on transparency
//   $TRACE_OUT/trace-<asset>.png                     review overlay (green ground, blue props, red footprints)
//
// Ground: painted outlines (dark pixels) are walls; flood from a seed, smooth, keep the seed's piece.
// Props (lamps, benches, fences...): only their footprint (the bottom `depth` px) blocks; the ground
// the prop hides is walkable again, and the prop's pixels are redrawn over anyone standing behind it
// (occluder sprite at z = the footprint's bottom, same y-sort as the avatars).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  FB, sharp, loadArt, darkMask, classify, dilate, invert, close, open, or, drawLine, fillPolygon,
  component, simplify, traceLoops, bbox,
} from './art.mjs';
import { ROOMS } from './rooms.mjs';
// (config format: see rooms.mjs; per-room files in ./rooms/)

const OUT = process.env.TRACE_OUT ?? os.tmpdir();
const REACH = 14;   // how far past a prop's edge the ground must continue for it to count as "behind"

const rectPoly = (p) => (p.length === 4 && typeof p[0] === 'number'
  ? [[p[0], p[1]], [p[2], p[1]], [p[2], p[3]], [p[0], p[3]]] : p);

function snap(m, w, h, [sx, sy], want = 1, r = 12) {
  for (let d = 0; d <= r; d++) for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) {
    const x = sx + dx, y = sy + dy;
    if (x >= 0 && y >= 0 && x < w && y < h && m[y * w + x] === want) return [x, y];
  }
  throw new Error(`no ${want ? 'open' : 'wall'} pixel near ${sx},${sy}`);
}

// Pixels of the box NOT reachable from its border without crossing a painted outline.
function enclosed(walls, w, h, [x0, y0, x1, y1]) {
  const bg = new Uint8Array(w * h), stack = [];
  const push = (x, y) => { const i = y * w + x; if (!walls[i] && !bg[i]) { bg[i] = 1; stack.push(i); } };
  for (let x = x0; x <= x1; x++) { push(x, y0); push(x, y1); }
  for (let y = y0; y <= y1; y++) { push(x0, y); push(x1, y); }
  while (stack.length) {
    const i = stack.pop(), x = i % w, y = (i / w) | 0;
    if (x > x0) push(x - 1, y); if (x < x1) push(x + 1, y);
    if (y > y0) push(x, y - 1); if (y < y1) push(x, y + 1);
  }
  const fg = new Uint8Array(w * h);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (!bg[y * w + x]) fg[y * w + x] = 1;
  return fg;
}

function silhouette(prop, ctx) {
  const { w, h, ground, outline } = ctx;
  let template = null;
  if (prop.shape) {
    template = new Uint8Array(w * h);
    for (const p of prop.shape) fillPolygon(template, w, h, rectPoly(p), 1);
    const [x0, y0, x1, y1] = bbox(template, w, h);
    prop.box ??= [x0 - 4, y0 - 4, x1 + 4, y1 + 4];
  }
  const box = prop.box.map((v, i) => Math.max(0, Math.min(i % 2 ? h - 1 : w - 1, v)));
  // Soft painted shapes (tree canopies) have no closed outline: the measured polygon IS the prop.
  if (prop.exact && template) return template;
  let fg;
  if (prop.mode === 'ground') {
    // Standing free in open snow: the prop is simply everything in its box that isn't ground.
    fg = new Uint8Array(w * h);
    for (let y = box[1]; y <= box[3]; y++) for (let x = box[0]; x <= box[2]; x++) fg[y * w + x] = ground[y * w + x] ? 0 : 1;
  } else {
    const walls = outline.slice();
    for (const c of prop.cuts ?? []) drawLine(walls, w, h, c, 0, 1);
    fg = enclosed(walls, w, h, box);
  }
  // A measured template bounds props painted against dark trees/walls the outline can't split off.
  if (template) fg = fg.map((v, i) => v & template[i]);
  for (const c of prop.trim ?? []) fillPolygon(fg, w, h, rectPoly(c), 0);
  const seed = snap(fg, w, h, prop.seed ?? [(box[0] + box[2]) >> 1, (box[1] + box[3]) >> 1]);
  // Seal the lantern glass and other glow gaps in the outline, so the whole prop is one cut-out.
  // (A template needs no connectivity: a lantern may hang off a hairline hook.)
  const S = template ? fg : component(fg, w, h, seed, box);
  const sealed = enclosed(close(S, w, h, 2), w, h, box);
  return template ? sealed.map((v, i) => v & template[i]) : component(sealed, w, h, seed, box);
}

function footprintOf(S, prop, w, h) {
  const [x0, y0, x1, y1] = bbox(S, w, h);
  const F = new Uint8Array(w * h), depth = prop.depth ?? 12;
  if (prop.footprint) { fillPolygon(F, w, h, rectPoly(prop.footprint)); return F.map((v, i) => v && S[i]); }
  for (let x = x0; x <= x1; x++) {
    let colMax = -1;
    if (prop.mode === 'column' || prop.mode === 'ground') {
      for (let y = y1; y >= y0; y--) if (S[y * w + x]) { colMax = y; break; }
    } else colMax = y1;
    if (colMax < 0) continue;
    for (let y = Math.max(y0, colMax - depth + 1); y <= colMax; y++) if (S[y * w + x]) F[y * w + x] = 1;
  }
  return F;
}

// Ground hidden behind the prop: every row/column run of non-ground that crosses the prop and has
// ground on both ends (a lamp head over a building wall has wall, not ground, beside it).
function behindOf(S, ground, w, h) {
  const B = new Uint8Array(w * h);
  const [x0, y0, x1, y1] = bbox(S, w, h).map((v, i) => (i < 2 ? Math.max(0, v - REACH) : Math.min(i === 2 ? w - 1 : h - 1, v + REACH)));
  const scan = (lo, hi, idx) => {
    for (let a = lo; a <= hi; a++) {
      if (ground[idx(a)]) continue;
      let b = a, prop = 0;
      while (b + 1 <= hi && !ground[idx(b + 1)]) b++;
      for (let i = a; i <= b; i++) prop += S[idx(i)];
      if (prop && a > lo && b < hi && b - a + 1 - prop <= 2 * REACH) for (let i = a; i <= b; i++) B[idx(i)] = 1;
      a = b;
    }
  };
  for (let y = y0; y <= y1; y++) scan(x0, x1, (x) => y * w + x);
  for (let x = x0; x <= x1; x++) scan(y0, y1, (y) => y * w + x);
  return B;
}

function occluderPieces(S, prop, w, h) {
  const [x0, y0, x1, y1] = bbox(S, w, h);
  if (prop.mode !== 'column' && prop.mode !== 'ground') return [[x0, y0, x1 - x0 + 1, y1 - y0 + 1, prop.z ?? y1]];
  const pieces = [], step = prop.strip ?? 20;
  for (let sx = x0; sx <= x1; sx += step) {
    const ex = Math.min(x1, sx + step - 1);
    let top = h, bot = -1;
    for (let y = y0; y <= y1; y++) for (let x = sx; x <= ex; x++) if (S[y * w + x]) { top = Math.min(top, y); bot = Math.max(bot, y); }
    if (bot >= 0) pieces.push([sx, top, ex - sx + 1, bot - top + 1, bot]);
  }
  return pieces;
}

const r1 = (v) => Math.round(v);
const fmtPts = (pts) => `[${pts.map(([x, y]) => `[${r1(x)}, ${r1(y)}]`).join(', ')}]`;
const wrap = (s, n = 110) => s.replace(new RegExp(`(.{1,${n}})(, |$)`, 'g'), '\n  $1,').replace(/,,/g, ',');

async function trace(asset, cfg) {
  const art = await loadArt(asset.replace(/^room-/, ''));
  const { w, h } = art;
  const dark = darkMask(art, cfg.threshold ?? 110);
  let walls = dilate(dark, w, h, cfg.dilate ?? 2);
  if (cfg.walkColor) walls = or(walls, classify(art, (...c) => !cfg.walkColor(...c)));
  if (cfg.thinWalls) walls = open(walls, w, h, cfg.thinWalls);
  if (cfg.wallColor) walls = or(walls, classify(art, cfg.wallColor));
  if (cfg.area) {
    const inside = new Uint8Array(w * h);
    fillPolygon(inside, w, h, rectPoly(cfg.area));
    walls = walls.map((v, i) => v | (inside[i] ^ 1));
  }
  for (const l of cfg.barriers ?? []) drawLine(walls, w, h, l, 1, 2);
  for (const p of cfg.block ?? []) fillPolygon(walls, w, h, rectPoly(p), 1);
  for (const p of cfg.carve ?? []) fillPolygon(walls, w, h, rectPoly(p), 0);

  const seed = snap(invert(walls), w, h, cfg.seed);
  let ground = component(invert(walls), w, h, seed);
  ground = open(close(ground, w, h, cfg.close ?? 3), w, h, cfg.open ?? 4);
  for (const p of cfg.walk ?? []) fillPolygon(ground, w, h, rectPoly(p), 1);
  for (const p of cfg.block ?? []) fillPolygon(ground, w, h, rectPoly(p), 0);
  ground = component(ground, w, h, snap(ground, w, h, cfg.seed));

  const ctx = { w, h, ground, outline: dilate(dark, w, h, 1) };
  const props = new Uint8Array(w * h), feet = new Uint8Array(w * h), extra = new Uint8Array(w * h);
  const occluders = [];
  for (const prop of cfg.props ?? []) {
    const S = silhouette(prop, ctx);
    const F = footprintOf(S, prop, w, h);
    const B = behindOf(S, ground, w, h);
    for (let i = 0; i < w * h; i++) {
      if (S[i]) props[i] = 1;
      if (F[i]) feet[i] = 1;
      if (B[i]) extra[i] = 1;
    }
    for (const piece of occluderPieces(S, prop, w, h)) occluders.push({ id: prop.id, piece });
  }
  let walk = ground.map((v, i) => ((v || extra[i]) && !feet[i] ? 1 : 0));
  walk = component(walk, w, h, snap(walk, w, h, cfg.seed));

  const loops = traceLoops(walk, w, h);
  const outer = loops.filter((l) => l.area > 0).sort((a, b) => b.area - a.area)[0].pts;
  const holes = loops.filter((l) => l.area < -(cfg.minHole ?? 40)).map((l) => l.pts);
  const GROUND = simplify(outer, cfg.eps ?? 2.5);
  const HOLES = holes.map((pts) => {
    const s = simplify(pts, cfg.holeEps ?? 1.5);
    const [cx, cy] = [s.reduce((a, p) => a + p[0], 0) / s.length, s.reduce((a, p) => a + p[1], 0) / s.length];
    const named = Object.entries(cfg.holeNames ?? {}).find(([, [px, py]]) => {
      const m = new Uint8Array(w * h); fillPolygon(m, w, h, s); return m[py * w + px];
    });
    const owner = (cfg.props ?? []).find((p) => cx >= p.box[0] && cx <= p.box[2] && cy >= p.box[1] && cy <= p.box[3]);
    return { id: named?.[0] ?? owner?.id ?? `outline-${r1(cx)}-${r1(cy)}`, points: s };
  });

  const rel = `scripts/frostbyte-art/rooms.mjs`;
  const js = `// GENERATED by scripts/frostbyte-art/trace.mjs from assets/${asset}.jpg. Do not hand-edit:
// change ${rel} and re-run \`node scripts/frostbyte-art/trace.mjs ${asset}\`.
// GROUND: the painted walkable ground. HOLES: painted things standing in it (props block only at
// their footprint). OCCLUDERS: [x, y, w, h, z] cut-outs of assets/occluders/${asset}.png drawn over
// anyone whose feet are above z (behind the prop).
export const GROUND = [${wrap(GROUND.map(([x, y]) => `[${r1(x)}, ${r1(y)}]`).join(', '))}
];

export const HOLES = [
${HOLES.map((o) => `  { id: '${o.id}', points: ${fmtPts(o.points)} },`).join('\n')}
];

export const OCCLUDERS = [
${occluders.map((o) => `  [${o.piece.join(', ')}], // ${o.id}`).join('\n')}
];
`;
  fs.mkdirSync(path.join(FB, 'world/ground'), { recursive: true });
  fs.writeFileSync(path.join(FB, 'world/ground', `${asset}.js`), js);

  fs.mkdirSync(path.join(FB, 'assets/occluders'), { recursive: true });
  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) if (props[i]) {
    rgba[i * 4] = art.rgb[i * 3]; rgba[i * 4 + 1] = art.rgb[i * 3 + 1]; rgba[i * 4 + 2] = art.rgb[i * 3 + 2]; rgba[i * 4 + 3] = 255;
  }
  if (occluders.length) {
    await sharp(rgba, { raw: { width: w, height: h, channels: 4 } }).png({ compressionLevel: 9, palette: false })
      .toFile(path.join(FB, 'assets/occluders', `${asset}.png`));
  }

  const ov = Buffer.alloc(w * h * 3);
  const holeMask = new Uint8Array(w * h);
  for (const o of HOLES) fillPolygon(holeMask, w, h, o.points);
  const inGround = new Uint8Array(w * h);
  fillPolygon(inGround, w, h, GROUND);
  for (let i = 0; i < w * h; i++) {
    let [r, g, b] = [art.rgb[i * 3] * 0.55, art.rgb[i * 3 + 1] * 0.55, art.rgb[i * 3 + 2] * 0.55];
    if (inGround[i] && !holeMask[i]) { r = r * 0.6; g = g * 0.6 + 100; b = b * 0.6 + 40; }
    if (props[i]) { r = r * 0.5 + 30; g = g * 0.5 + 60; b = b * 0.5 + 140; }
    if (feet[i] || (holeMask[i] && inGround[i])) { r = 230; g = 40; b = 40; }
    ov[i * 3] = Math.min(255, r); ov[i * 3 + 1] = Math.min(255, g); ov[i * 3 + 2] = Math.min(255, b);
  }
  const scale = Number(process.env.TRACE_SCALE ?? 0.5);
  await sharp(ov, { raw: { width: w, height: h, channels: 3 } }).resize(Math.round(w * scale))
    .png().toFile(path.join(OUT, `trace-${asset}.png`));
  console.log(`${asset}: ground ${GROUND.length} pts, ${HOLES.length} holes (${HOLES.map((o) => o.id).join(', ')}), ${occluders.length} occluder pieces`);
}

const want = process.argv.slice(2);
for (const asset of want.length ? want : Object.keys(ROOMS)) {
  if (!ROOMS[asset]) throw new Error(`no trace config for ${asset}`);
  await trace(asset, ROOMS[asset]);
}

// Index of every traced backdrop, keyed by mapAsset.
const dir = path.join(FB, 'world/ground');
const traced = fs.readdirSync(dir).filter((f) => /^room-.*\.js$/.test(f)).map((f) => f.slice(0, -3)).sort();
const ident = (a) => a.replace(/^room-/, '').replace(/-(\w)/g, (_, c) => c.toUpperCase());
fs.writeFileSync(path.join(dir, 'index.js'), `// GENERATED by scripts/frostbyte-art/trace.mjs: every traced backdrop, keyed by mapAsset.
${traced.map((a) => `import * as ${ident(a)} from './${a}.js';`).join('\n')}

export const TRACED_ART = {
${traced.map((a) => `  '${a}': ${ident(a)},`).join('\n')}
};
`);
