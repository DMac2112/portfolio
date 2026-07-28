// Desktop icon grid (§5.6, §11.2): roving tabindex with arrow-key navigation; Enter opens.
// Desktop shell (fine pointer): icons sit on absolute 88px cells resolved by iconLayout —
// drag ≥4px moves the current selection together, committed on drop via iconPosStore
// (BROWSER-PLAN §1). Mobile/touch keeps the original static auto-flow grid untouched.
// Keyboard arrow-nav keeps MANIFEST order (spatial nav is out of scope by design).
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { desktopIcons } from '../registry';
import { useOSStore } from '../store/osStore';
import { useSystem } from '../context/SystemContext';
import { DesktopIconView } from './DesktopIconView';
import {
  resolveLayout,
  cellFromPoint,
  nearestFree,
  pointFromCell,
  rectFromPoints,
  idsIntersectingRect,
  moveCellsTogether,
  CELL_W,
  CELL_H,
  type CellPos,
  type Rect,
} from './iconLayout';
import { getLayout, setPos, subscribe } from './iconPosStore';
import type { AppManifest } from '../types';

const ICON_CELL = 88; // keep in sync with --icon-cell
const DRAG_THRESHOLD = 4; // px before a press becomes a drag (below = click/dblclick as before)

interface Props {
  onIconContextMenu: (e: React.MouseEvent, app: AppManifest) => void;
}

interface DragState {
  id: string;
  ids: string[];
  pointerId: number;
  startX: number;
  startY: number;
  origins: Record<string, { x: number; y: number }>;
  cells: Record<string, CellPos>;
  selectionBefore: Set<string>;
}

interface MarqueeState {
  pointerId: number;
  startX: number;
  startY: number;
  moved: boolean;
}

type Ghosts = Record<string, { x: number; y: number }>;

export function IconGrid({ onIconContextMenu }: Props) {
  const icons = useMemo(() => desktopIcons(), []);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const selectedIdsRef = useRef(selectedIds);
  selectedIdsRef.current = selectedIds;
  const [activeId, setActiveId] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef(new Map<string, HTMLButtonElement>());
  const { input, device } = useSystem();
  const touch = input === 'touch';
  const free = device === 'desktop' && !touch; // movable icons: desktop shell + fine pointer only

  const layout = useSyncExternalStore(subscribe, getLayout);
  const [dims, setDims] = useState({ rows: 6, cols: 10 });

  const applySelection = (ids: Iterable<string>, active: string | null) => {
    const next = new Set(ids);
    selectedIdsRef.current = next;
    setSelectedIds(next);
    setActiveId(active);
  };

  // measure the cell band; a viewport resize re-clamps positions via resolveLayout (pure)
  useEffect(() => {
    if (!free) return;
    const el = gridRef.current;
    if (!el) return;
    const measure = () =>
      setDims({
        rows: Math.max(1, Math.floor((el.clientHeight - 12) / CELL_H)),
        cols: Math.max(1, Math.floor((el.clientWidth - 8) / CELL_W)),
      });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [free]);

  const cells = useMemo<Record<string, CellPos> | null>(
    () => (free ? resolveLayout(icons.map((a) => a.id), layout, dims.rows) : null),
    [free, icons, layout, dims.rows],
  );

  /* ---- selection marquee: only a press whose target is the empty grid can start it ---- */
  const marqueeRef = useRef<MarqueeState | null>(null);
  const [marquee, setMarquee] = useState<Rect | null>(null);

  const applyMarqueeSelection = (rect: Rect) => {
    const iconRects: Record<string, Rect> = {};
    for (const app of icons) {
      const el = btnRefs.current.get(app.id);
      if (!el) continue;
      const box = el.getBoundingClientRect();
      iconRects[app.id] = { left: box.left, top: box.top, right: box.right, bottom: box.bottom };
    }
    const ids = idsIntersectingRect(rect, iconRects);
    applySelection(ids, ids[0] ?? null);
  };

  const onGridDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || e.button !== 0) return;
    applySelection([], null); // an empty-desktop click clears selection, even without a drag
    if (!free) return;
    marqueeRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onGridMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const m = marqueeRef.current;
    if (!m || e.pointerId !== m.pointerId) return;
    const dx = e.clientX - m.startX;
    const dy = e.clientY - m.startY;
    if (!m.moved && Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
    m.moved = true;
    const rect = rectFromPoints(m.startX, m.startY, e.clientX, e.clientY);
    setMarquee(rect);
    applyMarqueeSelection(rect);
  };

  const onGridUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const m = marqueeRef.current;
    if (!m || e.pointerId !== m.pointerId) return;
    if (m.moved) {
      const rect = rectFromPoints(m.startX, m.startY, e.clientX, e.clientY);
      applyMarqueeSelection(rect);
    }
    marqueeRef.current = null;
    setMarquee(null);
  };

  const cancelMarquee = () => {
    marqueeRef.current = null;
    setMarquee(null);
  };

  /* ---- drag (commit-on-drop, §1.4): tracking in a ref, one state for the ghosts ---- */
  const dragRef = useRef<DragState | null>(null);
  const pendingClickRef = useRef<{ id: string; selectionBefore: Set<string> } | null>(null);
  const suppressClickRef = useRef<string | null>(null);
  const [ghosts, setGhosts] = useState<Ghosts | null>(null);
  const ghostsRef = useRef(ghosts);
  ghostsRef.current = ghosts;

  const onCellDown = (e: React.PointerEvent<HTMLDivElement>, app: AppManifest) => {
    if (!free || !cells || e.button !== 0) return;
    pendingClickRef.current = null;
    suppressClickRef.current = null;
    const selectionBefore = new Set(selectedIdsRef.current);
    const alreadySelected = selectionBefore.has(app.id);
    const ids = alreadySelected
      ? icons.filter((icon) => selectionBefore.has(icon.id)).map((icon) => icon.id)
      : [app.id];
    if (!alreadySelected) applySelection([app.id], app.id);
    else setActiveId(app.id);

    const origins: Record<string, { x: number; y: number }> = {};
    const originalCells: Record<string, CellPos> = {};
    for (const id of ids) {
      const cell = cells[id];
      originalCells[id] = cell;
      origins[id] = pointFromCell(cell);
    }
    dragRef.current = {
      id: app.id,
      ids,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origins,
      cells: originalCells,
      selectionBefore,
    };
    // capture only after the threshold so click / double-click stay native below it
  };

  const onCellMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!ghostsRef.current && Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
    e.currentTarget.setPointerCapture?.(d.pointerId);
    const next = Object.fromEntries(
      d.ids.map((id) => [
        id,
        { x: d.origins[id].x + dx, y: d.origins[id].y + dy },
      ]),
    );
    ghostsRef.current = next;
    setGhosts(next);
  };

  const endDrag = () => {
    dragRef.current = null;
    ghostsRef.current = null;
    setGhosts(null);
  };

  const onCellUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    const currentGhosts = ghostsRef.current;
    if (!currentGhosts || !cells) {
      pendingClickRef.current = { id: d.id, selectionBefore: d.selectionBefore };
      endDrag();
      return;
    }

    const taken = new Set(
      Object.entries(cells)
        .filter(([id]) => !d.ids.includes(id))
        .map(([, cell]) => `${cell.col},${cell.row}`),
    );
    const anchorGhost = currentGhosts[d.id];
    const target = cellFromPoint(anchorGhost.x, anchorGhost.y, dims.rows, dims.cols);
    if (d.ids.length === 1) {
      // Keep the original single-icon snap/collision path byte-for-byte equivalent.
      setPos(d.id, nearestFree(target, taken, dims.rows, dims.cols));
    } else {
      const finalCells = moveCellsTogether(d.cells, d.id, target, taken, dims.rows, dims.cols);
      for (const id of d.ids) setPos(id, finalCells[id]);
    }
    applySelection(d.ids, d.id);
    pendingClickRef.current = null;
    suppressClickRef.current = d.id;
    endDrag();
  };

  const onCellCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === e.pointerId) endDrag();
  };

  const onIconSelect = (id: string, additive: boolean) => {
    if (suppressClickRef.current === id) {
      suppressClickRef.current = null;
      pendingClickRef.current = null;
      return;
    }
    const pending = pendingClickRef.current;
    const base = pending?.id === id
      ? new Set(pending.selectionBefore)
      : new Set(selectedIdsRef.current);
    pendingClickRef.current = null;
    if (!additive) {
      applySelection([id], id);
      return;
    }
    if (base.has(id)) base.delete(id);
    else base.add(id);
    applySelection(base, id);
  };

  /* ---- keyboard nav (manifest order — unchanged) ---- */
  const tabbableId = activeId ?? icons[0]?.id;

  const moveSelection = (delta: number) => {
    const idx = Math.max(0, icons.findIndex((a) => a.id === tabbableId));
    const next = Math.min(icons.length - 1, Math.max(0, idx + delta));
    const app = icons[next];
    if (!app) return;
    applySelection([app.id], app.id);
    btnRefs.current.get(app.id)?.focus();
  };

  const rowsPerColumn = () => {
    if (free) return dims.rows;
    const h = gridRef.current?.clientHeight ?? 600;
    return Math.max(1, Math.floor((h - 12) / ICON_CELL));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      const ids = icons.map((app) => app.id);
      applySelection(ids, activeId ?? ids[0] ?? null);
      return;
    }
    const rows = rowsPerColumn();
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); moveSelection(1); break;
      case 'ArrowUp': e.preventDefault(); moveSelection(-1); break;
      case 'ArrowRight': e.preventDefault(); moveSelection(rows); break;
      case 'ArrowLeft': e.preventDefault(); moveSelection(-rows); break;
      case 'Enter':
      case ' ': {
        if (!activeId) return;
        e.preventDefault();
        const trigger = btnRefs.current.get(activeId);
        useOSStore.getState().open(activeId, { trigger: trigger ?? undefined });
        break;
      }
      case 'Escape':
        applySelection([], null);
        break;
    }
  };

  return (
    <div
      ref={gridRef}
      className={free ? 'icon-grid icon-grid--free' : 'icon-grid'}
      role="listbox"
      aria-label="Desktop icons"
      aria-multiselectable="true"
      onKeyDown={onKeyDown}
      onPointerDown={onGridDown}
      onPointerMove={onGridMove}
      onPointerUp={onGridUp}
      onPointerCancel={cancelMarquee}
    >
      {icons.map((app) => {
        const view = (
          <DesktopIconView
            key={app.id}
            ref={(el) => {
              if (el) btnRefs.current.set(app.id, el);
              else btnRefs.current.delete(app.id);
            }}
            app={app}
            selected={selectedIds.has(app.id)}
            tabbable={tabbableId === app.id}
            touch={touch}
            onSelect={(additive) => onIconSelect(app.id, additive)}
            onFocus={() => {
              if (!dragRef.current) applySelection([app.id], app.id);
            }}
            onOpen={(trigger) => useOSStore.getState().open(app.id, { trigger })}
            onIconContextMenu={onIconContextMenu}
          />
        );
        if (!free || !cells) return view;
        const p = pointFromCell(cells[app.id]);
        return (
          <div
            key={app.id}
            className={ghosts?.[app.id] ? 'desk-cell is-dragging' : 'desk-cell'}
            style={{ left: p.x, top: p.y }}
            onPointerDown={(e) => onCellDown(e, app)}
            onPointerMove={onCellMove}
            onPointerUp={onCellUp}
            onPointerCancel={onCellCancel}
          >
            {view}
          </div>
        );
      })}
      {ghosts && icons.map((app) => {
        const ghost = ghosts[app.id];
        if (!ghost) return null;
        return (
          <div
            key={`ghost-${app.id}`}
            className="desk-icon desk-icon--ghost"
            style={{ left: ghost.x, top: ghost.y }}
            aria-hidden="true"
          >
            <img src={app.icon} alt="" draggable={false} />
            <span>{app.desktop?.label ?? app.title}</span>
          </div>
        );
      })}
      {marquee && (
        <div
          className="desktop__marquee"
          aria-hidden="true"
          style={{
            left: marquee.left,
            top: marquee.top,
            width: marquee.right - marquee.left,
            height: marquee.bottom - marquee.top,
          }}
        />
      )}
    </div>
  );
}
