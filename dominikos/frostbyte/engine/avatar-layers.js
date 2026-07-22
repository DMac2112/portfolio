// engine/avatar-layers.js — PURE cosmetic-layer resolution (Avatar §1, §4). Given an avatar
// config, returns the ordered stack of sprite layers (which sprite key, draw order z, tint hex)
// that the impure world/build-avatar.js composites into KAPLAY game objects. No KAPLAY, no DOM.
import { BODY_COLORS, ITEM_CATALOG } from '../content/cosmetics.js';

const DEFAULT_BODY_HEX = BODY_COLORS[0]?.hex ?? '#2b3346';

export function bodyHexForId(id) {
  return BODY_COLORS.find((c) => c.id === id)?.hex ?? DEFAULT_BODY_HEX;
}
function itemTintForId(id) {
  return ITEM_CATALOG.find((i) => i.id === id)?.tint ?? null;
}

// Bottom-to-top; body(0) and belly(1) are always present, cosmetics only if equipped.
export const SLOT_Z = { body: 0, belly: 1, neck: 2, eyewear: 3, held: 4, hat: 5 };
const COSMETIC_SLOTS = ['neck', 'eyewear', 'held', 'hat'];

/**
 * @param {{bodyColorId?: string, equipped?: Record<string,string|null>}} cfg
 * @returns {Array<{slot:string, spriteKey:string, z:number, tint:string|null}>} ascending z
 */
export function resolveLayers(cfg) {
  const equipped = cfg?.equipped ?? {};
  const layers = [
    { slot: 'body', spriteKey: 'penguin-body', z: SLOT_Z.body, tint: bodyHexForId(cfg?.bodyColorId) },
    { slot: 'belly', spriteKey: 'penguin-belly', z: SLOT_Z.belly, tint: null },
  ];
  for (const slot of COSMETIC_SLOTS) {
    const id = equipped[slot];
    if (id) layers.push({ slot, spriteKey: `${slot}-${id}`, z: SLOT_Z[slot], tint: itemTintForId(id) });
  }
  return layers.sort((a, b) => a.z - b.z);
}

// Keeps every layer's frame/flip in lockstep. Skips null/undefined parts (unequipped slots).
// `parts` are opaque objects with mutable `frame`/`flipX` (real KAPLAY objects at runtime,
// plain objects in tests) — this function never touches KAPLAY.
export function syncFrame(parts, frameIdx, flipX) {
  for (const p of parts) {
    if (!p) continue;
    p.frame = frameIdx;
    p.flipX = flipX;
  }
  return parts;
}
