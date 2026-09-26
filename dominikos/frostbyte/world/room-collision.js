// Pixel-aligned room collision profiles for the painted 480x320 backdrops at the room's x3 scale.
// The artwork owns the physical silhouettes; content/rooms.js owns interactions and travel.
import { clampToBounds, resolveObstacles } from '../engine/movement.js';
import { BASE_AVATAR_SCALE, bodyFactor } from '../content/rooms.js';
import { TRACED_ART } from './ground/index.js';

// A room whose collision is traced off its backdrop (scripts/frostbyte-art): the painted ground is
// the boundary, and everything painted standing in it (props' footprints, the igloo...) a hole.
function traced(asset, extra = {}) {
  const art = TRACED_ART[asset];
  return {
    boundary: { type: 'polygon', points: art.GROUND, ...extra.boundary },
    obstacles: [
      ...art.HOLES.map(({ id, points }) => ({ id, type: 'polygon', points })),
      ...(extra.obstacles ?? []),
    ],
  };
}

const PROFILES = {
  plaza: traced('room-plaza'),

  den: {
    boundary: {
      // Traced from the red floor edge on room-den.jpg. The entrance arch cuts a deep notch into
      // the south edge; only the narrow blue cap is walkable, authored as the doorway union below.
      type: 'polygon',
      points: [
        [390, 270], [490, 275], [575, 300], [640, 320], [720, 330],
        [805, 320], [875, 300], [960, 270], [1055, 300], [1140, 330],
        [1240, 350], [1320, 400], [1370, 470], [1395, 550], [1375, 620],
        [1330, 680], [1240, 735], [1120, 785], [990, 820], [920, 825],
        [875, 745], [835, 660], [785, 585], [655, 585], [605, 660],
        [565, 745], [520, 825], [430, 820], [330, 795], [230, 755],
        [145, 700], [85, 635], [50, 560], [50, 485], [75, 410],
        [115, 350], [190, 310], [280, 280],
      ],
      // The narrow corridor continues down the painted tunnel so click-to-walk targets beyond the
      // cap are not projected back onto its top edge. Runtime travel fires at y=624 before the
      // player can continue out of the room.
      doors: [{ x0: 668, x1: 772, y0: 560, y1: 960 }],
    },
    obstacles: [
      { id: 'fireplace', type: 'roundRect', x: 720, y: 195, w: 285, h: 215, r: 34 },
      {
        id: 'bed', type: 'polygon',
        points: [[292, 220], [500, 260], [515, 395], [455, 500], [335, 590],
          [90, 548], [82, 390]],
      },
      {
        id: 'side-table', type: 'polygon',
        points: [[1065, 305], [1140, 285], [1190, 320], [1200, 270], [1295, 285],
          [1315, 360], [1320, 455], [1275, 490], [1190, 520], [1090, 435]],
      },
      { id: 'basket', type: 'ellipse', x: 1295, y: 520, rx: 60, ry: 72 },
      { id: 'door-sign', type: 'roundRect', x: 1000, y: 790, w: 110, h: 82, r: 8 },
    ],
  },

  trail: traced('room-trail'),
  court: traced('room-court'),

  workshop: {
    boundary: {
      type: 'polygon',
      points: [[45, 420], [180, 300], [480, 280], [600, 360], [720, 420],
        [840, 360], [1260, 300], [1395, 420], [1395, 750], [1260, 870],
        [930, 870], [840, 720], [600, 720], [600, 870], [240, 870], [45, 720]],
      // The painted opening between the jambs is x~640..830 (dark outline scan at y800..900).
      doors: [{ x0: 640, x1: 830, y0: 708, y1: 960 }],
    },
    obstacles: [
      {
        id: 'gizmo-shelf', type: 'polygon',
        points: [[105, 155], [510, 135], [545, 325], [450, 385], [150, 360]],
      },
      { id: 'forge', type: 'roundRect', x: 235, y: 475, w: 270, h: 250, r: 30 },
      { id: 'bellows', type: 'ellipse', x: 155, y: 625, rx: 105, ry: 58 },
      { id: 'weather-bell', type: 'roundRect', x: 710, y: 330, w: 225, h: 165, r: 28 },
      {
        id: 'east-workbench', type: 'polygon',
        points: [[1030, 225], [1395, 250], [1425, 690], [1260, 735], [1130, 650]],
      },
    ],
  },

  // Traced off each backdrop (scripts/frostbyte-art/rooms/<asset>.mjs); docks has one per art state.
  'docks-away': traced('room-docks-away'),
  'docks-port': traced('room-docks-port'),
  'lighthouse-rest': traced('room-lighthouse-rest'),
  'lighthouse-gallery': traced('room-lighthouse-gallery'),
  whisperpine: traced('room-whisperpine'),
  moonwell: traced('room-moonwell'),
  caverns: traced('room-caverns'),
};

const sign = (n) => (n < 0 ? -1 : 1);
const pointX = (point) => Array.isArray(point) ? point[0] : point.x;
const pointY = (point) => Array.isArray(point) ? point[1] : point.y;

function clampRange(value, min, max) {
  if (min > max) return (min + max) / 2;
  return Math.max(min, Math.min(max, value));
}

function resolveOpening(pos, radius, openingOrList) {
  const openings = Array.isArray(openingOrList) ? openingOrList : openingOrList ? [openingOrList] : [];
  for (const opening of openings) {
    const x0 = opening.x0 ?? -Infinity;
    const x1 = opening.x1 ?? Infinity;
    const y0 = opening.y0 ?? -Infinity;
    const y1 = opening.y1 ?? Infinity;
    if (pos.x < x0 || pos.x > x1 || pos.y < y0 || pos.y > y1) continue;
    return {
      x: Number.isFinite(x0) && Number.isFinite(x1)
        ? clampRange(pos.x, x0 + radius, x1 - radius)
        : pos.x,
      y: Number.isFinite(y0) && Number.isFinite(y1)
        ? clampRange(pos.y, y0 + radius, y1 - radius)
        : pos.y,
    };
  }
  return null;
}

function pointInPolygon(pos, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = pointX(points[i]), yi = pointY(points[i]);
    const xj = pointX(points[j]), yj = pointY(points[j]);
    const crosses = ((yi > pos.y) !== (yj > pos.y))
      && pos.x < ((xj - xi) * (pos.y - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

function closestPointOnSegment(pos, a, b) {
  const ax = pointX(a), ay = pointY(a);
  const bx = pointX(b), by = pointY(b);
  const abx = bx - ax, aby = by - ay;
  const denom = abx * abx + aby * aby;
  const t = denom
    ? Math.max(0, Math.min(1, ((pos.x - ax) * abx + (pos.y - ay) * aby) / denom))
    : 0;
  return { x: ax + abx * t, y: ay + aby * t };
}

function nearestPolygonEdge(pos, points) {
  let nearest = null;
  for (let i = 0; i < points.length; i++) {
    const point = closestPointOnSegment(pos, points[i], points[(i + 1) % points.length]);
    const distance = Math.hypot(pos.x - point.x, pos.y - point.y);
    if (!nearest || distance < nearest.distance) nearest = { point, distance, edgeIndex: i };
  }
  return nearest;
}

function inwardNormal(points, edgeIndex) {
  const a = points[edgeIndex], b = points[(edgeIndex + 1) % points.length];
  const ax = pointX(a), ay = pointY(a), bx = pointX(b), by = pointY(b);
  const dx = bx - ax, dy = by - ay;
  const length = Math.hypot(dx, dy) || 1;
  let nx = -dy / length, ny = dx / length;
  const midpoint = { x: (ax + bx) / 2, y: (ay + by) / 2 };
  if (!pointInPolygon({ x: midpoint.x + nx, y: midpoint.y + ny }, points)) {
    nx *= -1;
    ny *= -1;
  }
  return { x: nx, y: ny };
}

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

function resolvePolygon(pos, radius, shape) {
  const nearest = nearestPolygonEdge(pos, shape.points);
  const inside = pointInPolygon(pos, shape.points);
  if (!inside && nearest.distance >= radius) return pos;

  let dx;
  let dy;
  if (nearest.distance > 0.0001) {
    dx = inside ? nearest.point.x - pos.x : pos.x - nearest.point.x;
    dy = inside ? nearest.point.y - pos.y : pos.y - nearest.point.y;
    const length = Math.hypot(dx, dy);
    dx /= length;
    dy /= length;
  } else {
    const inward = inwardNormal(shape.points, nearest.edgeIndex);
    dx = -inward.x;
    dy = -inward.y;
  }
  return {
    x: nearest.point.x + dx * radius,
    y: nearest.point.y + dy * radius,
  };
}

function insideOpening(pos, openings) {
  return (openings ?? []).some((o) => pos.x >= (o.x0 ?? -Infinity) && pos.x <= (o.x1 ?? Infinity)
    && pos.y >= (o.y0 ?? -Infinity) && pos.y <= (o.y1 ?? Infinity));
}

// The room polygon and its doorways are ONE walkable union. A body straddling the seam (half in
// the doorway, half on the floor) is fine; clamping it back into the doorway inset is what used
// to pin the player on the threshold, unable to step into the room.
function discInsideUnion(pos, radius, points, openings) {
  const inUnion = (p) => pointInPolygon(p, points) || insideOpening(p, openings);
  if (!inUnion(pos)) return false;
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    if (!inUnion({ x: pos.x + Math.cos(angle) * radius, y: pos.y + Math.sin(angle) * radius })) return false;
  }
  return true;
}

function resolvePolygonBoundary(pos, radius, boundary) {
  const nearest = nearestPolygonEdge(pos, boundary.points);
  const inside = pointInPolygon(pos, boundary.points);
  if (inside && nearest.distance >= radius) return pos;
  if (boundary.doors && discInsideUnion(pos, radius, boundary.points, boundary.doors)) return pos;

  const opening = resolveOpening(pos, radius, boundary.doors);
  if (opening) return opening;

  let dx;
  let dy;
  if (inside && nearest.distance > 0.0001) {
    dx = pos.x - nearest.point.x;
    dy = pos.y - nearest.point.y;
    const length = Math.hypot(dx, dy);
    dx /= length;
    dy /= length;
  } else {
    const inward = inwardNormal(boundary.points, nearest.edgeIndex);
    dx = inward.x;
    dy = inward.y;
  }
  return {
    x: nearest.point.x + dx * radius,
    y: nearest.point.y + dy * radius,
  };
}

function insideAnyRegion(pos, polygons) {
  return polygons.some((points) => pointInPolygon(pos, points));
}

function resolveRegionBoundary(pos, radius, boundary) {
  if (!insideAnyRegion(pos, boundary.polygons)) {
    const opening = resolveOpening(pos, radius, boundary.doors);
    if (opening) return opening;

    let nearest = null;
    let nearestPoints = null;
    for (const points of boundary.polygons) {
      const candidate = nearestPolygonEdge(pos, points);
      if (!nearest || candidate.distance < nearest.distance) {
        nearest = candidate;
        nearestPoints = points;
      }
    }
    const inward = inwardNormal(nearestPoints, nearest.edgeIndex);
    return {
      x: nearest.point.x + inward.x * radius,
      y: nearest.point.y + inward.y * radius,
    };
  }

  let pushX = 0;
  let pushY = 0;
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    const dx = Math.cos(angle), dy = Math.sin(angle);
    if (!insideAnyRegion({ x: pos.x + dx * radius, y: pos.y + dy * radius }, boundary.polygons)) {
      pushX -= dx;
      pushY -= dy;
    }
  }
  const pushLength = Math.hypot(pushX, pushY);
  if (!pushLength) return pos;

  const opening = resolveOpening(pos, radius, boundary.doors);
  if (opening) return opening;

  return {
    x: pos.x + (pushX / pushLength) * Math.max(2, radius * 0.55),
    y: pos.y + (pushY / pushLength) * Math.max(2, radius * 0.55),
  };
}

function resolveBoundary(pos, radius, boundary) {
  if (boundary.type === 'rect') {
    return clampToBounds(pos, {
      x0: boundary.x0 + radius, x1: boundary.x1 - radius,
      y0: boundary.y0 + radius, y1: boundary.y1 - radius,
    });
  }
  if (boundary.type === 'polygon') return resolvePolygonBoundary(pos, radius, boundary);
  if (boundary.type === 'regions') return resolveRegionBoundary(pos, radius, boundary);

  const rx = (boundary.rx ?? boundary.r) - radius;
  const ry = (boundary.ry ?? boundary.r) - radius;
  const dx = pos.x - boundary.x, dy = pos.y - boundary.y;
  const q = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
  // A doorway and the room interior form one walkable union. Prefer a position already safely
  // inside the room; clamping it to the doorway inset first creates an invisible lip that a
  // frame-sized movement step can never cross.
  if (q <= 1) return pos;

  const opening = resolveOpening(pos, radius, boundary.doors ?? boundary.door);
  if (opening) return opening;

  const scale = 1 / Math.sqrt(q);
  return { x: boundary.x + dx * scale, y: boundary.y + dy * scale };
}

function resolveShape(pos, radius, shape) {
  const openingRadius = shape.opening?.passThrough ? 0 : radius;
  const opening = resolveOpening(pos, openingRadius, shape.openings ?? shape.opening);
  if (opening) return opening;
  if (shape.type === 'circle') return resolveCircle(pos, radius, shape);
  if (shape.type === 'ellipse') return resolveEllipse(pos, radius, shape);
  if (shape.type === 'capsule') return resolveCapsule(pos, radius, shape);
  if (shape.type === 'roundRect') return resolveRoundRect(pos, radius, shape);
  if (shape.type === 'polygon') return resolvePolygon(pos, radius, shape);
  return resolveRect(pos, radius, shape);
}

function resolveFurniture(pos, radius, placed, catalogById, furnitureScale) {
  let next = pos;
  for (const p of placed ?? []) {
    const item = catalogById?.[p.id];
    if (!item || item.cls === 'rugs' || item.id === 'string-lights') continue;
    const h = item.h * furnitureScale;
    const depth = Math.max(9, Math.min(24, h * 0.28));
    next = resolveRoundRect(next, radius, {
      x: p.x, y: p.y + h / 2 - depth / 2 - 3,
      w: item.w * furnitureScale * 0.8, h: depth, r: Math.min(8, depth / 2),
    });
  }
  return next;
}

function profileForRoom(room) {
  if (room.id === 'docks') {
    return room.mapAsset === 'room-docks-port' ? PROFILES['docks-port'] : PROFILES['docks-away'];
  }
  return PROFILES[room.id];
}

export function collisionProfileForRoom(room) {
  return profileForRoom(room);
}

export function resolveRoomCollision(room, pos, radius, placed = [], catalogById = null, furnitureScale = BASE_AVATAR_SCALE * bodyFactor(room)) {
  const profile = profileForRoom(room);
  if (!profile) return clampToBounds(resolveObstacles(pos, radius, room.solids ?? []), room.bounds);

  let next = resolveBoundary(pos, radius, profile.boundary);
  for (let pass = 0; pass < 8; pass++) {
    const before = next;
    for (const shape of profile.obstacles) next = resolveShape(next, radius, shape);
    if (room.id === 'den') next = resolveFurniture(next, radius, placed, catalogById, furnitureScale);
    next = resolveBoundary(next, radius, profile.boundary);
    if (Math.hypot(next.x - before.x, next.y - before.y) < 0.01) break;
  }
  return next;
}
