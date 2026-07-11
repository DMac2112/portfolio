// callMachine.ts — pure, time-injected call state machine (LOCKED, unit-tested).
// No wall clock, no DOM, no timers: the UI feeds tick(dtMs) from a §8.4-gated interval,
// so a backgrounded call simply stops advancing and resumes cleanly.
// There is deliberately NO answer() transition — the callee never picks up. That's the joke.

export type CallPhase = 'idle' | 'dialing' | 'ringing' | 'noanswer' | 'ended';

export interface CallState {
  phase: CallPhase;
  contactId: string | null;
  elapsed: number; // ms since dial(), including the dialing beat
  rings: number;   // ring cues fired so far (1..MAX_RINGS)
}

export const DIAL_MS = 1200; // "Calling…" beat before it starts ringing
export const RING_MS = 3200; // one ring cycle
export const MAX_RINGS = 8;  // after this many unanswered rings -> 'noanswer'

export function newCall(): CallState {
  return { phase: 'idle', contactId: null, elapsed: 0, rings: 0 };
}

/** Start a call. Only from a settled phase (idle/noanswer/ended); dialing mid-call is ignored. */
export function dial(s: CallState, contactId: string): CallState {
  if (s.phase === 'dialing' || s.phase === 'ringing') return s;
  return { phase: 'dialing', contactId, elapsed: 0, rings: 0 };
}

/** Advance time. dialing→ringing after DIAL_MS; ring #k fires at DIAL_MS+(k-1)·RING_MS;
 *  after MAX_RINGS full cycles → noanswer. No-op (same reference) in idle/noanswer/ended. */
export function tick(s: CallState, dtMs: number): CallState {
  if ((s.phase !== 'dialing' && s.phase !== 'ringing') || !(dtMs > 0)) return s;
  const elapsed = s.elapsed + dtMs;
  if (elapsed < DIAL_MS) return { ...s, elapsed };
  if (elapsed >= DIAL_MS + MAX_RINGS * RING_MS) {
    return { ...s, phase: 'noanswer', elapsed, rings: MAX_RINGS };
  }
  const rings = Math.floor((elapsed - DIAL_MS) / RING_MS) + 1;
  return { ...s, phase: 'ringing', elapsed, rings };
}

/** Hang up: ends any in-call phase (dialing/ringing/noanswer). No-op when idle/ended. */
export function hangup(s: CallState): CallState {
  if (s.phase === 'idle' || s.phase === 'ended') return s;
  return { ...s, phase: 'ended' };
}
