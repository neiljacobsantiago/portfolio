import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  type Material,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  type MeshLambertMaterialParameters,
  MeshStandardMaterial,
  type MeshStandardMaterialParameters,
  NoColorSpace,
  Quaternion,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
  Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RACE_FAMILY, raceFontReady } from "./fonts";

// Small shared tools for building the circuit: the site palette, a batcher
// that bakes colour and "floodlight" into vertices and merges everything of
// one material into a single draw call, the material patch that makes those
// vertices glow at night without a single real-time light, chamfered boxes
// (no raw edges where the camera gets close), procedural textures for
// asphalt, concrete and crowds, and board lettering in the race font.

export const C = {
  paper: "#fdf0d5",
  ink: "#003049",
  wine: "#780000",
  ember: "#c1121f",
  sky: "#669bbc",
  carbon: "#16191e",
  asphalt: "#3a3d44",
  concrete: "#b9b3a6",
  steel: "#8e98a3",
};

/** Uniforms every lit material shares; the engine eases them with the time of day. */
export const LIGHTS = {
  /** Floodlight and window glow strength: 1 at night, 0 by day. */
  uFlood: { value: 1 },
};

/**
 * What the world is built with on this device: physically based materials
 * lit by the night environment on medium and high, Lambert on budget phones;
 * texture sizes to match. The engine sets it before building anything.
 */
export const KIT = { pbr: true, tier: 2 as 0 | 1 | 2, tex: 1024 };
export function setKitTier(tier: 0 | 1 | 2) {
  KIT.tier = tier;
  KIT.pbr = tier > 0;
  KIT.tex = [256, 512, 1024][tier];
}

/**
 * Patches a Lambert or Standard material so that a per-vertex `aLit`
 * attribute adds self-illumination scaled by LIGHTS.uFlood: floodlit tarmac,
 * lit garages, lamp heads. Geometry without `aLit` reads 0 and is unchanged.
 */
export function floodlit<M extends MeshLambertMaterial | MeshStandardMaterial>(mat: M, key = "lit"): M {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uFlood = LIGHTS.uFlood;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float aLit;\nvarying float vLit;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvLit = aLit;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uFlood;\nvarying float vLit;")
      .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * uFlood * vLit;");
  };
  mat.customProgramCacheKey = () => key;
  return mat;
}

type WorldParams = MeshStandardMaterialParameters & MeshLambertMaterialParameters;
const PBR_ONLY = ["roughness", "metalness", "roughnessMap", "metalnessMap", "envMapIntensity", "normalScale"] as const;

/** Standard (medium, high) or Lambert (low) with the same look, minus what Lambert can't do. */
export function litMaterial(params: WorldParams, key = "lit") {
  if (KIT.pbr) return floodlit(new MeshStandardMaterial({ roughness: 0.82, metalness: 0, envMapIntensity: 0.75, ...params }), key);
  const p: Record<string, unknown> = { ...params };
  for (const k of PBR_ONLY) delete p[k];
  delete p.normalMap;
  return floodlit(new MeshLambertMaterial(p as MeshLambertMaterialParameters), key);
}

/** The workhorse world material: vertex colours, flat shading, floodlit. */
export const worldMaterial = (extra: WorldParams = {}) => litMaterial({ vertexColors: true, flatShading: true, ...extra });

export const std = (color: string, extra: MeshStandardMaterialParameters = {}) => new MeshStandardMaterial({ color, roughness: 0.6, metalness: 0, ...extra });

export function part(geometry: BufferGeometry, material: Material | Material[], x = 0, y = 0, z = 0, shadow = false) {
  const m = new Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = shadow;
  return m;
}

const tmpColor = new Color();
const tmpMatrix = new Matrix4();

/**
 * Collects geometry with a colour and a floodlight value per piece, then
 * merges it into one BufferGeometry (position, normal, color, aLit, and uv
 * or any `keep` attributes when asked).
 */
export class Batch {
  private parts: BufferGeometry[] = [];
  constructor(
    private keepUv = false,
    private keep: string[] = [],
  ) {}

  /** Adds a geometry (consumed) with a transform, colour and glow. */
  add(geo: BufferGeometry, color: string | Color, lit = 0, matrix?: Matrix4) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (geo.index) geo.dispose();
    if (matrix) g.applyMatrix4(matrix);
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!this.keepUv) g.deleteAttribute("uv");
    else if (!g.attributes.uv) g.setAttribute("uv", new BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    for (const name of Object.keys(g.attributes)) if (!["position", "normal", "uv", "color", "aLit", ...this.keep].includes(name)) g.deleteAttribute(name);
    const n = g.attributes.position.count;
    if (!g.attributes.color) {
      const c = typeof color === "string" ? tmpColor.set(color) : color;
      const arr = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) arr.set([c.r, c.g, c.b], i * 3);
      g.setAttribute("color", new BufferAttribute(arr, 3));
    }
    if (!g.attributes.aLit) g.setAttribute("aLit", new BufferAttribute(new Float32Array(n).fill(lit), 1));
    for (const k of this.keep) if (!g.attributes[k]) g.setAttribute(k, new BufferAttribute(new Float32Array(n), 1));
    g.morphAttributes = {};
    g.clearGroups();
    this.parts.push(g);
    return this;
  }

  /** Adds a geometry placed at (x, y, z) with rotation about y. */
  place(geo: BufferGeometry, color: string | Color, lit: number, x: number, y: number, z: number, ry = 0, rx = 0, rz = 0) {
    tmpMatrix.makeRotationY(ry);
    if (rx || rz) {
      const m2 = new Matrix4().makeRotationX(rx);
      const m3 = new Matrix4().makeRotationZ(rz);
      tmpMatrix.multiply(m2).multiply(m3);
    }
    tmpMatrix.setPosition(x, y, z);
    return this.add(geo, color, lit, tmpMatrix);
  }

  get empty() {
    return this.parts.length === 0;
  }

  get count() {
    return this.parts.length;
  }

  build() {
    const merged = mergeGeometries(this.parts, false)!;
    for (const p of this.parts) p.dispose();
    this.parts = [];
    merged.computeBoundingSphere();
    return merged;
  }
}

type P3 = [number, number, number];

/**
 * A triangle soup written straight into arrays: position, flat normal,
 * colour, floodlight and uv (and a second uv when asked). For long runs of
 * generated surface (track, walls, kerbs) where one BufferGeometry per piece
 * would be wasteful.
 */
export class Soup {
  pos: number[] = [];
  nrm: number[] = [];
  col: number[] = [];
  lit: number[] = [];
  uv: number[] = [];
  uv1: number[] = [];
  private c = new Color();
  private a = new Vector3();
  private b = new Vector3();
  private n = new Vector3();
  constructor(private second = false) {}
  /** One triangle; `up` flips it if needed so its normal has a positive dot with that direction. */
  tri(p: P3[], color: string | Color, lit: number[] | number, uv?: number[][], uv1?: number[][], up?: P3) {
    this.a.set(p[1][0] - p[0][0], p[1][1] - p[0][1], p[1][2] - p[0][2]);
    this.b.set(p[2][0] - p[0][0], p[2][1] - p[0][1], p[2][2] - p[0][2]);
    this.n.crossVectors(this.a, this.b).normalize();
    let order = [0, 1, 2];
    if (up && this.n.x * up[0] + this.n.y * up[1] + this.n.z * up[2] < 0) {
      order = [0, 2, 1];
      this.n.negate();
    }
    const c = typeof color === "string" ? this.c.set(color) : color;
    for (const k of order) {
      this.pos.push(p[k][0], p[k][1], p[k][2]);
      this.nrm.push(this.n.x, this.n.y, this.n.z);
      this.col.push(c.r, c.g, c.b);
      this.lit.push(typeof lit === "number" ? lit : lit[k]);
      this.uv.push(uv ? uv[k][0] : 0, uv ? uv[k][1] : 0);
      if (this.second) this.uv1.push(uv1 ? uv1[k][0] : 0, uv1 ? uv1[k][1] : 0);
    }
  }
  /** A quad, corners in order round it. */
  quad(p: P3[], color: string | Color, lit: number[] | number, uv?: number[][], uv1?: number[][], up?: P3) {
    const l = typeof lit === "number" ? [lit, lit, lit, lit] : lit;
    this.tri([p[0], p[1], p[2]], color, [l[0], l[1], l[2]], uv && [uv[0], uv[1], uv[2]], uv1 && [uv1[0], uv1[1], uv1[2]], up);
    this.tri([p[0], p[2], p[3]], color, [l[0], l[2], l[3]], uv && [uv[0], uv[2], uv[3]], uv1 && [uv1[0], uv1[2], uv1[3]], up);
  }
  get empty() {
    return this.pos.length === 0;
  }
  build() {
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(this.pos, 3));
    g.setAttribute("normal", new Float32BufferAttribute(this.nrm, 3));
    g.setAttribute("color", new Float32BufferAttribute(this.col, 3));
    g.setAttribute("aLit", new Float32BufferAttribute(this.lit, 1));
    g.setAttribute("uv", new Float32BufferAttribute(this.uv, 2));
    if (this.second) g.setAttribute("uv1", new Float32BufferAttribute(this.uv1, 2));
    g.computeBoundingSphere();
    return g;
  }
}

/** Sets one float attribute on every vertex of a geometry (for Batch `keep` attributes). */
export function withAttr(g: BufferGeometry, name: string, value: number) {
  g.setAttribute(name, new BufferAttribute(new Float32Array(g.attributes.position.count).fill(value), 1));
  return g;
}

/* ───────────── chamfered boxes ───────────── */

/**
 * A box with every edge chamfered: 44 triangles, flat-shaded, so the bevels
 * catch the light like a real precast block or a painted steel member.
 * Centred on the origin; uv is a box projection in metres.
 */
export function bevelBox(w: number, h: number, d: number, r = Math.min(0.08, Math.min(w, h, d) * 0.2)) {
  const a = w / 2;
  const b = h / 2;
  const c = d / 2;
  r = Math.min(r, a * 0.9, b * 0.9, c * 0.9);
  const pos: number[] = [];
  const uv: number[] = [];
  const v = new Vector3();
  const n = new Vector3();
  const e1 = new Vector3();
  const e2 = new Vector3();
  const tri = (p: number[][]) => {
    // Wind outwards: the face normal should point away from the centre
    e1.set(p[1][0] - p[0][0], p[1][1] - p[0][1], p[1][2] - p[0][2]);
    e2.set(p[2][0] - p[0][0], p[2][1] - p[0][1], p[2][2] - p[0][2]);
    n.crossVectors(e1, e2);
    v.set(p[0][0] + p[1][0] + p[2][0], p[0][1] + p[1][1] + p[2][1], p[0][2] + p[1][2] + p[2][2]);
    if (n.dot(v) < 0) p = [p[0], p[2], p[1]];
    // Project on the dominant axis for uv
    const ax = Math.abs(n.x);
    const ay = Math.abs(n.y);
    const az = Math.abs(n.z);
    for (const q of p) {
      pos.push(q[0], q[1], q[2]);
      if (ay >= ax && ay >= az) uv.push(q[0] + a, q[2] + c);
      else if (ax >= az) uv.push(q[2] + c, q[1] + b);
      else uv.push(q[0] + a, q[1] + b);
    }
  };
  const quad = (p: number[][]) => {
    tri([p[0], p[1], p[2]]);
    tri([p[0], p[2], p[3]]);
  };
  for (const s of [1, -1]) {
    // Faces
    quad([[s * a, b - r, c - r], [s * a, -(b - r), c - r], [s * a, -(b - r), -(c - r)], [s * a, b - r, -(c - r)]]);
    quad([[a - r, s * b, c - r], [-(a - r), s * b, c - r], [-(a - r), s * b, -(c - r)], [a - r, s * b, -(c - r)]]);
    quad([[a - r, b - r, s * c], [-(a - r), b - r, s * c], [-(a - r), -(b - r), s * c], [a - r, -(b - r), s * c]]);
    for (const t of [1, -1]) {
      // Edges along z, along x, along y
      quad([[s * a, t * (b - r), c - r], [s * (a - r), t * b, c - r], [s * (a - r), t * b, -(c - r)], [s * a, t * (b - r), -(c - r)]]);
      quad([[a - r, s * b, t * (c - r)], [a - r, s * (b - r), t * c], [-(a - r), s * (b - r), t * c], [-(a - r), s * b, t * (c - r)]]);
      quad([[s * a, b - r, t * (c - r)], [s * (a - r), b - r, t * c], [s * (a - r), -(b - r), t * c], [s * a, -(b - r), t * (c - r)]]);
      for (const u of [1, -1]) tri([[s * a, t * (b - r), u * (c - r)], [s * (a - r), t * b, u * (c - r)], [s * (a - r), t * (b - r), u * c]]);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

/** A round bar from a to b (struts, braces, legs). */
export function rod(a: Vector3, b: Vector3, r: number, seg = 5, r2 = r) {
  const d = b.clone().sub(a);
  const len = d.length();
  const g = new CylinderGeometry(r2, r, len, seg).translate(0, len / 2, 0);
  g.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), d.normalize()));
  return g.translate(a.x, a.y, a.z);
}

/* ───────────── procedural textures ───────────── */

/** Tiling value noise on a period-p lattice, a few octaves. */
function tilingNoise(size: number, period: number, octaves: number, seed: number) {
  const out = new Float32Array(size * size);
  const rand = rng(seed);
  let amp = 1;
  let total = 0;
  for (let o = 0; o < octaves; o++) {
    const p = period << o;
    const lattice = Float32Array.from({ length: p * p }, () => rand());
    const cell = size / p;
    for (let y = 0; y < size; y++) {
      const gy = y / cell;
      const y0 = Math.floor(gy) % p;
      const y1 = (y0 + 1) % p;
      let fy = gy - Math.floor(gy);
      fy = fy * fy * (3 - 2 * fy);
      for (let x = 0; x < size; x++) {
        const gx = x / cell;
        const x0 = Math.floor(gx) % p;
        const x1 = (x0 + 1) % p;
        let fx = gx - Math.floor(gx);
        fx = fx * fx * (3 - 2 * fx);
        const a = lattice[y0 * p + x0] + (lattice[y0 * p + x1] - lattice[y0 * p + x0]) * fx;
        const b = lattice[y1 * p + x0] + (lattice[y1 * p + x1] - lattice[y1 * p + x0]) * fx;
        out[y * size + x] += (a + (b - a) * fy) * amp;
      }
    }
    total += amp;
    amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

function canvasTexture(c: HTMLCanvasElement, srgb: boolean) {
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.colorSpace = srgb ? SRGBColorSpace : NoColorSpace;
  t.anisotropy = KIT.tier === 2 ? 8 : 4;
  return t;
}

/** A normal map (tangent space) from a tiling height field. */
function normalFrom(h: Float32Array, size: number, strength: number) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const img = g.createImageData(size, size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const l = h[y * size + ((x - 1 + size) % size)];
      const r = h[y * size + ((x + 1) % size)];
      const u = h[((y - 1 + size) % size) * size + x];
      const d = h[((y + 1) % size) * size + x];
      const nx = (l - r) * strength;
      const ny = (d - u) * strength;
      const len = Math.hypot(nx, ny, 1);
      const k = (y * size + x) * 4;
      img.data[k] = ((nx / len) * 0.5 + 0.5) * 255;
      img.data[k + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      img.data[k + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      img.data[k + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  return canvasTexture(c, false);
}

export interface SurfaceMaps {
  map: Texture;
  normalMap?: Texture;
  roughnessMap?: Texture;
  dispose: () => void;
}

/**
 * Asphalt, tiling every few metres: fine aggregate in a darker binder,
 * a few polished stones that catch the floodlights. Albedo is a multiplier
 * around 0.85, so vertex colours keep the tone (rubbered line, run-off).
 */
export function asphaltMaps(size = KIT.tex): SurfaceMaps {
  const rand = rng(1717);
  const h = tilingNoise(size, 8, 4, 11);
  const fine = tilingNoise(size, 64, 2, 12);
  const shine = new Float32Array(size * size);
  for (let i = 0; i < h.length; i++) h[i] = h[i] * 0.45 + fine[i] * 0.55;
  // Aggregate: small stones, lighter or darker than the binder
  const stones = Math.round(size * size * 0.018);
  for (let s = 0; s < stones; s++) {
    const cx = rand() * size;
    const cy = rand() * size;
    const r = 0.6 + rand() * rand() * 2.2 * (size / 512);
    const lift = (rand() - 0.35) * 0.9;
    const polish = rand() < 0.25 ? 0.6 + rand() * 0.4 : 0;
    for (let y = Math.floor(cy - r); y <= cy + r; y++)
      for (let x = Math.floor(cx - r); x <= cx + r; x++) {
        const d = Math.hypot(x - cx, y - cy) / r;
        if (d > 1) continue;
        const k = ((y + size) % size) * size + ((x + size) % size);
        h[k] += lift * (1 - d * d) * 0.5;
        shine[k] = Math.max(shine[k], polish * (1 - d));
      }
  }
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const img = g.createImageData(size, size);
  const rc = document.createElement("canvas");
  rc.width = rc.height = size;
  const rg = rc.getContext("2d")!;
  const rimg = rg.createImageData(size, size);
  for (let i = 0; i < h.length; i++) {
    const v = Math.max(0, Math.min(1, 0.6 + (h[i] - 0.5) * 0.9));
    const a = 255 * Math.max(0, Math.min(1, 0.7 + v * 0.38));
    img.data[i * 4] = a;
    img.data[i * 4 + 1] = a;
    img.data[i * 4 + 2] = a * 1.01;
    img.data[i * 4 + 3] = 255;
    // three reads roughness from green
    const rough = 0.93 - shine[i] * 0.45 - (h[i] - 0.5) * 0.1;
    rimg.data[i * 4 + 1] = Math.max(0, Math.min(255, rough * 255));
    rimg.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  rg.putImageData(rimg, 0, 0);
  const map = canvasTexture(c, true);
  if (!KIT.pbr) return { map, dispose: () => map.dispose() };
  const normalMap = normalFrom(h, size, 3.2 * (size / 512));
  const roughnessMap = canvasTexture(rc, false);
  return { map, normalMap, roughnessMap, dispose: () => [map, normalMap, roughnessMap].forEach((t) => t.dispose()) };
}

/**
 * Cast concrete: soft mottling, a few darker stains and pores. `panel`
 * draws a joint every texture width (precast wall units, paving slabs).
 */
export function concreteMaps(size = KIT.tex / 2, panel: "none" | "vertical" | "grid" = "none"): SurfaceMaps {
  const rand = rng(2323 + panel.length);
  const h = tilingNoise(size, 4, 5, 21);
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const img = g.createImageData(size, size);
  for (let i = 0; i < h.length; i++) {
    const v = 0.86 + (h[i] - 0.5) * 0.22 + (rand() - 0.5) * 0.05;
    const a = Math.max(0, Math.min(255, v * 255));
    img.data[i * 4] = a;
    img.data[i * 4 + 1] = a * 0.99;
    img.data[i * 4 + 2] = a * 0.96;
    img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  // Stains running down, pores
  for (let s = 0; s < 14; s++) {
    const x = rand() * size;
    const w = 4 + rand() * size * 0.08;
    const grad = g.createLinearGradient(0, 0, 0, size);
    grad.addColorStop(0, "rgba(40,36,30,0)");
    grad.addColorStop(0.6 + rand() * 0.3, `rgba(40,36,30,${0.03 + rand() * 0.04})`);
    grad.addColorStop(1, "rgba(40,36,30,0)");
    g.fillStyle = grad;
    g.fillRect(x, 0, w, size);
  }
  g.fillStyle = "rgba(0,0,0,0.25)";
  for (let s = 0; s < size * 1.5; s++) g.fillRect(rand() * size, rand() * size, 1, 1);
  if (panel !== "none") {
    g.fillStyle = "rgba(30,28,26,0.55)";
    g.fillRect(0, 0, Math.max(2, size / 128), size);
    if (panel === "grid") g.fillRect(0, 0, size, Math.max(2, size / 128));
  }
  const map = canvasTexture(c, true);
  if (!KIT.pbr) return { map, dispose: () => map.dispose() };
  const normalMap = normalFrom(h, size, 1.2);
  return { map, normalMap, dispose: () => [map, normalMap].forEach((t) => t.dispose()) };
}

/** People in the stands: a strip of heads and shirts, two rows per tile, tiling sideways. */
export function crowdTexture(w = 512, h = 128) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  const rand = rng(808);
  g.fillStyle = "#2a2d33";
  g.fillRect(0, 0, w, h);
  const shirts = [C.ember, C.paper, C.ink, C.sky, "#f2f2f2", C.wine, "#ffd27a", "#2b2b30", "#e65a3c", "#7bd88f", "#3d5a80", "#f4a259", C.ember, "#ffffff"];
  const skin = ["#f1c9a5", "#e0ac69", "#c68642", "#8d5524", "#ffdbac", "#d29b6c"];
  for (let row = 0; row < 2; row++) {
    const y0 = row * (h / 2);
    // Seat backs first, then people in most seats
    g.fillStyle = row ? "#3b4250" : "#343a46";
    g.fillRect(0, y0 + h * 0.33, w, h * 0.17);
    for (let x = 2; x < w; x += 9 + rand() * 4) {
      if (rand() < 0.12) continue;
      const sw = 7 + rand() * 3;
      const top = y0 + h * 0.12 + rand() * h * 0.06;
      g.fillStyle = shirts[Math.floor(rand() * shirts.length)];
      g.beginPath();
      g.roundRect(x, top + h * 0.12, sw, h * 0.3, 3);
      g.fill();
      g.fillStyle = skin[Math.floor(rand() * skin.length)];
      g.beginPath();
      g.arc(x + sw / 2, top + h * 0.07, h * 0.065, 0, Math.PI * 2);
      g.fill();
      // A few raised arms and flags
      if (rand() < 0.08) {
        g.fillRect(x + sw - 1, top - h * 0.06, 2, h * 0.16);
        if (rand() < 0.5) {
          g.fillStyle = rand() < 0.5 ? C.ember : C.paper;
          g.fillRect(x + sw, top - h * 0.06, 7, 5);
        }
      }
    }
  }
  const t = new CanvasTexture(c);
  t.wrapS = RepeatWrapping;
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/* ───────────── boards in the race font ───────────── */

export interface BoardLine {
  text: string;
  bg: string;
  fg: string;
  /** Weight (and "italic"): "italic 900" by default, broadcast style. */
  font?: string;
  /** Text height as a fraction of the row. */
  size?: number;
  /** A colour for chevrons at both ends and a thin rule, motorsport style. */
  accent?: string;
  /** A fine pixel grid over the face: an LED board. */
  led?: boolean;
  align?: "center" | "left";
  /** Only the first part of the row (a fraction of its width): square signs in a strip atlas. */
  cell?: number;
}

function drawBoard(g: CanvasRenderingContext2D, l: BoardLine, x: number, y: number, w: number, h: number) {
  g.fillStyle = l.bg;
  g.fillRect(x, y, w, h);
  let inset = h * 0.35;
  if (l.accent) {
    // Chevrons at both ends and a thin rule under the text
    g.fillStyle = l.accent;
    for (const side of [0, 1]) {
      for (let k = 0; k < 2; k++) {
        const cx = side ? x + w - h * (0.5 + k * 0.42) : x + h * (0.35 + k * 0.42);
        const dir = side ? -1 : 1;
        g.beginPath();
        g.moveTo(cx, y + h * 0.2);
        g.lineTo(cx + dir * h * 0.22, y + h * 0.5);
        g.lineTo(cx, y + h * 0.8);
        g.lineTo(cx + dir * h * 0.12, y + h * 0.8);
        g.lineTo(cx + dir * h * 0.34, y + h * 0.5);
        g.lineTo(cx + dir * h * 0.12, y + h * 0.2);
        g.closePath();
        g.fill();
      }
    }
    g.fillRect(x, y + h - Math.max(2, h * 0.06), w, Math.max(2, h * 0.06));
    inset = h * 1.3;
  }
  const font = l.font ?? "italic 900";
  let px = Math.round(h * (l.size ?? 0.58));
  g.font = `${font} ${px}px ${RACE_FAMILY}`;
  const max = w - inset * 2;
  const tw = g.measureText(l.text).width;
  if (tw > max) {
    px = Math.floor((px * max) / tw);
    g.font = `${font} ${px}px ${RACE_FAMILY}`;
  }
  g.fillStyle = l.fg;
  g.textAlign = l.align === "left" ? "left" : "center";
  g.textBaseline = "middle";
  g.fillText(l.text, l.align === "left" ? x + inset : x + w / 2, y + h / 2 + px * 0.04);
  if (l.led) {
    g.fillStyle = "rgba(0,0,0,0.28)";
    const p = Math.max(2, Math.round(h / 22));
    for (let gx = x; gx < x + w; gx += p) g.fillRect(gx, y, 1, h);
    for (let gy = y; gy < y + h; gy += p) g.fillRect(x, gy, w, 1);
  }
}

/**
 * Board faces painted onto one canvas, a row per line, in the shared race
 * font. Drawn at once (in the fallback face if the font is still loading)
 * and painted again when it arrives.
 */
export function textTexture(lines: BoardLine[], w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  const rowH = h / lines.length;
  const draw = () => lines.forEach((l, i) => drawBoard(g, l, 0, i * rowH, w * (l.cell ?? 1), rowH));
  draw();
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = KIT.tier === 2 ? 8 : 4;
  let alive = true;
  t.addEventListener("dispose", () => (alive = false));
  raceFontReady().then(() => {
    if (!alive) return;
    draw();
    t.needsUpdate = true;
  });
  return t;
}

type V3 = { x: number; y: number; z: number };

/**
 * Every lettered face of one module in one draw call: rows of a single
 * canvas texture, each face a quad mapped onto its row. Faces are given as
 * the viewer sees them: bottom-left, bottom-right, top-right, top-left.
 */
export class BoardAtlas {
  private lines: BoardLine[] = [];
  private pos: number[] = [];
  private uvs: number[] = [];
  /** The row for a board (identical boards share one). */
  row(l: BoardLine) {
    const k = this.lines.findIndex((o) => o.text === l.text && o.bg === l.bg && o.fg === l.fg && o.cell === l.cell);
    if (k >= 0) return k;
    this.lines.push(l);
    return this.lines.length - 1;
  }
  face(row: number, a: V3, b: V3, c: V3, d: V3, u0 = 0, u1 = 1) {
    this.pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, a.x, a.y, a.z, c.x, c.y, c.z, d.x, d.y, d.z);
    const cell = this.lines[row].cell ?? 1;
    u0 *= cell;
    u1 *= cell;
    // v holds the row edges for now; build() turns them into texture coordinates
    this.uvs.push(u0, row + 1, u1, row + 1, u1, row, u0, row + 1, u1, row, u0, row);
  }
  /** A board standing upright: centre, width, height, and the direction its face looks. */
  upright(row: number, x: number, y: number, z: number, w: number, h: number, fx: number, fz: number, u0 = 0, u1 = 1) {
    const l = Math.hypot(fx, fz) || 1;
    // The viewer looks along −f, so their right is (fz, −fx) (right of a heading t is (−tz, tx))
    const rx = fz / l;
    const rz = -fx / l;
    const P = (s: number, t: number) => ({ x: x + rx * s * (w / 2), y: y + t * (h / 2), z: z + rz * s * (w / 2) });
    this.face(row, P(-1, -1), P(1, -1), P(1, 1), P(-1, 1), u0, u1);
  }
  get empty() {
    return this.pos.length === 0;
  }
  build(width = 1024, rowH = 64) {
    const R = this.lines.length;
    const tex = textTexture(this.lines, width, rowH * R);
    // Row edges into v: row 0 is the canvas's top, at v = 1
    const uv = this.uvs.map((v, i) => (i % 2 ? 1 - v / R : v));
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(this.pos, 3));
    g.setAttribute("uv", new Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    g.computeBoundingSphere();
    return new Mesh(g, new MeshBasicMaterial({ map: tex, side: DoubleSide }));
  }
}

/** Tiny seeded RNG, so the city is the same on every visit. */
export function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
