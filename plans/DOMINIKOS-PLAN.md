# DominikOS — Windows XP Desktop Portfolio: Master Implementation Plan

**Author:** Lead Architect · **Executor:** Fable · **Format:** Build top-to-bottom, no further research required.
**Product codename:** **DominikOS** (never "Windows", "Windows XP", "Microsoft", or "Luna" in user-facing copy).

> This document supersedes and reconciles five design sections and two critiques. Where sections disagreed, this plan settles on ONE decision and the executor MUST follow it. Contradictions are resolved silently in favor of the choices stated here. **Sections 0 and 4 define the canonical contracts (types, tokens, boot flow, store API, DOM class contract) that every later section cites verbatim. Do not invent parallel copies.**

---

## 0. Canonical contracts (READ FIRST — everything cites these)

Before any feature work, Fable creates three files that are the single source of truth. All later code imports from them. This resolves critique items A1–A6, C17–C19, and the "four private copies" root cause.

### 0.1 Canonical decisions (locked)

| Concern | LOCKED decision | Rejected alternatives |
|---|---|---|
| **OS theme (primary)** | **Windows XP "Luna Blue"** via **XP.css** for in-window controls only | Vista/Aero (documented alternative, §5.9, ships later behind a token/attr flag) |
| **Build** | **Vite 5 + React 18 + TypeScript strict**, deployed at **`/os/`** | Bolting onto the compiled CRA artifact (impossible) |
| **Window runtime state** | **Zustand** store `useOSStore` with a `.getState()` imperative facade | Raw Context (re-render storm); all-XState (too chatty); imperative `windowManager` singleton |
| **Session lifecycle** | **XState v5** machine `sessionMachine` (splash/boot/login/desktop/shutdown) | Putting windows in XState |
| **Static config** | **React Context** `SystemContext` for theme/sound/a11y/locale/device | — |
| **App registry** | **JSON manifests** globbed at build + a code-side **`componentMap`** joined by `id`/`kind` (§0.4) | TS-only registry; JSON-only registry (can't hold lazy components) |
| **Window DOM/class contract** | **Custom BEM `.win__*`** (NOT raw XP.css `.window`/`.title-bar`); XP.css scoped to `.win-body` interior only | Raw XP.css title bars (won't theme to Aero; can't be touch-scaled cleanly) |
| **Drag architecture** | **Imperative `transform` on the DOM node during drag** (Pointer Events + `setPointerCapture`), single Zustand commit on drop | `@use-gesture` writing to Zustand every frame (re-render storm) |
| **Tokens** | ONE `tokens.css`, keyed by `:root[data-theme="xp"]` (default) / `[data-theme="aero"]` | `--wm-*` vs `--luna-*` split; `data-theme="vista"` naming |
| **Breakpoints** | `BP.phone=640`, `BP.tablet=1024`. **Free-float windowing only at `≥1024px` AND `pointer:fine`.** Phone AND tablet get single-window/maximized. | `<768px` mobile; draggable-window tablet middle-ground |
| **Game pause** | **KAPLAY real API** (`game.paused` + audio mute) via a small hook added to `game1/main.js` | `requestAnimationFrame` monkey-patch (fragile / possibly inert) |
| **"game1 untouched"** | **FALSE — game1 IS edited** (bridge + embedded flag + pause hook). Documented in §8. | The "zero changes" claim in earlier drafts is void |
| **i18n** | **English only for v1.** Content files carry a `-en` suffix to leave the door open. Do NOT install `react-i18next` or `-pl` files in v1. | Installing two i18n mechanisms |
| **Wallpaper** | **Original stylized hill SVG (mandatory).** Ship NO `bliss.*` file. | Bliss photo or any crop (illegal) |
| **Icons** | **SVG**, one file per app in `/os/icons/<id>.svg`, rendered at 16/32/48 via CSS | Mixed PNG `-16` conventions |
| **KAPLAY delivery** | **Vendor KAPLAY locally into `/game1/`** (self-host, remove unpkg import) so offline/preload claims hold | unpkg CDN import (breaks SW precache + first-launch) |

### 0.2 `src/os/types.ts` — the ONE manifest + window contract

```ts
// ============ src/os/types.ts — canonical, imported everywhere ============
import type { LazyExoticComponent, ComponentType } from 'react';

export type AppKind =
  | 'document'   // markdown/HTML doc window (Résumé HTML fallback, About, Skills, Testimonials)
  | 'folder'     // grid of child app icons (Projects, Games)
  | 'iframe'     // embed a same-origin static app (game1) OR external URL (Explorer)
  | 'react'      // code-split React component (in-app games, custom apps)
  | 'timeline'   // Experience/career component
  | 'contact'    // Outlook-Express-style contact app
  | 'notepad'    // plaintext viewer (readme.txt)
  | 'imageview'  // image viewer
  | 'pdf'        // PDF viewer (résumé)
  | 'mycomputer' // flavor/system app
  | 'recyclebin';// flavor app

export type WindowDisplayState = 'normal' | 'minimized' | 'maximized';
export type SnapZone = 'left' | 'right' | 'top-max' | null; // desktop-only, no quarter-snaps in v1
export interface Rect { x: number; y: number; width: number; height: number; }

/** The ONE manifest. JSON files match this shape (minus `component`, which the
 *  componentMap supplies at runtime — see §0.4). */
export interface AppManifest {
  id: string;                     // unique kebab-case: 'resume', 'game1', 'proj-welcom-inn'
  title: string;                  // window title-bar + taskbar label
  kind: AppKind;
  icon: string;                   // '/os/icons/<id>.svg'
  category: 'games' | 'apps' | 'system';
  desktop?: { show: boolean; order?: number };   // auto-flow grid position by `order` ONLY
  startMenu?: { show: boolean; group?: 'Programs'|'Documents'|'Games'|'Places' };
  window: {
    width: number; height: number;               // default size (px, desktop)
    minWidth?: number; minHeight?: number;
    resizable?: boolean;                          // default true
    maximizable?: boolean;                        // default true
    singleton?: boolean;                          // focus existing instead of 2nd instance
    aspectRatio?: number;                         // games lock ratio (e.g. 4/3); letterbox rules §8.5
    maximizedOnMobile?: boolean;                  // default true
  };
  // exactly one payload field, by kind:
  content?: string;   // 'document'|'notepad': path to .md/.txt
  src?: string;       // 'iframe': same-origin path ('/game1/') or external URL; 'imageview'|'pdf': asset path
  children?: string[];// 'folder': child app ids
  data?: string;      // 'timeline'|'contact'|'mycomputer': path to JSON
  download?: { href: string; filename: string }; // 'pdf'|'document': adds Download button
  seo?: { heading: string; body: string };        // fed into #seo-resume (§11)
  external?: boolean;  // 'iframe' with an off-origin src → apply hardened sandbox + block-detection (§7.9)
}

/** Live instance of an open window. */
export interface WindowInstance {
  instanceId: string;         // uuid per open window
  appId: string;              // FK → AppManifest.id
  title: string;
  icon: string;
  rect: Rect;                 // normal-state geometry
  restoreRect: Rect | null;   // geometry to restore after max/snap
  z: number;
  state: WindowDisplayState;
  snap: SnapZone;
  createdAt: number;
  launchTrigger?: HTMLElement | null; // element to return focus to on close (a11y)
  props?: unknown;            // launch payload
}

/** The ONE props object every app component receives. */
export interface AppProps {
  manifest: AppManifest;
  windowId: string;           // = instanceId
  focused: boolean;
  close: () => void;
  setTitle: (t: string) => void;
  props?: unknown;
}

export type LazyApp = LazyExoticComponent<ComponentType<AppProps>>;

export interface DesktopIcon { appId: string; label: string; icon: string; }
export type DeviceMode = 'phone' | 'tablet' | 'desktop';
export type InputMode = 'touch' | 'pointer';
```

### 0.3 `src/os/store/osStore.ts` — the ONE window store (Zustand)

Exposes hook selectors for React AND a `.getState()` facade for imperative callers (back-stack, Alt+Tab, drag commit). This resolves the "imperative `windowManager` vs store" contradiction: **there is no `windowManager` object — there is `useOSStore` + `useOSStore.getState()`.**

```ts
interface OSStore {
  windows: Record<string, WindowInstance>;
  order: string[];               // z-order, last = top-most
  focusedId: string | null;
  nextZ: number;
  windowCount: number;

  open: (appId: string, opts?: { maximized?: boolean; props?: unknown; trigger?: HTMLElement }) => string | null;
  close: (instanceId: string) => void;
  focus: (instanceId: string) => void;
  move: (instanceId: string, x: number, y: number) => void;       // commit-on-drop only
  resize: (instanceId: string, w: number, h: number) => void;
  setState: (instanceId: string, s: WindowDisplayState) => void;  // min/max/restore
  snap: (instanceId: string, zone: SnapZone) => void;
  topWindow: () => WindowInstance | null;
  zOrder: () => string[];        // bottom→top
  title: (instanceId: string) => string;
}
// Usage in React:      useOSStore(s => s.windows[id])
// Usage imperative:    useOSStore.getState().focus(id)
```

Rules baked into actions:
- `open`: if `singleton` and an instance exists → `focus` it, return existing id. On phone/tablet, force `maximized`. Enforce window cap (§9.6): if opening exceeds cap AND device is desktop, LRU-close the least-recently-focused non-game window. **On phone/tablet the cap does not evict (single-window model keeps all mounted+hidden).**
- `move`: called once on drag-drop (drag itself is imperative DOM transform, §4.3).
- `focus`: bump `nextZ`, reorder `order[]`, set `focusedId`; announce via aria-live (§11).
- `close`: remove; if it was focused, focus new top of `order`; return DOM focus to `launchTrigger`.

### 0.4 `src/os/registry.ts` — JSON manifests + componentMap join

```ts
// JSON manifests are the data source of truth (add-a-file extensibility).
const files = import.meta.glob('/os/registry/*.json', { eager: true, import: 'default' });

// Code-side map: kinds that need a renderer, and app ids that are code-split React apps.
import { lazy } from 'react';
export const componentByKind: Partial<Record<AppKind, LazyApp>> = {
  document:  lazy(() => import('./apps/DocWindow')),
  folder:    lazy(() => import('./apps/FolderApp')),
  timeline:  lazy(() => import('./apps/ExperienceApp')),
  contact:   lazy(() => import('./apps/ContactApp')),
  notepad:   lazy(() => import('./apps/NotepadApp')),
  imageview: lazy(() => import('./apps/ImageViewApp')),
  pdf:       lazy(() => import('./apps/PdfApp')),
  mycomputer:lazy(() => import('./apps/MyComputerApp')),
  recyclebin:lazy(() => import('./apps/RecycleBinApp')),
  // 'iframe' has NO component (rendered by IframeHost); 'react' resolves via componentById:
};
export const componentById: Record<string, LazyApp> = {
  // future in-app React games:  game2: lazy(() => import('./games/game2/Game2')),
};

export const AppRegistry: Record<string, AppManifest> =
  Object.values(files).reduce((acc, m: any) => (acc[m.id] = m, acc), {});
export const byId = (id: string) => AppRegistry[id];
export const byCategory = (c: string) => Object.values(AppRegistry).filter(a => a.category === c);
export const desktopIcons = () =>
  Object.values(AppRegistry).filter(a => a.desktop?.show)
    .sort((a, b) => (a.desktop!.order ?? 99) - (b.desktop!.order ?? 99));

/** AppHost resolves the renderer: */
export function resolveComponent(m: AppManifest): LazyApp | null {
  if (m.kind === 'iframe') return null;                 // → IframeHost
  if (m.kind === 'react')  return componentById[m.id];  // code-split app/game
  return componentByKind[m.kind] ?? null;               // generic kind renderer
}
```

**Add-a-game truth (resolves critique D22–D24):** the Games folder AUTO-LISTS `byCategory('games')`. Manual `children:[]` maintenance is NOT required for games. `folder-games.json` uses `"children": "auto:games"` sentinel → FolderApp expands it via `byCategory('games')`. Static-content folders (Projects) keep explicit `children`.

### 0.5 Boot-flow diagram (the ONE first-screen + FSM)

```
                       (eager, ~<30KB, plain semantic HTML, captures fullscreen gesture)
  URL /os/  ─────────►  <BootChooser>
                          ├─ reads ?boot=  and localStorage['dmos.v1.lastBoot']
                          ├─ toggles: Reduce motion (pre-checked from media query), Sound off
                          │
       "Just the Résumé"  ├──────────────► window.location = '/'   (classic accessible site)
                          │
       "Enter Desktop"    ├──────────────► requestFullscreen() ─► React.lazy(OSShell) ─► XState @ 'boot'
                          │                                                              (skip 'splash')
       "Play a Game"      └──────────────► requestFullscreen() ─► React.lazy(OSShell) ─► XState @ 'desktop'
                                                                   seeded to open game1 focused,
                                                                   login SKIPPED (deep-link path)

  XState sessionMachine:
     splash ─(unused; chooser replaces it)
     boot   ──BOOT_DONE──► login ──LOGIN──► desktop ──SHUTDOWN──► shutdown ──RESTART──► login
                                              ▲                                            │
                                              └──────────── (restart returns to login, not boot)
     machine input: { entry: 'desktop'|'boot', bootApp?: 'game1' }  seeds initial state.
```

XState machine (`src/os/machines/sessionMachine.ts`) takes **input** so deep links seed the initial state and `bootApp`:

```ts
export const sessionMachine = setup({
  types: {} as {
    context: { bootProgress: number; bootApp?: string };
    input:   { entry: 'boot' | 'desktop'; bootApp?: string };
    events:  { type:'BOOT_DONE' } | { type:'LOGIN' } | { type:'SHUTDOWN' } | { type:'RESTART' };
  },
}).createMachine({
  id: 'session',
  context: ({ input }) => ({ bootProgress: 0, bootApp: input.bootApp }),
  initial: 'boot',                 // overridden below via input.entry
  // Fable: use `initial` selection via a guard/`always` on a wrapper, OR expose two machine
  // definitions; simplest is: start at 'boot', and if input.entry==='desktop', the machine
  // auto-fast-forwards (boot entry action fires BOOT_DONE+LOGIN immediately when entry==='desktop').
  states: {
    boot:     { on: { BOOT_DONE: 'login' } },
    login:    { on: { LOGIN: 'desktop' } },
    desktop:  { on: { SHUTDOWN: 'shutdown' } },
    shutdown: { on: { RESTART: 'login' } },   // restart returns to login (not full boot)
  },
});
```
`?boot=game` path: `entry:'desktop'`, `bootApp:'game1'` → OSShell, on entering `desktop`, calls `useOSStore.getState().open('game1', { maximized: isTouchPrimary() })`. Login is skipped.

### 0.6 `localStorage` schema (versioned; resolves B11)

```ts
// namespace 'dmos.v1.*' — bump to v2 on breaking change; on version mismatch, clear + reseed.
'dmos.v1.lastBoot'  : 'desktop' | 'game' | 'resume' | null;   // BootChooser skip-intro
'dmos.v1.prefs'     : { reducedMotion: boolean; muted: boolean; theme: 'xp'|'aero'; largeText: boolean };
'dmos.v1.session'   : {                                        // desktop layout ONLY (not phone)
  windows: Array<{ appId: string; rect: Rect; z: number; state: WindowDisplayState }>;
  // REHYDRATE RULE: on desktop boot, reopen document/flavor apps at saved rects.
  // iframe games (game1) and 'react' games are NEVER auto-reopened (avoid surprise CPU/CDN cost).
};
```

---

## 1. Vision & goals

### TL;DR for Fable
- **What to build:** a fullscreen, retro **Windows XP desktop-OS portfolio** for Dominik Machowiak, deployed at `dominikmachowiak.com/os/`. Boot → login → desktop with draggable windows (desktop) / single-window launcher (mobile). Desktop icons open his **Résumé, About, Projects, Experience, Contact**, and **games** (starting with the existing **game1 "Dev District"**, embedded via iframe; more added later with one JSON file).
- **Recommended OS theme:** **Windows XP "Luna Blue"** (primary, ship this). **Vista/Aero** is a fully-specified swappable alternative behind a theme attribute (§5.9), NOT built in v1.
- **Stack (locked):** Vite 5 · React 18 · TypeScript (strict) · **Zustand** (window runtime) · **XState v5** (session FSM) · React Context (static config) · **XP.css** (in-window controls only) · Tailwind v4 (layout utilities) + CSS variables tokens · Pointer Events (custom drag/resize) · `gray-matter`+`marked`+`DOMPurify` (content) · `vite-plugin-pwa` (optional, `/os/`-scoped).

### Goals
1. Feel like a real early-2000s OS: fullscreen, boot ceremony, Luna chrome, taskbar, Start menu, working windows.
2. Launch from the existing portfolio's buttons; keep the classic site as the crawlable/accessible fallback.
3. **Smooth (60fps drag), fast (measured budget), mobile-capable** — with the honest understanding (§10) that on phones this is a themed single-window launcher, not a windowed desktop.
4. **Extensible:** add a game or project by dropping in one JSON manifest + one SVG icon.
5. **Legally clean:** ship ZERO Microsoft-owned assets (§6).
6. **Accessible (WCAG 2.1 AA) and indexable** via a static semantic résumé + classic-site fallback (§11).

### Non-goals (v1)
- No Vista/Aero build (documented only). No i18n beyond English. No server/backend (contact uses Web3Forms + `mailto:` fallback). No genie-warp minimize (taskbar-suck instead). No quarter-snaps.

---

## 2. Reference analysis — mewmewdevart / DevCommunityPortfolioChallenge2026

**Borrow:**
- **Custom window manager** (focus, z-index, drag, resize, keyboard nav) — we build our own too.
- **Boot/Start chooser** (device + experience level: Full Desktop / Résumé / Game) — we adopt as `<BootChooser>` (§10.3), which is also our fullscreen-gesture + code-split gate.
- **"Add a file" extensibility** — we adopt JSON manifests globbed at build (§0.4).
- **A11y rigor** — roving tabindex icon grid, `aria-live`, semantic HTML, `role="dialog"` windows, reduced-motion + sound-off respected (§11).
- **App set** — résumé, about, project folders, embedded game console, "My Computer", image viewer.

**Do differently:**
- **State model:** they use Context + XState heavily; we use **Zustand for the per-frame window runtime** (Context re-renders every consumer during a drag), XState only for the rare session lifecycle.
- **Games:** they ship in-app pixel games; our first game is the **existing buildless KAPLAY game embedded via iframe** — so we build an **iframe host + pause bridge** (§8) they didn't need.
- **Skin toolkit:** we use **XP.css** for controls (they hand-rolled Tailwind+BEM); Luna XP is our locked theme.
- **Deployment:** we deploy as a **sibling `/os/` route** to a pre-existing compiled CRA site (can't touch its source), so integration is via repointed buttons + host rewrites (§12), not a monorepo.
- **i18n:** they ship en/es/pt-br; we ship **en-only** with `-en` suffixes reserved.

You MAY `WebFetch` the reference repo file tree/README to ground folder structure, but it is not required — the structure in §4.1 is complete.

---

## 3. Tech stack decision (locked) + deployment topology

| Layer | Choice | Version | Notes |
|---|---|---|---|
| Build tool | Vite | ^5 | `base: '/os/'` |
| Framework | React + React-DOM | ^18 | concurrent, `useSyncExternalStore` |
| Language | TypeScript | ^5, `"strict": true` | — |
| Window runtime state | **Zustand** | ^4 | `useOSStore` + `.getState()` facade (§0.3) |
| Session FSM | **XState** + `@xstate/react` | ^5 | `sessionMachine` (§0.5) |
| Static config | React Context | (React) | `SystemContext`: theme/sound/a11y/device/locale |
| Control skin | **XP.css** | latest (`npm i xp.css`) | MIT; scoped to `.win-body` interior ONLY |
| Layout utilities | Tailwind CSS | ^4 | layout only; visuals come from tokens |
| Drag/resize | **Pointer Events** (no lib) | — | `setPointerCapture`, imperative transform (§4.3) |
| Content pipeline | `gray-matter` + `marked` + `dompurify` | latest | frontmatter + md→HTML + sanitize |
| Contact delivery | Web3Forms + `mailto:` fallback | — | public access key, no backend (§7.7) |
| PDF | build-time Puppeteer render (dev dep) | — | commits `dominik-machowiak-cv.pdf`; runtime has no PDF lib |
| PWA (optional) | `vite-plugin-pwa` (Workbox) | latest | scoped to `/os/` only |
| Budget CI | `size-limit` + Lighthouse-CI | latest | thresholds set POST-prototype (§9.1) |
| Game engine | **KAPLAY (vendored local)** | 3001.x | self-hosted in `/game1/`, no CDN (§0.1) |

**Deployment topology (single origin, three static peers):**
```
dominikmachowiak.com/          → existing CRA+Sanity build (unchanged artifact; SEO/a11y home)
dominikmachowiak.com/os/       → NEW Vite app (base:'/os/')   ← this build
dominikmachowiak.com/game1/    → existing KAPLAY game (EDITED: bridge + vendored engine, §8)
dominikmachowiak.com/game2/    → future game (its own Vite build → dist to /game2/, §8)
```
- Vite: `defineConfig({ base:'/os/', build:{ outDir:'dist', target:'es2020', assetsInlineLimit:4096 } })`.
- SPA rewrites scoped to `/os/*` ONLY (never hijack `/` or `/game1/`) — configs for Netlify/Vercel/Apache in §12.4.
- **Existing launch button:** currently injected as raw `<a href="/game1/">` in `index.html` **outside** React's `#root` (NOT a Sanity field — this corrects the earlier "edit in Sanity" claim). Repoint/duplicate it to `/os/?boot=desktop` the same way it's injected now (a one-line href change in the injected anchor, or add a second "Enter my Desktop" anchor). §12.1.
- **Local dev:** `dev-server.js` is a **flat static server on :4178 with NO proxy** (verified). Do NOT assume a Vite→`/game1` proxy exists. Two supported dev workflows (§12.5): (a) add `server.proxy` to `vite.config.ts` mapping `/game1` and `/game2` to the static folders while running Vite on :5173; or (b) build `/os/` and serve everything through `dev-server.js`. Use (a) for iteration.

---

## 4. Architecture

### 4.1 File / folder tree

```
os/                                   # NEW Vite app → deploys to /os/
├─ index.html                         # BootChooser mount + #seo-resume + <noscript> + JSON-LD + meta (§10,§11)
├─ vite.config.ts                     # base:'/os/', server.proxy for /game1 & /game2, manualChunks
├─ tsconfig.json                      # strict:true
├─ .size-limit.json                   # per-chunk budgets (thresholds filled post-prototype, §9)
├─ package.json
├─ ASSET-CREDITS.md                   # every 3rd-party asset + license + URL (§6)
├─ public/
│  ├─ wallpaper/hills.svg             # ORIGINAL stylized hill (NO bliss.*)
│  ├─ icons/                          # <id>.svg per app (resume, game1, folder-projects, explorer, ...)
│  ├─ chrome/xp/                      # min.svg max.svg close.svg  (hand-drawn 12×12 glyphs)
│  ├─ ui/start-flag.svg               # ORIGINAL "DM" monogram mark (NOT the MS flag)
│  ├─ cursors/                        # arrow.png text.png hand.png busy.png (original) — desktop only
│  ├─ fonts/DejaVuSans.woff2          # bundled Tahoma stand-in (only MS-substitute we ship)
│  └─ sounds/                         # logon.* ding.* shutdown.* click.*  (CC0/synth ONLY, §6)
├─ os/                                # served under /os/ at runtime (data + content live here)
│  ├─ registry/*.json                 # ~13 app manifests (§7)
│  ├─ content/
│  │  ├─ about-en.md  skills-en.md  testimonials-en.md  readme.txt
│  │  ├─ experience.json  contact.json
│  │  └─ projects/{welcom-inn,rubicall,mern}-en.md
│  └─ media/                          # dominik-machowiak-cv.pdf, project screenshots (.webp)
├─ scripts/build-resume-pdf.mjs       # Puppeteer render of HTML résumé → media/…cv.pdf
└─ src/
   ├─ main.tsx                        # renders <BootChooser/>
   ├─ os/
   │  ├─ types.ts                     # §0.2  (CANONICAL)
   │  ├─ env.ts                       # BP, getDeviceMode, isTouchPrimary, prefersReducedMotion
   │  ├─ useDeviceMode.ts
   │  ├─ registry.ts                  # §0.4  (CANONICAL)
   │  ├─ store/osStore.ts             # §0.3  (CANONICAL)
   │  ├─ machines/sessionMachine.ts   # §0.5
   │  ├─ context/SystemContext.tsx    # theme/sound/a11y/device/locale
   │  ├─ hooks/{useWindowDrag,useFullscreen,useClock,useLongPress,usePageVisible,useGameLoop}.ts
   │  ├─ boot/{BootChooser,BiosScreen,BootScreen,LoginScreen,ShutdownScreen}.tsx
   │  ├─ shell/{OSShell,Desktop,Wallpaper}.tsx
   │  ├─ window/{WindowLayer,Window,TitleBar,ResizeHandles,AppHost,IframeHost,SnapPreview}.tsx
   │  ├─ desktop/{IconGrid,DesktopIconView,ContextMenu}.tsx
   │  ├─ taskbar/{Taskbar,StartButton,StartMenu,MobileDock,MobileStartLauncher,QuickLaunch,TaskButtons,SystemTray,Clock}.tsx
   │  ├─ mobile/backStack.ts          # history state machine (§10.4)
   │  └─ apps/{DocWindow,FolderApp,ExperienceApp,ContactApp,NotepadApp,ImageViewApp,PdfApp,MyComputerApp,RecycleBinApp,ResumeApp,AboutApp,ProjectsApp}.tsx
   └─ styles/{globals.css, tokens.css, touch.css}   # globals imports 'xp.css'
```

### 4.2 Core TypeScript interfaces
Defined canonically in **§0.2**: `WindowInstance`, `AppManifest` (the merged `AppDefinition`/`AppManifestEntry`/`ContentManifest`), `DesktopIcon`, plus `AppProps`, `Rect`, `SnapZone`, `DeviceMode`. The `GameManifestEntry` is NOT a separate type — games are `AppManifest` with `category:'games'` and either `kind:'iframe'` (+`src`) or `kind:'react'` (+`componentById[id]`), optionally `window.aspectRatio` and (for iframe games) a `game`-behavior via the bridge (§8). Global state shape is **§0.3** (`OSStore`). Session context is **§0.5**.

### 4.3 Window manager design

**DOM/class contract (LOCKED — custom BEM, XP.css interior only):**
```html
<div class="win" data-state="active" data-display="normal" role="dialog"
     aria-modal="false" aria-labelledby="win-<id>-title" tabindex="-1"
     style="transform:translate3d(Xpx,Ypx,0); width:Wpx; height:Hpx; z-index:Z">
  <div class="win__titlebar">                         <!-- drag handle; touch-action:none -->
    <img class="win__icon" src="/os/icons/<id>.svg" alt="">
    <span class="win__title" id="win-<id>-title">Résumé — Dominik Machowiak</span>
    <div class="win__controls">
      <button class="win__btn win__btn--full" aria-label="Fullscreen this window"></button> <!-- games only -->
      <button class="win__btn win__btn--min"  aria-label="Minimize"></button>
      <button class="win__btn win__btn--max"  aria-label="Maximize"></button>
      <button class="win__btn win__btn--close" aria-label="Close"></button>
    </div>
  </div>
  <div class="win__body win-body"><AppHost .../></div>  <!-- XP.css controls live ONLY here -->
  <div class="status-bar">…</div>
  <ResizeHandles/>                                       <!-- 8 handles, desktop only -->
</div>
```
XP.css is imported globally but authored components use `.win-body` scoping so its `.window`/`.title-bar` rules never clash with our `.win__*` chrome. All touch-target sizing (§10.1) targets `.win__*` classes, not XP.css classes.

**Drag (LOCKED — imperative, 60fps):**
```ts
// useWindowDrag.ts — Pointer Events, single React commit on drop
function onPointerDown(e: PointerEvent, id: string, el: HTMLElement) {
  useOSStore.getState().focus(id);
  el.setPointerCapture(e.pointerId);
  el.style.willChange = 'transform';
  grab = { dx: e.clientX - rect.x, dy: e.clientY - rect.y };
  el.querySelector('.win__body')!.style.pointerEvents = 'none';   // don't hit-test contents
}
function onPointerMove(e: PointerEvent) {
  if (!el.hasPointerCapture(e.pointerId)) return;
  pending = { x: e.clientX - grab.dx, y: Math.max(0, e.clientY - grab.dy) }; // clamp above taskbar
  if (!rafId) rafId = requestAnimationFrame(() => {                 // coalesce to 1/frame
    el.style.transform = `translate3d(${pending.x}px,${pending.y}px,0)`;
    updateSnapPreview(e.clientX, e.clientY); rafId = 0;
  });
}
function onPointerUp(e: PointerEvent) {
  el.style.willChange = 'auto';                                     // REMOVE (frees VRAM)
  el.querySelector('.win__body')!.style.pointerEvents = '';
  const zone = detectSnapZone(e.clientX, e.clientY);
  if (zone) useOSStore.getState().snap(id, zone);                   // half/max
  else useOSStore.getState().move(id, pending.x, pending.y);        // ONE store commit
}
```
No Zustand write during the move — the store commits once on drop. This deletes the "@use-gesture writes to Zustand per frame" path entirely.

**Resize:** 8 handles (`ResizeHandles`), Pointer Events, rAF-throttled; clamp to `minWidth/minHeight`. Games with `aspectRatio` snap to ratio and show a `transform:scale` preview during drag, committing real `width/height` on release. Desktop only.

**Focus & z-index:** `focus(id)` bumps `nextZ`, reorders `order[]`, sets `data-state="active"` on the target and `inactive` on others, announces via aria-live. Any pointerdown in a window (capture phase) focuses it. Taskbar button focuses/restores, or minimizes if already focused.

**Min / Max / Restore / Close:**
- **Minimize** → `state:'minimized'`, `content-visibility:hidden` + `display:none`, keep taskbar button. Animation: taskbar-suck (`transform` scale+translate toward the button's x + fade, `--dur-window`).
- **Maximize** → save `restoreRect`, set rect to workspace (screen minus taskbar), `data-display="maximized"`; max button toggles to restore.
- **Close** → remove; focus new top of `order`; return DOM focus to `launchTrigger`; for iframe games set `iframe.src='about:blank'` first to kill timers/audio immediately.

**Snap (desktop only, `≥1024px` + `pointer:fine`):** left/right → half-screen (save `restoreRect`, drag-away restores); top → maximize. `<SnapPreview>` shows a translucent zone overlay while dragging into an edge. No snap on phone/tablet. `SnapZone` type is `'left'|'right'|'top-max'|null` (no quarter-snaps in v1).

**Animations:** `transform`/`opacity` only. Open: scale 0.85→1 + fade from launching icon's position, `--dur-window` (160ms). Menus: 90ms fade+slide. All gated behind `prefers-reduced-motion` + the sound/motion toggles.

**Fullscreen — two distinct features (resolves B4/critique 28):**
1. **OS-fullscreen:** `document.documentElement.requestFullscreen()` on the BootChooser gesture. iOS Safari has no element Fullscreen API → fall back to `100dvh` PWA shell (no-op the call in a try/catch).
2. **Game-fullscreen:** the `.win__btn--full` button (only on `game.fullscreenButton` apps) requests fullscreen on the **WindowFrame `.win` node** so OS chrome + game go fullscreen together. On iPhone this is ALSO unavailable → pseudo-fullscreen CSS (`position:fixed; inset:0; z-index:99999`). game1's OWN internal fullscreen is DISABLED when embedded (via `?embedded=1`, §8) so the two owners never fight.

### 4.4 Component tree

```
<BootChooser>                         // eager entry; owns fullscreen gesture + code-split
 └─(on "Enter Desktop"/"Play a Game")─ React.lazy(<OSShell>)
     <OSShell> = <SystemContext> + XState provider + <useFullscreen>
      ├─ <BootScreen/> | <LoginScreen/> | <Desktop/> | <ShutdownScreen/>   (by FSM state)
      └─ <Desktop>                    // state === 'desktop'
          ├─ <Wallpaper/>             // hills.svg (solid #3a6ea5 fallback)
          ├─ <IconGrid/>              // roving-tabindex icons (desktop) / touch grid (mobile)
          ├─ <WindowLayer/>           // maps order[] → <Window/>
          │   └─ <Window/> ×N → <TitleBar/> + <ResizeHandles/> + <AppHost/>
          │        └─ <AppHost/> → <Suspense> lazy component  OR  <IframeHost/>
          ├─ <SnapPreview/>  <ContextMenu/>
          └─ desktop: <Taskbar>(StartButton→StartMenu, QuickLaunch, TaskButtons, SystemTray→Clock)
             mobile:  <MobileDock> + <MobileStartLauncher>
```

---

## 5. Visual design system (Windows XP "Luna Blue" — CHOSEN)

### 5.1 Decision recap
Ship **XP Luna** (flat gradients, GPU-free, iconic, XP.css-mature, easy CC0 assets). Aero is deferred (§5.9). Every visual value comes from `tokens.css`; no component hardcodes a color, gradient, radius, blur, or font.

### 5.2 XP.css adoption model — "skin the leaves, own the tree"
- **XP.css styles interior controls ONLY** (`button`, `.field-row`, tabs, tree-view, `.status-bar`, sliders, scrollbars) inside `.win-body`. It does NOT provide desktop/taskbar/Start/window-management — those are 100% custom, token-driven.
- `npm i xp.css`; `@import "xp.css";` once in `globals.css`.
- We build custom + token-driven: `Wallpaper`, `IconGrid`, `Taskbar`, `StartButton`, `StartMenu`, `Tray/Clock`, `BootScreen`, `LoginScreen`, and the `.win__*` outer chrome + all animations.
- Do NOT use 7.css in the XP build.

### 5.3 Tokens — `src/styles/tokens.css` (single source; NO `bliss`, NO `--wm-*`)
```css
:root, :root[data-theme="xp"] {
  /* Luna palette */
  --luna-blue-1:#2f71cd; --luna-blue-2:#3f8cf3; --luna-blue-3:#1c5fc4; --luna-blue-4:#0a3d91;
  --luna-blue-edge:#0831d9; --luna-inactive-1:#7ba2e0; --luna-inactive-2:#6d94d4;
  --luna-start-green-1:#61c25a; --luna-start-green-2:#379437; --luna-start-green-3:#2a7d2e;
  --taskbar-1:#245edb; --taskbar-2:#3f8cf3; --taskbar-3:#2056c8; --tray-1:#0b9dea; --tray-2:#1287d4;
  /* surfaces */
  --surface:#ece9d8; --surface-face:#f6f5ee; --field-bg:#fff;
  /* ink */
  --ink:#000; --ink-subtle:#4a4a4a; --ink-on-blue:#fff; --link:#0033cc; --link-visited:#551a8b;
  /* selection/focus */
  --select-bg:#316ac5; --select-ink:#fff; --focus-ring:#ffd54a; --hover-tint:#e3ebfa;
  /* geometry */
  --win-radius:8px 8px 0 0; --btn-radius:3px; --title-h:30px; --taskbar-h:40px; --icon-cell:88px; --border-3d:2px;
  /* glass (XP = none) */
  --glass-blur:0px; --glass-bg:var(--surface); --glass-border:transparent;
  /* wallpaper — ORIGINAL, never bliss */
  --wallpaper:url("/os/wallpaper/hills.svg"); --wallpaper-solid:#3a6ea5;
  /* type */
  --font-ui:"Trebuchet MS","Segoe UI",Tahoma,"DejaVu Sans",sans-serif;
  --font-body:Tahoma,"DejaVu Sans","Segoe UI",sans-serif;
  --font-mono:"Lucida Console","Consolas",monospace;
  --fs-ui:11px; --fs-title:12px; --fs-body:13px;   /* content apps override to ≥14px, §11 */
  /* motion */
  --dur-window:160ms; --dur-menu:90ms; --ease-win:cubic-bezier(.2,.7,.3,1);
  --shadow-win:0 6px 18px rgba(0,0,0,.35), 0 1px 0 rgba(255,255,255,.4) inset;
  --shadow-menu:0 8px 22px rgba(0,0,0,.4);
}
@media (prefers-reduced-motion: reduce){ :root{ --dur-window:0ms; --dur-menu:0ms; } }
```

### 5.4 Fonts (resolves A3 — NO Verdana, NO MS font files)
- **Bundle exactly ONE file:** DejaVu Sans (`/fonts/DejaVuSans.woff2`, Bitstream Vera license, `font-display:swap`) — the guaranteed cross-device stand-in for Tahoma.
- **Reference by name only** (ship no file): Tahoma, Trebuchet MS, Segoe UI. **NEVER bundle Verdana, Tahoma, Segoe UI, or Franklin Gothic.**
- Keep `--fs-ui:11px` for chrome; content apps use ≥14px `rem` (zoomable to 200%). Provide a "large text" toggle scaling root `font-size`.

### 5.5 Window chrome, Start button, taskbar, tray
Use the `.win__*` CSS from the visual-system spec verbatim (titlebar 4-stop Luna gradient + top sheen + `text-shadow`; inactive state; `.win__btn--close` red `#d24a3a`). Start button = green pill, `border-radius:0 9px 9px 0`, italic lowercase label, background = **`/os/ui/start-flag.svg` (Dominik's original "DM" monogram, NOT the MS flag)** + green gradient. Taskbar = fixed-bottom Luna gradient (`--taskbar-*`), task buttons inset when active, tray with `--tray-*` gradient + live `<Clock/>` (`Intl.DateTimeFormat`, `h:mm AM/PM`, 1s tick, hover tooltip = date) + mute toggle + faux network glyph.

### 5.6 Desktop, icons, wallpaper
- Icon grid: column-major auto-flow, `--icon-cell` (88px, ≥44px touch target), 48px icon + white label with shadow. Selection = blue highlight + dotted focus rect.
- **Icons: SVG, one `/os/icons/<id>.svg` per app**, rendered at 16/32/48 via CSS. Manifest of authored icons: `resume, about, folder-projects, folder-games, game1, experience, explorer, my-computer, recycle-bin, recycle-bin-full, email, linkedin, notepad, code, ie-doc`. Style: flat/lightly-shaded, saturated, thin dark outline, soft bottom shadow (Tango PD-derived or original redraws).
- **Wallpaper: original stylized hill SVG** (`/os/wallpaper/hills.svg`) — flat/gradient "green hill + blue sky + clouds". `--wallpaper-solid:#3a6ea5` paints before the SVG. **Ship NO file named `bliss.*` and no Bliss crop/derivative.**

### 5.7 Cursors, boot/login, animations
- Ship an **original CC0 cursor set** (arrow/text/hand/busy) referenced via `cursor:`. **No extracted `.cur`/`.ani`.** Feature-detect `pointer:coarse` and skip loading cursors on touch.
- **Boot sequence:** BIOS/POST text (~0.8–1.2s) → **DominikOS wordmark** (original, NOT the Windows logo) + Luna marquee progress (pure CSS, ~2s, click/tap to skip) → Login (Luna teal split, single "Dominik Machowiak" tile + avatar) → Desktop. All skippable + reduced-motion aware (skip to ≤300ms crossfade). Persistent focusable "Skip ⏭" button during boot.
- **Animations:** `transform`/`opacity` only. Open = scale-from-icon + fade; minimize = **taskbar-suck** (NOT genie); menus = 90ms fade+slide. Golden rule: never animate width/height/top/left/filter in steady state.

### 5.8 Sounds
Only CC0 or WebAudio-synthesized tones, logged in `ASSET-CREDITS.md`. **NEVER ship XP/Vista `tada`/logon/shutdown/error sounds.** Filenames in `public/sounds/` must be generic (`logon.mp3` etc. are placeholders for CC0/synth files). One shared `AudioContext`; all audio gated behind the sound-on toggle + a user gesture (mobile autoplay policy).

### 5.9 Alternative theme summary — Windows Vista "Aero" (deferred; NOT built v1)
Lazy-loaded `src/styles/theme-aero.css` under `:root[data-theme="aero"]` (attribute — the single mechanism; there is NO separate React `skin` Context toggle, resolving the "attribute vs context" contradiction — the `SystemContext` `theme` value only sets `document.documentElement.dataset.theme`). Reuses every component; only tokens + a blur layer change: glass titlebars (`backdrop-filter:blur(16px)`, translucent dark chrome), round glass Start orb (still Dominik's original mark), Segoe UI referenced + Selawik (OFL) bundleable as the free Aero substitute. **Caveats Fable must respect when/if built:** auto-degrade blur OFF on `pointer:coarse` OR `prefers-reduced-motion` (do NOT rely on `navigator.deviceMemory` — Chromium-only, absent on the exact browser where blur janks worst); cap simultaneously-blurred surfaces (blur active window only); Aero icons need redrawing (art cost). This is the SECOND reason XP wins for v1.

---

## 6. Legal / trademark / asset plan (READ BEFORE SHIPPING)

Microsoft owns **"Windows"** (trademark), the **four-pane flag**, **Bliss**, **XP/Vista sounds**, and **system icon/cursor bitmaps** (`shell32.dll`/`imageres.dll`/`.cur`/`.ani`). We build an **unofficial homage/parody** and ship **ZERO** MS-owned bits.

### ✅ MUST DO
- **Name it "DominikOS."** Never "Windows"/"Windows XP"/"Microsoft"/"Luna" in user-facing copy. ("Luna" is fine ONLY as an internal token name; never surfaced.)
- **Disclaimer on real surfaces** (there is no page footer — resolves critique 30): put it in **(a) the About app, (b) the BootChooser screen, and (c) `ASSET-CREDITS.md`**:
  > *"DominikOS is an original fan homage inspired by early-2000s desktop operating systems. It is not affiliated with, endorsed by, or connected to Microsoft Corporation. 'Windows' and related marks are trademarks of their respective owners."*
- **Recreate, don't extract.** All icons, cursors, control glyphs, the Start-flag (Dominik's "DM" monogram), wallpaper, and sounds are originals or CC0/permissive, redrawn to *evoke* the era.
- **Keep `ASSET-CREDITS.md`** listing every 3rd-party asset + license + URL.
- **Retitle flavor apps to avoid MS strings** (resolves A2): the Explorer app title is **"Internet Explorer"** at most — **remove "Microsoft"**; recommended original name **"DM Explorer"**. Consider labeling the Start button **"start"** consciously (it's defensible parody); the combination is the trade-dress, so the original flag is mandatory.

### ❌ DO NOT SHIP (hard bans)
- ❌ **Bliss** wallpaper or any crop/recolor. **Ban the literal filename `bliss.*` from the repo.**
- ❌ The **Windows flag logo** (any 4-pane wavy flag) anywhere.
- ❌ **Extracted system icons/cursors** from any Windows install.
- ❌ **XP/Vista startup/shutdown/error/notification sounds.**
- ❌ **Tahoma, Segoe UI, Franklin Gothic, Verdana** font files (reference by name only; bundle DejaVu Sans / optionally Selawik).
- ❌ Literal strings "Microsoft Windows®", "Microsoft Internet Explorer", product keys, MS logo/badge art.

### ✅ CC0 / permissive sources
| Asset | Source | License |
|---|---|---|
| Control-skin CSS | XP.css https://github.com/botoxparty/XP.css | MIT |
| Icons (era-accurate) | Tango https://commons.wikimedia.org/wiki/Tango_icons | Public Domain |
| Icons (vector) | Lucide https://lucide.dev · Tabler https://tabler.io/icons | ISC / MIT |
| Aero-only Segoe substitute | Selawik https://github.com/microsoft/Selawik | SIL OFL 1.1 |
| Tahoma substitute (bundled) | DejaVu Sans https://dejavu-fonts.github.io/ | Bitstream Vera (free) |
| Wallpaper (safest, DEFAULT) | **Author original SVG** | Ours |
| Wallpaper (photo alt) | Unsplash/Pexels/Wikimedia "green hill blue sky" | verify per-image |
| Sounds | Freesound (CC0 filter) · Pixabay SFX · Kenney UI (CC0) | CC0 |
| Cursors | Author original PNGs | Ours |

### CI guard (mandatory, resolves A1/legal-perf-reality)
Add a build step that **greps the built output + repo** for banned tokens and **fails the build** on any hit:
`bliss`, `luna` (in shipped filenames/user copy), `segoe`, `tahoma.`, `verdana.`, `franklin`, `shell32`, `imageres`, `.ani`, and known MS sound filenames (`tada`, `Windows Logon`, `Windows XP Startup`). Also fail if any `<title>`/JSON `title` contains "Microsoft".

**Bottom line:** if an asset can be traced to a Windows install or official MS download, it does not exist in the repo.

---

## 7. Apps spec (every window + content-as-config)

**Theme tokens block for apps:** apps read `tokens.css` (§5.3). **Delete every `--wm-*`/`bliss.jpg` reference** from any earlier draft — the canonical tokens are `--luna-*`/`--wallpaper`.

**Shared app contract:** every app component receives `AppProps` (§0.2): `{ manifest, windowId, focused, close, setTitle, props }`. Document/notepad/flavor kinds render inside a shared `<DocWindow>`/generic renderer resolved by `componentByKind` (§0.4).

**Content pipeline:** markdown apps parse with `gray-matter` (frontmatter) + `marked` (body) + `DOMPurify` (sanitize). Adding a project = drop `<name>-en.md` + `<id>.svg` icon + `proj-<name>.json`; it auto-appears via the Projects folder's explicit `children` (Projects is curated) — games auto-list via `auto:games` (§0.4).

### 7.1 Résumé — `resume` (`kind:'pdf'`)
- Desktop icon order 1 "My Resume". Renders a **PDF viewer**: `<iframe src="/os/media/dominik-machowiak-cv.pdf#toolbar=0">` on desktop; on mobile, the native PDF viewer fullscreen. **Also renders an HTML tab** (from the same content) as the mobile/no-PDF fallback and the SEO source. Title-bar **Download** button wired to `manifest.download`.
- **Single canonical PDF path:** `/os/media/dominik-machowiak-cv.pdf` (resolves B12). Built by `scripts/build-resume-pdf.mjs` (Puppeteer, dev dependency) rendering the HTML fallback → committed PDF. npm script: `"build:resume": "node scripts/build-resume-pdf.mjs"`, run before `vite build`. Runtime ships NO PDF lib.
- Manifest:
```json
{ "id":"resume","title":"Dominik Machowiak - CV","kind":"pdf","icon":"/os/icons/resume.svg",
  "category":"apps","desktop":{"show":true,"order":1},"startMenu":{"show":true,"group":"Documents"},
  "window":{"width":680,"height":760,"minWidth":420,"singleton":true},
  "src":"/os/media/dominik-machowiak-cv.pdf",
  "download":{"href":"/os/media/dominik-machowiak-cv.pdf","filename":"Dominik-Machowiak-CV.pdf"},
  "seo":{"heading":"Dominik Machowiak — Résumé","body":"Salesforce Marketing Cloud Developer at Deloitte…"} }
```
- **Content (real, do not invent):**
  - Header: Dominik Machowiak · Salesforce Marketing Cloud Developer @ Deloitte · dominikmachowiak101@gmail.com · linkedin.com/in/dominikmachowiak · dominikmachowiak.com
  - Experience: **Salesforce Marketing Cloud Developer — Deloitte (2024–Present):** led a marketing-automation project for a Polish automotive client; technical consultation; built **~300 email & SMS messages in Email Studio** using HTML/CSS/JS/**AMPScript** across a multi-brand marketing transformation. · **Web Developer — Welcom-Inn (2023–2024):** designed & built a live property-management site (HTML/CSS/JS). · **Front-end Web Developer — Rubicall (2022–2023):** built the cleaning-company site; returned to expand it for their Airbnb business. · **Intern Front-end Web Developer — Norbert Electronics (2021):** volunteer role improving web pages' feel & functionality.
  - Education: **BSc Computing & IT Software — The Open University (2018–2021).**
  - Skills: HTML, CSS, JavaScript, React, TypeScript, Sass, Redux, Node, GraphQL, Git, Figma.
  - Certifications: Salesforce Marketing Cloud Email Specialist; Salesforce Trailhead Mountaineer.

### 7.2 About Me — `about` (`kind:'document'`)
Desktop icon order 2. Bio header + four persona tabs (XP.css tablist inside `.win-body`), verbatim copy:
- Header: *"Hi, I'm Dominik — a software developer who specializes in front-end development, now working as a Salesforce Marketing Cloud Developer at Deloitte."*
- **Frontend Developer:** "I'm a passionate frontend developer who loves designing and building great-looking web applications that are satisfying & engaging to use… HTML5, CSS3, JavaScript and various APIs."
- **Aspiring React Developer:** "…I've spent time learning React on top of my frontend experience, and I'm happy to pick up other frameworks too."
- **Avid Learner:** "What I enjoy most is acquiring knowledge and finding ways to improve my work and myself… keeps me adaptable and agile."
- **Open-minded Programmer:** "…experience across various programming languages and technologies. I'm always looking for new challenges…"
Content `/os/content/about-en.md`, `##`-split into tabs. **Include the legal disclaimer at the bottom of the About body.**

### 7.3 Projects folder — `my-projects` (`kind:'folder'`) + 3 children
Desktop icon order 3. Explicit `children` (curated): `["proj-welcom-inn","proj-rubicall","proj-mern"]`.
- **proj-welcom-inn** → "Welcom-Inn Website — a modern, responsive site for a property-management company." Live: welcom-inn.co.uk. Icon `ie-doc.svg`.
- **proj-rubicall** → "Rubicall Website — a modern, responsive site for a cleaning company." Live: rubicall.co.uk. Icon `ie-doc.svg`.
- **proj-mern** → "MERN Project — a full-stack app on the MERN stack. In progress — watch this space!" No live link (badge "In progress"). Icon `code.svg`.
Each project window: screenshot thumbnail + prose + a prominent XP "Open live site ↗" button (`window.open(live,'_blank')`) shown only when `live` present. Manifest + md example:
```json
// /os/registry/proj-welcom-inn.json
{ "id":"proj-welcom-inn","title":"Welcom-Inn — Properties","kind":"document","icon":"/os/icons/ie-doc.svg",
  "category":"apps","startMenu":{"show":false},"window":{"width":620,"height":520,"minWidth":360,"minHeight":300},
  "content":"/os/content/projects/welcom-inn-en.md" }
```
```markdown
---
title: Welcom-Inn Website
role: Web Developer (2023–2024)
tech: [HTML, CSS, JavaScript]
live: https://welcom-inn.co.uk/
screenshot: /os/media/welcom-inn.webp
---
At **Welcom-Inn** I designed and built the website for a property-management
company. It's live and advertising their properties and services.

[Visit the live site ↗](https://welcom-inn.co.uk/)
```

### 7.4 Experience / timeline — `experience` (`kind:'timeline'`)
Desktop icon order 5. Vertical timeline (years rail + cards), XP group-boxes, reduced-motion respected. Data `/os/content/experience.json`:
```json
[
 {"year":"2018–2021","org":"The Open University","role":"BSc Computing & IT Software","kind":"education","body":"Where it began — a solid, theory-grounded foundation."},
 {"year":"2021","org":"Norbert Electronics","role":"Intern Front-end Web Developer","body":"Volunteer internship improving web pages' feel and functionality."},
 {"year":"2022–2023","org":"Rubicall","role":"Front-end Web Developer","live":"https://www.rubicall.co.uk/","body":"Designed & built the cleaning-company site; brought back to expand it for their Airbnb business."},
 {"year":"2023–2024","org":"Welcom-Inn","role":"Web Developer","live":"https://welcom-inn.co.uk/","body":"Designed & built a live property-management website (HTML/CSS/JS)."},
 {"year":"2024–Present","org":"Deloitte","role":"Salesforce Marketing Cloud Developer","star":true,"body":"Led a marketing-automation project for a Polish automotive client; built ~300 email & SMS messages in Email Studio using HTML/CSS/JS and AMPScript across a multi-brand transformation."}
]
```

### 7.5 Skills & Certifications — `skills` (`kind:'document'`)
Start menu → Programs. Verbatim: "My core toolkit is HTML, CSS, JavaScript and React, and I keep reaching for more — TypeScript, Sass, Redux, Node, GraphQL, Git and Figma. On the Salesforce side I'm a certified Marketing Cloud Email Specialist and a Trailhead Mountaineer." Render skills as chip grid; certs as two badge list items.

### 7.6 Testimonials — `testimonials` (`kind:'document'`)
Three attributed cards (from real content): **Norbert (Norbert Electronics)** — "remarkable transformation," professionalism, attention to detail, seamless experience that boosted their online presence. **Barbara (Rubicall)** — thrilled with the cleaning-business site; patient, easy to work with; works great on phones and computers; happily recommends. **Agnieszka (Welcom-Inn)** — appreciated the functional website and patient guidance; showcases rental properties and improved their online presence. XP sticky-note/speech-bubble cards.

### 7.7 Contact — `contact` (`kind:'contact'`, Outlook-Express style)
Left rail decorative folders + compose form: **To:** `dominikmachowiak101@gmail.com` (read-only), **From:**, **Subject:**, **Message:**, **Send**. Toolbar buttons for LinkedIn + Classic site. Intro (verbatim): "I'm always happy to chat about new opportunities."
**Delivery (resolves B13):** Web3Forms `fetch` POST. Data `/os/content/contact.json`:
```json
{ "email":"dominikmachowiak101@gmail.com","linkedin":"https://www.linkedin.com/in/dominikmachowiak/",
  "classic":"https://dominikmachowiak.com","endpoint":"https://api.web3forms.com/submit","access_key":"<DOMINIK_FILLS_THIS>" }
```
- **The Web3Forms `access_key` is PUBLIC-BY-DESIGN and safe to commit in a static bundle** — explicitly state this in a code comment. (This is a DIFFERENT, safe kind of key from the previously-exposed Sanity *write* token noted in memory; that mistake — a write-capable secret in a public bundle — must NOT be repeated. A Web3Forms submit key only lets anyone submit that form, which is the intended behavior.)
- **`mailto:` fallback fires when `access_key` is blank OR the fetch fails**, so Send never dead-ends: `mailto:dominikmachowiak101@gmail.com?subject=…&body=…`. On success show an XP "Message sent" dialog.

### 7.8 Games folder — `games` (`kind:'folder'`, `children:"auto:games"`)
Desktop icon order 4. Auto-lists `byCategory('games')`. First (and only v1) child = `game1`. Opening it launches the iframe window (§8). game1 manifest:
```json
{ "id":"game1","title":"Dev District","kind":"iframe","icon":"/os/icons/game1.svg","category":"games",
  "desktop":{"show":false},"startMenu":{"show":true,"group":"Games"},
  "window":{"width":900,"height":620,"minWidth":480,"minHeight":360,"aspectRatio":1.4545,"singleton":true,"maximizedOnMobile":true},
  "src":"/game1/index.html?embedded=1" }
```
(Note `aspectRatio` ≈ 900/620; adjust to game1's real canvas ratio during the prototype.)

### 7.9 Flavor apps
- **My Computer — `mycomputer`:** desktop icon top-left area. Fake drives: (C:) → opens My Projects; (D:) → opens Games; "About this PC" listing the REAL stack (React 18 + Vite + TS + XP.css).
- **Recycle Bin — `recyclebin`:** contains one item "old-portfolio.html" whose notepad says "Nah — the old site's still live at dominikmachowiak.com." Right-click → Restore opens the Explorer app. Easter egg.
- **Notepad — `notepad`:** opens `/os/content/readme.txt`: "Welcome to Dominik's desktop. Double-click My Resume for the CV, open My Projects to see live sites, or launch Games to play Dev District. Contact me any time: dominikmachowiak101@gmail.com." Editable in-window (non-persisted).
- **Image Viewer — `imageview`:** generic; `src` → any `/os/media/*.webp`. Prev/Next if launched from a folder of images.
- **Explorer ("DM Explorer") — `explorer` (`kind:'iframe'`, `external:true`):** XP-blue browser chrome (address bar + Go) wrapping `<iframe src="https://dominikmachowiak.com">` (the classic Sanity/CRA site). Title **"dominikmachowiak.com — Internet Explorer"** (NO "Microsoft").
```json
{ "id":"explorer","title":"dominikmachowiak.com - Internet Explorer","kind":"iframe","external":true,
  "icon":"/os/icons/explorer.svg","category":"apps","desktop":{"show":true,"order":6},
  "startMenu":{"show":true,"group":"Programs"},"window":{"width":900,"height":640,"minWidth":420},
  "src":"https://dominikmachowiak.com" }
```
- **Cross-origin framing (resolves critique 14 + B):** `dominikmachowiak.com` may send `X-Frame-Options`/`frame-ancestors`. **Block-detection must NOT rely on a `load`-timeout** (a blocked frame often fires `load` on the browser error page). Instead: after mount, attempt `iframe.contentWindow.location.href` inside a `try/catch`; a `SecurityError` on an about-to-be-cross-origin frame is inconclusive, so ALSO use a **postMessage handshake**: if the framed site doesn't `postMessage` a known ack within 2.5s AND the frame is `external`, assume blocked → render an IE-style "This page cannot be displayed" panel with a big **"Open dominikmachowiak.com in a new tab ↗"** button. **CSP reconciliation:** the `/os/` CSP MUST allow this external frame — set `frame-src 'self' https://dominikmachowiak.com` (NOT `frame-src 'self'`, which would block the very feature). §12.4 configs use this value.
- **Sandbox policy per iframe (resolves critique 29):** `game1` (trusted, same-origin) → `sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-fullscreen"`; the external Explorer frame → hardened `sandbox="allow-scripts allow-popups allow-forms"` (NO `allow-same-origin` for the untrusted external site) — and accept that if the site sets XFO it won't render (fallback panel handles it).

### 7.10 Desktop & Start-menu wiring
Desktop grid (auto-flow by `order`, resolves critique 15 — **`order` wins; there is NO absolute `{x,y}`**; the two "system" icons My Computer and Recycle Bin get reserved low/high `order` values so they sort to the top-left / end respectively): 1 Résumé · 2 About · 3 Projects · 4 Games · 5 Experience · 6 Explorer, plus My Computer (`order:0`) and Recycle Bin (`order:98`). Start menu (two-column XP): left = Explorer, Notepad, Contact; right = My Documents (Résumé, Skills), My Projects, Games, Experience. Footer: Log Off (→ login) / Turn Off Computer (→ shutdown FSM). Taskbar = one button per open window.

### 7.11 `AppKind` → renderer map (resolves critique 16)
| kind | renderer | source |
|---|---|---|
| `document` | `DocWindow` (md→HTML) | `content` |
| `folder` | `FolderApp` (child grid; `auto:games` expands) | `children` |
| `iframe` | `IframeHost` (no component) | `src` |
| `react` | `componentById[id]` | code-split |
| `timeline` | `ExperienceApp` | `data` |
| `contact` | `ContactApp` | `data` |
| `notepad` | `NotepadApp` | `content` |
| `imageview` | `ImageViewApp` | `src` |
| `pdf` | `PdfApp` (+HTML fallback tab) | `src`,`download` |
| `mycomputer` | `MyComputerApp` | `data` |
| `recyclebin` | `RecycleBinApp` | — |

---

## 8. Games integration & extensibility

### 8.1 game1 embed + the mandatory edits (resolves critique 8, 9, D22–D24, B2)
**game1 IS edited** (the "untouched" claim is void). Three minimal edits to `/game1/`:
1. **Vendor KAPLAY locally.** Replace the `unpkg.com` ES-module import in `main.js` with a self-hosted `/game1/vendor/kaplay.min.js` (so PWA precache + boot-preload work, resolves A5/B7). Download `kaplay@3001.x` once, commit it.
2. **Add `os-bridge.js`** (a documented drop-in, one per iframe game) included in `index.html` **before** `main.js` so KAPLAY captures the right references. It implements the `os-bridge-v1` protocol (4 messages) using KAPLAY's **real** API — NOT rAF monkey-patching:
```js
// /game1/os-bridge.js  — include BEFORE main.js; main.js calls window.__osBridge hooks.
(function(){
  const CH='os-bridge-v1';
  const send=(t,d={})=>parent.postMessage({ch:CH,type:t,...d},'*');
  window.__osBridge={
    onReady:(api)=>{ // api = { pause(), resume(), setMute(b) } provided by main.js using KAPLAY
      addEventListener('message',(e)=>{ const m=e.data; if(!m||m.ch!==CH)return;
        if(m.type==='pause'){api.pause();send('paused');}
        else if(m.type==='resume'){api.resume();send('resumed');}
        else if(m.type==='mute'){api.setMute(m.value);}
      });
      send('ready',{title:'Dev District'});
    }
  };
})();
```
   In `main.js`, after creating the KAPLAY context `k`, expose real pause/mute (KAPLAY has `game.paused` and an audio context to mute) and call the bridge:
```js
// main.js additions (~6 lines) — uses KAPLAY's documented pause, not a monkey-patch
window.__osBridge?.onReady({
  pause:  () => { k.getTreeRoot ? (k.getTreeRoot().paused = true) : (k.debug.paused = true); k.audioCtx && (k.audioCtx.suspend?.()); },
  resume: () => { k.getTreeRoot ? (k.getTreeRoot().paused = false): (k.debug.paused = false); k.audioCtx && (k.audioCtx.resume?.()); },
  setMute:(b) => { k.setVolume?.(b?0:1); },
});
```
   *(Fable: confirm the exact KAPLAY 3001 pause handle during the prototype — `debug.paused` or root-object `.paused`; the point is to use the engine's own flag, not to wrap `requestAnimationFrame`.)*
3. **Handle `?embedded=1`** in `main.js`: `const embedded = new URLSearchParams(location.search).get('embedded')==='1';` → **hide/repoint the `← Classic site` back-link** (verified: it is `href="../"`, which from `/game1/` resolves to root `/`, breaking out of the OS). When embedded, hide it (the OS chrome provides close/back) AND disable game1's own internal fullscreen so it doesn't fight the OS ⛶ button.

### 8.2 The iframe host + four boundary problems
`IframeHost` renders `<iframe src="/game1/index.html?embedded=1" allow="fullscreen; autoplay; gamepad" loading="lazy" sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-fullscreen" tabIndex={0}>`.
- **Focus:** transparent `.game-host__shield` overlay covers the iframe while the window is unfocused; first pointerdown focuses the window + `iframe.focus()`, then the shield unmounts. `Esc` inside game → bridge posts a blur-request → host refocuses OS.
- **Input during drag:** set `iframe.style.pointerEvents='none'` on `dragStart`, restore on `dragEnd`.
- **Pause-on-blur:** `shouldRun = focused ∧ tabVisible ∧ !minimized` (via `usePageVisible` + store selectors) → post `pause`/`resume`. Exactly one game consumes CPU, only while focused/visible/foreground.
- **Fullscreen:** the OS ⛶ button fullscreens the `.win` node (§4.3, feature-2); game1's internal fullscreen is disabled when embedded.

### 8.3 iOS-specific game hardening (resolves C4/B4)
- **iPhone has no element Fullscreen API** → game-fullscreen is pseudo-fullscreen only (`position:fixed; inset:0; z-index:99999`). Do NOT promise true fullscreen on iPhone.
- **iOS WebAudio unlock:** a parent `postMessage('resume')` is NOT a user gesture inside the iframe. The game must unlock audio on a first in-iframe tap (game1 already handles interaction). The bridge `resume` only un-suspends if the context was already user-unlocked; document that background→foreground may return a silent-but-running game until the next in-iframe tap.
- **WebGL context loss:** mobile browsers kill background GL contexts. The "hide iframe, keep state" strategy can yield a black canvas on return. Add a `webglcontextlost`/`restored` handler in `main.js` that re-inits the scene, OR accept a reload on return (document which). For v1, **accept reload-on-return** and add a "tap to resume" splash when context is lost.

### 8.4 In-app React/canvas games (future)
`kind:'react'` + `componentById[id]` (code-split). `useGameLoop(tick, active)` gives the same pause contract natively (no rAF scheduled when `!active`; full teardown on unmount). Same `active = focused ∧ visible ∧ !minimized` booleans → one mental model across iframe/react/canvas.

### 8.5 `aspectRatio` behavior in max/fullscreen/mobile (resolves critique 20)
Games with `aspectRatio` **letterbox** (never stretch): the game canvas is centered with `object-fit`-style bars when the window/screen ratio differs. This applies uniformly in normal, maximized, snapped, game-fullscreen, and mobile-fullscreen states. Bars use `--surface-3d-darker`.

### 8.6 The true "add a game later" checklist (resolves critique 22–24)
Honest, complete steps:
- **Static/buildless iframe game (like game1):** (1) build/author it to `/gameN/`; (2) **copy `os-bridge.js` into `/gameN/`** and add the ~6-line `__osBridge.onReady` hook using that engine's pause API; (3) vendor its engine locally if you want offline; (4) add `/os/icons/gameN.svg`; (5) add `/os/registry/game-<name>.json` (`kind:'iframe'`, `category:'games'`, `src:'/gameN/index.html?embedded=1'`). Games folder auto-lists it — **no `children` edit**.
- **Build-based game (e.g. the scaffolded `game2` — a Vite app at `.../game2` on :4179):** it needs its own **`base:'/game2/'` Vite build whose `dist` deploys to `/game2/`** (the "copy one JSON line" story is incomplete for build games — document this). Then steps 2–5 above. Its `os-bridge.js` ships in its own `public/`.
- **In-app React/canvas game:** add `componentById[id]=lazy(()=>import(...))`, `/os/icons/id.svg`, and a `kind:'react'` manifest. No bridge needed (uses `useGameLoop`).

Reconciliation: Games folder AUTO-LISTS by category (no manual `children`); only Projects uses curated `children`.

---

## 9. Performance plan

### 9.1 Budget (resolves B1/B8 — targets now, CI ceilings set POST-prototype)
These are **initial targets**. Build the vertical slice (P1, §13), **measure on a real mid-range Android over throttled 4G**, then set `size-limit`/Lighthouse-CI ceilings ~15% above measured. **Do NOT gate CI on invented numbers before the prototype exists.**

| Metric | Target (validate, then set ceiling) |
|---|---|
| BootChooser JS (gz) | ≤ 30 KB (plain React + CSS, no XP.css) |
| OS shell initial JS (gz) | ≤ 120 KB target |
| OS shell CSS (XP.css + shell, gz) | ≤ 40 KB |
| Time-to-desktop (mid Android, 4G) | ≤ 2.5 s target |
| Window-drag frame rate | 60 fps desktop / ≥ 50 fps mobile |
| Per-app chunk (résumé/about, gz) | ≤ 60 KB |
| Memory, 8 windows **(at most one live game)** | < 220 MB heap (state that one KAPLAY iframe holds a full WebGL/texture/audio context; `singleton` games enforce ≤1 live) |

### 9.2 Techniques
- **Code-splitting:** every non-iframe app is `React.lazy` → its own chunk. `manualChunks` splits `react`/`react-dom` into a long-cached `vendor` chunk. iframe games load out-of-process for free.
- **Prefetch on intent:** `onPointerEnter`/`onTouchStart` of a desktop icon fires `import()` so the chunk is warm before open.
- **Boot preload window:** during BootScreen, warm the wallpaper SVG, icon set, DejaVu font, the résumé chunk, and game assets. **Note:** vendoring KAPLAY locally (§8.1) is what makes preloading the engine possible; a `/os/`-scoped SW cannot precache cross-origin unpkg.
- **GPU drag (§4.3):** imperative `translate3d`, `will-change:transform` only during drag (removed on drop), rAF-coalesced pointer moves, `pointer-events:none` on window body during drag, `contain:layout paint style` per window.
- **Virtualization:** minimized windows unmount content (keep taskbar button + serialized rect/scroll); iframe games instead HIDE (`content-visibility:hidden` + `pause`) to preserve state; occluded windows get `content-visibility:hidden`; `content-visibility:auto` baseline on window bodies.
- **Memory:** store holds only serializable state; `AbortController` per window scopes listeners (one `.abort()` on close); iframe `src='about:blank'` on close.

### 9.3 Window cap reconciliation (resolves critique 21)
- **Desktop:** hard cap 12 open windows; opening the 13th LRU-closes the least-recently-focused non-game window.
- **Phone/tablet:** single-window model keeps all apps mounted+hidden for state preservation → **cap does NOT evict** (bounded instead by memory + the fact users open few apps on mobile). Document this divergence.

---

## 10. Mobile spec

### 10.1 Honest framing (resolves C1/critique — settle the "works on mobile" claim)
**On phones and tablets there is NO windowed desktop OS.** Below `1024px` (or without `pointer:fine`), DominikOS is a **themed single-window app launcher wearing XP chrome** — which is the correct design (tiny draggable windows on a phone are miserable). The desktop window manager (drag/resize/z-index/snap) is **desktop-only** and is intentionally dead code on mobile. Documentation and marketing must say this plainly; the nostalgia payload (windows, taskbar chrome) is largely a desktop experience.

### 10.2 Device model + breakpoints (resolves critique 18, 19, C2 — ONE definition)
`src/os/env.ts`: `BP = { phone: 640, tablet: 1024 }`. `DeviceMode`: `phone <640`, `tablet 640–1023`, `desktop ≥1024`. **Free-float windowing requires `≥1024px` AND `pointer:fine`.** **Both phone AND tablet get single-window/auto-maximize** — kill the 640–1024px draggable-window middle ground entirely. Touch is a capability (`matchMedia('(pointer:coarse)')`), not a width. Set `document.documentElement.dataset.device` and `.dataset.input` so CSS keys off attributes.

| Mode | Windows | Chrome | Open trigger |
|---|---|---|---|
| phone `<640` | single-window, auto-maximized, no drag/resize | bottom **MobileDock** + full-screen **MobileStartLauncher**; touch icon grid | single-tap |
| tablet `640–1023` | **same as phone** (single-window/maximized) | same as phone, larger hit areas | single-tap |
| desktop `≥1024` + `pointer:fine` | full free-float WM (drag/resize/z/snap) | XP taskbar + Start + tray | double-click (single-click selects) |

**Touch targets** (`touch.css`, under `[data-input="touch"]`): `--hit:44px` floor on `.win__controls button`, `.dock-item`, `.taskbar-btn`, `.desk-icon`. Scale `.win__controls button` to 40×40 on touch. (WCAG 2.5.8 AA minimum is 24×24; we exceed it.)

### 10.3 Boot chooser (the device/experience gate — the best idea; protect it)
Plain semantic HTML (`<main><h1>`, real `<button>`/`<label><input>`), no XP skin, `<30KB`, eager. It (a) captures the fullscreen gesture, (b) reads `prefers-reduced-motion`, (c) is the code-split boundary (OS shell is `React.lazy` below it), (d) carries the legal disclaimer. Three paths mirror the reference: **Enter the Desktop** (→ fullscreen + OSShell @ boot) · **Just the Résumé** (→ `window.location='/'`) · **Play a Game** (→ fullscreen + OSShell @ desktop, seeded to open game1, login skipped). Toggles: Reduce motion (pre-checked from media query), Sound off. Deep links: `/os/?boot=desktop`, `/os/?boot=game`, `/os/?boot=resume`. Persist choice in `dmos.v1.lastBoot` + "skip intro next time".

### 10.4 Mobile UI + the back-stack state machine (resolves C3)
- **MobileDock** (56px, Luna gradient, `padding-bottom:max(8px,env(safe-area-inset-bottom))`): ⊞ Start + running-app chips (tap a chip switches the visible maximized window).
- **MobileStartLauncher:** full-screen scrollable app list (44px+ rows) + Shut Down + "Exit to classic site".
- **Explicit history state machine** (`src/os/mobile/backStack.ts`) — NOT `pushState`-per-window (which traps recruiters behind N back-presses). Model: **`chooser → desktop → window`** with a SINGLE window-level history entry that is replaced (not pushed) as the visible app changes. Behavior:
  - Entering the desktop pushes ONE `{os:'desktop'}` state.
  - Opening/switching apps uses `history.replaceState({os:'window', id})` (no stacking).
  - Browser Back from a window → close it, return to desktop (one press).
  - Browser Back from bare desktop → leave the OS (back to referrer) — but keep a visible "⊞ Start" so re-entry is obvious; do not rely on Back to navigate between apps.
  - Guard iOS Safari's edge-swipe: `touch-action` on horizontal-drag surfaces (game controls, wide content) must not conflict; scope `touch-action:none` to drag handles/canvas only.
- **`100dvh`** everywhere (not `100vh`). `<meta viewport … viewport-fit=cover, user-scalable=no>`, `apple-mobile-web-app-capable`, `theme-color:#245edb`.

### 10.5 game1 on mobile
`maximizedOnMobile:true` → opens chromeless/full-viewport (it has its own HUD + tap controls). OS Back closes it. Fullscreen on iPhone is pseudo-fullscreen (§8.3). Do not oversell "immersive fullscreen game" on iPhone.

### 10.6 Mobile bundle honesty (resolves C5)
Tree-split so phones tapping "Enter the Desktop" do NOT download desktop-only WM code (drag/resize/snap). `OSShell` dynamically imports `<Desktop>` (desktop WM) vs `<MobileShell>` (dock+launcher+maximized-window renderer) based on `getDeviceMode()`. Either achieve this split or stop claiming a lean mobile bundle — pick the split.

---

## 11. Accessibility & SEO

Two-track: make the interactive OS as keyboard/SR-friendly as feasible AND ship a **conforming alternate version** (classic site + static semantic résumé) so WCAG 2.1 AA is guaranteed where the canvas/desktop UI can't be.

### 11.1 Structure & roles
Landmarks: skip-link → `<main id="os-main" aria-label="Windows XP desktop">` (icon grid `role="group"`, windows `role="dialog" aria-modal="false" aria-labelledby`), `<nav aria-label="Taskbar and Start menu">`, and an `aria-live="polite"` announcer (`#os-announce`). Reuse game1's correct `.sr-only` utility verbatim.

### 11.2 Full keyboard nav
| Key | Action |
|---|---|
| Tab / Shift+Tab | move through regions & within focused window |
| Arrows | move selection in icon grid (roving tabindex — one icon `tabindex=0`) |
| Enter | open selected / activate |
| Esc | close focused window |
| Alt+Tab | cycle window focus (mini switcher overlay) via `useOSStore.getState().zOrder()` |
| Win / Ctrl+Esc | open Start menu (focus first item) |
| F6 | cycle desktop ↔ taskbar ↔ focused window |
| Alt+F4 | close focused window |

All keyboard handlers call the **store facade** (`useOSStore.getState().focus/close/...`), NOT an imperative `windowManager` (which does not exist). Focus rules: open→focus window; close→return focus to `launchTrigger`; minimize→focus taskbar button; never lose focus into the void.

### 11.3 Color, contrast, focus, reduced motion
- High-contrast `:focus-visible { outline:3px solid var(--focus-ring); outline-offset:2px; }` visible over Luna blue, white bodies, and the wallpaper (AA 2.4.7, 1.4.11).
- Content text ≥ 4.5:1 (AA 1.4.3); chrome title text (white-on-Luna ~8:1) passes; verify Start-menu grays. Content apps use ≥14px `rem`, zoomable to 200% (1.4.4) — do NOT use 11px chrome font for body copy.
- Global reduced-motion killswitch (`* { animation/transition-duration:.001ms }`) + JS gate (§5.7). Sound OFF by default, opt-in only.

### 11.4 SEO / no-JS crawlable résumé (protect this — it's the real product for most visitors)
In `/os/index.html`, before React mounts and persisting for crawlers/no-JS/SR:
- `<noscript>` static résumé.
- `#seo-resume` visually-hidden semantic résumé built from Dominik's REAL content (name/title/experience/education/certs/contact + links to welcom-inn.co.uk, rubicall.co.uk, LinkedIn, classic site).
- `<link rel="canonical" href="https://dominikmachowiak.com/">` (consolidate SEO on the classic site; avoid duplicate content).
- JSON-LD `Person` (`name`, `jobTitle:"Salesforce Marketing Cloud Developer"`, `worksFor:"Deloitte"`, `alumniOf:"The Open University"`, `sameAs:[LinkedIn, classic site]`).

### 11.5 Escape hatch
Persistent "Exit to accessible site" → `/` in Start menu + BootChooser + a fixed skip-link (WCAG requires the accessible alternative be reachable from the inaccessible version).

---

## 12. Integration & deployment

### 12.1 How the existing portfolio launches the OS
The classic CRA+Sanity build at `/` is an **uneditable compiled artifact**; its launch button is a raw `<a href="/game1/">` **injected in `index.html` outside `#root`** (verified — NOT a Sanity field). **Repoint/duplicate that anchor** to the OS deep links (one-line href change in the injected anchor, same mechanism as today):
- "View portfolio" / new "Enter my Desktop" → `/os/?boot=desktop`
- "Play my game" → `/os/?boot=game`
- Keep a "Résumé (classic)" link → `/` so the accessible version is always one click away.
Do NOT iframe the classic React site as the primary experience; the Explorer flavor app iframes it as a nostalgia feature only (§7.9). Do NOT make `/os/` the root on day one; optionally add a host redirect `/ → /os/` LATER, only after a11y/SEO fallbacks are verified, keeping the classic site reachable at `/classic/`.

### 12.2 Boot chooser (Full Desktop / Résumé / Game) + classic fallback
Per §10.3. "Just the Résumé" → classic site `/`. Classic-site fallback is always reachable (chooser, Start menu, skip-link).

### 12.3 Hosting
Static SPA on the existing host, OS as a peer route; no server/SSR. `dev-server.js` stays for local dev. Build with `base:'/os/'`; output `os/dist/*` → `dominikmachowiak.com/os/`. `/game1/` (edited) and `/` (unchanged) sit alongside.

### 12.4 Host rewrites + headers (SPA scoped to `/os/`; CSP allows the Explorer frame)
**Netlify** (`os/public/_redirects` + `netlify.toml`):
```
/os/*   /os/index.html   200
```
```toml
[[headers]]
  for = "/os/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
[[headers]]
  for = "/os/index.html"
  [headers.values]
    Cache-Control = "no-cache"
    Content-Security-Policy = "frame-src 'self' https://dominikmachowiak.com; frame-ancestors 'self'"
```
**Vercel** (`vercel.json`): `rewrites: [{ "source":"/os/(.*)","destination":"/os/index.html" }]`, immutable cache on `/os/assets/(.*)`, same CSP header on `/os/index.html`.
**Apache** (`/os/.htaccess`): `RewriteBase /os/` + not-`-f`/not-`-d` → `/os/index.html [L]`; set the same CSP via `Header set`.

### 12.5 Dev workflow (resolves critique 25 — `dev-server.js` has NO proxy)
Add to `vite.config.ts`:
```ts
server: { proxy: { '/game1': 'http://localhost:4178', '/game2': 'http://localhost:4178' } }
```
Run `dev-server.js` (:4178, static) for `/game1` + `/game2`, and Vite (:5173) for `/os/`. Alternatively `vite build` and serve everything via `dev-server.js`. Use the proxy path for iteration.

### 12.6 PWA (optional) + CI/CD
`vite-plugin-pwa` Workbox precache scoped to `/os/` (never caches `/` or `/game1/`); `manifest.webmanifest` (`display:standalone`, `start_url:/os/?boot=desktop`, Luna theme color, original icon). Offline works only because KAPLAY is vendored (§8.1). CI: build `/os/` → run legal grep-gate (§6) → `@axe-core/playwright` + `vitest` + Lighthouse-CI (a11y ≥95, perf ≥90 after prototype-calibrated budgets) → deploy on green. **Never** rebuild/redeploy the classic CRA build in this pipeline.

---

## 13. Implementation roadmap

Ordered phases, dependency-correct. **MVP = P0–P5.** DoD = verifiable.

### P0 — Contracts & scaffold (MVP)
- Tasks: Vite+React+TS strict, `base:'/os/'`; install `xp.css zustand xstate @xstate/react gray-matter marked dompurify tailwindcss`; create `types.ts` (§0.2), `osStore.ts` (§0.3), `registry.ts` (§0.4), `tokens.css` (§5.3), `sessionMachine.ts` (§0.5), `env.ts`; add the legal grep-gate script.
- Files: all §0 canonical files, `styles/*`, `vite.config.ts` (proxy + manualChunks).
- **DoD:** `npm run build` succeeds; grep-gate passes; store unit-tested (open/focus/close/z-order); typecheck clean.

### P1 — Window manager vertical slice + game1 (MVP, MEASURE HERE)
- Tasks: `Window`/`WindowLayer`/`TitleBar`/`ResizeHandles`/`AppHost`/`IframeHost`; `useWindowDrag` (§4.3 imperative); focus/z-index/min/max/close/snap; vendor KAPLAY into `/game1/`, add `os-bridge.js` + `?embedded=1` + pause hook (§8.1); open game1 in a window.
- Files: `src/os/window/*`, `hooks/useWindowDrag.ts`, `/game1/{os-bridge.js, main.js edits, vendor/kaplay.min.js}`.
- **DoD:** game1 opens in a draggable/resizable window; drag holds 60fps on desktop (DevTools perf); pause fires on blur/minimize (verify CPU drops); **measure time-to-first-window + bundle on a real mid-range Android and record numbers** → set `.size-limit.json` + Lighthouse-CI ceilings ~15% above measured.

### P2 — Desktop + taskbar + Start (MVP)
- Tasks: `Wallpaper` (hills.svg + solid fallback), `IconGrid` (roving tabindex desktop) + `DesktopIconView` + `ContextMenu`; `Taskbar`/`StartButton`/`StartMenu`/`QuickLaunch`/`TaskButtons`/`SystemTray`/`Clock`.
- **DoD:** double-click opens apps; taskbar reflects open windows; Start menu lists registry apps; clock live; keyboard nav works (arrows/Enter/Alt+Tab/Win).

### P3 — Session flow + fullscreen (MVP)
- Tasks: `BootChooser` (§10.3, eager, disclaimer, deep links) → `React.lazy(OSShell)`; `BootScreen`/`LoginScreen`/`ShutdownScreen` wired to `sessionMachine`; `useFullscreen` (documentElement + iOS `100dvh` fallback).
- **DoD:** chooser → fullscreen → boot → login → desktop → shutdown → restart→login; `?boot=game` opens game1 skipping login; reduced-motion skips animations (≤300ms).

### P4 — Real-content apps (MVP)
- Tasks: `DocWindow`+`FolderApp`+`ExperienceApp`+`ContactApp`+`NotepadApp`+`ImageViewApp`+`PdfApp`+`MyComputerApp`+`RecycleBinApp`+`ResumeApp`/`AboutApp`/`ProjectsApp`; all `/os/registry/*.json` + `/os/content/*`; `scripts/build-resume-pdf.mjs`; Web3Forms + mailto fallback (§7.7).
- **DoD:** every app renders Dominik's real content; Résumé PDF builds + downloads; Explorer external-frame fallback panel works when blocked; content-accuracy checked against §7.

### P5 — Mobile + a11y + SEO (MVP)
- Tasks: `MobileShell`/`MobileDock`/`MobileStartLauncher`, single-window/maximized, touch grid, single-tap; `backStack.ts` history machine (§10.4); `touch.css`; tree-split mobile from desktop WM (§10.6); `#seo-resume`+`<noscript>`+JSON-LD+canonical; aria-live announcer; full keyboard map; `:focus-visible`; reduced-motion killswitch; large-text toggle.
- **DoD:** iPhone Safari + Android Chrome pass single-window/dock/launcher/Back-closes-window/safe-area/100dvh/no-h-scroll/200%-zoom; axe clean on chooser+desktop+each window; NVDA + VoiceOver read landmarks/dialogs/announcements/#seo-resume; no-JS shows static résumé.

### P6 — Deployment + PWA + CI (MVP tail)
- Tasks: host rewrites/headers/CSP (§12.4); repoint classic launch button (§12.1); optional `/os/`-scoped PWA; CI (grep-gate + axe + vitest + Lighthouse-CI with calibrated budgets).
- **DoD:** deployed at `/os/` alongside untouched `/` and edited `/game1/`; classic button launches OS; CI green.

### P7 — Later (NOT MVP)
- Vista/Aero theme (§5.9); marquee drag-select on desktop; taskbar grouping; genie minimize (stretch); i18n (`-pl`); game2 integration (§8.6); WebGL context-loss recovery beyond reload.

---

## 14. Testing & QA checklist

**Functional:** open/close/focus/min/max/restore/snap; z-order correctness; singleton games; window cap LRU (desktop) vs keep-mounted (mobile); Start menu + taskbar + tray/clock; context menus; boot→login→desktop→shutdown→restart; deep links (`?boot=desktop|game|resume`); Résumé download; Contact send (Web3Forms success + mailto fallback when key blank); Explorer external-frame fallback panel.
**Cross-browser:** Chrome, Firefox, Safari, Edge (desktop); confirm fullscreen + `:focus-visible` + `content-visibility`.
**Mobile/touch:** iOS Safari + Android Chrome — single-window/maximize, dock, full-screen launcher, single-tap open, long-press context menu, Back-closes-window (no trap), safe-area insets, `100dvh`, no horizontal scroll, 200% zoom, game1 chromeless + tap controls + pseudo-fullscreen on iPhone, audio-unlock behavior, WebGL return behavior.
**Performance:** 60fps desktop drag / ≥50fps mobile (DevTools perf); time-to-desktop on throttled mid-Android; bundle sizes vs calibrated `.size-limit.json`; pause-on-blur drops game CPU; memory with 8 windows/one live game.
**A11y (WCAG 2.1 AA):** keyboard-only full pass (unplug mouse; focus never lost); NVDA+Firefox, VoiceOver+Safari; `@axe-core/playwright` zero AA violations on chooser+desktop+each window; reduced-motion (Playwright `emulateMedia`) → no long animations; contrast (automated content + manual focus-ring-over-wallpaper); no-JS static résumé renders.
**Content-accuracy:** every app's copy matches §7 exactly (Deloitte SFMC ~300 messages/AMPScript, OU BSc, Rubicall/Welcom-Inn/Norbert, testimonials, skills, certs); no invented facts; live links correct.
**Legal:** grep-gate passes (no `bliss`/`luna`/`segoe`/`tahoma.`/`verdana.`/`shell32`/`.ani`/MS sound names/"Microsoft" in titles); `ASSET-CREDITS.md` complete; disclaimer present in About + BootChooser.

---

## 15. Risks & mitigations + open decisions

### Risks & mitigations
| Risk | Mitigation |
|---|---|
| Perf budgets are guesses | Measure at P1 on real mid-Android; set CI ceilings ~15% above measured; never gate on invented numbers |
| KAPLAY pause via monkey-patch is inert | Use engine's real `game.paused` + audio suspend (§8.1); confirm exact handle during P1 |
| Two fullscreen owners fight | OS-fullscreen = documentElement; game-fullscreen = `.win` node; disable game1's internal fullscreen when embedded |
| iPhone: no element fullscreen, WebGL context loss, audio-unlock | Pseudo-fullscreen fallback; accept reload-on-return with "tap to resume"; in-iframe gesture unlocks audio (§8.3) |
| Explorer external iframe blocked by XFO | postMessage-handshake block-detection (not load-timeout) + fallback panel; CSP `frame-src 'self' https://dominikmachowiak.com` |
| Mobile Back-button trap | Explicit `chooser→desktop→window` history machine with replaceState (§10.4), not pushState-per-window |
| Shipping MS assets by accident | Grep-gate CI; original SVG wallpaper mandatory; ban `bliss.*` filename; DejaVu is the only bundled font |
| Web3Forms key confusion vs prior Sanity token | Comment that the submit key is public-by-design; never commit write-capable secrets |
| Desktop WM is dead code on mobile | Accepted, documented (§10.1); tree-split so phones don't download it (§10.6) |
| classic site iframe heavy/duplicative | Only the Explorer flavor app iframes it, lazily; primary integration is repointed buttons |

### Decisions for Dominik — ALL LOCKED ✅

1. **Wallpaper** — ✅ **Original hill SVG.** Custom stylized vector, no photos, zero legal risk.
2. **Start button label** — ✅ **"start"** (XP parody style).
3. **Route structure** — ✅ **Keep `/` as the classic portfolio landing page.** Buttons on the classic site lead to `/os/`. Do NOT redirect `/` to `/os/`.
4. **Web3Forms** — ✅ **YES, use Web3Forms.** Dominik will supply the access key. Mailto as fallback only if key is blank.
5. **Résumé/CV** — ✅ **Dominik supplies his own PDF.** Do NOT auto-generate from HTML. Place the file at `/os/assets/cv.pdf`; the Résumé app opens/downloads it directly.
6. **game2** — ✅ **Deferred.** Only game1 ships in MVP. game2 is P7+ (if ever).
7. **Vista/Aero** — ✅ **Not now.** XP-only for the foreseeable future. Do not build or plan for Aero theme.
8. **PWA install** — ✅ **NO PWA.** No service worker, no install prompt, no manifest. Keep it a normal website.
