/**
 * @typedef {Object} Persona
 * @property {string} id
 * @property {string} name
 * @property {string} homeRoomId
 * @property {number} speedMul          // multiplier on base waddle speed
 * @property {Record<string, number>} poolWeights  // linePoolId -> weight for weighted pick
 * @property {string[]} emoteIds        // subset of the emote catalog this persona plays
 * @property {string} paletteId         // fed to a future art-generation pass, not used by engine logic
 */

export const ROSTER = [
  { id: 'bramble', name: 'Bramble', homeRoomId: 'plaza', speedMul: 0.9, poolWeights: { AMBIENT: 2, MINIGAME_HYPE: 2, WEATHER: 1, COSMETIC_COMPLIMENT: 0 }, emoteIds: ['wave-flipper', 'sparkle-clap'], paletteId: 'rust' },
  { id: 'pip', name: 'Pip', homeRoomId: 'plaza', speedMul: 1.3, poolWeights: { AMBIENT: 2, MINIGAME_HYPE: 3, WEATHER: 0, COSMETIC_COMPLIMENT: 0 }, emoteIds: ['spin-hop', 'sparkle-clap'], paletteId: 'sunbeam' },
  { id: 'crinkle', name: 'Crinkle', homeRoomId: 'plaza', speedMul: 0.6, poolWeights: { AMBIENT: 1, MINIGAME_HYPE: 0, WEATHER: 3, COSMETIC_COMPLIMENT: 0 }, emoteIds: ['wave-flipper', 'shiver-giggle'], paletteId: 'slate' },
  { id: 'marzi', name: 'Marzipan', homeRoomId: 'plaza', speedMul: 1.0, poolWeights: { AMBIENT: 1, MINIGAME_HYPE: 0, WEATHER: 0, COSMETIC_COMPLIMENT: 3 }, emoteIds: ['sparkle-clap', 'wave-flipper'], paletteId: 'blush' },
  { id: 'blot', name: 'Blot', homeRoomId: 'plaza', speedMul: 0.8, poolWeights: { AMBIENT: 2, MINIGAME_HYPE: 0, WEATHER: 1, COSMETIC_COMPLIMENT: 0 }, emoteIds: ['shiver-giggle', 'snow-flump'], paletteId: 'moss' },
  { id: 'ferro', name: 'Ferro', homeRoomId: 'plaza', speedMul: 1.0, poolWeights: { AMBIENT: 1, MINIGAME_HYPE: 0, WEATHER: 0, COSMETIC_COMPLIMENT: 0 }, emoteIds: ['wave-flipper', 'snow-flump'], paletteId: 'iron' },
  { id: 'sable', name: 'Sable', homeRoomId: 'plaza', speedMul: 0.95, poolWeights: { AMBIENT: 2, MINIGAME_HYPE: 0, WEATHER: 0, COSMETIC_COMPLIMENT: 0 }, emoteIds: ['shiver-giggle', 'spin-hop'], paletteId: 'plum' },
  { id: 'chowder', name: 'Chowder', homeRoomId: 'cafe', speedMul: 1.0, poolWeights: { AMBIENT: 2, MINIGAME_HYPE: 0, WEATHER: 0, COSMETIC_COMPLIMENT: 0 }, emoteIds: ['sparkle-clap', 'wave-flipper'], paletteId: 'cocoa' },
  { id: 'dot', name: 'Dot', homeRoomId: 'plaza', speedMul: 0.85, poolWeights: { AMBIENT: 2, MINIGAME_HYPE: 0, WEATHER: 0, COSMETIC_COMPLIMENT: 0 }, emoteIds: ['wave-flipper', 'shiver-giggle'], paletteId: 'petal' },
];

/**
 * Retrieve a persona by ID
 * @param {string} id
 * @returns {Persona|null}
 */
export function personaById(id) {
  return ROSTER.find(p => p.id === id) ?? null;
}
