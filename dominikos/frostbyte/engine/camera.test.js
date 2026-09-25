import { describe, it, expect } from 'vitest';
import {
  computeCamPos, computeCamScale, CAM_LEAD, coverScale, fitCamScale, clampCamPos, roomMapSize,
} from './camera.js';
import { ROOM_REGISTRY } from '../content/rooms.js';

describe('computeCamPos', () => {
  it('applies the fixed lead offset', () => {
    const r = computeCamPos({ x: 100, y: 200 });
    expect(r).toEqual({ x: 100 + CAM_LEAD.x, y: 200 + CAM_LEAD.y });
  });
});

describe('computeCamScale', () => {
  it('returns 0.85 below aspect ratio 1 (portrait)', () => {
    expect(computeCamScale(0.5)).toBe(0.85);
    expect(computeCamScale(0.999)).toBe(0.85);
  });
  it('returns 1.15 at/above aspect ratio 1 (landscape)', () => {
    expect(computeCamScale(1)).toBe(1.15);
    expect(computeCamScale(1.78)).toBe(1.15);
  });
});

// Every window and fullscreen size the game can meet, in CSS px: phones both ways, tablets,
// laptops (incl. a 16" 2.8k panel at 150-200% scaling), 4k at 100%, ultrawide, and slivers.
const VIEWS = [
  [375, 812], [812, 375], [390, 844], [768, 1024], [1024, 768], [1280, 800], [1366, 768],
  [1440, 900], [1512, 982], [1707, 1067], [1920, 1080], [1920, 1200], [2560, 1600],
  [2880, 1800], [3840, 2160], [3440, 1440], [5120, 1440], [300, 2000], [2000, 300], [1440, 960],
];

describe('fullscreen camera never shows past the painted map', () => {
  it('sizes every room from its backdrop (1440x960)', () => {
    for (const room of Object.values(ROOM_REGISTRY)) {
      expect(roomMapSize(room), room.id).toEqual({ w: 1440, h: 960 });
    }
  });

  it('zooms in just enough to cover the view, never below the normal zoom', () => {
    expect(coverScale(2880, 960, 1440, 960)).toBe(2);
    expect(coverScale(1440, 1920, 1440, 960)).toBe(2);
    expect(fitCamScale(1280, 800, 1440, 960)).toBe(1.15);
    expect(fitCamScale(3840, 2160, 1440, 960)).toBeCloseTo(2.6667, 3);
  });

  it('keeps all four view edges inside the map for every room, view size, and player spot', () => {
    for (const room of Object.values(ROOM_REGISTRY)) {
      const { w, h } = roomMapSize(room);
      const spots = [
        ...Object.values(room.spawnPoints ?? {}), ...(room.doors ?? []),
        { x: 0, y: 0 }, { x: w, y: 0 }, { x: 0, y: h }, { x: w, y: h }, { x: w / 2, y: h / 2 },
      ];
      for (const [vw, vh] of VIEWS) {
        const s = fitCamScale(vw, vh, w, h);
        for (const spot of spots) {
          const c = clampCamPos(computeCamPos(spot), vw, vh, s, w, h);
          const hw = vw / (2 * s), hh = vh / (2 * s);
          const at = `${room.id} ${vw}x${vh} @${spot.x},${spot.y}`;
          expect(c.x - hw, at).toBeGreaterThanOrEqual(-1e-9);
          expect(c.x + hw, at).toBeLessThanOrEqual(w + 1e-9);
          expect(c.y - hh, at).toBeGreaterThanOrEqual(-1e-9);
          expect(c.y + hh, at).toBeLessThanOrEqual(h + 1e-9);
        }
      }
    }
  });

  it('follows the player freely away from the edges and holds at the edge', () => {
    const s = fitCamScale(1280, 800, 1440, 960);
    expect(clampCamPos({ x: 720, y: 480 }, 1280, 800, s, 1440, 960)).toEqual({ x: 720, y: 480 });
    const corner = clampCamPos({ x: 0, y: 0 }, 1280, 800, s, 1440, 960);
    expect(corner.x).toBeCloseTo(1280 / (2 * s));
    expect(corner.y).toBeCloseTo(800 / (2 * s));
  });

  it('centres an axis the view can not fill', () => {
    expect(clampCamPos({ x: 50, y: 50 }, 2000, 2000, 1, 1440, 960)).toEqual({ x: 720, y: 480 });
  });
});
