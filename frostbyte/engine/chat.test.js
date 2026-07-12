import { describe, it, expect } from 'vitest';
import { newChat, addBubble, tick, active, MAX_BUBBLES, DEFAULT_TTL, FADE_MS } from './chat.js';

describe('addBubble — FIFO eviction', () => {
  it('keeps at most MAX_BUBBLES bubbles, dropping the oldest first', () => {
    const state = newChat();
    const ev = [];
    for (let i = 0; i < 7; i++) {
      addBubble(state, { speaker: 'you', text: `msg-${i}` }, ev);
    }
    const snapshot = active(state);
    expect(snapshot.length).toBe(6);
    expect(MAX_BUBBLES).toBe(6); // sanity-check the constant the spec is keyed on
    expect(snapshot.some((b) => b.text === 'msg-0')).toBe(false); // oldest dropped
    expect(snapshot.some((b) => b.text === 'msg-6')).toBe(true);  // newest kept
    expect(ev.filter((e) => e.type === 'evict').length).toBe(1);
  });
});

describe('tick — lifetime', () => {
  it('keeps a bubble alive right up to ttlMs, then drops it once reached', () => {
    const state = newChat();
    addBubble(state, { speaker: 'you', text: 'hi', ttlMs: 1000 });

    tick(state, 333);
    tick(state, 333);
    tick(state, 333); // 999ms total — still just alive
    expect(active(state).length).toBe(1);

    tick(state, 1); // 1000ms total — now expired
    expect(active(state).length).toBe(0);
  });
});

describe('tick — no-op reference stability', () => {
  it('returns the exact same state reference when there is nothing to do', () => {
    const empty = newChat();
    expect(tick(empty, 100)).toBe(empty);

    const withBubbles = newChat();
    addBubble(withBubbles, { speaker: 'you', text: 'hi' });
    expect(tick(withBubbles, 0)).toBe(withBubbles);
  });
});

describe('active — alpha fade', () => {
  it('is 1 with plenty of life left, fades within the final FADE_MS, and never increases', () => {
    const state = newChat();
    addBubble(state, { speaker: 'you', text: 'hi', ttlMs: 1000 });

    tick(state, 100); // 900ms remaining — well outside FADE_MS(600)
    expect(active(state)[0].alpha).toBe(1);

    tick(state, 700); // 200ms remaining — inside the fade window
    const midAlpha = active(state)[0].alpha;
    expect(midAlpha).toBeGreaterThan(0);
    expect(midAlpha).toBeLessThan(1);
    expect(FADE_MS).toBe(600); // sanity-check the constant the spec is keyed on

    // Monotonic: sample every 50ms down to expiry, alpha must never increase.
    let prevAlpha = midAlpha;
    let remaining = 200;
    while (remaining > 0) {
      const step = Math.min(50, remaining);
      tick(state, step);
      remaining -= step;
      const snap = active(state);
      const alpha = snap.length ? snap[0].alpha : 0;
      expect(alpha).toBeLessThanOrEqual(prevAlpha);
      prevAlpha = alpha;
    }
    expect(prevAlpha).toBe(0);
  });
});

describe('determinism', () => {
  it('two identical scripted addBubble/tick sequences produce equal active() output', () => {
    function run() {
      const state = newChat();
      addBubble(state, { speaker: 'you', text: 'hi' });
      tick(state, 500);
      addBubble(state, { speaker: 'you', text: 'there' });
      tick(state, 500);
      addBubble(state, { speaker: 'you', text: 'friend', ttlMs: DEFAULT_TTL });
      tick(state, 2300); // pushes the first bubble past DEFAULT_TTL(3200) -> it expires mid-script
      return active(state);
    }
    expect(run()).toEqual(run());
  });
});
