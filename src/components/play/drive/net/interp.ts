// Smooth remote cars from 15 Hz snapshots: draw each one ~100 ms in the past,
// between the two snapshots either side of that moment. If the next snapshot
// is late, carry on along the last heading at the last speed, but only for a
// short while; after that the car waits where it is rather than guess.

export const BUFFER_MS = 100;
export const EXTRAPOLATE_MS = 250;
const KEEP = 20;
/** Further than this between two snapshots (m) is a teleport. */
const TELEPORT = 40;

export interface Snap {
  t: number;
  x: number;
  z: number;
  heading: number;
  speed: number;
  steer: number;
}

export interface Pose {
  x: number;
  z: number;
  heading: number;
  speed: number;
  steer: number;
}

const angleLerp = (a: number, b: number, k: number) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;

export function createBuffer() {
  const snaps: Snap[] = [];
  return {
    /** Adds a snapshot in time order; duplicates and very late ones are dropped. */
    push(s: Snap) {
      const last = snaps[snaps.length - 1];
      if (last && s.t <= last.t) {
        if (s.t === last.t || s.t < snaps[0].t) return;
        const i = snaps.findIndex((x) => x.t > s.t);
        if (snaps[i - 1]?.t === s.t) return;
        snaps.splice(i, 0, s);
        return;
      }
      snaps.push(s);
      if (snaps.length > KEEP) snaps.shift();
    },
    clear() {
      snaps.length = 0;
    },
    get size() {
      return snaps.length;
    },
    get latest(): Snap | undefined {
      return snaps[snaps.length - 1];
    },
    /** Pose at render time `t` (already shifted back by the buffer). False when there is nothing yet. */
    sample(t: number, out: Pose): boolean {
      const n = snaps.length;
      if (!n) return false;
      if (t <= snaps[0].t) return copy(snaps[0], out);
      const last = snaps[n - 1];
      if (t >= last.t) {
        // Dead reckoning, capped
        const dt = Math.min(t - last.t, EXTRAPOLATE_MS) / 1000;
        out.x = last.x - Math.sin(last.heading) * last.speed * dt;
        out.z = last.z - Math.cos(last.heading) * last.speed * dt;
        out.heading = last.heading;
        out.speed = last.speed;
        out.steer = last.steer;
        return true;
      }
      let i = n - 2;
      while (i > 0 && snaps[i].t > t) i--;
      const a = snaps[i];
      const b = snaps[i + 1];
      // A reset or a respawn: jump, don't slide across the map
      if (Math.hypot(b.x - a.x, b.z - a.z) > TELEPORT) return copy(t - a.t < b.t - t ? a : b, out);
      const k = (t - a.t) / (b.t - a.t || 1);
      out.x = a.x + (b.x - a.x) * k;
      out.z = a.z + (b.z - a.z) * k;
      out.heading = angleLerp(a.heading, b.heading, k);
      out.speed = a.speed + (b.speed - a.speed) * k;
      out.steer = a.steer + (b.steer - a.steer) * k;
      return true;
    },
  };
}

function copy(s: Snap, out: Pose) {
  out.x = s.x;
  out.z = s.z;
  out.heading = s.heading;
  out.speed = s.speed;
  out.steer = s.steer;
  return true;
}
