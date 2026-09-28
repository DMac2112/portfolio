import { describe, it, expect } from 'vitest';
import { followStep, sniff, validPet, PET_COATS, PET_SCARVES } from './pet.js';
import { ROOM_REGISTRY } from '../content/rooms.js';
import { ANCHOR_CHARACTERS } from '../content/characters.js';

describe('snowtail follow trail', () => {
  it('stays behind along a corner, never taking a diagonal shortcut', () => {
    const trail = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }];
    expect(followStep(trail, 50)).toEqual({ x: 100, y: 50 });
    expect(followStep(trail, 150)).toEqual({ x: 50, y: 0 });
    expect(followStep(trail, 250)).toEqual({ x: 0, y: 0 });
    expect(followStep(trail, 0)).toEqual({ x: 100, y: 100 });
  });
  it('handles an empty or stationary trail', () => {
    expect(followStep([], 40)).toBe(null);
    expect(followStep([{ x: 3, y: 4 }], 40)).toEqual({ x: 3, y: 4 });
  });
});

describe('snowtail curiosity', () => {
  const curios = [
    { curioId: 'far', x: 55, y: 0 },
    { curioId: 'near', x: 10, y: 0 },
    { curioId: 'outside', x: 120, y: 0 },
  ];
  it('selects the nearest eligible curio within radius', () => {
    expect(sniff({ x: 0, y: 0 }, curios, {}, new Set(), 60)).toBe('near');
    expect(sniff({ x: 0, y: 0 }, curios, { near: true }, new Set(), 60)).toBe('far');
  });
  it('only returns a curio once per room visit', () => {
    const sniffed = new Set(['near']);
    expect(sniff({ x: 0, y: 0 }, curios, {}, sniffed, 60)).toBe('far');
    sniffed.add('far');
    expect(sniff({ x: 0, y: 0 }, curios, {}, sniffed, 60)).toBe(null);
  });
});

describe('adoption contract', () => {
  it('has four coats and six scarf colours, accepting only valid names', () => {
    expect(Object.keys(PET_COATS)).toEqual(['snow', 'frost', 'soot', 'fox']);
    expect(Object.keys(PET_SCARVES)).toHaveLength(6);
    expect(validPet({ coat: 'snow', scarf: 'moss', name: 'Snow-Tuft', adoptedOn: '2026-09-29' })).toBe(true);
    expect(validPet({ coat: 'snow', scarf: 'moss', name: 'Pip!', adoptedOn: '2026-09-29' })).toBe(false);
  });
  it('places a reachable adoption prompt in the pen and keeps Wren in the room', () => {
    const room = ROOM_REGISTRY.petshop;
    expect(room.hotspots.find((spot) => spot.id === 'snowtail-pen')).toMatchObject({ kind: 'pet', label: 'Meet the snowtails' });
    expect(room.anchors.some((anchor) => anchor.characterId === 'wren')).toBe(true);
    expect(ANCHOR_CHARACTERS.find((character) => character.id === 'wren').linePools.greeting[0]).toContain('Pick one from the straw');
  });
});
