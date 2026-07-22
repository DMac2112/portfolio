// ui/telescope.js — Palefire's painted vista viewer (World Plan W4). Singleton DOM, date selection
// injected by main.js, and no game-state mutation inside the presentation layer.

let stylesInjected = false;
let instance = null;
const cb = { getVista: () => null, onView: () => {} };

function injectStyles() {
  if (stylesInjected) return;
  stylesInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    #telescope-overlay { position:fixed; inset:0; z-index:36; display:grid; place-items:center;
      padding:14px; background:#020914e8; font-family:inherit; }
    #telescope-overlay.hidden { display:none; }
    #telescope-panel { width:min(660px, 96vw); color:#edf8ff; text-align:center; }
    #telescope-aperture { position:relative; width:min(600px, 90vw); aspect-ratio:16/10; margin:auto;
      overflow:hidden; border:10px solid #76513d; border-radius:50%; background:#091827;
      box-shadow:0 0 0 4px #ffba5c, 0 0 0 10px #122a42, 0 24px 70px #000c; }
    #telescope-aperture::before { content:''; position:absolute; inset:10px; z-index:2;
      border:2px solid #ffe2a166; border-radius:50%; pointer-events:none; }
    #telescope-aperture::after { content:''; position:absolute; inset:0; z-index:2; border-radius:50%;
      box-shadow:inset 0 0 54px 24px #020914b8; pointer-events:none; }
    #telescope-image { width:100%; height:100%; object-fit:cover; image-rendering:pixelated; display:block; }
    #telescope-copy { width:min(520px, 88vw); margin:-2px auto 0; padding:16px 22px 14px;
      background:#13293a; border:2px solid #a97550; border-top:none; border-radius:0 0 9px 9px;
      box-shadow:0 12px 30px #020914b8; }
    #telescope-title { margin:0 0 6px; color:#ffe2a1; font-size:20px; }
    #telescope-body { margin:0; color:#cfe0f2; line-height:1.45; }
    #telescope-close { margin-top:12px; padding:8px 18px; color:#091827; background:#ffba5c;
      border:2px solid #ffe2a1; border-radius:5px; font:inherit; font-weight:900; cursor:pointer; }
    #telescope-close:focus-visible { outline:3px solid #7fd6ff; outline-offset:4px; }
    @media (prefers-reduced-motion:no-preference) { #telescope-aperture { animation:telescope-focus .22s ease-out; }
      @keyframes telescope-focus { from { opacity:.3; transform:scale(.96); } to { opacity:1; transform:none; } } }
  `;
  document.head.appendChild(style);
}

function buildDom() {
  const overlay = document.createElement('div');
  overlay.id = 'telescope-overlay';
  overlay.className = 'hidden';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'telescope-title');
  const panel = document.createElement('section');
  panel.id = 'telescope-panel';
  const aperture = document.createElement('div');
  aperture.id = 'telescope-aperture';
  const image = document.createElement('img');
  image.id = 'telescope-image';
  image.alt = '';
  aperture.appendChild(image);
  const copy = document.createElement('div');
  copy.id = 'telescope-copy';
  const title = document.createElement('h2');
  title.id = 'telescope-title';
  const body = document.createElement('p');
  body.id = 'telescope-body';
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.id = 'telescope-close';
  closeBtn.textContent = 'Lower the telescope';
  copy.append(title, body, closeBtn);
  panel.append(aperture, copy);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);
  return { overlay, image, title, body, closeBtn };
}

/** @param {{getVista:()=>object|null,onView?:(vista:object)=>void}} opts */
export function createTelescope(opts) {
  Object.assign(cb, opts);
  if (instance) return instance;
  injectStyles();
  const { overlay, image, title, body, closeBtn } = buildDom();
  let lastFocused = null;

  function close() {
    overlay.classList.add('hidden');
    const focusTarget = lastFocused;
    lastFocused = null;
    focusTarget?.focus?.();
  }
  function open() {
    const vista = cb.getVista?.();
    if (!vista) return;
    lastFocused = document.activeElement;
    image.src = vista.asset;
    image.alt = vista.title;
    title.textContent = vista.title;
    body.textContent = vista.copy;
    overlay.classList.remove('hidden');
    closeBtn.focus();
    cb.onView?.(vista);
  }
  const isOpen = () => !overlay.classList.contains('hidden');
  closeBtn.onclick = close;
  overlay.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); });
  instance = { open, close, isOpen };
  return instance;
}
