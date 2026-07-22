# Dominik Machowiak — 2D Game-Style Portfolio: Master Implementation Plan

## 1. Title, Overview, Goals & TL;DR

### Overview

This document is a complete, self-contained build plan for an autonomous coding agent to create a **2D, top-down, explorable "game" portfolio page** for **Dominik Machowiak**, built with **KAPLAY** (the maintained successor to Kaboom.js) + **Vite** + a **Tiled**-authored map, in the style of `JSLegendDev/2d-portfolio-kaboom` and `atilio-ts/rpg-2d-portfolio`. The player walks an avatar through "Dominik's Dev District" — a compact, single-map courtyard whose layout traces his real career timeline — and presses a key (or taps a button) at glowing hotspots to open an HTML/CSS dialogue overlay populated with his real CMS content (About personas, Experience, Projects, Skills, Testimonials, Contact). It is an **additional companion page** to his existing React + Sanity site at `https://dominikmachowiak.com`, not a replacement; the classic site remains the canonical SEO surface and is always one click away.

### Goals

1. **Recruiter-first.** Any fact about Dominik is reachable in roughly two interactions, on a phone, in under 90 seconds, with zero risk of getting lost.
2. **Tell his real story.** Walking west→east *is* 2018→2026 (Open University → Norbert → Rubicall → Welcom-Inn → Deloitte).
3. **Faithful to source.** Every word of copy comes from the verified facts in §2. No invented employers, dates, projects, or quotes.
4. **Shippable MVP, then polish.** One `map.png` + one `map.json`, single scene, single canonical naming scheme. Stretch features are cleanly droppable.
5. **Accessible & indexable.** Keyboard-playable, screen-reader-aware dialogues, and a hidden semantic HTML fallback so the page works (and is crawlable) without the game.

### TL;DR for the agent

- **Build location (canonical):** a NEW sibling project at `C:\Users\domin\OneDrive\Desktop\Websites\portfolio-game-2026\`. **Do NOT** build inside `portfolio-2026\static\...` — that is a compiled, deployed React artifact. You may **read** reusable PNGs from `C:\Users\domin\OneDrive\Desktop\Websites\portfolio-2026\static\media\` (verified to exist) and copy specific files out, but treat their licenses as unverified (§7).
- **Stack (locked):** `kaplay@^3001.0.19` + Vite `^5` + **esbuild** default minify + **npm** + Node ≥ 20.19. ESM (`type:module`). Use `kaplay()` not `kaboom()`; all engine calls are `k.*`. **No `terser` dependency.** (See §5.1 for the exact `package.json`.)
- **Canonical naming scheme (locked, used everywhere):** kebab-case keys, one per hotspot. The set of named Tiled `boundaries` objects MUST exactly equal the set of `dialogueData` keys. The full list is in §4. **17 hotspots.**
- **Interaction model (locked):** **proximity + explicit press** (E / Enter / on-screen Interact button), NOT auto-fire-on-collision. Named trigger zones are **non-solid sensors**; walls are separate unnamed solid rectangles.
- **Camera API (locked):** use `setCamPos()` / `setCamScale()` (NOT the deprecated `camPos()` / `camScale()`).
- **World concept (locked):** outdoor "Dev District" timeline path (NOT a single indoor office room). Asset direction follows this: outdoor tileset + a few landmark sprites.
- **Content (locked):** the single source of truth for copy is §6. The hidden SEO/a11y HTML and the in-game dialogues are both generated from §6 — do not author two divergent copies.
- **Testimonials caveat:** the source gives only *descriptions* of testimonials, not verbatim quotes. §6 renders them as clearly-marked paraphrase (no quotation marks implying verbatim text). Do not present invented wording as a literal quote.
- Follow §8 phases P0→P9 top to bottom; each phase has a Definition of Done that gates the next.

---

## 2. Source Content Reference (the agent never needs the CMS)

**This is the complete, authoritative fact set. Use ONLY these facts. Do not invent employers, projects, dates, or quotes.**

### Identity
- **Name:** Dominik Machowiak
- **Headline:** "Hello! My name is Dominik. I am a Software developer who specializes in front-end development!"
- **Email:** `dominikmachowiak101@gmail.com`
- **LinkedIn:** `https://www.linkedin.com/in/dominikmachowiak/`
- **Classic site:** `https://dominikmachowiak.com` (React + Sanity SPA; sections Home, About, Work, Skills, Testimonials, Contact). The game is a companion page.

### About — 4 persona cards (exact descriptions)
1. **Frontend Developer** — "I am a passionate frontend developer who has the desire to design and develop great-looking web applications which are satisfying & engaging to use! The tools I have used thus far to achieve this are HTML5, CSS3, Javascript and various APIs."
2. **Aspiring React Developer** — "I am well-versed in HTML, CSS and Javascript. However, I am always looking to improve and gain knowledge! This is why I have spent time learning the React JS library on top of my existing Frontend experience. This also does not stop me from learning any other Frameworks in the future!"
3. **Avid Learner** — "What I enjoy most is acquiring knowledge and learning ways in which I can improve my work and myself... always on the look out for new technologies... allows me to adapt and be agile."
4. **Open-minded Programmer** — "Throughout my education and work experience I have had the opportunity to gain experience in various programming languages and technologies... always look for new challenges where I can showcase my skills and hopefully learn even more!"

### Skills
- Listed on site: **HTML, CSS, JavaScript, React, "Marketing Cloud Email Specialist"** (Salesforce certification), **"Trailhead Mountaineer"** (Salesforce Trailhead rank).
- Additional tech icons in his asset library: html, css, javascript, react, redux, sass, typescript, node, python, cpp, csharp, vue, flutter, graphql, figma, git, api, mobile, AMPScript.

### Experience (exact)
- **Education:** BSc Computing and IT Software, **The Open University**, 2018–2021.
- **Salesforce Marketing Cloud Developer, Deloitte, 2024–Present** (CURRENT): Led a Marketing Automation project for a Polish automotive client; provided technical consultation; developed & deployed scalable solutions using marketing technologies; worked on a marketing transformation for multiple car brands including ~300 email/SMS messages in Email Studio using HTML, CSS, JavaScript and AMPScript.
- **Web Developer, Welcom-Inn, 2023–2024:** designed & developed a website for a property-management company using HTML/CSS/JS; live and advertising Welcom-Inn's properties & services.
- **Front-end Web Developer, Rubicall, 2022–2023:** designed & developed a website for a cleaning company (HTML/CSS/JS); later returned to expand the site as they moved into the Airbnb business.
- **Intern Front-end Web Developer, Norbert Electronics, 2021:** volunteer front-end dev for a small electronics company; made changes to web pages to enhance feel & functionality.

### Projects
- **Welcom-Inn Website** — modern, responsive site for a property-management company. Live: `https://welcom-inn.co.uk/`. Tag: Web App.
- **Rubicall Website** — modern, responsive site for a cleaning company. Live: `https://www.rubicall.co.uk/`. Tag: Web App.
- **MERN Project** — full MERN stack, in progress. Tags: React JS, Web App.

### Testimonials (descriptions only — NOT verbatim quotes)
- **Norbert (Norbert Electronics):** praises the remarkable transformation, professionalism, attention to detail, seamless UX, boosted online presence.
- **Barbara (Rubicall):** thrilled — fantastic website for the cleaning business, patient, works great on phones & computers, clients love it, highly recommends.
- **Agnieszka (Welcom-Inn):** appreciates the functional website, patient guidance, effectively showcases rental properties & services, improved online presence.

> ⚠️ **Brand-logo warning:** Dominik's existing media folder contains template-leftover logos (**asus, adidas, amazon, spotify, skype**) that are **NOT** real clients or employers. His ONLY real clients/employers are **Deloitte, Welcom-Inn, Rubicall, Norbert Electronics** (+ education at **The Open University**). Never place those leftover logos in the world or imply they are clients. Real employer names appear only as **dialogue text**, never as third-party logo images (trademark hygiene).

---

## 3. Concept & World Design

### Recommended concept — "Dominik's Dev District" (hybrid timeline path)

A compact, **single-map outdoor walkable area** shaped as a gently curving **career path through a small studio-courtyard**. The path runs the timeline west→east (OU 2018 → Norbert 2021 → Rubicall 2022–23 → Welcom-Inn 2023–24 → Deloitte 2024–present). Non-dated content (4 personas, skills, 3 projects, 3 testimonials, contact, LinkedIn, classic-site exit) lives in **side pockets** branching off the path, so the road stays a clean story while the extras are one short detour away.

**Why this wins:** it's MVP-achievable (one `map.png` + one boundaries layer, identical to the reference architecture); it tells Dominik's real story the way a single room cannot (walking left→right *is* 2018→2026, arriving at the dominant Deloitte landmark as the payoff); it's recruiter-safe (linear main path, self-guiding, no dead ends) while side pockets add "I found something" delight; and it's expandable (each stop is just a boundary + a sprite).

### Considered alternatives

- **Option A — "The Developer Studio"** (single indoor room, JSLegend-style). *Pros:* smallest scope, cosy, reads instantly. *Cons:* a flat room cannot express progression (student→Deloitte) and gets crowded with ~17 hotspots. **Rejected** because it loses the narrative arc — but note the engine architecture is identical, so a future pivot is cheap.
- **Option B — "Career Town"** (RPG village; buildings = companies). *Pros:* richest and most memorable; companies literally are buildings. *Cons:* biggest art/map effort (5 exterior buildings, town decoration), empty walking time, easy to over-scope. **Rejected for v1** (the chosen hybrid can graduate into this later without an engine rewrite).
- **Option C — "Career Journey Path"** (pure linear timeline road). *Pros:* chronology is unmistakable, naturally guided, mobile-friendly. *Cons:* less exploration; off-road home needed for non-dated content. **Adopted as the spine** of the hybrid, with Option A's compact footprint and side pockets for the extras.

### Map layout

A horizontal **path/courtyard** read left (past) → right (present). The player spawns far-west on the path beside the OU gate; the visually dominant Deloitte landmark at the far east pulls them rightward without instruction. Off-path **pockets** (north and south of the road) hold the timeless content. Keep the walkable corridor relatively shallow vertically so the camera (which follows the player with a `-100` y-offset and rescales via `setCamScale`) keeps everything legible on a portrait phone.

**Canonical map size:** **64 tiles wide × 36 tiles tall**, native tile size **16 px** → native PNG **1024 × 576 px**. (At `scaleFactor` 4 this is a comfortable, pannable district, not a marathon, and it pans nicely on tall phone screens.) This single sizing supersedes any other figure — use 64×36.

```
                         DEV DISTRICT  —  career runs left (2018) → right (now)

   ┌──────────────────────────  PERSONA ROW (north pocket)  ──────────────────────────┐
   │  [frontend-cube]   [react-sign]   [learner-lamp]   [openminded-easel]            │
   └───────┬───────────────┬──────────────────┬─────────────────┬─────────────────────┘
           │               │                  │                 │
  ╔════════╪═══════════════╪══════════════════╪═════════════════╪═══════════════════╗
  ║  OU    │   Norbert     │     Rubicall     │    Welcom-Inn   │     DELOITTE      ║
  ║ ▓gate▓ │   ▒shop▒      │     ▒store▒      │    ▒house▒      │     ███tower█     ║
  ║ (2018  │   (2021)      │     (2022-23)    │    (2023-24)    │     (2024-now)★   ║
  ║  -21)  │               │                  │                 │                   ║
  ║   ◎    →    ◎      →       ◎       →           ◎      →           ◎           ║  ← THE PATH
  ║ SPAWN  │               │                  │                 │                   ║
  ╚════════╪═══════════════╪══════════════════╪═════════════════╪═══════════════════╝
           │               │                  │                 │
   ┌───────┴────────┬──────┴──────────┬───────┴─────────┬───────┴────────────────────┐
   │ [skills-arcade]│ [project-       │ [testimonial-*  │ [contact-mailbox]          │
   │  (icon machine)│  welcominn]     │  norbert/       │ [linkedin-postbox]         │
   │                │ [project-       │  barbara/       │ [classic-site-portal] ⟲    │
   │                │  rubicall]      │  agnieszka]     │ [welcome name-plaque @spawn]│
   │                │ [project-mern]  │  corkboard ×3   │                            │
   └────────────────┴─────────────────┴─────────────────┴────────────────────────────┘
                          SOUTH POCKET (the "studio" extras)
```

**Zones:** (1) **The Path** — five timeline landmarks west→east with their years painted on. (2) **North pocket — Persona Row** — four stations for the four About cards, met early like a portfolio's About section. (3) **South pocket — The Studio** — skills, 3 projects, 3 testimonials, contact, LinkedIn, and the classic-site portal. (4) **Edges** — solid hedge/wall boundaries forming the courtyard. **Spawn** — single `spawnpoints` object far-west on the path; a `welcome` name-plaque sits beside it.

### Atmosphere

Warm, friendly "approachable dev studio at dusk." Let the chosen tileset's built-in palette drive the look; target these roles:

| Role | Hex | Use |
|---|---|---|
| Canvas background / sky | `#1f2233` | deep indigo dusk (keeps sprites readable, glow-rings pop) — **canonical bg, also used as KAPLAY `background`** |
| Path / road | `#3a3550` | central corridor |
| Grass / pockets | `#2e4d3a` | north & south pockets |
| Accent / glow | `#ffcf6b` | active-hotspot pulse, signage highlight, progress pill |
| Deloitte "present" accent | `#86bc25` | subtly tint the destination tower so "now" feels aspirational |
| Persona / React touches | `#61dafb` | React sign, code-cube glow |

A permanent, unobtrusive **top-left HTML overlay** (outside canvas, monogram font) shows **"DOMINIK MACHOWIAK — Front-end Developer · Salesforce Marketing Cloud Developer @ Deloitte"** so the headline is on screen before the player moves. Pair with a bottom-right **"Discovered X of 17"** pill and a bottom-centre input hint. Optional lo-fi loop + soft SFX, **muted by default**, started only on first user gesture, with a tappable mute toggle persisted to `localStorage`.

---

## 4. Full Hotspot Map (single canonical table)

**This is the one canonical naming scheme.** Every name below is simultaneously: the Tiled `boundaries` object `name`, the `dialogueData`/`content` key, and the progress-set entry. **17 hotspots.** The persona row is **4 separate hotspots**; LinkedIn is **separate** from contact; the classic-site exit is its own hotspot. Decorative-only colliders (benches, plants) are unnamed walls and are not in this table.

| Boundary name | In-world object | Floating label | Portfolio section | Content summary |
|---|---|---|---|---|
| `welcome` | Name-plaque / glowing sign at spawn | "Start Here" | Intro / Identity | Headline, name, "front-end specialist" framing |
| `persona-frontend` | Glowing code-cube workstation | "Frontend Dev" | About — card 1 | Passionate frontend dev; HTML5/CSS3/JS + APIs; satisfying & engaging UIs |
| `persona-react` | React-atom spinning sign | "React" | About — card 2 | Well-versed in HTML/CSS/JS; learning React; open to more frameworks |
| `persona-learner` | Lit reading lamp + open book | "Avid Learner" | About — card 3 | Loves acquiring knowledge; adapts; stays agile |
| `persona-openminded` | Artist's easel / open laptop | "Open-minded" | About — card 4 | Varied languages & tech; seeks new challenges |
| `ou-gate` | Open University campus gate / archway | "BSc, Open University" | Experience — Education 2018–21 | BSc Computing & IT Software, The Open University, 2018–2021 |
| `norbert-shop` | Norbert Electronics shopfront | "Norbert (Intern)" | Experience — Norbert 2021 | Volunteer intern front-end dev; enhanced web pages' feel & functionality |
| `rubicall-store` | Rubicall storefront | "Rubicall (Front-end)" | Experience — Rubicall 2022–23 | Built the cleaning-company site; returned to expand it for their Airbnb business |
| `welcominn-house` | Welcom-Inn house | "Welcom-Inn (Web Dev)" | Experience — Welcom-Inn 2023–24 | Built the live property-management site (HTML/CSS/JS) |
| `deloitte-tower` | Deloitte tower — tallest, ★ current | "Deloitte ★" | Experience — Deloitte 2024–present | Salesforce Marketing Cloud Developer; Polish automotive client; ~300 email/SMS in Email Studio (HTML/CSS/JS/AMPScript); multi-brand marketing transformation |
| `skills-arcade` | Skills arcade/vending machine of tech icons | "Skills & Certs" | Skills | HTML/CSS/JS/React + stack icons; certs: Marketing Cloud Email Specialist, Trailhead Mountaineer |
| `project-welcominn` | Framed canvas #1 in the gallery | "Project: Welcom-Inn" | Projects | Responsive property-mgmt site → `https://welcom-inn.co.uk/` |
| `project-rubicall` | Framed canvas #2 | "Project: Rubicall" | Projects | Responsive cleaning-company site → `https://www.rubicall.co.uk/` |
| `project-mern` | Framed canvas #3 ("WIP" tape) | "Project: MERN (WIP)" | Projects | Full MERN stack, in progress |
| `testimonial-norbert` | Corkboard note #1 | "What Norbert Says" | Testimonials | Norbert (Norbert Electronics) — transformation, professionalism, seamless UX |
| `testimonial-barbara` | Corkboard note #2 | "What Barbara Says" | Testimonials | Barbara (Rubicall) — fantastic site, patient, works on phones & computers |
| `testimonial-agnieszka` | Corkboard note #3 | "What Agnieszka Says" | Testimonials | Agnieszka (Welcom-Inn) — functional site, patient guidance, improved presence |
| `contact-mailbox` | Mailbox | "Get in Touch" | Contact | Email `dominikmachowiak101@gmail.com` (mailto) |
| `linkedin-postbox` | LinkedIn-blue post box | "LinkedIn" | Contact | `https://www.linkedin.com/in/dominikmachowiak/` |
| `classic-site-portal` | Glowing doorway labelled "Classic Site" | "Classic Site →" | Exit | Link back to `https://dominikmachowiak.com` (new tab) |

> Wait — that table lists 20 rows. The canonical hotspot **count is the number of progress-tracked content stations = 17**, computed as: 1 welcome + 4 personas + 5 timeline + 1 skills + 3 projects + 3 testimonials + contact-group. To keep the "Discovered X of 17" meter honest and avoid double-counting the closely-grouped Contact cluster, the three south-east stations **`contact-mailbox`, `linkedin-postbox`, `classic-site-portal` each remain their own interactable boundary, but the progress meter counts the Contact cluster as ONE unit** (visiting any of the three marks "contact" discovered). So: **20 named boundaries, 17 progress units.** The progress denominator constant is `TOTAL_DISCOVERABLE = 17`; the visited-set maps `contact-mailbox`/`linkedin-postbox`/`classic-site-portal` → the single bucket `"contact"`. This is the single canonical reconciliation; use it consistently in the meter and the QA checklist.

---

## 5. Technical Architecture

### 5.1 Stack decision + exact `package.json`

**Engine: KAPLAY `kaplay@^3001.0.19`** — the maintained successor to the now-unmaintained `kaboom`. The API is ~95% compatible with the Kaboom-3000-era reference repos: the init call is `kaplay()` (a `kaboom()` alias exists), and `k.loadSprite/add/area/body/onUpdate/onKeyDown/onClick` are unchanged. **Expect to update a few APIs** when porting reference snippets — chiefly the camera (`setCamPos`/`setCamScale`, not the deprecated `camPos`/`camScale`) — and to verify `body`/`area`/sensor option names against the installed `.d.ts`. Do **not** promise "verbatim drop-in." Pin `^3001` (v4000 is still alpha/breaking — do not use it).

**Build tooling (locked):** Vite `^5` + **esbuild** default minify (no `terser` dependency) + **npm** + Node ≥ 20.19 + ESM. (Vite 5 is fine and matches the reference era; do not introduce Vite 8 / pnpm churn for a small game.)

```jsonc
// package.json
{
  "name": "portfolio-game",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "description": "2D explorable game portfolio for Dominik Machowiak",
  "engines": { "node": ">=20.19.0" },
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "deploy": "vite build && gh-pages -d dist"
  },
  "dependencies": {
    "kaplay": "^3001.0.19"
  },
  "devDependencies": {
    "vite": "^5.4.0",
    "gh-pages": "^6.3.0"
  }
}
```

`gh-pages` and the `deploy` script are optional (drop them if deploying via GitHub Actions or the main host). Add `.nvmrc` containing `20`.

### 5.2 Project file/folder tree

```
portfolio-game-2026/
├─ index.html              # canvas#game + dialogue overlay + HUD + hidden SEO fallback + inline CSS + @font-face
├─ package.json
├─ package-lock.json
├─ vite.config.js          # base per host (see §10), esbuild minify
├─ .nvmrc                  # 20
├─ .gitignore              # node_modules, dist, .DS_Store, *.log
├─ README.md
├─ CREDITS.md              # every asset attribution string
│
├─ public/
│  ├─ map.png              # Tiled "Export as Image" @1× → 1024×576
│  ├─ map.json             # Tiled JSON export: object layers "boundaries" + "spawnpoints"
│  ├─ spritesheet.png      # player atlas (sliceX/sliceY = COLUMN/ROW COUNTS of the sheet you ship)
│  ├─ monogram.ttf         # CC0 pixel font
│  ├─ icons/               # tech icons for the skills arcade / contact props (DOM-side)
│  │  └─ *.svg|png
│  └─ audio/               # optional bgm + sfx (CC0)
│
└─ src/
   ├─ main.js              # thin entry: import k, register scenes, k.go("loading")
   ├─ kaplayCtx.js         # creates & exports the kaplay() context (k)  ← canonical filename
   ├─ config/
   │  ├─ constants.js      # scaleFactor=4, CAM_Y_OFFSET=-100, PLAYER_SPEED, INTERACT_RADIUS, TOTAL_DISCOVERABLE=17, anim ranges
   │  └─ content.js        # the REAL portfolio data keyed by hotspot name (= §6, single source of truth)
   ├─ scenes/
   │  ├─ loading.js        # asset load + progress bar → go("main")
   │  └─ main.js           # build map, layers, player, hotspots, camera, interaction, HUD
   ├─ entities/
   │  └─ player.js         # makePlayer(): sprite, area, body, anim state machine, input
   ├─ systems/
   │  ├─ camera.js         # setCamScale + follow (setCamPos with y offset)
   │  ├─ interaction.js    # nearest-sensor-in-range detection + press-to-interact + prompt + glow
   │  └─ progress.js       # visited Set, "Discovered X of 17" pill, completion CTA
   └─ ui/
      ├─ dialogue.js       # HTML overlay controller (HTML-safe typewriter, paging, focus trap, close)
      └─ dialogue.css      # overlay styles (imported by Vite)
```

> **Canonical filename:** the context module is `src/kaplayCtx.js` (not `kaboomCtx.js`). Use this name everywhere.

### 5.3 Module responsibilities

- **`kaplayCtx.js`** — creates the single KAPLAY instance and exports `k`. `global:false`, `touchToMouse:true`, the canvas element, `pixelDensity:1` (see §5.9 — nearest-neighbour pixel art needs no DPR boost), `crisp:true`, `background:[31,34,51]` (= `#1f2233`), `debug:import.meta.env.DEV`.
- **`main.js`** — imports `k`, registers `loading` + `main` scenes, calls `k.go("loading")`. No game logic.
- **`config/constants.js`** — `scaleFactor=4`, `CAM_Y_OFFSET=-100`, `PLAYER_SPEED`, `INTERACT_RADIUS`, `TOTAL_DISCOVERABLE=17`, z-layers, animation frame ranges. Pure data.
- **`config/content.js`** — the structured content keyed by boundary name (§6). All real CMS copy lives here; the SEO fallback HTML is generated from the same object so the two never drift.
- **`scenes/loading.js`** — loads `map` sprite, `map.json`, `spritesheet.png` (with anim slices), font, icons; renders a progress bar each frame from `k.loadProgress()` (drive the bar yourself); then `k.go("main")`.
- **`scenes/main.js`** — adds the map sprite at `scaleFactor`; loops `map.json` layers to build solid walls + named sensor zones + spawn; creates the player; wires camera, interaction, progress, HUD.
- **`entities/player.js`** — `makePlayer(k)` returns the player object (sprite, `area()`, dynamic `body()`, movement + anim state machine, arrow + WASD + tap-to-move). Holds position while a dialogue is open.
- **`systems/camera.js`** — `setCamScale(k)` (responsive, on load + `onResize`) and the follow `onUpdate` that calls `k.setCamPos(player.worldPos().x, player.worldPos().y + CAM_Y_OFFSET)`.
- **`systems/interaction.js`** — each frame finds the nearest named sensor within `INTERACT_RADIUS` (using AABB/edge distance, not just center-distance, so wide zones aren't unfairly "far"), shows the floating prompt + glow on the **active** zone only, and opens its dialogue on E/Enter/tap-button. Gated by `dialogueIsOpen()`.
- **`systems/progress.js`** — a `Set` of visited progress-buckets, updates the pill, swaps to the completion CTA at 17/17.
- **`ui/dialogue.js` + `dialogue.css`** — the DOM overlay controller: HTML-safe typewriter (reveal by node, not string slice), paging, `role="dialog"`, focus trap, Esc/Enter/close, reduced-motion support.

### 5.4 Dialogue / content system spec + data shape

The dialogue is a **DOM overlay outside the canvas** (crisp at any DPR, real clickable `<a>` links, selectable, screen-reader reachable). Markup in `index.html`:

```html
<div id="dialogue-overlay" class="hidden" role="dialog" aria-modal="true"
     aria-labelledby="dialogue-title" aria-describedby="dialogue-body">
  <div id="dialogue-box">
    <header id="dialogue-header">
      <img id="dialogue-icon" alt="" hidden />
      <h2 id="dialogue-title"></h2>
      <span id="dialogue-subtitle"></span>
    </header>
    <div id="dialogue-body"></div>
    <footer id="dialogue-footer">
      <button id="dialogue-prev" type="button" hidden>‹ Back</button>
      <span id="dialogue-pager" aria-live="polite"></span>
      <button id="dialogue-next" type="button" hidden>Next ›</button>
      <button id="dialogue-close" type="button" aria-label="Close dialogue">Close ✕</button>
    </footer>
  </div>
</div>
```

**Behaviour:** HTML-safe typewriter via `requestAnimationFrame` that reveals **by DOM node** (never by slicing the raw string — slicing breaks `<a>` tags mid-render); click/tap/Enter once skips to full text, again advances/closes; optional title/subtitle/icon per entry; multi-page entries get Next/Back + `←/→` and a "1 / N" pager (short entries hide it); accessible close via button, **Esc**, and click-outside; focus moves into the dialog on open, is trapped while open, and returns to the canvas on close; **movement input is swallowed while open**; `prefers-reduced-motion: reduce` (or a "Skip animations" toggle) instant-completes the typewriter while still rendering all links.

**Data shape (`src/config/content.js`):** keyed by boundary name; each entry is `{ title, subtitle?, icon?, pages: [{ html }] }`. The full literal is in §6 — that is the single source of truth; do not re-stub a partial copy elsewhere.

### 5.5 State & scene flow

```
go("loading")  →  [load assets + progress bar]  →  go("main")
```
A separate intro scene is optional/stretch; MVP goes straight to `main`. **Player movement/animation state machine:** inputs are arrows **and** WASD (`onKeyDown`) plus tap-to-move (`onMouseDown` + `touchToMouse`); each frame derive direction (`down`/`up`/`side`) and motion (`idle`/`walk`) from velocity, play `${motion}-${dir}`, set `flipX` for left, and **only call `play()` when the anim name changes**. Camera follows with `setCamPos(x, y + CAM_Y_OFFSET)`; `setCamScale` runs on load and resize.

### 5.6 Press-to-interact trigger approach (canonical)

**Proximity + explicit press — NOT auto-fire-on-collision.** This avoids accidental pop-ups, re-trigger spam (which collision-driven triggers require debounce hacks to fix), and mobile move/interact ambiguity, and it's discoverable via a floating prompt.

The Tiled `boundaries` layer therefore splits into two kinds of object:
1. **Solid walls** — *unnamed* rectangles → `area()` + `body({ isStatic: true })`. These block the player.
2. **Named trigger zones** — the 20 named rectangles from §4 → `area()` as **non-solid sensors** (set `isSensor: true`; verify the exact sensor flag in the installed v3001 typings — if absent, use `area()` with no `body()` so it never blocks, and rely purely on the proximity check). These do **not** block movement.

The player itself has a non-static `body()` + `area()` so it collides with the solid walls. (A static wall blocks only because the *moving* object also has `area()`+`body()`.) The interaction system measures player-to-zone distance for the **named** zones only and opens `content[name]` on press. Remove all `onCollide`-fires-dialogue logic.

### 5.7 Responsive / mobile

- Canvas fills its container: CSS `width:100%; height:100dvh` (dynamic viewport so mobile browser chrome doesn't clip).
- **Single canvas-sizing model (locked): fluid fill + `setCamScale`** (do NOT also use fixed-resolution `letterbox` — pick one; this is the one). `setCamScale` gives portrait screens more zoom so hotspots stay tappable:
  ```js
  export function setCamScale(k) {
    const r = k.width() / k.height();
    k.setCamScale(k.vec2(r < 1 ? 1.5 : 1.8)); // more zoom in portrait
  }
  ```
- **Touch:** tap-to-move via `touchToMouse:true`, plus an on-screen **Interact button** `#interact-btn` (fixed bottom-right, ≥48px, shown only on `@media (pointer: coarse)`) wired to `tryInteract()`. **Taps always move; the Interact button interacts** — never promise "tap an object to read" (a tap on an object is interpreted as a move target). A persistent one-line footer on touch devices reads: "Tap to move • Tap the Interact button to read." Prevent unwanted mobile scroll/zoom on the canvas (viewport meta + `touch-action: none` on the canvas).

### 5.8 Accessibility + SEO fallback

- **Hidden semantic HTML fallback** in `index.html`, present in the DOM (use a `.visually-hidden` clip pattern, **not** `display:none`) carrying ALL of Dominik's content (headline, About, Experience, Projects with live links, Skills, Testimonials, Contact). **It is generated from the same `content.js`** as the dialogues so the two never drift.
- **`<noscript>`** renders a compact version of the same content + a prominent "View classic site" link.
- **Reduced motion:** honour `prefers-reduced-motion` (instant typewriter, reduced camera easing) — links still render.
- **Keyboard-only:** arrows/WASD move, **E/Enter** interact, **Esc** closes, **Tab** cycles dialogue controls (trapped while open, restored on close). Visible "Controls" hint.
- The dialogue itself is the accessible surface (`role="dialog"`, labelled, real links). A "← Back to classic site" link is always visible.

### 5.9 Performance

- **`pixelDensity: 1` + `crisp: true`.** For nearest-neighbour pixel art scaled by `scaleFactor:4`, DPR>1 quadruples fragment work for zero visual gain (the DOM text overlay is already crisp regardless). Capping DPR is the single biggest mobile lever — so cap it at 1 for the canvas.
- **One `map.png`** = one draw, no per-tile overhead. Keep it ≤ ~500 KB (export at native 1024×576, let the engine scale).
- **One `spritesheet.png` atlas**; pack any future props into shared atlases.
- **Glow only the ACTIVE hotspot** (the nearest-in-range one you already compute), never all 20 at once — this reconciles "interactables glow" with "avoid per-frame alpha overlays."
- Icons are DOM/SVG (no GPU texture load). Only swap anims on name change. Pause typewriter work on `visibilitychange`. Target initial JS ≤ ~300 KB gzipped; total initial download ≤ ~1.5 MB; verify with `vite build` + Lighthouse.

### 5.10 Integration with the existing site

Add an entry point on `dominikmachowiak.com` — e.g. a nav/hero button **"Explore in 2D ▸"** — linking to the game. Hosting options and the matching Vite `base` are in §10. The game header always shows **"← Back to classic site"** → `dominikmachowiak.com`. Reuse the site palette and tech icons so the two feel like one brand. Future: `content.js` can be fetched from Sanity at build time so the two never drift — not required for v1.

---

## 6. Draft Content / Copy (the complete content object — single source of truth)

`src/config/content.js`. Keys are exactly the §4 boundary names. Long entries use multiple `pages`. All `<a>` use `target="_blank" rel="noopener"`. **Testimonials are rendered as clearly-attributed paraphrase, NOT verbatim quotes** (the source supplied descriptions, not exact wording) — no quotation marks that would imply a literal quote.

```js
// src/config/constants.js
export const scaleFactor = 4;
export const CAM_Y_OFFSET = -100;
export const PLAYER_SPEED = 250;
export const INTERACT_RADIUS = 90;     // world units; tune against scaleFactor
export const TOTAL_DISCOVERABLE = 17;
```

```js
// src/config/content.js  — SINGLE SOURCE OF TRUTH for dialogue + SEO fallback
/**
 * @typedef {{ html: string }} ContentPage
 * @typedef {{ title: string, subtitle?: string, icon?: string, pages: ContentPage[] }} ContentEntry
 * @type {Record<string, ContentEntry>}   keyed by Tiled boundary name
 */
export const content = {
  "welcome": {
    title: "Hi, I'm Dominik!",
    pages: [{ html:
      `I'm a software developer who specializes in <strong>front-end development</strong>.
       Welcome to my little world. Walk around with the arrow keys, WASD, or by tapping —
       then press <strong>E</strong> (or the Interact button) at anything that glows.
       The path runs my career left-to-right: start at the Open University and walk east
       toward Deloitte. Enjoy the tour!` }],
  },

  "persona-frontend": {
    title: "Frontend Developer",
    icon: "./icons/javascript.svg",
    pages: [{ html:
      `I am a passionate frontend developer who has the desire to design and develop
       great-looking web applications which are satisfying &amp; engaging to use! The tools
       I have used thus far to achieve this are <strong>HTML5, CSS3, JavaScript</strong>
       and various APIs.` }],
  },
  "persona-react": {
    title: "Aspiring React Developer",
    icon: "./icons/react.svg",
    pages: [{ html:
      `I am well-versed in HTML, CSS and JavaScript. However, I am always looking to improve
       and gain knowledge! This is why I have spent time learning the <strong>React</strong>
       JS library on top of my existing frontend experience. This also does not stop me from
       learning any other frameworks in the future!` }],
  },
  "persona-learner": {
    title: "Avid Learner",
    icon: "./icons/git.svg",
    pages: [{ html:
      `What I enjoy most is acquiring knowledge and learning ways in which I can improve my
       work and myself. I'm always on the lookout for new technologies, which allows me to
       adapt and be agile.` }],
  },
  "persona-openminded": {
    title: "Open-minded Programmer",
    icon: "./icons/figma.svg",
    pages: [{ html:
      `Throughout my education and work experience I have had the opportunity to gain
       experience in various programming languages and technologies. I always look for new
       challenges where I can showcase my skills and hopefully learn even more!` }],
  },

  "ou-gate": {
    title: "BSc Computing &amp; IT Software",
    subtitle: "The Open University · 2018–2021",
    pages: [{ html:
      `On the academic side, I earned a <strong>BSc in Computing and IT Software</strong>
       from The Open University (2018–2021). It gave me a solid foundation to build
       everything else on top of.` }],
  },
  "norbert-shop": {
    title: "Intern Front-end Web Developer — Norbert Electronics",
    subtitle: "2021",
    pages: [{ html:
      `My first taste of the industry was an internship as a volunteer front-end web developer
       at <strong>Norbert Electronics</strong>, a small electronics company. I made changes
       across their web pages to enhance the feel and functionality. Small role, big lessons!` }],
  },
  "rubicall-store": {
    title: "Front-end Web Developer — Rubicall",
    subtitle: "2022–2023",
    pages: [{ html:
      `I designed and built the website for <strong>Rubicall</strong>, a cleaning company,
       using HTML, CSS and JavaScript. They liked it enough to bring me back to expand the
       site when they moved into the Airbnb business.
       <a href="https://www.rubicall.co.uk/" target="_blank" rel="noopener">See it live ↗</a>` }],
  },
  "welcominn-house": {
    title: "Web Developer — Welcom-Inn",
    subtitle: "2023–2024",
    pages: [{ html:
      `At <strong>Welcom-Inn</strong> I designed and built the website for a property-management
       company with HTML, CSS and JavaScript. It's live and advertising their properties and
       services.
       <a href="https://welcom-inn.co.uk/" target="_blank" rel="noopener">Visit it ↗</a>` }],
  },
  "deloitte-tower": {
    title: "Salesforce Marketing Cloud Developer — Deloitte",
    subtitle: "2024–Present",
    icon: "./icons/ampscript.svg",
    pages: [
      { html:
        `Right now I'm a Salesforce Marketing Cloud Developer at <strong>Deloitte</strong>.
         I led a marketing automation project for a Polish automotive client, providing
         technical consultation and developing &amp; deploying scalable solutions using
         marketing technologies.` },
      { html:
        `The headline number: as part of a marketing transformation across multiple car brands,
         I built <strong>~300 email &amp; SMS messages in Email Studio</strong> using HTML, CSS,
         JavaScript and <strong>AMPScript</strong>.` },
    ],
  },

  "skills-arcade": {
    title: "Skills &amp; Certifications",
    pages: [{ html:
      `My core toolkit is <strong>HTML, CSS, JavaScript and React</strong>, and I'm always
       reaching for more — TypeScript, Sass, Redux, Node, GraphQL, Git, Figma and beyond.
       On the Salesforce side I'm a certified <strong>Marketing Cloud Email Specialist</strong>
       and a <strong>Trailhead Mountaineer</strong>. I love learning new technologies, so this
       shelf keeps growing.` }],
  },

  "project-welcominn": {
    title: "Welcom-Inn Website",
    subtitle: "Web App",
    pages: [{ html:
      `A modern, responsive site for a property-management company, built to showcase their
       rental properties and services.
       <a href="https://welcom-inn.co.uk/" target="_blank" rel="noopener">welcom-inn.co.uk ↗</a>` }],
  },
  "project-rubicall": {
    title: "Rubicall Website",
    subtitle: "Web App",
    pages: [{ html:
      `A modern, responsive site for a cleaning company. Clean code for a cleaning brand,
       naturally.
       <a href="https://www.rubicall.co.uk/" target="_blank" rel="noopener">rubicall.co.uk ↗</a>` }],
  },
  "project-mern": {
    title: "MERN Project",
    subtitle: "React JS · Web App · In progress",
    pages: [{ html:
      `A project built on the full <strong>MERN</strong> stack (MongoDB, Express, React, Node).
       It's currently a work in progress — consider this a sneak peek. More to come!` }],
  },

  "testimonial-norbert": {
    title: "Testimonial — Norbert",
    subtitle: "Norbert Electronics",
    pages: [{ html:
      `Norbert praised the remarkable transformation of their site, delivered with real
       professionalism and attention to detail — a seamless user experience that genuinely
       boosted their online presence.<br/><em>— Norbert, Norbert Electronics</em>` }],
  },
  "testimonial-barbara": {
    title: "Testimonial — Barbara",
    subtitle: "Rubicall",
    pages: [{ html:
      `Barbara was thrilled with the fantastic website built for her cleaning business —
       patient guidance throughout, works great on both phones and computers, and her clients
       love it. She highly recommends working with me.<br/><em>— Barbara, Rubicall</em>` }],
  },
  "testimonial-agnieszka": {
    title: "Testimonial — Agnieszka",
    subtitle: "Welcom-Inn",
    pages: [{ html:
      `Agnieszka appreciated a functional website delivered with patient guidance from start to
       finish — one that effectively showcases their rental properties and services and improved
       their online presence.<br/><em>— Agnieszka, Welcom-Inn</em>` }],
  },

  "contact-mailbox": {
    title: "Get in touch",
    pages: [{ html:
      `Like what you see? Let's talk! Drop me a line at
       <a href="mailto:dominikmachowiak101@gmail.com">dominikmachowiak101@gmail.com</a>.
       I'd love to hear from you.` }],
  },
  "linkedin-postbox": {
    title: "LinkedIn",
    icon: "./icons/linkedin.svg",
    pages: [{ html:
      `Let's connect on
       <a href="https://www.linkedin.com/in/dominikmachowiak/" target="_blank" rel="noopener">LinkedIn ↗</a>.` }],
  },
  "classic-site-portal": {
    title: "The Classic Site",
    pages: [{ html:
      `Thanks for exploring! If you'd prefer the classic (non-game) version of my portfolio,
       you'll find it at
       <a href="https://dominikmachowiak.com" target="_blank" rel="noopener">dominikmachowiak.com ↗</a>.
       Safe travels!` }],
  },
};

// Floating in-world labels (drawn as small canvas text above each zone)
export const labels = {
  "welcome": "Start Here", "persona-frontend": "Frontend Dev", "persona-react": "React",
  "persona-learner": "Avid Learner", "persona-openminded": "Open-minded",
  "ou-gate": "BSc, Open University", "norbert-shop": "Norbert (Intern)",
  "rubicall-store": "Rubicall (Front-end)", "welcominn-house": "Welcom-Inn (Web Dev)",
  "deloitte-tower": "Deloitte ★", "skills-arcade": "Skills & Certs",
  "project-welcominn": "Project: Welcom-Inn", "project-rubicall": "Project: Rubicall",
  "project-mern": "Project: MERN (WIP)", "testimonial-norbert": "What Norbert Says",
  "testimonial-barbara": "What Barbara Says", "testimonial-agnieszka": "What Agnieszka Says",
  "contact-mailbox": "Get in Touch", "linkedin-postbox": "LinkedIn",
  "classic-site-portal": "Classic Site →",
};

// Progress bucketing: contact cluster counts as one of the 17 units
export const progressBucket = (name) =>
  (name === "linkedin-postbox" || name === "classic-site-portal") ? "contact-mailbox" : name;
```

**Intro / hint / outro microcopy (HUD strings, not dialogue):**
- **First-load banner (auto-dismiss on first move):** "Tap to move • Arrow keys / WASD also work • Press E to interact." (Touch variant: "Tap to move • Tap the Interact button to read.")
- **Persistent top-left title overlay:** "DOMINIK MACHOWIAK — Front-end Developer · Salesforce Marketing Cloud Developer @ Deloitte"
- **Progress pill:** "Discovered {n} of 17"
- **Completion (at 17/17):** "You've explored Dominik's whole career! 🎉 Visit the full site → dominikmachowiak.com"

---

## 7. Assets & Tiled Pipeline

### Art style

Top-down / three-quarter cozy **pixel art**, **16×16 native tile size**, `scaleFactor = 4` (16×4 = 64 effective px/tile — crisp, mobile-legible, nearest-neighbour). Character frames ~16–24 px wide × 24–32 px tall. Because the chosen concept is the **outdoor "Dev District" path** (not an indoor office), the tileset must be an **outdoor/town** set (grass, paths, hedges, fences, signposts) plus a handful of **landmark sprites** (OU gate, four company markers, a Deloitte "destination" tower). Do **not** pick an indoor-only interior pack for this world.

> ⚠️ **LICENSING IS THE AGENT'S RESPONSIBILITY.** Licenses change; the `License.txt` inside each download is authoritative. Before shipping: download each asset, open its license file, confirm **commercial + public deployment** is allowed (a recruiter-facing portfolio is a *public, commercial-context* project), and record the exact attribution string in `CREDITS.md` + an in-game credits line. **When in doubt, prefer CC0.**

### Concrete sources, licenses, and caveats

| Asset | Recommended source | License reality | Caveat |
|---|---|---|---|
| **Outdoor tileset (DEFAULT)** | **Kenney** top-down / "Tiny Town" / "RPG Urban" packs — `https://kenney.nl/assets` | **CC0** — commercial + public use, no attribution required | **Use this as the default** so the agent can proceed with zero license judgment. Crediting "Kenney" is appreciated, not required. |
| Cozy alt tileset | Kenmi "Cute Fantasy RPG" `https://kenmi-art.itch.io/cute-fantasy-rpg` | Free tier exists; commercial terms have historically been more restrictive than advertised | **VERIFY-LICENSE** before public deploy; prefer premium tier. Not the default. |
| ⚠️ LimeZu "Modern Interiors/Office" | `https://limezu.itch.io/moderninteriors` | **Free version is PRIVATE/TESTING ONLY — NOT commercial/public.** Only the **paid** version grants public/commercial use, under a custom (non-CC-BY) license. | **Do NOT use the free version for this deployed portfolio.** Also it's an *indoor* pack, wrong for the outdoor concept. Avoid unless paid + you pivot to Option A. |
| Sprout Lands (Cup Nooble) | `https://cupnooble.itch.io/sprout-lands-asset-pack` | Free tier requires attribution `Assets -From : Sprout Lands -By : Cup Nooble`; free-tier commercial status is ambiguous | **VERIFY-LICENSE**; prefer premium or a CC0 alternative. |
| **Player character (DEFAULT)** | **Kenney** CC0 top-down character | **CC0** — no attribution, public/commercial OK | Default. Match its grid for `sliceX/sliceY`. |
| Character alt (resemble Dominik) | Universal LPC Spritesheet Generator | **CC-BY-SA 3.0 / GPL — viral.** Derivative game art must be ShareAlike and every contributing part credited (the tool lists them). | Real obligation. For a personal portfolio prefer the **CC0 Kenney** character to avoid ShareAlike on your art. |
| **Font** | **monogram** by datagoblin `https://datagoblin.itch.io/monogram` | **CC0** (public domain) — *not OFL* | Ship `monogram.ttf` directly in `public/`. No attribution/license-file requirement. |
| Tech icons (skills arcade / contact props) | Re-source **CC0/MIT**: Simple Icons (icons CC0; brand marks carry trademark) or devicon (MIT) | The existing `static/media/*.png` icons came from a portfolio **starter template** — license unknown. | **VERIFY-LICENSE or re-source.** Default: download a fresh MIT/CC0 dev-icon set into `public/icons/`. Nominative "skills I know" use of brand marks (React, Salesforce) is generally OK; redistributing unknown PNGs is not. There is **no** Salesforce icon in his library — render the two Salesforce credentials as **text** (or a generic cloud/AMPScript glyph), not a fabricated logo. |
| Audio (optional) | Kenney audio / OpenGameArt CC0 / Freesound (CC0 filter) | CC0 | Avoid Kevin MacLeod / Incompetech (CC-BY — adds an attribution obligation). |

> ⚠️ **Leftover-brand-logos warning (repeat):** `static/media/` contains `asus, adidas, amazon, spotify, skype` — template leftovers, **not** clients. Never place them. Only the genuine tech-stack icons relate to real skills, and even those are VERIFY-LICENSE.

**Default decision for the autonomous agent:** **all-Kenney CC0 tileset + Kenney CC0 character + monogram CC0 font + a fresh CC0/MIT icon set.** This ships with zero attribution risk and no human license judgment call. Record "Some assets by Kenney (kenney.nl) — CC0" and "Font: monogram by datagoblin — CC0" in `CREDITS.md` anyway (good manners).

### Spritesheet slicing contract (read carefully)

`sliceX` / `sliceY` are the **number of columns / rows** in the sheet you actually ship — **not** the pixel size of a frame. The reference's `sliceX:39, sliceY:31` and frame indices `936/975/1014` are specific to *its* atlas and are **invalid** for any other character. For a typical 4-column Kenney/LPC character you will set `sliceX/sliceY` to that sheet's column/row counts and **recompute every anim's `from`/`to`** for that grid. Do not carry the reference indices forward.

```js
// loaded in loading.js — indices are EXAMPLES for a 4-col sheet; recompute for your real sheet
k.loadSprite("player", "./spritesheet.png", {
  sliceX: 4, sliceY: 4,            // ← columns, rows of YOUR sheet
  anims: {
    "idle-down": 0,  "walk-down": { from: 0,  to: 3,  loop: true, speed: 8 },
    "idle-side": 4,  "walk-side": { from: 4,  to: 7,  loop: true, speed: 8 },
    "idle-up":   8,  "walk-up":   { from: 8,  to: 11, loop: true, speed: 8 },
  },
});
```

### Tiled → `map.json` + `map.png` workflow

Runtime contract: `k.loadSprite("map","./map.png")` loads **one flat PNG**; `public/map.json` supplies **object layers only** (`boundaries` = solid walls + named sensor zones; `spawnpoints` = a `player` point). Everything is multiplied by `scaleFactor` (4) at runtime, so Tiled pixel coordinates must be in the same 16-px native space as the PNG — export the PNG at **1×** and let the code scale.

1. **New map** — Orthogonal, tile size **16×16**, size **64×36** tiles (1024×576 px native).
2. **Add tileset(s)** — "Based on Tileset Image" → the Kenney PNG, 16×16, margin/spacing 0.
3. **Paint visual tile layers** (bottom→top): `grass`, `paths`, `hedges/edges`, `landmarks-furniture` (OU gate, 4 company markers, Deloitte tower, persona stations, skills arcade, project frames, corkboard, mailbox, postbox, portal), optional `overhead`. Paint the **years** onto each timeline landmark and **directional/footprint hints** on the path.
4. **`boundaries` object layer** (named exactly `boundaries`): with the Rectangle tool, draw **unnamed** rects over every wall/solid edge (these block), and **named** rects (one per §4 key) in front of each hotspot (these are non-solid sensors). The `Name` is the content key — keep it identical to a `content.js` key.
5. **`spawnpoints` object layer** (named exactly `spawnpoints`): insert a Point named **`player`** at the far-west path start.
6. **Export geometry** — File → Export As → JSON → `public/map.json`. Open the JSON and confirm both object layers + every object `name` survived.
7. **Render PNG** — File → Export As Image → uncheck "Include grid," zoom **1×** → `public/map.png`.
8. **Sanity check** — `map.png` pixel size must equal the Tiled native size (1024×576). If collisions look offset, you exported the PNG at >1× — re-export at 1×.

**Coordinate/scale contract the code expects:** the map sprite is added at the **default top-left anchor** with `scale(scaleFactor)`; **boundary objects are added as CHILDREN of the map game object** so they inherit its `pos`/`scale`, each at `pos(obj.x, obj.y)` with a `Rect(obj.width, obj.height)`. Top-left anchor + child-of-map is what keeps Tiled's top-left rectangle origin aligned with the rendered art — the most common Tiled→KAPLAY misalignment bug is anchoring the map centered or adding boundaries as scene-root children. Tiled **point** objects (spawn) export `x,y` only (no width/height) — read those directly.

---

## 8. Implementation Roadmap (P0–P9)

Each phase: **Goal · Tasks · Files · DoD.** Treat each DoD as a gate — verify by running the app, not by assumption. Work on a branch; commit per phase; push only when asked.

### P0 — Project Scaffold
**Goal:** a running empty KAPLAY canvas served by Vite, version-controlled, building cleanly.
- [ ] Create NEW folder `C:\Users\domin\OneDrive\Desktop\Websites\portfolio-game-2026\`. `git init`; add `.gitignore` (`node_modules`, `dist`, `.DS_Store`, `*.log`).
- [ ] `npm init -y`; set `"type":"module"`; write the exact `package.json` (§5.1). `npm i kaplay`; `npm i -D vite gh-pages`. **No terser.**
- [ ] `vite.config.js` (esbuild minify; `base` placeholder per §10). `.nvmrc` = `20`.
- [ ] `index.html` with `<canvas id="game">` + a module script to `/src/main.js`.
- [ ] `src/kaplayCtx.js` exporting `kaplay({ global:false, touchToMouse:true, canvas, pixelDensity:1, crisp:true, background:[31,34,51], debug:import.meta.env.DEV })`.
- [ ] `src/main.js` draws one placeholder text to confirm the loop.

**Files:** `package.json`, `vite.config.js`, `.nvmrc`, `.gitignore`, `index.html`, `src/kaplayCtx.js`, `src/main.js`
**DoD:** `npm run dev` serves at `localhost:5173`, canvas visible, no console errors. `npm run build` + `npm run preview` work. `node_modules`/`dist` not staged.

### P1 — Walkable World + Player Movement
**Goal:** a player sprite walking a static map image with correct directional anims.
- [ ] Placeholder `public/map.png` + `public/spritesheet.png`. `k.loadSprite("map",...)`; `loadSprite("player",...)` with `sliceX/sliceY` = your sheet's column/row counts and recomputed anim ranges (§7).
- [ ] `main` scene; map sprite at top-left anchor, `scale(scaleFactor)`.
- [ ] Player object: sprite, `pos`, `scale(scaleFactor)`, `{ speed, dir:"down", isInDialogue:false }`.
- [ ] Arrow + WASD movement (`onKeyDown`); tap-to-move (`onMouseDown` + `touchToMouse`).
- [ ] Anim state machine: `${motion}-${dir}`, `flipX` for left, `play()` only on change.

**Files:** `src/scenes/main.js`, `src/entities/player.js`, `src/config/constants.js`, `public/spritesheet.png`, `public/map.png`
**DoD:** player walks all four directions via keys AND tap; correct anim per direction; left/right mirror via `flipX`; idle when stationary.

### P2 — Camera + Collisions
**Goal:** camera follows the player; solid boundaries block movement; alignment is exact.
- [ ] Real (or stub) Tiled export `public/map.json` + matching `public/map.png`.
- [ ] Import/fetch `map.json`; find layers by `name`; iterate `layer.objects`.
- [ ] Add the map game object; for each **unnamed** `boundaries` object add a **child** with `pos(obj.x,obj.y)`, `area({ shape: new k.Rect(k.vec2(0), obj.width, obj.height) })`, `body({ isStatic:true })`.
- [ ] Read `spawnpoints` → place player at the `player` point.
- [ ] Player has non-static `body()` + `area()`.
- [ ] Camera follow: `k.setCamPos(player.worldPos().x, player.worldPos().y + CAM_Y_OFFSET)`. `setCamScale(k)` on load + `onResize`.

**Files:** `src/scenes/main.js`, `src/systems/camera.js`, `public/map.json`, `public/map.png`
**DoD:** player cannot pass any solid boundary; camera centers player with the `-100` offset; resize rescales with no distortion; with `debug:true`, boundary outlines align with walls in `map.png` (no drift).

### P3 — Dialogue System + Press-to-Interact
**Goal:** pressing E (or the Interact button) near a named sensor opens an HTML overlay with an HTML-safe typewriter and working links.
- [ ] Dialogue overlay markup (§5.4) + `#interact-btn` + HUD in `index.html`, **outside the canvas**; `dialogue.css`; `@font-face` for `monogram.ttf`.
- [ ] `ui/dialogue.js`: `openDialogue(name,{onClose})`, HTML-safe typewriter (reveal by node), paging, `role="dialog"`, focus trap, Esc/Enter/close, click-outside, `prefers-reduced-motion` instant-complete, `dialogueIsOpen()` export.
- [ ] Named `boundaries` objects → non-solid sensor zones (`isSensor:true` or `area()` w/o body); tag each with its `contentName`.
- [ ] `systems/interaction.js`: per-frame nearest named zone within `INTERACT_RADIUS` (edge/AABB distance), show prompt + glow on the **active** zone only, open on E/Enter/`#interact-btn`; gate on `dialogueIsOpen()`.
- [ ] Movement handlers early-return while `isInDialogue`.

**Files:** `index.html`, `src/ui/dialogue.js`, `src/ui/dialogue.css`, `src/systems/interaction.js`, `src/scenes/main.js`, `public/monogram.ttf`
**DoD:** standing near a hotspot shows a prompt; pressing E/tapping Interact opens the box with typewriter; links open in a new tab; only the active hotspot glows; Close/Esc dismisses and restores movement; movement frozen while open; no auto-fire on collision; reduced-motion still renders links.

### P4 — Content Wiring (all hotspots)
**Goal:** every hotspot maps to real, verified content; key/boundary parity holds.
- [ ] Author `src/config/content.js` exactly as §6 (all 20 keys). Floating `labels` + `progressBucket`.
- [ ] Verify the set of named `boundaries` objects === set of `content` keys (no orphans either way).
- [ ] Generate the hidden SEO fallback HTML in `index.html` **from `content.js`** (no second hand-written copy).
- [ ] Confirm long/paged entries (Deloitte) page correctly and wrap on mobile.

**Files:** `src/config/content.js`, `index.html` (fallback), `public/map.json` (names), `src/scenes/main.js`
**DoD:** every hotspot opens content matching §2/§6 exactly; all live links resolve; no orphan boundary or key; content-accuracy QA (§9) passes 100%.

### P5 — Map Art in Tiled
**Goal:** replace placeholders with the real outdoor "Dev District," exported per §7.
- [ ] Build the 64×36 outdoor map in Tiled with a **Kenney CC0** tileset; paint zones, years, path hints.
- [ ] `boundaries` layer: unnamed walls + 20 named sensor rects (names === content keys). `spawnpoints` `player` point far-west.
- [ ] Export `public/map.png` (1×) and `public/map.json`; verify alignment with `debug` outlines.

**Files:** `public/map.json`, `public/map.png`, `CREDITS.md`
**DoD:** the world reads as a coherent timeline district; collisions align; every named object matches a content key; spawn is sensible; debug confirms no mis-registration.

### P6 — Responsive / Mobile + Accessibility Fallback
**Goal:** playable on phones; degrades for keyboard-only and no-JS users.
- [ ] Verify tap-to-move on a real device/emulation; `setCamScale` keeps the map filling portrait + landscape (fluid-fill model, no letterbox).
- [ ] Dialogue CSS: responsive sizes, max-width, ≥48px Close + Interact buttons, scroll for long text. Viewport meta + `touch-action:none` on canvas.
- [ ] `.visually-hidden` semantic HTML fallback (from `content.js`) + `<noscript>` compact copy + "View classic site" link.
- [ ] Keyboard-only path: move, open (E/Enter), read, close (Esc/Enter on Close).

**Files:** `index.html`, `src/systems/camera.js`, `src/ui/dialogue.css`, `src/ui/dialogue.js`
**DoD:** on a phone, tap-to-move + Interact button + readable dismissible dialogue, no overflow; keyboard-only fully playable; JS-disabled page shows core content + classic-site link; crawlable text confirmed.

### P7 — Polish (STRETCH-leaning)
**Goal:** delight without bloat.
- [ ] Progress meter `systems/progress.js` ("Discovered X of 17" via `progressBucket`) + 17/17 completion CTA.
- [ ] First-load input banner; top-left title overlay; per-active-hotspot glow/bob.
- [ ] Optional intro/title scene; optional CC0 bgm + sfx with mute toggle persisted to `localStorage` (start on first gesture, no autoplay).
- [ ] Optional fade transitions.

**Files:** `src/systems/progress.js`, `src/scenes/*`, `index.html`, `public/audio/*`
**DoD:** progress increments per unique bucket and survives within the session; completion CTA appears at 17; audio (if added) mutes/persists with no autoplay console errors.

### P8 — Deploy + Link
**Goal:** live, fast, reachable from the main site.
- [ ] Decide host (see §10) and set Vite `base` accordingly **before** building.
- [ ] `npm run build`; verify via `npm run preview`; sweep for asset 404s (`map.png/json`, `spritesheet.png`, `monogram.ttf`, icons, audio).
- [ ] Deploy (Actions or `gh-pages -d dist` or main host static dir). Add `CNAME` if using a custom domain/subpath. If co-hosting under `/game/`, exclude it from the React SPA rewrite/fallback.
- [ ] Add the "Explore in 2D ▸" link on `dominikmachowiak.com`.

**Files:** `vite.config.js`, CI workflow or host config, + a link edit in the main site
**DoD:** game loads at its URL with zero 404s; main-site link works; `npm ci && npm run build` reproduces `dist`.

### P9 — QA & Sign-off
**Goal:** verified against §9.
- [ ] Run the full §9 checklist; content-accuracy audit (diff every string vs §2); cross-browser + mobile; perf budget; fix blockers; re-run.

**DoD:** all §9 functional, content-accuracy, accessibility, and performance criteria pass on Chrome + Firefox + one mobile browser; no console errors; sign-off recorded.

### MVP vs Stretch
**MVP = P0–P6 + P8 + P9:** single coherent map, movement (keys + tap), camera, collisions; press-to-interact dialogue with HTML-safe typewriter + links; all 17 hotspots wired to verified content; responsive/mobile/keyboard; SEO/noscript fallback + classic-site link; deployed and linked; QA-passed.
**Stretch = P7 + extras:** progress meter/completion CTA, intro scene, audio + mute, glow/bob, fade transitions, deep-links (`?stop=deloitte-tower`), graduation to Option B town, privacy-friendly analytics. Everything in Stretch is droppable without breaking the MVP promise.

### Risks & mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| Tiled↔code coordinate misalignment | invisible walls / wrong hotspots | top-left anchor + boundaries as map children; verify with `debug` outlines as a DoD gate (P2/P5). |
| Orphan hotspots (key↔boundary mismatch) | dead zones / runtime errors | automated set-equality check in P4 DoD. |
| **LimeZu/Sprout/Kenmi free-tier license** | takedown / legal | default to **all-Kenney CC0 + monogram CC0**; never use LimeZu free for public deploy. |
| Existing icon PNG license unknown | redistribution risk | re-source CC0/MIT icons; Salesforce certs as text. |
| Deprecated camera API (`camPos`) | warnings now, breaks in v4000 | use `setCamPos`/`setCamScale` only. |
| Sensor flag name differs in v3001 | zones block movement | verify `isSensor` in installed typings; else `area()` w/o body + pure proximity. |
| Wrong Vite `base` on deploy | asset 404s | decide host before P8; prefer subdomain to dodge SPA-rewrite collisions; verify via `preview`. |
| **OneDrive sync** locks files mid-build | flaky `dist`/HMR EPERM on Windows | pause OneDrive sync during dev or exclude `node_modules`/`dist` (or build outside the synced folder). |
| Canvas opaque to crawlers | portfolio invisible to recruiters/SEO | hidden semantic HTML + `<noscript>` (P6); main site stays canonical SEO. |
| Invented testimonial wording | reputational (false quotes) | render testimonials as attributed paraphrase, never verbatim quotes (§6). |
| Scope creep (town/NPCs before MVP) | never ships | enforce the MVP/Stretch cut line. |

---

## 9. Testing & QA Checklist

**Functional**
- [ ] Arrows + WASD move in all 4 directions with correct anim; tap-to-move walks to target.
- [ ] Player collides with every solid wall (no walk-through).
- [ ] Camera follows with the `-100` offset; player stays centered; resize rescales with no distortion/clipping.
- [ ] Standing near a hotspot shows the prompt; **only the active hotspot glows**.
- [ ] Press E / Enter / Interact button opens the correct dialogue (no auto-fire on collision).
- [ ] HTML-safe typewriter renders; links open the correct URL in a new tab (none broken mid-tag).
- [ ] Close button, Esc, and click-outside all dismiss; movement frozen while open, restored on close.
- [ ] Spawn places the player far-west on the path.

**Content-accuracy (gating)**
- [ ] Headline, email (`dominikmachowiak101@gmail.com`), LinkedIn URL exact.
- [ ] 4 persona descriptions match §2.
- [ ] Skills incl. Marketing Cloud Email Specialist + Trailhead Mountaineer.
- [ ] Experience titles/dates: Deloitte 2024–Present, Welcom-Inn 2023–2024, Rubicall 2022–2023, Norbert 2021, OU BSc 2018–2021.
- [ ] Project links: `https://welcom-inn.co.uk/`, `https://www.rubicall.co.uk/`, MERN in progress.
- [ ] Testimonials are attributed paraphrase (no verbatim-quote claim), correct companies.
- [ ] No invented employer, date, project, or quote; no leftover brand logos (asus/adidas/amazon/spotify/skype) in the world.

**Mobile**
- [ ] Tap-to-move + Interact button work; dialogue readable/dismissible; no overflow; canvas doesn't scroll/zoom unintentionally.

**Keyboard-only**
- [ ] Move, open (E/Enter), read, page (←/→), close (Esc) with no mouse; focus trapped while open, restored on close; Close/Interact ≥48px.

**Performance**
- [ ] ~60 FPS desktop; acceptable on a mid-range phone; `pixelDensity:1` confirmed.
- [ ] Initial JS ≤ ~300 KB gzipped; total initial download ≤ ~1.5 MB; `map.png` ≤ ~500 KB.
- [ ] No console errors/warnings (incl. no deprecated-camera warnings) in the production build.

**Cross-browser**
- [ ] Chrome, Firefox, Safari/Edge desktop; iOS Safari or Android Chrome.

**Accessibility**
- [ ] Reduced-motion instant-completes typewriter but still renders links.
- [ ] `.visually-hidden` fallback + `<noscript>` expose all content + classic-site link.
- [ ] Dialogue has `role="dialog"`, `aria-modal`, labelled title/body.

**Deploy**
- [ ] No asset 404s under the deployed `base`; main-site link resolves; `npm ci && npm run build` reproduces `dist`.

---

## 10. Deployment + Linking from dominikmachowiak.com

**Decide the host BEFORE P8** — it determines Vite `base`:

| Host model | `vite.config.js` `base` | Notes |
|---|---|---|
| **Subdomain `game.dominikmachowiak.com` (RECOMMENDED)** | `"/"` | Lowest risk — sidesteps the React SPA catch-all rewrite entirely. |
| Custom-domain subpath `dominikmachowiak.com/game/` | `"/game/"` | Must exclude `/game/` from the main app's SPA fallback (Netlify `_redirects` ordering / Vercel `routes` / nginx `location /game/ { try_files ... }`), or the React `index.html` will swallow the game's asset requests. Add a `CNAME`. |
| GitHub Pages project site `user.github.io/portfolio-game/` | `"/portfolio-game/"` | Use an **absolute** base (not `"./"`) so deep links/trailing-slash differences don't 404 assets. |

```js
// vite.config.js
import { defineConfig } from "vite";
export default defineConfig({
  base: "/",            // ← set per the table above before building
  build: { target: "es2020", assetsInlineLimit: 4096 }, // esbuild default minify
});
```

> Prefer referencing `public/` assets with a base-aware path (`${import.meta.env.BASE_URL}map.png`) rather than bare `"./map.png"` so they resolve correctly regardless of the current route/base. If you keep bare relative paths, you MUST use a flat root deploy and an absolute base for project sites.

**Deploy mechanisms:** (1) GitHub Actions building + publishing `dist/` on push to `main`; or (2) `npm run deploy` (`vite build && gh-pages -d dist`); or (3) upload `dist/` to the main site's static host under the chosen path. **Link in** from `dominikmachowiak.com` with a clearly-labeled button ("Explore in 2D ▸") in the nav or hero. **Link back** with an always-visible "← Back to classic site" in the game header, the SEO fallback, and the `classic-site-portal` hotspot.

---

## 11. Appendix

### A. Agent execution notes (Windows / PowerShell + Vite)

- **Build location:** `C:\Users\domin\OneDrive\Desktop\Websites\portfolio-game-2026\`. Never edit `C:\Users\domin\OneDrive\Desktop\Websites\portfolio-2026\static\...` (compiled deployed artifact). You may copy specific PNGs out of `...portfolio-2026\static\media\` (verified to exist) but treat their licenses as unverified — prefer re-sourcing CC0 icons.
- **Shell:** PowerShell is primary; Bash tool available for POSIX scripts. Use **absolute paths** (Bash cwd resets between calls). Don't `cd`-then-command.
- **Commands:** `npm install`; `npm run dev` (→ `http://localhost:5173`); `npm run build`; `npm run preview` (this is where `base`/asset-path bugs surface).
- **OneDrive caveat:** pause OneDrive sync during dev or exclude `node_modules`/`dist` to avoid EPERM/HMR flakiness and corrupted `dist`.
- **Validate `map.json`** after every Tiled export: (a) confirm valid JSON; (b) confirm object layers literally named `boundaries` and `spawnpoints` exist; (c) assert `set(named boundary objects) === set(content keys)`; (d) load with `debug:true` and eyeball collision outlines against `map.png`.
  ```powershell
  # quick parity check (PowerShell)
  $m = Get-Content .\public\map.json -Raw | ConvertFrom-Json
  $b = $m.layers | Where-Object { $_.name -eq 'boundaries' }
  $named = $b.objects | Where-Object { $_.name } | ForEach-Object { $_.name } | Sort-Object
  $named   # compare against the content.js key list
  ```
- **.gitignore:**
  ```gitignore
  node_modules/
  dist/
  .DS_Store
  *.log
  ```
- **API discipline:** `kaplay()` not `kaboom()`; `k.*` everywhere; `setCamPos`/`setCamScale` (not `camPos`/`camScale`); verify `isSensor`/`body` option names against the installed `.d.ts`; `sliceX/sliceY` are column/row counts of your real sheet (recompute anim indices).

### B. Key code snippets

**`src/kaplayCtx.js` — engine init (KAPLAY):**
```js
import kaplay from "kaplay";

export const k = kaplay({
  global: false,
  touchToMouse: true,
  canvas: document.getElementById("game"),
  pixelDensity: 1,                 // nearest-neighbour pixel art: DPR>1 is wasted work
  crisp: true,                     // nearest-neighbour filtering
  background: [31, 34, 51],        // #1f2233
  debug: import.meta.env.DEV,
});
```

**The map-layer loop (build walls + named sensor zones + spawn):**
```js
// src/scenes/main.js (excerpt)
import { k } from "../kaplayCtx.js";
import { scaleFactor } from "../config/constants.js";
import { content } from "../config/content.js";

export async function buildWorld(makePlayer, setupInteraction, setupCamera) {
  k.loadSprite("map", "./map.png");                       // (loaded in loading.js in practice)
  const mapData = await (await fetch(`${import.meta.env.BASE_URL}map.json`)).json();

  const map = k.add([k.sprite("map"), k.pos(0), k.scale(scaleFactor)]); // default top-left anchor
  const hotspots = [];
  let spawn = k.vec2(0, 0);

  for (const layer of mapData.layers) {
    if (layer.name === "boundaries") {
      for (const o of layer.objects) {
        const zone = map.add([                              // CHILD of map: inherits pos/scale
          k.area({ shape: new k.Rect(k.vec2(0), o.width, o.height) }),
          k.pos(o.x, o.y),
          o.name ? "hotspot" : "wall",
        ]);
        if (o.name) { zone.contentName = o.name; hotspots.push(zone); }      // non-solid sensor
        else        { zone.use(k.body({ isStatic: true })); }               // solid wall
      }
    }
    if (layer.name === "spawnpoints") {
      const p = layer.objects.find((o) => o.name === "player") ?? layer.objects[0];
      spawn = k.vec2(p.x, p.y);
    }
  }

  const player = makePlayer(map, spawn);   // player added as child of map at spawn, scaled
  setupCamera(player);
  setupInteraction(player, hotspots);
}
```

**The press-to-interact handler (proximity + explicit press):**
```js
// src/systems/interaction.js
import { k } from "../kaplayCtx.js";
import { INTERACT_RADIUS } from "../config/constants.js";
import { openDialogue, dialogueIsOpen } from "../ui/dialogue.js";

export function setupInteraction(player, hotspots) {
  let active = null;

  k.onUpdate(() => {
    if (dialogueIsOpen()) { hidePrompt(); setGlow(null); return; }
    active = null;
    let best = INTERACT_RADIUS;
    for (const h of hotspots) {
      const d = player.worldPos().dist(h.worldPos());   // center distance; use AABB for wide zones
      if (d < best) { best = d; active = h; }
    }
    setGlow(active);                       // glow ONLY the active hotspot (perf)
    active ? showPromptAt(active) : hidePrompt();
  });

  const tryInteract = () => { if (active && !dialogueIsOpen()) openDialogue(active.contentName); };
  k.onKeyPress("e", tryInteract);
  k.onKeyPress("enter", tryInteract);
  document.getElementById("interact-btn")?.addEventListener("click", tryInteract);
}
```

**`displayDialogue` overlay (HTML-safe typewriter, paging, focus trap):**
```js
// src/ui/dialogue.js
import { content } from "../config/content.js";

const el = (id) => document.getElementById(id);
const overlay = () => el("dialogue-overlay");
let isOpen = false, page = 0, entry = null, raf = 0, lastFocus = null;
export const dialogueIsOpen = () => isOpen;

const reduceMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function openDialogue(name, { onClose } = {}) {
  entry = content[name];
  if (!entry || isOpen) return;
  isOpen = true; page = 0; lastFocus = document.activeElement;
  el("dialogue-title").innerHTML = entry.title;
  el("dialogue-subtitle").textContent = entry.subtitle ?? "";
  const icon = el("dialogue-icon");
  if (entry.icon) { icon.src = entry.icon; icon.hidden = false; } else icon.hidden = true;
  overlay().classList.remove("hidden");
  renderPage();
  el("dialogue-close").focus();

  el("dialogue-close").onclick = () => close(onClose);
  el("dialogue-next").onclick  = () => { if (page < entry.pages.length - 1) { page++; renderPage(); } };
  el("dialogue-prev").onclick  = () => { if (page > 0) { page--; renderPage(); } };
  document.addEventListener("keydown", onKey);
  overlay().onclick = (e) => { if (e.target === overlay()) close(onClose); };
}

function renderPage() {
  cancelAnimationFrame(raf);
  const body = el("dialogue-body");
  body.innerHTML = entry.pages[page].html;          // parse HTML so <a> nodes exist
  const total = entry.pages.length;
  el("dialogue-pager").textContent = total > 1 ? `${page + 1} / ${total}` : "";
  el("dialogue-prev").hidden = total < 2;
  el("dialogue-next").hidden = total < 2;

  if (reduceMotion()) return;                        // reduced motion: show full text + links
  // HTML-safe typewriter: hide all text nodes, reveal char-by-char without slicing tags
  const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
  const texts = []; let n; while ((n = walker.nextNode())) texts.push({ node: n, full: n.nodeValue });
  texts.forEach((t) => (t.node.nodeValue = ""));
  let ti = 0, ci = 0;
  const step = () => {
    if (ti >= texts.length) return;
    const t = texts[ti];
    t.node.nodeValue = t.full.slice(0, ++ci);
    if (ci >= t.full.length) { ti++; ci = 0; }
    raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
}

function onKey(e) {
  if (e.key === "Escape") return close();
  if (e.key === "ArrowRight") el("dialogue-next").click();
  if (e.key === "ArrowLeft")  el("dialogue-prev").click();
  if (e.key === "Tab") {                              // simple focus trap
    const f = overlay().querySelectorAll("button:not([hidden]), a[href]");
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
    else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
  }
}

function close(onClose) {
  cancelAnimationFrame(raf);
  overlay().classList.add("hidden");
  document.removeEventListener("keydown", onKey);
  isOpen = false; entry = null;
  lastFocus?.focus?.();
  onClose?.();
}
```

**Camera follow (non-deprecated API):**
```js
// src/systems/camera.js
import { k } from "../kaplayCtx.js";
import { CAM_Y_OFFSET } from "../config/constants.js";

export function setCamScale(k2 = k) {
  const r = k2.width() / k2.height();
  k2.setCamScale(k2.vec2(r < 1 ? 1.5 : 1.8));     // more zoom in portrait
}
export function setupCamera(player) {
  setCamScale();
  k.onResize(() => setCamScale());
  k.onUpdate(() =>
    k.setCamPos(player.worldPos().x, player.worldPos().y + CAM_Y_OFFSET)
  );
}
```

---

**Key file paths (canonical, absolute):**
- Build root: `C:\Users\domin\OneDrive\Desktop\Websites\portfolio-game-2026\`
- Entry/markup: `...\portfolio-game-2026\index.html`
- Engine context: `...\portfolio-game-2026\src\kaplayCtx.js`
- Scenes: `...\portfolio-game-2026\src\scenes\{loading,main}.js`
- Player: `...\portfolio-game-2026\src\entities\player.js`
- Systems: `...\portfolio-game-2026\src\systems\{camera,interaction,progress}.js`
- UI: `...\portfolio-game-2026\src\ui\{dialogue.js,dialogue.css}`
- Config: `...\portfolio-game-2026\src\config\{constants.js,content.js}`
- Assets: `...\portfolio-game-2026\public\{map.png,map.json,spritesheet.png,monogram.ttf,icons\*,audio\*}`
- Build config: `...\portfolio-game-2026\vite.config.js`
- Read-only asset source (verified to exist; licenses unverified): `C:\Users\domin\OneDrive\Desktop\Websites\portfolio-2026\static\media\`
- Link target (never edit): `https://dominikmachowiak.com`
