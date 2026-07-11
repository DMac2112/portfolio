// Seeded 32-bit LCG, project-standard constants (matches os/src/os/games/{mines,flappy,bubble,pasjans}).
// Deterministic: same seed -> same stream, forever. Never Math.random() in gameplay logic.

export function nextRng(seed) {
  return (seed * 1664525 + 1013904223) >>> 0;
}

// Draws an integer in [0, bound). Returns { value, seed: nextSeed } so callers thread state explicitly.
export function nextInt(seed, bound) {
  const nextSeed = nextRng(seed);
  return { value: (nextSeed >>> 16) % bound, seed: nextSeed };
}

// Draws a float in [0, 1).
export function nextFloat(seed) {
  const nextSeed = nextRng(seed);
  return { value: (nextSeed >>> 8) / 0x1000000, seed: nextSeed };
}
