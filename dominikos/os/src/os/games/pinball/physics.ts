// Space Pinball — original table physics for DominikOS (plan §8.4 in-app game).
// Everything here is authored for this project: table geometry, constants, scoring and the
// portfolio-flavoured mission ranks. Fixed-substep integration, circle-vs-segment collision,
// capsule flippers with angular impulse. No engine, no assets, nothing sampled or copied.
//
// Table tour (all coordinates original):
//   · top dome the ball rides out of the launch lane
//   · ORBIT: an inner rail concentric with the dome forms a loop channel on the upper-left,
//     with a spinner sensor inside it
//   · three reactor-pod bumpers, two slingshots, three mission beacons (career ladder)
//   · D-E-V drop-target bank on the right — clearing it bumps the score multiplier
//   · WARP gate: swallows the ball, holds it a beat, hurls it back out (cooldown-gated)
//   · ball-search safety net: a stalled ball is re-seated or nudged out — soft-locks impossible

export const TABLE_W = 420;
export const TABLE_H = 700;
const GRAVITY = 1000;
const MAX_SPEED = 1150;
const BALL_R = 9;
const SUBSTEPS = 5;

export interface Ball { x: number; y: number; vx: number; vy: number; r: number }

export interface Wall {
  x1: number; y1: number; x2: number; y2: number;
  e: number;            // restitution
  kick?: number;        // extra impulse along the normal (slingshots)
  score?: number;
  sling?: boolean;      // renders + flashes as a slingshot face
  flash?: number;
  hue?: 'cyan' | 'magenta' | 'amber'; // render tint for the neon pass
}

export interface BumperC { x: number; y: number; r: number; score: number; flash: number }
export interface MissionLight { x: number; y: number; r: number; lit: boolean; flash: number }

export interface DropTarget {
  x: number; y1: number; y2: number;
  up: boolean; flash: number; label: string;
}

export interface WarpGate {
  x: number; y: number; r: number;
  holdUntil: number;     // while time < holdUntil the ball is captured here
  cooldownUntil: number; // no re-capture before this
}

export interface Spinner { x: number; y: number; r: number; spin: number; cooldownUntil: number }

export interface Flipper {
  px: number; py: number; len: number; rad: number;
  rest: number; active: number;  // absolute angles (radians, y-down canvas space)
  angle: number; omega: number; pressed: boolean;
}

export type Phase = 'ready' | 'charging' | 'play' | 'over';

export interface GameEvent {
  type:
    | 'bumper' | 'sling' | 'flipper' | 'target' | 'mission' | 'launch' | 'drain' | 'newball'
    | 'gameover' | 'rankmax' | 'relaunch' | 'drop' | 'bank' | 'warp' | 'warpout' | 'spinner';
  value: number; // score awarded (already multiplied)
  x?: number;    // where it happened — the render layer spawns sparks/popups here
  y?: number;
}

/** Mission ranks — Dominik's actual career ladder, not anyone else's ranks. */
export const RANKS = [
  'Intern', 'Front-end Dev', 'React Dev', 'SFMC Specialist',
  'Deloitte Consultant', 'Automation Lead', 'Dev District Legend',
];

export const MAX_MULT = 5;

export interface PinballState {
  phase: Phase;
  ball: Ball;
  balls: number;          // balls remaining incl. current
  score: number;
  rank: number;           // index into RANKS
  multiplier: number;     // ×1..×5, raised by clearing the drop-target bank; reset on drain
  power: number;          // plunger charge 0..1
  walls: Wall[];
  bumpers: BumperC[];
  lights: MissionLight[];
  dropTargets: DropTarget[];
  bankRestoreAt: number;  // when the collapsed bank pops back up
  warp: WarpGate;
  spinner: Spinner;
  flippers: [Flipper, Flipper];
  time: number;
  stuckT: number;         // seconds the ball has been near-stationary (ball-search safety net)
}

const PLUNGER_X = 392;
const PLUNGER_Y = 612;

// Dome geometry — centre moved DOWN so the crown (y = 12) stays on-canvas.
export const DOME = { cx: 210, cy: 210, r: 198, innerR: 148 };

// Flipper geometry (shared by the guides so they meet the pivots exactly).
// Pivots sit inboard; both flippers slope down toward a central drain gap between their tips.
const FLIP_PY = 648;
const FLIP_LX = 126;            // left pivot x
const FLIP_RX = 294;            // right pivot x
const FLIP_LEN = 63;
const FLIP_REST = 0.4636;       // ≈ atan2(28,56): tip 56 right, 28 below the pivot
// tips land at x≈182 and x≈238 → a ~56px central drain gap (≈13% of table width — playtest
// found the old 68px gap punishingly wide; classic tables run 10–12%).

function arc(cx: number, cy: number, r: number, a0: number, a1: number, n: number, e: number, hue?: Wall['hue']): Wall[] {
  const out: Wall[] = [];
  for (let i = 0; i < n; i++) {
    const t0 = a0 + ((a1 - a0) * i) / n;
    const t1 = a0 + ((a1 - a0) * (i + 1)) / n;
    out.push({
      x1: cx + r * Math.cos(t0), y1: cy + r * Math.sin(t0),
      x2: cx + r * Math.cos(t1), y2: cy + r * Math.sin(t1),
      e, hue,
    });
  }
  return out;
}

function buildWalls(): Wall[] {
  const w: Wall[] = [
    // outer left / right rails (stop where the guides take over)
    { x1: 12, y1: DOME.cy, x2: 12, y2: 540, e: 0.4, hue: 'cyan' },
    { x1: 408, y1: DOME.cy, x2: 408, y2: 632, e: 0.4, hue: 'cyan' },
    // launch-lane inner wall (full height to floor) + lane floor (plunger rests on it)
    { x1: 376, y1: 250, x2: 376, y2: 632, e: 0.4, hue: 'cyan' },
    { x1: 376, y1: 632, x2: 408, y2: 632, e: 0.2, hue: 'cyan' },
    // lane DEFLECTOR: a roof over the lane top, HIGH end on the inner side so its underside
    // faces down-LEFT — a rising ball reflects up-left over the inner wall (top y=250) and
    // onto the dome. Every launch power enters the playfield instead of yo-yoing in the lane
    // (the 2026-07-05 playtest bug). Balls dropping onto its top side roll into the lane
    // corner and the ball-search net re-serves them from the plunger.
    { x1: 376, y1: 198, x2: 406, y2: 252, e: 0.45, hue: 'cyan' },
    // inlane guides — CONTINUOUS onto each flipper base (endpoint = the flipper pivot), so a
    // ball rolls straight from the guide onto the flipper and down to the tip. No pivot pocket.
    { x1: 12, y1: 540, x2: FLIP_LX, y2: FLIP_PY, e: 0.3, hue: 'cyan' },
    { x1: 376, y1: 555, x2: FLIP_RX, y2: FLIP_PY, e: 0.3, hue: 'cyan' },
    // slingshots — lone bouncy angled faces above each flipper (two-sided segments, so NO
    // enclosing back-walls and therefore no pocket to wedge in).
    { x1: 112, y1: 552, x2: 140, y2: 610, e: 1.0, kick: 255, score: 150, sling: true, flash: 0, hue: 'magenta' },
    { x1: 308, y1: 552, x2: 280, y2: 610, e: 1.0, kick: 255, score: 150, sling: true, flash: 0, hue: 'magenta' },
  ];
  // top dome: half-circle joining both outer rails (ball rides it out of the launch lane)
  w.push(...arc(DOME.cx, DOME.cy, DOME.r, Math.PI, 2 * Math.PI, 26, 0.45, 'cyan'));
  // ORBIT inner rail: concentric arc over the upper-left — the loop channel lives between it
  // and the dome. Both ends are open; the channel walls slope, so a slow ball always exits.
  w.push(...arc(DOME.cx, DOME.cy, DOME.innerR, Math.PI, Math.PI * 1.55, 12, 0.5, 'magenta'));
  return w;
}

export function createPinball(): PinballState {
  return {
    phase: 'ready',
    ball: { x: PLUNGER_X, y: PLUNGER_Y, vx: 0, vy: 0, r: BALL_R },
    balls: 3,
    score: 0,
    rank: 0,
    multiplier: 1,
    power: 0,
    walls: buildWalls(),
    bumpers: [
      { x: 130, y: 300, r: 22, score: 150, flash: 0 },
      { x: 258, y: 300, r: 22, score: 150, flash: 0 },
      { x: 194, y: 382, r: 22, score: 150, flash: 0 },
    ],
    lights: [
      { x: 58, y: 340, r: 13, lit: false, flash: 0 },
      { x: 82, y: 268, r: 13, lit: false, flash: 0 },
      { x: 124, y: 212, r: 13, lit: false, flash: 0 },
    ],
    dropTargets: [
      { x: 344, y1: 292, y2: 314, up: true, flash: 0, label: 'D' },
      { x: 344, y1: 324, y2: 346, up: true, flash: 0, label: 'E' },
      { x: 344, y1: 356, y2: 378, up: true, flash: 0, label: 'V' },
    ],
    bankRestoreAt: 0,
    warp: { x: 312, y: 160, r: 15, holdUntil: 0, cooldownUntil: 0 },
    spinner: { x: 70, y: 108, r: 16, spin: 0, cooldownUntil: 0 },
    flippers: [
      { px: FLIP_LX, py: FLIP_PY, len: FLIP_LEN, rad: 7.5, rest: FLIP_REST, active: -0.33, angle: FLIP_REST, omega: 0, pressed: false },
      { px: FLIP_RX, py: FLIP_PY, len: FLIP_LEN, rad: 7.5, rest: Math.PI - FLIP_REST, active: Math.PI + 0.33, angle: Math.PI - FLIP_REST, omega: 0, pressed: false },
    ],
    time: 0,
    stuckT: 0,
  };
}

export function newGame(s: PinballState): void {
  const fresh = createPinball();
  s.phase = fresh.phase; s.ball = fresh.ball; s.balls = fresh.balls;
  s.score = fresh.score; s.rank = fresh.rank; s.power = fresh.power;
  s.multiplier = 1;
  s.stuckT = 0;
  s.bankRestoreAt = 0;
  s.warp.holdUntil = 0; s.warp.cooldownUntil = 0;
  s.spinner.spin = 0; s.spinner.cooldownUntil = 0;
  s.bumpers.forEach((b) => (b.flash = 0));
  s.lights.forEach((l) => { l.lit = false; l.flash = 0; });
  s.dropTargets.forEach((t) => { t.up = true; t.flash = 0; });
}

export function setFlipper(s: PinballState, side: 'L' | 'R', down: boolean): void {
  s.flippers[side === 'L' ? 0 : 1].pressed = down;
}

export function chargePlunger(s: PinballState): void {
  if (s.phase === 'ready') { s.phase = 'charging'; s.power = 0; }
}

export function releasePlunger(s: PinballState, events: GameEvent[]): void {
  if (s.phase !== 'charging') return;
  // Playtest-derived floor: even a zero-power tap must reach the lane deflector (y≈240,
  // 372px above the plunger) with ~350px/s to spare at GRAVITY=1000 → √(350² + 2·1000·372)
  // ≈ 930. Anything weaker used to bounce in the lane forever (the 2026-07-05 playtest bug).
  s.ball.vy = -(940 + 210 * s.power);
  s.ball.vx = 0;
  s.phase = 'play';
  s.power = 0;
  events.push({ type: 'launch', value: 0 });
}

function collideWall(b: Ball, w: Wall, extraR = 0): number | null {
  const dx = w.x2 - w.x1, dy = w.y2 - w.y1;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((b.x - w.x1) * dx + (b.y - w.y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = w.x1 + t * dx, cy = w.y1 + t * dy;
  let nx = b.x - cx, ny = b.y - cy;
  const d = Math.hypot(nx, ny);
  const rr = b.r + extraR;
  if (d >= rr || d === 0) return null;
  nx /= d; ny /= d;
  b.x += nx * (rr - d);
  b.y += ny * (rr - d);
  const vn = b.vx * nx + b.vy * ny;
  if (vn < 0) {
    b.vx -= (1 + w.e) * vn * nx;
    b.vy -= (1 + w.e) * vn * ny;
    // slight tangential damping = rolling friction
    b.vx *= 0.995; b.vy *= 0.995;
    if (w.kick && -vn > 60) { b.vx += nx * w.kick; b.vy += ny * w.kick; }
    return vn;
  }
  return null;
}

function collideFlipper(b: Ball, f: Flipper): boolean {
  const tipx = f.px + f.len * Math.cos(f.angle);
  const tipy = f.py + f.len * Math.sin(f.angle);
  const seg: Wall = { x1: f.px, y1: f.py, x2: tipx, y2: tipy, e: 0.35 };
  const dx = seg.x2 - seg.x1, dy = seg.y2 - seg.y1;
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((b.x - seg.x1) * dx + (b.y - seg.y1) * dy) / len2));
  const hit = collideWall(b, seg, f.rad);
  if (hit === null) return false;
  // moving flipper transfers its contact-point velocity (ω × r) to the ball
  if (Math.abs(f.omega) > 1) {
    const speed = f.omega * t * f.len;
    b.vx += -Math.sin(f.angle) * speed * 0.9;
    b.vy += Math.cos(f.angle) * speed * 0.9;
  }
  return true;
}

/** Advance the simulation. Discrete happenings are appended to `events` for the UI layer. */
export function step(s: PinballState, dt: number, events: GameEvent[]): void {
  s.time += dt;

  // decay flashes / spinner
  for (const b of s.bumpers) b.flash = Math.max(0, b.flash - dt * 4);
  for (const l of s.lights) l.flash = Math.max(0, l.flash - dt * 3);
  for (const w of s.walls) if (w.sling && w.flash) w.flash = Math.max(0, w.flash - dt * 4);
  for (const t of s.dropTargets) t.flash = Math.max(0, t.flash - dt * 4);
  s.spinner.spin = Math.max(0, s.spinner.spin - dt * 1.6);

  // collapsed drop-target bank pops back up
  if (s.bankRestoreAt && s.time > s.bankRestoreAt) {
    s.bankRestoreAt = 0;
    s.dropTargets.forEach((t) => { t.up = true; t.flash = 0.6; });
  }

  // flippers track their target angle; ω drives the impulse they impart
  for (const f of s.flippers) {
    const target = f.pressed ? f.active : f.rest;
    const maxStep = 28 * dt; // a touch snappier so shots still reach the upper table at g=1000
    const da = Math.max(-maxStep, Math.min(maxStep, target - f.angle));
    f.omega = dt > 0 ? da / dt : 0;
    f.angle += da;
  }

  if (s.phase === 'charging') s.power = Math.min(1, s.power + dt * 0.85);
  if (s.phase === 'ready' || s.phase === 'charging') {
    s.ball.x = PLUNGER_X;
    s.ball.y = PLUNGER_Y + s.power * 14; // spring compresses
    s.ball.vx = 0; s.ball.vy = 0;
    return;
  }
  if (s.phase !== 'play') return;

  const b = s.ball;

  // WARP hold: ball is captured inside the gate, then hurled back into the field.
  if (s.time < s.warp.holdUntil) {
    b.x = s.warp.x; b.y = s.warp.y; b.vx = 0; b.vy = 0;
    s.stuckT = 0; // captured, not stuck
    if (s.time + dt >= s.warp.holdUntil) {
      const a = Math.PI * 0.72 + Math.random() * 0.12; // down-left-ish, slightly varied
      const sp = 620;
      b.vx = Math.cos(a) * sp;
      b.vy = Math.sin(a) * sp;
      events.push({ type: 'warpout', value: 0, x: s.warp.x, y: s.warp.y });
    }
    return;
  }

  const sub = dt / SUBSTEPS;
  for (let i = 0; i < SUBSTEPS; i++) {
    b.vy += GRAVITY * sub;
    const sp = Math.hypot(b.vx, b.vy);
    if (sp > MAX_SPEED) { b.vx = (b.vx / sp) * MAX_SPEED; b.vy = (b.vy / sp) * MAX_SPEED; }
    b.x += b.vx * sub;
    b.y += b.vy * sub;

    for (const w of s.walls) {
      const vn = collideWall(b, w);
      if (vn !== null && w.sling && -vn > 60) {
        w.flash = 1;
        const pts = (w.score ?? 0) * s.multiplier;
        s.score += pts;
        events.push({ type: 'sling', value: pts, x: (w.x1 + w.x2) / 2, y: (w.y1 + w.y2) / 2 });
      }
    }

    // drop targets act as walls only while up
    for (const t of s.dropTargets) {
      if (!t.up) continue;
      const seg: Wall = { x1: t.x, y1: t.y1, x2: t.x, y2: t.y2, e: 0.5 };
      if (collideWall(b, seg) !== null) {
        t.up = false;
        t.flash = 1;
        const pts = 300 * s.multiplier;
        s.score += pts;
        events.push({ type: 'drop', value: pts, x: t.x, y: (t.y1 + t.y2) / 2 });
        if (s.dropTargets.every((d) => !d.up)) {
          const bonus = 2000 * s.multiplier;
          s.score += bonus;
          s.multiplier = Math.min(MAX_MULT, s.multiplier + 1);
          s.bankRestoreAt = s.time + 1.2;
          events.push({ type: 'bank', value: bonus, x: t.x, y: 335 });
        }
      }
    }

    for (const f of s.flippers) {
      if (collideFlipper(b, f) && Math.abs(f.omega) > 1) events.push({ type: 'flipper', value: 0 });
    }

    for (const bp of s.bumpers) {
      let nx = b.x - bp.x, ny = b.y - bp.y;
      const d = Math.hypot(nx, ny);
      if (d < b.r + bp.r && d > 0) {
        nx /= d; ny /= d;
        b.x = bp.x + nx * (b.r + bp.r);
        b.y = bp.y + ny * (b.r + bp.r);
        const vn = b.vx * nx + b.vy * ny;
        if (vn < 0) { b.vx -= 2 * vn * nx; b.vy -= 2 * vn * ny; }
        b.vx += nx * 220; b.vy += ny * 220;
        bp.flash = 1;
        const pts = bp.score * s.multiplier;
        s.score += pts;
        events.push({ type: 'bumper', value: pts, x: bp.x, y: bp.y });
      }
    }

    // mission lights are sensors, not geometry
    for (const l of s.lights) {
      if (!l.lit && Math.hypot(b.x - l.x, b.y - l.y) < b.r + l.r) {
        l.lit = true; l.flash = 1;
        const pts = 500 * s.multiplier; // beacons honor the bank multiplier like everything else
        s.score += pts;
        events.push({ type: 'target', value: pts, x: l.x, y: l.y });
        if (s.lights.every((x) => x.lit)) {
          s.score += 5000;
          s.lights.forEach((x) => { x.lit = false; x.flash = 1; });
          if (s.rank < RANKS.length - 1) {
            s.rank += 1;
            events.push({ type: 'mission', value: 5000, x: 90, y: 270 });
          } else {
            events.push({ type: 'rankmax', value: 5000, x: 90, y: 270 });
          }
        }
      }
    }
  }

  // spinner sensor inside the orbit channel
  const sp2 = s.spinner;
  if (s.time > sp2.cooldownUntil && Math.hypot(b.x - sp2.x, b.y - sp2.y) < b.r + sp2.r) {
    sp2.cooldownUntil = s.time + 0.35;
    sp2.spin = 1;
    const pts = 100 * s.multiplier;
    s.score += pts;
    events.push({ type: 'spinner', value: pts, x: sp2.x, y: sp2.y });
  }

  // warp gate capture (cooldown-gated so it can't chain-grab)
  const wg = s.warp;
  if (s.time > wg.cooldownUntil && Math.hypot(b.x - wg.x, b.y - wg.y) < wg.r + b.r * 0.4) {
    wg.holdUntil = s.time + 0.7;
    wg.cooldownUntil = s.time + 4;
    const pts = 750 * s.multiplier;
    s.score += pts;
    events.push({ type: 'warp', value: pts, x: wg.x, y: wg.y });
  }

  // ---- ball-search safety net: no permanent soft-lock is ever possible ----
  // A ball is never legitimately near-stationary for 2s anywhere (every surface is curved or
  // angled) EXCEPT cradled on a held flipper — so that's the only exemption.
  const speed = Math.hypot(b.vx, b.vy);
  const cradled = s.flippers[0].pressed || s.flippers[1].pressed;
  if (speed < 10 && !cradled) s.stuckT += dt;
  else s.stuckT = 0;
  if (s.stuckT > 2) {
    s.stuckT = 0;
    if (b.x > 372) {
      s.phase = 'ready';
      b.x = PLUNGER_X; b.y = PLUNGER_Y; b.vx = 0; b.vy = 0;
      events.push({ type: 'relaunch', value: 0 });
      return;
    }
    b.vx += (210 - b.x) * 0.6;   // shove toward the central drain gap
    b.vy += 200;
  }

  // drain
  if (b.y > TABLE_H + 40) {
    s.balls -= 1;
    s.multiplier = 1; // multiplier is per-ball
    if (s.balls > 0) {
      s.phase = 'ready';
      b.x = PLUNGER_X; b.y = PLUNGER_Y; b.vx = 0; b.vy = 0;
      events.push({ type: 'drain', value: 0 });
      events.push({ type: 'newball', value: 0 });
    } else {
      s.phase = 'over';
      events.push({ type: 'drain', value: 0 });
      events.push({ type: 'gameover', value: 0 });
    }
  }
}
