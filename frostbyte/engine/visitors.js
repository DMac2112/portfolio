// engine/visitors.js — PURE, seeded "Open House" visitor scheduler (FROSTBYTE-HOME-PLAN §7).
//
// The classic's social payoff — "someone visited the home you decorated" — recreated solo with the
// Dialtone "it only pretends" pattern. While the igloo's door sign is Open AND the player is inside
// (no busy overlay), this scheduler rolls roughly one visit per 45–90s: a roster NPC waddles in,
// admires the place, tips, and leaves. Never more than one visitor at a time (one `visit` slot).
//
// Conventions this file follows EXACTLY (do not diverge):
//  1. Seeded RNG stream from ./rng.js — every nextInt returns {value, seed}; thread state via
//     `res.seed → rng`. NEVER Math.random.
//  2. dt-accumulated timing — no wall clock. Stage progress accrues from injected `dtMs`.
//  3. mutate-in-place + `ev` out-param event convention (engine/economy.js) — `tick` mutates
//     `state` and pushes {type,...} events into the caller-owned `ev` array, then returns `state`.
//
// The engine is CONTENT-AGNOSTIC and ECONOMY-AGNOSTIC: it emits synthetic ids ('visitor-N', like
// npc-fsm's 'line-N'/'emote-N') and always emits a `visit-tip` event — the CALLER decides whether
// the tip actually pays (economy.greetNpc already daily-gates + caps per persona).

import { nextInt } from './rng.js';

// Cooldown between visits is rolled uniformly in [min, max] inclusive.
export const VISIT_COOLDOWN_MS = [45000, 90000];

// Fixed per-stage durations for one visit (entering → admiring → leaving).
export const STAGE_MS = { entering: 2500, admiring: 6000, leaving: 2500 };

// Size of the synthetic admiration-line pool: rolled index maps to 'visitor-0'..'visitor-5'.
export const VISITOR_LINE_COUNT = 6;

/**
 * @typedef {'idle'|'visiting'} VisitorPhase
 * @typedef {'entering'|'admiring'|'leaving'} VisitStage
 *
 * @typedef {Object} ActiveVisit
 * @property {string} personaId   Roster persona chosen for this visit.
 * @property {VisitStage} stage   Current stage of the single active visitor.
 * @property {number} stageMs     Elapsed ms accumulated in the CURRENT stage (dt-accumulated).
 * @property {string} lineId      Synthetic admiration line rolled at start ('visitor-N').
 *
 * @typedef {Object} VisitorScheduler
 * @property {number} rng          Seeded RNG stream state (32-bit LCG seed).
 * @property {VisitorPhase} phase  'idle' between visits, 'visiting' while a visitor is present.
 * @property {number} cooldownMs   Ms remaining before the next visit chance (counts down).
 * @property {ActiveVisit|null} visit  The single active visitor, or null while idle.
 *
 * @typedef {Object} VisitorCtx
 * @property {boolean} eligible    Caller-computed: door open ∧ player in den ∧ no busy overlay.
 * @property {string[]} personaIds Roster persona ids to sample a visitor from.
 * @property {number} placedCount  Furniture count — passed for the caller's line templating;
 *                                  the engine deliberately does NOT gate on it (empty igloos still
 *                                  get visits, §7 "love what you haven't done with the place").
 *
 * @typedef {{type:'visit-start',personaId:string}
 *         | {type:'visit-line',personaId:string,lineId:string}
 *         | {type:'visit-tip',personaId:string}
 *         | {type:'visit-leaving',personaId:string}
 *         | {type:'visit-cut',personaId:string}
 *         | {type:'visit-end',personaId:string}} VisitorEvent
 */

// Roll a fresh cooldown uniformly in [VISIT_COOLDOWN_MS[0], VISIT_COOLDOWN_MS[1]] inclusive.
// Returns { cooldownMs, rng } so callers thread the advanced seed.
function rollCooldown(rng) {
  const [min, max] = VISIT_COOLDOWN_MS;
  const span = max - min + 1; // inclusive upper bound
  const res = nextInt(rng, span);
  return { cooldownMs: min + res.value, rng: res.seed };
}

/**
 * Build a fresh scheduler for a given seed. Rolls the first cooldown immediately (advancing rng).
 * @param {number} seed
 * @returns {VisitorScheduler}
 */
export function newVisitorScheduler(seed) {
  const roll = rollCooldown(seed);
  return {
    rng: roll.rng,
    phase: 'idle',
    cooldownMs: roll.cooldownMs,
    visit: null,
  };
}

// Begin a visit: sample persona + synthetic line (two rng draws), enter stage 'entering'. Mutates.
function startVisit(state, ctx, ev) {
  const personaRes = nextInt(state.rng, ctx.personaIds.length);
  state.rng = personaRes.seed;
  const personaId = ctx.personaIds[personaRes.value];

  const lineRes = nextInt(state.rng, VISITOR_LINE_COUNT);
  state.rng = lineRes.seed;
  const lineId = 'visitor-' + lineRes.value;

  state.phase = 'visiting';
  state.visit = { personaId, stage: 'entering', stageMs: 0, lineId };
  ev.push({ type: 'visit-start', personaId });
}

// Advance out of a just-completed stage. `leftover` = ms overshoot past the stage budget.
//
// Single-boundary discipline (mirrors the intent of npc-fsm's clamped carry): a stage completion
// is processed AT MOST ONCE per tick. The leftover is clamped into the next stage's budget so the
// accumulator can never itself trigger a second completion inside the same tick; any excess beyond
// one stage (only possible for a pathological single dt > ~8.5s spanning two boundaries) is dropped.
// Mutates `state`.
function advanceStage(state, ev, leftover) {
  const v = state.visit;
  if (v.stage === 'entering') {
    v.stage = 'admiring';
    v.stageMs = Math.min(leftover, STAGE_MS.admiring);
    // Caller decides whether the tip actually pays (economy.greetNpc daily-gates/caps).
    ev.push({ type: 'visit-line', personaId: v.personaId, lineId: v.lineId });
    ev.push({ type: 'visit-tip', personaId: v.personaId });
  } else if (v.stage === 'admiring') {
    v.stage = 'leaving';
    v.stageMs = Math.min(leftover, STAGE_MS.leaving);
    ev.push({ type: 'visit-leaving', personaId: v.personaId });
  } else {
    // 'leaving' complete → visit over. Return to idle and re-roll the next cooldown.
    const personaId = v.personaId;
    state.phase = 'idle';
    state.visit = null;
    const roll = rollCooldown(state.rng);
    state.cooldownMs = roll.cooldownMs;
    state.rng = roll.rng;
    ev.push({ type: 'visit-end', personaId });
  }
}

/**
 * Advance the scheduler by `dtMs`. Mutates `state`, pushes VisitorEvents into `ev`, returns `state`.
 *
 * @param {VisitorScheduler} state
 * @param {number} dtMs   Elapsed ms this frame (already OS-pause-gated by the caller).
 * @param {VisitorCtx} ctx
 * @param {VisitorEvent[]} ev  Caller-owned event sink.
 * @returns {VisitorScheduler}
 */
export function tick(state, dtMs, ctx, ev = []) {
  // No-op guard (matches project convention): non-positive dt never advances state.
  if (dtMs <= 0) return state;

  if (state.phase === 'idle') {
    // Cooldown accrues ONLY while eligible — ineligible time (door shut / player away / overlay up)
    // does not count down, so a visit can only ever begin while the player is present with the sign
    // open.
    if (!ctx.eligible) return state;

    state.cooldownMs -= dtMs;
    if (state.cooldownMs <= 0) {
      if (ctx.personaIds && ctx.personaIds.length > 0) {
        // Cooldown crossing starts a fresh visit; leftover (negative cooldown) is discarded so the
        // 'entering' stage begins at 0 — a deliberate single-boundary simplification.
        startVisit(state, ctx, ev);
      } else {
        // Degenerate ctx (no personas to sample): stay idle and re-roll the cooldown.
        const roll = rollCooldown(state.rng);
        state.cooldownMs = roll.cooldownMs;
        state.rng = roll.rng;
      }
    }
    return state;
  }

  // phase === 'visiting' — exactly one active visit.
  const v = state.visit;

  // Eligibility lost mid-visit → cut it short exactly once: jump straight to a FRESH 'leaving'
  // stage. A visit that is already 'leaving' just finishes normally (no second cut). The cut
  // consumes this tick (no time accrues) so 'leaving' gets its full budget.
  if (!ctx.eligible && v.stage !== 'leaving') {
    v.stage = 'leaving';
    v.stageMs = 0;
    ev.push({ type: 'visit-cut', personaId: v.personaId });
    return state;
  }

  // dt-accumulated stage progress; cross at most one stage boundary per tick.
  v.stageMs += dtMs;
  const budget = STAGE_MS[v.stage];
  if (v.stageMs >= budget) {
    advanceStage(state, ev, v.stageMs - budget);
  }
  return state;
}
