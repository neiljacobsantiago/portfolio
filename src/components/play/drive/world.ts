// The island's layout. Each landmark is a real project or page: drive into
// its zone and a card pops up with a link. Units are roughly metres; the
// island is a disc of radius ISLAND_RADIUS centred on the plaza.
//
//   · a paved ring road around the plaza, with the projects along it
//   · a dirt coast trail further out, linked to the ring by three spokes
//   · Bayan (a little town with a bowling lane) to the east, a beach and a
//     drivable pier to the south, a hill with a lookout to the north-west
//     and a secret cove on the north shore

export const ISLAND_RADIUS = 120;
export const ROAD_RADIUS = 46;
/** Half-widths of the paved ring and the dirt roads. */
export const ROAD_HALF = 3.2;
export const TRAIL_HALF = 2.7;

const deg = (d: number) => (d * Math.PI) / 180;

/* ───────────── the coast trail: a wobbly loop, radius by angle ───────────── */

export function trailRadius(a: number) {
  return 92 + 4 * Math.sin(3 * a + 0.5) + 2 * Math.sin(5 * a + 1.2);
}
const trailSlope = (a: number) => 12 * Math.cos(3 * a + 0.5) + 10 * Math.cos(5 * a + 1.2);

/** Distance from (x, z) to the trail's centre line. */
export function trailDist(x: number, z: number) {
  const r = Math.hypot(x, z);
  const a = Math.atan2(z, x);
  const k = trailSlope(a) / Math.max(r, 1);
  return Math.abs(r - trailRadius(a)) / Math.sqrt(1 + k * k);
}

/** A point on the trail and its direction of travel (counter-clockwise), at angle a. */
export function trailAt(a: number) {
  const r = trailRadius(a);
  const dr = trailSlope(a);
  const tx = dr * Math.cos(a) - r * Math.sin(a);
  const tz = dr * Math.sin(a) + r * Math.cos(a);
  const l = Math.hypot(tx, tz);
  return { x: Math.cos(a) * r, z: Math.sin(a) * r, tx: tx / l, tz: tz / l };
}

/* ───────────── the pier, south, out over the sea ───────────── */

export const PIER = { x: 0, z0: 110, z1: 146, half: 3, y: 0.9, ramp: 4 };

/** Height of the pier deck at (x, z), or -Infinity off it. */
export function pierHeight(x: number, z: number) {
  if (Math.abs(x - PIER.x) > PIER.half || z < PIER.z0 || z > PIER.z1) return -Infinity;
  return PIER.y * Math.min(1, (z - PIER.z0) / PIER.ramp);
}

/* ───────────── spokes: straight dirt roads from the ring to the trail ───────────── */

export interface Segment {
  x1: number;
  z1: number;
  x2: number;
  z2: number;
}
const spoke = (d: number, to = trailRadius(deg(d))): Segment => {
  const a = deg(d);
  return { x1: Math.cos(a) * ROAD_RADIUS, z1: Math.sin(a) * ROAD_RADIUS, x2: Math.cos(a) * to, z2: Math.sin(a) * to };
};
/** East through Bayan, south down to the pier, and west-south-west. */
export const spokes: Segment[] = [spoke(0), spoke(90, PIER.z0 + 0.5), spoke(200)];

export function segDist(s: Segment, x: number, z: number) {
  const dx = s.x2 - s.x1;
  const dz = s.z2 - s.z1;
  const k = Math.max(0, Math.min(1, ((x - s.x1) * dx + (z - s.z1) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - s.x1 - dx * k, z - s.z1 - dz * k);
}

/** How far (x, z) is outside the nearest road's edge (negative = on a road). */
export function roadDist(x: number, z: number) {
  let d = Math.abs(Math.hypot(x, z) - ROAD_RADIUS) - ROAD_HALF;
  d = Math.min(d, trailDist(x, z) - TRAIL_HALF);
  for (const s of spokes) d = Math.min(d, segDist(s, x, z) - TRAIL_HALF);
  return d;
}

/* ───────────── the hill and its lookout ───────────── */

export const HILL = (() => {
  const a = deg(225);
  return { x: Math.cos(a) * 88, z: Math.sin(a) * 88, r: 40, h: 12 };
})();
export const LOOKOUT = (() => {
  const a = deg(225);
  return { x: Math.cos(a) * 78.5, z: Math.sin(a) * 78.5 };
})();

/* ───────────── Bayan: a town square, houses and a bowling lane ───────────── */

export const TOWN = { x: 70, z: -13, r: 9 };
/** The bowling lane runs east (+x) from the ring road to a backstop. */
export const LANE = { x0: 56, x1: 82, z: 13, half: 2.6, head: 75 };
export const COVE = { x: 0, z: -110, r: 7.5 };

export interface Landmark {
  id: string;
  kind: LandmarkKind;
  title: string;
  /** One line for the pop-up card. */
  line: string;
  href: string;
  cta: string;
  x: number;
  z: number;
  /** Solid radius the jeepney bumps into. */
  radius: number;
  /** Driving inside this radius shows the card. */
  zone: number;
}

export type LandmarkKind = "petri" | "camera" | "stage" | "pc" | "memory" | "shield" | "lab" | "mailbox" | "monument";

const at = (d: number, r: number) => ({ x: Math.round(Math.cos(deg(d)) * r * 10) / 10, z: Math.round(Math.sin(deg(d)) * r * 10) / 10 });

export const landmarks: Landmark[] = [
  { id: "pathoscan", kind: "petri", title: "PathoScan", line: "An offline AI that names fungal species from a photo — turned over to DA PhilMech.", href: "/work/pathoscan", cta: "View the project", x: 0, z: -30, radius: 6.5, zone: 12 },
  { id: "photography", kind: "camera", title: "Photography", line: "Concerts, portraits, campus life and the night sky.", href: "/photography", cta: "Open the gallery", ...at(-70, 64), radius: 5, zone: 11 },
  { id: "aurora", kind: "stage", title: "Aurora Fest 2026", line: "Six OPM acts from the front barrier, shot in manual.", href: "/work/aurora-fest-2026", cta: "See the story", ...at(-35, 66), radius: 7, zone: 13 },
  { id: "buildit", kind: "pc", title: "BuildIT", line: "A PC builder that grew from a C program into a cloud storefront.", href: "/work/buildit", cta: "See how it evolved", ...at(38, 64), radius: 4.5, zone: 11 },
  { id: "memory", kind: "memory", title: "Memory Allocation", line: "First-, Best- and Worst-Fit, made visible.", href: "/work/memory-allocation-simulator", cta: "Open the project", ...at(125, 64), radius: 4.5, zone: 11 },
  { id: "cyber", kind: "shield", title: "Cyber Awareness", line: "Six short videos that make data privacy make sense.", href: "/work/cyber-awareness-series", cta: "Watch the series", ...at(165, 64), radius: 5, zone: 11 },
  { id: "lab", kind: "lab", title: "The Lab", line: "Working tools grown from real projects.", href: "/lab", cta: "Open the Lab", x: -28, z: -14, radius: 4.5, zone: 11 },
  { id: "contact", kind: "mailbox", title: "Say hello", line: "Projects, events, portraits — Neil reads every message.", href: "/contact", cta: "Write to Neil", ...at(255, 62), radius: 3.5, zone: 10 },
  { id: "about", kind: "monument", title: "About Neil", line: "Third-year BSIT at CLSU and Production Director of the ITSC Media Group.", href: "/about", cta: "Meet Neil", x: 18, z: 20, radius: 4, zone: 10 },
];

/** Named places that aren't projects: a toast says where you are. */
export const places: { name: string; line: string; x: number; z: number; r: number }[] = [
  { name: "Bayan", line: "the town square", x: TOWN.x, z: TOWN.z, r: 15 },
  { name: "Bowling lane", line: "floor it at the pins", x: 64, z: LANE.z, r: 7 },
  { name: "The pier", line: "mind the edge", x: 0, z: 128, r: 15 },
  { name: "Lookout", line: "the whole island below", x: LOOKOUT.x, z: LOOKOUT.z, r: 13 },
  { name: "Secret cove", line: "you found it", x: COVE.x, z: COVE.z, r: COVE.r },
];

/* ───────────── ramps ───────────── */

/** Jump ramps (tabletops) across a road. `angle` sets the road's direction: it runs along (-sin, cos). */
export const RAMP = { slope: 5.5, top: 3, width: 5.4, height: 1.7 };
export const ramps: { x: number; z: number; angle: number }[] = [
  ...[135, 250].map((d) => ({ x: Math.cos(deg(d)) * ROAD_RADIUS, z: Math.sin(deg(d)) * ROAD_RADIUS, angle: deg(d) })),
  // One on the coast trail, north-east
  ...[45].map((d) => {
    const p = trailAt(deg(d));
    return { x: p.x, z: p.z, angle: Math.atan2(-p.tx, p.tz) };
  }),
];

/* ───────────── collectibles ───────────── */

const onTrail = (d: number): [number, number] => {
  const p = trailAt(deg(d));
  return [p.x, p.z];
};

/** Floating "packets" for the time-trial challenge: [x, z, height above ground]. */
export const packets: [number, number, number][] = [
  ...([
    [0, -12],
    [24, -34],
    at(330, ROAD_RADIUS),
    [TOWN.x, TOWN.z],
    [60, LANE.z],
    onTrail(20),
    [36, 54],
    [0, 128],
    [-22, 108],
    [-46, 34],
    onTrail(150),
    onTrail(225),
    [-36, -40],
    [0, -100],
    [-36, 2],
    onTrail(300),
  ] as ([number, number] | { x: number; z: number })[]).map((p): [number, number, number] => (Array.isArray(p) ? [p[0], p[1], 1.6] : [p.x, p.z, 1.6])),
  // One in mid-air past each ramp: only a jump reaches it.
  ...ramps.map((r): [number, number, number] => [r.x - Math.sin(r.angle) * 7.5, r.z + Math.cos(r.angle) * 7.5, 5]),
];

/** Golden stars tucked away in odd corners, found once and remembered. */
export const secrets: [number, number, number][] = [
  [0, PIER.z1 - 2.5, 1.4], // the very end of the pier
  [LOOKOUT.x + 5.5, LOOKOUT.z + 5.5, 1.4], // beside the lookout tower
  [COVE.x, COVE.z - 2, 1.4], // inside the cove
  [at(-35, 77).x, at(-35, 77).z, 1.4], // behind the stage
  [80, -27, 1.4], // the alley behind Bayan
  [-110, 18, 1.4], // the far west beach
];

/* ───────────── props: everything you can knock over ───────────── */

export type PropKind = "crate" | "pin" | "cone" | "drum" | "ball";
export interface PropSpot {
  kind: PropKind;
  x: number;
  z: number;
  /** Crates: the row in a stack (0 = on the ground). */
  row?: number;
  /** Bowling racks: which rack the pin belongs to. */
  rack?: number;
  /** 0 = always, 1 = medium and high quality, 2 = high only. */
  tier: 0 | 1 | 2;
}

export const CRATE = 1.2;
export const racks = [
  // The lane in Bayan: head pin facing the run-up from the ring road
  { name: "Bayan lanes", x: LANE.head, z: LANE.z, dir: 0 },
  // A practice rack by the plaza, pointing at it
  { name: "Plaza rack", x: -13, z: 17, dir: Math.atan2(17, -13) },
];

export const props: PropSpot[] = (() => {
  const out: PropSpot[] = [];
  // Bowling pins: 1-2-3-4, rows running away from the head pin
  racks.forEach((rk, rack) => {
    const fx = Math.cos(rk.dir);
    const fz = Math.sin(rk.dir);
    for (let row = 0; row < 4; row++)
      for (let i = 0; i <= row; i++) {
        const side = (i - row / 2) * 1.3;
        out.push({ kind: "pin", x: rk.x + fx * row * 1.15 - fz * side, z: rk.z + fz * row * 1.15 + fx * side, rack, tier: 0 });
      }
  });
  // Cones: a slalom on the ring road before the Bayan turn-off, and a few on the trail
  for (let i = 0; i < 6; i++) {
    const p = at(332 + i * 4.5, ROAD_RADIUS + (i % 2 ? 1.5 : -1.5));
    out.push({ kind: "cone", ...p, tier: 0 });
  }
  for (let i = 0; i < 5; i++) {
    const p = trailAt(deg(100 + i * 3.2));
    const side = i % 2 ? 1.2 : -1.2;
    out.push({ kind: "cone", x: p.x + p.tz * side, z: p.z - p.tx * side, tier: 1 });
  }
  for (const [x, z] of [
    [LANE.x0 + 1, LANE.z - LANE.half - 0.6],
    [LANE.x0 + 1, LANE.z + LANE.half + 0.6],
    [TOWN.x - 4, TOWN.z + 9.5],
    [TOWN.x + 4, TOWN.z + 9.5],
  ])
    out.push({ kind: "cone", x, z, tier: 2 });
  // Crates: a pyramid inside the ring, a wall across the inner lane, a pile by the pier, a market stack in Bayan
  for (let row = 0; row < 4; row++) for (let i = 0; i < 4 - row; i++) out.push({ kind: "crate", x: 22 + (i - (3 - row) / 2) * CRATE, z: -8, row, tier: 0 });
  const wall = deg(-80);
  for (let row = 0; row < 3; row++)
    for (let i = 0; i < 3; i++) {
      const r = ROAD_RADIUS - 2.4 + i * CRATE;
      out.push({ kind: "crate", x: Math.cos(wall) * r, z: Math.sin(wall) * r, row, tier: 1 });
    }
  for (let row = 0; row < 2; row++) for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) out.push({ kind: "crate", x: 7 + i * CRATE, z: 104 + j * CRATE, row, tier: 1 });
  for (let row = 0; row < 2; row++) for (let i = 0; i < 3 - row; i++) out.push({ kind: "crate", x: TOWN.x + 11, z: TOWN.z + 4 + (i - (2 - row) / 2) * CRATE, row, tier: 2 });
  // Oil drums by the pier and in the town
  for (const [x, z, tier] of [
    [-6, 104, 1],
    [-7.3, 105, 1],
    [-6.4, 106.2, 1],
    [-7.6, 103.6, 1],
    [TOWN.x - 11, TOWN.z - 2, 2],
    [TOWN.x - 11.2, TOWN.z - 0.7, 2],
    [TOWN.x - 12.3, TOWN.z - 1.6, 2],
    [-58, 26, 2],
  ] as const)
    out.push({ kind: "drum", x, z, tier });
  // Beach balls: one on the plaza, one on the beach
  out.push({ kind: "ball", x: -5, z: -3, tier: 0 });
  out.push({ kind: "ball", x: 16, z: 106, tier: 1 });
  return out;
})();

/* ───────────── street lamps ───────────── */

/** A lamp: base position, the direction its arm points *away* from (radians), and the ground height if not the terrain. */
export interface Lamp {
  x: number;
  z: number;
  a: number;
  y?: number;
}

const nearSpoke = (x: number, z: number, d: number) => spokes.some((s) => segDist(s, x, z) < d);

/** Lamps along the outside of the ring road (skipping ramps, spokes and landmarks), round Bayan's square and down the pier. */
export const lamps: Lamp[] = [
  ...Array.from({ length: 24 }, (_, i) => (i / 24) * Math.PI * 2 + 0.17)
    .map((a): Lamp => ({ x: Math.cos(a) * (ROAD_RADIUS + 4.6), z: Math.sin(a) * (ROAD_RADIUS + 4.6), a }))
    .filter(({ x, z }) => !ramps.some((r) => Math.hypot(r.x - x, r.z - z) < 9) && !nearSpoke(x, z, 6) && !landmarks.some((l) => Math.hypot(l.x - x, l.z - z) < l.radius + 2.5)),
  ...[45, 135, 225, 315].map((d): Lamp => ({ x: TOWN.x + Math.cos(deg(d)) * (TOWN.r + 1.2), z: TOWN.z + Math.sin(deg(d)) * (TOWN.r + 1.2), a: deg(d) })),
  ...[120, 134].flatMap((z): Lamp[] => [
    { x: PIER.half + 0.25, z, a: 0, y: PIER.y },
    { x: -PIER.half - 0.25, z, a: Math.PI, y: PIER.y },
  ]),
];

/** Places that must stay flat: plaza, props, the town and every landmark's zone. [x, z, radius] */
export const flatSpots: [number, number, number][] = [
  ...landmarks.map((l): [number, number, number] => [l.x, l.z, l.zone - 1]),
  ...racks.map((r): [number, number, number] => [r.x + Math.cos(r.dir) * 1.7, r.z + Math.sin(r.dir) * 1.7, 6]),
  [22, -7.5, 6],
  [TOWN.x, TOWN.z, TOWN.r + 8],
  [62, LANE.z, 9],
  [72, LANE.z, 9],
  [LOOKOUT.x, LOOKOUT.z, 4],
  [COVE.x, COVE.z, COVE.r + 2],
  [0, 104, 9],
];
