import { describe, expect, it, vi } from 'vitest';
import { handleEscape } from './escape-key.js';

function setup({ key = 'Escape', full = false, minigame = false, open = [] } = {}) {
  const event = { key, preventDefault: vi.fn() };
  const doc = { fullscreenElement: full ? {} : null, exitFullscreen: vi.fn(() => Promise.resolve()) };
  const layers = open.map((isOpen) => ({ isOpen: () => isOpen, close: vi.fn() }));
  const result = handleEscape(event, { layers, inMinigame: minigame, doc });
  return { event, doc, layers, result };
}

describe('handleEscape', () => {
  it('closes only the first open layer and prevents the default', () => {
    const { event, doc, layers, result } = setup({ full: true, open: [false, true, true] });
    expect(result).toBe('closed');
    expect(layers[0].close).not.toHaveBeenCalled();
    expect(layers[1].close).toHaveBeenCalledOnce();
    expect(layers[2].close).not.toHaveBeenCalled();
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(doc.exitFullscreen).not.toHaveBeenCalled();
  });

  it('leaves minigame Esc to KAPLAY', () => {
    const { event, doc, result } = setup({ full: true, minigame: true });
    expect(result).toBe('minigame');
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(doc.exitFullscreen).not.toHaveBeenCalled();
  });

  it('exits full screen when no layer is open', () => {
    const { doc, result } = setup({ full: true });
    expect(result).toBe('exit-fullscreen');
    expect(doc.exitFullscreen).toHaveBeenCalledOnce();
  });

  it('does nothing when no layer or full screen is open', () => {
    const { doc, result } = setup();
    expect(result).toBe('none');
    expect(doc.exitFullscreen).not.toHaveBeenCalled();
  });

  it('ignores other keys', () => {
    const { event, doc, layers, result } = setup({ key: 'Enter', full: true, open: [true] });
    expect(result).toBe('none');
    expect(layers[0].close).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(doc.exitFullscreen).not.toHaveBeenCalled();
  });
});
