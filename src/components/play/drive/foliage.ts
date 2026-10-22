import {
  BufferAttribute,
  BufferGeometry,
  type Camera,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DodecahedronGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  type HemisphereLight,
  type DirectionalLight,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  InstancedMesh,
  LinearFilter,
  Mesh,
  Object3D,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
  Vector2,
  Vector3,
  Vector4,
} from "three";
import { type Footprint, inFootprint } from "./circuit";
import { Batch, LIGHTS, rng, worldMaterial } from "./kit";
import type { TierSettings } from "./quality";
import { drivable, inWater, landmarks, locate, N, pit, PIT_HALF, pitDist, sampleAt, samples, SET, wallOffset, water } from "./track";

// Parkland round the circuit, in the spirit of a hand-made diorama: turf
// verges behind the walls, clumps of grass blades that sway, trees and shrubs
// built from chunky leaf cards in blossom pinks, reds and deep greens, low
// rocks and fallen petals.
//   · grass is two grids of instanced blades round the camera (a dense near
//     one and a sparse far one: two draw calls, a fixed cost anywhere on the
//     lap). Blades are anchored to world cells, read a top-down mask painted
//     from the circuit to know where turf is, clump with noise, turn to the
//     camera, lean and sway
//   · every canopy on the circuit is one instanced draw call; leaf cards are
//     alpha-tested against a screen-space dither, so their edges stipple
//     instead of needing sorting, and their normals point out from the
//     canopy's centre so each tree shades like one soft blob
//   · turf, petals, rocks and trunks are one draw call each, floodlit like
//     the rest of the world

/** Light the custom shaders share; the engine copies it from the scene's lights every frame. */
const AMBIENT = {
  uTime: { value: 0 },
  uWind: { value: 1 },
  uSky: { value: new Color() },
  uGround: { value: new Color() },
  uSun: { value: new Color() },
  uSunDir: { value: new Vector3(0, 1, 0) },
  uCam: { value: new Vector3() },
  uFlood: LIGHTS.uFlood,
};

const COMMON = /* glsl */ `
  uniform float uTime, uWind, uFlood;
  uniform vec3 uSky, uGround, uSun, uSunDir, uCam;
  float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
`;

/* ───────────── grass ───────────── */

const GRASS_VERT = /* glsl */ `
  ${COMMON}
  uniform sampler2D uMask;
  uniform vec4 uMaskRect;   // world x0, z0, width, depth
  uniform vec2 uCenter;     // the tile's centre, world xz
  uniform float uGrid, uCell, uRadius, uHole;
  uniform vec2 uHoleAt;     // the near tile's centre: the far tile leaves it to the near one
  attribute float aId;
  varying float vH;
  varying float vHue;
  varying float vLit;
  #include <fog_pars_vertex>
  // Hashes without sin(), steady on mobile GPUs at large coordinates
  vec2 hash22(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
  }
  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), f.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  void main() {
    // Each blade owns one cell of a grid anchored in the world, so blades
    // stay put while the tile follows the camera
    vec2 ij = vec2(mod(aId, uGrid), floor(aId / uGrid)) - floor(uGrid * 0.5);
    vec2 cell = floor(uCenter / uCell) + ij;
    vec2 r = hash22(cell);
    vec2 root = (cell + r) * uCell;
    float rnd = hash12(cell + 17.0);
    // Where the turf is (painted top-down), and how floodlit
    vec4 mask = texture2D(uMask, (root - uMaskRect.xy) / uMaskRect.zw);
    // Fades at the tile's edge (and, for the far tile, inside the near one)
    vec2 d = abs(root - uCenter);
    float keep = smoothstep(0.35, 0.75, mask.r) * (1.0 - smoothstep(uRadius * 0.7, uRadius, max(d.x, d.y)));
    keep *= smoothstep(uHole * 0.65, uHole, max(abs(root.x - uHoleAt.x), abs(root.y - uHoleAt.y)));
    // Most of the tile is track or town: those blades leave before the real work
    if (keep < 0.01) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      return;
    }
    // Clumps and bare patches, like a lawn nobody mows
    float clump = smoothstep(0.3, 0.7, vnoise(root * 0.45) + (rnd - 0.5) * 0.3);
    float h = (0.32 + 0.5 * rnd) * clump * keep;
    vec2 toCam = uCam.xz - root;
    float dist = length(toCam);
    // Turned to face the camera, give or take a twist, so a clump never looks thin
    vec2 f = toCam / max(dist, 1e-3);
    float tw = (rnd - 0.5) * 1.8;
    vec2 side = vec2(f.y, -f.x);
    side = vec2(side.x * cos(tw) - side.y * sin(tw), side.x * sin(tw) + side.y * cos(tw));
    // Wider far away, so the far tile still reads as a lawn
    float width = (0.09 + 0.07 * r.x) * (1.0 + dist * 0.025);
    float y = position.y;
    vec3 p = vec3(root.x, 0.0, root.y) + vec3(side.x, 0.0, side.y) * position.x * width * step(0.001, h);
    p.y += y * h;
    // Lean and wind: bend grows with the square of the height up the blade
    float bend = y * y * h;
    float a = rnd * 6.2832;
    float gust = sin(uTime * 1.6 + root.x * 0.13 + root.y * 0.09) * 0.55 + sin(uTime * 3.3 + root.x * 0.41 - root.y * 0.27) * 0.2;
    p.xz += (vec2(cos(a), sin(a)) * (0.15 + 0.35 * r.y) + vec2(0.86, 0.5) * gust * uWind * 0.45) * bend;
    vH = y;
    vHue = fract(rnd * 7.13);
    vLit = mask.g;
    vec4 mvPosition = viewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }`;

const GRASS_FRAG = /* glsl */ `
  ${COMMON}
  uniform vec3 uRoot, uTip, uWarm;
  varying float vH;
  varying float vHue;
  varying float vLit;
  #include <common>
  #include <fog_pars_fragment>
  void main() {
    vec3 base = mix(uRoot, mix(uTip, uWarm, vHue * vHue), smoothstep(0.1, 1.0, vH));
    vec3 amb = mix(uGround, uSky, 0.35 + 0.65 * vH);
    vec3 col = base * (amb + uSun * 0.7 * vH + uFlood * vLit * (1.0 + 0.5 * vH));
    // A little darker at the root, like the shade inside a clump
    col *= mix(0.7, 1.0, smoothstep(0.0, 0.6, vH));
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }`;

/** One blade: a tapered strip of three segments, x across (−0.5…0.5), y up (0…1). */
function bladeTemplate() {
  const g = new BufferGeometry();
  const pos = [-0.5, 0, 0, 0.5, 0, 0, -0.38, 0.35, 0, 0.38, 0.35, 0, -0.22, 0.7, 0, 0.22, 0.7, 0, 0, 1, 0];
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setIndex([0, 1, 2, 2, 1, 3, 2, 3, 4, 4, 3, 5, 4, 5, 6]);
  return g;
}

/* ───────────── canopies ───────────── */

const LEAF_VERT = /* glsl */ `
  ${COMMON}
  attribute vec3 aCard;  // shade, phase, how deep in the canopy (0 core … 1 surface)
  attribute float aLit;
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vCol;
  varying float vShade;
  varying float vLit;
  varying float vNear;
  varying float vUp;
  #include <fog_pars_vertex>
  void main() {
    mat4 m = modelMatrix * instanceMatrix;
    vec4 wp = m * vec4(position, 1.0);
    vec3 origin = (m * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    float size = length(m[0].xyz);
    // The whole canopy sways from its base; each card flutters on its own
    float up = position.y + 1.0;
    float sway = (sin(uTime * 1.1 + origin.x * 0.05 + origin.z * 0.07) * 0.6 + sin(uTime * 2.3 + origin.z * 0.11) * 0.25) * uWind;
    wp.xz += vec2(0.9, 0.4) * sway * 0.05 * up * size;
    wp.xyz += vec3(sin(uTime * 3.1 + aCard.y), sin(uTime * 2.2 + aCard.y * 1.7) * 0.5, cos(uTime * 2.7 + aCard.y)) * 0.025 * uWind * size;
    vN = normalize(mat3(m) * normal);
    vUv = uv;
    vCol = vec3(1.0);
    #ifdef USE_INSTANCING_COLOR
      vCol = instanceColor;
    #endif
    // Cards deep inside the canopy sit in its shade
    vShade = aCard.x * mix(0.5, 1.0, aCard.z);
    vLit = aLit;
    vUp = clamp(position.y * 0.7 + 0.5, 0.0, 1.0);
    // Close to the camera the canopy thins out, so a high camera sees through it
    vNear = smoothstep(4.0, 11.0, distance(wp.xyz, cameraPosition));
    vec4 mvPosition = viewMatrix * wp;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }`;

const LEAF_FRAG = /* glsl */ `
  ${COMMON}
  uniform sampler2D uMap;
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vCol;
  varying float vShade;
  varying float vLit;
  varying float vNear;
  varying float vUp;
  #include <common>
  #include <fog_pars_fragment>
  void main() {
    vec4 leaf = texture2D(uMap, vUv);
    // Stippled edge: the alpha is compared to a per-pixel dither, not a fixed cut
    float d = ign(gl_FragCoord.xy);
    if (leaf.a * vNear < 0.28 + 0.5 * d) discard;
    vec3 n = normalize(vN);
    float wrap = dot(n, uSunDir) * 0.5 + 0.5;
    vec3 amb = mix(uGround, uSky, n.y * 0.5 + 0.5);
    vec3 base = vCol * vShade * (0.78 + 0.35 * leaf.r);
    // Floodlight from above: tops glow, undersides fall into shade
    float top = smoothstep(-0.6, 0.9, n.y) * mix(0.55, 1.0, vUp);
    vec3 col = base * (amb * 1.15 + uSun * wrap * wrap * 1.1 + uFlood * vLit * (0.2 + 1.05 * top));
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }`;

/** A cluster of soft-edged leaves on a transparent card (alpha), with light and dark leaves in red. */
function leafTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const r = rng(909);
  for (let k = 0; k < 26; k++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * 38;
    const x = 64 + Math.cos(a) * d;
    const y = 64 + Math.sin(a) * d;
    const w = 11 + r() * 9;
    const h = w * (0.5 + r() * 0.2);
    g.save();
    g.translate(x, y);
    g.rotate(r() * Math.PI);
    g.scale(1, h / w);
    const v = Math.round(150 + r() * 105);
    const grad = g.createRadialGradient(0, 0, 0, 0, 0, w);
    grad.addColorStop(0, `rgba(${v},${v},${v},1)`);
    grad.addColorStop(0.62, `rgba(${v},${v},${v},0.9)`);
    grad.addColorStop(1, `rgba(${v},${v},${v},0)`);
    g.fillStyle = grad;
    g.beginPath();
    g.arc(0, 0, w, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
  const t = new CanvasTexture(c);
  t.generateMipmaps = true;
  return t;
}

/** A unit canopy (about 1 m round, centred on the origin) from puffs of leaf cards. */
function canopyGeometry(cardsPerPuff: number, seed: number) {
  const r = rng(seed);
  const puffs: [number, number, number, number][] = [
    [0, 0.05, 0, 0.78],
    [0.6, -0.18, 0.22, 0.58],
    [-0.55, -0.15, -0.3, 0.6],
    [0.08, 0.45, -0.18, 0.55],
    [-0.15, -0.05, 0.62, 0.52],
    [0.3, 0.1, -0.6, 0.5],
  ];
  const pos: number[] = [];
  const nrm: number[] = [];
  const uv: number[] = [];
  const card: number[] = [];
  const idx: number[] = [];
  const v = new Vector3();
  const t = new Vector3();
  const b = new Vector3();
  const n = new Vector3();
  const up = new Vector3(0, 1, 0);
  for (const [px, py, pz, pr] of puffs)
    for (let k = 0; k < cardsPerPuff; k++) {
      // On the puff's skin, mostly: a full look from outside without wasted cards inside
      v.set(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1).normalize();
      const depth = 0.45 + 0.55 * Math.sqrt(r());
      const cx = px + v.x * pr * depth;
      const cy = py + v.y * pr * depth * 0.85;
      const cz = pz + v.z * pr * depth;
      // Card faces roughly outward, twisted at random
      n.copy(v).addScaledVector(new Vector3(r() - 0.5, r() - 0.5, r() - 0.5), 1.1).normalize();
      t.crossVectors(n, Math.abs(n.y) > 0.9 ? new Vector3(1, 0, 0) : up).normalize();
      b.crossVectors(n, t);
      const rot = r() * Math.PI * 2;
      const tt = t.clone().multiplyScalar(Math.cos(rot)).addScaledVector(b, Math.sin(rot));
      const bb = new Vector3().crossVectors(n, tt);
      const s = pr * (0.95 + r() * 0.5);
      const base = pos.length / 3;
      // Normals point out from the canopy's centre: the tree shades as one soft blob
      const blob = new Vector3(cx, cy * 1.2, cz).normalize();
      const shade = 0.85 + r() * 0.3;
      const phase = r() * 6.28;
      const surface = Math.min(1, Math.hypot(cx, cy, cz) / 0.95);
      for (const [su, sv] of [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ]) {
        pos.push(cx + (tt.x * su + bb.x * sv) * s * 0.5, cy + (tt.y * su + bb.y * sv) * s * 0.5, cz + (tt.z * su + bb.z * sv) * s * 0.5);
        nrm.push(blob.x, blob.y, blob.z);
        uv.push((su + 1) / 2, (sv + 1) / 2);
        card.push(shade, phase, surface);
      }
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new Float32BufferAttribute(nrm, 3));
  g.setAttribute("uv", new Float32BufferAttribute(uv, 2));
  g.setAttribute("aCard", new Float32BufferAttribute(card, 3));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

/* ───────────── where the grass grows ───────────── */

/**
 * A top-down map of the turf (red) and its floodlight (green), painted from
 * the circuit: verges behind the walls and the infield green, with the
 * track, pit lane, water, stands, plinths and poles cut out.
 */
function grassMask(footprints: Footprint[], poles: [number, number][]) {
  let x0 = Infinity;
  let x1 = -Infinity;
  let z0 = Infinity;
  let z1 = -Infinity;
  for (const p of samples) {
    x0 = Math.min(x0, p.x);
    x1 = Math.max(x1, p.x);
    z0 = Math.min(z0, p.z);
    z1 = Math.max(z1, p.z);
  }
  x0 -= 40;
  z0 -= 40;
  x1 += 40;
  z1 += 40;
  const size = 1024;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  g.fillStyle = "#000";
  g.fillRect(0, 0, size, size);
  // Draw in world metres from here on
  g.setTransform(size / (x1 - x0), 0, 0, size / (z1 - z0), (-x0 * size) / (x1 - x0), (-z0 * size) / (z1 - z0));
  const quad = (a: { x: number; z: number }, b: { x: number; z: number }, cc: { x: number; z: number }, d: { x: number; z: number }) => {
    g.beginPath();
    g.moveTo(a.x, a.z);
    g.lineTo(b.x, b.z);
    g.lineTo(cc.x, cc.z);
    g.lineTo(d.x, d.z);
    g.closePath();
    g.fill();
  };
  const at = (i: number, d: number) => {
    const p = sampleAt(i);
    return { x: p.x - p.tz * d, z: p.z + p.tx * d };
  };
  // The infield green, a little dimmer
  g.fillStyle = "rgb(230,40,0)";
  g.fillRect(SET.green.x0 + 2, SET.green.z0 + 2, SET.green.x1 - SET.green.x0 - 4, SET.green.z1 - SET.green.z0 - 4);
  // Verges: brightest behind the wall, fading outwards
  for (const side of [1, -1] as const)
    for (let i = 0; i < N; i += 2) {
      const j = (i + 2) % N;
      const di = vergeDepth(i, side);
      const dj = vergeDepth(j, side);
      const a = at(i, (wallOffset(i, side) + 1.4) * side);
      const b = at(i, (wallOffset(i, side) + di) * side);
      const e = at(j, (wallOffset(j, side) + dj) * side);
      const f = at(j, (wallOffset(j, side) + 1.4) * side);
      if (Math.hypot(a.x - f.x, a.z - f.z) > 12) continue;
      const grad = g.createLinearGradient(a.x, a.z, b.x, b.z);
      grad.addColorStop(0, "rgb(255,166,0)");
      grad.addColorStop(1, `rgb(255,${Math.round((0.62 * Math.exp(-di / 9) + 0.06) * 255)},0)`);
      g.fillStyle = grad;
      // A hair wider than the step, so neighbouring quads leave no seams
      quad(a, b, e, f);
    }
  // Cut out everything that isn't turf
  g.fillStyle = "#000";
  g.strokeStyle = "#000";
  for (let i = 0; i < N; i += 2) {
    const j = (i + 2) % N;
    quad(at(i, -(wallOffset(i, -1) + 1.4)), at(i, wallOffset(i, 1) + 1.4), at(j, wallOffset(j, 1) + 1.4), at(j, -(wallOffset(j, -1) + 1.4)));
  }
  g.lineWidth = (PIT_HALF + 1.6) * 2;
  g.lineJoin = g.lineCap = "round";
  g.beginPath();
  pit.forEach((p, k) => (k ? g.lineTo(p.x, p.z) : g.moveTo(p.x, p.z)));
  g.stroke();
  g.beginPath();
  water.forEach(([x, z], k) => (k ? g.lineTo(x, z) : g.moveTo(x, z)));
  g.closePath();
  g.fill();
  for (const f of footprints) {
    g.save();
    g.translate(f.x, f.z);
    // The footprint's frame turns by ry about y; on the map (x right, z down) that's a turn of −ry
    g.rotate(-f.ry);
    g.fillRect(f.x0, f.z0, f.x1 - f.x0, f.z1 - f.z0);
    g.restore();
  }
  const circle = (x: number, z: number, r: number) => {
    g.beginPath();
    g.arc(x, z, r, 0, Math.PI * 2);
    g.fill();
  };
  for (const l of landmarks) circle(l.x, l.z, 11.5);
  for (const [x, z] of poles) circle(x, z, 1.2);
  const texture = new CanvasTexture(c);
  texture.flipY = false;
  texture.generateMipmaps = false;
  texture.minFilter = LinearFilter;
  return { texture, rect: new Vector4(x0, z0, x1 - x0, z1 - z0) };
}

/** How deep the verge runs behind the wall, varying smoothly round the lap. */
const vergeDepth = (i: number, side: number) => 10 + 3.5 * Math.sin(i * 0.031 + side * 1.7) + 2 * Math.sin(i * 0.11 + side);

/* ───────────── the parkland ───────────── */

/** Canopy colours: blossom, ember and wine among deep greens. */
const TREE_COLORS: [string, number][] = [
  ["#2f5d3a", 0.17],
  ["#3e7444", 0.13],
  ["#24493a", 0.12],
  ["#ec8fb0", 0.16],
  ["#d0447a", 0.12],
  ["#c1121f", 0.13],
  ["#8a1426", 0.09],
  ["#f2b8c6", 0.08],
];

export function buildFoliage(opts: { tier: TierSettings; calm: boolean; footprints: Footprint[]; poles: [number, number][]; off?: string[] }) {
  const { tier } = opts;
  const group = new Group();
  const rand = rng(2025);
  const disposables: { dispose: () => void }[] = [];
  AMBIENT.uWind.value = opts.calm ? 0 : 1;

  /* Where things may grow: off the track and pit lane, out of the water, clear of buildings */
  const clearOf = (x: number, z: number, r: number) => {
    if (inWater(x, z) || inWater(x + r, z) || inWater(x - r, z) || inWater(x, z + r) || inWater(x, z - r)) return false;
    if (drivable(x, z) < r + 0.9) return false;
    if (pitDist(x, z).d < r + 1.5) return false;
    for (const f of opts.footprints) if (inFootprint(f, x, z, r)) return false;
    for (const l of landmarks) if (Math.hypot(l.x - x, l.z - z) < 12.5 + r) return false;
    for (const [px, pz] of opts.poles) if (Math.hypot(px - x, pz - z) < 1.6 + r) return false;
    return true;
  };
  /** Floodlight on a spot: strongest right behind the wall, gone 25 m out. */
  const floodAt = (x: number, z: number) => {
    const h = locate(x, z);
    const behind = h.dist - wallOffset(h.i, h.d >= 0 ? 1 : -1);
    return 0.62 * Math.exp(-Math.max(0, behind) / 9) + 0.06;
  };
  /** A point on the verge: sample i, side, metres behind the wall. */
  const verge = (i: number, side: 1 | -1, behind: number) => {
    const p = sampleAt(i);
    const o = (wallOffset(i, side) + behind) * side;
    return { x: p.x - p.tz * o, z: p.z + p.tx * o };
  };
  const depthAt = vergeDepth;

  /* ── turf along both verges, and petals on it ── */
  {
    const pos: number[] = [];
    const col: number[] = [];
    const lit: number[] = [];
    const c = new Color();
    const turfA = new Color("#34502f");
    const turfB = new Color("#3e5a2c");
    const quad = (ax: number, az: number, bx: number, bz: number, cx: number, cz: number, dx: number, dz: number, y: number, color: Color, la: number, lb: number) => {
      pos.push(ax, y, az, bx, y, bz, cx, y, cz, ax, y, az, cx, y, cz, dx, y, dz);
      for (let k = 0; k < 6; k++) col.push(color.r, color.g, color.b);
      lit.push(la, lb, lb, la, lb, la);
    };
    const step = 2;
    for (const side of [1, -1] as const)
      for (let i = 0; i < N; i += step) {
        const j = (i + step) % N;
        const da = depthAt(i, side);
        const db = depthAt(j, side);
        const a0 = verge(i, side, 0.4);
        const a1 = verge(i, side, da);
        const b0 = verge(j, side, 0.4);
        const b1 = verge(j, side, db);
        if ([a0, a1, b0, b1].some((p) => inWater(p.x, p.z))) continue;
        if (Math.hypot(a0.x - b0.x, a0.z - b0.z) > 12) continue;
        c.copy(turfA).lerp(turfB, 0.5 + 0.5 * Math.sin(i * 0.07 + side));
        // Floodlight spill: the same falloff the grass and trees get (see floodAt)
        quad(a0.x, a0.z, a1.x, a1.z, b1.x, b1.z, b0.x, b0.z, -0.03, c, 0.65, 0.62 * Math.exp(-(da + db) / 18) + 0.06);
      }
    // Petals: scattered on the turf where the blossom trees will be (added below), placed later
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new Float32BufferAttribute(col, 3));
    g.setAttribute("aLit", new Float32BufferAttribute(lit, 1));
    // Every quad faces up
    const p = g.attributes.position as BufferAttribute;
    for (let k = 0; k < p.count; k += 3) {
      const ux = p.getX(k + 1) - p.getX(k);
      const uz = p.getZ(k + 1) - p.getZ(k);
      const vx = p.getX(k + 2) - p.getX(k);
      const vz = p.getZ(k + 2) - p.getZ(k);
      if (uz * vx - ux * vz < 0) {
        const x = p.getX(k + 1);
        const z = p.getZ(k + 1);
        p.setXYZ(k + 1, p.getX(k + 2), p.getY(k + 2), p.getZ(k + 2));
        p.setXYZ(k + 2, x, p.getY(k + 1), z);
        const l = g.attributes.aLit as BufferAttribute;
        const t = l.getX(k + 1);
        l.setX(k + 1, l.getX(k + 2));
        l.setX(k + 2, t);
      }
    }
    g.computeVertexNormals();
    g.computeBoundingSphere();
    const turf = new Mesh(g, worldMaterial({ flatShading: false }));
    turf.receiveShadow = true;
    turf.name = "turf";
    group.add(turf);
  }

  /* ── trees and shrubs ── */
  type Tree = { x: number; z: number; s: number; color: Color; lit: number; shrub: boolean };
  const trees: Tree[] = [];
  const palette = TREE_COLORS.map(([c, w]) => [new Color(c), w] as const);
  const pickColor = (warmth: number) => {
    // warmth > 0 leans to blossom, < 0 to greens
    let x = rand();
    for (const [c, w] of palette) {
      const isGreen = c.g > c.r;
      const ww = w * (isGreen ? 1 - warmth : 1 + warmth);
      if ((x -= ww) <= 0) return c.clone().offsetHSL((rand() - 0.5) * 0.02, 0, (rand() - 0.5) * 0.05);
    }
    return palette[0][0].clone();
  };
  const addTree = (x: number, z: number, s: number, shrub: boolean, warmth = 0) => {
    for (const t of trees) if (Math.hypot(t.x - x, t.z - z) < (t.s + s) * 0.75) return false;
    trees.push({ x, z, s, color: pickColor(warmth), lit: floodAt(x, z), shrub });
    return true;
  };
  // Along the verges: groves of two or three, with gaps, so the walls aren't lined like a hedge
  {
    let guard = 0;
    const want = Math.round(tier.trees * 0.62);
    while (trees.length < want && guard++ < want * 30) {
      const i = Math.floor(rand() * N);
      const side = rand() < 0.5 ? 1 : -1;
      if (Math.sin(i * 0.045 + side * 2.1) < -0.35) continue; // open stretches
      const behind = 3.2 + rand() * (depthAt(i, side) - 4);
      const p = verge(i, side, behind);
      const s = 2.1 + rand() * 1.4;
      if (!clearOf(p.x, p.z, s * 0.7)) continue;
      addTree(p.x, p.z, s, false, Math.sin(i * 0.02) * 0.5);
    }
  }
  // The infield park: a ring of trees round the green and a few inside
  {
    const g = SET.green;
    let guard = 0;
    const want = trees.length + Math.round(tier.trees * 0.24);
    while (trees.length < want && guard++ < 6000) {
      let x = g.x0 + rand() * (g.x1 - g.x0);
      let z = g.z0 + rand() * (g.z1 - g.z0);
      if (rand() < 0.7) {
        // Snap to the nearest edge of the green, give or take
        const e = [x - g.x0, g.x1 - x, z - g.z0, g.z1 - z];
        const k = e.indexOf(Math.min(...e));
        if (k === 0) x = g.x0 + 2 + rand() * 4;
        else if (k === 1) x = g.x1 - 2 - rand() * 4;
        else if (k === 2) z = g.z0 + 2 + rand() * 4;
        else z = g.z1 - 2 - rand() * 4;
      }
      const s = 2.4 + rand() * 1.8;
      if (!clearOf(x, z, s * 0.6)) continue;
      addTree(x, z, s, false, 0.3);
    }
  }
  // Along the river and the bay's north shore
  {
    let guard = 0;
    const want = trees.length + Math.round(tier.trees * 0.14);
    while (trees.length < want && guard++ < 6000) {
      const w = water[Math.floor(rand() * water.length)];
      const x = w[0] + (rand() - 0.5) * 40;
      const z = w[1] + (rand() - 0.5) * 40;
      const s = 2.2 + rand() * 1.5;
      if (!clearOf(x, z, s * 0.6)) continue;
      addTree(x, z, s, false, -0.3);
    }
  }
  const treeCount = trees.length;
  // Shrubs: low, round, tucked behind the walls and round the pavilions
  {
    let guard = 0;
    const want = treeCount + tier.shrubs;
    while (trees.length < want && guard++ < tier.shrubs * 40) {
      let x: number;
      let z: number;
      if (rand() < 0.3) {
        // Round a pavilion's plinth
        const l = landmarks[Math.floor(rand() * landmarks.length)];
        const a = rand() * Math.PI * 2;
        const d = 13.5 + rand() * 3;
        x = l.x + Math.cos(a) * d;
        z = l.z + Math.sin(a) * d;
      } else {
        const i = Math.floor(rand() * N);
        const side = rand() < 0.5 ? 1 : -1;
        const p = verge(i, side, 1.4 + rand() * 4);
        x = p.x;
        z = p.z;
      }
      const s = 0.9 + rand() * 0.8;
      if (!clearOf(x, z, s * 0.6)) continue;
      addTree(x, z, s, true, 0.4);
    }
  }

  const leafTex = leafTexture();
  disposables.push(leafTex);
  const leafMat = new ShaderMaterial({
    uniforms: UniformsUtils.merge([UniformsLib.fog, { uMap: { value: null } }]),
    vertexShader: LEAF_VERT,
    fragmentShader: LEAF_FRAG,
    fog: true,
    side: DoubleSide,
  });
  Object.assign(leafMat.uniforms, AMBIENT);
  leafMat.uniforms.uMap.value = leafTex;
  const canopyGeo = canopyGeometry(tier.cards, 77);
  const litAttr = new InstancedBufferAttribute(new Float32Array(trees.length), 1);
  canopyGeo.setAttribute("aLit", litAttr);
  const canopies = new InstancedMesh(canopyGeo, leafMat, trees.length);
  const trunkGeo = new Batch();
  trunkGeo.add(new CylinderGeometry(0.09, 0.15, 1, 6).translate(0, 0.5, 0), "#4a3428", 0.25);
  trunkGeo.add(new CylinderGeometry(0.04, 0.07, 0.5, 5).rotateZ(0.7).translate(0.16, 0.72, 0), "#4a3428", 0.25);
  trunkGeo.add(new CylinderGeometry(0.04, 0.07, 0.45, 5).rotateZ(-0.8).translate(-0.14, 0.62, 0.02), "#4a3428", 0.25);
  const trunks = new InstancedMesh(trunkGeo.build(), worldMaterial(), treeCount);
  const o = new Object3D();
  const tint = new Color();
  trees.forEach((t, k) => {
    const yaw = rand() * Math.PI * 2;
    if (!t.shrub) {
      // Trunk height to the canopy's underside, then the canopy
      const trunkH = t.s * (0.95 + rand() * 0.3);
      o.position.set(t.x, 0, t.z);
      o.rotation.set(0, yaw, 0);
      o.scale.set(t.s * 0.75, trunkH, t.s * 0.75);
      o.updateMatrix();
      trunks.setMatrixAt(k, o.matrix);
      o.position.set(t.x, trunkH + t.s * 0.62, t.z);
      o.scale.set(t.s * 1.25, t.s * 1.05, t.s * 1.25);
    } else {
      o.position.set(t.x, t.s * 0.45, t.z);
      o.scale.set(t.s * 1.2, t.s * 0.75, t.s * 1.2);
    }
    o.rotation.set(0, yaw, 0);
    o.updateMatrix();
    canopies.setMatrixAt(k, o.matrix);
    canopies.setColorAt(k, tint.copy(t.color));
    litAttr.setX(k, t.lit);
  });
  canopies.computeBoundingSphere();
  trunks.computeBoundingSphere();
  canopies.name = "canopies";
  if (!opts.off?.includes("trees")) group.add(canopies, trunks);

  /* ── rocks, and petals under the blossom ── */
  {
    const geo = new DodecahedronGeometry(1, 0);
    geo.setAttribute("aLit", new BufferAttribute(new Float32Array(geo.attributes.position.count).fill(0.3), 1));
    const rocks = new InstancedMesh(geo, worldMaterial({ vertexColors: false }), tier.rocks);
    const stones = ["#8d8578", "#a39887", "#6f6a64", "#b3a48c"].map((c) => new Color(c));
    let n = 0;
    for (let guard = 0; n < tier.rocks && guard < tier.rocks * 20; guard++) {
      // Near a tree, or out on the verge
      const t = trees[Math.floor(rand() * trees.length)];
      const a = rand() * Math.PI * 2;
      const d = t.s * (0.8 + rand() * 1.4);
      const x = t.x + Math.cos(a) * d;
      const z = t.z + Math.sin(a) * d;
      const s = 0.22 + rand() * rand() * 0.8;
      if (!clearOf(x, z, s)) continue;
      o.position.set(x, s * 0.18, z);
      o.rotation.set(rand() * 3, rand() * 3, rand() * 3);
      o.scale.set(s * (1 + rand() * 0.5), s * 0.62, s);
      o.updateMatrix();
      rocks.setMatrixAt(n, o.matrix);
      rocks.setColorAt(n, stones[Math.floor(rand() * stones.length)]);
      n++;
    }
    rocks.count = n;
    rocks.computeBoundingSphere();
    group.add(rocks);

    if (tier.petals > 0) {
      const b = new Batch();
      const blossom = trees.filter((t) => t.color.r > t.color.g * 1.4);
      for (let k = 0; k < tier.petals && blossom.length; k++) {
        const t = blossom[Math.floor(rand() * blossom.length)];
        const a = rand() * Math.PI * 2;
        const d = Math.sqrt(rand()) * t.s * 1.8;
        const x = t.x + Math.cos(a) * d;
        const z = t.z + Math.sin(a) * d;
        if (inWater(x, z) || drivable(x, z) < 0.6) continue;
        const s = 0.07 + rand() * 0.08;
        const g = new BufferGeometry();
        const ry = rand() * Math.PI;
        const cx = Math.cos(ry) * s;
        const sz = Math.sin(ry) * s;
        g.setAttribute("position", new Float32BufferAttribute([x - cx, -0.015, z - sz, x + sz * 0.6, -0.015, z - cx * 0.6, x + cx, -0.015, z + sz], 3));
        b.add(g, tint.copy(t.color).offsetHSL(0, 0, 0.05 + rand() * 0.1), t.lit * 1.4);
      }
      if (!b.empty) {
        const petals = new Mesh(b.build(), worldMaterial({ side: DoubleSide }));
        petals.name = "petals";
        group.add(petals);
      }
    }
  }

  /* ── grass: two blade grids round the camera, on a painted turf mask ── */
  const mask = grassMask(opts.footprints, opts.poles);
  disposables.push(mask.texture);
  const template = bladeTemplate();
  disposables.push(template);
  const tile = (grid: number, radius: number) => {
    const g = new InstancedBufferGeometry();
    g.index = template.index;
    g.setAttribute("position", template.attributes.position);
    g.setAttribute("aId", new InstancedBufferAttribute(Float32Array.from({ length: grid * grid }, (_, k) => k), 1));
    g.instanceCount = grid * grid;
    const mat = new ShaderMaterial({
      uniforms: UniformsUtils.merge([
        UniformsLib.fog,
        {
          uMask: { value: null },
          uMaskRect: { value: mask.rect },
          uCenter: { value: new Vector2() },
          uGrid: { value: grid },
          uCell: { value: (radius * 2) / grid },
          uRadius: { value: radius },
          uHole: { value: 0 },
          uHoleAt: { value: new Vector2(1e6, 1e6) },
          uRoot: { value: new Color("#34502f") },
          uTip: { value: new Color("#86ad52") },
          uWarm: { value: new Color("#d6c066") },
        },
      ]),
      vertexShader: GRASS_VERT,
      fragmentShader: GRASS_FRAG,
      fog: true,
      side: DoubleSide,
    });
    Object.assign(mat.uniforms, AMBIENT);
    mat.uniforms.uMask.value = mask.texture;
    const m = new Mesh(g, mat);
    m.frustumCulled = false;
    m.name = "grass";
    if (!opts.off?.includes("grass")) group.add(m);
    return { mesh: m, geo: g, mat, grid, radius };
  };
  const near = tile(tier.grassGrid[0], tier.grassReach[0]);
  const far = tier.grassGrid[1] > 0 ? tile(tier.grassGrid[1], tier.grassReach[1]) : null;
  if (far) far.mat.uniforms.uHole.value = near.radius;
  const fwd = new Vector3();

  return {
    group,
    counts: { trees: treeCount, shrubs: trees.length - treeCount, blades: near.geo.instanceCount + (far?.geo.instanceCount ?? 0) },
    /** Grass reach as a fraction of the tier's (the governor trims it): the near tile shrinks at the same density, the far one goes. */
    setReach(k: number) {
      const g = Math.max(8, Math.round(near.grid * Math.min(1, Math.max(0.5, k))));
      near.geo.instanceCount = g * g;
      near.mat.uniforms.uGrid.value = g;
      near.mat.uniforms.uRadius.value = (near.radius * g) / near.grid;
      if (far) {
        far.mesh.visible = k > 0.8;
        far.mat.uniforms.uHole.value = near.mat.uniforms.uRadius.value;
      }
    },
    update(t: number, camera: Camera, hemi: HemisphereLight, sun: DirectionalLight) {
      AMBIENT.uTime.value = t;
      AMBIENT.uCam.value.copy(camera.position);
      // Tiles sit ahead of the camera, where the eye is looking
      camera.getWorldDirection(fwd);
      const flat = Math.hypot(fwd.x, fwd.z) || 1;
      const look = (r: number) => Math.min(r * 0.75, Math.max(0, camera.position.y * 0.9) + r * 0.45);
      const k = look(near.mat.uniforms.uRadius.value as number);
      (near.mat.uniforms.uCenter.value as Vector2).set(camera.position.x + (fwd.x / flat) * k, camera.position.z + (fwd.z / flat) * k);
      if (far) {
        const kf = look(far.radius);
        (far.mat.uniforms.uCenter.value as Vector2).set(camera.position.x + (fwd.x / flat) * kf, camera.position.z + (fwd.z / flat) * kf);
        (far.mat.uniforms.uHoleAt.value as Vector2).copy(near.mat.uniforms.uCenter.value as Vector2);
      }
      // Same scale as three's Lambert: irradiance / π
      AMBIENT.uSky.value.copy(hemi.color).multiplyScalar(hemi.intensity / Math.PI);
      AMBIENT.uGround.value.copy(hemi.groundColor).multiplyScalar(hemi.intensity / Math.PI);
      AMBIENT.uSun.value.copy(sun.color).multiplyScalar(sun.intensity / Math.PI);
      AMBIENT.uSunDir.value.copy(sun.position).sub(sun.target.position).normalize();
    },
    dispose() {
      for (const d of disposables) d.dispose();
    },
  };
}
export type Foliage = ReturnType<typeof buildFoliage>;
