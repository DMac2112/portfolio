import { describe, expect, it } from 'vitest';
import {
  ANCHOR_SLOTS,
  characterById,
  defineCharacters,
  unfilledAnchorSlots,
  validateCharacters,
} from './characters.js';

const fixture = (overrides = {}) => ({
  id: 'fixture-anchor',
  name: 'Fixture Name',
  slotId: ANCHOR_SLOTS[0].id,
  portraitAsset: './assets/portraits/fixture.png',
  palette: { body: '#16283e', accent: '#ffb45e' },
  linePools: { greeting: ['Hello.'] },
  favorDefs: [],
  ...overrides,
});

describe('anchor character schema', () => {
  it('defines immutable records without coupling tests to shipped names', () => {
    const roster = defineCharacters([fixture()]);
    expect(characterById('fixture-anchor', roster)).toBe(roster[0]);
    expect(Object.isFrozen(roster)).toBe(true);
    expect(Object.isFrozen(roster[0].linePools.greeting)).toBe(true);
  });

  it('reports duplicate ids/slots and incomplete content', () => {
    const errors = validateCharacters([
      fixture(),
      fixture({ portraitAsset: '', linePools: { greeting: [] } }),
    ]);
    expect(errors).toContain('duplicate character id fixture-anchor');
    expect(errors).toContain(`duplicate character slot ${ANCHOR_SLOTS[0].id}`);
    expect(errors).toContain('fixture-anchor is missing portraitAsset');
    expect(errors).toContain('fixture-anchor has an empty line pool');
  });

  it('identifies the slots still waiting for approved content', () => {
    expect(unfilledAnchorSlots([fixture()])).toHaveLength(ANCHOR_SLOTS.length - 1);
  });
});
