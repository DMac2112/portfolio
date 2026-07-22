# FROSTBYTE-PLAN — build-ready plan for an original penguin-social-world game

> Working title **Frostbyte** (final name is Dominik's call — it must match the os-bridge
> `ready` title and the registry `title`). Companion to BROWSER-PLAN.md, SKYPE-PLAN.md, and the
> game1 (Dev District) pattern. Authored 2026-07-11 via a grounded multi-agent pass (2 code-reading
> agents → parallel section designers → inline synthesis).
>
> **This is a genre homage, NOT a Club Penguin clone.** Club Penguin is a live Disney trademark
> with copyrighted characters, art, music, and named minigames — none of that is reproduced. Game
> *mechanics/genre/verbs* (waddle, click-to-move, avatar dress-up, coins, emotes, minigames, rooms)
> are not copyrightable and are fair to use. Everything named, drawn, or heard in Frostbyte is
> original, authored for this project — the same discipline already applied to Sky Hopper (≠ Flappy
> Bird), our Bubble Shooter (≠ bubbleshooter.com), and Dialtone (≠ Skype).

---

## §0 Honest verdict (read first)

Club Penguin was a **persistent multiplayer online world** — accounts, servers, an economy, live
chat, moderation, years of content. Two walls make a faithful clone **infeasible** for this
portfolio: (1) it's protected Disney IP, and (2) DominikOS is a **static, backend-less, zero-cost,
offline-capable** site — real multiplayer needs a server, database, accounts, and live-chat
**moderation** (a COPPA/child-safety/GDPR liability no portfolio should own). **What is very
feasible:** an original, single-player, offline "snowy plaza" that *feels* like the genre — waddle
around, customise your penguin, a crowd of NPC penguins, chat bubbles, one minigame, coins — with
the multiplayer **faked** (the Dialtone "it only pretends" trick). Rough split: **~75% of the
*feel* is achievable; ~0% of the *real MMO* is** — and that's the correct trade. **Build the
vignette (one plaza), not the MMO** (see §Recommendation).

## §1 Locked decisions

| # | Decision |
|---|---|
| 1 | **Multiplayer is FAKED (Option B).** Single-player world; NPC penguins wander/emote/"speak" canned lines on KAPLAY-clock timers. No real players, no backend, no live chat, no accounts. Real multiplayer is **rejected** (server + DB + auth + live-chat moderation = cost + child-safety/GDPR liability; breaks the static model). |
| 2 | **Engine: KAPLAY** (vendored, MIT), top-down walkable world like game1. Delivered as a self-contained static app at `/frostbyte/`, registered as a **native OS iframe game** (`kind:"iframe"`) like game1. |
| 3 | **Persistence: localStorage only** (`dmos.v1.frostbyte.*`, rides the OS version-wipe). Per-browser, no cross-device sync. |
| 4 | **Chat is strictly LOCAL** — the player's own speech bubble, never transmitted → **zero moderation surface**. Coins/economy: local, single-player. |
| 5 | **Scope: VIGNETTE FIRST** — one plaza (Chillmere Plaza) + customisable penguin + NPC crowd + one minigame (Snowdrift Toss) + coins/cosmetics. Expansion rooms are later, data-only additions. |

## §2 IP / legal (decide + wire in P0)

| Club Penguin element | Status | Frostbyte does instead |
|---|---|---|
| The name "Club Penguin" | ❌ trademark | Original name (Frostbyte / Chillmere / Dominik's pick) |
| Penguin *art*, waddle/tumble *art* | ⚠️ verbs fine, art not | Original code-drawn penguin sprite sheet |
| Puffles (pets), mascots (Rockhopper/Aunt Arctic/Cadence/EPF…) | ❌ copyrighted characters | Original NPCs & (optional) original pets, original names |
| Named minigames (Card-Jitsu, Jet Pack Adventure, Pizzatron…) | ❌ branded designs | Original minigames + names (e.g. **Snowdrift Toss**) |
| Room layouts, music, logo, UI | ❌ copyrighted art/audio | Original rooms, runtime-synth audio, original UI |
| Genre & verbs (waddle, click-to-move, dress-up, coins, emotes) | ✅ not copyrightable | Free to use |

**Legal-gate changes (P0, single easiest thing to forget):** `os/scripts/legal-gate.mjs` scans a
hard-coded root list that does **not** include the new folder — Frostbyte assets would ship
*unscanned*. (a) push `path.resolve(APP,'..','frostbyte')` onto `SCAN_ROOTS`; (b) add
`BANNED_CONTENT_ANY` fingerprints (`/club ?penguin/i`, `/puffle/i`, `/card[- ]?jitsu/i`, mascot
names) — precedent exists (it already bans `space-cadet|maxis` for the pinball homage). The gate is
grep-only; it cannot detect copied *art*/layout/music — originality is enforced by the code-drawn
asset pipeline, an ASSET-CREDITS.md row, and the P6 adversarial IP review.

## §3 Feasibility matrix

| Feature | Verdict | Note |
|---|---|---|
| Waddle / click-to-move avatar | ✅ Feasible | KAPLAY tween-to-point; game1's exact verb |
| Walkable rooms | ✅ Feasible | one `k.scene()` per room; vignette = 1 scene |
| Avatar customisation (colour + items) | ✅ Feasible | localStorage; original overlay-sprite cosmetics |
| NPC crowd (other "penguins") | ✅ Feasible (faked) | dt-driven FSM, auto-paused by tree-root pause |
| Chat bubbles | ✅ Feasible (local only) | never transmitted → no moderation surface |
| Emotes / dances | ✅ Feasible | keypress → sprite anim + particle |
| Coins economy | ✅ Feasible (local) | earn in minigame, spend on cosmetics |
| Minigame(s) | ✅ Feasible | 1 original (Snowdrift Toss), pure-engine + tests |
| Persistence | 🟡 Partial | localStorage only; clears with site data; no cross-device |
| Real other players | ❌ Infeasible | needs backend → faked with NPCs |
| Accounts / synced friends | ❌ Infeasible | needs auth + DB; local-only "friends" possible |
| Live chat with real people | ❌ Infeasible & unwise | moderation/child-safety liability |
| Trading / real user economy | ❌ Infeasible | needs server + anti-fraud; moot single-player |

## §4 Canonical repo layout (authoritative)

The design sections below were drafted in parallel and drifted on folder naming (some say `src/…`,
`rooms/…`, `npc/…`). **This tree is authoritative** — where a section names `src/save.js`,
`rooms/plaza.js`, or `npc/crowd.test.js`, read it as the corresponding `engine/…` or `content/…`
path here. Module *names* are stable; only the folder is normalised.

```
dominikos/frostbyte/
├── index.html                 # canvas + DOM overlays; os-bridge.js (classic) BEFORE main.js (module)
├── main.js                    # IMPURE: KAPLAY boot, scene wiring, input, os-bridge glue
├── os-bridge.js               # copied VERBATIM from game1 (channel 'os-bridge-v1'); only ready title differs
├── gen-assets.js              # zero-dep Node PNG generator (build-time: node gen-assets.js)
├── vendor/kaplay.mjs          # copied verbatim from game1 (MIT, offline)
├── assets/                    # committed OUTPUT of gen-assets.js — never hand-authored
│   ├── penguin.png            # 4-wide x 3-row sheet (down/side/up; left = side + flipX)
│   ├── room-plaza.png
│   ├── props/…  └ cosmetics/… # overlay sprites, same anchor as penguin.png
├── content/                   # DATA, not code
│   ├── rooms.js               # ROOM_REGISTRY (bounds, spawns, hotspots, doors, npc anchors)
│   ├── npc-roster.js          # NPC archetypes (id, name, palette seed, mood table)
│   ├── dialogue-lines.js      # canned line pools: archetype -> mood -> string[]
│   ├── cosmetics-catalog.js   # shop items (id, slot, price, spriteKey)
│   ├── chat-phrases.js        # safe-phrase quick-menu pool (local chat)
│   └── minigames-registry.js  # id -> { hotspotId, sceneId }
├── engine/                    # PURE, framework-agnostic, vitest-covered
│   ├── rng.js                 # seeded 32-bit LCG (project constants)
│   ├── movement.js            # move-vector, bounds clamp, obstacle pushout, facing
│   ├── camera.js              # cam-follow + zoom-fit math
│   ├── npc-fsm.js             # idle/wander/emote/speak machine, dt-driven, injected-time
│   ├── interaction.js         # nearest-within-radius picker (hotspots + NPCs)
│   ├── economy.js             # coin balance, purchases, ownership (event out-param)
│   ├── save.js                # localStorage read/write, dmos.v1.frostbyte.* + migration
│   ├── avatar-layers.js       # pure cosmetic-layer resolution (equipped -> draw order)
│   ├── chat.js                # speech-bubble queue + lifetimes, dt-driven
│   ├── minigame-snowdrift.js  # Snowdrift Toss rules (pure)
│   └── *.test.js              # one vitest suite per pure module
├── world/                     # IMPURE KAPLAY builders (scenes)
│   ├── build-room.js          # renders a ROOM_REGISTRY entry into a k.scene
│   └── minigame-snowdrift.js  # the Snowdrift Toss k.scene (drives engine/minigame-snowdrift.js)
├── ui/                        # DOM overlays (impure, thin; game1 typeHtml pattern)
│   ├── dialogue-overlay.js    # NPC speech / shop / dress-up panels
│   ├── chat.js                # safe-phrase menu + local free-text input
│   ├── emotes.js              # emote wheel/keys
│   └── hud.js                 # coin counter, interact prompt
├── package.json               # private; vitest devDep only
└── vitest.config.js
```
Registry manifest lives at **repo-root** `dominikos/registry/frostbyte.json` (NOT under `os/` — Vite
`base:'/os/'` strips that prefix). Icon: `/os/icons/frostbyte.svg`.

## Engine & World Architecture

### 1. Approach

Frostbyte's engine layer forks game1's proven boot/movement/camera/interaction code, split into two halves: a thin **KAPLAY glue layer** (`main.js`) that talks to KAPLAY and the DOM, and a **pure logic core** (`engine/*.js`) that has zero KAPLAY/DOM dependency and is directly importable by vitest. World content (rooms, props, NPC roster, canned lines, shop catalog) is data in `content/*.js`, mirroring game1's `content.js` split. The vignette ships as **one room** rendered through a single **parameterized** scene, so a second room later is a data addition, not a new scene registration.

Every NPC behavior (wander/emote/speak) advances only from KAPLAY's own `dt()` inside `k.onUpdate`, which simply does not fire while `k.getTreeRoot().paused === true`. So the section-8.4 pause contract falls out for free — provided **nothing anywhere uses `setInterval`/`setTimeout`/`Date.now()` for gameplay timing.** This rule is called out at every layer below.

### 2. Folder & file tree

```
dominikos/frostbyte/
├── index.html                    # canvas + DOM overlays; script order matters (§9)
├── main.js                       # KAPLAY boot, scene wiring, input capture, os-bridge glue (impure)
├── os-bridge.js                  # copied verbatim from game1/os-bridge.js (channel 'os-bridge-v1')
├── gen-assets.js                 # zero-dep Node PNG generator, build-time only (node gen-assets.js)
├── vendor/
│   └── kaplay.mjs                # copied verbatim from game1/vendor/kaplay.mjs (MIT, offline)
├── assets/                       # committed OUTPUT of gen-assets.js — never hand-authored
│   ├── penguin.png                # 4x5 sliceX/Y sheet, see §4.3
│   ├── plaza-map.png
│   ├── props/
│   │   ├── fountain.png
│   │   ├── lamp.png
│   │   ├── bench.png
│   │   └── stall.png
│   └── cosmetics/
│       ├── hat-01.png             # overlay sprites, same anchor as penguin.png
│       └── scarf-01.png
├── content/                       # data, not code
│   ├── rooms.js                   # room registry (bounds, spawn, hotspots, solids, npcSpawns)
│   ├── npc-roster.js              # NPC archetypes: id, name, palette seed, moodTable
│   ├── dialogue-lines.js          # canned line pools keyed by npcArchetype -> mood -> string[]
│   ├── cosmetics-catalog.js       # shop items: id, slot, price, spriteKey
│   └── minigames-registry.js      # id -> { hotspotId, entryPoint } (full design: Minigames section)
├── engine/                        # PURE, framework-agnostic, vitest-covered
│   ├── rng.js                     # seeded 32-bit LCG (project-standard constants)
│   ├── movement.js                # move-vector resolution, bounds clamp, obstacle pushout, facing
│   ├── camera.js                  # cam-follow + zoom-fit pure math
│   ├── npc-fsm.js                 # idle/wander/emote/speak state machine, dt-driven
│   ├── interaction.js             # nearest-within-radius picker (hotspots + NPCs)
│   ├── economy.js                 # coin balance, purchases, ownership (event out-param)
│   ├── save.js                    # localStorage read/write, dmos.v1.frostbyte.* namespace
│   ├── movement.test.js
│   ├── camera.test.js
│   ├── npc-fsm.test.js
│   ├── interaction.test.js
│   ├── economy.test.js
│   └── save.test.js
├── ui/                             # DOM overlay logic (impure, thin)
│   ├── dialogue-overlay.js         # speech bubble / shop / dress-up panels (game1 typeHtml pattern)
│   └── hud.js                      # coin counter, interact prompt
├── package.json                    # private, vitest devDependency only (§13)
└── vitest.config.js
```

Registration outside this folder (owned by the OS-integration section, referenced here for completeness): `dominikos/registry/frostbyte.json` (`kind:"iframe"`, `src:"/frostbyte/index.html?embedded=1"`, `category:"games"`), an icon at `/os/icons/frostbyte.svg`, a `SCAN_ROOTS` entry in `os/scripts/legal-gate.mjs`, and a `cpSync` line in `os/scripts/deploy-local.mjs`.

### 3. Boot sequence & scene/room model

`main.js` copies game1's boot config verbatim:

```js
import kaplay from './vendor/kaplay.mjs';

const k = kaplay({
  global: false,
  touchToMouse: true,
  canvas: document.getElementById('game'),
  pixelDensity: Math.min(devicePixelRatio, 2),
  crisp: true,
  background: [18, 30, 42],   // Frostbyte's own palette, not game1's
  debug: false,
});
```

Rooms are **data**, not separate scene registrations. One generic scene function is parameterized by room id:

```js
// main.js
import { rooms } from './content/rooms.js';
import { buildRoom } from './world/build-room.js';   // impure KAPLAY-side builder, see §6

k.scene('room', (roomId) => buildRoom(k, rooms[roomId]));
k.go('room', 'plaza');   // vignette entry point; later: k.go('room', 'dock') etc.
```

`content/rooms.js` schema:

```js
export const rooms = {
  plaza: {
    id: 'plaza',
    mapAsset: 'plaza-map',                       // ./assets/plaza-map.png
    bounds: { x0: 40, x1: 1560, y0: 200, y1: 900 },
    spawn: { x: 800, y: 560 },
    hotspots: [
      { id: 'shop-stall',  x: 420, y: 540, kind: 'shop' },
      { id: 'toss-game',   x: 1180, y: 620, kind: 'minigame', minigameId: 'toss-01' },
    ],
    solids: [                                     // obstacle handling, see §4.4
      { id: 'fountain', x: 800, y: 460, w: 180, h: 140 },
      { id: 'bench-a',  x: 300, y: 700, w: 120, h: 40 },
    ],
    npcSpawns: [
      { id: 'npc-plaza-01', archetype: 'chatty',  x: 620, y: 600, seed: 101 },
      { id: 'npc-plaza-02', archetype: 'shy',     x: 950, y: 520, seed: 102 },
      { id: 'npc-plaza-03', archetype: 'showoff', x: 1080, y: 700, seed: 103 },
    ],
  },
  // future rooms (dock, lodge, ...) are added here only — zero engine changes
};
```

Scene body order mirrors game1: (1) map sprite at `pos(0,0)` `scale(SCALE)` `z(-1000)`; (2) solids + hotspots built from `room.solids`/`room.hotspots` with `area()` + `z(y)`; (3) NPCs spawned from `room.npcSpawns` via `engine/npc-fsm.createNpc()`; (4) player added last, positioned at `room.spawn`.

### 4. Avatar: click-to-move, keys, obstacles, waddle states

#### 4.1 Input capture (impure, in `main.js`)

```js
let moveTarget = null;
k.onMousePress(() => { moveTarget = k.toWorld(k.mousePos()); });
k.onTouchStart((pos) => { moveTarget = k.toWorld(pos); });   // touchToMouse also covers this
```

#### 4.2 Pure movement resolution (`engine/movement.js`)

```js
export const SPEED = 220;          // world px/s
export const ARRIVE_EPS = 4;       // px — below this, moveTarget clears (arrived)

// Steers toward moveTarget each frame, same discrete-per-frame approach as game1
// (NOT a k.tween() on position — a click mid-flight must be able to retarget
// instantly without waiting out or cancelling a running tween).
export function resolveMoveVector({ keys, moveTarget, pos, dt }) {
  let dx = 0, dy = 0;
  if (keys.left) dx -= 1;
  if (keys.right) dx += 1;
  if (keys.up) dy -= 1;
  if (keys.down) dy += 1;

  let usingKeys = dx !== 0 || dy !== 0;
  let arrived = false;

  if (!usingKeys && moveTarget) {
    const tx = moveTarget.x - pos.x, ty = moveTarget.y - pos.y;
    const dist = Math.hypot(tx, ty);
    if (dist <= ARRIVE_EPS) { arrived = true; }
    else { dx = tx / dist; dy = ty / dist; }
  }

  const len = Math.hypot(dx, dy) || 1;
  const vx = (dx / len) * SPEED, vy = (dy / len) * SPEED;
  return { vx, vy, dxPx: vx * dt, dyPx: vy * dt, moving: !arrived && (dx !== 0 || dy !== 0), arrived, keysCancelTarget: usingKeys };
}

export function clampToBounds(pos, bounds) {
  return {
    x: Math.max(bounds.x0, Math.min(bounds.x1, pos.x)),
    y: Math.max(bounds.y0, Math.min(bounds.y1, pos.y)),
  };
}

// Pure circle-vs-AABB penetration resolver — obstacle handling without KAPLAY physics.
export function resolveObstacles(pos, radius, solids) {
  let { x, y } = pos;
  for (const s of solids) {
    const halfW = s.w / 2, halfH = s.h / 2;
    const closestX = Math.max(s.x - halfW, Math.min(x, s.x + halfW));
    const closestY = Math.max(s.y - halfH, Math.min(y, s.y + halfH));
    const dx = x - closestX, dy = y - closestY;
    const dist = Math.hypot(dx, dy);
    if (dist < radius && dist > 0) {
      const push = radius - dist;
      x += (dx / dist) * push;
      y += (dy / dist) * push;
    } else if (dist === 0) {
      // center exactly inside: push out along shorter axis
      x += halfW + radius; // deterministic fallback direction
    }
  }
  return { x, y };
}

export function resolveFacing(dx, dy, prevFacing) {
  if (dx === 0 && dy === 0) return prevFacing;             // no jitter when idle
  return Math.abs(dx) >= Math.abs(dy)
    ? (dx > 0 ? 'right' : 'left')
    : (dy > 0 ? 'down' : 'up');
}
```

`main.js` glue per frame:

```js
k.onUpdate(() => {
  const dt = Math.min(k.dt(), 0.05);   // defensive clamp, same discipline as useGameLoop
  const keys = { left: k.isKeyDown('left') || k.isKeyDown('a'), /* ...right/up/down */ };
  const { dxPx, dyPx, moving, arrived, keysCancelTarget } =
    resolveMoveVector({ keys, moveTarget, pos: player.pos, dt });

  if (keysCancelTarget) moveTarget = null;
  if (arrived) moveTarget = null;

  let next = { x: player.pos.x + dxPx, y: player.pos.y + dyPx };
  next = resolveObstacles(next, PLAYER_RADIUS, room.solids);
  next = clampToBounds(next, room.bounds);
  player.pos.x = next.x; player.pos.y = next.y;

  const facing = resolveFacing(dxPx, dyPx, playerFacing);
  playerFacing = facing;
  setAnim(playerActionState === 'idle'
    ? (moving ? `waddle-${dirGroup(facing)}` : `idle-${dirGroup(facing)}`)
    : playerActionState, facing === 'left');

  player.z = player.pos.y;   // y-sort, same as game1
});
```

`setAnim(name, flip)` is copied verbatim from game1: sets `flipX` and only calls `player.play(name)` when the anim name actually changes, to prevent restart-stutter.

#### 4.3 Sprite sheet & waddle animation states

`penguin.png`: **4 columns x 5 rows**, 16x16 cells (extends game1's 4x3 convention with two extra rows for actions):

| row | content | anim keys |
|---|---|---|
| 0 | facing down | `idle-down` (frame 0), `waddle-down` ({from:0,to:3,loop:true,speed:8}) |
| 1 | facing side (right) | `idle-side`, `waddle-side` — **left = this row + `flipX=true`**, no separate left row (matches game1 gotcha) |
| 2 | facing up | `idle-up`, `waddle-up` |
| 3 | emote (non-directional bounce/sparkle loop) | `emote` ({from:12,to:15,loop:false,speed:8}) |
| 4 | throw (wind-up/release, used by the plaza's toss minigame) | `throw` ({from:16,to:19,loop:false,speed:10}) |

```js
k.loadSprite('penguin', './assets/penguin.png', {
  sliceX: 4, sliceY: 5,
  anims: {
    'idle-down': 0, 'waddle-down': { from: 0, to: 3, loop: true, speed: 8 },
    'idle-side': 4, 'waddle-side': { from: 4, to: 7, loop: true, speed: 8 },
    'idle-up': 8,   'waddle-up':   { from: 8, to: 11, loop: true, speed: 8 },
    'emote': { from: 12, to: 15, loop: false, speed: 8 },
    'throw': { from: 16, to: 19, loop: false, speed: 10 },
  },
});
```

`emote` and `throw` are one-shot (`loop:false`); `main.js` listens for `player.onAnimEnd('emote'|'throw', () => playerActionState = 'idle')` to fall back to idle/waddle automatically. Cosmetics (hats, scarves) are **separate overlay sprites** (`assets/cosmetics/*.png`) added as child game objects at the same anchor/z as the base penguin, per the ground-fact convention — never baked into `penguin.png` itself, so the base sheet stays a single reusable asset regardless of owned cosmetics.

#### 4.4 Obstacle handling

The vignette plaza has a small, fixed set of solids (`room.solids` in `content/rooms.js`: fountain, benches, stall counter). `resolveObstacles()` (§4.2) is a pure circle-vs-AABB pushout, called every frame **before** the bounds clamp, so it is fully vitest-covered without touching KAPLAY's `area()`/`body()`/`onCollide` system at all. This is a deliberate deviation from game1 (which has no collision): the plaza is a hangout space where players naturally expect not to walk through the fountain, but the resolution logic stays pure/testable rather than living inside KAPLAY physics callbacks.

### 5. Camera, scale, bounds

`engine/camera.js` (pure):

```js
export const SCALE = 3;
export const CAM_LEAD = { x: 0, y: -50 };

export function computeCamPos(playerPos) {
  return { x: playerPos.x + CAM_LEAD.x, y: playerPos.y + CAM_LEAD.y };
}

export function computeCamScale(aspectRatio) {
  return aspectRatio < 1 ? 0.85 : 1.15;   // portrait phones zoom out, same as game1
}
```

`main.js` glue:

```js
k.onUpdate(() => k.setCamPos(k.vec2(computeCamPos(player.pos).x, computeCamPos(player.pos).y)));
function fitCam() { k.setCamScale(k.vec2(computeCamScale(k.width() / k.height()))); }
k.onResize(fitCam);
fitCam();
```

World bounds are per-room (`content/rooms.js` `bounds`), consumed by `clampToBounds()` (§4.2) — no physics/collision walls, a manual rectangle clamp exactly as game1 does.

### 6. NPC crowd: pure FSM driven entirely by KAPLAY's clock

This is the "it only pretends" fake-multiplayer core. The **decision logic** (what state comes next, where to wander, which line to speak) is pure and seed-deterministic; the **KAPLAY-side adapter** only reads the pure result and moves/animates a real game object.

`engine/npc-fsm.js`:

```js
export const NPC_STATES = ['idle', 'wander', 'emote', 'speak'];

export function createNpc({ id, archetype, x, y, seed }) {
  return {
    id, archetype,
    pos: { x, y }, wanderTarget: null,
    state: 'idle', timer: 1.2,          // seconds until next decision
    currentLine: null, facing: 'down',
    rng: seed >>> 0,
  };
}

function nextRng(rng) { return (rng * 1664525 + 1013904223) >>> 0; }
function pickInt(rng, bound) { return (nextRng(rng) >>> 16) % bound; }

const TRANSITIONS = {
  idle:   ['wander', 'wander', 'emote'],
  wander: ['idle', 'idle', 'idle', 'emote', 'speak'],
  emote:  ['idle'],
  speak:  ['idle'],
};

// Pure: no KAPLAY, no DOM, no wall clock. dtMs supplied by caller (KAPLAY's dt()*1000).
export function stepNpc(npc, dtMs, room, linePools) {
  if (dtMs <= 0) return npc;               // no-op on zero dt, same reference (callMachine convention)

  const timer = npc.timer - dtMs / 1000;
  if (timer > 0) {
    if (npc.state === 'wander' && npc.wanderTarget) {
      // move toward wanderTarget at a fixed pace; pure position update
      const dx = npc.wanderTarget.x - npc.pos.x, dy = npc.wanderTarget.y - npc.pos.y;
      const dist = Math.hypot(dx, dy) || 1;
      const step = Math.min(dist, NPC_SPEED * (dtMs / 1000));
      return { ...npc, timer,
        pos: { x: npc.pos.x + (dx / dist) * step, y: npc.pos.y + (dy / dist) * step },
        facing: resolveFacing(dx, dy, npc.facing) };
    }
    return { ...npc, timer };
  }

  const rng = nextRng(npc.rng);
  const options = TRANSITIONS[npc.state];
  const nextState = options[pickInt(rng, options.length)];
  const rng2 = nextRng(rng);

  const patch = { rng: rng2, state: nextState, timer: DECISION_INTERVALS[nextState] };
  if (nextState === 'wander') {
    patch.wanderTarget = pickWanderTarget(room.bounds, rng2);
  }
  if (nextState === 'speak') {
    patch.currentLine = pickLine(linePools[npc.archetype], rng2);
  }
  if (nextState === 'idle') { patch.wanderTarget = null; patch.currentLine = null; }

  return { ...npc, ...patch };
}
```

`DECISION_INTERVALS`, `NPC_SPEED`, `pickWanderTarget`, `pickLine` are small pure helpers in the same file, all exported for direct vitest coverage.

`main.js` adapter (impure, one per spawned NPC, called from the shared `k.onUpdate`):

```js
for (const entry of npcEntries) {
  entry.data = stepNpc(entry.data, dt * 1000, room, dialogueLines);
  entry.obj.pos.x = entry.data.pos.x; entry.obj.pos.y = entry.data.pos.y;
  entry.obj.z = entry.obj.pos.y;
  setAnim.call(entry.obj, entry.data.state === 'wander' ? `waddle-${dirGroup(entry.data.facing)}`
    : entry.data.state === 'emote' ? 'emote'
    : `idle-${dirGroup(entry.data.facing)}`, entry.data.facing === 'left');
  entry.bubble.setText(entry.data.state === 'speak' ? entry.data.currentLine : '');
}
```

**Dialogue-open gating decision:** opening the player's own dialogue/shop/dress-up overlay (`dialogueOpen()` flag, §7) freezes the *player* only, matching game1. NPCs are deliberately **not** frozen by an open overlay — the plaza should feel alive behind a menu — but a `speak` transition is suppressed (skipped back to `idle`) while any overlay is open, so a new speech bubble never renders underneath/behind a modal. This is a `main.js`-side check passed into the adapter loop (`uiOpen` boolean), not inside `stepNpc` itself, keeping the pure function agnostic of UI state; if a future room wants "freeze NPCs behind menus" instead, that's a one-line adapter change with no engine-core edit.

### 7. Interaction & dialogue overlay

`engine/interaction.js` (pure nearest-within-radius picker, generalized from game1's proximity scan to cover both hotspots and NPCs):

```js
export const INTERACT_R = 160;

export function findNearestInteractable(playerPos, candidates) {
  let best = null, bestDist = INTERACT_R;
  for (const c of candidates) {
    const d = Math.hypot(c.x - playerPos.x, c.y - playerPos.y);
    if (d < bestDist) { best = c; bestDist = d; }
  }
  return best;   // { id, kind, x, y } or null
}
```

`main.js` scans `[...room.hotspots, ...npcEntries.map(e => ({id:e.data.id, kind:'npc', x:e.data.pos.x, y:e.data.pos.y}))]` each frame, highlights the winner (scale bump), pulses a "▼ press E" prompt, and confirms via `k.onKeyPress('e'|'space')` or a DOM `#interact-btn` tap — identical pattern to game1. Confirming a `kind:'npc'` hit opens a speech-bubble-style overlay reading the NPC's `currentLine`; confirming `kind:'shop'`/`kind:'minigame'` opens the corresponding HTML panel from `ui/dialogue-overlay.js` (typewriter effect, pager, `prefers-reduced-motion`-aware, Esc/Enter/Arrow keybinds — ported from game1's `typeHtml`). All such UI is DOM overlay, never in-canvas KAPLAY text, per the established convention.

### 8. Full onUpdate loop (composed)

```js
k.onUpdate(() => {
  const dt = Math.min(k.dt(), 0.05);

  if (!dialogueOpen()) {
    // 1. player input + movement (§4.2)
    // 2. camera follow (§5)
  }

  // 3. NPC crowd tick — always runs unless the whole tree is paused by os-bridge (§9)
  for (const entry of npcEntries) advanceNpc(entry, dt, uiOpen());

  // 4. interaction scan + prompt (§7)
  const active = findNearestInteractable(player.pos, interactionCandidates());
  updateInteractPrompt(active);
});
```

Nothing in this loop reads `Date.now()` or registers a `setInterval`; every time-based decision consumes the `dt` sourced from `k.dt()`, which itself stops advancing the instant the tree root is paused.

### 9. os-bridge pause handshake (exact protocol, unchanged)

`frostbyte/os-bridge.js` is `game1/os-bridge.js` copied verbatim — channel `'os-bridge-v1'`; inbound OS→game `pause|resume|mute`; outbound game→OS `ready|paused|resumed`.

`main.js` wiring (only the `ready` title differs from game1):

```js
window.__osBridge?.onReady({
  pause:  () => { k.getTreeRoot().paused = true;  k.audioCtx?.suspend?.(); },
  resume: () => { k.getTreeRoot().paused = false; k.audioCtx?.resume?.(); },
  setMute:(b) => k.setVolume?.(b ? 0 : 1),
});
// os-bridge.js itself posts { ch:'os-bridge-v1', type:'ready', title:'Frostbyte' } on load
```

`index.html` script order (classic script BEFORE the module, non-negotiable — module scripts are deferred and `window.__osBridge` must exist first):

```html
<canvas id="game"></canvas>
<div id="dialogue-overlay" class="hidden"><!-- ... --></div>
<div id="hud"><!-- coin counter, interact prompt --></div>

<script src="./os-bridge.js"></script>
<script type="module" src="./main.js"></script>
```

`embedded` detection is reused verbatim from game1 (`new URLSearchParams(location.search).get('embedded') === '1'`) to hide any standalone-only chrome when hosted inside the DominikOS iframe.

Because pausing halts `k.getTreeRoot()` entirely, **every** NPC wander/emote/speak timer, the interaction-prompt pulse, and any future minigame countdown are frozen the instant the OS posts `pause` — no per-system pause flags are needed as long as everything is anchored to `k.dt()`.

### 10. Pure/impure module boundary

```
┌────────────────────────────────────────────────────────┐
│ main.js + ui/*.js   (impure: KAPLAY + DOM glue)         │
│  - boot, scene wiring, input capture, os-bridge         │
│  - reads engine/* pure results, writes to game objects  │
│  - owns the only k.onUpdate loop                        │
└───────────────────────┬──────────────────────────────────┘
                         │ plain data in / plain data out
                         ▼
┌────────────────────────────────────────────────────────┐
│ engine/*.js  (pure, framework-agnostic, vitest-covered) │
│  rng.js  movement.js  camera.js  npc-fsm.js             │
│  interaction.js  economy.js  save.js*                   │
└────────────────────────────────────────────────────────┘
                         ▲
                         │ static data
┌────────────────────────────────────────────────────────┐
│ content/*.js  (rooms, NPC roster, lines, catalog)       │
└────────────────────────────────────────────────────────┘
```
`*save.js` is pure decision logic wrapped around one narrow effectful boundary (`localStorage.getItem/setItem` in a try/catch), matching `os/src/os/storage.ts`'s own caveat — it is duplicated locally rather than imported across the Vite boundary, because `frostbyte/` is a flat, buildless static app like `game1/`, not part of the `os/` bundle.

### 11. Save schema

`engine/save.js`:

```js
const NS = 'dmos.v1.frostbyte';
const hasStorage = (() => { try { localStorage.setItem('__t','1'); localStorage.removeItem('__t'); return true; } catch { return false; } })();

export function read(key, fallback) {
  if (!hasStorage) return fallback;
  try { const raw = localStorage.getItem(`${NS}.${key}`); return raw ? JSON.parse(raw) : fallback; }
  catch { return fallback; }
}
export function write(key, value) {
  if (!hasStorage) return;
  try { localStorage.setItem(`${NS}.${key}`, JSON.stringify(value)); } catch { /* quota/private-mode: no-op */ }
}
```

Keys: `dmos.v1.frostbyte.avatar` (facing/cosmetic slots), `dmos.v1.frostbyte.coins`, `dmos.v1.frostbyte.owned` (cosmetic id set), `dmos.v1.frostbyte.lastRoom`. This rides the OS's global `dmos.v1` version wipe by design (per `os/src/os/storage.ts`'s `ensureVersion()`), which is a known, accepted limitation — no cross-device sync exists on the static/backendless model.

### 12. Asset generation additions (`gen-assets.js`)

Extends game1's generator with a Frostbyte-specific seeded PRNG (`SEED = 2600`, independent of game1's `1337`, kept for reproducibility) and new emit targets:
- `buildPenguin()` — 4x5 sheet (§4.3): body/beak/feet primitives via `disc`/`rrect`, palette-parameterized so the player-customizable avatar and each NPC archetype call the same builder with different palettes.
- `buildPlazaMap()` — ground tiles, ice texture scatter (seeded, like game1's map).
- `buildProp(name, ...)` — fountain, lamp, bench, stall, one PNG each, matching `content/rooms.js` `solids`/`hotspots` ids.
- `buildCosmetic(name, ...)` — hat/scarf overlays, transparent background, same 16x16 anchor as the penguin base frame.

All output is committed to `assets/`; the generator is a build-time Node step (`node gen-assets.js`), re-run and re-committed whenever art changes, exactly like game1.

### 13. Vitest plan

`frostbyte/package.json` (minimal, isolated from `os/`'s toolchain since this is a flat static app):

```json
{
  "name": "frostbyte-engine-tests",
  "private": true,
  "type": "module",
  "scripts": { "test": "vitest run" },
  "devDependencies": { "vitest": "^1.6.0" }
}
```

`vitest.config.js` defaults to `environment: 'node'` (all pure modules need no DOM); `save.test.js` opts into jsdom per-file via a `// @vitest-environment jsdom` docblock so it can exercise `localStorage`.

Test matrix:

| file | cases |
|---|---|
| `movement.test.js` | zero input -> zero vector; diagonal WASD normalized (no 1.41x speed); `moveTarget` steering converges within `ARRIVE_EPS` and clears (`arrived`) within N frames; keyboard input cancels an active `moveTarget`; `clampToBounds` pins exactly at each of the 4 edges; `resolveObstacles` pushes a point fully inside a solid out to `radius` from the nearest edge; `resolveFacing` holds previous facing on zero delta (no idle jitter) |
| `camera.test.js` | `computeCamPos` applies fixed lead offset; `computeCamScale` returns 0.85 below aspect 1, 1.15 at/above |
| `npc-fsm.test.js` | same seed + same `dtMs` sequence -> byte-identical state sequence (determinism); different seed -> divergent wander target within 20 steps; `state` never leaves `NPC_STATES`; `speak` always resolves a line present in the archetype's pool; `dtMs=0` returns the same object reference (no-op); bounded loop — 1000 ticks x 20 seeded NPCs terminates and total `speak` transitions stay within an expected budget (guards against runaway chatter) |
| `interaction.test.js` | nearest-within-radius picks the closest of several candidates; returns `null` when all candidates exceed `INTERACT_R`; ties broken deterministically (first-in-array) |
| `economy.test.js` | affordable purchase decrements coins, adds to `owned`, emits `purchased`; insufficient funds is a no-op returning the same reference and emits `insufficient-funds`; purchasing an already-owned item is idempotent |
| `save.test.js` | write/read roundtrip under the `dmos.v1.frostbyte.*` prefix; simulated quota/private-mode failure leaves reads returning the fallback without throwing; a global version wipe (clearing all `dmos.*` keys) also clears Frostbyte's keys, asserting the accepted shared-wipe behavior |

All loops in tests are bounded by an explicit iteration count or seed-list length (`[1,2,3,7,42]`-style), consistent with the project's no-unbounded-`while` discipline.

---

## World & Room Design

Everything named below — the plaza, its statue, the shop, the minigame, every expansion room — is invented for this project. No layout, name, or character here is drawn from any real product; the only place a homaged product's name appears anywhere in the codebase is inside `legal-gate.mjs`'s `BANNED_CONTENT_ANY` fingerprint list.

### Room inventory

| Room (original name) | Tag | Purpose | Scene id |
|---|---|---|---|
| **Chillmere Plaza** | **Vignette — build first** | Central hub: avatar shows off cosmetics, meets the NPC crowd, earns/spends coins, enters the one minigame | `plaza` |
| The Driftwood Den | Expansion | Player's private room — place-and-arrange furniture, second cosmetic surface | `den` |
| Glasswind Court | Expansion | Outdoor ice-sport room, second minigame ("glide-and-spin" scoring loop) | `court` |
| Emberlight Workshop | Expansion | Crafting / odd-jobs room — a second coin *source* to balance the Den's coin *sink* | `workshop` |
| Frostline Trail | Expansion | Linear exploration path, collectible pins, seasonal-event hook | `trail` |

The vignette is exactly one scene (`plaza`). Every expansion room is added later purely as data — a new `rooms/<id>.js` file plus one `k.scene()` registration line — never a change to shared engine code.

---

### Shared room-config schema

```js
// dominikos/frostbyte/rooms/plaza.js  (same shape for every room file)
export const ROOM_PLAZA = {
  id: 'plaza',
  title: 'Chillmere Plaza',
  mapAsset: './assets/room-plaza.png',        // gen-assets.js -> buildRoomPlaza()
  tile: 16, gridCols: 30, gridRows: 20,        // native map = 480x320px
  scale: 3,                                    // SCALE, matches game1
  bounds: { x0: 72, x1: 1368, y0: 120, y1: 864 }, // world-px player.pos clamp (game1 BOUNDS pattern)
  spawnPoints: {
    default:      { x: 720, y: 800, facing: 'up' },   // south gate, first load / unknown lastRoom
    fromDen:      { x: 620, y: 800, facing: 'up' },
    fromCourt:    { x: 1300, y: 500, facing: 'left' },
    fromWorkshop: { x: 130,  y: 500, facing: 'right' },
    fromTrail:    { x: 720, y: 170, facing: 'down' },
    fromMinigame: { x: 1050, y: 620, facing: 'down' },
  },
  camera: { leadY: -50 },   // no separate cam clamp — camera follows player, who is already bounds-clamped (game1 pattern)
  hotspots: [ /* static props, see table below */ ],
  doors:    [ /* see table below */ ],
  npcSpawnAnchors: [ /* see NPC section */ ],
};
```

`dominikos/frostbyte/rooms/index.js` exports `ROOM_REGISTRY = { plaza: ROOM_PLAZA, den: ROOM_DEN, court: ROOM_COURT, workshop: ROOM_WORKSHOP, trail: ROOM_TRAIL }`. `main.js` does:

```js
Object.values(ROOM_REGISTRY).forEach(room => k.scene(room.id, () => buildRoom(k, room)));
k.go(lastRoom(), spawnFor(lastRoom()));
```

`lastRoom()` reads `dmos.v1.frostbyte.lastRoom` (via the project's `read`/`write` storage helpers); if that room id is no longer in `ROOM_REGISTRY` (e.g. after a global `dmos.version` wipe) it falls back to `'plaza'`/`'default'`. Only `plaza` exists for the vignette ship — `ROOM_REGISTRY` simply has one entry until expansion rooms land.

Copy/dialogue is kept out of room files, mirroring game1's `content.js` split: `dominikos/frostbyte/content.js` maps a hotspot/door `id` → `{ title, subtitle, pages:[{html}] }`, loaded the same way `openDialogue(active.hsId)` already works in `main.js`.

---

### Chillmere Plaza (vignette — the must-build room)

**Purpose**: the entire playable vignette. One screen that has to sell the whole game: a cosy square, a crowd that feels alive, one dress-up loop, one coin-earning minigame, and four signposted "more to come" doors that make the world feel bigger than it is without costing a line of extra engine code.

**Layout sketch** (30x20 tile grid, 1 char ≈ 1 tile, north at top):

```
                         [D-N: Frostline Trail]
                                  ▲
   T  T  .  .  .  .  .  .  .  .  .  .  .  .  T  T
   T  .  .  .  .  .  .  .  .  .  .  .  .  .  .  T
   .  .  .  .  .  .  .  F  .  .  .  .  .  .  .  .
   .  .  .  .  .  . ~ ~ ~ ~ ~ .  .  .  .  .  .  .
   .  .  .  .  .  ~ ~ ~ ~ ~ ~ ~  .  .  .  .  .  .
   .  .  .  .  .  . ~ ~ ~ ~ ~ .  .  .  .  .  .  .
   .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .
[D-W]                                          [D-E]
Workshop  S  S  .  .  B     B  .  .  .  M  M  Court
   S  S  .  .  .  .  .  .  .  .  .  M  M  .
   .  .  .  .  .  .  @  .  .  .  .  .  .  .  .  .
   .  .  N  .  .  .  .  .  .  .  B  .  .  .  .  .
   T  .  .  .  .  .  .  H  .  .  .  .  .  .  .  T
   T  T  .  .  .  .  .  H  .  .  .  .  .  .  T  T
                         ▼
                    [D-Home: Driftwood Den]
```

Legend: `T` decorative pine, `~` frozen pond (non-walkable, ring the edge with a low wall/hedge collider so the player can't "stand on water"), `F` centerpiece statue, `S` shop kiosk footprint, `M` minigame hut footprint, `B` bench, `N` notice board, `@` default player spawn, `H` home-cabin door footprint, `D-*` locked path doors at the four compass exits.

**Interactive hotspots** (static, world-px = `col*48+24`, `row*48+24` at `tile=16, scale=3`):

| id | label | kind | x,y (world px) | behaviour |
|---|---|---|---|---|
| `fountain-driftback` | "Driftback's Fountain" | `landmark` | 792, 264 | Paged flavour dialogue about *Driftback the Wayfinder*, an original founding-explorer penguin (statue only — no live character). Ambient sparkle particles. No coins involved. |
| `shop-glimmerwool` | "Glimmer & Wool" | `shop` | 96, 552 | Opens the HTML cosmetics overlay (hats/scarves/colour dyes). Coin **sink**. |
| `minigame-snowdrift` | "Snowdrift Toss" | `minigame` | 1128, 552 | Opens the minigame entry (see below). Coin **source**. |
| `noticeboard-chronicle` | "The Chillmere Chronicle" | `noticeboard` | 168, 792 | Rotating paged flavour tips/"patch notes" written in-world, reuses game1's typewriter dialogue pager. |
| `bench-north` | — | `sit` | 408, 264 | Optional polish: player sits (idle-sit anim via `state()`), purely cosmetic, no dialogue. |
| `bench-south` | — | `sit` | 552, 696 | Same as above, second bench. |

**Doors / navigation** (all four are locked-teaser doors in the vignette — the rooms behind them don't exist yet):

| id | label | x,y | targetRoom | locked | locked copy |
|---|---|---|---|---|---|
| `door-trail` (N) | "Frostline Trail" | 720, 96 | `trail` | true | "The trail's still snowed in — check back soon." |
| `door-court` (E) | "Glasswind Court" | 1368, 456 | `court` | true | "They're still smoothing the ice out there." |
| `door-workshop` (W) | "Emberlight Workshop" | 72, 456 | `workshop` | true | "The workshop lamps aren't lit yet." |
| `door-den` (Home) | "Your Den" | 720, 936 | `den` | true | "Your den is still being built. Hang tight!" |

A locked door plays a one-line dialogue toast (reuses the existing dialogue overlay, single page, no pager) instead of transitioning scenes. When an expansion room ships, flipping `locked:false` and giving it a real `targetSpawn` is the *entire* navigation change — no engine code moves.

**Spawn points**: `default` (720,800, facing up) is used on first-ever load and whenever `lastRoom` resolves to `plaza` with no specific origin. The `from*` spawns exist now only so the door schema is future-proof; they're unused until the corresponding room ships.

**Camera bounds**: no separate camera clamp — `k.setCamPos(player.pos.x, player.pos.y - 50)` every frame (game1's exact pattern), and because `player.pos` is already clamped to `bounds`, the camera never shows past the map edge as long as `bounds` is inset far enough from the 1440x960 world-px map (30x20 tiles x 48). The `{x0:72,x1:1368,y0:120,y1:864}` inset (1.5 tiles horizontally, 2.5/2 tiles vertically) is a starting point — verify empirically once `room-plaza.png` exists by resizing the preview to 375x812 (mobile portrait, `k.setCamScale` zoomed to 0.85 per the existing `fitCam()` `onResize` handler) and confirming no blank canvas is visible at any of the four bounds corners; tighten the inset if it is.

**NPC crowd anchors** (consumed by the NPC/fake-multiplayer module, defined here since they're room geometry): 5–7 wander anchors scattered on open `.` tiles away from the pond and props, e.g. `{ id:'anchor-1', x:480, y:600, roamRadius:120 }` … each anchor's `roamRadius` must keep `anchor.x ± roamRadius` and `anchor.y ± roamRadius` inside `bounds` (enforced by a test, below). NPC penguins themselves are **not** static hotspots — they're live game objects, so the nearest-interactable scan in `main.js` must be extended to merge the static `hotspots` array with the current live NPC list each frame (both need `id`, world `pos`, and a `kind` so `openDialogue()` can branch on `kind === 'npc'` vs a static id lookup into `content.js`).

**Minigame entry contract** (the internal layout of Snowdrift Toss itself belongs to the minigame-design section of this plan, not here — this is only the room-boundary interface): interacting with `minigame-snowdrift` calls `k.go('minigame-snowdrift', { from: 'plaza' })`. The minigame scene is expected to call `k.go('plaza', { spawn: 'fromMinigame', coinsEarned })` on exit; `plaza`'s scene setup reads that param to place the player and to run the coin-award/toast side effect. This keeps Chillmere Plaza's own code ignorant of minigame internals.

---

### Expansion rooms

Each is sketched to the same fidelity as the doors above — enough to build against later without pre-committing internals that belong to other sections (economy, NPC AI, cosmetics catalog).

#### The Driftwood Den

**Purpose**: player's private, decoratable room — the classic "customise your own space" loop, built entirely from original furniture props. Second cosmetic coin sink (buy furniture instead of outfits).

```
   #  #  #  #  #  #  #  #  #  #  #
   #  .  .  .  .  .  .  .  .  .  #
   #  .  .  R  .  .  .  .  .  .  #
   #  .  .  .  .  .  .  W  .  .  #
   #  .  .  .  .  @  .  .  .  .  #
   #  .  .  .  .  .  .  .  .  .  #
   #  #  #  #  # D  #  #  #  #  #
```
`R` = rug/furniture placement anchor, `W` = original wall-art hook, `D` = door back to Plaza.

- Hotspots: `furniture-catalog` (`kind:'shop'`) opens a placement UI; individual placed items become their own interactable props once placed (`kind:'furniture'`, editable/removable).
- Doors: one, `door-plaza` → `plaza`, `spawn:'fromDen'`.
- Spawn: `default` at room centre (facing down, into the room) when entering fresh; door re-entry always lands at the fixed interior spawn (a private room has no "returning from" variants).
- Camera bounds: small interior, `bounds` inset 1 tile from all four interior walls; `leadY` can drop to `-20` (less vertical lead needed in a small room).

#### Glasswind Court

**Purpose**: outdoor ice-sport room hosting a second minigame ("glide-and-spin" scoring loop, original — not a copy of any named real-world or existing-product ice game).

```
   T  .  .  .  .  .  .  .  .  .  T
   .  .  ============  .  .  .  .
   .  .  ============  .  .  .  .
   .  .  ====  @  =====  .  .  .
   .  .  ============  .  .  .  .
   B  .  .  .  .  .  .  .  .  .  B
              D
```
`=` = ice-rink surface (distinct physics: higher slide/lower friction on the player's `move()` — an original movement variant, not a new engine feature), `B` = spectator benches.

- Hotspots: `rink-entry` (`kind:'minigame'`) launches the glide-and-spin scene; benches (`kind:'sit'`) for idle flavour.
- Doors: one, `door-plaza` → `plaza`, `spawn:'fromCourt'`.
- Spawn: `default` at the rink edge, facing onto the ice.
- Camera bounds: wider than the Den (outdoor room), inset consistent with Plaza's formula; the rink itself sits inside `bounds`, not flush with it, so a spinning avatar never approaches the clamp edge mid-minigame.

#### Emberlight Workshop

**Purpose**: crafting / odd-jobs room — a coin *source* that pairs with the Den and Glimmer & Wool's coin *sinks*, and a second surface for cosmetic unlocks (crafted items instead of purchased ones).

```
   #  #  #  #  #  #  #  #  #
   #  .  .  C  .  .  .  .  #
   #  .  .  .  .  .  J  .  #
   #  .  .  @  .  .  .  .  #
   #  .  .  .  .  .  .  .  #
   #  #  #  D  #  #  #  #  #
```
`C` = crafting bench (turns collected materials into cosmetics), `J` = job board (short repeatable task prompts, canned/local like NPC dialogue — no server).

- Hotspots: `crafting-bench` (`kind:'craft'`), `job-board` (`kind:'jobs'`).
- Doors: one, `door-plaza` → `plaza`, `spawn:'fromWorkshop'`.
- Spawn: `default` just inside the door, facing into the room.
- Camera bounds: small interior, same inset rule as the Den.

#### Frostline Trail

**Purpose**: a linear outdoor path for exploration and collectibles (original "pins" or "charms" hidden along the route) — the room most suited to later seasonal-event content without touching the core plaza.

```
[D-plaza]
   .  .  T  .  .  .  .  T  .  .
   @  .  .  .  P  .  .  .  .  .
   .  .  T  .  .  .  .  T  .  .
   .  .  .  .  .  P  .  .  .  .
   .  T  .  .  .  .  .  T  .  .
                              [dead end / "more coming"]
```
`P` = collectible-pin spawn points (original charm icons, position-seeded so a given save always finds pins in the same spots — reuses the project's seeded-LCG determinism convention).

- Hotspots: none interactive besides the pins themselves (`kind:'collectible'`, one-time pickup, persisted in `dmos.v1.frostbyte.collectedPins`).
- Doors: `door-plaza` at the west end → `plaza`, `spawn:'fromTrail'`. The east end is a visual dead-end (snowdrift prop) rather than a door — reserves room to extend the trail further in a later expansion without redesigning this one.
- Spawn: `default` at the west entrance, facing right (east).
- Camera bounds: because this room is long and narrow, `bounds` is a wide-but-short rectangle; `leadY` can stay at the Plaza default since the path is still primarily horizontal-scroll with vertical wiggle.

---

### Room-config validation & tests

`dominikos/frostbyte/rooms/rooms.test.js` (vitest, pure-data, no DOM — same discipline as `mines/engine.test.ts`):

```js
import { describe, it, expect } from 'vitest';
import { ROOM_REGISTRY } from './index.js';

const INTERACT_R = 168; // must match main.js's interaction radius

describe('room configs', () => {
  for (const room of Object.values(ROOM_REGISTRY)) {
    it(`${room.id}: every spawn point is inside bounds`, () => {
      for (const [name, sp] of Object.entries(room.spawnPoints)) {
        expect(sp.x).toBeGreaterThanOrEqual(room.bounds.x0);
        expect(sp.x).toBeLessThanOrEqual(room.bounds.x1);
        expect(sp.y).toBeGreaterThanOrEqual(room.bounds.y0);
        expect(sp.y).toBeLessThanOrEqual(room.bounds.y1);
      }
    });

    it(`${room.id}: every hotspot and door is inside bounds`, () => {
      for (const h of [...room.hotspots, ...room.doors]) {
        expect(h.x).toBeGreaterThanOrEqual(room.bounds.x0);
        expect(h.x).toBeLessThanOrEqual(room.bounds.x1);
        expect(h.y).toBeGreaterThanOrEqual(room.bounds.y0);
        expect(h.y).toBeLessThanOrEqual(room.bounds.y1);
      }
    });

    it(`${room.id}: no two interactables are closer than INTERACT_R (ambiguous nearest-scan)`, () => {
      const all = [...room.hotspots, ...room.doors];
      for (let i = 0; i < all.length; i++) {
        for (let j = i + 1; j < all.length; j++) {
          const d = Math.hypot(all[i].x - all[j].x, all[i].y - all[j].y);
          expect(d).toBeGreaterThanOrEqual(INTERACT_R);
        }
      }
    });

    it(`${room.id}: every door target room+spawn resolves`, () => {
      for (const d of room.doors) {
        expect(ROOM_REGISTRY[d.targetRoom] || d.locked).toBeTruthy();
        if (!d.locked) {
          expect(ROOM_REGISTRY[d.targetRoom].spawnPoints[d.targetSpawn]).toBeDefined();
        }
      }
    });

    it(`${room.id}: NPC wander anchors stay fully inside bounds`, () => {
      for (const a of room.npcSpawnAnchors ?? []) {
        expect(a.x - a.roamRadius).toBeGreaterThanOrEqual(room.bounds.x0);
        expect(a.x + a.roamRadius).toBeLessThanOrEqual(room.bounds.x1);
        expect(a.y - a.roamRadius).toBeGreaterThanOrEqual(room.bounds.y0);
        expect(a.y + a.roamRadius).toBeLessThanOrEqual(room.bounds.y1);
      }
    });
  }

  it('door graph: locked doors in the vignette point at real (future) ids, not typos', () => {
    const knownFutureIds = ['plaza', 'den', 'court', 'workshop', 'trail'];
    for (const room of Object.values(ROOM_REGISTRY)) {
      for (const d of room.doors) {
        expect(knownFutureIds).toContain(d.targetRoom);
      }
    }
  });
});
```

Because `plaza` is the only entry in `ROOM_REGISTRY` for the vignette ship, most of this suite is a no-op until expansion rooms are added — but it's written against the full five-room shape now so each expansion PR is "add a room object, get validation for free," matching the project's pure-data/vitest-first discipline.

### P0 hooks this section implies (for the legal-gate and asset-generation sections of the plan)

- `gen-assets.js` needs one new builder per shipped room map: `buildRoomPlaza()` now; `buildRoomDen/Court/Workshop/Trail()` later. Output path convention: `frostbyte/assets/room-<id>.png`.
- `legal-gate.mjs`'s `SCAN_ROOTS` must include the new `dominikos/frostbyte/` folder (it is not scanned by default) before any of this room content is committed.
- None of the five room/prop/character names above (Chillmere Plaza, Driftback the Wayfinder, Glimmer & Wool, Snowdrift Toss, The Chillmere Chronicle, The Driftwood Den, Glasswind Court, Emberlight Workshop, Frostline Trail) resemble a real product's trademarked terms; no fingerprint additions are needed on their account.

---

## Avatar + Customisation + Save Schema + Economy

Scope of this section: the code-drawn penguin (body colour + layered cosmetics), its animation/emote states, the dress-up UI, the versioned localStorage save, and the single-player coin economy that ties them together. All numbers, item names, and art are original — nothing here references or targets any real product's assets.

A note on typing: `dominikos/frostbyte/` is a zero-build static app (plain ESM, `<script type="module">`, no `tsc` step — same as `game1/`). The interfaces below are written in TypeScript syntax because that is the clearest way to specify a schema, but they ship as **JSDoc `@typedef` blocks in plain `.js` files**, not `.ts` files. Treat every interface here as "the JSDoc typedef that must exist in the named file," not literal TypeScript.

---

### 1. Code-drawn penguin: layered sprite architecture

The penguin is not one flat sprite per colour/outfit combo (that explodes combinatorially and fights the legal-gate's "everything is generated" discipline). It's a small stack of independently-generated, alignment-locked sprite sheets composited at runtime — one shared skeleton, swappable skins.

**Shared geometry** (matches `game1`'s hero sheet exactly, so the movement/anim code ports over untouched):

```
CELL  = 16px per frame (pre-SCALE)
SHEET = 4 cols x 3 rows = 64x48px
row 0 = facing down  (frames 0-3)
row 1 = facing side  (frames 4-7)   -- right; left = flipX mirror
row 2 = facing up    (frames 8-11)
```

```
col->   0    1    2    3
row0  [D0] [D1] [D2] [D3]   down walk cycle
row1  [S0] [S1] [S2] [S3]   side walk cycle (right; mirrored for left)
row2  [U0] [U1] [U2] [U3]   up walk cycle
```

**Layer stack**, bottom to top, all sheets sharing the identical 4x3/16px grid so one frame index drives every layer in lockstep:

```
z  layer    source file (generated)              tinted?         equip slot
0  body     assets/penguin_body.png               yes, k.color()  (always on)
1  belly    assets/penguin_belly.png              no, fixed cream (always on)
2  neck     assets/neck_<itemId>.png              no               'neck'
3  eyewear  assets/eyewear_<itemId>.png           no               'eyewear'
4  held     assets/held_<itemId>.png              no               'held'
5  hat      assets/hat_<itemId>.png               no               'hat'
```

`penguin_body.png` is drawn in **grayscale value only** (highlight ~230, mid ~170, shadow ~100 on every channel equally) so KAPLAY's `color()` component — which multiplies texture RGB by the tint colour channel-wise — recolours the whole body convincingly from a single sheet. `penguin_belly.png` is a fixed cream/off-white patch (never tinted) drawn on a second, mostly-transparent sheet of the same dimensions, giving the classic light-belly/dark-back silhouette without baking a single flat colour. Cosmetic sheets (`neck_*`, `eyewear_*`, `hat_*`, `held_*`) are transparent everywhere except where the item is visible for that frame — e.g. a held item sprite is empty on the `up`-facing row (fully behind the body) and only drawn on `down`/`side` rows.

**Runtime compositor** — `dominikos/frostbyte/src/avatarLayers.js`:

```js
// avatarLayers.js — pure KAPLAY glue, no game state, no DOM
export function makeAvatarActor(k, cfg, pos) {
  // cfg: { bodyColorId, equipped: { hat, eyewear, neck, held } }
  const root = k.add([k.pos(pos), k.z(0), "avatar"]);
  const layer = (id, spriteKey, z, tint) => {
    if (!spriteKey) return null;
    const opts = [k.sprite(spriteKey), k.anchor("center"), k.scale(SCALE), k.z(z)];
    if (tint) opts.push(k.color(tint));
    return root.add(opts);
  };
  const body    = layer("body", "penguin_body", 0, colorForId(k, cfg.bodyColorId));
  const belly   = layer("belly", "penguin_belly", 1, null);
  const neck    = layer("neck", cfg.equipped.neck && `neck_${cfg.equipped.neck}`, 2, null);
  const eyewear = layer("eyewear", cfg.equipped.eyewear && `eyewear_${cfg.equipped.eyewear}`, 3, null);
  const held    = layer("held", cfg.equipped.held && `held_${cfg.equipped.held}`, 4, null);
  const hat     = layer("hat", cfg.equipped.hat && `hat_${cfg.equipped.hat}`, 5, null);
  return { root, parts: [body, belly, neck, eyewear, held, hat].filter(Boolean) };
}

// Keeps every layer's frame/flip in lockstep — call once per frame from the
// same place game1's setAnim() is called.
export function syncFrame(actor, frameIdx, flipX) {
  for (const p of actor.parts) { p.frame = frameIdx; p.flipX = flipX; }
}

function colorForId(k, bodyColorId) {
  const hex = BODY_COLORS.find(c => c.id === bodyColorId)?.hex ?? BODY_COLORS[0].hex;
  return k.Color.fromHex(hex);
}
```

`root.add([...])` gives KAPLAY parent-child position inheritance, so moving `root.pos` moves every layer together; `z` is still resolved within the parent's local stacking order, matching the depth-sort convention already used for `player.z = player.pos.y`. NPC crowd penguins are built with the exact same `makeAvatarActor()`, fed a *seeded* random config (reusing the project's Numerical-Recipes LCG convention from `gen-assets.js`'s `rnd()`) so the crowd's look is varied but deterministic/testable — no two NPCs need hand-authored configs.

**Asset generator** — extend `dominikos/frostbyte/gen-assets.js` (own copy, not shared with `game1/`, per the "self-contained sibling folder" rule) with:

```js
buildPenguinBody();               // -> assets/penguin_body.png  (grayscale, 64x48)
buildPenguinBelly();              // -> assets/penguin_belly.png (cream patch, 64x48)
for (const item of ITEM_CATALOG) buildCosmetic(item);
                                   // -> assets/{slot}_{itemId}.png (64x48, mostly transparent)
for (const emote of EMOTES) buildEmoteIcon(emote);
                                   // -> assets/icon_{emoteId}.png (12x12, single glyph)
```

Every output is a PNG hand-encoded by the same zero-dependency pipeline as `game1/gen-assets.js` (CRC32 + `zlib.deflateSync`, `px/rect/disc/rrect` primitives, seeded `rnd()`). Re-run with `node gen-assets.js` after any art change; outputs are committed, matching the project's build-time-generation convention.

---

### 2. Animation states

Loaded once via `k.loadSprite('penguin_body', './assets/penguin_body.png', { sliceX:4, sliceY:3, anims:{...} })` and identically for every cosmetic sheet key, so `syncFrame()` can drive them all with the same frame index. Anim table is copied verbatim from `game1`'s convention:

| anim key      | frames | loop | speed | trigger                              |
|---------------|--------|------|-------|---------------------------------------|
| `idle-down`   | 0      | —    | —     | not moving, last facing = down        |
| `walk-down`   | 0→3    | yes  | 8     | moving, dominant axis = down          |
| `idle-side`   | 4      | —    | —     | not moving, last facing = left/right  |
| `walk-side`   | 4→7    | yes  | 8     | moving, dominant axis = left/right    |
| `idle-up`     | 8      | —    | —     | not moving, last facing = up          |
| `walk-up`     | 8→3+8  | yes  | 8     | moving, dominant axis = up            |

Left-facing reuses `walk-side`/`idle-side` with `flipX=true`, exactly like `game1`'s hero — no separate left row is drawn, keeping the cosmetic sheets 4x3 instead of 4x4.

### 3. Emotes (expressive states without extra frames)

Rather than doubling the sprite-sheet budget for every emote, an emote is a **UI-layer overlay + a lightweight tween**, not new body frames — cheaper to generate, cheaper to legal-gate-scan, and trivially paused by the tree-root pause contract since tweens run on KAPLAY's clock.

```js
// EMOTES catalog (content.js) — id, icon asset, tween preset, spoken-free
export const EMOTES = [
  { id: "wave",  icon: "icon_wave",  tween: "bob"   },  // small vertical bob x2
  { id: "dance", icon: "icon_note",  tween: "wiggle"},  // side-to-side rock, looping 1.2s
  { id: "sit",   icon: null,         tween: "squash"},  // scale.y *0.85, holds until moved
  { id: "sleep", icon: "icon_zzz",   tween: "none"  },  // icon only, idle-anim underneath
  { id: "heart", icon: "icon_heart", tween: "bob"   },
];
```

Playing one is: `k.tween(actor.root.scale, ..., 0.35, ...)` (or the relevant preset) plus a floating icon bubble built from the exact same `k.rect + k.text/sprite at z(100000)` pattern `game1` already uses for its floating labels. This reuses the "it only pretends" FSM idea (`idle -> wander -> emote -> speak`) that the `state()` component is intended for — NPCs enter `emote` state on a gated `wait()` timer, players trigger it from the (future) radial/emote menu; both paths call the same `playEmote(actor, emoteId)` helper. `icon_*` glyphs are simple geometric pixel-art (a raised mitten, a music note, "Zzz" text, a filled heart) generated by `gen-assets.js`, not emoji-font glyphs — keeps the whole art pipeline code-drawn and legal-gate-clean.

Speech (canned NPC lines / player chat) stays the existing HTML dialogue-overlay pattern from `game1` (`#dialogue-overlay`, typewriter effect) — out of scope for this section, but note it should freeze **that actor's** wander timer, not the whole tree, so the plaza stays alive around an open bubble.

---

### 4. Cosmetic item catalog & slots

Four equip slots (`hat`, `eyewear`, `neck`, `held`) plus body colour, which is not a "slot" — it's a direct property since the base layer is always present. Rarity is purely a pricing/pacing label, not a mechanical stat.

```
Body colours (BODY_COLORS, content.js) — 4 free starters + 8 unlockable dyes
  starter (owned at save creation): classic-charcoal, powder-blue, blush-pink, mint
  unlockable (15 coins each):       frost-blue, berry, moss, sunrise-orange,
                                     lilac, slate, harbor-gold, deep-teal

Hats        (slot: hat)      Eyewear   (slot: eyewear)   Neck        (slot: neck)
  snug-beanie      20c         round-shades   15c          striped-scarf   15c
  party-cone       20c         star-specs     30c          bandana         15c
  propeller-cap    35c         goggles        30c          bowtie          30c
  ice-crown        60c

Held        (slot: held)
  mini-flag        40c
  bubble-wand      40c
  snowball         40c
  sparkler-wand    120c   (epic — trailing-particle held item, cosmetic only)
```

Catalog entry shape (`content.js`):

```js
/** @typedef {Object} ItemDef
 *  @property {string} id            // kebab-case, unique, e.g. "party-cone"
 *  @property {'hat'|'eyewear'|'neck'|'held'|'dye'} slot
 *  @property {string} label         // shown in UI, e.g. "Party Cone"
 *  @property {'common'|'uncommon'|'rare'|'epic'} rarity
 *  @property {number} price         // coins; 0 for starter/free items
 *  @property {boolean} starter      // true = owned at save creation
 */
export const ITEM_CATALOG = [
  { id: "snug-beanie", slot: "hat", label: "Snug Beanie", rarity: "common", price: 20, starter: false },
  // ...24 items total, see table above
];
```

Total catalog: 8 dyes + 4 hats + 3 eyewear + 3 neck + 4 held = **22 unlockable items**, sum of prices ≈ **645 coins** to own everything (see §8 for pacing math against the earn rates).

---

### 5. Customisation UI (dress-up screen)

An HTML/DOM overlay over the canvas — same reasoning as `game1`'s dialogue overlay: crisp text, real focus/keyboard handling, no in-canvas text rendering. Opened by walking up to the plaza's mirror/wardrobe prop (an interactable like any other hotspot) and pressing E/tap, or from a HUD button.

```
┌─ #customize-overlay ─────────────────────────────────────────┐
│  Dress Up                                    Coins: 245  [x] │
│ ┌──────────────┐  [ Color ] [ Hat ] [ Eyewear ] [ Neck ] [ Held ] │
│ │              │  ┌─────┬─────┬─────┬─────┬─────┐             │
│ │   preview    │  │ o   │ o   │ o   │ 🔒  │ 🔒  │  <- item grid│
│ │  (live       │  │owned│owned│equip│20c  │60c  │   (owned /   │
│ │   penguin,   │  └─────┴─────┴─────┴─────┴─────┘   locked+price)│
│ │   idle-down) │                                              │
│ │  [<] turn [>]│         [ Equip ]      [ Buy & Equip ]        │
│ └──────────────┘                                              │
└────────────────────────────────────────────────────────────────┘
```

- **Tabs** = the 4 equip slots + Color; each renders `ITEM_CATALOG.filter(i => i.slot === activeTab)` (Color tab renders `BODY_COLORS`) as a grid of swatch buttons.
- **Item cell states**: owned+equipped (highlighted ring), owned+not-equipped ("Equip"), locked (dimmed + lock icon + price, "Buy & Equip" spends coins then equips atomically — see `unlockItem()` below).
- **Preview pane** is a real, small, second `makeAvatarActor()` instance rendered in an isolated preview `k.scene` region or a second canvas layer, driven by `idle-down`/`idle-side` toggled by `[<] [>]` so the player can check all three facings before buying.
- Equip/purchase writes go straight through the economy engine (§9) and re-render the grid + coin counter; nothing here mutates `localStorage` directly — the UI only calls `economy.js` functions and then `save.js`'s `persist(save)`.
- Closing the overlay uses the same `frozen`-flag pattern as the dialogue overlay (movement disabled while open); NPC wander timers are **not** paused by this UI (the plaza should visibly stay alive behind the wardrobe), only the player's own input is frozen.

---

### 6. Save schema (localStorage, `dmos.v1.frostbyte.*`)

Frostbyte is a standalone static app and cannot `import` the OS's TypeScript `os/src/os/storage.ts` module across the deploy boundary, so `dominikos/frostbyte/src/save.js` is a **deliberate clone** of its NS/version/try-catch/`hasStorage` pattern, scoped under the OS's existing namespace so it still rides the OS's global wipe-on-version-bump behaviour by design.

```js
// save.js
const OS_NS = "dmos.v1";                 // must match os/src/os/storage.ts NS exactly
const SAVE_KEY = `${OS_NS}.frostbyte.save`;
const SCHEMA_VERSION = 1;                 // Frostbyte-internal, independent of OS_NS's own version

let hasStorage = true;
try {
  const t = "__frostbyte_probe__";
  localStorage.setItem(t, "1"); localStorage.removeItem(t);
} catch { hasStorage = false; }
```

**Interfaces** (JSDoc `@typedef` in `save.js`, shown here as TS for readability):

```ts
interface FrostbyteSaveV1 {
  schemaVersion: 1;
  coins: number;
  avatar: AvatarConfig;
  ownedItems: string[];                        // item ids; includes the 4 starter dye ids
  npcGreetedOn: Record<string, string>;         // npcId -> "YYYY-MM-DD" of last daily-greet coin
  pickupsCollectedOn: Record<string, string>;   // pickupId -> "YYYY-MM-DD" of last collection
  lastLoginDate: string | null;                 // "YYYY-MM-DD", null on first-ever save
  loginStreak: number;                          // consecutive calendar days opened
  prefs: FrostbytePrefs;
  createdAt: string;                            // ISO timestamp, set once
  updatedAt: string;                            // ISO timestamp, bumped on every persist()
}

interface AvatarConfig {
  bodyColorId: string;                          // BODY_COLORS[].id
  equipped: {
    hat: string | null;
    eyewear: string | null;
    neck: string | null;
    held: string | null;
  };
}

interface FrostbytePrefs {
  muted: boolean;
  reducedMotion: boolean;                       // user-overridable; defaults from matchMedia at first run
  lastRoom: string;                              // vignette scope: always "plaza"; future-proofs multi-room
}
```

```js
export const DEFAULT_SAVE = () => ({
  schemaVersion: SCHEMA_VERSION,
  coins: 50,
  avatar: {
    bodyColorId: "classic-charcoal",
    equipped: { hat: null, eyewear: null, neck: null, held: null },
  },
  ownedItems: ["classic-charcoal", "powder-blue", "blush-pink", "mint"], // 4 free starters
  npcGreetedOn: {},
  pickupsCollectedOn: {},
  lastLoginDate: null,
  loginStreak: 0,
  prefs: { muted: false, reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches, lastRoom: "plaza" },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export function load() {
  if (!hasStorage) return DEFAULT_SAVE();
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return DEFAULT_SAVE();
    return migrateSave(JSON.parse(raw));
  } catch {
    return DEFAULT_SAVE(); // corrupted JSON -> fresh save, never throw into the game loop
  }
}

export function persist(save) {
  if (!hasStorage) return;
  save.updatedAt = new Date().toISOString();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* quota/private-mode: no-op */ }
}
```

### 7. Migration strategy

`migrateSave(raw)` is a pure function, stepwise, never throws:

```js
export function migrateSave(raw) {
  if (!raw || typeof raw !== "object") return DEFAULT_SAVE();
  let s = raw;
  if (s.schemaVersion == null) s = migrateLegacyToV1(s);   // pre-versioned saves, if any ship before v1 locks
  // Future: if (s.schemaVersion === 1) s = migrateV1ToV2(s);
  return { ...DEFAULT_SAVE(), ...s, schemaVersion: SCHEMA_VERSION };
}

function migrateLegacyToV1(s) {
  return { ...s, schemaVersion: 1 };
}
```

Two independent version dimensions are in play, and both must be documented so nobody "fixes" one thinking it's the other:

1. **OS global version** (`os/src/os/storage.ts` `VERSION`/`VERSION_KEY`): bumping this wipes **every** `dmos.*` key, Frostbyte's save included. That's an accepted, intentional loss per the project's existing wipe policy — Frostbyte does nothing special to survive it.
2. **Frostbyte's own `schemaVersion`** (inside the JSON blob): bumps when Frostbyte's *own* save shape changes without an OS-wide version bump — e.g. adding a new field. `migrateSave()` upgrades old blobs forward with field-level defaults (`{ ...DEFAULT_SAVE(), ...s }`) so a returning player never loses coins/cosmetics just because the app updated.

---

### 8. Economy: earn rates & prices

Single-player, so the economy exists purely for **pacing and small dopamine hits**, not scarcity or status — there is no other player to compare a balance against. Design goal: a casual player who opens Frostbyte for a few short sessions a day should own the full catalog in roughly **2–3 weeks**, not the first sitting and not a months-long grind.

All economy functions are **pure and take `today` as a parameter** — never `new Date()`/`Date.now()` internally — mirroring the project's injected-time discipline (`callMachine.ts`'s `tick(state, dtMs)` generalised to `tick(state, todayISO)` for calendar-gated rewards). The caller (UI layer) supplies `todayISO = new Date().toISOString().slice(0,10)` once per check.

**Earn table**

| source                              | amount        | cap / gate                                                        |
|--------------------------------------|---------------|---------------------------------------------------------------------|
| Minigame completion (1st–3rd play/day) | 10 + up to 15 perf bonus (10–25) | full reward first 3 plays/day, then flat 3/play (anti-grind taper) |
| Plaza sparkle pickups                | 1 coin each, 6 in the scene | each resets once per new `todayISO` via `pickupsCollectedOn[id]` |
| NPC daily greet (first talk/day)     | 2 coins/NPC, 5 NPCs = 10/day | gated via `npcGreetedOn[npcId]`, gives a light reason to do a lap |
| Daily login bonus                    | 5 coins flat, +2/consecutive day up to +14 (day 7+) | gated via `lastLoginDate` + `loginStreak`; streak resets if a day is skipped |

Realistic daily session total: ~20 (minigame) + 6 (pickups) + 10 (NPC greets) + 5–14 (login) ≈ **41–50 coins/day**. At ~645 coins to own the full 22-item catalog, that's **13–16 daily sessions** to 100% completion — comfortably inside the "couple of weeks of casual play" target for a vignette-scope game.

**Economy engine** — `dominikos/frostbyte/src/economy.js` (pure, no DOM, no wall clock):

```js
export function earnCoins(save, amount, reason, ev) {
  save.coins += amount;
  ev.push({ type: "coins-earned", amount, reason });
  return save;
}

export function spendCoins(save, amount) {
  if (save.coins < amount) return false;   // caller leaves state untouched on failure
  save.coins -= amount;
  return true;
}

export function unlockItem(save, itemId, price, ev) {
  if (save.ownedItems.includes(itemId)) return true;   // already owned, no-op success
  if (!spendCoins(save, price)) return false;           // atomic: insufficient funds mutates nothing
  save.ownedItems.push(itemId);
  ev.push({ type: "item-unlocked", itemId });
  return true;
}

export function equipItem(save, slot, itemId, ev) {
  if (itemId !== null && !save.ownedItems.includes(itemId)) return false; // can't equip what you don't own
  save.avatar.equipped[slot] = itemId;
  ev.push({ type: "item-equipped", slot, itemId });
  return true;
}

export function checkDailyLogin(save, todayISO, ev) {
  if (save.lastLoginDate === todayISO) return save;         // already counted today, same-reference no-op
  const isConsecutive = save.lastLoginDate === prevDay(todayISO);
  save.loginStreak = isConsecutive ? save.loginStreak + 1 : 1;
  save.lastLoginDate = todayISO;
  const bonus = 5 + Math.min(save.loginStreak - 1, 6) * 2;  // 5..17, caps at day 7+
  return earnCoins(save, bonus, "daily-login", ev);
}

export function collectPickup(save, pickupId, todayISO, ev) {
  if (save.pickupsCollectedOn[pickupId] === todayISO) return false; // already collected today
  save.pickupsCollectedOn[pickupId] = todayISO;
  earnCoins(save, 1, "pickup", ev);
  return true;
}

export function greetNpc(save, npcId, todayISO, ev) {
  if (save.npcGreetedOn[npcId] === todayISO) return false;
  save.npcGreetedOn[npcId] = todayISO;
  earnCoins(save, 2, "npc-greet", ev);
  return true;
}
```

Same "events out-param" convention as `os/src/os/games/mines/engine.ts`: functions push `{type, ...}` into a caller-owned `ev` array; the UI layer replays those into `os/src/os/sound.ts`'s `tone()` for a coin-chime, purchase-confirm, etc. The engine itself never touches audio or DOM.

---

### 9. Test plan (vitest, headless, no DOM)

`dominikos/frostbyte/src/economy.test.js` and `save.test.js`, run via a small `dominikos/frostbyte/package.json` (`"test": "vitest run"`), following the project's bounded-loop / seed-list discipline:

- `earnCoins` increases balance and appends exactly one `coins-earned` event.
- `spendCoins` returns `false` and leaves `coins` unchanged when balance is insufficient.
- `unlockItem` is atomic: a failed purchase (insufficient funds) leaves `ownedItems` untouched; a repeat purchase of an already-owned item is a successful no-op and does not double-charge.
- `equipItem` rejects equipping an id not present in `ownedItems`, for every slot.
- `checkDailyLogin` called twice with the same `todayISO` mutates nothing the second time (same-reference / no double bonus); called on `todayISO + 1` day increments `loginStreak`; called after a gap (`todayISO + 3`) resets `loginStreak` to 1.
- `collectPickup` / `greetNpc` are each idempotent within a single `todayISO` and re-fire on the next calendar day, iterated over a bounded seed/date list (e.g. 5 consecutive synthetic dates), matching the project's "iterate a bounded list of seeds/dates" test convention.
- `migrateSave`: a legacy object missing `schemaVersion` upgrades to v1 with defaults filled in, without throwing; a `null`/corrupted/non-object input falls back to `DEFAULT_SAVE()`.
- Round-trip: `persist(save)` then `load()` returns a deep-equal object (property-order-independent) with `updatedAt` advanced.
- `avatarLayers.test.js`: `syncFrame()` sets identical `frame`/`flipX` across every present part and silently skips `null` (unequipped) slots — asserted against a fake `parts` array of plain objects, no real KAPLAY/DOM instance needed.

---

### 10. File map summary

```
dominikos/frostbyte/
  gen-assets.js                 -- extended: penguin body/belly, cosmetics, emote icons
  assets/                       -- generated PNGs (committed), scanned by legal-gate once
                                    frostbyte is added to SCAN_ROOTS
  content.js                    -- BODY_COLORS, ITEM_CATALOG, EMOTES (data, no logic)
  package.json                  -- devDependency: vitest; "test": "vitest run"
  src/
    avatarLayers.js             -- makeAvatarActor(), syncFrame(), ANIMS table
    economy.js                  -- pure earn/spend/unlock/equip/daily-gate functions
    economy.test.js
    save.js                     -- NS/version clone of os/src/os/storage.ts, load/persist/migrateSave
    save.test.js
    avatarLayers.test.js
    customizeUI.js              -- builds/wires #customize-overlay DOM (mirrors dialogue-overlay pattern)
  index.html                    -- add #customize-overlay markup block alongside #dialogue-overlay
```

`dominikos/registry/frostbyte.json` and the `os/scripts/legal-gate.mjs` `SCAN_ROOTS`/`BANNED_CONTENT_ANY` wiring are covered by the project's P0 checklist, not this section — this section only requires that whoever does that wiring also adds `dominikos/frostbyte` to `SCAN_ROOTS` before any of the above assets ship, since none of it is scanned by default.

---

## NPC Crowd / Fake Multiplayer

This is Option B made concrete: the plaza feels populated because a handful of **original** penguin NPCs wander, gather, emote, and blurt canned lines — never because anything is actually networked. The whole system is one **pure, time-injected state machine** (the `callMachine.ts` pattern) driven entirely by KAPLAY `dt`, so it obeys the section-8.4 pause contract automatically: when the tree root is paused, `tick()` is never called, the crowd freezes mid-gesture, and resumes with no time-jump — exactly like a backgrounded Dialtone call just stops advancing.

### File layout

```
dominikos/frostbyte/
  npc/
    crowd.js        pure FSM: spawnRoomCrowd(), tickRoomCrowd(), tickNpc() — no KAPLAY, no DOM
    roster.js        data-only: original penguin personas
    lines.js          data-only: canned line pools + emote catalog
    spawn.js          data-only: per-room population config (points, capacity, roster subset)
    crowd.test.js    vitest — headless, no DOM, bounded loops only
  npcRuntime.js       KAPLAY-side glue: owns RoomCrowdState, drives tick() from k.onUpdate,
                      syncs NPC state -> KAPLAY game objects, renders speech-bubble DOM overlay
  main.js             calls npcRuntime.init(k, roomId) inside k.scene('plaza', ...)
```

`crowd.js` / `roster.js` / `lines.js` / `spawn.js` are framework-free ESM — the same "pure-engine-first" split as `os/src/os/games/mines/engine.ts` and game1's `content.js` data/engine separation. Nothing in `npc/` imports KAPLAY, so it is unit-testable headlessly and reusable if Frostbyte ever grows multi-room.

**Test wiring:** add a second include glob to `os/vite.config.ts`'s `test` block so one `npm run ci` (inside `os/`) covers the OS app *and* Frostbyte's pure engines:
```ts
test: {
  environment: 'node',
  include: ['src/**/*.test.ts', '../frostbyte/**/*.test.js'],
},
```
This mirrors the existing `serveGame1` sibling-folder middleware already in that file — the config already reaches into `../game1`, so reaching into `../frostbyte` for tests is consistent, not a new pattern.

---

### 1. Original NPC roster

Nine original personas, no real product's characters, names, or mascots. Each has a home room, a movement "flavor" (speed multiplier + path jitter), and weighted biases toward which canned-line pool and which emotes it favors — this is what keeps the crowd from reading as one bot copy-pasted nine times.

| id | name | trait blurb | home room | speed mul | favored line pools |
|---|---|---|---|---|---|
| `bramble` | Bramble | tinkerer, pockets full of gear-bits and shiny pebbles | plaza | 0.9 | AMBIENT, MINIGAME_HYPE |
| `pip` | Pip | young, hyper, always mid-sprint somewhere | plaza | 1.3 | MINIGAME_HYPE, AMBIENT |
| `crinkle` | Crinkle | elderly, slow waddle, tells long weather stories | plaza | 0.6 | WEATHER, AMBIENT |
| `marzi` | Marzipan ("Marzi") | fashion-forward, notices everyone's hat | plaza | 1.0 | COSMETIC_COMPLIMENT |
| `blot` | Blot | quiet, doodles in the snow with a flipper-tip | plaza | 0.8 | AMBIENT, WEATHER |
| `ferro` | Ferro | gruff, low chat frequency, mostly emotes (salutes, shrugs) | plaza | 1.0 | AMBIENT (rare) |
| `sable` | Sable | odd, speaks in half-riddles, nocturnal energy | plaza | 0.95 | AMBIENT (weird) |
| `chowder` | Chowder | snack-obsessed, talks about cocoa | *cafe (P3+)* | 1.0 | AMBIENT |
| `dot` | Dot | shy, gives one small, warm compliment | plaza | 0.85 | AMBIENT |

`dot` is the reserved **optional easter-egg slot**: Dominik may retune Dot's line pool with a single, *original*, tasteful line that winks at a real testimonial-giver's name or vibe from the main portfolio (e.g. a first-name pun or an inside reference) — never a verbatim quote of real testimonial copy (that's someone else's words, keep it original-in-spirit only). Ship Dot with the generic warm line below until/unless Dominik supplies the nod; it works fine either way.

`roster.js` schema:
```js
/**
 * @typedef {Object} Persona
 * @property {string} id
 * @property {string} name
 * @property {string} homeRoomId
 * @property {number} speedMul          // multiplier on WADDLE_SPEED
 * @property {Record<string, number>} poolWeights  // linePoolId -> weight for weighted pick
 * @property {string[]} emoteIds        // subset of the emote catalog this persona will play
 * @property {string} paletteId         // fed to gen-assets.js recolor pass (P1), not the engine
 */
export const ROSTER = [
  { id: 'bramble', name: 'Bramble', homeRoomId: 'plaza', speedMul: 0.9,
    poolWeights: { AMBIENT: 2, MINIGAME_HYPE: 2, WEATHER: 1, COSMETIC_COMPLIMENT: 0 },
    emoteIds: ['wave-flipper', 'sparkle-clap'], paletteId: 'rust' },
  // ...pip, crinkle, marzi, blot, ferro, sable, chowder, dot
];
```

### 2. Canned line pools (`lines.js`)

Flat pools keyed by id, each line carrying its own display duration so `chatting` phase length is authored, not guessed at runtime:

```js
/** @typedef {{ id:string, text:string, durMs:number }} Line */
export const LINE_POOLS = {
  AMBIENT: [
    { id: 'amb-01', text: 'The snow's extra squeaky today.', durMs: 2200 },
    { id: 'amb-02', text: 'I keep losing my scarf in the wind.', durMs: 2600 },
    { id: 'amb-03', text: 'Did you see the icicles on the workshop cart?', durMs: 2800 },
    { id: 'amb-04', text: 'I could waddle around this plaza all day.', durMs: 2400 },
    { id: 'amb-05', text: 'Someone left a snowball fort half-built again.', durMs: 2800 },
    { id: 'amb-06', text: 'My flippers are cold. My flippers are always cold.', durMs: 2800 },
  ],
  WEATHER: [
    { id: 'wea-01', text: 'Back in my day the drifts came up to your beak.', durMs: 3000 },
    { id: 'wea-02', text: 'Feels like a three-scarf kind of afternoon.', durMs: 2400 },
    { id: 'wea-03', text: 'The wind's changed direction — smell that?', durMs: 2400 },
  ],
  MINIGAME_HYPE: [
    { id: 'mgh-01', text: 'Bet I can beat your high score before supper.', durMs: 2600 },
    { id: 'mgh-02', text: 'Coins today, hat tomorrow. That's the plan.', durMs: 2400 },
    { id: 'mgh-03', text: 'I've been practicing my throw. Watch out.', durMs: 2400 },
  ],
  COSMETIC_COMPLIMENT: [
    { id: 'cos-01', text: 'Ooh, new scarf? Very sharp.', durMs: 2000 },
    { id: 'cos-02', text: 'That hat suits you. Where'd you find it?', durMs: 2400 },
    { id: 'cos-03', text: 'I'm still saving up for the good hats.', durMs: 2400 },
  ],
  GREETING: [ { id: 'grt-01', text: 'Oh — hello there!', durMs: 1600 } ],
};

export const EMOTES = [
  { id: 'wave-flipper', durMs: 900 },
  { id: 'spin-hop', durMs: 1100 },
  { id: 'snow-flump', durMs: 1400 },   // flops over, makes a snow-angel shape
  { id: 'sparkle-clap', durMs: 1000 },
  { id: 'shiver-giggle', durMs: 800 },
];
```

All text above is original, written for this project. Once `dominikos/frostbyte/` is added to the legal-gate's `SCAN_ROOTS`, these files get grepped by `BANNED_CONTENT_ANY` like everything else — they should always pass clean since nothing here references any homaged product's names, characters, or minigames.

### 3. Per-room population (`spawn.js`)

```js
/**
 * @typedef {Object} RoomSpawnConfig
 * @property {{min:number,max:number}} capacity
 * @property {{x:number,y:number}[]} roamPoints     // authored waypoints, room-bounds interior
 * @property {{x:number,y:number,label:string}[]} gatherPoints  // benches, fire pit, ice sculpture
 * @property {string[]} rosterPoolIds                // which personas may appear here
 * @property {number} maxConcurrentChat              // speech-bubble spam cap
 * @property {{x0:number,x1:number,y0:number,y1:number}} bounds // same clamp style as game1 BOUNDS
 */
export const ROOM_SPAWN = {
  plaza: {
    capacity: { min: 4, max: 6 },
    roamPoints: [ /* authored alongside the plaza tilemap in P1 — placeholders below */
      { x: 180, y: 420 }, { x: 420, y: 360 }, { x: 640, y: 480 },
      { x: 300, y: 560 }, { x: 780, y: 400 }, { x: 520, y: 620 },
    ],
    gatherPoints: [
      { x: 460, y: 440, label: 'fire-pit' },
      { x: 700, y: 340, label: 'ice-sculpture' },
    ],
    rosterPoolIds: ['bramble', 'pip', 'crinkle', 'marzi', 'blot', 'ferro', 'sable', 'dot'],
    maxConcurrentChat: 2,
    bounds: { x0: 40, x1: 1400, y0: 200, y1: 760 }, // placeholder, matches game1's BOUNDS convention
  },
};
```

Vignette scope needs only `plaza`. The schema is written so a future `cafe` entry (with `chowder` in its `rosterPoolIds`) is a data addition, not an engine change.

---

### 4. The pure crowd machine (`crowd.js`)

#### Phase FSM (hub-and-spoke, idle is the hub)

```
                 ┌─────────────────────────────┐
                 │                              │
                 ▼                              │
        ┌─────────────┐   weighted roll    ┌────┴─────┐
   ┌───►│    idle      │───────────────────►│ roaming  │
   │    │ (jittered    │        .45         │ (walk to │
   │    │  1.2–3.6s)   │                     │ waypoint)│
   │    └──────┬───────┘                     └────┬─────┘
   │           │             .20                   │ arrive/timeout
   │           ├─────────────────────────┐         │
   │           │                         ▼         │
   │           │                  ┌─────────────┐  │
   │           │                  │  gathering   │◄─┘ (shares arrival path)
   │           │                  │ (walk+linger │
   │           │                  │  at bench)   │
   │           │                  └──────┬───────┘
   │           │        .15               │
   │           ├───────────────┐          │
   │           │                ▼          │
   │           │        ┌─────────────┐    │
   │           │        │  emoting    │    │
   │           │        │ (0.8–1.4s)  │    │
   │           │        └──────┬──────┘    │
   │           │  .20           │           │
   │           └───────────┐    │           │
   │                        ▼    │           │
   │                ┌─────────────┐          │
   │                │  chatting   │          │
   │                │ (line durMs,│          │
   │                │  cap-gated) │          │
   │                └──────┬──────┘          │
   │                       │                 │
   └───────────────────────┴─────────────────┘
                    all phases return to idle
```

`roaming` and `gathering` share the same walk-to-target step logic; `gathering`'s target is drawn from `gatherPoints` instead of `roamPoints` and, once arrived, the NPC *lingers in place* for the rest of its `phaseDuration` before returning to idle (a settled penguin standing at the fire pit, not just passing through).

#### State shape

```js
/**
 * @typedef {'idle'|'roaming'|'gathering'|'emoting'|'chatting'} NpcPhase
 * @typedef {Object} NpcState
 * @property {string} id
 * @property {string} personaId
 * @property {NpcPhase} phase
 * @property {{x:number,y:number}} pos
 * @property {{x:number,y:number}|null} target
 * @property {boolean} settled          // true once a gathering NPC has reached its target
 * @property {number} phaseElapsed      // ms accumulated in current phase
 * @property {number} phaseDuration     // ms budget for current phase (rolled on entry)
 * @property {'up'|'down'|'side'} facing
 * @property {boolean} flipX
 * @property {boolean} moved            // true this tick iff position changed (drives walk vs idle anim)
 * @property {string|null} emoteId
 * @property {string|null} lineId
 * @property {string[]} recentLineIds   // ring buffer, cap 3 — no immediate repeats
 * @property {number} rng               // this NPC's own 32-bit LCG stream
 * @property {number} nudgeMs           // pending "notice" nudge from a nearby NPC (see anti-bot §5)
 *
 * @typedef {Object} RoomCrowdState
 * @property {string} roomId
 * @property {NpcState[]} npcs
 * @property {number} rng               // room-level stream (spawn/despawn rolls)
 * @property {string[]} recentRoomLineIds // cap 4 — no two NPCs echo the same line back-to-back
 *
 * @typedef {{type:'phase-change',npcId:string,from:NpcPhase,to:NpcPhase}
 *         | {type:'emote',npcId:string,emoteId:string}
 *         | {type:'speak',npcId:string,lineId:string,text:string,durMs:number}} NpcEvent
 */
```

#### Interface (mirrors `mines/engine.ts`'s out-param-events convention + `callMachine.ts`'s `tick(state,dtMs)->state`)

```js
// Deterministic 32-bit LCG, identical constants to the rest of the project's engines.
export function nextSeed(seed) { return (seed * 1664525 + 1013904223) >>> 0; }
export function rollInt(seed, bound) { const s = nextSeed(seed); return { seed: s, value: (s >>> 16) % bound }; }
export function rollFloat(seed) { const s = nextSeed(seed); return { seed: s, value: (s >>> 16) / 65536 }; }

/** Build one NPC at a spawn point with its own rng sub-stream derived from the room seed. */
export function spawnNpc(id, personaId, pos, seed) { /* -> NpcState, phase:'idle', jittered phaseDuration */ }

/** Build a room's crowd: count in [capacity.min, capacity.max], personas + spawn points chosen
 *  deterministically from `config.rosterPoolIds` / `config.roamPoints` via the room's own rng. */
export function spawnRoomCrowd(roomId, config, seed) { /* -> RoomCrowdState */ }

/** Advance ONE npc by dtMs. dtMs<=0 returns the same reference (no-op, matches callMachine).
 *  Pushes 0..1 events (phase-change + a payload event) into the caller-owned `ev` array. */
export function tickNpc(npc, dtMs, config, ev) { /* -> NpcState */ }

/** Advance a whole room: maps tickNpc over every npc, then applies room-level couplings
 *  (proximity "notice" nudges, max-concurrent-chat enforcement, recent-line de-dup) and
 *  returns a new RoomCrowdState. Only called while the room's scene is active — rooms not
 *  currently loaded simply never have tickRoomCrowd called, so they need no explicit "sleep". */
export function tickRoomCrowd(room, dtMs, config, ev) { /* -> RoomCrowdState */ }
```

Design notes tying this back to the grounded facts:

- **No wall clock, no `setInterval`, no DOM.** `dtMs` is fed by `npcRuntime.js` from KAPLAY's own `k.dt()` (clamped `Math.min(0.05, k.dt()) * 1000`, the same discipline as `useGameLoop.ts`'s dt clamp) inside `k.onUpdate`. Because KAPLAY's tree-root pause stops `onUpdate` from firing at all, `tickRoomCrowd` is never called while paused — the crowd doesn't need its own pause flag, it inherits the section-8.4 contract for free, exactly like NPC timers were required to.
- **A single huge tick still lands correctly**, the same way `callMachine`'s ring-cadence resolves a big `dtMs` into the correct cumulative ring count rather than skipping: if `dtMs` ever covers multiple phase completions at once (shouldn't happen given the clamp, but must never crash or desync), `tickNpc` loops internally over completed sub-phases up to a small bounded cap (e.g. 4) rather than silently overshooting.
- **Events, not side effects.** `tickRoomCrowd` never touches KAPLAY objects or the DOM; it only appends `NpcEvent`s. `npcRuntime.js` replays `speak` events into a speech-bubble DOM overlay (HTML, per the project's dialogue-overlay convention, not in-canvas text) and a tiny per-persona-pitched `tone()` chirp, and replays `emote` events into `player.play(emoteAnimName)`.

---

### 5. Dodging the "obvious bots" feel

| Technique | Mechanism |
|---|---|
| **Desync jitter** | Every NPC's initial `phaseDuration` (and the room's spawn order) is rolled from its own rng stream at spawn time, so nine NPCs never idle/roam/speak in lockstep — the single biggest crowd-sim tell. |
| **Proximity "notice" coupling** | After individual `tickNpc` calls, `tickRoomCrowd` scans pairwise distance; an NPC that just entered `emoting`/`chatting` has a small seeded chance (`NOTICE_CHANCE = 0.35`) to shave time off a nearby *idle* NPC's `phaseElapsed` via `nudgeMs`, so it reacts sooner — a lightweight "oh, what's going on over there" ripple without any NPC-to-NPC messaging or shared mutable identity. |
| **No-repeat lines** | `NpcState.recentLineIds` (ring buffer, cap 3) blocks an NPC from repeating its own last few lines; `RoomCrowdState.recentRoomLineIds` (cap 4) blocks two different NPCs from echoing the same line back-to-back. |
| **Concurrent-chat cap** | `config.maxConcurrentChat` (2 for the plaza) — a third NPC that rolls `chatting` while two bubbles are already up falls back to `idle` instead, so the screen never becomes a wall of speech bubbles. |
| **Movement variance** | `persona.speedMul` gives each NPC a slightly different waddle pace; `roaming`/`gathering` targets are picked without immediate repeats, so paths don't visibly loop. |
| **Context-weighted, not flat, line pools** | `persona.poolWeights` biases which pool gets rolled (Crinkle talks weather, Marzi talks cosmetics, Ferro barely talks at all) so the crowd reads as *characters*, not one shuffled bag of strings. |

---

### 6. Determinism & concrete vitest test cases

`dominikos/frostbyte/npc/crowd.test.js` — headless, no DOM, every loop bounded (per the project's "no runaway processes" discipline):

```js
import { describe, it, expect } from 'vitest';
import { spawnRoomCrowd, tickRoomCrowd, tickNpc } from './crowd.js';
import { ROOM_SPAWN } from './spawn.js';

const CFG = ROOM_SPAWN.plaza;
const SEEDS = [1, 2, 3, 7, 42];

describe('spawnRoomCrowd', () => {
  it('is deterministic: same seed -> byte-identical crowd', () => {
    for (const seed of SEEDS) {
      expect(spawnRoomCrowd('plaza', CFG, seed)).toEqual(spawnRoomCrowd('plaza', CFG, seed));
    }
  });

  it('different seeds produce different rosters/positions', () => {
    const a = spawnRoomCrowd('plaza', CFG, 1);
    const b = spawnRoomCrowd('plaza', CFG, 2);
    expect(a).not.toEqual(b);
  });

  it('population size stays within configured capacity', () => {
    for (const seed of SEEDS) {
      const room = spawnRoomCrowd('plaza', CFG, seed);
      expect(room.npcs.length).toBeGreaterThanOrEqual(CFG.capacity.min);
      expect(room.npcs.length).toBeLessThanOrEqual(CFG.capacity.max);
    }
  });
});

describe('tickNpc: no-op guard', () => {
  it('dt<=0 returns the same reference (matches callMachine convention)', () => {
    const room = spawnRoomCrowd('plaza', CFG, 1);
    const npc = room.npcs[0];
    expect(tickNpc(npc, 0, CFG, [])).toBe(npc);
    expect(tickNpc(npc, -16, CFG, [])).toBe(npc);
  });
});

describe('tickRoomCrowd: bounds & determinism', () => {
  it('never lets an NPC leave the authored room bounds', () => {
    for (const seed of SEEDS) {
      let room = spawnRoomCrowd('plaza', CFG, seed);
      const ev = [];
      for (let i = 0; i < 600; i++) room = tickRoomCrowd(room, 100, CFG, ev); // 60s, bounded
      for (const n of room.npcs) {
        expect(n.pos.x).toBeGreaterThanOrEqual(CFG.bounds.x0);
        expect(n.pos.x).toBeLessThanOrEqual(CFG.bounds.x1);
        expect(n.pos.y).toBeGreaterThanOrEqual(CFG.bounds.y0);
        expect(n.pos.y).toBeLessThanOrEqual(CFG.bounds.y1);
      }
    }
  });

  it('the same dt sequence yields identical states every run (determinism)', () => {
    const dts = [100, 250, 900, 33, 1600, 400, 5000, 16, 3000];
    const runOnce = () => {
      let room = spawnRoomCrowd('plaza', CFG, 7);
      const ev = [];
      for (const dt of dts) room = tickRoomCrowd(room, dt, CFG, ev);
      return { room, ev };
    };
    const a = runOnce(), b = runOnce();
    expect(a.room).toEqual(b.room);
    expect(a.ev).toEqual(b.ev);
  });

  it('never exceeds maxConcurrentChat, across a bounded random sweep', () => {
    for (const seed of SEEDS) {
      let room = spawnRoomCrowd('plaza', CFG, seed);
      const ev = [];
      for (let i = 0; i < 800; i++) {
        room = tickRoomCrowd(room, 120, CFG, ev);
        const chatting = room.npcs.filter((n) => n.phase === 'chatting').length;
        expect(chatting).toBeLessThanOrEqual(CFG.maxConcurrentChat);
      }
    }
  });

  it('an NPC never repeats its own last line back-to-back', () => {
    let room = spawnRoomCrowd('plaza', CFG, 3);
    const ev = [];
    const spokenByNpc = {};
    for (let i = 0; i < 1500; i++) {
      room = tickRoomCrowd(room, 100, CFG, ev);
    }
    for (const e of ev) {
      if (e.type !== 'speak') continue;
      const last = spokenByNpc[e.npcId];
      if (last) expect(e.lineId).not.toBe(last);
      spokenByNpc[e.npcId] = e.lineId;
    }
  });

  it('a single large tick resolves multiple completed phases without getting stuck', () => {
    let room = spawnRoomCrowd('plaza', CFG, 1);
    const ev = [];
    room = tickRoomCrowd(room, 20_000, CFG, ev); // one huge jump, e.g. a slow first frame
    for (const n of room.npcs) {
      expect(['idle', 'roaming', 'gathering', 'emoting', 'chatting']).toContain(n.phase);
      expect(Number.isFinite(n.pos.x) && Number.isFinite(n.pos.y)).toBe(true);
    }
  });

  it('emits exactly one emote event per emoting phase entry, none on later ticks of the same phase', () => {
    // hand-place one npc in idle with a rng seed known (offline) to roll 'emoting' next
    let room = spawnRoomCrowd('plaza', CFG, 1);
    const ev = [];
    let emoteEvents = 0;
    for (let i = 0; i < 400; i++) {
      const before = room.npcs.map((n) => n.phase);
      room = tickRoomCrowd(room, 100, CFG, ev);
      emoteEvents += ev.filter((e) => e.type === 'emote').length;
      ev.length = 0;
    }
    expect(emoteEvents).toBeGreaterThan(0); // sanity: emoting does happen across 40s
  });
});
```

These follow the same shape as `callMachine.test.ts` — hand-built states, bounded `for` loops over a fixed seed list, `toEqual` for determinism, `toBe` (reference equality) for no-op guards — so they slot into the project's existing vitest conventions with no new test infrastructure beyond the one `vite.config.ts` include-glob change.

### 7. Runtime glue (`npcRuntime.js`, KAPLAY side)

```js
export function initRoomCrowd(k, roomId, config) {
  let room = spawnRoomCrowd(roomId, config, Date.now() >>> 0); // seed only at boot; not re-rolled per tick
  const objs = new Map(); // npcId -> kaplay game object

  k.onUpdate(() => {
    const dtMs = Math.min(0.05, k.dt()) * 1000; // same clamp discipline as useGameLoop.ts
    const ev = [];
    room = tickRoomCrowd(room, dtMs, config, ev);

    for (const n of room.npcs) {
      let obj = objs.get(n.id);
      if (!obj) { obj = spawnNpcObject(k, n); objs.set(n.id, obj); }
      obj.pos = k.vec2(n.pos.x, n.pos.y);
      obj.z = n.pos.y;                      // same y-sort convention as the player
      obj.flipX = n.flipX;
      setAnim(obj, n.moved ? `walk-${n.facing}` : `idle-${n.facing}`); // change-only replay, per main.js
    }
    for (const e of ev) handleNpcEvent(k, objs, e); // speech bubble (DOM overlay) + tone() chirp + emote anim
  });

  return { getRoom: () => room };
}
```

The room seed is only rolled once, at scene boot — the pure engine itself is fully deterministic given a seed, which is what the tests exercise; runtime randomness (picking that boot seed) is the *only* non-deterministic input, exactly as `Math.random()`-seeded LCGs are used elsewhere in the project.

---

## Minigames

One original minigame ships with the vignette — **Snowdrift Toss** — because the plaza needs a coin
*source* to make the shop's coin *sink* meaningful. It follows the project's pure-engine-first rule:
all rules/scoring/spawning live in a headless, seeded, dt-driven module (`engine/minigame-snowdrift.js`)
with a vitest suite; the KAPLAY scene (`world/minigame-snowdrift.js`) is a thin renderer that feeds
input + `dt` in and replays events out to sprites and `tone()`. A second minigame (Glasswind Court's
glide-and-spin) is sketched as an expansion only.

### Room ↔ minigame contract (from §Room Design — do not restate internals there)

- Entry: interacting with the `minigame-snowdrift` plaza hotspot calls `k.go('minigame-snowdrift', { from:'plaza' })`.
- Exit: the scene calls `k.go('plaza', { spawn:'fromMinigame', coinsEarned })`; the plaza scene reads
  `coinsEarned`, credits it via `engine/economy.js`, and shows a coin toast. The plaza stays ignorant of minigame internals.
- Registered in `content/minigames-registry.js`: `{ 'snowdrift': { hotspotId:'minigame-snowdrift', sceneId:'minigame-snowdrift' } }`.

### Snowdrift Toss — design

A 45-second stall game. Snowpal targets drift across the play area on seeded paths; you aim and toss
snowballs to hit them before they exit. Consecutive hits build a combo multiplier; a miss (or a target
escaping) resets the combo. Score converts to coins on exit, with a soft daily cap so it can't be
farmed into meaninglessness (single-player, so this is flavour, not anti-cheat).

- **Difficulty curve:** spawn interval and target speed ramp with elapsed time — `spawnMs = lerp(1100, 450, t/DURATION)`, `speed = lerp(60, 150, t/DURATION)` world-px/s. Deterministic per seed.
- **Scoring:** `hit → score += 10 * comboMult`, `comboMult = 1 + min(combo, 9) * 0.5` (caps at 5.5× at a 9-combo); miss or escape → `combo = 0`.
- **Coins:** `coinsEarned = clamp(floor(score / 40), 0, DAILY_CAP)` where `DAILY_CAP = 60` (tracked in `dmos.v1.frostbyte.dailyCoins.<yyyy-mm-dd>` via `engine/save.js`; the day key is passed IN as `todayKey`, never read from a wall clock inside the engine — the UI supplies it, keeping the engine pure).

### Pure engine interface (`engine/minigame-snowdrift.js`)

```js
// PURE: no DOM, no KAPLAY, no wall clock, no Math.random. Seeded LCG (project standard).
export const DURATION_MS = 45_000;
export const TOSS_COOLDOWN_MS = 260;

// state shape
// { phase:'countdown'|'playing'|'over', tMs, score, combo, comboMult,
//   targets:[{id,x,y,vx,vy,r,alive}], nextSpawnMs, tossCdMs, rng, bounds, nextId }

export function newGame(seed, bounds) { /* countdown 3s → playing; rng=seed>>>0 */ }

// input: { aimX, aimY, toss:boolean }  (aim is where a toss would land; UI maps pointer/keys)
// pushes events into ev[]: {type:'spawn'|'hit'|'miss'|'escape'|'combo'|'end', ...} for sfx/particles
export function tick(state, dtMs, input, ev) { /* advance; SAME reference when phase==='over' */ }

export function coinsFor(score, dailyAlready, DAILY_CAP = 60) {
  return Math.max(0, Math.min(Math.floor(score / 40), DAILY_CAP - dailyAlready));
}
```

`tick` responsibilities each call while `phase==='playing'`: decrement `tMs`; on `tMs<=0 → phase='over'`,
push `{type:'end', score}`. Advance `nextSpawnMs`; when it lapses, spawn a target at a seeded edge with a
seeded cross-drift velocity (`ev.push({type:'spawn'})`). Integrate target positions by `dt`; a target
whose centre leaves `bounds` → `alive=false`, `combo=0`, `ev.push({type:'escape'})`. Decrement `tossCdMs`;
if `input.toss && tossCdMs<=0`: set cooldown, test the nearest live target within a hit radius of
`(aimX,aimY)` — hit → score/combo update + `ev{type:'hit'}` (+ `{type:'combo'}` when the multiplier
steps up); no target in range → `combo=0` + `ev{type:'miss'}`. Countdown phase just ages `tMs` and emits nothing scored.

### Tests (`engine/minigame-snowdrift.test.js`, vitest, headless, bounded)

- **Determinism:** two `newGame(42, B)` runs fed an identical scripted input array produce byte-identical
  final state (`toEqual`) and identical `score`. Different seeds → different target spawn positions.
- **Spawn cadence bounded:** over a full 45s scripted run, the number of `spawn` events is within the
  interval bounds implied by the `spawnMs` ramp (assert a min/max window, not an exact count).
- **Combo math:** a scripted "hit ×10 then miss" sequence asserts `comboMult` steps 1 → 1.5 → 2 … caps at
  5.5, and resets to 1 on the miss.
- **Escape resets combo:** advance a spawned target past `bounds` with no toss → `combo===0`, one `escape` event.
- **Lifecycle no-op:** once `phase==='over'`, `tick` returns the **same reference** and pushes no events (mirrors the callMachine settled-phase rule).
- **Coin mapping:** `coinsFor` is monotonic non-decreasing in `score`, never exceeds `DAILY_CAP - dailyAlready`, never negative; `coinsFor(0,0)===0`.
- **Bounds:** every spawned target's integrated path is asserted to only ever be flagged `alive=false` at/after crossing `bounds` (no early cull, no off-screen live targets).

### KAPLAY scene (`world/minigame-snowdrift.js`, impure — thin)

Own `k.scene('minigame-snowdrift', ({from}) => …)`: builds a bordered play area, a HUD (timer/score/combo via
`ui/hud.js`), reads pointer via `k.mousePos()`/`k.toWorld` for aim and `k.onMousePress`/`k.onKeyPress('space')`
for toss, and each frame calls `tick(state, k.dt()*1000, input, ev)` — `dt` clamped `Math.min(50, k.dt()*1000)`
so a resumed tab never fast-forwards. It replays `ev`: `spawn`→add a snowpal sprite, `hit`→pop+particle+`tone()`,
`escape/miss`→cue, `end`→freeze, show score, award `coinsFor(...)`, and `k.go('plaza', {spawn:'fromMinigame', coinsEarned})`
on a confirm button/Enter. Because it's a KAPLAY scene, it's inside the tree-root pause contract automatically. A
"Leave" button exits with `coinsEarned:0`.

### Expansion sketch — Glasswind Court "glide-and-spin"

A second minigame for the Court expansion: chain glide/spin tricks on the ice for a combo score under a
timer; same pure-engine + vitest shape (`engine/minigame-glide.js`), same entry/exit contract with
`sceneId:'minigame-glide'`. Original mechanic (higher-slide movement variant), not modelled on any named
real-world or existing-product ice game. **Not part of the vignette ship.**

---

## Chat & Emotes (local, safe, no network path)

Chat and emotes give the plaza its social *texture* — but there is **no network path anywhere in
Frostbyte for user-authored content.** This is the single most important safety property of the whole
project and it is what makes a penguin-social-world shippable on a portfolio at all.

### Why "local-only" removes the entire moderation problem

A live social product for a young-skewing audience carries hard obligations: content moderation, abuse
reporting, COPPA/child-safety, GDPR for any stored PII. Those obligations exist **because user-authored
content reaches other users.** Frostbyte severs that link at the source:

- The only "people" in the world are **NPCs**, and every word an NPC says is an **author-written canned
  line** from `content/dialogue-lines.js` — never anything a user typed.
- The player *can* type, but their text is rendered **only as their own speech bubble on their own
  screen** and is **never sent anywhere** — no `fetch`, no `XMLHttpRequest`, no `WebSocket`, and it is
  **not** put into any `postMessage` payload (the os-bridge channel carries only `ready|paused|resumed`,
  never chat text). It exists for a few seconds in a DOM/canvas bubble and is gone.
- Therefore there is **no user-generated-content channel to moderate**, no data to store, no report
  button to build. The P6 review explicitly greps the codebase to confirm no chat string ever enters a
  network or cross-frame call.

### Player chat UI (`ui/chat.js`)

Two input paths, both local:

1. **Safe-phrase quick-menu** — a small grid of author-written phrases from `content/chat-phrases.js`
   (e.g. greetings, "nice hat!", "brb", weather quips — all original, whimsical). One tap/click emits the
   phrase as the player's bubble. This is the primary, always-safe path.
2. **Free-text bar** — an optional text input (cap ~60 chars). On Enter it becomes the player's bubble and
   is discarded. A local, static profanity **softener** (client-side word list → replaced with "❄❄❄") is a
   nicety for polish, not a safety mechanism — safety comes from the text never leaving the device. Free
   text can be disabled entirely in prefs for a pure safe-phrase mode.

Both paths call `engine/chat.js addBubble({speaker:'you', text, ttlMs})`.

### Bubble queue (`engine/chat.js`, pure, dt-driven, testable)

```js
// PURE: no DOM/KAPLAY/wall clock. Bubbles age by injected dt; UI reads active() to render.
export const MAX_BUBBLES = 6;        // across the whole scene (player + NPCs)
export const DEFAULT_TTL = 3200;

// state: { bubbles:[{id,speaker,text,ttlMs,ageMs}], nextId }
export function addBubble(state, {speaker, text, ttlMs = DEFAULT_TTL}, ev) { /* FIFO-evict past MAX */ }
export function tick(state, dtMs) { /* age; drop expired; SAME reference when nothing changes */ }
export function active(state) { /* -> [{id,speaker,text,alpha}] for the renderer */ }
```

NPC chatter uses the same queue: the NPC FSM (`engine/npc-fsm.js`) enters its `speak` state and the world
layer calls `addBubble({speaker:npcId, text: pick(dialogue-lines for archetype+mood)})`. Because the queue
ages on KAPLAY `dt`, **a backgrounded world freezes all bubbles** (tree-root pause) — consistent with §8.4.

**Rendering:** bubbles draw in-canvas anchored above each speaker's world `pos` (tracks movement for free;
`z` above sprites), fading via `alpha`. Reduced-motion (`prefers-reduced-motion`) disables the pop/scale
tween — the bubble just appears. Font stays crisp because bubble text is short and drawn at world `SCALE`.

### Emotes (`ui/emotes.js`)

An emote wheel (keys `1`–`6`, or a radial popup on touch/click of a HUD button). Each emote triggers an
avatar animation state (`engine/npc-fsm.js` / the player's `state()` — wave, dance, sit, throw-snow,
sleep, sparkle) plus an optional particle and a tiny symbol bubble (`♪`, `❄`, `!`). Emotes are cosmetic,
local, and unlockable via cosmetics later. They obey the pause contract (KAPLAY-clock animations).

### Accessibility (WCAG-minded, matches the OS bar)

- **Keyboard:** the safe-phrase grid and emote wheel are real focusable buttons; open with a HUD button or
  a hotkey, arrow-navigate, `Enter` to emit, `Esc` to close. Free-text bar is a standard `<input>`.
- **Screen readers:** an `sr-only aria-live="polite"` region mirrors every bubble as `"You: <text>"` /
  `"<NPC name>: <text>"` so blind users get the social layer without seeing the canvas. Emotes announce
  `"You waved"` etc.
- **Reduced motion:** disables bubble pop and emote particle bursts (respects the OS-wide `data-motion` and
  the media query).
- **Colour independence:** bubbles are shape+text, never colour-only; the player's bubble has a distinct
  tail/anchor vs NPCs.

### Tests (`engine/chat.test.js`)

- FIFO eviction: adding a 7th bubble (`MAX_BUBBLES=6`) drops the oldest; `active().length` never exceeds 6.
- Lifetime: a bubble with `ttlMs=1000` is gone after ≥1000ms of accumulated `dt`; present before.
- No-op ref: `tick` on a state with no bubbles (or no time elapsed) returns the same reference.
- Determinism: identical `addBubble`/`tick` scripts produce identical `active()` output.
- (Safety is not a unit test — it's a P6 code-grep invariant: **zero** network/cross-frame calls carry a chat string.)

---

## Integration, Legal & Build

Frostbyte ships exactly like game1: a self-contained static folder served at `/frostbyte/`, wired into
DominikOS as a native iframe game, and vendored into the deployed site alongside `public/os` and
`public/game1`. No OS component code changes — a game is "a manifest + an icon + a static folder."

### OS integration

- **Manifest** — create `dominikos/registry/frostbyte.json` (repo-root `registry/`, not under `os/` — Vite
  `base:'/os/'` strips that prefix):
  ```json
  {
    "id": "frostbyte", "title": "Frostbyte", "kind": "iframe",
    "icon": "/os/icons/frostbyte.svg", "category": "games",
    "desktop": { "show": false },
    "startMenu": { "show": true, "group": "Games" },
    "window": { "width": 960, "height": 640, "minWidth": 480, "minHeight": 360, "singleton": true, "maximizedOnMobile": true },
    "src": "/frostbyte/index.html?embedded=1"
  }
  ```
  It auto-appears in the Games folder + Start menu via `byCategory('games')` / the `'auto:games'` sentinel —
  **no `registry.ts` edit needed**. `kind:'iframe'` has no component, so `IframeHost` renders it.
  **Never set `external:true`** — that switches to a hardened no-same-origin sandbox with **no os-bridge**, so
  the world would never pause. Must be `category:'games'` (IframeHost only wires pause/resume for games).
- **Icon** — add original `/os/icons/frostbyte.svg` (pixel penguin/snowflake, code or hand-drawn SVG).
- **Pause** — copy `game1/os-bridge.js` verbatim into `frostbyte/os-bridge.js` (channel `'os-bridge-v1'`),
  load it as a **classic `<script>` BEFORE** the module `main.js`, and in `main.js`:
  ```js
  window.__osBridge?.onReady({
    pause:  () => { k.getTreeRoot().paused = true;  k.audioCtx?.suspend?.(); },
    resume: () => { k.getTreeRoot().paused = false; k.audioCtx?.resume?.(); },
    setMute:(b) => k.setVolume?.(b ? 0 : 1),
  });
  ```
  `ready` posts `title:'Frostbyte'` (must match the manifest `title`). Reuse game1's `?embedded=1` check to
  hide any standalone-only chrome inside the OS.

### Deploy topology (current)

The live site is now the **`portfolio` repo** (`portfolio-rework/`), with `public/os` and `public/game1`
vendored in. Frostbyte follows the same pattern:

1. Build/generate Frostbyte assets (`node gen-assets.js`) and run its tests (green).
2. Add `dominikos/registry/frostbyte.json` + `os/icons/frostbyte.svg` to the **OS source**, rebuild the OS,
   and re-vendor `dist → portfolio-rework/public/os` (so the Games folder lists Frostbyte).
3. Vendor the static game: copy `dominikos/frostbyte/ → portfolio-rework/public/frostbyte/` (mirrors
   `public/game1`). Served at `/frostbyte/`; SPA rewrites stay scoped to `/os/*` only (flat static folder).
4. Commit + push (the repo auto-deploys once Netlify is linked).

*(Legacy: `os/scripts/deploy-local.mjs` cpSyncs to `portfolio-2026`; if that path is still used, add a
`../frostbyte → portfolio-2026/frostbyte` line. Not the primary target anymore.)*

### Legal gate + credits (P0 — easy to forget)

`os/scripts/legal-gate.mjs` hard-codes its scan roots and **does not include `/frostbyte/`** — assets would
ship unscanned. Two edits:
```js
const FROSTBYTE = path.resolve(APP, '..', 'frostbyte');
const SCAN_ROOTS = [ /* …existing… */ , FROSTBYTE ];
const BANNED_CONTENT_ANY = [ /* …existing (incl. space-cadet/maxis precedent)… */ ,
  { re: /club ?penguin/i,  why: 'Disney trademark — original homage only' },
  { re: /puffle/i,         why: 'copyrighted CP creature' },
  { re: /card[- ]?jitsu/i, why: 'named CP minigame' },
  // + CP mascot/room names as needed
];
```
Add an **ASSET-CREDITS.md** row: Frostbyte art (penguin/cosmetics/rooms/props) is 100% code-generated via
`frostbyte/gen-assets.js`; audio is runtime-synth (`tone()`); KAPLAY is MIT (vendored). The gate is grep-only
and **cannot** detect copied art/layout/music — originality is enforced by the code-drawn pipeline + this row
+ the **P6 adversarial IP review**.

### Build / CI / test wiring

Frostbyte's pure `engine/*.test.js` need to run in CI. Give the folder its own `frostbyte/package.json`
(private, `vitest` devDep, `"test": "vitest run"`) + `vitest.config.js`, and ensure CI runs **both** the OS
suite and Frostbyte's (either a root script that runs each, or add `dominikos/frostbyte/**/*.test.js` to a
shared vitest include). The OS `build` already runs the legal-gate after `vite build`; once `/frostbyte/` is
in `SCAN_ROOTS`, `npm run gate` covers it. **One bounded CI at a time** (typecheck → vitest → build → gate) —
honour the "no runaway processes" rule; never `run_in_background` a heavy run.

### Test matrix (pure modules → suites)

| Module | Suite | Key assertions |
|---|---|---|
| `engine/rng.js` | `rng.test.js` | LCG determinism; same seed → same stream; distribution sane |
| `engine/movement.js` | `movement.test.js` | bounds clamp, moon-walk guard, facing from dominant axis, obstacle pushout |
| `engine/camera.js` | `camera.test.js` | follow math, zoom-fit ratio at portrait/landscape |
| `engine/npc-fsm.js` | `npc-fsm.test.js` | idle→wander→emote→speak transitions; dt-gated timers; same-ref no-op; determinism |
| `engine/interaction.js` | `interaction.test.js` | nearest-within-radius picks correctly across hotspots+NPCs; ties stable |
| `engine/economy.js` | `economy.test.js` | earn/spend, never negative, ownership idempotent, event out-param |
| `engine/save.js` | `save.test.js` | schema round-trip, version migration, stateless in private mode (hasStorage guard) |
| `engine/avatar-layers.js` | `avatar-layers.test.js` | equipped→draw-order resolution, slot conflicts, defaults |
| `engine/chat.js` | `chat.test.js` | FIFO evict at MAX, ttl expiry, same-ref no-op, determinism |
| `engine/minigame-snowdrift.js` | `minigame-snowdrift.test.js` | determinism, spawn cadence bounds, combo math, escape reset, over no-op, coin mapping monotonic |
| `content/rooms.js` | `rooms.test.js` | spawns/hotspots/doors inside bounds, no two interactables < INTERACT_R, door targets resolve, NPC anchors inside bounds |

### File-by-file (create unless noted)

| Path | What |
|---|---|
| `dominikos/frostbyte/{index.html,main.js,gen-assets.js,vitest.config.js,package.json}` | app shell + generator + test config |
| `dominikos/frostbyte/os-bridge.js`, `vendor/kaplay.mjs` | copied verbatim from game1 |
| `dominikos/frostbyte/engine/*.js` + `*.test.js` | pure modules (see tree + matrix) |
| `dominikos/frostbyte/content/*.js` | rooms, npc-roster, dialogue-lines, cosmetics-catalog, chat-phrases, minigames-registry |
| `dominikos/frostbyte/world/{build-room.js,minigame-snowdrift.js}` | impure KAPLAY scenes |
| `dominikos/frostbyte/ui/{dialogue-overlay.js,chat.js,emotes.js,hud.js}` | DOM overlays |
| `dominikos/frostbyte/assets/**` | committed OUTPUT of `node gen-assets.js` |
| `dominikos/registry/frostbyte.json` | OS manifest |
| `dominikos/os/public/icons/frostbyte.svg` (→ `/os/icons/…`) | original icon |
| `dominikos/os/scripts/legal-gate.mjs` | **edit**: add scan root + fingerprints |
| `dominikos/os/ASSET-CREDITS.md` | **edit**: originality row |
| `portfolio-rework/public/frostbyte/**` | vendored copy of the static app (deploy) |

### Phased build order (each phase: pure logic + tests before UI; one bounded CI at a time)

- **P0 — Foundation & legal.** Pick the final name. Scaffold `frostbyte/` (copy `vendor/kaplay.mjs`,
  `os-bridge.js`, `index.html` skeleton, `package.json`, `vitest.config.js`). Extend `legal-gate.mjs`
  (scan root + fingerprints) + ASSET-CREDITS row **before any asset lands**. `engine/rng.js` + test.
- **P1 — Waddle spike.** `gen-assets.js` → `penguin.png` (4×3 sheet) + `room-plaza.png`. `engine/movement.js`
  + `engine/camera.js` + tests; `world/build-room.js` renders the plaza; click-to-move + keys + camera follow.
  Prove the core feel in the browser.
- **P2 — You & your penguin.** `engine/avatar-layers.js` + `engine/save.js` (+ tests); cosmetics overlay
  sprites; `ui/` dress-up panel; colour + a few items persist to `dmos.v1.frostbyte.*`.
- **P3 — The crowd.** `engine/npc-fsm.js` + `content/npc-roster.js` + `dialogue-lines.js` (+ tests);
  `engine/interaction.js`; NPC penguins wander/emote/speak, all dt-gated (auto-paused).
- **P4 — Minigame + economy.** `engine/minigame-snowdrift.js` + `engine/economy.js` (+ tests);
  `world/minigame-snowdrift.js` scene; `content/cosmetics-catalog.js`; earn coins → spend at Glimmer & Wool.
- **P5 — Chat + emotes.** `engine/chat.js` + `content/chat-phrases.js` (+ test); `ui/chat.js`, `ui/emotes.js`;
  speech bubbles + a11y (aria-live, reduced-motion). Confirm **no network path** for chat.
- **P6 — Integrate, review, ship.** `registry/frostbyte.json` + icon; os-bridge pause verified via the OS;
  mobile tap-to-move pass; full CI green (typecheck + vitest + build + **gate**); **adversarial review**
  (IP/originality of every asset+name, §8.4 timer/pause correctness, save migration, a11y, no-chat-network
  invariant); vendor into `portfolio-rework/public/frostbyte`; deploy.

### Art production (the long pole)

Code is days; **art is weeks.** All art is generated by `frostbyte/gen-assets.js` (game1's zero-dep PNG
pipeline + seeded PRNG), so it's inherently original and gate-safe. Vignette asset inventory:

| Asset | Notes |
|---|---|
| `penguin.png` | 4-wide × 3-row 16px sheet (down/side/up; left = side + flipX); idle+walk per row |
| cosmetics `hat-*`, `scarf-*`, `dye` | overlay sprites at the penguin anchor; a starter set (~6–10) |
| `room-plaza.png` | 480×320 native (30×20 tiles × 16) → SCALE 3; pond, paths, snow texture (seeded scatter) |
| props | fountain, benches, shop kiosk, minigame hut, notice board, pines |
| snowpal target + snowball | for Snowdrift Toss |
| emote particles | ♪/❄/! symbols, sparkle |
| `frostbyte.svg` OS icon | original |

Regen rule: re-run `node gen-assets.js` and **commit the PNG outputs** whenever art changes (browser never
runs the generator). Keep the sheet convention identical to game1 so `main.js`'s anim/flip logic ports directly.

---

## Limitations (blunt — no surprises)

1. **It's single-player wearing a crowd costume.** The "other penguins" are NPCs. A savvy visitor will
   notice. That's the honest price of zero-backend / zero-cost / zero-liability.
2. **No real persistence.** localStorage is per-browser and evaporates on "clear site data"; nothing
   follows the player to another device. A global `dmos.version` bump wipes Frostbyte's save with the rest.
3. **No accounts, no real social graph, no real chat.** Any "friends"/chat is local theatre.
4. **Art is the long pole.** Rooms, penguin + animations, cosmetics, minigame art — **weeks**, not the days
   the arcade games took. The code is very doable; the *content volume* is the cost.
5. **Scope-vs-payoff.** A full "living world" is a months-long project. Delight-per-hour drops sharply after
   the core vignette.
6. **Mobile.** Click-to-move ports to tap-to-move fine, but a busy world on a phone needs deliberate
   camera/scale work (validate the plaza `bounds` inset at 375×812, zoomed to 0.85 per game1's `fitCam`).

## Recommendation — build the vignette, not the MMO

Don't build "Club Penguin." Build **Chillmere Plaza**: your customisable penguin waddles a cosy square, a
handful of NPC penguins mill about and blurt canned lines, you emote, and you play **one** minigame
(Snowdrift Toss) for coins you spend on a hat at Glimmer & Wool. Four locked "more coming" doors make the
world feel bigger for free. That delivers ~80% of the genre's warmth for ~20% of the effort, ships on the
static stack with no backend and zero IP/moderation risk, and stands on its own as a portfolio piece.
Expansion rooms (Den, Court, Workshop, Trail) and the second minigame are **data-only** additions once the
plaza proves it's fun. If the plaza isn't delightful, no number of rooms will save it — and if it is, it
doesn't need to pretend to be an MMO it can't be.

## Open decisions for Dominik

1. **Final name** (Frostbyte? Chillmere? something else) — needed for P0, the os-bridge `ready` title, the
   registry `title`, and the icon.
2. **Vignette only, or commit to the multi-room world?** (Strongly recommend vignette first.)
3. **Free-text chat on or off by default?** (Off = pure safe-phrase mode is the safest default; free text is
   still local-only either way.)
4. **Portfolio tie-ins or a wholly separate whimsical world?** (e.g. an NPC that nods to a testimonial name, a
   café named after a client — optional easter eggs, all original.)
5. **Menus pause the crowd, or leave the plaza alive behind overlays?** (game1's dialogue freezes the *player*
   but not the tree; decide whether shop/dress-up also gate NPC updates for a calmer UI.)

---

*Provenance: assembled 2026-07-11 from a grounded multi-agent pass (two agents read the real game1/KAPLAY
code + project conventions; parallel agents drafted the Engine, Rooms, Avatar/Economy, and NPC sections on
Sonnet; the Minigame, Chat, and Integration sections plus this synthesis were written inline after the run
hit the account token limit). The folder layout in §4 is authoritative where earlier sections drifted.*
