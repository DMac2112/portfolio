// Iframe host + the boundary contracts (DOMINIKOS-PLAN §8.2):
//  · focus: a transparent shield covers the frame while the window is unfocused; the first
//    pointerdown focuses the window, then the shield unmounts and input flows to the frame.
//  · pause-on-blur: shouldRun = focused ∧ tabVisible ∧ !minimized → os-bridge-v1 pause/resume.
//  · sandbox: trusted same-origin games get allow-same-origin; external frames are hardened
//    (NO allow-same-origin). Note: §7.9 lists an "allow-fullscreen" sandbox token — that token
//    does not exist in the sandbox grammar (browsers warn); fullscreen is granted via the
//    allow="fullscreen" policy + allowFullScreen instead.
//  · teardown: src is pointed at about:blank on unmount so timers/audio die immediately (§4.3).
import { useEffect, useRef, useState } from 'react';
import { useOSStore } from '../store/osStore';
import { usePageVisible } from '../hooks/usePageVisible';
import type { AppManifest } from '../types';

const BRIDGE_CH = 'os-bridge-v1';

/** Hardened external frame (§7.9), reusable outside IframeHost (DM Explorer renders the real
 *  portfolio site through this — BROWSER-PLAN §2.4). Sandbox WITHOUT allow-same-origin, focus
 *  shield while the window is unfocused, about:blank teardown on unmount. Bump `reloadToken`
 *  to force a reload of the same src. */
export function ExternalFrame({ src, title, windowId, focused, reloadToken = 0 }: {
  src: string;
  title: string;
  windowId: string;
  focused: boolean;
  reloadToken?: number;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    el.src = src;
    return () => {
      el.src = 'about:blank';
    };
  }, [src, reloadToken]);

  return (
    <div className="iframe-stage">
      <iframe
        ref={frameRef}
        title={title}
        sandbox="allow-scripts allow-popups allow-forms"
        allow="fullscreen; autoplay; gamepad"
        allowFullScreen
        loading="lazy"
        tabIndex={0}
      />
      {!focused && (
        <div
          className="iframe-shield"
          onPointerDown={() => {
            useOSStore.getState().focus(windowId);
            frameRef.current?.focus();
          }}
        />
      )}
    </div>
  );
}

interface IframeHostProps {
  manifest: AppManifest;
  windowId: string;
  focused: boolean;
}

export function IframeHost({ manifest, windowId, focused }: IframeHostProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const bridgeReady = useRef(false);
  const tabVisible = usePageVisible();
  const minimized = useOSStore((s) => s.windows[windowId]?.state === 'minimized');
  const isGame = manifest.category === 'games';
  const external = !!manifest.external;

  const shouldRun = focused && tabVisible && !minimized;

  // pause/resume the embedded game — exactly one game consumes CPU, only while
  // focused + visible + foreground (§8.2). External frames have no bridge.
  useEffect(() => {
    if (!isGame || external) return;
    const post = (type: 'pause' | 'resume') =>
      frameRef.current?.contentWindow?.postMessage({ ch: BRIDGE_CH, type }, window.location.origin);

    if (bridgeReady.current) post(shouldRun ? 'resume' : 'pause');

    const onMessage = (e: MessageEvent) => {
      const m = e.data as { ch?: string; type?: string } | null;
      if (!m || m.ch !== BRIDGE_CH || e.source !== frameRef.current?.contentWindow) return;
      if (m.type === 'ready') {
        bridgeReady.current = true;
        post(shouldRun ? 'resume' : 'pause'); // game may finish loading while unfocused
      }
      if (import.meta.env.DEV && (m.type === 'paused' || m.type === 'resumed' || m.type === 'ready')) {
        console.debug(`[os-bridge] ${manifest.id} → ${m.type}`);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [shouldRun, isGame, external, manifest.id]);

  // src is owned by THIS effect (not JSX): mount loads the app, unmount points at about:blank
  // so timers/audio die immediately (§4.3). Pairing load+teardown in one effect keeps it
  // correct under React 18 StrictMode's mount→unmount→remount, where a lone cleanup would
  // blank the frame for good (React never re-sets an unchanged JSX src).
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    bridgeReady.current = false;
    if (manifest.src) el.src = manifest.src;
    return () => {
      el.src = 'about:blank';
    };
  }, [manifest.src]);

  const sandbox = external
    ? 'allow-scripts allow-popups allow-forms' // hardened: untrusted external site (§7.9)
    : 'allow-scripts allow-same-origin allow-pointer-lock'; // trusted same-origin game

  const ratio = manifest.window.aspectRatio;

  const stage = (
    <div
      className={`iframe-stage${ratio ? ' iframe-stage--ratio' : ''}`}
      style={ratio ? ({ '--ar': String(ratio) } as React.CSSProperties) : undefined}
    >
      <iframe
        ref={frameRef}
        title={manifest.title}
        sandbox={sandbox}
        allow="fullscreen; autoplay; gamepad"
        allowFullScreen
        loading="lazy"
        tabIndex={0}
      />
      {!focused && (
        <div
          className="iframe-shield"
          onPointerDown={() => {
            useOSStore.getState().focus(windowId);
            frameRef.current?.focus();
          }}
        />
      )}
    </div>
  );

  // External frames (§7.9) get minimal chrome + a persistent escape hatch. (DM Explorer is a
  // full app now — BROWSER-PLAN §2 — and reuses ExternalFrame above; this branch serves any
  // future kind:'iframe' + external manifest.) True block-DETECTION needs site cooperation
  // (a blocked frame still fires `load`, so a timeout would lie either way). The
  // always-available "Open in a new tab" bar is the honest fallback.
  if (external) {
    return <ExternalChrome src={manifest.src ?? 'about:blank'} title={manifest.title} windowId={windowId} focused={focused} />;
  }

  return stage;
}

function ExternalChrome({ src, title, windowId, focused }: { src: string; title: string; windowId: string; focused: boolean }) {
  const [reloadToken, setReloadToken] = useState(0);
  return (
    <div className="ie">
      <div className="ie__bar">
        <span className="ie__addr" title={src}>
          {src}
        </span>
        <button type="button" onClick={() => setReloadToken((t) => t + 1)}>⟳</button>
        <button type="button" onClick={() => window.open(src, '_blank', 'noopener')}>
          Open in new tab ↗
        </button>
      </div>
      <ExternalFrame src={src} title={title} windowId={windowId} focused={focused} reloadToken={reloadToken} />
      <div className="ie__hint">Page looks empty? Some sites refuse to be framed — use "Open in new tab".</div>
    </div>
  );
}
