import { CatmullRomCurve3, Vector3 } from "three";

// Bay Street Circuit: the layout every other module reads. A closed street
// circuit sampled every few metres, a pit lane alongside the main straight,
// the bay and the river it crosses, and where the project pavilions,
// hidden trophies and city districts sit. Pure data and geometry queries,
// no three.js scene objects, so the physics and the renderer agree.
//
// Units are metres; x runs east, z runs south. The start/finish straight is
// on the north side heading east, the bay lies to the south.

/** Half the width of the racing surface, the kerb beyond it, and the painted edge line. */
export const HALF = 6.5;
export const KERB = 1.3;
export const LINE = 0.28;
/** Pit lane half width, and its speed limit (m/s, about 80 km/h). */
export const PIT_HALF = 5;
export const PIT_LIMIT = 22.2;

/** Handling shared by the car and the speed targets: grip = base + aero·v² (m/s²). */
export const GRIP = { base: 15, aero: 0.0055 };
export const BRAKE = { base: 16, aero: 0.0045 };

const S = 1.4;

// The centre line, as control points for a closed centripetal Catmull-Rom.
// The first point is the start/finish line.
const CTRL: [number, number][] = [
  [-60, -250],
  [60, -250],
  [140, -250],
  [176, -246],
  [196, -228],
  [200, -200],
  [190, -172],
  [192, -148],
  [210, -118],
  [228, -70],
  [238, 0],
  [240, 70],
  [238, 98],
  [226, 116],
  [200, 126],
  [140, 134],
  [80, 150],
  [30, 164],
  [-30, 166],
  [-90, 154],
  [-140, 150],
  [-200, 150],
  [-238, 148],
  [-262, 134],
  [-274, 108],
  [-278, 60],
  [-272, 30],
  [-258, 12],
  [-266, -8],
  [-284, -24],
  [-292, -70],
  [-292, -150],
  [-288, -204],
  [-272, -236],
  [-240, -250],
  [-170, -250],
];

/** One sample of the centre line. Right is (-tz, tx): positive lateral offsets are on the driver's right. */
export interface Sample {
  x: number;
  z: number;
  tx: number;
  tz: number;
  /** Distance from the start line. */
  s: number;
  /** Signed curvature: positive turns right. */
  curv: number;
  /** Run-off beyond the kerb before the wall, left and right. */
  runL: number;
  runR: number;
  /** Kerbs on this side (corners only). */
  kerbL: boolean;
  kerbR: boolean;
  /** Fastest sensible speed here, braking for what's ahead (m/s). */
  vmax: number;
  /** A straight: DRS can open. */
  drs: boolean;
}

function sampleClosed(points: [number, number][], spacing: number, closed: boolean) {
  const curve = new CatmullRomCurve3(
    points.map(([x, z]) => new Vector3(x * S, 0, z * S)),
    closed,
    "centripetal",
  );
  const n = Math.round(curve.getLength() / spacing);
  return curve.getSpacedPoints(n).slice(0, closed ? n : n + 1);
}

const pts = sampleClosed(CTRL, 3, true);
export const N = pts.length;
export const samples: Sample[] = pts.map((p) => ({ x: p.x, z: p.z, tx: 0, tz: 0, s: 0, curv: 0, runL: 2, runR: 2, kerbL: false, kerbR: false, vmax: 90, drs: false }));
const at = (i: number) => samples[((i % N) + N) % N];
export const sampleAt = at;

// Tangents, distances and curvature
{
  let s = 0;
  for (let i = 0; i < N; i++) {
    const a = at(i - 1);
    const b = at(i + 1);
    const l = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    samples[i].tx = (b.x - a.x) / l;
    samples[i].tz = (b.z - a.z) / l;
    samples[i].s = s;
    s += Math.hypot(at(i + 1).x - samples[i].x, at(i + 1).z - samples[i].z);
  }
  for (let i = 0; i < N; i++) {
    const a = at(i - 2);
    const b = at(i + 2);
    const ds = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    // dt · right, over the distance: how fast the heading turns towards the right
    const dtx = b.tx - a.tx;
    const dtz = b.tz - a.tz;
    samples[i].curv = (dtx * -samples[i].tz + dtz * samples[i].tx) / ds;
  }
}
export const LENGTH = (() => {
  const l = at(N - 1);
  return l.s + Math.hypot(samples[0].x - l.x, samples[0].z - l.z);
})();

/** Progress between two arc lengths, wrapped to (-L/2, L/2]. */
export const wrapDelta = (d: number) => ((((d + LENGTH / 2) % LENGTH) + LENGTH) % LENGTH) - LENGTH / 2;

// Run-off, kerbs, DRS and the speed target, all from the (smoothed) curvature
{
  const k = samples.map((_, i) => {
    let m = 0;
    for (let j = -4; j <= 4; j++) m = Math.abs(at(i + j).curv) > Math.abs(m) ? at(i + j).curv : m;
    return m;
  });
  for (let i = 0; i < N; i++) {
    // Outside of a corner gets more room, the inside less; spread along the corner
    let outL = 0;
    let outR = 0;
    for (let j = -14; j <= 10; j++) {
      const c = k[(i + j + N) % N];
      const w = Math.min(9, Math.max(0, (Math.abs(c) - 0.008) * 260));
      if (c > 0) outL = Math.max(outL, w);
      else outR = Math.max(outR, w);
    }
    samples[i].runL = 2.2 + outL;
    samples[i].runR = 2.2 + outR;
    const c = k[i];
    samples[i].kerbL = Math.abs(c) > 0.0085;
    samples[i].kerbR = samples[i].kerbL;
    // Steady-state cornering speed: v²|κ| = base + aero v²
    const ak = Math.abs(c);
    samples[i].vmax = ak > GRIP.aero + 1e-4 ? Math.min(90, Math.sqrt(GRIP.base / (ak - GRIP.aero))) : 90;
  }
  // Braking: work backwards (twice round, so the start line sees the last corner)
  for (let pass = 0; pass < 2; pass++)
    for (let i = N - 1; i >= 0; i--) {
      const next = at(i + 1);
      const ds = Math.hypot(next.x - samples[i].x, next.z - samples[i].z);
      const v = next.vmax;
      const lim = Math.sqrt(v * v + 2 * (BRAKE.base + BRAKE.aero * v * v) * 0.62 * ds);
      if (lim < samples[i].vmax) samples[i].vmax = lim;
    }
  // DRS: nothing tighter than a gentle kink for the next 120 m
  for (let i = 0; i < N; i++) {
    let ok = true;
    for (let j = -6; j < 40 && ok; j++) if (Math.abs(at(i + j).curv) > 0.0045) ok = false;
    samples[i].drs = ok;
  }
}

/* ───────────── the pit lane, north of the main straight ───────────── */

const PIT_CTRL: [number, number][] = [
  [-291, -120],
  [-292, -165],
  [-294, -205],
  [-282, -246],
  [-252, -262],
  [-200, -264],
  [80, -264],
  [150, -264],
  [200, -258],
  [226, -238],
  [234, -200],
  [233, -150],
  [236, -100],
  [239, -40],
  [239, 0],
];
export const pit = sampleClosed(PIT_CTRL, 2, false).map((p) => ({ x: p.x, z: p.z }));
/** The garages and pit boxes: the straight part of the lane (world x range). */
export const PIT_BOXES = { x0: -150 * S, x1: 110 * S, z: -264 * S };

/* ───────────── nearest-point queries ───────────── */

export interface Hit {
  /** Segment start index and how far along it (0…1). */
  i: number;
  u: number;
  /** Arc length at the foot point. */
  s: number;
  /** Lateral offset: positive is right of the direction of travel. */
  d: number;
  /** Distance to the centre line. */
  dist: number;
}

const CELL = 24;
const REACH = HALF + KERB + 14;
const bounds = (() => {
  let x0 = Infinity;
  let z0 = Infinity;
  let x1 = -Infinity;
  let z1 = -Infinity;
  for (const p of samples) {
    x0 = Math.min(x0, p.x);
    z0 = Math.min(z0, p.z);
    x1 = Math.max(x1, p.x);
    z1 = Math.max(z1, p.z);
  }
  return { x0: x0 - REACH - CELL, z0: z0 - REACH - CELL, x1: x1 + REACH + CELL, z1: z1 + REACH + CELL };
})();
const GW = Math.ceil((bounds.x1 - bounds.x0) / CELL);
const GH = Math.ceil((bounds.z1 - bounds.z0) / CELL);
const grid: number[][] = Array.from({ length: GW * GH }, () => []);
for (let i = 0; i < N; i++) {
  const a = samples[i];
  const b = at(i + 1);
  const cx0 = Math.floor((Math.min(a.x, b.x) - REACH - bounds.x0) / CELL);
  const cx1 = Math.floor((Math.max(a.x, b.x) + REACH - bounds.x0) / CELL);
  const cz0 = Math.floor((Math.min(a.z, b.z) - REACH - bounds.z0) / CELL);
  const cz1 = Math.floor((Math.max(a.z, b.z) + REACH - bounds.z0) / CELL);
  for (let cz = cz0; cz <= cz1; cz++) for (let cx = cx0; cx <= cx1; cx++) grid[cz * GW + cx].push(i);
}

const hit: Hit = { i: 0, u: 0, s: 0, d: 0, dist: Infinity };
function segment(i: number, x: number, z: number, out: Hit) {
  const a = samples[i];
  const b = at(i + 1);
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const l2 = dx * dx + dz * dz || 1;
  const u = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / l2));
  const px = a.x + dx * u;
  const pz = a.z + dz * u;
  const dist = Math.hypot(x - px, z - pz);
  if (dist >= out.dist) return;
  const l = Math.sqrt(l2);
  out.i = i;
  out.u = u;
  out.dist = dist;
  out.s = a.s + l * u;
  // Right of travel is (-tz, tx)
  out.d = ((x - px) * -dz + (z - pz) * dx) / l;
}

/**
 * The nearest point on the centre line. With a hint (the last index), only
 * nearby segments are searched, so a car never jumps to a parallel stretch.
 * Returns a shared object: copy what you keep.
 */
export function locate(x: number, z: number, hint = -1): Hit {
  hit.dist = Infinity;
  if (hint >= 0) {
    for (let j = -12; j <= 12; j++) segment((hint + j + N) % N, x, z, hit);
    if (hit.dist < REACH) return hit;
    hit.dist = Infinity;
  }
  const cx = Math.floor((x - bounds.x0) / CELL);
  const cz = Math.floor((z - bounds.z0) / CELL);
  if (cx >= 0 && cz >= 0 && cx < GW && cz < GH) for (const i of grid[cz * GW + cx]) segment(i, x, z, hit);
  if (hit.dist === Infinity) for (let i = 0; i < N; i += 4) segment(i, x, z, hit);
  return hit;
}

/** Wall offset on one side of sample i (centre line to the wall's face). */
export const wallOffset = (i: number, side: 1 | -1) => HALF + KERB + (side > 0 ? at(i).runR : at(i).runL);

/** Signed distance to the pit lane corridor (negative inside), and the nearest pit index. */
export function pitDist(x: number, z: number) {
  let best = Infinity;
  let bi = 0;
  for (let i = 0; i < pit.length - 1; i += 3) {
    const d = Math.hypot(x - pit[i].x, z - pit[i].z);
    if (d < best) {
      best = d;
      bi = i;
    }
  }
  if (best > 60) return { d: best - PIT_HALF, i: bi };
  let min = Infinity;
  for (let i = Math.max(0, bi - 4); i < Math.min(pit.length - 1, bi + 4); i++) {
    const a = pit[i];
    const b = pit[i + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const u = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1)));
    min = Math.min(min, Math.hypot(x - a.x - dx * u, z - a.z - dz * u));
  }
  return { d: min - PIT_HALF, i: bi };
}

/** Signed distance to everything drivable (negative inside): the circuit within its walls, and the pit lane. */
export function drivable(x: number, z: number, hint = -1) {
  const h = locate(x, z, hint);
  const side = h.d >= 0 ? 1 : -1;
  const a = wallOffset(h.i, side);
  const b = wallOffset((h.i + 1) % N, side);
  const track = Math.abs(h.d) - (a + (b - a) * h.u);
  return Math.min(track, pitDist(x, z).d);
}

/* ───────────── clearance: room between a point and everything drivable ───────────── */

/** The concrete walls' thickness, behind their face. */
export const WALL_T = 0.45;
/** Beyond this, clearance() stops measuring and reports the cap: nothing near. */
export const CLEAR_CAP = 26;
const CL_CELL = 24;
const CL_REACH = CLEAR_CAP + 22;
const clGrid: number[][] = (() => {
  const g: number[][] = Array.from({ length: GW * GH }, () => []);
  for (let i = 0; i < N; i++) {
    const a = samples[i];
    const b = at(i + 1);
    const cx0 = Math.max(0, Math.floor((Math.min(a.x, b.x) - CL_REACH - bounds.x0) / CELL));
    const cx1 = Math.min(GW - 1, Math.floor((Math.max(a.x, b.x) + CL_REACH - bounds.x0) / CELL));
    const cz0 = Math.max(0, Math.floor((Math.min(a.z, b.z) - CL_REACH - bounds.z0) / CELL));
    const cz1 = Math.min(GH - 1, Math.floor((Math.max(a.z, b.z) + CL_REACH - bounds.z0) / CELL));
    for (let cz = cz0; cz <= cz1; cz++) for (let cx = cx0; cx <= cx1; cx++) g[cz * GW + cx].push(i);
  }
  return g;
})();
void CL_CELL;

/**
 * How far a point is beyond the face of the circuit's walls, measured
 * against every stretch of track nearby (not just the nearest), so a spot
 * between two stretches answers for both. Negative inside the walls.
 */
export function trackClearance(x: number, z: number) {
  const cx = Math.floor((x - bounds.x0) / CELL);
  const cz = Math.floor((z - bounds.z0) / CELL);
  if (cx < 0 || cz < 0 || cx >= GW || cz >= GH) return CLEAR_CAP;
  let best = CLEAR_CAP;
  for (const i of clGrid[cz * GW + cx]) {
    const a = samples[i];
    const j = (i + 1) % N;
    const b = samples[j];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const l2 = dx * dx + dz * dz || 1;
    const u = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / l2));
    const px = a.x + dx * u;
    const pz = a.z + dz * u;
    const dist = Math.hypot(x - px, z - pz);
    const side = (x - px) * -dz + (z - pz) * dx >= 0 ? 1 : -1;
    const w = wallOffset(i, side) + (wallOffset(j, side) - wallOffset(i, side)) * u;
    best = Math.min(best, dist - w);
  }
  return best;
}

/** Room between a point and the nearest wall face of the circuit or the pit lane (negative: on the drivable side). */
export const clearance = (x: number, z: number) => Math.min(trackClearance(x, z), pitDist(x, z).d);

/** A rectangle set down beside the track: its centre, its turn (local +z faces the track) and how far it sits from the centre line. */
export interface Plot {
  x: number;
  z: number;
  ry: number;
  i: number;
  dist: number;
}

/**
 * Sets a rectangle (half width `hw` along the track, half depth `hd`) beside
 * the track at an arc fraction, squared to the local direction of the track,
 * and pushed back until every part of it is at least `gap` beyond the walls.
 */
export function besideRect(frac: number, side: 1 | -1, hw: number, hd: number, gap: number): Plot {
  const i = ((Math.round(frac * N) % N) + N) % N;
  const k = Math.max(1, Math.ceil(hw / 3));
  const a = at(i - k);
  const b = at(i + k);
  const l = Math.hypot(b.x - a.x, b.z - a.z) || 1;
  const tx = (b.x - a.x) / l;
  const tz = (b.z - a.z) / l;
  // Away from the track, on that side
  const nx = -tz * side;
  const nz = tx * side;
  const p = at(i);
  let o = 0;
  for (let j = -k; j <= k; j++) o = Math.max(o, wallOffset((i + j + N) % N, side));
  o += gap + hd;
  for (let it = 0; it < 60; it++) {
    const cx = p.x + nx * o;
    const cz = p.z + nz * o;
    let worst = Infinity;
    for (let u = -1; u <= 1.001; u += 0.25)
      for (const v of [-1, -0.5, 0, 0.5, 1]) worst = Math.min(worst, clearance(cx + tx * u * hw - nx * v * hd, cz + tz * u * hw - nz * v * hd));
    if (worst >= gap - 1e-3) break;
    o += gap - worst + 0.1;
  }
  return { x: p.x + nx * o, z: p.z + nz * o, ry: Math.atan2(-nx, -nz), i, dist: o };
}

/** A point beside the track: arc fraction, side (+1 right) and distance from the centre line. */
export function besideTrack(frac: number, side: number, offset: number) {
  const i = Math.round(frac * N) % N;
  const p = samples[i];
  return { x: p.x - p.tz * side * offset, z: p.z + p.tx * side * offset, i, heading: Math.atan2(-p.tx, -p.tz) };
}

/** Heading (the engine's convention: forward is (-sin h, -cos h)) along the track at sample i. */
export const headingAt = (i: number) => Math.atan2(-at(i).tx, -at(i).tz);

/* ───────────── timing ───────────── */

/** Sector boundaries as arc lengths (the first is the start line). */
export const SECTORS = [0, Math.round(LENGTH * 0.34), Math.round(LENGTH * 0.68)];

/** Grid slots behind the start line: [x, z, heading], staggered left and right. */
export const grid0 = (() => {
  const i = N - 6;
  const p = at(i);
  return { x: p.x - p.tz * -2.6, z: p.z + p.tx * -2.6, i, heading: headingAt(i) };
})();

/* ───────────── water: the bay and the river ───────────── */

const scaled = (pts: [number, number][]) => pts.map(([x, z]): [number, number] => [x * S, z * S]);

/** The bay, hugging the waterfront section, with an arm to the east that the footbridge crosses. */
export const bay = scaled([
  [-206, 184],
  [-150, 184],
  [-128, 194],
  [-112, 236],
  [-62, 258],
  [-14, 238],
  [0, 198],
  [40, 190],
  [80, 182],
  [140, 166],
  [200, 158],
  [262, 156],
  [330, 152],
  [410, 150],
  [490, 148],
  [560, 160],
  [586, 230],
  [562, 300],
  [480, 304],
  [400, 302],
  [330, 312],
  [300, 362],
  [292, 440],
  [262, 502],
  [180, 520],
  [100, 524],
  [20, 516],
  [-36, 500],
  [-66, 468],
  [-110, 462],
  [-134, 498],
  [-184, 510],
  [-252, 482],
  [-322, 432],
  [-362, 350],
  [-352, 270],
  [-302, 216],
  [-262, 194],
  [-232, 184],
]);

/** The river runs north from the bay, under the circuit's bridge, into the city. */
export const river = scaled([
  [-232, 190],
  [-206, 190],
  [-201, 120],
  [-189, 60],
  [-168, 12],
  [-150, -20],
  [-170, -36],
  [-196, -2],
  [-214, 58],
  [-226, 120],
]);

export const WATER_LEVEL = -1.1;

export function inPolygon(poly: [number, number][], x: number, z: number) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i];
    const [xj, zj] = poly[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
/** The bay and the river as one outline: up the river's west bank, round the tip, down the east bank. */
export const water: [number, number][] = [...bay, ...river.slice(6).reverse(), ...river.slice(2, 6).reverse()];
export const inWater = (x: number, z: number) => inPolygon(water, x, z);

/* ───────────── the skyline's set pieces (world xz) ───────────── */

export const SET = {
  /** Three hotel towers joined by a sky park, across the bay. */
  towers: { x: 160 * S, z: 590 * S },
  /** The lotus-shaped museum on its point in the bay. */
  lotus: { x: -92 * S, z: 488 * S },
  /** The observation wheel, north-east, past turn 1. */
  wheel: { x: 330 * S, z: -350 * S },
  /** Twin spiky domes on the north shore. */
  domes: { x: -62 * S, z: 214 * S },
  /** The floating platform and its grandstand. */
  float: { x: 92 * S, z: 216 * S, w: 74 * S, d: 40 * S },
  /** A footbridge across the bay's east arm. */
  bridge: { x: 430 * S, z0: 150 * S, z1: 304 * S },
  /** The colonial quarter by the river: a theatre with a clock tower, a long colonnaded block. */
  colonial: { x: -178, z: 118, hw: 46, hd: 40 },
  /** The open green in the infield. */
  green: { x0: -120 * S, z0: -180 * S, x1: 40 * S, z1: -60 * S },
};

/** Rectangles (world) the city blocks fill; each is [x0, z0, x1, z1, tallness 0…1]. */
export const districts: { x0: number; z0: number; x1: number; z1: number; tall: number }[] = [
  [-430, -560, 380, -310, 0.85], // the business district behind the pits
  [-250, -200, 200, 120, 0.35], // the infield
  [-600, -320, -335, 200, 0.7], // west
  [285, -260, 640, 130, 0.45], // east
  [300, 330, 720, 760, 0.55], // across the bay's arm
  [-560, 520, -150, 820, 0.6], // south-west, past the bay
  [-30, 560, 300, 820, 0.4], // behind the towers
].map(([x0, z0, x1, z1, tall]) => ({ x0: x0 * S, z0: z0 * S, x1: x1 * S, z1: z1 * S, tall }));

/* ───────────── what's around the circuit ───────────── */

export type LandmarkKind = "petri" | "camera" | "stage" | "pc" | "memory" | "shield" | "lab" | "mailbox" | "monument";

/** A project pavilion: drive past and its card offers a link. */
export interface Landmark {
  id: string;
  kind: LandmarkKind;
  title: string;
  /** One line for the card. */
  line: string;
  href: string;
  x: number;
  z: number;
  /** rotation.y that turns the pavilion's front (+z) to the track. */
  heading: number;
  /** Driving inside this radius offers the link. */
  zone: number;
  /** Where it stands: arc fraction and side of the track, and the fan zone it belongs to. */
  frac: number;
  side: 1 | -1;
  fanZone: string;
}

/**
 * A pavilion's plot: 26 m along the track by 20 m deep, its front edge a
 * clear walkway's width behind the debris fence, squared to the track.
 */
export const PLOT = { hw: 13, hd: 10, gap: 4.5 };
/** Pavilions sit in three fan zones of three, on the infield side, 73 m apart. */
const pavilion = (frac: number, side: 1 | -1, zone: string) => {
  const r = besideRect(frac, side, PLOT.hw, PLOT.hd, PLOT.gap);
  // Driving anywhere across the track abreast of it offers the link
  return { x: r.x, z: r.z, heading: r.ry, zone: r.dist + 8, frac, side, fanZone: zone };
};

/** The fan zones: a promenade behind the wall with three pavilions on it. */
export const FAN_ZONES = [
  { id: "paddock", name: "Paddock Club", from: 0.03, to: 0.12, side: 1 as const },
  { id: "bay", name: "Bay Fan Zone", from: 0.44, to: 0.53, side: 1 as const },
  { id: "village", name: "River Village", from: 0.785, to: 0.875, side: 1 as const },
];

export const landmarks: Landmark[] = [
  { id: "about", kind: "monument", title: "About Neil", line: "Third-year BSIT at CLSU and Production Director of the ITSC Media Group.", href: "/about", ...pavilion(0.045, 1, "paddock") },
  { id: "photography", kind: "camera", title: "Photography", line: "Concerts, portraits, campus life and the night sky.", href: "/photography", ...pavilion(0.075, 1, "paddock") },
  { id: "buildit", kind: "pc", title: "BuildIT", line: "A PC builder that grew from a C program into a cloud storefront.", href: "/work/buildit", ...pavilion(0.105, 1, "paddock") },
  { id: "aurora", kind: "stage", title: "Aurora Fest 2026", line: "Six OPM acts from the front barrier, shot in manual.", href: "/work/aurora-fest-2026", ...pavilion(0.455, 1, "bay") },
  { id: "pathoscan", kind: "petri", title: "PathoScan", line: "An offline AI that names fungal species from a photo — turned over to DA PhilMech.", href: "/work/pathoscan", ...pavilion(0.485, 1, "bay") },
  { id: "memory", kind: "memory", title: "Memory Allocation", line: "First-, Best- and Worst-Fit, made visible.", href: "/work/memory-allocation-simulator", ...pavilion(0.515, 1, "bay") },
  { id: "cyber", kind: "shield", title: "Cyber Awareness", line: "Six short videos that make data privacy make sense.", href: "/work/cyber-awareness-series", ...pavilion(0.8, 1, "village") },
  { id: "lab", kind: "lab", title: "The Lab", line: "Working tools grown from real projects.", href: "/lab", ...pavilion(0.83, 1, "village") },
  { id: "contact", kind: "mailbox", title: "Say hello", line: "Projects, events, portraits — Neil reads every message.", href: "/contact", ...pavilion(0.86, 1, "village") },
];

/** Named stretches of the lap, announced in free roam: [from, to) as arc fractions. */
export const places: { name: string; line: string; from: number; to: number }[] = [
  { name: "Main straight", line: "past the pits and the start gantry", from: 0.97, to: 0.03 },
  { name: "Paddock Club", line: "three of Neil's projects, on your right", from: 0.03, to: 0.12 },
  { name: "The S-bends", line: "left, right, left — use the kerbs", from: 0.12, to: 0.17 },
  { name: "Harbour hairpin", line: "the hardest stop on the lap", from: 0.38, to: 0.42 },
  { name: "Bay Fan Zone", line: "three more projects, the skyline across the water", from: 0.44, to: 0.53 },
  { name: "Bay sweep", line: "the skyline over the water", from: 0.53, to: 0.6 },
  { name: "River bridge", line: "steel arches overhead", from: 0.635, to: 0.665 },
  { name: "The chicane", line: "short-cut it and the lap won't count", from: 0.74, to: 0.785 },
  { name: "River Village", line: "the last three pavilions, on your right", from: 0.785, to: 0.875 },
];

/** Hidden trophies, found in free roam and remembered: [x, z]. */
export const trophies: [number, number][] = (() => {
  const runoff = (frac: number, side: 1 | -1) => {
    const p = besideTrack(frac, side, 0);
    const q = besideTrack(frac, side, wallOffset(p.i, side) - 2.2);
    return [q.x, q.z] as [number, number];
  };
  const inPit = (k: number): [number, number] => [pit[Math.round(k * (pit.length - 1))].x, pit[Math.round(k * (pit.length - 1))].z];
  return [inPit(0.62), inPit(0.88), runoff(0.405, -1), runoff(0.125, -1), runoff(0.765, 1), runoff(0.95, -1)];
})();
