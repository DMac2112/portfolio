# game1 "Dev District" — Mobile Portrait Implementation Plan

## 1. TL;DR

**Both-ways is feasible but not recommended.** You do *not* need to convert the whole thing — the horizontal lock lives in exactly three enumerable places (baked map, hotspot coords, BOUNDS/camera), and movement/interaction/depth-sort are already orientation-agnostic. Camera-only is free polish but does **not** fix portrait traversal; true both-ways (responsive) is the best UX but doubles your maintenance surface forever for a solo-maintained portfolio.

**Recommendation: ship the camera tweak now as free polish, then do a full vertical conversion (top-to-bottom on *both* platforms) as the real fix, built on top of the game2-style data-driven tilemap refactor.** This collapses everything to one code path and one data model, keeps effort bounded (~1 day), and leaves the door open to escalate to responsive both-ways later — but only if the desktop "narrow ribbon" look proves unacceptable in practice.

---

## 2. Current state — what locks game1 to horizontal today

Three independent subsystems bake in the west→east (x = timeline) orientation. All three analyses agree on the exact sites:

- **`gen-assets.js` → `buildMap()` (L68–101):** emits a baked `map.png` at `COLS=64 × ROWS=16 × T=16px` = 1024×256 native → 3072×768 world at `SCALE=3`. The dirt road is painted into **tile rows 7–9** (`pathTop=7, pathBot=9`), running the full width; `onPath` (L74) is a **row** test. Scenery (~90 trees/bushes/flowers) is scattered into the grass rows around it. Nothing reads tile data at runtime — this generator is the *only* source of ground orientation.
- **`content.js` → `hotspots` (L13–40):** every hotspot fans out on **x (150→2640)** = the 2018→now timeline. `y` only encodes one of three bands: `BASE_N=344` (north buildings), `BASE_S=560` (south props), `ROAD_MID=408` (on-road). The `welcome` copy (L48–49) literally says "the street runs my career **left-to-right** — the gardens to the **south**…", and `INTRO_HINT` echoes it — so orientation is baked into *content*, not just geometry.
- **`main.js` → `BOUNDS` (L22) + camera (L168, L237):** `BOUNDS={x0:24,x1:3048,y0:340,y1:600}` — a 3024-wide × 260-tall corridor. `fitCam()` sets `setCamScale(r<1 ? 0.85 : 1.15)` where `r=width/height`; camera follows `player.pos.x, player.pos.y-50`.

**Already orientation-free (no restructuring needed):** movement (`onUpdate` normalizes a free 2D `dx,dy` vector), tap-to-move (`k.toWorld(mousePos)`), depth sort (`z = pos.y`), interaction radius (`INTERACT_R=168` Euclidean), label/prompt "above sprite" geometry, `SCALE`, anchors, and all of `index.html`. These only warrant *tuning* for the tighter cross-axis crowding a vertical layout creates.

The key insight across all three analyses: **only placement, ground, and framing are directional.** That is ~80% of the work; everything else falls out.

---

## 3. The three options

### Option A — Camera-only quick fix

**How it works:** In `fitCam()` (`main.js:168`), push the portrait zoom further out and re-bias the `-50` vertical follow offset so more road height is centered. E.g. `setCamScale(r < 0.7 ? 0.55 : r < 1 ? 0.7 : 1.15)`. No content, asset, or collision changes.

- **Mobile UX:** Poor → mediocre. It *can* fit both north buildings (`BASE_N`) and south gardens (`BASE_S`) on screen at once (a genuine framing win over today's awkward 344↔560 crop). But the world is still 3072px wide in a ~400px portrait viewport — you either shrink sprites and `size:12` labels to illegible specks, or you keep a long horizontal side-scroll with nothing visible ahead/behind. Zoom changes *how much* you see, not the *shape* of what must be traversed. Aggressive zoom-out also makes tap-to-move imprecise.
- **Desktop UX:** Unchanged / great. The landscape street stays ideal; the change is guarded by `r<1` so there is zero desktop regression.
- **Effort: S** (~10 min, one function).
- **Verdict:** Legitimate polish — ship it regardless because it's free — but it is **not** the fix. A 3072-wide corridor is intrinsically landscape; the core portrait complaint survives.

### Option B — Full vertical conversion (top-to-bottom on both platforms)

**How it works:** Transpose all three lock points so **y = timeline** (2018 top → now bottom). `gen-assets.js`: rebuild the map tall (`COLS=16, ROWS=64`) with the road as a **vertical column band** (`pathLeft…pathRight`), edge seams and scatter filter flipped to columns. `content.js`: swap x↔y on all 17 hotspots, rename `BASE_N/BASE_S/ROAD_MID` → `BASE_W/BASE_E` (x-constants) + a new road-center x, and rewrite the `welcome`/`INTRO_HINT` copy ("runs top-to-bottom", "gardens to the right"). `main.js`: `BOUNDS` becomes tall+narrow, player spawn moves to the top of the road, `fitCam`'s scale branch intent inverts, and the camera lead flips from `pos.y-50` toward the travel direction.

- **Mobile UX:** Good. Vertical scroll-down is the natural portrait gesture; the timeline fits the tall screen; sprites and labels stay readable.
- **Desktop UX:** Regresses. A wide monitor now shows a narrow vertical road with big dead grass margins left/right, and you only ever walk top→bottom — you lose the "whole career at a glance" landscape moment. *Mitigable cheaply*: widen the world band and let the existing `r<1` vs `r≥1` camera split give landscape a comfortable framed-column feel from one geometry (≈80% of responsive's benefit at ≈20% of the cost).
- **Effort: M.** A bounded, one-time transpose across three enumerable files + art regen + all 17 coords + copy rewrite. Not an open-ended rewrite.
- **Verdict:** Best maintainability of the three — **one code path, one data model.** The one real cost (desktop ribbon) is mitigable without going full responsive.

### Option C — Responsive both-ways (horizontal on landscape, vertical on portrait, from one codebase)

**How it works:** Make layout data-driven. Replace hardcoded `{x,y}` in `content.js` with an ordered `STATIONS` list carrying `{order/implicit index, lane, span}` (lane: −1 / 0 / +1 = which side of the road). A single pure `layout(orientation, stations)` function emits the `{x,y}` array the rest of `main.js` already consumes — main axis = x in landscape, y in portrait. Ground becomes a runtime `k.addLevel` tile-string (game2 approach) whose grid is the transpose of the other orientation. `BOUNDS`, camera offset, and `fitCam` all become **outputs** of `layout()`. Orientation flips trigger a debounced **scene rebuild** (`k.go("main", {orientation, resume})`), preserving `visited` (module-level) and the player's fractional timeline position. Labels move to the cross-axis gutter in portrait to avoid stacked-station overlap (the single biggest visual gotcha).

- **Mobile UX:** Good — portrait gets a true vertical street, first-class.
- **Desktop UX:** Great — keeps the wide landscape street where it reads beautifully.
- **Effort: L** (~1.5–2 working days). *Requires* the data-driven tilemap refactor before it's even sane to attempt, plus orientation-aware labels (the fiddly bit) and runtime rebuild plumbing.
- **Verdict:** Theoretically the best UX (right layout per screen), but it doubles the surface area **forever**: every new hotspot placed in two coordinate systems, two BOUNDS, two camera regimes to keep in sync. Heavy standing complexity for a one-person portfolio.

---

## 4. Recommendation

**Do A now as free polish; commit to B (full vertical) as the real fix, implemented on top of the game2-style data-driven tilemap refactor. Escalate to C only if the desktop ribbon proves unacceptable.**

Rationale:

- **A alone is a non-fix** — honestly, it trades "tiny sprites" for "narrow window." But it's a 10-minute, zero-regression win, so there's no reason not to ship it.
- **B is bounded, not open-ended.** The horizontal lock lives in exactly three enumerable places, so vertical is a one-time transpose — and it collapses everything to a single source of truth, which is the decisive maintainability win for a solo maintainer.
- **C's UX edge is real but its cost is permanent.** Two orientations to keep in sync forever is a poor trade for a personal portfolio, and C *depends on* the tilemap refactor anyway.
- **The tilemap refactor is the shared enabler.** Doing B on top of a data-driven `k.addLevel` map (rather than a second baked PNG) means the world size derives from data, eliminates the three hand-synced width/height constants, converges game1 with game2 architecturally, and — critically — leaves C reachable later as an incremental step (add a `layout(orientation)` switch) rather than a rewrite. This is the "80% of C's benefit at 20% of its maintenance cost" path: one vertical geometry, with the existing `r<1` vs `r≥1` camera split giving each orientation a decent feel.

---

## 5. Phased implementation plan (recommended approach)

### Phase 0 — Ship the free polish (Option A)
- [ ] `main.js` `fitCam()` (L168): push portrait zoom out and reduce the vertical follow bias so more road height is centered. Guard with `r<1` so desktop is untouched.
- [ ] Manual check on a phone in portrait — confirm no desktop regression.
- [ ] Commit independently; this is safe to ship before any of the below.

### Phase 1 — Data-driven tilemap refactor (the enabler; adopt game2's tile-string map)
- [ ] `gen-assets.js`: replace `buildMap()`'s single baked `map.png` with a **small tile atlas** — `tile_grass.png`, `tile_dirt.png`, `tile_edge_*`, plus scenery tiles (tree/bush/flower promoted from the inline `buildMap` draws to standalone 16×16 tiles).
- [ ] `main.js` (L34 load, L131 draw): replace `k.sprite("map")` with a `k.addLevel` builder fed a **runtime tile-string grid** (game2's architecture). Ground objects stamp per-symbol.
- [ ] Move the scenery scatter (`buildMap` L86–99) to a runtime pass keyed off seeded `rnd()` (SEED=1337) so it stays deterministic.
- [ ] Derive world/road extent from the level array dimensions — **eliminate the three hand-synced constants** (`gen-assets` canvas dims, `content` coords, `main` `BOUNDS`).
- [ ] **20-hotspot coverage:** while adopting the tile-string map, extend from today's 17 hotspots toward the planned 20-hotspot coverage (per the earlier game2-adoption recommendation). Because the map is now data-driven, adding stations grows the world automatically — new hotspots slot in without regenerating any PNG. Keep `label`/`kind` on each entry.
- [ ] Verify tiles stay crisp (`crisp:true`, DPR cap at 2, L12).

### Phase 2 — Transpose the layout to vertical (Option B geometry)
- [ ] `gen-assets.js` / tile-grid builder: build the grid **tall** (road = vertical column band ~4 cols wide). Because it's now a tile-string, "vertical" is just a taller block with the road symbol running down — no CRC/PNG plumbing.
- [ ] `content.js` (L9–11): rename `BASE_N/BASE_S` → `BASE_W/BASE_E` (x-constants left/right of the vertical road); recompute `ROAD_MID` as the road's **x** centerline (≈384 for `pathLeft=6,pathRight=9`).
- [ ] `content.js` (L15–39): **swap x↔y on all hotspots** — the timeline value (150…2640) moves into `y`; the band constant moves into `x`. Smallest timeline value now at top (`y≈150`), growing downward. Fix the lone `y:430` literal on `classic`.
- [ ] `main.js` (L22): `BOUNDS` becomes tall+narrow — **derive it from the level dimensions**, not hardcode. Keep the cross-axis generosity so the player can reach a building's feet on either side of the road.
- [ ] `main.js` (L163): move player spawn to the **top** of the vertical road centerline (e.g. `pos(384, 150)`), else spawn lands off-BOUNDS/off-road.
- [ ] `main.js` (L168): invert `fitCam`'s scale branch intent for a tall world (portrait can zoom in slightly; landscape zooms out to see down the column) — tune by playtest.
- [ ] `main.js` (L237): flip camera lead from `pos.y-50` toward the travel direction (down the timeline).
- [ ] **No change** to movement/input (L194–234), depth sort (L139/165/235), `INTERACT_R` math, `SCALE`, anchors — confirmed orientation-free. Tune `INTERACT_R` *down* only if adjacent stacked props both qualify.

### Phase 3 — Content & labels
- [ ] `content.js` (L48–49) + `INTRO_HINT` (L6–7): rewrite copy — "the street runs my career **top-to-bottom**", gardens "to the **right/east**" — or the narration contradicts the layout.
- [ ] `main.js` label/prompt placement (L142/146/252): geometrically still "above sprite" and fine, but watch **crowding** — stations stacked along y put labels near the previous station's sprite. If overlap appears, offset labels to the cross-axis gutter (outboard side per lane). This is the single biggest visual gotcha.

### Phase 4 — Desktop-ribbon mitigation (keep single geometry)
- [ ] Widen the world road band and tune the existing `r<1` vs `r≥1` camera split so landscape reads as a comfortable framed column rather than a dead-margin ribbon. One geometry, two camera feels — no second layout.

### Phase 5 — QA & (optional) escalation gate
- [ ] Cross-device QA: phone portrait, phone landscape, tablet, near-square aspect, desktop.
- [ ] **Decision gate:** only if the desktop column look is unacceptable in practice, escalate to Option C — add a `layout(orientation)` switch + debounced rebuild on top of the now-data-driven map. This is now an incremental add, not a rewrite.

---

## 6. Risks & mitigations

| Risk | Mitigation |
|---|---|
| **Desktop regresses to a narrow vertical ribbon with dead side-margins** (the one real cost of B). | Widen the road band; use the existing `r<1`/`r≥1` camera split to frame landscape as a comfortable column (Phase 4). Keep C in reserve behind the Phase 5 gate. |
| **Three hand-synced size constants drift** (gen-assets canvas / content coords / main BOUNDS) — the recurring "baked = rigid" trap, doubly bad if you bake two PNGs. | Do the Phase 1 tilemap refactor **first**; derive world/road extent from the level array so there's one source of truth. Avoid the "bake both map-h.png and map-v.png" shortcut — it re-introduces rigidity on a second axis. |
| **Label/prompt overlap** once stations stack closely along the narrow cross axis. | Offset labels to the cross-axis gutter (outboard per lane) instead of straight up; optionally reduce `INTERACT_R` so adjacent stacked props don't both qualify. |
| **Ground shorter than the last station** → hotspots float off the road. | Derive grid length from the level/`mainExtent`, not a constant; preserve a trailing pad (today's `x1:3048` vs last `x:2640` slack). |
| **Copy contradicts layout** (welcome/INTRO_HINT still say "left-to-right"/"south"). | Treated as a first-class step (Phase 3), not an afterthought — it's content coupling, not just geometry. |
| **Reject the rotate-the-whole-world trick** outright — it rotates player sprite, labels, prompts (unreadable) and inverts input; more work than doing it properly, for a worse result. | Do not use it. Transpose the data (B), don't rotate the render (rejected Option C-rotate from the responsive analysis). |
| **If C is ever pursued:** `orientationchange` thrash + near-square (Surface, r≈1.0) flip-flop; live relayout tween bugs. | Use a real `matchMedia("(orientation: portrait)")` query with a deadzone (ignore ~0.9<r<1.1); debounce 150–250ms; **rebuild the scene** rather than relayout live; preserve module-level `visited` + fractional player position across rebuild. |

**Relevant files (all absolute):**
- `C:/Users/domin/OneDrive/Desktop/Websites/portfolio-2026/game1/gen-assets.js` — `buildMap` L68–101, `COLS/ROWS/T` L69, road rows `pathTop/pathBot` L71
- `C:/Users/domin/OneDrive/Desktop/Websites/portfolio-2026/game1/content.js` — `BASE_N/BASE_S/ROAD_MID` L9–11, 17 hotspots L13–40, welcome copy L48–49
- `C:/Users/domin/OneDrive/Desktop/Websites/portfolio-2026/game1/main.js` — `BOUNDS` L22, map load L34/draw L131, hotspot loop L135–153, spawn L163, `fitCam` L168, movement L194–234, camera L237
- `C:/Users/domin/OneDrive/Desktop/Websites/portfolio-2026/game1/index.html` — viewport L5, canvas L15 (no structural change required)
