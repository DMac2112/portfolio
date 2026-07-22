// world/echo-runtime.js — The Echo is heard and read, never rendered as a character (World Plan W6).
// Song motion and fading use scene time, so DominikOS pause freezes them with the room.

const LINE_ORIGINS = Object.freeze([
  Object.freeze({ x: 720, y: 430 }),
  Object.freeze({ x: 610, y: 555 }),
  Object.freeze({ x: 830, y: 590 }),
]);

export function echoLinePosition(index, elapsedSeconds, reducedMotion = false) {
  const origin = LINE_ORIGINS[((index % LINE_ORIGINS.length) + LINE_ORIGINS.length) % LINE_ORIGINS.length];
  if (reducedMotion) return { ...origin };
  return {
    x: origin.x + Math.sin(elapsedSeconds * 0.75 + index * 1.7) * 18,
    y: origin.y - Math.min(22, elapsedSeconds * 7),
  };
}

export function addEchoPresence(k, room, lines = [], reducedMotion = false) {
  if (room?.id !== 'caverns' || !Array.isArray(lines) || lines.length === 0) return null;
  let cursor = 0;
  let activeLine = null;
  let active = true;

  function singNext() {
    if (!active) return null;
    if (activeLine) k.destroy(activeLine);
    const index = cursor++;
    const start = echoLinePosition(index, 0, reducedMotion);
    const line = k.add([
      k.text(lines[index % lines.length], { size: 16, width: 340, align: 'center' }),
      k.pos(start.x, start.y),
      k.anchor('center'),
      k.color(k.Color.fromHex(index % 2 ? '#c8f4ff' : '#72e2bd')),
      k.opacity(0),
      k.z(100006),
      'echo-song-line',
    ]);
    activeLine = line;
    let elapsed = 0;
    line.onUpdate(() => {
      elapsed += Math.min(k.dt(), 0.05);
      const position = echoLinePosition(index, elapsed, reducedMotion);
      line.pos.x = position.x;
      line.pos.y = position.y;
      line.opacity = elapsed < 0.3 ? elapsed / 0.3
        : elapsed < 2.7 ? 1
          : Math.max(0, 1 - (elapsed - 2.7) / 0.9);
      if (elapsed >= 3.6) {
        if (activeLine === line) activeLine = null;
        k.destroy(line);
      }
    });
    return line;
  }

  k.onSceneLeave(() => {
    active = false;
    if (activeLine) k.destroy(activeLine);
    activeLine = null;
  });
  return { singNext, get lineCount() { return cursor; } };
}
