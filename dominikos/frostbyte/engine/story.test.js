import { describe, it, expect } from 'vitest';
import { DEFAULT_SAVE, migrateSave } from './save.js';
import { NOTE_IDS, storyOf, hasNote, grantNote, notesHeld, finaleReady } from './story.js';

describe('story milestones', () => {
  it('creates defaults on an old save', () => {
    const save = {};
    expect(storyOf(save)).toEqual({ introSeen: false, notes: {}, echoGreeted: false, finaleSeen: false });
    expect(save.story).toEqual(storyOf(save));
  });

  it('grants each known note once and ignores unknown notes', () => {
    const save = DEFAULT_SAVE();
    expect(NOTE_IDS).toEqual(['bell', 'floe', 'moon']);
    expect(grantNote(save, 'bell')).toBe(true);
    expect(grantNote(save, 'bell')).toBe(false);
    expect(grantNote(save, 'other')).toBe(false);
    expect(hasNote(save, 'bell')).toBe(true);
    expect(hasNote(save, 'other')).toBe(false);
    expect(notesHeld(save)).toBe(1);
  });

  it('is ready only with all three notes and before the finale', () => {
    const save = DEFAULT_SAVE();
    expect(finaleReady(save)).toBe(false);
    for (const id of NOTE_IDS) grantNote(save, id);
    expect(finaleReady(save)).toBe(true);
    save.story.finaleSeen = true;
    expect(finaleReady(save)).toBe(false);
  });

  it('preserves story state and skips the arrival for returning curio owners', () => {
    const saved = migrateSave({
      story: { notes: { bell: true }, echoGreeted: true },
      curios: { found: { 'first-curio': true } },
    });
    expect(saved.story).toMatchObject({ notes: { bell: true }, echoGreeted: true, introSeen: true });
    expect(migrateSave({ favors: { 'first-favor': { status: 'done' } } }).story.introSeen).toBe(true);
  });
});
