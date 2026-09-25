// Pure camera math — follow + zoom-fit. No KAPLAY/DOM dependency.

export const SCALE = 3;
export const CAM_LEAD = { x: 0, y: -50 };

export function computeCamPos(playerPos) {
  return { x: playerPos.x + CAM_LEAD.x, y: playerPos.y + CAM_LEAD.y };
}

export function computeCamScale(aspectRatio) {
  return aspectRatio < 1 ? 0.85 : 1.15;   // portrait phones zoom out, same as game1
}

// World size of a room's painted backdrop (every backdrop is gridCols*tile*scale, 1440x960).
export function roomMapSize(room) {
  return { w: room.gridCols * room.tile * room.scale, h: room.gridRows * room.tile * room.scale };
}

// Smallest zoom at which the map fills the whole view on both axes — below it, a big or
// fullscreen window would show the void past the painted edge.
export function coverScale(viewW, viewH, mapW, mapH) {
  return Math.max(viewW / mapW, viewH / mapH);
}

export function fitCamScale(viewW, viewH, mapW, mapH) {
  return Math.max(computeCamScale(viewW / viewH), coverScale(viewW, viewH, mapW, mapH));
}

// Keep the view rectangle inside the map: the camera follows the player until the painted edge
// reaches the screen edge, then holds. An axis the view can't fill (never, at fitCamScale) centres.
export function clampCamPos(pos, viewW, viewH, scale, mapW, mapH) {
  const axis = (v, view, map) => {
    const half = view / (2 * scale);
    return half * 2 >= map ? map / 2 : Math.min(Math.max(v, half), map - half);
  };
  return { x: axis(pos.x, viewW, mapW), y: axis(pos.y, viewH, mapH) };
}
