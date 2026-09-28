import { describe, it, expect } from 'vitest';
import { journalNotes } from './journal.js';

describe('journal notes', () => {
  it('shows held notes and hides the Moonwell until unlocked', () => {
    const save = { story: { notes: { bell: true } }, secrets: {} };
    expect(journalNotes(save)).toEqual([
      { id: 'bell', held: true, place: 'Emberlight Workshop' },
      { id: 'floe', held: false, place: 'Driftgate Docks' },
      { id: 'moon', held: false, place: '???' },
    ]);
    save.secrets.moonwellUnlocked = true;
    expect(journalNotes(save)[2].place).toBe('the Moonwell');
  });
});
