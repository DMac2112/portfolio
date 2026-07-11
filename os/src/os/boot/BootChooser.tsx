// BootChooser (§10.3) — the device/experience gate. Plain semantic HTML, NO XP.css, eager and
// tiny. It (a) captures the fullscreen gesture, (b) seeds motion/sound prefs, (c) is the
// code-split boundary (OSShell lazy-loads behind it), (d) carries the legal disclaimer (§6).
import { useState } from 'react';
import { prefersReducedMotion } from '../env';
import { storage } from '../storage';
import { requestOSFullscreen } from '../hooks/useFullscreen';

export type BootMode = 'desktop' | 'game' | 'resume';

export function BootChooser({ onChoose }: { onChoose: (mode: BootMode) => void }) {
  const saved = storage.getPrefs();
  const [reduceMotion, setReduceMotion] = useState(saved.reducedMotion ?? prefersReducedMotion());
  const [soundOff, setSoundOff] = useState(saved.muted ?? true);
  const [largeText, setLargeText] = useState(saved.largeText ?? false);
  const [skipNext, setSkipNext] = useState(false);

  const choose = (mode: BootMode) => {
    storage.setPrefs({
      reducedMotion: reduceMotion,
      muted: soundOff,
      theme: 'xp',
      largeText,
    });
    storage.setLastBoot(skipNext ? mode : null);
    if (mode === 'resume') {
      window.location.href = '/';
      return;
    }
    requestOSFullscreen(); // must happen inside this click (user gesture)
    onChoose(mode);
  };

  return (
    <div className="chooser">
      <main>
        <div className="chooser__brand">
          <img src="/os/ui/start-flag.svg" alt="" />
          <h1>
            Dominik<em>OS</em>
          </h1>
        </div>
        <p className="chooser__tag">
          Dominik Machowiak's portfolio, reimagined as an early-2000s desktop. Pick how you'd
          like to visit:
        </p>

        <div className="chooser__options">
          <button type="button" className="chooser__opt chooser__opt--primary" onClick={() => choose('desktop')}>
            <span className="glyph" aria-hidden="true">🖥️</span>
            <span>
              <strong>Enter the Desktop</strong>
              <small>Full experience — boot, log in, open apps in windows</small>
            </span>
          </button>
          <button type="button" className="chooser__opt" onClick={() => choose('game')}>
            <span className="glyph" aria-hidden="true">🕹️</span>
            <span>
              <strong>Play a game</strong>
              <small>Jump straight into Dev District — no login</small>
            </span>
          </button>
          <button type="button" className="chooser__opt" onClick={() => choose('resume')}>
            <span className="glyph" aria-hidden="true">📄</span>
            <span>
              <strong>Just the résumé</strong>
              <small>The classic, fully accessible site</small>
            </span>
          </button>
        </div>

        <div className="chooser__toggles">
          <label>
            <input type="checkbox" checked={reduceMotion} onChange={(e) => setReduceMotion(e.target.checked)} />
            Reduce motion (skips boot animations)
          </label>
          <label>
            <input type="checkbox" checked={soundOff} onChange={(e) => setSoundOff(e.target.checked)} />
            Keep sound off
          </label>
          <label>
            <input type="checkbox" checked={largeText} onChange={(e) => setLargeText(e.target.checked)} />
            Larger text in apps
          </label>
          <label>
            <input type="checkbox" checked={skipNext} onChange={(e) => setSkipNext(e.target.checked)} />
            Remember my choice and skip this screen next time
          </label>
        </div>

        <p className="chooser__legal">
          DominikOS is an original fan homage inspired by early-2000s desktop operating systems.
          It is not affiliated with, endorsed by, or connected to Microsoft Corporation.
          "Windows" and related marks are trademarks of their respective owners. ·{' '}
          <a href="/">Accessible classic site</a>
        </p>
      </main>
    </div>
  );
}
