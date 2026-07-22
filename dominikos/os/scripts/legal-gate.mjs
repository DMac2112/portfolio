#!/usr/bin/env node
// Legal grep-gate (DOMINIKOS-PLAN §6, mandatory). Scans the repo + built output + the shipped
// /game1/ folder and FAILS on any Microsoft-owned asset fingerprint:
//   - banned FILENAMES: bliss/luna/segoe/tahoma/verdana/franklin/shell32/imageres, .ani/.cur
//     (fonts may be *referenced by name* in CSS font stacks (§5.4) — only shipping FILES is banned)
//   - banned CONTENT anywhere: bliss, shell32/imageres, known MS sound names
//   - "luna" in USER-FACING copy (.json/.md/.html/.txt) — internal token names in CSS/TS are allowed
//   - "Microsoft" inside any <title> tag or JSON "title" field
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(here, '..');
const GAME1 = path.resolve(APP, '..', 'game1');
const FROSTBYTE = path.resolve(APP, '..', 'frostbyte');

const SCAN_ROOTS = [
  path.join(APP, 'index.html'),
  path.join(APP, 'public'),
  path.join(APP, 'os'),
  path.join(APP, 'src'),
  path.join(APP, 'dist'), // built output, when present
  GAME1,                  // ships alongside /os/
  FROSTBYTE,              // ships alongside /os/
];

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist-report']);
const TEXT_EXT = new Set(['.html', '.css', '.js', '.mjs', '.ts', '.tsx', '.json', '.md', '.txt', '.svg', '.webmanifest']);
const USER_COPY_EXT = new Set(['.json', '.md', '.html', '.txt']);

const BANNED_FILENAME = /(bliss|luna|segoe|tahoma|verdana|franklin|shell32|imageres)/i;
const BANNED_EXT = new Set(['.ani', '.cur']);
const BANNED_CONTENT_ANY = [
  { re: /bliss/i, why: 'Bliss wallpaper reference' },
  { re: /shell32|imageres/i, why: 'Windows system-resource reference' },
  { re: /tada\.wav|windows\s+logon|windows\s+xp\s+startup/i, why: 'MS system sound name' },
  { re: /space\s*cadet|maxis|cinematronics/i, why: 'mark from the original 3D-pinball product (our table is an original homage)' },
  { re: /club ?penguin/i,  why: 'Disney trademark — Frostbyte is an original homage only' },
  { re: /puffle/i,         why: 'copyrighted Club Penguin creature name' },
  { re: /card[- ]?jitsu/i, why: 'named Club Penguin minigame' },
  { re: /\bmoshi\s*monsters?\b/i, why: 'competing penguin-adjacent social-world trademark' },
  { re: /\bdisney\b/i,     why: 'Disney corporate/trademark reference' },
];
const LUNA_USER_COPY = { re: /luna/i, why: '"Luna" surfaced in user-facing copy (allowed only as internal token name)' };
const MS_IN_TITLE_HTML = { re: /<title>[^<]*microsoft/i, why: '"Microsoft" in an HTML <title>' };
const MS_IN_TITLE_JSON = { re: /"title"\s*:\s*"[^"]*microsoft/i, why: '"Microsoft" in a JSON "title" field' };

const failures = [];
let scanned = 0;

function scanFile(file) {
  const base = path.basename(file);
  const ext = path.extname(file).toLowerCase();
  if (base === 'legal-gate.mjs') return; // the rule list itself

  if (BANNED_EXT.has(ext)) failures.push(`${file}: banned file extension "${ext}" (extracted cursor format)`);
  if (BANNED_FILENAME.test(base)) failures.push(`${file}: banned filename token`);

  if (!TEXT_EXT.has(ext)) return;
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return;
  }
  scanned++;

  for (const rule of BANNED_CONTENT_ANY) {
    if (rule.re.test(text)) failures.push(`${file}: ${rule.why}`);
  }
  if (USER_COPY_EXT.has(ext) && LUNA_USER_COPY.re.test(text)) {
    failures.push(`${file}: ${LUNA_USER_COPY.why}`);
  }
  if (ext === '.html' && MS_IN_TITLE_HTML.re.test(text)) failures.push(`${file}: ${MS_IN_TITLE_HTML.why}`);
  if (ext === '.json' && MS_IN_TITLE_JSON.re.test(text)) failures.push(`${file}: ${MS_IN_TITLE_JSON.why}`);
}

function walk(p) {
  if (!fs.existsSync(p)) return;
  const stat = fs.statSync(p);
  if (stat.isFile()) return scanFile(p);
  if (!stat.isDirectory() || SKIP_DIRS.has(path.basename(p))) return;
  for (const entry of fs.readdirSync(p)) walk(path.join(p, entry));
}

for (const root of SCAN_ROOTS) walk(root);

if (failures.length) {
  console.error(`\n✖ LEGAL GATE FAILED — ${failures.length} finding(s):\n`);
  for (const f of failures) console.error('  · ' + f);
  console.error('\nShip ZERO Microsoft-owned bits (DOMINIKOS-PLAN §6).');
  process.exit(1);
}
console.log(`✔ legal gate clean (${scanned} text files scanned)`);
