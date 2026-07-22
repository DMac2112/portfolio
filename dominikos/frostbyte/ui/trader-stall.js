// ui/trader-stall.js — Captain Salka's two-crate cargo ledger (World Plan W3).
// The UI owns presentation only. Date-seeded stock and economy mutations stay with content/docks.js
// and main.js, keeping this singleton reusable and preventing scene re-entry DOM leaks.

let stylesInjected = false;
let instance = null;
const cb = {
  getStock: () => [],
  getCoins: () => 0,
  isOwned: () => false,
  onBuy: () => ({ ok: false, message: 'That crate is not available.' }),
};

function injectStyles() {
  if (stylesInjected) return;
  stylesInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    #salka-stall-overlay { position:fixed; inset:0; z-index:35; display:flex; align-items:center;
      justify-content:center; padding:16px; background:#06101dcc; font-family:inherit;
      backdrop-filter:blur(7px); -webkit-backdrop-filter:blur(7px); }
    #salka-stall-overlay.hidden { display:none; }
    #salka-stall-panel { width:min(560px, 94vw); color:var(--ink, #edf8ff); overflow:hidden;
      background:#13293a; border:2px solid #a97550; border-radius:10px;
      box-shadow:inset 0 0 0 5px #76513d, inset 0 0 0 7px #091827, 0 24px 70px #020914d9; }
    #salka-stall-panel header { display:grid; grid-template-columns:1fr auto; gap:5px 12px;
      padding:18px 20px 14px; background:#0d2238; border-bottom:1px dashed #a9755099; }
    #salka-stall-title { margin:0; color:#ffe2a1; font-size:21px; letter-spacing:.02em; }
    #salka-stall-subtitle { grid-column:1; margin:0; color:#a9c6d9; font-size:13px; }
    #salka-stall-coins { align-self:center; color:#091827; background:#ffba5c; border:1px solid #ffe2a1;
      border-radius:4px; padding:4px 9px; font-weight:900; white-space:nowrap; }
    #salka-stall-close { grid-column:2; grid-row:1; align-self:start; color:#edf8ff; background:#193d59;
      border:1px solid #8eacc6; border-radius:5px; padding:6px 10px; font:inherit; font-weight:800; cursor:pointer; }
    #salka-stall-grid { display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:12px;
      padding:16px 18px 10px; }
    .salka-crate { position:relative; display:grid; justify-items:center; gap:7px; min-width:0;
      padding:15px 10px 11px; background:#193d59; border:3px solid #76513d; border-radius:6px;
      box-shadow:inset 0 0 0 2px #a9755070; }
    .salka-crate::before, .salka-crate::after { content:''; position:absolute; left:5px; right:5px;
      height:3px; background:#a9755088; }
    .salka-crate::before { top:8px; } .salka-crate::after { bottom:8px; }
    .salka-crate img { width:64px; height:64px; object-fit:contain; image-rendering:pixelated;
      filter:drop-shadow(0 5px 4px #020914a6); }
    .salka-crate-swatch { width:44px; height:5px; border:1px solid #f7fbff55; border-radius:2px; }
    .salka-crate-label { text-align:center; font-weight:900; line-height:1.15; }
    .salka-crate-price { color:#ffe2a1; font-size:13px; font-weight:800; }
    .salka-crate-buy { width:100%; margin-top:2px; padding:7px 9px; color:#091827; background:#ffba5c;
      border:1px solid #ffe2a1; border-radius:4px; font:inherit; font-weight:900; cursor:pointer; }
    .salka-crate-buy:disabled { color:#9fb3c2; background:#334a58; border-color:#60758b; cursor:default; }
    #salka-stall-status { min-height:20px; margin:0; padding:2px 18px 17px; color:#c8f4ff;
      text-align:center; font-size:13px; font-weight:700; }
    #salka-stall-close:focus-visible, .salka-crate-buy:focus-visible { outline:2px solid #7fd6ff; outline-offset:3px; }
    @media (max-width:430px) { #salka-stall-grid { gap:8px; padding-inline:10px; }
      .salka-crate { padding-inline:7px; } #salka-stall-panel header { padding-inline:14px; } }
  `;
  document.head.appendChild(style);
}

function buildDom() {
  const overlay = document.createElement('div');
  overlay.id = 'salka-stall-overlay';
  overlay.className = 'hidden';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'salka-stall-title');

  const panel = document.createElement('section');
  panel.id = 'salka-stall-panel';
  const header = document.createElement('header');
  const title = document.createElement('h2');
  title.id = 'salka-stall-title';
  title.textContent = 'The Driftwood Gull — Cargo Ledger';
  const subtitle = document.createElement('p');
  subtitle.id = 'salka-stall-subtitle';
  subtitle.textContent = 'Two crates unlashed. The tide chooses tomorrow’s stock.';
  const coins = document.createElement('span');
  coins.id = 'salka-stall-coins';
  coins.setAttribute('aria-live', 'polite');
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.id = 'salka-stall-close';
  closeBtn.textContent = 'Close ×';
  const grid = document.createElement('div');
  grid.id = 'salka-stall-grid';
  const status = document.createElement('p');
  status.id = 'salka-stall-status';
  status.setAttribute('aria-live', 'polite');
  header.append(title, coins, subtitle, closeBtn);
  panel.append(header, grid, status);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);
  return { overlay, closeBtn, coins, grid, status };
}

/**
 * @param {{getStock:()=>object[],getCoins:()=>number,isOwned:(id:string)=>boolean,
 *   onBuy:(item:object)=>({ok:boolean,message?:string}|void)}} opts
 */
export function createTraderStall(opts) {
  Object.assign(cb, opts);
  if (instance) return instance;
  injectStyles();
  const { overlay, closeBtn, coins, grid, status } = buildDom();
  let lastFocused = null;

  function render(message = '') {
    coins.textContent = `${cb.getCoins?.() ?? 0} coins`;
    status.textContent = message;
    const stock = (cb.getStock?.() ?? []).slice(0, 2);
    grid.replaceChildren(...stock.map((item) => {
      const owned = Boolean(cb.isOwned?.(item.id));
      const affordable = (cb.getCoins?.() ?? 0) >= item.price;
      const card = document.createElement('article');
      card.className = 'salka-crate';
      const img = document.createElement('img');
      img.src = `./assets/cosmetics/${item.slot}-${item.id}.png`;
      img.alt = '';
      img.setAttribute('aria-hidden', 'true');
      const swatch = document.createElement('span');
      swatch.className = 'salka-crate-swatch';
      swatch.style.background = item.tint;
      const label = document.createElement('span');
      label.className = 'salka-crate-label';
      label.textContent = item.label;
      const price = document.createElement('span');
      price.className = 'salka-crate-price';
      price.textContent = owned ? 'Already owned' : `${item.price} coins`;
      const buy = document.createElement('button');
      buy.type = 'button';
      buy.className = 'salka-crate-buy';
      buy.textContent = owned ? 'Owned' : affordable ? 'Buy & equip' : 'Not enough coins';
      buy.disabled = owned || !affordable;
      buy.setAttribute('aria-label', owned ? `${item.label} already owned` : `Buy and equip ${item.label} for ${item.price} coins`);
      buy.onclick = () => {
        const result = cb.onBuy?.(item) ?? { ok: false };
        render(result.message ?? (result.ok ? `${item.label} added to your wardrobe.` : 'That purchase did not go through.'));
      };
      card.append(img, swatch, label, price, buy);
      return card;
    }));
  }

  function close() {
    overlay.classList.add('hidden');
    const toFocus = lastFocused;
    lastFocused = null;
    toFocus?.focus?.();
  }
  function open() {
    lastFocused = document.activeElement;
    render();
    overlay.classList.remove('hidden');
    closeBtn.focus();
  }
  const isOpen = () => !overlay.classList.contains('hidden');
  closeBtn.onclick = close;
  overlay.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); });
  instance = { open, close, isOpen, refresh: render };
  return instance;
}
