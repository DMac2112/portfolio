// Paint pure-module tests (vitest, headless — no DOM). Small hand-built RGBA buffers; every loop is
// bounded and flood-fill is visited-masked, so nothing can hang.
import { describe, it, expect } from 'vitest';
import { hexToRgba, rgbaToHex, rgbaEq, floodFill, linePoints, PALETTE, type RGBA } from './canvas';

/** Build a w*h RGBA buffer filled with one hex colour. */
function img(w: number, h: number, hex: string): Uint8ClampedArray {
  const c = hexToRgba(hex);
  const d = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) { d[i * 4] = c.r; d[i * 4 + 1] = c.g; d[i * 4 + 2] = c.b; d[i * 4 + 3] = c.a; }
  return d;
}
const setHex = (d: Uint8ClampedArray, w: number, x: number, y: number, hex: string): void => {
  const c = hexToRgba(hex), o = (y * w + x) * 4;
  d[o] = c.r; d[o + 1] = c.g; d[o + 2] = c.b; d[o + 3] = c.a;
};
const getHex = (d: Uint8ClampedArray, w: number, x: number, y: number): string => {
  const o = (y * w + x) * 4;
  return rgbaToHex({ r: d[o], g: d[o + 1], b: d[o + 2], a: d[o + 3] });
};
const RED: RGBA = hexToRgba('#ff0000');

/* --------------------------------- colour --------------------------------- */

describe('colour', () => {
  it('hexToRgba parses and round-trips', () => {
    expect(hexToRgba('#ff8800')).toEqual({ r: 255, g: 136, b: 0, a: 255 });
    expect(rgbaToHex(hexToRgba('#1e90ff'))).toBe('#1e90ff');
  });
  it('rgbaEq honours tolerance', () => {
    expect(rgbaEq(hexToRgba('#000000'), hexToRgba('#0a0a0a'), 0)).toBe(false);
    expect(rgbaEq(hexToRgba('#000000'), hexToRgba('#0a0a0a'), 20)).toBe(true);
  });
  it('PALETTE has 28 valid #rrggbb swatches', () => {
    expect(PALETTE.length).toBe(28);
    for (const c of PALETTE) expect(c).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

/* ------------------------------- flood fill ------------------------------- */

describe('flood fill', () => {
  it('fills a solid region and returns the exact count', () => {
    const d = img(3, 3, '#ffffff');
    expect(floodFill(d, 3, 3, 1, 1, RED, 0)).toBe(9);
    for (let i = 0; i < 9; i++) expect(getHex(d, 3, i % 3, (i / 3) | 0)).toBe('#ff0000');
  });

  it('respects a boundary colour', () => {
    const d = img(3, 3, '#ffffff');
    for (let y = 0; y < 3; y++) setHex(d, 3, 1, y, '#000000'); // black wall at x=1
    expect(floodFill(d, 3, 3, 0, 0, RED, 0)).toBe(3);          // only the x=0 column
    expect(getHex(d, 3, 0, 1)).toBe('#ff0000');
    expect(getHex(d, 3, 1, 1)).toBe('#000000');               // wall untouched
    expect(getHex(d, 3, 2, 1)).toBe('#ffffff');               // far side untouched
  });

  it('tolerance fills near colours only', () => {
    const near = () => { const d = img(2, 2, '#ffffff'); setHex(d, 2, 0, 0, '#000000'); setHex(d, 2, 1, 0, '#0a0a0a'); return d; };
    expect(floodFill(near(), 2, 2, 0, 0, RED, 0)).toBe(1);   // exact only
    expect(floodFill(near(), 2, 2, 0, 0, RED, 20)).toBe(2);  // black + near-black
  });

  it('is a no-op when the fill colour equals the target', () => {
    const d = img(3, 3, '#ff0000');
    expect(floodFill(d, 3, 3, 1, 1, RED, 0)).toBe(0);
  });

  it('handles 1x1 and out-of-bounds without crashing', () => {
    expect(floodFill(img(1, 1, '#ffffff'), 1, 1, 0, 0, RED, 0)).toBe(1);
    expect(floodFill(img(3, 3, '#ffffff'), 3, 3, 5, 5, RED, 0)).toBe(0); // OOB seed
  });
});

/* --------------------------------- lines ---------------------------------- */

describe('linePoints', () => {
  const contiguous = (pts: [number, number][]): boolean => pts.every((p, i) => i === 0 || (Math.abs(p[0] - pts[i - 1][0]) <= 1 && Math.abs(p[1] - pts[i - 1][1]) <= 1));
  const check = (x0: number, y0: number, x1: number, y1: number, len: number): void => {
    const pts = linePoints(x0, y0, x1, y1);
    expect(pts[0]).toEqual([x0, y0]);
    expect(pts[pts.length - 1]).toEqual([x1, y1]);
    expect(contiguous(pts)).toBe(true);
    expect(pts.length).toBe(len);
  };
  it('handles horizontal, vertical, diagonal and sloped lines', () => {
    check(0, 0, 3, 0, 4);   // horizontal
    check(0, 0, 0, 3, 4);   // vertical
    check(0, 0, 3, 3, 4);   // 45°
    check(0, 0, 5, 2, 6);   // shallow
    check(3, 3, 0, 0, 4);   // reverse diagonal
    expect(linePoints(2, 2, 2, 2)).toEqual([[2, 2]]); // single point
  });
});
