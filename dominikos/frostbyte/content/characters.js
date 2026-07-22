// content/characters.js — anchor-character data contract (World Plan W0).
// The six display names are deliberately NOT present yet. Once approved they become shipped/tested
// content contracts; until then the stable structure is built around area/role slots only.

export const ANCHOR_SLOTS = Object.freeze([
  Object.freeze({ id: 'court-editor', roomId: 'court', role: 'editor' }),
  Object.freeze({ id: 'workshop-tinkerer', roomId: 'workshop', role: 'tinkerer' }),
  Object.freeze({ id: 'docks-trader', roomId: 'docks', role: 'trader' }),
  Object.freeze({ id: 'lighthouse-keeper', roomId: 'lighthouse-rest', role: 'keeper' }),
  Object.freeze({ id: 'hollow-trickster', roomId: 'whisperpine', role: 'trickster' }),
  Object.freeze({ id: 'caverns-voice', roomId: 'caverns', role: 'voice' }),
]);

// Name-approval gate: populate through defineCharacters() only after Dominik signs off.
export const ANCHOR_CHARACTERS = Object.freeze([]);

export function validateCharacters(characters, slots = ANCHOR_SLOTS) {
  const errors = [];
  if (!Array.isArray(characters)) return ['characters must be an array'];
  const allowedSlots = new Map(slots.map((slot) => [slot.id, slot]));
  const ids = new Set();
  const usedSlots = new Set();

  for (const [index, character] of characters.entries()) {
    const key = character?.id ?? `character[${index}]`;
    if (!character?.id || typeof character.id !== 'string') errors.push(`${key} is missing id`);
    else if (ids.has(character.id)) errors.push(`duplicate character id ${character.id}`);
    else ids.add(character.id);
    if (!character?.name || typeof character.name !== 'string') errors.push(`${key} is missing name`);
    if (!allowedSlots.has(character?.slotId)) errors.push(`${key} uses unknown slot ${character?.slotId ?? ''}`);
    else if (usedSlots.has(character.slotId)) errors.push(`duplicate character slot ${character.slotId}`);
    else usedSlots.add(character.slotId);
    if (!character?.portraitAsset || typeof character.portraitAsset !== 'string') errors.push(`${key} is missing portraitAsset`);
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

export function characterById(id, characters = ANCHOR_CHARACTERS) {
  return characters.find((character) => character.id === id) ?? null;
}

export function unfilledAnchorSlots(characters = ANCHOR_CHARACTERS, slots = ANCHOR_SLOTS) {
  const filled = new Set(characters.map((character) => character.slotId));
  return slots.filter((slot) => !filled.has(slot.id));
}
