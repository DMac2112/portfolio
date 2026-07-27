// Pixel-aligned room collision profiles for the painted 480x320 backdrops at the room's x3 scale.
// The artwork owns the physical silhouettes; content/rooms.js owns interactions and travel.
import { clampToBounds, resolveObstacles } from '../engine/movement.js';

const PROFILES = {
  plaza: {
    boundary: { type: 'rect', x0: 0, x1: 1440, y0: 0, y1: 960 },
    obstacles: [
      {
        id: 'northwest-buildings', type: 'polygon',
        points: [[-40, -40], [620, -40], [620, 150], [570, 270], [585, 345],
          [510, 420], [350, 450], [260, 510], [-40, 525]],
      },
      {
        id: 'northeast-buildings', type: 'polygon',
        points: [[850, -40], [1480, -40], [1480, 570], [1320, 570], [1270, 505],
          [1180, 465], [1110, 380], [1050, 285], [850, 285]],
      },
      {
        id: 'southwest-buildings', type: 'polygon',
        points: [[-40, 620], [300, 620], [380, 675], [505, 690], [530, 810],
          [530, 1000], [-40, 1000]],
      },
      {
        id: 'southeast-buildings', type: 'polygon',
        points: [[820, 1000], [1480, 1000], [1480, 650], [1320, 650], [1260, 715],
          [1110, 700], [1010, 760], [900, 720], [820, 790]],
      },
      { id: 'fountain', type: 'ellipse', x: 993, y: 330, rx: 102, ry: 58 },
      {
        id: 'den-igloo', type: 'ellipse', x: 720, y: 792, rx: 145, ry: 142,
        opening: { x0: 660, x1: 762, y0: 824, y1: 960 },
      },
      { id: 'north-bench', type: 'capsule', ax: 450, ay: 350, bx: 565, by: 322, r: 13 },
      { id: 'chronicle-board', type: 'roundRect', x: 108, y: 390, w: 126, h: 90, r: 10 },
      { id: 'rink-north-rail', type: 'capsule', ax: 1110, ay: 444, bx: 1390, by: 444, r: 7 },
      { id: 'rink-west-rail', type: 'capsule', ax: 1110, ay: 444, bx: 1110, by: 525, r: 7 },
      { id: 'rink-south-rail', type: 'capsule', ax: 1140, ay: 650, bx: 1390, by: 650, r: 7 },
      { id: 'rink-southwest-rail', type: 'capsule', ax: 1140, ay: 580, bx: 1140, by: 650, r: 7 },
      { id: 'igloo-sign', type: 'capsule', ax: 1010, ay: 735, bx: 1010, by: 800, r: 18 },
    ],
  },

  den: {
    boundary: {
      type: 'ellipse', x: 720, y: 465, rx: 660, ry: 315,
      doors: [{ x0: 564, x1: 876, y0: 660, y1: 960 }],
    },
    obstacles: [
      { id: 'fireplace', type: 'roundRect', x: 720, y: 210, w: 255, h: 255, r: 34 },
      { id: 'bed', type: 'roundRect', x: 300, y: 405, w: 365, h: 255, r: 28 },
      { id: 'side-table', type: 'roundRect', x: 1150, y: 405, w: 280, h: 165, r: 24 },
      { id: 'basket', type: 'ellipse', x: 1285, y: 535, rx: 52, ry: 66 },
      { id: 'door-sign', type: 'roundRect', x: 1000, y: 790, w: 110, h: 82, r: 8 },
    ],
  },

  trail: {
    boundary: {
      type: 'polygon',
      points: [[90, 450], [210, 330], [390, 300], [510, 270], [585, 330],
        [855, 330], [930, 300], [1130, 300], [1260, 375], [1350, 450],
        [1350, 660], [1260, 720], [1290, 900], [840, 900], [720, 960],
        [600, 900], [180, 900], [180, 780], [90, 720]],
      doors: [
        { x0: 660, x1: 780, y0: 840, y1: 960 },
        { x0: 1260, x1: 1440, y0: 420, y1: 570 },
      ],
    },
    obstacles: [
      { id: 'west-boulder', type: 'ellipse', x: 270, y: 365, rx: 130, ry: 76 },
      { id: 'north-lantern', type: 'capsule', ax: 960, ay: 250, bx: 960, by: 380, r: 10 },
      { id: 'trail-sign', type: 'roundRect', x: 1090, y: 350, w: 128, h: 88, r: 8 },
      { id: 'east-lantern', type: 'capsule', ax: 1205, ay: 540, bx: 1205, by: 710, r: 10 },
    ],
  },

  court: {
    boundary: { type: 'rect', x0: 0, x1: 1440, y0: 0, y1: 960 },
    obstacles: [
      {
        id: 'snowtail-building', type: 'polygon',
        points: [[-40, -40], [610, -40], [625, 205], [565, 330], [505, 390],
          [380, 425], [-40, 450]],
        opening: { x0: 320, x1: 405, y0: 330, y1: 470 },
      },
      {
        id: 'bluehour-building', type: 'polygon',
        points: [[720, -40], [1090, -40], [1120, 220], [1050, 350], [900, 400],
          [760, 365], [700, 250]],
        opening: { x0: 800, x1: 880, y0: 330, y1: 450 },
      },
      {
        id: 'lantern-ladle-building', type: 'polygon',
        points: [[1050, 110], [1480, 70], [1480, 700], [1280, 700], [1170, 635],
          [1020, 570], [995, 300]],
        opening: { x0: 1068, x1: 1170, y0: 535, y1: 690 },
      },
      {
        id: 'southwest-buildings', type: 'polygon',
        points: [[-40, 620], [430, 640], [550, 760], [565, 1000], [-40, 1000]],
      },
      {
        id: 'southeast-buildings', type: 'polygon',
        points: [[870, 1000], [1480, 1000], [1480, 680], [1200, 720], [1020, 700],
          [900, 800]],
        opening: { x0: 1188, x1: 1360, y0: 708, y1: 960 },
      },
      { id: 'court-cart', type: 'roundRect', x: 495, y: 535, w: 155, h: 145, r: 18 },
      { id: 'patio-table', type: 'ellipse', x: 655, y: 825, rx: 58, ry: 35 },
      { id: 'patio-brazier', type: 'circle', x: 760, y: 825, r: 36 },
      { id: 'patio-chair-west', type: 'roundRect', x: 620, y: 885, w: 50, h: 78, r: 8 },
      { id: 'patio-chair-north', type: 'roundRect', x: 820, y: 755, w: 45, h: 75, r: 8 },
      { id: 'patio-chair-east', type: 'roundRect', x: 850, y: 880, w: 50, h: 78, r: 8 },
      { id: 'edda-nook', type: 'roundRect', x: 930, y: 785, w: 58, h: 74, r: 8 },
    ],
  },

  workshop: {
    boundary: {
      type: 'polygon',
      points: [[45, 420], [180, 300], [480, 280], [600, 360], [720, 420],
        [840, 360], [1260, 300], [1395, 420], [1395, 750], [1260, 870],
        [930, 870], [840, 720], [600, 720], [600, 870], [240, 870], [45, 720]],
      doors: [{ x0: 650, x1: 790, y0: 708, y1: 960 }],
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

  'docks-away': {
    boundary: {
      type: 'regions',
      polygons: [
        [[270, 240], [750, 180], [1200, 300], [1080, 474], [975, 369],
          [705, 312], [450, 336], [309, 450]],
        [[1200, 300], [1410, 360], [1320, 600], [1140, 660], [1020, 618],
          [1080, 474]],
        [[1320, 600], [900, 960], [720, 900], [804, 726], [1020, 618]],
        [[720, 900], [180, 600], [270, 480], [366, 576], [570, 690], [804, 726]],
        [[180, 600], [0, 540], [0, 250], [270, 240], [309, 450], [366, 576]],
        [[855, -20], [1065, -20], [1110, 300], [960, 360], [840, 240]],
      ],
      doors: [
        { x0: 0, x1: 180, y0: 420, y1: 540 },
        { x0: 915, x1: 1065, y0: 0, y1: 180 },
      ],
    },
    obstacles: [
      {
        id: 'warehouse', type: 'polygon',
        points: [[0, 0], [500, 0], [510, 270], [390, 345], [60, 330], [0, 270]],
      },
      {
        id: 'crane', type: 'polygon',
        points: [[1080, 0], [1440, 0], [1440, 450], [1260, 475], [1080, 330]],
      },
      {
        id: 'southwest-buildings', type: 'polygon',
        points: [[0, 650], [390, 650], [570, 780], [570, 960], [0, 960]],
      },
      {
        id: 'southeast-buildings', type: 'polygon',
        points: [[870, 960], [1440, 960], [1440, 650], [1110, 650], [900, 780]],
        opening: { x0: 1080, x1: 1320, y0: 720, y1: 930 },
      },
      { id: 'harbor-bell', type: 'capsule', ax: 635, ay: 75, bx: 635, by: 250, r: 16 },
    ],
  },

  'docks-port': {
    boundary: {
      type: 'regions',
      polygons: [
        [[0, 300], [600, 270], [900, 360], [1005, 450], [930, 525], [765, 570],
          [645, 735], [390, 645], [165, 525], [0, 495]],
        [[-20, 705], [360, 555], [570, 615], [120, 960], [-20, 960]],
        [[1350, 390], [1460, 450], [1460, 630], [900, 960], [750, 900], [1260, 510]],
        [[705, 510], [870, 435], [1080, 475], [1215, 585], [1110, 810],
          [900, 850], [720, 750]],
        [[510, 440], [900, 455], [925, 570], [540, 570]],
        [[870, -20], [1080, -20], [1080, 330], [840, 390]],
      ],
      doors: [
        { x0: 0, x1: 180, y0: 420, y1: 540 },
        { x0: 900, x1: 1060, y0: 0, y1: 180 },
      ],
    },
    obstacles: [
      {
        id: 'warehouse', type: 'polygon',
        points: [[0, 0], [550, 0], [570, 270], [450, 345], [60, 330], [0, 270]],
      },
      {
        id: 'crane', type: 'polygon',
        points: [[1080, 0], [1440, 0], [1440, 435], [1260, 455], [1090, 330]],
      },
      {
        id: 'southwest-buildings', type: 'polygon',
        points: [[0, 650], [390, 650], [570, 780], [570, 960], [0, 960]],
      },
      {
        id: 'southeast-buildings', type: 'polygon',
        points: [[870, 960], [1440, 960], [1440, 650], [1110, 650], [900, 780]],
        opening: { x0: 1080, x1: 1320, y0: 720, y1: 930 },
      },
      { id: 'cargo-stack', type: 'roundRect', x: 760, y: 455, w: 245, h: 125, r: 18 },
      { id: 'ship-mast', type: 'capsule', ax: 975, ay: 350, bx: 975, by: 590, r: 20 },
    ],
  },

  'lighthouse-rest': {
    boundary: {
      type: 'ellipse', x: 720, y: 480, rx: 655, ry: 350,
      doors: [
        { x0: 630, x1: 810, y0: 735, y1: 960 },
        { x0: 1210, x1: 1440, y0: 390, y1: 565 },
      ],
    },
    obstacles: [
      { id: 'keeper-stove', type: 'roundRect', x: 465, y: 295, w: 185, h: 165, r: 18 },
      { id: 'logbook-table', type: 'roundRect', x: 300, y: 495, w: 250, h: 170, r: 18 },
      { id: 'spiral-stairs', type: 'roundRect', x: 1115, y: 420, w: 270, h: 260, r: 28 },
      { id: 'keeper-cot', type: 'roundRect', x: 1060, y: 705, w: 310, h: 190, r: 24 },
      { id: 'lamp-table', type: 'roundRect', x: 420, y: 745, w: 210, h: 145, r: 18 },
      { id: 'sealed-north-door', type: 'capsule', ax: 620, ay: 270, bx: 820, by: 270, r: 12 },
    ],
  },

  'lighthouse-gallery': {
    boundary: {
      type: 'ellipse', x: 720, y: 500, rx: 655, ry: 345,
      doors: [{ x0: 0, x1: 265, y0: 365, y1: 565 }],
    },
    obstacles: [
      { id: 'great-lamp', type: 'roundRect', x: 720, y: 300, w: 215, h: 260, r: 34 },
      { id: 'telescope', type: 'roundRect', x: 1140, y: 375, w: 245, h: 170, r: 22 },
      { id: 'supply-chest', type: 'roundRect', x: 370, y: 700, w: 260, h: 130, r: 24 },
    ],
  },

  whisperpine: {
    boundary: {
      type: 'polygon',
      points: [[120, 360], [300, 220], [570, 195], [720, 175], [900, 200],
        [1140, 225], [1260, 345], [1320, 450], [1320, 660], [1170, 720],
        [1230, 900], [780, 900], [600, 900], [300, 870], [120, 720]],
      doors: [
        { x0: 0, x1: 210, y0: 405, y1: 555 },
        { x0: 650, x1: 790, y0: 0, y1: 240 },
        { x0: 1260, x1: 1440, y0: 405, y1: 588 },
      ],
    },
    obstacles: [
      {
        id: 'listening-grove', type: 'polygon',
        points: [[585, 300], [675, 240], [785, 255], [865, 360], [840, 570],
          [720, 610], [600, 570]],
      },
      { id: 'root-den', type: 'ellipse', x: 245, y: 285, rx: 150, ry: 115 },
      {
        id: 'fallen-root', type: 'polygon',
        points: [[1080, 420], [1440, 390], [1440, 600], [1240, 610], [1110, 555]],
        opening: { x0: 1260, x1: 1440, y0: 430, y1: 636 },
      },
      { id: 'berry-bush', type: 'ellipse', x: 365, y: 770, rx: 80, ry: 68 },
    ],
  },

  moonwell: {
    boundary: {
      type: 'polygon',
      points: [[90, 300], [330, 250], [540, 240], [600, 120], [840, 120],
        [900, 240], [1110, 260], [1350, 330], [1350, 600], [1110, 690],
        [900, 700], [840, 850], [600, 850], [540, 700], [300, 690], [90, 600]],
      doors: [{ x0: 630, x1: 810, y0: 780, y1: 960 }],
    },
    obstacles: [
      { id: 'moonwell-pool', type: 'ellipse', x: 720, y: 450, rx: 265, ry: 140 },
      { id: 'moonwell-bench', type: 'roundRect', x: 450, y: 680, w: 190, h: 75, r: 12 },
      { id: 'west-sign', type: 'roundRect', x: 300, y: 325, w: 60, h: 85, r: 8 },
      { id: 'east-sign', type: 'roundRect', x: 1275, y: 390, w: 60, h: 85, r: 8 },
    ],
  },

  caverns: {
    boundary: {
      type: 'polygon',
      points: [[120, 150], [360, 120], [570, 120], [720, 150], [870, 120],
        [1080, 150], [1260, 240], [1350, 390], [1320, 600], [1260, 720],
        [1140, 840], [900, 870], [720, 900], [540, 870], [300, 840],
        [150, 690], [90, 480]],
      doors: [{ x0: 1260, x1: 1440, y0: 405, y1: 555 }],
    },
    obstacles: [
      {
        id: 'west-crystals', type: 'polygon',
        points: [[0, 120], [330, 120], [450, 285], [405, 390], [270, 405],
          [165, 480], [0, 480]],
      },
      {
        id: 'listening-arch', type: 'polygon',
        points: [[570, 105], [660, 45], [720, 20], [795, 75], [870, 180],
          [825, 300], [600, 300]],
        opening: { x0: 665, x1: 775, y0: 145, y1: 330 },
      },
      {
        id: 'east-crystals', type: 'polygon',
        points: [[900, 120], [1160, 120], [1320, 210], [1440, 240], [1440, 420],
          [1230, 420], [1120, 360], [960, 330]],
      },
      {
        id: 'east-roots', type: 'polygon',
        points: [[1110, 300], [1440, 300], [1440, 555], [1270, 555], [1190, 480],
          [1080, 450]],
        opening: { x0: 1260, x1: 1440, y0: 405, y1: 588 },
      },
      { id: 'underisle-pool', type: 'ellipse', x: 720, y: 780, rx: 285, ry: 130 },
      {
        id: 'southwest-crystals', type: 'polygon',
        points: [[0, 600], [170, 585], [330, 690], [390, 900], [300, 960], [0, 960]],
      },
      {
        id: 'southeast-crystals', type: 'polygon',
        points: [[1140, 690], [1300, 600], [1440, 600], [1440, 960], [1100, 960]],
      },
    ],
  },
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

function resolvePolygonBoundary(pos, radius, boundary) {
  const opening = resolveOpening(pos, radius, boundary.doors);
  if (opening) return opening;

  const nearest = nearestPolygonEdge(pos, boundary.points);
  const inside = pointInPolygon(pos, boundary.points);
  if (inside && nearest.distance >= radius) return pos;

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
  const opening = resolveOpening(pos, radius, boundary.doors);
  if (opening) return opening;

  if (!insideAnyRegion(pos, boundary.polygons)) {
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

  const opening = resolveOpening(pos, radius, boundary.doors ?? boundary.door);
  if (opening) return opening;
  const rx = (boundary.rx ?? boundary.r) - radius;
  const ry = (boundary.ry ?? boundary.r) - radius;
  const dx = pos.x - boundary.x, dy = pos.y - boundary.y;
  const q = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
  if (q <= 1) return pos;
  const scale = 1 / Math.sqrt(q);
  return { x: boundary.x + dx * scale, y: boundary.y + dy * scale };
}

function resolveShape(pos, radius, shape) {
  const opening = resolveOpening(pos, radius, shape.openings ?? shape.opening);
  if (opening) return opening;
  if (shape.type === 'circle') return resolveCircle(pos, radius, shape);
  if (shape.type === 'ellipse') return resolveEllipse(pos, radius, shape);
  if (shape.type === 'capsule') return resolveCapsule(pos, radius, shape);
  if (shape.type === 'roundRect') return resolveRoundRect(pos, radius, shape);
  if (shape.type === 'polygon') return resolvePolygon(pos, radius, shape);
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

function profileForRoom(room) {
  if (room.id === 'docks') {
    return room.mapAsset === 'room-docks-port' ? PROFILES['docks-port'] : PROFILES['docks-away'];
  }
  return PROFILES[room.id];
}

export function collisionProfileForRoom(room) {
  return profileForRoom(room);
}

export function resolveRoomCollision(room, pos, radius, placed = [], catalogById = null) {
  const profile = profileForRoom(room);
  if (!profile) return clampToBounds(resolveObstacles(pos, radius, room.solids ?? []), room.bounds);

  let next = resolveBoundary(pos, radius, profile.boundary);
  for (let pass = 0; pass < 8; pass++) {
    const before = next;
    for (const shape of profile.obstacles) next = resolveShape(next, radius, shape);
    if (room.id === 'den') next = resolveFurniture(next, radius, placed, catalogById);
    next = resolveBoundary(next, radius, profile.boundary);
    if (Math.hypot(next.x - before.x, next.y - before.y) < 0.01) break;
  }
  return next;
}
