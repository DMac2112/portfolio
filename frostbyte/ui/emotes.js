// ui/emotes.js — the HUD emote bar (Chat & Emotes §Emotes). Emotes are cosmetic, LOCAL, and
// symbol-based: the S2 layered avatar sheet has no emote animation row (per Avatar §3, an emote is a
// UI-layer overlay/tween, not new body frames), so main.js renders each as a floating symbol + a
// small bob over the player. This module just builds the clickable bar; keys 1–N are wired in main.js.
import { EMOTES } from '../content/cosmetics.js';

export const EMOTE_SYMBOLS = { wave: '👋', dance: '🎵', sit: '🪑', sleep: '💤', heart: '❤️' };
export function emoteSymbol(id) { return EMOTE_SYMBOLS[id] ?? '✨'; }

/**
 * Populates the #emote-bar HUD container with one focusable button per emote.
 * @param {{ onEmote: (emoteId: string) => void }} opts
 * @returns {{ ids: string[] }} the emote id order (so main.js can bind number keys 1..N)
 */
export function createEmotes({ onEmote }) {
  const ids = EMOTES.map((e) => e.id);
  const bar = document.getElementById('emote-bar');
  if (!bar) return { ids };
  bar.replaceChildren(...EMOTES.map((e, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'emote-btn';
    b.textContent = emoteSymbol(e.id);
    b.title = `${e.id} (${i + 1})`;
    b.setAttribute('aria-label', `Emote: ${e.id} (key ${i + 1})`);
    b.onclick = () => onEmote(e.id);
    return b;
  }));
  return { ids };
}
