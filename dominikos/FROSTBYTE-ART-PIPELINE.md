# FROSTBYTE-ART-PIPELINE — painted backdrops via image-gen MCP (VALIDATED 2026-07-22)

Companion to `FROSTBYTE-WORLD-PLAN.md`. Goal: make Frostbyte *feel* like a real mid-2000s
virtual world — painted diorama rooms instead of code-drawn geometry — while keeping every
gameplay contract (dims, filenames, bounds, sprites) untouched.

## Status: the pipeline works — proven with two test generations
- **fal MCP: WORKING.** `FAL_KEY` is set in Dominik's user environment; the `fal` MCP server
  (`npx -y fal-ai-mcp`) generates successfully.
- **Room-backdrop test (target quality): PASSED.** `fal-ai/nano-banana-2` produced a painted
  plaza — aurora dusk sky, warm shop windows, fenced ice rink with skate scratches, notice
  board, igloo, lamp glow pools, blank signs as instructed. This IS the look.
  Saved at (session scratchpad): `scratchpad/plaza-master-test.png`.
- **Cheap-model caveat: CONFIRMED.** `fal-ai/flux/schnell` portrait test came back with garbage
  text baked into the belly and a 3D-render feel → schnell is for throwaway layout ideation
  only; all keeper assets go through `nano-banana-2` (or `-pro` for hero shots).
- **Standalone `nano-banana` MCP: DEAD, skip it.** Two faults, diagnosed 2026-07-22: the npm
  package pins the retired `gemini-2.5-flash-image-preview` model (404), *and* the Google project
  behind `GEMINI_API_KEY` is on Prepay billing with zero credits — HTTP 429 on every model,
  including plain text. Everything it offered is available through fal's hosted endpoints
  (`fal-ai/nano-banana-2`, `fal-ai/nano-banana-2/edit`, `fal-ai/nano-banana-pro[/edit]`), so one
  MCP + one key covers the whole pipeline. Also on fal if needed: `fal-ai/birefnet/v2`
  (background removal for transparent props).

## Cost reality (checked against live pricing, 2026-07-22)
**There is no free path to this art.** Google lists "Free Tier: Not available" for *every* image
model (2.5-flash-image, 3-pro-image, 3.1-flash-image, 3.1-flash-lite-image, Imagen 4). Image
generation is paid-only wherever it runs; fal is reselling the same Google models.

| Route | Per image | Status |
|---|---|---|
| fal `nano-banana-2` | $0.08 | **working now**, $9.47 balance ≈ 118 images |
| fal `flux/schnell` | ~$0.003 | working; bakes fake text — ideation only |
| Gemini direct `2.5-flash-image` | $0.039 | needs prepay top-up; script ready |
| Gemini direct `3.1-flash-lite-image` | $0.0336 | needs prepay top-up; cheapest option |

**Cheap-drafts-first is a standing rule** (see §Style-lock step 0): exploration runs on
`flux/schnell`, only settled compositions run on `nano-banana-2`. That turns Phase A from
"6 rooms × 3 premium candidates + 6 portraits ≈ 24 keeper images ≈ $1.92" into roughly **$1.00**
— ~30 cheap exploration images (~$0.09) plus ~12 premium keepers — with more exploration, not
less. All of it inside the existing balance. Topping up Gemini roughly halves the premium
per-image rate and is worth doing only if the art programme runs long — not a blocker for
starting.

**If Gemini ever gets funded**, skip the MCP entirely: `Graphics/Frostbyte/gen-master.mjs`
(zero-dep, no npm install) calls the REST API directly — `--prompt/--out/-n/--aspect/--ref` with
reference-image style-lock built in, and `--list` to show live model names when they rotate again.
Codex can run the same script.

## Can Codex use these MCPs? Yes — but read the recommendation
Codex CLI runs MCP servers from `~/.codex/config.toml` (it already runs one: `node_repl`).
Adding fal is:

```toml
[mcp_servers.fal]
command = "npx"
args = ["-y", "fal-ai-mcp"]
```

`FAL_KEY` lives in the USER environment, so the spawned server inherits it (add an
`[mcp_servers.fal.env]` block only if it doesn't). If Codex fails to spawn `npx` on Windows,
use `command = "cmd"`, `args = ["/c", "npx", "-y", "fal-ai-mcp"]`.

**Recommendation: Claude generates + curates, Codex integrates.** Art batches are a taste task —
candidates per room, a human (Dominik) picking, a reference image enforced across the set.
That's iterative curation, not code. Letting the build agent also burn its budget on image
retries mixes two jobs. Default split: Claude runs generation sessions with Dominik → approved,
processed PNGs land in the repo → Codex does the code-side swap + phase work. Wiring fal into
Codex is still worth doing for one-off needs (a missing prop, a quick variant while building).

## Art direction (the identity, so every batch matches)
- **Thesis: the cosy blue hour.** Perpetual dusk — never daytime. Cold navy world, warm amber
  life. Every inhabited place shows it by light in the windows. This is the deliberate
  aesthetic risk: sunny is the genre default; Frostbyte is the island at
  lights-on time, which also matches the name and the after-school-2006 mood of the OS.
- **Signature: the aurora.** A quiet green ribbon in outdoor skies; intensifies isle-wide when
  the Curio Log completes (world-plan W6). One signature, used with restraint.
- **Palette tokens** (name them in code and prompts):
  `dusk-navy #16283e` · `snow-blue #cfe0f2` · `ice-cyan #7fd6ff` · `lamp-amber #ffb45e` ·
  `aurora-green #6fe0b2` · `timber-brown #6b4a33`.
- **Shape language:** chunky rounded silhouettes, thick soft outlines, painterly texture,
  snow-capped everything. No photorealism, no thin detail that dies at 480px wide.
- **UI direction (for W0's journal/dialogue work, NOT this doc's scope):** diegetic materials —
  dialogue = carved timber plaque + painted portrait, Curio Log = knit-bound expedition log,
  news = cork board + paper. Frosted-glass panels (Codex's polish) stay as the base chrome;
  the signature surfaces go diegetic. Optional big lever: bundle ONE local OFL rounded display
  font (e.g. Baloo 2 or Fredoka, vendored woff2 in `frostbyte/fonts/`, credits row — offline
  rule is "no network", local files are fine) for headings/HUD only.

## The STYLE BLOCK (canonical prompt prefix — validated verbatim)
> A 2D game room backdrop for an original cosy penguin virtual-world game, wide landscape
> composition, viewed from a slightly elevated three-quarter angle like classic mid-2000s
> browser virtual worlds. Style: soft hand-painted cartoon — chunky rounded shapes, thick soft
> outlines, painterly texture, strong warm-versus-cool lighting. Deep navy twilight sky with
> faint green aurora ribbons (outdoor rooms only). Cosy, inviting, storybook mood. No
> characters, no animals, no people, no text, no letters, no numbers, no watermark. The middle
> of the scene stays open, flat walkable ground.

Then one scene paragraph per room stating: ground/sky split, landmark placement matching the
room's DOOR GEOMETRY (doors are game data at fixed positions — describe "a doorway at the top
edge / left edge / bottom edge" to match `content/rooms.js`), and 4–6 named props (these become
the clickables from the world plan, so art and interactions agree).

## Style-lock protocol (the consistency mechanism)
0. **Cheap draft pass first — standing rule, applies to every batch below.** Explore on
   `fal-ai/flux/schnell` (~$0.003, ~25x cheaper): composition, framing, prop placement, prompt
   wording, how many tries it takes to converge. Judge those on LAYOUT ONLY — schnell bakes fake
   text into images and renders with a different finish, so it never represents the final look.
   Dominik picks a direction from the cheap pass; only then does the good model run.
1. Generate the plaza master on `fal-ai/nano-banana-2` (landscape) once its composition is settled
   — 2 candidates, not a fishing expedition. Dominik picks ONE. That file is now the **style
   reference** for the entire game. (This master is the one deliberate premium-first exception:
   it *defines* the look, so it can't be drafted cheap — but its composition still comes from
   step 0.)
2. Every other room goes through `fal-ai/nano-banana-2/edit` WITH the reference image attached:
   "same painting style, palette and lighting as this reference; new scene: …". Batch all rooms
   in one session to minimize drift.
3. The downscaler (below) applies a shared palette-snap pass as the final unifier.
4. Portraits: same model, bust composition, warm rim light, one shared background treatment per
   character's room; displayed FRAMED (rectangular) in the dialogue plaque → no transparency
   needed, no background removal step.

## Mechanics: masters → game files
- Masters (PNG, ~2MB and under) live in `Graphics/Frostbyte/masters/` (repo, committed —
  same precedent as the pinball kit in `Graphics/Antigravity/`). Prompts logged alongside in
  `prompts.md` (keep CP-fingerprint terms out of prompts too; the gate scans the repo).
- `frostbyte/art-pipeline/process-masters.mjs` (new, zero-dep — Node's built-in zlib does PNG;
  adapt the existing pinball downscale script's approach): crop to 3:2 → box/Lanczos downscale
  to EXACT current dims (rooms 480×320, map 480×320, portraits ~128×128) → palette-snap toward
  the six tokens → write into `frostbyte/assets/` under the EXISTING filenames → print
  `name WxH` lines exactly like `gen-assets.js` does (same verification contract).
- `gen-assets.js` hands ownership of re-mastered files to the pipeline: remove them from its
  `made` list so a routine regen can never clobber painted art. Sprites, cosmetics, furniture,
  den signs, glints STAY in gen-assets.js — their 4×3 grids, runtime tinting and tiny sizes are
  gameplay contracts and code-drawn wins there.
- `ASSET-CREDITS.md`: one row — "Frostbyte painted backdrops/portraits: AI-generated masters
  commissioned by Dominik Machowiak (Google Nano Banana 2 via fal.ai), processed by
  art-pipeline/process-masters.mjs". Legal gate must stay green.

## Shot list
**Phase A — re-master the existing world (biggest instant win, zero gameplay code, can ship
before/alongside W0):** plaza · den interior · trail · Glasswind Court (once Codex commits —
match its door/prop layout!) · Snowdrift Toss backdrop · `map-isle.png` as a painted chart.
Acceptance: same filenames+dims, doors/walkable center readable, vitest untouched-green, quick
in-browser eyeball vs door hotspots.
**Phase B — per world-plan phase:** W2 workshop interior · W3 docks · W4 lighthouse ×2 +
telescope vista vignettes (3–4 small paintings) · W5 hollow + Moonwell · W6 caverns ×1–2 ·
5 character portraits (Edda, Pat, Salka, Maren, Vesper — the Echo deliberately has none).

## Risks & mitigations
- **Style drift across rooms** → reference-edit protocol + single-session batches + palette-snap.
- **Art vs door geometry mismatch** → doors are data, not pixels: prompt the layout, verify in
  browser, nudge with `/edit` ("move the doorway to the left edge") rather than regenerating.
- **Baked-in text** → "blank signs, no text/letters/numbers" held in every prompt (worked in the
  validated test); reject candidates with text — cheap to reroll.
- **Small-size mush** → judge candidates at 480px zoom before accepting, not at 2K.
- **Cost** → nano-banana-2 is a few cents per image; full Phase A (~6 rooms × 3 candidates +
  portraits) is single-digit dollars. schnell ideation is ~free. No video/music models needed.
- **OneDrive sync** → keep masters ≤2MB each; the repo already lives happily under OneDrive.
