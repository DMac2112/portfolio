// build-room.js — IMPURE KAPLAY-side builder. Renders a content/rooms.js ROOM_REGISTRY entry
// into the current scene. The vignette has one room, but this stays parameterized (Engine &
// World Architecture §1) so a second room is a data addition, not a new scene function.
import { TRACED_ART } from './ground/index.js';

const occluderSheet = (asset) => `occluders-${asset}`;

// Each traced backdrop's props (lamps, benches, fences...) cut out on one transparent sheet.
export function loadOccluders(k) {
  for (const [asset, art] of Object.entries(TRACED_ART)) {
    if (art.OCCLUDERS.length) k.loadSprite(occluderSheet(asset), `./assets/occluders/${asset}.png`);
  }
}

export function buildRoom(k, room) {
  k.add([
    k.sprite(room.mapAsset),
    k.pos(0, 0),
    // Backdrops are painted at the native world size (1440x960), so they render 1:1. This is
    // decoupled from room.scale (=3), which still upsizes the 16px code-drawn pixel sprites.
    // A room may override via bgScale if it ever ships a differently-sized backdrop.
    k.scale(room.bgScale ?? 1),
    k.z(-1000),
  ]);
  // The props' painted pixels again, y-sorted at their base: a penguin whose feet are above a
  // lamp's base is behind it, so the lamp is drawn over them (same z = y rule as the avatars).
  const art = TRACED_ART[room.mapAsset];
  if (!art?.OCCLUDERS.length) return;
  const map = { w: room.gridCols * room.tile * room.scale, h: room.gridRows * room.tile * room.scale };
  for (const [x, y, w, h, z] of art.OCCLUDERS) {
    k.add([
      k.sprite(occluderSheet(room.mapAsset), { quad: k.quad(x / map.w, y / map.h, w / map.w, h / map.h) }),
      k.pos(x, y),
      k.z(z),
    ]);
  }
}
