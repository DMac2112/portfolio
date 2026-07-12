// engine/chat.js — PURE local speech-bubble queue for the player "Say" panel (Frostbyte local
// chat). No DOM, no KAPLAY, no wall clock — the caller supplies dtMs each tick (mirrors save.js's
// injected-time discipline) and an out-param `ev` array to observe add/evict events (mirrors
// economy.js's ev-array convention).
//
// SAFETY: this module never transmits text anywhere. It only ages and FIFO-evicts an in-memory
// queue of {speaker, text} bubbles; `active()` hands the renderer a read-only snapshot. There is
// no fetch/XHR/WebSocket/postMessage here, nor should there ever be — chat text stays on-device.

export const MAX_BUBBLES = 6;      // across the whole scene
export const DEFAULT_TTL = 3200;   // ms
export const FADE_MS = 600;        // fade-out window at end of life

/** @typedef {{id:number, speaker:string, text:string, ttlMs:number, ageMs:number}} Bubble
 *  @typedef {{bubbles:Bubble[], nextId:number}} ChatState */

/** @returns {ChatState} a fresh, empty chat state. */
export function newChat() {
  return { bubbles: [], nextId: 0 };
}

/** Append a bubble; FIFO-evict the oldest while length > MAX_BUBBLES. Mutates state, returns it.
 *  Pushes {type:'add',id} (and {type:'evict',id} per drop) into `ev` if `ev` array is provided. */
export function addBubble(state, { speaker, text, ttlMs = DEFAULT_TTL }, ev) {
  const id = state.nextId;
  state.nextId += 1;
  state.bubbles.push({ id, speaker, text, ttlMs, ageMs: 0 });
  ev?.push({ type: 'add', id });
  while (state.bubbles.length > MAX_BUBBLES) {
    const dropped = state.bubbles.shift();
    ev?.push({ type: 'evict', id: dropped.id });
  }
  return state;
}

/** Age every bubble by dtMs; drop expired (ageMs >= ttlMs). Mutate-in-place, return SAME state ref.
 *  Early-return the same ref (no work) when dtMs <= 0 OR state.bubbles.length === 0. */
export function tick(state, dtMs) {
  if (dtMs <= 0 || state.bubbles.length === 0) return state;
  // Iterate backwards so splicing out an expired bubble never disturbs the index of one not yet visited.
  for (let i = state.bubbles.length - 1; i >= 0; i--) {
    const b = state.bubbles[i];
    b.ageMs += dtMs;
    if (b.ageMs >= b.ttlMs) state.bubbles.splice(i, 1);
  }
  return state;
}

/** Snapshot for the renderer: [{id, speaker, text, alpha}] where alpha fades from 1 down to 0 across
 *  the final FADE_MS of a bubble's life (alpha = remain >= FADE_MS ? 1 : max(0, remain/FADE_MS)). */
export function active(state) {
  return state.bubbles.map((b) => {
    const remain = b.ttlMs - b.ageMs;
    const alpha = remain >= FADE_MS ? 1 : Math.max(0, remain / FADE_MS);
    return { id: b.id, speaker: b.speaker, text: b.text, alpha };
  });
}
