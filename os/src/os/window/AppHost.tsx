// Resolves the renderer for a window (DOMINIKOS-PLAN §0.4/§7.11): iframe kinds go to
// IframeHost; everything else is a code-split lazy component receiving the ONE AppProps shape.
import { Suspense, useCallback } from 'react';
import { resolveComponent } from '../registry';
import { useOSStore } from '../store/osStore';
import type { AppManifest } from '../types';
import { IframeHost } from './IframeHost';

interface AppHostProps {
  manifest: AppManifest;
  windowId: string;
  focused: boolean;
}

export function AppHost({ manifest, windowId, focused }: AppHostProps) {
  const close = useCallback(() => useOSStore.getState().close(windowId), [windowId]);
  const setTitle = useCallback((t: string) => useOSStore.getState().retitle(windowId, t), [windowId]);
  const launchProps = useOSStore((s) => s.windows[windowId]?.props);

  if (manifest.kind === 'iframe') {
    return <IframeHost manifest={manifest} windowId={windowId} focused={focused} />;
  }

  const Component = resolveComponent(manifest);
  if (!Component) {
    return (
      <div className="app-placeholder">
        <img src={manifest.icon} alt="" />
        <h2>{manifest.title}</h2>
        <p>No renderer is registered for this app kind yet.</p>
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="app-loading">Loading {manifest.title}…</div>}>
      <Component
        manifest={manifest}
        windowId={windowId}
        focused={focused}
        close={close}
        setTitle={setTitle}
        props={launchProps}
      />
    </Suspense>
  );
}
