// Pixel-aligned room collision profiles. Coordinates mirror gen-assets.js at the room's x3 scale;
// content/rooms.js remains the frozen interaction/spawn contract.
import { clampToBounds, resolveObstacles } from '../engine/movement.js';

const PROFILES = {
  plaza: {
    boundary: { type: 'rect', x0: 0, x1: 1440, y0: 0, y1: 960 },
    obstacles: [
      { type: 'ellipse', x: 792, y: 264, rx: 120, ry: 87 },
      { type: 'capsule', ax: 357, ay: 279, bx: 459, by: 279, r: 9 },
      { type: 'capsule', ax: 501, ay: 711, bx: 603, by: 711, r: 9 },
      { type: 'capsule', ax: 552, ay: 306, bx: 552, by: 366, r: 5 },
      { type: 'capsule', ax: 954, ay: 351, bx: 954, by: 411, r: 5 },
      { type: 'capsule', ax: 507, ay: 570, bx: 507, by: 630, r: 5 },
      { type: 'capsule', ax: 909, ay: 597, bx: 909, by: 657, r: 5 },
      { type: 'ellipse', x: -10, y: -10, rx: 160, ry: 130 },
      { type: 'ellipse', x: 1450, y: -10, rx: 160, ry: 130 },
      { type: 'ellipse', x: -10, y: 970, rx: 160, ry: 130 },
      { type: 'ellipse', x: 1450, y: 970, rx: 160, ry: 130 },
      { type: 'rect', x: -35.5, y: 364.5, w: 329, h: 183 },
      { type: 'rect', x: 1484, y: 453, w: 311, h: 210 },
      { type: 'rect', x: 637.5, y: -21.5, w: 87, h: 277 },
      { type: 'rect', x: 802.5, y: -21.5, w: 87, h: 277 },
      { type: 'circle', x: 720, y: 975, r: 153, opening: { x0: 678, x1: 762, y0: 800 } },
      { type: 'roundRect', x: 102, y: 561, w: 132, h: 78, r: 12 },
      { type: 'circle', x: 1128, y: 555, r: 72 },
      { type: 'roundRect', x: 168, y: 789, w: 120, h: 93, r: 8 },
      { type: 'capsule', ax: 1032, ay: 720, bx: 1032, by: 795, r: 22 },
    ],
  },
  den: {
    boundary: {
      type: 'circleDoor', x: 720, y: 480, r: 381,
      door: { x0: 675, x1: 765, y0: 790, y1: 960 },
    },
    obstacles: [
      { type: 'ellipse', x: 720, y: 240, rx: 63, ry: 63 },
      { type: 'roundRect', x: 942, y: 564, w: 60, h: 60, r: 9 },
    ],
  },
  trail: {
    boundary: { type: 'rect', x0: 0, x1: 1440, y0: 168, y1: 960 },
    obstacles: [
      { type: 'roundRect', x: 720, y: 91, w: 300, h: 382, r: 30 },
      { type: 'ellipse', x: 306, y: 399, rx: 72, ry: 84 },
      { type: 'ellipse', x: 1104, y: 309, rx: 75, ry: 87 },
      { type: 'ellipse', x: 138, y: 327, rx: 18, ry: 27 },
      { type: 'ellipse', x: 1287, y: 438, rx: 19, ry: 29 },
      { type: 'ellipse', x: 183, y: 720, rx: 20, ry: 31 },
      { type: 'ellipse', x: 1260, y: 723, rx: 19, ry: 29 },
      { type: 'ellipse', x: 501, y: 708, rx: 51, ry: 42 },
      { type: 'capsule', ax: 1104, ay: 714, bx: 1104, by: 792, r: 7 },
      { type: 'capsule', ax: 666, ay: 873, bx: 666, by: 948, r: 7 },
      { type: 'capsule', ax: 786, ay: 873, bx: 786, by: 948, r: 7 },
    ],
  },
  court: {
    boundary: { type: 'rect', x0: 0, x1: 1440, y0: 0, y1: 960 },
    obstacles: [
      { type: 'roundRect', x: 291, y: 190, w: 438, h: 188, r: 24 },
      { type: 'roundRect', x: 840, y: 204, w: 420, h: 216, r: 24 },
      { type: 'roundRect', x: 1248, y: 600, w: 240, h: 456, r: 24 },
      { type: 'roundRect', x: 705, y: 522, w: 114, h: 78, r: 12 },
      { type: 'ellipse', x: 840, y: 744, rx: 42, ry: 27 },
      { type: 'ellipse', x: 1035, y: 810, rx: 39, ry: 27 },
      { type: 'circle', x: 735, y: 846, r: 27 },
      { type: 'capsule', ax: 486, ay: 822, bx: 594, by: 822, r: 10 },
      { type: 'roundRect', x: 1095, y: 822, w: 45, h: 66, r: 5 },
      { type: 'capsule', ax: 120, ay: 660, bx: 330, by: 660, r: 6 },
      { type: 'capsule', ax: 120, ay: 660, bx: 120, by: 858, r: 6 },
      { type: 'capsule', ax: 120, ay: 858, bx: 450, by: 858, r: 6 },
      { type: 'capsule', ax: 450, ay: 756, bx: 450, by: 858, r: 6 },
      { type: 'capsule', ax: 732, ay: 642, bx: 732, by: 690, r: 5 },
      { type: 'capsule', ax: 1182, ay: 666, bx: 1182, by: 714, r: 5 },
      { type: 'ellipse', x: 75, y: 615, rx: 50, ry: 65 },
    ],
  },
};

const sign = (n) => (n < 0 ? -1 : 1);

function resolveRect(pos, radius, s) {
  const left = s.x - s.w / 2 - radius, right = s.x + s.w / 2 + radius;
  const top = s.y - s.h / 2 - radius, bottom = s.y + s.h / 2 + radius;
  if (pos.x <= left || pos.x >= right || pos.y <= top || pos.y >= bottom) return pos;
  const exitLeft = pos.x - left, exitRight = right - pos.x;
  const exitTop = pos.y - top, exitBottom = bottom - pos.y;
  const nearest = Math.min(exitLeft, exitRight, exitTop, exitBottom);
  if (nearest === exitLeft) return { x: left, y: pos.y };
  if (nearest === exitRight) return { x: right, y: pos.y };
  if (nearest === exitTop) return { x: pos.x, y: top };
  return { x: pos.x, y: bottom };
}

function resolveCircle(pos, radius, s) {
  if (s.opening && pos.y >= s.opening.y0 && pos.x >= s.opening.x0 && pos.x <= s.opening.x1) {
    return { ...pos, x: Math.max(s.opening.x0 + radius, Math.min(s.opening.x1 - radius, pos.x)) };
  }
  const dx = pos.x - s.x, dy = pos.y - s.y, limit = s.r + radius;
  const dist = Math.hypot(dx, dy);
  if (dist >= limit) return pos;
  if (!dist) return { x: s.x, y: s.y + limit };
  return { x: s.x + (dx / dist) * limit, y: s.y + (dy / dist) * limit };
}

function resolveEllipse(pos, radius, s) {
  const rx = s.rx + radius, ry = s.ry + radius;
  const dx = pos.x - s.x, dy = pos.y - s.y;
  const q = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
  if (q >= 1) return pos;
  if (!dx && !dy) return { x: s.x, y: s.y + ry };
  const scale = 1 / Math.sqrt(q);
  return { x: s.x + dx * scale, y: s.y + dy * scale };
}

function resolveCapsule(pos, radius, s) {
  const abx = s.bx - s.ax, aby = s.by - s.ay;
  const denom = abx * abx + aby * aby;
  const t = denom ? Math.max(0, Math.min(1, ((pos.x - s.ax) * abx + (pos.y - s.ay) * aby) / denom)) : 0;
  const cx = s.ax + abx * t, cy = s.ay + aby * t;
  const dx = pos.x - cx, dy = pos.y - cy, limit = s.r + radius;
  const dist = Math.hypot(dx, dy);
  if (dist >= limit) return pos;
  if (!dist) return Math.abs(abx) > Math.abs(aby)
    ? { x: pos.x, y: pos.y + limit }
    : { x: pos.x + limit, y: pos.y };
  return { x: cx + (dx / dist) * limit, y: cy + (dy / dist) * limit };
}

function resolveRoundRect(pos, radius, s) {
  const hw = s.w / 2, hh = s.h / 2, corner = Math.min(s.r, hw, hh);
  const innerX = hw - corner, innerY = hh - corner;
  const dx = pos.x - s.x, dy = pos.y - s.y, ax = Math.abs(dx), ay = Math.abs(dy);
  const outerX = hw + radius, outerY = hh + radius, outerCorner = corner + radius;
  if (ax > outerX || ay > outerY) return pos;
  if (ax <= innerX && ay <= innerY) {
    return outerX - ax < outerY - ay
      ? { x: s.x + sign(dx) * outerX, y: pos.y }
      : { x: pos.x, y: s.y + sign(dy) * outerY };
  }
  if (ax <= innerX) return { x: pos.x, y: s.y + sign(dy) * outerY };
  if (ay <= innerY) return { x: s.x + sign(dx) * outerX, y: pos.y };
  const cx = s.x + sign(dx) * innerX, cy = s.y + sign(dy) * innerY;
  const qx = pos.x - cx, qy = pos.y - cy, dist = Math.hypot(qx, qy);
  if (dist >= outerCorner) return pos;
  if (!dist) return { x: cx + outerCorner / Math.SQRT2, y: cy + outerCorner / Math.SQRT2 };
  return { x: cx + (qx / dist) * outerCorner, y: cy + (qy / dist) * outerCorner };
}

function resolveBoundary(pos, radius, boundary) {
  if (boundary.type === 'rect') {
    return clampToBounds(pos, {
      x0: boundary.x0 + radius, x1: boundary.x1 - radius,
      y0: boundary.y0 + radius, y1: boundary.y1 - radius,
    });
  }
  const door = boundary.door;
  if (pos.y >= door.y0 && pos.x >= door.x0 && pos.x <= door.x1) {
    return {
      x: Math.max(door.x0 + radius, Math.min(door.x1 - radius, pos.x)),
      y: Math.max(door.y0, Math.min(door.y1 - radius, pos.y)),
    };
  }
  const dx = pos.x - boundary.x, dy = pos.y - boundary.y;
  const limit = boundary.r - radius, dist = Math.hypot(dx, dy);
  if (dist <= limit) return pos;
  if (!dist) return { x: boundary.x, y: boundary.y };
  return { x: boundary.x + (dx / dist) * limit, y: boundary.y + (dy / dist) * limit };
}

function resolveShape(pos, radius, shape) {
  if (shape.type === 'circle') return resolveCircle(pos, radius, shape);
  if (shape.type === 'ellipse') return resolveEllipse(pos, radius, shape);
  if (shape.type === 'capsule') return resolveCapsule(pos, radius, shape);
  if (shape.type === 'roundRect') return resolveRoundRect(pos, radius, shape);
  return resolveRect(pos, radius, shape);
}

function resolveFurniture(pos, radius, placed, catalogById) {
  let next = pos;
  for (const p of placed ?? []) {
    const item = catalogById?.[p.id];
    if (!item || item.cls === 'rugs' || item.id === 'string-lights') continue;
    const h = item.h * 3;
    const depth = Math.max(9, Math.min(24, h * 0.28));
    next = resolveRoundRect(next, radius, {
      x: p.x, y: p.y + h / 2 - depth / 2 - 3,
      w: item.w * 2.4, h: depth, r: Math.min(8, depth / 2),
    });
  }
  return next;
}

export function resolveRoomCollision(room, pos, radius, placed = [], catalogById = null) {
  const profile = PROFILES[room.id];
  if (!profile) return clampToBounds(resolveObstacles(pos, radius, room.solids ?? []), room.bounds);
  let next = resolveBoundary(pos, radius, profile.boundary);
  for (let pass = 0; pass < 4; pass++) {
    const before = next;
    for (const shape of profile.obstacles) next = resolveShape(next, radius, shape);
    if (room.id === 'den') next = resolveFurniture(next, radius, placed, catalogById);
    next = resolveBoundary(next, radius, profile.boundary);
    if (Math.hypot(next.x - before.x, next.y - before.y) < 0.01) break;
  }
  return next;
}
