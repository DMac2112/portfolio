// ui/edit-mode.js — the igloo "Decorating" tray (FROSTBYTE-HOME-PLAN §4.2). Unlike the full-screen
// scrim overlays (dress-up/chat/map), this is a DOCKED BOTTOM TRAY: the room stays visible and
// clickable behind it, because canvas drag/placement (the actual furniture-moving) is the
// integrator's job (main.js + engine/home-editor.js) — this module only owns the tray DOM: the
// owned-item strip, the placed-count chip, the catalog/exit buttons, and a small "selected placed
// item" context strip (flip/store). It never touches localStorage or the save shape directly —
// everything about inventory/placed-count is read through the injected getters, and every
// user action is reported upward through the injected callbacks.
//
// Pattern-cloned from ui/map.js: fully self-mounting (builds its own DOM, appends to <body>, no
// index.html markup required), idempotent injectStyles(), and the SAME module-level singleton
// convention as map.js/dress-up.js (Home Plan §8 DOM-leak fix) — createEditMode() builds the tray
// DOM at most once per page load; every later call (e.g. on each 'room' scene re-entry) just
// rebinds the callbacks through the mutable `cb` ref the listeners already close over. Acceptance
// mirrors §8: document.querySelectorAll('#edit-tray').length === 1 no matter how many times
// createEditMode() is called.
//
// Import surface is intentionally empty of engine/ and content/ — inventory arrives pre-shaped
// through getInventory() as [{ id, label, count }], and the sprite path is built from the fixed,
// documented convention './assets/furniture/<id>.png' (Home Plan §10) rather than importing
// content/furniture-catalog.js's spritePathFor, keeping this module decoupled from that data file.

let stylesInjected = false;

function injectStyles() {
  if (stylesInjected) return; // idempotent: only ever add the <style> tag once per page
  stylesInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    #edit-tray { position:fixed; z-index:20; left:0; right:0; bottom:0; pointer-events:auto;
      background:linear-gradient(180deg, #193d59ed, #0d2238f8 45%, #091827fc); color:#edf8ff; font-family:inherit;
      border-top:1px solid var(--rim, #7fd6ff55); box-shadow:inset 0 1px 0 #ffffff18, 0 -12px 36px #020914a8;
      backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px);
      padding:10px 14px max(10px, env(safe-area-inset-bottom)); }
    #edit-tray.hidden { display:none; }

    #edit-tray-context { display:flex; align-items:center; gap:10px; margin-bottom:8px;
      padding:6px 10px; background:#7fd6ff0d; border:1px solid #7fd6ff35; border-radius:10px; }
    #edit-tray-context.hidden { display:none; }
    #edit-tray-context-label { flex:1; font-weight:800; font-size:13px; }
    #edit-tray-context button { font:inherit; font-weight:700; font-size:12.5px; border:1px solid #c8f4ff;
      background:linear-gradient(135deg, #c8f4ff, #7fd6ff); color:#091827; border-radius:999px; padding:6px 12px; cursor:pointer; }
    #edit-tray-context button:active { transform:translateY(1px); }

    #edit-tray-header { display:flex; align-items:center; gap:10px; margin-bottom:8px; }
    #edit-tray-title { margin:0; font-size:16px; flex:1; }
    #edit-tray-count { font-weight:800; font-size:12px; color:#091827; background:linear-gradient(135deg, #c8f4ff, #7fd6ff);
      border:1px solid #f7fbffaa; padding:4px 10px; border-radius:999px; white-space:nowrap; }
    #edit-tray-catalog, #edit-tray-exit { font:inherit; font-weight:700; font-size:12.5px;
      border:1px solid var(--rim, #7fd6ff55); border-radius:999px; padding:7px 13px; cursor:pointer; white-space:nowrap; }
    #edit-tray-catalog { background:linear-gradient(135deg, #c8f4ff, #7fd6ff); color:#091827; border-color:#c8f4ff; }
    #edit-tray-exit { background:linear-gradient(180deg, #245373, #122a42); color:#edf8ff; }
    #edit-tray-catalog:active, #edit-tray-exit:active { transform:translateY(1px); }

    #edit-tray-strip { display:flex; gap:8px; overflow-x:auto; padding:2px 2px 4px; scrollbar-width:thin; }
    #edit-tray-empty { font-size:12.5px; opacity:.75; padding:10px 2px; }
    .edit-cell { position:relative; flex:0 0 auto; width:60px; display:flex; flex-direction:column;
      align-items:center; gap:4px; font:inherit; color:inherit; border:1px solid #7fd6ff35;
      background:linear-gradient(155deg, #193d59a6, #0d2238d9); border-radius:10px; padding:6px 4px 5px; cursor:pointer;
      box-shadow:inset 0 1px 0 #ffffff0f; }
    .edit-cell:hover, .edit-cell:focus-visible { background:linear-gradient(155deg, #245373c2, #122a42e8); border-color:#7fd6ff88; }
    .edit-cell:focus-visible { outline:2px solid var(--accent, #7fd6ff); outline-offset:2px; }
    .edit-cell.active { border-color:var(--accent, #7fd6ff); background:#7fd6ff1f;
      box-shadow:0 0 0 2px #7fd6ff55 inset; }
    .edit-cell img { width:34px; height:34px; object-fit:contain; image-rendering:pixelated; }
    .edit-cell-label { font-size:9.5px; font-weight:700; text-align:center; line-height:1.15;
      max-width:56px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .edit-cell-badge { position:absolute; top:2px; right:2px; font-size:9px; font-weight:800;
      background:var(--accent, #7fd6ff); color:#0d1c2b; border-radius:999px; padding:1px 5px; line-height:1.3; }
    #edit-tray-context button:focus-visible, #edit-tray-catalog:focus-visible, #edit-tray-exit:focus-visible {
      outline:2px solid var(--accent, #7fd6ff); outline-offset:3px; }
    @media (prefers-reduced-motion: reduce) { #edit-tray-context button, #edit-tray-catalog, #edit-tray-exit, .edit-cell { transition:none; } }
  `;
  document.head.appendChild(style);
}

// Builds the tray markup from scratch and appends it to <body>. Called at most once, guarded by
// the `instance` check in createEditMode below — same approach as ui/map.js's buildDom().
function buildDom() {
  const tray = document.createElement('div');
  tray.id = 'edit-tray';
  tray.className = 'hidden';
  tray.setAttribute('role', 'toolbar');
  tray.setAttribute('aria-label', 'Decorating tools');
  tray.setAttribute('aria-orientation', 'horizontal');

  const context = document.createElement('div');
  context.id = 'edit-tray-context';
  context.className = 'hidden';
  const contextLabel = document.createElement('span');
  contextLabel.id = 'edit-tray-context-label';
  const flipBtn = document.createElement('button');
  flipBtn.type = 'button';
  flipBtn.id = 'edit-tray-flip';
  flipBtn.setAttribute('aria-label', 'Flip selected item');
  flipBtn.textContent = '↔ Flip';
  const storeBtn = document.createElement('button');
  storeBtn.type = 'button';
  storeBtn.id = 'edit-tray-store';
  storeBtn.setAttribute('aria-label', 'Store selected item');
  storeBtn.textContent = '📦 Store';
  context.append(contextLabel, flipBtn, storeBtn);

  const header = document.createElement('header');
  header.id = 'edit-tray-header';
  const title = document.createElement('h2');
  title.id = 'edit-tray-title';
  title.textContent = 'Decorating';
  const count = document.createElement('span');
  count.id = 'edit-tray-count';
  count.setAttribute('aria-live', 'polite');
  count.textContent = '0/0';
  const catalogBtn = document.createElement('button');
  catalogBtn.type = 'button';
  catalogBtn.id = 'edit-tray-catalog';
  catalogBtn.setAttribute('aria-label', 'Open furniture catalogue');
  catalogBtn.textContent = '📖 Catalogue';
  const exitBtn = document.createElement('button');
  exitBtn.type = 'button';
  exitBtn.id = 'edit-tray-exit';
  exitBtn.setAttribute('aria-label', 'Exit decorating');
  exitBtn.textContent = 'Done ✕';
  header.append(title, count, catalogBtn, exitBtn);

  const strip = document.createElement('div');
  strip.id = 'edit-tray-strip';
  strip.setAttribute('aria-label', 'Owned furniture');

  tray.append(context, header, strip);
  document.body.appendChild(tray);

  return { tray, context, contextLabel, flipBtn, storeBtn, count, catalogBtn, exitBtn, strip };
}

// Module-level singleton state. `cb` is the mutable ref later createEditMode() calls rebind
// through — every listener closes over `cb`, never over the opts params directly, so rebinding on
// scene re-entry never requires touching a listener (Home Plan §8 DOM-leak fix, mirrors map.js).
let instance = null;
const cb = {
  getInventory: () => [],
  getPlacedCount: () => 0,
  maxPlaced: 0,
  onSelectItem: () => {},
  onStoreSelected: () => {},
  onFlipSelected: () => {},
  onOpenCatalog: () => {},
  onExit: () => {},
};

/**
 * @param {{
 *   getInventory: () => Array<{id:string, label:string, count:number}>,
 *   getPlacedCount: () => number,
 *   maxPlaced: number,
 *   onSelectItem: (id:string) => void,
 *   onStoreSelected: () => void,
 *   onFlipSelected: () => void,
 *   onOpenCatalog: () => void,
 *   onExit: () => void,
 * }} opts
 * @returns {{ open:()=>void, close:()=>void, isOpen:()=>boolean, refresh:()=>void,
 *   setSelected:(sel:{label:string}|null)=>void, clearPick:()=>void }} the same instance every call.
 */
export function createEditMode(opts) {
  Object.assign(cb, opts); // rebind every call, even repeats
  if (instance) return instance; // DOM already built — later scene entries just rebind above.

  injectStyles();
  const { tray, context, contextLabel, flipBtn, storeBtn, count, catalogBtn, exitBtn, strip } = buildDom();
  let pickedId = null;

  function renderStrip() {
    const items = cb.getInventory?.() ?? [];
    if (!items.length) {
      const empty = document.createElement('div');
      empty.id = 'edit-tray-empty';
      empty.textContent = 'No furniture yet — visit the Catalogue!';
      strip.replaceChildren(empty);
      return;
    }
    strip.replaceChildren(...items.map((item) => {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'edit-cell' + (item.id === pickedId ? ' active' : '');
      cell.setAttribute('aria-label', `${item.label}, ${item.count} owned`);
      cell.setAttribute('aria-pressed', item.id === pickedId ? 'true' : 'false');

      const img = document.createElement('img');
      img.src = `./assets/furniture/${item.id}.png`;
      img.alt = '';
      img.setAttribute('aria-hidden', 'true');

      const label = document.createElement('span');
      label.className = 'edit-cell-label';
      label.textContent = item.label;

      const badge = document.createElement('span');
      badge.className = 'edit-cell-badge';
      badge.textContent = `×${item.count}`;

      cell.append(img, label, badge);
      cell.onclick = () => {
        pickedId = item.id;
        for (const sib of strip.children) {
          sib.classList.remove('active');
          sib.setAttribute('aria-pressed', 'false');
        }
        cell.classList.add('active');
        cell.setAttribute('aria-pressed', 'true');
        cb.onSelectItem?.(item.id);
      };
      return cell;
    }));
  }

  function renderCount() {
    count.textContent = `${cb.getPlacedCount?.() ?? 0}/${cb.maxPlaced ?? 0}`;
  }

  function refresh() {
    renderCount();
    renderStrip();
  }

  function clearPick() {
    pickedId = null;
    for (const sib of strip.children) {
      sib.classList.remove('active');
      sib.setAttribute('aria-pressed', 'false');
    }
  }

  function setSelected(sel) {
    if (!sel) {
      context.classList.add('hidden');
      contextLabel.textContent = '';
      return;
    }
    contextLabel.textContent = sel.label ?? '';
    context.classList.remove('hidden');
  }

  function open() {
    refresh();
    tray.classList.remove('hidden');
    const firstCell = strip.querySelector('.edit-cell');
    (firstCell ?? catalogBtn).focus();
  }

  function close() {
    tray.classList.add('hidden');
  }

  const isOpen = () => !tray.classList.contains('hidden');

  catalogBtn.onclick = () => cb.onOpenCatalog?.();
  exitBtn.onclick = () => cb.onExit?.();
  flipBtn.onclick = () => cb.onFlipSelected?.();
  storeBtn.onclick = () => cb.onStoreSelected?.();
  // Document-level (not scoped to `tray`): unlike the full-screen scrim overlays, this tray is
  // non-modal — the room canvas stays clickable, so focus routinely lands outside the tray's DOM
  // subtree (e.g. after clicking the canvas to place a picked item). A tray-scoped keydown listener
  // would miss Esc in that case; the isOpen() guard keeps this inert whenever the tray is hidden, so
  // it's still safe as a permanent (singleton-built-once) document listener.
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen()) cb.onExit?.(); });

  instance = { open, close, isOpen, refresh, setSelected, clearPick };
  return instance;
}
