# CARD-HUB-PLAN — Pasjans → Gry Karciane

Status: **PLAN ONLY — not built.** Root: `C:\Users\domin\OneDrive\Desktop\Websites\dominikos\os`. Matches the conventions of `MINESWEEPER-PLAN.md` / `OS-INTEGRATION-PLAN.md`.

Converts Pasjans into a desktop "Card Game Hub" — a small launcher (**Gry Karciane**) opening four Polish-named card games: existing Pasjans, plus new FreeCell, Spider (Pająk), and Hearts (Kierki).

---

## How to run this plan (Fable + Ultracode)

This plan is executed by Fable one step at a time. The user's entire input per step is: **"Do Step N."** Each step section below is self-contained — it tells the orchestrator what to build, which subagents to spawn (if any), what each subagent does, and the gate that must pass before the step is reported done.

**Rules for the orchestrator:**

1. **One step per message.** Never chain steps, even if the current one finishes quickly. Steps 3, 4, and 5 are each a full session's work; running two in one session risks a mid-build context compaction.
2. **Spawn only what the step's AGENTS block lists.** Most steps run inline with zero subagents — that is deliberate. Do not "go wide" on trivial steps.
3. **Agent tier guide** (match tier to task, never over-provision):
   - **haiku** — mechanical verification, rule-checking against a written spec, running greps/tests and reporting.
   - **sonnet** — well-specified builds where a pattern to clone exists in-repo (all three game builds clone the pasjans shell).
   - **opus** — reserved for the one genuinely novel-logic task in this plan: the Hearts engine + AI (Step 5).
4. **The orchestrator itself** always does: registry wiring, `npm run ci`, the in-app done-when verification (dev server + clicking through), and the final report. Subagents never run the dev server, never deploy, never touch `portfolio-rework`.
5. **Sequential builders, parallel verifiers.** Builder agents in a step run one after another (they touch shared files: `registry.ts`, `CardHubApp.tsx` TILES). Verifier agents may run in parallel — they are read-only.
6. **Budget shape per step:** trivial steps ≈ inline only; game steps ≈ 1 builder + 1 verifier (Step 5: 2 builders + 2 verifiers). If a verifier refutes something, fix inline and re-verify — do not spawn a fresh fan-out.
7. If any baseline fact from Step 0 no longer matches the repo, **stop and report** before writing code. Do not silently adapt.

---

## Decisions locked

| Decision | Value |
|---|---|
| Hub display name (title + icon label) | **Gry Karciane** |
| Hub architecture | Custom `kind:'react'` hub, `CardHubApp.tsx` — green-felt panel, 2×2 grid of large tiles, no folder reuse |
| Hub id / icon / component | id `cards` · icon `/os/icons/cards.svg` · `src/os/games/cardhub/CardHubApp.tsx` |
| Hub desktop slot | `desktop:{show:true,order:8}`, `category:'apps'` |
| Klondike (existing) | id **`pasjans`** unchanged, title `Pasjans` |
| FreeCell | id **`freecell`**, title `FreeCell`, `src/os/games/freecell/FreeCellApp.tsx` |
| Spider | id **`pajak`**, title `Pasjans Pająk`, `src/os/games/pajak/SpiderApp.tsx` |
| Hearts | id **`kierki`**, title `Kierki`, `src/os/games/kierki/HeartsApp.tsx` |
| Category mechanics | All 4 card games keep `category:'games'` (LRU-protected, mobile-chromeless). `registry/games.json` `"children"` switches from `"auto:games"` → explicit `["pinball","mines","game1"]` |
| Start Menu / mobile launcher | 4 card games get `startMenu:{show:false}` + `desktop:{show:false}`; hub gets `startMenu:{show:true,group:'Places'}` + `desktop:{show:true}`. Desktop Start Menu is hardcoded (`RIGHT_PLACE_IDS` in `StartMenu.tsx`) and unaffected either way. |

Polish names verified against Polish Wikipedia + Polish Windows localization: Pasjans, FreeCell (kept its English name even in Polish Windows — authentic), Pasjans Pająk, Kierki.

All paths below are under `c:/Users/domin/OneDrive/Desktop/Websites/dominikos/os/` unless stated.

---

## Step 0 — Confirm baseline facts

**Say: "Do Step 0."**

**Goal:** Re-verify the five facts every later step depends on (repo state can drift).

**AGENTS: none — orchestrator inline.** Pure reading; a subagent would just re-derive context the orchestrator needs anyway.

**What to do (read-only):**
- Confirm `desktop.order` slots in use: 0 `my-computer`, 1 `resume`, 2 `about`, 3 `my-projects`, 4 `games`, 5 `experience`, 6 `explorer`/`paint` (tie), 7 `dialtone`, 98 `recycle-bin` → **order 8 is free**.
- Confirm `registry/pasjans.json` has `startMenu:{show:true,group:'Games'}` and `desktop:{show:false}`.
- Confirm `byCategory('games')` has exactly one caller: `folderChildren()` in `src/os/registry.ts` (the `auto:games` sentinel).
- Confirm `category==='games'` drives: `MobileShell.tsx:28` (chromeless), `Window.tsx:117` + `IframeHost.tsx:74` (`isGame` styling), `osStore.ts:104` (LRU never evicts `games`).
- Confirm `iconPosStore.ts` uses `sessionStorage` and `iconLayout.ts` is sparse (only dragged icons get explicit positions) — adding the hub cannot displace a user's dragged icons.

**Done-when:** all five facts confirmed, reported in one short list. Any mismatch → stop; later steps must be re-checked before proceeding.

---

## Step 1 — Registry rewiring: remove card games from the Games folder

**Say: "Do Step 1."**

**Goal:** Stop the Games folder auto-listing card games.

**AGENTS: none — orchestrator inline.** This is a one-line data change; spawning anything for it is waste.

**What to do:**
- In `registry/games.json`, change `"children": "auto:games"` → `"children": ["pinball","mines","game1"]`.
- Touch nothing else. Run `npm run typecheck` in `os/`.

**Done-when:** typecheck green; Games folder shows only Pinball, Minesweeper, `game1`. Pasjans temporarily disappears from everywhere — expected, fixed in Step 2.

---

## Step 2 — Build the hub (`CardHubApp.tsx`) and wire Pasjans into it

**Say: "Do Step 2."**

**Goal:** A working "Gry Karciane" desktop app with one Polish-named tile (Pasjans). Shippable on its own.

**AGENTS: none — orchestrator inline.** One small presentational component plus data wiring; the orchestrator holds all the registry context already. (Optional: 1 **haiku** verifier to double-check the manifest fields against `pasjans.json`'s shape — only if the orchestrator is low on confidence.)

**Files touched:** `src/os/games/cardhub/CardHubApp.tsx` (new) · `registry/cards.json` (new) · `registry/pasjans.json` (edit) · `src/os/registry.ts` · `src/styles/globals.css` · `public/icons/cards.svg` (placeholder felt-green square OK until Step 6).

**What to do:**
- `CardHubApp.tsx`: static `TILES = [{id:'pasjans'}]` (grows to 4 in later steps); pull `title`/`icon` via `byId(id)` from `src/os/registry.ts`; green-felt (`#0b8a2e`) panel, `role="group"` `aria-label="Gry Karciane"`, one focusable `<button>` per tile; `onClick={(e) => useOSStore.getState().open(id, { trigger: e.currentTarget })}` — the exact call `FolderApp.tsx:17` uses. No `useGameLoop`, no drag (pure launcher).
- `registry/cards.json`: `id:"cards"`, `title:"Gry Karciane"`, `kind:"react"`, `icon:"/os/icons/cards.svg"`, `category:"apps"`, `desktop:{show:true,order:8}`, `startMenu:{show:true,group:"Places"}`, `window:{width:520,height:420,minWidth:360,minHeight:300,singleton:true,maximizedOnMobile:true}`.
- `registry/pasjans.json`: `startMenu.show` → `false` (leave `desktop.show:false`).
- `registry.ts`: add `cards: lazy(() => import('./games/cardhub/CardHubApp')),` to `componentById`.

**Done-when:**
- `npm run ci` green.
- Desktop shows "Gry Karciane" at slot 8; opening it shows one "Pasjans" tile; clicking opens the real Pasjans (singleton-focuses if already open).
- Pasjans gone from Games folder and mobile Start launcher; Games folder still shows Pinball/Mines/`game1`.
- Dragged-icon layouts (sessionStorage) undisturbed.

---

## Step 3 — FreeCell (`freecell`)

**Say: "Do Step 3."**

**Goal:** FreeCell as the second hub tile — closest to Pasjans in shape, lowest risk.

**AGENTS: 1 sonnet builder + 1 haiku verifier.**
- **Builder (sonnet):** builds the complete game — `src/os/games/freecell/engine.ts`, `engine.test.ts`, `FreeCellApp.tsx` — following the spec below and cloning the in-repo pattern (`src/os/games/pasjans/engine.ts` structure; `SolitaireApp.tsx` shell; import `CardFace`/`CardBack` from `../pasjans/cards` **unmodified**). Runs `npm test` on its own suites before returning.
- **Verifier (haiku, read-only, after builder):** adversarially checks the engine against the rules spec — deal shape (7,7,7,7,6,6,6,6 all face-up), `maxMovable = (freeCellsFree+1) * 2^emptyColumns`, build-down-alternating-color, foundation build-up-by-suit, win at 4×13, undo round-trip. Tries to refute with concrete counterexamples; reports pass/refuted per rule.
- **Orchestrator:** wires `freecell` into `componentById` in `src/os/registry.ts` + adds `{id:'freecell'}` to `TILES` + `registry/freecell.json` + `ASSET-CREDITS.md` row, then runs `npm run ci` and plays a game in the dev server.

**Spec for the builder:**
- `engine.ts` (pure TS, no DOM): `freeCells:(Card|null)[4]`, `foundations:Card[][4]`, `tableau:Card[][8]` dealt all-face-up 7/7/7/7/6/6/6/6; `score`, `moves`, `history`. Copy the seeded-LCG shuffle, full-snapshot undo, `bumpScore`, `PileRef`/`canMove…`/`moveStack` idioms from the pasjans engine. Key function: `maxMovable` (supermove capacity) — unit-test it directly.
- `FreeCellApp.tsx`: clone the `SolitaireApp.tsx` shell — pointer-drag engine, pause contract (`active = focused && visible && !minimized`, cancel-drag on blur), `ResizeObserver` metrics, XP "Game" menu, sunken status bar, reuse the Pasjans `sfx` map wholesale, `aria-live sr-only` region, roving-tabindex hotspot layer (16 hotspots: 4 cells, 4 foundations, 8 columns). No stock, no flip sfx.
- `registry/freecell.json`: mirror `pasjans.json` — `category:"games"`, `desktop:{show:false}`, `startMenu:{show:false}`, `window:{width:820,height:600,minWidth:660,minHeight:480,singleton:true,maximizedOnMobile:true}`.

**Done-when:** engine tests cover deal shape / supermove math / move legality / win / undo and pass; verifier reports no refuted rules; `npm run ci` green; FreeCell tile opens a playable, winnable game with mouse and keyboard-only.

---

## Step 4 — Spider / Pasjans Pająk (`pajak`)

**Say: "Do Step 4."**

**Goal:** Spider as the third hub tile.

**AGENTS: 1 sonnet builder + 1 haiku verifier.** Same shape as Step 3.
- **Builder (sonnet):** `src/os/games/pajak/engine.ts`, `engine.test.ts`, `SpiderApp.tsx` per spec below, cloning the pasjans engine pattern and `SolitaireApp.tsx` shell (drag + hotspot layer: 10 column handles + stock handle). Difficulty menu: `role="menuitemradio"` One/Two/Four suits, mirroring Pasjans' Draw-one/Draw-three menu pattern.
- **Verifier (haiku, read-only, after builder):** adversarially checks — unique ids `0..103` (never reset per deck), deal 6/6/6/6/5/5/5/5/5/5 with tops face-up + 50-card stock, same-suit-run-only unit moves (mixed-suit descending run must reject), K→A same-suit auto-completion, stock deal blocked while any column is empty, win at 8 runs, all three `suitCount` variants deal correctly.
- **Orchestrator:** wires `pajak` into `componentById` + `TILES` + `registry/pajak.json` (`title:"Pasjans Pająk"`, `category:"games"`, `desktop:{show:false}`, `startMenu:{show:false}`, `window:{width:900,height:620,minWidth:720,minHeight:500,singleton:true,maximizedOnMobile:true}`) + `ASSET-CREDITS.md` row; `npm run ci`; plays a 1-suit game in the dev server.

**Spec for the builder:**
- State: two decks = 104 cards, **globally unique ids `0..103`** (engine snapshot/undo and drag `Map<id,el>` keying require it); `tableau:Card[][10]`; `stock:Card[]` (5 deals × 10); `completed:number` (0–8); `suitCount:1|2|4` (**1-suit default**); `score`, `moves`, `history`.
- Rules: build down regardless of color; only same-suit descending runs move as a unit; full K→A same-suit run auto-removes to `completed`; stock deal requires no empty column, deals one face-up card per column; win = 8 runs.

**Done-when:** engine tests cover the verifier's checklist and pass; verifier reports no refuted rules; `npm run ci` green; 1-suit game winnable start-to-finish in the running app.

---

## Step 5 — Hearts / Kierki (`kierki`)

**Say: "Do Step 5."**

**Goal:** Hearts as the fourth hub tile — highest-risk, lowest-reuse (no drag layer, new AI, new trick logic). Treat as its own mini-project; do not start before Steps 3–4 are green.

**AGENTS: 2 builders (opus, then sonnet) + 2 parallel haiku verifiers.** This is the one step that earns opus.
- **Builder 1 (opus):** `src/os/games/kierki/engine.ts` + `engine.test.ts` — full rules + the heuristic AI (the novel-logic core). Pure TS, no DOM. Runs its own tests before returning.
- **Builder 2 (sonnet, after builder 1):** `HeartsApp.tsx` — click-to-play UI on top of the finished engine API. **No drag layer.** Four hands around a felt table (human fanned face-up at bottom, opponents face-down), center trick area, scoreboard; click-to-select-then-confirm for passing; reuse the pause contract, `Game` menu, `aria-live` region and `sfx` pattern from `SolitaireApp.tsx`; keyboard: tab-through-legal-cards, Enter plays.
- **Verifiers (2 haiku, parallel, read-only, after builders):** split the rule surface —
  - *Verifier A (rules):* pass-direction rotation (left/right/across/hold), 2♣ leads trick 1, must-follow-suit, no hearts/Q♠ on trick 1, no hearts lead until broken.
  - *Verifier B (scoring + AI legality):* hearts=+1, Q♠=+13, shoot-the-moon = 0/+26 split, game ends at 100 with lowest winning, and AI never plays an illegal card in any tested state.
- **Orchestrator:** wires `kierki` into `componentById` + `TILES` + `registry/kierki.json` (`title:"Kierki"`, `category:"games"`, `desktop:{show:false}`, `startMenu:{show:false}`, `window:{width:720,height:640,minWidth:560,minHeight:520,singleton:true,maximizedOnMobile:true}`) + `ASSET-CREDITS.md`; `npm run ci`; plays a full round in the dev server including a forced shoot-the-moon check.

**Spec for builder 1:**
- State: `hands:Card[][4]` (13 each), `trick:{player:number,card:Card}[]`, `tricksTaken:Card[][4]`, `scores:number[4]`, `roundScores:number[4]`, `phase:'passing'|'playing'|'roundEnd'|'gameOver'`, `passDir:'left'|'right'|'across'|'hold'` (rotates each round), `pendingPass:Card[]`, `leader:number`, `heartsBroken:boolean`. Undo is not meaningful mid-trick — "new round" replaces it.
- AI (3 opponents, heuristic not search, ~40–60 LOC): follow suit low; void-dump Q♠/high hearts when off-suit; avoid taking trick-with-hearts; dump Q♠ on the leader when safe.

**Done-when:** engine tests cover both verifiers' checklists and pass; both verifiers report no refuted rules; `npm run ci` green; a full 4-player round plays to completion with correct scoring in the running app.

---

## Step 6 — Icons (4 original SVGs)

**Say: "Do Step 6."**

**Goal:** House-style, original 48×48 icons for hub + 3 games; Pasjans keeps its existing icon.

**AGENTS: 1 sonnet builder.** All four icons in one agent (they must share a visual language — splitting across agents produces mismatched styles). No verifier: `npm run gate` and the orchestrator's visual check are the gate.
- **Builder (sonnet):** create `public/icons/cards.svg`, `freecell.svg`, `pajak.svg`, `kierki.svg` per spec; add one credit row each to `ASSET-CREDITS.md`, mirroring the Pasjans/Minesweeper rows.
- **Orchestrator:** `npm run gate`; render-check all four on desktop + hub tiles at 1x and 2x.

**Spec:** house style = `viewBox="0 0 48 48"`, rounded-rect base, gradient fills, top comment `<!-- Original SVG authored for DominikOS. Nothing traced. -->`; palette from `pasjans.svg` (felt `#0b8a2e`/`#065c1d`, card-back navy `#1f3f8f`).
- `cards.svg`: felt rounded-rect + fanned 4-card poker hand with visible ♠♥♦♣ pips.
- `freecell.svg`: felt base; 4 tiny empty-cell outlines above one face-up ♦ card.
- `pajak.svg`: felt base; a card with a small code-drawn spider (line legs, circle body).
- `kierki.svg`: felt base; a card with a large red heart (reuse `pasjans.svg`'s heart path).

**Done-when:** `npm run gate` passes; all four icons render correctly on desktop and hub tiles.

---

## Step 7 — Sound polish (optional)

**Say: "Do Step 7."**

**Goal:** Audio feedback for the new games, consistent with the OS.

**AGENTS: none — orchestrator inline.** Pure wiring of an existing pattern; ~30 lines total across three files.

**What to do:**
- FreeCell/Spider: reuse the Pasjans `sfx` map wholesale (draw/flip/move/foundation/win) via shared `tone()` from `src/os/sound.ts`, gated on `prefs.muted` — if Step 3/4 builders already did this, just audit.
- Hearts: soft play click per card (`tone(0,180,0.04,0.06)`); reuse the `'win'` triad on round end.
- Zero new audio files (consistent with the "Sounds: None shipped" `ASSET-CREDITS.md` row).

**Done-when:** `prefs.muted` silences everything; `npm run gate` still passes.

---

## Step 8 — Build, test, vendor into `portfolio-rework`

**Say: "Do Step 8."**

**Goal:** Ship through the existing pipeline into the live Astro site.

**AGENTS: none — orchestrator inline.** Commands + inspection only; never delegate deploys.

**What to do:**
1. In `os/`: `npm run ci` (typecheck + all vitest suites incl. the three new engine suites + `vite build` + `npm run gate`).
2. `node scripts/deploy-rework.mjs` (exists at `os/scripts/`; delete-then-copy `dist → portfolio-rework/public/os`, also re-vendors `game1`/`frostbyte`). Optionally add `"deploy:rework"` to `os/package.json` first.
3. In `portfolio-rework/`: `npm20 run build`.
4. Verify `portfolio-rework/public/os/assets` contains `FreeCellApp-*.js`, `SpiderApp-*.js`, `HeartsApp-*.js`, `CardHubApp-*.js` and no orphaned old-hash chunks.

**Done-when:** built site serves the hub + all four games at `/os/`; no console errors; no stale chunks.

---

## Risks & gotchas

1. **Singleton re-focus, not reopen:** clicking a hub tile for an open game focuses/un-minimizes it (`osStore.ts:90-96`). Expected.
2. **Hub is LRU-evictable:** the 12-window cap skips `category:'games'` victims; the hub is `category:'apps'` → evictable. Harmless (cheap re-open); leave as `apps`.
3. **`games.json` explicit children abandons `auto:games`.** Future arcade games need manual addition to that array. Intentional; `byCategory('games')` becomes dead-but-harmless API surface.
4. **Spider ids must be globally unique across both decks** (`0..103`). Never reset per-deck.
5. **Legal gate is mandatory in `npm run ci`** — a stray banned token in a new comment/title/icon fails the build. The four Polish titles + "FreeCell" are clean.
6. **Never hand-edit the vendored copy** — all edits in `dominikos/os/`; `deploy-rework.mjs` re-vendors. Direct edits to `portfolio-rework/public/os` get overwritten and evade the legal gate.
7. **Effort realism:** ~2,000 LOC of new tested code across three games plus 4 icons. Ship in order (FreeCell → Spider → Hearts); do not start Hearts before FreeCell/Spider are green.

---

## Verification checklist (whole feature)

- [ ] Desktop shows one "Gry Karciane" icon (slot 8); no card-game icons directly on the desktop.
- [ ] Games folder contains only Pinball, Minesweeper, `game1`.
- [ ] Hub opens to a felt panel with exactly 4 tiles: Pasjans, FreeCell, Pasjans Pająk, Kierki.
- [ ] Each tile opens its game in a singleton window; reclicking focuses rather than duplicates.
- [ ] Each game winnable/playable with mouse and keyboard-only.
- [ ] Focus-loss/minimize/background pauses every game cleanly.
- [ ] Mobile: games open chromeless full-screen; hub keeps its title bar and appears in the mobile Start launcher; the 4 games do not appear there individually.
- [ ] `npm run ci` green, including all three new `engine.test.ts` suites.
- [ ] `npm run gate` passes.
- [ ] `portfolio-rework/public/os/assets` has the four new hashed bundles, no orphaned old-hash chunks.
- [ ] `ASSET-CREDITS.md` has a row for each new game and icon.
