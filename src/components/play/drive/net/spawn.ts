import { headingAt, LENGTH, N, PIT_BOXES, samples, wrapDelta } from "../track";

// Where each player starts, and how far into the race they are.

export interface Pose {
  x: number;
  z: number;
  heading: number;
}

/**
 * Grid slot `k` (0 is pole): the single-player grid spot for pole, then three
 * samples (about 9 m) further back per slot, staggered left and right.
 */
export function gridSlot(k: number): Pose {
  const i = (((N - 3 - k * 3) % N) + N) % N;
  const p = samples[i];
  const side = k % 2 === 0 ? -2.6 : 2.6;
  return { x: p.x - p.tz * side, z: p.z + p.tx * side, heading: headingAt(i) };
}

/** A pit box each for free roam, a car's length and a bit apart. */
export function pitSlot(k: number): Pose {
  return { x: PIT_BOXES.x0 + 64 + k * 12, z: PIT_BOXES.z - 2.2, heading: -Math.PI / 2 };
}

/**
 * Race distance from arc lengths along the centre line: starts negative on the
 * grid (behind the line) and grows by the wrapped step each update, so it keeps
 * counting across laps and goes down if you drive the wrong way.
 */
export function createProgress() {
  let last = 0;
  let dist = 0;
  return {
    reset(s: number) {
      last = s;
      dist = wrapDelta(s);
    },
    update(s: number) {
      dist += wrapDelta(s - last);
      last = s;
      return dist;
    },
    get dist() {
      return dist;
    },
  };
}

export { LENGTH };
