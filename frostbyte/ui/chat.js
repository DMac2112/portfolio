// ui/chat.js — the player's local "Say" panel: quick phrases + free text, rendered as a DOM overlay
// this module builds and owns itself (document.createElement, appended to document.body). Unlike
// ui/dress-up.js's controller — which looks up markup already sitting in index.html — this one is
// fully self-mounting so no other file needs to be edited to wire it in. Styling is injected once
// via a <style> tag that reuses index.html's CSS variables (--accent, --panel, --bg) so the panel
// matches the rest of the HUD, and follows the same .hidden-class toggle convention as the other
// overlays (#dialogue-overlay, #customize-overlay).
//
// SAFETY: this file contains no fetch/XHR/WebSocket/postMessage and never should. The only thing it
// does with player text is hand the final local string to the caller-supplied `onSay`, which renders
// it as the player's own local speech bubble. Chat text never leaves this device from here.
import { CHAT_PHRASES, soften } from '../content/chat-phrases.js';

const MAX_LEN = 60;
let stylesInjected = false;

// Singleton state (Home Plan §8.1): `k.scene('room', …)` re-runs on every room change and every
// return from a minigame, and each run used to call createChat(...) again, appending a brand-new
// #chat-overlay to <body> — duplicate ids, stale onSay closures, and eventually one open() call
// per every past instance. `instance` caches the DOM/listeners built on the FIRST call ever;
// `boundOpts` is a mutable ref every handler below reads through, rebound on EVERY call (including
// the first) so a later scene entry's fresh `onSay` closure always wins, even though the DOM/listeners
// underneath are never rebuilt.
let instance = null;
const boundOpts = { onSay: null };

function injectStyles() {
  if (stylesInjected) return; // idempotent: only ever add the <style> tag once per page
  stylesInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    #chat-overlay { position:fixed; inset:0; z-index:32; display:flex; align-items:center;
      justify-content:center; padding:16px; background:#0009; font-family:inherit; }
    #chat-overlay.hidden { display:none; }
    #chat-panel { width:min(420px, 96vw); max-height:90vh; overflow:auto; background:#fbfbfe;
      color:#1a1a22; border-radius:16px; box-shadow:0 18px 50px #000a;
      border:3px solid var(--panel, #0d1c2b); padding:16px 18px; }
    #chat-panel header { display:flex; align-items:center; gap:12px; margin-bottom:12px; }
    #chat-title { margin:0; font-size:20px; flex:1; }
    #chat-close { font:inherit; font-weight:700; border:2px solid var(--panel, #0d1c2b);
      background:var(--bg, #122a42); color:#fff; border-radius:10px; padding:7px 12px; cursor:pointer; }
    #chat-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(120px, 1fr)); gap:8px;
      margin-bottom:14px; }
    .chat-phrase-btn { font:inherit; font-weight:700; font-size:13px; border:2px solid #cdd6e0;
      background:#fff; color:#1a1a22; border-radius:10px; padding:8px 10px; cursor:pointer; text-align:left; }
    .chat-phrase-btn:hover, .chat-phrase-btn:focus-visible { border-color:var(--accent, #7fd6ff);
      background:#eef9ff; outline:none; }
    #chat-form { display:flex; gap:8px; }
    #chat-input { flex:1; min-width:0; font:inherit; font-size:14px; border:2px solid #cdd6e0;
      border-radius:10px; padding:8px 10px; background:#fff; color:#1a1a22; }
    #chat-say { font:inherit; font-weight:700; border:2px solid var(--panel, #0d1c2b);
      background:var(--accent, #7fd6ff); color:#0d1c2b; border-radius:10px; padding:8px 14px;
      cursor:pointer; white-space:nowrap; }
    #chat-say:active { transform:translateY(1px); }
  `;
  document.head.appendChild(style);
}

// Builds the overlay markup from scratch and appends it to <body>. No index.html element is read.
function buildDom() {
  const overlay = document.createElement('div');
  overlay.id = 'chat-overlay';
  overlay.className = 'hidden';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'chat-title');

  const panel = document.createElement('div');
  panel.id = 'chat-panel';

  const header = document.createElement('header');
  const title = document.createElement('h2');
  title.id = 'chat-title';
  title.textContent = 'Say something';
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.id = 'chat-close';
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.textContent = 'Close ✕';
  header.append(title, closeBtn);

  const grid = document.createElement('div');
  grid.id = 'chat-grid';
  grid.setAttribute('role', 'group');
  grid.setAttribute('aria-label', 'Quick phrases');

  const form = document.createElement('form');
  form.id = 'chat-form';
  const input = document.createElement('input');
  input.id = 'chat-input';
  input.type = 'text';
  input.maxLength = MAX_LEN;
  input.placeholder = 'Type something friendly…';
  input.setAttribute('aria-label', 'Message');
  input.autocomplete = 'off';
  const sayBtn = document.createElement('button');
  sayBtn.type = 'submit';
  sayBtn.id = 'chat-say';
  sayBtn.textContent = 'Say';
  form.append(input, sayBtn);

  panel.append(header, grid, form);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  return { overlay, closeBtn, grid, form, input };
}

/**
 * @param {{ onSay: (text:string) => void }} opts  onSay is called with the FINAL string to speak
 *   (already trimmed, capped to 60 chars, and soften()-ed). The caller renders the bubble; this UI
 *   NEVER sends text anywhere.
 * @returns {{ open:()=>void, close:()=>void, isOpen:()=>boolean }}  the SAME instance object on
 *   every call, once built (singleton — see `instance`/`boundOpts` above).
 */
export function createChat(opts) {
  boundOpts.onSay = opts.onSay; // rebind every call, even repeats — cheap, and keeps this in sync
  if (instance) return instance; // already built: DOM/listeners stay exactly as they are

  injectStyles();
  const { overlay, closeBtn, grid, form, input } = buildDom();

  function close() {
    overlay.classList.add('hidden');
  }
  function open() {
    overlay.classList.remove('hidden');
    input.value = '';
    input.focus();
  }
  const isOpen = () => !overlay.classList.contains('hidden');

  // Quick phrases are pre-vetted, author-written, and already short — sent as-is (Panel contents
  // contract: onSay(phrase) then close), no trim/cap/soften needed.
  function sayPhrase(phrase) {
    boundOpts.onSay(phrase);
    close();
  }

  // Free text is the only untrusted-shape input here, so it gets the full trim -> cap -> soften
  // pipeline before ever reaching onSay. Empty/whitespace-only input does nothing.
  function sayFreeText() {
    const trimmed = input.value.trim().slice(0, MAX_LEN);
    if (!trimmed) return;
    boundOpts.onSay(soften(trimmed));
    input.value = '';
    close();
  }

  for (const phrase of CHAT_PHRASES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chat-phrase-btn';
    btn.textContent = phrase;
    btn.onclick = () => sayPhrase(phrase);
    grid.appendChild(btn);
  }

  // <form> submit covers both the Say button click and pressing Enter in the input.
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    sayFreeText();
  });
  closeBtn.onclick = close;
  overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  instance = { open, close, isOpen };
  return instance;
}
