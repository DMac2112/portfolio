#!/usr/bin/env node
// Local "deployment" (DOMINIKOS-PLAN §12 / P6): copies the built OS + the edited game1 into
// the deployed-site working copy (portfolio-2026), reproducing the production topology so
// dev-server.js (:4178) serves the whole origin exactly as the live host will:
//   portfolio-2026/            ← classic build ('/', index.html CTAs already repointed)
//   portfolio-2026/os/         ← os/dist/*
//   portfolio-2026/game1/      ← ../game1 (bridge + vendored KAPLAY + embedded tweaks)
// Going live afterwards = uploading those same folders (see deploy/README.md).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(here, '..');
const DIST = path.join(APP, 'dist');
const GAME1_SRC = path.resolve(APP, '..', 'game1');
const FROSTBYTE_SRC = path.resolve(APP, '..', 'frostbyte');
const SITE = path.resolve(APP, '..', '..', 'portfolio-2026');
const OS_DEST = path.join(SITE, 'os');
const GAME1_DEST = path.join(SITE, 'game1');
const FROSTBYTE_DEST = path.join(SITE, 'frostbyte');

if (!fs.existsSync(DIST)) {
  console.error('✖ dist/ not found — run `npm run build` first.');
  process.exit(1);
}
if (!fs.existsSync(SITE)) {
  console.error(`✖ deployed-site copy not found at ${SITE}`);
  process.exit(1);
}

fs.rmSync(OS_DEST, { recursive: true, force: true });
fs.cpSync(DIST, OS_DEST, { recursive: true });
console.log(`✔ os/dist → ${OS_DEST}`);

// game1: overwrite the live copy with the edited one (index.html, main.js, os-bridge.js, vendor/)
fs.cpSync(GAME1_SRC, GAME1_DEST, { recursive: true });
console.log(`✔ ../game1 → ${GAME1_DEST}`);

// frostbyte: same pattern — static peer of /os/ (skip dev-only bits and node_modules)
fs.cpSync(FROSTBYTE_SRC, FROSTBYTE_DEST, {
  recursive: true,
  filter: (src) => !/node_modules|\.test\.js$|dev-server\.cjs$|gen-assets\.js$/.test(src),
});
console.log(`✔ ../frostbyte → ${FROSTBYTE_DEST}`);

console.log('\nLocal topology ready — serve it with: node dev-server.js (in portfolio-2026, :4178)');
