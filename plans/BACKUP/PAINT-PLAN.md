# PAINT — DominikOS app build plan

A complete, implementation-ready plan for adding a classic raster paint program to DominikOS,
following the conventions used by the in-app games and the existing apps.

Status: **PLAN ONLY — not built.** Root: `C:\Users\domin\OneDrive\Desktop\Websites\dominikos\os`.

---

## 0. What this is

A faithful early-2000s bitmap paint program: a `<canvas>` you draw on with a tool palette
(pencil, brush, line, shapes, fill, eraser, airbrush, text, eyedropper), a colour palette,
undo/redo, clear, and PNG export. It is a real, working tool (unlike the Skype homage). "Paint" is
a generic descriptive name (like "Minesweeper"); the gate only bans "Microsoft" in titles, so the
name is fine. **All tool icons, the palette and chrome are original, drawn in code/SVG** — nothing
traced from any product. Pixel-style icons + hard borders to match the XP desktop.

**Architecture:** it's an **app, not a game** — DOM chrome + a `<canvas>`. No `useGameLoop`/rAF; it's
event-driven (pointer strokes). The only timer is the airbrush spray while the button is held, gated
on the §8.4 active booleans. The small amount of genuinely-testable logic (flood-fill, colour utils,
Bresenham line) lives in a pure module; the rest is canvas drawing in the component.

---

## 1. Files & integration

| File | Purpose |
|---|---|
| `src/os/apps/paint/canvas.ts` | pure helpers: floodFill, hex↔rgba, bresenham, palette (LOCKED, unit-tested) |
| `src/os/apps/paint/canvas.test.ts` | vitest headless suite (§6) |
| `src/os/apps/paint/PaintApp.tsx` | canvas UI + tools + input |
| `registry/paint.json` | manifest (`kind:"react"`, `category:"apps"`) |
| `public/icons/paint.svg` | original 48×48 icon (a pixel paint-palette + brush) |
| `src/styles/globals.css` | a `/* ==== Paint ==== */` block |
| `ASSET-CREDITS.md` | one credit row |
| `src/os/registry.ts` | one line into `componentById` |

**`registry/paint.json`:**
```json
{
  "id": "paint",
  "title": "Paint",
  "kind": "react",
  "icon": "/os/icons/paint.svg",
  "category": "apps",
  "desktop": { "show": true, "order": 6 },
  "startMenu": { "show": true, "group": "Programs" },
  "window": { "width": 640, "height": 500, "minWidth": 460, "minHeight": 360, "singleton": true, "maximizedOnMobile": true }
}
```
**`registry.ts`** → `componentById`: `paint: lazy(() => import('./apps/paint/PaintApp')),` (games resolve
via componentById too; the same map serves custom apps). Desktop shows it (order 6, after the games).

---

## 2. Pure module — `canvas.ts` (LOCKED, unit-tested)

```ts
export interface RGBA { r: number; g: number; b: number; a: number; }
export function hexToRgba(hex: string): RGBA;              // '#rrggbb' -> {r,g,b,255}
export function rgbaEq(a: RGBA, b: RGBA, tol?: number): boolean;

// Classic 28-swatch palette (2 rows) — a functional convention, authored here (no vendor file).
export const PALETTE: readonly string[];                  // 28 hex strings

// Scanline flood fill over an ImageData-like buffer. Returns the # of pixels changed. Pure: mutates
// the passed Uint8ClampedArray, no DOM. Tolerance lets "fill similar" match near colours.
export function floodFill(data: Uint8ClampedArray, w: number, h: number,
                          x: number, y: number, fill: RGBA, tol: number): number;

// Integer Bresenham points between two cells — used to interpolate fast pencil strokes so there are
// no gaps at speed.
export function linePoints(x0: number, y0: number, x1: number, y1: number): [number, number][];
```
Flood fill is the classic "paint bucket": sample the target colour at (x,y); 4-connected scanline
fill of all pixels within `tol` of it; stop at the region boundary. Guard: no-op if fill ≈ target.

---

## 3. Tools (the tool palette)

| Tool | Behaviour |
|---|---|
| **Pencil** | 1-px freehand; interpolate with `linePoints` between pointer samples |
| **Brush** | round nib, size 1–4 from the options tray; `ctx.lineCap='round'` stroke |
| **Airbrush** | random dots in a radius while held (a `setInterval` gated on §8.4) |
| **Line** | drag start→end; live preview on an overlay layer, commit on release |
| **Rectangle** | outline / filled / both (from options); live preview |
| **Ellipse** | outline / filled / both; live preview |
| **Fill (bucket)** | `floodFill` at the click point with the current colour + tolerance |
| **Eraser** | brush that paints the background colour |
| **Eyedropper** | pick the pixel colour under the click → becomes the current colour |
| **Text** | drop a text caret; type; commit to the canvas (basic, optional for v1) |

**Two-layer canvas:** a committed `<canvas>` (the artwork) + a transparent **preview** `<canvas>`
on top for live shape/line dragging, so a drag can be cancelled cleanly and shapes don't smear.
Commit on pointer-up by blitting the preview onto the artwork.

**Colours:** current (foreground) + secondary (background); **left-drag paints foreground,
right-drag paints background** (classic). The palette swatches set foreground on left-click,
background on right-click. A "more colours" swatch opens a small custom picker (hue/hex).

**Options tray:** contextual to the tool — brush size, shape mode (outline/fill/both), fill
tolerance, airbrush density.

---

## 4. UI plan — `PaintApp.tsx`

Layout: **left tool palette** (icon buttons in a 2-wide grid, raised bevels), **canvas area**
(scrollable, checkerboard behind transparency, the two stacked canvases), **bottom colour palette**
(the 28 swatches + current/secondary chips). A thin **menu strip** (File: New/Clear, Save PNG;
Edit: Undo/Redo; Image: size). A **status line** (cursor x,y · canvas w×h · current tool).

- **Undo/redo:** snapshot the artwork canvas to an off-screen `ImageData` (or a compact `toDataURL`)
  before each committed action; keep a bounded stack (e.g. 20 states) + redo stack. Ctrl+Z / Ctrl+Y.
- **Export:** `canvas.toBlob` → download `painting.png` (reuse the DocWindow download idiom).
- **DPR-aware** backing store for crisp strokes; pointer→canvas mapping accounts for scroll + scale.
- **Pixel/XP feel:** tool-icon SVGs use `shape-rendering:crispEdges`; `image-rendering:pixelated` on
  the canvas when zoomed; hard 2-px bevels on every button; no border-radius anywhere.
- **§8.4:** no rAF. The airbrush interval and any caret blink stop when `!active`.
- **Sound:** optional soft `tone()` tick on tool select / fill (gated on `prefs.muted`).
- **a11y:** every tool + swatch is a real `<button>` with an `aria-label`; tool shortcuts (P pencil,
  B brush, L line, R rect, E ellipse, F fill, X eraser, K eyedropper); an `sr-only` `aria-live`
  announces tool + colour changes and "filled N pixels". The canvas itself carries an
  `aria-label` describing the drawing surface. (Free-hand drawing is inherently visual; we make the
  *controls* fully keyboard-operable, matching the a11y bar the Bubble review set.)
- **reducedMotion:** no caret blink / airbrush jitter easing; drawing is identical.

---

## 5. Resolved decisions

1. **App, not a game** — `category:"apps"`, desktop icon + Programs menu.
2. **Two-canvas (artwork + preview)** so shape/line drags preview and cancel cleanly.
3. **Undo via bounded ImageData snapshots** (≤20) — simple and correct; no per-stroke diffing.
4. **Left = foreground, right = background**, palette swatches set each on left/right click.
5. **Flood fill is scanline + tolerance** in the pure module (testable, no DOM).
6. **Original pixel icons + 28-swatch palette**; PNG export via `toBlob`.
7. **Text tool optional in v1** (pencil/brush/shapes/fill/eraser/eyedropper/airbrush are the core).

---

## 6. Unit test plan (`canvas.test.ts`, vitest, headless — no DOM)

1. `hexToRgba('#ff8800')` → `{255,136,0,255}`; round-trips via a `rgbaToHex` helper.
2. `floodFill` fills a solid region and returns the exact pixel count; leaves other regions untouched.
3. `floodFill` respects a boundary colour (a drawn line splits two regions → only one fills).
4. `floodFill` with tolerance fills near-colours; tolerance 0 fills only exact matches.
5. `floodFill` is a no-op (returns 0) when the fill colour already equals the target.
6. `floodFill` on a 1×1 and on the corner pixel — no out-of-bounds.
7. `linePoints` is symmetric-ish, contiguous (each step moves ≤1 in x and y), hits both endpoints,
   and handles vertical/horizontal/45° and steep/shallow slopes.
8. `PALETTE` has 28 valid `#rrggbb` entries.

---

## 7. Implementation phases

- **P1 — Pure module:** `canvas.ts` + `canvas.test.ts` green (bounded `vitest run`).
- **P2 — UI:** `PaintApp.tsx` (two canvases, tool palette, colour palette, options, menu, status).
- **P3 — Tools:** pencil/brush/airbrush/line/rect/ellipse/fill/eraser/eyedropper wired; undo/redo; export.
- **P4 — Wire-up:** manifest, registry line, icon, credits, CSS.
- **P5 — CI:** `npm run ci` green. One bounded run.
- **P6 — Review + deploy:** adversarial review (a11y, §8.4, pointer-mapping edge cases, undo bounds) →
  fix → `deploy:local` → manual test → Netlify.

Each heavy run bounded and one-at-a-time (process-hygiene rule).

---

## 8. Open questions for Dominik

1. **Text tool** in v1, or ship the drawing tools first?
2. **Canvas size** — fixed 560×360-ish, or a resizable/"New image size" dialog?
3. **Zoom** (2×/4× pixel view) in v1, or later?
4. Desktop icon on by default (plan assumes yes, order 6)?
