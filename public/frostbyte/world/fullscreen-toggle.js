// fullscreen-toggle.js — the HUD's "Play full screen" button (IMPURE DOM glue, injected deps so
// it tests without a browser). Full screen takes the whole display, past DominikOS's window and
// browser chrome; the camera's cover-fit (engine/camera.js) keeps the view inside the painted map
// at the new size. Esc closes open menus first, then exits full screen; the button follows fullscreenchange.
export const FULLSCREEN_LABELS = {
  enter: 'Play full screen',
  exit: 'Exit full screen',
};

export function createFullscreenToggle({ doc, root, button, frost = null, reducedMotion = false, nav = null }) {
  if (!button) return null;
  if (!doc.fullscreenEnabled || typeof root?.requestFullscreen !== 'function') {
    button.hidden = true;   // e.g. an embed without allow="fullscreen", or iOS Safari on iPhone
    return null;
  }
  button.hidden = false;

  const isFull = () => Boolean(doc.fullscreenElement);

  function sync() {
    const full = isFull();
    if (full) Promise.resolve(nav?.keyboard?.lock?.(['Escape'])).catch(() => {});
    else nav?.keyboard?.unlock?.();
    const label = full ? FULLSCREEN_LABELS.exit : FULLSCREEN_LABELS.enter;
    button.setAttribute('aria-pressed', String(full));
    button.setAttribute('aria-label', label);
    button.title = label;
    // The frost-pane clears once on the way in; skipped for reduced motion.
    if (full && frost && !reducedMotion) {
      frost.classList.remove('clearing');
      void frost.offsetWidth;   // restart the animation if it ran before
      frost.classList.add('clearing');
    }
  }

  function toggle() {
    const request = isFull() ? doc.exitFullscreen() : root.requestFullscreen({ navigationUI: 'hide' });
    // A refused request (no user gesture, policy) leaves the game as it was; nothing to undo.
    return Promise.resolve(request).catch(() => {});
  }

  const onClick = () => { toggle(); };
  button.addEventListener('click', onClick);
  doc.addEventListener('fullscreenchange', sync);
  sync();

  return {
    toggle,
    sync,
    destroy() {
      button.removeEventListener('click', onClick);
      doc.removeEventListener('fullscreenchange', sync);
    },
  };
}
