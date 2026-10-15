// The island's layout. Each landmark is a real project or page: drive into
// its zone and a card pops up with a link. Units are roughly metres; the
// island is a disc of radius ISLAND_RADIUS centred on the plaza.

export const ISLAND_RADIUS = 72;
export const ROAD_RADIUS = 34;

export type LandmarkKind = "petri" | "camera" | "stage" | "pc" | "network" | "memory" | "shield" | "lab" | "mailbox" | "monument" | "arcade";

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

export const landmarks: Landmark[] = [
  { id: "pathoscan", kind: "petri", title: "PathoScan", line: "An offline AI that names fungal species from a photo — turned over to DA PhilMech.", href: "/work/pathoscan", cta: "View the project", x: 0, z: -24, radius: 6.5, zone: 12 },
  { id: "photography", kind: "camera", title: "Photography", line: "Concerts, portraits, campus life and the night sky.", href: "/photography", cta: "Open the gallery", x: 26, z: -42, radius: 5, zone: 11 },
  { id: "aurora", kind: "stage", title: "Aurora Fest 2026", line: "Twelve hours at the barricade for six OPM acts.", href: "/work/aurora-fest-2026", cta: "See the story", x: 50, z: -12, radius: 7, zone: 13 },
  { id: "buildit", kind: "pc", title: "BuildIT", line: "A PC builder that grew from a C program into a cloud storefront.", href: "/work/buildit", cta: "See how it evolved", x: 44, z: 28, radius: 4.5, zone: 11 },
  { id: "clirdec", kind: "network", title: "CLIRDEC Network", line: "A whole facility's network, planned down to the VLANs.", href: "/work/clirdec-network", cta: "Open the project", x: 12, z: 50, radius: 6, zone: 12 },
  { id: "memory", kind: "memory", title: "Memory Allocation", line: "First-, Best- and Worst-Fit, made visible.", href: "/work/memory-allocation-simulator", cta: "Open the project", x: -24, z: 46, radius: 4.5, zone: 11 },
  { id: "cyber", kind: "shield", title: "Cyber Awareness", line: "Six short videos that make data privacy make sense.", href: "/work/cyber-awareness-series", cta: "Watch the series", x: -48, z: 20, radius: 5, zone: 11 },
  { id: "lab", kind: "lab", title: "The Lab", line: "Working tools grown from real projects.", href: "/lab", cta: "Open the Lab", x: -48, z: -22, radius: 4.5, zone: 11 },
  { id: "contact", kind: "mailbox", title: "Say hello", line: "Projects, events, portraits — Neil reads every message.", href: "/contact", cta: "Write to Neil", x: -24, z: -48, radius: 3.5, zone: 10 },
  { id: "about", kind: "monument", title: "About Neil", line: "Third-year BSIT at CLSU and Production Director of the ITSC Media Group.", href: "/about", cta: "Meet Neil", x: -14, z: 14, radius: 4, zone: 10 },
];

/** Jump ramps (tabletops) sitting across the ring road, at these angles around the island. */
export const RAMP = { slope: 5.5, top: 3, width: 5.4, height: 1.7 };
export const ramps = [135, 250].map((deg) => {
  const a = (deg * Math.PI) / 180;
  return { x: Math.cos(a) * ROAD_RADIUS, z: Math.sin(a) * ROAD_RADIUS, angle: a };
});

/** Floating "packets" for the time-trial challenge: [x, z, height above ground]. */
export const packets: [number, number, number][] = [
  ...([[0, -8], [16, -28], [38, -34], [58, 6], [30, 40], [-4, 60], [-38, 36], [-60, 2], [-36, -36], [8, -58], [20, 22], [-26, -6]] as const).map(([x, z]): [number, number, number] => [x, z, 1.6]),
  // One in mid-air past each ramp: only a jump reaches it.
  ...ramps.map((r): [number, number, number] => [r.x - Math.sin(r.angle) * 7.5, r.z + Math.cos(r.angle) * 7.5, 5]),
];

/** Traffic cones in a slalom along the east road, and a set of bowling pins by the plaza. */
export const cones: [number, number][] = [
  [34, -6], [31, 0], [34, 6], [31, 12], [34, 18],
];
export const pins: [number, number][] = (() => {
  const out: [number, number][] = [];
  const ox = 14;
  const oz = 20;
  for (let row = 0; row < 4; row++) for (let i = 0; i <= row; i++) out.push([ox + (i - row / 2) * 1.3, oz + row * 1.15]);
  return out;
})();

/** Crate stacks: a pyramid inside the ring and a wall across half the road. */
export const CRATE = 1.2;
export const crates: [number, number, number][] = (() => {
  const out: [number, number, number][] = [];
  // Pyramid, 4-3-2-1, facing the plaza
  for (let row = 0; row < 4; row++) for (let i = 0; i < 4 - row; i++) out.push([18 + (i - (3 - row) / 2) * CRATE, row, -8]);
  // Wall across the inner lane at -80°
  const a = (-80 * Math.PI) / 180;
  for (let row = 0; row < 3; row++)
    for (let i = 0; i < 3; i++) {
      const r = ROAD_RADIUS - 2.4 + i * CRATE;
      out.push([Math.cos(a) * r, row, Math.sin(a) * r]);
    }
  return out;
})();

/** A beach ball on the plaza. */
export const BALL: [number, number] = [-5, -3];

/** Street lamps along the outside of the road, skipping ramps and landmarks. */
export const lamps: [number, number][] = Array.from({ length: 18 }, (_, i) => (i / 18) * Math.PI * 2 + 0.17)
  .map((a): [number, number] => [Math.cos(a) * (ROAD_RADIUS + 4.6), Math.sin(a) * (ROAD_RADIUS + 4.6)])
  .filter(([x, z]) => !ramps.some((r) => Math.hypot(r.x - x, r.z - z) < 9) && !landmarks.some((l) => Math.hypot(l.x - x, l.z - z) < l.radius + 2.5));

/** Places that must stay flat: plaza, props and every landmark's zone. [x, z, radius] */
export const flatSpots: [number, number, number][] = [
  ...landmarks.map((l): [number, number, number] => [l.x, l.z, l.zone - 1]),
  [14, 21.5, 6],
  [18, -7.5, 6],
];
