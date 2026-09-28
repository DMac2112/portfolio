// Persistent story milestones, independent of scene and storage adapters.
export const NOTE_IDS = ['bell', 'floe', 'moon'];

export function storyOf(save) {
  const current = save.story && typeof save.story === 'object' && !Array.isArray(save.story)
    ? save.story : {};
  save.story = {
    introSeen: false, notes: {}, echoGreeted: false, finaleSeen: false,
    ...current,
    notes: current.notes && typeof current.notes === 'object' && !Array.isArray(current.notes)
      ? current.notes : {},
  };
  return save.story;
}

export function hasNote(save, id) {
  return NOTE_IDS.includes(id) && storyOf(save).notes[id] === true;
}

export function grantNote(save, id) {
  if (!NOTE_IDS.includes(id) || hasNote(save, id)) return false;
  storyOf(save).notes[id] = true;
  return true;
}

export function notesHeld(save) {
  return NOTE_IDS.filter((id) => hasNote(save, id)).length;
}

export function finaleReady(save) {
  return notesHeld(save) === NOTE_IDS.length && !storyOf(save).finaleSeen;
}
