// Short synthesized bells; gesture-only and harmless when Web Audio is blocked.
let context = null;
const frequencies = [196, 294, 392];

export function playBell(lane, isMuted) {
  if (isMuted?.()) return;
  try {
    const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Audio) return;
    context ??= new Audio();
    if (context.state === 'suspended') context.resume().catch(() => {});
    const now = context.currentTime;
    for (const [multiple, volume] of [[1, 0.12], [2.01, 0.035], [3.02, 0.012]]) {
      const oscillator = context.createOscillator();
      const envelope = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequencies[lane] * multiple;
      envelope.gain.setValueAtTime(volume, now);
      envelope.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      oscillator.connect(envelope).connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.56);
    }
  } catch {
    // Audio is optional (headless tests, blocked autoplay, and unavailable devices).
  }
}
