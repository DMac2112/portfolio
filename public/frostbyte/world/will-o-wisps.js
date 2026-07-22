// world/will-o-wisps.js — Whisperpine's cursor-shy lights (World Plan W5).
// The position rule is pure; the KAPLAY adapter only owns scene-time rendering.

export function dodgeWispPosition(origin, cursor, elapsedSeconds, phase = 0, reducedMotion = false) {
  if (!origin) return null;
  if (reducedMotion) return { x: origin.x, y: origin.y };
  const idle = {
    x: origin.x + Math.sin(elapsedSeconds * 0.9 + phase) * 18,
    y: origin.y + Math.cos(elapsedSeconds * 1.15 + phase) * 12,
  };
  if (!cursor) return idle;
  const dx = idle.x - cursor.x;
  const dy = idle.y - cursor.y;
  const distance = Math.hypot(dx, dy);
  const dodgeRadius = 145;
  if (distance >= dodgeRadius) return idle;
  const fallbackAngle = phase + 0.7;
  const ux = distance > 0.001 ? dx / distance : Math.cos(fallbackAngle);
  const uy = distance > 0.001 ? dy / distance : Math.sin(fallbackAngle);
  const push = (1 - distance / dodgeRadius) * 62;
  return { x: idle.x + ux * push, y: idle.y + uy * push };
}

export function addDodgeWisps(k, room, reducedMotion = false) {
  if (room?.id !== 'whisperpine' || !Array.isArray(room.wisps)) return [];
  return room.wisps.map((origin) => {
    const wisp = k.add([
      k.rect(13, 13, { radius: 7 }),
      k.pos(origin.x, origin.y),
      k.anchor('center'),
      k.color(k.Color.fromHex('#6fe0b2')),
      k.opacity(reducedMotion ? 0.65 : 0.82),
      k.z(origin.y + 2),
      'will-o-glow',
    ]);
    if (!reducedMotion) {
      let elapsed = 0;
      wisp.onUpdate(() => {
        elapsed += Math.min(k.dt(), 0.05);
        const cursor = k.toWorld(k.mousePos());
        const next = dodgeWispPosition(origin, cursor, elapsed, origin.phase ?? 0, false);
        wisp.pos.x = next.x;
        wisp.pos.y = next.y;
        wisp.opacity = 0.68 + Math.sin(elapsed * 2 + (origin.phase ?? 0)) * 0.14;
        wisp.z = wisp.pos.y + 2;
      });
    }
    return wisp;
  });
}
