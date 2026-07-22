// 8-handle resize (DOMINIKOS-PLAN §4.3): Pointer Events, rAF-throttled imperative styles during
// the gesture, ONE store commit (move+resize) on release. Desktop only; clamps to min sizes;
// aspectRatio windows keep their ratio (dominant-axis rule, §8.5 letterboxing handles the rest).
import { useCallback, useRef } from 'react';
import { useOSStore } from '../store/osStore';
import type { AppManifest } from '../types';

type Dir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
const DIRS: Dir[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

interface Props {
  winRef: React.RefObject<HTMLDivElement>;
  instanceId: string;
  manifest: AppManifest;
}

export function ResizeHandles({ winRef, instanceId, manifest }: Props) {
  const gesture = useRef<{
    pointerId: number;
    dir: Dir;
    startX: number;
    startY: number;
    rect: { x: number; y: number; width: number; height: number };
    next: { x: number; y: number; width: number; height: number };
    rafId: number;
  } | null>(null);

  const minW = manifest.window.minWidth ?? 240;
  const minH = manifest.window.minHeight ?? 160;
  const ratio = manifest.window.aspectRatio;

  const apply = useCallback(() => {
    const g = gesture.current;
    const el = winRef.current;
    if (!g || !el) return;
    el.style.transform = `translate3d(${g.next.x}px,${g.next.y}px,0)`;
    el.style.width = `${g.next.width}px`;
    el.style.height = `${g.next.height}px`;
    g.rafId = 0;
  }, [winRef]);

  const onDown = useCallback(
    (dir: Dir) => (e: React.PointerEvent<HTMLDivElement>) => {
      const store = useOSStore.getState();
      const w = store.windows[instanceId];
      if (!w || w.state !== 'normal' || w.snap) return;
      store.focus(instanceId);
      e.currentTarget.setPointerCapture(e.pointerId);
      const el = winRef.current;
      if (el) {
        el.style.willChange = 'transform, width, height';
        const body = el.querySelector<HTMLElement>('.win__body');
        if (body) body.style.pointerEvents = 'none';
      }
      gesture.current = {
        pointerId: e.pointerId,
        dir,
        startX: e.clientX,
        startY: e.clientY,
        rect: { ...w.rect },
        next: { ...w.rect },
        rafId: 0,
      };
    },
    [instanceId, winRef],
  );

  const onMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const g = gesture.current;
      if (!g || e.pointerId !== g.pointerId) return;
      const dx = e.clientX - g.startX;
      const dy = e.clientY - g.startY;
      let { x, y, width, height } = g.rect;

      if (g.dir.includes('e')) width = g.rect.width + dx;
      if (g.dir.includes('s')) height = g.rect.height + dy;
      if (g.dir.includes('w')) {
        width = g.rect.width - dx;
        x = g.rect.x + dx;
      }
      if (g.dir.includes('n')) {
        height = g.rect.height - dy;
        y = g.rect.y + dy;
      }
      // clamp to minimums, keeping the opposite edge anchored
      if (width < minW) {
        if (g.dir.includes('w')) x -= minW - width;
        width = minW;
      }
      if (height < minH) {
        if (g.dir.includes('n')) y -= minH - height;
        height = minH;
      }
      // aspect-locked games follow the dominant axis (§4.3)
      if (ratio) {
        if (g.dir === 'e' || g.dir === 'w' || Math.abs(dx) >= Math.abs(dy)) height = Math.round(width / ratio);
        else width = Math.round(height * ratio);
      }
      g.next = { x, y: Math.max(0, y), width, height };
      if (!g.rafId) g.rafId = requestAnimationFrame(apply);
    },
    [apply, minW, minH, ratio],
  );

  const onUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const g = gesture.current;
      const el = winRef.current;
      if (!g || e.pointerId !== g.pointerId) return;
      gesture.current = null;
      if (g.rafId) cancelAnimationFrame(g.rafId);
      if (el) {
        el.style.willChange = 'auto';
        const body = el.querySelector<HTMLElement>('.win__body');
        if (body) body.style.pointerEvents = '';
      }
      const store = useOSStore.getState();
      store.move(instanceId, g.next.x, g.next.y);
      store.resize(instanceId, g.next.width, g.next.height);
    },
    [winRef, instanceId],
  );

  return (
    <>
      {DIRS.map((d) => (
        <div
          key={d}
          className={`win__rs win__rs--${d}`}
          onPointerDown={onDown(d)}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        />
      ))}
    </>
  );
}
