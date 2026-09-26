// A release on the scrim only closes when the press also began there.
export function closeOnBackdrop(overlay, close) {
  if (!overlay) return;
  let pressedBackdrop = false;
  overlay.addEventListener('pointerdown', (event) => {
    pressedBackdrop = event.target === overlay;
  });
  overlay.addEventListener('pointercancel', () => { pressedBackdrop = false; });
  overlay.addEventListener('click', (event) => {
    if (pressedBackdrop && event.target === overlay) close();
    pressedBackdrop = false;
  });
}
