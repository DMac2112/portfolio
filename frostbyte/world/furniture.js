// world/furniture.js — renders save.home.placed into the den (IMPURE KAPLAY glue, H2).
// Pure placement rules live in engine/home-editor.js; this layer only mirrors state to sprites.
import { FURNITURE_CATALOG, furnitureById, spritePathFor } from '../content/furniture-catalog.js';

export function loadFurnitureSprites(k) {
  for (const item of FURNITURE_CATALOG) k.loadSprite(`furn-${item.id}`, spritePathFor(item.id));
}

// Builds the furniture layer for the current scene; sync() rebuilds sprites from home.placed
// (called after every editor action — placed counts are ≤30, so a full rebuild stays cheap).
// Rugs lie flat above the floor art but below every actor; other furniture y-sorts like the player.
export function initFurnitureLayer(k, home, scale) {
  let objs = [];
  function sync() {
    for (const o of objs) k.destroy(o);
    objs = [];
    home.placed.forEach((p, i) => {
      const item = furnitureById(p.id);
      if (!item) return; // unknown id in an old save — skip, never crash
      const obj = k.add([
        k.sprite(`furn-${p.id}`),
        k.pos(p.x, p.y),
        k.anchor('center'),
        k.scale(scale),
        k.z(item.cls === 'rugs' ? 10 + i : p.y),
        'furniture',
      ]);
      obj.flipX = !!p.flip;
      objs.push(obj);
    });
  }
  sync();
  return { sync };
}
