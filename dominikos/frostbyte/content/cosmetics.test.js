import { describe, expect, it } from 'vitest';
import { ITEM_CATALOG, itemById } from './cosmetics.js';

describe('W6 cosmetic reward contract', () => {
  it('adds one non-purchasable held Echoglass Lantern with a unique id', () => {
    expect(itemById('echoglass-lantern')).toMatchObject({
      slot: 'held', label: 'Echoglass Lantern', rarity: 'epic', price: 0, rewardOnly: true,
    });
    expect(ITEM_CATALOG.filter((item) => item.id === 'echoglass-lantern')).toHaveLength(1);
    expect(new Set(ITEM_CATALOG.map((item) => item.id)).size).toBe(ITEM_CATALOG.length);
  });
});
