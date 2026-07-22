// P0 DoD: store unit-tested (open/focus/close/z-order) — DOMINIKOS-PLAN §13.
// Runs in a node environment (no DOM); the store guards all document/localStorage access.
import { beforeEach, describe, expect, it } from 'vitest';
import { useOSStore, WINDOW_CAP } from './osStore';

const S = () => useOSStore.getState();

beforeEach(() => {
  useOSStore.setState({ windows: {}, order: [], focusedId: null, nextZ: 1, windowCount: 0 });
});

describe('open', () => {
  it('opens a window, focuses it, and registers z-order', () => {
    const id = S().open('notepad');
    expect(id).toBeTruthy();
    expect(S().order).toEqual([id]);
    expect(S().focusedId).toBe(id);
    expect(S().windows[id!].title).toBe('readme.txt - Notepad');
    expect(S().windows[id!].state).toBe('normal');
  });

  it('returns null for an unknown app id', () => {
    expect(S().open('does-not-exist')).toBeNull();
  });

  it('cascades subsequent windows and stacks z upward', () => {
    const a = S().open('notepad')!;
    const b = S().open('about')!;
    expect(S().order).toEqual([a, b]);
    expect(S().windows[b].z).toBeGreaterThan(S().windows[a].z);
    expect(S().focusedId).toBe(b);
    expect(S().windows[a].rect).not.toEqual(S().windows[b].rect);
  });

  it('singleton apps focus the existing instance instead of opening a second', () => {
    const a = S().open('game1')!;
    S().open('notepad');
    const again = S().open('game1');
    expect(again).toBe(a);
    expect(S().order.filter((i) => S().windows[i].appId === 'game1')).toHaveLength(1);
    expect(S().focusedId).toBe(a);
    expect(S().order[S().order.length - 1]).toBe(a);
  });

  it('un-minimizes a minimized singleton on re-open', () => {
    const a = S().open('game1')!;
    S().setState(a, 'minimized');
    expect(S().windows[a].state).toBe('minimized');
    S().open('game1');
    expect(S().windows[a].state).toBe('normal');
  });
});

describe('focus / z-order', () => {
  it('re-focusing moves the window to the top of the order', () => {
    const a = S().open('notepad')!;
    const b = S().open('about')!;
    const c = S().open('skills')!;
    S().focus(a);
    expect(S().order).toEqual([b, c, a]);
    expect(S().focusedId).toBe(a);
    expect(S().windows[a].z).toBeGreaterThan(S().windows[c].z);
    expect(S().topWindow()?.instanceId).toBe(a);
    expect(S().zOrder()).toEqual([b, c, a]);
  });
});

describe('close', () => {
  it('removes the window and focuses the next top-most', () => {
    const a = S().open('notepad')!;
    const b = S().open('about')!;
    S().close(b);
    expect(S().windows[b]).toBeUndefined();
    expect(S().order).toEqual([a]);
    expect(S().focusedId).toBe(a);
  });

  it('skips minimized windows when re-assigning focus', () => {
    const a = S().open('notepad')!;
    const b = S().open('about')!;
    const c = S().open('skills')!;
    S().setState(b, 'minimized');
    S().close(c);
    expect(S().focusedId).toBe(a);
  });

  it('closing the last window leaves nothing focused', () => {
    const a = S().open('notepad')!;
    S().close(a);
    expect(S().focusedId).toBeNull();
    expect(S().order).toEqual([]);
  });
});

describe('min / max / restore / snap', () => {
  it('maximize saves restoreRect; restore returns to it', () => {
    const a = S().open('notepad')!;
    const before = { ...S().windows[a].rect };
    S().setState(a, 'maximized');
    expect(S().windows[a].state).toBe('maximized');
    expect(S().windows[a].restoreRect).toEqual(before);
    S().setState(a, 'normal');
    expect(S().windows[a].state).toBe('normal');
    expect(S().windows[a].rect).toEqual(before);
  });

  it('minimize keeps the window in order but shifts focus away', () => {
    const a = S().open('notepad')!;
    const b = S().open('about')!;
    S().setState(b, 'minimized');
    expect(S().order).toContain(b);
    expect(S().focusedId).toBe(a);
    expect(S().topWindow()?.instanceId).toBe(a);
  });

  it('snap left fills the left half of the workspace and restores on un-snap', () => {
    const a = S().open('notepad')!;
    const before = { ...S().windows[a].rect };
    S().snap(a, 'left');
    expect(S().windows[a].snap).toBe('left');
    expect(S().windows[a].rect.x).toBe(0);
    S().snap(a, null);
    expect(S().windows[a].snap).toBeNull();
    expect(S().windows[a].rect).toEqual(before);
  });

  it('snap top-max maximizes', () => {
    const a = S().open('notepad')!;
    S().snap(a, 'top-max');
    expect(S().windows[a].state).toBe('maximized');
  });
});

describe('window cap (§9.3, desktop LRU)', () => {
  it('evicts the least-recently-focused non-game window at the cap', () => {
    const first = S().open('notepad')!;
    const game = S().open('game1')!;
    for (let i = 2; i < WINDOW_CAP; i++) S().open('notepad');
    expect(S().order).toHaveLength(WINDOW_CAP);
    S().focus(game); // game becomes most-recent; `first` is now LRU non-game after it
    S().open('about');
    expect(S().order).toHaveLength(WINDOW_CAP);
    expect(S().windows[first]).toBeUndefined(); // LRU non-game evicted
    expect(S().windows[game]).toBeDefined();    // games are never evicted
  });
});

describe('retitle / closeAll', () => {
  it('retitle updates the live title', () => {
    const a = S().open('notepad')!;
    S().retitle(a, 'notes.txt - Notepad');
    expect(S().title(a)).toBe('notes.txt - Notepad');
  });

  it('closeAll wipes the session', () => {
    S().open('notepad');
    S().open('about');
    S().closeAll();
    expect(S().order).toEqual([]);
    expect(S().focusedId).toBeNull();
  });
});
