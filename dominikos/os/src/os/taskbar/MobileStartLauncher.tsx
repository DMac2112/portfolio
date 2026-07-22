// Full-screen app launcher (§10.4): 44px+ rows, Shut Down, Exit to classic site.
import { AppRegistry } from '../registry';
import { useOSStore } from '../store/osStore';
import { storage } from '../storage';

interface Props {
  onClose: () => void;
  onLogOff: () => void;
  onShutDown: () => void;
}

export function MobileStartLauncher({ onClose, onLogOff, onShutDown }: Props) {
  const apps = Object.values(AppRegistry)
    .filter((a) => a.startMenu?.show || a.desktop?.show)
    .sort((a, b) => (a.desktop?.order ?? 50) - (b.desktop?.order ?? 50));

  return (
    <div className="mlauncher" role="dialog" aria-modal="true" aria-label="All apps">
      <header className="mlauncher__head">
        <img src="/os/ui/avatar.svg" alt="" />
        <span>Dominik Machowiak</span>
        <button type="button" onClick={onClose} aria-label="Close the launcher">✕</button>
      </header>
      <div className="mlauncher__list">
        {apps.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={(e) => {
              useOSStore.getState().open(a.id, { trigger: e.currentTarget });
              onClose();
            }}
          >
            <img src={a.icon} alt="" />
            <span>{a.desktop?.label ?? a.title}</span>
          </button>
        ))}
      </div>
      <footer className="mlauncher__foot">
        <button type="button" onClick={onLogOff}>Log Off</button>
        <button type="button" onClick={onShutDown}>Shut Down</button>
        <a href="/">Exit to classic site</a>
        <a
          href="/os/?boot=chooser"
          onClick={() => storage.setLastBoot(null)}
        >
          Start screen
        </a>
      </footer>
    </div>
  );
}
