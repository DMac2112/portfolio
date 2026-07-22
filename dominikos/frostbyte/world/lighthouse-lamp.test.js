import { describe, expect, it, vi } from 'vitest';
import { addLighthouseSweep, lighthouseSweepAngle } from './lighthouse-lamp.js';

function fakeKaplay() {
  let update = null;
  const beam = { angle: 0, onUpdate: vi.fn((handler) => { update = handler; }) };
  return {
    rect: vi.fn(() => ({})), pos: vi.fn(() => ({})), anchor: vi.fn(() => ({})),
    rotate: vi.fn((angle) => ({ angle })), color: vi.fn(() => ({})), opacity: vi.fn(() => ({})),
    z: vi.fn(() => ({})), Color: { fromHex: (value) => value }, add: vi.fn(() => beam),
    dt: () => 0.05, beam, tick: () => update?.(),
  };
}

describe('Palefire lamp sweep', () => {
  it('stays within its authored slow balcony arc', () => {
    const angles = Array.from({ length: 200 }, (_, i) => lighthouseSweepAngle(i / 10));
    expect(Math.min(...angles)).toBeGreaterThanOrEqual(-42);
    expect(Math.max(...angles)).toBeLessThanOrEqual(6);
  });

  it('animates only in the gallery and honors reduced motion', () => {
    const moving = fakeKaplay();
    expect(addLighthouseSweep(moving, { id: 'lighthouse-gallery' }, false)).toBe(moving.beam);
    expect(moving.beam.onUpdate).toHaveBeenCalledTimes(1);
    const before = moving.beam.angle;
    moving.tick();
    expect(moving.beam.angle).not.toBe(before);

    const still = fakeKaplay();
    addLighthouseSweep(still, { id: 'lighthouse-gallery' }, true);
    expect(still.beam.onUpdate).not.toHaveBeenCalled();
    expect(addLighthouseSweep(still, { id: 'docks' }, false)).toBeNull();
  });
});
