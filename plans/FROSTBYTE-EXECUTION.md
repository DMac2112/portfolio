# FROSTBYTE-EXECUTION — cost- & limit-aware build playbook

> Companion to FROSTBYTE-PLAN.md. That doc says *what* to build; this one says *how to get it built
> cheaply, with the fewest bugs, without a Pro-plan 5-hour usage window ending mid-work.*
> Authored 2026-07-11, solo (no agents) — deliberately, to model the point below.

---

## §0 The two hard lessons already paid for

1. **A big parallel Opus swarm is the expensive failure mode.** The plan-authoring run fanned out 11
   agents and burned **432k output tokens in one burst**, which hit the account limit and killed 5 of
   11 agents mid-flight. Fan-out multiplies cost *and* multiplies the blast radius when a limit hits.
2. **The cheapest recovery was solo + cached work.** Salvaging the finished sections and writing the
   rest in the main loop cost a fraction of a re-run. **Sequential, cheap-model, test-gated work beats
   big fan-out for implementation.**

The whole strategy below follows from these: **default to a solo driver on a mid-tier model, gate every
step with headless tests, commit at every green checkpoint, and use agents only in small, cheap, bounded
bursts.**

---

## §1 Why this build is naturally cheap & low-bug

Frostbyte is architected so that **bugs are caught by fast headless tests, not by expensive agent
review loops.** Lean into it:

- **Pure-engine-first.** Every rule (movement, NPC FSM, economy, minigame, chat queue, save) is a
  headless, deterministic, seeded module with a `vitest` suite. Bugs surface in **milliseconds, locally,
  for free** — not in a browser or an agent pass. This is the single biggest cost *and* bug lever.
- **Verbatim reuse of proven code.** `vendor/kaplay.mjs`, `os-bridge.js`, and the `gen-assets.js` PNG
  pipeline are **copied from game1**, which already ships. Copied code contributes **zero new bugs** and
  **zero design tokens** — don't re-derive it, don't "improve" it.
- **Determinism = reproducible = cheap to fix.** Seeded LCG + injected-time `tick(state, dt)` means any
  bug reproduces exactly from a seed + input log. No flaky, expensive-to-chase heisenbugs.
- **Tiny surface per phase.** Each P-phase adds one tested slice; a break is localized to that slice.

---

## §2 Model tiers — who does what

Match the model to the *reasoning difficulty*, not the task's importance. Most of this build is
mechanical because the plan already specified it.

| Tier | Model | Use it for | On this build |
|---|---|---|---|
| **Cheap** | **Haiku 4.5** | boilerplate, file scaffolding, copying patterns, writing test cases from a spec, PNG-generator tweaks | ~50% of the work — module + test drafting where the spec is explicit |
| **Mid (default driver)** | **Sonnet** | module logic, wiring, integration reasoning, debugging, browser-verify loops | the main sequential loop for P2–P5 |
| **Top (sparingly)** | **Opus 4.8** | "does the game *feel* right" judgment on the spike; the final adversarial IP/correctness review where subtle bugs hide | P1 spike sign-off + P6 review only |

**Set the session model to Sonnet for implementation phases.** The main-loop model is where most tokens
go — running the driver on Sonnet instead of Opus is the biggest standing cost cut. Switch to Opus only
for the two moments that genuinely need taste/rigor (P1 feel, P6 review), then switch back.

---

## §3 Solo vs agents — the decision rule

**Default: solo (main loop).** Sequential implementation of well-specified modules is cheapest solo —
no per-agent cold-start re-derivation, no fan-out multiplier, one context that already knows the plan.

**Use agents ONLY for these two shapes, both small and cheap:**

1. **Parallel independent-module drafting (optional speed-up, Haiku).** When a phase has 2–4 *independent*
   pure modules (e.g. P2's `save.js` + `avatar-layers.js`, or P4's `minigame-snowdrift.js` + `economy.js`),
   a **≤4-agent Haiku** fan-out can draft them in parallel. Each returns a module + its test; I review and
   wire. Keep it ≤4 and on Haiku — never an Opus swarm.
2. **Final review panel (P6 only, ≤4 lenses, Sonnet).** One small fan-out at the end: IP/originality,
   §8.4 pause/timer correctness, save-migration + a11y, and the no-chat-network invariant. Sonnet, not
   Opus; bounded; one pass.

**Never again:** a large (>4) parallel fan-out, an Opus swarm, or any workflow that could burn six figures
of tokens in one burst. If a workflow is worth it, keep it ≤4 agents on the cheapest model that works, and
make it **resumable** (the cache/`resumeFromRunId` path) so a limit-hit costs nothing to continue.

---

## §4 Pacing for the Pro 5-hour window

The Pro plan meters usage on a **rolling ~5-hour window**. The goal: never let a window end *inside* an
unfinished, uncommitted slice. Two rules make that automatic:

- **Phase boundaries are safe stop points.** Every P-phase ends at "tests green + a working slice." That's
  a clean place to stop, commit, and let the window breathe.
- **Commit at every green checkpoint (git).** The `portfolio` repo exists — but Frostbyte lives in
  `dominikos/` (not yet a repo). **First action: `git init` `dominikos/` (or a `frostbyte/` repo) so every
  phase can commit.** A limit-hit then never loses work; you resume at the last commit.

### Recommended session map (each session = a fraction of one window, ends on a commit)

| Session | Phases | Model | Rough weight | Ends when |
|---|---|---|---|---|
| **S1** | P0 foundation/legal + P1 waddle spike | Sonnet (Opus for the final "feels right?" look) | light–medium | penguin waddles in the plaza, browser-verified, committed |
| **S2** | P2 avatar + save + economy shell | Sonnet driver; optional ≤3 Haiku module draft | medium | you can dress the penguin & it persists; tests green; commit |
| **S3** | P3 NPC crowd | Sonnet; Haiku for roster/line data | medium | the plaza feels alive, dt-paused correctly; commit |
| **S4** | P4 minigame + economy loop | Sonnet; Haiku for the pure rules draft | medium | Snowdrift Toss earns coins you spend at the shop; commit |
| **S5** | P5 chat + emotes | Sonnet (mostly Haiku-draftable) | light–medium | local bubbles + emotes + a11y; no-network verified; commit |
| **S6** | P6 integrate + review + ship | Sonnet driver; Opus sign-off; ≤4 Sonnet review panel | medium–heavy | in the OS Games folder, pauses correctly, CI+gate green, deployed |

**One phase per sitting is the safe default; two light ones (e.g. P0+P1, or P5 alone) fit comfortably.**
Don't chain S1→S6 in one window — that's the 432k mistake in slow motion. Spread sessions across windows;
each is independently valuable and independently committed.

### If you see a usage warning mid-session
Stop at the **nearest green `vitest` run**, `git commit`, and note the next step. Never stop with a broken
build or an uncommitted half-module — that's what turns a limit into lost work.

---

## §5 Bug-minimization checklist (per phase)

- [ ] **Pure module + `vitest` first**, before any KAPLAY/DOM wiring. Red→green locally.
- [ ] **Determinism test** (same seed+inputs → identical state) on every stateful module.
- [ ] **Copy game1's proven files verbatim** (kaplay, os-bridge, PNG encoder) — don't re-derive.
- [ ] **One bounded CI at a time** (`typecheck → vitest → build → gate`). **Never** `run_in_background` a
      heavy run; kill strays (the "no runaway processes" memory rule).
- [ ] **Browser-verify each visual slice** via the preview flow (spin up, screenshot/read, stop it) —
      don't guess at feel; but stop the preview server after (no lingering processes).
- [ ] **Legal gate green** after any asset/text lands (and confirm `/frostbyte/` is actually in `SCAN_ROOTS`
      — the single easiest P0 miss).
- [ ] **Commit** the green slice before moving on.
- [ ] **§8.4 pause check** whenever a timer is added: is it on KAPLAY's clock (`dt`/`wait`/`loop`), never
      `setInterval`? Background the tab and confirm it truly freezes.

---

## §6 The concrete first move (when you say go)

Smallest valuable, fully-committed increment — **S1**, on Sonnet:

1. `git init` in `dominikos/` (so every phase commits; nothing outside it is touched).
2. Scaffold `frostbyte/`: copy `vendor/kaplay.mjs` + `os-bridge.js` from game1; `index.html` skeleton;
   `package.json` + `vitest.config.js`; `engine/rng.js` + `rng.test.js` (green).
3. Extend `os/scripts/legal-gate.mjs` (add `/frostbyte/` scan root + CP fingerprints) + ASSET-CREDITS row
   **before any art lands**.
4. `gen-assets.js` → `penguin.png` (4×3 sheet) + `room-plaza.png`; `engine/movement.js` + `camera.js`
   (+ tests, green); `world/build-room.js` renders Chillmere Plaza; click-to-move + camera follow.
5. Browser-verify the waddle; **(optional Opus glance: "does it feel right?")**; `git commit`. Stop.

That's one safe, cheap, committed slice — the whole build is just five more of these, spaced across
windows, each on the cheapest model that does the job.

---

## §7 TL;DR

- **Driver on Sonnet**, Opus only for P1 feel + P6 review, Haiku for parallel module/test drafts.
- **Solo by default**; agents only in **≤4-agent, cheap, resumable** bursts (optional per-phase drafts +
  the P6 review panel). **No Opus swarms, ever.**
- **Pure-first + vitest + determinism** makes bugs cheap; **verbatim game1 reuse** makes whole files
  bug-free.
- **`git init` `dominikos/` now**; **commit at every green phase**; **one phase per sitting**; spread the
  six sessions across usage windows so a 5-hour limit never lands inside unfinished work.
