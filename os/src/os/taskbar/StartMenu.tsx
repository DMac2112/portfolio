// Two-column XP-style Start menu, layout per §7.10: left = Explorer, Notepad, Contact;
// right = My Documents (Résumé, Skills, Testimonials), My Projects, Games, Experience.
// Footer: Log Off (→ login) / Turn Off Computer (→ shutdown FSM). Also carries the §11.5
// escape hatches (classic accessible site, boot chooser).
import { useEffect, useRef } from 'react';
import { byId } from '../registry';
import { useOSStore } from '../store/osStore';
import { storage } from '../storage';

const RIGHT_DOC_IDS = ['resume', 'skills', 'testimonials'];
const RIGHT_PLACE_IDS = ['my-projects', 'games', 'experience', 'my-computer'];

interface Props {
  onClose: () => void;
  onLogOff: () => void;
  onShutDown: () => void;
}

export function StartMenu({ onClose, onLogOff, onShutDown }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const away = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      if (!ref.current?.contains(t) && !t.closest('.start-btn')) onClose();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const items = Array.from(ref.current?.querySelectorAll<HTMLElement>('button, a') ?? []);
        const idx = items.indexOf(document.activeElement as HTMLElement);
        const next = e.key === 'ArrowDown' ? Math.min(items.length - 1, idx + 1) : Math.max(0, idx - 1);
        items[next]?.focus();
        e.preventDefault();
      }
    };
    document.addEventListener('pointerdown', away, true);
    document.addEventListener('keydown', key);
    ref.current?.querySelector('button')?.focus();
    return () => {
      document.removeEventListener('pointerdown', away, true);
      document.removeEventListener('keydown', key);
    };
  }, [onClose]);

  const launch = (id: string) => (e: React.MouseEvent<HTMLButtonElement>) => {
    useOSStore.getState().open(id, { trigger: e.currentTarget });
    onClose();
  };

  const item = (id: string, subtitle?: string) => {
    const app = byId(id);
    if (!app) return null;
    return (
      <button key={id} type="button" className="start-menu__item" role="menuitem" onClick={launch(id)}>
        <img src={app.icon} alt="" draggable={false} />
        <span>
          {app.title}
          {subtitle && <small>{subtitle}</small>}
        </span>
      </button>
    );
  };

  return (
    <div ref={ref} className="start-menu" role="menu" aria-label="Start menu">
      <div className="start-menu__header">
        <img src="/os/ui/avatar.svg" alt="" />
        <span>Dominik Machowiak</span>
      </div>
      <div className="start-menu__accent" />
      <div className="start-menu__cols">
        <div className="start-menu__left">
          {item('explorer', 'Browse the classic site')}
          {item('notepad', 'readme.txt')}
          {item('contact', 'Say hello')}
          <div className="start-menu__spacer" />
          <div className="start-menu__sep" />
          <button
            type="button"
            className="start-menu__item"
            role="menuitem"
            onClick={() => {
              window.location.href = '/';
            }}
          >
            <img src="/os/icons/ie-doc.svg" alt="" />
            <span>
              Classic accessible site
              <small>dominikmachowiak.com</small>
            </span>
          </button>
          <button
            type="button"
            className="start-menu__item"
            role="menuitem"
            onClick={() => {
              storage.setLastBoot(null);
              window.location.href = '/os/?boot=chooser';
            }}
          >
            <img src="/os/ui/start-flag.svg" alt="" />
            <span>
              Start screen
              <small>Choose desktop / résumé / game</small>
            </span>
          </button>
        </div>
        <div className="start-menu__right">
          {RIGHT_DOC_IDS.map((id) => item(id))}
          <div className="start-menu__sep" />
          {RIGHT_PLACE_IDS.map((id) => item(id))}
        </div>
      </div>
      <div className="start-menu__footer">
        <button type="button" onClick={onLogOff}>
          <svg viewBox="0 0 18 18" aria-hidden="true">
            <circle cx="9" cy="9" r="7.4" fill="#ffb636" stroke="#fff" strokeWidth="1.2" />
            <path d="M9 5.4v4.2M6.6 11.5h4.8" stroke="#7a4c00" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          Log Off
        </button>
        <button type="button" onClick={onShutDown}>
          <svg viewBox="0 0 18 18" aria-hidden="true">
            <circle cx="9" cy="9" r="7.4" fill="#d24a3a" stroke="#fff" strokeWidth="1.2" />
            <path d="M9 4.6v4.4" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" />
            <path d="M5.8 6.4a4.6 4.6 0 106.4 0" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </svg>
          Turn Off Computer
        </button>
      </div>
    </div>
  );
}
