# FROSTBYTE-WORLD-PLAN — new areas, main characters, and a reason to explore

Draft for Dominik's review, 2026-07-22. Companion doc: `FROSTBYTE-ART-PIPELINE.md` (how every
room in this plan gets its painted backdrop). Builds on the shipped game (S1–S6, H1–H4, Codex's
polish pass) and on Codex's in-progress Glasswind Court room.

## What this plan is
Grow Chillmere Isle from 3 rooms into a small explorable world in the spirit of the mid-2000s
penguin-social genre: many connected places, dense with small clickable discoveries, each anchored
by a named main character. NO new minigames. The pull is exploration, personality, and collection.
Homage, never clone: all names, art, characters and text stay original (the legal gate bans
Club-Penguin fingerprints and keeps us honest).

## Player-facing spine: the Curio Log
One system makes "lots of small clickable things" add up to something: **Curios** — hidden
clickable discoveries (3–6 per room) that register in a journal overlay, per-room progress shown
as knit badge stitches. Complete a room → small coin bonus; complete the isle → a unique held-item
cosmetic + a den trophy. This is the stamp-book analog and the reason to poke everything.

## Interaction vocabulary (reused everywhere, built once in W0)
- **Reaction prop**: click/tap → tiny in-canvas animation + optional one-liner (awning dumps snow,
  bell rings, hare bolts). Cheap, dense, no overlay.
- **Curio**: a reaction prop that also registers in the Curio Log the first time.
- **Reading prop**: click → dialogue overlay with flavor copy (posters, plaques, logbooks).
- **Character talk**: nearest-interact (existing E/prompt system) → upgraded dialogue overlay with
  painted portrait, multi-page lines, up to 3 choice buttons, per-day rotation.
- **Favor**: a cross-room fetch/deliver thread tracked in save (no minigame): character asks →
  you find/trigger the thing in another room → return → coins/curio/cosmetic. Favors are the
  glue that pushes players between areas.
- **Secret**: one per room minimum — a save-gated door, a vista, or a foreshadow of the caverns.

## Main characters (one anchor per area — names are Dominik's call, these are placeholders that pass the legal gate)
| Character | Species | Area | Role (genre analog, made ours) |
|---|---|---|---|
| **Edda Quill** | emperor penguin, half-moon specs | Glasswind Court | Editor of *The Chillmere Chirper*; warm, tea-fuelled, knows everyone; her "story tips" favors send you everywhere (kindly-editor archetype) |
| **Pem Sprocket** | puffin (distinct silhouette!) | Emberlight Workshop | Tinkerer; builds the Weather Bell; parts-fetch favor chain (gadgeteer archetype) |
| **Captain Salka** | chinstrap penguin, oilskin coat | Driftgate Docks | Trader whose barge *The Driftwood Gull* is only in port on some days (date-seeded) — rotating stall stock; the returning-ship ritual |
| **Old Maren** | weathered gentoo | Palefire Light | Lighthouse keeper; logbook of sightings; telescope favors (keeper-of-the-light archetype) |
| **Vesper** | arctic fox | Whisperpine Hollow | Trickster who relocates daily between three dens; trades hints for curios; explains the isle's little mysteries (mischief archetype — ambiguous, never a combat villain) |
| **The Echo** | unseen | Hollowfrost Caverns | A voice in the crystals; the capstone mystery; no sprite, only song lines and shimmer |

Rule: anchors are hand-placed actors with custom one-off sprites (any size, code-drawn, distinct
silhouette + fixed palette) — NOT reskins of the 9 roaming NPC personas. Portraits are painted
(see pipeline doc §Portraits). Existing roamers stay as crowd texture.

## The isle graph (walkable edges + map)
```
                    Palefire Light (2 rooms: Keeper's Rest / Lantern Gallery)
                         |
Frostline Trail ---- Driftgate Docks
   |        \            |
   |     Whisperpine  Glasswind Court ---- Emberlight Workshop
   |      Hollow          |
   |         \        Chillmere Plaza ---- Your Den
   |     [Moonwell]       |
   +--- [cavern crack] Hollowfrost Caverns [dumbwaiter from Workshop]
```
- New rooms connect by walking through edge doors (period-authentic room-to-room hops) AND appear
  as map pins after first visit (existing map overlay = fast travel). Fog lifts pin by pin.
- `validateWorldGraph` finally gets its real traversal check when the graph goes non-trivial (W3)
  — closes an old punch-list item.
- Map art (`map-isle.png`) is re-mastered via the art pipeline and gains pins per phase.

## Phases (each one sitting, shippable, vitest-green, explicit-path commits)

### W0 — Systems groundwork (M) — build once, every area consumes it
- `engine/dialogue-tree.js` (pure): nodes/pages/choices, per-day line rotation (existing daily
  seed pattern), favor-state hooks. Tests.
- `engine/curios.js` (pure): registry + found-state + per-room/total progress. Tests.
- `engine/favors.js` (pure): chain steps (offered → in-progress → done), rewards via existing
  `economy.js` fns. Tests.
- Save: additive forward-defaulted keys `save.curios`, `save.favors` (same pattern as
  `save.home` in H2). Schema version untouched.
- `content/characters.js`: anchor roster (id, name, room, portrait asset, palette, line pools,
  favor defs). Labels become test contracts once shipped — Dominik approves names first.
- `world/clickable.js`: reaction/curio prop spawner — obeys `anyOverlayOpen()`, idempotent under
  touchToMouse (the H2 lesson), scene-scoped (no global listeners).
- `ui/journal.js`: Curio Log overlay — knit-bound expedition-log look (see pipeline doc §UI
  direction), singleton `<style>` pattern like ui/map.js. Journal HUD button joins the left rail.
- Dialogue overlay upgrade: portrait slot + name plaque + ≤3 choice buttons, additive DOM inside
  the existing `#dialogue-overlay` (ids preserved, focus/Esc kept).

### W1 — Glasswind Court comes alive (M) — finishes what Codex started
Codex's WIP already builds the court room + travel wiring. This phase layers on top (coordinate:
start only from Codex's committed tree — see §Coordination):
- **Edda Quill** in her corner office nook by the notice board.
- **The Chillmere Chirper**: notice board → newspaper overlay; date-seeded weekly issue from
  `content/chirper-issues.js` (3 tiny articles + 1 hint pointing at a curio/secret somewhere).
  The paper is the exploration hint engine, not lore wallpaper.
- Reaction props/curios (~6): shop window displays wave back, frozen fountain coin glimmer, ice
  wind-chimes tinkle, awning snow-dump, stall kettle steam puff, postbox rattle.
- Favor intro: Edda's "story tips" — witnessing named events in other rooms (Salka's barge in
  port, the trail glints, a workshop test-firing) unlocks deliverable tips. First cross-room loop.
- Secret: one loose cobble hums faintly (caverns foreshadow, does nothing yet — pays off W6).

### W2 — Emberlight Workshop (M) — first interior anchor room
- Warm forge-lit interior (art: pipeline shot list). **Pem Sprocket** at the bench.
- Centerpiece: the **Weather Bell** — a half-built brass contraption. Favor chain: recover 3
  parts (one each hidden in court / trail / docks-when-built; W2 ships with 2 recoverable, third
  unlocks at W3 — the chain itself advertises the next area).
- Props/curios (~5): bellows puff, gizmo shelf chain-reaction, pneumatic tube thunk, blueprint
  wall (rotating sketches of isle props — quiet lore), a prototype "snowputer" (den furniture
  callback).
- Secret: a dumbwaiter hatch, locked ("smells like cold stone") — second caverns foreshadow.

### W3 — Driftgate Docks (L) — first fully new outdoor area + the returning-ship ritual
- Shore + pier room off the court. **Captain Salka**; *The Driftwood Gull* moored only on
  date-seeded days (pure schedule fn, tested). In-port days: gangplank down, stall open with 2
  rotating dress-up items from the EXISTING catalog (economy reuse, no new item art needed);
  away days: empty berth, harbor feels different, Maren's telescope can spot her at sea (W4 link).
- Props/curios (~6): tide pools (poke → critters duck), bottle post (weekly message), harbor
  bell, crane swing, buoy bob, gull flock scatter.
- Secret: under-pier ledge walk (narrow bounds path) with a curio.
- Graph: court↔docks, docks↔lighthouse trailhead (door visible, opens W4).

### W4 — Palefire Light (M/L) — the vertical landmark, two rooms
- **Keeper's Rest** (round cosy base: stove, logbook, spiral stairs) and **Lantern Gallery**
  (the great lamp, balcony, telescope). Stairs = simple room-to-room travel edge.
- **Old Maren**: sighting-report favors (see a telescope vista / trail event / Salka at sea →
  report back). Her logbook is a reading prop that grows entries as you complete them.
- **Telescope**: click → painted vista vignettes, date-seeded (breaching whale, aurora crown,
  the Gull under sail on Salka's away-days — systems shaking hands is the delight).
- The great lamp sweeps slowly (reduced-motion aware). Props/curios ~4 per room.
- Secret: balcony wind-carving that hums the same notes as the court's loose cobble.

### W5 — Whisperpine Hollow (L) — the wilds + the first true secret room
- Deep-forest room off Frostline Trail. **Vesper** the arctic fox relocates daily between three
  dens (date-seeded); finding today's den is itself the small hunt. Trades: show N curios →
  hints ("the cobble in the court isn't loose by accident…").
- Props/curios (~6): snow hare bolts, ice owl blink, icicle drop, echo log, frozen berry bush,
  will-o-glow wisps that dodge the cursor.
- **Moonwell Clearing** (secret room): gap in the pines that only becomes a door after Vesper's
  hint (save-gated). Still pool, moon halo, one bench, one curio, no character — the isle's
  quiet place. First fully hidden room in the game.

### W6 — Hollowfrost Caverns (L) — capstone: the two foreshadows converge
- Under-isle crystal caverns; TWO earned entrances open at once: the trail-side crack and Pem's
  dumbwaiter (both previously seen, now openable — the "I knew it" moment).
- **The Echo**: unseen presence; crystal walls chime response-notes when clicked; her song lines
  appear as floating text. Final curio set ("echo shards", 6).
- Journal completion here → reward: an aurora-glass held-item cosmetic ("Echoglass Lantern",
  new 4×3 sheet, code-drawn like all cosmetics) + a den trophy via the existing furniture path.
- Aurora intensifies over the whole isle once completed (one flag, ambient payoff).

### Post-W (backlog, not planned here)
Date-keyed festival dressings (decor variant per season — the parties analog), a second Chirper
volume, Vesper friendship arc, den visitors reacting to trophies.

## Contracts & discipline (same as H-phases)
- Pure engine first, vitest-first; content labels/ids/counts get tests the moment they ship.
- Every new input path: `anyOverlayOpen()` gate + touchToMouse idempotency + scene-scoped cleanup.
- Pause contract (os-bridge) holds: all schedules/anims dt-driven or date-seeded, nothing wall-clock
  in the render loop. Reduced motion respected everywhere (`save.prefs.reducedMotion` + CSS query).
- Save keys additive + forward-defaulted only; `dmos.v1.frostbyte.save` version unchanged.
- Legal gate green every phase; ASSET-CREDITS.md rows for new asset classes; no CP-fingerprint
  terms anywhere (code, copy, filenames, art prompts).
- One bounded `npx vitest run` per checkpoint (never run_in_background); explicit-path commits
  (`frostbyte/...` only); one phase per sitting.
- Agent budget per standing execution rules: solo-first; at most small cheap bursts (≤4) for
  independent data/content drafts; no review swarms.

## Coordination (two AIs, one folder)
- Codex currently has UNCOMMITTED Glasswind Court work in the tree. Nobody else touches
  `frostbyte/` until Codex commits. W1 starts from that commit.
- One session in `frostbyte/` at a time, ever (the 2026-07-12 collision lesson).
- Art masters are produced OUTSIDE the game tree (`Graphics/Frostbyte/` — pipeline doc) so
  generation work never collides with code work; integration is a small PNG-swap commit.
- Suggested split: Codex executes W-phases (it knows the codebase now); Claude produces/curates
  art batches with Dominik and reviews each phase. Or swap — either works with the fences above.

## Suggested order & why
W0 → W1 → W2 ship fast (court is nearly free, workshop is the second advertised door — the two
locked doors on the plaza stop being IOUs). W3 adds the ritual that makes people return. W4–W6
turn the isle from "rooms" into "a place with secrets". Art Phase A (re-mastering existing rooms,
pipeline doc) can run in parallel with W0 at any time — it touches only PNGs.
