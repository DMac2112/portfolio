// Every backdrop's trace settings, one file per backdrop in ./rooms/<asset>.mjs (default export).
// World px (backdrops are 1440x960).
//   seed       a point on the walkable ground
//   threshold  outline darkness (max channel below it is ink; default 110; 0 disables outlines)
//   dilate     outline thickening (default 2)
//   walkColor  (r,g,b,x,y) => true for colours that can be walked on; everything else is wall
//   wallColor  (r,g,b,x,y) => true for colours that are never walked on (sky, water)
//   thinWalls  r: erase wall strokes thinner than ~2r px (plank seams, floor mortar)
//   area       polygon the ground can never leave
//   barriers   [x0,y0,x1,y1] lines added to the walls (close gaps the paint leaves open)
//   block      rects/polygons that are never ground (sky, water, tree tops the outline misses)
//   carve      rects/polygons whose walls are ignored (painted detail lying ON the ground)
//   walk       rects/polygons forced walkable (door strips that run off the map edge)
//   close/open ground smoothing radii (default 3 / 4), eps: polygon simplification (default 2.5)
//   holeNames  { id: [x, y] } names the hole containing that point
//   props      things standing on the ground: only the bottom `depth` px block, the rest is drawn
//              over anyone behind them. mode: 'base' (one base line, e.g. lamp posts with an
//              overhanging head), 'column' (every column stands on the ground: benches, fountains),
//              'ground' (free in open snow: the prop is whatever in its box isn't ground; fences).
//              seed = a pixel of the prop, box = a box holding it, cuts = lines separating it from
//              touching background paint, shape = template polygons bounding it (see lamp()),
//              z = draw depth override (a base hidden behind a foreground roof), strip = column
//              occluder width (default 20), exact: true = the shape polygons ARE the prop (soft
//              painted shapes with no closed outline, e.g. a tree canopy), footprint = explicit
//              blocking box, trim = boxes dropped from the silhouette.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export { lamp } from './helpers.mjs';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'rooms');
export const ROOMS = Object.fromEntries(await Promise.all(fs.readdirSync(dir)
  .filter((f) => f.endsWith('.mjs'))
  .map(async (f) => [f.slice(0, -4), (await import(pathToFileURL(path.join(dir, f)))).default])));
