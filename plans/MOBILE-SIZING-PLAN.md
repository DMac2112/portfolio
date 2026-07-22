# MOBILE-SIZING-PLAN — make DM Explorer + every game fit a phone

> For the executing orchestrator (**Sol Ultra**). Goal: a WORKING mobile version Dominik can
> manually gameplay-test on his phone at https://dmac2112.github.io. Nothing more.
> Written 2026-07-15 against dominikos @ `3dccb68` / portfolio-rework @ `2efdbbc`.
> Every path, selector and pixel number below was verified live — trust them; do not re-derive.

## 0. Prime directives (read first, they cap the budget)

1. **Working version only.** Dominik verifies by PLAYING. Do not build test suites for CSS, do not
   spawn review panels, do not screenshot-farm. Edge cases surface through his gameplay, not yours.
2. **Verification budget, total for the whole plan:** each phase gets AT MOST one `npm run build`
   (in `os/`) + one browser spot-check at 390×844. One `npm test` run in P1 only (it edits TSX
   around game logic). One deploy at the very end. That's it.
3. **Desktop must not change.** All new CSS lives behind `@media (max-width: 520px)` (or a
   `pointer: coarse` variant where noted). Zero visual diff at ≥1024px is an acceptance criterion.
4. **Failures return to the same worker that made them** (continue its thread). Never spawn a
   fresh agent to re-investigate a prior agent's diff.
5. Commit per phase in `dominikos/` with explicit file paths. Push only at the end (P5).

## 1. Agent roster & tier policy

| Tier | Model (Anthropic equivalent) | Use for | Cap |
|---|---|---|---|
| T0 | **Sol Ultra** — you (≈ Fable) | Orchestrate, integrate, resolve conflicts, final deploy | — |
| T1 | **Sol, low effort** (≈ Opus) | P1 ONLY — the fit engine + input-coordinate math | 1 agent |
| T2 | **Terra** (≈ Sonnet) | P2, P3 — CSS/layout from the precise specs below | 2 agents |
| T3 | **Luna** (≈ Haiku) | P0 recon checklist; any grep/confirm errand | 1–2 agents |

Default DOWN: if a task looks doable by a lower tier, use the lower tier. Total worker spawns for
the whole plan: **≤5**. The orchestrator writes no large code itself but may make ≤10-line fixes
during integration rather than re-dispatching.

## 1b. Target devices — modern phones only

**Design floor: 360 × 780 CSS px.** Everything must fit and play at that. Anything narrower is
out of scope — don't spend a token on it, don't compromise the layout for it.

**The trap (do not get this wrong):** screen INCHES do not map to CSS pixels. A current 6.1"
Galaxy S23 reports **360 px wide** — identical to the "old" S8 we don't care about. Phones got
bigger in inches, not in CSS width. So the floor is **360, not 390**; pick 390 and you break every
modern Samsung.

Reference widths (CSS px): Galaxy S21–S24 **360** · iPhone 13 mini 375 · iPhone 13/14/15 **390** ·
Pixel 7 412 · iPhone 15 Pro Max 430.

**Spot-check at 390×844** (the modal phone). Only if a layout looks tight, sanity-check **360×800**.
Explicitly out of scope: 320px (SE 1st gen), foldables, landscape tuning, tablets (they already get
the desktop shell ≥1024px). The scale-to-fit engine in P1 makes width mostly self-solving anyway —
this section exists to stop anyone gold-plating for dead hardware.

## 2. Ground truth (verified — paste into worker prompts as needed)

**The complaint:** on a phone, DM Explorer's bookmarks are crushed and the games inside it don't
fit. **Measured live at 375×812:** the browser window is **375×712** — the mobile shell's titlebar
+ dock eat ~100px of height, so budget ~**390×744** of usable page on the 390 baseline, and the
`.browser__page` inside that is smaller still once toolbar/address/favourites chrome is subtracted
(P2 shrinks that chrome, which directly buys P1 pixels).

Game stages are FIXED-PX and overflow: **Sky Hopper 400×640** — *wider than every phone in §1b,
including the 390px iPhone 15*, which is exactly why it's cut off — **Bubble Shooter 440×660**,
**Frostbyte 960×640** iframe. Nothing scales; the page just scrolls
(`.browser__page { overflow: auto }`), so you play a corner of the game. That single fact is the
whole bug.

**Repos & files (all under `C:\Users\domin\OneDrive\Desktop\Websites\`):**
- OS source: `dominikos/os/` — build: `npm run build` (Node 16, includes tsc + legal-gate).
  Tests: `npm test` (13 files / 267 green today).
- `os/src/os/apps/browser/BrowserApp.tsx` (~190 lines): toolbar buttons `◀ Back ▶ ■ Stop
  ⟳ Refresh ⌂ Home`, address input + `Go`, `FAVORITES` const (5 entries, full-text buttons),
  status bar, fake-load progress gated on `active`. History/load logic is CORRECT — layout only.
- `os/src/os/apps/browser/sites.tsx`: `Site {url,title,favicon,render(ctx)}`,
  `ctx {windowId, active, go, reloadToken}`. `GamePage` wrapper (`.arcade` classes) hosts:
  FlappyApp (stage 400×640), BubbleApp (440×660), `FrostbyteFrame` (960×640 same-origin iframe,
  os-bridge pause wiring — DO NOT touch its sandbox/postMessage code).
- `os/src/styles/globals.css`: `.browser*` ~line 1325+, `.arcade*` nearby, `.mwin*` (mobile
  windows), `.pdf-app*` (leave alone).
- Mobile shell: `os/src/os/mobile/MobileShell.tsx` — DM Explorer opens as a titled `.mwin`
  (category 'apps'); games category opens chromeless. Do not restructure the shell.
- **Frostbyte itself is fully fluid** (its camera zoom-fits any container) — only its 960×640
  stage wrapper is wrong. The KAPLAY games' internals need NO changes.
- Native (non-browser) games on mobile open chromeless full-viewport: Space Pinball, Minesweeper,
  Dev District (+ card games via "Gry Karciane" hub). Suspected misfit: **PinballApp** (fixed
  table). Cards/Mines are grid-based and probably fine — P3 verifies cheaply.
- Deploy chain (memorize, order matters):
  1. `cd dominikos/os && npm run build && node scripts/deploy-rework.mjs`
  2. `cd ../../portfolio-rework && .\deploy.cmd`  (portable Node 20; pushes built site → live)
  3. Live at `https://dmac2112.github.io` in ~1–2 min. `deploy.cmd` handles `.nojekyll`.
- Site URLs (`games.dominikos.net/...`) and favorites order must not change.
- Pause contract: game pages receive `ctx.active`; iframe games speak os-bridge. Never bypass.

## 3. Phases

### P0 — Recon checklist (Luna, read-only, ~10 min)
Confirm §2 still matches reality (paths exist, stage sizes, FAVORITES shape, `.arcade` class
names; list PinballApp's stage dimensions + how Flappy/Bubble read pointer input — quote the
exact lines). Output: PASS/CHANGED per item + the quoted input-handling lines for P1. No edits.

### P1 — FitStage engine + the three browser games (Sol-low/Opus, THE critical task)
Create `os/src/os/apps/browser/FitStage.tsx` (or co-locate in sites.tsx if <60 lines): given
`w`,`h`, renders children in a wrapper that measures available space (ResizeObserver) and applies
`transform: scale(min(availW/w, availH/h, 1))`, centered, `transform-origin: top center`. Reserve
NO scroll on mobile — the stage must fully fit the visible page area.
Wire it: FlappyApp page (400×640), BubbleApp page (440×660). FrostbyteFrame: do NOT scale-wrap —
make the iframe fluid `width:100%; height:100%` of the page area (min-height ~420px), remove the
fixed 960×640 stage; the game self-fits.
**Input audit (why this is T1):** with CSS transform scaling, pointer math breaks if the games use
raw `offsetX/offsetY` or cache untransformed rects. Using P0's quotes, verify Flappy/Bubble map
touches via `getBoundingClientRect()` ratios (rect-relative × canvasSize/rect.size is
scale-proof). If not, fix minimally inside the game's input handler only.
Also: page banner/blurb (`.arcade__banner` etc.) collapses to one compact line ≤520px so the
stage gets the pixels. Touch targets in the stage untouched.
Verify: one build; one spot-check at 390×844 — each of the 3 games visible edge-to-edge, no
horizontal scroll, taps register where they should (click at a known spot, assert via the game's
own state if trivially exposed, else visual). One `npm test` run. Commit.

### P2 — DM Explorer chrome on phones (Terra, pure CSS + one small TSX touch)
≤520px: toolbar becomes two rows — row 1: `◀ ▶ ⟳ ⌂` icon-only (drop Stop; drop text labels,
keep `aria-label`s), 40×40 targets; row 2: address input (flex:1, font-size ≥16px to stop iOS
zoom-on-focus) + Go. FAVORITES bar: single row, horizontal scroll (`overflow-x:auto`,
`-webkit-overflow-scrolling: touch`, no wrap), favicon + short label, `scrollbar-width: none`.
Status bar: `display:none` ≤520px. Trim `.browser__page` padding to 4px. Nothing else moves.
Verify: spot-check only (no build needed beyond the one in its commit if TSX touched). Commit.

### P3 — Native game windows audit (Terra, small)
At 390×844 open: Space Pinball, Minesweeper, Dev District, card hub (all four card games).
For each: PASS (fits + playable) or wrap its fixed stage in P1's FitStage (import path works from
any app). Expect only Pinball to need wrapping; Dev District is KAPLAY-fluid like Frostbyte —
if its container is already 100% leave it. Report one line per game. Verify: one build +
spot-check. Commit.

### P4 — OPTIONAL, default SKIP: "maximize play" toggle hiding browser chrome while a game page
is open. Only if P1–P3 came in clearly under budget AND Dominik asks.

### P5 — Ship (orchestrator, no new agents)
Run the deploy chain (§2). Live spot-check at 390×844: DM Explorer → Sky Hopper fits; Frostbyte
fills the page; pinball fits. Push `dominikos` (local commit fine — it has no remote; just leave
committed) and `portfolio-rework` (push). Hand Dominik the manual test list below. Done — stop.

## 4. Dominik's manual gameplay checklist (what "done" means)
On a real phone at dmac2112.github.io: (1) DM Explorer bookmarks readable + swipeable; (2) Sky
Hopper fully on-screen, taps flap where you tap; (3) Bubble Shooter aims correctly; (4) Frostbyte
fills the browser page and plays; (5) Space Pinball fits; (6) cards/mines unchanged and fine;
(7) desktop (PC) looks identical to before.

## 5. Known traps
- iOS zooms any input with font-size <16px — set the address bar to 16px on mobile.
- Don't set `height: 100vh` inside the browser page (mobile URL-bar bounce) — use flex fill of
  the parent, which the shell already sizes; `100dvh` only if you must.
- The fake page-load progress only advances while `ctx.active` (window focused & visible) — in
  a headless/hidden checker the page can look "stuck loading"; that's the harness, not a bug.
- `os/registry/*.json` window sizes are DESKTOP-only concerns; mobile ignores them — don't tune.
- Legal gate scans all text in os/ + frostbyte/ — new copy must avoid Microsoft/Disney marks.
- System Node is 16 in `os/`; the Astro site deploys via `deploy.cmd`/`npm20.cmd` (Node 20).
