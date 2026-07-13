// ui/emotes.js — the HUD emote bar (Chat & Emotes §Emotes). Emotes are cosmetic, LOCAL, and
// symbol-based: the S2 layered avatar sheet has no emote animation row (per Avatar §3, an emote is a
// UI-layer overlay/tween, not new body frames), so main.js renders each as a floating symbol + a
// small bob over the player. This module just builds the clickable bar; keys 1–N are wired in main.js.
import { EMOTES } from '../content/cosmetics.js';

export const EMOTE_SYMBOLS = { wave: '👋', dance: '🎵', sit: '🪑', sleep: '💤', heart: '❤️' };
export function emoteSymbol(id) { return EMOTE_SYMBOLS[id] ?? '✨'; }

// Singleton state (Home Plan §8.1): `k.scene('room', …)` re-runs on every room change and every
// return from a minigame, and each run used to call createEmotes(...) again. `bar.replaceChildren`
// already wipes the old buttons before adding new ones, so button count never actually grew — but
// the bar was still torn down and rebuilt every scene entry, and a fresh `{ids}` object (not the
// same instance) was returned each time. `instance` caches the bar built on the FIRST call ever;
// `boundOpts` is a mutable ref every button's onclick reads through, rebound on EVERY call.
let instance = null;
const boundOpts = { onEmote: null };

/**
 * Populates the #emote-bar HUD container with one focusable button per emote.
 * @param {{ onEmote: (emoteId: string) => void }} opts
 * @returns {{ ids: string[] }} the emote id order (so main.js can bind number keys 1..N) — the
 *   SAME instance object on every call, once built.
 */
export function createEmotes(opts) {
  boundOpts.onEmote = opts.onEmote; // rebind every call, even repeats
  if (instance) return instance; // already built: the bar's buttons stay exactly as they are

  const ids = EMOTES.map((e) => e.id);
  const bar = document.getElementById('emote-bar');
  if (!bar) return { ids }; // no HUD in this environment — nothing to build or cache as a singleton

  bar.replaceChildren(...EMOTES.map((e, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'emote-btn';
    b.textContent = emoteSymbol(e.id);
    b.title = `${e.id} (${i + 1})`;
    b.setAttribute('aria-label', `Emote: ${e.id} (key ${i + 1})`);
    b.onclick = () => boundOpts.onEmote(e.id);
    return b;
  }));
  instance = { ids };
  return instance;
}
