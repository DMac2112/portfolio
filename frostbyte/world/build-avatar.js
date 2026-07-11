// world/build-avatar.js — IMPURE KAPLAY compositor for the layered penguin (Avatar §1).
// Pure layer resolution lives in engine/avatar-layers.js; this only turns that ordered list into
// child game objects and recolours them. NPCs will reuse makeAvatarActor() with a seeded cfg.
import { resolveLayers } from '../engine/avatar-layers.js';
import { ITEM_CATALOG } from '../content/cosmetics.js';

// Load body + belly + every cosmetic sheet once, all on the shared 4x3 / 16px grid so one frame
// index drives every layer in lockstep (Avatar §2). Frames are set manually via syncFrame(),
// so no anim table is needed.
export function loadAvatarSprites(k) {
  k.loadSprite('penguin-body', './assets/penguin-body.png', { sliceX: 4, sliceY: 3 });
  k.loadSprite('penguin-belly', './assets/penguin-belly.png', { sliceX: 4, sliceY: 3 });
  for (const item of ITEM_CATALOG) {
    k.loadSprite(`${item.slot}-${item.id}`, `./assets/cosmetics/${item.slot}-${item.id}.png`, { sliceX: 4, sliceY: 3 });
  }
}

/**
 * Composites an avatar at world `pos`. Returns { root, parts, apply } — `root` is the movable
 * game object (drive its pos like S1's player), `parts` are the layer sprites (feed to syncFrame),
 * `apply(cfg)` rebuilds the layer stack when equipment/colour changes.
 */
export function makeAvatarActor(k, cfg, pos, scale) {
  const root = k.add([k.pos(pos.x, pos.y), k.z(pos.y), 'avatar']);
  let parts = [];

  function apply(nextCfg) {
    for (const p of parts) k.destroy(p);
    parts = resolveLayers(nextCfg).map((L) => {
      const comps = [k.sprite(L.spriteKey), k.anchor('bot'), k.scale(scale), k.z(L.z)];
      if (L.tint) comps.push(k.color(k.Color.fromHex(L.tint)));
      return root.add(comps);
    });
  }

  apply(cfg);
  return {
    root,
    get parts() { return parts; },
    apply,
  };
}
