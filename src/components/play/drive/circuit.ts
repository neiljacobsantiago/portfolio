import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  CircleGeometry,
  ClampToEdgeWrapping,
  Color,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  NoColorSpace,
  Object3D,
  RepeatWrapping,
  RingGeometry,
  SRGBColorSpace,
  type Texture,
  TubeGeometry,
  Vector2,
  Vector3,
} from "three";
import type { Glows } from "./glow";
import { asphaltMaps, Batch, BoardAtlas, type BoardLine, bevelBox, C, concreteMaps, crowdTexture, KIT, LIGHTS, litMaterial, rng, rod, Soup, worldMaterial } from "./kit";
import { cameras, type Claim, footbridge, marshals, PIT_FRONT, pitBuilding, pitWallStands, pitWallStrip, pylons, type Span, stands, startGantry, toWorld, WALKWAY } from "./layout";
import {
  HALF,
  inWater,
  KERB,
  LENGTH,
  LINE,
  N,
  pit,
  PIT_BOXES,
  PIT_HALF,
  pitDist,
  drivable,
  sampleAt,
  samples,
  SECTORS,
  wallOffset,
  WALL_T,
  WATER_LEVEL,
} from "./track";

// Everything that makes the street circuit, built from the plan in layout.ts:
//   · the racing surface: textured asphalt (aggregate, a rubbered line, tyre
//     marks in the braking zones, patches and sealed cracks), raised kerbs,
//     painted run-off, the pit lane, all floodlit per vertex in pools under
//     the pylons
//   · precast concrete walls with chamfered tops and panel joints, a
//     cranked debris fence, LED boards in the race font, TecPro blocks and
//     tyre walls on the outside of the corners, sausage kerbs at the chicane
//   · lattice floodlight pylons, the start gantry and its lights, a
//     footbridge over the east straight, grandstands with a crowd, the pit
//     building with lit garages and the pit wall gantries, camera towers,
//     marshal posts, sector and braking boards, the river bridge's arches
// Static pieces of one material merge into one draw call each.

const WALL_H = 1.05;
const FENCE_TOP = 4.3;

/** Points on the centre line's right-hand normal. */
const off = (i: number, d: number) => {
  const p = sampleAt(i);
  return { x: p.x - p.tz * d, z: p.z + p.tx * d };
};
const UP: [number, number, number] = [0, 1, 0];

/** Board texts for the walls: no brands, just the race and the person who built it. */
const WALL_BOARDS: BoardLine[] = [
  { text: "BAY STREET CIRCUIT", bg: C.ember, fg: C.paper, accent: C.paper },
  { text: "NIGHT RACE", bg: C.ink, fg: C.paper, accent: C.ember },
  { text: "NEIL JACOB SANTIAGO", bg: C.paper, fg: C.ink, accent: C.ember },
  { text: "LIGHTS OUT", bg: C.wine, fg: C.paper, accent: "#ffd27a" },
  { text: "BSIT · CLSU", bg: C.ink, fg: "#ffd27a" },
  { text: "ITSC MEDIA GROUP", bg: C.paper, fg: C.ember, accent: C.ink },
  { text: "PATHOSCAN", bg: "#123a2a", fg: "#bff0cf", accent: "#7bd88f" },
  { text: "BUILDIT", bg: "#1b2740", fg: "#9fb8ff", accent: "#9fb8ff" },
  { text: "AURORA FEST 2026", bg: C.wine, fg: "#ffd27a" },
  { text: "TRACK LIMITS APPLY", bg: C.paper, fg: C.ink, accent: C.ember },
  { text: "BUILT IN THREE.JS", bg: C.ink, fg: C.sky, accent: C.sky },
  { text: "SHOOT · BUILD · SHIP", bg: C.ember, fg: C.paper },
  { text: "STREET CIRCUIT", bg: "#14161b", fg: C.paper, accent: C.ember },
  { text: "NIGHT RACE 2026", bg: "#1d1f24", fg: C.paper, accent: C.sky },
  { text: "FAN ZONE", bg: C.sky, fg: C.ink, accent: C.ink },
  { text: "BAY STREET CIRCUIT", bg: C.ink, fg: C.ember, accent: C.paper },
].map((l) => ({ ...l, led: true }));

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
/** A plan claim as a footprint (its own frame). */
export const claimFootprint = (c: Claim): Footprint => ({ x: c.x, z: c.z, ry: c.ry, x0: -c.hw, x1: c.hw, z0: -c.hd, z1: c.hd });

/* ───────────── textures made here ───────────── */

/** Diamond mesh for the debris fence: thin wires, alpha-tested. */
function fenceTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  g.strokeStyle = "rgba(214,220,228,1)";
  g.lineWidth = 2.2;
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(64, 64);
  g.moveTo(64, 0);
  g.lineTo(0, 64);
  g.moveTo(32, -32);
  g.lineTo(96, 32);
  g.moveTo(-32, 32);
  g.lineTo(32, 96);
  g.moveTo(32, 96);
  g.lineTo(96, 32);
  g.moveTo(-32, 32);
  g.lineTo(32, -32);
  g.stroke();
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Racing line, tyre marks, patches and sealed cracks: one texel column per 10 cm across, a row per metre or so along the lap. */
function macroTexture(rows: number) {
  const cols = 128;
  const c = document.createElement("canvas");
  c.width = cols;
  c.height = rows;
  const g = c.getContext("2d")!;
  const rand = rng(4711);
  // Neutral is 230 (the shader scales by 1/0.9): fresh patches can be lighter
  g.fillStyle = "rgb(230,230,230)";
  g.fillRect(0, 0, cols, rows);
  const X = (d: number) => ((d + HALF) / (2 * HALF)) * cols;
  const Y = (s: number) => (s / LENGTH) * rows;
  const lineAt = (i: number) => Math.max(-3.4, Math.min(3.4, samples[(i + N) % N].curv * 170));
  // Patches of newer and older asphalt, with a darker seam
  for (let k = 0; k < 34; k++) {
    const s = rand() * LENGTH;
    const w = 2 + rand() * 6;
    const l = 4 + rand() * 18;
    const d = (rand() - 0.5) * (2 * HALF - w);
    const v = rand() < 0.5 ? 205 + rand() * 15 : 238 + rand() * 14;
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.fillRect(X(d - w / 2), Y(s), X(d + w / 2) - X(d - w / 2), Y(l));
    g.strokeStyle = "rgba(120,120,120,0.5)";
    g.lineWidth = 1;
    g.strokeRect(X(d - w / 2), Y(s), X(d + w / 2) - X(d - w / 2), Y(l));
  }
  // The rubbered racing line: darker where the cars run, most of all through the corners
  for (let y = 0; y < rows; y++) {
    const i = Math.floor((y / rows) * N);
    const at = X(lineAt(i));
    const k = 0.1 + Math.min(0.14, Math.abs(samples[i].curv) * 5);
    const grad = g.createLinearGradient(at - 22, 0, at + 22, 0);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(0.5, `rgba(0,0,0,${k})`);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grad;
    g.fillRect(at - 22, y, 44, 1);
  }
  // Tyre marks where the cars brake hardest, and through the slow corners
  for (let i = 0; i < N; i++) {
    const a = samples[i];
    const b = samples[(i + 25) % N];
    if (a.vmax - b.vmax < 14 || rand() < 0.75) continue;
    const len = 6 + Math.floor(rand() * 20);
    const lat = (rand() - 0.5) * 1.2;
    for (const wheel of [-0.8, 0.8]) {
      g.strokeStyle = `rgba(10,10,12,${0.25 + rand() * 0.25})`;
      g.lineWidth = 2 + rand() * 1.5;
      g.beginPath();
      for (let k = 0; k <= len; k++) {
        const j = (i + k) % N;
        const x = X(lineAt(j) + lat + wheel + Math.sin(k * 0.6 + i) * 0.08);
        const y = Y(samples[j].s);
        if (k === 0 || j === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
    }
  }
  // Sealed cracks: thin wandering tar lines
  g.strokeStyle = "rgba(25,25,28,0.55)";
  g.lineWidth = 1;
  for (let k = 0; k < 60; k++) {
    let x = rand() * cols;
    let y = rand() * rows;
    g.beginPath();
    g.moveTo(x, y);
    for (let q = 0; q < 6; q++) {
      x += (rand() - 0.5) * 14;
      y += rand() * 3;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  // The edges stay neutral: kerbs and run-off read these columns
  g.fillStyle = "rgb(230,230,230)";
  g.fillRect(0, 0, 1, rows);
  g.fillRect(cols - 1, 0, 1, rows);
  const t = new CanvasTexture(c);
  t.wrapS = ClampToEdgeWrapping;
  t.wrapT = RepeatWrapping;
  t.colorSpace = NoColorSpace;
  return t;
}

/** The track's material: asphalt detail, the lap-long macro map, floodlit vertices. */
function trackMaterial(macro: Texture, maps: ReturnType<typeof asphaltMaps>) {
  const mat = litMaterial({ vertexColors: true, map: maps.map, normalMap: maps.normalMap, roughnessMap: maps.roughnessMap, roughness: 1, normalScale: new Vector2(0.9, 0.9), envMapIntensity: 1.1 }, "track");
  const base = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader, renderer) => {
    base.call(mat, shader, renderer);
    shader.uniforms.uMacro = { value: macro };
    shader.vertexShader = shader.vertexShader.replace("#include <common>", "#include <common>\nattribute vec2 aMacro;\nvarying vec2 vMacro;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvMacro = aMacro;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform sampler2D uMacro;\nvarying vec2 vMacro;")
      .replace("#include <map_fragment>", "#include <map_fragment>\nvec3 macroC = texture2D(uMacro, vMacro).rgb;\ndiffuseColor.rgb *= macroC * 1.11;")
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor *= mix(0.72, 1.0, smoothstep(0.62, 0.9, macroC.r));");
  };
  mat.customProgramCacheKey = () => `track-${KIT.pbr}`;
  return mat;
}

/* ───────────── the circuit ───────────── */

export function buildCircuit(opts: { quality: number; tier: 0 | 1 | 2; glows: Glows; shadows: boolean }) {
  const { glows, tier } = opts;
  const group = new Group();
  const rand = rng(31);
  const disposables: { dispose: () => void }[] = [];
  const mat = worldMaterial();
  /** Static pieces of one material, merged: posts, gantries, stands, the pit building, towers, signs, the bridge. */
  const misc = new Batch();
  const boards = new BoardAtlas();
  const poles: [number, number][] = [];

  /* ───────── light pools under the pylons ───────── */
  const pyl = pylons.map((p) => ({ i: Math.round(p.frac! * N) % N, side: p.side! }));
  const byI: { i: number; side: number }[][] = Array.from({ length: N }, () => []);
  for (const p of pyl) for (let d = -12; d <= 12; d++) byI[(p.i + d + N) % N].push(p);
  const pool = (i: number, d: number) => {
    let best = 0;
    for (const p of byI[(i + N) % N]) {
      const di = Math.min(Math.abs(p.i - i), N - Math.abs(p.i - i));
      const along = di * 3;
      const across = Math.abs(d - p.side * (HALF + 3)) * 0.45;
      best = Math.max(best, Math.exp(-(along * along + across * across) / 380));
    }
    return 0.62 + 0.62 * best;
  };

  /* ───────── the racing surface, kerbs, edge lines and run-off ───────── */
  const surf = new Soup(true);
  const step = tier === 0 ? 2 : 1;
  const asphalt = new Color("#40434a");
  const runoff = new Color("#2e3a4a");
  const green = new Color("#2f6b45");
  const kerbRed = new Color(C.ember);
  const kerbWhite = new Color("#eeeae2");
  const line = new Color("#e9e8e2");
  const lanes = tier === 0 ? [-HALF + LINE, 0, HALF - LINE] : [-HALF + LINE, -3.2, -1.1, 1.1, 3.2, HALF - LINE];
  const sOf = (i: number, j: number) => (j === 0 && i !== 0 ? LENGTH : samples[j % N].s);
  /** A patch of surface between samples i and j, from t0 to t1 along, a to b across, rising from yA to yB. */
  const patch = (i: number, j: number, t0: number, t1: number, a: number, b: number, yA: number, yB: number, color: Color, lit: number, macro: boolean) => {
    const P = (t: number, d: number) => {
      const A = off(i, d);
      const B = off(j, d);
      return { x: A.x + (B.x - A.x) * t, z: A.z + (B.z - A.z) * t };
    };
    const s0 = samples[i].s + (sOf(i, j) - samples[i].s) * t0;
    const s1 = samples[i].s + (sOf(i, j) - samples[i].s) * t1;
    const p = [P(t0, a), P(t0, b), P(t1, b), P(t1, a)];
    const y = [yA, yB, yB, yA];
    const li = [pool(i, a), pool(i, b), pool(j, b), pool(j, a)].map((v) => v * lit);
    const uv = [
      [a / 4, s0 / 4],
      [b / 4, s0 / 4],
      [b / 4, s1 / 4],
      [a / 4, s1 / 4],
    ];
    const mu = (d: number) => (macro ? (d + HALF) / (2 * HALF) : -1);
    const uv1 = [
      [mu(a), s0 / LENGTH],
      [mu(b), s0 / LENGTH],
      [mu(b), s1 / LENGTH],
      [mu(a), s1 / LENGTH],
    ];
    surf.quad(
      p.map((q, k) => [q.x, y[k], q.z] as [number, number, number]),
      color,
      li,
      uv,
      uv1,
      UP,
    );
  };
  for (let i = 0; i < N; i += step) {
    const j = (i + step) % N;
    const s = samples[i];
    for (let k = 0; k < lanes.length - 1; k++) patch(i, j, 0, 1, lanes[k], lanes[k + 1], 0, 0, asphalt, 1.05, true);
    patch(i, j, 0, 1, -HALF, -HALF + LINE, 0, 0, line, 1, true);
    patch(i, j, 0, 1, HALF - LINE, HALF, 0, 0, line, 1, true);
    for (const side of [1, -1] as const) {
      const kerb = side > 0 ? s.kerbR : s.kerbL;
      const wall = wallOffset(i, side);
      const sd = (d: number) => d * side;
      if (kerb) {
        // Raised kerb: a ramp up, a ribbed top, a step down; red and white a metre at a time
        const stripes = 3 * step;
        for (let q = 0; q < stripes; q++) {
          const t0 = q / stripes;
          const t1 = (q + 1) / stripes;
          const col = (i * 3 + q) % 2 === 0 ? kerbRed : kerbWhite;
          patch(i, j, t0, t1, sd(HALF), sd(HALF + 0.35), 0, 0.05, col, 1.02, false);
          patch(i, j, t0, t1, sd(HALF + 0.35), sd(HALF + KERB - 0.18), 0.05, 0.05, col, 1.02, false);
          patch(i, j, t0, t1, sd(HALF + KERB - 0.18), sd(HALF + KERB), 0.05, -0.004, col, 0.95, false);
        }
      }
      const from = kerb ? HALF + KERB : HALF;
      // Track-limits green just beyond the edge, then run-off asphalt to the wall
      const band = Math.min(0.9, (wall - from) * 0.4);
      patch(i, j, 0, 1, sd(from), sd(from + band), -0.004, -0.004, kerb ? green : runoff, 0.85, false);
      patch(i, j, 0, 1, sd(from + band), sd(wall), -0.006, -0.006, runoff, 0.72, false);
      // Where the pit lane opens, a solid white line marks where the wall would be
      const w = off(i, sd(wall));
      if (pitDist(w.x, w.z).d < 0.4) patch(i, j, 0, 1, sd(wall - 0.3), sd(wall), 0.004, 0.004, line, 1.05, false);
    }
  }

  // The pit lane, where it isn't already the circuit
  const pitAsphalt = new Color("#43464d");
  const fastLane = new Color("#3b3e45");
  let pitAlong = 0;
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
    const s0 = pitAlong;
    pitAlong += l;
    // Inside the circuit's own walls: the track already covers it
    const h = drivable(mx, mz);
    if (h < -1 && Math.min(...[1, -1].map((s) => Math.abs(drivable(mx + rx * s * PIT_HALF, mz + rz * s * PIT_HALF)))) < 0 && pitDist(mx, mz).d > -PIT_HALF + 0.2) continue;
    for (const [d0, d1, color, lit] of [
      [-PIT_HALF, -PIT_HALF + 0.2, line, 1],
      [-PIT_HALF + 0.2, -0.9, fastLane, 1.0],
      [-0.9, -0.72, line, 1],
      [-0.72, PIT_HALF - 0.2, pitAsphalt, 1.0],
      [PIT_HALF - 0.2, PIT_HALF, line, 1],
    ] as const)
      surf.quad(
        [
          [a.x + rx * d0, -0.012, a.z + rz * d0],
          [b.x + rx * d0, -0.012, b.z + rz * d0],
          [b.x + rx * d1, -0.012, b.z + rz * d1],
          [a.x + rx * d1, -0.012, a.z + rz * d1],
        ],
        color as Color,
        lit,
        [
          [d0 / 4, s0 / 4],
          [d0 / 4, pitAlong / 4],
          [d1 / 4, pitAlong / 4],
          [d1 / 4, s0 / 4],
        ],
        [
          [-1, 0],
          [-1, 0],
          [-1, 0],
          [-1, 0],
        ],
        UP,
      );
  }
  const asphaltTex = asphaltMaps();
  const macro = macroTexture(tier === 0 ? 1024 : 2048);
  disposables.push(asphaltTex, macro);
  {
    const g = surf.build();
    g.setAttribute("aMacro", g.getAttribute("uv1"));
    g.deleteAttribute("uv1");
    const surface = new Mesh(g, trackMaterial(macro, asphaltTex));
    surface.receiveShadow = opts.shadows;
    surface.name = "track";
    group.add(surface);
  }

  /* ───────── markings on top: start line, grid slots, pit boxes ───────── */
  const marks = new Soup();
  const flat = (pts: { x: number; z: number }[], y: number, color: string, lit: number) => marks.quad(pts.map((p) => [p.x, y, p.z] as [number, number, number]), color, lit, undefined, undefined, UP);
  {
    // Chequered start line, half-metre squares
    const cols = Math.round((HALF * 2) / 0.5);
    const p = samples[0];
    for (let r = 0; r < 2; r++)
      for (let c = 0; c < cols; c++) {
        const d0 = -HALF + c * 0.5;
        const ax = p.x - p.tz * d0 + p.tx * (r - 1) * 0.5;
        const az = p.z + p.tx * d0 + p.tz * (r - 1) * 0.5;
        const bx = ax - p.tz * 0.5;
        const bz = az + p.tx * 0.5;
        flat([{ x: ax, z: az }, { x: bx, z: bz }, { x: bx + p.tx * 0.5, z: bz + p.tz * 0.5 }, { x: ax + p.tx * 0.5, z: az + p.tz * 0.5 }], 0.012, (r + c) % 2 ? "#f4f1ea" : "#16181c", 1.1);
      }
    // Grid slots: staggered, eight metres apart, behind the line, each with its number's bar
    for (let k = 0; k < 10; k++) {
      const back = 6 + k * 8;
      const i = (N - Math.round(back / 3)) % N;
      const q = samples[i];
      const side = k % 2 ? 1 : -1;
      const d = side * 2.6;
      const cx = q.x - q.tz * d;
      const cz = q.z + q.tx * d;
      const rect = (along0: number, along1: number, across0: number, across1: number, color = "#ecebe6") => {
        const P = (al: number, ac: number) => ({ x: cx + q.tx * al - q.tz * ac, z: cz + q.tz * al + q.tx * ac });
        flat([P(along0, across0), P(along1, across0), P(along1, across1), P(along0, across1)], 0.012, color, 1.1);
      };
      rect(1.8, 2.05, -1.5, 1.5);
      rect(0.4, 2.05, -1.5, -1.3);
      rect(0.4, 2.05, 1.3, 1.5);
      if (k === 0) rect(2.2, 2.6, -1.5, 1.5, C.ember);
    }
    // Pit boxes in front of each garage, in team colours, with a white stop bar
    const boxColors = [C.ember, C.sky, "#ffd27a", C.paper, "#7bd88f", C.wine];
    for (let g = 0; g < 12; g++) {
      const x0 = PIT_BOXES.x0 + 8 + g * ((PIT_BOXES.x1 - PIT_BOXES.x0 - 16) / 12);
      const z0 = PIT_BOXES.z - PIT_HALF + 0.3;
      flat([{ x: x0, z: z0 }, { x: x0 + 9, z: z0 }, { x: x0 + 9, z: z0 + 3.6 }, { x: x0, z: z0 + 3.6 }], 0.004, boxColors[g % boxColors.length], 0.9);
      flat([{ x: x0 + 6.6, z: z0 + 0.3 }, { x: x0 + 6.9, z: z0 + 0.3 }, { x: x0 + 6.9, z: z0 + 3.3 }, { x: x0 + 6.6, z: z0 + 3.3 }], 0.006, "#f4f1ea", 1);
    }
  }
  {
    const markings = new Mesh(marks.build(), worldMaterial({ polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, flatShading: false }));
    markings.receiveShadow = opts.shadows;
    group.add(markings);
  }

  /* ───────── walls, walkway, fences and boards along every boundary ───────── */
  const wallSoup = new Soup();
  const fence: number[] = [];
  const fenceUv: number[] = [];
  const concrete = new Color("#cfc9bc");
  const capRed = new Color(C.ember);
  const outer = new Color("#8f8a80");
  const paving = new Color("#7d7a74");
  let boardIndex = 0;
  const steel = "#7d8791";

  /** Builds wall runs from a polyline of boundary points; n is the unit normal pointing at the track. */
  const runWall = (pts: { x: number; z: number; nx: number; nz: number; keep: boolean; walk: boolean }[], withFence: boolean, closed: boolean) => {
    const n = pts.length;
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
      // The wall's cross-section, back from the face (towards −n) and up
      const prof: [number, number][] = [
        [0, 0],
        [0, 0.9],
        [0.1, WALL_H],
        [WALL_T, WALL_H],
        [WALL_T, 0],
      ];
      const P = (p: typeof a, [back, y]: [number, number]): [number, number, number] => [p.x - p.nx * back, y, p.z - p.nz * back];
      const faces: [number, number, Color, number, [number, number, number]][] = [
        [0, 1, concrete, 0.5, [a.nx, 0, a.nz]],
        [1, 2, capRed, 0.6, [a.nx, 1, a.nz]],
        [2, 3, capRed, 0.6, UP],
        [3, 4, outer, 0.22, [-a.nx, 0, -a.nz]],
      ];
      for (const [p0, p1, color, lit, up] of faces) {
        const u0 = along / 3;
        const u1 = (along + len) / 3;
        wallSoup.quad([P(a, prof[p0]), P(b, prof[p0]), P(b, prof[p1]), P(a, prof[p1])], color, lit, [
          [u0, prof[p0][1]],
          [u1, prof[p0][1]],
          [u1, prof[p1][1]],
          [u0, prof[p1][1]],
        ], undefined, up);
      }
      // The paved walkway behind the wall
      if (a.walk && b.walk) {
        const W = (p: typeof a, back: number): [number, number, number] => [p.x - p.nx * back, -0.02, p.z - p.nz * back];
        wallSoup.quad([W(a, WALL_T), W(b, WALL_T), W(b, WALL_T + WALKWAY), W(a, WALL_T + WALKWAY)], paving, 0.32, [
          [along / 3, 0],
          [(along + len) / 3, 0],
          [(along + len) / 3, WALKWAY / 3],
          [along / 3, WALKWAY / 3],
        ], undefined, UP);
      }

      // Debris fence: from the wall's top, leaning over the track
      if (withFence) {
        const lean = 0.55;
        const ma = { x: a.x - a.nx * WALL_T * 0.5, z: a.z - a.nz * WALL_T * 0.5 };
        const mb = { x: b.x - b.nx * WALL_T * 0.5, z: b.z - b.nz * WALL_T * 0.5 };
        const fa = { x: ma.x + a.nx * lean, z: ma.z + a.nz * lean };
        const fb = { x: mb.x + b.nx * lean, z: mb.z + b.nz * lean };
        fence.push(ma.x, WALL_H, ma.z, mb.x, WALL_H, mb.z, fb.x, FENCE_TOP, fb.z, ma.x, WALL_H, ma.z, fb.x, FENCE_TOP, fb.z, fa.x, FENCE_TOP, fa.z);
        const u0 = along / 1.2;
        const u1 = (along + len) / 1.2;
        const v1 = (FENCE_TOP - WALL_H) / 1.2;
        fenceUv.push(u0, 0, u1, 0, u1, v1, u0, 0, u1, v1, u0, v1);
        if (k % 2 === 0) {
          // A post, cranked over the track at the top
          const ry = Math.atan2(a.nx, a.nz);
          const h = FENCE_TOP - WALL_H;
          const tilt = Math.atan2(lean, h);
          misc.add(new BoxGeometry(0.11, h + 0.3, 0.11).translate(0, h / 2, 0).applyMatrix4(new Matrix4().makeRotationX(tilt)).applyMatrix4(new Matrix4().makeRotationY(ry).setPosition(ma.x, WALL_H - 0.1, ma.z)), steel, 0.35);
          if (tier > 0) misc.add(new BoxGeometry(0.08, 0.9, 0.08).translate(0, 0.45, 0).applyMatrix4(new Matrix4().makeRotationX(0.9)).applyMatrix4(new Matrix4().makeRotationY(ry).setPosition(fa.x, FENCE_TOP, fa.z)), steel, 0.35);
        }
        if (tier > 0) {
          // Top rail along the fence
          const mx = (fa.x + fb.x) / 2;
          const mz = (fa.z + fb.z) / 2;
          misc.place(new BoxGeometry(0.07, 0.07, len + 0.04), steel, 0.35, mx, FENCE_TOP, mz, Math.atan2(fb.x - fa.x, fb.z - fa.z));
        }
      }
      along += len;

      // Boards: every so often, a 12 m LED banner on the inner face
      sinceBoard += len;
      if (sinceBoard > 30 && k + segs < n && pts.slice(k, k + segs + 1).every((p) => p.keep)) {
        sinceBoard = -10;
        const row = boards.row(WALL_BOARDS[boardIndex++ % WALL_BOARDS.length]);
        const span = pts.slice(k, k + segs + 1);
        const total = span.slice(1).reduce((s, p, q) => s + Math.hypot(p.x - span[q].x, p.z - span[q].z), 0);
        // Reads left to right for someone on the track: their right is (nz, −nx)
        const forward = (span[segs].x - span[0].x) * a.nz - (span[segs].z - span[0].z) * a.nx > 0;
        let u = 0;
        for (let q = 0; q < segs; q++) {
          const p0 = span[q];
          const p1 = span[q + 1];
          const l = Math.hypot(p1.x - p0.x, p1.z - p0.z);
          const e = 0.02;
          const A = { x: p0.x + p0.nx * e, z: p0.z + p0.nz * e };
          const B = { x: p1.x + p1.nx * e, z: p1.z + p1.nz * e };
          const ua = forward ? u / total : 1 - u / total;
          const ub = forward ? (u + l) / total : 1 - (u + l) / total;
          boards.face(row, { x: A.x, y: 0.1, z: A.z }, { x: B.x, y: 0.1, z: B.z }, { x: B.x, y: 0.86, z: B.z }, { x: A.x, y: 0.86, z: A.z }, ua, ub);
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
      const behind = off(i, (o + WALL_T + 1.2) * side);
      return { x: q.x, z: q.z, nx: p.tz * side, nz: -p.tx * side, keep: pitDist(q.x, q.z).d > 0.4, walk: pitDist(behind.x, behind.z).d > 0.5 && !inWater(behind.x, behind.z) };
    });
    runWall(pts.filter((_, i) => i % step === 0), true, true);
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
      const garage = side < 0 && p.x > PIT_BOXES.x0 - 18 && p.x < PIT_BOXES.x1 + 18 && Math.abs(p.z - PIT_BOXES.z) < 2;
      return { x, z, nx: -rx * side, nz: -rz * side, keep: !garage && drivable(x, z) > 0.4, walk: false };
    });
    runWall(pts.filter((_, i) => i % 2 === 0), tier > 0, false);
  }
  const concreteTex = concreteMaps(KIT.tex / 2, "vertical");
  disposables.push(concreteTex);
  {
    const wallMesh = new Mesh(wallSoup.build(), litMaterial({ vertexColors: true, map: concreteTex.map, normalMap: concreteTex.normalMap, roughness: 0.9, flatShading: true }, "wall"));
    wallMesh.receiveShadow = opts.shadows;
    wallMesh.name = "walls";
    group.add(wallMesh);
  }
  let fenceMaterial: MeshBasicMaterial | undefined;
  if (fence.length) {
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(fence, 3));
    g.setAttribute("uv", new Float32BufferAttribute(fenceUv, 2));
    g.computeBoundingSphere();
    const tex = fenceTexture();
    disposables.push(tex);
    fenceMaterial = new MeshBasicMaterial({ map: tex, color: "#c9d2dc", alphaTest: 0.45, side: DoubleSide });
    group.add(new Mesh(g, fenceMaterial));
  }

  /* ───────── TecPro blocks and tyre walls on the outside of the corners ───────── */
  {
    const tec: Matrix4[] = [];
    const tecCol: Color[] = [];
    const tyres: Matrix4[] = [];
    const palette = [new Color(C.ember), new Color("#f1ece2"), new Color(C.ink)];
    for (let i = 0; i < N; i++) {
      const s = samples[i];
      for (const side of [1, -1] as const) {
        const run = side > 0 ? s.runR : s.runL;
        if (run < 4.2) continue;
        const o = wallOffset(i, side) - 0.55;
        const q = off(i, o * side);
        if (pitDist(q.x, q.z).d < 2) continue;
        const ry = Math.atan2(-s.tx, -s.tz);
        if (run >= 6 || tier === 0) {
          tec.push(new Matrix4().makeRotationY(ry).setPosition(q.x, 0.5, q.z));
          tecCol.push(palette[(Math.floor(i / 1) + (side > 0 ? 0 : 1)) % 3]);
        } else
          for (let k = 0; k < 4; k++) {
            // Tyre stacks, four per sample, strapped in rows
            const t = (k / 4) * 3;
            const x = q.x + s.tx * t;
            const z = q.z + s.tz * t;
            tyres.push(new Matrix4().makeRotationY(ry).setPosition(x, 0, z));
          }
      }
    }
    if (tec.length) {
      const geo = bevelBox(1.0, 1.0, 2.9, 0.12);
      geo.setAttribute("aLit", new BufferAttribute(new Float32Array(geo.attributes.position.count).fill(0.7), 1));
      const inst = new InstancedMesh(geo, litMaterial({ flatShading: true, roughness: 0.55 }, "tec"), tec.length);
      tec.forEach((m, k) => {
        inst.setMatrixAt(k, m);
        inst.setColorAt(k, tecCol[k]);
      });
      inst.computeBoundingSphere();
      group.add(inst);
    }
    if (tyres.length && tier > 0) {
      const b = new Batch();
      for (let h = 0; h < 4; h++) b.add(new CylinderGeometry(0.33, 0.33, 0.24, 9, 1, true).translate(0, 0.12 + h * 0.25, 0), h === 3 ? "#d9d6cf" : "#1d1e21", 0.4);
      b.add(new RingGeometry(0.17, 0.33, 9).rotateX(-Math.PI / 2).translate(0, 0.99, 0), "#26272b", 0.4);
      const inst = new InstancedMesh(b.build(), worldMaterial({ flatShading: false }), tyres.length);
      tyres.forEach((m, k) => inst.setMatrixAt(k, m));
      inst.computeBoundingSphere();
      group.add(inst);
    }
  }

  /* ───────── sausage kerbs on the inside of the chicane ───────── */
  {
    const i0 = Math.round(0.74 * N);
    const i1 = Math.round(0.785 * N);
    for (let i = i0; i < i1; i += 1) {
      const s = samples[i];
      if (Math.abs(s.curv) < 0.02) continue;
      const side: 1 | -1 = s.curv > 0 ? 1 : -1;
      const q = off(i, (HALF + KERB + 0.55) * side);
      const ry = Math.atan2(s.tx, s.tz);
      misc.place(new CylinderGeometry(0.16, 0.16, 1.9, 8, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateY(Math.PI / 2), "#f2c230", 0.9, q.x, 0, q.z, ry);
    }
  }

  /* ───────── floodlight pylons: lattice towers, lamp banks and glows ───────── */
  {
    const b = new Batch();
    const grey = "#69727c";
    const H = 16.5;
    if (tier === 0) {
      b.add(bevelBox(0.5, H, 0.5).translate(0, H / 2, 0), grey, 0.15);
    } else {
      // Four legs tapering in, X-braced every two metres
      const base = 0.62;
      const top = 0.32;
      const wAt = (y: number) => base + (top - base) * (y / H);
      for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) b.add(rod(new Vector3(sx * base, 0, sz * base), new Vector3(sx * top, H, sz * top), 0.07, 5, 0.055), grey, 0.2);
      for (let y = 1; y < H - 1; y += 2)
        for (const face of [0, 1, 2, 3]) {
          const corner = (yy: number, s: number) => {
            const w = wAt(yy);
            const v = new Vector3(s * w, yy, w);
            return v.applyAxisAngle(new Vector3(0, 1, 0), (face * Math.PI) / 2);
          };
          b.add(rod(corner(y, -1), corner(y + 2, 1), 0.026, 3), grey, 0.2);
          if (tier === 2) b.add(rod(corner(y, 1), corner(y + 2, -1), 0.026, 3), grey, 0.2);
        }
    }
    // The head: a platform, an arm over the wall, and a bank of lamps tilted down at the track (+z)
    b.add(bevelBox(1.6, 0.18, 1.6).translate(0, H, 0), grey, 0.2);
    b.add(bevelBox(0.26, 0.26, 3.4).translate(0, H + 0.2, 1.5), grey, 0.2);
    const head = new Batch();
    head.add(bevelBox(3.2, 1.5, 0.4).translate(0, 0, 0), "#2b3036", 0.1);
    const lamps = tier === 0 ? [[0, 0, 2.9, 1.2]] : [-1.05, -0.35, 0.35, 1.05].flatMap((x) => [[x, -0.36, 0.62, 0.6], [x, 0.36, 0.62, 0.6]]);
    for (const [x, y, w, h] of lamps) head.add(bevelBox(w, h, 0.16, 0.03).translate(x, y, 0.24), "#fff7e6", 2.8);
    const hg = head.build();
    hg.applyMatrix4(new Matrix4().makeRotationX(0.45).setPosition(0, H + 0.6, 3.2));
    b.add(hg, "#ffffff");
    const geo = b.build();
    const inst = new InstancedMesh(geo, mat, pylons.length);
    pylons.forEach((p, k) => {
      inst.setMatrixAt(k, new Matrix4().makeRotationY(p.ry).setPosition(p.x, 0, p.z));
      poles.push([p.x, p.z]);
      const h = toWorld(p, 0, 3.4);
      glows.add(h.x, H + 0.7, h.z, 7.5, "#fff3d6", 0.85);
      if (tier > 0) glows.add(h.x, H + 0.4, h.z, 24, "#ffe2b0", 0.1);
    });
    inst.computeBoundingSphere();
    inst.name = "pylons";
    group.add(inst);
  }

  /* ───────── spans over the track: the start gantry and the footbridge ───────── */
  /** A span's frame: origin on the centre line, local +x towards the right leg, +z back down the track. */
  const spanFrame = (s: Span) => {
    const p = samples[s.i];
    const ry = Math.atan2(-p.tx, -p.tz);
    const m = new Matrix4().makeRotationY(ry).setPosition(p.x, 0, p.z);
    const inv = m.clone().invert();
    const legs = s.legs.map((l) => new Vector3(l.x, 0, l.z).applyMatrix4(inv));
    return { m, ry, p, legs };
  };
  const lightSlots: { mesh: InstancedMesh; glow: number[] } = { mesh: null!, glow: [] };
  {
    const { m, legs } = spanFrame(startGantry);
    const b = new Batch();
    const [L, R] = legs[0].x < legs[1].x ? legs : [legs[1], legs[0]];
    for (const leg of [L, R]) {
      b.add(bevelBox(0.8, 9.6, 0.8).translate(leg.x, 4.8, leg.z), "#4c535c", 0.5);
      b.add(bevelBox(1.3, 0.3, 1.3).translate(leg.x, 0.15, leg.z), "#3a4048", 0.4);
    }
    const w = R.x - L.x;
    const cx = (L.x + R.x) / 2;
    b.add(bevelBox(w + 0.8, 1.2, 1.0).translate(cx, 8.6, 0), "#353b43", 0.5);
    b.add(bevelBox(w + 0.8, 0.2, 1.1).translate(cx, 9.3, 0), C.ember, 0.9);
    b.add(bevelBox(5.6, 1.7, 0.5).translate(0, 7.25, 0), "#0c0d10", 0);
    const g = b.build().applyMatrix4(m);
    misc.add(g, "#ffffff");
    // Banners across the top: facing the grid (+z) and facing away
    const front = boards.row({ text: "BAY STREET CIRCUIT", bg: C.ink, fg: C.paper, accent: C.ember, led: true });
    const back = boards.row({ text: "NIGHT RACE · LIGHTS OUT", bg: C.ember, fg: C.paper, accent: C.paper, led: true });
    const P = (x: number, y: number, z: number) => new Vector3(x, y, z).applyMatrix4(m);
    // Boards are 16:1, like their rows in the atlas
    const bw = Math.min((w - 2) / 2, 8);
    const bh = (bw * 2) / 16;
    boards.face(front, P(-bw, 8.6 - bh / 2, 0.52), P(bw, 8.6 - bh / 2, 0.52), P(bw, 8.6 + bh / 2, 0.52), P(-bw, 8.6 + bh / 2, 0.52));
    boards.face(back, P(bw, 8.6 - bh / 2, -0.52), P(-bw, 8.6 - bh / 2, -0.52), P(-bw, 8.6 + bh / 2, -0.52), P(bw, 8.6 + bh / 2, -0.52));
    // Five columns of two red lights, facing back down the grid
    const lights = new InstancedMesh(new CircleGeometry(0.21, 14), new MeshBasicMaterial({ color: "#ffffff" }), 10);
    const o = new Object3D();
    const holder = new Group();
    holder.matrixAutoUpdate = false;
    holder.matrix.copy(m);
    for (let c = 0; c < 5; c++)
      for (let r = 0; r < 2; r++) {
        o.position.set(-2 + c, 6.95 + r * 0.6, 0.27);
        o.updateMatrix();
        lights.setMatrixAt(c * 2 + r, o.matrix);
        lights.setColorAt(c * 2 + r, new Color("#2a0808"));
      }
    holder.add(lights);
    group.add(holder);
    lightSlots.mesh = lights;
    for (let c = 0; c < 5; c++) {
      const v = P(-2 + c, 7.25, 0.6);
      lightSlots.glow.push(glows.add(v.x, v.y, v.z, 2.2, "#ff2a1f", 0, true));
    }
    for (const leg of [L, R]) {
      const v = P(leg.x, 0, leg.z);
      poles.push([v.x, v.z]);
    }
  }
  {
    // The footbridge: two stair towers and a glazed deck with LED banners both ways
    const { m, legs } = spanFrame(footbridge);
    const b = new Batch();
    const [L, R] = legs[0].x < legs[1].x ? legs : [legs[1], legs[0]];
    const clear = footbridge.clear;
    for (const leg of [L, R]) {
      const out = Math.sign(leg.x);
      b.add(bevelBox(5.6, clear + 1.4, 4.4, 0.12).translate(leg.x, (clear + 1.4) / 2, leg.z), "#59636e", 0.35);
      // Glazing on the tower's faces, lit from inside
      b.add(bevelBox(5.0, clear - 1, 4.5, 0.02).translate(leg.x, clear / 2 + 0.4, leg.z), "#7fb3d6", 0.9);
      b.add(bevelBox(5.8, 0.25, 4.6).translate(leg.x, clear + 1.5, leg.z), "#d9d4c8", 0.4);
      void out;
    }
    const w = R.x - L.x;
    const cx = (L.x + R.x) / 2;
    b.add(bevelBox(w, 0.5, 3.2).translate(cx, clear + 0.25, 0), "#cfcac0", 0.45);
    b.add(bevelBox(w, 1.15, 0.12).translate(cx, clear + 1.1, 1.55), "#8fc3e6", 0.9);
    b.add(bevelBox(w, 1.15, 0.12).translate(cx, clear + 1.1, -1.55), "#8fc3e6", 0.9);
    b.add(bevelBox(w, 0.22, 3.3).translate(cx, clear + 2.1, 0), "#e9e4d8", 0.5);
    b.add(bevelBox(w, 0.12, 0.2).translate(cx, clear - 0.02, 1.62), C.ember, 1.2);
    b.add(bevelBox(w, 0.12, 0.2).translate(cx, clear - 0.02, -1.62), C.ember, 1.2);
    misc.add(b.build().applyMatrix4(m), "#ffffff");
    const P = (x: number, y: number, z: number) => new Vector3(x, y, z).applyMatrix4(m);
    const bw = Math.min(8.8, w / 2 - 4);
    const rowA = boards.row({ text: "BAY STREET CIRCUIT", bg: C.ember, fg: C.paper, accent: C.paper, led: true });
    const rowB = boards.row({ text: "NEIL JACOB SANTIAGO · NIGHT RACE", bg: C.ink, fg: C.paper, accent: C.ember, led: true });
    boards.face(rowA, P(-bw, clear + 0.55, 1.63), P(bw, clear + 0.55, 1.63), P(bw, clear + 1.65, 1.63), P(-bw, clear + 1.65, 1.63));
    boards.face(rowB, P(bw, clear + 0.55, -1.63), P(-bw, clear + 0.55, -1.63), P(-bw, clear + 1.65, -1.63), P(bw, clear + 1.65, -1.63));
    for (let x = -w / 2 + 3; x < w / 2 - 2; x += 6) {
      const v = P(x, clear - 0.15, 0);
      glows.add(v.x, v.y, v.z, 2.2, "#ffe6c4", 0.55);
    }
  }

  /* ───────── grandstands: stepped terraces, a crowd, a cantilevered roof ───────── */
  const crowd = new Batch(true);
  const crowdTex = crowdTexture();
  disposables.push(crowdTex);
  for (const st of stands) {
    const local = new Batch();
    const length = st.hw * 2 - 1;
    const front = st.hd - st.overhang;
    const rows = st.rows;
    for (let r = 0; r < rows; r++) {
      const y = 0.6 + r * 0.55;
      const z = front - r * 0.9;
      local.add(bevelBox(length, y, 0.9, 0.03).translate(0, y / 2, z - 0.45), r % 2 ? "#5d646e" : "#58606a", 0.35);
      // The crowd, seat block by seat block, aisles left clear
      for (let x = -length / 2; x < length / 2 - 1; ) {
        const blockW = Math.min(14, length / 2 - x);
        const w = blockW - 1.4;
        if (w > 1) {
          const g = new BufferGeometry();
          const z0 = z - 0.18;
          const yb = y;
          const yt = y + 0.95;
          const zt = z0 - 0.3;
          const u0 = rand() * 4;
          const u1 = u0 + w / 7;
          const v0 = rand() < 0.5 ? 0 : 0.5;
          g.setAttribute("position", new Float32BufferAttribute([x + 0.7, yb, z0, x + 0.7 + w, yb, z0, x + 0.7 + w, yt, zt, x + 0.7, yb, z0, x + 0.7 + w, yt, zt, x + 0.7, yt, zt], 3));
          g.setAttribute("uv", new Float32BufferAttribute([u0, v0, u1, v0, u1, v0 + 0.5, u0, v0, u1, v0 + 0.5, u0, v0 + 0.5], 2));
          crowd.add(g.applyMatrix4(new Matrix4().makeRotationY(st.ry).setPosition(st.x, 0, st.z)), "#ffffff", 0.7);
        }
        x += blockW;
      }
    }
    const depth = rows * 0.9;
    const top = 0.6 + rows * 0.55;
    const back = front - depth;
    local.add(bevelBox(length, top + 3, 0.4).translate(0, (top + 3) / 2, back - 0.2), "#454b54", 0.2);
    // Roof: a light membrane on steel, cantilevered from columns at the back; lights under the front edge
    const roofY = top + 3.2;
    const roofD = st.hd * 2 - 0.6;
    local.add(bevelBox(length + 1, 0.28, roofD).translate(0, roofY, st.hd - roofD / 2 - 0.1), "#e9e4d8", 0.4);
    local.add(bevelBox(length + 1, 0.9, 0.3).translate(0, roofY - 0.3, st.hd - 0.25), "#2b3038", 0.3);
    local.add(bevelBox(length + 0.6, 0.12, 0.25).translate(0, roofY - 0.82, st.hd - 0.4), "#fff1d6", 2.4);
    for (let s = -length / 2; s <= length / 2 + 0.1; s += 12) {
      local.add(bevelBox(0.35, roofY, 0.35).translate(s, roofY / 2, back - 0.1), "#7a828c", 0.2);
      // A raking strut from the column's head out to the roof's front
      local.add(rod(new Vector3(s, roofY + 2.2, back - 0.1), new Vector3(s, roofY + 0.1, st.hd - 0.6), 0.09, 5), "#7a828c", 0.2);
      local.add(bevelBox(0.3, 2.3, 0.3).translate(s, roofY + 1.1, back - 0.1), "#7a828c", 0.2);
    }
    local.add(bevelBox(length, 0.3, 0.1).translate(0, 0.4, front + 0.05), C.ember, 0.8);
    misc.add(local.build().applyMatrix4(new Matrix4().makeRotationY(st.ry).setPosition(st.x, 0, st.z)), "#ffffff");
    // Name on the roof's fascia, facing the track
    const row = boards.row({ text: st.name, bg: C.ink, fg: C.paper, accent: C.ember, led: true });
    const P = (lx: number, y: number, lz: number) => {
      const q = toWorld(st, lx, lz);
      return { x: q.x, y, z: q.z };
    };
    const bw = Math.min(length / 2 - 2, 6.7);
    boards.face(row, P(-bw, roofY - 0.72, st.hd - 0.08), P(bw, roofY - 0.72, st.hd - 0.08), P(bw, roofY + 0.12, st.hd - 0.08), P(-bw, roofY + 0.12, st.hd - 0.08));
    for (let s = -length / 2 + 4; s < length / 2; s += 9) {
      const q = toWorld(st, s, st.hd - 0.4);
      glows.add(q.x, roofY - 0.9, q.z, 2.6, "#fff1d6", 0.5);
    }
  }
  if (!crowd.empty) {
    const m = new Mesh(crowd.build(), litMaterial({ map: crowdTex, vertexColors: true, roughness: 0.95, side: DoubleSide }, "crowd"));
    m.name = "crowd";
    group.add(m);
  }

  /* ───────── the pit building and the pit wall gantries ───────── */
  {
    const b = new Batch();
    const front = PIT_FRONT;
    const depth = pitBuilding.hd * 2;
    const len = PIT_BOXES.x1 - PIT_BOXES.x0;
    const cx = (PIT_BOXES.x0 + PIT_BOXES.x1) / 2;
    // Ground floor shell, hospitality floor with continuous glass, roof with a red fascia
    b.add(bevelBox(len, 0.6, depth).translate(cx, 6.3, front - depth / 2), "#d8d3c8", 0.5);
    b.add(bevelBox(len, 3.2, depth - 2.5).translate(cx, 8.2, front - depth / 2 - 1.25), "#26313d", 0.3);
    b.add(bevelBox(len, 2.5, 0.12, 0.02).translate(cx, 8.2, front - 2.5), "#a9d0ea", 1.15);
    for (let x = PIT_BOXES.x0 + 1.5; x < PIT_BOXES.x1; x += 3) b.add(bevelBox(0.12, 2.6, 0.2, 0.02).translate(x, 8.2, front - 2.42), "#3a4048", 0.3);
    // Terrace railing in front of the glass
    b.add(bevelBox(len, 0.08, 0.08, 0.02).translate(cx, 7.7, front - 0.3), "#c9ccd1", 0.5);
    b.add(bevelBox(len, 0.9, 0.04, 0.01).translate(cx, 7.1, front - 0.3), "#9fb6c8", 0.5);
    b.add(bevelBox(len + 2, 0.5, depth + 1.5).translate(cx, 10.05, front - depth / 2 + 0.5), "#ece7dc", 0.45);
    b.add(bevelBox(len + 2, 0.75, 0.25).translate(cx, 9.85, front + 1.25), C.ember, 1.0);
    b.add(bevelBox(len, 6, 0.4).translate(cx, 3, front - depth), "#cfc9bc", 0.3);
    const garages = 12;
    const gw = (len - 16) / garages;
    for (let g = 0; g <= garages; g++) {
      const x = PIT_BOXES.x0 + 8 + g * gw - 0.5;
      b.add(bevelBox(1.2, 6, depth).translate(x, 3, front - depth / 2), "#e2ddd1", 0.45);
    }
    const teams = [C.ember, C.sky, "#ffd27a", C.paper, "#7bd88f", C.wine];
    for (let g = 0; g < garages; g++) {
      const x = PIT_BOXES.x0 + 8 + g * gw + gw / 2 - 0.5;
      // Bright interior: back wall, epoxy floor, a team colour band, tool chests, a roller door header
      b.add(bevelBox(gw - 1.2, 5.8, 0.2).translate(x, 2.9, front - depth + 0.5), "#f4efe4", 1.5);
      b.add(bevelBox(gw - 1.2, 0.05, depth - 1).translate(x, 0.03, front - depth / 2), "#8a8f97", 1.1);
      const team = teams[g % teams.length];
      b.add(bevelBox(gw - 1.4, 0.8, 0.1).translate(x, 5.2, front - depth + 0.7), team, 1.4);
      for (const sx of [-1, 1]) b.add(bevelBox(1.6, 1.1, 0.7).translate(x + sx * (gw / 2 - 2), 0.55, front - depth + 1.2), team, 0.8);
      b.add(bevelBox(gw - 1.2, 0.7, 0.4).translate(x, 5.65, front - 0.2), "#3a4048", 0.4);
      // Ceiling lights
      b.add(bevelBox(gw - 3, 0.08, 0.5).translate(x, 5.9, front - depth / 2), "#ffffff", 2.6);
    }
    // Ends of the building, and race control on top of the east end
    for (const x of [PIT_BOXES.x0 - 0.5, PIT_BOXES.x1 + 0.5]) b.add(bevelBox(16, 10, depth).translate(x + (x < cx ? -7.5 : 7.5), 5, front - depth / 2), "#d8d3c8", 0.4);
    const rcx = PIT_BOXES.x1 + 8;
    b.add(bevelBox(14, 4.2, 10).translate(rcx, 12.4, front - 7), "#25303b", 0.4);
    b.add(bevelBox(14.2, 3.2, 10.2, 0.03).translate(rcx, 12.6, front - 7), "#9cc8e6", 1.2);
    b.add(bevelBox(15, 0.4, 11).translate(rcx, 14.7, front - 7), "#ece7dc", 0.45);
    misc.add(b.build(), "#ffffff");
    const rc = boards.row({ text: "RACE CONTROL", bg: C.ink, fg: C.paper, accent: C.ember, led: true });
    boards.face(rc, { x: rcx - 6, y: 13.9, z: front - 1.85 }, { x: rcx + 6, y: 13.9, z: front - 1.85 }, { x: rcx + 6, y: 14.6, z: front - 1.85 }, { x: rcx - 6, y: 14.6, z: front - 1.85 });
    for (let x = PIT_BOXES.x0 + 10; x < PIT_BOXES.x1; x += 24) glows.add(x, 8.2, front - 2.2, 3, "#bfe0ff", 0.4);

    // Pit wall gantries: a roofed desk on the pit wall, team screens facing the track
    const pw = new Batch();
    for (const s of pitWallStands) {
      const z = pitWallStrip.z;
      pw.add(bevelBox(s.hw * 2, 0.16, s.hd * 2 + 0.4).translate(s.x, 3.3, z), "#2b3038", 0.35);
      pw.add(bevelBox(s.hw * 2 - 0.4, 0.9, 0.12).translate(s.x, 2.3, z + s.hd - 0.1), "#4f87b3", 1.5);
      pw.add(bevelBox(s.hw * 2 - 0.4, 1.0, s.hd * 1.2).translate(s.x, 0.5, z), "#3a4048", 0.3);
      for (const sx of [-s.hw + 0.2, s.hw - 0.2]) pw.add(bevelBox(0.14, 3.3, 0.14).translate(s.x + sx, 1.65, z), "#6c7580", 0.25);
      glows.add(s.x, 3.1, z + 0.4, 2.4, "#cfe6ff", 0.4);
    }
    misc.add(pw.build(), "#ffffff");
  }

  /* ───────── camera towers and marshal posts ───────── */
  for (const c of cameras) {
    const b = new Batch();
    const h = 6.5;
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) b.add(bevelBox(0.1, h, 0.1, 0.02).translate(sx * 1.2, h / 2, sz * 1.2), "#8e98a3", 0.35);
    for (let y = 1.5; y < h; y += 1.5) {
      b.add(bevelBox(2.5, 0.06, 0.06, 0.01).translate(0, y, 1.2), "#8e98a3", 0.35);
      b.add(bevelBox(2.5, 0.06, 0.06, 0.01).translate(0, y, -1.2), "#8e98a3", 0.35);
      b.add(bevelBox(0.06, 0.06, 2.5, 0.01).translate(1.2, y, 0), "#8e98a3", 0.35);
      b.add(bevelBox(0.06, 0.06, 2.5, 0.01).translate(-1.2, y, 0), "#8e98a3", 0.35);
    }
    b.add(bevelBox(2.9, 0.15, 2.9).translate(0, h, 0), "#5a6068", 0.4);
    b.add(bevelBox(2.9, 1.0, 0.05).translate(0, h + 0.5, -1.45), C.ink, 0.4);
    // The camera and its operator's umbrella
    b.add(bevelBox(0.5, 0.5, 0.9, 0.05).translate(0, h + 1.4, 0.3), "#16181c", 0.3);
    b.add(new CylinderGeometry(0.16, 0.2, 0.5, 10).rotateX(Math.PI / 2).translate(0, h + 1.45, 0.95), "#0d0e10", 0.3);
    b.add(new CylinderGeometry(0.04, 0.04, 1.2, 5).translate(0, h + 0.6, 0.2), "#16181c", 0.3);
    b.add(new CylinderGeometry(0.02, 1.4, 0.5, 8).translate(-0.6, h + 2.5, -0.4), C.ember, 0.5);
    misc.add(b.build().applyMatrix4(new Matrix4().makeRotationY(c.ry).setPosition(c.x, 0, c.z)), "#ffffff");
  }
  for (const c of marshals) {
    const b = new Batch();
    b.add(bevelBox(2.4, 2.3, 1.6, 0.06).translate(0, 1.15, 0), "#e8e4dc", 0.45);
    b.add(bevelBox(2.6, 0.18, 1.9).translate(0, 2.4, 0.1), C.ember, 0.6);
    b.add(bevelBox(2.0, 0.9, 0.06).translate(0, 1.5, 0.81), "#2a3440", 0.5);
    // The light panel the marshals signal with
    b.add(bevelBox(0.7, 0.7, 0.12).translate(0.6, 2.9, 0.4), "#16181c", 0.2);
    b.add(bevelBox(0.56, 0.56, 0.04).translate(0.6, 2.9, 0.47), "#9df07a", 1.8);
    b.add(new CylinderGeometry(0.04, 0.04, 0.6, 5).translate(0.6, 2.55, 0.4), "#16181c", 0.2);
    misc.add(b.build().applyMatrix4(new Matrix4().makeRotationY(c.ry).setPosition(c.x, 0, c.z)), "#ffffff");
    const q = toWorld(c, 0.6, 0.6);
    glows.add(q.x, 2.9, q.z, 1.2, "#9df07a", 0.6);
  }

  /* ───────── sector boards and braking boards ───────── */
  {
    const signPost = (x: number, z: number, ry: number, h: number) => misc.place(bevelBox(0.12, h, 0.12, 0.02).translate(0, h / 2, 0), "#6c7580", 0.3, x, 0, z, ry);
    /** A board behind the wall at sample i, facing the cars coming (angled a little towards the track). */
    const signAt = (i: number, side: 1 | -1, row: number, w: number, h: number, y: number) => {
      const s = samples[(i + N) % N];
      const o = wallOffset((i + N) % N, side) + WALL_T + 0.5 + w / 2;
      const q = off(i, o * side);
      // Faces back down the track, turned a little towards the racing line
      const fx = -s.tx + s.tz * side * 0.35;
      const fz = -s.tz - s.tx * side * 0.35;
      signPost(q.x, q.z, 0, y - h / 2 + 0.05);
      misc.place(bevelBox(w + 0.12, h + 0.12, 0.08), "#2b3036", 0.3, q.x, y, q.z, Math.atan2(fx, fz));
      const l = Math.hypot(fx, fz);
      boards.upright(row, q.x + (fx / l) * 0.05, y, q.z + (fz / l) * 0.05, w, h, fx, fz);
    };
    SECTORS.forEach((s, k) => {
      if (k === 0) return;
      const i = Math.round((s / LENGTH) * N);
      const row = boards.row({ text: `SECTOR ${k + 1}`, bg: "#ffd21f", fg: "#16181c", accent: "#16181c", cell: 0.25 });
      for (const side of [1, -1] as const) {
        const q = off(i, (wallOffset(i, side) + 1.5) * side);
        if (pitDist(q.x, q.z).d > 2) signAt(i, side, row, 2.2, 0.55, 2.0);
      }
    });
    // Braking boards before the slowest corners: 300, 200, 100
    const corners: number[] = [];
    for (let i = 0; i < N; i++) {
      const v = samples[i].vmax;
      if (v > 40) continue;
      let min = true;
      for (let j = -40; j <= 40 && min; j++) if (samples[(i + j + N) % N].vmax < v) min = false;
      if (min && corners.every((c) => Math.min(Math.abs(c - i), N - Math.abs(c - i)) > 80)) corners.push(i);
    }
    for (const c of corners.slice(0, 4)) {
      // Turn-in is a little before the slowest point; boards on the outside of the corner
      const side: 1 | -1 = samples[c].curv > 0 ? -1 : 1;
      for (const d of [100, 200, 300]) {
        const i = c - 8 - Math.round(d / 3);
        const q = off(i, (wallOffset((i + N) % N, side) + 1.5) * side);
        if (pitDist(q.x, q.z).d < 2 || inWater(q.x, q.z)) continue;
        const row = boards.row({ text: String(d), bg: C.paper, fg: "#16181c", font: "900", size: 0.75, cell: 0.125 });
        signAt(i, side, row, 1.2, 0.6, 1.9);
      }
    }
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
          b.place(bevelBox(0.6, 1.8, l + 0.05, 0.05), "#8e8a80", 0.3, (a.x + c.x) / 2, -0.9, (a.z + c.z) / 2, Math.atan2(c.x - a.x, c.z - a.z));
        }
        const a = off(i, 0);
        const c = off(i + 1, 0);
        const w = wallOffset(i, 1) + wallOffset(i, -1) + 1.2;
        b.place(bevelBox(w, 0.5, Math.hypot(c.x - a.x, c.z - a.z) + 0.05, 0.05), "#6e6b64", 0.15, (a.x + c.x) / 2, -1.2, (a.z + c.z) / 2, Math.atan2(c.x - a.x, c.z - a.z));
      }
      for (const side of [1, -1] as const) {
        const pts: Vector3[] = [];
        const steps = 16;
        for (let k = 0; k <= steps; k++) {
          const t = k / steps;
          const i = Math.round(i0 + (i1 - i0) * t);
          const q = off(i, (wallOffset(i, side) + WALL_T + 0.6) * side);
          pts.push(new Vector3(q.x, 0.8 + Math.sin(Math.PI * t) * 10, q.z));
        }
        b.add(new TubeGeometry(new CatmullRomCurve3(pts), 40, 0.38, 8, false), "#b9c3cc", 0.55);
        for (let k = 1; k < steps; k++) {
          const p = pts[k];
          b.add(new CylinderGeometry(0.06, 0.06, p.y, 4).translate(p.x, p.y / 2, p.z), "#b9c3cc", 0.4);
          if (k % 2 === 0) glows.add(p.x, p.y + 0.4, p.z, 1.6, "#cfe6ff", 0.6);
        }
      }
      misc.add(b.build(), "#ffffff");
    }
  }

  /* ───────── what was gathered: one draw call each ───────── */
  {
    const m = new Mesh(misc.build(), mat);
    m.receiveShadow = opts.shadows;
    m.name = "circuit-misc";
    group.add(m);
  }
  {
    const m = boards.build(1024, 64);
    m.name = "boards";
    group.add(m);
  }

  /* ───────── start lights ───────── */
  const red = new Color("#ff2a1f");
  const off_ = new Color("#2a0808");
  let lastLit = -1;
  return {
    group,
    /** Light poles, so the parkland keeps clear (the plan has the rest). */
    poles,
    /** Fences fade with the floodlights. */
    fenceMaterial,
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
    dispose() {
      for (const d of disposables) d.dispose();
    },
  };
}

export { WATER_LEVEL };
