// JSON manifests + componentMap join (DOMINIKOS-PLAN §0.4).
// JSON manifests are the data source of truth (add-a-file extensibility).
import { lazy } from 'react';
import type { AppKind, AppManifest, LazyApp } from './types';

// NOTE: §0.4 writes this glob as '/os/registry/*.json', but with base:'/os/' Vite strips the
// leading '/os' (base prefix) from absolute module ids, so a source dir literally named 'os/'
// can never resolve. Manifests therefore live at <root>/registry/*.json — same add-a-file
// contract, base-proof. (Manifests are bundled at build time; they are not runtime fetches.)
const files = import.meta.glob('/registry/*.json', { eager: true, import: 'default' }) as Record<
  string,
  AppManifest
>;

// Code-side map: kinds that need a renderer, and app ids that are code-split React apps.
export const componentByKind: Partial<Record<AppKind, LazyApp>> = {
  document: lazy(() => import('./apps/DocWindow')),
  folder: lazy(() => import('./apps/FolderApp')),
  timeline: lazy(() => import('./apps/ExperienceApp')),
  contact: lazy(() => import('./apps/ContactApp')),
  notepad: lazy(() => import('./apps/NotepadApp')),
  imageview: lazy(() => import('./apps/ImageViewApp')),
  pdf: lazy(() => import('./apps/PdfApp')),
  mycomputer: lazy(() => import('./apps/MyComputerApp')),
  recyclebin: lazy(() => import('./apps/RecycleBinApp')),
  // 'iframe' has NO component (rendered by IframeHost); 'react' resolves via componentById:
};
export const componentById: Record<string, LazyApp> = {
  // in-app React games (§8.4/§8.6): one manifest + one icon + this line = a new game
  // (Sky Hopper + Bubble Shooter are "web games" now — their lazy imports live in
  //  apps/browser/sites.tsx and they load inside DM Explorer, BROWSER-PLAN §3)
  pinball: lazy(() => import('./games/pinball/PinballApp')),
  pasjans: lazy(() => import('./games/pasjans/SolitaireApp')),
  mines: lazy(() => import('./games/mines/MinesApp')),
  paint: lazy(() => import('./apps/paint/PaintApp')),
  dialtone: lazy(() => import('./apps/dialtone/DialtoneApp')),
  explorer: lazy(() => import('./apps/browser/BrowserApp')),
};

export const AppRegistry: Record<string, AppManifest> = Object.values(files).reduce<
  Record<string, AppManifest>
>((acc, m) => ((acc[m.id] = m), acc), {});

export const byId = (id: string): AppManifest | undefined => AppRegistry[id];
export const byCategory = (c: AppManifest['category']): AppManifest[] =>
  Object.values(AppRegistry).filter((a) => a.category === c);
export const desktopIcons = (): AppManifest[] =>
  Object.values(AppRegistry)
    .filter((a) => a.desktop?.show)
    .sort((a, b) => (a.desktop!.order ?? 99) - (b.desktop!.order ?? 99));

/** Add-a-game truth (§0.4): the Games folder AUTO-LISTS byCategory('games') via the
 *  'auto:games' sentinel. Static-content folders (Projects) keep explicit children. */
export function folderChildren(m: AppManifest): AppManifest[] {
  if (m.children === 'auto:games') return byCategory('games');
  return (m.children ?? []).map(byId).filter((a): a is AppManifest => !!a);
}

/** AppHost resolves the renderer: */
export function resolveComponent(m: AppManifest): LazyApp | null {
  if (m.kind === 'iframe') return null;                 // → IframeHost
  if (m.kind === 'react') return componentById[m.id] ?? null; // code-split app/game
  return componentByKind[m.kind] ?? null;               // generic kind renderer
}
