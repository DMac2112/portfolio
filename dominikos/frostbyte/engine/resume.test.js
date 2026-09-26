import { describe, expect, it } from 'vitest';
import { resumeTarget, snapshotPos, movedEnough } from './resume.js';

describe('resumeTarget', () => {
  const registry = { plaza: {}, den: {} };

  it('falls back to plaza for an unknown or missing room', () => {
    expect(resumeTarget({ prefs: { lastRoom: 'missing' } }, registry)).toEqual({ roomId: 'plaza', pos: null });
    expect(resumeTarget({ prefs: {} }, registry)).toEqual({ roomId: 'plaza', pos: null });
  });

  it('ignores a position from another room', () => {
    const save = { prefs: { lastRoom: 'den', lastPos: { roomId: 'plaza', x: 10, y: 20, facing: 'up' } } };
    expect(resumeTarget(save, registry)).toEqual({ roomId: 'den', pos: null });
  });

  it('ignores non-finite coordinates', () => {
    for (const bad of [NaN, Infinity, -Infinity, '12']) {
      const save = { prefs: { lastRoom: 'den', lastPos: { roomId: 'den', x: bad, y: 20 } } };
      expect(resumeTarget(save, registry).pos).toBeNull();
      save.prefs.lastPos = { roomId: 'den', x: 10, y: bad };
      expect(resumeTarget(save, registry).pos).toBeNull();
    }
  });

  it('returns a valid saved position', () => {
    const pos = { roomId: 'den', x: 10, y: 20, facing: 'right' };
    expect(resumeTarget({ prefs: { lastRoom: 'den', lastPos: pos } }, registry)).toEqual({ roomId: 'den', pos });
  });
});

describe('snapshotPos', () => {
  it('rounds coordinates and keeps the room and facing', () => {
    expect(snapshotPos('den', { x: 10.6, y: -2.4 }, 'left'))
      .toEqual({ roomId: 'den', x: 11, y: -2, facing: 'left' });
  });
});

describe('movedEnough', () => {
  it('uses the minimum distance, including the threshold', () => {
    expect(movedEnough({ x: 0, y: 0 }, null)).toBe(true);
    expect(movedEnough({ x: 3, y: 0 }, { x: 0, y: 0 })).toBe(false);
    expect(movedEnough({ x: 4, y: 0 }, { x: 0, y: 0 })).toBe(true);
    expect(movedEnough({ x: 2, y: 0 }, { x: 0, y: 0 }, 2)).toBe(true);
  });
});
