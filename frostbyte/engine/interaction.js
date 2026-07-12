// Pure interaction module — nearest interactable picker. No game/KAPLAY dependency.

export const INTERACT_R = 168; // default interaction radius, world px

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
 * @param {{x:number,y:number}} pos
 * @param {Interactable[]} candidates
 * @param {number} [maxDist]
 * @returns {Interactable|null}
 */
export function findNearestInteractable(pos, candidates, maxDist = INTERACT_R) {
  let nearest = null;
  let nearestDist = maxDist;

  for (const candidate of candidates) {
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
