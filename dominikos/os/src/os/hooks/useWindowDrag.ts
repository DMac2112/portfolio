// Window drag (DOMINIKOS-PLAN §4.3, LOCKED): Pointer Events + setPointerCapture, imperative
// translate3d on the DOM node per rAF-coalesced move, ONE Zustand commit on drop. No store
// writes during the move — this is the 60fps guarantee.
import { useCallback, useEffect, useRef } from 'react';
import { useOSStore } from '../store/osStore';
import { useSnapPreview } from '../store/snapPreviewStore';
import { getWorkspace, isFreeFloat } from '../env';
import type { SnapZone } from '../types';

const SNAP_EDGE = 8;   // px from screen edge that arms a snap zone
const SNAP_TOP = 6;

function detectSnapZone(clientX: number, clientY: number): SnapZone {
  const ws = getWorkspace();
  if (clientY <= SNAP_TOP) return 'top-max';
  if (clientX <= SNAP_EDGE) return 'left';
  if (clientX >= ws.width - SNAP_EDGE) return 'right';
  return null;
}

export function useWindowDrag(winRef: React.RefObject<HTMLDivElement>, instanceId: string) {
  const drag = useRef<{
    pointerId: number;
    dx: number;
    dy: number;
    pending: { x: number; y: number } | null;
    rafId: number;
    moved: boolean;
  } | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const el = winRef.current;
      if (!el || !isFreeFloat()) return;
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      if ((e.target as HTMLElement).closest('.win__controls')) return; // buttons never drag

      const store = useOSStore.getState();
      store.focus(instanceId);
      let w = store.windows[instanceId];
      if (!w) return;

      // dragging a maximized/snapped window first restores it under the cursor (XP behavior):
      // keep the grab point proportional so the titlebar stays under the pointer.
      if (w.state === 'maximized' || w.snap) {
        const restore = w.restoreRect ?? w.rect;
        const ratio = Math.min(Math.max(e.clientX / Math.max(1, getWorkspace().width), 0.1), 0.9);
        const x = Math.round(e.clientX - restore.width * ratio);
        const y = Math.max(0, e.clientY - 12);
        useOSStore.getState().setState(instanceId, 'normal');
        useOSStore.getState().move(instanceId, x, y);
        useOSStore.getState().resize(instanceId, restore.width, restore.height);
        w = useOSStore.getState().windows[instanceId];
      }

      const titlebar = e.currentTarget;
      try {
        titlebar.setPointerCapture(e.pointerId); // best-effort: keeps fast drags on the handle
      } catch {
        /* synthetic/stale pointer — drag still tracks via bubbling move events */
      }
      el.style.willChange = 'transform';
      const body = el.querySelector<HTMLElement>('.win__body');
      if (body) body.style.pointerEvents = 'none'; // don't hit-test contents (incl. iframes)

      drag.current = {
        pointerId: e.pointerId,
        dx: e.clientX - w.rect.x,
        dy: e.clientY - w.rect.y,
        pending: null,
        rafId: 0,
        moved: false,
      };
    },
    [winRef, instanceId],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const d = drag.current;
      const el = winRef.current;
      if (!d || !el || e.pointerId !== d.pointerId) return;
      d.moved = true;
      d.pending = {
        x: e.clientX - d.dx,
        y: Math.max(0, e.clientY - d.dy), // clamp: titlebar never above the top edge
      };
      const zone = detectSnapZone(e.clientX, e.clientY);
      if (!d.rafId) {
        d.rafId = requestAnimationFrame(() => {
          if (drag.current?.pending) {
            const { x, y } = drag.current.pending;
            el.style.transform = `translate3d(${x}px,${y}px,0)`;
          }
          useSnapPreview.getState().setZone(zone);
          if (drag.current) drag.current.rafId = 0;
        });
      }
    },
    [winRef],
  );

  const endDrag = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, commit: boolean) => {
      const d = drag.current;
      const el = winRef.current;
      if (!d || e.pointerId !== d.pointerId) return;
      drag.current = null;
      if (d.rafId) cancelAnimationFrame(d.rafId);
      useSnapPreview.getState().setZone(null);
      if (el) {
        el.style.willChange = 'auto'; // REMOVE (frees VRAM, §4.3)
        const body = el.querySelector<HTMLElement>('.win__body');
        if (body) body.style.pointerEvents = '';
      }
      if (!commit || !d.moved || !d.pending) return;
      const zone = detectSnapZone(e.clientX, e.clientY);
      const store = useOSStore.getState();
      if (zone) store.snap(instanceId, zone);            // half/max
      else store.move(instanceId, d.pending.x, d.pending.y); // ONE store commit
    },
    [winRef, instanceId],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => endDrag(e, true),
    [endDrag],
  );
  const onPointerCancel = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => endDrag(e, false),
    [endDrag],
  );

  // safety: never leave a dangling rAF on unmount
  useEffect(
    () => () => {
      if (drag.current?.rafId) cancelAnimationFrame(drag.current.rafId);
    },
    [],
  );

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel };
}
