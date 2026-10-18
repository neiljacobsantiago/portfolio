import { LENGTH, locate, N, SECTORS } from "./track";

// Timing for the hot-lap mode: five red lights then lights out, laps timed
// from the line with three sector splits, a lap that only counts if every
// sector was driven in order and the car stayed within track limits, and a
// ghost of the best lap (recorded at 10 Hz, small enough for localStorage)
// that also gives the live delta.

export type RacePhase = "off" | "lights" | "running";

export interface SectorEvent {
  index: number;
  ms: number;
  /** Against the best for this sector (negative is faster); null when there's no best yet. */
  delta: number | null;
  best: boolean;
}

export interface LapEvent {
  lap: number;
  ms: number;
  valid: boolean;
  best: boolean;
  sectors: number[];
}

export interface RaceEvents {
  lights?: number;
  go?: boolean;
  jumpStart?: boolean;
  sector?: SectorEvent;
  lap?: LapEvent;
  limits?: boolean;
}

/** A recorded lap: x, z, heading at 10 Hz. */
export interface Ghost {
  ms: number;
  frames: number[];
}

const FRAME = 100; // ms between ghost frames
const LIMIT_GRACE = 0.6; // seconds off track before the lap is deleted

export function createRace() {
  let phase: RacePhase = "off";
  let lightsAt = 0;
  let goAt = 0;
  let lit = 0;
  let lapStart = 0;
  let lap = 0;
  let lastS = 0;
  let passed = 0; // sector boundaries crossed this lap
  let splits: number[] = [];
  let offTime = 0;
  let invalid = false;
  let penalty = 0;
  let bestLap: number | null = null;
  let bestSectors: (number | null)[] = [null, null, null];
  let recording: number[] = [];
  let nextFrame = 0;
  let ghost: Ghost | null = null;
  /** The best lap's elapsed time at each centre-line sample, for the live delta. */
  let reference: Float32Array | null = null;

  const buildReference = (g: Ghost) => {
    const ref = new Float32Array(N).fill(-1);
    let hint = -1;
    for (let k = 0; k < g.frames.length / 3; k++) {
      const h = locate(g.frames[k * 3], g.frames[k * 3 + 1], hint);
      hint = h.i;
      if (ref[h.i] < 0) ref[h.i] = k * FRAME;
    }
    // Fill gaps forward
    let last = 0;
    for (let i = 0; i < N; i++) {
      if (ref[i] < 0) ref[i] = last;
      else last = ref[i];
    }
    reference = ref;
  };

  const crossed = (from: number, to: number, mark: number) => {
    // Forward over `mark`, allowing for wrap at the line
    const d = ((to - from + LENGTH * 1.5) % LENGTH) - LENGTH / 2;
    if (d <= 0 || d > 60) return false;
    const a = from;
    const b = from + d;
    return (a < mark && b >= mark) || (a < mark + LENGTH && b >= mark + LENGTH);
  };

  return {
    get phase() {
      return phase;
    },
    get lap() {
      return lap;
    },
    get invalid() {
      return invalid;
    },
    get bestLap() {
      return bestLap;
    },
    get ghost() {
      return ghost;
    },
    /** Remembered bests from the page (best lap ms, its sectors, its ghost). */
    restore(best: number | null, sectors: (number | null)[] | null, g: Ghost | null) {
      bestLap = best;
      if (sectors) bestSectors = sectors.slice(0, 3);
      ghost = g && g.frames.length > 30 ? g : null;
      if (ghost) buildReference(ghost);
    },
    stop() {
      phase = "off";
      lit = 0;
    },
    /** Lights sequence from the grid; the car is held until the lights go out. */
    start(now: number) {
      phase = "lights";
      lightsAt = now + 600;
      goAt = lightsAt + 5000 + 300 + Math.random() * 2200;
      lit = 0;
      lap = 0;
      penalty = 0;
    },
    /** Elapsed time of the current lap. */
    elapsed(now: number) {
      return phase === "running" ? now - lapStart + penalty : 0;
    },
    /** Live gap to the best lap at this point of the track (ms), when there is one. */
    delta(now: number, index: number) {
      if (!reference || phase !== "running" || (passed === 0 && now - lapStart < 3000)) return null;
      return now - lapStart + penalty - reference[index];
    },
    lights() {
      return lit;
    },
    /** Steps the timing. `s` is the car's arc length, `off` whether it's beyond track limits. */
    update(now: number, dt: number, car: { s: number; x: number; z: number; heading: number; speed: number; off: boolean }): RaceEvents {
      const ev: RaceEvents = {};
      if (phase === "lights") {
        const n = Math.max(0, Math.min(5, Math.floor((now - lightsAt) / 1000) + 1));
        if (now >= lightsAt && n !== lit && now < goAt) {
          lit = n;
          ev.lights = n;
        }
        if (Math.abs(car.speed) > 1.5 && penalty === 0) {
          penalty = 5000;
          ev.jumpStart = true;
        }
        if (now >= goAt) {
          phase = "running";
          lit = 0;
          ev.lights = 0;
          ev.go = true;
          lapStart = now;
          lap = 1;
          passed = 0;
          splits = [];
          offTime = 0;
          invalid = false;
          recording = [];
          nextFrame = now;
          lastS = car.s;
        }
        return ev;
      }
      if (phase !== "running") return ev;

      // Ghost frames
      if (now >= nextFrame) {
        nextFrame += FRAME;
        if (now - nextFrame > FRAME * 3) nextFrame = now + FRAME;
        recording.push(Math.round(car.x * 10) / 10, Math.round(car.z * 10) / 10, Math.round(car.heading * 1000) / 1000);
      }

      // Track limits
      if (car.off && !invalid) {
        offTime += dt;
        if (offTime > LIMIT_GRACE) {
          invalid = true;
          ev.limits = true;
        }
      }

      const elapsed = now - lapStart + penalty;
      // Sector boundaries, in order
      for (let k = 1; k < 3; k++)
        if (passed === k - 1 && crossed(lastS, car.s, SECTORS[k])) {
          passed = k;
          const ms = Math.round(elapsed - splits.reduce((a, b) => a + b, 0));
          splits.push(ms);
          const b = bestSectors[k - 1];
          ev.sector = { index: k - 1, ms, delta: b == null ? null : ms - b, best: !invalid && (b == null || ms < b) };
          if (ev.sector.best) bestSectors[k - 1] = ms;
        }
      // The line
      if (crossed(lastS, car.s, 0)) {
        if (passed === 2) {
          const ms = Math.round(elapsed);
          const s3 = ms - splits[0] - splits[1];
          splits.push(s3);
          const b3 = bestSectors[2];
          ev.sector = { index: 2, ms: s3, delta: b3 == null ? null : s3 - b3, best: !invalid && (b3 == null || s3 < b3) };
          if (ev.sector.best) bestSectors[2] = s3;
          const best = !invalid && (bestLap == null || ms < bestLap);
          ev.lap = { lap, ms, valid: !invalid, best, sectors: splits.slice() };
          if (best) {
            bestLap = ms;
            ghost = { ms, frames: recording.slice() };
            buildReference(ghost);
          }
          lap++;
        }
        // A new lap starts at the line (lap one started at lights out)
        lapStart = now;
        penalty = 0;
        passed = 0;
        splits = [];
        offTime = 0;
        invalid = false;
        recording = [];
        nextFrame = now;
      }
      lastS = car.s;
      return ev;
    },
    get bestSectors() {
      return bestSectors;
    },
    /** Pose of the ghost `ms` into its lap, interpolated. */
    ghostAt(ms: number, out: { x: number; z: number; heading: number }) {
      if (!ghost) return false;
      const f = ms / FRAME;
      const k = Math.floor(f);
      const count = ghost.frames.length / 3;
      if (k < 0 || k >= count - 1) return false;
      const t = f - k;
      const a = k * 3;
      const b = a + 3;
      const fr = ghost.frames;
      out.x = fr[a] + (fr[b] - fr[a]) * t;
      out.z = fr[a + 1] + (fr[b + 1] - fr[a + 1]) * t;
      const dh = Math.atan2(Math.sin(fr[b + 2] - fr[a + 2]), Math.cos(fr[b + 2] - fr[a + 2]));
      out.heading = fr[a + 2] + dh * t;
      return true;
    },
  };
}
export type Race = ReturnType<typeof createRace>;
