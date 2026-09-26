// Pixel tools for tracing Frostbyte collision off the painted backdrops (dev-only, Node + sharp).
// Masks are Uint8Array(w*h) of 0/1 in world pixels (backdrops are 1440x960 = world size).
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const FB = path.join(ROOT, 'dominikos/frostbyte');
export const sharp = createRequire(path.join(ROOT, 'package.json'))('sharp');

export async function loadArt(asset) {
  const { data, info } = await sharp(path.join(FB, 'assets', `room-${asset}.jpg`))
    .removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { w: info.width, h: info.height, rgb: data };
}

// Painted outlines: every pixel whose brightest channel is below `threshold`.
export function darkMask(art, threshold = 110) {
  const { w, h, rgb } = art;
  const m = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const r = rgb[i * 3], g = rgb[i * 3 + 1], b = rgb[i * 3 + 2];
    if (Math.max(r, g, b) < threshold) m[i] = 1;
  }
  return m;
}

export function classify(art, fn) {
  const { w, h, rgb } = art;
  const m = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) m[i] = fn(rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2], i % w, (i / w) | 0) ? 1 : 0;
  return m;
}

function discOffsets(r) {
  const o = [];
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r + r) o.push([dx, dy]);
  return o;
}

export function dilate(m, w, h, r) {
  if (r <= 0) return m.slice();
  const out = new Uint8Array(w * h), off = discOffsets(r);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!m[y * w + x]) continue;
    for (const [dx, dy] of off) {
      const X = x + dx, Y = y + dy;
      if (X >= 0 && Y >= 0 && X < w && Y < h) out[Y * w + X] = 1;
    }
  }
  return out;
}

export const invert = (m) => m.map((v) => (v ? 0 : 1));
export const erode = (m, w, h, r) => invert(dilate(invert(m), w, h, r));
export const close = (m, w, h, r) => erode(dilate(m, w, h, r), w, h, r);
export const open = (m, w, h, r) => dilate(erode(m, w, h, r), w, h, r);
export const or = (a, b) => a.map((v, i) => (v || b[i] ? 1 : 0));
export const andNot = (a, b) => a.map((v, i) => (v && !b[i] ? 1 : 0));

export function drawLine(m, w, h, [x0, y0, x1, y1], val = 1, thick = 2) {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2) + 1;
  for (let i = 0; i <= n; i++) {
    const cx = x0 + ((x1 - x0) * i) / n, cy = y0 + ((y1 - y0) * i) / n;
    for (let dy = -thick; dy <= thick; dy++) for (let dx = -thick; dx <= thick; dx++) {
      const X = Math.round(cx + dx), Y = Math.round(cy + dy);
      if (X >= 0 && Y >= 0 && X < w && Y < h) m[Y * w + X] = val;
    }
  }
}

export function fillPolygon(m, w, h, pts, val = 1) {
  const ys = pts.map((p) => p[1]);
  for (let y = Math.max(0, Math.floor(Math.min(...ys))); y <= Math.min(h - 1, Math.ceil(Math.max(...ys))); y++) {
    const cy = y + 0.5, xs = [];
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > cy) !== (yj > cy)) xs.push(xi + ((cy - yi) * (xj - xi)) / (yj - yi));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      for (let x = Math.max(0, Math.ceil(xs[k] - 0.5)); x <= Math.min(w - 1, Math.floor(xs[k + 1] - 0.5)); x++) m[y * w + x] = val;
    }
  }
}

// 4-connected component of `m` (value 1) containing `seed`, restricted to an optional box.
export function component(m, w, h, [sx, sy], box = [0, 0, w - 1, h - 1]) {
  const out = new Uint8Array(w * h);
  const [bx0, by0, bx1, by1] = box;
  if (!m[sy * w + sx]) return out;
  const stack = [sy * w + sx];
  out[sy * w + sx] = 1;
  while (stack.length) {
    const i = stack.pop(), x = i % w, y = (i / w) | 0;
    for (const [X, Y] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      if (X < bx0 || Y < by0 || X > bx1 || Y > by1) continue;
      const j = Y * w + X;
      if (m[j] && !out[j]) { out[j] = 1; stack.push(j); }
    }
  }
  return out;
}

// Boundary loops of a mask along pixel cracks (vertices on pixel corners). Each loop runs with the
// inside on its right in screen space; the outer loop has positive shoelace area, holes negative.
export function traceLoops(m, w, h) {
  const at = (x, y) => (x >= 0 && y >= 0 && x < w && y < h ? m[y * w + x] : 0);
  const next = new Map();
  const key = (x, y) => y * (w + 1) + x;
  const add = (ax, ay, bx, by) => {
    const k = key(ax, ay);
    (next.get(k) ?? next.set(k, []).get(k)).push([bx, by]);
  };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!m[y * w + x]) continue;
    if (!at(x, y - 1)) add(x, y, x + 1, y);
    if (!at(x + 1, y)) add(x + 1, y, x + 1, y + 1);
    if (!at(x, y + 1)) add(x + 1, y + 1, x, y + 1);
    if (!at(x - 1, y)) add(x, y + 1, x, y);
  }
  const loops = [];
  for (const [k0, outs] of next) {
    while (outs.length) {
      const sx = k0 % (w + 1), sy = (k0 / (w + 1)) | 0;
      const loop = [[sx, sy]];
      let [cx, cy] = outs.pop(), [px, py] = [sx, sy];
      while (!(cx === sx && cy === sy)) {
        loop.push([cx, cy]);
        const cand = next.get(key(cx, cy));
        let pick = 0;
        if (cand.length > 1) {   // pinch vertex: take the right-most turn so loops stay simple
          const dx = cx - px, dy = cy - py;
          pick = cand.findIndex(([nx, ny]) => (nx - cx) === -dy && (ny - cy) === dx);
          if (pick < 0) pick = 0;
        }
        const [nx, ny] = cand.splice(pick, 1)[0];
        [px, py] = [cx, cy];
        [cx, cy] = [nx, ny];
      }
      loops.push(loop);
    }
  }
  return loops.map((pts) => ({ pts, area: shoelace(pts) }));
}

export function shoelace(pts) {
  let a = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) a += pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1];
  return a / 2;
}

function dpOpen(pts, eps) {
  if (pts.length < 3) return pts;
  const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1];
  const L = Math.hypot(bx - ax, by - ay) || 1;
  let best = -1, bi = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs((bx - ax) * (ay - pts[i][1]) - (ax - pts[i][0]) * (by - ay)) / L;
    if (d > best) { best = d; bi = i; }
  }
  if (best <= eps) return [pts[0], pts[pts.length - 1]];
  return [...dpOpen(pts.slice(0, bi + 1), eps).slice(0, -1), ...dpOpen(pts.slice(bi), eps)];
}

// Douglas-Peucker for a closed loop, split at the two mutually farthest-ish vertices.
export function simplify(loop, eps) {
  let far = 0, fd = -1;
  for (let i = 0; i < loop.length; i++) {
    const d = Math.hypot(loop[i][0] - loop[0][0], loop[i][1] - loop[0][1]);
    if (d > fd) { fd = d; far = i; }
  }
  const a = dpOpen(loop.slice(0, far + 1), eps), b = dpOpen([...loop.slice(far), loop[0]], eps);
  return [...a.slice(0, -1), ...b.slice(0, -1)];
}

export function outerLoop(m, w, h) {
  const loops = traceLoops(m, w, h).filter((l) => l.area > 0).sort((a, b) => b.area - a.area);
  return loops[0]?.pts ?? [];
}

export function holeLoops(m, w, h, minArea = 60) {
  return traceLoops(m, w, h).filter((l) => l.area < -minArea).map((l) => l.pts);
}

export function bbox(m, w, h) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (m[y * w + x]) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return [x0, y0, x1, y1];
}

export function convexHull(points) {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [], upper = [];
  for (const q of p) { while (lower.length >= 2 && cross(lower.at(-2), lower.at(-1), q) <= 0) lower.pop(); lower.push(q); }
  for (const q of p.reverse()) { while (upper.length >= 2 && cross(upper.at(-2), upper.at(-1), q) <= 0) upper.pop(); upper.push(q); }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}
