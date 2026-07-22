// In-app game pause contract (DOMINIKOS-PLAN §8.4): the SAME booleans as iframe games —
// active = focused ∧ tabVisible ∧ !minimized — but enforced natively: when !active, NO
// requestAnimationFrame is scheduled at all; unmount tears everything down.
import { useEffect, useRef } from 'react';

export function useGameLoop(tick: (dt: number) => void, active: boolean): void {
  const cb = useRef(tick);
  cb.current = tick;

  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      // clamp: a long-suspended tab must not integrate a giant physics step on resume
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      cb.current(dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active]);
}
