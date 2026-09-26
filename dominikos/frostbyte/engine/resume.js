// engine/resume.js — where a returning player picks up: the last room, and the last spot in it
// (prefs.lastPos, kept fresh by main.js while they walk). Pure; main.js checks the spot is walkable.
export function resumeTarget(save, registry) {
  const lastRoom = save.prefs.lastRoom;
  const roomId = registry[lastRoom] ? lastRoom : 'plaza';
  const lastPos = save.prefs.lastPos;
  const pos = lastPos?.roomId === roomId && Number.isFinite(lastPos.x) && Number.isFinite(lastPos.y)
    ? lastPos : null;
  return { roomId, pos };
}

export function snapshotPos(roomId, pos, facing) {
  return { roomId, x: Math.round(pos.x), y: Math.round(pos.y), facing };
}

export function movedEnough(a, b, min = 4) {
  return b == null || Math.hypot(a.x - b.x, a.y - b.y) >= min;
}
