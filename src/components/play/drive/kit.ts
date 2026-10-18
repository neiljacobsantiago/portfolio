import {
  BufferAttribute,
  type BufferGeometry,
  CanvasTexture,
  Color,
  type Material,
  Matrix4,
  Mesh,
  MeshLambertMaterial,
  MeshStandardMaterial,
  SRGBColorSpace,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// Small shared tools for building the circuit: the site palette, a batcher
// that bakes colour and "floodlight" into vertices and merges everything of
// one material into a single draw call, and the material patch that makes
// those vertices glow at night without a single real-time light.

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

/** The workhorse world material: vertex colours, flat shading, floodlit. */
export const worldMaterial = (extra: ConstructorParameters<typeof MeshLambertMaterial>[0] = {}) => floodlit(new MeshLambertMaterial({ vertexColors: true, flatShading: true, ...extra }));

export const std = (color: string, extra: ConstructorParameters<typeof MeshStandardMaterial>[0] = {}) => new MeshStandardMaterial({ color, roughness: 0.6, metalness: 0, ...extra });

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
 * merges it into one BufferGeometry (position, normal, color, aLit).
 */
export class Batch {
  private parts: BufferGeometry[] = [];
  constructor(private keepUv = false) {}

  /** Adds a geometry (consumed) with a transform, colour and glow. */
  add(geo: BufferGeometry, color: string | Color, lit = 0, matrix?: Matrix4) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (geo.index) geo.dispose();
    if (matrix) g.applyMatrix4(matrix);
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!this.keepUv) g.deleteAttribute("uv");
    for (const name of Object.keys(g.attributes)) if (!["position", "normal", "uv", "color", "aLit"].includes(name)) g.deleteAttribute(name);
    const n = g.attributes.position.count;
    if (!g.attributes.color) {
      const c = typeof color === "string" ? tmpColor.set(color) : color;
      const arr = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) arr.set([c.r, c.g, c.b], i * 3);
      g.setAttribute("color", new BufferAttribute(arr, 3));
    }
    if (!g.attributes.aLit) g.setAttribute("aLit", new BufferAttribute(new Float32Array(n).fill(lit), 1));
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

  build() {
    const merged = mergeGeometries(this.parts, false)!;
    for (const p of this.parts) p.dispose();
    this.parts = [];
    merged.computeBoundingSphere();
    return merged;
  }
}

/** Text painted onto a canvas texture. */
export function textTexture(lines: { text: string; bg: string; fg: string; font?: string; size?: number }[], w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  const rowH = h / lines.length;
  lines.forEach((l, i) => {
    g.fillStyle = l.bg;
    g.fillRect(0, i * rowH, w, rowH);
    g.fillStyle = l.fg;
    g.font = `${l.font ?? "700"} ${Math.round(rowH * (l.size ?? 0.56))}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(l.text, w / 2, i * rowH + rowH / 2 + 1);
  });
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Tiny seeded RNG, so the city is the same on every visit. */
export function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
