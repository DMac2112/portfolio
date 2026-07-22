// Space Pinball — DominikOS's second game, and the living proof of the §8.6 add-a-game story
// for kind:'react'. Runs in-process (no iframe/bridge); the §8.4 pause contract comes from
// useGameLoop — when the window is unfocused, minimized, or the tab is hidden, NO frame is
// scheduled.
//
// Visuals: hybrid renderer. Dominik's own generated sprite kit (Graphics/Antigravity,
// downscaled + circle-masked into public/games/pinball/) provides the table backdrop, panel
// backdrop, reactor centerpiece, bumpers, beacons, warp portal, spinner and ball; rails,
// flippers, slingshots, drop targets and all FX (trails, sparks, score popups) are drawn in
// code in the same neon palette. Every asset is original work made for this project; sounds
// are synthesized. If any sprite fails to load the code-drawn fallback takes over.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AppProps } from '../../types';
import { useOSStore } from '../../store/osStore';
import { usePageVisible } from '../../hooks/usePageVisible';
import { useGameLoop } from '../../hooks/useGameLoop';
import { useSystem } from '../../context/SystemContext';
import { tone } from '../../sound';
import {
  createPinball, newGame, step, setFlipper, chargePlunger, releasePlunger,
  RANKS, TABLE_W, TABLE_H, DOME,
  type GameEvent, type PinballState,
} from './physics';

const HI_KEY = 'dmos.v1.pinball';
const ASSETS = '/os/games/pinball';

const CYAN = '#69e6ff';
const MAGENTA = '#ff5ad0';
const MAGENTA_GLOW = 'rgba(224,47,174,';
const AMBER = '#ffcf6b';

function loadHi(): number {
  try { return (JSON.parse(localStorage.getItem(HI_KEY) ?? '{}') as { hi?: number }).hi ?? 0; } catch { return 0; }
}
function saveHi(hi: number): void {
  try { localStorage.setItem(HI_KEY, JSON.stringify({ hi })); } catch { /* stateless is fine */ }
}

interface Panel {
  score: number; hi: number; balls: number; rank: number; lit: number; mult: number;
  phase: PinballState['phase']; message: string;
}

interface Spark { x: number; y: number; vx: number; vy: number; life: number; color: string }
interface Popup { x: number; y: number; text: string; life: number; color: string }
interface TrailDot { x: number; y: number; life: number }

interface Fx { sparks: Spark[]; pops: Popup[]; trail: TrailDot[] }

const SPRITE_NAMES = [
  'table-bg', 'panel-bg', 'ball', 'bumper', 'bumper-hit',
  'beacon-off', 'beacon-lit', 'warp', 'warp-active', 'spinner', 'reactor',
] as const;
type SpriteName = (typeof SPRITE_NAMES)[number];

/* ------------------------------ fx helpers ----------------------------- */

function burst(fx: Fx, x: number, y: number, n: number, color: string): void {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 60 + Math.random() * 220;
    fx.sparks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, life: 1, color });
  }
  if (fx.sparks.length > 160) fx.sparks.splice(0, fx.sparks.length - 160);
}

function popup(fx: Fx, x: number, y: number, text: string, color: string): void {
  fx.pops.push({ x: Math.max(30, Math.min(TABLE_W - 40, x)), y, text, life: 1, color });
  if (fx.pops.length > 10) fx.pops.splice(0, fx.pops.length - 10);
}

/** layered neon stroke — cheap glow without per-frame shadowBlur */
function neonPath(ctx: CanvasRenderingContext2D, path: () => void, glow: string, core: string, w: number): void {
  ctx.lineCap = 'round';
  ctx.strokeStyle = `${glow}.16)`;
  ctx.lineWidth = w * 3.4;
  ctx.beginPath(); path(); ctx.stroke();
  ctx.strokeStyle = `${glow}.42)`;
  ctx.lineWidth = w * 1.9;
  ctx.beginPath(); path(); ctx.stroke();
  ctx.strokeStyle = core;
  ctx.lineWidth = w;
  ctx.beginPath(); path(); ctx.stroke();
}

/* ------------------------------ static layer --------------------------- */

function drawStatic(ctx: CanvasRenderingContext2D, s: PinballState, img: Partial<Record<SpriteName, HTMLImageElement>>): void {
  // backdrop: Dominik's circuit-grid table art, else the code-drawn space fallback
  const bg = img['table-bg'];
  if (bg) {
    ctx.drawImage(bg, 0, 0, TABLE_W, TABLE_H);
    ctx.fillStyle = 'rgba(4,7,26,.30)'; // dim for playfield contrast
    ctx.fillRect(0, 0, TABLE_W, TABLE_H);
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, TABLE_H);
    g.addColorStop(0, '#0a0f2e'); g.addColorStop(0.6, '#101b46'); g.addColorStop(1, '#0a0f2e');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, TABLE_W, TABLE_H);
    ctx.fillStyle = '#cfe0fb';
    for (let i = 0; i < 70; i++) {
      ctx.globalAlpha = 0.2 + ((i * 13) % 10) / 14;
      ctx.beginPath(); ctx.arc((i * 97) % TABLE_W, (i * 61) % TABLE_H, 0.7 + ((i * 7) % 9) / 8, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // edge vignette pulls the eye inward
  const vg = ctx.createRadialGradient(210, 330, 190, 210, 350, 430);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(2,4,18,.55)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, TABLE_W, TABLE_H);

  // reactor centerpiece high in the dome (decor — the warp gate sits beside it)
  const reactor = img['reactor'];
  if (reactor) {
    ctx.globalAlpha = 0.92;
    ctx.drawImage(reactor, 210 - 59, 104 - 59, 118, 118);
    ctx.globalAlpha = 1;
  } else {
    const pg = ctx.createRadialGradient(210, 104, 8, 210, 104, 54);
    pg.addColorStop(0, '#6fd0c3'); pg.addColorStop(0.7, '#2b6ea8'); pg.addColorStop(1, 'rgba(20,50,100,0)');
    ctx.fillStyle = pg;
    ctx.beginPath(); ctx.arc(210, 104, 54, 0, 7); ctx.fill();
  }

  // rails — heavy glow is fine here (drawn once per resize)
  ctx.lineCap = 'round';
  for (const w of s.walls) {
    if (w.sling) continue;
    const magenta = w.hue === 'magenta';
    ctx.shadowColor = magenta ? '#e02fae' : '#3fd6f0';
    ctx.shadowBlur = 9;
    ctx.strokeStyle = magenta ? MAGENTA : CYAN;
    ctx.lineWidth = magenta ? 3.4 : 4;
    ctx.beginPath(); ctx.moveTo(w.x1, w.y1); ctx.lineTo(w.x2, w.y2); ctx.stroke();
  }
  ctx.shadowBlur = 0;

  // launch-tube hints
  ctx.fillStyle = 'rgba(255,207,107,.5)';
  ctx.font = 'bold 15px monospace';
  ctx.fillText('▲', 386, 330);
  ctx.fillText('▲', 386, 410);

  // drain grill between the flipper tips
  ctx.strokeStyle = 'rgba(105,230,255,.28)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(186 + i * 12, 688);
    ctx.lineTo(182 + i * 12, 700);
    ctx.stroke();
  }
}

/* ------------------------------ dynamic layer -------------------------- */

function drawDynamic(
  ctx: CanvasRenderingContext2D,
  s: PinballState,
  img: Partial<Record<SpriteName, HTMLImageElement>>,
  fx: Fx,
  spinnerAngle: number,
): void {
  const t = s.time;

  // orbit chevrons marching through the loop channel
  const midR = (DOME.r + DOME.innerR) / 2;
  ctx.fillStyle = 'rgba(105,230,255,.6)';
  for (let i = 0; i < 3; i++) {
    const p = (t * 0.22 + i / 3) % 1;
    const a = Math.PI + p * (Math.PI * 0.55);
    const cx = DOME.cx + midR * Math.cos(a);
    const cy = DOME.cy + midR * Math.sin(a);
    const tang = a + Math.PI / 2; // travel direction (counter-clockwise in canvas space)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(tang);
    ctx.globalAlpha = 0.35 + 0.3 * Math.sin(t * 5 + i * 2);
    ctx.beginPath();
    ctx.moveTo(7, 0); ctx.lineTo(-4, -6); ctx.lineTo(-4, 6);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  // slingshot faces
  for (const w of s.walls) {
    if (!w.sling) continue;
    const f = w.flash ?? 0;
    neonPath(ctx, () => { ctx.moveTo(w.x1, w.y1); ctx.lineTo(w.x2, w.y2); }, MAGENTA_GLOW, f > 0.1 ? '#ffe8fb' : MAGENTA, 4 + f * 3);
  }

  // D-E-V drop-target bank
  for (const d of s.dropTargets) {
    const cy = (d.y1 + d.y2) / 2;
    if (d.up) {
      ctx.fillStyle = 'rgba(20,10,40,.85)';
      ctx.fillRect(d.x - 4, d.y1, 9, d.y2 - d.y1);
      neonPath(ctx, () => { ctx.moveTo(d.x + 1, d.y1); ctx.lineTo(d.x + 1, d.y2); }, MAGENTA_GLOW, d.flash > 0.1 ? '#fff' : MAGENTA, 2.6);
      ctx.fillStyle = d.flash > 0.1 ? '#fff' : '#ffb3ea';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(d.label, d.x - 9, cy + 4);
      ctx.textAlign = 'left';
    } else {
      ctx.strokeStyle = 'rgba(255,90,208,.25)';
      ctx.lineWidth = 2;
      ctx.strokeRect(d.x - 3, d.y2 - 4, 7, 4); // collapsed stub
    }
  }

  // reactor-pod bumpers (sprite crossfades to the hit frame on flash)
  for (const b of s.bumpers) {
    const size = (b.r * 2 + 6) * (1 + b.flash * 0.12);
    const idle = img['bumper'];
    const hit = img['bumper-hit'];
    if (idle) {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(Math.sin(t * 0.6 + b.x) * 0.05);
      ctx.drawImage(idle, -size / 2, -size / 2, size, size);
      if (hit && b.flash > 0.05) {
        ctx.globalAlpha = Math.min(1, b.flash * 1.4);
        ctx.drawImage(hit, -size / 2, -size / 2, size, size);
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    } else {
      const rg = ctx.createRadialGradient(b.x - 5, b.y - 6, 3, b.x, b.y, b.r);
      rg.addColorStop(0, b.flash ? '#fff6cf' : '#c99df5');
      rg.addColorStop(0.7, b.flash ? '#ffcf6b' : '#7a4fd0');
      rg.addColorStop(1, '#3a2470');
      ctx.fillStyle = rg;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill();
    }
    if (b.flash > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(255,220,140,${b.flash * 0.8})`;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 4 + (1 - b.flash) * 16, 0, 7); ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  // mission beacons
  for (const l of s.lights) {
    const sp = l.lit ? img['beacon-lit'] : img['beacon-off'];
    const size = l.r * 2 + 6;
    if (sp) {
      ctx.drawImage(sp, l.x - size / 2, l.y - size / 2, size, size);
    } else {
      ctx.fillStyle = l.lit ? '#7fe08a' : 'rgba(127,224,138,.16)';
      ctx.beginPath(); ctx.arc(l.x, l.y, l.r, 0, 7); ctx.fill();
    }
    if (l.lit) {
      ctx.strokeStyle = 'rgba(127,224,138,.85)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 6]);
      ctx.lineDashOffset = -t * 26;
      ctx.beginPath(); ctx.arc(l.x, l.y, l.r + 5, 0, 7); ctx.stroke();
      ctx.setLineDash([]);
    }
    if (l.flash > 0) {
      ctx.strokeStyle = `rgba(200,255,210,${l.flash})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(l.x, l.y, l.r + 3 + (1 - l.flash) * 14, 0, 7); ctx.stroke();
    }
  }

  // orbit spinner
  {
    const sp = s.spinner;
    const size = sp.r * 2 + 4;
    ctx.save();
    ctx.translate(sp.x, sp.y);
    ctx.rotate(spinnerAngle);
    // spin foreshortening — the classic flat-bar spinner illusion
    ctx.scale(1, Math.max(0.22, Math.abs(Math.cos(spinnerAngle * 2.4))));
    const spImg = img['spinner'];
    if (spImg) ctx.drawImage(spImg, -size / 2, -size / 2, size, size);
    else {
      ctx.fillStyle = sp.spin > 0.05 ? CYAN : 'rgba(105,230,255,.5)';
      ctx.fillRect(-size / 2, -3, size, 6);
    }
    ctx.restore();
    if (sp.spin > 0.05) {
      ctx.strokeStyle = `rgba(105,230,255,${sp.spin * 0.7})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(sp.x, sp.y, sp.r + 4, 0, 7); ctx.stroke();
    }
  }

  // warp gate
  {
    const w = s.warp;
    const holding = t < w.holdUntil;
    const hot = holding || t < w.cooldownUntil - 3; // freshly used
    const sp = hot ? img['warp-active'] : img['warp'];
    const size = 48 + (holding ? 6 * Math.sin(t * 14) : 0);
    ctx.save();
    ctx.translate(w.x, w.y);
    ctx.rotate(t * (holding ? 3.2 : 0.8));
    if (sp) {
      ctx.globalAlpha = t > w.cooldownUntil || holding ? 1 : 0.55; // dim while recharging
      ctx.drawImage(sp, -size / 2, -size / 2, size, size);
      ctx.globalAlpha = 1;
    } else {
      neonPath(ctx, () => ctx.arc(0, 0, size / 2 - 4, 0, Math.PI * 1.4), MAGENTA_GLOW, MAGENTA, 3);
    }
    ctx.restore();
    if (holding) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(255,120,230,${0.4 + 0.3 * Math.sin(t * 18)})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(w.x, w.y, size / 2 + 6, 0, 7); ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  // flippers — neon capsules
  for (const f of s.flippers) {
    const tx = f.px + f.len * Math.cos(f.angle);
    const ty = f.py + f.len * Math.sin(f.angle);
    const kinetic = Math.abs(f.omega) > 1;
    neonPath(
      ctx,
      () => { ctx.moveTo(f.px, f.py); ctx.lineTo(tx, ty); },
      kinetic ? 'rgba(255,220,130,' : 'rgba(247,169,68,',
      kinetic ? '#fff3d0' : AMBER,
      f.rad * 2,
    );
    ctx.fillStyle = '#ff5ad0';
    ctx.beginPath(); ctx.arc(f.px, f.py, f.rad + 1.5, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.65)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(f.px, f.py, f.rad + 1.5, 0, 7); ctx.stroke();
  }

  // plunger — energy coil
  {
    const py = s.ball.y + 12;
    const compressed = s.phase === 'ready' || s.phase === 'charging';
    const top = compressed ? Math.min(626, py) : 626;
    ctx.strokeStyle = s.phase === 'charging' ? AMBER : 'rgba(154,167,196,.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const yy = top + ((648 - top) / 5) * i;
      ctx.moveTo(382, yy); ctx.lineTo(402, yy + 3);
    }
    ctx.stroke();
    if (s.phase === 'charging') {
      const h = 90 * s.power;
      const grad = ctx.createLinearGradient(0, 640 - h, 0, 640);
      grad.addColorStop(0, '#ffe8a0'); grad.addColorStop(1, '#f7a944');
      ctx.fillStyle = grad;
      ctx.fillRect(412, 640 - h, 5, h);
      ctx.strokeStyle = 'rgba(255,207,107,.5)';
      ctx.strokeRect(412, 550, 5, 90);
    }
  }

  // ball trail (skip while warped away)
  const held = t < s.warp.holdUntil;
  if (!held) {
    ctx.globalCompositeOperation = 'lighter';
    for (const d of fx.trail) {
      ctx.fillStyle = `rgba(120,225,255,${d.life * 0.16})`;
      ctx.beginPath(); ctx.arc(d.x, d.y, s.ball.r * (0.4 + d.life * 0.6), 0, 7); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';

    // ball — Dominik's chrome circuit sphere
    const b = s.ball;
    const bs = b.r * 2 + 2;
    const ballImg = img['ball'];
    if (ballImg) ctx.drawImage(ballImg, b.x - bs / 2, b.y - bs / 2, bs, bs);
    else {
      const bg2 = ctx.createRadialGradient(b.x - 3, b.y - 3, 1, b.x, b.y, b.r);
      bg2.addColorStop(0, '#ffffff'); bg2.addColorStop(0.5, '#cdd6e8'); bg2.addColorStop(1, '#5a6b8c');
      ctx.fillStyle = bg2;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill();
    }
  }

  // sparks
  ctx.globalCompositeOperation = 'lighter';
  for (const p of fx.sparks) {
    ctx.fillStyle = p.color.replace('%a', String(Math.max(0, p.life * 0.9)));
    ctx.fillRect(p.x - 1.3, p.y - 1.3, 2.6, 2.6);
  }
  ctx.globalCompositeOperation = 'source-over';

  // score popups
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'center';
  for (const p of fx.pops) {
    ctx.fillStyle = p.color.replace('%a', String(Math.max(0, p.life)));
    ctx.fillText(p.text, p.x, p.y - (1 - p.life) * 30);
  }
  ctx.textAlign = 'left';
}

/* ------------------------------ component ------------------------------ */

const SPARK_COLORS: Partial<Record<GameEvent['type'], string>> = {
  bumper: 'rgba(140,230,255,%a)',
  sling: 'rgba(255,120,225,%a)',
  drop: 'rgba(255,150,235,%a)',
  bank: 'rgba(255,220,140,%a)',
  warp: 'rgba(220,130,255,%a)',
  warpout: 'rgba(220,130,255,%a)',
  spinner: 'rgba(140,230,255,%a)',
  target: 'rgba(150,240,170,%a)',
  mission: 'rgba(255,220,140,%a)',
  rankmax: 'rgba(255,220,140,%a)',
};

export default function PinballApp({ windowId, focused }: AppProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const staticRef = useRef<HTMLCanvasElement | null>(null);
  const staticDirty = useRef(true);
  const game = useRef<PinballState>();
  if (!game.current) game.current = createPinball();
  const fx = useRef<Fx>({ sparks: [], pops: [], trail: [] });
  const spinnerAngle = useRef(0);
  const sprites = useRef<Partial<Record<SpriteName, HTMLImageElement>>>({});

  const visible = usePageVisible();
  const minimized = useOSStore((st) => st.windows[windowId]?.state === 'minimized');
  const { prefs } = useSystem();
  const active = focused && visible && !minimized;

  const [panel, setPanel] = useState<Panel>(() => ({
    score: 0, hi: loadHi(), balls: 3, rank: 0, lit: 0, mult: 1, phase: 'ready', message: 'Pull the plunger to launch',
  }));

  // sprite preload — the loop picks each image up the frame after it lands
  useEffect(() => {
    for (const name of SPRITE_NAMES) {
      const image = new Image();
      image.src = `${ASSETS}/${name}.${name.endsWith('-bg') ? 'jpg' : 'png'}`;
      image.onload = () => {
        sprites.current[name] = image;
        if (name === 'table-bg' || name === 'reactor') staticDirty.current = true;
      };
    }
  }, []);

  const sfx = useCallback(
    (e: GameEvent) => {
      if (prefs.muted) return;
      switch (e.type) {
        case 'bumper': tone(0, 320 + Math.random() * 120, 0.09, 0.07, 'square'); break;
        case 'sling': tone(0, 210, 0.08, 0.07, 'sawtooth'); break;
        case 'flipper': tone(0, 120, 0.05, 0.06, 'triangle'); break;
        case 'target': tone(0, 660, 0.12, 0.07); break;
        case 'drop': tone(0, 500, 0.08, 0.07, 'square'); break;
        case 'bank': tone(0, 440, 0.1, 0.08); tone(0.08, 554, 0.1, 0.08); tone(0.16, 659, 0.18, 0.08); break;
        case 'spinner': tone(0, 950, 0.05, 0.05, 'square'); break;
        case 'warp': tone(0, 700, 0.12, 0.07, 'sawtooth'); tone(0.1, 420, 0.16, 0.07, 'sawtooth'); break;
        case 'warpout': tone(0, 330, 0.1, 0.07, 'sawtooth'); tone(0.07, 620, 0.14, 0.07, 'sawtooth'); break;
        case 'mission': case 'rankmax': tone(0, 523, 0.12, 0.08); tone(0.09, 659, 0.12, 0.08); tone(0.18, 784, 0.2, 0.08); break;
        case 'launch': tone(0, 180, 0.1, 0.06, 'sawtooth'); tone(0.06, 320, 0.12, 0.06, 'sawtooth'); break;
        case 'drain': tone(0, 130, 0.3, 0.08); tone(0.1, 98, 0.4, 0.08); break;
        case 'gameover': tone(0, 220, 0.2, 0.07); tone(0.15, 165, 0.25, 0.07); tone(0.3, 110, 0.5, 0.07); break;
        default: break;
      }
    },
    [prefs.muted],
  );

  const syncPanel = useCallback((events: GameEvent[]) => {
    const s = game.current!;
    if (events.length === 0) return;
    let message: string | null = null;
    for (const e of events) {
      sfx(e);
      const color = SPARK_COLORS[e.type];
      if (color && e.x !== undefined && e.y !== undefined) {
        const n = e.type === 'mission' || e.type === 'bank' ? 22 : e.type === 'warp' || e.type === 'warpout' ? 14 : 9;
        burst(fx.current, e.x, e.y, n, color);
        if (e.value > 0) popup(fx.current, e.x, e.y - 14, `+${e.value.toLocaleString('en')}`, color);
      }
      if (e.type === 'mission') message = `MISSION COMPLETE — promoted to ${RANKS[s.rank]}!`;
      if (e.type === 'rankmax') message = 'MISSION COMPLETE — already a Legend. +5000';
      if (e.type === 'target') message = `Beacon ${s.lights.filter((l) => l.lit).length}/3 lit`;
      if (e.type === 'drop') message = 'Drop target down!';
      if (e.type === 'bank') message = `D-E-V CLEARED — multiplier ×${s.multiplier}`;
      if (e.type === 'warp') message = 'WARP GATE engaged…';
      if (e.type === 'warpout') message = 'Warp ejection!';
      if (e.type === 'newball') message = `Ball lost — ${s.balls} left. Pull the plunger`;
      if (e.type === 'relaunch') message = 'Ball rolled back to the plunger — launch again';
      if (e.type === 'gameover') message = 'GAME OVER — press Enter for a new game';
      if (e.type === 'launch') message = `Mission: light 3 beacons → ${RANKS[Math.min(s.rank + 1, RANKS.length - 1)]}`;
    }
    setPanel((p) => {
      const hi = Math.max(p.hi, s.score);
      if (hi > p.hi) saveHi(hi);
      return {
        score: s.score, hi, balls: s.balls, rank: s.rank, mult: s.multiplier,
        lit: s.lights.filter((l) => l.lit).length,
        phase: s.phase, message: message ?? p.message,
      };
    });
  }, [sfx]);

  // input — listeners attach only while this window is the active game (§8.4 booleans)
  useEffect(() => {
    if (!active) {
      const s = game.current!;
      setFlipper(s, 'L', false);
      setFlipper(s, 'R', false);
      return;
    }
    const s = game.current!;
    // Pull DOM focus onto the canvas so keys reach the game, not a title-bar button
    // (native buttons fire their click on Space *keyup* — that was launching fullscreen/minimize).
    canvasRef.current?.focus({ preventScroll: true });
    const events: GameEvent[] = [];
    const down = (e: KeyboardEvent) => {
      if (e.repeat) return;
      switch (e.key) {
        case 'ArrowLeft': case 'z': case 'Z': setFlipper(s, 'L', true); e.preventDefault(); break;
        case 'ArrowRight': case '/': setFlipper(s, 'R', true); e.preventDefault(); break;
        case ' ': case 'ArrowDown': chargePlunger(s); e.preventDefault(); break;
        case 'Enter':
          if (s.phase === 'over') { newGame(s); setPanel((p) => ({ ...p, score: 0, balls: 3, rank: 0, lit: 0, mult: 1, phase: 'ready', message: 'Pull the plunger to launch' })); }
          break;
        default: break;
      }
    };
    const up = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft': case 'z': case 'Z': setFlipper(s, 'L', false); e.preventDefault(); break;
        case 'ArrowRight': case '/': setFlipper(s, 'R', false); e.preventDefault(); break;
        case ' ': case 'ArrowDown': releasePlunger(s, events); syncPanel(events.splice(0)); e.preventDefault(); break;
        default: break;
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [active, syncPanel]);

  // touch / pointer: left half = left flipper, right half = right flipper, plunger when ready
  const pointer = useMemo(() => {
    const held = { L: false, R: false, plunge: false };
    return {
      down: (e: React.PointerEvent<HTMLCanvasElement>) => {
        const s = game.current!;
        e.currentTarget.setPointerCapture?.(e.pointerId);
        e.currentTarget.focus({ preventScroll: true }); // keep keys on the game, not a chrome button
        if (s.phase === 'ready') { chargePlunger(s); held.plunge = true; return; }
        const rect = e.currentTarget.getBoundingClientRect();
        if (e.clientX - rect.left < rect.width / 2) { setFlipper(s, 'L', true); held.L = true; }
        else { setFlipper(s, 'R', true); held.R = true; }
      },
      up: () => {
        const s = game.current!;
        const events: GameEvent[] = [];
        if (held.plunge) { releasePlunger(s, events); syncPanel(events); held.plunge = false; }
        if (held.L) { setFlipper(s, 'L', false); held.L = false; }
        if (held.R) { setFlipper(s, 'R', false); held.R = false; }
      },
    };
  }, [syncPanel]);

  // the loop: physics + fx + draw. No rAF at all while inactive (§8.4).
  useGameLoop(
    (dt) => {
      const s = game.current!;
      const events: GameEvent[] = [];
      step(s, dt, events);
      if (events.length) syncPanel(events);

      // fx integration
      const f = fx.current;
      spinnerAngle.current += s.spinner.spin * dt * 22;
      const speed = Math.hypot(s.ball.vx, s.ball.vy);
      if (s.phase === 'play' && speed > 60 && s.time >= s.warp.holdUntil) {
        f.trail.push({ x: s.ball.x, y: s.ball.y, life: 1 });
        if (f.trail.length > 14) f.trail.shift();
      }
      for (const d of f.trail) d.life -= dt * 3;
      f.trail = f.trail.filter((d) => d.life > 0);
      for (const p of f.sparks) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 320 * dt; p.life -= dt * 2.1; }
      f.sparks = f.sparks.filter((p) => p.life > 0);
      for (const p of f.pops) p.life -= dt * 0.9;
      f.pops = f.pops.filter((p) => p.life > 0);

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cw = canvas.clientWidth, ch = canvas.clientHeight;
      if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) {
        canvas.width = Math.round(cw * dpr);
        canvas.height = Math.round(ch * dpr);
        staticDirty.current = true;
      }
      const scale = Math.min(canvas.width / TABLE_W, canvas.height / TABLE_H);
      const ox = (canvas.width - TABLE_W * scale) / 2;
      const oy = (canvas.height - TABLE_H * scale) / 2;

      if (staticDirty.current || !staticRef.current) {
        staticDirty.current = false;
        const off = document.createElement('canvas');
        off.width = canvas.width; off.height = canvas.height;
        const octx = off.getContext('2d')!;
        octx.fillStyle = '#04061a';
        octx.fillRect(0, 0, off.width, off.height);
        octx.setTransform(scale, 0, 0, scale, ox, oy);
        drawStatic(octx, s, sprites.current);
        staticRef.current = off;
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(staticRef.current, 0, 0);
      ctx.setTransform(scale, 0, 0, scale, ox, oy);
      drawDynamic(ctx, s, sprites.current, f, spinnerAngle.current);
    },
    active,
  );

  const s = game.current;
  return (
    <div className="pinball">
      <div className="pinball__stage">
        <canvas
          ref={canvasRef}
          className="pinball__canvas"
          tabIndex={0}
          onPointerDown={pointer.down}
          onPointerUp={pointer.up}
          onPointerCancel={pointer.up}
          aria-label="Space Pinball table — arrow or Z / slash keys flip, hold Space to launch"
        />
        {!active && (
          <div className="pinball__overlay">
            <strong>PAUSED</strong>
            <span>Click the window to resume</span>
          </div>
        )}
        {active && panel.phase === 'over' && (
          <div className="pinball__overlay">
            <strong>GAME OVER</strong>
            <span>Score {panel.score.toLocaleString('en')}</span>
            <button
              type="button"
              onClick={() => {
                newGame(s);
                setPanel((p) => ({ ...p, score: 0, balls: 3, rank: 0, lit: 0, mult: 1, phase: 'ready', message: 'Pull the plunger to launch' }));
              }}
            >
              ▶ New game (Enter)
            </button>
          </div>
        )}
      </div>
      <aside className="pinball__panel">
        <h3>SPACE PINBALL</h3>
        <div className="pinball__score">{panel.score.toLocaleString('en')}</div>
        <div className="pinball__mult" data-hot={panel.mult > 1}>×{panel.mult} MULTIPLIER</div>
        <dl>
          <dt>High score</dt><dd>{panel.hi.toLocaleString('en')}</dd>
          <dt>Balls</dt><dd>{'●'.repeat(Math.max(0, panel.balls))}{'○'.repeat(Math.max(0, 3 - panel.balls))}</dd>
          <dt>Rank</dt><dd>{RANKS[panel.rank]}</dd>
          <dt>Beacons</dt><dd>{'◆'.repeat(panel.lit)}{'◇'.repeat(3 - panel.lit)}</dd>
        </dl>
        <p className="pinball__msg">{panel.message}</p>
        <p className="pinball__keys">
          <b>Z / ←</b> left flipper · <b>/ / →</b> right flipper<br />
          hold <b>Space</b> to charge, release to launch<br />
          D-E-V bank raises the multiplier · the warp gate<br />
          swallows the ball — brace for the ejection<br />
          touch: tap left/right half of the table
        </p>
      </aside>
    </div>
  );
}
