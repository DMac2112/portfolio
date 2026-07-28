// The desktop composition (§4.4): wallpaper + icon grid + window layer + taskbar, plus the
// global keyboard map (§11.2 subset for P2: arrows/Enter in the grid, Alt+Tab, Win/Ctrl+Esc,
// Esc / Alt+F4 close). The aria-live announcer the store writes to also lives here.
import { useCallback, useEffect, useState } from 'react';
import { useOSStore } from '../store/osStore';
import { Wallpaper } from './Wallpaper';
import { IconGrid } from '../desktop/IconGrid';
import { ContextMenu, type CtxMenuState } from '../desktop/ContextMenu';
import { AltTabSwitcher, commitAltTab, type AltTabState } from '../desktop/AltTabSwitcher';
import { WindowLayer } from '../window/WindowLayer';
import { SnapPreview } from '../window/SnapPreview';
import { Taskbar, useStartMenuState } from '../taskbar/Taskbar';
import type { AppManifest } from '../types';

interface Props {
  onLogOff: () => void;
  onShutDown: () => void;
}

export function Desktop({ onLogOff, onShutDown }: Props) {
  const [menu, setMenu] = useState<CtxMenuState | null>(null);
  const [startOpen, setStartOpen] = useStartMenuState();
  const [altTab, setAltTab] = useState<AltTabState | null>(null);

  const openDesktopMenu = useCallback((e: React.MouseEvent) => {
    if (e.target !== e.currentTarget && !(e.target as HTMLElement).closest('.icon-grid')) return;
    e.preventDefault();
    setMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        {
          label: 'Refresh',
          onPick: () => {
            const live = document.getElementById('os-announce');
            if (live) live.textContent = 'Desktop refreshed';
          },
        },
        { separator: true, label: '' },
        { label: 'About DominikOS', onPick: () => useOSStore.getState().open('about'), bold: true },
      ],
    });
  }, []);

  const openIconMenu = useCallback((e: React.MouseEvent, app: AppManifest) => {
    e.preventDefault();
    e.stopPropagation();
    setMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        { label: 'Open', bold: true, onPick: () => useOSStore.getState().open(app.id) },
        { separator: true, label: '' },
        { label: 'About DominikOS', onPick: () => useOSStore.getState().open('about') },
      ],
    });
  }, []);

  // global keyboard map
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const s = useOSStore.getState();
      // Alt+Tab switcher
      if (e.altKey && e.key === 'Tab') {
        e.preventDefault();
        setAltTab((prev) => {
          const ids = [...s.order].reverse();
          if (ids.length === 0) return null;
          if (!prev) return { ids, index: ids.length > 1 ? 1 : 0 };
          const dir = e.shiftKey ? -1 : 1;
          return { ...prev, index: (prev.index + dir + prev.ids.length) % prev.ids.length };
        });
        return;
      }
      // Win or Ctrl+Esc → Start menu
      if (e.key === 'Meta' || (e.ctrlKey && e.key === 'Escape')) {
        e.preventDefault();
        setStartOpen((p) => !p);
        return;
      }
      // Alt+F4 → close focused
      if (e.altKey && e.key === 'F4') {
        e.preventDefault();
        if (s.focusedId) s.close(s.focusedId);
        return;
      }
      // Esc → close focused window (menus consume Esc themselves first)
      if (e.key === 'Escape' && !startOpen && !menu) {
        const t = e.target as HTMLElement;
        if (t.closest('input, textarea, select, [contenteditable]')) return;
        if (s.focusedId) s.close(s.focusedId);
        return;
      }
      // F6 → cycle desktop ↔ taskbar ↔ focused window (§11.2)
      if (e.key === 'F6') {
        e.preventDefault();
        const regions = [
          document.querySelector<HTMLElement>('.icon-grid .desk-icon[tabindex="0"]'),
          document.querySelector<HTMLElement>('.start-btn'),
          document.querySelector<HTMLElement>('.win[data-state="active"]'),
        ].filter((el): el is HTMLElement => !!el);
        if (regions.length === 0) return;
        const active = document.activeElement as HTMLElement | null;
        const idx = regions.findIndex((r) => r === active || (active ? r.contains(active) : false));
        regions[(idx + 1) % regions.length].focus();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt') {
        setAltTab((prev) => {
          if (prev) commitAltTab(prev);
          return null;
        });
      }
    };
    const onBlur = () => setAltTab(null);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [setStartOpen, startOpen, menu]);

  return (
    <div className="desktop">
      <a className="skip-link" href="/">
        Exit to the accessible classic site
      </a>
      <main id="os-main" aria-label="DominikOS desktop" className="desktop__work" onContextMenu={openDesktopMenu}>
        <Wallpaper />
        <IconGrid onIconContextMenu={openIconMenu} />
        <WindowLayer />
        <SnapPreview />
      </main>
      <Taskbar onLogOff={onLogOff} onShutDown={onShutDown} startOpen={startOpen} setStartOpen={setStartOpen} />
      <ContextMenu menu={menu} onClose={() => setMenu(null)} />
      <AltTabSwitcher state={altTab} />
      <div id="os-announce" className="sr-only" aria-live="polite" />
    </div>
  );
}
