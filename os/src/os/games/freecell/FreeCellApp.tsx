// FreeCell — DominikOS card game (kind:'react' via componentById): pointer-drag, an XP-style
// Game menu, a sunken status bar, undo, keyboard play via a roving-tabindex hotspot layer, and
// the pause contract shared by every in-app game. Rules live in ./engine (a locked contract);
// the card art is the UNMODIFIED pasjans renderer imported from ../pasjans/cards — this file is
// presentation + input only, cloned from ../pasjans/SolitaireApp.tsx's shell.
import {
  useCallback, useEffect, useRef, useState,
  type PointerEvent as ReactPointerEvent, type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import type { AppProps } from '../../types';
import { useOSStore } from '../../store/osStore';
import { usePageVisible } from '../../hooks/usePageVisible';
import { useSystem } from '../../context/SystemContext';
import { tone } from '../../sound';
import {
  newGame, moveStack, autoMoveTarget, movableRunLength, undo,
  type Card, type GameState, type PileRef,
} from './engine';
import { CardFace, CARD_RATIO, cardLabel } from '../pasjans/cards';

const TOP_Y = 12;          // y of the free-cell / foundation row
const DRAG_THRESHOLD = 5;  // px of pointer travel before a press becomes a drag
const FAN = 0.28;          // tableau stack offset, in card heights — every card here is face-up

/* -------------------------------- layout ------------------------------- */

interface Metrics { cardW: number; cardH: number; gap: number; y0: number; colX: (i: number) => number }

/** Column geometry from the board width — 8 slots wide (4 free cells + 4 foundations on top,
 *  8 tableau columns below), same idiom as pasjans' metrics(). */
function metrics(boardW: number): Metrics {
  const gap = Math.round((boardW / 8) * 0.16);
  const cardW = Math.min(110, Math.max(52, Math.floor((boardW - 8 * gap) / 8)));
  const cardH = cardW * CARD_RATIO;
  return { cardW, cardH, gap, y0: cardH + 34, colX: (i) => gap + i * (cardW + gap) };
}

interface Entry { card: Card; x: number; y: number; z: number; from: PileRef | null; index: number }

/** Every card's resting spot. from:null marks a foundation card — never a drag source. */
function buildLayout(s: GameState, m: Metrics): Entry[] {
  const entries: Entry[] = [];
  s.freeCells.forEach((card, i) => {
    if (card) entries.push({ card, x: m.colX(i), y: TOP_Y, z: 1, from: { pile: 'free', index: i }, index: 0 });
  });
  s.foundations.forEach((pile, f) => {
    pile.forEach((card, i) => {
      entries.push({ card, x: m.colX(4 + f), y: TOP_Y, z: i + 1, from: null, index: i });
    });
  });
  s.tableau.forEach((pile, t) => {
    let y = m.y0;
    pile.forEach((card, i) => {
      entries.push({ card, x: m.colX(t), y, z: i + 1, from: { pile: 'tableau', index: t }, index: i });
      y += FAN * m.cardH;
    });
  });
  return entries.sort((a, b) => a.card.id - b.card.id); // stable DOM order; z-index does the stacking
}

function pileTop(s: GameState, ref: PileRef): Card | undefined {
  if (ref.pile === 'free') return s.freeCells[ref.index] ?? undefined;
  if (ref.pile === 'foundation') return s.foundations[ref.index][s.foundations[ref.index].length - 1];
  return s.tableau[ref.index][s.tableau[ref.index].length - 1];
}

function pileLength(s: GameState, ref: PileRef): number {
  if (ref.pile === 'free') return s.freeCells[ref.index] ? 1 : 0;
  if (ref.pile === 'foundation') return s.foundations[ref.index].length;
  return s.tableau[ref.index].length;
}

function sameRef(a: PileRef, b: PileRef): boolean {
  return a.pile === b.pile && a.index === b.index;
}

/** Drop target under the dragged card's center — the overlapping pile whose center is nearest. */
function pickDrop(s: GameState, m: Metrics, cx: number, cy: number): PileRef | null {
  interface DropRect { ref: PileRef; x: number; y: number; w: number; h: number }
  const rects: DropRect[] = [];
  for (let i = 0; i < 4; i++) {
    rects.push({ ref: { pile: 'free', index: i }, x: m.colX(i), y: TOP_Y, w: m.cardW, h: m.cardH });
  }
  for (let f = 0; f < 4; f++) {
    rects.push({ ref: { pile: 'foundation', index: f }, x: m.colX(4 + f), y: TOP_Y, w: m.cardW, h: m.cardH });
  }
  for (let t = 0; t < 8; t++) {
    let h = m.cardH;
    for (let i = 0; i < s.tableau[t].length - 1; i++) h += FAN * m.cardH;
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

/* ------------------------------ component ------------------------------ */

interface Drag {
  from: PileRef;
  index: number;         // index into the source pile array (always 0 for a free cell)
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

type Sfx = 'move' | 'foundation' | 'undo' | 'error' | 'win';

export default function FreeCellApp({ windowId, focused }: AppProps) {
  const game = useRef<GameState>();
  if (!game.current) game.current = newGame();

  const boardRef = useRef<HTMLDivElement>(null);
  const menuWrapRef = useRef<HTMLDivElement>(null);
  const cardEls = useRef(new Map<number, HTMLDivElement>());
  const positionsRef = useRef(new Map<number, { x: number; y: number }>());
  const metricsRef = useRef<Metrics>(metrics(0));
  const dragRef = useRef<Drag | null>(null);

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
  // keyboard play: a picked-up source (null when nothing is held) + the pile handle that holds
  // roving focus. The hotspot layer (see render) is the a11y + keyboard contract; mouse users
  // never touch it. `from:index` selects the whole movable run from its lead card.
  const [selected, setSelected] = useState<{ from: PileRef; index: number } | null>(null);
  const [focusKey, setFocusKey] = useState('free0');
  const hotspotEls = useRef(new Map<string, HTMLDivElement>());

  const sfx = useCallback(
    (k: Sfx) => {
      if (prefs.muted) return;
      switch (k) {
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

  // an OS-level alt-tab can blur the window before `focused` catches up — belt-and-braces
  useEffect(() => {
    window.addEventListener('blur', cancelDrag);
    return () => window.removeEventListener('blur', cancelDrag);
  }, [cancelDrag]);

  /** Plain click / double-click on an exposed card → fly to a foundation when legal. */
  const clickMove = useCallback(
    (from: PileRef, index: number) => {
      const st = game.current!;
      if (index !== pileLength(st, from) - 1) return;
      const to = autoMoveTarget(st, from, index);
      if (!to) return;
      if (moveStack(st, from, index, to)) { sfx('foundation'); bump(); }
    },
    [bump, sfx],
  );

  /** Commit an arbitrary move with the shared sfx feedback (keyboard play + drag drop). */
  const doMove = useCallback(
    (from: PileRef, index: number, to: PileRef) => {
      const st = game.current!;
      if (!moveStack(st, from, index, to)) return false;
      sfx(to.pile === 'foundation' ? 'foundation' : 'move');
      bump();
      return true;
    },
    [bump, sfx],
  );

  const onCardPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>, from: PileRef, index: number, card: Card) => {
      const st = game.current!;
      if (dragRef.current || !activeRef.current || st.won) return;
      if (from.pile !== 'tableau' && index !== pileLength(st, from) - 1) return; // top card only
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
            moved = moveStack(st2, d.from, d.index, target);
            if (moved) sfx(target.pile === 'foundation' ? 'foundation' : 'move');
          }
          if (!moved) {
            // fly back home: restore the resting transform, and the re-render removes
            // .is-dragging so the transition animates the return
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
    [cancelDrag, clickMove, sfx],
  );

  /** Pick-up / place / auto-to-foundation on a pile handle — the whole keyboard move model. */
  const activateHotspot = useCallback(
    (ref: PileRef, pickIndex: number | null) => {
      const st = game.current!;
      if (!activeRef.current || st.won) return;
      if (selected) {
        if (sameRef(selected.from, ref)) {
          // re-activating the source flies its top card to a foundation if it can, else lets go
          const top = pileLength(st, ref) - 1;
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
    [selected, doMove, sfx],
  );

  const dealNew = useCallback(() => {
    cancelDrag();
    setSelected(null);
    game.current = newGame();
    bump();
  }, [bump, cancelDrag]);

  const doUndo = useCallback(() => {
    if (game.current!.history.length === 0) return; // nothing to undo — leave any live drag alone
    cancelDrag();                                    // an in-flight drag references pre-undo indices
    undo(game.current!);
    setSelected(null);
    sfx('undo');
    bump();
  }, [bump, cancelDrag, sfx]);

  // keyboard — attached only while this window is the active game (§8.4 booleans)
  useEffect(() => {
    if (!active) return;
    const down = (e: KeyboardEvent) => {
      if (e.key === 'F2') { dealNew(); e.preventDefault(); }
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
  const won = s.won;
  const winHandled = useRef(false);
  useEffect(() => {
    if (!won) { winHandled.current = false; return; }
    if (winHandled.current) return;
    winHandled.current = true;
    sfx('win');
  }, [won, sfx]);

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
  // visual cards are aria-hidden, so a non-visual read walks these 16 handles in board order
  // (4 free cells, 4 foundations, 8 columns) instead of z-scrambled card nodes.
  interface Hotspot { key: string; ref: PileRef; x: number; y: number; w: number; h: number; label: string; pick: number | null }
  const hint = (ref: PileRef) => (selected && sameRef(selected.from, ref) ? ' (holding — Enter here to send it up)' : '');
  const hotspots: Hotspot[] = [
    ...s.freeCells.map((card, i): Hotspot => {
      const ref: PileRef = { pile: 'free', index: i };
      return {
        key: `free${i}`, ref, x: m.colX(i), y: TOP_Y, w: m.cardW, h: m.cardH,
        pick: card ? 0 : null,
        label: `Free cell ${i + 1}, ${card ? cardLabel(card) : 'empty'}${hint(ref)}`,
      };
    }),
    ...s.foundations.map((pile, f): Hotspot => {
      const ref: PileRef = { pile: 'foundation', index: f };
      return {
        key: `f${f}`, ref, x: m.colX(4 + f), y: TOP_Y, w: m.cardW, h: m.cardH,
        pick: null, // foundations are a drop target only — cards never come back off one
        label: `Foundation ${f + 1}, ${pile.length ? `${cardLabel(pile[pile.length - 1])}, ${pile.length} of 13` : 'empty'}`,
      };
    }),
    ...s.tableau.map((pile, t): Hotspot => {
      const ref: PileRef = { pile: 'tableau', index: t };
      const runLen = movableRunLength(s, t);
      let h = m.cardH;
      for (let i = 0; i < pile.length - 1; i++) h += FAN * m.cardH;
      return {
        key: `t${t}`, ref, x: m.colX(t), y: m.y0, w: m.cardW, h,
        pick: pile.length ? pile.length - runLen : null,
        label: pile.length
          ? `Column ${t + 1}, ${pile.length} card${pile.length === 1 ? '' : 's'}, top ${cardLabel(pile[pile.length - 1])}${hint(ref)}`
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
  const selCard = selected ? pileTop(s, selected.from) : undefined;

  return (
    <div className="freecell">
      <div className="freecell__menu" ref={menuWrapRef}>
        <button
          type="button"
          className="freecell__menubtn"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          Game
        </button>
        {menuOpen && (
          <div className="ctx-menu freecell__menudrop" role="menu">
            <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); dealNew(); }}>
              New game <span>F2</span>
            </button>
            <hr />
            <button type="button" role="menuitem" disabled={s.history.length === 0} onClick={() => { setMenuOpen(false); doUndo(); }}>
              Undo <span>Ctrl+Z</span>
            </button>
          </div>
        )}
      </div>

      <div className="freecell__board" ref={boardRef} role="group" aria-label="FreeCell table">
        {/* Visual slots + cards are aria-hidden; the hotspot layer below is the a11y surface. */}
        {s.freeCells.map((card, i) =>
          !card ? <div key={`free${i}`} className="freecell__slot" aria-hidden="true" style={slotStyle(m.colX(i), TOP_Y)} /> : null,
        )}
        {s.foundations.map((pile, f) =>
          pile.length === 0 ? (
            <div key={`f${f}`} className="freecell__slot" aria-hidden="true" style={slotStyle(m.colX(4 + f), TOP_Y)}>
              A
            </div>
          ) : null,
        )}
        {s.tableau.map((pile, t) =>
          pile.length === 0 ? (
            <div key={`t${t}`} className="freecell__slot" aria-hidden="true" style={slotStyle(m.colX(t), m.y0)} />
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
              className={isDragging ? 'freecell__card is-dragging' : 'freecell__card'}
              style={{
                width: m.cardW,
                height: m.cardH,
                borderRadius: m.cardW * 0.07,
                transform: `translate3d(${x}px, ${y}px, 0)`,
                zIndex: isDragging ? 1000 + k : z,
              }}
              aria-hidden="true"
              onPointerDown={from ? (e) => onCardPointerDown(e, from, index, card) : undefined}
            >
              <CardFace suit={card.suit} rank={card.rank} width={m.cardW} />
            </div>
          );
        })}

        {hotspots.map((h, i) => (
          <div
            key={h.key}
            ref={(el) => { if (el) hotspotEls.current.set(h.key, el); else hotspotEls.current.delete(h.key); }}
            className={selected && sameRef(selected.from, h.ref) ? 'freecell__hotspot is-selected' : 'freecell__hotspot'}
            role="button"
            aria-label={h.label}
            tabIndex={focusKey === h.key ? 0 : -1}
            style={{ left: h.x, top: h.y, width: h.w, height: h.h }}
            onFocus={() => setFocusKey(h.key)}
            onKeyDown={(e) => onHotspotKey(e, i, h)}
          />
        ))}

        {!active && (
          <div className="freecell__overlay">
            <strong>PAUSED</strong>
            <span>Click the window to resume</span>
          </div>
        )}
        {active && won && (
          <div className="freecell__overlay">
            <strong>You won!</strong>
            <span>Score {s.score} — {s.moves} moves</span>
            <button type="button" onClick={dealNew}>▶ New game (F2)</button>
          </div>
        )}
      </div>

      <div className="status-bar">
        <p className="status-bar-field">Score {s.score}</p>
        <p className="status-bar-field">Moves {s.moves}</p>
      </div>

      <div className="sr-only" aria-live="polite">
        {selCard
          ? `Holding ${cardLabel(selCard)}. Move to a pile, or Enter again to send it to a foundation.`
          : won ? `You won! Final score ${s.score}` : `Score ${s.score}`}
      </div>
    </div>
  );
}
