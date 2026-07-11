// ============ src/os/types.ts — canonical, imported everywhere (DOMINIKOS-PLAN §0.2) ============
import type { LazyExoticComponent, ComponentType } from 'react';

export type AppKind =
  | 'document'   // markdown/HTML doc window (Résumé HTML fallback, About, Skills, Testimonials)
  | 'folder'     // grid of child app icons (Projects, Games)
  | 'iframe'     // embed a same-origin static app (game1) OR external URL (Explorer)
  | 'react'      // code-split React component (in-app games, custom apps)
  | 'timeline'   // Experience/career component
  | 'contact'    // Outlook-Express-style contact app
  | 'notepad'    // plaintext viewer (readme.txt)
  | 'imageview'  // image viewer
  | 'pdf'        // PDF viewer (résumé)
  | 'mycomputer' // flavor/system app
  | 'recyclebin';// flavor app

export type WindowDisplayState = 'normal' | 'minimized' | 'maximized';
export type SnapZone = 'left' | 'right' | 'top-max' | null; // desktop-only, no quarter-snaps in v1
export interface Rect { x: number; y: number; width: number; height: number; }

/** The ONE manifest. JSON files match this shape (minus `component`, which the
 *  componentMap supplies at runtime — see §0.4). */
export interface AppManifest {
  id: string;                     // unique kebab-case: 'resume', 'game1', 'proj-welcom-inn'
  title: string;                  // window title-bar + taskbar label
  kind: AppKind;
  icon: string;                   // '/os/icons/<id>.svg'
  category: 'games' | 'apps' | 'system';
  /** auto-flow grid position by `order` ONLY; `label` overrides the icon caption when the
   *  window title is too long for the grid (§7.10: "My Resume" vs "Dominik Machowiak - CV") */
  desktop?: { show: boolean; order?: number; label?: string };
  startMenu?: { show: boolean; group?: 'Programs' | 'Documents' | 'Games' | 'Places' };
  window: {
    width: number; height: number;               // default size (px, desktop)
    minWidth?: number; minHeight?: number;
    resizable?: boolean;                          // default true
    maximizable?: boolean;                        // default true
    singleton?: boolean;                          // focus existing instead of 2nd instance
    aspectRatio?: number;                         // games lock ratio (e.g. 4/3); letterbox rules §8.5
    maximizedOnMobile?: boolean;                  // default true
  };
  // exactly one payload field, by kind:
  content?: string;   // 'document'|'notepad': path to .md/.txt
  src?: string;       // 'iframe': same-origin path ('/game1/') or external URL; 'imageview'|'pdf': asset path
  /** 'folder': child app ids — or the sentinel 'auto:games', which FolderApp expands via
   *  byCategory('games') (§0.4 add-a-game truth; reconciles the §0.2 string[] with §0.4's sentinel). */
  children?: string[] | 'auto:games';
  data?: string;      // 'timeline'|'contact'|'mycomputer': path to JSON
  download?: { href: string; filename: string }; // 'pdf'|'document': adds Download button
  seo?: { heading: string; body: string };        // fed into #seo-resume (§11)
  external?: boolean;  // 'iframe' with an off-origin src → apply hardened sandbox + block-detection (§7.9)
}

/** Live instance of an open window. */
export interface WindowInstance {
  instanceId: string;         // uuid per open window
  appId: string;              // FK → AppManifest.id
  title: string;
  icon: string;
  rect: Rect;                 // normal-state geometry
  restoreRect: Rect | null;   // geometry to restore after max/snap
  z: number;
  state: WindowDisplayState;
  snap: SnapZone;
  createdAt: number;
  launchTrigger?: HTMLElement | null; // element to return focus to on close (a11y)
  props?: unknown;            // launch payload
}

/** The ONE props object every app component receives. */
export interface AppProps {
  manifest: AppManifest;
  windowId: string;           // = instanceId
  focused: boolean;
  close: () => void;
  setTitle: (t: string) => void;
  props?: unknown;
}

export type LazyApp = LazyExoticComponent<ComponentType<AppProps>>;

export interface DesktopIcon { appId: string; label: string; icon: string; }
export type DeviceMode = 'phone' | 'tablet' | 'desktop';
export type InputMode = 'touch' | 'pointer';
