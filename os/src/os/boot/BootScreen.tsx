// Boot ceremony (§5.7): BIOS text (~0.9s) → DominikOS wordmark + marquee progress (~2.1s),
// click/tap/Enter or the persistent Skip button skips; reduced motion collapses the whole
// thing to a ≤300ms beat. Fires BOOT_DONE exactly once.
import { useEffect, useRef, useState } from 'react';
import { BiosScreen } from './BiosScreen';
import { useSystem } from '../context/SystemContext';

const BIOS_MS = 900;
const LOGO_MS = 2100;
const REDUCED_MS = 250;

export function BootScreen({ onDone }: { onDone: () => void }) {
  const { prefs } = useSystem();
  const [phase, setPhase] = useState<'bios' | 'logo'>('bios');
  const done = useRef(false);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    onDone();
  };

  useEffect(() => {
    if (prefs.reducedMotion) {
      const t = window.setTimeout(finish, REDUCED_MS);
      return () => window.clearTimeout(t);
    }
    const t1 = window.setTimeout(() => setPhase('logo'), BIOS_MS);
    const t2 = window.setTimeout(finish, BIOS_MS + LOGO_MS);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs.reducedMotion]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') finish();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div onPointerDown={finish} role="status" aria-label="DominikOS is starting">
      {phase === 'bios' && !prefs.reducedMotion ? (
        <BiosScreen />
      ) : (
        <div className="bootscreen">
          <div className="bootscreen__brand">
            <img src="/os/ui/start-flag.svg" alt="" />
            <strong>
              Dominik<i>OS</i>
            </strong>
          </div>
          <div className="boot-progress" aria-hidden="true">
            <div className="boot-progress__blocks">
              <i /><i /><i />
            </div>
          </div>
        </div>
      )}
      <button type="button" className="boot-skip" onClick={finish}>
        Skip ⏭
      </button>
    </div>
  );
}
