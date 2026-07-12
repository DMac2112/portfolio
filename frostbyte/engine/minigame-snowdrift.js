// engine/minigame-snowdrift.js — "Snowdrift Toss" minigame: pure, deterministic, headless,
// seeded state machine (45s timing/aim game). No DOM, no game engine, no wall clock, no
// Math.random — reuses the shared LCG (engine/rng.js) and threads its seed explicitly,
// mirroring engine/economy.js's "mutate `state` in place, push events into a caller-owned
// `ev` array" convention.

import { nextInt, nextFloat } from './rng.js';

export const DURATION_MS = 45000;
export const TOSS_COOLDOWN_MS = 260;
export const COUNTDOWN_MS = 3000;
export const TARGET_R = 28; // target radius (world px)
export const HIT_R = 46;    // aim-to-target hit tolerance (world px)

// Spawn cadence / speed ramp, playing-phase progress 0..1 over DURATION_MS.
const SPAWN_INTERVAL_START_MS = 1100;
const SPAWN_INTERVAL_END_MS = 450;
const TARGET_SPEED_START = 60;
const TARGET_SPEED_END = 150;
const MAX_SPAWNS_PER_TICK = 8;

// Small cross-drift applied to spawned targets, roughly [-30, 30] px/s.
const DRIFT_MIN = -30;
const DRIFT_MAX = 30;

const DAILY_CAP_DEFAULT = 60;

/**
 * @typedef {Object} Target
 * @property {number} id
 * @property {number} x @property {number} y
 * @property {number} vx @property {number} vy   // world px/second
 * @property {number} r
 * @property {boolean} alive
 *
 * @typedef {Object} MgState
 * @property {'countdown'|'playing'|'over'} phase
 * @property {number} tMs          // remaining ms in the CURRENT phase (countdown or playing)
 * @property {number} score
 * @property {number} combo        // consecutive hit count
 * @property {number} comboMult
 * @property {Target[]} targets
 * @property {number} nextSpawnMs  // ms until next spawn
 * @property {number} tossCdMs     // toss cooldown remaining
 * @property {number} rng          // 32-bit seed stream
 * @property {{x0:number,x1:number,y0:number,y1:number}} bounds
 * @property {number} nextId
 */

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** @returns {MgState} */
export function newGame(seed, bounds) {
  return {
    phase: 'countdown',
    tMs: COUNTDOWN_MS,
    score: 0,
    combo: 0,
    comboMult: 1,
    targets: [],
    nextSpawnMs: 0,
    tossCdMs: 0,
    rng: seed >>> 0,
    bounds,
    nextId: 0,
  };
}

// Spawns one target at a bounds edge, threading rng through every seeded pick.
// Mutates state.targets / state.nextId / state.rng in place; pushes a 'spawn' event.
function spawnTarget(state, targetSpeed, ev) {
  const edgeRes = nextInt(state.rng, 2);
  state.rng = edgeRes.seed;
  const isLeft = edgeRes.value === 0;

  const yRes = nextFloat(state.rng);
  state.rng = yRes.seed;
  const yLo = state.bounds.y0 + TARGET_R;
  const yHi = state.bounds.y1 - TARGET_R;
  const y = yLo + yRes.value * (yHi - yLo);

  const driftRes = nextFloat(state.rng);
  state.rng = driftRes.seed;
  const vy = DRIFT_MIN + driftRes.value * (DRIFT_MAX - DRIFT_MIN);

  const x = isLeft ? state.bounds.x0 : state.bounds.x1;
  const vx = isLeft ? targetSpeed : -targetSpeed;

  const id = state.nextId++;
  state.targets.push({ id, x, y, vx, vy, r: TARGET_R, alive: true });
  ev.push({ type: 'spawn', id, x, y });
}

/**
 * Mutates `state` in place and returns it. Pushes events into `ev`.
 * @param {MgState} state
 * @param {number} dtMs
 * @param {{aimX:number,aimY:number,toss:boolean}} input
 * @param {Array<Object>} ev
 * @returns {MgState}
 */
export function tick(state, dtMs, input, ev) {
  if (state.phase === 'over') return state;

  if (state.phase === 'countdown') {
    state.tMs -= dtMs;
    if (state.tMs <= 0) {
      state.phase = 'playing';
      state.tMs = DURATION_MS; // do not carry the overshoot
      state.nextSpawnMs = 0;
    }
    return state;
  }

  // phase === 'playing'
  const t = clamp((DURATION_MS - state.tMs) / DURATION_MS, 0, 1);
  const spawnInterval = lerp(SPAWN_INTERVAL_START_MS, SPAWN_INTERVAL_END_MS, t);
  const targetSpeed = lerp(TARGET_SPEED_START, TARGET_SPEED_END, t);

  state.tMs -= dtMs;
  if (state.tMs <= 0) {
    state.tMs = 0;
    state.phase = 'over';
    ev.push({ type: 'end', score: state.score });
    return state;
  }

  // 3. Spawns (bounded so a huge dtMs can't loop forever).
  state.nextSpawnMs -= dtMs;
  let spawnedThisTick = 0;
  while (state.nextSpawnMs <= 0 && spawnedThisTick < MAX_SPAWNS_PER_TICK) {
    spawnTarget(state, targetSpeed, ev);
    state.nextSpawnMs += spawnInterval;
    spawnedThisTick++;
  }

  // 4. Integrate every alive target; flag escapes at/after they cross bounds.
  for (const target of state.targets) {
    if (!target.alive) continue;
    target.x += (target.vx * dtMs) / 1000;
    target.y += (target.vy * dtMs) / 1000;
    const { x0, x1, y0, y1 } = state.bounds;
    if (target.x < x0 || target.x > x1 || target.y < y0 || target.y > y1) {
      target.alive = false;
      state.combo = 0;
      state.comboMult = 1;
      ev.push({ type: 'escape', id: target.id });
    }
  }

  // 5. Toss.
  state.tossCdMs -= dtMs;
  if (input.toss && state.tossCdMs <= 0) {
    state.tossCdMs = TOSS_COOLDOWN_MS;

    let nearest = null;
    let nearestDist = Infinity;
    for (const target of state.targets) {
      if (!target.alive) continue;
      const d = Math.hypot(target.x - input.aimX, target.y - input.aimY);
      if (d < HIT_R && d < nearestDist) {
        nearestDist = d;
        nearest = target;
      }
    }

    if (nearest) {
      const prevMult = state.comboMult;
      nearest.alive = false;
      state.combo += 1;
      state.comboMult = 1 + Math.min(state.combo, 9) * 0.5;
      state.score += Math.round(10 * state.comboMult);
      ev.push({
        type: 'hit',
        id: nearest.id,
        score: state.score,
        combo: state.combo,
        comboMult: state.comboMult,
      });
      if (state.comboMult > prevMult) {
        ev.push({ type: 'combo', comboMult: state.comboMult });
      }
    } else {
      state.combo = 0;
      state.comboMult = 1;
      ev.push({ type: 'miss' });
    }
  }

  return state;
}

export function coinsFor(score, dailyAlready, DAILY_CAP = DAILY_CAP_DEFAULT) {
  return Math.max(0, Math.min(Math.floor(score / 40), DAILY_CAP - dailyAlready));
}
