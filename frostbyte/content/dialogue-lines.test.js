import { describe, it, expect } from 'vitest';
import { LINE_POOLS, EMOTES, linePoolIds, emoteById } from './dialogue-lines.js';

describe('dialogue-lines', () => {
  describe('LINE_POOLS', () => {
    it('every pool is a non-empty array', () => {
      for (const [poolName, lines] of Object.entries(LINE_POOLS)) {
        expect(Array.isArray(lines), `${poolName} should be an array`).toBe(true);
        expect(lines.length > 0, `${poolName} should not be empty`).toBe(true);
      }
    });

    it('every line has a non-empty string id, text, and positive durMs', () => {
      for (const [poolName, lines] of Object.entries(LINE_POOLS)) {
        for (const line of lines) {
          expect(typeof line.id === 'string' && line.id.length > 0, `${poolName}: id should be non-empty string`).toBe(true);
          expect(typeof line.text === 'string' && line.text.length > 0, `${poolName}: text should be non-empty string`).toBe(true);
          expect(typeof line.durMs === 'number' && line.durMs > 0, `${poolName}: durMs should be positive number`).toBe(true);
        }
      }
    });

    it('no two lines share the same id across all pools', () => {
      const allIds = new Set();
      for (const lines of Object.values(LINE_POOLS)) {
        for (const line of lines) {
          expect(allIds.has(line.id), `Duplicate id found: ${line.id}`).toBe(false);
          allIds.add(line.id);
        }
      }
    });
  });

  describe('EMOTES', () => {
    it('every emote has a unique id and positive durMs', () => {
      const seenIds = new Set();
      for (const emote of EMOTES) {
        expect(typeof emote.id === 'string' && emote.id.length > 0, `emote id should be non-empty string`).toBe(true);
        expect(typeof emote.durMs === 'number' && emote.durMs > 0, `emote durMs should be positive number`).toBe(true);
        expect(seenIds.has(emote.id), `Duplicate emote id found: ${emote.id}`).toBe(false);
        seenIds.add(emote.id);
      }
    });
  });

  describe('Helper functions', () => {
    it('linePoolIds returns array of pool keys', () => {
      const ids = linePoolIds();
      expect(Array.isArray(ids)).toBe(true);
      expect(ids).toEqual(Object.keys(LINE_POOLS));
    });

    it('emoteById returns emote when found', () => {
      const emote = emoteById('wave-flipper');
      expect(emote).not.toBe(null);
      expect(emote.id).toBe('wave-flipper');
      expect(emote.durMs).toBe(900);
    });

    it('emoteById returns null when not found', () => {
      const emote = emoteById('nonexistent-emote');
      expect(emote).toBe(null);
    });
  });
});
