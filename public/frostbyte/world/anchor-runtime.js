// world/anchor-runtime.js — hand-placed named-character actors (World Plan W1).
// Anchors are room data + custom one-off sprites, never roaming-persona reskins.

export function roomAnchorRecords(room, characters) {
  const byId = new Map(characters.map((character) => [character.id, character]));
  return (room?.anchors ?? [])
    .map((placement) => ({ placement, character: byId.get(placement.characterId) }))
    .filter((record) => record.character?.spriteAsset && record.character?.spriteKey);
}

export function loadAnchorSprites(k, characters, roomRegistry) {
  const loaded = [];
  for (const character of characters) {
    if (!roomRegistry[character.roomId] || !character.spriteAsset || !character.spriteKey) continue;
    k.loadSprite(character.spriteKey, character.spriteAsset);
    loaded.push(character.spriteKey);
  }
  return loaded;
}

export function spawnRoomAnchors(k, room, characters, reducedMotion = false) {
  const actors = [];
  const interactables = [];
  for (const { placement, character } of roomAnchorRecords(room, characters)) {
    const shadow = k.add([
      k.rect(18 * room.scale, 5 * room.scale, { radius: 6 * room.scale }),
      k.pos(placement.x, placement.y - 2), k.anchor('center'),
      k.color(k.Color.fromHex('#091827')), k.opacity(0.3), k.z(placement.y - 1),
    ]);
    const actor = k.add([
      k.sprite(character.spriteKey), k.pos(placement.x, placement.y), k.anchor('bot'),
      k.scale(room.scale), k.z(placement.y), 'anchor-character',
    ]);
    let elapsed = 0;
    actor.onUpdate(() => {
      if (reducedMotion) return;
      elapsed += Math.min(k.dt(), 0.05);
      actor.scale.y = room.scale * (1 + Math.sin(elapsed * 2.2) * 0.012);
    });
    actors.push({ actor, shadow, character });
    interactables.push({
      id: character.id,
      pos: { x: placement.x, y: placement.y },
      kind: 'character',
      label: character.name,
      character,
    });
  }
  return { actors, interactables };
}
