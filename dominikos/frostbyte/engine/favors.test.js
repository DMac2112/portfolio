import { describe, expect, it } from 'vitest';
import {
  FAVOR_STATUS,
  advanceFavor,
  canOfferFavor,
  currentFavorStep,
  favorProgress,
  offerFavor,
  startFavor,
  validateFavorDefinitions,
} from './favors.js';

const FAVOR = {
  id: 'fixture-delivery',
  steps: [
    { id: 'find-part', label: 'Find the missing part' },
    { id: 'return-part', label: 'Return the part' },
  ],
  reward: { coins: 12 },
};

const save = () => ({ coins: 5, favors: {} });

describe('favor lifecycle', () => {
  it('moves offered → in-progress → done in exact step order', () => {
    const s = save();
    const ev = [];
    expect(offerFavor(s, FAVOR, ev)).toBe(true);
    expect(s.favors[FAVOR.id].status).toBe(FAVOR_STATUS.OFFERED);
    expect(startFavor(s, FAVOR, ev)).toBe(true);
    expect(currentFavorStep(s, FAVOR).id).toBe('find-part');
    expect(advanceFavor(s, FAVOR, 'return-part', ev)).toBe(false);
    expect(advanceFavor(s, FAVOR, 'find-part', ev)).toBe(true);
    expect(currentFavorStep(s, FAVOR).id).toBe('return-part');
    expect(advanceFavor(s, FAVOR, 'return-part', ev)).toBe(true);
    expect(favorProgress(s, FAVOR)).toEqual({ status: 'done', completed: 2, total: 2, complete: true });
  });

  it('pays through economy events exactly once', () => {
    const s = save();
    const ev = [];
    offerFavor(s, FAVOR, ev);
    startFavor(s, FAVOR, ev);
    advanceFavor(s, FAVOR, 'find-part', ev);
    advanceFavor(s, FAVOR, 'return-part', ev);
    expect(s.coins).toBe(17);
    expect(ev).toContainEqual({ type: 'coins-earned', amount: 12, reason: 'favor:fixture-delivery' });
    expect(advanceFavor(s, FAVOR, 'return-part', ev)).toBe(false);
    expect(s.coins).toBe(17);
  });

  it('defensively creates save.favors for an old save', () => {
    const s = { coins: 0 };
    expect(offerFavor(s, FAVOR)).toBe(true);
    expect(s.favors[FAVOR.id].status).toBe('offered');
  });
});

describe('favor prerequisites', () => {
  it('offers a chained favor only after every required favor is done', () => {
    const chained = { ...FAVOR, id: 'fixture-followup', requires: ['fixture-delivery'] };
    const s = save();
    expect(canOfferFavor(s, chained)).toBe(false);
    s.favors['fixture-delivery'] = { status: FAVOR_STATUS.DONE, stepIndex: 2 };
    expect(canOfferFavor(s, chained)).toBe(true);
  });
});

describe('validateFavorDefinitions', () => {
  it('accepts the fixture and catches duplicate ids, empty chains, and negative rewards', () => {
    expect(validateFavorDefinitions([FAVOR])).toEqual([]);
    const errors = validateFavorDefinitions([
      FAVOR,
      { id: FAVOR.id, steps: [], reward: { coins: -1 } },
    ]);
    expect(errors).toContain(`duplicate favor id ${FAVOR.id}`);
    expect(errors).toContain(`${FAVOR.id} must have at least one step`);
    expect(errors).toContain(`${FAVOR.id} has a negative coin reward`);
  });
});
