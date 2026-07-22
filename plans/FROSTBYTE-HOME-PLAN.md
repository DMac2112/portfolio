# FROSTBYTE-HOME-PLAN — the Igloo, the Island Map, and getting there and back

> Companion to FROSTBYTE-PLAN.md (S1–S6 shipped). Authored 2026-07-13. This plan adds the player's
> HOME — an igloo — plus the travel system that connects every area, modeled on how the classic
> mid-2000s penguin-social-world games did it. **Mechanics are faithfully close to the classic;
> every name, sprite, and line of copy stays original** — game mechanics aren't copyrightable,
> art and names are. `legal-gate.mjs` (CP fingerprints) remains the hard backstop, and all art
> stays code-drawn via `gen-assets.js` per ASSET-CREDITS.md.
>
> Context for readers: Frostbyte is now presented as a WEB game inside DM Explorer (the OS's
> in-universe browser) — period authenticity. That migration is separate work; everything below is
> internal to `frostbyte/` and doesn't care how the iframe is hosted.

## 0. What the classic actually did (mechanics we're translating)

| Classic mechanic | How it worked there | Frostbyte translation |
|---|---|---|
| **Map, bottom-left corner** | A round map button pinned bottom-left opened a painted island map; click a location to travel | Identical: round HUD button bottom-left → full-screen island map overlay → click to travel |
| **Your igloo, reached via the map** | The map carried a "my home" pin; the igloo was YOUR room | Identical: "My Igloo" pin on the map; igloo is a private room instance |
| **Igloo editing** | An edit toggle inside your igloo opened a furniture tray; drag to place/move, store to inventory | Edit mode toggled by a **snow-brush** icon; place/move/flip/store, keyboard alternative |
| **Furniture catalog, browsed inside the igloo** | A furniture catalog with priced pages; buy with coins; own multiples | "**Cosy Igloo Catalogue**" (original name/art), priced items, multiples allowed |
| **Igloo upgrades** | A second catalog sold bigger/better igloo shells | v2 stretch: 2–3 shell styles |
| **Open your igloo to visitors** | A flag made your igloo visible so others could drop by | The fake-multiplayer twist: an "Open" door-sign invites seeded NPC visitors (§7) |
| Leaving | Walk out the door, or map away | Both: door at the igloo's south exit + map |

Explicitly out of scope forever: pets (the classic's pet creature is a banned fingerprint), member
tiering (everything is earnable with coins), any classic room/character names.

## 1. Player journey (the loop this plan buys)

Plaza → tap **Map** (bottom-left, always present) → island map slides up → tap **My Igloo** → fade →
igloo interior → tap **snow-brush** → edit mode: browse the Cosy Igloo Catalogue, buy a snow sofa
(coins finally have a second sink) → drag it by the fire nook → close edit → flip the door sign to
**Open** → an NPC waddles in, admires the sofa, tips 5 coins, leaves → walk out the door → back in
the plaza exactly where the door metaphor says you should be.

"There and back" is a hard requirement: **every room must always be exitable via BOTH the map and a
door**, and a connectivity test enforces it (§9).

## 2. Travel system — the Island Map

### 2.1 HUD button
- Round button, **fixed bottom-left** (`#map-btn`), matching the classic's placement. DOM, not
  canvas (consistent with say-btn/dressup-btn pattern).
- Disabled while chat/dress-up/edit overlays are open (the existing `frozen` contract) and during
  the minigame (the classic never let you map out mid-minigame either — you exit the game first).

### 2.2 Map overlay (`ui/map.js`)
- Full-screen DOM overlay (pattern-clone of dress-up: self-mounting, idempotent styles, Esc closes,
  focus-trapped, `aria-modal`), showing **Chillmere Isle** — original painted-look island art,
  code-drawn into `assets/map-isle.png` by gen-assets (coastline blob, snowfields, pine clusters);
  location pins are DOM buttons positioned over it (crisp text, keyboard-reachable, screen-reader
  labelled — never baked into the PNG).
- Pins v1: **Chillmere Plaza** (hub), **My Igloo**. Snowdrift Field is drawn + labelled on the art
  for flavor but not a pin — minigames are entered from rooms, like the classic. Future areas
  (cove, summit) drawn under drifting cloud/mist patches: visible, teasing, unclickable.
- "You are here" marker on the current room's pin (from `save.lastRoom`).
- Travel: click pin → overlay closes → 250ms fade (skipped under `prefers-reduced-motion`) →
  `k.go('room', roomId, {spawn:'fromMap'})`.
- Stretch (H3+): a handheld "**Drift Nav**" gadget skin for the same overlay — cosmetic reframe
  only, same code path.

### 2.3 Pure logic (`engine/travel.js`)
- `MAP_NODES` lives in `content/map.js`: `{ roomId, label, x, y, unlocked }`.
- Pure helpers: `canTravel(state, roomId)` (frozen/minigame guards), `travelTargets(nodes, save)`,
  and graph validation used by tests: every node resolves to a `content/rooms.js` room; door graph +
  map graph together are strongly connected (no room can strand the player).

## 3. The Igloo room

- New entry in `content/rooms.js`: `id:'igloo'`, flag **`home:true`** — the existing parameterized
  `'room'` scene, camera, movement, obstacle, and door systems are reused untouched. Igloo-only
  behaviors (furniture layer, edit mode, door sign, visitors) key off the `home` flag.
- Interior: **circular ice-dome** — packed-snow floor disc, ice-block ring wall, door gap at the
  south (the classic igloo interior was exactly this shape; circular rooms read instantly as
  "home"). Original flourishes: window slits with a faint aurora glow, a small fire nook.
  All code-drawn: `gen-assets.js` gains `buildIglooInterior()` → `assets/room-igloo.png` (same
  480×270 room dims as the plaza).
- Bounds: the floor disc becomes the walkable polygon (movement.js already clamps to bounds +
  obstacles; the ring wall is one annular obstacle approximated by chords).
- Door: south exit → returns to **`save.lastRoom`** (default `'plaza'`) — symmetric with how the
  player got in. `lastRoom` is written on every non-igloo room entry.
- **No NPC crowd** here by default (your igloo was private and usually quiet — that emptiness is
  authentic) — except §7 visitors.
- Interactables inside: door (exit), door sign (toggle open/closed), snow-brush (edit mode). This
  triples interactable density in a small room, which is why H1 REQUIRES the
  nearest-ACTIONABLE interaction fix (§8).

## 4. Furniture & decorating

### 4.1 Catalog (`content/furniture-catalog.js`)
~18 original items v1, priced 50–800 coins so the S4 minigame income (≤60/day) makes each purchase
a 1–3 day goal:

| Class | Items (all original names/art) |
|---|---|
| seating | snow sofa, ice stool, bean-drift chair |
| tables | ice slab table, driftwood side table |
| lighting | glowlamp, aurora lantern, string lights |
| rugs | oval knit rug, fish rug, star rug |
| decor | frost fern, snowdrift bonsai, penguin portrait (of YOUR avatar — reuses the compositor), trophy shelf |
| tech/fun | snowputer (chunky CRT), record box, cocoa machine |

- Multiples allowed (own 3 stools) — inventory is `{itemId: count}`.
- Catalog UI: paged booklet overlay ("Cosy Igloo Catalogue"), opened from edit mode — buy buttons
  reuse `economy.spendCoins`/`unlockItem` patterns. Stretch: the page order rotates monthly,
  seeded from `todayISO` — deterministic "new catalog!" feel with zero network.

### 4.2 Edit mode
- Toggle: **snow-brush** button inside the igloo (HUD, igloo-only). Entering freezes movement
  (same `frozen` contract as dress-up), shows the furniture **tray** (inventory with counts) and
  the catalog button.
- Interactions: drag from tray → room places; drag placed item → moves; **double-click/R** flips
  horizontally (`flipX` — no extra sprite frames needed); drag to tray or **Del** → stores back.
  Keyboard path (a11y, §11.3 spirit): select via Tab, arrows nudge 4px, R flip, Del store.
- Placement rules: free placement, **snap to 4px grid**, clamped to the floor polygon, **max 30
  placed items** (perf + save size), rugs render under everything, other furniture y-sorts with
  the penguin (existing z pattern).
- Persist on every commit action (place/move/flip/store/buy) — cheap JSON write.

### 4.3 Pure engine (`engine/home-editor.js`) — built and tested FIRST
A pure reducer over `{ inventory, placed[] }`:
`buy(state, catalog, itemId, coins)` · `place(state, itemId, x, y)` · `move(state, idx, x, y)` ·
`flip(state, idx)` · `store(state, idx)` — with injected floor-bounds clamp, grid snap, the
30-item cap, "can't place what you don't own", multiples accounting, and an `ev` out-param array
matching economy.js's event convention. Zero DOM/KAPLAY. Full vitest suite (§9).

## 5. Save schema (forward-defaulted, no version bump — the S4 `dailyCoins` precedent)

```js
home: {
  open: false,                       // door sign
  shell: 'dome-basic',               // v2: more shells
  placed: [],                        // [{ id, x, y, flip }] ≤ 30
},
furniture: {},                       // { itemId: count } owned (incl. placed)
lastRoom: 'plaza',                   // igloo door exit target + map "you are here"
visitorTips: {},                     // { 'YYYY-MM-DD': coins } daily-capped like dailyCoins
```
`migrateSave` forward-defaults all four; `??`-guards at every read (minigame-daily.js precedent).

## 6. Economy integration

- Furniture purchases are the second coin **sink** (first: cosmetics). Prices per §4.1.
- Visitor tips (§7) are a tiny **source**: +5 coins per visit, capped 15/day via `visitorTips` —
  deliberately smaller than the minigame so Snowdrift Toss stays the main income.
- **This finally wires the dead code the S5 audit flagged**: `economy.greetNpc` becomes the visitor
  tip handler and `collectPickup` backs a stretch "visitor leaves a small gift" beat. If H3 lands
  neither, delete both (the audit's alternative) — no third option.

## 7. Fake-multiplayer twist: Open House visitors

The classic's social payoff — someone visits the home you decorated — recreated solo with the
Dialtone "it only pretends" pattern:

- Door sign toggles `home.open`. While open AND the player is in the igloo, a **pure, seeded
  scheduler** (`engine/visitors.js`: dt-accumulated, rng-injected, tested headless) rolls roughly
  one visit chance per 45–90s.
- A visit: roster NPC (existing personas/FSM) waddles in the door, pathfinds near a furniture
  item, emotes, speaks 1–2 admiration lines from a new `VISITOR` pool that can reference state
  ("cosy in here — {placedCount} pieces!", persona-flavored), tips +5 coins (`greetNpc`, daily cap),
  waddles out. 20–30s total.
- Never more than one visitor at once; never while edit mode or chat overlay is open; pauses with
  the OS pause contract for free (dt-gated).
- Empty-igloo visits still work ("love what you haven't done with the place" — persona snark) so
  the feature demos before the player owns furniture.

## 8. Punch-list folding — H1 pre-work (required, not optional)

Map travel multiplies `'room'` scene re-entries, which weaponizes two known S5-audit findings:

1. **Overlay teardown leak**: `createChat`/`createDressUp` re-append DOM + listeners on every
   scene entry. Fix FIRST: make both (and the new map/edit/catalog overlays) module-level
   **singletons** created once at boot — scene entries only rebind callbacks. Acceptance: after 10
   map round-trips, `document.querySelectorAll('#chat-overlay').length === 1`.
2. **Nearest-ACTIONABLE interact**: the picker must skip action-less candidates (NPCs) — the igloo
   packs door + sign + brush into a small disc and a visitor NPC would shadow all three.

Also in passing: `save.prefs.lastRoom` is recorded on every room entry (H2+ features read it); the
minigame keeps its explicit `from` scene param — an explicit source beats a global read.

## 9. Test matrix (all pure, all headless — the S1–S5 discipline)

| Suite | Key assertions |
|---|---|
| `travel.test.js` | map+door graph strongly connected; every node resolves; frozen/minigame guards; lastRoom round-trip |
| `home-editor.test.js` | buy (funds/ownership), place/move clamp+snap, cap 30, flip, store returns to inventory, multiples counts, ev events |
| `visitors.test.js` | seeded determinism; min/max visit intervals; never during closed/edit/absent; daily tip cap; single-visitor invariant |
| `furniture-catalog.test.js` | ids unique; prices in band; classes valid; every item has sprite meta |
| `rooms.test.js` (extend) | igloo bounds/door/interactables valid; door targets resolve both ways |
| `save.test.js` (extend) | v1 saves migrate: home/furniture/lastRoom/visitorTips forward-default |

## 10. Assets (`gen-assets.js` additions — all code-drawn originals)

`buildIglooInterior()` (room-igloo.png, 480×270) · `buildMapIsle()` (map-isle.png, 480×270,
painted-look coastline/snowfields/mist patches) · `buildFurnitureSheet()` (one PNG per item,
24×24 or 32×48 for tall items, grayscale-tint where dye variants make sense later) · map HUD
button glyph · door sign (open/closed) · snow-brush glyph.

## 11. Phases (sessions H1–H3; same rules: pure-first, vitest, commit per green checkpoint)

- **H1 — "There and back."** §8 fixes → `content/map.js` + `engine/travel.js` + tests → igloo room
  in `rooms.js` + `buildIglooInterior` + `buildMapIsle` → `ui/map.js` + HUD button → door/lastRoom
  wiring. **Accept:** plaza↔igloo via map AND door; connectivity test green; 10-round-trip DOM
  singleton check passes; gate clean.
- **H2 — "Make it yours."** `engine/home-editor.js` + tests → furniture catalog data + sprites →
  world furniture layer (rug-under, y-sort) → edit-mode UI + tray + catalog overlay → persistence.
  **Accept:** buy→place→move→flip→store→reload persists exactly; cap + clamp enforced; keyboard
  path works; all suites green.
- **H3 — "Open house."** `engine/visitors.js` + tests → VISITOR dialogue pool → visit
  choreography (enter/admire/tip/leave) → door sign → polish (reduced-motion, a11y pass, mobile
  drag QA) → full audit → vendor re-sync via `deploy-rework.mjs`.
  **Accept:** open sign + seeded visits + capped tips work; `greetNpc` live or deleted; audit
  zero-blocker.

## 12. Open questions for Dominik (none block H1)

1. Igloo name on the map: "My Igloo" (genre-standard) or something Frostbyte-flavored ("The Drift")?
2. Should the minigame field become a map pin too (fast travel to the game) or stay plaza-entered?
3. v2 shells: worth it, or spend that session on a second public area (cove/summit) instead?
4. Visitor tips: keep (tiny income) or make visits pure flavor (no coins)?
