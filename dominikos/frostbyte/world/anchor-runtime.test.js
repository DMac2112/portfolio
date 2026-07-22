import { describe, expect, it, vi } from 'vitest';
import { ANCHOR_CHARACTERS } from '../content/characters.js';
import { ROOM_REGISTRY } from '../content/rooms.js';
import { loadAnchorSprites, roomAnchorRecords } from './anchor-runtime.js';

describe('anchor runtime content binding', () => {
  it('resolves the Court placement to Edda’s custom sprite record', () => {
    const records = roomAnchorRecords(ROOM_REGISTRY.court, ANCHOR_CHARACTERS);
    expect(records).toHaveLength(1);
    expect(records[0].character).toMatchObject({
      id: 'edda-quill',
      name: 'Edda Quill',
      spriteKey: 'anchor-edda-quill',
    });
  });

  it('resolves the Workshop placement to Pat’s distinct puffin record', () => {
    const records = roomAnchorRecords(ROOM_REGISTRY.workshop, ANCHOR_CHARACTERS);
    expect(records).toHaveLength(1);
    expect(records[0].character).toMatchObject({
      id: 'pat-hocket',
      name: 'Pat Hocket',
      species: 'puffin',
      spriteKey: 'anchor-pat-hocket',
    });
  });

  it('loads only anchors whose rooms currently ship through W3', () => {
    const k = { loadSprite: vi.fn() };
    expect(loadAnchorSprites(k, ANCHOR_CHARACTERS, ROOM_REGISTRY)).toEqual([
      'anchor-edda-quill',
      'anchor-pat-hocket',
      'anchor-captain-salka',
    ]);
    expect(k.loadSprite).toHaveBeenCalledWith('anchor-edda-quill', './assets/characters/edda-quill.png');
    expect(k.loadSprite).toHaveBeenCalledWith('anchor-pat-hocket', './assets/characters/pat-hocket.png');
    expect(k.loadSprite).toHaveBeenCalledWith('anchor-captain-salka', './assets/characters/captain-salka.png');
  });
});
