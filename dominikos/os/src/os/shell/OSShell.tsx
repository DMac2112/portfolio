// OSShell (§4.4): SystemContext + XState session provider + screen router. This module is the
// code-split boundary — BootChooser lazy-imports it, so XP.css + the window manager never load
// on the chooser. Also owns §0.6 session persistence (desktop layout only; games NEVER
// auto-reopen) and the ?boot=game seed (open game1, login skipped).
import 'xp.css';
import '../../styles/tokens.css';
import '../../styles/globals.css';
import '../../styles/touch.css';
import { Suspense, lazy, useEffect, useRef } from 'react';
import { useMachine } from '@xstate/react';
import { sessionMachine, type SessionInput } from '../machines/sessionMachine';
import { SystemProvider, useSystem } from '../context/SystemContext';
import { useOSStore } from '../store/osStore';
import { byId } from '../registry';
import { isFreeFloat, isTouchPrimary } from '../env';
import { storage, type Prefs } from '../storage';
import { sound } from '../sound';
import { BootScreen } from '../boot/BootScreen';
import { LoginScreen } from '../boot/LoginScreen';
import { ShutdownScreen } from '../boot/ShutdownScreen';

// §10.6 tree split: phones tapping "Enter the Desktop" must NOT download the desktop-only
// window manager (drag/resize/snap). Desktop and MobileShell are separate lazy chunks picked
// by capability at session start.
const Desktop = lazy(() => import('./Desktop').then((m) => ({ default: m.Desktop })));
const MobileShell = lazy(() => import('../mobile/MobileShell'));

/** Kinds that rehydrate from a saved session. iframe/react (games, Explorer) never do (§0.6). */
const REHYDRATE_KINDS = new Set([
  'document', 'folder', 'timeline', 'contact', 'notepad', 'imageview', 'pdf', 'mycomputer', 'recyclebin',
]);

function rehydrateSession(): void {
  const saved = storage.getSession();
  if (!saved) return;
  const s = useOSStore.getState();
  for (const w of [...saved.windows].sort((a, b) => a.z - b.z)) {
    const m = byId(w.appId);
    if (!m || !REHYDRATE_KINDS.has(m.kind)) continue;
    const id = s.open(w.appId, { rect: w.rect });
    if (id && w.state !== 'normal') s.setState(id, w.state);
  }
}

function Shell({ entry, bootApp }: SessionInput) {
  const [state, send] = useMachine(sessionMachine, { input: { entry, bootApp } });
  const { prefs } = useSystem();
  const seeded = useRef(false);

  // First desktop entry: rehydrate saved layout (desktop mode only), then the deep-linked game on top.
  useEffect(() => {
    if (!state.matches('desktop') || seeded.current) return;
    seeded.current = true;
    if (isFreeFloat()) rehydrateSession();
    if (bootApp) useOSStore.getState().open(bootApp, { maximized: isTouchPrimary() });
  }, [state, bootApp]);

  // Persist the desktop layout (§0.6) — debounced, desktop mode only.
  useEffect(() => {
    if (!isFreeFloat()) return;
    let t = 0;
    const unsub = useOSStore.subscribe((s) => {
      window.clearTimeout(t);
      t = window.setTimeout(() => {
        storage.setSession({
          windows: s.order.map((id) => {
            const w = s.windows[id];
            return { appId: w.appId, rect: w.rect, z: w.z, state: w.state };
          }),
        });
      }, 400);
    });
    return () => {
      window.clearTimeout(t);
      unsub();
    };
  }, []);

  const shutDown = () => {
    if (!prefs.muted) sound.shutdown();
    useOSStore.getState().closeAll();
    send({ type: 'SHUTDOWN' });
  };
  const logOff = () => {
    useOSStore.getState().closeAll();
    send({ type: 'LOGOFF' });
  };

  if (state.matches('boot')) return <BootScreen onDone={() => send({ type: 'BOOT_DONE' })} />;
  if (state.matches('login')) return <LoginScreen onLogin={() => send({ type: 'LOGIN' })} onShutDown={shutDown} />;
  if (state.matches('shutdown')) return <ShutdownScreen onRestart={() => send({ type: 'RESTART' })} />;
  const Shell = isFreeFloat() ? Desktop : MobileShell;
  return (
    <Suspense fallback={<div className="app-loading" style={{ height: '100dvh' }}>Loading the desktop…</div>}>
      <Shell onLogOff={logOff} onShutDown={shutDown} />
    </Suspense>
  );
}

export interface OSShellProps extends SessionInput {
  initialPrefs?: Partial<Prefs>;
}

export default function OSShell({ entry, bootApp, initialPrefs }: OSShellProps) {
  return (
    <div className="os-root">
      <SystemProvider initialPrefs={initialPrefs}>
        <Shell entry={entry} bootApp={bootApp} />
      </SystemProvider>
    </div>
  );
}
