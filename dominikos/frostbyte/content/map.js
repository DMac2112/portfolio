// Island map data — node positions and unlock state. No game/KAPLAY dependency.

export const MAP_BG = './assets/map-isle.png';

/**
 * @typedef {Object} MapNode
 * @property {string} roomId        // e.g. 'plaza', 'den', 'trail'
 * @property {string} label         // human-readable name, must match a plaza door label if locked
 * @property {number} x             // normalized 0..1 position over map width
 * @property {number} y             // normalized 0..1 position over map height
 * @property {boolean} unlocked     // whether the room is shipped; W3+ pins still require first walk-in
 */

/**
 * Island map nodes with geographic positions and unlock state.
 * x/y are normalized 0..1 coordinates over the map asset.
 * Labels on locked nodes MUST exactly match the corresponding plaza door labels.
 * @type {MapNode[]}
 */
export const MAP_NODES = [
  { roomId: 'plaza', label: 'Chillmere Plaza', x: 0.46, y: 0.40, unlocked: true },
  { roomId: 'den',   label: 'Your Den',        x: 0.62, y: 0.74, unlocked: true },
  { roomId: 'trail',     label: 'Frostline Trail',     x: 0.38, y: 0.12, unlocked: true },
  { roomId: 'court',     label: 'Glasswind Court',     x: 0.80, y: 0.38, unlocked: true },
  { roomId: 'workshop',  label: 'Emberlight Workshop', x: 0.14, y: 0.46, unlocked: true },
  { roomId: 'docks',     label: 'Driftgate Docks',      x: 0.63, y: 0.18, unlocked: true },
  { roomId: 'lighthouse-rest', label: 'Palefire Light',  x: 0.74, y: 0.08, unlocked: true },
];

/**
 * Find a map node by its roomId.
 * @param {string} roomId
 * @returns {MapNode|undefined}
 */
export const nodeByRoom = (roomId) => MAP_NODES.find(n => n.roomId === roomId);
