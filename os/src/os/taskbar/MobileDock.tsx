// Bottom dock (§10.4): ⊞ Start + Home + running-app chips. 56px + safe-area inset.
import { useMemo } from 'react';
import { useOSStore } from '../store/osStore';

interface Props {
  visibleId: string | null;
  onHome: () => void;
  onStart: () => void;
}

export function MobileDock({ visibleId, onHome, onStart }: Props) {
  const windows = useOSStore((s) => s.windows);
  const chips = useMemo(() => Object.values(windows).sort((a, b) => a.createdAt - b.createdAt), [windows]);

  return (
    <nav className="mdock" aria-label="Dock">
      <button type="button" className="mdock__start" onClick={onStart} aria-label="Open the app launcher">
        <img src="/os/ui/start-flag.svg" alt="" /> start
      </button>
      <button type="button" className="mdock__home" onClick={onHome} aria-label="Show the home screen">
        🏠
      </button>
      <div className="mdock__chips">
        {chips.map((w) => (
          <button
            key={w.instanceId}
            type="button"
            className="mdock__chip"
            aria-pressed={w.instanceId === visibleId}
            title={w.title}
            onClick={() => useOSStore.getState().setState(w.instanceId, 'normal')}
          >
            <img src={w.icon} alt="" />
          </button>
        ))}
      </div>
    </nav>
  );
}
