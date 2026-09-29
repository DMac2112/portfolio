import { useCallback, useEffect, useState, type RefObject } from 'react';

type WebkitDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitFullscreenEnabled?: boolean;
  webkitExitFullscreen?: () => Promise<void> | void;
};
type WebkitElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

let pseudoEl: HTMLElement | null = null;

export function requestOSFullscreen(): void {
  try {
    const el = document.documentElement;
    const p = el.requestFullscreen?.({ navigationUI: 'hide' });
    p?.catch(() => {});
  } catch {
    /* iOS / denied: the shell uses viewport sizing. */
  }
}

export function fullscreenElement(): Element | null {
  const doc = document as WebkitDocument;
  return document.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

export function canElementFullscreen(el: HTMLElement): boolean {
  const doc = document as WebkitDocument;
  return (typeof el.requestFullscreen === 'function' ||
    typeof (el as WebkitElement).webkitRequestFullscreen === 'function') &&
    (document.fullscreenEnabled ?? doc.webkitFullscreenEnabled) !== false;
}

function onPseudoKeydown(e: KeyboardEvent): void {
  if (e.key !== 'Escape') return;
  e.preventDefault();
  e.stopPropagation();
  exitPseudoFullscreen();
}

function exitPseudoFullscreen(): void {
  if (!pseudoEl) return;
  pseudoEl.removeAttribute('data-pseudo-fs');
  document.documentElement.removeAttribute('data-pseudo-fs');
  pseudoEl = null;
  window.removeEventListener('keydown', onPseudoKeydown, true);
  document.dispatchEvent(new Event('dominikos:pseudofs'));
}

function enterPseudoFullscreen(el: HTMLElement): void {
  exitPseudoFullscreen();
  pseudoEl = el;
  el.setAttribute('data-pseudo-fs', '');
  document.documentElement.setAttribute('data-pseudo-fs', '');
  window.addEventListener('keydown', onPseudoKeydown, true);
  document.dispatchEvent(new Event('dominikos:pseudofs'));
}

export function toggleGameFullscreen(el: HTMLElement): void {
  if (fullscreenElement() === el || pseudoEl === el) {
    exitGameFullscreen();
    return;
  }
  if (!el.hasAttribute('tabindex')) el.tabIndex = -1;
  el.focus({ preventScroll: true });
  if (!canElementFullscreen(el)) {
    enterPseudoFullscreen(el);
    return;
  }
  try {
    const request = el.requestFullscreen ?? (el as WebkitElement).webkitRequestFullscreen;
    if (!request) {
      enterPseudoFullscreen(el);
      return;
    }
    Promise.resolve(request.call(el)).catch(() => enterPseudoFullscreen(el));
  } catch {
    enterPseudoFullscreen(el);
  }
}

export function toggleElementFullscreen(el: HTMLElement): void {
  toggleGameFullscreen(el);
}

export function exitGameFullscreen(): void {
  if (pseudoEl) {
    exitPseudoFullscreen();
    return;
  }
  if (!fullscreenElement()) return;
  try {
    const doc = document as WebkitDocument;
    const exit = document.exitFullscreen ?? doc.webkitExitFullscreen;
    if (exit) Promise.resolve(exit.call(document)).catch(() => {});
  } catch {
    /* Fullscreen may already have ended. */
  }
}

export function useElementFullscreen(ref: RefObject<HTMLElement>): boolean {
  const [active, setActive] = useState(false);
  useEffect(() => {
    const el = ref.current;
    const sync = () => setActive(!!el && (fullscreenElement() === el || pseudoEl === el));
    sync();
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    document.addEventListener('dominikos:pseudofs', sync);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync);
      document.removeEventListener('dominikos:pseudofs', sync);
      if (pseudoEl === el) exitPseudoFullscreen();
    };
  }, [ref]);
  return active;
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
