#!/usr/bin/env node
// Vendor sync into the Astro rework's static tree (OS-INTEGRATION-PLAN §1). Reproduces the
// deployed three-peer topology on one origin — Astro serves public/ verbatim:
//   portfolio-rework/public/os/        ← os/dist/*        (delete-then-copy)
//   portfolio-rework/public/game1/     ← ../game1
//   portfolio-rework/public/frostbyte/ ← ../frostbyte     (minus tests/dev/gen)
// DELETE-then-copy each target so orphaned old hashed chunks (cached immutable) don't linger.
// The two former index.html hand-edits (self-canonical /os/, @view-transition) are now upstreamed
// into os/index.html source, so a fresh dist already carries them — no post-copy patching.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(here, '..');
const DIST = path.join(APP, 'dist');
const GAME1_SRC = path.resolve(APP, '..', 'game1');
const FROSTBYTE_SRC = path.resolve(APP, '..', 'frostbyte');
const PUBLIC = path.resolve(APP, '..', '..', 'portfolio-rework', 'public');

if (!fs.existsSync(DIST)) {
  console.error('✖ dist/ not found — run `npm run build` first.');
  process.exit(1);
}
if (!fs.existsSync(PUBLIC)) {
  console.error(`✖ rework public/ not found at ${PUBLIC}`);
  process.exit(1);
}

function resync(label, src, dest, filter) {
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(src, dest, { recursive: true, filter });
  console.log(`✔ ${label} → ${dest}`);
}

// Skip dev-only + test files and node_modules when vendoring the raw game folder.
const shipFrostbyte = (src) => !/node_modules|\.test\.js$|dev-server\.cjs$|gen-assets\.js$|[\\/]package(-lock)?\.json$|vitest\.config\.js$/.test(src);

resync('os/dist', DIST, path.join(PUBLIC, 'os'));
resync('../game1', GAME1_SRC, path.join(PUBLIC, 'game1'));
resync('../frostbyte', FROSTBYTE_SRC, path.join(PUBLIC, 'frostbyte'), shipFrostbyte);

console.log('\nRework public/ synced — three peers (/os, /game1, /frostbyte) in place.');
