// build-room.js — IMPURE KAPLAY-side builder. Renders a content/rooms.js ROOM_REGISTRY entry
// into the current scene. The vignette has one room, but this stays parameterized (Engine &
// World Architecture §1) so a second room is a data addition, not a new scene function.
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
}
