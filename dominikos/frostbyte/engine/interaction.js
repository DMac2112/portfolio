// Pure interaction module — nearest interactable picker. No game/KAPLAY dependency.

export const INTERACT_R = 168; // default interaction radius, world px
export const AUTO_VENUE_R = 20;
export const AUTO_VENUE_RESET_R = 72;

/**
 * @typedef {Object} Interactable
 * @property {string} id
 * @property {{x:number,y:number}} pos
 * @property {string} kind   // e.g. 'landmark' | 'shop' | 'minigame' | 'noticeboard' | 'sit' | 'door' | 'npc'
 */

/**
 * Returns the single closest Interactable to `pos` whose distance is strictly less than `maxDist`,
 * or `null` if none qualify (including when `candidates` is empty).
 * Ties (exactly equal distance) are broken deterministically: the earlier entry in the `candidates`
 * array wins — i.e. only replace the current best when a candidate is STRICTLY closer than it, never
 * on equal distance.
 *
 * `opts.isActionable` (default: everything is actionable, preserving pre-H1 behavior) filters
 * candidates BEFORE the nearest computation — this is the nearest-ACTIONABLE fix (Home Plan §8.2):
 * a non-actionable candidate (e.g. an NPC with no interact action) that happens to be closer than an
 * actionable one (a shop/minigame/door) must never shadow it and suppress the interact prompt.
 * @param {{x:number,y:number}} pos
 * @param {Interactable[]} candidates
 * @param {number} [maxDist]
 * @param {{isActionable?: (candidate: Interactable) => boolean}} [opts]
 * @returns {Interactable|null}
 */
export function findNearestInteractable(pos, candidates, maxDist = INTERACT_R, opts = {}) {
  const { isActionable = () => true } = opts;
  let nearest = null;
  let nearestDist = maxDist;

  for (const candidate of candidates) {
    if (!isActionable(candidate)) continue; // skip non-actionable candidates before distance ever matters

    const dx = candidate.pos.x - pos.x;
    const dy = candidate.pos.y - pos.y;
    const dist = Math.hypot(dx, dy);

    // Only replace if STRICTLY closer (ties go to first candidate)
    if (dist < nearestDist) {
      nearest = candidate;
      nearestDist = dist;
    }
  }

  return nearest;
}

const ENTRY_VECTORS = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
};

/**
 * Return the nearest venue doorway touched while moving in its declared entry direction.
 * @param {{x:number,y:number}} pos
 * @param {{x:number,y:number}} movement
 * @param {Interactable[]} candidates
 * @param {number} [maxDist]
 * @returns {Interactable|null}
 */
export function findAutoEnterVenue(pos, movement, candidates, maxDist = AUTO_VENUE_R) {
  if (!pos || !movement || !Array.isArray(candidates)) return null;
  if (Math.hypot(movement.x, movement.y) === 0) return null;

  let nearest = null;
  let nearestDist = Infinity;
  for (const candidate of candidates) {
    const entry = candidate.kind === 'venue' && ENTRY_VECTORS[candidate.entryDirection];
    if (!entry || movement.x * entry.x + movement.y * entry.y <= 0) continue;
    const dist = Math.hypot(candidate.pos.x - pos.x, candidate.pos.y - pos.y);
    if (dist <= maxDist && dist < nearestDist) {
      nearest = candidate;
      nearestDist = dist;
    }
  }
  return nearest;
}

/**
 * Merges a static hotspots array (Interactable-shaped, kind != 'npc') with a live NPCs array
 * (each {id, pos, ...anything}) into one flat Interactable[] list, tagging every NPC entry with kind:'npc'.
 * @param {Interactable[]} hotspots
 * @param {{id:string, pos:{x:number,y:number}}[]} npcs
 * @returns {Interactable[]}
 */
export function mergeInteractables(hotspots, npcs) {
  return [...hotspots, ...npcs.map((n) => ({ id: n.id, pos: n.pos, kind: 'npc' }))];
}
