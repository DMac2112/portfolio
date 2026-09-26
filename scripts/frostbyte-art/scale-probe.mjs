// Offline scale check: the real penguin sprite (body + belly, facing down, tinted like the default
// avatar) composited onto a room backdrop at a given avatar scale, feet at each world point — the
// same bottom-anchored placement as world/build-avatar.js. For judging whether the penguin is the
// right size against the painted doors, furniture and people-sized props.
//   node scripts/frostbyte-art/scale-probe.mjs <asset> <out.png> <scale> x,y[,scale] [...] [--crop x0,y0,x1,y1] [--zoom 2] [--width 720]
// <asset> is a backdrop name like room-plaza; the default avatar is 16px tall, so scale 3 = 48 world px.
// A point's optional third number overrides <scale> for that penguin, to compare sizes side by side.
import path from 'node:path';
import { FB, sharp } from './art.mjs';

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(name);
  return i < 0 ? null : args.splice(i, 2)[1];
};
const crop = opt('--crop')?.split(',').map(Number);
const zoom = Number(opt('--zoom') ?? 1);
const width = Number(opt('--width') ?? 0);
const [asset, out, scaleArg, ...points] = args;
const scale = Number(scaleArg);
if (!asset || !out || !(scale > 0)) {
  console.error('usage: scale-probe.mjs <asset> <out.png> <scale> x,y[,scale] [...] [--crop x0,y0,x1,y1] [--zoom 2] [--width 720]');
  process.exit(1);
}

const frame = { left: 0, top: 0, width: 16, height: 16 };
const body = await sharp(path.join(FB, 'assets/penguin-body.png')).extract(frame).tint('#2f5f9e').png().toBuffer();
const belly = await sharp(path.join(FB, 'assets/penguin-belly.png')).extract(frame).png().toBuffer();
const base = await sharp(body).composite([{ input: belly }]).png().toBuffer();
const sprites = new Map();
const spriteAt = async (size) => {
  if (!sprites.has(size)) sprites.set(size, await sharp(base).resize(size, size, { kernel: 'nearest' }).png().toBuffer());
  return sprites.get(size);
};

const comps = [];
for (const p of points) {
  const [x, y, s = scale] = p.split(',').map(Number);
  const size = Math.round(16 * s);
  comps.push({ input: await spriteAt(size), left: Math.round(x - size / 2), top: Math.round(y - size) });
}
let img = sharp(await sharp(path.join(FB, `assets/${asset}.jpg`)).composite(comps).png().toBuffer());
if (crop) {
  const [x0, y0, x1, y1] = crop;
  img = sharp(await img.extract({ left: x0, top: y0, width: x1 - x0, height: y1 - y0 }).png().toBuffer());
}
if (zoom !== 1) {
  const { width, height } = await img.metadata();
  img = sharp(await img.resize(Math.round(width * zoom), Math.round(height * zoom), { kernel: 'nearest' }).png().toBuffer());
}
if (width) img = sharp(await img.resize(width).png().toBuffer());
await img.png().toFile(out);
console.log(`${asset}: ${points.length} penguin(s) -> ${out}`);
