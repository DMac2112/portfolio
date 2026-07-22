// Mobile shell (DOMINIKOS-PLAN §10): phones/tablets get a themed single-window launcher —
// honest framing: there is NO windowed desktop below 1024px/coarse pointer. Apps open
// auto-maximized; "Home" minimizes (windows stay mounted for state preservation, §9.3 —
// minimization also fires the game pause contract). This module is the phone half of the
// §10.6 tree split: it never imports the drag/resize/snap window manager.
import { useEffect } from 'react';
import { useOSStore } from '../store/osStore';
import { byId } from '../registry';
import { Wallpaper } from '../shell/Wallpaper';
import { IconGrid } from '../desktop/IconGrid';
import { AppHost } from '../window/AppHost';
import { MobileDock } from '../taskbar/MobileDock';
import { MobileStartLauncher } from '../taskbar/MobileStartLauncher';
import { backStack } from './backStack';
import { useStartMenuState } from '../taskbar/Taskbar';

interface Props {
  onLogOff: () => void;
  onShutDown: () => void;
}

function MobileWindow({ instanceId, visible }: { instanceId: string; visible: boolean }) {
  const win = useOSStore((s) => s.windows[instanceId]);
  const manifest = win ? byId(win.appId) : undefined;
  if (!win || !manifest) return null;
  // §10.5: only immersive games (canvas/iframe with their own HUD) open chromeless full-viewport,
  // closed via Back / Home. Everything else — windowed games like the card games and Minesweeper
  // included — gets the standard titlebar with the red close ✕, so it can always be shut.
  const chromeless = manifest.window.immersive === true;
  return (
    <div className="mwin" data-visible={visible} role="dialog" aria-modal="false" aria-label={win.title}>
      {!chromeless && (
        <div className="mwin__titlebar">
          <img src={win.icon} alt="" />
          <span>{win.title}</span>
          <button
            type="button"
            aria-label="Close"
            onClick={() => {
              useOSStore.getState().close(instanceId);
              backStack.windowClosedByUI();
            }}
          >
            ✕
          </button>
        </div>
      )}
      <div className={`mwin__body win-body${manifest.kind === 'iframe' ? ' win__body--stage' : ''}`}>
        <AppHost manifest={manifest} windowId={instanceId} focused={visible} />
      </div>
    </div>
  );
}

/** XP-style "resources low" modal, shown when a 5th window is refused (§10, MOBILE_WINDOW_CAP). */
function ResourceAlert({ onClose }: { onClose: () => void }) {
  return (
    <div className="mdlg-back" role="presentation" onClick={onClose}>
      <div className="mdlg" role="alertdialog" aria-modal="true" aria-labelledby="mdlg-title" aria-describedby="mdlg-body" onClick={(e) => e.stopPropagation()}>
        <div className="mdlg__titlebar" id="mdlg-title">DominikOS</div>
        <div className="mdlg__body">
          <p id="mdlg-body">
            <span className="mdlg__icon" aria-hidden="true">⚠</span>
            <span>System resources are low.<br />Close a program before opening another.</span>
          </p>
          <button type="button" className="mdlg__ok" onClick={onClose} autoFocus>OK</button>
        </div>
      </div>
    </div>
  );
}

export default function MobileShell({ onLogOff, onShutDown }: Props) {
  const order = useOSStore((s) => s.order);
  const windows = useOSStore((s) => s.windows);
  const resourceAlert = useOSStore((s) => s.resourceAlert);
  const [launcherOpen, setLauncherOpen] = useStartMenuState();

  // the visible app = top-most non-minimized window; none → home grid
  const visibleId = [...order].reverse().find((id) => windows[id].state !== 'minimized') ?? null;

  useEffect(
    () =>
      backStack.enterDesktop(() => {
        const s = useOSStore.getState();
        const top = [...s.order].reverse().find((id) => s.windows[id].state !== 'minimized');
        if (top) s.close(top); // Back closes the visible window (§10.4)
      }),
    [],
  );

  useEffect(() => {
    if (visibleId) backStack.showWindow(visibleId);
  }, [visibleId]);

  const goHome = () => {
    const s = useOSStore.getState();
    for (const id of s.order) {
      if (s.windows[id].state !== 'minimized') s.setState(id, 'minimized');
    }
  };

  return (
    <div className="mshell">
      <a className="skip-link" href="/">
        Exit to the accessible classic site
      </a>
      <main id="os-main" aria-label="DominikOS home" className="mshell__work">
        <Wallpaper />
        <IconGrid onIconContextMenu={(e) => e.preventDefault()} />
        {order.map((id) => (
          <MobileWindow key={id} instanceId={id} visible={id === visibleId} />
        ))}
      </main>
      <MobileDock
        visibleId={visibleId}
        onHome={goHome}
        onStart={() => setLauncherOpen(true)}
      />
      {launcherOpen && (
        <MobileStartLauncher onClose={() => setLauncherOpen(false)} onLogOff={onLogOff} onShutDown={onShutDown} />
      )}
      {resourceAlert && <ResourceAlert onClose={() => useOSStore.getState().dismissResourceAlert()} />}
      <div id="os-announce" className="sr-only" aria-live="polite" />
    </div>
  );
}
