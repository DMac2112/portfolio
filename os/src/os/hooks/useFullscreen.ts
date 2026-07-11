// Two DISTINCT fullscreen features (DOMINIKOS-PLAN §4.3):
//   1. OS-fullscreen — documentElement, requested on the BootChooser gesture.
//   2. Game-fullscreen — the .win node, via the ⛶ titlebar button (games only).
// iOS Safari has no element Fullscreen API → all calls no-op safely; layout uses 100dvh instead.
import { useCallback, useEffect, useState } from 'react';

export function requestOSFullscreen(): void {
  try {
    const el = document.documentElement;
    const p = el.requestFullscreen?.({ navigationUI: 'hide' });
    p?.catch(() => {});
  } catch {
    /* iOS / denied — 100dvh shell is the fallback */
  }
}

export function toggleElementFullscreen(el: HTMLElement): void {
  try {
    if (document.fullscreenElement === el) {
      void document.exitFullscreen().catch(() => {});
    } else {
      el.requestFullscreen?.()?.catch(() => {});
    }
  } catch {
    /* unsupported — pseudo-fullscreen CSS is the iPhone fallback (§8.3) */
  }
}

export function useFullscreen(): { isFullscreen: boolean } {
  const [isFullscreen, set] = useState(() =>
    typeof document === 'undefined' ? false : !!document.fullscreenElement,
  );
  const on = useCallback(() => set(!!document.fullscreenElement), []);
  useEffect(() => {
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, [on]);
  return { isFullscreen };
}
