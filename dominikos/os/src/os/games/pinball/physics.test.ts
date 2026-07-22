// Pinball physics regression tests. The drain sweep guards the "ball must never get
// permanently stuck" invariant — the exact bug a wide flipper/guide layout can reintroduce.
import { describe, it, expect } from 'vitest';
import {
  createPinball, step, setFlipper, chargePlunger, releasePlunger,
  type GameEvent, type PinballState,
} from './physics';

function sim(mut: (s: PinballState) => void, seconds: number, onStep?: (s: PinballState, ev: GameEvent[]) => boolean) {
  const s = createPinball();
  s.phase = 'play';
  mut(s);
  const dt = 1 / 120;
  const ev: GameEvent[] = [];
  for (let t = 0; t < seconds; t += dt) {
    ev.length = 0;
    step(s, dt, ev);
    if (onStep && onStep(s, ev)) return { s, ended: true, t };
  }
  return { s, ended: false, t: seconds };
}

describe('drain invariant', () => {
  it('every naturally-dropped ball drains or re-seats within a few seconds (idle flippers)', () => {
    const stuck: string[] = [];
    for (let x = 24; x <= 396; x += 8) {
      for (const vx of [-120, -40, 0, 40, 120]) {
        const r = sim(
          (s) => { s.ball = { x, y: 235, vx, vy: 0, r: 9 }; },
          25,
          (s) => s.phase === 'ready' || s.phase === 'over', // drained (→ready) or last-ball drain
        );
        if (!r.ended) stuck.push(`x=${x} vx=${vx} → (${r.s.ball.x.toFixed(0)},${r.s.ball.y.toFixed(0)})`);
      }
    }
    if (stuck.length) console.log(`STUCK (${stuck.length}):\n` + stuck.join('\n'));
    expect(stuck).toEqual([]);
  });

  it('a ball idling in the launch lane is returned to the plunger, not lost', () => {
    let relaunched = false;
    const r = sim(
      (s) => { s.ball = { x: 392, y: 615, vx: 0, vy: 0, r: 9 }; },
      6,
      (_s, ev) => { if (ev.some((e) => e.type === 'relaunch')) relaunched = true; return relaunched; },
    );
    expect(relaunched).toBe(true);
    expect(r.s.phase).toBe('ready');
    expect(r.s.balls).toBe(3); // no ball lost on a lane re-seat
  });
});

describe('flippers still work', () => {
  it('a raised flipper drives a resting ball upward', () => {
    const r = sim(
      (s) => { s.ball = { x: 150, y: 640, vx: 0, vy: 40, r: 9 }; setFlipper(s, 'L', true); },
      1.2,
      (s) => s.ball.vy < -150, // flipper imparted a strong upward velocity
    );
    expect(r.ended).toBe(true);
  });
});

describe('plunger launches into play', () => {
  it('charge + release sends the ball up out of the lane', () => {
    const s = createPinball();
    chargePlunger(s);
    const ev: GameEvent[] = [];
    for (let i = 0; i < 60; i++) step(s, 1 / 120, ev); // ~0.5s charge
    releasePlunger(s, ev);
    expect(s.phase).toBe('play');
    expect(s.ball.vy).toBeLessThan(0);
  });

  // Regression guard for the 2026-07-05 playtest bug: at low charge the ball yo-yoed in the
  // launch lane forever (never touched the playfield, endless safety-net re-seats). EVERY
  // launch power must put the ball into the playfield — no lane re-seat, ever.
  it('every launch power reaches the playfield (no lane yo-yo)', () => {
    for (const power of [0, 0.15, 0.35, 0.5, 0.75, 1]) {
      const s = createPinball();
      chargePlunger(s);
      s.power = power;
      const ev: GameEvent[] = [];
      releasePlunger(s, ev);
      let entered = false;
      const dt = 1 / 120;
      for (let t = 0; t < 4 && !entered; t += dt) {
        ev.length = 0;
        step(s, dt, ev);
        expect(ev.some((e) => e.type === 'relaunch')).toBe(false); // never re-seated
        if (s.ball.x < 360) entered = true;                        // clearly in the playfield
      }
      expect(entered, `power=${power} never left the launch lane`).toBe(true);
    }
  });
});

describe('drop-target bank', () => {
  it('clearing D-E-V raises the multiplier and the bank restores itself', () => {
    const s = createPinball();
    s.phase = 'play';
    const ev: GameEvent[] = [];
    // knock each target down with a rightward ball
    for (const t of s.dropTargets) {
      s.ball = { x: t.x - 20, y: (t.y1 + t.y2) / 2, vx: 260, vy: 0, r: 9 };
      for (let i = 0; i < 30 && t.up; i++) step(s, 1 / 120, ev);
      expect(t.up).toBe(false);
      s.ball.vx = 0; s.ball.vy = 0; s.ball.x = 200; s.ball.y = 400; // park it away from the bank
    }
    expect(ev.some((e) => e.type === 'bank')).toBe(true);
    expect(s.multiplier).toBe(2);
    expect(s.score).toBeGreaterThanOrEqual(300 * 3 + 2000);
    // bank pops back up after the restore delay
    for (let i = 0; i < Math.ceil(1.5 * 120); i++) step(s, 1 / 120, ev);
    expect(s.dropTargets.every((t) => t.up)).toBe(true);
  });

  it('multiplier resets on drain', () => {
    const s = createPinball();
    s.phase = 'play';
    s.multiplier = 3;
    s.ball = { x: 210, y: 690, vx: 0, vy: 400, r: 9 };
    const ev: GameEvent[] = [];
    for (let i = 0; i < 60 && s.phase === 'play'; i++) step(s, 1 / 120, ev);
    expect(s.phase).toBe('ready');
    expect(s.multiplier).toBe(1);
  });
});

describe('warp gate', () => {
  it('captures a nearby ball, then ejects it with real velocity', () => {
    const s = createPinball();
    s.phase = 'play';
    s.ball = { x: s.warp.x - 4, y: s.warp.y, vx: 30, vy: 0, r: 9 };
    const ev: GameEvent[] = [];
    let captured = false;
    let ejected = false;
    for (let i = 0; i < Math.ceil(2 * 120); i++) {
      step(s, 1 / 120, ev);
      if (ev.some((e) => e.type === 'warp')) captured = true;
      if (ev.some((e) => e.type === 'warpout')) { ejected = true; break; }
      ev.length = 0;
    }
    expect(captured).toBe(true);
    expect(ejected).toBe(true);
    expect(Math.hypot(s.ball.vx, s.ball.vy)).toBeGreaterThan(400);
  });
});
