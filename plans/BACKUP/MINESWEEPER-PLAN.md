# MINESWEEPER — DominikOS game #6 build plan

A complete, implementation-ready plan for adding a Minesweeper-genre game to DominikOS, matching
the conventions established by Space Pinball, Pasjans, Bubble Shooter and Sky Hopper.

Status: **PLAN ONLY — not built.** Root: `C:\Users\domin\OneDrive\Desktop\Websites\dominikos\os`.

---

## 0. What this is (and the one big architectural difference)

An original implementation of the classic mine-finding grid puzzle: reveal cells; numbers show how
many of the 8 neighbours are mines; flag suspected mines; clear every safe cell to win, hit a mine
to lose. Mechanics are a decades-old genre (predates any one product) and are not copyrightable.
**100% original art and code** — no sprites, sounds, palette files or names copied from any product;
passes `npm run gate`.

**Difference from games #2–#5:** those are real-time canvas games driven by `useGameLoop` (rAF).
Minesweeper is **turn-based**. So:
- **DOM grid UI, not canvas** — a `w×h` grid of cell `<button>`s styled with CSS bevels (like Pasjans
  is DOM, not canvas). Cheaper, sharper, trivially accessible.
- **No `useGameLoop` / no rAF.** The only time-based thing is the 1-second game clock, driven by a
  `setInterval` that is gated on the §8.4 active booleans (identical to the Pasjans timer).
- The engine is still a pure, headlessly-unit-tested TS module with a seeded LCG, exactly like the
  others.

---

## 1. Naming & legal (decision needed)

The legal gate (`scripts/legal-gate.mjs`) bans "Microsoft" only inside a `<title>`/JSON `"title"`
field, plus MS asset fingerprints (bliss/luna/segoe/shell32/etc.) and specific product sound names.
It does **not** ban the word "Minesweeper", which is a generic genre term used by countless apps.

**Options for the window title:**
- **A (recommended): `Minesweeper`** — genre-descriptive and instantly recognisable, in the same
  spirit as "Bubble Shooter" / "Space Pinball". Gate-safe.
- **B: an original name** — e.g. `Sapper`, `Minefield`, `Mineshaft`, `Boom Room`. Matches the extra-
  cautious posture used for Pasjans (which avoided "Klondike"/"Solitaire" branding).

Recommendation: **A (`Minesweeper`)**, but this is Dominik's call. The rest of this plan uses the id
`mines` regardless of the chosen display title.

Everything visual is redrawn in code (see §9). Nothing traced from any existing minesweeper build.

---

## 2. Files & integration (the §8.6 add-a-game contract)

| File | Purpose |
|---|---|
| `src/os/games/mines/engine.ts` | pure rules engine (LOCKED CONTRACT), seeded LCG |
| `src/os/games/mines/engine.test.ts` | vitest headless suite (§10) |
| `src/os/games/mines/MinesApp.tsx` | DOM-grid UI + input + timer |
| `registry/mines.json` | manifest (`kind:"react"`, `category:"games"`) |
| `public/icons/mines.svg` | original 48×48 icon (a beveled tile with a mine + flag) |
| `src/styles/globals.css` | a new `/* ==== Minesweeper ==== */` block |
| `ASSET-CREDITS.md` | one credit row |
| `src/os/registry.ts` | one line into `componentById` |

**`registry/mines.json`:**
```json
{
  "id": "mines",
  "title": "Minesweeper",
  "kind": "react",
  "icon": "/os/icons/mines.svg",
  "category": "games",
  "desktop": { "show": false },
  "startMenu": { "show": true, "group": "Games" },
  "window": { "width": 380, "height": 470, "minWidth": 300, "minHeight": 380, "singleton": true, "maximizedOnMobile": true }
}
```
**`registry.ts`** → add to `componentById` (alongside pinball/pasjans/bubble/flappy):
```ts
mines: lazy(() => import('./games/mines/MinesApp')),
```
The Games folder auto-lists `category:"games"` — no folder edit. Manifests live at `<root>/registry/`
(Vite base `/os/` strips the glob), same as the sibling game JSONs.

Window default fits **Intermediate** comfortably; the board scales to fit (see §8, "responsive tiles")
so **Expert** (30 wide) fits without a horizontal scrollbar.

---

## 3. Engine public API (LOCKED)

Header block, mirroring the other engines' LOCKED-CONTRACT style:

```ts
// Minesweeper — original grid-logic engine for DominikOS (game #6). PURE TypeScript: NO DOM, NO
// React. Plain-data state + functions, unit-tested headlessly (engine.test.ts). Classic mine-finding
// genre; every constant, the number palette and the difficulty presets are authored here — nothing
// sampled or copied.
//
// ============================ CONTRACT (LOCKED) ============================
// The public API below is the contract the UI (MinesApp.tsx) builds against.
//
// Board: cells[] length w*h, ROW-MAJOR (index = r*w + c). Each cell = { mine, adj, state }, where
//   state ∈ 'hidden'|'revealed'|'flagged'|'question'. Mines are placed LAZILY on the FIRST reveal so
//   that cell AND its 8 neighbours are guaranteed mine-free (first-click-safe). adj = # of the up-to-8
//   neighbouring mines, computed once after placement.
// Flow: 'ready' (no mines yet) → first reveal() places mines + → 'play' → reveal/flag/chord until a
//   mine is revealed ('lost', all mines shown) or every non-mine cell is revealed ('won').
// Events: reveal()/toggleFlag()/chord() append GameEvents to a caller-owned array (out-param model,
//   like the other engines) so the UI plays tone() sfx + updates the smiley/live-region. Engine silent.
// RNG: one 32-bit LCG on the state (Numerical-Recipes constants, upper-16-bit extraction, exactly like
//   pasjans/bubble/flappy) shuffles the mine positions. seed + first-click cell → byte-identical board.
// ==========================================================================
```

### 3.1 Constants
```ts
export interface Difficulty { w: number; h: number; mines: number; }
export const BEGINNER: Difficulty     = { w: 9,  h: 9,  mines: 10 };
export const INTERMEDIATE: Difficulty = { w: 16, h: 16, mines: 40 };
export const EXPERT: Difficulty       = { w: 30, h: 16, mines: 99 };
export const MAX_W = 30, MAX_H = 24;                 // custom-board clamps
export const MIN_W = 5,  MIN_H = 5;
export const MAX_TIME = 999;                          // UI clock cap (engine is timeless)

// Classic functional number colours (convention, not copyrightable) — index === adjacency count.
export const NUMBER_COLORS: readonly string[] = [
  '',        // 0 (blank)
  '#1a44d6', // 1 blue
  '#2e8b2e', // 2 green
  '#d62a2a', // 3 red
  '#1a1a8c', // 4 navy
  '#8b1a1a', // 5 maroon
  '#118b8b', // 6 teal
  '#2a2a2a', // 7 near-black
  '#7a7a7a', // 8 grey
];
```

### 3.2 Types
```ts
export type CellState = 'hidden' | 'revealed' | 'flagged' | 'question';
export type Status = 'ready' | 'play' | 'won' | 'lost';

export interface Cell { mine: boolean; adj: number; state: CellState; }

export interface MineState {
  w: number; h: number; mines: number;
  cells: Cell[];            // w*h, row-major
  status: Status;
  flags: number;            // # flagged cells
  revealed: number;         // # revealed cells
  placed: boolean;          // mines placed yet?
  boom: number;             // index of the fatal mine, else -1
  allowMarks: boolean;      // '?' cycle enabled (classic "Marks" option)
  seed: number; rng: number; seeded: boolean;
}

export type GameEvent =
  | { type: 'reveal'; count: number }             // cells opened this action
  | { type: 'flag';   index: number; on: boolean } // on=true flagged, false unflagged
  | { type: 'chord';  index: number }
  | { type: 'boom';   index: number }             // stepped on a mine
  | { type: 'win' }
  | { type: 'lose' };
```

### 3.3 Functions (one-line semantics)
```ts
export function newGame(cfg: Difficulty & { allowMarks?: boolean }, seed?: number): MineState;
// All-hidden 'ready' board, no mines yet. seed → deterministic placement on first reveal.

export function restart(state: MineState, seed?: number): void;  // in-place, same config, fresh board

export function reveal(state: MineState, r: number, c: number, ev: GameEvent[]): boolean;
// First reveal places mines (first-click-safe) and flips to 'play'. Reveals (r,c); if adj===0
// flood-fills the zero-region + its border. Hitting a mine → 'lost' + all mines shown + boom/lose.
// Clearing the last safe cell → 'won'. No-op (returns false) on flagged/revealed cells or when over.

export function toggleFlag(state: MineState, r: number, c: number, ev: GameEvent[]): boolean;
// Cycle hidden → flagged → (question if allowMarks) → hidden on a covered cell. Updates flags.
// No-op on revealed cells or when over.

export function chord(state: MineState, r: number, c: number, ev: GameEvent[]): boolean;
// On a REVEALED number whose flagged-neighbour count === its adj, reveal all other covered neighbours
// (a wrong flag → a real mine gets revealed → 'lost'). No-op otherwise.

// pure helpers (exported for tests + UI)
export function idx(state: MineState, r: number, c: number): number;         // r*w + c
export function inBounds(state: MineState, r: number, c: number): boolean;
export function neighbors(state: MineState, r: number, c: number): number[]; // up to 8 indices
export function remaining(state: MineState): number;                          // mines - flags (may be < 0)
export function isWon(state: MineState): boolean;                             // revealed === w*h - mines
```

---

## 4. Algorithms (pseudocode)

```
newGame(cfg, seed?):
  w,h,mines = cfg;  cells = w*h × { mine:false, adj:0, state:'hidden' }
  status='ready'; flags=0; revealed=0; placed=false; boom=-1
  allowMarks = cfg.allowMarks ?? false
  seeded = seed!==undefined; rng = (seed??0)>>>0

randInt(s, bound):  // identical idiom to the other engines
  if !s.seeded: return floor(Math.random()*bound)
  s.rng = (s.rng*1664525 + 1013904223) >>> 0
  return (s.rng >>> 16) % bound

placeMines(s, safeR, safeC):
  safe = set of idx(safeR,safeC) + its in-bounds neighbours
  pool = [all indices not in safe]
  n = min(s.mines, pool.length)                 // fallback for tiny/over-mined custom boards
  // seeded Fisher–Yates on pool, take first n
  for i = pool.length-1 .. 1: j = randInt(s, i+1); swap(pool[i], pool[j])
  for k in 0..n-1: s.cells[pool[k]].mine = true
  s.mines = n
  // adjacency counts
  for each cell i: s.cells[i].adj = count of neighbours(i) that are mines
  s.placed = true

reveal(s, r, c, ev):
  if s.status==='won' || s.status==='lost': return false
  if !s.placed: placeMines(s, r, c); s.status='play'
  cell = s.cells[idx(r,c)]
  if cell.state!=='hidden' && cell.state!=='question': return false   // flagged/revealed → ignore
  if cell.mine:
    cell.state='revealed'; s.boom=idx(r,c)
    for every mine cell not flagged: state='revealed'      // classic "show all mines"
    s.status='lost'; ev.push({boom, index}); ev.push({lose}); return true
  // flood fill (BFS) — open this cell; if adj===0 keep opening 0-region + numbered border
  opened=0; stack=[idx(r,c)]
  while stack:
    i=stack.pop(); if s.cells[i].state==='revealed': continue
    if s.cells[i].state==='flagged': continue
    s.cells[i].state='revealed'; s.revealed++; opened++
    if s.cells[i].adj===0: for nb in neighbours(i): if covered(nb): stack.push(nb)
  ev.push({reveal, count:opened})
  if isWon(s): s.status='won'; autoFlagRemaining(s); ev.push({win})
  return true

toggleFlag(s, r, c, ev):
  if over: return false
  cell = s.cells[idx(r,c)]
  switch cell.state:
    'hidden':   cell.state='flagged'; s.flags++; ev.push({flag,on:true})
    'flagged':  cell.state = s.allowMarks ? 'question' : 'hidden'; s.flags--; ev.push({flag,on:false})
    'question': cell.state='hidden'
    'revealed': return false
  return true

chord(s, r, c, ev):
  cell=s.cells[idx(r,c)]
  if s.status!=='play' || cell.state!=='revealed' || cell.adj===0: return false
  flagged = count neighbours that are 'flagged'
  if flagged !== cell.adj: return false
  ev.push({chord, index}); for nb in neighbours where covered && !flagged: reveal(nb)  // may boom
  return true

isWon(s): return s.revealed === s.w*s.h - s.mines
remaining(s): return s.mines - s.flags
```

**Traps to watch (call out in code comments):** row-major index math; the 3×3 first-click-safe zone
must shrink to just the clicked cell if `mines > w*h - 9` (tiny custom boards); flood-fill must not
cross flagged cells; `won` is checked by `revealed` count, not by flags; chord re-uses `reveal()` so a
mis-flag correctly detonates.

---

## 5. Event model

| Event | Fired when | UI reaction |
|---|---|---|
| `reveal` | cells opened by a click/chord (`count`) | dig tick sfx; refresh grid |
| `flag` | a cell is flagged/unflagged | flag tick; update mine counter |
| `chord` | a valid chord fires | soft tick |
| `boom` | a mine is revealed (`index`) | explosion sfx; mark the fatal cell red |
| `win` | last safe cell cleared | win jingle; smiley → "cool"; save best time |
| `lose` | after `boom` | lose tone; smiley → "dead" |

Engine appends to a caller-owned `ev: GameEvent[]`; it never plays sound or touches the DOM.

---

## 6. UI plan — `MinesApp.tsx` (DOM, XP-styled)

**Shell & pause (plan §8.4):**
```ts
const visible = usePageVisible();
const minimized = useOSStore(st => st.windows[windowId]?.state === 'minimized');
const { prefs } = useSystem();
const active = focused && visible && !minimized;
// NO useGameLoop. A setInterval(1s) runs only while (active && status==='play'); it pauses when the
// window loses focus/visibility/minimises (same contract as the Pasjans clock).
```

**Layout (three rows, classic):**
1. **Menu strip** — a "Game" menu (reuse Pasjans's `.pasjans__menu` pattern): New (F2), —,
   Beginner / Intermediate / Expert (radio) + Custom…, —, Marks (?) toggle, Best times.
2. **Status header** (sunken panel): left = **mine counter** (3-digit 7-segment LED, red-on-black,
   shows `remaining()`, clamped to `-99..999`); centre = **smiley reset button**; right = **timer**
   (3-digit LED, `min(elapsed, 999)`).
3. **Board** — a `w×h` CSS grid of cell buttons.

**Cell rendering (state → look, all CSS/SVG, see §9):**
- `hidden` → raised bevel, blank. `flagged` → raised + flag glyph. `question` → raised + "?".
- `revealed` blank → sunken flat. `revealed` numbered → sunken + coloured digit (NUMBER_COLORS).
- `revealed` mine → sunken + mine glyph; the **fatal** cell (`boom`) gets a red background.
- on `lost`: reveal all mines; a flag on a non-mine shows a struck-through mine (mis-flag).

**Smiley states (original SVG faces):** neutral (play), worried/o-mouth (while a cell is pressed),
sunglasses (won), dead X-eyes (lost). Clicking it = New game.

**Input (mouse / touch / keyboard — fully operable each way):**
- Left-click reveal · right-click flag-cycle (`onContextMenu`, preventDefault) · both-buttons **or**
  middle-click **or** left-click on an already-revealed number = chord.
- Touch: tap = reveal; **long-press (~450 ms)** = flag; tap on a number = chord.
- Keyboard (roving-tabindex cursor over the grid, matching IconGrid/Pasjans a11y): Arrows move the
  cursor; **Enter/Space** = reveal; **F** = flag-cycle; **C** (or double-Enter) = chord; **F2** = new.
- Attach global keydown only while `active`.

**Accessibility (REQUIRED — the Bubble review dinged a missing live region):**
- Board is `role="grid"`; each cell is a `role="gridcell"` button with an `aria-label` that reflects
  state: "hidden", "flagged", "question mark", "N adjacent mines", "empty", "mine".
- An `sr-only` `aria-live="polite"` region announces: game start, `remaining()` after flagging,
  win ("Cleared! Time N seconds"), and loss ("Boom — game over. Press F2 for a new game").
- Colour is never the only signal — every number is also its digit; mine/flag are distinct glyphs.

**reducedMotion:** no smiley bounce, no cell-press scale; reveals are instant (they already are).
**largeText:** the menu/best-times dialog scale; the fixed-geometry board/LED stay authentic.
**Sound** (`tone`, gated on `prefs.muted`): `reveal` soft 300 Hz tick; `flag` 520 Hz blip;
`chord` 240 Hz; `boom` 140 Hz sawtooth + a short 90 Hz tail; `win` 3-note rising fanfare.

**Best times:** `localStorage['dmos.v1.mines']` = `{ beginner, intermediate, expert }` seconds; a cleared
game under the stored best updates it; the Best-times dialog lists all three.

**Responsive tiles (window-fit):** `tile = clamp(floor((boardAreaWidth) / w), 16, 26)`px so Expert
(30 wide) shrinks tiles to fit the window with no horizontal scroll; the grid uses
`grid-template-columns: repeat(w, tile)`. Board recomputes tile size on ResizeObserver.

---

## 7. Difficulty & custom

- Presets from §3.1. Selecting one calls `newGame(preset)`.
- **Custom…** dialog: width 5–30, height 5–24, mines 1..(w·h−9); validated + clamped. (Optional for
  v1 — presets alone are a complete game; Custom is a nice-to-have.)
- Marks (?) toggle flips `allowMarks` and is persisted with prefs-style localStorage.

---

## 8. Art plan (100% original, code-drawn — passes the gate)

- **Bevels:** raised tile = 2px light top/left + dark bottom/right borders on `#bdbdbd`; revealed =
  1px flat `#7b7b7b` inset. Pure CSS (the same border-bevel technique as xp.css chrome; our own rules).
- **Numbers:** the NUMBER_COLORS digits, bold, centred. CSS only.
- **Mine:** original SVG — black disc + 4/8 spokes + a white specular square. (`public` inline or a
  small component.)
- **Flag:** original SVG — red triangle pennant on a black pole with a base bar.
- **Question mark / mis-flag:** "?" glyph; mis-flag = mine with a red diagonal strike.
- **Smiley:** 4 original SVG faces (neutral / worried / sunglasses / dead). Yellow disc, simple
  features — deliberately NOT the classic bitmap.
- **LED counters:** 7-segment digits drawn as CSS/SVG segments, red `#ff2a2a` on `#200` — original.
- **Icon** `public/icons/mines.svg` (48×48): a single raised beveled tile with a small mine + a red
  flag corner, in the grey/red palette. Original.

No banned tokens anywhere (no "Microsoft"/"Windows XP startup"/"bliss"/"luna"/etc.).

---

## 9. Unit test plan (`engine.test.ts`, vitest, headless)

1. `newGame(BEGINNER)` → 81 cells, all hidden, status 'ready', `placed===false`, no mines set.
2. **First-click safe:** first `reveal(r,c)` places exactly `mines` mines, and neither (r,c) nor any
   of its 8 neighbours is a mine. Repeat across several seeds/positions.
3. **Determinism:** same seed + same first-click → deep-equal `cells` + `rng`; different seeds differ.
4. **Adjacency:** for a hand-built board, every cell's `adj` equals its mine-neighbour count.
5. **Flood fill:** revealing a 0-cell opens its whole zero-region plus the numbered border; nothing
   beyond; `revealed` count matches.
6. **Boom:** revealing a mine → status 'lost', `boom` set, all (unflagged) mines revealed, boom+lose.
7. **Win:** reveal every safe cell → status 'won', `win` event, `revealed === w*h - mines`.
8. **Flag cycle:** hidden→flagged→(question w/ allowMarks)→hidden; `flags` tracks; `remaining()` right.
9. Flag/reveal/chord are **no-ops after game over** and on already-revealed cells.
10. **Chord opens** when flags match; **chord detonates** when a flag is misplaced (real mine unflagged).
11. Chord on a 0-cell / covered cell / mismatched flag count → no-op.
12. `remaining()` goes **negative** when over-flagged.
13. **Tiny-board fallback:** a 5×5 board with 20 mines still places safely (safe-zone shrinks to the
    clicked cell) and stays winnable/consistent.
14. Row-major `idx`/`inBounds`/`neighbors`: corners give 3 neighbours, edges 5, interior 8.

---

## 10. Resolved design decisions

1. **DOM grid, not canvas** — turn-based; no rAF; sharper text; native a11y. (Only the clock uses a
   §8.4-gated `setInterval`.)
2. **Lazy, first-click-safe mine placement** — mines placed on first reveal excluding the 3×3 around
   the click, so the first click always opens an area. Seeded for determinism.
3. **Win by revealed-count**, not by flag-count (flags are optional/advisory).
4. **Chord re-uses `reveal()`** so a wrong flag correctly detonates (classic behaviour).
5. **Question marks off by default**, behind a "Marks (?)" toggle (classic option).
6. **Responsive tile sizing** so Expert fits the window without scrolling.
7. **Best times per difficulty** in `dmos.v1.mines`.
8. **`remaining()` may be negative** (over-flagging) — displayed clamped in the LED.

---

## 11. Implementation phases

- **P1 — Engine:** `engine.ts` + `engine.test.ts`; get all §9 tests green (`vitest run <file>`).
- **P2 — UI:** `MinesApp.tsx` (grid, header, smiley, timer, input, a11y live region) + CSS bevels + art.
- **P3 — Wire-up:** `registry/mines.json`, `registry.ts` line, `mines.svg` icon, `ASSET-CREDITS.md` row.
- **P4 — CI:** `npm run ci` green (typecheck, tests, build, gate). One bounded run.
- **P5 — Review:** adversarial multi-dimension review (engine edge-cases, a11y, §8.4 pause, integration,
  gameplay) → fix confirmed findings.
- **P6 — Deploy:** `npm run deploy:local`; manual test on the running static server; then Netlify.

Each heavy run (vitest/build/CI) is **bounded and one-at-a-time** per the standing process-hygiene rule.

---

## 12. Open questions for Dominik

1. **Title:** "Minesweeper" (recommended) or an original name (§1)?
2. **Custom board dialog** in v1, or presets-only to start?
3. **Question marks** default on or off? (plan assumes off, toggle available)
4. **Best-times persistence** — keep local only, or (later) surface on the résumé/leaderboard?
