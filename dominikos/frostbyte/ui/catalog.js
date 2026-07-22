// ui/catalog.js — the "Cosy Igloo Catalogue" buy overlay (FROSTBYTE-HOME-PLAN §4.1). Opened FROM
// edit mode's tray (ui/edit-mode.js's "📖 Catalogue" button), but it's a full-screen scrim dialog
// like ui/dress-up.js / ui/chat.js — unlike the tray, buying furniture warrants stealing focus and
// blocking the room, the same way equipping cosmetics does. Data (ids/labels/prices/classes/sprite
// dims) is the one place this feature's UI is allowed to import content/ directly: the pinned shape
// of content/furniture-catalog.js (FURNITURE_CATALOG entries as {id,label,cls,price,w,h}, plus
// FURNITURE_CLASSES and byClass()) is guaranteed by FROSTBYTE-HOME-PLAN §4.1/§10 regardless of the
// exact item count. This module never calls economy.spendCoins/unlockItem itself — it only reports
// `onBuy(id)` upward; the integrator (main.js) owns the actual purchase + persist + coin refresh.
import { FURNITURE_CATALOG, FURNITURE_CLASSES, byClass } from '../content/furniture-catalog.js';

const CLASS_LABELS = {
  all: 'All', seating: 'Seating', tables: 'Tables', lighting: 'Lighting',
  rugs: 'Rugs', decor: 'Decor', tech: 'Tech & Fun',
};
// 'all' is a pseudo-tab (not one of FURNITURE_CLASSES) so the catalogue opens on a full browse of
// FURNITURE_CATALOG rather than forcing a class pick first — the one place this module reads the
// full list directly instead of going through byClass().
const TABS = ['all', ...FURNITURE_CLASSES];

let stylesInjected = false;

function injectStyles() {
  if (stylesInjected) return; // idempotent: only ever add the <style> tag once per page
  stylesInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    #catalog-overlay { position:fixed; inset:0; z-index:34; display:flex; align-items:center;
      justify-content:center; padding:16px; background:#020914b8; font-family:inherit;
      backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); }
    #catalog-overlay.hidden { display:none; }
    #catalog-panel { width:min(720px, 96vw); max-height:90vh; overflow:auto;
      color:var(--ink, #edf8ff); background:linear-gradient(155deg, #193d59f2, #0d2238f7 55%, #091827fa);
      border:1px solid var(--rim, #7fd6ff55); border-radius:18px; padding:16px 18px;
      box-shadow:inset 0 1px 0 #ffffff20, 0 22px 70px #020914cc; animation:catalog-panel-in .18s ease-out; }
    @keyframes catalog-panel-in { from { opacity:0; transform:translateY(6px) scale(.98); } to { opacity:1; transform:none; } }
    #catalog-panel header { display:flex; align-items:center; gap:12px; margin-bottom:12px; }
    #catalog-title { margin:0; font-size:20px; flex:1; color:#f7fbff; }
    #catalog-coins { font-weight:800; color:#091827; background:linear-gradient(135deg, #c8f4ff, #7fd6ff);
      border:1px solid #f7fbffaa; padding:4px 10px; border-radius:999px; font-size:13px; white-space:nowrap; }
    #catalog-close { font:inherit; font-weight:700; color:var(--ink, #edf8ff); cursor:pointer;
      border:1px solid var(--rim, #7fd6ff55); border-radius:10px; padding:7px 12px;
      background:linear-gradient(180deg, #245373, #122a42); box-shadow:inset 0 1px 0 #ffffff18; }
    #catalog-tabs { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:12px; }
    .cat-tab { font:inherit; font-weight:700; font-size:13px; color:#a9c6d9; cursor:pointer;
      border:1px solid #7fd6ff3d; background:linear-gradient(180deg, #193d59cc, #0d2238e8);
      border-radius:999px; padding:6px 12px; }
    .cat-tab.active { color:#091827; background:linear-gradient(135deg, #c8f4ff, #7fd6ff); border-color:#c8f4ff; }
    #catalog-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(120px, 1fr)); gap:10px; }
    .cat-card { position:relative; display:flex; flex-direction:column; align-items:center; gap:5px;
      border:1px solid #7fd6ff2f; background:linear-gradient(155deg, #193d59a6, #0d2238d9);
      border-radius:12px; padding:10px 8px 8px; box-shadow:inset 0 1px 0 #ffffff10; }
    .cat-card:hover { border-color:#7fd6ff88; background:linear-gradient(155deg, #245373b8, #122a42e8); }
    .cat-card img { width:44px; height:44px; object-fit:contain; image-rendering:pixelated; }
    .cat-label { font-size:12px; font-weight:700; text-align:center; line-height:1.2; }
    .cat-price { font-size:12px; font-weight:800; color:#ffe2a1; }
    .cat-owned-badge { position:absolute; top:6px; right:6px; font-size:9.5px; font-weight:800;
      background:#3b8fb8; color:#f7fbff; border:1px solid #7fd6ff88; border-radius:999px; padding:2px 7px; }
    .cat-buy { margin-top:2px; width:100%; font:inherit; font-weight:700; font-size:12.5px;
      border:1px solid #c8f4ff; background:linear-gradient(135deg, #c8f4ff, #7fd6ff); color:#091827; border-radius:999px;
      padding:6px 10px; cursor:pointer; }
    #catalog-close:hover, .cat-tab:hover { border-color:#7fd6ffaa; }
    #catalog-close:focus-visible, .cat-tab:focus-visible, .cat-buy:focus-visible { outline:2px solid var(--accent, #7fd6ff); outline-offset:3px; }
    .cat-buy:active { transform:translateY(1px); }
    .cat-buy:disabled, .cat-buy[aria-disabled="true"] { opacity:.48; cursor:not-allowed; background:#60758b; border-color:#8eacc6; }
    @media (prefers-reduced-motion: reduce) { #catalog-panel { animation:none; } }
  `;
  document.head.appendChild(style);
}

// Builds the overlay markup from scratch and appends it to <body>. Called at most once, guarded by
// the `instance` check in createCatalog below — same approach as ui/dress-up.js's #customize-overlay,
// except this overlay is self-mounting (no index.html markup to read) like ui/map.js and ui/chat.js.
function buildDom() {
  const overlay = document.createElement('div');
  overlay.id = 'catalog-overlay';
  overlay.className = 'hidden';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'catalog-title');

  const panel = document.createElement('div');
  panel.id = 'catalog-panel';

  const header = document.createElement('header');
  const title = document.createElement('h2');
  title.id = 'catalog-title';
  title.textContent = 'Cosy Igloo Catalogue';
  const coins = document.createElement('span');
  coins.id = 'catalog-coins';
  coins.setAttribute('aria-live', 'polite');
  coins.textContent = '🪙 0';
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.id = 'catalog-close';
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.textContent = 'Close ✕';
  header.append(title, coins, closeBtn);

  const tabs = document.createElement('div');
  tabs.id = 'catalog-tabs';
  tabs.setAttribute('role', 'tablist');
  tabs.setAttribute('aria-label', 'Furniture categories');

  const grid = document.createElement('div');
  grid.id = 'catalog-grid';
  grid.setAttribute('role', 'group');
  grid.setAttribute('aria-label', 'Furniture for sale');

  panel.append(header, tabs, grid);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  return { overlay, coins, closeBtn, tabs, grid };
}

// Module-level singleton state (Home Plan §8 DOM-leak fix, same convention as map.js/chat.js):
// `cb` is the mutable ref every listener closes over, rebound on every createCatalog() call so a
// later scene entry's fresh getCoins/getOwnedCount/onBuy always wins without touching a listener.
let instance = null;
const cb = {
  getCoins: () => 0,
  getOwnedCount: () => 0,
  onBuy: () => {},
};

/**
 * @param {{
 *   getCoins: () => number,
 *   getOwnedCount: (id:string) => number,
 *   onBuy: (id:string) => void,
 * }} opts
 * @returns {{ open:()=>void, close:()=>void, isOpen:()=>boolean, refresh:()=>void }} the same
 *   instance on every call.
 */
export function createCatalog(opts) {
  Object.assign(cb, opts); // rebind every call, even repeats
  if (instance) return instance; // already built: DOM/listeners stay exactly as they are

  injectStyles();
  const { overlay, coins, closeBtn, tabs, grid } = buildDom();
  let activeTab = 'all';
  let lastFocused = null;

  function render() {
    const balance = cb.getCoins?.() ?? 0;
    coins.textContent = `🪙 ${balance}`;

    tabs.replaceChildren(...TABS.map((cls) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cat-tab' + (cls === activeTab ? ' active' : '');
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', cls === activeTab ? 'true' : 'false');
      b.textContent = CLASS_LABELS[cls] ?? cls;
      b.onclick = () => { activeTab = cls; render(); };
      return b;
    }));

    const items = activeTab === 'all' ? FURNITURE_CATALOG : byClass(activeTab);
    grid.replaceChildren(...items.map((item) => {
      const owned = cb.getOwnedCount?.(item.id) ?? 0;
      const affordable = balance >= item.price;

      const card = document.createElement('div');
      card.className = 'cat-card';

      const img = document.createElement('img');
      img.src = `./assets/furniture/${item.id}.png`;
      img.alt = '';
      img.setAttribute('aria-hidden', 'true');

      const label = document.createElement('span');
      label.className = 'cat-label';
      label.textContent = item.label;

      const price = document.createElement('span');
      price.className = 'cat-price';
      price.textContent = `🪙 ${item.price}`;

      const buyBtn = document.createElement('button');
      buyBtn.type = 'button';
      buyBtn.className = 'cat-buy';
      buyBtn.textContent = 'Buy';
      buyBtn.disabled = !affordable;
      if (affordable) buyBtn.removeAttribute('aria-disabled'); else buyBtn.setAttribute('aria-disabled', 'true');
      buyBtn.setAttribute('aria-label', `Buy ${item.label} for ${item.price} coins`);
      buyBtn.onclick = () => { cb.onBuy?.(item.id); render(); };

      card.append(img, label, price, buyBtn);
      if (owned > 0) {
        const badge = document.createElement('span');
        badge.className = 'cat-owned-badge';
        badge.textContent = `Owned ×${owned}`;
        card.appendChild(badge);
      }
      return card;
    }));
  }

  function close() {
    overlay.classList.add('hidden');
    const toFocus = lastFocused;
    lastFocused = null;
    if (toFocus && typeof toFocus.focus === 'function') toFocus.focus();
  }

  function open() {
    lastFocused = document.activeElement;
    activeTab = 'all';
    render();
    overlay.classList.remove('hidden');
    closeBtn.focus();
  }

  const isOpen = () => !overlay.classList.contains('hidden');

  closeBtn.onclick = close;
  overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  instance = { open, close, isOpen, refresh: render };
  return instance;
}
