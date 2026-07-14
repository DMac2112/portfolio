// Pure travel rules — no game/KAPLAY dependency, no Date.now or Math.random.

/**
 * @typedef {Object} TravelGuards
 * @property {boolean} frozen       // player frozen (e.g. in cutscene)
 * @property {boolean} inMinigame   // player in active minigame
 * @property {string} currentRoomId // room player is in now
 */

/**
 * @typedef {Object} TravelResult
 * @property {boolean} ok     // true if travel allowed
 * @property {string|null} reason  // null if ok=true; otherwise one of: 'frozen', 'minigame', 'locked', 'already-here', 'unknown'
 */

/**
 * @typedef {Object} MapNode
 * @property {string} roomId
 * @property {string} label
 * @property {number} x
 * @property {number} y
 * @property {boolean} unlocked
 */

/**
 * Check whether travel to a map node is allowed given current game state.
 * Returns { ok: true } on success, or { ok: false, reason } on rejection.
 * Rejection rules (checked in order):
 * 1. No such node → 'unknown'
 * 2. Node locked → 'locked'
 * 3. Player frozen → 'frozen'
 * 4. Player in minigame → 'minigame'
 * 5. Already at node → 'already-here'
 * Otherwise → { ok: true, reason: null }
 * @param {TravelGuards} guards
 * @param {MapNode} node
 * @returns {TravelResult}
 */
export function canTravel(guards, node) {
  // No such node
  if (!node) {
    return { ok: false, reason: 'unknown' };
  }

  // Node locked
  if (!node.unlocked) {
    return { ok: false, reason: 'locked' };
  }

  // Player frozen
  if (guards.frozen) {
    return { ok: false, reason: 'frozen' };
  }

  // Player in minigame
  if (guards.inMinigame) {
    return { ok: false, reason: 'minigame' };
  }

  // Already at destination
  if (node.roomId === guards.currentRoomId) {
    return { ok: false, reason: 'already-here' };
  }

  // Travel allowed
  return { ok: true, reason: null };
}

/**
 * Filter nodes to only unlocked ones.
 * @param {MapNode[]} nodes
 * @returns {MapNode[]}
 */
export function travelTargets(nodes) {
  return nodes.filter(n => n.unlocked);
}

/**
 * Generate spawn point ID for arriving in a room from a specific source.
 * Capitalizes the first letter of sourceRoomId and prepends 'from'.
 * Examples:
 *   'plaza' → 'fromPlaza'
 *   'den' → 'fromDen'
 *   null/undefined → 'fromMap' (coming from the island map overlay)
 * @param {string|null|undefined} sourceRoomId
 * @returns {string}
 */
export function arriveSpawnId(sourceRoomId) {
  if (!sourceRoomId) {
    return 'fromMap';
  }
  const capitalized = sourceRoomId.charAt(0).toUpperCase() + sourceRoomId.slice(1);
  return `from${capitalized}`;
}

/**
 * Validate that the world graph is well-formed and fully connected.
 * Returns an array of error strings (empty = valid).
 * Checks:
 * 1. Every unlocked map node has a roomId that exists in the registry.
 * 2. Every unlocked room in registry has at least one unlocked door OR is reachable via the map
 *    (since the map connects all unlocked nodes, just verify each unlocked room exists).
 * 3. Every door with locked:false points to a room that exists in the registry.
 * @param {MapNode[]} nodes       // all map nodes
 * @param {Object} registry       // room registry (rooms by roomId)
 * @returns {string[]}            // array of error strings
 */
export function validateWorldGraph(nodes, registry) {
  const errors = [];

  // Build set of registry room IDs for quick lookup
  const registryRoomIds = new Set(Object.keys(registry));

  // Check 1: every unlocked node must exist in registry
  const unlockedNodes = nodes.filter(n => n.unlocked);
  for (const node of unlockedNodes) {
    if (!registryRoomIds.has(node.roomId)) {
      errors.push(`Unlocked map node '${node.roomId}' does not exist in room registry`);
    }
  }

  // Check 2: every room reachable from the map (i.e., every unlocked room in registry that is also
  // on the map) must exist in registry (already done via check 1)
  // Additionally, every unlocked room must have either: an unlocked door, or be on the map.
  for (const roomId of registryRoomIds) {
    const room = registry[roomId];
    const isOnMap = unlockedNodes.some(n => n.roomId === roomId);
    const hasUnlockedDoor = room.doors && room.doors.some(d => !d.locked);

    if (!isOnMap && !hasUnlockedDoor) {
      errors.push(`Room '${roomId}' is unreachable: not on map and has no unlocked doors`);
    }
  }

  // Check 3: every unlocked door points to an existing room
  for (const roomId of registryRoomIds) {
    const room = registry[roomId];
    if (room.doors) {
      for (const door of room.doors) {
        if (!door.locked && !registryRoomIds.has(door.targetRoom)) {
          errors.push(`Door '${door.id}' in room '${roomId}' targets non-existent room '${door.targetRoom}'`);
        }
      }
    }
  }

  return errors;
}
