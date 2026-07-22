import { describe, expect, it } from 'vitest';
import { validateDialogueTree } from '../engine/dialogue-tree.js';
import {
  ANCHOR_CHARACTERS,
  ANCHOR_SLOTS,
  EDDA_DIALOGUE_TREE,
  MAREN_DIALOGUE_TREE,
  PAT_DIALOGUE_TREE,
  SALKA_DIALOGUE_TREE,
  characterById,
  characterByRoom,
  defineCharacters,
  unfilledAnchorSlots,
  validateCharacters,
} from './characters.js';

const fixture = (overrides = {}) => ({
  id: 'fixture-anchor',
  name: 'Fixture Name',
  slotId: ANCHOR_SLOTS[0].id,
  roomId: ANCHOR_SLOTS[0].roomId,
  species: 'fixture species',
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

describe('approved anchor contracts', () => {
  it('locks the exact approved six names in area order', () => {
    expect(ANCHOR_CHARACTERS.map((character) => character.name)).toEqual([
      'Edda Quill',
      'Pat Hocket',
      'Captain Salka',
      'Old Maren',
      'Vesper',
      'The Echo',
    ]);
  });

  it('fills every anchor slot and resolves the shipped W1-W4 anchors', () => {
    expect(validateCharacters(ANCHOR_CHARACTERS)).toEqual([]);
    expect(validateDialogueTree(EDDA_DIALOGUE_TREE)).toEqual([]);
    expect(validateDialogueTree(PAT_DIALOGUE_TREE)).toEqual([]);
    expect(validateDialogueTree(SALKA_DIALOGUE_TREE)).toEqual([]);
    expect(validateDialogueTree(MAREN_DIALOGUE_TREE)).toEqual([]);
    expect(unfilledAnchorSlots()).toEqual([]);
    expect(characterByRoom('court')).toBe(characterById('edda-quill'));
    expect(characterByRoom('workshop')).toMatchObject({
      id: 'pat-hocket',
      name: 'Pat Hocket',
      favorDefs: [expect.objectContaining({ id: 'pat-weather-bell-parts' })],
    });
    expect(characterByRoom('docks')).toMatchObject({
      id: 'captain-salka', name: 'Captain Salka', dialogueTree: SALKA_DIALOGUE_TREE,
    });
    expect(characterByRoom('lighthouse-rest')).toMatchObject({
      id: 'old-maren', name: 'Old Maren', dialogueTree: MAREN_DIALOGUE_TREE,
      favorDefs: expect.arrayContaining([expect.objectContaining({ id: 'maren-sighting-gull' })]),
    });
    expect(characterById('the-echo')).toMatchObject({ portraitAsset: null, spriteAsset: null });
  });
});
