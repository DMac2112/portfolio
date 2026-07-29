# TL;DR — Frostbyte collision incident

**Status:** Fixed and verified on 2026-07-29. This repository is the source of truth.

**Canonical Frostbyte source:** `dominikos/frostbyte/`

**Generated copies:** `public/frostbyte/` and the GitHub Pages repository. Never hand-edit either.
They are replaced by `deploy.cmd`.

This note supersedes `plans/FROSTBYTE-IGLOO-HANDOFF.md`. That handoff correctly identified the
broken exterior entry, but incorrectly concluded that the den interior was probably fine.

## What broke

Two separate collision problems appeared around the painted home igloo:

1. The repainted plaza igloo moved the entrance away from the room edge, so the original
   edge-only auto-entry rule stopped firing. Later work added an authored entry direction and
   corrected the exterior dome geometry.
2. The den interior doorway was still broken. The boundary resolver checked the doorway rectangle
   before the igloo interior. Its 12-pixel player inset snapped every upward movement back to
   `y=672`. The player could enter the den and slide inside the doorway band, but could never cross
   onto the floor.

The second bug is the incident this file closes.

## How it got lost and carried through deployments

`deploy.cmd` publishes the complete working tree, then stages and commits the complete source tree.
That safety net prevents uncommitted live code, but it also preserves unfinished work if preflight
and runtime verification are skipped.

| Local time | Source commit | What was carried forward |
|---|---|---|
| 2026-07-27 16:03 | `9aa9817` | A large painted-room collision snapshot introduced the den doorway rectangle and the invisible interior barrier. |
| 2026-07-28 13:50 | `5886744` | All 12 room backdrops changed from PNG to JPG; the existing collision code was rebuilt and deployed unchanged. |
| 2026-07-28 19:05 | `069997a` | Exterior plaza-igloo calibration changed, while `.orig` backup files were accidentally swept into source and public output. The interior trap remained. |
| 2026-07-28 23:34 | `d9cf0c3` | Exterior auto-entry and dome geometry were corrected. One `.orig` file was removed, but the den interior resolver was not fixed. |
| 2026-07-28 23:44 | `6e7f247` | The remaining `.orig` file was removed. No interior collision change was made, so the broken doorway became the clean-looking GitHub and live baseline. |

The last pre-fix Pages commit was `cc0870b`. Before the corrective work, local `main`,
GitHub `origin/main`, the local Pages clone, and both deployed Frostbyte runtime files all matched.
The bug was not caused by a stale copy: the same broken resolver had been carried into every layer.

## Why the tests missed it

The collision suite checked:

- whether individual coordinates were stable or blocked;
- whether spawns and doors were near points in the same coarse 24-pixel grid component.

Both sides of the invisible lip were valid coordinates, so those checks passed. Real movement uses
small frame-sized steps. Each step entered the doorway inset and was snapped back, making the
barrier impossible to cross.

Static point checks and coarse reachability are not sufficient evidence for a doorway.

## The fix

Boundary openings and room interiors are now resolved as one walkable union:

- a position already safely inside the room wins;
- the doorway opening is used only when the room boundary would otherwise reject the position;
- the same ordering is applied to ellipse, polygon, and multi-region room boundaries.

`world/room-collision.test.js` now simulates 60 FPS movement from the den spawn:

- walking upward must cross from the tunnel onto the floor;
- walking sideways must leave the entrance band.

Verification completed before deployment:

- focused collision and travel tests: **81 passed**;
- complete Frostbyte suite: **497 passed** across **41 files**;
- browser walk: plaza → around the painted igloo → enter → cross onto the floor → walk around;
- browser warnings/errors: **none**.

## Rules from now on

1. Work only in `portfolio-rework`; Frostbyte source is `dominikos/frostbyte/`.
2. Never hand-edit `public/frostbyte/`. Run the root `deploy.cmd` to rebuild and re-vendor it.
3. Before every deploy, inspect the entire `git status`; the deploy commits all non-ignored files.
4. Run the complete Frostbyte suite after collision changes.
5. For every doorway or narrow passage, add a frame-by-frame traversal regression test.
6. Walk the affected route in the browser. Static geometry tests do not replace runtime movement.
7. Treat this file and current code as authoritative over older handoffs and backup notes.
