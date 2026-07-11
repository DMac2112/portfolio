// Versioned localStorage schema (DOMINIKOS-PLAN §0.6). Namespace dmos.v1.* — bump to v2 on
// breaking change; on version mismatch, clear + reseed.
import type { Rect, WindowDisplayState } from './types';

const NS = 'dmos.v1';
const VERSION_KEY = 'dmos.version';
const VERSION = '1';

export type LastBoot = 'desktop' | 'game' | 'resume' | null;

export interface Prefs {
  reducedMotion: boolean;
  muted: boolean;
  theme: 'xp' | 'aero'; // 'aero' reserved; v1 never sets it (§15.7: XP-only)
  largeText: boolean;
}

export interface SavedSession {
  windows: Array<{ appId: string; rect: Rect; z: number; state: WindowDisplayState }>;
}

const hasStorage = (() => {
  try {
    return typeof localStorage !== 'undefined';
  } catch {
    return false;
  }
})();

/** Wipe all dmos.* keys on schema version mismatch. */
function ensureVersion(): void {
  if (!hasStorage) return;
  try {
    if (localStorage.getItem(VERSION_KEY) === VERSION) return;
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith('dmos.')) localStorage.removeItem(k);
    }
    localStorage.setItem(VERSION_KEY, VERSION);
  } catch {
    /* storage unavailable (private mode etc.) — run stateless */
  }
}
ensureVersion();

function read<T>(key: string): T | null {
  if (!hasStorage) return null;
  try {
    const raw = localStorage.getItem(`${NS}.${key}`);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  if (!hasStorage) return;
  try {
    if (value === null || value === undefined) localStorage.removeItem(`${NS}.${key}`);
    else localStorage.setItem(`${NS}.${key}`, JSON.stringify(value));
  } catch {
    /* quota/private mode — run stateless */
  }
}

export const storage = {
  getLastBoot: (): LastBoot => read<LastBoot>('lastBoot'),
  setLastBoot: (v: LastBoot) => write('lastBoot', v),
  getPrefs: (): Partial<Prefs> => read<Partial<Prefs>>('prefs') ?? {},
  setPrefs: (p: Prefs) => write('prefs', p),
  getSession: (): SavedSession | null => read<SavedSession>('session'),
  setSession: (s: SavedSession | null) => write('session', s),
};

/* --- sessionStorage twins (BROWSER-PLAN §1.2): same NS + hardening, but the value dies with
 *     the tab. Deliberately outside the v1 wipe (that logic stays localStorage-only). --- */

const hasSession = (() => {
  try {
    return typeof sessionStorage !== 'undefined';
  } catch {
    return false;
  }
})();

export function sessionRead<T>(key: string): T | null {
  if (!hasSession) return null;
  try {
    const raw = sessionStorage.getItem(`${NS}.${key}`);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function sessionWrite(key: string, value: unknown): void {
  if (!hasSession) return;
  try {
    if (value === null || value === undefined) sessionStorage.removeItem(`${NS}.${key}`);
    else sessionStorage.setItem(`${NS}.${key}`, JSON.stringify(value));
  } catch {
    /* quota/private mode — run stateless */
  }
}
