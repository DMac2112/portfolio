export function canvasDpr(canvas: HTMLCanvasElement): number {
  const base = Math.min(window.devicePixelRatio || 1, 2);
  if (!canvas.clientWidth) return base;
  const scale = Math.max(1, canvas.getBoundingClientRect().width / canvas.clientWidth);
  return Math.min(base * scale, 4);
}
