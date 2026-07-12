// content/chat-phrases.js — DATA for the player "Say" quick-menu (ui/chat.js). Original, whimsical,
// wholesome phrasing only — no reused dialogue, no randomness (deterministic exports).
//
// `soften` is a small client-side politeness pass over free-typed text. It is a POLISH NICETY, NOT
// a safety mechanism — safety here comes entirely from chat text never leaving the device (see
// engine/chat.js and ui/chat.js). It exists purely so a stray mild word doesn't render unsoftened in
// a player's own local speech bubble.

export const CHAT_PHRASES = [
  'Hi there!',
  'Nice hat!',
  'Wanna play?',
  'Brrr, chilly today!',
  'Race you to the plaza!',
  'Love your scarf!',
  'This snow is perfect!',
  'High flipper!',
  'Best hangout ever!',
  'Catch!',
  'Slide with me!',
  'See you around!',
];

// Short, mild word-list — intentionally not exhaustive (see file header: this is a nicety, not a
// safety boundary). Case-insensitive, whole-word-ish match via \b so it doesn't clip inside other
// words (e.g. "hello" is untouched even though it contains no listed word).
const SOFTEN_WORDS = ['damn', 'hell', 'crap', 'suck', 'stupid', 'dumb'];
const SOFTEN_PATTERN = new RegExp(`\\b(?:${SOFTEN_WORDS.join('|')})\\b`, 'gi');

/**
 * Replaces a small word-list with '❄❄❄', case-insensitively, whole-word-ish. Pure; never throws —
 * non-string input is treated as empty.
 * @param {string} text
 * @returns {string}
 */
export function soften(text) {
  if (typeof text !== 'string') return '';
  return text.replace(SOFTEN_PATTERN, '❄❄❄');
}
