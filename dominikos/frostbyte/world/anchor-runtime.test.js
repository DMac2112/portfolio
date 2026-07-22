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

  it('loads only anchors whose rooms currently ship', () => {
    const k = { loadSprite: vi.fn() };
    expect(loadAnchorSprites(k, ANCHOR_CHARACTERS, ROOM_REGISTRY)).toEqual(['anchor-edda-quill']);
    expect(k.loadSprite).toHaveBeenCalledWith('anchor-edda-quill', './assets/characters/edda-quill.png');
  });
});
