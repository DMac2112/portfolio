import { describe, it, expect } from 'vitest';
import {
  newVisitorScheduler,
  tick,
  VISIT_COOLDOWN_MS,
  STAGE_MS,
  VISITOR_LINE_COUNT,
} from './visitors.js';

const SEEDS = [1, 2, 3, 7, 42, 1337];
const PERSONAS = ['auro', 'blip', 'cove', 'drift'];

// A fully-present visitor: door open, player in den, no overlay.
const IN = { eligible: true, personaIds: PERSONAS, placedCount: 3 };
// Ineligible: sign closed / player away / overlay open.
const OUT = { eligible: false, personaIds: PERSONAS, placedCount: 3 };

const [COOL_MIN, COOL_MAX] = VISIT_COOLDOWN_MS;
const inCoolRange = (ms) => ms >= COOL_MIN && ms <= COOL_MAX;

// Drive one complete visit from idle → end. Assumes phase 'idle' on entry. Returns the events.
function runOneVisit(state, ctx = IN) {
  const ev = [];
  state.cooldownMs = 0; // force the cooldown to elapse on the next eligible tick
  tick(state, 1, ctx, ev); // cross cooldown → visit-start (stage 'entering')
  tick(state, STAGE_MS.entering, ctx, ev); // entering → admiring (visit-line + visit-tip)
  tick(state, STAGE_MS.admiring, ctx, ev); // admiring → leaving (visit-leaving)
  tick(state, STAGE_MS.leaving, ctx, ev); // leaving → idle (visit-end, re-roll cooldown)
  return ev;
}

const types = (ev) => ev.map((e) => e.type);

describe('newVisitorScheduler', () => {
  it('produces the documented shape with an in-range initial cooldown', () => {
    const s = newVisitorScheduler(7);
    expect(s.phase).toBe('idle');
    expect(s.visit).toBeNull();
    expect(typeof s.rng).toBe('number');
    expect(inCoolRange(s.cooldownMs)).toBe(true);
  });

  it('is deterministic: same seed -> byte-identical scheduler', () => {
    for (const seed of SEEDS) {
      expect(newVisitorScheduler(seed)).toEqual(newVisitorScheduler(seed));
    }
  });

  it('initial cooldown is always within [45000, 90000] across many seeds', () => {
    for (let seed = 1; seed <= 60; seed++) {
      expect(inCoolRange(newVisitorScheduler(seed).cooldownMs)).toBe(true);
    }
  });
});

describe('cooldown rolls', () => {
  it('every re-roll stays within [45000, 90000] over >=50 re-rolls', () => {
    // Path A: degenerate ctx (no personas) re-rolls without visiting.
    const s = newVisitorScheduler(3);
    const empty = { eligible: true, personaIds: [], placedCount: 0 };
    const seen = [];
    for (let i = 0; i < 60; i++) {
      s.cooldownMs = 0;
      tick(s, 1, empty, []);
      expect(s.phase).toBe('idle');
      expect(s.visit).toBeNull();
      seen.push(s.cooldownMs);
    }
    // Path B: re-roll that happens on visit-end.
    const s2 = newVisitorScheduler(11);
    for (let i = 0; i < 60; i++) {
      runOneVisit(s2);
      seen.push(s2.cooldownMs);
    }
    for (const ms of seen) expect(inCoolRange(ms)).toBe(true);
    // Sanity: values actually vary (rng is advancing, not stuck).
    expect(new Set(seen).size).toBeGreaterThan(1);
  });
});

describe('eligibility gating of the cooldown', () => {
  it('ineligible time never decrements the cooldown', () => {
    const s = newVisitorScheduler(5);
    const before = s.cooldownMs;
    for (let i = 0; i < 500; i++) tick(s, 100, OUT, []); // 50s of "closed"
    expect(s.cooldownMs).toBe(before);
    expect(s.phase).toBe('idle');
  });

  it('a visit can only ever begin while eligible', () => {
    const s = newVisitorScheduler(5);
    s.cooldownMs = 0;
    const ev = [];
    tick(s, 5000, OUT, ev); // huge dt but ineligible
    expect(s.phase).toBe('idle');
    expect(types(ev)).not.toContain('visit-start');
  });
});

describe('full visit timeline', () => {
  it('emits start -> line+tip -> leaving -> end at exact stage timings', () => {
    const s = newVisitorScheduler(42);
    s.cooldownMs = 0;

    const evStart = [];
    tick(s, 1, IN, evStart); // cross cooldown
    expect(types(evStart)).toEqual(['visit-start']);
    expect(s.phase).toBe('visiting');
    expect(s.visit.stage).toBe('entering');
    expect(s.visit.stageMs).toBe(0);
    const personaId = s.visit.personaId;
    expect(PERSONAS).toContain(personaId);

    // Still entering just before the boundary.
    const evMid = [];
    tick(s, STAGE_MS.entering - 100, IN, evMid);
    expect(evMid).toEqual([]);
    expect(s.visit.stage).toBe('entering');

    // Cross into 'admiring' → line + tip, both carrying the persona.
    const evAdm = [];
    tick(s, 100, IN, evAdm);
    expect(types(evAdm)).toEqual(['visit-line', 'visit-tip']);
    expect(s.visit.stage).toBe('admiring');
    expect(evAdm[0].personaId).toBe(personaId);
    expect(evAdm[1].personaId).toBe(personaId);
    expect(evAdm[0].lineId).toBe(s.visit.lineId);

    // Cross into 'leaving'.
    const evLeave = [];
    tick(s, STAGE_MS.admiring, IN, evLeave);
    expect(types(evLeave)).toEqual(['visit-leaving']);
    expect(s.visit.stage).toBe('leaving');

    // Cross out → idle + end, cooldown re-rolled in range.
    const evEnd = [];
    tick(s, STAGE_MS.leaving, IN, evEnd);
    expect(types(evEnd)).toEqual(['visit-end']);
    expect(evEnd[0].personaId).toBe(personaId);
    expect(s.phase).toBe('idle');
    expect(s.visit).toBeNull();
    expect(inCoolRange(s.cooldownMs)).toBe(true);
  });

  it('a single large dt crosses at most one stage boundary per tick', () => {
    const s = newVisitorScheduler(42);
    s.cooldownMs = 0;
    tick(s, 1, IN, []); // start, stage 'entering'
    const ev = [];
    // 20s in one frame: without single-boundary clamping this would blow through the whole visit.
    tick(s, 20000, IN, ev);
    expect(s.phase).toBe('visiting');
    expect(s.visit.stage).toBe('admiring'); // advanced exactly one boundary
    expect(types(ev)).toEqual(['visit-line', 'visit-tip']);
    expect(s.visit.stageMs).toBeLessThanOrEqual(STAGE_MS.admiring);
  });
});

describe('cut on lost eligibility', () => {
  it('cuts an in-progress visit to leaving, then completes back to idle', () => {
    const s = newVisitorScheduler(7);
    s.cooldownMs = 0;
    tick(s, 1, IN, []); // start
    tick(s, STAGE_MS.entering, IN, []); // → admiring
    expect(s.visit.stage).toBe('admiring');
    const personaId = s.visit.personaId;

    const evCut = [];
    tick(s, 100, OUT, evCut); // eligibility lost mid-admire
    expect(types(evCut)).toEqual(['visit-cut']);
    expect(evCut[0].personaId).toBe(personaId);
    expect(s.visit.stage).toBe('leaving');
    expect(s.visit.stageMs).toBe(0); // fresh leaving budget

    // Leaving finishes even though still ineligible; only ONE cut ever emitted.
    const evRest = [];
    tick(s, STAGE_MS.leaving, OUT, evRest);
    expect(types(evRest)).toEqual(['visit-end']);
    expect(s.phase).toBe('idle');
    expect(s.visit).toBeNull();
  });

  it('never emits a second visit-cut once already leaving', () => {
    const s = newVisitorScheduler(7);
    s.cooldownMs = 0;
    tick(s, 1, IN, []); // start (entering)
    const ev = [];
    tick(s, 100, OUT, ev); // cut → leaving
    tick(s, 500, OUT, ev); // still leaving, ineligible
    tick(s, 500, OUT, ev); // still leaving, ineligible
    expect(ev.filter((e) => e.type === 'visit-cut').length).toBe(1);
  });

  it('cutting during entering also works (before any line/tip)', () => {
    const s = newVisitorScheduler(99);
    s.cooldownMs = 0;
    tick(s, 1, IN, []); // start, entering
    const ev = [];
    tick(s, 100, OUT, ev); // cut while still entering
    expect(types(ev)).toEqual(['visit-cut']);
    expect(s.visit.stage).toBe('leaving');
    tick(s, STAGE_MS.leaving, IN, ev);
    expect(s.phase).toBe('idle');
    // Never spoke a line because we cut before the entering→admiring boundary.
    expect(ev.filter((e) => e.type === 'visit-line').length).toBe(0);
  });
});

describe('single-visitor invariant', () => {
  it('never starts a second visit while one is in progress, even when eligible', () => {
    const s = newVisitorScheduler(3);
    s.cooldownMs = 0;
    const ev = [];
    tick(s, 1, IN, ev); // start
    // Hammer eligible ticks through the whole visit; count starts.
    for (let i = 0; i < 200; i++) tick(s, 100, IN, ev);
    const starts = ev.filter((e) => e.type === 'visit-start').length;
    // Across ~20s+ several full visits may complete and restart — but never two starts without an
    // intervening end, and never two concurrent visitors (one `visit` slot by construction).
    const ends = ev.filter((e) => e.type === 'visit-end').length;
    expect(starts).toBe(ends + (s.phase === 'visiting' ? 1 : 0));
    // Structural guarantee: at most one active visit.
    expect(s.visit === null || typeof s.visit.personaId === 'string').toBe(true);
  });

  it('does not start a new visit mid-visit even as the cooldown value would allow', () => {
    const s = newVisitorScheduler(3);
    s.cooldownMs = 0;
    const ev = [];
    tick(s, 1, IN, ev); // start
    s.cooldownMs = 0; // pretend a cooldown is "ready" — must be ignored while visiting
    tick(s, STAGE_MS.entering - 50, IN, ev); // still entering
    expect(ev.filter((e) => e.type === 'visit-start').length).toBe(1);
    expect(s.phase).toBe('visiting');
  });
});

describe('degenerate ctx', () => {
  it('empty personaIds never starts a visit and keeps re-rolling', () => {
    const s = newVisitorScheduler(2);
    const empty = { eligible: true, personaIds: [], placedCount: 0 };
    const ev = [];
    for (let i = 0; i < 400; i++) tick(s, 500, empty, ev); // 200s eligible, no personas
    expect(ev).toEqual([]);
    expect(s.phase).toBe('idle');
    expect(s.visit).toBeNull();
    // Cooldown is mid-countdown here (not freshly rolled), but re-rolls kept it a sane positive
    // value that never overflows the max.
    expect(s.cooldownMs).toBeGreaterThan(0);
    expect(s.cooldownMs).toBeLessThanOrEqual(COOL_MAX);
  });
});

describe('synthetic line ids', () => {
  it('every rolled lineId is visitor-0..visitor-5', () => {
    const s = newVisitorScheduler(1234);
    const lineIds = [];
    for (let i = 0; i < 80; i++) {
      const ev = runOneVisit(s);
      for (const e of ev) if (e.type === 'visit-line') lineIds.push(e.lineId);
    }
    expect(lineIds.length).toBeGreaterThanOrEqual(80);
    for (const id of lineIds) {
      expect(id).toMatch(/^visitor-[0-5]$/);
      const n = Number(id.slice('visitor-'.length));
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(VISITOR_LINE_COUNT);
    }
  });
});

describe('determinism', () => {
  it('same seed + same tick sequence -> identical states and event streams', () => {
    // Mixed dt sizes and eligibility flips, including cuts and idle stretches.
    const script = [
      [100, true], [250, true], [900, false], [33, true], [2600, true],
      [400, false], [6000, true], [16, true], [3000, true], [45000, true],
      [500, true], [1, true], [2500, true], [80, false], [2500, false],
      [90000, true], [2500, true], [6000, true], [2500, true], [120, true],
    ];
    const runOnce = () => {
      const s = newVisitorScheduler(7);
      const ev = [];
      for (const [dt, elig] of script) {
        tick(s, dt, { eligible: elig, personaIds: PERSONAS, placedCount: 2 }, ev);
      }
      return { s, ev };
    };
    const a = runOnce();
    const b = runOnce();
    expect(a.s).toEqual(b.s);
    expect(a.ev).toEqual(b.ev);
    // The script is exercised enough to have produced real events.
    expect(a.ev.length).toBeGreaterThan(0);
  });
});

describe('no-op guard', () => {
  it('dt<=0 returns the same reference and mutates nothing (project convention)', () => {
    const s = newVisitorScheduler(1);
    const snapshot = { ...s };
    const ev = [];
    expect(tick(s, 0, IN, ev)).toBe(s);
    expect(tick(s, -16, IN, ev)).toBe(s);
    expect(ev).toEqual([]);
    expect(s).toEqual(snapshot);
  });
});
