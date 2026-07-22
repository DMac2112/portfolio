# game1 (Claude) vs game2 (Gemini) — 2D-Game Portfolio Renditions

## TL;DR Verdict

**game1 (Claude) is the more complete, correct, and honestly-built artifact; game2 (Gemini) has better engineering *taste* in a few isolated places but ships those ideas half-wired.** game1 is best at *finish and coherence*: a single-street "Dev District" whose geography literally maps a 2018→present career timeline, 100%-original and fully-rendered pixel art from a zero-dependency PNG encoder, a complete and accessible dialogue layer (typewriter, full keyboard, focus management, click-outside), a correct HUD, and deep integration into the live portfolio. game2 is best at *two specific architectural choices*: a genuinely data-driven `addLevel` tile-string map (drop a letter into an ASCII grid to add a hotspot) and finer content granularity (20 standalone hotspots vs 17, with LinkedIn, each project, and each testimonial broken out). But game2 self-labels "Prototype," ships ~2.3 MB of malformed, never-loaded jimp tile textures, renders the world as flat colored rectangles over a *borrowed* JSLegendDev reference spritesheet, has no tile colliders (you walk on water and off the map), and ships a HUD that's wrong three different ways.

## Feature Matrix

| Dimension / Feature | game1 (Claude) | game2 (Gemini) |
|---|---|---|
| **Build / tooling** | ⚠️ Buildless ES module, KAPLAY via CDN — zero deps, no install | ✅ Vite 4 project — HMR, minify, scalable structure |
| **Map technique** | ⚠️ Pre-baked `map.png`, hotspots by absolute coords | ✅ Data-driven `addLevel` tile-string + `hotspotDefs` lookup |
| **World theme** | ✅ Town/career timeline — W→E = 2018→now, semantically meaningful | ⚠️ Archipelago islands — pretty but spatially arbitrary |
| **Hotspot visuals** | ✅ Distinct pixel-art props (buildings, mailbox, corkboard, portal) | ❌ Identical 48×48 colored squares + text label |
| **Content coverage (#placed)** | ⚠️ 17 placed (projects bundled, LinkedIn inside contact) | ✅ 20 placed (each project/testimonial/LinkedIn standalone) |
| **Character sprite** | ✅ Original 4-frame × 3-dir animated hero | ❌ Borrowed JSLegendDev reference spritesheet |
| **Asset pipeline** | ✅ Zero-dep PNG encoder, 12 valid assets, 100% used | ❌ jimp deps → 3 JPEG-in-`.png` files, never loaded (dead) |
| **Collision** | ✅ Clamped road bounds — contained, can't leave world | ❌ No tile colliders — walk on water, off the edge into void |
| **Dialogue features** | ✅ Typewriter+skip, paging, full keyboard, click-outside | ⚠️ Paging works, but mouse-only, Esc-only close |
| **HUD correctness** | ✅ `/ 17` correct, single source of truth, complete state | ❌ Stale "0 of 5", `total=17` vs 20 spots, can hit "18 of 17" |
| **Mobile** | ✅ Portrait camera fit, safe-area insets, contextual button | ⚠️ Tap-to-move works; no portrait fit, no safe-area |
| **Accessibility / SEO** | ✅ noscript fallback, focus mgmt, ARIA, meta/theme-color | ❌ No noscript, no description, no focus mgmt |
| **Site integration** | ✅ Wired into live portfolio (navbar CTA, cards, pill) | ❌ Standalone, unlinked "Prototype" |
| **Known bugs** | ✅ Minor (unused `area()`, on-rails feel) | ❌ Several (collision, HUD ×3, dead assets, no resize) |

## Dimension-by-Dimension

### Content coverage & fidelity

Both games represent **100% of the real portfolio** — all 4 personas, education plus 4 jobs (incl. Deloitte's 2-page detail), 3 projects, 3 testimonials, skills/certs, email, LinkedIn, and the classic-site exit — with zero missing items, zero duplicates, and zero invented facts. All five outbound links (rubicall.co.uk, welcom-inn.co.uk, mailto, LinkedIn, dominikmachowiak.com) are live in each.

- **game2 edge — granularity:** 20 standalone, individually-discoverable locations vs game1's 17. game2 splits its 3 projects into separate spots (`project-welcominn`/`-rubicall`/`-mern`) and breaks LinkedIn out from contact (`linkedin-postbox`), so more of the portfolio is reachable as its own "place" rather than buried in a paged dialogue.
- **game1 edge — fidelity:** copy is slightly richer (fuller Deloitte sentence; notably fuller Skills list — game1 keeps TypeScript, Sass, Redux, Node, GraphQL, Git, Figma, which game2 drops entirely). So despite *more* hotspots, game2 carries slightly *less* skills detail. game1 also renders dialogue via a typewriter that preserves embedded HTML/links, where game2 sets `innerHTML` directly.

### World design

- **game1 edge — coherence:** the town/timeline geography *is* the résumé. One legible axis of travel (west→east = 2018→present) lets a recruiter read the career as they walk it; themed props (mailbox = contact, corkboard = testimonial, ★-topped tower = current job, glowing portal = exit) telegraph their meaning before the label is even read. Spawn is intentional, beside the "Start Here" sign; bounds keep you in the world.
- **game2 edge — ambition of layout:** a free-roam 6-island archipelago joined by bridges is a less "on-rails" space than game1's single street, and the finer hotspot split reads as more thorough. But the islands→content mapping is arbitrary (no narrative reason Deloitte and the OU degree sit on different islands), and with no collision you can cut straight across the water, undercutting the entire bridge layout.

### Tech / architecture

- **game2 edge — intended architecture:** the Vite project (HMR, tree-shaking, `/public` serving, code-splitting headroom) is the more conventional, team-scalable setup; the dialogue overlay is cleanly extracted into `ui.js` with a tidy `setupUI()` interface; and the `addLevel` tile-string map is the best layout-authoring story of the two.
- **game1 edge — executed architecture:** every part of game1's pipeline is *wired up and used*. The `gen-assets.js` generator produces 100% of the art the game renders; the dialogue layer is complete and accessible; the progress counter is internally consistent; and it's actually shipped into the live site. game2's most sophisticated-looking pieces are partially or entirely inert: the jimp art pipeline is unused, the player's `body()` collides with nothing, and the `ui.js` module split leaks through a `window.gameInteract` global. game2 reaches for the better tools (`body()`/`area()`, jimp textures, Vite bundling) and wires up none of them to effect; game1 chose cruder mechanisms (bounds-clamping, inline dialogue) that actually work.

### Art / assets

- **game1 edge (decisive):** a coherent, fully-original, fully-rendered pixel-art set from a zero-dependency, hand-rolled PNG encoder — a textured map, an animated 4-frame × 3-direction hero, 6 distinct per-company buildings, and signpost/corkboard/mailbox/portal props. All 12 assets are valid PNGs and all are loaded and rendered. Authorship signal is strong: nothing is borrowed, nothing is dead weight.
- **game2 edge (narrow, theoretical):** the *intent* of a per-biome textured archipelago is more ambitious than a single street — but the execution failed end to end. The three jimp textures are JPEG data written into `.png` filenames (~2.3 MB), are never loaded, and the world renders as flat `k.rect()` color fills instead. The only real sprite in the game is the borrowed JSLegendDev reference spritesheet, raising a provenance/licensing concern. So game2's only authored art is broken and unused, and its only used art is borrowed.

### UX / interaction

- **game1 edge — integrity & accessibility:** real movement bounds (no walking on water or off-world), click-the-object-to-read, contextual `▶ View {label}` button text, and a "don't moon-walk when blocked" touch. The dialogue is keyboard-drivable end to end (Enter/arrows/Esc), respects `prefers-reduced-motion`, closes on click-outside, and moves focus into the modal. Mobile is genuinely considered: portrait camera refit, safe-area insets, locked zoom. The HUD has a single source of truth (`TOTAL = hotspots.length`) and a green complete state.
- **game2 edge — free-roam feel:** the multi-island map reads as a more open, exploratory space, and tap-to-move works. But the execution gaps are the story: no colliders at all (the most significant interaction defect in either game), dialogue paging that's mouse-only with no focus management, no resize/portrait handling, and a HUD that's stale ("0 of 5"), wrong-denominator (`total=17` vs 20), and can exceed 100% ("18 of 17").

## Strengths & Weaknesses

### game1 (Claude)
**Strengths**
- Coherent world theme where geography encodes the career timeline.
- Fully-original, correctly-encoded pixel art (hero + map + 6 buildings + 4 props), 100% utilized, zero deps, zero dead assets.
- Complete, accessible dialogue: typewriter+skip, full keyboard, focus management, click-outside, reduced-motion.
- Correct HUD with a single source of truth; can't exceed 100%.
- Real mobile consideration (portrait fit, safe-area) and SEO/noscript fallback.
- Deeply integrated into the live portfolio.

**Weaknesses**
- Less data-driven map authoring — editing layout means editing coords and re-running the generator.
- "On-rails" single-street feel from bounds-clamping; less free-roam.
- 3 fewer hotspots — projects bundled into one building, LinkedIn folded into contact.
- `area()` on buildings is unused (minor redundancy; bounds-clamping does the real work).

### game2 (Gemini)
**Strengths**
- Conventional, scalable Vite build (HMR, minify, code-split headroom).
- Genuinely data-driven `addLevel` tile-string map — best layout-authoring ergonomics.
- Cleaner *intended* module split (dialogue extracted to `ui.js`).
- Finest content granularity — 20 standalone hotspots (each project, each testimonial, LinkedIn separate).
- Free-roam archipelago reads as a more ambitious, open space.

**Weaknesses**
- No tile colliders — walk on water and off the map into the void (most significant defect).
- ~2.3 MB of malformed (JPEG-in-`.png`), never-loaded jimp textures; world is flat rectangles.
- Only real sprite is the borrowed JSLegendDev reference — provenance concern, no authored character.
- HUD wrong three ways: stale "0 of 5", `total=17` vs 20 spots, can reach "18 of 17."
- Dialogue mouse-only (no keyboard paging), no focus management, no click-outside.
- No portrait/resize camera handling, no noscript/SEO, no theme-color/favicon.
- `body()` on player is dead weight; `ui.js` split leaks via a `window.gameInteract` global.
- Slightly thinner copy (drops the secondary skills stack).
- Standalone, un-integrated "Prototype."

## Recommendation

**Take game1 forward as the base.** It is the shippable artifact: correct, coherent, original, accessible, and already wired into the live portfolio. game2's headline advantages — full 20-hotspot coverage, the `addLevel` tilemap, and the Vite structure — do *not* outweigh game1's polish, because in game2 those ideas are largely concept rather than working execution (the tilemap has no colliders, the granular hotspots feed a broken counter, and the build bundles dead art). Polish that works beats architecture that doesn't.

**But borrow three specific things from game2:**

1. **Content granularity (highest value).** Adopt game2's 20-spot split into game1 — give each of the 3 projects its own building, break LinkedIn out of the contact mailbox into its own prop, and keep testimonials separate (game1 already does). This is game2's strongest, genuinely-better design choice. Critically, fix the HUD denominator as you do it (`TOTAL = hotspots.length` will stay honest automatically, since game1's counter is already single-source).

2. **Data-driven map authoring.** Migrate game1's absolute-coordinate hotspot placement toward a tile-string + lookup approach like game2's `addLevel`/`hotspotDefs`, so adding a location is "drop a letter in the grid." Keep game1's *baked, textured* `map.png` and per-kind pixel-art props as the rendered layer — i.e., take game2's authoring ergonomics without inheriting its flat-rectangle visuals.

3. **Vite (optional, only if it grows).** If the game expands to multiple scenes/files, adopt game2's Vite structure and the cleaner `ui.js` module boundary — but drop the `window.gameInteract` global in favor of game1's direct closure wiring, and do **not** carry over the jimp dependency (it produced only dead, malformed assets).

**The ideal merge:** game1's original art, working collision/bounds, complete accessible dialogue, correct single-source HUD, mobile/SEO polish, and live-site integration — extended with game2's 20-hotspot granularity and its data-driven tile-string map authoring, while keeping game1's rendered props rather than game2's colored squares. That yields game1's finish with game2's coverage and authoring ergonomics, and discards game2's three dead spots: the unused jimp pipeline, the non-colliding tiles, and the borrowed character sprite.
