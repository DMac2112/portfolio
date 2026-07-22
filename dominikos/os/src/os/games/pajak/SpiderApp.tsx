// Pasjans Pająk (Spider solitaire) — DominikOS card game (kind:'react' via componentById):
// pointer-drag, an XP-style Game menu (with a suit-difficulty radio group mirroring pasjans'
// Draw-one/Draw-three pattern), a sunken status bar, undo, and keyboard play via a
// roving-tabindex hotspot layer — the pause contract shared by every in-app game. Rules live in
// ./engine (a locked contract); the card art is the UNMODIFIED pasjans renderer imported from
// ../pasjans/cards — this file is presentation + input only, cloned from
// ../pasjans/SolitaireApp.tsx's shell (see also ../freecell/FreeCellApp.tsx, a sibling clone).
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
  newGame, moveStack, dealStock, canDeal, movableRunLength, undo,
  type Card, type GameState, type PileRef, type Suit,
} from './engine';
import { CardFace, CardBack, CARD_RATIO, cardLabel } from '../pasjans/cards';

const TOP_Y = 12;          // visible top inset of the fanned stock
const DRAG_THRESHOLD = 5;  // px of pointer travel before a press becomes a drag
const FAN = 0.28;          // face-up stack offset, in card heights/widths
const STOCK_FAN = 0.06;    // stock pile's own tiny "deck of blocks" offset

/* -------------------------------- layout ------------------------------- */

interface Metrics { cardW: number; cardH: number; gap: number; y0: number; colX: (i: number) => number; stockX: number; stockY: number }

/** Column geometry from the board width — 10 tableau columns; the stock sits in the same top
 *  row, one card-width to the right of the last column (pasjans-style metrics idiom). */
function metrics(boardW: number): Metrics {
  const gap = Math.max(2, Math.round((boardW / 11) * 0.16));
  const cardW = Math.min(100, Math.max(20, Math.floor((boardW - 12 * gap) / 11)));
  const cardH = cardW * CARD_RATIO;
  const colX = (i: number) => gap + i * (cardW + gap);
  const stockY = TOP_Y + 4 * cardH * STOCK_FAN;
  return { cardW, cardH, gap, y0: cardH + 34, colX, stockX: colX(10), stockY };
}

interface Entry { card: Card; x: number; y: number; z: number; from: PileRef | null; index: number }

/** Every card's resting spot. from:null marks the stock (click-only — never dragged), same
 *  idiom as pasjans' own stock pile: every stock card shares one spot, layered by z-index only —
 *  the "5 deals left" cue lives in the stock hotspot's label and the status bar, not the pixels. */
function buildLayout(s: GameState, m: Metrics): Entry[] {
  const entries: Entry[] = [];
  s.stock.forEach((card, i) => {
    entries.push({
      card,
      x: m.stockX - Math.floor(i / 10) * m.cardW * STOCK_FAN,
      y: m.stockY - Math.floor(i / 10) * m.cardH * STOCK_FAN,
      z: i + 1,
      from: null,
      index: i,
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

function sameRef(a: PileRef, b: PileRef): boolean {
  return a.pile === b.pile && a.index === b.index;
}

/** Drop target under the dragged card's center — the overlapping column whose center is nearest. */
function pickDrop(s: GameState, m: Metrics, cx: number, cy: number): PileRef | null {
  interface DropRect { ref: PileRef; x: number; y: number; w: number; h: number }
  const rects: DropRect[] = [];
  for (let t = 0; t < 10; t++) {
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

/* ------------------------------ component ------------------------------ */

interface Drag {
  from: PileRef;
  index: number;         // index into the source column array
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
type SuitCount = 1 | 2 | 4;

const SUIT_LABEL: Record<SuitCount, string> = { 1: 'Jeden kolor', 2: 'Dwa kolory', 4: 'Cztery kolory' };

export default function SpiderApp({ windowId, focused }: AppProps) {
  const game = useRef<GameState>();
  if (!game.current) game.current = newGame(1);

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
  const [announce, setAnnounce] = useState('');
  // keyboard play: a picked-up source (null when nothing is held) + the pile handle that holds
  // roving focus. The hotspot layer (see render) is the a11y + keyboard contract; mouse users
  // never touch it. `from:index` selects the whole grabbed run from its lead card.
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

  /** Commit an arbitrary move with the shared sfx + auto-flip feedback (drag drop + keyboard). */
  const doMove = useCallback(
    (from: PileRef, index: number, to: PileRef) => {
      const st = game.current!;
      const before = st.completed;
      const srcArr = st.tableau[from.index];
      const willFlip = index > 0 && !srcArr[index - 1].faceUp;
      if (!moveStack(st, from, index, to)) return false;
      if (st.completed > before) { sfx('foundation'); setAnnounce(`Talia ukończona! ${st.completed} z 8.`); }
      else sfx('move');
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
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const board = boardRef.current;
      const home = positionsRef.current.get(card.id);
      if (!board || !home) return;
      e.preventDefault();
      const rect = board.getBoundingClientRect();
      const ids = st.tableau[from.index].slice(index).map((c) => c.id);

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
          if (!d.started) { bump(); return; } // plain click: Spider has no double-click auto-move target
          const st2 = game.current!;
          const m = metricsRef.current;
          const target = pickDrop(st2, m, d.curX + m.cardW / 2, d.curY + m.cardH / 2);
          let moved = false;
          if (target && !sameRef(target, d.from)) moved = doMove(d.from, d.index, target);
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
    [bump, cancelDrag, doMove, sfx],
  );

  const onStock = useCallback(() => {
    const st = game.current!;
    if (!activeRef.current || st.won) return;
    const before = st.completed;
    if (dealStock(st)) {
      sfx('draw');
      if (st.completed > before) {
        sfx('foundation');
        setAnnounce(`Ukończone talie: ${st.completed} z 8.`);
      }
      bump();
    }
    else { sfx('error'); setAnnounce('Nie można rozdać — jest pusta kolumna.'); }
  }, [bump, sfx]);

  /** Pick-up / place on a column handle — the whole keyboard move model. */
  const activateHotspot = useCallback(
    (ref: PileRef | null, pickIndex: number | null) => {
      const st = game.current!;
      if (!activeRef.current || st.won) return;
      if (ref === null) { onStock(); return; } // the stock handle deals
      if (selected) {
        if (sameRef(selected.from, ref)) { setSelected(null); return; } // re-activating the source lets go
        if (!doMove(selected.from, selected.index, ref)) sfx('error');
        setSelected(null);
        return;
      }
      if (pickIndex === null) { sfx('error'); return; } // empty column / nothing to grab
      setSelected({ from: ref, index: pickIndex });
    },
    [selected, doMove, onStock, sfx],
  );

  const dealNew = useCallback(
    (suitCount: SuitCount) => {
      cancelDrag();
      setSelected(null);
      setAnnounce('');
      game.current = newGame(suitCount);
      sfx('flip');
      bump();
    },
    [bump, cancelDrag, sfx],
  );

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
      if (e.key === 'F2') { dealNew(game.current!.suitCount); e.preventDefault(); }
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

  // One focusable, richly-labelled handle per pile — the keyboard + screen-reader board:
  // stock + 10 columns = 11 hotspots, walked in board order.
  interface Hotspot { key: string; ref: PileRef | null; x: number; y: number; w: number; h: number; label: string; pick: number | null }
  const hint = (ref: PileRef) => (selected && sameRef(selected.from, ref) ? ' (trzymane — Enter tutaj, aby odłożyć)' : '');
  const dealReady = canDeal(s);
  const hotspots: Hotspot[] = [
    {
      key: 'stock', ref: null, x: m.stockX, y: TOP_Y, w: m.cardW, h: m.cardH + m.stockY - TOP_Y, pick: null,
      label: `Stos, ${s.stock.length} kart. ${dealReady ? 'Enter, aby rozdać.' : 'Rozdanie zablokowane — jest pusta kolumna.'}`,
    },
    ...s.tableau.map((pile, t): Hotspot => {
      const ref: PileRef = { pile: 'tableau', index: t };
      const runLen = movableRunLength(s, t);
      const faceDown = pile.reduce((n, c) => n + (c.faceUp ? 0 : 1), 0);
      let h = m.cardH;
      for (let i = 0; i < pile.length - 1; i++) h += (pile[i].faceUp ? FAN : 0.16) * m.cardH;
      return {
        key: `t${t}`, ref, x: m.colX(t), y: m.y0, w: m.cardW, h,
        pick: pile.length ? pile.length - Math.max(1, runLen) : null,
        label: pile.length
          ? `Kolumna ${t + 1}, ${pile.length} kart${faceDown ? `, ${faceDown} zakrytych` : ''}, góra ${cardLabel(pile[pile.length - 1])}${hint(ref)}`
          : `Kolumna ${t + 1}, pusta${hint(ref)}`,
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
  const selCard = selected ? s.tableau[selected.from.index][selected.index] : undefined;

  return (
    <div className="pajak">
      <div className="pajak__menu" ref={menuWrapRef}>
        <button
          type="button"
          className="pajak__menubtn"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          Gra
        </button>
        {menuOpen && (
          <div className="ctx-menu pajak__menudrop" role="menu">
            <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); dealNew(s.suitCount); }}>
              Nowa gra <span>F2</span>
            </button>
            <hr />
            {([1, 2, 4] as const).map((count) => (
              <button
                key={count}
                type="button"
                role="menuitemradio"
                aria-checked={s.suitCount === count}
                onClick={() => { setMenuOpen(false); dealNew(count); }}
              >
                {s.suitCount === count ? `✓ ${SUIT_LABEL[count]}` : SUIT_LABEL[count]}
              </button>
            ))}
            <hr />
            <button type="button" role="menuitem" disabled={s.history.length === 0} onClick={() => { setMenuOpen(false); doUndo(); }}>
              Cofnij <span>Ctrl+Z</span>
            </button>
          </div>
        )}
      </div>

      <div className="pajak__board" ref={boardRef} role="group" aria-label="Stół pasjansa Pająk">
        {/* Visual slots + cards are aria-hidden; the hotspot layer below is the a11y surface. */}
        <div
          className="pajak__slot"
          aria-hidden="true"
          style={slotStyle(m.stockX, m.stockY)}
          onClick={onStock}
        >
          {s.stock.length === 0 ? '' : ''}
        </div>
        {s.tableau.map((pile, t) =>
          pile.length === 0 ? (
            <div key={`t${t}`} className="pajak__slot" aria-hidden="true" style={slotStyle(m.colX(t), m.y0)} />
          ) : null,
        )}

        {entries.map(({ card, x, y, z, from, index }) => {
          const isDragging = !!drag && drag.started && drag.ids.includes(card.id);
          const k = isDragging ? drag.ids.indexOf(card.id) : 0;
          const draggable = from !== null && from.index >= 0;
          return (
            <div
              key={card.id}
              ref={(el) => {
                if (el) cardEls.current.set(card.id, el);
                else cardEls.current.delete(card.id);
              }}
              className={isDragging ? 'pajak__card is-dragging' : 'pajak__card'}
              style={{
                width: m.cardW,
                height: m.cardH,
                borderRadius: m.cardW * 0.07,
                transform: `translate3d(${x}px, ${y}px, 0)`,
                zIndex: isDragging ? 1000 + k : z,
              }}
              aria-hidden="true"
              onPointerDown={draggable ? (e) => onCardPointerDown(e, from!, index, card) : undefined}
              onClick={!draggable ? onStock : undefined}
            >
              {card.faceUp
                ? <CardFace suit={card.suit as Suit} rank={card.rank} width={m.cardW} />
                : <CardBack width={m.cardW} />}
            </div>
          );
        })}

        {hotspots.map((h, i) => (
          <div
            key={h.key}
            ref={(el) => { if (el) hotspotEls.current.set(h.key, el); else hotspotEls.current.delete(h.key); }}
            className={selected && h.ref && sameRef(selected.from, h.ref) ? 'pajak__hotspot is-selected' : 'pajak__hotspot'}
            role="button"
            aria-label={h.label}
            tabIndex={focusKey === h.key ? 0 : -1}
            style={{ left: h.x, top: h.y, width: h.w, height: h.h }}
            onFocus={() => setFocusKey(h.key)}
            onKeyDown={(e) => onHotspotKey(e, i, h)}
          />
        ))}

        {!active && (
          <div className="pajak__overlay">
            <strong>PAUZA</strong>
            <span>Kliknij okno, aby wznowić</span>
          </div>
        )}
        {active && won && (
          <div className="pajak__overlay">
            <strong>Wygrana!</strong>
            <span>Wynik {s.score} — ruchy {s.moves}</span>
            <button type="button" onClick={() => dealNew(s.suitCount)}>▶ Nowa gra (F2)</button>
          </div>
        )}
      </div>

      <div className="status-bar">
        <p className="status-bar-field">Wynik {s.score}</p>
        <p className="status-bar-field">Ruchy {s.moves}</p>
        <p className="status-bar-field">Talie: {s.completed}/8</p>
      </div>

      <div className="sr-only" aria-live="polite">
        {selCard
          ? `Trzymasz ${cardLabel(selCard)}. Przenieś na kolumnę, lub Enter na tym samym miejscu, aby odłożyć.`
          : won ? `Wygrana! Wynik końcowy ${s.score}` : announce || `Wynik ${s.score}`}
      </div>
    </div>
  );
}
