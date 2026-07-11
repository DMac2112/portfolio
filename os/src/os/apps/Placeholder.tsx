import type { AppManifest } from '../types';

/** Honest stub body for apps whose real content ships in phase P4 (§13). The window frame
 *  hosting it (drag/resize/min/max/snap) is already the real window manager. */
export function Placeholder({ manifest, note }: { manifest: AppManifest; note?: string }) {
  return (
    <div className="app-placeholder">
      <img src={manifest.icon} alt="" />
      <h2>{manifest.title}</h2>
      <span className="badge">INSTALLING — ARRIVES IN P4</span>
      <p>{note ?? 'This app gets its real content in build phase P4. Everything around it — the window, taskbar and desktop — is already live.'}</p>
    </div>
  );
}
