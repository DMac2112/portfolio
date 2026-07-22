// world/aurora-ambient.js — quiet isle-wide aurora wash, intensified by full Curio completion.
// The state rule is pure; the adapter is dt-driven and keeps reduced-motion ribbons still.

export function auroraRibbonState(index, elapsedSeconds, intensified, reducedMotion = false) {
  const baseAngle = -9 + index * 7;
  const baseY = 145 + index * 58;
  return {
    x: 720 + (reducedMotion ? 0 : Math.sin(elapsedSeconds * 0.18 + index * 1.6) * 38),
    y: baseY + (reducedMotion ? 0 : Math.cos(elapsedSeconds * 0.22 + index) * 12),
    angle: baseAngle + (reducedMotion ? 0 : Math.sin(elapsedSeconds * 0.15 + index) * 4),
    opacity: intensified ? 0.15 - index * 0.018 : 0.025 - index * 0.004,
  };
}

export function addAuroraAmbient(k, room, getIntensified = () => false, reducedMotion = false) {
  if (!room) return null;
  const colors = ['#72e2bd', '#7fd6ff', '#a78bfa'];
  const ribbons = colors.map((hex, index) => k.add([
    k.rect(1120 - index * 90, 42 + index * 7, { radius: 26 }),
    k.pos(720, 145 + index * 58),
    k.anchor('center'),
    k.rotate(-9 + index * 7),
    k.color(k.Color.fromHex(hex)),
    k.opacity(0),
    k.z(-890 + index),
    'isle-aurora',
  ]));
  let elapsed = 0;

  function refresh() {
    const intensified = getIntensified() === true;
    ribbons.forEach((ribbon, index) => {
      const state = auroraRibbonState(index, elapsed, intensified, reducedMotion);
      ribbon.pos.x = state.x;
      ribbon.pos.y = state.y;
      ribbon.angle = state.angle;
      ribbon.opacity = state.opacity;
    });
  }

  refresh();
  k.onUpdate(() => {
    if (!reducedMotion) elapsed += Math.min(k.dt(), 0.05);
    refresh();
  });
  return { refresh, ribbons };
}
