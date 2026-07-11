// Static system config (DOMINIKOS-PLAN §0.1): theme/sound/a11y/device/locale live in Context —
// NOT in the per-frame window store. The theme value only sets document.documentElement.dataset
// (§5.9: the attribute is the single theming mechanism; v1 is XP-only per §15.7).
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { prefersReducedMotion } from '../env';
import { storage, type Prefs } from '../storage';
import { useDeviceMode } from '../useDeviceMode';
import type { DeviceMode, InputMode } from '../types';

export interface SystemContextValue {
  prefs: Prefs;
  setPref: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void;
  device: DeviceMode;
  input: InputMode;
  locale: string; // en-only in v1 (§0.1); '-en' content suffixes keep the door open
}

const SystemContext = createContext<SystemContextValue | null>(null);

export function defaultPrefs(): Prefs {
  return {
    reducedMotion: prefersReducedMotion(),
    muted: true, // sound OFF by default, opt-in only (§11.3)
    theme: 'xp',
    largeText: false,
    ...storage.getPrefs(),
  };
}

export function SystemProvider({ children, initialPrefs }: { children: ReactNode; initialPrefs?: Partial<Prefs> }) {
  const [prefs, setPrefs] = useState<Prefs>(() => ({ ...defaultPrefs(), ...initialPrefs }));
  const { device, input } = useDeviceMode();

  useEffect(() => {
    storage.setPrefs(prefs);
    const root = document.documentElement;
    root.dataset.theme = prefs.theme;
    root.dataset.motion = prefs.reducedMotion ? 'reduce' : 'full';
    root.dataset.text = prefs.largeText ? 'large' : 'normal';
  }, [prefs]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.device = device;
    root.dataset.input = input;
  }, [device, input]);

  const value = useMemo<SystemContextValue>(
    () => ({
      prefs,
      setPref: (key, v) => setPrefs((p) => ({ ...p, [key]: v })),
      device,
      input,
      locale: 'en',
    }),
    [prefs, device, input],
  );

  return <SystemContext.Provider value={value}>{children}</SystemContext.Provider>;
}

export function useSystem(): SystemContextValue {
  const ctx = useContext(SystemContext);
  if (!ctx) throw new Error('useSystem must be used inside <SystemProvider>');
  return ctx;
}
