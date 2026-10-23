import {
  besideRect,
  CLEAR_CAP,
  clearance,
  districts,
  FAN_ZONES,
  inWater,
  landmarks,
  LENGTH,
  N,
  pit,
  PIT_BOXES,
  PIT_HALF,
  PLOT,
  samples,
  SET,
  wallOffset,
  WALL_T,
  water,
} from "./track";

// The world's plan: where every solid thing round the circuit stands, as
// plain data. The builders (circuit, landmarks, props, foliage, city) read
// it and decide how things look; layout.test.ts reads it and proves that
// nothing stands on the racing surface, the kerbs, the run-off or the walls,
// and that nothing stands in anything else.
//
// Every footprint is a rectangle (or a circle) turned about y; for things
// beside the track the local +z axis faces the track.

export type ClaimKind =
  | "pit"
  | "pitwall"
  | "leg"
  | "stand"
  | "pavilion"
  | "promenade"
  | "kiosk"
  | "screen"
  | "gate"
  | "pylon"
  | "camera"
  | "marshal"
  | "lantern"
  | "tree"
  | "building"
  | "landmark";

export interface Claim {
  kind: ClaimKind;
  id: string;
  x: number;
  z: number;
  ry: number;
  /** Half extents along local x and z (a circle: hw is its radius). */
  hw: number;
  hd: number;
  h: number;
  round?: boolean;
  /** Pieces of one group (a fan zone) may stand on its ground (the promenade). */
  group?: string;
  ground?: boolean;
  /** Where it was set down beside the track. */
  frac?: number;
  side?: 1 | -1;
}

/** The least room each kind keeps from the face of the walls (clearance() is measured from the face). */
export const MIN_CLEAR: Record<ClaimKind, number> = {
  pit: 0.3,
  pitwall: 0.15,
  leg: WALL_T + 0.4,
  stand: WALL_T + 0.5,
  pavilion: PLOT.gap - 0.05,
  promenade: WALL_T + 0.3,
  kiosk: WALL_T + 2,
  screen: WALL_T + 2,
  gate: WALL_T + 0.6,
  pylon: WALL_T + 0.8,
  camera: WALL_T + 0.8,
  marshal: WALL_T + 0.25,
  lantern: WALL_T + 0.6,
  tree: WALL_T + 1.2,
  building: 14,
  landmark: 14,
};

/** Tiny seeded RNG, so the plan is the same on every visit. */
export function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

/* ───────────── geometry of claims ───────────── */

/** Local axes: +x is (cos ry, −sin ry), +z is (sin ry, cos ry) — three's rotation.y. */
export function toWorld(c: { x: number; z: number; ry: number }, lx: number, lz: number) {
  const cs = Math.cos(c.ry);
  const sn = Math.sin(c.ry);
  return { x: c.x + lx * cs + lz * sn, z: c.z - lx * sn + lz * cs };
}

/** Points over a claim's footprint (edges every metre or so, and a grid inside). */
export function claimPoints(c: Claim, step = 1.5) {
  const out: { x: number; z: number }[] = [];
  if (c.round) {
    out.push({ x: c.x, z: c.z });
    const n = Math.max(8, Math.ceil((Math.PI * 2 * c.hw) / step));
    for (let k = 0; k < n; k++) out.push({ x: c.x + Math.cos((k / n) * Math.PI * 2) * c.hw, z: c.z + Math.sin((k / n) * Math.PI * 2) * c.hw });
    return out;
  }
  const nx = Math.max(1, Math.ceil((c.hw * 2) / step));
  const nz = Math.max(1, Math.ceil((c.hd * 2) / step));
  for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) out.push(toWorld(c, -c.hw + (2 * c.hw * i) / nx, -c.hd + (2 * c.hd * j) / nz));
  return out;
}

const radius = (c: Claim) => (c.round ? c.hw : Math.hypot(c.hw, c.hd));

/** Do two footprints overlap (by more than `slack` metres)? Separating axes; circles as their bounding squares turned with them. */
export function overlaps(a: Claim, b: Claim, slack = 0) {
  if (Math.hypot(a.x - b.x, a.z - b.z) > radius(a) + radius(b) - slack) return false;
  if (a.round && b.round) return Math.hypot(a.x - b.x, a.z - b.z) < a.hw + b.hw - slack;
  const axes = [a.ry, a.ry + Math.PI / 2, b.ry, b.ry + Math.PI / 2];
  const half = (c: Claim, ax: number, az: number) => {
    if (c.round) return c.hw;
    const ux = Math.cos(c.ry);
    const uz = -Math.sin(c.ry);
    return Math.abs(ux * ax + uz * az) * c.hw + Math.abs(-uz * ax + ux * az) * c.hd;
  };
  for (const t of axes) {
    const ax = Math.cos(t);
    const az = -Math.sin(t);
    const d = Math.abs((b.x - a.x) * ax + (b.z - a.z) * az);
    if (d >= half(a, ax, az) + half(b, ax, az) - slack) return false;
  }
  return true;
}

/** May these two share ground? Pieces of a group on its own promenade. */
export const compatible = (a: Claim, b: Claim) => !!a.group && a.group === b.group && (a.ground || b.ground);

/** Lowest clearance over a claim's footprint. */
export function worstClearance(c: Claim) {
  let w = Infinity;
  for (const p of claimPoints(c)) w = Math.min(w, clearance(p.x, p.z));
  return w;
}
const wet = (c: Claim) => (c.kind === "landmark" ? inWater(c.x, c.z) : claimPoints(c, 4).some((p) => inWater(p.x, p.z)));

/** A spatial index of claims, for "is this spot free?" while planning. */
class Registry {
  list: Claim[] = [];
  private cells = new Map<number, Claim[]>();
  private key = (cx: number, cz: number) => (cx + 4096) * 8192 + (cz + 4096);
  private span(c: Claim, f: (k: number) => void) {
    const r = radius(c);
    for (let cx = Math.floor((c.x - r) / 32); cx <= Math.floor((c.x + r) / 32); cx++) for (let cz = Math.floor((c.z - r) / 32); cz <= Math.floor((c.z + r) / 32); cz++) f(this.key(cx, cz));
  }
  add<T extends Claim>(c: T): T {
    this.list.push(c);
    this.span(c, (k) => {
      const l = this.cells.get(k);
      if (l) l.push(c);
      else this.cells.set(k, [c]);
    });
    return c;
  }
  /** Something already there (beyond `slack` metres of contact)? */
  hits(c: Claim, slack = 0) {
    let hit = false;
    this.span(c, (k) => {
      if (hit) return;
      for (const o of this.cells.get(k) ?? []) if (o !== c && !compatible(c, o) && overlaps(c, o, slack)) return void (hit = true);
    });
    return hit;
  }
  /** Room for it: off the circuit by its kind's margin, out of the water, clear of everything planned. */
  fits(c: Claim) {
    return worstClearance(c) >= MIN_CLEAR[c.kind] && !wet(c) && !this.hits(c);
  }
}

/* ───────────── the plan ───────────── */

const reg = new Registry();
const fracOf = (metres: number) => metres / LENGTH;

/** A rectangle beside the track (see besideRect), as a claim. */
function beside(kind: ClaimKind, id: string, frac: number, side: 1 | -1, hw: number, hd: number, h: number, gap = MIN_CLEAR[kind], extra: Partial<Claim> = {}): Claim {
  const p = besideRect(frac, side, hw, hd, gap);
  return { kind, id, x: p.x, z: p.z, ry: p.ry, hw, hd, h, frac, side, ...extra };
}

/* ── the pit building, and the stands on the pit wall ── */
const PIT_DEPTH = 20;
/** The garages' open fronts: just behind the pit lane's edge where it swings furthest towards them. */
export const PIT_FRONT = Math.min(...pit.filter((p) => p.x > PIT_BOXES.x0 - 20 && p.x < PIT_BOXES.x1 + 20).map((p) => p.z)) - PIT_HALF - 0.45;
export const pitBuilding = reg.add({ kind: "pit", id: "pit-building", x: (PIT_BOXES.x0 + PIT_BOXES.x1) / 2, z: PIT_FRONT - PIT_DEPTH / 2, ry: 0, hw: (PIT_BOXES.x1 - PIT_BOXES.x0) / 2 + 16, hd: PIT_DEPTH / 2, h: 10.5 });

/** NEIL in big lit letters on the pit building's roof, facing the grandstand across the straight. */
export const letters = (() => {
  const widths: Record<string, number> = { N: 2.9, E: 2.3, I: 0.95, L: 2.25 };
  const scale = 2.2;
  const gap = 1.4;
  const word = "NEIL";
  const total = [...word].reduce((s, ch) => s + widths[ch] * scale, 0) + gap * (word.length - 1);
  // Over the middle garages, set back a little from the roof's front edge
  let x = pitBuilding.x - 40 - total / 2;
  const z = pitBuilding.z + pitBuilding.hd - 4;
  const spots = [...word].map((ch) => {
    const w = widths[ch] * scale;
    const s = { ch, x: x + w / 2, z };
    x += w + gap;
    return s;
  });
  return { scale, y: pitBuilding.h - 0.2, ry: 0, spots };
})();

/** The strip of concrete between the track's wall and the pit lane's, along the boxes: z of its middle and its width. */
export const pitWallStrip = (() => {
  const trackWall = samples[0].z - wallOffset(0, -1) - WALL_T;
  const laneWall = PIT_BOXES.z + PIT_HALF + WALL_T;
  return { z: (trackWall + laneWall) / 2, width: trackWall - laneWall };
})();
export const pitWallStands: Claim[] = [];
for (let x = PIT_BOXES.x0 + 20; x < PIT_BOXES.x1 - 10; x += 32)
  pitWallStands.push(reg.add({ kind: "pitwall", id: `pitwall-${pitWallStands.length}`, x, z: pitWallStrip.z, ry: 0, hw: 3.6, hd: pitWallStrip.width / 2 - 0.25, h: 3.4 }));

/* ── the start gantry, and a footbridge over the east straight: only their legs stand ── */
export interface Span {
  id: string;
  frac: number;
  /** Centre line sample under it, and its legs either side (local +z faces the track). */
  i: number;
  legs: [Claim, Claim];
  /** Underside of the deck (m). */
  clear: number;
}
function span(id: string, frac: number, legHw: number, legHd: number, gap: number, clear: number): Span {
  const legs = ([1, -1] as const).map((side) => reg.add(beside("leg", `${id}-${side > 0 ? "r" : "l"}`, frac, side, legHw, legHd, clear + 2, gap))) as [Claim, Claim];
  return { id, frac, i: Math.round(frac * N) % N, legs, clear };
}
export const startGantry = span("gantry", 2 / N, 0.45, 0.45, WALL_T + 0.6, 7);
export const footbridge = span("footbridge", 0.315, 3, 2.4, WALL_T + 1.2, 7.2);

/* ── grandstands: [frac, side, length, rows] ── */
export interface Stand extends Claim {
  rows: number;
  /** Depth of the roof's overhang in front of the first row. */
  overhang: number;
  name: string;
}
const ROW = 0.9;
const OVERHANG = 2.6;
export const stands: Stand[] = (
  [
    [0.995, 1, 150, 14, "MAIN GRANDSTAND"],
    [0.14, 1, 56, 10, "TURN 3 STAND"],
    [0.21, -1, 50, 8, "MARINA STAND"],
    [0.405, 1, 60, 10, "HAIRPIN STAND"],
    [0.585, 1, 70, 9, "BAYFRONT STAND"],
    [0.725, -1, 50, 9, "CHICANE STAND"],
  ] as const
).map(([frac, side, length, rows, name], k) => {
  const hd = (rows * ROW + OVERHANG + 0.8) / 2;
  // The main stand keeps back far enough for the start gantry's leg in front of it
  const c = beside("stand", `stand-${k}`, frac, side as 1 | -1, length / 2 + 0.5, hd, 0.6 + rows * 0.55 + 3.4, k === 0 ? 2.8 : MIN_CLEAR.stand);
  return reg.add<Stand>({ ...c, rows, overhang: OVERHANG, name });
});

/* ── the fan zones: a promenade behind the wall, three pavilions on it, kiosks and a screen between ── */
export const pavilions: Claim[] = landmarks.map((l) => reg.add({ kind: "pavilion", id: l.id, x: l.x, z: l.z, ry: l.heading, hw: PLOT.hw, hd: PLOT.hd, h: 9, group: l.fanZone, frac: l.frac, side: l.side }));

export interface FanZone {
  id: string;
  name: string;
  side: 1 | -1;
  from: number;
  to: number;
  /** Promenade paving: short rectangles following the wall. */
  paving: Claim[];
  kiosks: Claim[];
  screens: Claim[];
  gates: Claim[];
}
export const fanZones: FanZone[] = FAN_ZONES.map((z) => {
  const paving: Claim[] = [];
  const len = (z.to - z.from) * LENGTH;
  const pieces = Math.ceil(len / 9);
  for (let k = 0; k < pieces; k++) {
    const f = z.from + ((k + 0.5) / pieces) * (z.to - z.from);
    // From just behind the fence back to the pavilions' front edge, a hair wider than its share so the pieces meet
    const depth = PLOT.gap - MIN_CLEAR.promenade + 0.5;
    const c = beside("promenade", `${z.id}-walk-${k}`, f, z.side, len / pieces / 2 + 0.6, depth / 2, 0.05, MIN_CLEAR.promenade, { group: z.id, ground: true });
    paving.push(reg.add(c));
  }
  const mine = pavilions.filter((p) => p.group === z.id).sort((a, b) => a.frac! - b.frac!);
  const kiosks: Claim[] = [];
  const screens: Claim[] = [];
  for (let k = 0; k < mine.length - 1; k++) {
    const mid = (mine[k].frac! + mine[k + 1].frac!) / 2;
    screens.push(reg.add(beside("screen", `${z.id}-screen-${k}`, mid, z.side, 5.5, 1.2, 9, PLOT.gap + 3, { group: z.id })));
    for (const s of [-1, 1]) kiosks.push(reg.add(beside("kiosk", `${z.id}-kiosk-${k}-${s}`, mid + fracOf(13) * s, z.side, 3, 2.5, 3.6, PLOT.gap + 2.5, { group: z.id })));
  }
  // A gate at each end, across the promenade: posts and a banner facing the traffic
  const gates = [z.from, z.to].map((f, k) => {
    const c = beside("gate", `${z.id}-gate-${k}`, f, z.side, 0.4, 3.2, 6.5, MIN_CLEAR.gate, { group: z.id });
    return reg.add(c);
  });
  return { id: z.id, name: z.name, side: z.side, from: z.from, to: z.to, paving, kiosks, screens, gates };
});

/* ── set pieces of the skyline: the city keeps clear of them ── */
export const setPieces: Claim[] = (
  [
    { kind: "landmark", id: "towers", x: SET.towers.x + 34, z: SET.towers.z, ry: 0, hw: 170, hd: 60, h: 160 },
    { kind: "landmark", id: "lotus", x: SET.lotus.x, z: SET.lotus.z, ry: 0, hw: 40, hd: 40, h: 40, round: true },
    { kind: "landmark", id: "wheel", x: SET.wheel.x, z: SET.wheel.z, ry: 0, hw: 45, hd: 45, h: 130, round: true },
    { kind: "landmark", id: "domes", x: SET.domes.x + 2, z: SET.domes.z, ry: 0, hw: 64, hd: 34, h: 22 },
    { kind: "landmark", id: "colonial", x: SET.colonial.x, z: SET.colonial.z, ry: 0, hw: SET.colonial.hw, hd: SET.colonial.hd, h: 36 },
  ] as Claim[]
).map((c) => reg.add(c));

/* ── floodlight pylons: every 36 m, alternating sides; the other side if one side is taken ── */
export const pylons: Claim[] = [];
for (let i = 4, k = 0; i < N; i += 12, k++) {
  for (const side of k % 2 ? ([1, -1] as const) : ([-1, 1] as const)) {
    const c = beside("pylon", `pylon-${i}`, i / N, side, 0.75, 0.75, 17, WALL_T + 1.6);
    if (!reg.fits(c)) continue;
    pylons.push(reg.add(c));
    break;
  }
}

/* ── camera towers on the outside of the big corners, marshal posts every 130 m or so ── */
export const cameras: Claim[] = [];
{
  const corners: number[] = [];
  for (let i = 0; i < N; i++) {
    const c = Math.abs(samples[i].curv);
    if (c < 0.02) continue;
    let peak = true;
    for (let j = -20; j <= 20 && peak; j++) if (Math.abs(samples[(i + j + N) % N].curv) > c) peak = false;
    if (peak && corners.every((o) => Math.min(Math.abs(o - i), N - Math.abs(o - i)) > 60)) corners.push(i);
  }
  for (const i of corners) {
    const side: 1 | -1 = samples[i].curv > 0 ? -1 : 1;
    for (const d of [6, 12, 0, 18]) {
      const c = beside("camera", `camera-${i}`, (i + d) / N, side, 1.5, 1.5, 7.5, WALL_T + 1.8);
      if (!reg.fits(c)) continue;
      cameras.push(reg.add(c));
      break;
    }
  }
}
export const marshals: Claim[] = [];
for (let k = 0; k < 18; k++) {
  const side: 1 | -1 = k % 2 ? 1 : -1;
  for (const d of [0, 0.006, -0.006, 0.012]) {
    const c = beside("marshal", `marshal-${k}`, (k + 0.3) / 18 + d, side, 1.3, 0.9, 2.6);
    if (!reg.fits(c)) continue;
    marshals.push(reg.add({ ...c, id: `marshal-${marshals.length + 1}` }));
    break;
  }
}

/* ── lanterns: flanking each pavilion's front, along the promenades, and every 40 m along the verges ── */
export const lanterns: Claim[] = [];
{
  const lantern = (x: number, z: number, ry: number, group?: string) => ({ kind: "lantern" as const, id: `lantern-${lanterns.length}`, x, z, ry, hw: 0.35, hd: 0.35, h: 3.3, round: true, group });
  for (const zn of fanZones)
    for (const p of zn.paving.filter((_, k) => k % 2 === 1)) {
      // On the promenade's back edge, the arm reaching towards the track
      const q = toWorld(p, 0, -p.hd + 0.5);
      const c = lantern(q.x, q.z, p.ry, zn.id);
      if (reg.fits(c)) lanterns.push(reg.add(c));
    }
  const rand = seeded(515);
  for (let i = 6, k = 0; i < N; i += 13 + Math.floor(rand() * 4), k++) {
    const side: 1 | -1 = k % 2 ? 1 : -1;
    const c = beside("lantern", "", i / N, side, 0.35, 0.35, 3.3, WALL_T + 1.4);
    const l = lantern(c.x, c.z, c.ry);
    if (reg.fits(l)) lanterns.push(reg.add(l));
  }
}

/* ── the city: a street grid of blocks in each district, buildings on lots ── */
export type BuildingType = "tower" | "slab" | "resi" | "shop" | "civic";
export interface Building extends Claim {
  type: BuildingType;
  /** Facade style (a row of the window atlas). */
  style: number;
  podium: number;
  /** A tower's own plan (on its podium); other types fill their lot. */
  tw?: number;
  td?: number;
  /** Setbacks: fractions of the height where the plan steps in. */
  steps: number[];
  crown: "flat" | "frame" | "spire" | "heli" | "led" | "slope";
  seed: number;
}
const PITCH = 80;
const STREET = 16;
export const STREETS = { pitch: PITCH, width: STREET };
export const buildings: Building[] = [];
{
  const rand = seeded(77);
  const lots: { x0: number; z0: number; x1: number; z1: number; tall: number; d: number }[] = [];
  districts.forEach((d, di) => {
    for (let gx = Math.floor(d.x0 / PITCH); gx * PITCH < d.x1; gx++)
      for (let gz = Math.floor(d.z0 / PITCH); gz * PITCH < d.z1; gz++) {
        const x0 = gx * PITCH + STREET / 2;
        const z0 = gz * PITCH + STREET / 2;
        if (x0 + PITCH / 2 < d.x0 || x0 + PITCH / 2 > d.x1 || z0 + PITCH / 2 < d.z0 || z0 + PITCH / 2 > d.z1) continue;
        lots.push({ x0, z0, x1: x0 + PITCH - STREET, z1: z0 + PITCH - STREET, tall: d.tall, d: di });
      }
  });
  // Shuffled, so a tier that draws only the first few still spreads them about
  for (let i = lots.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [lots[i], lots[j]] = [lots[j], lots[i]];
  }
  const add = (b: Omit<Building, "kind" | "ry" | "id">) => {
    const c: Building = { ...b, kind: "building", id: `b${buildings.length}`, ry: 0 };
    if (!reg.fits(c)) return false;
    // A street's width from anything that isn't another building, and off the park
    const g = SET.green;
    if (c.x + c.hw > g.x0 - 6 && c.x - c.hw < g.x1 + 6 && c.z + c.hd > g.z0 - 6 && c.z - c.hd < g.z1 + 6) return false;
    if (reg.list.some((o) => o.kind !== "building" && o.kind !== "tree" && overlaps({ ...c, hw: c.hw + 8, hd: c.hd + 8 }, o))) return false;
    buildings.push(reg.add(c));
    return true;
  };
  const crowns: Building["crown"][] = ["flat", "frame", "spire", "heli", "led", "flat", "slope"];
  for (const L of lots) {
    const w = L.x1 - L.x0;
    const d = L.z1 - L.z0;
    const cx = (L.x0 + L.x1) / 2;
    const cz = (L.z0 + L.z1) / 2;
    const r = rand();
    const seed = Math.floor(rand() * 1e6);
    if (L.tall > 0.5 && r < 0.55) {
      // One tower on a podium that fills the block
      const h = 70 + Math.pow(rand(), 1.3) * 190 * L.tall;
      const steps = rand() < 0.5 ? [0.62 + rand() * 0.2] : rand() < 0.5 ? [0.45, 0.8] : [];
      add({ type: "tower", x: cx, z: cz, hw: w / 2, hd: d / 2, h, tw: 22 + rand() * 18, td: 22 + rand() * 18, style: Math.floor(rand() * 4), podium: 12 + rand() * 10, steps, crown: crowns[Math.floor(rand() * crowns.length)], seed });
      continue;
    }
    // Two or four buildings on the block, each on its own lot
    const split = r < 0.8 ? 4 : 2;
    const parts = split === 4 ? [[-1, -1], [1, -1], [-1, 1], [1, 1]] : rand() < 0.5 ? [[-1, 0], [1, 0]] : [[0, -1], [0, 1]];
    for (const [sx, sz] of parts) {
      const pw = split === 4 || sx ? w / 2 - 2 : w;
      const pd = split === 4 || sz ? d / 2 - 2 : d;
      const x = cx + (sx * w) / 4;
      const z = cz + (sz * d) / 4;
      const t = rand();
      const type: BuildingType = L.tall < 0.4 && t < 0.45 ? "shop" : t < 0.55 ? "slab" : "resi";
      const h = type === "shop" ? 9 + rand() * 7 : 18 + Math.pow(rand(), 1.4) * 110 * L.tall;
      const inset = type === "shop" ? 0 : 1 + rand() * 4;
      add({ type, x, z, hw: pw / 2 - inset, hd: pd / 2 - inset, h, style: type === "shop" ? 6 + Math.floor(rand() * 2) : 2 + Math.floor(rand() * 4), podium: type === "resi" && rand() < 0.5 ? 6 + rand() * 4 : 0, steps: h > 60 && rand() < 0.4 ? [0.7] : [], crown: type === "shop" ? "slope" : crowns[Math.floor(rand() * crowns.length)], seed: Math.floor(rand() * 1e6) });
    }
  }
}

/** A far ring of towers: the rest of the city, always on the horizon (no footprint near anything). */
export const farTowers = (() => {
  const rand = seeded(91);
  return Array.from({ length: 70 }, (_, k) => {
    const a = (k / 70) * Math.PI * 2 + rand() * 0.06;
    const r = 1150 + rand() * 280;
    return { x: Math.cos(a) * r + 80, z: Math.sin(a) * r + 150, w: 30 + rand() * 40, d: 30 + rand() * 40, h: 60 + Math.pow(rand(), 1.2) * 230, style: Math.floor(rand() * 4), seed: Math.floor(rand() * 1e6) };
  });
})();

/* ───────────── trees (planned per tier: counts differ) ───────────── */

/** How deep the verge runs behind the wall, varying smoothly round the lap. */
export const vergeDepth = (i: number, side: number) => 10 + 3.5 * Math.sin(i * 0.031 + side * 1.7) + 2 * Math.sin(i * 0.11 + side);
/** The paved walkway behind every wall, before the grass starts. */
export const WALKWAY = 3.2;

export interface TreeSpot {
  x: number;
  z: number;
  /** Size (canopy radius is about 1.25 s). */
  s: number;
  shrub: boolean;
  /** −1 leans to greens, +1 to blossom. */
  warmth: number;
}

/** Is a canopy of radius r at (x, z) clear of the circuit, the water and everything planned? */
export function treeFits(x: number, z: number, r: number) {
  const c: Claim = { kind: "tree", id: "", x, z, ry: 0, hw: r, hd: r, h: 6, round: true };
  return reg.fits(c);
}

/** The parkland's trees and shrubs, for a tier's counts. Pure: the same spots for the same counts. */
export function planTrees(counts: { trees: number; shrubs: number }): TreeSpot[] {
  const rand = seeded(2025);
  const out: TreeSpot[] = [];
  const free = (x: number, z: number, r: number) => {
    if (!treeFits(x, z, r)) return false;
    for (const t of out) if (Math.hypot(t.x - x, t.z - z) < (t.s + r) * 0.75) return false;
    return true;
  };
  const verge = (i: number, side: 1 | -1, behind: number) => {
    const p = samples[i];
    const o = (wallOffset(i, side) + behind) * side;
    return { x: p.x - p.tz * o, z: p.z + p.tx * o };
  };
  const push = (x: number, z: number, s: number, shrub: boolean, warmth: number) => {
    if (!free(x, z, s * (shrub ? 1.25 : 1.3))) return false;
    out.push({ x, z, s, shrub, warmth });
    return true;
  };
  // Along the verges: groves with gaps, so the walls aren't lined like a hedge
  {
    let guard = 0;
    const want = Math.round(counts.trees * 0.55);
    while (out.length < want && guard++ < want * 40) {
      const i = Math.floor(rand() * N);
      const side = rand() < 0.5 ? 1 : -1;
      if (Math.sin(i * 0.045 + side * 2.1) < -0.35) continue;
      const s = 2.1 + rand() * 1.4;
      const behind = WALKWAY + s * 1.3 + 0.5 + rand() * Math.max(0, vergeDepth(i, side) - WALKWAY - s * 1.3);
      const p = verge(i, side, behind);
      push(p.x, p.z, s, false, Math.sin(i * 0.02) * 0.5);
    }
  }
  // The infield park: a ring of trees round the green and a few inside
  {
    const g = SET.green;
    let guard = 0;
    const want = out.length + Math.round(counts.trees * 0.25);
    while (out.length < want && guard++ < 8000) {
      let x = g.x0 + rand() * (g.x1 - g.x0);
      let z = g.z0 + rand() * (g.z1 - g.z0);
      if (rand() < 0.7) {
        const e = [x - g.x0, g.x1 - x, z - g.z0, g.z1 - z];
        const k = e.indexOf(Math.min(...e));
        if (k === 0) x = g.x0 + 3 + rand() * 4;
        else if (k === 1) x = g.x1 - 3 - rand() * 4;
        else if (k === 2) z = g.z0 + 3 + rand() * 4;
        else z = g.z1 - 3 - rand() * 4;
      }
      push(x, z, 2.4 + rand() * 1.8, false, 0.3);
    }
  }
  // Along the river and the bay's shore
  {
    let guard = 0;
    const want = out.length + Math.round(counts.trees * 0.2);
    while (out.length < want && guard++ < 8000) {
      const w = water[Math.floor(rand() * water.length)];
      push(w[0] + (rand() - 0.5) * 50, w[1] + (rand() - 0.5) * 50, 2.2 + rand() * 1.5, false, -0.3);
    }
  }
  const trees = out.length;
  // Shrubs: low and round, in planters at the back of the fan zones and along the verges
  {
    let guard = 0;
    const want = trees + counts.shrubs;
    while (out.length < want && guard++ < counts.shrubs * 50) {
      let x: number;
      let z: number;
      if (rand() < 0.3) {
        const p = pavilions[Math.floor(rand() * pavilions.length)];
        const q = toWorld(p, (rand() - 0.5) * 2 * (p.hw + 6), -p.hd - 1.5 - rand() * 3);
        x = q.x;
        z = q.z;
      } else {
        const i = Math.floor(rand() * N);
        const side = rand() < 0.5 ? 1 : -1;
        const p = verge(i, side, WALKWAY + 1.6 + rand() * 4);
        x = p.x;
        z = p.z;
      }
      push(x, z, 0.9 + rand() * 0.8, true, 0.4);
    }
  }
  return out;
}

/** Everything planned so far (for the test and the grass mask). */
export const claims = reg.list;
export { CLEAR_CAP };
