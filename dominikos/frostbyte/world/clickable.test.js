import { describe, expect, it, vi } from 'vitest';
import { clickableAt, spawnClickables } from './clickable.js';

const props = [
  { id: 'wide', x: 100, y: 100, w: 80, h: 40 },
  { id: 'topmost', x: 110, y: 100, w: 20, h: 20 },
];

describe('clickableAt', () => {
  it('hits inclusive bounds and rejects points outside them', () => {
    expect(clickableAt(props, { x: 60, y: 80 }).id).toBe('wide');
    expect(clickableAt(props, { x: 59, y: 80 })).toBe(null);
  });

  it('returns the last declared prop when hitboxes overlap', () => {
    expect(clickableAt(props, { x: 105, y: 100 }).id).toBe('topmost');
  });

  it('defends missing inputs', () => {
    expect(clickableAt(null, { x: 0, y: 0 })).toBe(null);
    expect(clickableAt(props, null)).toBe(null);
  });
});

function fakeKaplay() {
  let mousePress = null;
  let sceneLeave = null;
  const pressController = { cancel: vi.fn() };
  const k = {
    Color: { fromHex: (value) => value },
    rect: () => ({}),
    pos: () => ({}),
    anchor: () => ({}),
    color: () => ({}),
    opacity: () => ({}),
    scale: () => ({}),
    z: () => ({}),
    add: () => ({ scale: { x: 1, y: 1 }, opacity: 1, onUpdate: vi.fn() }),
    destroy: vi.fn(),
    dt: () => 0.016,
    mousePos: () => ({ x: 100, y: 100 }),
    toWorld: (point) => point,
    onMousePress: vi.fn((handler) => { mousePress = handler; return pressController; }),
    onSceneLeave: vi.fn((handler) => { sceneLeave = handler; }),
    fireMouse: () => mousePress?.(),
    fireLeave: () => sceneLeave?.(),
    pressController,
  };
  return k;
}

describe('spawnClickables', () => {
  it('uses one mouse path, gates overlays, and stops after scene leave', () => {
    const k = fakeKaplay();
    const onReaction = vi.fn();
    const onCurio = vi.fn();
    let blocked = true;
    const controller = spawnClickables(k, {
      props: [{ id: 'prop', curioId: 'curio', x: 100, y: 100, w: 20, h: 20 }],
      anyOverlayOpen: () => blocked,
      onReaction,
      onCurio,
      reducedMotion: true,
    });

    expect(k.onMousePress).toHaveBeenCalledTimes(1);
    k.fireMouse();
    expect(onReaction).not.toHaveBeenCalled();
    blocked = false;
    k.fireMouse();
    expect(onReaction).toHaveBeenCalledTimes(1);
    expect(onCurio).toHaveBeenCalledWith('curio', expect.objectContaining({ id: 'prop' }));
    expect(controller.contains({ x: 100, y: 100 })).toBe(true);
    expect(controller.consumePress()).toBe(true);
    expect(controller.consumePress()).toBe(false);
    k.fireLeave();
    expect(k.pressController.cancel).toHaveBeenCalledTimes(1);
    expect(controller.trigger({ x: 100, y: 100 })).toBe(null);
  });
});
