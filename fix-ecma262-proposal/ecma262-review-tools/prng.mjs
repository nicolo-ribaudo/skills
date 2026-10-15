// Generic seeded PRNG helpers for fuzz generators. Not specific to any proposal.
//
//   import { rng } from './prng.mjs';
//   const r = rng(seed);
//   r.int(5); r.chance(0.3); r.pick(['a', 'b']); r.shuffle([...xs]);

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rng(seed) {
  const next = mulberry32(seed);
  const int = (n) => Math.floor(next() * n);
  return {
    next,
    int,
    chance: (p) => next() < p,
    pick: (xs) => xs[int(xs.length)],
    // In-place Fisher-Yates; returns the same array.
    shuffle: (xs) => {
      for (let i = xs.length - 1; i > 0; i -= 1) {
        const j = int(i + 1);
        [xs[i], xs[j]] = [xs[j], xs[i]];
      }
      return xs;
    },
  };
}
