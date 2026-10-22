import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
  RepeatWrapping,
  Shape,
  ShapeGeometry,
  SRGBColorSpace,
  TubeGeometry,
  Vector3,
} from "three";
import type { Glows } from "./glow";
import { Batch, C, LIGHTS, rng, textTexture, worldMaterial } from "./kit";
import {
  besideTrack,
  drivable,
  HALF,
  inWater,
  KERB,
  landmarks,
  LINE,
  N,
  pit,
  PIT_BOXES,
  PIT_HALF,
  pitDist,
  sampleAt,
  samples,
  SET,
  wallOffset,
  WATER_LEVEL,
  water,
} from "./track";

// Everything that makes the street circuit: tarmac, kerbs and run-off as one
// vertex-coloured, floodlit strip; concrete walls with boards and catch
// fences; TecPro stacks on the outside of the corners; the floodlight pylons
// that turn night into day (emissive heads plus glow sprites, no real
// lights); the start gantry, grandstands, the pit building and the steel
// arches of the river bridge.

const WALL_H = 1.05;
const WALL_T = 0.45;
const FENCE_TOP = 4.2;

/** Points on the centre line's right-hand normal. */
const off = (i: number, d: number) => {
  const p = sampleAt(i);
  return { x: p.x - p.tz * d, z: p.z + p.tx * d };
};

/** A flat, upward-facing triangle soup with colours and floodlight values. */
class Strip {
  pos: number[] = [];
  col: number[] = [];
  lit: number[] = [];
  private c = new Color();
  quad(ax: number, az: number, bx: number, bz: number, cx: number, cz: number, dx: number, dz: number, y: number, color: string | Color, lit: number, lit2 = lit) {
    const c = typeof color === "string" ? this.c.set(color) : color;
    // a-b on one edge, d-c on the other (a→b→c→d round the quad)
    this.pos.push(ax, y, az, dx, y, dz, bx, y, bz, bx, y, bz, dx, y, dz, cx, y, cz);
    for (let k = 0; k < 6; k++) this.col.push(c.r, c.g, c.b);
    this.lit.push(lit, lit2, lit, lit, lit2, lit2);
  }
  geometry() {
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(this.pos, 3));
    g.setAttribute("color", new Float32BufferAttribute(this.col, 3));
    g.setAttribute("aLit", new Float32BufferAttribute(this.lit, 1));
    // Make sure every triangle faces up
    const p = g.attributes.position as BufferAttribute;
    for (let i = 0; i < p.count; i += 3) {
      const ux = p.getX(i + 1) - p.getX(i);
      const uz = p.getZ(i + 1) - p.getZ(i);
      const vx = p.getX(i + 2) - p.getX(i);
      const vz = p.getZ(i + 2) - p.getZ(i);
      if (uz * vx - ux * vz < 0) {
        const x = p.getX(i + 1);
        const z = p.getZ(i + 1);
        p.setXYZ(i + 1, p.getX(i + 2), p.getY(i + 2), p.getZ(i + 2));
        p.setXYZ(i + 2, x, p.getY(i + 1), z);
        const l = g.attributes.aLit as BufferAttribute;
        const t = l.getX(i + 1);
        l.setX(i + 1, l.getX(i + 2));
        l.setX(i + 2, t);
      }
    }
    g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  }
}

/** Board texts for the walls: no brands, just the race and the person who built it. */
const BOARDS: [string, string, string][] = [
  ["BAY STREET CIRCUIT", C.ember, C.paper],
  ["NIGHT RACE", C.ink, C.paper],
  ["NEIL JACOB SANTIAGO", C.paper, C.ink],
  ["LIGHTS OUT", C.wine, C.paper],
  ["BSIT · CLSU", C.ink, "#ffd27a"],
  ["ITSC MEDIA GROUP", C.paper, C.ember],
  ["PATHOSCAN", "#123a2a", "#bff0cf"],
  ["BUILDIT", "#1b2740", "#9fb8ff"],
  ["AURORA FEST 2026", C.wine, "#ffd27a"],
  ["TRACK LIMITS APPLY", C.paper, C.ink],
  ["BUILT IN THREE.JS", C.ink, C.sky],
  ["SHOOT  ·  BUILD  ·  SHIP", C.ember, C.paper],
  ["STREET CIRCUIT", C.paper, C.ink],
  ["NIGHT RACE 2026", "#1d1f24", C.paper],
  ["FAN ZONE", C.sky, C.ink],
  ["BAY STREET CIRCUIT", C.ink, C.ember],
];

function fenceTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  g.strokeStyle = "rgba(220,226,232,0.95)";
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(64, 64);
  g.moveTo(64, 0);
  g.lineTo(0, 64);
  g.stroke();
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Ground the circuit's buildings stand on: a rectangle in its own frame (rotation.y = ry about x, z). */
export interface Footprint {
  x: number;
  z: number;
  ry: number;
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}
export function inFootprint(f: Footprint, px: number, pz: number, margin = 0) {
  const dx = px - f.x;
  const dz = pz - f.z;
  const c = Math.cos(f.ry);
  const s = Math.sin(f.ry);
  const lx = c * dx - s * dz;
  const lz = s * dx + c * dz;
  return lx > f.x0 - margin && lx < f.x1 + margin && lz > f.z0 - margin && lz < f.z1 + margin;
}

export function buildCircuit(opts: { quality: number; tier: 0 | 1 | 2; glows: Glows; shadows: boolean }) {
  const { glows, tier } = opts;
  const group = new Group();
  const rand = rng(31);
  const mat = worldMaterial();
  /** Where the stands, the pit building and the light poles are, so the parkland keeps clear. */
  const footprints: Footprint[] = [];
  const poles: [number, number][] = [];

  /* ───────── pylons first: the track's light pools follow them ───────── */
  const pylons: { i: number; side: 1 | -1 }[] = [];
  for (let i = 4, k = 0; i < N; i += 12, k++) pylons.push({ i, side: k % 2 ? 1 : -1 });
  const pool = (i: number, side: number, d: number) => {
    // Brightest under each pylon's heads, a little brighter on its side of the track
    let best = 0;
    for (const p of pylons) {
      const di = Math.min(Math.abs(p.i - i), N - Math.abs(p.i - i));
      if (di > 12) continue;
      const along = di * 3;
      const across = Math.abs(d - p.side * (HALF + 4)) * 0.5;
      best = Math.max(best, Math.exp(-(along * along + across * across) / 420));
    }
    return 0.82 + 0.45 * best + side * 0;
  };

  /* ───────── the racing surface, kerbs, edge lines and run-off ───────── */
  const strip = new Strip();
  const asphalt = new Color(C.asphalt);
  const rubber = new Color("#2c2f35");
  const runoff = new Color("#33465c");
  const kerbRed = new Color(C.ember);
  const kerbWhite = new Color("#f1ece2");
  const line = new Color("#ecebe6");
  const tmp = new Color();
  // Budget phones: every other centre-line point, and one band of tarmac instead of five
  const step = tier === 0 ? 2 : 1;
  const lanes = tier === 0 ? [-HALF + LINE, HALF - LINE] : [-HALF + LINE, -3.4, -1.2, 1.2, 3.4, HALF - LINE];
  for (let i = 0; i < N; i += step) {
    const j = (i + step) % N;
    const s = samples[i];
    // The rubbered racing line drifts to the inside of corners
    const lineAt = Math.max(-3, Math.min(3, s.curv * 160));
    const band = (a: number, b: number, color: Color | string, lit: number, y = 0) => {
      const A = off(i, a);
      const B = off(i, b);
      const Cc = off(j, b);
      const D = off(j, a);
      strip.quad(A.x, A.z, D.x, D.z, Cc.x, Cc.z, B.x, B.z, y, color, lit * pool(i, 0, (a + b) / 2), lit * pool(j, 0, (a + b) / 2));
    };
    for (let k = 0; k < lanes.length - 1; k++) {
      const mid = (lanes[k] + lanes[k + 1]) / 2;
      const r = Math.exp(-((mid - lineAt) ** 2) / 8);
      tmp.copy(asphalt).lerp(rubber, r * 0.8 + (rand() - 0.5) * 0.12);
      band(lanes[k], lanes[k + 1], tmp.clone(), 1.15);
    }
    band(-HALF, -HALF + LINE, line, 1.1);
    band(HALF - LINE, HALF, line, 1.1);
    for (const side of [1, -1] as const) {
      const kerb = side > 0 ? s.kerbR : s.kerbL;
      const edge = HALF;
      if (kerb) {
        // Three stripes per segment, about a metre each
        const stripes = 3 * step;
        for (let q = 0; q < stripes; q++) {
          const A = off(i, edge * side);
          const B = off(i, (edge + KERB) * side);
          const Cc = off(j, (edge + KERB) * side);
          const D = off(j, edge * side);
          const t0 = q / stripes;
          const t1 = (q + 1) / stripes;
          const L = (p: { x: number; z: number }, P: { x: number; z: number }, t: number) => ({ x: p.x + (P.x - p.x) * t, z: p.z + (P.z - p.z) * t });
          const a = L(A, D, t0);
          const b = L(B, Cc, t0);
          const c = L(B, Cc, t1);
          const d = L(A, D, t1);
          const red = (i * 3 + q) % 2 === 0;
          strip.quad(a.x, a.z, d.x, d.z, c.x, c.z, b.x, b.z, 0.03, red ? kerbRed : kerbWhite, 1.05);
        }
      }
      const from = kerb ? edge + KERB : edge;
      const to = wallOffset(i, side);
      band(from * side, to * side, runoff, 0.75, -0.005);
    }
  }

  // The pit lane, where it isn't already the circuit
  const pitAsphalt = new Color("#40434a");
  for (let i = 0; i < pit.length - 1; i++) {
    const a = pit[i];
    const b = pit[i + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const l = Math.hypot(dx, dz) || 1;
    const rx = -dz / l;
    const rz = dx / l;
    const mx = (a.x + b.x) / 2;
    const mz = (a.z + b.z) / 2;
    const inside = drivable(mx, mz) < -0.5 && pitDist(mx, mz).d > -PIT_HALF + 0.2 && (() => {
      // Inside the circuit's own walls: the track strip already covers it
      const h = drivable(mx, mz);
      return h < -1 && Math.min(...[1, -1].map((s) => Math.abs(drivable(mx + rx * s * PIT_HALF, mz + rz * s * PIT_HALF)))) < 0;
    })();
    if (inside) continue;
    for (const [d0, d1, color, lit] of [
      [-PIT_HALF, -PIT_HALF + 0.2, line, 1],
      [-PIT_HALF + 0.2, -0.9, pitAsphalt, 1.1],
      [-0.9, -0.75, line, 1],
      [-0.75, PIT_HALF - 0.2, pitAsphalt, 1.05],
      [PIT_HALF - 0.2, PIT_HALF, line, 1],
    ] as const)
      strip.quad(a.x + rx * d0, a.z + rz * d0, b.x + rx * d0, b.z + rz * d0, b.x + rx * d1, b.z + rz * d1, a.x + rx * d1, a.z + rz * d1, -0.012, color, lit);
  }
  const surface = new Mesh(strip.geometry(), mat);
  surface.receiveShadow = opts.shadows;
  surface.name = "track";
  group.add(surface);

  /* ───────── markings on top: start line, grid slots, pit boxes ───────── */
  const marks = new Strip();
  {
    // Chequered start line, half-metre squares
    const cols = Math.round((HALF * 2) / 0.5);
    for (let r = 0; r < 2; r++)
      for (let c = 0; c < cols; c++) {
        const d0 = -HALF + c * 0.5;
        const p = samples[0];
        const ax = p.x - p.tz * d0 + p.tx * (r - 1) * 0.5;
        const az = p.z + p.tx * d0 + p.tz * (r - 1) * 0.5;
        const bx = ax - p.tz * 0.5;
        const bz = az + p.tx * 0.5;
        marks.quad(ax, az, bx, bz, bx + p.tx * 0.5, bz + p.tz * 0.5, ax + p.tx * 0.5, az + p.tz * 0.5, 0.02, (r + c) % 2 ? "#f4f1ea" : "#16181c", 1.1);
      }
    // Grid slots: staggered, eight metres apart, behind the line
    for (let k = 0; k < 10; k++) {
      const back = 6 + k * 8;
      const i = (N - Math.round(back / 3)) % N;
      const p = samples[i];
      const side = k % 2 ? 1 : -1;
      const d = side * 2.6;
      const cx = p.x - p.tz * d;
      const cz = p.z + p.tx * d;
      const rect = (along0: number, along1: number, across0: number, across1: number) => {
        const P = (al: number, ac: number) => ({ x: cx + p.tx * al - p.tz * ac, z: cz + p.tz * al + p.tx * ac });
        const a = P(along0, across0);
        const b = P(along1, across0);
        const c = P(along1, across1);
        const e = P(along0, across1);
        marks.quad(a.x, a.z, b.x, b.z, c.x, c.z, e.x, e.z, 0.02, "#ecebe6", 1.1);
      };
      rect(1.8, 2.05, -1.5, 1.5);
      rect(0.4, 2.05, -1.5, -1.3);
      rect(0.4, 2.05, 1.3, 1.5);
    }
    // Pit boxes in front of each garage
    const boxColors = [C.ember, C.sky, "#ffd27a", C.paper, "#7bd88f", C.wine];
    for (let g = 0; g < 12; g++) {
      const x0 = PIT_BOXES.x0 + 8 + g * ((PIT_BOXES.x1 - PIT_BOXES.x0 - 16) / 12);
      const z0 = PIT_BOXES.z - PIT_HALF + 0.3;
      marks.quad(x0, z0, x0 + 9, z0, x0 + 9, z0 + 3.6, x0, z0 + 3.6, 0.0, boxColors[g % boxColors.length], 0.9);
    }
  }
  const markMat = worldMaterial({ polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const markings = new Mesh(marks.geometry(), markMat);
  markings.receiveShadow = opts.shadows;
  group.add(markings);

  /* ───────── walls, fences and boards along every boundary ───────── */
  const walls = new Batch();
  const fence: number[] = [];
  const fenceUv: number[] = [];
  const boardPos: number[] = [];
  const boardUv: number[] = [];
  const concrete = new Color("#d9d3c6");
  const cap = new Color(C.ember);
  const outer = new Color("#8f8a80");
  const posts = new Batch();
  let boardIndex = 0;

  /** Builds wall runs from a polyline of boundary points; `inward` is the unit normal pointing at the track. */
  const runWall = (pts: { x: number; z: number; nx: number; nz: number; keep: boolean }[], withFence: boolean, closed: boolean) => {
    const n = pts.length;
    // A board spans about 12 m of wall, whatever the spacing of the points
    const segs = Math.max(2, Math.round(12 / (Math.hypot(pts[1].x - pts[0].x, pts[1].z - pts[0].z) || 3)));
    let along = 0;
    let sinceBoard = 999;
    for (let k = 0; k < (closed ? n : n - 1); k++) {
      const a = pts[k];
      const b = pts[(k + 1) % n];
      if (!a.keep || !b.keep) {
        sinceBoard = 999;
        continue;
      }
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      if (len > 16) continue;
      // Inner face at the boundary, outer face WALL_T behind it
      const ia = { x: a.x, z: a.z };
      const ib = { x: b.x, z: b.z };
      const oa = { x: a.x - a.nx * WALL_T, z: a.z - a.nz * WALL_T };
      const ob = { x: b.x - b.nx * WALL_T, z: b.z - b.nz * WALL_T };
      const g = new BufferGeometry();
      const P = [
        // inner face
        ia.x, 0, ia.z, ib.x, 0, ib.z, ib.x, WALL_H, ib.z,
        ia.x, 0, ia.z, ib.x, WALL_H, ib.z, ia.x, WALL_H, ia.z,
        // top
        ia.x, WALL_H, ia.z, ib.x, WALL_H, ib.z, ob.x, WALL_H, ob.z,
        ia.x, WALL_H, ia.z, ob.x, WALL_H, ob.z, oa.x, WALL_H, oa.z,
        // outer face
        oa.x, 0, oa.z, ob.x, WALL_H, ob.z, ob.x, 0, ob.z,
        oa.x, 0, oa.z, oa.x, WALL_H, oa.z, ob.x, WALL_H, ob.z,
      ];
      g.setAttribute("position", new Float32BufferAttribute(P, 3));
      const col: number[] = [];
      for (let v = 0; v < 18; v++) {
        const c = v < 6 ? (P[v * 3 + 1] > WALL_H - 0.01 && v !== 0 && v !== 1 && v !== 3 ? concrete : concrete) : v < 12 ? cap : outer;
        col.push(c.r, c.g, c.b);
      }
      g.setAttribute("color", new Float32BufferAttribute(col, 3));
      // Make sure the inner face's normal points at the track
      g.computeVertexNormals();
      const nrm = g.attributes.normal as BufferAttribute;
      if (nrm.getX(0) * a.nx + nrm.getZ(0) * a.nz < 0) {
        const p = g.attributes.position as BufferAttribute;
        for (let t = 0; t < 6; t += 3) {
          const x = p.getX(t + 1);
          const y = p.getY(t + 1);
          const z = p.getZ(t + 1);
          p.setXYZ(t + 1, p.getX(t + 2), p.getY(t + 2), p.getZ(t + 2));
          p.setXYZ(t + 2, x, y, z);
        }
        for (let t = 6; t < 18; t += 3) {
          const x = p.getX(t + 1);
          const y = p.getY(t + 1);
          const z = p.getZ(t + 1);
          p.setXYZ(t + 1, p.getX(t + 2), p.getY(t + 2), p.getZ(t + 2));
          p.setXYZ(t + 2, x, y, z);
        }
        g.computeVertexNormals();
      }
      walls.add(g, concrete, 0.85);

      // Catch fence: leaning slightly over the track at the top
      if (withFence) {
        const lean = 0.5;
        const fa = { x: oa.x + a.nx * (WALL_T * 0.5 + lean), z: oa.z + a.nz * (WALL_T * 0.5 + lean) };
        const fb = { x: ob.x + b.nx * (WALL_T * 0.5 + lean), z: ob.z + b.nz * (WALL_T * 0.5 + lean) };
        const ma = { x: oa.x + a.nx * WALL_T * 0.5, z: oa.z + a.nz * WALL_T * 0.5 };
        const mb = { x: ob.x + b.nx * WALL_T * 0.5, z: ob.z + b.nz * WALL_T * 0.5 };
        fence.push(ma.x, WALL_H, ma.z, mb.x, WALL_H, mb.z, fb.x, FENCE_TOP, fb.z, ma.x, WALL_H, ma.z, fb.x, FENCE_TOP, fb.z, fa.x, FENCE_TOP, fa.z);
        const u0 = along / 1.4;
        const u1 = (along + len) / 1.4;
        const v1 = (FENCE_TOP - WALL_H) / 1.4;
        fenceUv.push(u0, 0, u1, 0, u1, v1, u0, 0, u1, v1, u0, v1);
        if (k % 2 === 0) posts.add(new BoxGeometry(0.12, FENCE_TOP - WALL_H + 0.2, 0.12).translate(0, (FENCE_TOP + WALL_H) / 2, 0), C.steel, 0.4, new Matrix4().makeRotationZ(0).setPosition(ma.x + a.nx * lean * 0.5, 0, ma.z + a.nz * lean * 0.5));
      }
      along += len;

      // Boards: every so often, a 12 m banner on the inner face
      sinceBoard += len;
      if (sinceBoard > 26 && k + segs < n && pts.slice(k, k + segs + 1).every((p) => p.keep)) {
        sinceBoard = -12;
        const row = boardIndex++ % BOARDS.length;
        const v0 = 1 - (row + 1) / BOARDS.length;
        const v1 = 1 - row / BOARDS.length;
        let u = 0;
        const span = pts.slice(k, k + segs + 1);
        const total = span.slice(1).reduce((s, p, q) => s + Math.hypot(p.x - span[q].x, p.z - span[q].z), 0);
        for (let q = 0; q < segs; q++) {
          const p0 = span[q];
          const p1 = span[q + 1];
          const l = Math.hypot(p1.x - p0.x, p1.z - p0.z);
          const e = 0.03;
          const A = { x: p0.x + p0.nx * e, z: p0.z + p0.nz * e };
          const B = { x: p1.x + p1.nx * e, z: p1.z + p1.nz * e };
          const ua = u / total;
          const ub = (u + l) / total;
          // Text reads left to right for someone on the track looking at the wall
          const forward = (B.x - A.x) * p0.nz - (B.z - A.z) * p0.nx > 0;
          const y0 = 0.12;
          const y1 = 0.95;
          const [ra, rb] = forward ? [ua, ub] : [1 - ua, 1 - ub];
          boardPos.push(A.x, y0, A.z, B.x, y0, B.z, B.x, y1, B.z, A.x, y0, A.z, B.x, y1, B.z, A.x, y1, A.z);
          boardUv.push(ra, v0, rb, v0, rb, v1, ra, v0, rb, v1, ra, v1);
          u += l;
        }
      }
    }
  };

  // Track walls, both sides: dropped where the pit lane opens into the circuit
  for (const side of [1, -1] as const) {
    const pts = samples.map((p, i) => {
      const o = wallOffset(i, side);
      const q = off(i, o * side);
      return { x: q.x, z: q.z, nx: p.tz * side, nz: -p.tx * side, keep: pitDist(q.x, q.z).d > 0.4 };
    });
    runWall(pts.filter((_, i) => i % step === 0), tier > 0, true);
  }
  // Pit lane walls: none on the garage side along the boxes (the garages are the wall there)
  for (const side of [1, -1] as const) {
    const pts = pit.map((p, i) => {
      const nb = pit[Math.min(pit.length - 1, i + 1)];
      const pb = pit[Math.max(0, i - 1)];
      const dx = nb.x - pb.x;
      const dz = nb.z - pb.z;
      const l = Math.hypot(dx, dz) || 1;
      const rx = -dz / l;
      const rz = dx / l;
      const x = p.x + rx * side * PIT_HALF;
      const z = p.z + rz * side * PIT_HALF;
      const garage = side < 0 && p.x > PIT_BOXES.x0 - 2 && p.x < PIT_BOXES.x1 + 2 && Math.abs(p.z - PIT_BOXES.z) < 2;
      return { x, z, nx: -rx * side, nz: -rz * side, keep: !garage && drivable(x, z) > 0.4 && i % 2 === 0 };
    });
    runWall(pts.filter((_, i) => i % 2 === 0), tier > 0, false);
  }
  const wallMesh = new Mesh(walls.build(), mat);
  wallMesh.receiveShadow = opts.shadows;
  wallMesh.name = "walls";
  group.add(wallMesh);
  if (!posts.empty) group.add(new Mesh(posts.build(), mat));
  if (fence.length) {
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(fence, 3));
    g.setAttribute("uv", new Float32BufferAttribute(fenceUv, 2));
    g.computeBoundingSphere();
    const fenceMat = new MeshBasicMaterial({ map: fenceTexture(), color: "#c9d2dc", alphaTest: 0.5, side: DoubleSide });
    const f = new Mesh(g, fenceMat);
    f.userData.fence = fenceMat;
    group.add(f);
  }
  const boardTex = textTexture(
    BOARDS.map(([text, bg, fg]) => ({ text, bg, fg, size: 0.6 })),
    1024,
    64 * BOARDS.length,
  );
  {
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(boardPos, 3));
    g.setAttribute("uv", new Float32BufferAttribute(boardUv, 2));
    g.computeBoundingSphere();
    group.add(new Mesh(g, new MeshBasicMaterial({ map: boardTex, side: DoubleSide })));
  }

  /* ───────── TecPro barriers on the outside of the corners ───────── */
  {
    const spots: Matrix4[] = [];
    const colors: Color[] = [];
    const palette = [new Color(C.ember), new Color("#f1ece2"), new Color(C.ink)];
    for (let i = 0; i < N; i += 1) {
      const s = samples[i];
      for (const side of [1, -1] as const) {
        const run = side > 0 ? s.runR : s.runL;
        if (run < 5.5) continue;
        const o = wallOffset(i, side) - 0.55;
        const q = off(i, o * side);
        if (pitDist(q.x, q.z).d < 2) continue;
        const m = new Matrix4().makeRotationY(Math.atan2(-s.tx, -s.tz));
        m.setPosition(q.x, 0.5, q.z);
        spots.push(m);
        colors.push(palette[(i + (side > 0 ? 0 : 1)) % 3]);
      }
    }
    const geo = new BoxGeometry(1.0, 1.0, 2.9);
    geo.setAttribute("aLit", new BufferAttribute(new Float32Array(geo.attributes.position.count).fill(0.75), 1));
    const tec = new InstancedMesh(geo, worldMaterial({ vertexColors: false }), spots.length);
    spots.forEach((m, k) => {
      tec.setMatrixAt(k, m);
      tec.setColorAt(k, colors[k]);
    });
    tec.computeBoundingSphere();
    group.add(tec);
  }

  /* ───────── floodlight pylons: poles, lamp heads and glows ───────── */
  {
    const b = new Batch();
    // Pole (lattice reads as a slim box), arm reaching over the wall, a bank of lamps facing the track
    b.add(new BoxGeometry(0.45, 17, 0.45).translate(0, 8.5, 0), "#6c7580", 0.15);
    b.add(new BoxGeometry(0.3, 0.3, 4.2).translate(0, 16.6, -1.8), "#6c7580", 0.15);
    b.add(new BoxGeometry(2.6, 1.2, 0.35).translate(0, 16.2, -3.6), "#30353c", 0.1);
    if (tier === 0) b.add(new BoxGeometry(2.3, 1.0, 0.12).translate(0, 16.2, -3.82), "#fff7e6", 2.6);
    else for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) b.add(new BoxGeometry(0.5, 0.42, 0.12).translate(-0.9 + c * 0.6, 15.9 + r * 0.6, -3.82), "#fff7e6", 2.6);
    const geo = b.build();
    const list: Matrix4[] = [];
    const add = (x: number, z: number, fx: number, fz: number) => {
      // Local -z points at the track
      const m = new Matrix4().makeRotationY(Math.atan2(-fx, -fz));
      m.setPosition(x, 0, z);
      list.push(m);
      poles.push([x, z]);
      const hx = x + fx * 3.6;
      const hz = z + fz * 3.6;
      glows.add(hx, 16.2, hz, 7, "#fff3d6", 0.85);
      if (tier > 0) glows.add(hx, 16.2, hz, 22, "#ffe2b0", 0.12);
    };
    for (const p of pylons) {
      const o = wallOffset(p.i, p.side) + 2.4;
      const q = off(p.i, o * p.side);
      if (pitDist(q.x, q.z).d < 1.5 || inWater(q.x, q.z)) continue;
      const s = samples[p.i];
      add(q.x, q.z, s.tz * p.side, -s.tx * p.side);
    }
    const inst = new InstancedMesh(geo, mat, list.length);
    list.forEach((m, k) => inst.setMatrixAt(k, m));
    inst.computeBoundingSphere();
    inst.name = "pylons";
    group.add(inst);
  }

  /* ───────── start gantry and lights ───────── */
  const lightSlots: { mesh: InstancedMesh; glow: number[] } = { mesh: null!, glow: [] };
  {
    const p = samples[2];
    const b = new Batch();
    const span = Math.max(wallOffset(2, 1), wallOffset(2, -1)) + 1.5;
    for (const side of [1, -1]) {
      b.add(new BoxGeometry(0.7, 9.2, 0.7).translate(side * span, 4.6, 0), "#4c535c", 0.6);
      poles.push([p.x - p.tz * span * side, p.z + p.tx * span * side]);
    }
    b.add(new BoxGeometry(span * 2 + 0.7, 1.1, 0.9).translate(0, 8.4, 0), "#3a4048", 0.5);
    b.add(new BoxGeometry(span * 2 + 0.7, 0.18, 1.0).translate(0, 9.0, 0), C.ember, 0.8);
    b.add(new BoxGeometry(5.2, 1.5, 0.5).translate(0, 7.3, 0), "#0c0d10", 0);
    const g = b.build();
    const m = new Mesh(g, mat);
    m.position.set(p.x, 0, p.z);
    m.rotation.y = Math.atan2(-p.tx, -p.tz);
    group.add(m);
    // Banner across the top, facing the grid
    const tex = textTexture([{ text: "BAY STREET CIRCUIT  ·  NIGHT RACE", bg: C.ink, fg: C.paper, size: 0.5 }], 1024, 64);
    const banner = new Mesh(new BoxGeometry(span * 2 - 2, 0.9, 0.05), new MeshBasicMaterial({ map: tex }));
    banner.position.set(0, 8.4, 0.48);
    m.add(banner);
    // Five columns of two red lights, facing back down the grid (+z local)
    const lights = new InstancedMesh(new CircleGeometry(0.2, 14), new MeshBasicMaterial({ color: "#ffffff" }), 10);
    const o = new Object3D();
    for (let c = 0; c < 5; c++)
      for (let r = 0; r < 2; r++) {
        o.position.set(-2 + c, 7.0 + r * 0.55, 0.26);
        o.updateMatrix();
        lights.setMatrixAt(c * 2 + r, o.matrix);
        lights.setColorAt(c * 2 + r, new Color("#2a0808"));
      }
    m.add(lights);
    lightSlots.mesh = lights;
    m.updateMatrixWorld(true);
    const v = new Vector3();
    for (let c = 0; c < 5; c++) {
      v.set(-2 + c, 7.27, 0.6).applyMatrix4(m.matrixWorld);
      lightSlots.glow.push(glows.add(v.x, v.y, v.z, 2.2, "#ff2a1f", 0, true));
    }
  }

  /* ───────── grandstands ───────── */
  const stands = new Batch();
  const crowd = [C.paper, C.ember, C.ink, C.sky, "#f2f2f2", C.wine, "#ffd27a", "#2b2b30", "#e8b9a0", C.ember];
  const grandstand = (x: number, z: number, fx: number, fz: number, length: number, rows: number, roof = true) => {
    const local = new Batch();
    for (let r = 0; r < rows; r++) {
      const y = 0.6 + r * 0.55;
      const d = r * 0.9;
      local.add(new BoxGeometry(length, 0.55, 0.9).translate(0, y - 0.27, d), "#5d646e", 0.35);
      // People: one metre of colour per seat block, a few gaps
      // People: one coloured face per seat block (two on budget phones), a few gaps
      const seat = tier === 0 ? 2.4 : 1.2;
      for (let s = 0; s < length; s += seat) {
        if (rand() < 0.12) continue;
        const col = crowd[Math.floor(rand() * crowd.length)];
        local.add(new PlaneGeometry(seat - 0.2, 0.6).rotateY(Math.PI).rotateX(0.35).translate(-length / 2 + s + seat / 2, y + 0.3, d - 0.2), col, 0.55);
      }
    }
    const depth = rows * 0.9;
    const top = 0.6 + rows * 0.55;
    local.add(new BoxGeometry(length, top + 2.5, 0.4).translate(0, (top + 2.5) / 2, depth + 0.1), "#454b54", 0.2);
    if (roof) {
      local.add(new BoxGeometry(length + 1, 0.3, depth + 3).translate(0, top + 3, depth / 2 - 0.6), "#e9e4d8", 0.35);
      local.add(new BoxGeometry(length + 1, 0.5, 0.2).translate(0, top + 2.8, -2.1), C.ember, 0.9);
      for (let s = -length / 2; s <= length / 2; s += 12) local.add(new BoxGeometry(0.25, top + 3, 0.25).translate(s, (top + 3) / 2, depth), "#7a828c", 0.2);
    }
    const g = local.build();
    // Local -z faces the track
    g.applyMatrix4(new Matrix4().makeRotationY(Math.atan2(-fx, -fz)).setPosition(x, 0, z));
    footprints.push({ x, z, ry: Math.atan2(-fx, -fz), x0: -length / 2 - 0.5, x1: length / 2 + 0.5, z0: roof ? -2.6 : -0.6, z1: depth + 0.6 });
    stands.add(g, "#ffffff");
  };
  const standAt = (frac: number, side: 1 | -1, length: number, rows: number, gap = 3.5) => {
    const p = besideTrack(frac, side, 0);
    const o = wallOffset(p.i, side) + gap;
    const q = besideTrack(frac, side, o);
    const s = samples[q.i];
    grandstand(q.x, q.z, s.tz * side, -s.tx * side, length, rows);
  };
  standAt(0.995, 1, 150, tier ? 14 : 10);
  standAt(0.125, 1, 60, 10, 4);
  standAt(0.21, -1, 50, 8, 18);
  standAt(0.405, 1, 60, 10);
  standAt(0.6, -1, 70, 9, 5);
  standAt(0.725, -1, 50, 9);
  // The float's stand, on its north edge facing the circuit
  grandstand(SET.float.x, SET.float.z - SET.float.d / 2 + 6, 0, -1, SET.float.w * 0.8, 9);
  const standMesh = new Mesh(stands.build(), mat);
  standMesh.name = "stands";
  group.add(standMesh);

  /* ───────── the pit building, pit wall stands ───────── */
  {
    const b = new Batch();
    const front = PIT_BOXES.z - PIT_HALF - 0.4;
    const depth = 20;
    const len = PIT_BOXES.x1 - PIT_BOXES.x0;
    const cx = (PIT_BOXES.x0 + PIT_BOXES.x1) / 2;
    // Ground floor shell, upper hospitality floor with glass, roof with a red fascia
    b.add(new BoxGeometry(len, 0.6, depth).translate(cx, 6.3, front - depth / 2), "#d8d3c8", 0.5);
    b.add(new BoxGeometry(len, 3.2, depth - 2).translate(cx, 8.2, front - depth / 2 - 1), "#2a3a4a", 0.3);
    b.add(new BoxGeometry(len, 2.4, 0.1).translate(cx, 8.2, front - 1.05), "#9cc3dd", 1.1);
    b.add(new BoxGeometry(len + 2, 0.5, depth + 3).translate(cx, 10.05, front - depth / 2 + 1), "#ece7dc", 0.45);
    b.add(new BoxGeometry(len + 2, 0.7, 0.2).translate(cx, 9.8, front + 2.5), C.ember, 1.0);
    b.add(new BoxGeometry(len, 6, 0.4).translate(cx, 3, front - depth), "#cfc9bc", 0.3);
    footprints.push({ x: cx, z: front - depth / 2, ry: 0, x0: -len / 2 - 16, x1: len / 2 + 16, z0: -depth / 2 - 1, z1: depth / 2 + 3 });
    const garages = 12;
    const gw = (len - 16) / garages;
    for (let g = 0; g <= garages; g++) {
      // Dividing walls between garages
      const x = PIT_BOXES.x0 + 8 + g * gw - 0.5;
      b.add(new BoxGeometry(1.2, 6, depth).translate(x, 3, front - depth / 2), "#e2ddd1", 0.45);
    }
    for (let g = 0; g < garages; g++) {
      const x = PIT_BOXES.x0 + 8 + g * gw + gw / 2 - 0.5;
      // Bright interior: back wall, floor, a team colour on the side walls
      b.add(new BoxGeometry(gw - 1.2, 5.8, 0.2).translate(x, 2.9, front - depth + 0.5), "#f4efe4", 1.6);
      b.add(new BoxGeometry(gw - 1.2, 0.05, depth - 1).translate(x, 0.03, front - depth / 2), "#8a8f97", 1.2);
      const team = [C.ember, C.sky, "#ffd27a", C.paper, "#7bd88f", C.wine][g % 6];
      b.add(new BoxGeometry(gw - 1.4, 0.8, 0.1).translate(x, 5.2, front - depth + 0.7), team, 1.4);
    }
    // Ends of the building
    for (const x of [PIT_BOXES.x0 - 0.5, PIT_BOXES.x1 + 0.5]) b.add(new BoxGeometry(16, 10, depth).translate(x + (x < cx ? -7.5 : 7.5), 5, front - depth / 2), "#d8d3c8", 0.4);
    // Pit wall stands: little roofed desks with screens on the pit wall
    const wallZ = (() => {
      const p = besideTrack(0, -1, wallOffset(0, -1));
      return p.z - 1.2;
    })();
    for (let x = PIT_BOXES.x0 + 20; x < PIT_BOXES.x1 - 10; x += 32) {
      b.add(new BoxGeometry(7, 0.15, 2.2).translate(x, 3.2, wallZ), "#2b3038", 0.3);
      b.add(new BoxGeometry(6.6, 0.7, 0.1).translate(x, 2.2, wallZ + 0.6), "#5a8fb8", 1.3);
      for (const sx of [-3.2, 3.2]) b.add(new BoxGeometry(0.15, 3.2, 0.15).translate(x + sx, 1.6, wallZ), "#6c7580", 0.2);
    }
    const m = new Mesh(b.build(), mat);
    m.receiveShadow = opts.shadows;
    group.add(m);
    // A row of glows along the hospitality glass
    for (let x = PIT_BOXES.x0 + 10; x < PIT_BOXES.x1; x += 24) glows.add(x, 8.2, front + 0.3, 3, "#bfe0ff", 0.45);
  }

  /* ───────── the river bridge: fascia under the deck and two steel arches ───────── */
  {
    const over = samples.map((p) => inWater(p.x, p.z));
    let i0 = -1;
    let i1 = -1;
    for (let i = 0; i < N; i++)
      if (over[i]) {
        if (i0 < 0) i0 = i;
        i1 = i;
      }
    if (i0 >= 0) {
      const b = new Batch();
      i0 = Math.max(0, i0 - 3);
      i1 = Math.min(N - 1, i1 + 3);
      for (let i = i0; i < i1; i++) {
        for (const side of [1, -1] as const) {
          const o = (wallOffset(i, side) + 0.6) * side;
          const a = off(i, o);
          const c = off(i + 1, o);
          const l = Math.hypot(c.x - a.x, c.z - a.z);
          b.place(new BoxGeometry(0.6, 1.8, l + 0.05), "#8e8a80", 0.3, (a.x + c.x) / 2, -0.9, (a.z + c.z) / 2, Math.atan2(c.x - a.x, c.z - a.z));
        }
        // Deck underside
        const a = off(i, 0);
        const c = off(i + 1, 0);
        const w = wallOffset(i, 1) + wallOffset(i, -1) + 1.2;
        b.place(new BoxGeometry(w, 0.5, Math.hypot(c.x - a.x, c.z - a.z) + 0.05), "#6e6b64", 0.15, (a.x + c.x) / 2, -1.2, (a.z + c.z) / 2, Math.atan2(c.x - a.x, c.z - a.z), 0, 0);
      }
      for (const side of [1, -1] as const) {
        const pts: Vector3[] = [];
        const steps = 16;
        for (let k = 0; k <= steps; k++) {
          const t = k / steps;
          const i = Math.round(i0 + (i1 - i0) * t);
          const q = off(i, (wallOffset(i, side) + 0.9) * side);
          pts.push(new Vector3(q.x, 0.8 + Math.sin(Math.PI * t) * 10, q.z));
        }
        b.add(new TubeGeometry(new CatmullRomCurve3(pts), 32, 0.35, 6, false), "#b9c3cc", 0.55);
        for (let k = 1; k < steps; k++) {
          const p = pts[k];
          b.add(new CylinderGeometry(0.06, 0.06, p.y, 4).translate(p.x, p.y / 2, p.z), "#b9c3cc", 0.4);
          if (k % 2 === 0) glows.add(p.x, p.y + 0.4, p.z, 1.6, "#cfe6ff", 0.6);
        }
      }
      group.add(new Mesh(b.build(), mat));
    }
  }

  /* ───────── ground, parks and the quay ───────── */
  {
    const shape = new Shape();
    const R = 1500;
    shape.moveTo(-R, -R);
    shape.lineTo(R, -R);
    shape.lineTo(R, R);
    shape.lineTo(-R, R);
    shape.closePath();
    // One hole: the bay with the river cut into its north shore
    const hole = new Shape();
    const wp = water;
    wp.forEach(([x, z], k) => (k ? hole.lineTo(x, -z) : hole.moveTo(x, -z)));
    hole.closePath();
    shape.holes.push(hole);
    const ground = new ShapeGeometry(shape);
    ground.rotateX(-Math.PI / 2);
    ground.translate(0, -0.06, 0);
    const b = new Batch();
    b.add(ground, "#45484d", 0);
    // Parks: the infield green and a strip along the promenade
    const g = SET.green;
    const green = new BoxGeometry(g.x1 - g.x0, 0.1, g.z1 - g.z0).translate((g.x0 + g.x1) / 2, -0.04, (g.z0 + g.z1) / 2);
    b.add(green, "#34502f", 0.22);
    // Quay walls round the water, and a railing on top
    for (let k = 0; k < wp.length; k++) {
      const [ax, az] = wp[k];
      const [bx, bz] = wp[(k + 1) % wp.length];
      const l = Math.hypot(bx - ax, bz - az);
      if (l < 0.5) continue;
      const ry = Math.atan2(bx - ax, bz - az);
      b.place(new BoxGeometry(0.8, 2.2, l + 0.6), "#a49e92", 0.25, (ax + bx) / 2, -1.15, (az + bz) / 2, ry);
      b.place(new BoxGeometry(0.08, 0.08, l), "#c9ccd1", 0.4, (ax + bx) / 2, 1.0, (az + bz) / 2, ry);
    }
    const m = new Mesh(b.build(), mat);
    m.receiveShadow = opts.shadows;
    group.add(m);
  }

  /* ───────── start lights ───────── */
  const red = new Color("#ff2a1f");
  const off_ = new Color("#2a0808");
  let lastLit = -1;
  return {
    group,
    footprints,
    poles,
    /** Fences fade with the floodlights. */
    fenceMaterial: group.children.find((c) => c.userData.fence)?.userData.fence as MeshBasicMaterial | undefined,
    /** Shows `lit` columns of red lights (0 = all out). */
    setStartLights(lit: number) {
      if (lit === lastLit) return;
      lastLit = lit;
      for (let c = 0; c < 5; c++)
        for (let r = 0; r < 2; r++) lightSlots.mesh.setColorAt(c * 2 + r, c < lit ? red : off_);
      lightSlots.mesh.instanceColor!.needsUpdate = true;
      lightSlots.glow.forEach((g, c) => glows.set(g, c < lit ? 1.2 : 0));
    },
    /** For the night look: how strongly world surfaces glow. */
    flood: LIGHTS.uFlood,
    landmarkSpots: landmarks.map((l) => [l.x, l.z] as [number, number]),
  };
}

export { WATER_LEVEL };
