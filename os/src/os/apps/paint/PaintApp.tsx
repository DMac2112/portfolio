// Paint — DominikOS bitmap paint app (kind:'react' via componentById). DOM chrome + two stacked
// canvases (committed artwork + a live preview overlay). It's an app, not a game: no useGameLoop/rAF
// — event-driven strokes. The only timer is the airbrush spray, gated on §8.4 active booleans.
// Rules/pixel helpers live in ./canvas (locked, unit-tested). Every glyph is a crispEdges pixel icon
// and every surface is hard-beveled — XP through and through.
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { AppProps } from '../../types';
import { useOSStore } from '../../store/osStore';
import { usePageVisible } from '../../hooks/usePageVisible';
import { floodFill, hexToRgba, rgbaToHex, linePoints, PALETTE } from './canvas';

const DEFAULT_W = 560, DEFAULT_H = 360;
const MIN_DIM = 64, MAX_DIM = 1600;
const MAX_UNDO = 16;
const BRUSH_SIZES = [1, 2, 4, 7];
const TEXT_PX = 18;
const TEXTFONT = '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif';

type Tool = 'pencil' | 'brush' | 'airbrush' | 'fill' | 'eraser' | 'eyedropper' | 'line' | 'rect' | 'ellipse' | 'text';
type ShapeMode = 'outline' | 'fill' | 'both';
interface Pt { x: number; y: number; }
interface Snap { w: number; h: number; data: ImageData; }

const TOOLS: { t: Tool; label: string; key: string }[] = [
  { t: 'pencil', label: 'Pencil', key: 'P' }, { t: 'brush', label: 'Brush', key: 'B' },
  { t: 'airbrush', label: 'Airbrush', key: 'A' }, { t: 'fill', label: 'Fill', key: 'F' },
  { t: 'eraser', label: 'Eraser', key: 'X' }, { t: 'eyedropper', label: 'Pick colour', key: 'K' },
  { t: 'text', label: 'Text', key: 'T' }, { t: 'line', label: 'Line', key: 'L' },
  { t: 'rect', label: 'Rectangle', key: 'R' }, { t: 'ellipse', label: 'Ellipse', key: 'E' },
];

const clampDim = (n: number): number => Math.max(MIN_DIM, Math.min(MAX_DIM, Math.round(n)));

/* ------------------------------ pixel drawing ----------------------------- */

function nib(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string): void {
  ctx.fillStyle = color;
  const o = (size - 1) >> 1;
  ctx.fillRect(x - o, y - o, size, size);
}
function segment(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, size: number, color: string): void {
  for (const [x, y] of linePoints(a.x, a.y, b.x, b.y)) nib(ctx, x, y, size, color);
}
function rectShape(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, size: number, mode: ShapeMode, outline: string, fill: string): void {
  const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y), w = Math.abs(b.x - a.x) || 1, h = Math.abs(b.y - a.y) || 1;
  if (mode !== 'outline') { ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); }
  if (mode !== 'fill') {
    ctx.fillStyle = outline;
    const s = Math.max(1, Math.min(size, Math.floor(Math.min(w, h) / 2) || 1));
    ctx.fillRect(x, y, w, s); ctx.fillRect(x, y + h - s, w, s); ctx.fillRect(x, y, s, h); ctx.fillRect(x + w - s, y, s, h);
  }
}
function ellipseShape(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, size: number, mode: ShapeMode, outline: string, fill: string): void {
  const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2, rx = Math.abs(b.x - a.x) / 2, ry = Math.abs(b.y - a.y) / 2;
  if (rx < 0.5 || ry < 0.5) return;
  if (mode !== 'outline') {
    ctx.fillStyle = fill;
    for (let y = Math.ceil(cy - ry); y <= Math.floor(cy + ry); y++) {
      const dy = (y - cy) / ry, sp = rx * Math.sqrt(Math.max(0, 1 - dy * dy));
      ctx.fillRect(Math.round(cx - sp), y, Math.max(1, Math.round(2 * sp)), 1);
    }
  }
  if (mode !== 'fill') {
    ctx.fillStyle = outline;
    const steps = Math.max(40, Math.round((rx + ry) * 5)), o = (size - 1) >> 1;
    for (let i = 0; i < steps; i++) {
      const t = (i / steps) * Math.PI * 2;
      ctx.fillRect(Math.round(cx + rx * Math.cos(t)) - o, Math.round(cy + ry * Math.sin(t)) - o, size, size);
    }
  }
}

/* -------------------------------- tool icons ------------------------------ */
// Clean glyphs that stay fully inside the 16x16 viewBox (the earlier ones spilled outside and clipped).
function ToolIcon({ t }: { t: Tool }): JSX.Element {
  return (
    <svg viewBox="0 0 16 16" className="paint__toolico" shapeRendering="crispEdges" aria-hidden="true">
      {t === 'pencil' && <g><path d="M2 14 L10 6 L12 8 L4 14 Z" fill="#f2c14e" stroke="#8a6d1a" /><path d="M2 14 L4 14 L2.5 15.2 Z" fill="#333" /></g>}
      {t === 'brush' && <g><rect x="7" y="2" width="3" height="8" fill="#8a6d1a" /><rect x="3" y="9" width="6" height="5" fill="#3a5c9a" stroke="#1a2a4a" /></g>}
      {t === 'airbrush' && <g><rect x="5" y="6" width="4" height="8" fill="#9aa4c0" stroke="#4a4a6a" /><rect x="6" y="3" width="2" height="3" fill="#4a4a6a" /><g fill="#1a1a1a"><rect x="11" y="4" width="1" height="1" /><rect x="13" y="6" width="1" height="1" /><rect x="12" y="8" width="1" height="1" /></g></g>}
      {t === 'fill' && <g><path d="M3 5 L9 11 L6 14 L1 9 Z" fill="#3a5c9a" stroke="#1a2a4a" /><rect x="11" y="9" width="2" height="4" fill="#3a9ae0" /></g>}
      {t === 'eraser' && <g><rect x="3" y="8" width="9" height="4" fill="#f2a0b0" stroke="#8a3a4a" /></g>}
      {t === 'eyedropper' && <g><rect x="9" y="3" width="4" height="3" fill="#9aa4c0" stroke="#4a4a6a" /><path d="M4 13 L10 6" stroke="#4a4a4a" strokeWidth="2" /><rect x="3" y="12" width="2" height="2" fill="#333" /></g>}
      {t === 'text' && <text x="8" y="13" fontSize="14" fontWeight="bold" textAnchor="middle" fill="#1a1a1a" fontFamily="serif">A</text>}
      {t === 'line' && <line x1="3" y1="13" x2="13" y2="3" stroke="#1a1a1a" strokeWidth="1.8" />}
      {t === 'rect' && <rect x="3" y="4" width="10" height="8" fill="none" stroke="#1a1a1a" strokeWidth="1.6" />}
      {t === 'ellipse' && <ellipse cx="8" cy="8" rx="6" ry="4" fill="none" stroke="#1a1a1a" strokeWidth="1.6" />}
    </svg>
  );
}

/* -------------------------------- component ------------------------------- */

export default function PaintApp({ focused, windowId }: AppProps) {
  const artRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const artCtx = useRef<CanvasRenderingContext2D | null>(null);
  const prevCtx = useRef<CanvasRenderingContext2D | null>(null);
  const statusRef = useRef<HTMLSpanElement>(null);
  const undo = useRef<Snap[]>([]);
  const redo = useRef<Snap[]>([]);
  const sprayTimer = useRef<number | null>(null);
  const drag = useRef({ down: false, tool: 'pencil' as Tool, primary: '#000000', secondary: '#ffffff', start: { x: 0, y: 0 }, last: { x: 0, y: 0 } });
  const resizeRef = useRef<{ dir: string; sw: number; sh: number; sx: number; sy: number } | null>(null);
  const pendSize = useRef({ w: DEFAULT_W, h: DEFAULT_H });
  const textRef = useRef<{ x: number; y: number; value: string } | null>(null);

  const visible = usePageVisible();
  const minimized = useOSStore((st) => st.windows[windowId]?.state === 'minimized');
  const active = focused && visible && !minimized;
  const activeRef = useRef(active); activeRef.current = active;

  const [tool, setTool] = useState<Tool>('pencil');
  const [fg, setFg] = useState('#000000');
  const [bg, setBg] = useState('#ffffff');
  const [brush, setBrush] = useState(2);
  const [mode, setMode] = useState<ShapeMode>('outline');
  const [tol, setTol] = useState(16);
  const [hist, setHist] = useState({ u: 0, r: 0 });
  const [live, setLive] = useState('Paint ready.');
  const [size, setSize] = useState({ w: DEFAULT_W, h: DEFAULT_H });
  const [preview, setPreview] = useState<{ w: number; h: number } | null>(null);
  const [textEdit, setTextEdit] = useState<{ x: number; y: number; value: string } | null>(null);
  const toolRef = useRef(tool); toolRef.current = tool;

  useEffect(() => {
    const art = artRef.current!, prev = previewRef.current!;
    art.width = DEFAULT_W; art.height = DEFAULT_H; prev.width = DEFAULT_W; prev.height = DEFAULT_H;
    const a = art.getContext('2d')!, p = prev.getContext('2d')!;
    a.imageSmoothingEnabled = false; p.imageSmoothingEnabled = false;
    a.fillStyle = '#ffffff'; a.fillRect(0, 0, DEFAULT_W, DEFAULT_H);
    artCtx.current = a; prevCtx.current = p;
  }, []);

  const dimsW = (): number => artRef.current!.width;
  const dimsH = (): number => artRef.current!.height;

  const snapshot = useCallback(() => {
    const a = artCtx.current!;
    undo.current.push({ w: a.canvas.width, h: a.canvas.height, data: a.getImageData(0, 0, a.canvas.width, a.canvas.height) });
    if (undo.current.length > MAX_UNDO) undo.current.shift();
    redo.current = [];
    setHist({ u: undo.current.length, r: 0 });
  }, []);
  const applySnap = useCallback((s: Snap) => {
    const art = artRef.current!, prev = previewRef.current!;
    if (art.width !== s.w || art.height !== s.h) {
      art.width = s.w; art.height = s.h; prev.width = s.w; prev.height = s.h;
      artCtx.current = art.getContext('2d')!; artCtx.current.imageSmoothingEnabled = false;
      prevCtx.current = prev.getContext('2d')!; prevCtx.current.imageSmoothingEnabled = false;
      setSize({ w: s.w, h: s.h });
    }
    artCtx.current!.putImageData(s.data, 0, 0);
  }, []);
  const undoAct = useCallback(() => {
    if (!undo.current.length) return;
    const a = artCtx.current!;
    redo.current.push({ w: a.canvas.width, h: a.canvas.height, data: a.getImageData(0, 0, a.canvas.width, a.canvas.height) });
    applySnap(undo.current.pop()!);
    setHist({ u: undo.current.length, r: redo.current.length });
    setLive('Undo');
  }, [applySnap]);
  const redoAct = useCallback(() => {
    if (!redo.current.length) return;
    const a = artCtx.current!;
    undo.current.push({ w: a.canvas.width, h: a.canvas.height, data: a.getImageData(0, 0, a.canvas.width, a.canvas.height) });
    applySnap(redo.current.pop()!);
    setHist({ u: undo.current.length, r: redo.current.length });
    setLive('Redo');
  }, [applySnap]);

  const clearArt = useCallback(() => {
    snapshot();
    const a = artCtx.current!;
    a.fillStyle = '#ffffff'; a.fillRect(0, 0, a.canvas.width, a.canvas.height);
    setLive('New image');
  }, [snapshot]);
  const savePng = useCallback(() => {
    artRef.current!.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = 'painting.png'; link.click();
      URL.revokeObjectURL(url);
    });
    setLive('Saved painting.png');
  }, []);

  const resizeCanvas = useCallback((w: number, h: number) => {
    const art = artRef.current!, prev = previewRef.current!;
    if (w === art.width && h === art.height) return;
    snapshot();
    const tmp = document.createElement('canvas'); tmp.width = art.width; tmp.height = art.height;
    tmp.getContext('2d')!.drawImage(art, 0, 0);
    art.width = w; art.height = h; prev.width = w; prev.height = h;
    const a = art.getContext('2d')!; a.imageSmoothingEnabled = false;
    a.fillStyle = '#ffffff'; a.fillRect(0, 0, w, h); a.drawImage(tmp, 0, 0);
    const p = prev.getContext('2d')!; p.imageSmoothingEnabled = false;
    artCtx.current = a; prevCtx.current = p;
    setSize({ w, h });
    setLive(`Canvas ${w} × ${h}`);
  }, [snapshot]);

  const stopSpray = useCallback(() => { if (sprayTimer.current) { clearInterval(sprayTimer.current); sprayTimer.current = null; } }, []);
  const spray = useCallback((x: number, y: number, color: string) => {
    const a = artCtx.current!;
    a.fillStyle = color;
    for (let k = 0; k < 14; k++) { const t = Math.random() * Math.PI * 2, r = Math.random() * (brush + 4); a.fillRect(Math.round(x + Math.cos(t) * r), Math.round(y + Math.sin(t) * r), 1, 1); }
  }, [brush]);

  const commitText = useCallback(() => {
    const t = textRef.current;
    textRef.current = null;
    if (t && t.value) {
      snapshot();
      const a = artCtx.current!;
      a.fillStyle = fg; a.textBaseline = 'top'; a.font = `${TEXT_PX}px ${TEXTFONT}`;
      a.fillText(t.value, t.x, t.y);
      setLive('Text added');
    }
    setTextEdit(null);
  }, [snapshot, fg]);

  useEffect(() => { if (!active) { drag.current.down = false; stopSpray(); prevCtx.current?.clearRect(0, 0, dimsW(), dimsH()); } }, [active, stopSpray]);
  useEffect(() => () => stopSpray(), [stopSpray]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (textRef.current) return; // don't steal keys while typing text
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' || e.key === 'Z') { if (e.shiftKey) redoAct(); else undoAct(); e.preventDefault(); }
        else if (e.key === 'y' || e.key === 'Y') { redoAct(); e.preventDefault(); }
        return;
      }
      const found = TOOLS.find((x) => x.key.toLowerCase() === e.key.toLowerCase());
      if (found) { setTool(found.t); e.preventDefault(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, undoAct, redoAct]);

  const toImg = (e: ReactPointerEvent): Pt => {
    const cv = previewRef.current!;
    const rect = cv.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) * (cv.width / rect.width));
    const y = Math.floor((e.clientY - rect.top) * (cv.height / rect.height));
    return { x: Math.max(0, Math.min(cv.width - 1, x)), y: Math.max(0, Math.min(cv.height - 1, y)) };
  };
  const nibFor = (t: Tool): number => (t === 'pencil' ? 1 : t === 'eraser' ? brush + 2 : brush);

  const onDown = useCallback((e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (textRef.current) { commitText(); return; }
    if (!activeRef.current || (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 2)) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const p = toImg(e);
    const t = toolRef.current;
    const primary = e.button === 2 ? bg : fg;
    const secondary = e.button === 2 ? fg : bg;
    drag.current = { down: true, tool: t, primary, secondary, start: p, last: p };
    const a = artCtx.current!;
    if (t === 'text') {
      drag.current.down = false;
      textRef.current = { x: p.x, y: p.y, value: '' };
      setTextEdit({ x: p.x, y: p.y, value: '' });
      return;
    }
    if (t === 'eyedropper') {
      const d = a.getImageData(p.x, p.y, 1, 1).data;
      const hex = rgbaToHex({ r: d[0], g: d[1], b: d[2], a: 255 });
      if (e.button === 2) setBg(hex); else setFg(hex);
      drag.current.down = false; setLive(`Picked ${hex}`); return;
    }
    if (t === 'fill') {
      snapshot();
      const w = a.canvas.width, h = a.canvas.height;
      const id = a.getImageData(0, 0, w, h);
      const n = floodFill(id.data, w, h, p.x, p.y, hexToRgba(primary), tol);
      a.putImageData(id, 0, 0);
      drag.current.down = false; setLive(`Filled ${n} pixels`); return;
    }
    if (t === 'pencil' || t === 'brush' || t === 'eraser') {
      snapshot();
      nib(a, p.x, p.y, nibFor(t), t === 'eraser' ? secondary : primary);
    } else if (t === 'airbrush') {
      snapshot();
      spray(p.x, p.y, primary);
      stopSpray();
      sprayTimer.current = window.setInterval(() => { if (drag.current.down) spray(drag.current.last.x, drag.current.last.y, drag.current.primary); }, 55);
    }
  }, [bg, fg, tol, snapshot, spray, stopSpray, commitText]);

  const onMove = useCallback((e: ReactPointerEvent<HTMLCanvasElement>) => {
    const p = toImg(e);
    if (statusRef.current) statusRef.current.textContent = `${p.x}, ${p.y}`;
    const d = drag.current;
    if (!d.down) return;
    const a = artCtx.current!, pv = prevCtx.current!;
    if (d.tool === 'pencil' || d.tool === 'brush' || d.tool === 'eraser') {
      segment(a, d.last, p, nibFor(d.tool), d.tool === 'eraser' ? d.secondary : d.primary);
      d.last = p;
    } else if (d.tool === 'airbrush') {
      d.last = p;
    } else if (d.tool === 'line' || d.tool === 'rect' || d.tool === 'ellipse') {
      pv.clearRect(0, 0, pv.canvas.width, pv.canvas.height);
      if (d.tool === 'line') segment(pv, d.start, p, brush, d.primary);
      else if (d.tool === 'rect') rectShape(pv, d.start, p, brush, mode, d.primary, d.secondary);
      else ellipseShape(pv, d.start, p, brush, mode, d.primary, d.secondary);
      d.last = p;
    }
  }, [brush, mode]);

  const onUp = useCallback((e: ReactPointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    if (!d.down) return;
    d.down = false;
    const p = toImg(e);
    const a = artCtx.current!, pv = prevCtx.current!;
    if (d.tool === 'airbrush') stopSpray();
    if (d.tool === 'line' || d.tool === 'rect' || d.tool === 'ellipse') {
      pv.clearRect(0, 0, pv.canvas.width, pv.canvas.height);
      snapshot();
      if (d.tool === 'line') segment(a, d.start, p, brush, d.primary);
      else if (d.tool === 'rect') rectShape(a, d.start, p, brush, mode, d.primary, d.secondary);
      else ellipseShape(a, d.start, p, brush, mode, d.primary, d.secondary);
    }
  }, [brush, mode, snapshot, stopSpray]);

  /* ---- canvas resize handles ---- */
  const onHandleDown = useCallback((e: ReactPointerEvent<HTMLDivElement>, dir: string) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const a = artRef.current!;
    resizeRef.current = { dir, sw: a.width, sh: a.height, sx: e.clientX, sy: e.clientY };
    pendSize.current = { w: a.width, h: a.height };
    setPreview({ w: a.width, h: a.height });
  }, []);
  const onHandleMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const r = resizeRef.current;
    if (!r) return;
    const w = r.dir.includes('e') ? clampDim(r.sw + (e.clientX - r.sx)) : r.sw;
    const h = r.dir.includes('s') ? clampDim(r.sh + (e.clientY - r.sy)) : r.sh;
    pendSize.current = { w, h };
    setPreview({ w, h });
  }, []);
  const onHandleUp = useCallback(() => {
    if (!resizeRef.current) return;
    resizeRef.current = null;
    const { w, h } = pendSize.current;
    setPreview(null);
    resizeCanvas(w, h);
  }, [resizeCanvas]);

  const isShape = tool === 'rect' || tool === 'ellipse';
  const sizeTools = tool !== 'fill' && tool !== 'eyedropper' && tool !== 'airbrush' && tool !== 'text';

  return (
    <div className="paint">
      <div className="paint__bar">
        <button type="button" onClick={clearArt}>New</button>
        <button type="button" onClick={savePng}>Save PNG</button>
        <span className="paint__sep" />
        <button type="button" onClick={undoAct} disabled={hist.u === 0} aria-label="Undo">↶ Undo</button>
        <button type="button" onClick={redoAct} disabled={hist.r === 0} aria-label="Redo">↷ Redo</button>
      </div>

      <div className="paint__body">
        <div className="paint__tools" role="toolbar" aria-label="Tools">
          <div className="paint__toolgrid">
            {TOOLS.map(({ t, label, key }) => (
              <button key={t} type="button" className={tool === t ? 'paint__tool is-on' : 'paint__tool'} aria-pressed={tool === t} title={`${label} (${key})`} aria-label={`${label} tool`} onClick={() => setTool(t)}>
                <ToolIcon t={t} />
              </button>
            ))}
          </div>
          <div className="paint__opts">
            {sizeTools && (
              <div className="paint__sizes" role="group" aria-label="Brush size">
                {BRUSH_SIZES.map((s) => (
                  <button key={s} type="button" className={brush === s ? 'paint__size is-on' : 'paint__size'} aria-pressed={brush === s} aria-label={`Size ${s}`} onClick={() => setBrush(s)}>
                    <span style={{ width: Math.min(14, s + 2), height: Math.min(14, s + 2) }} />
                  </button>
                ))}
              </div>
            )}
            {isShape && (
              <div className="paint__modes" role="group" aria-label="Shape style">
                {(['outline', 'fill', 'both'] as ShapeMode[]).map((m) => (
                  <button key={m} type="button" className={mode === m ? 'paint__mode is-on' : 'paint__mode'} aria-pressed={mode === m} onClick={() => setMode(m)}>{m}</button>
                ))}
              </div>
            )}
            {tool === 'fill' && (
              <label className="paint__tol">Tol<input type="range" min={0} max={80} value={tol} onChange={(e) => setTol(Number(e.target.value))} aria-label="Fill tolerance" /></label>
            )}
          </div>
        </div>

        <div className="paint__canvasarea" onContextMenu={(e) => e.preventDefault()}>
          <div className="paint__stage" style={{ width: size.w, height: size.h }}>
            <canvas ref={artRef} className="paint__art" />
            <canvas
              ref={previewRef}
              className="paint__preview"
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
              aria-label="Drawing canvas — pick a tool, then draw. Left button uses the foreground colour, right the background."
            />
            {textEdit && (
              <input
                className="paint__textin"
                style={{ left: textEdit.x, top: textEdit.y, color: fg, font: `${TEXT_PX}px ${TEXTFONT}` }}
                autoFocus
                value={textEdit.value}
                aria-label="Text to place"
                onChange={(e) => { const v = e.target.value; textRef.current = textRef.current ? { ...textRef.current, value: v } : null; setTextEdit((s) => (s ? { ...s, value: v } : s)); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitText(); } else if (e.key === 'Escape') { textRef.current = null; setTextEdit(null); } }}
                onBlur={commitText}
              />
            )}
            {preview && <div className="paint__resizebox" style={{ width: preview.w, height: preview.h }} aria-hidden="true" />}
            <div className="paint__handle paint__handle--e" onPointerDown={(e) => onHandleDown(e, 'e')} onPointerMove={onHandleMove} onPointerUp={onHandleUp} title="Resize width" />
            <div className="paint__handle paint__handle--s" onPointerDown={(e) => onHandleDown(e, 's')} onPointerMove={onHandleMove} onPointerUp={onHandleUp} title="Resize height" />
            <div className="paint__handle paint__handle--se" onPointerDown={(e) => onHandleDown(e, 'se')} onPointerMove={onHandleMove} onPointerUp={onHandleUp} title="Resize canvas" />
          </div>
        </div>
      </div>

      <div className="paint__palette">
        <div className="paint__chips" title="Foreground / background">
          <span className="paint__bgchip" style={{ background: bg }} />
          <span className="paint__fgchip" style={{ background: fg }} />
        </div>
        <input className="paint__colorin" type="color" value={fg} aria-label="Custom foreground colour" onChange={(e) => setFg(e.target.value)} />
        <div className="paint__swatches" role="group" aria-label="Colour palette">
          {PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              className="paint__swatch"
              style={{ background: c }}
              aria-label={`Colour ${c}`}
              title={`${c} — left: foreground, right: background`}
              onClick={() => setFg(c)}
              onContextMenu={(e) => { e.preventDefault(); setBg(c); }}
            />
          ))}
        </div>
      </div>

      <div className="paint__status">
        <span ref={statusRef}>0, 0</span>
        <span>{size.w} × {size.h}</span>
        <span>{TOOLS.find((x) => x.t === tool)?.label}</span>
      </div>

      {!active && <div className="paint__overlay"><strong>PAUSED</strong><span>Click the window to resume</span></div>}
      <div className="sr-only" aria-live="polite">{live}</div>
    </div>
  );
}
