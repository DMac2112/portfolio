// Entry (§0.5): eager BootChooser; OSShell is React.lazy behind the choice. Deep links:
//   /os/?boot=desktop → boot→login→desktop     /os/?boot=game → desktop with game1, login skipped
//   /os/?boot=resume  → classic site           /os/?boot=chooser → always show the chooser
// With "skip intro" saved, dmos.v1.lastBoot auto-routes to the DESKTOP (never into a game, even if
// 'game' was the saved choice) — the chooser link clears it.
import { StrictMode, Suspense, lazy, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/chooser.css';
import { BootChooser, type BootMode } from './os/boot/BootChooser';
import { storage } from './os/storage';

const OSShell = lazy(() => import('./os/shell/OSShell'));

interface Launch {
  entry: 'boot' | 'desktop';
  bootApp?: string;
}

const launchFor = (mode: 'desktop' | 'game'): Launch =>
  mode === 'game' ? { entry: 'desktop', bootApp: 'game1' } : { entry: 'boot' };

function initialLaunch(): Launch | null {
  const boot = new URLSearchParams(window.location.search).get('boot');
  if (boot === 'resume') {
    window.location.replace('/');
    return null;
  }
  if (boot === 'desktop' || boot === 'game') return launchFor(boot);
  if (boot === 'chooser') {
    storage.setLastBoot(null);
    return null;
  }
  const last = storage.getLastBoot(); // skip-intro (§10.3)
  if (last === 'resume') {
    window.location.replace('/');
    return null;
  }
  // A remembered choice never auto-launches a game: skip-intro lands on the desktop, whatever was
  // saved. Jumping straight into game1 stays deliberate — the chooser's card, or ?boot=game.
  if (last === 'desktop' || last === 'game') return launchFor('desktop');
  return null;
}

function StartingFallback() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100dvh', fontSize: 15, color: '#a9b8dc' }}>
      Starting DominikOS…
    </div>
  );
}

function Root() {
  const [launch, setLaunch] = useState<Launch | null>(initialLaunch);

  if (!launch) {
    return (
      <BootChooser
        onChoose={(mode: BootMode) => {
          if (mode !== 'resume') setLaunch(launchFor(mode));
        }}
      />
    );
  }
  return (
    <Suspense fallback={<StartingFallback />}>
      <OSShell entry={launch.entry} bootApp={launch.bootApp} />
    </Suspense>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
