// Sky Hopper — DominikOS's fifth game (kind:'react' via componentById, plan §8.4/§8.6). A
// one-button flap-through-the-gaps game over the deterministic ./engine. Pure-canvas render +
// input; §8.4 pause via useGameLoop (no rAF while unfocused/minimized/hidden). Bird, pipes,
// ground, clouds and medals are all drawn in code — nothing sampled or copied.
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { AppProps } from '../../types';
import { useOSStore } from '../../store/osStore';
import { usePageVisible } from '../../hooks/usePageVisible';
import { useGameLoop } from '../../hooks/useGameLoop';
import { useSystem } from '../../context/SystemContext';
import { tone } from '../../sound';
import {
  newGame, flap, step, pipeRects, medalFor,
  FIELD_W, FIELD_H, GROUND_Y, BIRD_X, PIPE_W, DEAD_REVEAL_S, MEDALS,
  type FlappyState, type GameEvent, type Pipe,
} from './engine';

const HI_KEY = 'dmos.v1.flappy';
const MEDAL_COLORS = ['#cd7f32', '#c0c0c0', '#ffd54a', '#8fe3d9']; // bronze, silver, gold, platinum
// Canvas ctx.font is NOT CSS — it cannot resolve var(--font-ui); use the concrete stack directly.
const FONT = '"Trebuchet MS", "Segoe UI", Tahoma, "DejaVu Sans", sans-serif';

function loadHi(): number {
  try { return (JSON.parse(localStorage.getItem(HI_KEY) ?? '{}') as { hi?: number }).hi ?? 0; } catch { return 0; }
}
function saveHi(hi: number): void {
  try { localStorage.setItem(HI_KEY, JSON.stringify({ hi })); } catch { /* stateless is fine */ }
}

interface Feather { x: number; y: number; vx: number; vy: number; life: number; rot: number }
interface Fx { feathers: Feather[]; flash: number; shake: number }
interface Panel { phase: FlappyState['phase']; showCard: boolean; score: number; best: number; medal: number; newBest: boolean; live: string }

/* --------------------------------- drawing -------------------------------- */
// Pixel-art helpers. Sprites are string grids; each char maps to a colour via a palette. Cells
// draw as slightly-overlapping fillRects so fractional letterbox scaling leaves no seams. All
// original art — an XP-era pixel bird game; nothing sampled from any sprite sheet.

const BIRD_PAL: Record<string, string> = {
  K: '#5c3d0a', Y: '#ffd23e', H: '#fff0a8', S: '#e0a41c',
  G: '#f2a81f', E: '#ffffff', P: '#222222', B: '#ff8a2a', b: '#d96a12',
};
// two flap frames (wing high / wing low), 13x10, facing right
const BIRD_A = [
  '   KKKKK     ',
  '  KHHHHK     ',
  ' KHYYYYEEK   ',
  ' KHYYYYEPK   ',
  ' KYGGGYYKBB  ',
  ' KYGGGYSKBb  ',
  ' KYYYSSSK    ',
  '  KSSSSSK    ',
  '   KKKKK     ',
  '             ',
];
const BIRD_B = [
  '   KKKKK     ',
  '  KHHHHK     ',
  ' KHYYYYEEK   ',
  ' KHYYYYEPK   ',
  ' KYYYYYYKBB  ',
  ' KYGGGYSKBb  ',
  ' KYGGGSSK    ',
  '  KSSSSSK    ',
  '   KKKKK     ',
  '             ',
];
const CLOUD = ['  WW  ', ' WWWW ', 'WWWWWW', 'WWWWWW'];
const DIGITS: Record<string, string[]> = {
  '0': ['111', '101', '101', '101', '111'], '1': ['010', '110', '010', '010', '111'],
  '2': ['111', '001', '111', '100', '111'], '3': ['111', '001', '111', '001', '111'],
  '4': ['101', '101', '111', '001', '001'], '5': ['111', '100', '111', '001', '111'],
  '6': ['111', '100', '111', '101', '111'], '7': ['111', '001', '010', '010', '010'],
  '8': ['111', '101', '111', '101', '111'], '9': ['111', '101', '111', '001', '111'],
};
const PIPE_BODY = '#6fae3f', PIPE_LIT = '#a6dc68', PIPE_DARK = '#4a8a2c', PIPE_LINE = '#2f5e1c';

function drawGrid(ctx: CanvasRenderingContext2D, grid: string[], pal: Record<string, string>, ox: number, oy: number, px: number): void {
  for (let r = 0; r < grid.length; r++) {
    const row = grid[r];
    for (let c = 0; c < row.length; c++) {
      const col = pal[row[c]];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(ox + c * px, oy + r * px, px + 0.6, px + 0.6);
    }
  }
}

function drawBird(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, wingDown: boolean): void {
  const px = 2.7;
  const sprite = wingDown ? BIRD_B : BIRD_A;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  drawGrid(ctx, sprite, BIRD_PAL, (-sprite[0].length * px) / 2, (-sprite.length * px) / 2, px);
  ctx.restore();
}

function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.fillStyle = '#ffffff';
  for (let r = 0; r < CLOUD.length; r++) for (let c = 0; c < CLOUD[r].length; c++) {
    if (CLOUD[r][c] === 'W') ctx.fillRect(x + c * s, y + r * s, s + 0.6, s + 0.6);
  }
}

function drawHills(ctx: CanvasRenderingContext2D, par: number, base: number): void {
  ctx.fillStyle = '#8fc46a'; // far hills (XP rolling-green vibe)
  for (let i = 0; i < 5; i++) {
    const x = ((i * 130 - par * 0.35) % (FIELD_W + 130) + FIELD_W + 130) % (FIELD_W + 130) - 65;
    ctx.beginPath(); ctx.arc(x, base, 56, Math.PI, 2 * Math.PI); ctx.fill();
  }
  ctx.fillStyle = '#6fae43'; // near hills
  for (let i = 0; i < 5; i++) {
    const x = ((i * 104 + 50 - par * 0.6) % (FIELD_W + 104) + FIELD_W + 104) % (FIELD_W + 104) - 52;
    ctx.beginPath(); ctx.arc(x, base + 10, 44, Math.PI, 2 * Math.PI); ctx.fill();
  }
}

function pipeCol(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  if (h <= 0) return;
  ctx.fillStyle = PIPE_BODY; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = PIPE_LIT; ctx.fillRect(x + 4, y, 5, h);
  ctx.fillStyle = PIPE_DARK; ctx.fillRect(x + w - 9, y, 5, h);
  ctx.fillStyle = PIPE_LINE; ctx.fillRect(x, y, 3, h); ctx.fillRect(x + w - 3, y, 3, h);
}

function pipeLip(ctx: CanvasRenderingContext2D, pipeX: number, capTop: number): void {
  const w = PIPE_W + 12, h = 22, x = pipeX - 6, y = capTop;
  ctx.fillStyle = PIPE_BODY; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = PIPE_LIT; ctx.fillRect(x + 5, y + 3, 6, h - 6);
  ctx.fillStyle = PIPE_DARK; ctx.fillRect(x + w - 11, y + 3, 6, h - 6);
  ctx.fillStyle = PIPE_LINE;
  ctx.fillRect(x, y, w, 3); ctx.fillRect(x, y + h - 3, w, 3); ctx.fillRect(x, y, 3, h); ctx.fillRect(x + w - 3, y, 3, h);
}

function drawPipe(ctx: CanvasRenderingContext2D, p: Pipe): void {
  const { top, bottom } = pipeRects(p);
  pipeCol(ctx, top.x, top.y, top.w, top.h - 22);
  pipeLip(ctx, p.x, top.h - 22);
  pipeCol(ctx, bottom.x, bottom.y + 22, bottom.w, bottom.h - 22);
  pipeLip(ctx, p.x, bottom.y);
}

function drawPixelNumber(ctx: CanvasRenderingContext2D, n: number, cx: number, topY: number, ps: number): void {
  const str = String(n);
  const dw = 3 * ps;
  const total = str.length * dw + (str.length - 1) * ps;
  let x = Math.round(cx - total / 2);
  for (const ch of str) {
    const g = DIGITS[ch];
    if (g) {
      for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (g[r][c] === '1') {
        ctx.fillStyle = '#26456e'; ctx.fillRect(x + c * ps + ps * 0.35, topY + r * ps + ps * 0.35, ps + 0.6, ps + 0.6);
      }
      for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (g[r][c] === '1') {
        ctx.fillStyle = '#ffffff'; ctx.fillRect(x + c * ps, topY + r * ps, ps + 0.6, ps + 0.6);
      }
    }
    x += dw + ps;
  }
}

/* -------------------------------- component ------------------------------- */

export default function FlappyApp({ windowId, focused }: AppProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const game = useRef<FlappyState>();
  if (!game.current) game.current = newGame(undefined, loadHi());
  const fx = useRef<Fx>({ feathers: [], flash: 0, shake: 0 });
  const prevBest = useRef(game.current.best);
  const cardShown = useRef(false);

  const visible = usePageVisible();
  const minimized = useOSStore((st) => st.windows[windowId]?.state === 'minimized');
  const { prefs } = useSystem();
  const active = focused && visible && !minimized;
  const activeRef = useRef(active);
  activeRef.current = active;

  const [panel, setPanel] = useState<Panel>(() => ({
    phase: 'ready', showCard: false, score: 0, best: game.current!.best, medal: -1, newBest: false,
    live: 'Sky Hopper ready. Press Space or Up to flap.',
  }));

  const sfx = useCallback(
    (e: GameEvent) => {
      if (prefs.muted) return;
      switch (e.type) {
        case 'flap': tone(0, 620, 0.06, 0.05, 'square'); break;
        case 'score': tone(0, 880, 0.05, 0.06); tone(0.05, 1175, 0.07, 0.06); break;
        case 'hit': tone(0, 180, 0.1, 0.07, 'sawtooth'); break;
        case 'die': tone(0, 200, 0.18, 0.06, 'sawtooth'); tone(0.14, 130, 0.3, 0.06, 'sawtooth'); break;
        case 'land': tone(0, 150, 0.08, 0.05, 'sawtooth'); break;
        default: break;
      }
    },
    [prefs.muted],
  );

  const syncHud = useCallback(
    (events: GameEvent[]) => {
      if (events.length === 0) return;
      const s = game.current!;
      for (const e of events) {
        sfx(e);
        if (e.type === 'start') setPanel((p) => ({ ...p, phase: 'play', live: 'Game started.' }));
        if (e.type === 'score') setPanel((p) => ({ ...p, score: e.value, live: `Score ${e.value}` }));
        if (e.type === 'hit' && !prefs.reducedMotion) {
          fx.current.flash = 0.15;
          fx.current.shake = 0.32;
          for (let i = 0; i < 10; i++) {
            const a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 160;
            fx.current.feathers.push({ x: e.x, y: e.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, life: 1, rot: Math.random() * 6 });
          }
        }
        if (e.type === 'die') {
          const medal = medalFor(e.value);
          const beat = s.best > prevBest.current && e.value >= s.best;
          if (s.best > prevBest.current) { saveHi(s.best); prevBest.current = s.best; }
          setPanel((p) => ({
            ...p, phase: 'dead', showCard: false, score: e.value, best: s.best, medal, newBest: beat,
            live: `Game over. Score ${e.value}, best ${s.best}${medal >= 0 ? `, ${MEDALS[medal]} medal` : ''}. Press Enter to retry.`,
          }));
        }
      }
    },
    [sfx, prefs.reducedMotion],
  );

  const newGameNow = useCallback(() => {
    const best = Math.max(prevBest.current, game.current?.best ?? 0);
    game.current = newGame(undefined, best);
    fx.current = { feathers: [], flash: 0, shake: 0 };
    cardShown.current = false;
    prevBest.current = best;
    setPanel({ phase: 'ready', showCard: false, score: 0, best, medal: -1, newBest: false, live: 'New game ready. Press Space or Up to flap.' });
  }, []);

  const press = useCallback(() => {
    const s = game.current!;
    if (!activeRef.current) return;
    if (s.phase === 'dead') { if (s.deadT >= DEAD_REVEAL_S) newGameNow(); return; }
    const ev: GameEvent[] = [];
    flap(s, ev);
    syncHud(ev);
  }, [syncHud, newGameNow]);

  // keyboard — attached only while this window is the active game (§8.4 booleans)
  useEffect(() => {
    if (!active) return;
    canvasRef.current?.focus({ preventScroll: true });
    const down = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === ' ' || e.key === 'ArrowUp') { press(); e.preventDefault(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); }
      else if (e.key === 'Enter') { if (game.current!.phase === 'dead' && game.current!.deadT >= DEAD_REVEAL_S) { newGameNow(); e.preventDefault(); } }
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, [active, press, newGameNow]);

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.focus({ preventScroll: true });
    press();
  }, [press]);

  const draw = useCallback((s: FlappyState, f: Fx) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) {
      canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    }
    const scale = Math.min(canvas.width / FIELD_W, canvas.height / FIELD_H);
    let ox = (canvas.width - FIELD_W * scale) / 2;
    let oy = (canvas.height - FIELD_H * scale) / 2;
    if (f.shake > 0 && !prefs.reducedMotion) {
      ox += (Math.random() - 0.5) * f.shake * 26 * scale;
      oy += (Math.random() - 0.5) * f.shake * 26 * scale;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#4b93da';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, ox, oy);
    ctx.imageSmoothingEnabled = false; // keep the pixels crisp

    // XP sky
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    sky.addColorStop(0, '#4b93da'); sky.addColorStop(1, '#c7e6fb');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, FIELD_W, GROUND_Y);

    const par = prefs.reducedMotion ? 0 : s.distance;
    // pixel clouds
    for (let i = 0; i < 4; i++) {
      const cx = ((i * 150 + 40 - par * 0.25) % (FIELD_W + 130) + FIELD_W + 130) % (FIELD_W + 130) - 65;
      drawCloud(ctx, cx, 44 + (i % 2) * 40, 6);
    }
    // XP rolling hills
    drawHills(ctx, par, GROUND_Y);

    // pipes
    for (const p of s.pipes) drawPipe(ctx, p);

    // pixel ground: dirt base, grass cap, scrolling grass blades + dirt speckles
    ctx.fillStyle = '#c9a24e'; ctx.fillRect(0, GROUND_Y + 10, FIELD_W, FIELD_H - GROUND_Y - 10);
    ctx.fillStyle = '#5f9e37'; ctx.fillRect(0, GROUND_Y, FIELD_W, 10);
    ctx.fillStyle = '#3f6e22'; ctx.fillRect(0, GROUND_Y - 2, FIELD_W, 2);
    ctx.fillStyle = '#7ecb45';
    const goff = (s.distance % 12 + 12) % 12;
    for (let x = -goff; x < FIELD_W; x += 12) ctx.fillRect(x, GROUND_Y, 6, 4);
    ctx.fillStyle = '#b08a3e';
    const doff = (s.distance % 24 + 24) % 24;
    for (let x = -doff; x < FIELD_W; x += 24) { ctx.fillRect(x, GROUND_Y + 20, 8, 4); ctx.fillRect(x + 12, GROUND_Y + 34, 8, 4); }

    // bird (2-frame pixel flap; static wing when paused/dead or reduced-motion)
    const wingDown = !prefs.reducedMotion && s.phase !== 'dead' && Math.floor(s.time * 9) % 2 === 0;
    drawBird(ctx, BIRD_X, s.bird.y, s.bird.angle, wingDown);

    // feathers
    for (const ft of f.feathers) {
      ctx.save(); ctx.translate(ft.x, ft.y); ctx.rotate(ft.rot);
      ctx.globalAlpha = Math.max(0, ft.life); ctx.fillStyle = '#fff4b0';
      ctx.beginPath(); ctx.ellipse(0, 0, 4, 2, 0, 0, 7); ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    // score during play (pixel digits, top-center)
    if (s.phase === 'play') {
      drawPixelNumber(ctx, s.score, FIELD_W / 2, 40, prefs.largeText ? 9 : 8);
    }

    // ready hint
    if (s.phase === 'ready') {
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.textAlign = 'center';
      ctx.font = `bold 20px ${FONT}`;
      ctx.fillText('GET READY', FIELD_W / 2, 210);
      ctx.font = `13px ${FONT}`;
      ctx.fillText('Tap / Space / Up to flap', FIELD_W / 2, 236);
      // up arrow
      const ay = 300 + (prefs.reducedMotion ? 0 : Math.sin(s.time * 4) * 6);
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(FIELD_W / 2, ay + 22); ctx.lineTo(FIELD_W / 2, ay - 14); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(FIELD_W / 2 - 10, ay - 4); ctx.lineTo(FIELD_W / 2, ay - 16); ctx.lineTo(FIELD_W / 2 + 10, ay - 4); ctx.stroke();
      ctx.textAlign = 'left';
    }

    // hit flash
    if (f.flash > 0 && !prefs.reducedMotion) {
      ctx.setTransform(scale, 0, 0, scale, (canvas.width - FIELD_W * scale) / 2, (canvas.height - FIELD_H * scale) / 2);
      ctx.fillStyle = `rgba(255,255,255,${Math.min(0.9, f.flash / 0.15 * 0.9)})`;
      ctx.fillRect(0, 0, FIELD_W, FIELD_H);
    }
  }, [prefs.reducedMotion, prefs.largeText]);

  // the loop: step + fx + draw. No rAF while inactive (§8.4).
  useGameLoop(
    (dt) => {
      const s = game.current!;
      const ev: GameEvent[] = [];
      step(s, dt, ev);
      if (ev.length) syncHud(ev);
      // reveal the scorecard once the death settle delay elapses
      if (s.phase === 'dead' && !cardShown.current && s.deadT >= DEAD_REVEAL_S) {
        cardShown.current = true;
        setPanel((p) => ({ ...p, showCard: true }));
      }
      const f = fx.current;
      for (const ft of f.feathers) { ft.vy += 240 * dt; ft.x += ft.vx * dt; ft.y += ft.vy * dt; ft.rot += dt * 4; ft.life -= dt * 1.2; }
      f.feathers = f.feathers.filter((ft) => ft.life > 0);
      if (f.flash > 0) f.flash = Math.max(0, f.flash - dt);
      if (f.shake > 0) f.shake = Math.max(0, f.shake - dt);
      draw(s, f);
    },
    active,
  );

  const medalColor = panel.medal >= 0 ? MEDAL_COLORS[panel.medal] : null;

  return (
    <div className="flappy">
      <div className="flappy__stage">
        <canvas
          ref={canvasRef}
          className="flappy__canvas"
          tabIndex={0}
          onPointerDown={onPointerDown}
          aria-label="Sky Hopper — press Space or Up arrow to flap and start; fly through the gaps; Enter to retry after a crash."
        />
        {!active && (
          <div className="flappy__overlay">
            <strong>PAUSED</strong>
            <span>Click the window to resume</span>
          </div>
        )}
        {active && panel.showCard && (
          <div className="flappy__overlay">
            <strong>GAME OVER</strong>
            <div className="flappy__card">
              <p>Score <b>{panel.score}</b></p>
              <p>Best <b>{panel.best}</b>{panel.newBest && <span className="flappy__nb"> NEW BEST!</span>}</p>
              {medalColor && (
                <div className="flappy__medal" style={{ background: `radial-gradient(circle at 38% 32%, #fff, ${medalColor} 70%)` }}>
                  {MEDALS[panel.medal][0]}
                </div>
              )}
            </div>
            <button type="button" onClick={newGameNow}>▶ Retry (Enter)</button>
          </div>
        )}
      </div>
      <div className="sr-only" aria-live="polite">{panel.live}</div>
    </div>
  );
}
