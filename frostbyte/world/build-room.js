// build-room.js — IMPURE KAPLAY-side builder. Renders a content/rooms.js ROOM_REGISTRY entry
// into the current scene. The vignette has one room, but this stays parameterized (Engine &
// World Architecture §1) so a second room is a data addition, not a new scene function.
export function buildRoom(k, room) {
  k.add([
    k.sprite(room.mapAsset),
    k.pos(0, 0),
    k.scale(room.scale),
    k.z(-1000),
  ]);
}
