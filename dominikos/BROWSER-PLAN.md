# BROWSER-PLAN — movable desktop icons · DM Explorer browser · web-games migration

> Companion to DOMINIKOS-PLAN.md (the master spec) and SKYPE-PLAN.md (pattern reference:
> pure machine + tests first, UI second, adversarial review last). Written 2026-07-09.
> Three features, one era-fiction rationale: **games that don't fit 2003 don't get native
> windows — they live on "the Web"**, inside the OS's own browser. Sky Hopper's genre is
> from 2013 and Bubble Shooter is a browser-game genre, so both move out of the Games
> folder and into browser bookmarks. Minesweeper, Pasjans, Pinball and Paint stay native.

---

## §0 Scope, locked decisions, non-goals

| # | Feature | One-liner |
|---|---------|-----------|
| A | Icon drag | Drag desktop shortcuts to any free grid cell; layout survives reload **within the browser session only**, per user. |
| B | DM Explorer | The browser icon opens a real, working XP-era browser app: toolbar, address bar, favorites, history, status bar, resizable/maximizable window. |
| C | Web games | Sky Hopper + Bubble Shooter stop being OS apps and become **pages inside DM Explorer**, reachable via seeded bookmarks. |

**Locked decisions (defaults chosen — flag to Dominik only if he objects):**
1. **Name**: the browser ships as **"DM Explorer"** (title `DM Explorer`, desktop label `DM Explorer`).
   The current `explorer.json` ships the literal strings `"Internet Explorer"` / `"dominikmachowiak.com - Internet Explorer"` — a Microsoft trademark, violating DOMINIKOS-PLAN §6 (zero MS marks). This plan **fixes that existing violation**; IframeHost.tsx's own comments already call the app "DM Explorer".
2. **Session-only** = `sessionStorage` (survives F5, dies with the tab). Not localStorage, not the §0.6 saved-session blob.
3. **Per user** = key namespaced by user id. There is exactly one login tile today (`dominik`); hardcode the id via one constant so a second user is a one-line change.
4. Icon drag exists in the **desktop shell only** (≥1024px + fine pointer). The mobile shell keeps its static grid — touch drag would fight scrolling.
5. The desktop browser icon opens the **home portal page** (internal), with the real `https://dominikmachowiak.com` one bookmark away (reusing the existing hardened-iframe mechanics).
6. All fake URLs are **invented domains** (`*.dominikos.net`). Never `bubbleshooter.com`, `flappybird.io`, or any real/trademarked domain.

**Non-goals:** cross-session icon persistence; icon renaming/deleting; real network navigation to arbitrary URLs; browser tabs (single page, XP-era accurate); favorites editing UI (seeded list only; add/remove is a P+ stretch).

---

## §1 Feature A — movable desktop icons (session-only, per user)

### 1.1 Behaviour contract
- Icons sit on the invisible **88px cell grid** (`--icon-cell`, `ICON_CELL = 88` in IconGrid.tsx), column-major, exactly where the auto-flow grid puts them today — until dragged.
- Pointer-drag an icon ≥ **4px** (threshold) → drag mode: ghost follows the cursor (CSS transform, no reflow), original cell shows at 50% opacity.
- Drop → snap to the nearest grid cell, **clamped** to the workspace (viewport minus taskbar, minus one cell). If the cell is occupied → nearest free cell (ring search outward).
- Below-threshold press stays a click: single-click select / double-click open **must keep working** (drag starts only after threshold, so no changes to DesktopIconView's click handlers).
- Marquee interplay: already safe — Desktop.tsx's `onWorkDown` ignores presses starting on `.desk-icon`, and icon drag stops propagation while active.
- Keyboard nav (roving tabindex, arrows) keeps **manifest order** — spatial arrow-nav is out of scope; F6/§11.2 flows untouched.
- Viewport resize: re-clamp all positions into the new workspace (listener already exists in useDeviceMode's resize pattern; cheap recompute).
- "Log off" within the same tab keeps the layout (sessionStorage lives on); closing the tab resets it. That IS the requirement.

### 1.2 Data model + persistence
```ts
// src/os/desktop/iconLayout.ts (pure — no DOM, no React)
export interface CellPos { col: number; row: number }
export type IconLayout = Record<string, CellPos>   // appId → cell
export const USER_ID = 'dominik'                    // single login tile (§5.7); future-proof constant
// sessionStorage key: `dmos.v1.icons.${USER_ID}`  — same NS + version as storage.ts
```
- Add `sessionRead<T>(key)` / `sessionWrite(key, value)` to **storage.ts** (same try/catch hardening as `read`/`write`, but `sessionStorage`). The v1 wipe logic stays localStorage-only.
- Layout is **sparse**: only dragged icons get entries; undragged icons keep flowing into the default column-major slots that remain free. (Simplest correct rule: compute default slots for all icons in manifest order, skipping cells claimed by explicit entries.)

### 1.3 Pure functions (vitest first, LOCK before UI)
```ts
resolveLayout(ids: string[], explicit: IconLayout, rows: number): Record<string, CellPos>
cellFromPoint(x: number, y: number, rows: number, cols: number): CellPos   // snap + clamp
nearestFree(target: CellPos, taken: Set<string>, rows: number, cols: number): CellPos // ring search, bounded
```
Test cases (bounded, no wall clock): default layout equals today's order for empty layout; explicit entry displaces flow; snap rounds to nearest cell; clamp at all four edges; nearestFree returns target when free, ring-1 neighbour when taken, and never loops forever on a full grid (falls back to target); resolveLayout is deterministic and total (every id gets a cell).

### 1.4 UI changes
- **IconGrid.tsx**: switch `.icon-grid` children to absolutely-positioned cells (`left = col*CELL`, `top = row*CELL`) derived from `resolveLayout`. Grid CSS keeps `position:absolute; inset:0` on the container; per-icon wrapper gets `position:absolute; width/height: var(--icon-cell)`.
  Drag state lives in a ref (`{id, startX, startY, dx, dy} | null`) + one `useState` for the ghost position; commit-on-drop writes the store (mirrors the §4.3 "commit-on-drop" window-drag rule).
- **DesktopIconView.tsx**: add `onPointerDown/Move/Up` passthroughs (or wrap in the grid — grid-level handlers keep the view dumb). `touch` mode: no drag.
- New tiny zustand store or plain module `iconPosStore.ts`: `getLayout() / setPos(id, cell)`, syncing sessionStorage on write. (Plain module + `useSyncExternalStore` is enough; no need to grow osStore.)
- `.mshell` untouched.

### 1.5 CSS
`.desk-icon--ghost { opacity:.55; pointer-events:none; position:fixed; z-index:7; }` plus a `cursor: default` hold during drag. No border-radius, no transitions (XP-instant), respect `data-motion="reduce"` trivially (there's nothing animated).

---

## §2 Feature B — DM Explorer (the browser, kind:'react')

### 2.1 Why not keep kind:'iframe'
The current explorer is a bare external iframe with a one-line address bar (IframeHost's `external` branch). Bookmarks, history, internal game pages and era chrome need a real component. **`explorer.json` flips to `kind:"react"`** and `componentById.explorer` → `lazy(() => import('./apps/browser/BrowserApp'))`. The external-site case (real portfolio) is *one site inside* the browser, reusing the same hardened sandbox rules IframeHost uses today (`allow-scripts allow-popups allow-forms`, no `allow-same-origin`, "Open in new tab" escape hatch).

### 2.2 Files
```
src/os/apps/browser/
  history.ts        pure history machine (LOCKED contract, tests first)
  history.test.ts
  sites.tsx         the fake Web: URL → site registry (lazy game imports live HERE)
  BrowserApp.tsx    chrome + wiring
registry/explorer.json   (modified)
public/icons/explorer.svg (existing icon stays)
globals.css        /* ==== DM Explorer ==== */ block
```

### 2.3 history.ts — pure machine (mirror callMachine.ts discipline)
```ts
export interface Nav { stack: string[]; index: number }
export const HOME = 'http://start.dominikos.net/'
newNav(): Nav                        // {stack:[HOME], index:0}
navigate(n, url): Nav                // truncate forward stack, push, move index
back(n): Nav / forward(n): Nav       // clamp; same-reference no-op at ends
canBack(n) / canForward(n): boolean
normalize(input: string): string     // trim; add http:// if no scheme; lowercase host; keep path
```
Tests: push truncates forward history; back/forward clamp and return same reference at the ends (`toBe`); normalize handles bare domains, mixed-case hosts, already-schemed URLs, garbage (returns a `search:`-style fallback that resolves to the 404 page); determinism.

### 2.4 sites.tsx — the fake Web
```ts
interface Site {
  url: string                 // canonical
  title: string               // shows in window title: "<title> - DM Explorer"
  favicon?: string            // '/os/icons/flappy.svg' etc.
  render: (ctx: SiteCtx) => JSX.Element
}
interface SiteCtx { windowId: string; active: boolean; go: (url: string) => void }
```
Seeded sites (ALL copy original — legal gate scans it):
1. `http://start.dominikos.net/` — **DominikNet portal**: era-style start page (original art/copy: welcome banner, "Today's links" pointing at the two games + real site, a visitor-counter gag, "best viewed at 1024×768" footer).
2. `http://games.dominikos.net/sky-hopper/` — game page rendering `<FlappyApp .../>` (see §2.6).
3. `http://games.dominikos.net/bubble-shooter/` — same for `<BubbleApp .../>`.
4. `https://dominikmachowiak.com/` — real site in a hardened iframe (port the `external` logic out of IframeHost or reuse IframeHost directly with a synthetic manifest — **reuse, don't fork**: export a small `ExternalFrame` from IframeHost or render `<IframeHost manifest={syntheticExplorerManifest} .../>`).
5. Anything else → **`dm-404`** page: era-flavoured "can't reach that page" (original copy — do NOT echo the classic MS "The page cannot be displayed" text; write our own: *"DominikNet couldn't find that address. Check the spelling, or hop back home."* + Home button).

Lookup: exact match after `normalize`, else 404. The two game lazy imports **move here from registry.ts** (`lazy(() => import('../../games/flappy/FlappyApp'))`) so the games stay code-split.

### 2.5 BrowserApp.tsx — chrome spec (XP hard-bevel, tokens, no border-radius)
- **Toolbar row**: Back ◀ / Forward ▶ (disabled per `canBack/canForward`), Stop, Refresh, Home — beveled `#c0c0c0` buttons (Paint-toolbar pattern; remember the xp.css `min-width:75px` reset: `.browser button { min-width:0; min-height:0 }` — same bug class just fixed in Paint).
- **Address row**: `Address` label + text input (full URL, selected on focus) + **Go** button. Enter = Go. `aria-label="Address"`.
- **Links/Favorites bar**: seeded buttons with 16px favicons: `Sky Hopper` · `Bubble Shooter` · `DominikNet Home` · `dominikmachowiak.com`. (Favorites menu button opens the same list vertically; P+ only.)
- **Throbber**: small original pixel animation (spinning DM monogram, CSS steps() animation) top-right; static frame under `:root[data-motion="reduce"]`.
- **Status bar**: left = status text (`Opening http://… ▸ Done`), right = zone chip ("DominikNet zone").
- **Fake load sequence**: on navigate → `loading=true`, progress bar animates ~700ms via a **§8.4-gated** interval (`active = focused && usePageVisible() && !minimized`; a backgrounded load freezes and resumes — same rule the Dialtone call machine follows), then render site, play a short "done" `tone()`, announce via `aria-live="polite"`.
- **Keyboard**: Alt+←/→ = back/forward (guard: not while address input focused... actually fine either way; Desktop's global keymap only owns Alt+Tab/F4), Esc = Stop while loading (note: Desktop.tsx global Esc closes the focused window when the target isn't an input — Stop must `stopPropagation` on its own listener or bind at the component root with capture).
- **Window**: `explorer.json` → `"window": { "width": 920, "height": 660, "minWidth": 480, "minHeight": 380, "singleton": true }`. Resizable + maximizable are already the window-manager defaults — that is the "expand fully work" requirement; nothing new to build, just verify.
- **Launch payload**: `open('explorer', { props: { url } })` supported — `BrowserApp` reads `props?.url` as the initial address (osStore already carries `OpenOptions.props` → `WindowInstance.props` → `AppProps.props`). Singleton note: `open()` focuses the existing instance for singletons — it must ALSO forward the new url; simplest contract: BrowserApp subscribes to nothing, and the Games-folder shortcut (§3.3) is a P+ nicety, so v1 accepts "focus only" for a second open. Document it.

### 2.6 Embedding the games (the critical contract)
`FlappyApp` / `BubbleApp` destructure only `{ windowId, focused }` from AppProps (verified). Game pages render:
```tsx
<FlappyApp manifest={FLAPPY_STUB} windowId={ctx.windowId} focused={ctx.active}
           close={noop} setTitle={noop} />
```
- `ctx.active = browserFocused && !loading && currentSiteIsThisGame` — so navigating away, opening the Start menu, minimizing, or backgrounding the tab pauses the game **through the games' own §8.4 logic** (they check `windows[windowId].state` + `usePageVisible` themselves; passing the browser's `windowId` makes minimize Just Work).
- `manifest` stub: the two JSON manifests are deleted (§3.1), so `sites.tsx` keeps a minimal inline `AppManifest`-shaped stub per game (id/title/icon/category:'games'/window) — typed, never registered.
- Page dressing: centered fixed-size game stage on an era "free web games!" page (original banner copy, e.g. *"DominikNet Arcade — no install, plays right in your browser!"*), page scrolls if the window is smaller than the stage (`overflow:auto` — the games' own min sizes stop mattering because the PAGE scrolls; verify at 480×380 min window).
- Unmount on navigate-away (site component unmounts) — engines already clean up their RAF/timers on unmount (existing §8.4 discipline); verify no stray `tone()` after navigation.

### 2.7 A11y
Real buttons + labels everywhere; address input labeled; `aria-live` for load state; focus order: toolbar → address → favorites → page; the game pages inherit the games' existing a11y. Roving focus NOT needed (normal tab order is correct for a toolbar this small — match Paint, not IconGrid).

### 2.8 Sounds
`tone()` synth only (§5.8): tiny click on navigate, two-note "done" chime, muted via `prefs.muted` like Paint/Dialtone.

---

## §3 Feature C — Sky Hopper + Bubble Shooter become web games

### 3.1 Removals
- **Delete** `registry/flappy.json` and `registry/bubble.json`. Effects, all automatic: Games folder (`children:"auto:games"` → `byCategory('games')`) drops them; Start-menu Games group drops them; desktop never showed them. Saved sessions referencing them are safe: `open()` returns `null` for unknown ids (verified in osStore).
- **Remove** `componentById.flappy` / `componentById.bubble` from registry.ts (the lazy imports move into `sites.tsx` — chunks stay code-split, bundle size unchanged).
- Engines, components, tests (`src/os/games/flappy/**`, `src/os/games/bubble/**`) **stay where they are, untouched** — 100% of the engine test suites keep running.

### 3.2 What remains in Games
Pinball, Pasjans, Minesweeper (native era games) + game1/Dev District (iframe). Sanity-check the folder renders 4 tiles.

### 3.3 P+ (stretch, skippable): "Web Games" shortcut inside the Games folder
A `web-games.json` manifest (category `games`) whose open redirects to the browser. Needs a tiny store feature (`shortcutTo?: { appId: string; props?: unknown }` handled at the top of `open()`). Only build if Dominik asks — the bookmarks already cover discovery.

### 3.4 Credits + docs
- ASSET-CREDITS.md: update the Sky Hopper and Bubble Shooter rows ("…ships as a web game inside DM Explorer…"), add a **DM Explorer** row (original chrome, throbber art, portal/404 copy, invented domains).
- Update the flappy/bubble rows' wording only — licenses unchanged (all "Ours").

---

## §4 File-by-file change list

| File | Change |
|---|---|
| `src/os/desktop/iconLayout.ts` + `.test.ts` | NEW — pure grid math (§1.3) |
| `src/os/desktop/iconPosStore.ts` | NEW — session layout store |
| `src/os/desktop/IconGrid.tsx` | absolute cells + drag (§1.4) |
| `src/os/desktop/DesktopIconView.tsx` | pointer passthroughs only |
| `src/os/storage.ts` | add `sessionRead`/`sessionWrite` |
| `src/os/apps/browser/history.ts` + `.test.ts` | NEW — nav machine (§2.3) |
| `src/os/apps/browser/sites.tsx` | NEW — fake Web + game stubs (§2.4, §2.6) |
| `src/os/apps/browser/BrowserApp.tsx` | NEW — chrome (§2.5) |
| `src/os/window/IframeHost.tsx` | export reusable `ExternalFrame` (no behaviour change) |
| `src/os/registry.ts` | `explorer` → componentById; drop `flappy`/`bubble` |
| `registry/explorer.json` | kind react, DM Explorer naming, window 920×660, singleton |
| `registry/flappy.json`, `registry/bubble.json` | DELETE |
| `src/styles/globals.css` | `/* ==== DM Explorer ==== */` + `.desk-icon--ghost`; include the xp.css min-width reset in the browser block |
| `ASSET-CREDITS.md` | §3.4 rows |

## §5 Test matrix (all headless, all bounded — no wall clock, no RAF)
1. `iconLayout.test.ts` — §1.3 list (≈10 cases).
2. `history.test.ts` — §2.3 list (≈8 cases).
3. Existing suites must stay green **unchanged** — especially `flappy/engine.test.ts`, `bubble/engine.test.ts` (proof the migration touched zero game logic).
4. No component/DOM tests (repo convention: pure modules only).

## §6 Verification protocol (after CI, before "done")
1. `timeout 200 npm run ci` — typecheck + vitest + build + legal gate. **One run at a time, never backgrounded** (house rule).
2. Preview server (`dominikos-os` launch config, viewport ≥1024×800 — below 1024 you get the mobile shell and none of this exists):
   - Drag "My Computer" two cells right → reload (F5) → position survives. Close tab → new tab → position reset.
   - Drag onto an occupied cell → lands in nearest free. Drag to bottom-right corner → clamped above taskbar.
   - Double-click still opens apps; marquee still works on empty desktop; drag-then-release-under-4px selects without moving.
   - Open DM Explorer: portal renders; click Sky Hopper bookmark → loading bar → game runs; minimize → game pauses (sound stops); restore → resumes fresh (no time-jump burst).
   - Back → portal; Forward → game again; type a garbage address → dm-404; Home button → portal; maximize/restore/resize the window.
   - `dominikmachowiak.com` bookmark → real site frames (or shows the open-in-new-tab hint).
   - Legal gate: grep the diff for "Internet Explorer" — must be gone.
3. `npm run deploy:local` → spot-check on :4178.

## §7 Build order (each phase = tests green before the next)
- **P1** `iconLayout.ts` + tests → LOCK.
- **P2** IconGrid drag UI + session store + CSS; verify §6.2 icon checks.
- **P3** `history.ts` + tests → LOCK.
- **P4** `sites.tsx` + `BrowserApp.tsx` chrome + CSS + manifest/registry flips + deletions (§3.1). Full CI.
- **P5** Credits, copy pass (legal gate wording), a11y pass.
- **P6** Adversarial review workflow (lenses: §8.4 timers, icon-drag vs marquee/dblclick races, history machine edges, embedded-game pause contract, XP CSS at min window size, legal/trademark) → fix confirmed findings → redeploy.
