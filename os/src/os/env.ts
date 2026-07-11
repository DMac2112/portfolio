// Device model + breakpoints — the ONE definition (DOMINIKOS-PLAN §10.2).
import type { DeviceMode, InputMode, Rect } from './types';

export const BP = { phone: 640, tablet: 1024 } as const;

/** Must match --taskbar-h in tokens.css. */
export const TASKBAR_H = 40;

const hasDOM = typeof window !== 'undefined';

export function getDeviceMode(): DeviceMode {
  if (!hasDOM) return 'desktop';
  const w = window.innerWidth;
  if (w < BP.phone) return 'phone';
  if (w < BP.tablet) return 'tablet';
  return 'desktop';
}

/** Touch is a capability, not a width (§10.2). */
export function isTouchPrimary(): boolean {
  return hasDOM && typeof window.matchMedia === 'function'
    ? window.matchMedia('(pointer: coarse)').matches
    : false;
}

export function hasFinePointer(): boolean {
  return hasDOM && typeof window.matchMedia === 'function'
    ? window.matchMedia('(pointer: fine)').matches
    : true;
}

export function getInputMode(): InputMode {
  return isTouchPrimary() ? 'touch' : 'pointer';
}

/** Free-float windowing ONLY at ≥1024px AND pointer:fine (§0.1). Everything else is single-window. */
export function isFreeFloat(): boolean {
  return getDeviceMode() === 'desktop' && hasFinePointer();
}

export function isSingleWindowMode(): boolean {
  return !isFreeFloat();
}

export function prefersReducedMotion(): boolean {
  return hasDOM && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
}

/** The desktop workspace = viewport minus taskbar. Safe default when headless (unit tests). */
export function getWorkspace(): Rect {
  if (!hasDOM) return { x: 0, y: 0, width: 1280, height: 800 - TASKBAR_H };
  return { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight - TASKBAR_H };
}
