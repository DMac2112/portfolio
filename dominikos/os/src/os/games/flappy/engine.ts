// Sky Hopper — original one-button flapping-flight engine for DominikOS (game #5).
// PURE TypeScript: NO DOM, NO React. Plain-data state + functions, unit-tested headlessly
// (engine.test.ts). Classic one-button "flap through the gaps" genre; every constant, the
// palette hooks and the medal ladder are authored here — nothing sampled or copied.
//
// ============================ CONTRACT (LOCKED) ============================
// The public API below is the contract the UI (FlappyApp.tsx) builds against. Implementations
// may add private helpers but MUST NOT change these signatures or semantics.
//
// World: the bird holds a fixed x (BIRD_X); the world scrolls LEFT at SCROLL_SPEED. GRAVITY
//   integrates bird.vy each step; flap() SETS vy = FLAP_IMPULSE (an instantaneous impulse, NOT
//   additive). vy is clamped to [FLAP_IMPULSE, MAX_FALL]. Pipes are pairs {x, gapY}: a top pipe
//   [0 .. gapY-PIPE_GAP/2] and a bottom pipe [gapY+PIPE_GAP/2 .. GROUND_Y]. They advance left; a
//   pair scores +1 once its right edge passes BIRD_X (`passed` latch). Ground is at y=GROUND_Y.
// Flow: 'ready' (bird bobs; the FIRST flap() -> 'play' + applies impulse) -> 'play' (integrate,
//   spawn/despawn pipes distance-based, score, collide) -> 'dead' (bird keeps falling to the
//   ground under gravity, then rests). Collision with a pipe rect OR the ground -> 'dead'; the
//   ceiling CLAMPS (y & vy pinned at the top), never fatal — classic behavior.
// Events: flap()/step() append a GameEvent to a caller-owned array (out-param model, exactly
//   like pinball physics.ts / bubble engine.ts) so the UI plays tone() sfx + spawns fx. Silent.
// RNG: one 32-bit LCG on the state (Numerical-Recipes constants, upper-16-bit extraction, exactly
//   like pasjans/bubble) drives every pipe gapY — the ONLY stochastic input. A given seed replays
//   byte-identically; unseeded (seed===undefined) uses Math.random.
// Determinism: pipe cadence is DISTANCE-based (spawn when world scroll passes the next spawn
//   distance), never wall-clock, so fixed seed + fixed dt sequence is byte-identical.
// ==========================================================================

// -------------------------------- constants -------------------------------

export const FIELD_W = 400;
export const FIELD_H = 700;
export const GROUND_H = 96;
export const GROUND_Y = FIELD_H - GROUND_H;   // 604 — ground surface / death plane / bottom-pipe base
export const CEIL_Y = 0;

export const BIRD_X = 96;                      // fixed bird center x (0.24*W)
export const BIRD_R = 16;                      // drawn body radius
export const BIRD_COLLIDE_INSET = 4;           // hitbox = 12px half-extent AABB (~75% of drawn)
const HALF = BIRD_R - BIRD_COLLIDE_INSET;      // 12 — collision half-extent

export const GRAVITY = 1400;                   // px/s^2 down
export const FLAP_IMPULSE = -430;              // px/s, SET on flap (impulse); also the vy floor
export const MAX_FALL = 700;                   // px/s terminal fall clamp

export const SCROLL_SPEED = 140;               // px/s world scroll left
export const PIPE_W = 62;                       // pipe body width (collision = body width)
export const PIPE_GAP = 155;                    // vertical opening
export const PIPE_PITCH = 220;                  // px between successive pair LEFT edges
export const PIPE_LEAD = 300;                   // px scrolled before pipe #1 (open-sky beat)
export const SPAWN_X = FIELD_W + PIPE_W;         // 462 — birth x (off right edge)
export const DESPAWN_X = -PIPE_W;                // -62 — cull once fully past left edge
export const GAP_MARGIN_TOP = 70;               // gap center min from ceiling
export const GAP_MARGIN_BOT = 70;               // gap center min from ground

export const ROT_UP = -0.44;                    // rad (~-25deg) nose-up cap (just flapped)
export const ROT_DOWN = 1.40;                   // rad (~+80deg) nose-dive cap (terminal fall)
export const ANGLE_LERP = 10;                   // per-second easing toward target tilt
export const READY_BOB_AMP = 8;                 // px ready-state bob amplitude
export const READY_BOB_HZ = 1.2;                // Hz ready-state bob frequency
export const MAX_DT = 0.05;                     // s engine-side dt clamp (mirrors useGameLoop)
export const DEAD_REVEAL_S = 0.6;               // UI: seconds before scorecard shows

export const MEDALS: readonly string[] = ['Bronze', 'Silver', 'Gold', 'Platinum'];
export const MEDAL_AT: readonly number[] = [10, 20, 30, 40];

// --------------------------------- types ----------------------------------

export type Phase = 'ready' | 'play' | 'dead';

export interface Bird { y: number; vy: number; angle: number; }
export interface Pipe { x: number; gapY: number; passed: boolean; }

export interface FlappyState {
  phase: Phase;
  bird: Bird;
  pipes: Pipe[];         // ordered left->right (newest last)
  score: number;
  best: number;
  distance: number;      // total world px scrolled (spawn cadence + ground parallax)
  spawnDistance: number; // world distance at which the NEXT pipe spawns
  time: number;          // total sim seconds (ready bob clock, telemetry)
  deadT: number;         // seconds since death (UI scorecard reveal delay)
  landed: boolean;       // corpse-hit-ground one-shot latch
  seed: number;
  rng: number;
  seeded: boolean;
}

export type GameEvent =
  | { type: 'start'; x: number; y: number }
  | { type: 'flap'; x: number; y: number }
  | { type: 'score'; value: number; x: number; y: number }
  | { type: 'hit'; x: number; y: number }
  | { type: 'die'; value: number; x: number; y: number }
  | { type: 'land'; x: number; y: number };

// -------------------------------- private ---------------------------------

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function randInt(s: FlappyState, bound: number): number {
  if (bound <= 0) return 0;
  if (!s.seeded) return Math.floor(Math.random() * bound);
  s.rng = (s.rng * 1664525 + 1013904223) >>> 0;
  return (s.rng >>> 16) % bound;
}

/** Ease the render/feel tilt toward the vy-driven target. Deterministic; hitbox never rotates. */
function updateAngle(bird: Bird, dt: number): void {
  const target = bird.vy < 0 ? ROT_UP : ROT_UP + (ROT_DOWN - ROT_UP) * clamp(bird.vy / MAX_FALL, 0, 1);
  bird.angle += (target - bird.angle) * Math.min(1, ANGLE_LERP * dt);
}

function aabbOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// ------------------------------ public API --------------------------------

/** Fresh 'ready' state. seed -> deterministic gapY stream; unseeded -> Math.random. */
export function newGame(seed?: number, best?: number): FlappyState {
  return {
    phase: 'ready',
    bird: { y: GROUND_Y * 0.45, vy: 0, angle: 0 },
    pipes: [],
    score: 0,
    best: best ?? 0,
    distance: 0,
    spawnDistance: PIPE_LEAD,
    time: 0,
    deadT: 0,
    landed: false,
    seed: seed ?? 0,
    rng: (seed ?? 0) >>> 0,
    seeded: seed !== undefined,
  };
}

/** In-place re-arm to 'ready'; preserves best; reuses prior seed unless a new one is given. */
export function restart(state: FlappyState, seed?: number): void {
  const useSeed = seed !== undefined ? seed : state.seeded ? state.seed : undefined;
  Object.assign(state, newGame(useSeed, state.best));
}

/** Apply a flap impulse. 'ready' arms the run; 'dead' is a no-op (UI owns restart timing). */
export function flap(state: FlappyState, events: GameEvent[]): boolean {
  if (state.phase === 'dead') return false;
  if (state.phase === 'ready') {
    state.phase = 'play';
    events.push({ type: 'start', x: BIRD_X, y: state.bird.y });
  }
  state.bird.vy = FLAP_IMPULSE;   // SET (impulse), never += — idempotent per call
  state.bird.angle = ROT_UP;
  events.push({ type: 'flap', x: BIRD_X, y: state.bird.y });
  return true;
}

/** Advance the sim by dt (clamped to MAX_DT). Behavior depends on phase (see contract). */
export function step(state: FlappyState, dt: number, events: GameEvent[]): void {
  dt = Math.min(dt, MAX_DT);
  state.time += dt;
  const bird = state.bird;

  if (state.phase === 'ready') {
    bird.y = GROUND_Y * 0.45 + Math.sin(state.time * 2 * Math.PI * READY_BOB_HZ) * READY_BOB_AMP;
    bird.vy = 0;
    return;
  }

  if (state.phase === 'dead') {
    state.deadT += dt;
    bird.vy = Math.min(bird.vy + GRAVITY * dt, MAX_FALL);
    bird.y += bird.vy * dt;
    updateAngle(bird, dt);
    if (bird.y + HALF >= GROUND_Y) {
      bird.y = GROUND_Y - HALF;
      bird.vy = 0;
      if (!state.landed) { state.landed = true; events.push({ type: 'land', x: BIRD_X, y: bird.y }); }
    }
    return;
  }

  // ---------- phase === 'play' ----------
  // 1. integrate (semi-implicit Euler: velocity first, then position)
  bird.vy = clamp(bird.vy + GRAVITY * dt, FLAP_IMPULSE, MAX_FALL);
  bird.y += bird.vy * dt;
  // 2. ceiling CLAMP (never fatal)
  if (bird.y - HALF < CEIL_Y) {
    bird.y = CEIL_Y + HALF;
    if (bird.vy < 0) bird.vy = 0;
  }
  updateAngle(bird, dt);
  // 3. scroll the world
  const d = SCROLL_SPEED * dt;
  state.distance += d;
  for (const p of state.pipes) p.x -= d;
  // 4. spawn — DISTANCE-based (deterministic); dt clamp guarantees <=1 spawn/step
  const gb = gapBounds();
  const band = gb.max - gb.min;
  while (state.distance >= state.spawnDistance) {
    state.pipes.push({ x: SPAWN_X, gapY: gb.min + randInt(state, band + 1), passed: false });
    state.spawnDistance += PIPE_PITCH;
  }
  // 5. despawn once fully past the left edge
  state.pipes = state.pipes.filter((p) => p.x > DESPAWN_X);
  // 6. score — right edge crossed BIRD_X (latch prevents double count)
  for (const p of state.pipes) {
    if (!p.passed && p.x + PIPE_W < BIRD_X) {
      p.passed = true;
      state.score += 1;
      state.best = Math.max(state.best, state.score);
      events.push({ type: 'score', value: state.score, x: BIRD_X, y: bird.y });
    }
  }
  // 7. collision — ground OR any pipe rect
  if (collides(state)) {
    events.push({ type: 'hit', x: BIRD_X, y: bird.y });
    state.phase = 'dead';
    state.deadT = 0;
    state.landed = false;
    if (bird.vy < 0) bird.vy = 0; // no upward bounce; tumble from here
    events.push({ type: 'die', value: state.score, x: BIRD_X, y: bird.y });
  }
}

// ---- pure helpers (exported for tests + renderer) ----

export function birdRect(state: FlappyState): { x: number; y: number; w: number; h: number } {
  return { x: BIRD_X - HALF, y: state.bird.y - HALF, w: 2 * HALF, h: 2 * HALF };
}

export function pipeRects(pipe: Pipe): {
  top: { x: number; y: number; w: number; h: number };
  bottom: { x: number; y: number; w: number; h: number };
} {
  const gapTop = pipe.gapY - PIPE_GAP / 2;
  const gapBot = pipe.gapY + PIPE_GAP / 2;
  return {
    top: { x: pipe.x, y: 0, w: PIPE_W, h: gapTop },
    bottom: { x: pipe.x, y: gapBot, w: PIPE_W, h: GROUND_Y - gapBot },
  };
}

/** True iff the bird box overlaps any pipe rect (x-culled) OR the ground. Ceiling excluded. */
export function collides(state: FlappyState): boolean {
  const b = birdRect(state);
  if (b.y + b.h >= GROUND_Y) return true;
  for (const p of state.pipes) {
    if (p.x > b.x + b.w || p.x + PIPE_W < b.x) continue; // x-cull
    const { top, bottom } = pipeRects(p);
    if (aabbOverlap(b, top) || aabbOverlap(b, bottom)) return true;
  }
  return false;
}

export function gapBounds(): { min: number; max: number } {
  return { min: GAP_MARGIN_TOP + PIPE_GAP / 2, max: GROUND_Y - GAP_MARGIN_BOT - PIPE_GAP / 2 };
}

/** -1 none, 0 Bronze, 1 Silver, 2 Gold, 3 Platinum. */
export function medalFor(score: number): number {
  let m = -1;
  for (let i = 0; i < MEDAL_AT.length; i++) if (score >= MEDAL_AT[i]) m = i;
  return m;
}
