import { describe, it, expect } from 'vitest';
import { nextRng, nextInt, nextFloat } from './rng.js';

describe('rng', () => {
  it('is deterministic: same seed -> same stream', () => {
    const seedA = [2600, 2600].map((s) => nextRng(s));
    expect(seedA[0]).toBe(seedA[1]);
  });

  it('produces a 20-step stream identical across two runs from the same seed', () => {
    const run = (seed) => {
      let s = seed;
      const out = [];
      for (let i = 0; i < 20; i++) {
        s = nextRng(s);
        out.push(s);
      }
      return out;
    };
    expect(run(2600)).toEqual(run(2600));
  });

  it('different seeds diverge', () => {
    expect(nextRng(2600)).not.toBe(nextRng(1337));
  });

  it('stays within uint32 range', () => {
    let s = 2600;
    for (let i = 0; i < 50; i++) {
      s = nextRng(s);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(0xffffffff);
    }
  });

  it('nextInt draws are within [0, bound) and threaded seed advances', () => {
    let seed = 2600;
    for (let i = 0; i < 100; i++) {
      const draw = nextInt(seed, 10);
      expect(draw.value).toBeGreaterThanOrEqual(0);
      expect(draw.value).toBeLessThan(10);
      expect(draw.seed).not.toBe(seed);
      seed = draw.seed;
    }
  });

  it('nextInt distribution is not degenerate (hits more than one bucket over 200 draws)', () => {
    let seed = 2600;
    const seen = new Set();
    for (let i = 0; i < 200; i++) {
      const draw = nextInt(seed, 6);
      seen.add(draw.value);
      seed = draw.seed;
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it('nextFloat draws are within [0, 1)', () => {
    let seed = 2600;
    for (let i = 0; i < 50; i++) {
      const draw = nextFloat(seed);
      expect(draw.value).toBeGreaterThanOrEqual(0);
      expect(draw.value).toBeLessThan(1);
      seed = draw.seed;
    }
  });
});
