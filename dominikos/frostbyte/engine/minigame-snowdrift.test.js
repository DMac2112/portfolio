import { describe, it, expect } from 'vitest';
import {
  newGame, tick, coinsFor,
  DURATION_MS, TOSS_COOLDOWN_MS, COUNTDOWN_MS, TARGET_R, HIT_R,
} from './minigame-snowdrift.js';

const BOUNDS = { x0: 0, y0: 0, x1: 800, y1: 450 };

function runScript(seed, bounds, script) {
  let state = newGame(seed, bounds);
  const events = [];
  for (const step of script) {
    const stepEv = [];
    tick(state, step.dtMs, step.input, stepEv);
    for (const e of stepEv) events.push(e);
  }
  return { state, events };
}

// A fixed, bounded scripted run: countdown + full 45s of play at 100ms steps,
// with an occasional (harmless) toss thrown in so determinism covers toss branches too.
function buildScript({ dt = 100, includeTosses = true } = {}) {
  const steps = [];
  const totalMs = COUNTDOWN_MS + DURATION_MS;
  let elapsed = 0;
  let i = 0;
  while (elapsed < totalMs) {
    const toss = includeTosses && i % 7 === 0;
    steps.push({ dtMs: dt, input: { aimX: 100 + (i % 5) * 50, aimY: 100 + (i % 3) * 40, toss } });
    elapsed += dt;
    i++;
  }
  return steps;
}

function forcePlaying(state) {
  state.phase = 'playing';
  state.tMs = DURATION_MS;
  state.nextSpawnMs = 999999; // suppress auto-spawns so manual targets are the only ones present
  return state;
}

describe('newGame', () => {
  it('initializes in countdown phase with expected defaults', () => {
    const s = newGame(42, BOUNDS);
    expect(s.phase).toBe('countdown');
    expect(s.tMs).toBe(COUNTDOWN_MS);
    expect(s.score).toBe(0);
    expect(s.combo).toBe(0);
    expect(s.comboMult).toBe(1);
    expect(s.targets).toEqual([]);
    expect(s.nextSpawnMs).toBe(0);
    expect(s.tossCdMs).toBe(0);
    expect(s.rng).toBe(42);
    expect(s.bounds).toBe(BOUNDS);
    expect(s.nextId).toBe(0);
  });
});

describe('determinism', () => {
  it('identical seed + identical scripted input -> identical final state and score', () => {
    const script = buildScript();
    const run1 = runScript(42, { ...BOUNDS }, script);
    const run2 = runScript(42, { ...BOUNDS }, script);
    expect(run1.state).toEqual(run2.state);
    expect(run1.state.score).toBe(run2.state.score);
    expect(run1.events).toEqual(run2.events);
  });

  it('different seeds produce a different first spawn position', () => {
    const script = buildScript({ includeTosses: false });
    const runA = runScript(1, { ...BOUNDS }, script);
    const runB = runScript(999, { ...BOUNDS }, script);
    const firstSpawnA = runA.events.find((e) => e.type === 'spawn');
    const firstSpawnB = runB.events.find((e) => e.type === 'spawn');
    expect(firstSpawnA).toBeDefined();
    expect(firstSpawnB).toBeDefined();
    const same = firstSpawnA.x === firstSpawnB.x && firstSpawnA.y === firstSpawnB.y;
    expect(same).toBe(false);
  });
});

describe('spawn cadence', () => {
  it('stays within a sane window implied by the 1100ms->450ms ramp over a full 45s run', () => {
    const script = buildScript({ includeTosses: false });
    const { events } = runScript(7, { ...BOUNDS }, script);
    const spawnCount = events.filter((e) => e.type === 'spawn').length;
    expect(spawnCount).toBeGreaterThanOrEqual(30);
    expect(spawnCount).toBeLessThanOrEqual(100);
  });
});

describe('combo math', () => {
  it('ramps 1 -> 1.5 -> 2 ... caps at 5.5 after 9 hits, stays 5.5 on the 10th, resets on a miss', () => {
    const state = forcePlaying(newGame(5, { ...BOUNDS }));
    const combos = [];
    for (let i = 0; i < 10; i++) {
      const ev = [];
      // Place a fresh stationary target exactly at the aim point, then toss at it.
      state.targets.push({ id: state.nextId++, x: 200, y: 200, vx: 0, vy: 0, r: TARGET_R, alive: true });
      tick(state, 16, { aimX: 200, aimY: 200, toss: true }, ev);
      expect(ev.some((e) => e.type === 'hit')).toBe(true);
      combos.push(state.comboMult);
      // Wait out the toss cooldown before the next throw (target list stays put; nothing to hit meanwhile).
      tick(state, TOSS_COOLDOWN_MS + 10, { aimX: 0, aimY: 0, toss: false }, []);
    }
    expect(combos).toEqual([1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 5.5]);
    expect(state.combo).toBe(10);

    // A miss (toss with nothing alive in range) resets combo and multiplier.
    const missEv = [];
    tick(state, 16, { aimX: 700, aimY: 400, toss: true }, missEv);
    expect(missEv).toEqual([{ type: 'miss' }]);
    expect(state.combo).toBe(0);
    expect(state.comboMult).toBe(1);
  });

  it('emits a combo event only when the multiplier actually increases (not on the capped 10th hit)', () => {
    const state = forcePlaying(newGame(5, { ...BOUNDS }));
    let comboEventCount = 0;
    for (let i = 0; i < 10; i++) {
      const ev = [];
      state.targets.push({ id: state.nextId++, x: 300, y: 150, vx: 0, vy: 0, r: TARGET_R, alive: true });
      tick(state, 16, { aimX: 300, aimY: 150, toss: true }, ev);
      comboEventCount += ev.filter((e) => e.type === 'combo').length;
      tick(state, TOSS_COOLDOWN_MS + 10, { aimX: 0, aimY: 0, toss: false }, []);
    }
    // Multiplier increases on hits 1-9 (1.5,2,...,5.5) but not on hit 10 (stays 5.5).
    expect(comboEventCount).toBe(9);
  });
});

describe('escape resets combo', () => {
  it('a target that crosses bounds is flagged alive=false exactly once and emits one escape event', () => {
    const state = forcePlaying(newGame(3, { ...BOUNDS }));

    // Build up a combo first, so we can observe the reset.
    const hitEv = [];
    state.targets.push({ id: state.nextId++, x: 400, y: 200, vx: 0, vy: 0, r: TARGET_R, alive: true });
    tick(state, 16, { aimX: 400, aimY: 200, toss: true }, hitEv);
    expect(state.combo).toBe(1);
    expect(state.comboMult).toBe(1.5);

    // Wait out the cooldown so a stray toss below can't interfere with the escape check.
    tick(state, TOSS_COOLDOWN_MS + 10, { aimX: 0, aimY: 0, toss: false }, []);

    // Place a target just inside the right edge, moving right fast enough to escape quickly.
    const escapeId = state.nextId;
    state.targets.push({ id: state.nextId++, x: BOUNDS.x1 - 5, y: 100, vx: 500, vy: 0, r: TARGET_R, alive: true });

    const allEvents = [];
    let escaped = false;
    for (let i = 0; i < 20 && !escaped; i++) {
      const ev = [];
      tick(state, 50, { aimX: -9999, aimY: -9999, toss: false }, ev);
      allEvents.push(...ev);
      const t = state.targets.find((x) => x.id === escapeId);
      if (t && !t.alive) escaped = true;
    }

    expect(escaped).toBe(true);
    const escapeEvents = allEvents.filter((e) => e.type === 'escape' && e.id === escapeId);
    expect(escapeEvents.length).toBe(1);
    expect(state.combo).toBe(0);
    expect(state.comboMult).toBe(1);
  });
});

describe('lifecycle no-op', () => {
  it('tick on a state already in "over" phase returns the same reference and pushes nothing', () => {
    const state = newGame(1, { ...BOUNDS });
    state.phase = 'over';
    const ev = [];
    const result = tick(state, 100, { aimX: 0, aimY: 0, toss: false }, ev);
    expect(result).toBe(state);
    expect(ev.length).toBe(0);
  });
});

describe('coinsFor', () => {
  it('matches the exact spec cases', () => {
    expect(coinsFor(0, 0)).toBe(0);
    expect(coinsFor(400, 0)).toBe(10);
    expect(coinsFor(4000, 55)).toBe(5);
  });

  it('is monotonic non-decreasing in score, never negative, never exceeds the remaining daily cap', () => {
    const dailyAlready = 50;
    const cap = 60;
    let prev = -Infinity;
    for (let score = 0; score <= 5000; score += 37) {
      const coins = coinsFor(score, dailyAlready, cap);
      expect(coins).toBeGreaterThanOrEqual(0);
      expect(coins).toBeLessThanOrEqual(cap - dailyAlready);
      expect(coins).toBeGreaterThanOrEqual(prev);
      prev = coins;
    }
  });

  it('never goes negative even when dailyAlready exceeds the cap', () => {
    expect(coinsFor(10000, 999)).toBe(0);
  });
});

describe('bounds invariant', () => {
  it('no target is ever alive while its centre sits outside bounds, across a full scripted run', () => {
    const script = buildScript();
    let state = newGame(11, { ...BOUNDS });
    for (const step of script) {
      const ev = [];
      tick(state, step.dtMs, step.input, ev);
      for (const target of state.targets) {
        if (target.alive) {
          expect(target.x).toBeGreaterThanOrEqual(BOUNDS.x0);
          expect(target.x).toBeLessThanOrEqual(BOUNDS.x1);
          expect(target.y).toBeGreaterThanOrEqual(BOUNDS.y0);
          expect(target.y).toBeLessThanOrEqual(BOUNDS.y1);
        }
      }
    }
  });
});

describe('large dtMs safety', () => {
  it('a single huge dtMs during countdown does not crash and transitions straight to playing', () => {
    const state = newGame(2, { ...BOUNDS });
    const ev = [];
    const result = tick(state, 60000, { aimX: 0, aimY: 0, toss: false }, ev);
    expect(result.phase).toBe('playing');
    expect(result.tMs).toBe(DURATION_MS);
  });

  it('a single huge dtMs during play ends the game in one bounded pass (no infinite loop)', () => {
    const state = forcePlaying(newGame(2, { ...BOUNDS }));
    state.nextSpawnMs = 0; // allow bounded spawns to exercise the spawn loop too
    const ev = [];
    const result = tick(state, 60000, { aimX: 0, aimY: 0, toss: false }, ev);
    expect(result.phase).toBe('over');
    expect(result.tMs).toBe(0);
    expect(ev.some((e) => e.type === 'end')).toBe(true);
  });
});
