// Paint — pure raster helpers for DominikOS's paint app. NO DOM: everything operates on plain
// Uint8ClampedArray RGBA buffers so it unit-tests headlessly (canvas.test.ts). The UI (PaintApp.tsx)
// reads pixels out of a <canvas> ImageData, calls these, and writes them back. All authored here.
//
// ============================ CONTRACT (LOCKED) ============================
// The exports below are the contract the UI builds against. Buffers are row-major RGBA, 4 bytes per
// pixel, index = (y*w + x)*4.
// ==========================================================================

export interface RGBA { r: number; g: number; b: number; a: number; }

/** '#rrggbb' -> { r, g, b, 255 }. */
export function hexToRgba(hex: string): RGBA {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 255 };
}

/** { r, g, b } -> '#rrggbb' (alpha ignored). */
export function rgbaToHex(c: RGBA): string {
  return '#' + (((c.r & 255) << 16) | ((c.g & 255) << 8) | (c.b & 255)).toString(16).padStart(6, '0');
}

/** Per-channel match within +/- tol (tol default 0 = exact). */
export function rgbaEq(a: RGBA, b: RGBA, tol = 0): boolean {
  return Math.abs(a.r - b.r) <= tol && Math.abs(a.g - b.g) <= tol && Math.abs(a.b - b.b) <= tol && Math.abs(a.a - b.a) <= tol;
}

// Classic 2-row 28-swatch palette — a functional convention, authored here (no vendor file).
export const PALETTE: readonly string[] = [
  '#000000', '#7b7b7b', '#8b0000', '#8b6d00', '#006400', '#00646d', '#00008b',
  '#5a008b', '#8b008b', '#5c3a1e', '#3a5c1e', '#1e3a5c', '#4a4a4a', '#2a2a2a',
  '#ffffff', '#c0c0c0', '#ff0000', '#ffcf00', '#00c000', '#00c0c0', '#0000ff',
  '#8a2be2', '#ff00ff', '#c8905a', '#90c85a', '#5a90c8', '#a0a0a0', '#e0e0e0',
];

function pixel(data: Uint8ClampedArray, i: number): RGBA {
  const o = i * 4;
  return { r: data[o], g: data[o + 1], b: data[o + 2], a: data[o + 3] };
}
function paint(data: Uint8ClampedArray, i: number, c: RGBA): void {
  const o = i * 4;
  data[o] = c.r; data[o + 1] = c.g; data[o + 2] = c.b; data[o + 3] = c.a;
}

/** Paint-bucket: 4-connected flood fill from (x,y) over pixels within `tol` of the sampled colour.
 *  Mutates `data`; returns the number of pixels changed. No-op (0) if the fill colour already sits
 *  there. A `visited` mask guarantees each pixel is processed once, so it always terminates. */
export function floodFill(data: Uint8ClampedArray, w: number, h: number, x: number, y: number, fill: RGBA, tol = 0): number {
  if (x < 0 || y < 0 || x >= w || y >= h) return 0;
  const start = y * w + x;
  const target = pixel(data, start);
  if (rgbaEq(target, fill, 0)) return 0;
  const visited = new Uint8Array(w * h);
  const stack: number[] = [start];
  visited[start] = 1;
  let count = 0;
  while (stack.length) {
    const i = stack.pop()!;
    if (!rgbaEq(pixel(data, i), target, tol)) continue; // boundary
    paint(data, i, fill);
    count++;
    const px = i % w, py = (i / w) | 0;
    if (px > 0 && !visited[i - 1]) { visited[i - 1] = 1; stack.push(i - 1); }
    if (px < w - 1 && !visited[i + 1]) { visited[i + 1] = 1; stack.push(i + 1); }
    if (py > 0 && !visited[i - w]) { visited[i - w] = 1; stack.push(i - w); }
    if (py < h - 1 && !visited[i + w]) { visited[i + w] = 1; stack.push(i + w); }
  }
  return count;
}

/** Integer Bresenham points from (x0,y0) to (x1,y1) inclusive — each step moves <=1 in x and y, so
 *  fast pencil strokes interpolate with no gaps. */
export function linePoints(x0: number, y0: number, x1: number, y1: number): [number, number][] {
  const pts: [number, number][] = [];
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy, x = x0, y = y0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    pts.push([x, y]);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }
  return pts;
}
