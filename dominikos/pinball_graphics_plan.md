# Space Pinball — Visual Enhancement Plan (Cyberpunk / Neon / Futuristic)

> **Goal:** Transform the current code-drawn canvas pinball from a functional prototype into a visually stunning cyberpunk arcade table — while keeping everything **100% original** (no copyrighted assets). All art is drawn procedurally on canvas or via pre-rendered texture sprites.
>
> **For:** Gemini / Nano Banana to generate textures & graphics

---

## Current State

The game is a **420×700 canvas** with everything drawn in code:
- Dark navy gradient background with scattered dot-stars
- Simple radial-gradient bumpers (purple/gold)
- Solid-color slingshots (amber)
- Flat green circle mission lights
- Line-drawn rails (cyan glow, `shadowBlur: 7`)
- Round-cap line flippers (gold with dark outline)
- Basic radial-gradient ball (white/grey)
- A soft teal "home planet" in the dome area
- Side panel with monospace text

**What's missing:** No textures, no particle effects, no detail art, no visual depth. It works but looks like a prototype.

---

## Art Direction: Cyberpunk Neon Space

| Attribute | Direction |
|-----------|-----------|
| **Palette** | Deep space blacks (#05081c, #0a0f2e), electric cyan (#00f0ff), hot magenta (#ff2d95), amber (#ffcf6b), acid green (#7fe08a), violet (#b490ec) |
| **Style** | Clean vector/illustration with neon glow layers, NOT pixel art. Think Tron Legacy meets Space Cadet meets synthwave poster |
| **Lighting** | Everything glows. Double-layer neon: a sharp bright core + a soft wide bloom behind it |
| **Surface** | Subtle circuit-board / PCB trace patterns on the table floor. Hexagonal grid or synthwave perspective grid |
| **Material** | Chrome/brushed metal for physical elements (flippers, plunger, rails). Glass/holographic for bumpers and lights |

---

## Asset List — What To Generate

### 1. Table Background Texture
**File:** `pinball_table_bg.png` (420×700, or 840×1400 @2x)

**Description:** The full table floor texture. This replaces the current flat gradient.

**Art direction:**
- Deep space black base
- Subtle **synthwave grid** (perspective lines converging toward the top of the table, fading into the distance) — very faint, just enough to give depth
- **Circuit-board traces** (thin cyan/teal lines forming PCB-like patterns) layered underneath, especially dense around the bumper triangle and the lower flipper area
- Scattered **star field** (tiny dots, varied brightness, some with subtle 4-point star sparkle)
- A large **nebula/galaxy smear** in the upper-left quadrant (purple/magenta, very low opacity ~15%) to break up the monotony
- The general feel: you're playing pinball on the hull of a spaceship looking out into deep space

---

### 2. Planet / Reactor Core (Dome Centerpiece)
**File:** `pinball_reactor.png` (120×120, transparent background)

**Description:** Replaces the simple teal radial gradient at (210, 120). This is the visual centerpiece of the upper dome.

**Art direction:**
- A **glowing reactor sphere** or small planet with visible energy rings
- Core: bright cyan/white hot center
- Middle: swirling energy patterns in cyan and magenta
- Outer: fading glow halo (transparent edges)
- Think: a miniature sun or fusion reactor, not a boring planet
- Should feel like it's pulsing with energy

---

### 3. Bumper Textures (×3)
**File:** `pinball_bumper.png` (64×64, transparent background)

**Description:** Replaces the radial-gradient circle bumpers. These are the "reactor pod" bumpers.

**Art direction:**
- **Top-down view** of a cylindrical reactor pod / energy pylon
- Chrome/metal ring outer edge with visible bolts or segments (6-8 segments)
- Inner glowing core — pulsing violet/magenta energy
- A **hexagonal or triangular** tech pattern etched into the metal ring
- The center should be bright enough to believably "flash" when hit (the code multiplies opacity on hit)
- Should look 3D/raised — these are physical obstacles on the table

**Also generate:** `pinball_bumper_hit.png` — same bumper but with the core at maximum brightness (white-hot center, amber/gold ring glow) for the flash state

---

### 4. Slingshot Texture
**File:** `pinball_slingshot.png` (40×80, transparent background)

**Description:** Decorative panel behind each slingshot wall segment. Currently just a colored line.

**Art direction:**
- A **triangular warning panel** with tech aesthetics
- Brushed metal base with **caution stripes** (amber/black diagonal)
- Small **lightning bolt** or energy symbol in the center
- Thin neon border (magenta) that looks like it pulses
- Oriented vertically (the slingshot runs roughly vertical)

---

### 5. Mission Beacon Textures (×2 states)
**Files:** `pinball_beacon_off.png` and `pinball_beacon_lit.png` (32×32, transparent)

**Description:** Replaces the flat green circles for mission lights. These are the 3 beacons you light to complete a mission.

**Art direction — OFF state:**
- A **dark lens / inactive sensor** — circular glass dome, dark green/grey
- Faint hexagonal border pattern
- Small crosshair or reticle lines inside
- Looks dormant, powered down

**Art direction — LIT state:**
- Same structure but now **blazing green** with a bright core
- Visible light rays emanating outward (4 or 6 point star burst)
- The lens is now transparent, showing pulsing energy inside
- A soft green bloom/glow halo around the entire beacon

---

### 6. Drop Target Bank (D-E-V)
**Files:** `pinball_drop_up.png` and `pinball_drop_down.png` (24×28, transparent)

**Description:** Each of the 3 drop targets (labeled D, E, V). Currently just invisible wall segments.

**Art direction — UP state:**
- A small **standing metal plate/panel** viewed from above
- The letter (D, E, or V) etched in glowing cyan
- Chrome/steel border
- Looks like a physical target you can knock down

**Art direction — DOWN state:**
- Same plate but **flush with the surface** (flat, dark, recessed)
- Letter is dim/dark
- Subtle "slot" shadow showing it dropped into the table

---

### 7. Warp Gate
**File:** `pinball_warp.png` (48×48, transparent)

**Description:** The warp gate at (312, 160) that swallows and re-fires the ball.

**Art direction:**
- A **swirling portal / vortex** viewed top-down
- Concentric rings spiraling inward
- Colors: deep purple outer → magenta mid → bright white/cyan center
- Energy particles being sucked inward
- Should look like a miniature black hole or teleporter pad
- The edges should have visible energy lightning/tendrils

**Also generate:** `pinball_warp_active.png` — same but with much brighter, more violent swirling (for when it's capturing the ball)

---

### 8. Spinner
**File:** `pinball_spinner.png` (40×40, transparent)

**Description:** The spinner sensor inside the orbit loop at (70, 108).

**Art direction:**
- A **rotating turbine / fan blade** viewed top-down
- 3 or 4 blades, chrome/metal with cyan edge lighting
- Central hub with a small glowing dot
- Motion lines or blur on the blade tips
- Should look like it spins when the ball passes through

---

### 9. Flipper Textures (Left + Right)
**Files:** `pinball_flipper_L.png` and `pinball_flipper_R.png` (80×24, transparent)

**Description:** Replaces the round-cap line flippers. Oriented horizontally, the code rotates them.

**Art direction:**
- **Brushed chrome / titanium** paddle shape
- Wider at the pivot end, tapered at the tip
- Amber/gold edge lighting (neon strip along the length)
- Visible mechanical pivot joint at the base (bolts, housing)
- Small tech details: vents, panel lines, a tiny status LED
- Should look weighty and mechanical — these are the player's weapons

---

### 10. Ball Texture
**File:** `pinball_ball.png` (32×32, transparent)

**Description:** Replaces the radial gradient ball.

**Art direction:**
- A **chrome sphere** with visible reflections
- Top-left highlight (white), bottom-right shadow
- A faint **holographic/rainbow sheen** across the surface
- Subtle circuit-pattern etched into the metal
- Should look perfectly spherical and shiny
- Small enough to look good at 18px diameter (ball radius = 9)

---

### 11. Plunger / Spring
**File:** `pinball_plunger.png` (24×80, transparent)

**Description:** The launch mechanism on the right side. Currently drawn as zigzag lines.

**Art direction:**
- A **mechanical piston / spring launcher** viewed from above
- Coiled spring visible (chrome)
- Plunger head at top: flat metal disc with grip texture
- Housing: dark metal channel with cyan indicator lights along the side
- Should look like it compresses when charged

---

### 12. Rail / Wall Overlay Texture
**File:** `pinball_rail.png` (tileable, 8×64 or similar)

**Description:** A tileable texture applied along the rail walls instead of flat glowing lines.

**Art direction:**
- **Chrome tube/pipe** with a neon strip running along the top
- Visible segmented joints every ~20px
- The neon strip is cyan by default but the code can tint it per-wall
- Subtle shadow underneath giving it a raised/3D appearance
- Should tile seamlessly along its length

---

### 13. Side Panel Background
**File:** `pinball_panel_bg.png` (160×700 or flexible)

**Description:** Background for the score/info panel on the right side of the game.

**Art direction:**
- **Dark brushed metal** with very subtle vertical grain
- Thin neon border on the left edge (where it meets the table)
- Faint **holographic scan lines** (horizontal, very low opacity)
- Small decorative tech elements: a corner bracket, circuit traces, a tiny "DMOS" logo watermark
- The feel: the side of an arcade cabinet

---

### 14. Particle / Effect Sprites
**Files:** Multiple small sprites (16×16 or 8×8, transparent)

| Sprite | Description |
|--------|-------------|
| `spark_cyan.png` | Small 4-point star burst, cyan, for rail/wall hits |
| `spark_amber.png` | Same in amber, for slingshot/flipper hits |
| `spark_magenta.png` | Same in magenta, for bumper hits |
| `ring_burst.png` | Expanding ring effect (32×32), for mission light activation |
| `score_popup_bg.png` | Small rounded rectangle (64×24), dark with neon border, for floating "+500" text |

---

## Summary Table

| # | Asset | Size | Purpose |
|---|-------|------|---------|
| 1 | `pinball_table_bg` | 840×1400 | Full table floor |
| 2 | `pinball_reactor` | 120×120 | Dome centerpiece |
| 3 | `pinball_bumper` + `_hit` | 64×64 | Bumper normal + flash |
| 4 | `pinball_slingshot` | 40×80 | Slingshot panel |
| 5 | `pinball_beacon_off` + `_lit` | 32×32 | Mission light states |
| 6 | `pinball_drop_up` + `_down` | 24×28 | Drop target states |
| 7 | `pinball_warp` + `_active` | 48×48 | Warp gate states |
| 8 | `pinball_spinner` | 40×40 | Orbit spinner |
| 9 | `pinball_flipper_L` + `_R` | 80×24 | Flipper paddles |
| 10 | `pinball_ball` | 32×32 | Chrome ball |
| 11 | `pinball_plunger` | 24×80 | Launch mechanism |
| 12 | `pinball_rail` | 8×64 tile | Rail texture |
| 13 | `pinball_panel_bg` | 160×700 | Score panel bg |
| 14 | Spark/effect sprites | 8–64px | Hit effects |

**Total: ~20 unique texture files**

---

## Important Notes for the Generator

> [!IMPORTANT]
> - All textures must have **transparent backgrounds** (PNG with alpha) unless noted otherwise (table bg is opaque)
> - Everything is viewed **top-down** (bird's eye) — this is a flat table, not a 3D perspective view
> - Keep textures **clean and crisp** — they'll be rendered at small sizes on canvas, so fine detail gets lost. Bold shapes + strong neon contrast > subtle gradients
> - The **glow/bloom** effects on each asset should be baked into the texture (the canvas doesn't have post-processing bloom)
> - All colors should work against a near-black (#05081c) background
> - **No text** in the textures (text is rendered by the code for localization flexibility) — except the D/E/V on drop targets
> - These are **original designs** — do not reference or recreate any specific copyrighted pinball table art

> [!TIP]
> Start with assets 1 (table bg), 3 (bumpers), and 10 (ball) — these have the biggest visual impact and will immediately transform the game's look. The rest can be layered in incrementally.
