import { useSystem } from '../context/SystemContext';
import { Clock } from './Clock';

/** Tray: sound toggle + decorative network glyph + live clock (§5.5). */
export function SystemTray() {
  const { prefs, setPref } = useSystem();
  const muted = prefs.muted;
  return (
    <div className="tray">
      <button
        type="button"
        aria-pressed={muted}
        aria-label={muted ? 'Sound is off — turn on' : 'Sound is on — turn off'}
        title={muted ? 'Sound off' : 'Sound on'}
        onClick={() => setPref('muted', !muted)}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M2 6h3l4-3.5v11L5 10H2z" fill="#fff" />
          {muted ? (
            <path d="M11 6l4 4M15 6l-4 4" stroke="#ffcf6b" strokeWidth="1.6" strokeLinecap="round" />
          ) : (
            <path d="M11 5.5a3.5 3.5 0 010 5M12.6 3.6a6 6 0 010 8.8" stroke="#fff" strokeWidth="1.3" fill="none" strokeLinecap="round" />
          )}
        </svg>
      </button>
      <button type="button" aria-label="Network (decorative)" title="Connected — DominikOS LAN">
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <rect x="2" y="3" width="7" height="5" rx="1" fill="#cfe0fb" stroke="#fff" strokeWidth=".8" />
          <path d="M5.5 8v2.5" stroke="#fff" strokeWidth="1.2" />
          <rect x="3.5" y="10.5" width="4" height="1.6" fill="#fff" />
          <rect x="9.5" y="7" width="5" height="6.5" rx="1" fill="#cfe0fb" stroke="#fff" strokeWidth=".8" />
        </svg>
      </button>
      <Clock />
    </div>
  );
}
