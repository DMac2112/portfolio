import { describe, it, expect } from 'vitest';
import { resolveLayers, syncFrame, bodyHexForId, SLOT_Z } from './avatar-layers.js';

describe('resolveLayers', () => {
  it('a bare avatar resolves to just body + belly, ascending z, body tinted', () => {
    const layers = resolveLayers({ bodyColorId: 'classic-charcoal', equipped: {} });
    expect(layers.map((l) => l.slot)).toEqual(['body', 'belly']);
    expect(layers[0].tint).toBe('#2b3346');
    expect(layers[1].tint).toBe(null);
    expect(layers[0].z).toBeLessThan(layers[1].z);
  });

  it('resolves body tint from the colour id, falling back for unknown ids', () => {
    expect(bodyHexForId('mint')).toBe('#a8dcc0');
    expect(bodyHexForId('does-not-exist')).toBe('#2b3346');
  });

  it('includes only equipped cosmetics, each with the right sprite key and z', () => {
    const layers = resolveLayers({
      bodyColorId: 'mint',
      equipped: { hat: 'snug-beanie', eyewear: null, neck: 'striped-scarf', held: null },
    });
    const bySlot = Object.fromEntries(layers.map((l) => [l.slot, l]));
    expect(Object.keys(bySlot).sort()).toEqual(['belly', 'body', 'hat', 'neck']);
    expect(bySlot.hat.spriteKey).toBe('hat-snug-beanie');
    expect(bySlot.neck.spriteKey).toBe('neck-striped-scarf');
    expect(bySlot.hat.z).toBe(SLOT_Z.hat);
    expect(bySlot.neck.z).toBe(SLOT_Z.neck);
  });

  it('returns layers sorted by ascending z (hat on top, neck under eyewear)', () => {
    const layers = resolveLayers({
      equipped: { hat: 'ice-crown', eyewear: 'goggles', neck: 'bandana', held: 'mini-flag' },
    });
    const zs = layers.map((l) => l.z);
    expect(zs).toEqual([...zs].sort((a, b) => a - b));
    expect(layers[layers.length - 1].slot).toBe('hat');
  });

  it('tolerates a missing cfg / equipped map without throwing', () => {
    expect(() => resolveLayers(undefined)).not.toThrow();
    expect(resolveLayers(undefined).map((l) => l.slot)).toEqual(['body', 'belly']);
  });
});

describe('syncFrame', () => {
  it('sets identical frame + flipX across every present part', () => {
    const parts = [{ frame: 0, flipX: false }, { frame: 0, flipX: false }, { frame: 0, flipX: false }];
    syncFrame(parts, 5, true);
    for (const p of parts) { expect(p.frame).toBe(5); expect(p.flipX).toBe(true); }
  });
  it('silently skips null / undefined slots', () => {
    const real = { frame: 0, flipX: false };
    expect(() => syncFrame([real, null, undefined], 7, false)).not.toThrow();
    expect(real.frame).toBe(7);
  });
});
