// content/caverns.js — save-resolved paired entrances for Hollowfrost Caverns (World Plan W6).
// Vesper's final hint opens both previously visible routes without mutating ROOM_REGISTRY.

const CAVERN_ENTRANCE_IDS = new Set(['door-cavern-crack', 'door-cavern-dumbwaiter']);

export function cavernsAreUnlocked(save) {
  return save?.secrets?.cavernsUnlocked === true;
}

export function resolveCavernEntrances(room, save) {
  if (!room) return null;
  const unlocked = cavernsAreUnlocked(save);
  return {
    ...room,
    doors: (room.doors ?? []).map((door) => CAVERN_ENTRANCE_IDS.has(door.id)
      ? { ...door, locked: !unlocked }
      : { ...door }),
    clickables: (room.clickables ?? []).map((prop) => prop.id === 'dumbwaiter-hatch'
      ? {
          ...prop,
          line: unlocked
            ? 'The dumbwaiter stands open. Crystal-blue air climbs from Hollowfrost below.'
            : prop.line,
        }
      : { ...prop }),
    cavernEntrancesUnlocked: unlocked,
  };
}
