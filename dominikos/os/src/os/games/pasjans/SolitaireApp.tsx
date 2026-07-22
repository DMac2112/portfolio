// Pasjans — DominikOS's third game (kind:'react' via componentById, plan §8.4/§8.6): classic
// Klondike with the full turn-of-the-millennium desktop-solitaire feel — an XP-style Game menu,
// a green-felt table, a sunken status bar, pointer-event drag-and-drop, double-click-to-
// foundation, undo, a timer that pauses with the §8.4 booleans, and the iconic bouncing-card
// win cascade painted (never cleared) onto a canvas overlay. Rules live in ./engine and the
// card art in ./cards — both locked contracts; everything here is presentation + input.
import {
  useCallback, useEffect, useRef, useState,
  type PointerEvent as ReactPointerEvent, type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import type { AppProps } from '../../types';
import { useOSStore } from '../../store/osStore';
import { usePageVisible } from '../../hooks/usePageVisible';
import { useGameLoop } from '../../hooks/useGameLoop';
import { useSystem } from '../../context/SystemContext';
import { tone } from '../../sound';
import {
  newGame, draw, moveStack, autoMoveTarget, canAutoComplete, autoCompleteStep, undo,
  type Card, type GameState, type PileRef,
} from './engine';
import { CardFace, CardBack, CARD_RATIO, cardLabel } from './cards';

const STATS_KEY = 'dmos.v1.pasjans';
const TOP_Y = 12;          // y of the stock/waste/foundation row
const DRAG_THRESHOLD = 5;  // px of pointer travel before a press becomes a drag
const FAN = 0.28;          // face-up stack / waste-fan offset, in card heights/widths

interface Stats { games: number; wins: number; bestScore: number; bestTimeSec: number }

function loadStats(): Stats {
  try {
    const raw = JSON.parse(localStorage.getItem(STATS_KEY) ?? '{}') as Partial<Stats>;
    return { games: raw.games ?? 0, wins: raw.wins ?? 0, bestScore: raw.bestScore ?? 0, bestTimeSec: raw.bestTimeSec ?? 0 };
  } catch { return { games: 0, wins: 0, bestScore: 0, bestTimeSec: 0 }; }
}
function saveStats(s: Stats): void {
  try { localStorage.setItem(STATS_KEY, JSON.stringify(s)); } catch { /* stateless is fine */ }
}

function fmtTime(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

/* -------------------------------- layout ------------------------------- */

interface Metrics { cardW: number; cardH: number; gap: number; y0: number; colX: (i: number) => number }

/** Column geometry from the board width; the gap comes from a provisional boardW/8 card. */
function metrics(boardW: number): Metrics {
  const gap = Math.round((boardW / 8) * 0.16);
  const cardW = Math.min(110, Math.max(36, Math.floor((boardW - 8 * gap) / 7))); // fit the 360px mobile floor
  const cardH = cardW * CARD_RATIO;
  return { cardW, cardH, gap, y0: cardH + 34, colX: (i) => gap + i * (cardW + gap) };
}

interface Entry { card: Card; x: number; y: number; z: number; from: PileRef | null; index: number }

/** Every card's resting spot. from:null marks the stock (click-only — never dragged). */
function buildLayout(s: GameState, m: Metrics): Entry[] {
  const entries: Entry[] = [];
  s.stock.forEach((card, i) => {
    entries.push({ card, x: m.colX(0), y: TOP_Y, z: i + 1, from: null, index: i });
  });
  const fanned = s.drawCount === 3 ? Math.min(3, s.waste.length) : 1; // draw-3 fans the top cards
  s.waste.forEach((card, i) => {
    const k = Math.max(0, i - (s.waste.length - fanned));
    entries.push({ card, x: m.colX(1) + k * m.cardW * FAN, y: TOP_Y, z: i + 1, from: { pile: 'waste' }, index: i });
  });
  s.foundations.forEach((pile, f) => {
    pile.forEach((card, i) => {
      entries.push({ card, x: m.colX(3 + f), y: TOP_Y, z: i + 1, from: { pile: 'foundation', index: f }, index: i });
    });
  });
  s.tableau.forEach((pile, t) => {
    let y = m.y0;
    pile.forEach((card, i) => {
      entries.push({ card, x: m.colX(t), y, z: i + 1, from: { pile: 'tableau', index: t }, index: i });
      y += (card.faceUp ? FAN : 0.16) * m.cardH;
    });
  });
  return entries.sort((a, b) => a.card.id - b.card.id); // stable DOM order; z-index does the stacking
}

function pileArr(s: GameState, ref: PileRef): Card[] {
  if (ref.pile === 'waste') return s.waste;
  if (ref.pile === 'foundation') return s.foundations[ref.index];
  return s.tableau[ref.index];
}

function sameRef(a: PileRef, b: PileRef): boolean {
  if (a.pile === 'waste' || b.pile === 'waste') return a.pile === b.pile;
  return a.pile === b.pile && a.index === b.index;
}

/** Drop target under the dragged card's center — the overlapping pile whose center is nearest. */
function pickDrop(s: GameState, m: Metrics, cx: number, cy: number): PileRef | null {
  interface DropRect { ref: PileRef; x: number; y: number; w: number; h: number }
  const rects: DropRect[] = [];
  for (let f = 0; f < 4; f++) {
    rects.push({ ref: { pile: 'foundation', index: f }, x: m.colX(3 + f), y: TOP_Y, w: m.cardW, h: m.cardH });
  }
  for (let t = 0; t < 7; t++) {
    let h = m.cardH;
    for (let i = 0; i < s.tableau[t].length - 1; i++) h += (s.tableau[t][i].faceUp ? FAN : 0.16) * m.cardH;
    rects.push({ ref: { pile: 'tableau', index: t }, x: m.colX(t), y: m.y0, w: m.cardW, h });
  }
  let best: PileRef | null = null;
  let bestD = Infinity;
  for (const r of rects) {
    if (cx < r.x || cx > r.x + r.w || cy < r.y || cy > r.y + r.h) continue;
    const d = (cx - (r.x + r.w / 2)) ** 2 + (cy - (r.y + r.h / 2)) ** 2;
    if (d < bestD) { bestD = d; best = r.ref; }
  }
  return best;
}

/* ----------------------------- win cascade ----------------------------- */

interface Fly { x: number; y: number; vx: number; vy: number }
interface Cascade { flying: Fly[]; timer: number; launched: number }

/** Card back as a cheap rounded rect — the paint-smear repaints this thousands of times,
 *  so no SVG rasterizing per frame; just the back's navy + pale border. */
function drawCascadeCard(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  const r = w * 0.07;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fillStyle = '#1f3f8f';
  ctx.fill();
  ctx.strokeStyle = '#cfd8f2';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

/* ------------------------------ component ------------------------------ */

interface Drag {
  from: PileRef;
  index: number;         // index into the source pile array
  ids: number[];         // dragged card ids, bottom of the run first
  pointerId: number;
  startX: number;
  startY: number;
  grabDX: number;        // pointer offset from the lead card's board position
  grabDY: number;
  curX: number;          // lead card's live board position
  curY: number;
  started: boolean;      // false until travel exceeds DRAG_THRESHOLD
  onMove: (e: PointerEvent) => void;
  onUp: (e: PointerEvent) => void;
  onCancel: () => void;
}

type Sfx = 'draw' | 'flip' | 'move' | 'foundation' | 'undo' | 'error' | 'win';

export default function SolitaireApp({ windowId, focused }: AppProps) {
  const game = useRef<GameState>();
  if (!game.current) game.current = newGame(1);

  const boardRef = useRef<HTMLDivElement>(null);
  const menuWrapRef = useRef<HTMLDivElement>(null);
  const cascadeCanvasRef = useRef<HTMLCanvasElement>(null);
  const cardEls = useRef(new Map<number, HTMLDivElement>());
  const positionsRef = useRef(new Map<number, { x: number; y: number }>());
  const metricsRef = useRef<Metrics>(metrics(0));
  const dragRef = useRef<Drag | null>(null);
  const cascadeRef = useRef<Cascade | null>(null);
  const winHandled = useRef(false);

  const visible = usePageVisible();
  const minimized = useOSStore((st) => st.windows[windowId]?.state === 'minimized');
  const { prefs } = useSystem();
  const active = focused && visible && !minimized;
  const activeRef = useRef(active);
  activeRef.current = active;

  const [, setVersion] = useState(0); // bumped after every successful engine mutation
  const bump = useCallback(() => setVersion((v) => v + 1), []);
  const [boardSize, setBoardSize] = useState({ w: 0, h: 0 });
  const [menuOpen, setMenuOpen] = useState(false);
  const [time, setTime] = useState(0);
  const timeRef = useRef(0);
  timeRef.current = time;
  const [autoRun, setAutoRun] = useState(false);
  const [cascading, setCascading] = useState(false);
  const [showWinPanel, setShowWinPanel] = useState(false);
  // keyboard play: a picked-up source (null when nothing is held) + the pile handle that holds
  // roving focus. The hotspot layer (see render) is the a11y + keyboard contract; mouse users
  // never touch it. `from:index` selects the whole face-up run from its lead card.
  const [selected, setSelected] = useState<{ from: PileRef; index: number } | null>(null);
  const [focusKey, setFocusKey] = useState('stock');
  const hotspotEls = useRef(new Map<string, HTMLDivElement>());

  const sfx = useCallback(
    (k: Sfx) => {
      if (prefs.muted) return;
      switch (k) {
        case 'draw': tone(0, 260, 0.06, 0.05); break;
        case 'flip': tone(0, 320, 0.05, 0.05, 'triangle'); break;
        case 'move': tone(0, 180, 0.04, 0.06); break;
        case 'foundation': tone(0, 520, 0.08, 0.06); break;
        case 'undo': tone(0, 240, 0.06, 0.05); break;
        case 'error': tone(0, 140, 0.08, 0.06, 'sawtooth'); break;
        case 'win': tone(0, 523, 0.14, 0.08); tone(0.12, 659, 0.14, 0.08); tone(0.24, 784, 0.3, 0.08); break;
      }
    },
    [prefs.muted],
  );

  // board metrics track the window body via ResizeObserver
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const ro = new ResizeObserver((es) => {
      const r = es[0]?.contentRect;
      if (r) setBoardSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // the very first deal counts toward the stats too
  useEffect(() => {
    const st = loadStats();
    st.games += 1;
    saveStats(st);
  }, []);

  /** Cancel an in-flight drag: cards fly home (the render below drops .is-dragging). */
  const cancelDrag = useCallback(() => {
    const d = dragRef.current;
    if (!d) return;
    window.removeEventListener('pointermove', d.onMove);
    window.removeEventListener('pointerup', d.onUp);
    window.removeEventListener('pointercancel', d.onCancel);
    if (d.started) {
      for (const id of d.ids) {
        const el = cardEls.current.get(id);
        const home = positionsRef.current.get(id);
        if (el && home) el.style.transform = `translate3d(${home.x}px, ${home.y}px, 0)`;
      }
    }
    dragRef.current = null;
    bump();
  }, [bump]);

  // §8.4 pause: losing focus/visibility cancels the drag mid-air (and drops any keyboard hold)
  useEffect(() => {
    if (!active) { cancelDrag(); setSelected(null); }
  }, [active, cancelDrag]);
  useEffect(() => () => cancelDrag(), [cancelDrag]); // unmount safety

  /** Plain click / double-click on a top face-up card → fly to a foundation when legal. */
  const clickMove = useCallback(
    (from: PileRef, index: number) => {
      const st = game.current!;
      const src = pileArr(st, from);
      if (index !== src.length - 1) return;
      const to = autoMoveTarget(st, from, index);
      if (!to) return;
      const willFlip = from.pile === 'tableau' && index > 0 && !src[index - 1].faceUp;
      if (moveStack(st, from, index, to)) {
        sfx('foundation');
        if (willFlip) sfx('flip');
        bump();
      }
    },
    [bump, sfx],
  );

  /** Commit an arbitrary move with the shared sfx + auto-flip feedback (keyboard play). */
  const doMove = useCallback(
    (from: PileRef, index: number, to: PileRef) => {
      const st = game.current!;
      const srcArr = from.pile === 'tableau' ? st.tableau[from.index] : null;
      const willFlip = !!srcArr && index > 0 && !srcArr[index - 1].faceUp;
      if (!moveStack(st, from, index, to)) return false;
      sfx(to.pile === 'foundation' ? 'foundation' : 'move');
      if (willFlip) sfx('flip');
      bump();
      return true;
    },
    [bump, sfx],
  );

  const onCardPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>, from: PileRef, index: number, card: Card) => {
      const st = game.current!;
      if (dragRef.current || !activeRef.current || st.won || !card.faceUp) return;
      if (from.pile !== 'tableau' && index !== pileArr(st, from).length - 1) return; // top card only
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const board = boardRef.current;
      const home = positionsRef.current.get(card.id);
      if (!board || !home) return;
      e.preventDefault();
      const rect = board.getBoundingClientRect();
      const ids = from.pile === 'tableau'
        ? st.tableau[from.index].slice(index).map((c) => c.id)
        : [card.id];

      const d: Drag = {
        from, index, ids,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        grabDX: e.clientX - rect.left - home.x,
        grabDY: e.clientY - rect.top - home.y,
        curX: home.x,
        curY: home.y,
        started: false,
        onMove: (ev) => {
          if (ev.pointerId !== d.pointerId) return;
          if (!d.started) {
            if (Math.hypot(ev.clientX - d.startX, ev.clientY - d.startY) <= DRAG_THRESHOLD) return;
            d.started = true;
            // .is-dragging goes on directly so the FIRST transform write skips the transition;
            // the re-render below then agrees with the DOM (className + zIndex match).
            d.ids.forEach((id, k) => {
              const el = cardEls.current.get(id);
              if (el) { el.classList.add('is-dragging'); el.style.zIndex = String(1000 + k); }
            });
            bump();
          }
          const r = boardRef.current?.getBoundingClientRect();
          if (!r) return;
          const m = metricsRef.current;
          d.curX = ev.clientX - r.left - d.grabDX;
          d.curY = ev.clientY - r.top - d.grabDY;
          d.ids.forEach((id, k) => {
            const el = cardEls.current.get(id);
            if (el) el.style.transform = `translate3d(${d.curX}px, ${d.curY + k * FAN * m.cardH}px, 0) rotate(2deg)`;
          });
        },
        onUp: (ev) => {
          if (ev.pointerId !== d.pointerId) return;
          window.removeEventListener('pointermove', d.onMove);
          window.removeEventListener('pointerup', d.onUp);
          window.removeEventListener('pointercancel', d.onCancel);
          dragRef.current = null;
          if (!d.started) { clickMove(d.from, d.index); return; } // plain click, not a drag
          const st2 = game.current!;
          const m = metricsRef.current;
          const target = pickDrop(st2, m, d.curX + m.cardW / 2, d.curY + m.cardH / 2);
          let moved = false;
          if (target && !sameRef(target, d.from)) {
            const srcArr = d.from.pile === 'tableau' ? st2.tableau[d.from.index] : null;
            const willFlip = !!srcArr && d.index > 0 && !srcArr[d.index - 1].faceUp;
            moved = moveStack(st2, d.from, d.index, target);
            if (moved) {
              sfx(target.pile === 'foundation' ? 'foundation' : 'move');
              if (willFlip) sfx('flip');
            }
          }
          if (!moved) {
            // fly back home: restore the resting transform, and the re-render removes
            // .is-dragging so the 140ms transition animates the return
            for (const id of d.ids) {
              const el = cardEls.current.get(id);
              const home2 = positionsRef.current.get(id);
              if (el && home2) el.style.transform = `translate3d(${home2.x}px, ${home2.y}px, 0)`;
            }
            if (!target || !sameRef(target, d.from)) sfx('error'); // dropping back home is not an error
          }
          bump();
        },
        onCancel: () => cancelDrag(),
      };
      dragRef.current = d;
      window.addEventListener('pointermove', d.onMove);
      window.addEventListener('pointerup', d.onUp);
      window.addEventListener('pointercancel', d.onCancel);
    },
    [bump, cancelDrag, clickMove, sfx],
  );

  const onStock = useCallback(() => {
    const st = game.current!;
    if (!activeRef.current || st.won) return;
    if (draw(st)) { sfx('draw'); bump(); }
  }, [bump, sfx]);

  /** Pick-up / place / auto-to-foundation on a pile handle — the whole keyboard move model. */
  const activateHotspot = useCallback(
    (ref: PileRef | null, pickIndex: number | null) => {
      const st = game.current!;
      if (!activeRef.current || st.won) return;
      if (ref === null) { onStock(); return; }            // the stock handle deals / recycles
      if (selected) {
        if (sameRef(selected.from, ref)) {
          // re-activating the source flies its top card to a foundation if it can, else lets go
          const top = pileArr(st, ref).length - 1;
          const to = selected.index === top ? autoMoveTarget(st, ref, top) : null;
          if (to) doMove(ref, top, to);
          setSelected(null);
          return;
        }
        if (!doMove(selected.from, selected.index, ref)) sfx('error');
        setSelected(null);
        return;
      }
      if (pickIndex === null) { sfx('error'); return; }   // empty pile / nothing to grab
      setSelected({ from: ref, index: pickIndex });
    },
    [selected, doMove, onStock, sfx],
  );

  const dealNew = useCallback(
    (count: 1 | 3) => {
      cancelDrag();
      setSelected(null);
      setAutoRun(false);
      setCascading(false);
      setShowWinPanel(false);
      cascadeRef.current = null;
      game.current = newGame(count);
      setTime(0);
      const st = loadStats();
      st.games += 1;
      saveStats(st);
      sfx('flip');
      bump();
    },
    [bump, cancelDrag, sfx],
  );

  const doUndo = useCallback(() => {
    if (game.current!.history.length === 0) return; // nothing to undo — leave any live drag alone
    cancelDrag();                                   // an in-flight drag references pre-undo indices
    undo(game.current!);
    setSelected(null);
    setCascading(false); // undoing out of a win rolls the celebration back too
    setShowWinPanel(false);
    cascadeRef.current = null;
    sfx('undo');
    bump();
  }, [bump, cancelDrag, sfx]);

  // keyboard — attached only while this window is the active game (§8.4 booleans)
  useEffect(() => {
    if (!active) return;
    const down = (e: KeyboardEvent) => {
      if (e.key === 'F2') { dealNew(game.current!.drawCount); e.preventDefault(); }
      else if ((e.key === 'z' || e.key === 'Z') && e.ctrlKey) { doUndo(); e.preventDefault(); }
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, [active, dealNew, doUndo]);

  // Game menu closes on pick (handlers below), Esc, or any outside pointerdown
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: Event) => {
      if (!menuWrapRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const s = game.current;
  const started = s.moves > 0;
  const won = s.won;

  // timer: seconds since the first move of the deal, frozen while paused or won
  useEffect(() => {
    if (!(active && started && !won)) return;
    const id = setInterval(() => setTime((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [active, started, won]);

  // ⚡ auto complete: one foundation card every 90ms until the engine says done
  useEffect(() => {
    if (!autoRun || !active) return;
    const id = setInterval(() => {
      if (autoCompleteStep(game.current!)) { sfx('foundation'); bump(); }
      else setAutoRun(false);
    }, 90);
    return () => clearInterval(id);
  }, [autoRun, active, bump, sfx]);

  const endCascade = useCallback(() => {
    cascadeRef.current = null;
    setCascading(false);
    setShowWinPanel(true);
  }, []);

  // victory: freeze the clock, bank the stats, then celebrate
  useEffect(() => {
    if (!won) { winHandled.current = false; return; }
    if (winHandled.current) return;
    winHandled.current = true;
    setAutoRun(false);
    const st = loadStats();
    st.wins += 1;
    st.bestScore = Math.max(st.bestScore, game.current!.score);
    st.bestTimeSec = st.bestTimeSec === 0 ? timeRef.current : Math.min(st.bestTimeSec, timeRef.current);
    saveStats(st);
    sfx('win');
    if (prefs.reducedMotion) {
      setShowWinPanel(true);
    } else {
      cascadeRef.current = { flying: [], timer: 0.3, launched: 0 };
      setCascading(true);
    }
  }, [won, sfx, prefs.reducedMotion]);

  // the cascade — the ONLY consumer of useGameLoop here. The canvas is never cleared
  // between frames: every bounce smears paint, exactly as the era demands.
  useGameLoop(
    (dt) => {
      const c = cascadeRef.current;
      const canvas = cascadeCanvasRef.current;
      const board = boardRef.current;
      if (!c || !canvas || !board) return;
      const w = board.clientWidth;
      const h = board.clientHeight;
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const m = metricsRef.current;
      c.timer += dt;
      if (c.timer >= 0.3 && c.launched < 52) {
        c.timer = 0;
        c.flying.push({
          x: m.colX(3 + (c.launched % 4)), // cycle the four foundations, top card first
          y: TOP_Y,
          vx: (Math.random() < 0.5 ? -1 : 1) * (120 + Math.random() * 140),
          vy: -80 + Math.random() * 120,
        });
        c.launched += 1;
      }
      const keep: Fly[] = [];
      for (const f of c.flying) {
        f.vy += 900 * dt;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        if (f.y + m.cardH > h && f.vy > 0) { f.y = h - m.cardH; f.vy *= -0.78; }
        drawCascadeCard(ctx, f.x, f.y, m.cardW, m.cardH);
        if (f.x + m.cardW > 0 && f.x < w) keep.push(f); // gone once off a side edge
      }
      c.flying = keep;
      if (c.launched >= 52 && c.flying.length === 0) endCascade();
    },
    active && cascading,
  );

  const m = metrics(boardSize.w);
  metricsRef.current = m;
  const entries = buildLayout(s, m);
  const posMap = new Map<number, { x: number; y: number }>();
  for (const en of entries) posMap.set(en.card.id, { x: en.x, y: en.y });
  positionsRef.current = posMap;

  const drag = dragRef.current;
  const slotStyle = (x: number, y: number) => ({
    left: x, top: y, width: m.cardW, height: m.cardH,
    borderRadius: m.cardW * 0.07, fontSize: Math.round(m.cardW * 0.38),
  });

  // One focusable, richly-labelled handle per pile — the keyboard + screen-reader board. The
  // visual cards are aria-hidden, so a non-visual read walks these 13 handles in board order
  // (stock, waste, four foundations, seven columns) instead of 52 z-scrambled card nodes.
  interface Hotspot { key: string; ref: PileRef | null; x: number; y: number; w: number; h: number; label: string; pick: number | null }
  const hint = (ref: PileRef) => (selected && sameRef(selected.from, ref) ? ' (holding — Enter here to send it up)' : '');
  const hotspots: Hotspot[] = [
    {
      key: 'stock', ref: null, x: m.colX(0), y: TOP_Y, w: m.cardW, h: m.cardH, pick: null,
      label: `Stock, ${s.stock.length} card${s.stock.length === 1 ? '' : 's'}. ${
        s.stock.length === 0 && s.waste.length > 0 ? 'Enter to recycle the waste.' : 'Enter to deal.'}`,
    },
    {
      key: 'waste', ref: { pile: 'waste' }, x: m.colX(1), y: TOP_Y, w: m.cardW, h: m.cardH,
      pick: s.waste.length ? s.waste.length - 1 : null,
      label: `Waste, ${s.waste.length ? `top ${cardLabel(s.waste[s.waste.length - 1])}` : 'empty'}${hint({ pile: 'waste' })}`,
    },
    ...s.foundations.map((pile, f): Hotspot => {
      const ref: PileRef = { pile: 'foundation', index: f };
      return {
        key: `f${f}`, ref, x: m.colX(3 + f), y: TOP_Y, w: m.cardW, h: m.cardH,
        pick: pile.length ? pile.length - 1 : null,
        label: `Foundation ${f + 1}, ${pile.length ? `${cardLabel(pile[pile.length - 1])}, ${pile.length} of 13` : 'empty'}${hint(ref)}`,
      };
    }),
    ...s.tableau.map((pile, t): Hotspot => {
      const ref: PileRef = { pile: 'tableau', index: t };
      let lead = pile.length;
      for (let i = 0; i < pile.length; i++) if (pile[i].faceUp) { lead = i; break; }
      const faceDown = pile.reduce((n, c) => n + (c.faceUp ? 0 : 1), 0);
      let h = m.cardH;
      for (let i = 0; i < pile.length - 1; i++) h += (pile[i].faceUp ? FAN : 0.16) * m.cardH;
      return {
        key: `t${t}`, ref, x: m.colX(t), y: m.y0, w: m.cardW, h,
        pick: lead < pile.length ? lead : null,
        label: pile.length
          ? `Column ${t + 1}, ${pile.length} card${pile.length === 1 ? '' : 's'}${faceDown ? `, ${faceDown} face down` : ''}, top ${cardLabel(pile[pile.length - 1])}${hint(ref)}`
          : `Column ${t + 1}, empty${hint(ref)}`,
      };
    }),
  ];
  const focusHotspot = (i: number) => {
    const next = hotspots[((i % hotspots.length) + hotspots.length) % hotspots.length];
    setFocusKey(next.key);
    hotspotEls.current.get(next.key)?.focus();
  };
  const onHotspotKey = (e: ReactKeyboardEvent, i: number, h: Hotspot) => {
    switch (e.key) {
      case 'ArrowRight': case 'ArrowDown': e.preventDefault(); focusHotspot(i + 1); break;
      case 'ArrowLeft': case 'ArrowUp': e.preventDefault(); focusHotspot(i - 1); break;
      case 'Home': e.preventDefault(); focusHotspot(0); break;
      case 'End': e.preventDefault(); focusHotspot(hotspots.length - 1); break;
      case 'Enter': case ' ': e.preventDefault(); activateHotspot(h.ref, h.pick); break;
      case 'Escape': if (selected) { e.preventDefault(); setSelected(null); } break;
    }
  };
  const selCard = selected ? pileArr(s, selected.from)[selected.index] : undefined;

  return (
    <div className="pasjans">
      <div className="pasjans__menu" ref={menuWrapRef}>
        <button
          type="button"
          className="pasjans__menubtn"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          Game
        </button>
        {menuOpen && (
          <div className="ctx-menu pasjans__menudrop" role="menu">
            <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); dealNew(s.drawCount); }}>
              New game <span>F2</span>
            </button>
            <hr />
            <button type="button" role="menuitemradio" aria-checked={s.drawCount === 1} onClick={() => { setMenuOpen(false); dealNew(1); }}>
              {s.drawCount === 1 ? '✓ Draw one' : 'Draw one'}
            </button>
            <button type="button" role="menuitemradio" aria-checked={s.drawCount === 3} onClick={() => { setMenuOpen(false); dealNew(3); }}>
              {s.drawCount === 3 ? '✓ Draw three' : 'Draw three'}
            </button>
            <hr />
            <button type="button" role="menuitem" disabled={s.history.length === 0} onClick={() => { setMenuOpen(false); doUndo(); }}>
              Undo <span>Ctrl+Z</span>
            </button>
          </div>
        )}
      </div>

      <div className="pasjans__board" ref={boardRef} role="group" aria-label="Pasjans solitaire table">
        {/* Visual slots + cards are aria-hidden; the hotspot layer below is the a11y surface. */}
        <div
          className="pasjans__slot"
          aria-hidden="true"
          style={slotStyle(m.colX(0), TOP_Y)}
          onClick={onStock}
        >
          {s.stock.length === 0 && s.waste.length > 0 ? '↻' : ''}
        </div>
        {s.foundations.map((pile, f) =>
          pile.length === 0 ? (
            <div key={`f${f}`} className="pasjans__slot" aria-hidden="true" style={slotStyle(m.colX(3 + f), TOP_Y)}>
              A
            </div>
          ) : null,
        )}
        {s.tableau.map((pile, t) =>
          pile.length === 0 ? (
            <div key={`t${t}`} className="pasjans__slot" aria-hidden="true" style={slotStyle(m.colX(t), m.y0)} />
          ) : null,
        )}

        {entries.map(({ card, x, y, z, from, index }) => {
          const isDragging = !!drag && drag.started && drag.ids.includes(card.id);
          const k = isDragging ? drag.ids.indexOf(card.id) : 0;
          return (
            <div
              key={card.id}
              ref={(el) => {
                if (el) cardEls.current.set(card.id, el);
                else cardEls.current.delete(card.id);
              }}
              className={isDragging ? 'pasjans__card is-dragging' : 'pasjans__card'}
              style={{
                width: m.cardW,
                height: m.cardH,
                borderRadius: m.cardW * 0.07,
                transform: `translate3d(${x}px, ${y}px, 0)`,
                zIndex: isDragging ? 1000 + k : z,
              }}
              aria-hidden="true"
              onPointerDown={from ? (e) => onCardPointerDown(e, from, index, card) : undefined}
              onClick={from === null ? onStock : undefined}
            >
              {card.faceUp
                ? <CardFace suit={card.suit} rank={card.rank} width={m.cardW} />
                : <CardBack width={m.cardW} />}
            </div>
          );
        })}

        {hotspots.map((h, i) => (
          <div
            key={h.key}
            ref={(el) => { if (el) hotspotEls.current.set(h.key, el); else hotspotEls.current.delete(h.key); }}
            className={selected && h.ref && sameRef(selected.from, h.ref) ? 'pasjans__hotspot is-selected' : 'pasjans__hotspot'}
            role="button"
            aria-label={h.label}
            tabIndex={focusKey === h.key ? 0 : -1}
            style={{ left: h.x, top: h.y, width: h.w, height: h.h }}
            onFocus={() => setFocusKey(h.key)}
            onKeyDown={(e) => onHotspotKey(e, i, h)}
          />
        ))}

        {cascading && (
          <canvas
            ref={cascadeCanvasRef}
            className="pasjans__cascade"
            aria-hidden="true"
            onPointerDown={endCascade}
          />
        )}
        {!active && (
          <div className="pasjans__overlay">
            <strong>PAUSED</strong>
            <span>Click the window to resume</span>
          </div>
        )}
        {active && showWinPanel && (
          <div className="pasjans__overlay">
            <strong>You won!</strong>
            <span>Score {s.score} — time {fmtTime(time)}</span>
            <button type="button" onClick={() => dealNew(s.drawCount)}>▶ New game (F2)</button>
          </div>
        )}
      </div>

      <div className="status-bar">
        <p className="status-bar-field">Score {s.score}</p>
        <p className="status-bar-field">Time {fmtTime(time)}</p>
        <p className="status-bar-field">Moves {s.moves}</p>
        {canAutoComplete(s) && !s.won && (
          <button type="button" className="pasjans__auto" onClick={() => setAutoRun(true)}>
            ⚡ Auto complete
          </button>
        )}
      </div>

      <div className="sr-only" aria-live="polite">
        {selCard
          ? `Holding ${cardLabel(selCard)}. Move to a pile, or Enter again to send it to a foundation.`
          : won ? `You won! Final score ${s.score}` : `Score ${s.score}`}
      </div>
    </div>
  );
}
