// world/lighthouse-lamp.js — the Palefire beam. Motion is scene-time driven and disappears with
// the room; reduced-motion keeps the beam present at a calm fixed bearing.

export function lighthouseSweepAngle(elapsedSeconds) {
  return -18 + Math.sin(elapsedSeconds * 0.42) * 24;
}

export function addLighthouseSweep(k, room, reducedMotion = false) {
  if (room?.id !== 'lighthouse-gallery') return null;
  const beam = k.add([
    k.rect(520, 54, { radius: 27 }),
    k.pos(720, 330),
    k.anchor('left'),
    k.rotate(lighthouseSweepAngle(0)),
    k.color(k.Color.fromHex('#ffe2a1')),
    k.opacity(reducedMotion ? 0.12 : 0.18),
    k.z(120),
    'palefire-beam',
  ]);
  if (!reducedMotion) {
    let elapsed = 0;
    beam.onUpdate(() => {
      elapsed += Math.min(k.dt(), 0.05);
      beam.angle = lighthouseSweepAngle(elapsed);
    });
  }
  return beam;
}
