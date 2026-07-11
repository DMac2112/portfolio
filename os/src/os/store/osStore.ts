// The ONE window store (DOMINIKOS-PLAN §0.3). Zustand: hook selectors for React AND a
// .getState() imperative facade (back-stack, Alt+Tab, drag commit). There is NO separate
// `windowManager` object — there is useOSStore + useOSStore.getState().
import { create } from 'zustand';
import type { AppManifest, Rect, SnapZone, WindowDisplayState, WindowInstance } from '../types';
import { byId } from '../registry';
import { getWorkspace, isFreeFloat } from '../env';

/** Desktop hard cap (§9.3). Phone/tablet single-window mode never evicts. */
export const WINDOW_CAP = 12;

export interface OpenOptions {
  maximized?: boolean;
  props?: unknown;
  trigger?: HTMLElement;
  /** internal: session rehydrate (§0.6) restores saved geometry */
  rect?: Rect;
}

export interface OSStore {
  windows: Record<string, WindowInstance>;
  order: string[];               // z-order, last = top-most
  focusedId: string | null;
  nextZ: number;
  windowCount: number;           // total ever opened (drives cascade offset)

  open: (appId: string, opts?: OpenOptions) => string | null;
  close: (instanceId: string) => void;
  focus: (instanceId: string) => void;
  move: (instanceId: string, x: number, y: number) => void;       // commit-on-drop only (§4.3)
  resize: (instanceId: string, w: number, h: number) => void;
  setState: (instanceId: string, s: WindowDisplayState) => void;  // min/max/restore
  snap: (instanceId: string, zone: SnapZone) => void;
  topWindow: () => WindowInstance | null;
  zOrder: () => string[];        // bottom→top
  title: (instanceId: string) => string;

  /** implements AppProps.setTitle */
  retitle: (instanceId: string, title: string) => void;
  /** log-off / shutdown teardown */
  closeAll: () => void;
}

let seq = 0;
const uid = () => `win-${(++seq).toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/** Announce via the aria-live region (§11.1). No-op headless (unit tests). */
function announce(msg: string): void {
  if (typeof document === 'undefined') return;
  const live = document.getElementById('os-announce');
  if (live) live.textContent = msg;
}

/** Return DOM focus to the launch trigger on close (a11y, §0.3). */
function refocus(el: HTMLElement | null | undefined): void {
  if (!el) return;
  try {
    el.focus();
  } catch {
    /* trigger detached — nothing to do */
  }
}

function cascadeRect(m: AppManifest, n: number): Rect {
  const ws = getWorkspace();
  const width = Math.min(m.window.width, Math.max(240, ws.width - 16));
  const height = Math.min(m.window.height, Math.max(180, ws.height - 16));
  const step = (n % 8) * 26;
  return {
    x: Math.max(4, Math.min(56 + step, ws.width - width - 4)),
    y: Math.max(4, Math.min(32 + step, ws.height - height - 4)),
    width,
    height,
  };
}

export const useOSStore = create<OSStore>((set, get) => ({
  windows: {},
  order: [],
  focusedId: null,
  nextZ: 1,
  windowCount: 0,

  open: (appId, opts) => {
    const m = byId(appId);
    if (!m) return null;
    const s = get();

    // singleton → focus (and un-minimize) the existing instance (§0.3)
    if (m.window.singleton) {
      const existing = s.order.find((id) => s.windows[id].appId === appId);
      if (existing) {
        if (s.windows[existing].state === 'minimized') get().setState(existing, 'normal');
        get().focus(existing);
        return existing;
      }
    }

    const free = isFreeFloat();

    // window cap (§9.6/§9.3): desktop LRU-closes the least-recently-focused non-game window;
    // on phone/tablet the cap does not evict (single-window model keeps all mounted+hidden).
    if (free && s.order.length >= WINDOW_CAP) {
      const victim = s.order.find((id) => byId(s.windows[id].appId)?.category !== 'games');
      if (victim) get().close(victim);
    }

    // on phone/tablet, force maximized (§0.3)
    const maximized = !free || !!opts?.maximized;
    const rect = opts?.rect ?? cascadeRect(m, get().windowCount);
    const id = uid();
    const win: WindowInstance = {
      instanceId: id,
      appId,
      title: m.title,
      icon: m.icon,
      rect,
      restoreRect: maximized ? { ...rect } : null,
      z: get().nextZ,
      state: maximized ? 'maximized' : 'normal',
      snap: null,
      createdAt: Date.now(),
      launchTrigger: opts?.trigger ?? null,
      props: opts?.props,
    };
    set((st) => ({
      windows: { ...st.windows, [id]: win },
      order: [...st.order, id],
      focusedId: id,
      nextZ: st.nextZ + 1,
      windowCount: st.windowCount + 1,
    }));
    announce(`${m.title} opened`);
    return id;
  },

  close: (instanceId) => {
    const w = get().windows[instanceId];
    if (!w) return;
    const trigger = w.launchTrigger;
    set((st) => {
      const windows = { ...st.windows };
      delete windows[instanceId];
      const order = st.order.filter((i) => i !== instanceId);
      let focusedId = st.focusedId;
      if (focusedId === instanceId) {
        focusedId =
          [...order].reverse().find((i) => windows[i].state !== 'minimized') ?? null;
      }
      return { windows, order, focusedId };
    });
    announce(`${w.title} closed`);
    refocus(trigger);
  },

  focus: (instanceId) => {
    const s = get();
    const w = s.windows[instanceId];
    if (!w) return;
    if (s.focusedId === instanceId && s.order[s.order.length - 1] === instanceId) return;
    set((st) => ({
      order: [...st.order.filter((i) => i !== instanceId), instanceId],
      windows: { ...st.windows, [instanceId]: { ...st.windows[instanceId], z: st.nextZ } },
      nextZ: st.nextZ + 1,
      focusedId: instanceId,
    }));
    announce(`${w.title} window`);
  },

  move: (instanceId, x, y) => {
    const w = get().windows[instanceId];
    if (!w) return;
    set((st) => ({
      windows: {
        ...st.windows,
        [instanceId]: { ...w, rect: { ...w.rect, x, y }, snap: null },
      },
    }));
  },

  resize: (instanceId, width, height) => {
    const w = get().windows[instanceId];
    if (!w) return;
    const m = byId(w.appId);
    const minW = m?.window.minWidth ?? 240;
    const minH = m?.window.minHeight ?? 160;
    set((st) => ({
      windows: {
        ...st.windows,
        [instanceId]: {
          ...w,
          rect: { ...w.rect, width: Math.max(minW, width), height: Math.max(minH, height) },
        },
      },
    }));
  },

  setState: (instanceId, next) => {
    const w = get().windows[instanceId];
    if (!w) return;
    if (next === 'maximized') {
      set((st) => ({
        windows: {
          ...st.windows,
          [instanceId]: {
            ...w,
            restoreRect: w.state === 'normal' && !w.snap ? { ...w.rect } : w.restoreRect,
            state: 'maximized',
            snap: null,
          },
        },
      }));
      announce(`${w.title} maximized`);
    } else if (next === 'minimized') {
      set((st) => {
        const windows = {
          ...st.windows,
          [instanceId]: { ...w, state: 'minimized' as WindowDisplayState },
        };
        let focusedId = st.focusedId;
        if (focusedId === instanceId) {
          focusedId =
            [...st.order].reverse().find((i) => i !== instanceId && windows[i].state !== 'minimized') ??
            null;
        }
        return { windows, focusedId };
      });
      announce(`${w.title} minimized`);
    } else {
      // restore to normal
      const rect = w.restoreRect ?? w.rect;
      set((st) => ({
        windows: {
          ...st.windows,
          [instanceId]: { ...w, rect: { ...rect }, restoreRect: null, state: 'normal', snap: null },
        },
      }));
      get().focus(instanceId);
      announce(`${w.title} restored`);
    }
  },

  snap: (instanceId, zone) => {
    if (zone === 'top-max') {
      get().setState(instanceId, 'maximized');
      return;
    }
    if (!zone) {
      get().setState(instanceId, 'normal');
      return;
    }
    const w = get().windows[instanceId];
    if (!w) return;
    const ws = getWorkspace();
    const half: Rect = {
      x: zone === 'left' ? 0 : Math.floor(ws.width / 2),
      y: 0,
      width: Math.ceil(ws.width / 2),
      height: ws.height,
    };
    set((st) => ({
      windows: {
        ...st.windows,
        [instanceId]: {
          ...w,
          restoreRect: w.state === 'normal' && !w.snap ? { ...w.rect } : w.restoreRect,
          rect: half,
          snap: zone,
          state: 'normal',
        },
      },
    }));
    announce(`${w.title} snapped ${zone}`);
  },

  topWindow: () => {
    const s = get();
    const top = [...s.order].reverse().find((i) => s.windows[i].state !== 'minimized');
    return top ? s.windows[top] : null;
  },

  zOrder: () => [...get().order],

  title: (instanceId) => get().windows[instanceId]?.title ?? '',

  retitle: (instanceId, title) => {
    const w = get().windows[instanceId];
    if (!w || w.title === title) return;
    set((st) => ({ windows: { ...st.windows, [instanceId]: { ...w, title } } }));
  },

  closeAll: () => {
    set({ windows: {}, order: [], focusedId: null });
  },
}));
