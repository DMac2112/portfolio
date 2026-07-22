// Pure movement resolution — click-to-move + keys, bounds clamp, obstacle pushout, facing.
// No KAPLAY/DOM dependency; main.js supplies dt from k.dt() each frame.

export const SPEED = 220;          // world px/s
export const ARRIVE_EPS = 4;       // px — below this, moveTarget clears (arrived)

// Steers toward moveTarget each frame, same discrete-per-frame approach as game1
// (NOT a k.tween() on position — a click mid-flight must be able to retarget
// instantly without waiting out or cancelling a running tween).
export function resolveMoveVector({ keys, moveTarget, pos, dt }) {
  let dx = 0, dy = 0;
  if (keys.left) dx -= 1;
  if (keys.right) dx += 1;
  if (keys.up) dy -= 1;
  if (keys.down) dy += 1;

  const usingKeys = dx !== 0 || dy !== 0;
  let arrived = false;

  if (!usingKeys && moveTarget) {
    const tx = moveTarget.x - pos.x, ty = moveTarget.y - pos.y;
    const dist = Math.hypot(tx, ty);
    if (dist <= ARRIVE_EPS) { arrived = true; }
    else { dx = tx / dist; dy = ty / dist; }
  }

  const len = Math.hypot(dx, dy) || 1;
  const vx = (dx / len) * SPEED, vy = (dy / len) * SPEED;
  return {
    vx, vy, dxPx: vx * dt, dyPx: vy * dt,
    moving: !arrived && (dx !== 0 || dy !== 0),
    arrived,
    keysCancelTarget: usingKeys,
  };
}

export function clampToBounds(pos, bounds) {
  return {
    x: Math.max(bounds.x0, Math.min(bounds.x1, pos.x)),
    y: Math.max(bounds.y0, Math.min(bounds.y1, pos.y)),
  };
}

// Pure circle-vs-AABB penetration resolver — obstacle handling without KAPLAY physics.
export function resolveObstacles(pos, radius, solids) {
  let { x, y } = pos;
  for (const s of solids) {
    const halfW = s.w / 2, halfH = s.h / 2;
    const closestX = Math.max(s.x - halfW, Math.min(x, s.x + halfW));
    const closestY = Math.max(s.y - halfH, Math.min(y, s.y + halfH));
    const dx = x - closestX, dy = y - closestY;
    const dist = Math.hypot(dx, dy);
    if (dist < radius && dist > 0) {
      const push = radius - dist;
      x += (dx / dist) * push;
      y += (dy / dist) * push;
    } else if (dist === 0) {
      // center is inside the box (clamp returned the point itself): push out along
      // whichever axis has the shallowest penetration, to exactly `radius` past that edge.
      const penLeft = x - (s.x - halfW), penRight = (s.x + halfW) - x;
      const penTop = y - (s.y - halfH), penBottom = (s.y + halfH) - y;
      const minPen = Math.min(penLeft, penRight, penTop, penBottom);
      if (minPen === penLeft) x = s.x - halfW - radius;
      else if (minPen === penRight) x = s.x + halfW + radius;
      else if (minPen === penTop) y = s.y - halfH - radius;
      else y = s.y + halfH + radius;
    }
  }
  return { x, y };
}

export function resolveFacing(dx, dy, prevFacing) {
  if (dx === 0 && dy === 0) return prevFacing;             // no jitter when idle
  return Math.abs(dx) >= Math.abs(dy)
    ? (dx > 0 ? 'right' : 'left')
    : (dy > 0 ? 'down' : 'up');
}
