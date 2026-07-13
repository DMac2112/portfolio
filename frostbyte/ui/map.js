// ui/map.js — the travel overlay ("Chillmere Isle" island map), FROSTBYTE-HOME-PLAN §2.2. Pattern-
// cloned from ui/chat.js: fully self-mounting (builds its own DOM, appends to <body>, no index.html
// markup required), styles injected once via a <style> tag reusing index.html's CSS variables
// (--accent/--panel/--bg), and the same .hidden-class show/hide convention as the other overlays.
//
// SINGLETON: unlike chat.js (which main.js currently reconstructs on every 'room' scene entry — the
// H1 punch-list §8 DOM-leak finding), this module is a deliberate module-level singleton so THIS
// overlay is leak-proof from day one. createMap() builds #map-overlay and its pins at most once per
// page load; every subsequent call just rebinds getCurrent/onTravel (via the mutable `cb` ref) and
// hands back the exact same {open,close,isOpen} instance — it never re-appends DOM or re-attaches
// listeners. Acceptance mirrors §8: document.querySelectorAll('#map-overlay').length === 1 no matter
// how many times createMap() is called.
//
// Import surface is intentionally narrow — content/map.js only, nothing from engine/ or KAPLAY. The
// frozen/minigame travel guards belong to the integrator (main.js), which should only ever call
// map.open() when it's actually safe to do so.
import { MAP_BG, MAP_NODES } from '../content/map.js';

let stylesInjected = false;

function injectStyles() {
  if (stylesInjected) return; // idempotent: only ever add the <style> tag once per page
  stylesInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    #map-overlay { position:fixed; inset:0; z-index:33; display:flex; align-items:center;
      justify-content:center; padding:16px; background:#0009; font-family:inherit; }
    #map-overlay.hidden { display:none; }
    #map-panel { width:min(680px, 94vw); max-height:90vh; overflow:auto; background:#fbfbfe;
      color:#1a1a22; border-radius:16px; box-shadow:0 18px 50px #000a;
      border:3px solid var(--panel, #0d1c2b); padding:16px 18px; animation:map-panel-in .18s ease-out; }
    @media (prefers-reduced-motion: reduce) { #map-panel { animation:none; } }
    @keyframes map-panel-in { from { opacity:0; transform:translateY(6px) scale(.98); } to { opacity:1; transform:none; } }
    #map-panel header { display:flex; align-items:center; gap:12px; margin-bottom:12px; }
    #map-title { margin:0; font-size:20px; flex:1; }
    #map-close { font:inherit; font-weight:700; border:2px solid var(--panel, #0d1c2b);
      background:var(--bg, #122a42); color:#fff; border-radius:10px; padding:7px 12px; cursor:pointer; }
    #map-stage { position:relative; width:100%; aspect-ratio:480/320; border-radius:12px;
      overflow:hidden; background:var(--panel, #0d1c2b); border:2px solid var(--panel, #0d1c2b); }
    #map-stage img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; display:block; }
    .map-pin { position:absolute; transform:translate(-50%, -50%); display:flex; flex-direction:column;
      align-items:center; gap:3px; font:inherit; border:none; background:none; padding:4px; margin:0;
      cursor:pointer; }
    .map-pin-dot { width:16px; height:16px; border-radius:50%; background:var(--accent, #7fd6ff);
      border:2px solid #0d1c2b; box-shadow:0 2px 6px #0006; }
    .map-pin-label { font-size:11px; font-weight:800; color:#0d1c2b; background:#fff;
      border-radius:999px; padding:2px 8px; box-shadow:0 2px 6px #0006; white-space:nowrap; }
    .map-pin:not(:disabled):hover .map-pin-dot, .map-pin:not(:disabled):focus-visible .map-pin-dot { background:#fff; }
    .map-pin:focus-visible { outline:2px solid var(--accent, #7fd6ff); outline-offset:3px; border-radius:8px; }
    @media (prefers-reduced-motion: no-preference) { .map-pin-dot { transition:background .12s; } }
    .map-pin.is-current { cursor:default; }
    .map-pin.is-current .map-pin-dot { background:#fff; box-shadow:0 0 0 4px #7fd6ff99, 0 2px 6px #0006; }
    .map-pin.is-current .map-pin-label { background:var(--accent, #7fd6ff); }
    .map-pin.is-locked { cursor:not-allowed; opacity:.55; filter:saturate(.5); }
    .map-pin.is-locked .map-pin-dot { background:#c7d2db; }
    .map-pin.is-locked .map-pin-label { background:#e7ebf0; color:#5a6672; }
    .map-pin:disabled { pointer-events:none; }
  `;
  document.head.appendChild(style);
}

// Builds the overlay markup from scratch and appends it to <body>. No index.html element is read —
// same self-mounting approach as ui/chat.js. Called at most once (guarded by the `instance` check in
// createMap below).
function buildDom() {
  const overlay = document.createElement('div');
  overlay.id = 'map-overlay';
  overlay.className = 'hidden';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'map-title');

  const panel = document.createElement('div');
  panel.id = 'map-panel';

  const header = document.createElement('header');
  const title = document.createElement('h2');
  title.id = 'map-title';
  title.textContent = 'Chillmere Isle';
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.id = 'map-close';
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.textContent = 'Close ✕';
  header.append(title, closeBtn);

  const stage = document.createElement('div');
  stage.id = 'map-stage';
  stage.setAttribute('role', 'group');
  stage.setAttribute('aria-label', 'Island locations');

  const bg = document.createElement('img');
  bg.src = MAP_BG;
  bg.alt = '';
  bg.setAttribute('aria-hidden', 'true');
  stage.appendChild(bg);

  // One button per MAP_NODES entry, built once; state (current/locked/enabled) is refreshed on
  // every open() since save.lastRoom (getCurrent()) can change between opens.
  const pinEls = new Map(); // roomId -> button element
  for (const node of MAP_NODES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'map-pin';
    btn.style.left = `${node.x * 100}%`;
    btn.style.top = `${node.y * 100}%`;

    const dot = document.createElement('span');
    dot.className = 'map-pin-dot';
    dot.setAttribute('aria-hidden', 'true');

    const label = document.createElement('span');
    label.className = 'map-pin-label';
    label.textContent = node.label;

    btn.append(dot, label);
    stage.appendChild(btn);
    pinEls.set(node.roomId, btn);
  }

  panel.append(header, stage);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  return { overlay, closeBtn, pinEls };
}

// Module-level singleton state. `cb` is the mutable ref later createMap() calls rebind through —
// the pin click handlers close over `cb`, not over the `getCurrent`/`onTravel` params directly, so
// rebinding never requires touching a listener.
let instance = null;
const cb = { getCurrent: () => null, onTravel: () => {} };

/**
 * @param {{ getCurrent: () => string, onTravel: (roomId:string) => void }} opts
 *   getCurrent() returns the player's current roomId (e.g. save.lastRoom-derived); its pin renders
 *   as "You are here" and is not clickable. onTravel(roomId) is called after the overlay has already
 *   closed — the caller is responsible for the actual k.go('room', roomId, {spawn:'fromMap'}) call
 *   and any frozen/minigame guards before ever invoking open().
 * @returns {{ open:()=>void, close:()=>void, isOpen:()=>boolean }} the same instance on every call.
 */
export function createMap({ getCurrent, onTravel }) {
  cb.getCurrent = getCurrent;
  cb.onTravel = onTravel;
  if (instance) return instance; // DOM already built — later scene entries just rebind above.

  injectStyles();
  const { overlay, closeBtn, pinEls } = buildDom();
  let lastFocused = null;

  function refreshPins() {
    const current = cb.getCurrent?.();
    for (const node of MAP_NODES) {
      const btn = pinEls.get(node.roomId);
      const label = btn.querySelector('.map-pin-label');
      const isCurrent = node.roomId === current;
      const enabled = node.unlocked && !isCurrent;

      btn.classList.toggle('is-current', isCurrent);
      btn.classList.toggle('is-locked', !node.unlocked);
      btn.disabled = !enabled;
      if (enabled) btn.removeAttribute('aria-disabled'); else btn.setAttribute('aria-disabled', 'true');
      if (isCurrent) { btn.setAttribute('aria-current', 'true'); btn.title = 'You are here'; }
      else btn.removeAttribute('aria-current');
      if (!node.unlocked) btn.title = 'Snowed in for now';
      else if (!isCurrent) btn.title = '';
      label.textContent = isCurrent ? `${node.label} — You are here` : node.label;
    }
  }

  function close() {
    overlay.classList.add('hidden');
    const toFocus = lastFocused;
    lastFocused = null;
    if (toFocus && typeof toFocus.focus === 'function') toFocus.focus();
  }

  function open() {
    lastFocused = document.activeElement;
    refreshPins();
    overlay.classList.remove('hidden');
    const firstEnabled = MAP_NODES.map((n) => pinEls.get(n.roomId)).find((b) => !b.disabled);
    (firstEnabled ?? closeBtn).focus();
  }

  const isOpen = () => !overlay.classList.contains('hidden');

  for (const node of MAP_NODES) {
    const btn = pinEls.get(node.roomId);
    btn.addEventListener('click', () => {
      if (btn.disabled) return; // locked or "you are here" — inert by construction
      close();
      cb.onTravel?.(node.roomId);
    });
  }
  closeBtn.onclick = close;
  overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  instance = { open, close, isOpen };
  return instance;
}
