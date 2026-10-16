// Small, seedable randomness for NeilAI. A seeded generator keeps a chat's
// suggestions stable while it's open (and testable), while a fresh seed per
// visit, per opening and per round keeps them from ever feeling canned.

export type Rng = () => number;

/** mulberry32: tiny, fast and good enough for shuffling chips. Returns [0, 1). */
export function seeded(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a, so strings (page paths, topics) can feed a seed. */
export function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Folds several numbers into one seed. */
export function mix(...parts: number[]): number {
  let h = 0x9e3779b9;
  for (const p of parts) {
    h ^= p >>> 0;
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    h ^= h >>> 16;
  }
  return h >>> 0;
}

/** A new random seed. Browser and server only — never call it while rendering. */
export function freshSeed(): number {
  try {
    return crypto.getRandomValues(new Uint32Array(1))[0];
  } catch {
    return Math.floor(Math.random() * 4294967296);
  }
}

export const pick = <T>(items: readonly T[], rng: Rng = Math.random): T => items[Math.floor(rng() * items.length)];

/** Fisher–Yates on a copy. */
export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** `n` distinct items, in random order. */
export const sample = <T>(items: readonly T[], n: number, rng: Rng = Math.random): T[] => shuffle(items, rng).slice(0, n);

/** One index, chosen in proportion to its weight (weights ≤ 0 are never chosen). Returns -1 if none can be. */
export function weightedIndex(weights: readonly number[], rng: Rng = Math.random): number {
  const total = weights.reduce((s, w) => s + (w > 0 ? w : 0), 0);
  if (total <= 0) return -1;
  let r = rng() * total;
  for (let i = 0; i < weights.length; i++) {
    if (weights[i] <= 0) continue;
    r -= weights[i];
    if (r < 0) return i;
  }
  for (let i = weights.length - 1; i >= 0; i--) if (weights[i] > 0) return i;
  return -1;
}
