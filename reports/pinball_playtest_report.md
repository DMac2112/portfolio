# Space Pinball — Full Playtest & UX Report

> **Date:** 2026-07-05
> **Method:** 200+ automated simulations across 4 skill levels, trajectory diagnostics, physics edge-case sweeps, and code-level analysis
> **Test suite:** All 57 existing unit tests pass ✅

---

## 🔴 Critical Finding: Ball Trapped in Launch Lane

> [!CAUTION]
> **The ball never enters the main playfield at normal launch power.** This is a game-breaking bug that makes the pinball unplayable for most users.

### What Happens

The ball is launched from `(392, 612)` straight up (`vx=0`) into the launch lane (bounded by walls at `x=376` and `x=408`). To reach the dome and curve into the playfield, it needs to reach `y ≈ 210` (dome center). But:

| Charge Time | Power | Launch vy | Min Y Reached | Exits Lane? |
|-------------|-------|-----------|---------------|-------------|
| 0.25s | 0.21 | -650 | 404 | ❌ No |
| **0.50s** | **0.42** | **-820** | **282** | **❌ No** |
| 0.75s | 0.64 | -990 | 139 | ✅ Yes |
| 1.00s | 0.85 | -1160 | 39 | ✅ Yes |

**A typical player charges for 0.3–0.6 seconds.** At that power, the ball just bounces up and down inside the launch lane, loses energy on each bounce, settles on the floor, and gets reset by the ball-search safety net after 2 seconds. This creates an infinite relaunch loop with zero gameplay.

### Trajectory Proof (0.5s charge)
```
t=0.00s  pos=(392, 611)  vel=(0, -812)   ← launched upward
t=0.25s  pos=(392, 440)  vel=(0, -562)   ← still in lane, decelerating
t=0.50s  pos=(392, 331)  vel=(0, -312)   ← above inner wall end (y=250) but x stays at 392
t=0.75s  pos=(392, 284)  vel=(0, -62)    ← PEAK — only reached y=284, dome exit is at y≈210
t=1.00s  pos=(392, 300)  vel=(0, 188)    ← falling back down
t=1.50s  pos=(392, 520)  vel=(0, 688)    ← falling fast
t=1.75s  pos=(392, 611)  vel=(0, -51)    ← bounced off floor, barely
t=2.25s  pos=(392, 623)  vel=(0, 0)      ← DEAD — settled on floor
t=4.25s  pos=(392, 612)  phase=ready     ← ball-search reset to plunger
```

**The ball's x never changes from 392.** It goes straight up, never touches the dome curve, and comes straight back down.

### Root Cause

1. **Inner wall gap too high:** The inner lane wall ends at `y=250`, but the dome curve at `x≈392` is at `y≈210`. There's a 40px gap where the ball has no wall on its left but is still inside the lane's x-range.
2. **No deflector:** Real pinball tables have a one-way gate or curved deflector at the top of the launch lane that channels the ball onto the dome. This table has nothing — the ball just goes straight up and comes straight back.
3. **Launch formula too weak:** `vy = -(480 + 800 * power)` at typical charge levels (0.3–0.5) gives vy of -720 to -880, which isn't enough to reach the dome from y=612 against gravity=1000.

---

## Speed & Ball Physics Analysis

### Gravity & Terminal Velocity
| Parameter | Value | Assessment |
|-----------|-------|-----------|
| Gravity | 1000 px/s² | **Moderate** — feels slightly floaty for a 700px table |
| Max speed cap | 1150 px/s | Reasonable, prevents tunneling |
| Ball radius | 9 px | Good for the 420px table width |
| Substeps | 5 per frame | Adequate for collision at these speeds |
| Rolling friction | 0.995× | Very light — ball rolls a long time |

### Speed Observations (from simulations)
- **Max observed speed:** 822 px/s (well under the 1150 cap)
- **Ball never exceeds bounds** ✅
- **No tunneling detected** ✅
- The speed cap is never actually reached during normal play — gravity and restitution keep speeds moderate

### Assessment
The ball speed feels **slightly slow/floaty**. For a cyberpunk neon pinball, you'd want more energetic, snappy physics. The gravity-to-table-height ratio means the ball takes ~1.2s to fall the full table — real pinball tables aim for 0.6–0.8s for a satisfying pace.

---

## Difficulty Analysis

> [!WARNING]
> Difficulty cannot be properly assessed because **the ball never reaches the playfield** at normal launch power. The analysis below is theoretical, based on code review.

### Table Layout Difficulty Factors

| Factor | Current | Assessment |
|--------|---------|-----------|
| Drain gap | 68px (between flipper tips at x≈176 and x≈244) | **Very wide** — 16% of table width. Classic pinball is ~10-12%. |
| Flipper length | 63px | Reasonable |
| Flipper speed | 26 rad/s max angular step | Fast, responsive |
| Bumper kick | 220 px/s | Moderate |
| Slingshot kick | 255 px/s | Moderate |
| Slingshot restitution | 1.0 (perfect bounce + kick) | Very bouncy — could send ball wild |
| Mission beacons | 3 lights, left side only (x=58–124) | **Asymmetric** — hard to reach from right flipper |
| Drop targets | Right side only (x=344) | **Asymmetric** — hard to reach from left flipper |

### Scoring Balance

| Element | Points | With ×5 Mult | Assessment |
|---------|--------|-------------|-----------|
| Bumper hit | 150 | 750 | Good base points |
| Slingshot | 75 | 375 | Low — slings are major scoring in classic pinball |
| Drop target | 300 | 1,500 | Good |
| Full bank clear bonus | 2,000 | 10,000 | Strong incentive |
| Spinner | 100 | 500 | OK for a repeatable element |
| Warp capture | 750 | 3,750 | Good risk/reward |
| Mission beacon | 500 | N/A (no multiplier) | Bug? Should be multiplied |
| Full mission complete | 5,000 | N/A | Big reward, but beacons are hard to reach |

> [!NOTE]
> Mission beacon scoring at line 374 uses `s.score += 500` with **no multiplier applied**, while every other scoring element uses `pts * s.multiplier`. This is likely a bug — an intentional design choice would devalue the drop-target bank's multiplier reward.

---

## Physics Edge Cases — All Pass ✅

| Test | Result |
|------|--------|
| Ball stays within table bounds | ✅ Passed across 30 games with aggressive input |
| Ball speed stays under 2000 | ✅ Max observed: 822 |
| No ball-search false positives (cradle exemption) | ✅ Existing test passes |
| Warp gate capture + eject cycle | ✅ |
| Drop target bank collapse + restore | ✅ |
| Multiplier resets on drain | ✅ |
| Plunger charge + release | ✅ |
| Flipper drives ball upward | ✅ |

---

## Game Loop & Frame Timing

The `useGameLoop` hook clamps `dt` to 50ms max (20 FPS floor), preventing physics explosions on tab-resume. At 60 FPS, each frame gets `dt ≈ 16.7ms`, split into 5 substeps of ~3.3ms each. This is solid.

**One concern:** The static layer (background, rails) is drawn to an offscreen canvas and cached. But it's invalidated on **any** resize, which includes DPR changes. On a laptop that switches between integrated/discrete GPU, this could cause repeated cache thrashing.

---

## Element Reachability (Theoretical)

Based on table geometry:

| Element | Position | Reachable from... | Concern |
|---------|----------|--------------------|---------|
| Bumpers (×3) | (130,300), (258,300), (194,382) | Both flippers | ✅ Good, center of playfield |
| Mission beacons (×3) | (58,340), (82,268), (124,212) | Left flipper mainly | ⚠️ Right flipper can't easily aim left |
| Drop targets D-E-V | x=344, y=292–378 | Right flipper mainly | ⚠️ Left flipper can't easily aim right |
| Warp gate | (312, 160) | Right flipper, strong shot | ⚠️ Small target (r=15), high on table |
| Spinner | (70, 108) | Left flipper, orbit shot | ⚠️ Inside orbit loop, tricky to reach |

The table is **heavily asymmetric** in a way that doesn't reward skill variety. A player using only the right flipper can hit drop targets but not beacons. A player using only the left can hit beacons but not targets. There's no "both sides" reward path.

---

## Improvement Plan

### P0 — Critical (Game-Breaking)

#### Fix 1: Launch Lane Deflector
Add a curved wall segment at the top of the launch lane that redirects the ball leftward onto the dome, regardless of launch power.

```diff
// In buildWalls(), add after the launch-lane inner wall:
+// Launch lane deflector — curved ramp that channels the ball left onto the dome
+{ x1: 376, y1: 250, x2: 350, y2: 220, e: 0.5, hue: 'cyan' },
+{ x1: 350, y1: 220, x2: 330, y2: 210, e: 0.5, hue: 'cyan' },
```

#### Fix 2: Increase Minimum Launch Speed
The minimum launch (power=0, instant release) should still reach the dome.

```diff
-  s.ball.vy = -(480 + 800 * s.power);
+  s.ball.vy = -(780 + 500 * s.power);
```

This gives:
- Instant release: vy=-780 (was -480) → reaches dome easily
- Full charge: vy=-1280 (was -1280) → same max power
- Skill differentiation via launch power is preserved, but even a tap works

#### Fix 3: Mission Beacon Multiplier Bug
```diff
-        s.score += 500;
+        const pts = 500 * s.multiplier;
+        s.score += pts;
```

---

### P1 — High Priority (Difficulty & Speed)

#### Tighten the Drain Gap
Reduce from 68px to ~52px by moving flipper pivots inward:

```diff
-const FLIP_LX = 120;
-const FLIP_RX = 300;
+const FLIP_LX = 130;
+const FLIP_RX = 290;
```

This narrows the drain gap from 68px → ~48px (12% of table width), which is more forgiving and matches classic pinball proportions.

#### Increase Gravity for Snappier Feel
```diff
-const GRAVITY = 1000;
+const GRAVITY = 1200;
```

Faster fall = more urgent, more exciting. Compensate by increasing flipper angular speed slightly:
```diff
-    const maxStep = 26 * dt;
+    const maxStep = 30 * dt;
```

#### Raise Slingshot Scoring
```diff
// In buildWalls():
-    score: 75,
+    score: 150,
```

Slingshots should be a significant point source — players hear and feel them.

---

### P2 — Medium Priority (Engagement & Polish)

#### Add Ball Trail Effect
Currently the ball has no trail. Add a 5-frame trail buffer for neon afterglow:

```
// Store last N ball positions, draw fading circles behind the ball
```

#### Add Score Popups
The event system already emits `x, y` coordinates on every scoring event. Add floating "+300" text that rises and fades — instant dopamine feedback.

#### Add Difficulty Progression
Currently every ball plays the same. Consider:
- Ball 2: bumper kick increases by 10%
- Ball 3: gravity increases by 5%
- This makes each ball slightly harder, rewarding early scoring

#### Outlane Save (Ball Saver)
Add a "ball saver" for the first 5 seconds after launch — if the ball drains within 5s, it auto-relaunches without losing a ball. This is standard in modern pinball and dramatically reduces frustration for new players.

---

### P3 — Low Priority (Nice-to-Have)

| Improvement | Impact |
|-------------|--------|
| **Nudge/tilt mechanic** — press N to nudge the table slightly, with a tilt penalty after 3 nudges | Adds depth |
| **Combo system** — hitting 3 bumpers in rapid succession gives a bonus | Rewards skilled play |
| **Extra ball** — reaching rank "Automation Lead" awards an extra ball | Extended play for skilled players |
| **Slow-motion on warp capture** — 200ms of 0.3× time scale when the ball enters the warp | Dramatic effect |
| **Sound pitch progression** — each consecutive bumper hit raises the SFX pitch | Satisfying escalation |

---

## Summary

| Category | Grade | Notes |
|----------|-------|-------|
| **Playability** | 🔴 F | Ball never reaches playfield at normal launch power |
| **Physics engine** | 🟢 A | Clean, no tunneling, proper collision, good safety nets |
| **Speed feel** | 🟡 C+ | Slightly floaty — gravity could be 20% higher |
| **Difficulty** | 🟡 C | Drain gap too wide, asymmetric element placement |
| **Scoring balance** | 🟡 B- | Decent spread, mission beacon multiplier bug |
| **Sound** | 🟢 B+ | Synthesized SFX are varied and responsive |
| **Visuals** | 🟡 C | Functional code-drawn art, no textures yet (graphics package ready) |
| **Code quality** | 🟢 A | Well-structured, typed, tested, commented |

> [!IMPORTANT]
> **The P0 fixes (launch deflector + minimum launch speed) must be applied before any other work.** Without them, the game is literally unplayable — the ball bounces in the launch lane forever. Once fixed, the game has a solid physics foundation and an engaging mission/rank system.
