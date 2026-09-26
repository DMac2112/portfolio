import { describe, expect, it, vi } from 'vitest';
import { closeOnBackdrop } from './backdrop.js';

function setup() {
  const handlers = {};
  const overlay = { addEventListener: (type, handler) => { handlers[type] = handler; } };
  const close = vi.fn();
  closeOnBackdrop(overlay, close);
  return { overlay, handlers, close };
}

describe('closeOnBackdrop', () => {
  it('closes on a backdrop press and click', () => {
    const { overlay, handlers, close } = setup();
    handlers.pointerdown({ target: overlay });
    handlers.click({ target: overlay });
    expect(close).toHaveBeenCalledOnce();
  });

  it('keeps the panel open when clicking a child', () => {
    const { handlers, close } = setup();
    const child = {};
    handlers.pointerdown({ target: child });
    handlers.click({ target: child });
    expect(close).not.toHaveBeenCalled();
  });

  it('keeps the panel open when a press begins inside and ends on the backdrop', () => {
    const { overlay, handlers, close } = setup();
    handlers.pointerdown({ target: {} });
    handlers.click({ target: overlay });
    expect(close).not.toHaveBeenCalled();
  });
});
