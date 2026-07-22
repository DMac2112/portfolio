// Dialtone call-machine tests (vitest, headless — no DOM, no wall clock). Every loop is a
// bounded for-loop, so nothing here can hang. The core invariant under test: there is NO
// path to an "answered" state — the callee never picks up.
import { describe, it, expect } from 'vitest';
import * as machine from './callMachine';
import { newCall, dial, tick, hangup, DIAL_MS, RING_MS, MAX_RINGS, type CallState } from './callMachine';

/** Feed n ticks of dt ms each, returning every intermediate state (bounded). */
function run(s: CallState, dt: number, n: number): CallState[] {
  const out: CallState[] = [];
  for (let i = 0; i < n; i++) {
    s = tick(s, dt);
    out.push(s);
  }
  return out;
}

describe('newCall', () => {
  it('starts idle with no contact', () => {
    expect(newCall()).toEqual({ phase: 'idle', contactId: null, elapsed: 0, rings: 0 });
  });
});

describe('dial', () => {
  it('idle -> dialing with the contact set and counters zeroed', () => {
    const s = dial(newCall(), 'mum');
    expect(s).toEqual({ phase: 'dialing', contactId: 'mum', elapsed: 0, rings: 0 });
  });

  it('is ignored while dialing or ringing (same reference back)', () => {
    const dialing = dial(newCall(), 'mum');
    expect(dial(dialing, 'modem')).toBe(dialing);
    const ringing = tick(dialing, DIAL_MS);
    expect(ringing.phase).toBe('ringing');
    expect(dial(ringing, 'modem')).toBe(ringing);
  });

  it('starts a fresh call from noanswer and ended (settled phases)', () => {
    const dead = tick(dial(newCall(), 'mum'), DIAL_MS + MAX_RINGS * RING_MS);
    expect(dead.phase).toBe('noanswer');
    expect(dial(dead, 'modem')).toEqual({ phase: 'dialing', contactId: 'modem', elapsed: 0, rings: 0 });
    const ended = hangup(dial(newCall(), 'mum'));
    expect(dial(ended, 'modem').phase).toBe('dialing');
  });
});

describe('tick: dialing -> ringing', () => {
  it('stays dialing below DIAL_MS, rings at exactly DIAL_MS', () => {
    const s = dial(newCall(), 'x');
    expect(tick(s, DIAL_MS - 1).phase).toBe('dialing');
    const r = tick(s, DIAL_MS);
    expect(r.phase).toBe('ringing');
    expect(r.rings).toBe(1); // first ring cue fires the moment ringing starts
  });

  it('accumulates elapsed across small ticks', () => {
    const states = run(dial(newCall(), 'x'), 100, 12); // 12×100ms = DIAL_MS
    expect(states[10].phase).toBe('dialing');
    expect(states[11].phase).toBe('ringing');
    expect(states[11].elapsed).toBe(DIAL_MS);
  });

  it('ignores zero/negative dt (same reference back)', () => {
    const s = dial(newCall(), 'x');
    expect(tick(s, 0)).toBe(s);
    expect(tick(s, -50)).toBe(s);
  });
});

describe('tick: ring cadence', () => {
  it('increments rings once per RING_MS, never per tick', () => {
    let s = tick(dial(newCall(), 'x'), DIAL_MS); // ringing, ring #1
    let cues = 1;
    // 2 full ring cycles in 200ms steps: exactly 2 more cues, no double-counting
    const steps = (2 * RING_MS) / 200;
    for (let i = 0; i < steps; i++) {
      const next = tick(s, 200);
      expect(next.rings - s.rings).toBeLessThanOrEqual(1); // never skips ahead within a step
      if (next.rings !== s.rings) cues++;
      s = next;
    }
    expect(cues).toBe(3);
    expect(s.rings).toBe(3);
  });

  it('a single huge tick lands on the correct cumulative ring count', () => {
    const s = tick(dial(newCall(), 'x'), DIAL_MS + 3 * RING_MS + 1);
    expect(s.phase).toBe('ringing');
    expect(s.rings).toBe(4); // rings 1..4 have fired by then
  });
});

describe('no answer (the whole joke)', () => {
  it(`goes to noanswer after ${MAX_RINGS} full ring cycles and pins rings at MAX_RINGS`, () => {
    const justBefore = tick(dial(newCall(), 'x'), DIAL_MS + MAX_RINGS * RING_MS - 1);
    expect(justBefore.phase).toBe('ringing');
    expect(justBefore.rings).toBe(MAX_RINGS);
    const s = tick(dial(newCall(), 'x'), DIAL_MS + MAX_RINGS * RING_MS);
    expect(s.phase).toBe('noanswer');
    expect(s.rings).toBe(MAX_RINGS);
  });

  it('stays noanswer under further ticks (same reference back)', () => {
    let s = tick(dial(newCall(), 'x'), DIAL_MS + MAX_RINGS * RING_MS);
    for (let i = 0; i < 20; i++) {
      const next = tick(s, 5000);
      expect(next).toBe(s);
      s = next;
    }
    expect(s.phase).toBe('noanswer');
  });

  it('exports no answer() — the callee can never pick up', () => {
    expect('answer' in machine).toBe(false);
  });
});

describe('hangup', () => {
  it('ends a call from dialing, ringing and noanswer', () => {
    const dialing = dial(newCall(), 'x');
    expect(hangup(dialing).phase).toBe('ended');
    const ringing = tick(dialing, DIAL_MS + RING_MS);
    expect(hangup(ringing).phase).toBe('ended');
    const dead = tick(dialing, DIAL_MS + MAX_RINGS * RING_MS);
    expect(hangup(dead).phase).toBe('ended');
  });

  it('is a no-op when idle or already ended (same reference back)', () => {
    const idle = newCall();
    expect(hangup(idle)).toBe(idle);
    const ended = hangup(dial(newCall(), 'x'));
    expect(hangup(ended)).toBe(ended);
  });

  it('tick after ended is a no-op (same reference back)', () => {
    const ended = hangup(tick(dial(newCall(), 'x'), DIAL_MS));
    expect(tick(ended, 10_000)).toBe(ended);
  });
});

describe('determinism', () => {
  it('the same tick sequence yields identical states every run', () => {
    const dts = [130, 470, 900, 33, 3200, 250, 250, 8000, 16, 12_000];
    const runOnce = (): CallState[] => {
      let s = dial(newCall(), 'x');
      const out: CallState[] = [];
      for (const dt of dts) {
        s = tick(s, dt);
        out.push(s);
      }
      return out;
    };
    expect(runOnce()).toEqual(runOnce());
  });

  it('phase can only ever be one of the five known phases', () => {
    let s = dial(newCall(), 'x');
    for (let i = 0; i < 400; i++) {
      s = tick(s, 97);
      expect(['dialing', 'ringing', 'noanswer']).toContain(s.phase); // never 'answered'
    }
  });
});
