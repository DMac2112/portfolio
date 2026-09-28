import { describe, it, expect } from 'vitest';
import { minigameActionForHotspot, grantMinigameResultNote } from './minigames-registry.js';

describe('story minigame contract', () => {
  it('keeps Bell lore until Pat\'s favor is done', () => {
    const save = { favors: {} };
    expect(minigameActionForHotspot('weather-bell', save, 'landmark')).toBe('landmark');
    save.favors['pat-weather-bell-parts'] = { status: 'done' };
    expect(minigameActionForHotspot('weather-bell', save, 'landmark')).toBe('minigame');
  });
  it('grants a won note once, regardless of coin credit', () => {
    const save = {};
    const result = { gameId: 'bell', won: true };
    expect(grantMinigameResultNote(save, result)).toEqual({ note: 'bell', count: 1 });
    expect(grantMinigameResultNote(save, result)).toBeNull();
    expect(grantMinigameResultNote(save, { gameId: 'bell', won: false })).toBeNull();
  });
});
