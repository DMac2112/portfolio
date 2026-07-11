// Sky Hopper engine tests (vitest, headless — no DOM/canvas/React). Lock the physics feel
// (impulse flap, gravity clamp, ceiling clamp), the distance-based pipe cadence, scoring latch,
// AABB collisions (top/bottom/ground), medals, and seeded determinism.
import { describe, it, expect } from 'vitest';
import {
  newGame, restart, flap, step, collides, gapBounds, medalFor,
  FIELD_W, GROUND_Y, BIRD_X, BIRD_R, BIRD_COLLIDE_INSET, FLAP_IMPULSE, MAX_FALL, GRAVITY,
  PIPE_W, PIPE_GAP, PIPE_PITCH, PIPE_LEAD, SPAWN_X, DESPAWN_X, SCROLL_SPEED, ROT_UP, ROT_DOWN, MAX_DT, MEDALS,
  type FlappyState, type GameEvent, type Pipe,
} from './engine';

const HALF = BIRD_R - BIRD_COLLIDE_INSET; // 12

/** Park the bird safely in the gap of whatever pipe straddles BIRD_X (else mid-field) so a
 *  long run can exercise spawn/score/despawn without the bird dying. */
function keepAlive(s: FlappyState): void {
  // Pre-position the bird in the gap of the NEXT pipe it must clear (the leftmost pipe whose right
  // edge hasn't passed the bird), so it survives across pipe transitions and long runs can exercise
  // scoring/spawn/despawn without dying.
  let target: Pipe | null = null;
  for (const p of s.pipes) if (p.x + PIPE_W > BIRD_X - HALF && (!target || p.x < target.x)) target = p;
  s.bird.y = target ? target.gapY : 300;
  s.bird.vy = 0;
}

/* ------------------------------- determinism ------------------------------ */

describe('determinism', () => {
  it('same seed + same inputs replays byte-identically', () => {
    const run = (): { s: FlappyState; ev: GameEvent[] } => {
      const s = newGame(1234);
      const ev: GameEvent[] = [];
      flap(s, ev);
      for (let i = 0; i < 240; i++) { if (i % 18 === 0) flap(s, ev); step(s, 1 / 60, ev); }
      return { s, ev };
    };
    const a = run(); const b = run();
    expect(JSON.stringify(a.s)).toBe(JSON.stringify(b.s));
    expect(a.ev).toEqual(b.ev);
  });

  it('first pipe gapY matches a hand-rolled reference LCG draw', () => {
    const s = newGame(999);
    flap(s, []);
    const band = gapBounds().max - gapBounds().min;
    for (let i = 0; i < 2000 && s.pipes.length === 0; i++) { keepAlive(s); step(s, 1 / 60, []); }
    expect(s.pipes.length).toBeGreaterThan(0);
    let rng = 999 >>> 0;
    rng = (rng * 1664525 + 1013904223) >>> 0;
    expect(s.pipes[0].gapY).toBe(gapBounds().min + ((rng >>> 16) % (band + 1)));
  });

  it('unseeded games draw gapY via Math.random', () => {
    const s = newGame();
    expect(s.seeded).toBe(false);
    flap(s, []);
    const band = gapBounds().max - gapBounds().min;
    const orig = Math.random;
    Math.random = () => 0.5;
    try { for (let i = 0; i < 2000 && s.pipes.length === 0; i++) { keepAlive(s); step(s, 1 / 60, []); } }
    finally { Math.random = orig; }
    expect(s.pipes.length).toBeGreaterThan(0);
    expect(s.pipes[0].gapY).toBe(gapBounds().min + Math.floor(0.5 * (band + 1)));
  });
});

/* --------------------------------- physics -------------------------------- */

describe('physics', () => {
  it('flap SETS vy (impulse, not additive) and arms the run', () => {
    const s = newGame(1);
    const ev: GameEvent[] = [];
    flap(s, ev);
    expect(s.phase).toBe('play');
    expect(s.bird.vy).toBe(FLAP_IMPULSE);
    expect(ev.filter((e) => e.type === 'start').length).toBe(1);
    expect(ev.filter((e) => e.type === 'flap').length).toBe(1);
    s.bird.vy = -100;
    flap(s, ev);
    expect(s.bird.vy).toBe(FLAP_IMPULSE); // SET, never +=
  });

  it('gravity integrates then clamps at terminal', () => {
    const s = newGame(1); flap(s, []);
    step(s, 1 / 60, []);
    expect(s.bird.vy).toBeCloseTo(FLAP_IMPULSE + GRAVITY * (1 / 60), 3);
    s.bird.y = 300; s.bird.vy = MAX_FALL - 5;
    step(s, 1 / 60, []);
    expect(s.bird.vy).toBe(MAX_FALL);
  });

  it('the ready-state bob never actually falls', () => {
    const s = newGame(1);
    for (let i = 0; i < 120; i++) step(s, 1 / 60, []);
    expect(Math.abs(s.bird.y - GROUND_Y * 0.45)).toBeLessThanOrEqual(8 + 1e-6);
    expect(s.bird.vy).toBe(0);
    expect(s.pipes.length).toBe(0);
  });

  it('the ceiling clamps and is never fatal', () => {
    const s = newGame(1); flap(s, []);
    s.bird.y = 2; s.bird.vy = -500;
    const ev: GameEvent[] = [];
    step(s, 1 / 60, ev);
    expect(s.bird.y).toBe(HALF);
    expect(s.bird.vy).toBeGreaterThanOrEqual(0);
    expect(s.phase).toBe('play');
    expect(ev.some((e) => e.type === 'die')).toBe(false);
  });

  it('dt is clamped to MAX_DT (no teleport on a long frame)', () => {
    const a = newGame(1); flap(a, []);
    const b = newGame(1); flap(b, []);
    step(a, 10, []);
    step(b, MAX_DT, []);
    expect(a.bird.y).toBeCloseTo(b.bird.y, 9);
    expect(a.bird.vy).toBeCloseTo(b.bird.vy, 9);
    expect(a.distance).toBeCloseTo(b.distance, 9);
  });

  it('tilt eases toward the nose-dive cap as the bird falls', () => {
    const s = newGame(1); flap(s, []);
    expect(s.bird.angle).toBe(ROT_UP);
    let prev = s.bird.angle;
    for (let i = 0; i < 15; i++) { s.bird.y = 100; s.bird.vy = MAX_FALL; step(s, 1 / 60, []); expect(s.bird.angle).toBeGreaterThanOrEqual(prev); prev = s.bird.angle; }
    expect(s.bird.angle).toBeGreaterThan(ROT_UP);
    expect(s.bird.angle).toBeLessThanOrEqual(ROT_DOWN + 1e-9);
  });
});

/* -------------------------------- scoring --------------------------------- */

describe('scoring', () => {
  it('a passed pipe scores exactly +1 (latched, not double-counted)', () => {
    const s = newGame(1); flap(s, []);
    s.pipes = [{ x: BIRD_X - PIPE_W + 5, gapY: 300, passed: false }];
    const ev: GameEvent[] = [];
    for (let i = 0; i < 10; i++) { keepAlive(s); step(s, 1 / 60, ev); }
    expect(s.score).toBe(1);
    expect(ev.filter((e) => e.type === 'score').length).toBe(1);
    expect(s.pipes.every((p) => p.passed || p.x + PIPE_W >= BIRD_X)).toBe(true);
  });

  it('score is monotonic and pairs 1:1 with score events over a long run', () => {
    const s = newGame(7); flap(s, []);
    let prev = 0, scoreEvents = 0;
    for (let i = 0; i < 2400; i++) {
      keepAlive(s);
      const ev: GameEvent[] = [];
      step(s, 1 / 60, ev);
      scoreEvents += ev.filter((e) => e.type === 'score').length;
      expect(s.score).toBeGreaterThanOrEqual(prev);
      prev = s.score;
    }
    expect(s.score).toBeGreaterThan(0);
    expect(s.score).toBe(scoreEvents);
  });
});

/* ------------------------------- collisions ------------------------------- */

describe('collisions', () => {
  it('a top-pipe hit kills (one hit, one die)', () => {
    const s = newGame(1); flap(s, []);
    s.pipes = [{ x: BIRD_X - PIPE_W / 2, gapY: 300, passed: false }];
    s.bird.y = 300 - PIPE_GAP / 2 - 5; s.bird.vy = 0; // 5px up into the top pipe
    expect(collides(s)).toBe(true);
    const ev: GameEvent[] = [];
    step(s, 1 / 60, ev);
    expect(s.phase).toBe('dead');
    expect(ev.filter((e) => e.type === 'hit').length).toBe(1);
    expect(ev.filter((e) => e.type === 'die').length).toBe(1);
  });

  it('a bottom-pipe hit kills', () => {
    const s = newGame(1); flap(s, []);
    s.pipes = [{ x: BIRD_X - PIPE_W / 2, gapY: 300, passed: false }];
    s.bird.y = 300 + PIPE_GAP / 2 + 5; s.bird.vy = 0;
    expect(collides(s)).toBe(true);
    step(s, 1 / 60, []);
    expect(s.phase).toBe('dead');
  });

  it('the ground kills, then the corpse rests on the surface (one land)', () => {
    const s = newGame(1); flap(s, []);
    s.bird.y = GROUND_Y - 20; s.bird.vy = MAX_FALL;
    const ev: GameEvent[] = [];
    step(s, 1 / 60, ev);
    expect(s.phase).toBe('dead');
    for (let i = 0; i < 30; i++) step(s, 1 / 60, ev);
    expect(s.bird.y).toBe(GROUND_Y - HALF);
    expect(ev.filter((e) => e.type === 'land').length).toBe(1);
  });

  it('flying cleanly through the gap does not collide', () => {
    const s = newGame(1); flap(s, []);
    s.pipes = [{ x: BIRD_X - PIPE_W / 2, gapY: 300, passed: false }];
    s.bird.y = 300; s.bird.vy = 0;
    expect(collides(s)).toBe(false);
    const ev: GameEvent[] = [];
    for (let i = 0; i < 20; i++) { s.bird.y = 300; s.bird.vy = 0; step(s, 1 / 60, ev); }
    expect(ev.some((e) => e.type === 'die')).toBe(false);
    expect(s.score).toBe(1);
  });

  it('death fires each transition event exactly once and nothing after', () => {
    const s = newGame(1); flap(s, []);
    s.pipes = [{ x: BIRD_X - PIPE_W / 2, gapY: 300, passed: false }];
    s.bird.y = 300 - PIPE_GAP / 2 - 5; s.bird.vy = 0;
    const ev: GameEvent[] = [];
    for (let i = 0; i < 60; i++) step(s, 1 / 60, ev);
    expect(ev.filter((e) => e.type === 'die').length).toBe(1);
    expect(ev.filter((e) => e.type === 'hit').length).toBe(1);
    expect(ev.filter((e) => e.type === 'land').length).toBe(1);
    expect(ev.filter((e) => e.type === 'score').length).toBe(0);
  });
});

/* --------------------------- pipes / spawn / despawn ---------------------- */

describe('pipes', () => {
  it('the first pipe waits for the open-sky lead, then cadence is distance-based', () => {
    const s = newGame(5); flap(s, []);
    for (let i = 0; i < 2000 && s.distance < PIPE_LEAD - 3; i++) { keepAlive(s); step(s, 1 / 60, []); }
    expect(s.pipes.length).toBe(0);
    for (let i = 0; i < 5000 && s.distance < PIPE_LEAD + PIPE_PITCH * 4 + 5; i++) { keepAlive(s); step(s, 1 / 60, []); }
    const spawned = (s.spawnDistance - PIPE_LEAD) / PIPE_PITCH;
    expect(spawned).toBe(Math.floor((s.distance - PIPE_LEAD) / PIPE_PITCH) + 1);
    for (let i = 1; i < s.pipes.length; i++) {
      // spacing jitters by up to one step's scroll — pipes are born on a per-step distance grid
      expect(Math.abs((s.pipes[i].x - s.pipes[i - 1].x) - PIPE_PITCH)).toBeLessThanOrEqual(SCROLL_SPEED / 60 + 1e-6);
    }
  });

  it('pipes despawn off-screen and never leak', () => {
    const s = newGame(9); flap(s, []);
    const cap = Math.ceil(FIELD_W / PIPE_PITCH) + 2;
    for (let i = 0; i < 3000; i++) {
      keepAlive(s);
      step(s, 1 / 60, []);
      expect(s.pipes.length).toBeLessThanOrEqual(cap);
    }
    for (const p of s.pipes) { expect(p.x).toBeGreaterThan(DESPAWN_X); expect(p.x).toBeLessThanOrEqual(SPAWN_X); }
  });

  it('every gap center stays within the safe band', () => {
    const s = newGame(3); flap(s, []);
    const gb = gapBounds();
    for (let i = 0; i < 3000; i++) {
      keepAlive(s);
      step(s, 1 / 60, []);
      for (const p of s.pipes) { expect(p.gapY).toBeGreaterThanOrEqual(gb.min); expect(p.gapY).toBeLessThanOrEqual(gb.max); }
    }
  });
});

/* ------------------------------ medals & misc ----------------------------- */

describe('medals & lifecycle', () => {
  it('medal thresholds climb 10/20/30/40', () => {
    expect(medalFor(9)).toBe(-1);
    expect(medalFor(10)).toBe(0);
    expect(medalFor(19)).toBe(0);
    expect(medalFor(20)).toBe(1);
    expect(medalFor(30)).toBe(2);
    expect(medalFor(39)).toBe(2);
    expect(medalFor(40)).toBe(3);
    expect(medalFor(1000)).toBe(3);
    expect(MEDALS[medalFor(40)]).toBe('Platinum');
  });

  it('best carries in, tracks upward, and survives restart', () => {
    const s = newGame(2, 25);
    expect(s.best).toBe(25);
    flap(s, []);
    for (let i = 0; i < 3200 && s.score < 30; i++) { keepAlive(s); step(s, 1 / 60, []); }
    expect(s.best).toBeGreaterThanOrEqual(30);
    const carried = s.best;
    restart(s);
    expect(s.best).toBe(carried);
    expect(s.score).toBe(0);
    expect(s.phase).toBe('ready');
  });

  it('restart(state, seed) equals a fresh newGame(seed, best)', () => {
    const s = newGame(1);
    s.best = 99;
    restart(s, 77);
    expect(JSON.stringify(s)).toBe(JSON.stringify(newGame(77, 99)));
  });
});
