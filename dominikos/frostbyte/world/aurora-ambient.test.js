import { describe, expect, it } from 'vitest';
import { auroraRibbonState } from './aurora-ambient.js';

describe('isle-wide aurora payoff', () => {
  it('makes every ribbon materially brighter after Curio completion', () => {
    for (let index = 0; index < 3; index++) {
      expect(auroraRibbonState(index, 0, true).opacity)
        .toBeGreaterThan(auroraRibbonState(index, 0, false).opacity * 4);
    }
  });

  it('moves by scene time but stays fixed under reduced motion', () => {
    expect(auroraRibbonState(1, 0, true)).not.toEqual(auroraRibbonState(1, 10, true));
    expect(auroraRibbonState(1, 0, true, true)).toEqual(auroraRibbonState(1, 10, true, true));
  });
});
