import { describe, expect, it, vi } from 'vitest';
import { createFullscreenToggle, FULLSCREEN_LABELS } from './fullscreen-toggle.js';

function fakeTarget() {
  const handlers = {};
  return {
    handlers,
    addEventListener: vi.fn((type, fn) => { handlers[type] = fn; }),
    removeEventListener: vi.fn((type) => { delete handlers[type]; }),
    fire(type) { handlers[type]?.(); },
  };
}

function setup({ enabled = true, reducedMotion = false } = {}) {
  const doc = {
    ...fakeTarget(),
    fullscreenEnabled: enabled,
    fullscreenElement: null,
    exitFullscreen: vi.fn(() => { doc.fullscreenElement = null; doc.fire('fullscreenchange'); return Promise.resolve(); }),
  };
  const root = {
    requestFullscreen: vi.fn(() => { doc.fullscreenElement = root; doc.fire('fullscreenchange'); return Promise.resolve(); }),
  };
  const attrs = {};
  const button = {
    ...fakeTarget(),
    hidden: true,
    title: '',
    setAttribute: (k, v) => { attrs[k] = v; },
  };
  const classes = new Set();
  const frost = {
    offsetWidth: 0,
    classList: { add: (c) => classes.add(c), remove: (c) => classes.delete(c) },
  };
  const toggle = createFullscreenToggle({ doc, root, button, frost, reducedMotion });
  return { doc, root, button, attrs, classes, toggle };
}

describe('full-screen toggle', () => {
  it('shows the button and offers to enter full screen', () => {
    const { button, attrs } = setup();
    expect(button.hidden).toBe(false);
    expect(attrs['aria-pressed']).toBe('false');
    expect(attrs['aria-label']).toBe(FULLSCREEN_LABELS.enter);
    expect(button.title).toBe(FULLSCREEN_LABELS.enter);
  });

  it('hides the button where full screen is not allowed', () => {
    const { button, toggle } = setup({ enabled: false });
    expect(button.hidden).toBe(true);
    expect(toggle).toBeNull();
  });

  it('enters on click, hiding the browser UI, then exits on the next click', async () => {
    const { doc, root, button, attrs, classes } = setup();
    button.fire('click');
    expect(root.requestFullscreen).toHaveBeenCalledWith({ navigationUI: 'hide' });
    expect(attrs['aria-pressed']).toBe('true');
    expect(attrs['aria-label']).toBe(FULLSCREEN_LABELS.exit);
    expect(classes.has('clearing')).toBe(true);
    button.fire('click');
    expect(doc.exitFullscreen).toHaveBeenCalled();
    expect(attrs['aria-pressed']).toBe('false');
  });

  it('follows an Esc exit made outside the button', () => {
    const { doc, button, attrs } = setup();
    button.fire('click');
    doc.fullscreenElement = null;
    doc.fire('fullscreenchange');
    expect(attrs['aria-label']).toBe(FULLSCREEN_LABELS.enter);
  });

  it('skips the frost-pane animation for reduced motion', () => {
    const { button, classes } = setup({ reducedMotion: true });
    button.fire('click');
    expect(classes.has('clearing')).toBe(false);
  });

  it('swallows a refused request and stays windowed', async () => {
    const { root, toggle, attrs } = setup();
    root.requestFullscreen.mockImplementationOnce(() => Promise.reject(new Error('denied')));
    await expect(toggle.toggle()).resolves.toBeUndefined();
    expect(attrs['aria-pressed']).toBe('false');
  });
});
