# Frostbyte — Home Igloo Entry/Interior BROKEN (handoff)

**Status:** the plaza→den ("home igloo") entrance is broken in a NEW way after the 2026‑07‑28
repaint. Deployed live (commit `069997a`) but still wrong. This doc has the exact root cause,
the geometry, and the fix plan so a fresh chat can finish it. Everything is diagnosed — no
guessing needed.

---

## 1. Symptom (user's words, 2026‑07‑28)
> "I could walk into the igloo from the plaza by going around it on the **left side**, but I
> **STILL cannot walk around the igloo once inside** — I'm **STUCK IN THE DOORWAY**."

So: entry is awkward (only reachable at an angle from the left), and once in the igloo mouth the
player is pinned in a narrow slot and can't move — the den never actually opens by walking.

---

## 2. Root cause (TWO bugs, both confirmed by reading the code)

### Bug A — `door-den` auto‑enter is DISABLED (the main one)
The engine only auto‑opens a door when the door sits within `AUTO_DOOR_R = 56`px of a **room
bounds edge**. See `engine/travel.js`:
- `AUTO_DOOR_R = 56` (`engine/travel.js:105`)
- `outwardVectorForDoor(door, bounds, 56)` returns `null` unless the nearest bounds edge is ≤56px
  away (`engine/travel.js:107‑117`)
- `findAutoEnterDoor(...)` bails when that's `null` (`engine/travel.js:129‑147`), so no auto‑enter.

Plaza bounds = `{ x0:72, x1:1368, y0:96, y1:936 }`.
`door-den` was moved from **(720, 936)** — literally ON the bottom edge, dist 0 → auto‑enter worked
— to **(720, 812)** to sit at the new mid‑plaza igloo. Distance from 812 to the bottom edge (936)
is **124px > 56** → `outwardVectorForDoor` returns `null` → **the door never auto‑fires when you
walk into it.** You can only enter by pressing **E** / clicking (the interact path at
`main.js:536‑539` still works, which is how the user got in at all).

### Bug B — the `passThrough` opening is a rigid rectangular SLOT that pins the player
The igloo collision obstacle (in `world/room-collision.js`, `PROFILES.plaza`, ~line 30‑33):
```js
{ id: 'den-igloo', type: 'ellipse', x: 720, y: 795, rx: 125, ry: 110,
  opening: { x0: 648, x1: 792, y0: 670, y1: 900, passThrough: true } }
```
`resolveShape` (`room-collision.js:614‑624`) sets `openingRadius = 0` for passThrough, then
`resolveOpening` (`:367‑385`) **clamps** the player to the opening rectangle:
`clampRange(pos.x, 648, 792)`. Effect: once inside the 144px‑wide slot the player CANNOT move
laterally out of it ("can't walk around the igloo"), and the surrounding solid ellipse blocks a
straight approach — hence "go around on the left." The player wedges in the slot and, because of
Bug A, walking does nothing. **= "stuck in the doorway."**

### Why this whole approach is architecturally wrong
Every OTHER door in the game sits on a room **edge** (e.g. `door-court` x=1368, `door-workshop`
x=72, `door-trail` y=96) and you walk into it from open floor. The plaza→den door used to be on
the bottom edge too. Repainting the igloo as a **mid‑plaza dome** moved its door 124px inland,
past the edge gate, and someone (me) tried to compensate by punching a `passThrough` tunnel
through the dome ellipse. That fights the engine instead of using it. Fix the model, don't patch
the geometry again.

### Den INTERIOR looks OK (verify, but not the main suspect)
den bounds `{x0:400,x1:1040,y0:240,y1:800}`; `fromPlaza` spawn `(720,720,up)` is on clear floor
(nearest obstacle is door‑sign at 1000,790); `door-out (720,800)` is ON the den's bottom edge so
it auto‑fires correctly. So the trap is PLAZA‑side. Still, walk the interior in‑game to confirm.

---

## 3. Fix plan (recommended: Option C)

**Option C — remove the tunnel, put the door on open floor, let it auto‑enter by proximity.**
1. **Engine (3 lines):** let a door opt into proximity auto‑enter without the edge gate. In
   `engine/travel.js findAutoEnterDoor`, if `door.autoEnter` (or `door.enterDir = {x,y}`) is set,
   skip `outwardVectorForDoor` and use that direction directly for the `movement · outward > 0`
   and `dist ≤ AUTO_DOOR_R` checks. Add a unit test in `engine/travel.test.js`.
2. **Collision:** DELETE the `passThrough` opening. Make `den-igloo` a plain solid dome whose
   SOUTH face ends around **y≈760** (e.g. shrink `ry` / raise center) so there's open plaza floor
   just below it.
3. **Door:** keep `door-den` at ~**(720, 812)** on that open floor (south of the solid), set
   `autoEnter:true` + `enterDir:{x:0,y:1}`. Player walks DOWN into it from open floor — never
   clamped. Keep the interact prompt as a fallback so E/click still works.
4. **Art check:** `assets/room-plaza.jpg` (up‑facing igloo) — make sure the painted dark
   entrance mouth visually sits at the door position (~720, 760‑812). Regenerate via fal
   `nano-banana-2/edit` referencing the current master ONLY if the mouth doesn't line up
   (**confirm ~$0.08/img cost with Dominik first** — standing rule).
5. **Update the test** `world/room-collision.test.js` — the block *"opens the repainted plaza
   igloo toward the plaza"* currently ENSHRINES the broken passThrough geometry. Rewrite it to
   assert: door reachable from open plaza floor, igloo solid blocks its body, den spawn clear.

(Option A = move the door back to the bottom edge — rejected, breaks the mid‑plaza dome look.
Option B = same as C but without shrinking the solid — worse, keeps a tight mouth.)

---

## 4. Key values / files (current BROKEN state)
| What | Value | Location |
|---|---|---|
| Plaza bounds | `{x0:72,x1:1368,y0:96,y1:936}` | `content/rooms.js` (plaza) |
| Igloo obstacle | `ellipse (720,795) rx125 ry110` + passThrough opening `{648,792,670,900}` | `world/room-collision.js` ~L30 |
| `door-den` | `(720,812)` → den/`fromPlaza` | `content/rooms.js:40` |
| plaza `fromDen` spawn | `(720,740,up)` | `content/rooms.js:20` |
| den bounds | `{x0:400,x1:1040,y0:240,y1:800}` | `content/rooms.js:58` |
| den `fromPlaza` spawn | `(720,720,up)` | `content/rooms.js:61` |
| den `door-out` | `(720,800)` → plaza/`fromDen` | `content/rooms.js:70` |
| `AUTO_DOOR_R` | `56` + edge gate | `engine/travel.js:105`, `:107`, `:129` |
| enterDoor / interact / auto‑door call | — | `main.js:299`, `:536`, `:925` |

All code lives under **`portfolio-rework/dominikos/frostbyte/`** (NOT the session CWD — see traps).

---

## 5. Repro
- **Live:** hard‑refresh `https://dmac2112.github.io/` → open **Frostbyte** → plaza → walk your
  penguin down into the bottom‑center igloo dome. You wedge in the mouth, can't walk around, and
  the den doesn't open by walking (only E/click opens it).
- **Tests:** `npm test` (vitest, 41 files / 492 tests). The igloo test currently PASSES but is
  wrong (asserts the broken model — see fix step 5). Keep runs **bounded** (no‑runaway rule).

---

## 6. TRAPS — read before touching anything
1. **Session CWD = the DEAD folder** `Websites/portfolio-2026`. The real, deployed code is
   `Websites/portfolio-rework/dominikos/frostbyte/`. Don't edit files in portfolio-2026.
2. **Deploy:** `.\deploy.cmd` in `portfolio-rework` (portable Node 20). Rebuilds OS → re‑vendors →
   Astro build → pushes to `DMac2112.github.io` + commits source. Live ~1‑2 min. Frostbyte serves
   at `https://dmac2112.github.io/frostbyte/` (assets at `/frostbyte/assets/…`).
3. **Codex hands back PATCHES** (it's sandboxed to the CWD dead folder). Apply from the repo root:
   `git -C <portfolio-rework-root> apply --directory=dominikos/frostbyte --whitespace=nowarn X.patch`
   — then **grep‑verify the change actually landed** (git apply can exit 0 and change nothing).
   NEVER `git -C <subdir> apply` (silent no‑op) and never trust the exit code alone. Repo is CRLF;
   Codex patches are LF, so `patch -p1` errors on line endings — use the `git apply --directory`
   form above.
4. **Orchestration:** Claude = lean mastermind; delegate implementation to **Codex** (burn Codex
   credits, protect Claude's — usage is low). Add "use Antigravity/`agy` if you want" so cost lands
   on Codex. Claude keeps scope + final verify + deploy.
5. **`agy`/Gemini visual passes are unreliable** — it hallucinated room contents and auto‑denied on
   Windows permissions. Do collision/geometry reasoning in code, not from agy's descriptions.
6. **No invisible walls** — don't add collision the art doesn't paint (Codex adversarially rejected
   that last time; keep that bar).
7. **Reap stray processes** — kill leftover `agy`/`codex` after any failed/timed‑out delegation
   (a hung agy once ate 166 CPU‑seconds).

---

## 7. Recommended first move for the new chat
Delegate Option C to Codex as one patch: (a) `travel.js` `autoEnter` flag + test, (b) remove the
passThrough opening and shrink the igloo solid (front face ~y760), (c) `door-den` `autoEnter` at
(720,812), (d) rewrite the igloo collision test. Claude then applies the patch (via the
`git apply --directory` form), runs the bounded suite, walks it in‑game via the preview browser,
and deploys with `.\deploy.cmd`. Only regen art if the painted mouth doesn't line up (confirm fal
cost first).
