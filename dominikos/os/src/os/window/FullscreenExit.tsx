import type { RefObject } from 'react';
import { exitGameFullscreen, useElementFullscreen } from '../hooks/useFullscreen';

export function FullscreenExit({ targetRef, variant = 'float' }: { targetRef: RefObject<HTMLElement>; variant?: 'float' | 'bar' }) {
  const active = useElementFullscreen(targetRef);
  if (!active) return null;

  const button = (
    <button
      type="button"
      className={variant === 'bar' ? 'fs-exit fs-exit--bar' : 'fs-exit'}
      onClick={exitGameFullscreen}
      aria-label="Exit full screen (Esc)"
      title="Exit full screen (Esc)"
    >
      <span className="fs-exit__glyph" aria-hidden="true" />
      <span className="fs-exit__text">Exit full screen</span>
    </button>
  );
  if (variant === 'bar') {
    return <div className="fs-bar"><span className="fs-bar__hint">Press Esc to exit full screen</span>{button}</div>;
  }
  return button;
}
