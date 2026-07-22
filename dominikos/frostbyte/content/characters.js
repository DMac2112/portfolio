// content/characters.js — approved anchor-character contracts (World Plan W0/W1).
import { EDDA_STORY_TIP_FAVORS } from './favors.js';

export const ANCHOR_SLOTS = Object.freeze([
  Object.freeze({ id: 'court-editor', roomId: 'court', role: 'editor' }),
  Object.freeze({ id: 'workshop-tinkerer', roomId: 'workshop', role: 'tinkerer' }),
  Object.freeze({ id: 'docks-trader', roomId: 'docks', role: 'trader' }),
  Object.freeze({ id: 'lighthouse-keeper', roomId: 'lighthouse-rest', role: 'keeper' }),
  Object.freeze({ id: 'hollow-trickster', roomId: 'whisperpine', role: 'trickster' }),
  Object.freeze({ id: 'caverns-voice', roomId: 'caverns', role: 'voice' }),
]);

const EDDA_DAILY_GREETING = Object.freeze({
  daily: Object.freeze([
    'Tea warm, ink dry, and the whole isle refusing to stay quiet. Perfect.',
    'Every small sound is a possible headline. Most are also kettles.',
    'You look observant. That is the highest compliment this desk gives.',
  ]),
  salt: 'edda-greeting',
});

export const EDDA_DIALOGUE_TREE = Object.freeze({
  id: 'edda-court',
  start: 'greeting',
  nodes: Object.freeze({
    greeting: Object.freeze({
      pages: Object.freeze([EDDA_DAILY_GREETING]),
      choices: Object.freeze([
        Object.freeze({ id: 'ask-tip', label: 'Need a story tip?', next: 'offer-trail', when: Object.freeze({ favorId: 'edda-tip-trail-glint', status: null }) }),
        Object.freeze({ id: 'leave', label: 'I’ll keep looking around.', next: null }),
      ]),
    }),
    'greeting-offered': Object.freeze({
      pages: Object.freeze([EDDA_DAILY_GREETING]),
      choices: Object.freeze([
        Object.freeze({ id: 'accept-tip', label: 'I can follow that Trail lead.', next: 'accepted', effects: Object.freeze([{ type: 'favor-start', favorId: 'edda-tip-trail-glint' }]) }),
        Object.freeze({ id: 'leave', label: 'I’ll come back to that lead.', next: null }),
      ]),
    }),
    'greeting-progress': Object.freeze({
      pages: Object.freeze([EDDA_DAILY_GREETING]),
      choices: Object.freeze([
        Object.freeze({ id: 'remind-tip', label: 'What am I watching for?', next: 'reminder' }),
        Object.freeze({ id: 'leave', label: 'I’m still looking.', next: null }),
      ]),
    }),
    'greeting-done': Object.freeze({
      pages: Object.freeze([EDDA_DAILY_GREETING]),
      choices: Object.freeze([
        Object.freeze({ id: 'finished-tip', label: 'How did the story land?', next: 'finished' }),
        Object.freeze({ id: 'leave', label: 'I’ll keep looking around.', next: null }),
      ]),
    }),
    'offer-trail': Object.freeze({
      pages: Object.freeze([
        'Frostline Trail keeps flashing like it has something to say.',
        'Witness one of those glints, then bring me the detail everyone else missed.',
      ]),
      choices: Object.freeze([
        Object.freeze({
          id: 'take-tip', label: 'I’ll follow the glints.', next: 'accepted',
          effects: Object.freeze([
            { type: 'favor-offer', favorId: 'edda-tip-trail-glint' },
            { type: 'favor-start', favorId: 'edda-tip-trail-glint' },
          ]),
        }),
        Object.freeze({ id: 'later', label: 'Maybe after another lap of the Court.', next: null }),
      ]),
    }),
    accepted: Object.freeze({
      pages: Object.freeze(['Good. Watch the Trail, not your boots. The smallest flash may be the whole story.']),
    }),
    reminder: Object.freeze({
      pages: Object.freeze(['Catch one of the strange glints on Frostline Trail, then report back here.']),
    }),
    reported: Object.freeze({
      pages: Object.freeze(['A light that waits until someone notices it—yes, that earns a column. And your finder’s fee.']),
    }),
    finished: Object.freeze({
      pages: Object.freeze(['Front page of the little-news section. Around here, little news travels furthest.']),
    }),
  }),
});

export function validateCharacters(characters, slots = ANCHOR_SLOTS) {
  const errors = [];
  if (!Array.isArray(characters)) return ['characters must be an array'];
  const allowedSlots = new Map(slots.map((slot) => [slot.id, slot]));
  const ids = new Set();
  const usedSlots = new Set();

  for (const [index, character] of characters.entries()) {
    const key = character?.id ?? `character[${index}]`;
    const slot = allowedSlots.get(character?.slotId);
    if (!character?.id || typeof character.id !== 'string') errors.push(`${key} is missing id`);
    else if (ids.has(character.id)) errors.push(`duplicate character id ${character.id}`);
    else ids.add(character.id);
    if (!character?.name || typeof character.name !== 'string') errors.push(`${key} is missing name`);
    if (!slot) errors.push(`${key} uses unknown slot ${character?.slotId ?? ''}`);
    else if (usedSlots.has(character.slotId)) errors.push(`duplicate character slot ${character.slotId}`);
    else usedSlots.add(character.slotId);
    if (!character?.roomId || character.roomId !== slot?.roomId) errors.push(`${key} roomId does not match its slot`);
    if (!character?.species || typeof character.species !== 'string') errors.push(`${key} is missing species`);
    if (character?.slotId === 'caverns-voice') {
      if (character.portraitAsset != null && typeof character.portraitAsset !== 'string') {
        errors.push(`${key} has an invalid portraitAsset`);
      }
    } else if (!character?.portraitAsset || typeof character.portraitAsset !== 'string') {
      errors.push(`${key} is missing portraitAsset`);
    }
    if (character?.spriteAsset != null && typeof character.spriteAsset !== 'string') errors.push(`${key} has an invalid spriteAsset`);
    if (!character?.palette || typeof character.palette !== 'object') errors.push(`${key} is missing palette`);
    if (!character?.linePools || typeof character.linePools !== 'object' || Array.isArray(character.linePools)) {
      errors.push(`${key} is missing linePools`);
    } else if (Object.values(character.linePools).some((pool) => !Array.isArray(pool) || pool.length === 0)) {
      errors.push(`${key} has an empty line pool`);
    }
    if (!Array.isArray(character?.favorDefs)) errors.push(`${key} favorDefs must be an array`);
  }
  return errors;
}

export function defineCharacters(characters, slots = ANCHOR_SLOTS) {
  const errors = validateCharacters(characters, slots);
  if (errors.length) throw new TypeError(errors.join('; '));
  return Object.freeze(characters.map((character) => Object.freeze({
    ...character,
    palette: Object.freeze({ ...character.palette }),
    linePools: Object.freeze(Object.fromEntries(
      Object.entries(character.linePools).map(([id, lines]) => [id, Object.freeze([...lines])]),
    )),
    favorDefs: Object.freeze([...character.favorDefs]),
  })));
}

export const ANCHOR_CHARACTERS = defineCharacters([
  {
    id: 'edda-quill', name: 'Edda Quill', slotId: 'court-editor', roomId: 'court',
    subtitle: 'Editor, The Chillmere Chirper',
    species: 'emperor penguin', portraitAsset: './assets/portraits/edda-quill.png',
    spriteAsset: './assets/characters/edda-quill.png', spriteKey: 'anchor-edda-quill',
    palette: { body: '#26384b', accent: '#a78bfa', warm: '#ffb45e' },
    linePools: { greeting: ['Tea warm, ink dry, and the whole isle refusing to stay quiet. Perfect.'] },
    favorDefs: EDDA_STORY_TIP_FAVORS,
    dialogueTree: EDDA_DIALOGUE_TREE,
  },
  {
    id: 'pat-hocket', name: 'Pat Hocket', slotId: 'workshop-tinkerer', roomId: 'workshop',
    species: 'puffin', portraitAsset: './assets/portraits/pat-hocket.png',
    spriteAsset: './assets/characters/pat-hocket.png', spriteKey: 'anchor-pat-hocket',
    palette: { body: '#24384a', accent: '#ffb45e', warm: '#ff784f' },
    linePools: { greeting: ['If it clicks twice, duck once. That is the current rule.'] }, favorDefs: [],
  },
  {
    id: 'captain-salka', name: 'Captain Salka', slotId: 'docks-trader', roomId: 'docks',
    species: 'chinstrap penguin', portraitAsset: './assets/portraits/captain-salka.png',
    spriteAsset: './assets/characters/captain-salka.png', spriteKey: 'anchor-captain-salka',
    palette: { body: '#334a58', accent: '#6b4a33', warm: '#ffb45e' },
    linePools: { greeting: ['Cargo first, gossip second. Unless the gossip is perishable.'] }, favorDefs: [],
  },
  {
    id: 'old-maren', name: 'Old Maren', slotId: 'lighthouse-keeper', roomId: 'lighthouse-rest',
    species: 'gentoo penguin', portraitAsset: './assets/portraits/old-maren.png',
    spriteAsset: './assets/characters/old-maren.png', spriteKey: 'anchor-old-maren',
    palette: { body: '#435669', accent: '#cfe0f2', warm: '#ffb45e' },
    linePools: { greeting: ['The light sees far. A keeper learns to listen farther.'] }, favorDefs: [],
  },
  {
    id: 'vesper', name: 'Vesper', slotId: 'hollow-trickster', roomId: 'whisperpine',
    species: 'arctic fox', portraitAsset: './assets/portraits/vesper.png',
    spriteAsset: './assets/characters/vesper.png', spriteKey: 'anchor-vesper',
    palette: { body: '#edf5fb', accent: '#6fe0b2', warm: '#a78bfa' },
    linePools: { greeting: ['You found this den. I never said it was mine.'] }, favorDefs: [],
  },
  {
    id: 'the-echo', name: 'The Echo', slotId: 'caverns-voice', roomId: 'caverns',
    species: 'unseen presence', portraitAsset: null, spriteAsset: null,
    palette: { body: '#7fd6ff', accent: '#6fe0b2', warm: '#cfe0f2' },
    linePools: { greeting: ['A note returns differently after someone hears it.'] }, favorDefs: [],
  },
]);

export function characterById(id, characters = ANCHOR_CHARACTERS) {
  return characters.find((character) => character.id === id) ?? null;
}

export function characterByRoom(roomId, characters = ANCHOR_CHARACTERS) {
  return characters.find((character) => character.roomId === roomId) ?? null;
}

export function unfilledAnchorSlots(characters = ANCHOR_CHARACTERS, slots = ANCHOR_SLOTS) {
  const filled = new Set(characters.map((character) => character.slotId));
  return slots.filter((slot) => !filled.has(slot.id));
}
