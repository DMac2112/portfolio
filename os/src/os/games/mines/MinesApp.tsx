// Minesweeper — DominikOS's sixth game (kind:'react' via componentById, plan §8.4/§8.6). Unlike the
// canvas games, this is turn-based, so it renders a DOM grid (like Pasjans) — no useGameLoop / no
// rAF. The only time-based thing is the 1-second clock, a setInterval gated on the §8.4 active
// booleans. Rules live in ./engine (a locked, unit-tested contract); all art is drawn in code/SVG.
import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type MouseEvent as ReactMouseEvent } from 'react';
import type { AppProps } from '../../types';
import { useOSStore } from '../../store/osStore';
import { usePageVisible } from '../../hooks/usePageVisible';
import { useSystem } from '../../context/SystemContext';
import { tone } from '../../sound';
import {
  newGame, reveal, toggleFlag, chord, idx, remaining,
  BEGINNER, INTERMEDIATE, EXPERT, NUMBER_COLORS, MAX_TIME,
  type MineState, type GameEvent, type Difficulty,
} from './engine';

type DiffKey = 'beginner' | 'intermediate' | 'expert';
const DIFFS: Record<DiffKey, Difficulty> = { beginner: BEGINNER, intermediate: INTERMEDIATE, expert: EXPERT };
const PREF_KEY = 'dmos.v1.mines';
const LONG_MS = 450;   // touch long-press duration that flags a covered cell
const MOVE_TOL = 12;   // px of finger drift that cancels a long-press (treated as a scroll)

interface Prefs { diff: DiffKey; marks: boolean; best: Record<DiffKey, number>; }
function loadPrefs(): Prefs {
  try {
    const p = JSON.parse(localStorage.getItem(PREF_KEY) ?? '{}') as Partial<Prefs>;
    return {
      diff: p.diff === 'intermediate' || p.diff === 'expert' ? p.diff : 'beginner',
      marks: !!p.marks,
      best: { beginner: p.best?.beginner ?? 0, intermediate: p.best?.intermediate ?? 0, expert: p.best?.expert ?? 0 },
    };
  } catch { return { diff: 'beginner', marks: false, best: { beginner: 0, intermediate: 0, expert: 0 } }; }
}
function savePrefs(p: Prefs): void { try { localStorage.setItem(PREF_KEY, JSON.stringify(p)); } catch { /* fine */ } }

/** 3-char LED string: 000..999, or -01..-99 when negative. */
function led(n: number): string {
  if (n < 0) return '-' + String(Math.min(99, -n)).padStart(2, '0');
  return String(Math.min(999, n)).padStart(3, '0');
}

/* -------------------------------- pixel art ------------------------------- */
// XP look: every glyph is drawn on a pixel grid as crispEdges rects — no anti-aliasing anywhere.

/** Merge each row of a string grid into horizontal runs (spaces are transparent). */
function runs(rows: string[]): { x: number; y: number; w: number; ch: string }[] {
  const out: { x: number; y: number; w: number; ch: string }[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (ch === ' ') { x++; continue; }
      let w = 1;
      while (x + w < row.length && row[x + w] === ch) w++;
      out.push({ x, y, w, ch });
      x += w;
    }
  });
  return out;
}
function Px({ rows, map, n, cls }: { rows: string[]; map: Record<string, string>; n: number; cls: string }): JSX.Element {
  return (
    <svg viewBox={`0 0 ${n} ${n}`} className={cls} shapeRendering="crispEdges" aria-hidden="true">
      {runs(rows).map((r, i) => <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={map[r.ch] ?? '#000'} />)}
    </svg>
  );
}

/** Blocky filled disc (Y body / o rim) as a string grid. */
function disc(n: number, cx: number, cy: number, rr: number, rim: number): string[][] {
  const g: string[][] = Array.from({ length: n }, () => Array<string>(n).fill(' '));
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const d = Math.hypot(x - cx, y - cy);
    if (d <= rr) g[y][x] = 'Y'; else if (d <= rr + rim) g[y][x] = 'o';
  }
  return g;
}
function buildMine(): string[] {
  const n = 13;
  const g: string[][] = Array.from({ length: n }, () => Array<string>(n).fill(' '));
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (Math.hypot(x - 6, y - 6) <= 4) g[y][x] = 'o';
  for (let i = 1; i < 12; i++) { g[i][6] = 'o'; g[6][i] = 'o'; }               // vertical + horizontal spikes
  for (const [dy, dx] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) for (let k = 3; k <= 5; k++) g[6 + dy * k][6 + dx * k] = 'o';
  g[4][4] = 'W'; g[4][5] = 'W'; g[5][4] = 'W';                                  // highlight
  return g.map((r) => r.join(''));
}
function buildFace(kind: 'play' | 'press' | 'won' | 'lost'): string[] {
  const n = 13;
  const g = disc(n, 6, 6, 6, 0.8);
  const put = (y: number, x: number) => { if (g[y] && x >= 0 && x < n) g[y][x] = 'K'; };
  if (kind === 'won') {                       // sunglasses
    for (let x = 2; x <= 4; x++) { put(4, x); put(5, x); }
    for (let x = 8; x <= 10; x++) { put(4, x); put(5, x); }
    put(5, 5); put(5, 6); put(5, 7);
  } else if (kind === 'lost') {               // X eyes
    for (const e of [3, 9]) { put(3, e - 1); put(3, e + 1); put(4, e); put(5, e - 1); put(5, e + 1); }
  } else {                                    // dot eyes
    put(4, 3); put(5, 3); put(4, 4); put(4, 9); put(5, 9); put(4, 8);
  }
  if (kind === 'lost') { put(10, 4); put(10, 8); put(9, 5); put(9, 6); put(9, 7); }         // frown
  else if (kind === 'press') { put(8, 5); put(8, 6); put(8, 7); put(9, 5); put(9, 7); put(10, 5); put(10, 6); put(10, 7); } // O
  else { put(8, 3); put(8, 9); put(9, 4); put(9, 8); put(10, 5); put(10, 6); put(10, 7); }  // smile
  return g.map((r) => r.join(''));
}
const MINE_ROWS = buildMine();
const FLAG_ROWS = [
  '             ', '        K    ', '   RRRRRK    ', '   RRRRRK    ', '    RRRRK    ',
  '     RRRK    ', '      RRK    ', '        K    ', '        K    ', '        K    ',
  '     KKKKKK  ', '    KKKKKKKK ', '             ',
];
const FACE_ROWS: Record<string, string[]> = { play: buildFace('play'), press: buildFace('press'), won: buildFace('won'), lost: buildFace('lost') };
const NUM_ROWS: Record<number, string[]> = {
  1: [' # ', '## ', ' # ', ' # ', '###'], 2: ['###', '  #', '###', '#  ', '###'],
  3: ['###', '  #', '###', '  #', '###'], 4: ['# #', '# #', '###', '  #', '  #'],
  5: ['###', '#  ', '###', '  #', '###'], 6: ['###', '#  ', '###', '# #', '###'],
  7: ['###', '  #', '  #', ' # ', ' # '], 8: ['###', '# #', '###', '# #', '###'],
};
const MINE_MAP = { o: '#141414', W: '#ffffff' };
const FLAG_MAP = { R: '#d62a2a', K: '#1a1a1a' };
const FACE_MAP = { Y: '#ffd23e', o: '#c99a1a', K: '#1a1a1a' };

const MineIco = (): JSX.Element => <Px rows={MINE_ROWS} map={MINE_MAP} n={13} cls="mines__px" />;
const FlagIco = (): JSX.Element => <Px rows={FLAG_ROWS} map={FLAG_MAP} n={13} cls="mines__px" />;
function Face({ face }: { face: 'play' | 'press' | 'won' | 'lost' }): JSX.Element {
  return <Px rows={FACE_ROWS[face]} map={FACE_MAP} n={13} cls="mines__px" />;
}
function Num({ n }: { n: number }): JSX.Element {
  return (
    <svg viewBox="0 0 3 5" className="mines__num" shapeRendering="crispEdges" aria-hidden="true">
      {runs(NUM_ROWS[n] ?? []).map((r, i) => <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={NUMBER_COLORS[n]} />)}
    </svg>
  );
}

/* -------------------------------- component ------------------------------- */

export default function MinesApp({ windowId, focused }: AppProps) {
  const prefs0 = useRef<Prefs>();
  if (!prefs0.current) prefs0.current = loadPrefs();
  const [diff, setDiff] = useState<DiffKey>(prefs0.current.diff);
  const [marks, setMarks] = useState<boolean>(prefs0.current.marks);
  const [best, setBest] = useState<Record<DiffKey, number>>(prefs0.current.best);

  const game = useRef<MineState>();
  if (!game.current) game.current = newGame({ ...DIFFS[diff], allowMarks: prefs0.current.marks });

  const [, setV] = useState(0);
  const bump = useCallback(() => setV((v) => v + 1), []);
  const [time, setTime] = useState(0);
  const timeRef = useRef(0); timeRef.current = time;
  const [menuOpen, setMenuOpen] = useState(false);
  const [pressing, setPressing] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [tile, setTile] = useState(24);
  const [live, setLive] = useState('');

  const frameRef = useRef<HTMLDivElement>(null);
  const hudRef = useRef<HTMLDivElement>(null);
  const menuWrapRef = useRef<HTMLDivElement>(null);
  // Touch flagging: on a phone there is no right-click, so a press held past LONG_MS flags the cell.
  // A mouse keeps the classic left-reveal / right-flag / middle-chord, so desktop play is unchanged.
  const lp = useRef({ timer: 0, fired: false, x: 0, y: 0 });
  const lastType = useRef<string>('mouse');

  const visible = usePageVisible();
  const minimized = useOSStore((st) => st.windows[windowId]?.state === 'minimized');
  const { prefs } = useSystem();
  const active = focused && visible && !minimized;

  const s = game.current;
  const status = s.status;
  const over = status === 'won' || status === 'lost';

  const sfx = useCallback((e: GameEvent) => {
    if (prefs.muted) return;
    switch (e.type) {
      case 'reveal': tone(0, 300, 0.03, 0.035); break;
      case 'flag': tone(0, 520, 0.04, 0.05, 'square'); break;
      case 'chord': tone(0, 240, 0.04, 0.045); break;
      case 'boom': tone(0, 150, 0.14, 0.08, 'sawtooth'); tone(0.08, 90, 0.3, 0.07, 'sawtooth'); break;
      case 'win': tone(0, 523, 0.11, 0.07); tone(0.1, 659, 0.11, 0.07); tone(0.2, 784, 0.22, 0.07); break;
      default: break;
    }
  }, [prefs.muted]);

  const afterAction = useCallback((ev: GameEvent[]) => {
    if (ev.length === 0) return;
    for (const e of ev) sfx(e);
    if (ev.some((e) => e.type === 'win')) {
      const t = timeRef.current;
      setBest((b) => {
        if (b[diff] !== 0 && t >= b[diff]) return b;
        const nb = { ...b, [diff]: t };
        savePrefs({ diff, marks, best: nb });
        return nb;
      });
      setLive(`Cleared in ${timeRef.current} seconds!`);
    } else if (ev.some((e) => e.type === 'lose')) {
      setLive('Boom — game over. Press F2 for a new game.');
    } else if (ev.some((e) => e.type === 'flag')) {
      setLive(`${remaining(game.current!)} mines remaining`);
    }
    bump();
  }, [sfx, bump, diff, marks]);

  const startGame = useCallback((key: DiffKey, mk: boolean) => {
    game.current = newGame({ ...DIFFS[key], allowMarks: mk });
    setTime(0);
    setCursor(0);
    setPressing(false);
    setLive('New game.');
    bump();
  }, [bump]);

  const newGameNow = useCallback(() => startGame(diff, marks), [startGame, diff, marks]);

  const pickDiff = useCallback((key: DiffKey) => {
    setDiff(key);
    savePrefs({ diff: key, marks, best });
    startGame(key, marks);
  }, [marks, best, startGame]);

  const toggleMarks = useCallback(() => {
    const mk = !marks;
    setMarks(mk);
    game.current!.allowMarks = mk;
    savePrefs({ diff, marks: mk, best });
    bump();
  }, [marks, diff, best, bump]);

  // clock: counts only while active AND actively playing (§8.4 pause). Reruns as status flips.
  useEffect(() => {
    if (!(active && status === 'play')) return;
    const id = setInterval(() => setTime((t) => Math.min(MAX_TIME, t + 1)), 1000);
    return () => clearInterval(id);
  }, [active, status]);

  // responsive tile size. Desktop: fit the board width, 16..26px (unchanged). Mobile (≤520px): fill
  // the window — fit BOTH available width and height so the board runs nearly edge-to-edge, 18..46px.
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const measure = () => {
      const mobile = window.matchMedia('(max-width: 520px)').matches;
      if (mobile) {
        const availW = el.clientWidth - 8;
        const availH = el.clientHeight - (hudRef.current?.offsetHeight ?? 44) - 18;
        const t = Math.floor(Math.min(availW / s.w, availH / s.h));
        setTile(Math.max(18, Math.min(46, t)));
      } else {
        setTile(Math.max(16, Math.min(26, Math.floor((el.clientWidth - 12) / s.w))));
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [s.w, s.h]);

  // window-level keys: F2 new game; also close the menu on Esc / outside click
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'F2') { newGameNow(); e.preventDefault(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, newGameNow]);
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: Event) => { if (!menuWrapRef.current?.contains(e.target as Node)) setMenuOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('pointerdown', onDown); window.removeEventListener('keydown', onKey); };
  }, [menuOpen]);

  /* ---- actions ---- */
  const doReveal = useCallback((r: number, c: number) => {
    if (!active || over) return;
    const cell = game.current!.cells[idx(game.current!, r, c)];
    const ev: GameEvent[] = [];
    if (cell.state === 'revealed') chord(game.current!, r, c, ev);
    else reveal(game.current!, r, c, ev);
    afterAction(ev);
  }, [active, over, afterAction]);

  const doFlag = useCallback((r: number, c: number) => {
    if (!active || over) return;
    const ev: GameEvent[] = [];
    toggleFlag(game.current!, r, c, ev);
    afterAction(ev);
  }, [active, over, afterAction]);

  /* ---- pointer input (mouse: click reveal / right-click flag / middle chord; touch: tap reveal /
          hold-to-flag). One long-press timer at a time, cancelled if the finger drifts (a scroll). */
  const clearLongPress = useCallback(() => {
    if (lp.current.timer) { clearTimeout(lp.current.timer); lp.current.timer = 0; }
  }, []);

  const onCellPointerDown = useCallback((e: ReactPointerEvent, r: number, c: number, i: number) => {
    lastType.current = e.pointerType || 'mouse';
    if (game.current!.cells[i].state !== 'revealed') setPressing(true);
    if (e.pointerType === 'mouse') return; // mouse flags via right-click, not a hold
    lp.current.fired = false;
    lp.current.x = e.clientX;
    lp.current.y = e.clientY;
    clearLongPress();
    lp.current.timer = window.setTimeout(() => {
      lp.current.timer = 0;
      lp.current.fired = true; // suppresses the trailing tap so the cell flags instead of opening
      setPressing(false);
      doFlag(r, c);
    }, LONG_MS);
  }, [doFlag, clearLongPress]);

  const onCellPointerMove = useCallback((e: ReactPointerEvent) => {
    if (!lp.current.timer) return;
    if (Math.hypot(e.clientX - lp.current.x, e.clientY - lp.current.y) > MOVE_TOL) clearLongPress();
  }, [clearLongPress]);

  const endPress = useCallback(() => { clearLongPress(); setPressing(false); }, [clearLongPress]);

  const onCellClick = useCallback((r: number, c: number, i: number) => {
    setCursor(i);
    if (lp.current.fired) { lp.current.fired = false; return; } // a hold already flagged this cell
    doReveal(r, c);
  }, [doReveal]);

  const onCellContextMenu = useCallback((e: ReactMouseEvent, r: number, c: number, i: number) => {
    e.preventDefault(); // kill the native menu on both mouse and touch long-press
    if (lastType.current !== 'mouse') return; // touch flagging is the long-press timer's job
    setCursor(i);
    doFlag(r, c);
  }, [doFlag]);

  const onBoardKey = useCallback((e: ReactKeyboardEvent) => {
    const w = s.w, h = s.h;
    let r = Math.floor(cursor / w), c = cursor - r * w;
    switch (e.key) {
      case 'ArrowUp': r = Math.max(0, r - 1); break;
      case 'ArrowDown': r = Math.min(h - 1, r + 1); break;
      case 'ArrowLeft': c = Math.max(0, c - 1); break;
      case 'ArrowRight': c = Math.min(w - 1, c + 1); break;
      case 'Enter': case ' ': e.preventDefault(); doReveal(r, c); return;
      case 'f': case 'F': e.preventDefault(); doFlag(r, c); return;
      default: return;
    }
    e.preventDefault();
    setCursor(r * w + c);
  }, [s.w, s.h, cursor, doReveal, doFlag]);

  const face: 'play' | 'press' | 'won' | 'lost' = status === 'won' ? 'won' : status === 'lost' ? 'lost' : pressing ? 'press' : 'play';

  const cellLabel = (i: number): string => {
    const cell = s.cells[i];
    const r = Math.floor(i / s.w) + 1, c = (i % s.w) + 1;
    let d: string;
    if (cell.state === 'flagged') d = 'flagged';
    else if (cell.state === 'question') d = 'question mark';
    else if (cell.state === 'hidden') d = 'hidden';
    else if (cell.mine) d = 'mine';
    else d = cell.adj > 0 ? `${cell.adj}` : 'empty';
    return `row ${r} column ${c}, ${d}`;
  };

  return (
    <div className="mines">
      <div className="mines__menu" ref={menuWrapRef}>
        <button type="button" className="mines__menubtn" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)}>Game</button>
        {menuOpen && (
          <div className="ctx-menu mines__menudrop" role="menu">
            <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); newGameNow(); }}>New <span>F2</span></button>
            <hr />
            {(['beginner', 'intermediate', 'expert'] as DiffKey[]).map((k) => (
              <button key={k} type="button" role="menuitemradio" aria-checked={diff === k} onClick={() => { setMenuOpen(false); pickDiff(k); }}>
                {diff === k ? '✓ ' : ''}{k[0].toUpperCase() + k.slice(1)}
                <span>{DIFFS[k].w}×{DIFFS[k].h}</span>
              </button>
            ))}
            <hr />
            <button type="button" role="menuitemcheckbox" aria-checked={marks} onClick={() => { setMenuOpen(false); toggleMarks(); }}>
              {marks ? '✓ ' : ''}Marks (?)
            </button>
            <hr />
            <button type="button" role="menuitem" disabled onClick={() => setMenuOpen(false)}>
              Best {diff[0].toUpperCase() + diff.slice(1)} <span>{best[diff] ? `${best[diff]}s` : '—'}</span>
            </button>
          </div>
        )}
      </div>

      <div className="mines__frame" ref={frameRef}>
        <div className="mines__hud" ref={hudRef}>
          <span className="mines__led" aria-hidden="true">{led(remaining(s))}</span>
          <button type="button" className="mines__face" data-face={face} onClick={newGameNow} aria-label="New game (smiley reset)"><Face face={face} /></button>
          <span className="mines__led" aria-hidden="true">{led(time)}</span>
        </div>

        <div
          className="mines__board"
          role="grid"
          aria-label={`Minesweeper, ${s.w} by ${s.h}, ${s.mines} mines`}
          aria-activedescendant={`mines-c-${cursor}`}
          tabIndex={0}
          onKeyDown={onBoardKey}
          style={{ gridTemplateColumns: `repeat(${s.w}, ${tile}px)`, gridAutoRows: `${tile}px`, fontSize: Math.round(tile * 0.56) }}
        >
          {s.cells.map((cell, i) => {
            const r = Math.floor(i / s.w), c = i % s.w;
            const open = cell.state === 'revealed';
            const misflag = over && cell.state === 'flagged' && !cell.mine;
            const cls = ['mines__cell'];
            if (open) cls.push('is-open');
            if (i === s.boom) cls.push('is-boom');
            if (i === cursor) cls.push('is-cursor');
            let content: JSX.Element | string = '';
            if (cell.state === 'flagged') content = misflag ? <span className="mines__misflag"><MineIco /></span> : <FlagIco />;
            else if (cell.state === 'question') content = '?';
            else if (open && cell.mine) content = <MineIco />;
            else if (open && cell.adj > 0) content = <Num n={cell.adj} />;
            return (
              <button
                key={i}
                id={`mines-c-${i}`}
                type="button"
                role="gridcell"
                aria-label={cellLabel(i)}
                tabIndex={-1}
                className={cls.join(' ')}
                onClick={() => onCellClick(r, c, i)}
                onContextMenu={(e) => onCellContextMenu(e, r, c, i)}
                onAuxClick={(e) => { if (e.button === 1) { e.preventDefault(); setCursor(i); if (game.current!.cells[i].state === 'revealed') doReveal(r, c); } }}
                onPointerDown={(e) => onCellPointerDown(e, r, c, i)}
                onPointerMove={onCellPointerMove}
                onPointerUp={endPress}
                onPointerCancel={endPress}
                onPointerLeave={endPress}
              >
                {content}
              </button>
            );
          })}
        </div>
      </div>

      {!active && (
        <div className="mines__overlay"><strong>PAUSED</strong><span>Click the window to resume</span></div>
      )}
      <div className="sr-only" aria-live="polite">{live}</div>
    </div>
  );
}
