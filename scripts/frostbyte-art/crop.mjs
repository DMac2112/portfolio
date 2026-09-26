// Zoomed crops of a full-res (1440x960) image for measuring the art, with world-px ticks
// (every 20px, labelled every 100). Boxes are tiled left to right in one PNG.
//   $env:CROP_ZOOM='2'; node scripts/frostbyte-art/crop.mjs <image> <out.png> x0,y0,x1,y1 [x0,y0,x1,y1 ...]
import { sharp } from './art.mjs';

const [src, out, ...boxes] = process.argv.slice(2);
const Z = Number(process.env.CROP_ZOOM ?? 1);
const { width: W, height: Hmax } = await sharp(src).metadata();
const tiles = [];
let x = 0, H = 0;
for (const b of boxes) {
  // Boxes running past the image edge are clamped to it.
  const [bx0, by0, bx1, by1] = b.split(',').map(Number);
  const x0 = Math.max(0, Math.min(bx0, bx1)), y0 = Math.max(0, Math.min(by0, by1));
  const x1 = Math.min(W, Math.max(bx0, bx1)), y1 = Math.min(Hmax, Math.max(by0, by1));
  if (x1 - x0 < 2 || y1 - y0 < 2) { console.log(`skipped box ${b}: outside the ${W}x${Hmax} image`); continue; }
  const w = x1 - x0, h = y1 - y0;
  const grid = [];
  for (let gx = Math.ceil(x0 / 20) * 20; gx < x1; gx += 20) grid.push(`<line x1="${gx - x0}" y1="0" x2="${gx - x0}" y2="${gx % 100 ? 4 : 10}" stroke="#ff0" stroke-width="1"/>` + (gx % 100 ? '' : `<text x="${gx - x0 + 1}" y="18" font-size="10" fill="#ff0">${gx}</text>`));
  for (let gy = Math.ceil(y0 / 20) * 20; gy < y1; gy += 20) grid.push(`<line x1="0" y1="${gy - y0}" x2="${gy % 100 ? 4 : 10}" y2="${gy - y0}" stroke="#ff0" stroke-width="1"/>` + (gy % 100 ? '' : `<text x="12" y="${gy - y0 + 4}" font-size="10" fill="#ff0">${gy}</text>`));
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${grid.join('')}</svg>`);
  const base = await sharp(src).extract({ left: x0, top: y0, width: w, height: h }).composite([{ input: svg }]).png().toBuffer();
  const buf = Z === 1 ? base : await sharp(base).resize(w * Z, h * Z, { kernel: 'nearest' }).png().toBuffer();
  tiles.push({ input: buf, left: x, top: 0 });
  x += w * Z + 6; H = Math.max(H, h * Z);
}
await sharp({ create: { width: x, height: H, channels: 3, background: '#000' } }).composite(tiles).png().toFile(out);
