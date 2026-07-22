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

/** Apply the saved first-walk discovery gate without mutating authored map content. */
export function discoveredTravelNode(node, visitedRooms) {
  if (!node) return null;
  const visited = Array.isArray(visitedRooms) && visitedRooms.includes(node.roomId);
  return { ...node, unlocked: Boolean(node.unlocked && visited) };
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

// Door coordinates sit on room edges. This radius matches the visible avatar/collider contact
// point, so walking into an unlocked doorway travels immediately instead of stopping for a click.
export const AUTO_DOOR_R = 56;

function outwardVectorForDoor(door, bounds, maxEdgeDist) {
  if (!door || !bounds) return null;
  const edges = [
    { distance: Math.abs(door.x - bounds.x0), x: -1, y: 0 },
    { distance: Math.abs(door.x - bounds.x1), x: 1, y: 0 },
    { distance: Math.abs(door.y - bounds.y0), x: 0, y: -1 },
    { distance: Math.abs(door.y - bounds.y1), x: 0, y: 1 },
  ];
  edges.sort((a, b) => a.distance - b.distance);
  return edges[0].distance <= maxEdgeDist ? edges[0] : null;
}

/**
 * Return the nearest unlocked edge door the player is physically walking into.
 * Moving past or away from a nearby door never triggers travel.
 * @param {{x:number,y:number}} pos
 * @param {{x:number,y:number}} movement
 * @param {Array<{x:number,y:number,locked:boolean}>} doors
 * @param {{x0:number,x1:number,y0:number,y1:number}} bounds
 * @param {number} [maxDist]
 * @returns {Object|null}
 */
export function findAutoEnterDoor(pos, movement, doors, bounds, maxDist = AUTO_DOOR_R) {
  if (!pos || !movement || !Array.isArray(doors) || !bounds) return null;
  if (Math.hypot(movement.x, movement.y) === 0) return null;

  let nearest = null;
  let nearestDist = Infinity;
  for (const door of doors) {
    if (door.locked) continue;
    const outward = outwardVectorForDoor(door, bounds, maxDist);
    if (!outward || movement.x * outward.x + movement.y * outward.y <= 0) continue;

    const dist = Math.hypot(door.x - pos.x, door.y - pos.y);
    if (dist <= maxDist && dist < nearestDist) {
      nearest = door;
      nearestDist = dist;
    }
  }
  return nearest;
}

/**
 * Validate that the world graph is well-formed and fully connected.
 * Returns an array of error strings (empty = valid).
 * Checks:
 * 1. Every unlocked map node has a roomId that exists in the registry.
 * 2. Every registry room has an unlocked door or a shipped map node.
 * 3. Every door with locked:false points to a room that exists in the registry.
 * 4. Every shipped map room is reachable through unlocked walkable doors from the first node.
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

  // Check 4: map travel unlocks only after first walk-in, so the authored door graph itself must
  // reach every shipped map room. This becomes meaningful with W3's first multi-hop branch.
  if (unlockedNodes.length > 0) {
    const startRoomId = unlockedNodes[0].roomId;
    const visited = new Set(registryRoomIds.has(startRoomId) ? [startRoomId] : []);
    const queue = [...visited];
    while (queue.length) {
      const roomId = queue.shift();
      for (const door of registry[roomId]?.doors ?? []) {
        if (door.locked || !registryRoomIds.has(door.targetRoom) || visited.has(door.targetRoom)) continue;
        visited.add(door.targetRoom);
        queue.push(door.targetRoom);
      }
    }
    for (const node of unlockedNodes) {
      if (registryRoomIds.has(node.roomId) && !visited.has(node.roomId)) {
        errors.push(`Unlocked room '${node.roomId}' is not walkable from '${startRoomId}'`);
      }
    }
  }

  return errors;
}
