# /goal — Frostbyte look & feel overhaul (polish pass, NOT a rebuild)

## Mission
Frostbyte (`frostbyte/` in this repo) is a finished, working, fully tested penguin-hangout game:
movement, economy, dress-up, NPCs, chat/emotes, minigame, den decorating, island travel — all done.
Its weakness is presentation: room backdrops are near-empty procedural placeholders (the plaza is a
white noise field with one pond and four corner trees), there is zero ambient motion or game juice,
and the DOM UI is generic white panels with emoji pill buttons. Your job: make it LOOK and FEEL like
a cosy, finished mid-2000s penguin world — purely through better art, small animation/juice, and a
cohesive UI reskin. Gameplay, data contracts, and architecture are frozen.

## Ground truth (read this, then the code)
- Stack: buildless ES modules + vendored KAPLAY (`frostbyte/vendor/kaplay.mjs`). No bundler. No
  runtime npm deps. Everything stays offline/self-contained (no CDNs, no webfonts, no fetched
  assets) — the game also runs inside a sandboxed iframe in the DominikOS shell.
- ALL art is code-generated: `frostbyte/gen-assets.js` (zero-dep PNG encoder, seeded/deterministic)
  writes `frostbyte/assets/`. Regenerate with `node gen-assets.js` (run from `frostbyte/`). It
  prints every file it wrote as `name WxH`.
- Layer rules: `engine/` = pure tested logic (FROZEN) · `content/` = data whose ids/labels/counts/
  geometry are test-asserted contracts · `world/` = KAPLAY-side builders · `ui/` = DOM overlays,
  each injecting its own `<style>` block that reuses `index.html`'s `--bg/--ink/--accent/--panel`
  vars · `main.js` = wiring · `index.html` = shell CSS/HUD.
- Rooms: Chillmere Plaza (4 doors — "Your Den" and "Frostline Trail" open; "Glasswind Court" and
  "Emberlight Workshop" locked/misted), Your Den (igloo interior, furniture decorating), Frostline
  Trail (walk-over coin glints), minigame "Snowdrift Toss". Door and map-pin labels are asserted by
  tests — never rename anything.
- Avatar: layered 16px penguin — grayscale `penguin-body.png` runtime-tinted + `penguin-belly.png`
  + 14 grayscale cosmetic sheets, ALL 4×3 grids of 16×16 cells, drawn at 3× world scale. The grid
  layout and every file's pixel dimensions are load-bearing.
- Run: `node dev-server.cjs` in `frostbyte/` → http://localhost:5183/ .
  Tests: `npx vitest run` in `frostbyte/` (~281 tests, green at HEAD; never `node --test`).
  Legal gate: `npm run gate` in `os/` (scans frostbyte/, bans Club Penguin fingerprints).
- Reduced motion: the save already carries `prefs.reducedMotion` (see `engine/save.js` — the helper
  is internal, read the flag off the loaded save). Every new canvas effect must check it; every new
  CSS animation needs a `prefers-reduced-motion` media query.
- Input gotchas (learned the hard way): KAPLAY `touchToMouse` synthesizes a mousePress per tap —
  never wire a non-idempotent handler to both mouse and touch. All input honours the shared
  `anyOverlayOpen()` gate — new effects/handlers must not bypass it. `k.fixed()` takes NO args (any
  call enables it). Scene objects die with the scene, but DOM/global listeners persist — never add
  per-scene-entry DOM or global listeners (the room scene re-enters constantly); follow the existing
  singleton `<style>`-injection pattern.

## Token diet — do NOT read these
`vendor/kaplay.mjs` (huge; targeted grep only if an API is unclear), `node_modules/`,
`package-lock.json`, `os/**` (except running the gate), and the historical `FROSTBYTE-*.md` plan
docs — this brief is self-sufficient. `*.test.js` files: skim only when a contract is unclear.

## The work, in priority order (ship down the list; stop cleanly when the budget bites)

### P1 — Room & sprite art (biggest win; lives entirely in `gen-assets.js`)
Rewriting the `build*` drawing functions wholesale is expected and fine — that is where the art is.
- Keep every output file's EXACT pixel dimensions and sheet grid (e.g. `room-plaza.png` stays
  480×320). Art improves inside the same canvases. If a look seems to need bigger canvases, find
  another way — dimensions do not change.
- Define ONE shared "arctic dusk" palette const and use it in every asset: blue-tinted snow with
  subtle dither/texture, ice cyan (#7fd6ff family), deep navy (#122a42 family), warm lamp amber for
  contrast, sparing aurora green/violet accents.
- Plaza — the social heart: snowbank frame, ice-pond with sheen streaks, four distinct door facades
  with signage (locked two visibly misted/frozen shut), lamp posts with warm glow pools, footpath
  texture connecting the doors, benches / snow piles / an ice sculpture, soft corner vignette.
- Den — cosy: warm interior glow, wall/floor texture, a window with night sky.
- Trail — depth: winding path, layered drifts, distant ridge, sparse pines.
- Minigame bg, `map-isle.png`, snowpal/snowball, den signs, pickup glint: same palette family, more
  charm.
- Penguin readability pass inside the 16px cell: cleaner silhouette, 1px outline, eye highlight,
  belly shading. Touch cosmetic sheets only if one visibly misaligns; keep every grid identical.

### P2 — Game feel (`world/` + `main.js` only; dt-driven, pooled, reduced-motion-aware, 60fps)
- Ambient snowfall in outdoor rooms (plaza/trail; the den is interior) — 2 depth layers, ≤40
  sprites total, wrap-around, no per-frame allocation.
- Soft ellipse shadow under player, NPCs and visitors.
- Click-to-move destination ping (expanding ring that fades).
- Occasional tiny snow puffs while walking.
- ~250ms fade on room/minigame transitions — must not break spawn positions or the os-bridge
  pause contract.
- Coin pickup/award sparkle + a little polish on the coin toast/counter.
- Emote symbols pop in with a scale bounce; restyle in-canvas speech bubbles (rounded, tail,
  subtle pop-in).
- Optional: gentle camera smoothing implemented in `main.js` wiring ONLY — `engine/camera.js`
  stays untouched. Drop it if it fights anything.

### P3 — UI reskin (`index.html` CSS + the injected `<style>` blocks in `ui/*.js`; STYLE-ONLY)
Keep every element id, class hook, aria attribute, focus/Esc behaviour and DOM structure. Restyle:
- One cohesive frosted-ice system: dark navy glass panels (subtle blur, 1px rim-light border, cyan
  accent) replacing the flat white boxes; consistent button treatment with hover/active/
  focus-visible states; system font stack only.
- Apply it to: dialogue box, dress-up panel + item cards, furniture catalog, map overlay + pins,
  chat panel, edit tray, HUD pills (title, coins, Dress Up / Say / Decorate / map / emote bar),
  interact prompt, coin toast.

### P4 — Only if P1–P3 landed comfortably
Small boot moment (FROSTBYTE wordmark fades in/out once), interact-prompt idle bob, HUD
micro-transitions. Skip without guilt.

## Hard fences (violating any of these = task failed)
- READ-ONLY: `engine/**`, `os-bridge.js`, `vendor/**`, `dev-server.cjs`, every `*.test.js`,
  both `package.json`s. Never edit a test to make it pass.
- Frozen contracts: room bounds/door geometry and labels (`content/rooms.js`, `content/map.js`),
  catalog ids/prices/counts, save schema `dmos.v1.frostbyte.save`, asset filenames + pixel
  dimensions + sheet grids, all DOM element ids.
- No new dependencies, no bundler, no network anything, no downloaded or AI-image assets — all art
  stays hand-coded in `gen-assets.js`, all names original (the legal gate bans Club Penguin terms).
- Scope: files under `frostbyte/` only. Never stage or commit anything under `os/` or the repo
  root. Deploying / syncing to the portfolio is explicitly NOT your job.

## Effort & agent budget (hard)
- Work SOLO. No parallel sub-agents, no delegation, no reviewer panels. One implementation pass
  per phase + ONE final self-review of the full diff.
- Full vitest suite at most 3 times total (baseline / after P1 / final). No new tests, no
  screenshot-diff harnesses, no exhaustive QA matrices.
- Rewrite alarm (soft ceilings, excluding `gen-assets.js` which may grow freely): ~250 changed
  lines across `world/` + `main.js`, ~350 across `index.html` + `ui/` style blocks. Blowing past
  these means you are rebuilding, not polishing — stop and reassess.
- If an effect fights the architecture (pause contract, overlay gating, scene re-entry), drop that
  one effect and note it. Do not restructure to force it.

## Workflow
1. Baseline: `npx vitest run` green; run `node gen-assets.js` once and SAVE its printed `name WxH`
   list for later comparison.
2. P1 → regen assets → confirm the printed dimensions list is IDENTICAL to baseline → commit.
   P2 → commit. P3 (+P4) → commit. Commit on the current branch, staging EXPLICIT `frostbyte/...`
   paths only (never `git add -A`; leave any non-frostbyte modified/untracked files alone).
   Message prefix: `Frostbyte polish:`.
3. Final check, once: `node gen-assets.js` clean + dims identical · `npx vitest run` all green ·
   `npm run gate` (from `os/`) green · if your environment has a browser: boot
   http://localhost:5183/, console clean, 60-second smoke (walk, plaza→den→trail→back, minigame in
   and out, open dress-up/map/catalog/chat once, one emote) + before/after screenshots. If you have
   no browser, say so — the visual eyeball then waits for Dominik.
4. ONE self-review of the full diff against the fences above. Fix what you find. Stop.

## Handback (then STOP — Dominik does the playthrough)
Report: what shipped per phase · anything dropped and why · pasted summary lines from vitest, the
gate, and the gen-assets dims comparison · before/after screenshots if you could take them · how to
play (`node dev-server.cjs` in `frostbyte/` → http://localhost:5183/) · any risk you are unsure
about. Do not deploy, do not touch `portfolio-rework`, do not open the OS shell.
