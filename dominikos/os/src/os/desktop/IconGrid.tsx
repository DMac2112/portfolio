// Desktop icon grid (§5.6, §11.2): roving tabindex with arrow-key navigation; Enter opens.
// Desktop shell (fine pointer): icons sit on absolute 88px cells resolved by iconLayout —
// drag ≥4px moves one to any free cell, committed on drop, session-only via iconPosStore
// (BROWSER-PLAN §1). Mobile/touch keeps the original static auto-flow grid untouched.
// Keyboard arrow-nav keeps MANIFEST order (spatial nav is out of scope by design).
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { desktopIcons } from '../registry';
import { useOSStore } from '../store/osStore';
import { useSystem } from '../context/SystemContext';
import { DesktopIconView } from './DesktopIconView';
import { resolveLayout, cellFromPoint, nearestFree, pointFromCell, CELL_W, CELL_H, type CellPos } from './iconLayout';
import { getLayout, setPos, subscribe } from './iconPosStore';
import type { AppManifest } from '../types';

const ICON_CELL = 88; // keep in sync with --icon-cell
const DRAG_THRESHOLD = 4; // px before a press becomes a drag (below = click/dblclick as before)

interface Props {
  onIconContextMenu: (e: React.MouseEvent, app: AppManifest) => void;
}

export function IconGrid({ onIconContextMenu }: Props) {
  const icons = useMemo(() => desktopIcons(), []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef(new Map<string, HTMLButtonElement>());
  const { input, device } = useSystem();
  const touch = input === 'touch';
  const free = device === 'desktop' && !touch; // movable icons: desktop shell + fine pointer only

  const layout = useSyncExternalStore(subscribe, getLayout);
  const [dims, setDims] = useState({ rows: 6, cols: 10 });

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

  /* ---- drag (commit-on-drop, §1.4): tracking in a ref, one state for the ghost ---- */
  const dragRef = useRef<{ id: string; pointerId: number; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const [ghost, setGhost] = useState<{ id: string; x: number; y: number } | null>(null);
  const ghostRef = useRef(ghost); ghostRef.current = ghost;

  const onCellDown = (e: React.PointerEvent<HTMLDivElement>, app: AppManifest) => {
    if (!free || !cells || e.button !== 0) return;
    const p = pointFromCell(cells[app.id]);
    dragRef.current = { id: app.id, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, origX: p.x, origY: p.y };
    // capture only after the threshold so click / double-click stay native below it
  };

  const onCellMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!ghostRef.current && Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
    e.currentTarget.setPointerCapture?.(d.pointerId);
    setGhost({ id: d.id, x: d.origX + dx, y: d.origY + dy });
  };

  const endDrag = () => {
    dragRef.current = null;
    setGhost(null);
  };

  const onCellUp = () => {
    const d = dragRef.current;
    const g = ghostRef.current;
    if (!d || !g || !cells) { endDrag(); return; }
    const taken = new Set(
      Object.entries(cells)
        .filter(([id]) => id !== d.id)
        .map(([, c]) => `${c.col},${c.row}`),
    );
    const target = cellFromPoint(g.x, g.y, dims.rows, dims.cols);
    setPos(d.id, nearestFree(target, taken, dims.rows, dims.cols));
    setSelectedId(d.id);
    endDrag();
  };

  /* ---- keyboard nav (manifest order — unchanged) ---- */
  const tabbableId = selectedId ?? icons[0]?.id;

  const moveSelection = (delta: number) => {
    const idx = Math.max(0, icons.findIndex((a) => a.id === tabbableId));
    const next = Math.min(icons.length - 1, Math.max(0, idx + delta));
    const app = icons[next];
    if (!app) return;
    setSelectedId(app.id);
    btnRefs.current.get(app.id)?.focus();
  };

  const rowsPerColumn = () => {
    if (free) return dims.rows;
    const h = gridRef.current?.clientHeight ?? 600;
    return Math.max(1, Math.floor((h - 12) / ICON_CELL));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const rows = rowsPerColumn();
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); moveSelection(1); break;
      case 'ArrowUp': e.preventDefault(); moveSelection(-1); break;
      case 'ArrowRight': e.preventDefault(); moveSelection(rows); break;
      case 'ArrowLeft': e.preventDefault(); moveSelection(-rows); break;
      case 'Enter':
      case ' ': {
        if (!selectedId) return;
        e.preventDefault();
        const trigger = btnRefs.current.get(selectedId);
        useOSStore.getState().open(selectedId, { trigger: trigger ?? undefined });
        break;
      }
      case 'Escape':
        setSelectedId(null);
        break;
    }
  };

  const ghostApp = ghost ? icons.find((a) => a.id === ghost.id) : undefined;

  return (
    <div
      ref={gridRef}
      className={free ? 'icon-grid icon-grid--free' : 'icon-grid'}
      role="listbox"
      aria-label="Desktop icons"
      onKeyDown={onKeyDown}
      onPointerDown={(e) => {
        if (e.target === gridRef.current) setSelectedId(null); // click empty desktop deselects
      }}
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
            selected={selectedId === app.id}
            tabbable={tabbableId === app.id}
            touch={touch}
            onSelect={() => setSelectedId(app.id)}
            onOpen={(trigger) => useOSStore.getState().open(app.id, { trigger })}
            onIconContextMenu={onIconContextMenu}
          />
        );
        if (!free || !cells) return view;
        const p = pointFromCell(cells[app.id]);
        return (
          <div
            key={app.id}
            className={ghost?.id === app.id ? 'desk-cell is-dragging' : 'desk-cell'}
            style={{ left: p.x, top: p.y }}
            onPointerDown={(e) => onCellDown(e, app)}
            onPointerMove={onCellMove}
            onPointerUp={onCellUp}
            onPointerCancel={endDrag}
          >
            {view}
          </div>
        );
      })}
      {ghost && ghostApp && (
        <div className="desk-icon desk-icon--ghost" style={{ left: ghost.x, top: ghost.y }} aria-hidden="true">
          <img src={ghostApp.icon} alt="" draggable={false} />
          <span>{ghostApp.desktop?.label ?? ghostApp.title}</span>
        </div>
      )}
    </div>
  );
}
