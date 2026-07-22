// content/whisperpine.js — date/save-resolved room content for Whisperpine Hollow (World Plan W5).
import { vesperDenForDate } from '../engine/vesper.js';

export function resolveWhisperpineRoom(room, todayKey, save) {
  if (!room) return null;
  const den = vesperDenForDate(room.vesperDens, todayKey);
  const moonwellUnlocked = save?.secrets?.moonwellUnlocked === true;
  return {
    ...room,
    doors: (room.doors ?? []).map((door) => door.id === 'door-moonwell'
      ? { ...door, locked: !moonwellUnlocked, hidden: !moonwellUnlocked }
      : { ...door }),
    anchors: den ? [{ characterId: 'vesper', denId: den.id, x: den.x, y: den.y }] : [],
    whisperpineState: {
      vesperDenId: den?.id ?? null,
      moonwellUnlocked,
    },
  };
}
