// Bubble Shooter — DominikOS's fourth game (kind:'react' via componentById, plan §8.4/§8.6).
// Pure-canvas renderer + input over the deterministic ./engine. Runs in-process; the §8.4 pause
// contract comes from useGameLoop (no rAF while unfocused/minimized/hidden). Every pixel is drawn
// in code — glossy bubbles are per-colour radial-gradient sprites cached offscreen, each carrying
// a faint shape glyph so colours stay separable for colour-blind players and reduced-motion mode.
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { AppProps } from '../../types';
import { useOSStore } from '../../store/osStore';
import { usePageVisible } from '../../hooks/usePageVisible';
import { useGameLoop } from '../../hooks/useGameLoop';
import { useSystem } from '../../context/SystemContext';
import { tone } from '../../sound';
import {
  newGame, fire, step, swap, setAim, nudgeAim, aimFromPointer, cellToPixel, colsInRow,
  ROWS_MAX, R, D, FIELD_W, FIELD_H, DANGER_Y, SHOOTER_X, SHOOTER_Y,
  COLORS, RANKS, RANK_AT, EMPTY,
  type BubbleState, type GameEvent,
} from './engine';

const HI_KEY = 'dmos.v1.bubble';
const AIM_RATE = 2.2;          // rad/s for held-key rotation
const SPRITE_SS = 128;         // offscreen bubble sprite resolution

function loadHi(): number {
  try { return (JSON.parse(localStorage.getItem(HI_KEY) ?? '{}') as { hi?: number }).hi ?? 0; } catch { return 0; }
}
function saveHi(hi: number): void {
  try { localStorage.setItem(HI_KEY, JSON.stringify({ hi })); } catch { /* stateless is fine */ }
}

/* -------------------------------- bubble art ------------------------------ */

function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (f <= 1) { r *= f; g *= f; b *= f; } else { const t = f - 1; r += (255 - r) * t; g += (255 - g) * t; b += (255 - b) * t; }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

/** `rgba(r,g,b,%a)` spark template for a palette colour — the `%a` is filled with alpha per frame. */
function sparkColor(color: number): string {
  const n = parseInt((COLORS[color] ?? '#ffffff').slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},%a)`;
}

/** Faint white glyph per colour id so hues stay distinguishable without relying on colour alone. */
function drawGlyph(g: CanvasRenderingContext2D, color: number, cx: number, cy: number, rad: number): void {
  g.save();
  g.globalAlpha = 0.28;
  g.strokeStyle = 'rgba(255,255,255,0.95)';
  g.fillStyle = 'rgba(255,255,255,0.95)';
  g.lineWidth = rad * 0.13;
  g.lineJoin = 'round';
  const s = rad * 0.4;
  switch (color) {
    case 0: g.beginPath(); g.arc(cx, cy, s * 0.55, 0, 7); g.fill(); break;                                  // dot
    case 1: g.beginPath(); g.arc(cx, cy, s, 0, 7); g.stroke(); break;                                       // ring
    case 2: g.beginPath(); g.moveTo(cx, cy - s); g.lineTo(cx + s, cy + s * 0.82); g.lineTo(cx - s, cy + s * 0.82); g.closePath(); g.stroke(); break; // triangle
    case 3: g.beginPath(); g.moveTo(cx, cy - s); g.lineTo(cx + s, cy); g.lineTo(cx, cy + s); g.lineTo(cx - s, cy); g.closePath(); g.stroke(); break; // diamond
    case 4: g.fillRect(cx - s, cy - s * 0.3, s * 2, s * 0.6); break;                                         // bar
    default: g.beginPath(); g.moveTo(cx - s, cy - s); g.lineTo(cx + s, cy + s); g.moveTo(cx + s, cy - s); g.lineTo(cx - s, cy + s); g.stroke(); break; // cross
  }
  g.restore();
}

function makeSprite(color: number): HTMLCanvasElement {
  const hex = COLORS[color] ?? '#888';
  const cv = document.createElement('canvas');
  cv.width = SPRITE_SS; cv.height = SPRITE_SS;
  const g = cv.getContext('2d')!;
  const c = SPRITE_SS / 2;
  const rad = SPRITE_SS / 2 - 3;
  const grad = g.createRadialGradient(c - rad * 0.35, c - rad * 0.4, rad * 0.1, c, c, rad);
  grad.addColorStop(0, shade(hex, 1.75));
  grad.addColorStop(0.38, hex);
  grad.addColorStop(1, shade(hex, 0.55));
  g.fillStyle = grad;
  g.beginPath(); g.arc(c, c, rad, 0, 7); g.fill();
  g.strokeStyle = shade(hex, 0.45);
  g.lineWidth = SPRITE_SS * 0.028;
  g.beginPath(); g.arc(c, c, rad - 1, 0, 7); g.stroke();
  drawGlyph(g, color, c, c, rad);
  g.fillStyle = 'rgba(255,255,255,0.72)'; // specular highlight
  g.beginPath(); g.ellipse(c - rad * 0.34, c - rad * 0.38, rad * 0.24, rad * 0.15, -0.5, 0, 7); g.fill();
  return cv;
}

/* --------------------------------- fx types ------------------------------- */

interface Spark { x: number; y: number; vx: number; vy: number; life: number; color: string }
interface Fall { x: number; y: number; vy: number; color: number; life: number }
interface Popup { x: number; y: number; life: number; text: string; color: string }
interface Flash { x: number; y: number; life: number }
interface Fx { sparks: Spark[]; falls: Fall[]; pops: Popup[]; flashes: Flash[] }

interface Panel { score: number; hi: number; rank: number; shots: number; next: number; phase: BubbleState['phase']; message: string }

function burst(fx: Fx, x: number, y: number, n: number, color: string): void {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 50 + Math.random() * 190;
    fx.sparks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, life: 1, color });
  }
  if (fx.sparks.length > 180) fx.sparks.splice(0, fx.sparks.length - 180);
}

/* -------------------------------- component ------------------------------- */

export default function BubbleApp({ windowId, focused }: AppProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const game = useRef<BubbleState>();
  if (!game.current) game.current = newGame(undefined, loadHi());
  const fx = useRef<Fx>({ sparks: [], falls: [], pops: [], flashes: [] });
  const sprites = useRef(new Map<number, HTMLCanvasElement>());
  const view = useRef({ scale: 1, ox: 0, oy: 0, dpr: 1 });
  const held = useRef({ left: false, right: false });

  const visible = usePageVisible();
  const minimized = useOSStore((st) => st.windows[windowId]?.state === 'minimized');
  const { prefs } = useSystem();
  const active = focused && visible && !minimized;
  const activeRef = useRef(active);
  activeRef.current = active;

  const [panel, setPanel] = useState<Panel>(() => {
    const s = game.current!;
    return { score: 0, hi: s.best, rank: 0, shots: s.shotsUntilDrop, next: s.next, phase: 'aim', message: 'Aim and shoot — match 3 to pop' };
  });

  const spriteFor = useCallback((color: number): HTMLCanvasElement => {
    let sp = sprites.current.get(color);
    if (!sp) { sp = makeSprite(color); sprites.current.set(color, sp); }
    return sp;
  }, []);

  const sfx = useCallback(
    (e: GameEvent) => {
      if (prefs.muted) return;
      switch (e.type) {
        case 'shoot': tone(0, 300, 0.06, 0.05, 'square'); break;
        case 'bounce': tone(0, 180, 0.03, 0.04, 'triangle'); break;
        case 'land': tone(0, 240, 0.05, 0.05); break;
        case 'dud': tone(0, 150, 0.08, 0.05, 'sawtooth'); break;
        case 'pop': { const n = Math.min(6, e.count); for (let i = 0; i < n; i++) tone(i * 0.035, 440 + i * 90, 0.07, 0.06, 'square'); break; }
        case 'drop': tone(0, 520, 0.1, 0.06); tone(0.08, 390, 0.14, 0.06); break;
        case 'row': tone(0, 120, 0.12, 0.06, 'sawtooth'); break;
        case 'swap': tone(0, 360, 0.04, 0.04, 'square'); break;
        case 'win': tone(0, 523, 0.12, 0.08); tone(0.1, 659, 0.12, 0.08); tone(0.2, 784, 0.12, 0.08); tone(0.3, 1047, 0.24, 0.08); break;
        case 'lose': tone(0, 220, 0.2, 0.07); tone(0.16, 165, 0.28, 0.07); tone(0.34, 110, 0.5, 0.07); break;
        default: break;
      }
    },
    [prefs.muted],
  );

  const syncHud = useCallback(
    (events: GameEvent[]) => {
      if (events.length === 0) return;
      const s = game.current!;
      let message: string | null = null;
      for (const e of events) {
        sfx(e);
        if (e.type === 'pop') {
          fx.current.pops.push({ x: e.x, y: e.y - 12, life: 1, text: `+${e.value}`, color: 'rgba(255,247,214,%a)' });
          message = e.count >= 5 ? `Combo x${e.count}!  +${e.value}` : `Pop! +${e.value}`;
        }
        if (e.type === 'drop') { message = `Drop bonus +${e.value}`; if (!prefs.reducedMotion) fx.current.pops.push({ x: e.x, y: e.y + 6, life: 1, text: `+${e.value}`, color: 'rgba(180,240,255,%a)' }); }
        if (e.type === 'row') message = 'The ceiling pushed down…';
        if (e.type === 'dud') message = 'No match — that one sticks';
        if (e.type === 'win') message = 'BOARD CLEARED — you win!';
        if (e.type === 'lose') message = 'Bubbles crossed the line';
      }
      // drain the engine's transient pop/drop buffers into UI fx
      if (s.popping.length) {
        for (const b of s.popping) {
          if (prefs.reducedMotion) fx.current.flashes.push({ x: b.x, y: b.y, life: 1 });
          else burst(fx.current, b.x, b.y, 6, sparkColor(b.color));
        }
        s.popping.length = 0;
      }
      if (s.dropping.length) {
        for (const b of s.dropping) {
          if (!prefs.reducedMotion) fx.current.falls.push({ x: b.x, y: b.y, vy: 30 + Math.random() * 70, color: b.color, life: 1 });
        }
        s.dropping.length = 0;
      }
      const hi = Math.max(panelHiRef.current, s.best);
      if (hi > panelHiRef.current) saveHi(hi);
      panelHiRef.current = hi;
      setPanel((p) => ({ score: s.score, hi, rank: s.rank, shots: s.shotsUntilDrop, next: s.next, phase: s.phase, message: message ?? p.message }));
    },
    [sfx, prefs.reducedMotion],
  );

  // hi mirrored in a ref so syncHud can persist without depending on panel state
  const panelHiRef = useRef(panel.hi);

  const newGameNow = useCallback(() => {
    const best = Math.max(panelHiRef.current, game.current?.best ?? 0);
    game.current = newGame(undefined, best);
    fx.current = { sparks: [], falls: [], pops: [], flashes: [] };
    setPanel({ score: 0, hi: best, rank: 0, shots: game.current.shotsUntilDrop, next: game.current.next, phase: 'aim', message: 'Aim and shoot — match 3 to pop' });
  }, []);

  const doFire = useCallback(() => {
    const s = game.current!;
    if (!activeRef.current || s.phase !== 'aim') return;
    const ev: GameEvent[] = [];
    if (fire(s, ev)) syncHud(ev);
  }, [syncHud]);

  const doSwap = useCallback(() => {
    const s = game.current!;
    if (!activeRef.current || s.phase !== 'aim') return;
    const ev: GameEvent[] = [];
    swap(s, ev);
    syncHud(ev);
  }, [syncHud]);

  // keyboard — attached only while this window is the active game (§8.4 booleans)
  useEffect(() => {
    if (!active) { held.current.left = false; held.current.right = false; return; }
    canvasRef.current?.focus({ preventScroll: true });
    const down = (e: KeyboardEvent) => {
      const s = game.current!;
      switch (e.key) {
        case 'ArrowLeft': held.current.left = true; e.preventDefault(); break;
        case 'ArrowRight': held.current.right = true; e.preventDefault(); break;
        case ' ': case 'ArrowUp': doFire(); e.preventDefault(); break;
        case 'ArrowDown': case 's': case 'S': doSwap(); e.preventDefault(); break;
        case 'Enter': if (s.phase === 'won' || s.phase === 'lost') { newGameNow(); e.preventDefault(); } break;
        default: break;
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') held.current.left = false;
      if (e.key === 'ArrowRight') held.current.right = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [active, doFire, doSwap, newGameNow]);

  const toEngine = (e: ReactPointerEvent<HTMLCanvasElement>): { x: number; y: number } => {
    const rect = e.currentTarget.getBoundingClientRect();
    const v = view.current;
    return {
      x: ((e.clientX - rect.left) * v.dpr - v.ox) / v.scale,
      y: ((e.clientY - rect.top) * v.dpr - v.oy) / v.scale,
    };
  };

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLCanvasElement>) => {
    const s = game.current!;
    if (!activeRef.current || s.phase !== 'aim') return;
    const p = toEngine(e);
    if (p.y < SHOOTER_Y - 2) setAim(s, aimFromPointer(p.x, p.y)); // ignore points at/below the muzzle
  }, []);

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.focus({ preventScroll: true });
    const s = game.current!;
    if (!activeRef.current) return;
    if (s.phase === 'aim') {
      const p = toEngine(e);
      if (p.y < SHOOTER_Y - 2) setAim(s, aimFromPointer(p.x, p.y));
      doFire();
    }
  }, [doFire]);

  // the loop: aim, physics, fx, draw. No rAF while inactive (§8.4).
  useGameLoop(
    (dt) => {
      const s = game.current!;
      // held-key aim
      if (s.phase === 'aim') {
        if (held.current.left) nudgeAim(s, -AIM_RATE * dt);
        if (held.current.right) nudgeAim(s, AIM_RATE * dt);
      }
      // physics
      if (s.phase === 'fly') {
        const ev: GameEvent[] = [];
        step(s, dt, ev);
        if (ev.length) syncHud(ev);
      }
      // fx integration
      const f = fx.current;
      for (const p of f.sparks) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt * 2; }
      f.sparks = f.sparks.filter((p) => p.life > 0);
      for (const p of f.falls) { p.vy += 1400 * dt; p.y += p.vy * dt; p.life -= dt * 1.8; }
      f.falls = f.falls.filter((p) => p.life > 0 && p.y < FIELD_H + 40);
      for (const p of f.pops) { p.y -= dt * 26; p.life -= dt * 0.9; }
      f.pops = f.pops.filter((p) => p.life > 0);
      for (const p of f.flashes) p.life -= dt * 4;
      f.flashes = f.flashes.filter((p) => p.life > 0);

      draw(s, f);
    },
    active,
  );

  const draw = useCallback((s: BubbleState, f: Fx) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) {
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
    }
    const scale = Math.min(canvas.width / FIELD_W, canvas.height / FIELD_H);
    const ox = (canvas.width - FIELD_W * scale) / 2;
    const oy = (canvas.height - FIELD_H * scale) / 2;
    view.current = { scale, ox, oy, dpr };

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#8b96c8'; // letterbox surround
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, ox, oy);

    // field
    const bg = ctx.createLinearGradient(0, 0, 0, FIELD_H);
    bg.addColorStop(0, '#d5dcf5'); bg.addColorStop(1, '#c2caee');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, FIELD_W, FIELD_H);

    // danger line (dashed) — pulses when threatened unless reduced-motion
    let threatened = false;
    for (let r = ROWS_MAX - 1; r >= 0 && !threatened; r--) {
      const n = colsInRow(s, r);
      for (let c = 0; c < n; c++) if (s.grid[r][c] !== EMPTY && cellToPixel(s, r, c).y + R >= DANGER_Y - D) { threatened = true; break; }
    }
    const pulse = threatened && !prefs.reducedMotion ? 0.5 + 0.35 * Math.sin(performance.now() / 120) : 0.5;
    ctx.strokeStyle = `rgba(214,60,60,${threatened ? pulse : 0.42})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([9, 7]);
    ctx.beginPath(); ctx.moveTo(0, DANGER_Y); ctx.lineTo(FIELD_W, DANGER_Y); ctx.stroke();
    ctx.setLineDash([]);

    // settled bubbles
    for (let r = 0; r < ROWS_MAX; r++) {
      const n = colsInRow(s, r);
      for (let c = 0; c < n; c++) {
        const col = s.grid[r][c];
        if (col === EMPTY) continue;
        const p = cellToPixel(s, r, c);
        ctx.drawImage(spriteFor(col), p.x - R, p.y - R, D, D);
      }
    }

    // falling (dropped) bubbles
    for (const p of f.falls) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.drawImage(spriteFor(p.color), p.x - R, p.y - R, D, D);
    }
    ctx.globalAlpha = 1;

    // aim guide — a SHORT dotted stub from the muzzle in the aim direction (classic style), not a
    // full measured multi-bounce trajectory
    if (s.phase === 'aim') {
      const len = D * 3.4;
      const sx = SHOOTER_X + Math.sin(s.angle) * R;
      const sy = SHOOTER_Y - Math.cos(s.angle) * R;
      const ex = SHOOTER_X + Math.sin(s.angle) * (R + len);
      const ey = SHOOTER_Y - Math.cos(s.angle) * (R + len);
      ctx.strokeStyle = 'rgba(40,48,90,0.55)';
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      if (!prefs.reducedMotion) ctx.setLineDash([2, 8]);
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.setLineDash([]);
    }

    // in-flight shot (+ short trail unless reduced-motion)
    if (s.shot) {
      if (!prefs.reducedMotion) {
        ctx.globalAlpha = 0.3;
        ctx.drawImage(spriteFor(s.shot.color), s.shot.x - R - s.shot.vx * 0.008, s.shot.y - R - s.shot.vy * 0.008, D, D);
        ctx.globalAlpha = 1;
      }
      ctx.drawImage(spriteFor(s.shot.color), s.shot.x - R, s.shot.y - R, D, D);
    }

    // shooter cannon
    ctx.save();
    ctx.translate(SHOOTER_X, SHOOTER_Y);
    ctx.rotate(s.angle);
    ctx.fillStyle = '#3a4270';
    ctx.fillRect(-6, -R - 12, 12, R + 14); // barrel points along the aim
    ctx.restore();
    ctx.fillStyle = '#2b3157';
    ctx.beginPath(); ctx.arc(SHOOTER_X, SHOOTER_Y, R + 7, Math.PI, 2 * Math.PI); ctx.fill(); // base hood
    if (s.phase === 'aim' || s.phase === 'fly') {
      const loaded = s.phase === 'fly' && s.shot ? s.next : s.current;
      ctx.drawImage(spriteFor(loaded), SHOOTER_X - R, SHOOTER_Y - R, D, D);
    }
    // next-bubble preview beside the shooter
    ctx.fillStyle = 'rgba(43,49,87,0.5)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('NEXT', SHOOTER_X + 58, SHOOTER_Y - 20);
    ctx.textAlign = 'left';
    ctx.drawImage(spriteFor(s.next), SHOOTER_X + 58 - 12, SHOOTER_Y - 12, 24, 24);

    // pop flashes (reduced-motion)
    for (const p of f.flashes) {
      ctx.strokeStyle = `rgba(255,255,255,${p.life})`;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(p.x, p.y, R * (1 + (1 - p.life)), 0, 7); ctx.stroke();
    }
    // sparks
    ctx.globalCompositeOperation = 'lighter';
    for (const p of f.sparks) {
      ctx.fillStyle = p.color.replace('%a', String(Math.max(0, p.life * 0.9)));
      ctx.fillRect(p.x - 1.4, p.y - 1.4, 2.8, 2.8);
    }
    ctx.globalCompositeOperation = 'source-over';
    // score popups
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    for (const p of f.pops) {
      ctx.fillStyle = p.color.replace('%a', String(Math.max(0, p.life)));
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.textAlign = 'left';
  }, [prefs.reducedMotion, spriteFor]);

  const rank = panel.rank;
  const rankFloor = RANK_AT[rank];
  const rankCeil = RANK_AT[Math.min(rank + 1, RANK_AT.length - 1)];
  const rankPct = rank >= RANK_AT.length - 1 ? 100 : Math.round(((panel.score - rankFloor) / Math.max(1, rankCeil - rankFloor)) * 100);

  return (
    <div className="bubble">
      <div className="bubble__stage">
        <canvas
          ref={canvasRef}
          className="bubble__canvas"
          tabIndex={0}
          onPointerMove={onPointerMove}
          onPointerDown={onPointerDown}
          aria-label="Bubble Shooter — arrow keys or pointer to aim, Space or Up to fire, S or Down to swap the next bubble, Enter for a new game after a win or loss"
          aria-describedby="bubble-keys"
        />
        {!active && (
          <div className="bubble__overlay">
            <strong>PAUSED</strong>
            <span>Click the window to resume</span>
          </div>
        )}
        {active && panel.phase === 'won' && (
          <div className="bubble__overlay">
            <strong>YOU WIN!</strong>
            <span>Board cleared — score {panel.score.toLocaleString('en')}</span>
            <button type="button" onClick={newGameNow}>▶ New game (Enter)</button>
          </div>
        )}
        {active && panel.phase === 'lost' && (
          <div className="bubble__overlay">
            <strong>GAME OVER</strong>
            <span>Score {panel.score.toLocaleString('en')}</span>
            <button type="button" onClick={newGameNow}>▶ New game (Enter)</button>
          </div>
        )}
      </div>
      <aside className="bubble__panel">
        <h3>BUBBLE SHOOTER</h3>
        <div className="bubble__score">{panel.score.toLocaleString('en')}</div>
        <dl>
          <dt>High score</dt><dd>{panel.hi.toLocaleString('en')}</dd>
          <dt>Rank</dt><dd>{RANKS[panel.rank]}</dd>
          <dt>Next drop</dt><dd>{panel.shots} shot{panel.shots === 1 ? '' : 's'}</dd>
          <dt>Next</dt><dd><span className="bubble__swatch" style={{ background: COLORS[panel.next] }} /></dd>
        </dl>
        <div className="bubble__rankbar" aria-hidden="true"><span style={{ width: `${rankPct}%` }} /></div>
        <p className="bubble__msg">{panel.message}</p>
        <p className="bubble__keys" id="bubble-keys">
          <b>move</b> / <b>&larr; &rarr;</b> aim · <b>click</b> / <b>Space</b> fire<br />
          <b>S</b> / <b>&darr;</b> swap next · <b>Enter</b> new game<br />
          match 3+ of a colour to pop · drop clumps for bonus<br />
          don’t let bubbles cross the red line
        </p>
        <button type="button" className="bubble__restart" onClick={newGameNow}>Restart</button>
      </aside>
      <div className="sr-only" aria-live="polite">
        {panel.phase === 'won'
          ? `You win! Final score ${panel.score}`
          : panel.phase === 'lost'
            ? `Game over. Final score ${panel.score}`
            : panel.message}
      </div>
    </div>
  );
}
