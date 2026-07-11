// Pure camera math — follow + zoom-fit. No KAPLAY/DOM dependency.

export const SCALE = 3;
export const CAM_LEAD = { x: 0, y: -50 };

export function computeCamPos(playerPos) {
  return { x: playerPos.x + CAM_LEAD.x, y: playerPos.y + CAM_LEAD.y };
}

export function computeCamScale(aspectRatio) {
  return aspectRatio < 1 ? 0.85 : 1.15;   // portrait phones zoom out, same as game1
}
