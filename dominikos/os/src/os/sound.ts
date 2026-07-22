// Runtime-synthesized UI tones (DOMINIKOS-PLAN §5.8): we ship ZERO sound files — short,
// original WebAudio chimes only. One shared AudioContext, created lazily on a user gesture
// (mobile autoplay policy). Callers gate on prefs.muted; sound is opt-in (§11.3).
let ctx: AudioContext | null = null;

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
  return ctx;
}

/** Low-level synth voice — exported so in-app games (Space Pinball) share the one AudioContext.
 *  Returns a cancel function so future-scheduled cues (Dialtone's ring/busy tails) can be
 *  silenced when their window deactivates (§8.4); most callers just ignore it. */
export function tone(at: number, freq: number, dur: number, gainPeak: number, type: OscillatorType = 'sine'): () => void {
  const a = ac();
  if (!a) return () => {};
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, a.currentTime + at);
  gain.gain.linearRampToValueAtTime(gainPeak, a.currentTime + at + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + at + dur);
  osc.connect(gain).connect(a.destination);
  osc.start(a.currentTime + at);
  osc.stop(a.currentTime + at + dur + 0.05);
  return () => {
    try {
      gain.gain.cancelScheduledValues(0);
      gain.gain.value = 0;
      osc.stop();
      gain.disconnect();
    } catch {
      /* already stopped */
    }
  };
}

export const sound = {
  /** warm rising logon chime (original composition — nothing sampled) */
  logon(): void {
    tone(0.0, 392, 0.5, 0.12);
    tone(0.12, 523.25, 0.55, 0.12);
    tone(0.26, 659.25, 0.7, 0.11);
    tone(0.42, 783.99, 0.9, 0.09);
  },
  /** descending shutdown motif */
  shutdown(): void {
    tone(0.0, 659.25, 0.45, 0.11);
    tone(0.14, 523.25, 0.5, 0.1);
    tone(0.3, 392, 0.8, 0.09);
  },
  /** tiny UI click */
  click(): void {
    tone(0, 1400, 0.05, 0.05, 'square');
  },
  /** soft error ding */
  ding(): void {
    tone(0, 880, 0.28, 0.09);
    tone(0.04, 587.33, 0.3, 0.07);
  },
};
