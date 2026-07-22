// The window frame — DOM/class contract per DOMINIKOS-PLAN §4.3 (custom BEM .win__*, XP.css
// only inside .win-body). Geometry renders from the store; drag/resize mutate the DOM node
// imperatively and commit once on release. Open/minimize animate via WAAPI so the animation
// composes with the inline translate3d (a CSS transform keyframe would override it).
import { memo, useCallback, useEffect, useRef } from 'react';
import { useOSStore } from '../store/osStore';
import { byId } from '../registry';
import { isFreeFloat } from '../env';
import { useWindowDrag } from '../hooks/useWindowDrag';
import { toggleElementFullscreen } from '../hooks/useFullscreen';
import { TitleBar } from './TitleBar';
import { ResizeHandles } from './ResizeHandles';
import { AppHost } from './AppHost';

function motionMs(): number {
  if (typeof document === 'undefined') return 0;
  const v = getComputedStyle(document.documentElement).getPropertyValue('--dur-window').trim();
  return v.endsWith('ms') ? parseFloat(v) : 160;
}

/** Where the minimize animation flies to: the window's own taskbar button, else bottom-left. */
function taskbarTarget(instanceId: string): { x: number; y: number } {
  const btn = document.querySelector(`[data-taskbtn="${instanceId}"]`);
  if (btn) {
    const r = btn.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  return { x: 120, y: window.innerHeight - 20 };
}

export const Window = memo(function Window({ instanceId }: { instanceId: string }) {
  const win = useOSStore((s) => s.windows[instanceId]);
  const focused = useOSStore((s) => s.focusedId === instanceId);
  const winRef = useRef<HTMLDivElement>(null);
  const prevState = useRef(win?.state);
  const dragHandlers = useWindowDrag(winRef, instanceId);

  const manifest = win ? byId(win.appId) : undefined;

  const close = useCallback(() => useOSStore.getState().close(instanceId), [instanceId]);

  const minimize = useCallback(() => {
    const el = winRef.current;
    const dur = motionMs();
    const commit = () => useOSStore.getState().setState(instanceId, 'minimized');
    if (!el || dur === 0) return commit();
    const rect = el.getBoundingClientRect();
    const to = taskbarTarget(instanceId);
    // target translate puts the (scaled-about-center) window's center on the taskbar button
    const anim = el.animate(
      [
        { transform: el.style.transform && el.style.transform !== 'none' ? el.style.transform : 'none', opacity: 1 },
        {
          transform: `translate3d(${to.x - rect.width / 2}px,${to.y - rect.height / 2}px,0) scale(.12)`,
          opacity: 0.15,
        },
      ],
      { duration: dur + 40, easing: 'cubic-bezier(.4,.0,.9,.6)' },
    );
    anim.onfinish = commit;
    anim.oncancel = commit;
  }, [instanceId]);

  const toggleMaximize = useCallback(() => {
    const s = useOSStore.getState();
    const w = s.windows[instanceId];
    if (!w) return;
    s.setState(instanceId, w.state === 'maximized' ? 'normal' : 'maximized');
  }, [instanceId]);

  const fullscreen = useCallback(() => {
    if (winRef.current) toggleElementFullscreen(winRef.current);
  }, []);

  // open animation on mount; un-minimize animation on restore
  useEffect(() => {
    const el = winRef.current;
    if (!el || !win) return;
    const dur = motionMs();
    const was = prevState.current;
    prevState.current = win.state;
    if (dur === 0) return;
    // 'none scale(.85)' is invalid — drop the base transform when the window is maximized
    const base = el.style.transform && el.style.transform !== 'none' ? el.style.transform + ' ' : '';
    if (was === undefined && win.state !== 'minimized') {
      el.animate(
        [
          { transform: `${base}scale(.85)`, opacity: 0 },
          { transform: `${base}scale(1)`, opacity: 1 },
        ],
        { duration: dur, easing: 'cubic-bezier(.2,.7,.3,1)' },
      );
    } else if (was === 'minimized' && win.state !== 'minimized') {
      el.animate(
        [
          { transform: `${base}scale(.4)`, opacity: 0.2 },
          { transform: `${base}scale(1)`, opacity: 1 },
        ],
        { duration: dur, easing: 'cubic-bezier(.2,.7,.3,1)' },
      );
    }
  }, [win?.state, win]);

  if (!win || !manifest) return null;

  const maximized = win.state === 'maximized';
  const style: React.CSSProperties = maximized
    ? { transform: 'none', width: '100%', height: '100%', zIndex: win.z }
    : {
        transform: `translate3d(${win.rect.x}px,${win.rect.y}px,0)`,
        width: win.rect.width,
        height: win.rect.height,
        zIndex: win.z,
      };

  const resizable = (manifest.window.resizable ?? true) && !maximized && isFreeFloat();
  const isGame = manifest.category === 'games';

  return (
    <div
      ref={winRef}
      className="win"
      role="dialog"
      aria-modal="false"
      aria-labelledby={`win-${win.instanceId}-title`}
      tabIndex={-1}
      data-state={focused ? 'active' : 'inactive'}
      data-display={win.state}
      style={style}
      onPointerDownCapture={() => {
        if (!focused) useOSStore.getState().focus(instanceId);
      }}
    >
      <TitleBar
        win={win}
        manifest={manifest}
        dragHandlers={dragHandlers}
        onMinimize={minimize}
        onToggleMaximize={toggleMaximize}
        onClose={close}
        onFullscreen={isGame ? fullscreen : undefined}
      />
      <div className={`win__body win-body${manifest.kind === 'iframe' ? ' win__body--stage' : ''}`}>
        <AppHost manifest={manifest} windowId={instanceId} focused={focused} />
      </div>
      {resizable && <ResizeHandles winRef={winRef} instanceId={instanceId} manifest={manifest} />}
    </div>
  );
});
