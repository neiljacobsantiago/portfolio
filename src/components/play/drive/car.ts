import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Group,
  LatheGeometry,
  type Material,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  RepeatWrapping,
  Shape,
  SphereGeometry,
  SRGBColorSpace,
  TubeGeometry,
  Vector2,
  Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { C } from "./kit";

// The car: a modern open-wheel racer, generic (no team, no brands), built
// from smooth lofted cross-sections, cambered wing profiles and lathed wheels.
//   · nose, tub, engine cover and sidepods are lofts with smooth normals; the
//     livery (main colour, trim, pinstripes) is painted onto their faces
//   · four-element front wing, rear wing with a DRS flap that really opens,
//     beam wing, diffuser, floor with edge wings, halo, mirrors, T-camera,
//     exposed wishbones and push/pull rods, a helmeted driver
//   · tyres with a rounded profile and sidewall lettering, spoked rims with a
//     centre-lock nut, brake discs that glow after hard braking
//   · one atlas per wheel; paint is clear-coated, the floor and wings carbon
// Parts are merged by material: about ten draw calls a car at any detail.
// `detail` (0.3 / 0.7 / 1) scales the tessellation and drops the smallest parts.

/** Liveries in the site palette: main colour, trim, and the accent for stripes and numbers. */
export const PAINTS = {
  ember: { name: "Ember", primary: C.ember, secondary: C.ink, accent: C.paper, metal: 0.25 },
  midnight: { name: "Midnight", primary: C.ink, secondary: C.ember, accent: C.paper, metal: 0.35 },
  wine: { name: "Wine", primary: C.wine, secondary: C.paper, accent: C.ember, metal: 0.3 },
  paper: { name: "Paper", primary: "#f4e6c8", secondary: C.ember, accent: C.ink, metal: 0.1 },
  sky: { name: "Sky", primary: C.sky, secondary: C.ink, accent: C.paper, metal: 0.25 },
  carbon: { name: "Carbon", primary: "#23272e", secondary: C.ember, accent: C.paper, metal: 0.55 },
} as const;
export type PaintId = keyof typeof PAINTS;

/** Car geometry the engine needs: wheel radius, axle positions, the onboard (T-camera) eye point. */
export const CAR = { wheelR: 0.36, frontZ: -1.8, rearZ: 1.8, eye: new Vector3(0, 1.1, 0.2) };

/** Livery slots: painted with the car's colours, or a fixed colour. */
const P = 0;
const S = 1;
const A = 2;
const F = 3;
/** The cockpit opening: always near-black. */
const DARK = 4;

/* ───────────── geometry helpers ───────────── */

/** Flips an indexed geometry inside out if its normals point inwards (judged from its centre). */
function orient(g: BufferGeometry) {
  g.computeVertexNormals();
  const p = g.attributes.position;
  const n = g.attributes.normal;
  const c = new Vector3();
  for (let i = 0; i < p.count; i++) c.x += p.getX(i) / p.count;
  for (let i = 0; i < p.count; i++) c.y += p.getY(i) / p.count;
  for (let i = 0; i < p.count; i++) c.z += p.getZ(i) / p.count;
  let s = 0;
  for (let i = 0; i < p.count; i++) s += (p.getX(i) - c.x) * n.getX(i) + (p.getY(i) - c.y) * n.getY(i) + (p.getZ(i) - c.z) * n.getZ(i);
  if (s < 0) {
    const idx = g.index!;
    for (let i = 0; i < idx.count; i += 3) {
      const b = idx.getX(i + 1);
      idx.setX(i + 1, idx.getX(i + 2));
      idx.setX(i + 2, b);
    }
    g.computeVertexNormals();
  }
  return g;
}

/** A flat fan over a closed ring of points, facing away from `away`. */
function cap(pts: Vector3[], away: Vector3) {
  const c = pts.reduce((a, p) => a.add(p), new Vector3()).divideScalar(pts.length);
  const pos: number[] = [];
  const e1 = new Vector3();
  const e2 = new Vector3();
  e1.subVectors(pts[0], c);
  e2.subVectors(pts[Math.floor(pts.length / 4)], c);
  const flip = e1.cross(e2).dot(new Vector3().subVectors(c, away)) < 0;
  for (let k = 0; k < pts.length; k++) {
    const a = pts[k];
    const b = pts[(k + 1) % pts.length];
    if (flip) pos.push(c.x, c.y, c.z, b.x, b.y, b.z, a.x, a.y, a.z);
    else pos.push(c.x, c.y, c.z, a.x, a.y, a.z, b.x, b.y, b.z);
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/** Indexed quads between rings of points (each ring closed), oriented outwards, with optional caps. */
function skin(rings: Vector3[][], caps: boolean, slotOf?: (k: number, i: number) => number) {
  const n = rings[0].length;
  const pos: number[] = [];
  for (const r of rings) for (const p of r) pos.push(p.x, p.y, p.z);
  const idx: number[] = [];
  for (let i = 0; i < rings.length - 1; i++)
    for (let k = 0; k < n; k++) {
      const k2 = (k + 1) % n;
      const a = i * n + k;
      const b = i * n + k2;
      const c = (i + 1) * n + k2;
      const d = (i + 1) * n + k;
      idx.push(a, b, c, a, c, d);
    }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  orient(g);
  const flat = g.toNonIndexed();
  if (slotOf) {
    // A slot per quad (both its triangles), from the quad's ring position k and section i
    const slots = new Float32Array(flat.attributes.position.count);
    let t = 0;
    for (let i = 0; i < rings.length - 1; i++)
      for (let k = 0; k < n; k++) {
        const s = slotOf(k, i);
        slots.fill(s, t, t + 6);
        t += 6;
      }
    flat.setAttribute("slot", new BufferAttribute(slots, 1));
  }
  if (!caps) return flat;
  const centre = rings[Math.floor(rings.length / 2)].reduce((a, p) => a.add(p), new Vector3()).divideScalar(n);
  const parts = [flat, cap(rings[0], centre), cap(rings[rings.length - 1], centre)];
  if (slotOf) {
    for (const [j, ci] of [
      [1, 0],
      [2, rings.length - 2],
    ] as const) {
      const cnt = parts[j].attributes.position.count;
      parts[j].setAttribute("slot", new BufferAttribute(new Float32Array(cnt).fill(slotOf(0, ci)), 1));
    }
  }
  return mergeGeometries(parts, false)!;
}

interface Section {
  z: number;
  /** Centre x (sidepods sit off-centre). */
  cx?: number;
  /** Half width at the bottom. */
  w: number;
  y0: number;
  y1: number;
  /** Width at the top relative to the bottom: < 1 tapers like a nose, > 1 undercuts like a sidepod. */
  top?: number;
  /** Superellipse exponent: 2 is an ellipse, higher is boxier. */
  p?: number;
}

/** Catmull-Rom between section parameters, `sub` steps per span. */
function resample(sections: Section[], sub: number): Section[] {
  if (sub <= 1) return sections;
  const keys = ["z", "cx", "w", "y0", "y1", "top", "p"] as const;
  const get = (i: number) => sections[Math.max(0, Math.min(sections.length - 1, i))];
  const out: Section[] = [];
  for (let i = 0; i < sections.length - 1; i++)
    for (let s = 0; s < sub; s++) {
      const t = s / sub;
      const t2 = t * t;
      const t3 = t2 * t;
      const o: Record<string, number> = {};
      for (const k of keys) {
        const p0 = get(i - 1)[k] ?? (k === "top" ? 1 : k === "p" ? 2.6 : 0);
        const p1 = get(i)[k] ?? (k === "top" ? 1 : k === "p" ? 2.6 : 0);
        const p2 = get(i + 1)[k] ?? (k === "top" ? 1 : k === "p" ? 2.6 : 0);
        const p3 = get(i + 2)[k] ?? (k === "top" ? 1 : k === "p" ? 2.6 : 0);
        o[k] = 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
      }
      out.push(o as unknown as Section);
    }
  out.push(sections[sections.length - 1]);
  return out;
}

/** A superellipse ring; angle 0 is the outboard side at mid height, π/2 the top. */
function ring(s: Section, n: number, mirror: number) {
  const p = s.p ?? 2.6;
  const cy = (s.y0 + s.y1) / 2;
  const h = (s.y1 - s.y0) / 2;
  const pts: Vector3[] = [];
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    const c = Math.cos(a);
    const sn = Math.sin(a);
    const y = cy + h * Math.sign(sn) * Math.pow(Math.abs(sn), 2 / p);
    const t = (y - s.y0) / (s.y1 - s.y0 || 1);
    const w = s.w * (1 + ((s.top ?? 1) - 1) * t);
    pts.push(new Vector3(((s.cx ?? 0) + w * Math.sign(c) * Math.pow(Math.abs(c), 2 / p)) * mirror, y, s.z));
  }
  return pts;
}

/** A smooth loft through cross-sections; `slot` paints each face from its angle (0…2π, 0 outboard) and z. */
function loft(sections: Section[], o: { n: number; sub: number; mirror?: number; caps?: boolean; slot?: (a: number, z: number, x: number, y: number) => number }) {
  const secs = resample(sections, o.sub);
  const rings = secs.map((s) => ring(s, o.n, o.mirror ?? 1));
  const slot = o.slot;
  if (!slot) return skin(rings, o.caps ?? true);
  return skin(rings, o.caps ?? true, (k, i) => {
    const k2 = (k + 1) % o.n;
    const i2 = Math.min(i + 1, rings.length - 1);
    const x = (rings[i][k].x + rings[i][k2].x + rings[i2][k].x + rings[i2][k2].x) / 4;
    const y = (rings[i][k].y + rings[i][k2].y + rings[i2][k].y + rings[i2][k2].y) / 4;
    return slot(((k + 0.5) / o.n) * Math.PI * 2, (secs[i].z + secs[i2].z) / 2, x, y);
  });
}

/** A cambered profile (chord 0…1 along u, v up), as a closed loop of points. */
function profile(n: number, thick: number, camber: number): [number, number][] {
  const yt = (u: number) => 5 * thick * (0.2969 * Math.sqrt(u) - 0.126 * u - 0.3516 * u * u + 0.2843 * u ** 3 - 0.1036 * u ** 4);
  const yc = (u: number) => camber * 4 * u * (1 - u);
  const out: [number, number][] = [];
  for (let i = n; i >= 0; i--) {
    const u = (1 - Math.cos((Math.PI * i) / n)) / 2;
    out.push([u, yc(u) + yt(u)]);
  }
  for (let i = 1; i < n; i++) {
    const u = (1 - Math.cos((Math.PI * i) / n)) / 2;
    out.push([u, yc(u) - yt(u)]);
  }
  return out;
}

interface Station {
  x: number;
  y: number;
  /** Leading edge, forward is -z. */
  z: number;
  chord: number;
  /** Trailing edge up, rad. */
  pitch: number;
}

/** A wing element through spanwise stations (smooth, capped at the tips). */
function wing(stations: Station[], prof: [number, number][]) {
  const rings = stations.map((s) =>
    prof.map(([u, v]) => {
      const sp = Math.sin(s.pitch);
      const cp = Math.cos(s.pitch);
      return new Vector3(s.x, s.y + s.chord * (u * sp + v * cp), s.z + s.chord * (u * cp - v * sp));
    }),
  );
  return skin(rings, true);
}

/** Stations along a span from x0 to x1, with height, chord, pitch and sweep as functions of the span fraction. */
function span(x0: number, x1: number, n: number, f: (t: number) => { y: number; z: number; chord: number; pitch: number }): Station[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    return { x: x0 + (x1 - x0) * t, ...f(t) };
  });
}

const m4 = (x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => {
  const m = new Matrix4().makeRotationY(ry).multiply(new Matrix4().makeRotationX(rx)).multiply(new Matrix4().makeRotationZ(rz));
  m.scale(new Vector3(sx, sy, sz));
  return m.setPosition(x, y, z);
};

/** A flat plate from a side-view outline (shape x is the car's z, shape y is height), `t` thick, at x. */
function plate(pts: [number, number][], t: number, x: number, curve = 6) {
  const s = new Shape();
  s.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
  s.closePath();
  const g = new ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: curve });
  // Shape (x, y) → car (z, y); extrusion along -x, centred on x
  g.applyMatrix4(new Matrix4().makeRotationY(-Math.PI / 2));
  g.translate(x + t / 2, 0, 0);
  return g;
}

/** An aerodynamic (elliptical) strut between two points. */
function strut(a: Vector3, b: Vector3, r: number, seg: number, flat = 0.45) {
  const d = new Vector3().subVectors(b, a);
  const len = d.length();
  d.normalize();
  const g = new CylinderGeometry(1, 1, len, seg, 1, true);
  g.scale(r, 1, r * flat);
  g.translate(0, len / 2, 0);
  const up = Math.abs(d.y) > 0.95 ? new Vector3(0, 0, 1) : new Vector3(0, 1, 0);
  const p1 = new Vector3().crossVectors(up, d).normalize();
  const p2 = new Vector3().crossVectors(p1, d).normalize();
  // Wide along the horizontal (into the airflow), thin vertically
  g.applyMatrix4(new Matrix4().makeBasis(p2, d, p1));
  g.translate(a.x, a.y, a.z);
  return g;
}

/** Box-projected UVs (per face, along its main axis), for the carbon weave. */
function boxUv(g: BufferGeometry, scale: number) {
  const p = g.attributes.position;
  const uv = new Float32Array(p.count * 2);
  const a = new Vector3();
  const b = new Vector3();
  const c = new Vector3();
  for (let i = 0; i + 2 < p.count; i += 3) {
    a.fromBufferAttribute(p, i);
    b.fromBufferAttribute(p, i + 1);
    c.fromBufferAttribute(p, i + 2);
    const n = b.clone().sub(a).cross(c.clone().sub(a));
    const ax = Math.abs(n.x) > Math.abs(n.y) && Math.abs(n.x) > Math.abs(n.z) ? 0 : Math.abs(n.y) > Math.abs(n.z) ? 1 : 2;
    for (let j = 0; j < 3; j++) {
      const x = p.getX(i + j);
      const y = p.getY(i + j);
      const z = p.getZ(i + j);
      uv[(i + j) * 2] = (ax === 0 ? z : x) / scale;
      uv[(i + j) * 2 + 1] = (ax === 1 ? z : y) / scale;
    }
  }
  g.setAttribute("uv", new BufferAttribute(uv, 2));
}

/**
 * Collects parts for one material: each with a colour and a livery slot,
 * merged into one geometry. Painted parts can be recoloured later.
 */
class Parts {
  private list: BufferGeometry[] = [];
  constructor(private uv: "none" | "box" | "keep" = "none") {}
  add(g: BufferGeometry, color: string, slot = F, m?: Matrix4) {
    const ng = g.index ? g.toNonIndexed() : g.clone();
    g.dispose();
    if (!ng.attributes.normal) ng.computeVertexNormals();
    if (m) ng.applyMatrix4(m);
    const n = ng.attributes.position.count;
    if (!ng.attributes.slot) ng.setAttribute("slot", new BufferAttribute(new Float32Array(n).fill(slot), 1));
    const c = new Color(color);
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
    ng.setAttribute("color", new BufferAttribute(col, 3));
    if (this.uv === "box") boxUv(ng, 0.14);
    else if (this.uv === "none") ng.deleteAttribute("uv");
    else if (!ng.attributes.uv) ng.setAttribute("uv", new BufferAttribute(new Float32Array(n * 2), 2));
    for (const k of Object.keys(ng.attributes)) if (!["position", "normal", "uv", "color", "slot"].includes(k)) ng.deleteAttribute(k);
    ng.morphAttributes = {};
    ng.clearGroups();
    this.list.push(ng);
    return this;
  }
  /** The merged geometry, its per-vertex slots and fixed colours (kept for repainting). */
  build() {
    const g = mergeGeometries(this.list, false)!;
    for (const p of this.list) p.dispose();
    this.list = [];
    const slots = (g.attributes.slot as BufferAttribute).array as Float32Array;
    g.deleteAttribute("slot");
    const base = ((g.attributes.color as BufferAttribute).array as Float32Array).slice();
    g.computeBoundingSphere();
    return { geometry: g, slots, base };
  }
}

/** Positions only, for the ghost. */
const positionsOnly = (g: BufferGeometry) => {
  const o = new BufferGeometry();
  o.setAttribute("position", g.attributes.position.clone());
  return o;
};

/* ───────────── textures ───────────── */

const canvas = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!] as const;
};

/** A 2×2 twill carbon weave. */
function carbonTexture() {
  const [c, g] = canvas(128, 128);
  const n = 8;
  const s = 128 / n;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const vertical = Math.floor((i + j) / 2) % 2 === 0;
      const grad = vertical ? g.createLinearGradient(i * s, 0, i * s + s, 0) : g.createLinearGradient(0, j * s, 0, j * s + s);
      grad.addColorStop(0, "#0c0d10");
      grad.addColorStop(0.5, "#2b2f36");
      grad.addColorStop(1, "#0c0d10");
      g.fillStyle = grad;
      g.fillRect(i * s, j * s, s, s);
    }
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/**
 * The wheel atlas (1024×512): the outer sidewall with its lettering and
 * compound band (rows 0–199), the tread (200–299), the inner sidewall
 * (300–399), and flat blocks for the rim (white, tinted by vertex colour)
 * and the brake disc. Companion maps carry roughness/metalness and the
 * disc's glow. `blur` smears the sidewall round the wheel, for speed.
 */
const ATLAS = { rim: [0.06, 0.1] as [number, number], disc: [0.19, 0.1] as [number, number], matte: [0.31, 0.1] as [number, number] };
const row = (px: number) => 1 - px / 512;
function wheelMaps(blur: boolean) {
  // Twice as wide for the sharp map: round the wheel a texel covers about twice the sidewall's height
  const W = blur ? 1024 : 2048;
  const k = W / 1024;
  const [c, g] = canvas(W, 512);
  g.fillStyle = "#17181b";
  g.fillRect(0, 0, W, 512);
  // Outer sidewall: subtle radial shading, the compound band and the lettering, three times round
  const sg = g.createLinearGradient(0, 0, 0, 200);
  sg.addColorStop(0, "#101113");
  sg.addColorStop(0.55, "#1c1d20");
  sg.addColorStop(1, "#131416");
  g.fillStyle = sg;
  g.fillRect(0, 0, W, 200);
  g.fillStyle = C.ember;
  g.fillRect(0, 138, W, 12);
  g.fillStyle = "#e9e3d4";
  g.textAlign = "center";
  g.textBaseline = "middle";
  const text = (s: string, font: string, x: number, y: number) => {
    // Squeezed round the wheel so the letters come out square on the sidewall
    g.save();
    g.translate(x, y);
    g.scale(0.5 * k, 1);
    g.font = font;
    g.fillText(s, 0, 0);
    g.restore();
  };
  for (let r = 0; r < 3; r++) {
    const x0 = (r * W) / 3;
    text("BAY STREET", "900 64px Arial, Helvetica, sans-serif", x0 + 150 * k, 78);
    text("SOFT", "700 44px Arial, Helvetica, sans-serif", x0 + 290 * k, 78);
    g.fillRect(x0 + 252 * k, 75, 12 * k, 5);
    g.fillRect(x0 + 316 * k, 75, 12 * k, 5);
  }
  // Tread: slick, grained, with a darker scrubbed band
  g.fillStyle = "#1a1b1e";
  g.fillRect(0, 200, W, 100);
  let seed = 3;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  for (let i = 0; i < 2600 * k; i++) {
    g.fillStyle = rnd() < 0.5 ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.12)";
    g.fillRect(rnd() * W, 200 + rnd() * 100, (2 + rnd() * 10) * k, 1 + rnd() * 2);
  }
  g.fillStyle = "rgba(0,0,0,0.18)";
  g.fillRect(0, 232, W, 36);
  // Inner sidewall
  g.fillStyle = "#151619";
  g.fillRect(0, 300, W, 100);
  // Blocks: rim (tinted by vertex colour), brake disc, matte
  g.fillStyle = "#ffffff";
  g.fillRect(0, 400, 128 * k, 112);
  g.fillStyle = "#4a4643";
  g.fillRect(128 * k, 400, 128 * k, 112);
  g.fillStyle = "#ffffff";
  g.fillRect(256 * k, 400, 128 * k, 112);
  if (blur) {
    // Smear the sidewall round the wheel
    const [c2, g2] = canvas(W, 512);
    g2.drawImage(c, 0, 0);
    g.globalAlpha = 0.14;
    for (let s = 1; s <= 12; s++) {
      g.drawImage(c2, 0, 0, W, 300, s * 7, 0, W, 300);
      g.drawImage(c2, 0, 0, W, 300, s * 7 - W, 0, W, 300);
    }
    g.globalAlpha = 1;
  }
  const map = new CanvasTexture(c);
  map.colorSpace = SRGBColorSpace;
  map.anisotropy = 8;
  map.wrapS = RepeatWrapping;
  return map;
}
function wheelSurface() {
  // Roughness in green, metalness in blue
  const [c, g] = canvas(64, 32);
  g.fillStyle = "rgb(0, 222, 0)";
  g.fillRect(0, 0, 64, 32);
  const block = (u: number, r: number, m: number) => {
    g.fillStyle = `rgb(0, ${Math.round(r * 255)}, ${Math.round(m * 255)})`;
    g.fillRect(u * 64, 25, 8, 7);
  };
  block(0, 0.32, 0.85);
  block(0.125, 0.5, 0.5);
  block(0.25, 0.75, 0);
  const t = new CanvasTexture(c);
  const [ce, ge] = canvas(64, 32);
  ge.fillStyle = "#000";
  ge.fillRect(0, 0, 64, 32);
  ge.fillStyle = "#fff";
  ge.fillRect(8, 25, 8, 7);
  const e = new CanvasTexture(ce);
  e.colorSpace = SRGBColorSpace;
  return { surface: t, glow: e };
}

/** White race number and initials on transparent: tinted by the material to the livery's accent. */
function decalTexture() {
  const [c, g] = canvas(256, 128);
  g.fillStyle = "#fff";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = "italic 900 96px Arial, Helvetica, sans-serif";
  g.fillText("26", 64, 68);
  g.font = "italic 900 58px Arial, Helvetica, sans-serif";
  g.fillText("NJS", 192, 68);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Textures every car shares (the player's and the remote cars'): made once. */
let shared: { sharp: CanvasTexture; blur: CanvasTexture; surface: CanvasTexture; glow: CanvasTexture; carbon: CanvasTexture; decal: CanvasTexture } | null = null;
function textures() {
  if (!shared) {
    const { surface, glow } = wheelSurface();
    shared = { sharp: wheelMaps(false), blur: wheelMaps(true), surface, glow, carbon: carbonTexture(), decal: decalTexture() };
  }
  return shared;
}

/** A flat quad with UVs from a region of the decal texture. */
function decal(w: number, h: number, u0: number, u1: number) {
  const g = new PlaneGeometry(w, h);
  const uv = g.attributes.uv as BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setX(i, u0 + (u1 - u0) * uv.getX(i));
  return g;
}

/* ───────────── the car ───────────── */

export function buildCar(opts: { shadows: boolean; detail: number }) {
  const D = opts.detail;
  const hi = D >= 0.95;
  const mid = D >= 0.6;
  /** Tessellation: ring points round a loft, sub-steps between sections, wing stations and profile points. */
  const RING = hi ? 28 : mid ? 20 : 12;
  const SUB = hi ? 3 : mid ? 2 : 1;
  const ST = hi ? 8 : mid ? 5 : 2;
  const PROF = profile(hi ? 9 : mid ? 6 : 4, 0.09, -0.05);
  const THIN = profile(hi ? 7 : mid ? 5 : 3, 0.07, -0.06);
  const ROD = hi ? 8 : 5;

  const car = new Group(); // follows the track: position and heading
  const body = new Group(); // pitches under braking, rolls in corners, drops with downforce
  car.add(body);

  const livery = new Parts(); // clear-coated paint, recoloured per livery (and helmet, visor, mirror glass)
  const carbon = new Parts("box"); // floor, wings, diffuser, wishbones
  const metal = new Parts(); // halo titanium, rods' ends, cockpit, exhaust: satin
  const W = "#ffffff";

  /* Nose, tub and the low engine cover: tip to gearbox. An accent pinstripe
     runs along the top of the nose, the nose tip is in the trim colour, and
     the cockpit opening is a dark patch with a padded rim round its edge. */
  const tub: Section[] = [
    { z: -2.93, w: 0.035, y0: 0.205, y1: 0.255, top: 0.85, p: 2 },
    { z: -2.82, w: 0.07, y0: 0.185, y1: 0.29, top: 0.85, p: 2.3 },
    { z: -2.6, w: 0.1, y0: 0.165, y1: 0.33, top: 0.8, p: 2.5 },
    { z: -2.25, w: 0.125, y0: 0.15, y1: 0.38, top: 0.78 },
    { z: -1.85, w: 0.15, y0: 0.14, y1: 0.44, top: 0.76 },
    { z: -1.45, w: 0.18, y0: 0.13, y1: 0.5, top: 0.74 },
    { z: -1.05, w: 0.22, y0: 0.11, y1: 0.56, top: 0.74, p: 2.8 },
    { z: -0.7, w: 0.26, y0: 0.09, y1: 0.61, top: 0.76, p: 3.1 },
    { z: -0.25, w: 0.3, y0: 0.08, y1: 0.63, top: 0.8, p: 3.4 },
    { z: 0.25, w: 0.32, y0: 0.08, y1: 0.65, top: 0.76, p: 3.2 },
    { z: 0.8, w: 0.28, y0: 0.08, y1: 0.63, top: 0.68, p: 3 },
    { z: 1.35, w: 0.2, y0: 0.1, y1: 0.56, top: 0.66 },
    { z: 1.85, w: 0.13, y0: 0.14, y1: 0.47, top: 0.66 },
    { z: 2.25, w: 0.085, y0: 0.19, y1: 0.4, top: 0.7 },
    { z: 2.5, w: 0.06, y0: 0.23, y1: 0.36, top: 0.75 },
  ];
  // The cockpit opening, in the loft's own grid: ring points either side of the top, sections between two z
  const tubSecs = resample(tub, SUB);
  const topK = RING / 4;
  const ckM = Math.max(1, Math.round(RING / 9));
  let ck0 = tubSecs.findIndex((s) => s.z >= -0.66);
  let ck1 = tubSecs.length - 1 - [...tubSecs].reverse().findIndex((s) => s.z <= 0.17);
  if (ck1 <= ck0) [ck0, ck1] = [ck0, ck0 + 1];
  const zA = tubSecs[ck0].z;
  const zB = tubSecs[ck1].z;
  const up = (a: number) => Math.sin(a);
  livery.add(
    loft(tub, {
      n: RING,
      sub: SUB,
      slot: (a, z) => {
        const k = Math.round((a / (Math.PI * 2)) * RING - 0.5);
        if (z > zA && z < zB && k >= topK - ckM && k < topK + ckM) return DARK;
        return z < -2.62 ? S : z < -0.9 && Math.abs(a - Math.PI / 2) < 0.2 ? A : up(a) < -0.55 ? S : P;
      },
    }),
    W,
  );
  {
    // The padded rim, traced round the dark patch's edge
    const pts: Vector3[] = [];
    const at = (i: number, k: number) => ring(tubSecs[i], RING, 1)[k].clone().add(new Vector3(0, 0.012, 0));
    for (let i = ck0; i <= ck1; i++) pts.push(at(i, topK - ckM));
    for (let k = topK - ckM + 1; k < topK + ckM; k++) pts.push(at(ck1, k));
    for (let i = ck1; i >= ck0; i--) pts.push(at(i, topK + ckM));
    for (let k = topK + ckM - 1; k > topK - ckM; k--) pts.push(at(ck0, k));
    livery.add(new TubeGeometry(new CatmullRomCurve3(pts, true, "centripetal"), hi ? 64 : mid ? 36 : 18, 0.02, hi ? 8 : 5, true), "#17181b");
  }

  // Airbox and engine cover, flaring into the tub behind the driver; a pinstripe down the spine
  const cover: Section[] = [
    { z: 0.15, w: 0.17, y0: 0.6, y1: 0.99, top: 0.45, p: 2.3 },
    { z: 0.38, w: 0.2, y0: 0.58, y1: 1.0, top: 0.42 },
    { z: 0.8, w: 0.21, y0: 0.56, y1: 0.93, top: 0.4 },
    { z: 1.3, w: 0.19, y0: 0.53, y1: 0.8, top: 0.4 },
    { z: 1.8, w: 0.13, y0: 0.48, y1: 0.66, top: 0.45 },
    { z: 2.2, w: 0.07, y0: 0.41, y1: 0.53, top: 0.55 },
    { z: 2.45, w: 0.04, y0: 0.37, y1: 0.45, top: 0.7 },
  ];
  livery.add(loft(cover, { n: RING, sub: SUB, slot: (a) => (Math.abs(a - Math.PI / 2) < 0.16 ? A : P) }), W);
  // Airbox intake (dark), and the T-camera on top in the trim colour
  livery.add(
    loft(
      [
        { z: 0.14, w: 0.07, y0: 0.81, y1: 0.97, top: 0.7, p: 2.4 },
        { z: 0.165, w: 0.07, y0: 0.81, y1: 0.97, top: 0.7, p: 2.4 },
      ],
      { n: RING, sub: 1 },
    ),
    "#050607",
  );
  livery.add(
    loft(
      [
        { z: 0.24, w: 0.03, y0: 1.0, y1: 1.05, p: 3 },
        { z: 0.3, w: 0.045, y0: 0.995, y1: 1.065, p: 3 },
        { z: 0.42, w: 0.04, y0: 0.99, y1: 1.05, p: 3 },
      ],
      { n: Math.max(8, RING / 2), sub: 1 },
    ),
    W,
    S,
  );

  // A low shark fin down the engine cover to the rear wing
  livery.add(
    plate(
      [
        [0.8, 0.95],
        [1.3, 0.77],
        [1.8, 0.63],
        [2.32, 0.5],
        [2.32, 0.76],
        [2.25, 0.81],
        [1.6, 0.9],
        [0.8, 1.01],
      ],
      0.012,
      0,
    ),
    W,
    P,
  );

  // Sidepods: a letterbox inlet, a deep undercut below, a downwash ramp behind;
  // lower flanks in the trim colour with a pinstripe
  const pod: Section[] = [
    { z: -0.64, cx: 0.5, w: 0.15, y0: 0.36, y1: 0.5, top: 1.15, p: 4.5 },
    { z: -0.52, cx: 0.52, w: 0.18, y0: 0.29, y1: 0.53, top: 1.25, p: 4 },
    { z: -0.25, cx: 0.52, w: 0.16, y0: 0.17, y1: 0.54, top: 1.55, p: 3.8 },
    { z: 0.2, cx: 0.51, w: 0.15, y0: 0.11, y1: 0.52, top: 1.6, p: 3.6 },
    { z: 0.7, cx: 0.47, w: 0.15, y0: 0.1, y1: 0.46, top: 1.4, p: 3.2 },
    { z: 1.2, cx: 0.4, w: 0.13, y0: 0.1, y1: 0.38, top: 1.2, p: 2.8 },
    { z: 1.65, cx: 0.3, w: 0.1, y0: 0.11, y1: 0.3, top: 1, p: 2.4 },
    { z: 2.0, cx: 0.2, w: 0.06, y0: 0.13, y1: 0.24, top: 1, p: 2.2 },
  ];
  for (const sx of [1, -1]) {
    livery.add(loft(pod, { n: RING, sub: SUB, mirror: sx, slot: (a) => (up(a) < -0.3 ? S : up(a) < -0.1 ? A : P) }), W);
    // The inlet: a dark mouth just inside the front
    livery.add(
      loft(
        [
          { z: -0.646, cx: 0.5, w: 0.13, y0: 0.372, y1: 0.49, top: 1.15, p: 4.5 },
          { z: -0.62, cx: 0.5, w: 0.13, y0: 0.372, y1: 0.49, top: 1.15, p: 4.5 },
        ],
        { n: RING, sub: 1, mirror: sx },
      ),
      "#050607",
    );
  }

  // The steering wheel and its display
  if (mid) {
    metal.add(new CylinderGeometry(0.1, 0.1, 0.025, 12, 1).scale(1, 1, 0.55), "#16181c", F, m4(0, 0.6, -0.42, -1.1));
    metal.add(new PlaneGeometry(0.07, 0.035), "#1c6f62", F, m4(0, 0.612, -0.405, -0.47));
  }

  // Driver: helmet in the accent colour with a cap of the main colour, a dark visor
  const hs = hi ? 22 : mid ? 14 : 9;
  const helmet = new SphereGeometry(0.128, hs, Math.round(hs * 0.7));
  helmet.scale(1, 0.98, 1.12);
  livery.add(helmet, W, A, m4(0, 0.76, -0.02));
  const crown = new SphereGeometry(0.1305, hs, 3, 0, Math.PI * 2, 0, Math.PI * 0.26);
  crown.scale(1, 0.98, 1.12);
  livery.add(crown, W, P, m4(0, 0.76, -0.02));
  const visor = new SphereGeometry(0.131, hs, 4, Math.PI * 1.13, Math.PI * 0.74, Math.PI * 0.36, Math.PI * 0.17);
  visor.scale(1, 0.98, 1.12);
  livery.add(visor, "#10161d", F, m4(0, 0.76, -0.02));

  // Halo: a hoop on two rear mounts, the centre pillar in front, in the trim colour
  const haloCurve = new CatmullRomCurve3([
    new Vector3(-0.3, 0.6, 0.3),
    new Vector3(-0.34, 0.78, 0.12),
    new Vector3(-0.32, 0.86, -0.12),
    new Vector3(-0.21, 0.885, -0.36),
    new Vector3(0, 0.89, -0.46),
    new Vector3(0.21, 0.885, -0.36),
    new Vector3(0.32, 0.86, -0.12),
    new Vector3(0.34, 0.78, 0.12),
    new Vector3(0.3, 0.6, 0.3),
  ]);
  livery.add(new TubeGeometry(haloCurve, hi ? 56 : mid ? 32 : 16, 0.033, hi ? 10 : 6, false), W, S);
  livery.add(new TubeGeometry(new CatmullRomCurve3([new Vector3(0, 0.885, -0.45), new Vector3(0, 0.82, -0.6), new Vector3(0, 0.62, -0.8)]), hi ? 10 : 5, 0.034, hi ? 10 : 6, false), W, S);

  // Mirrors: slim aero housings on stalks off the sidepods, glass facing back
  for (const sx of [1, -1]) {
    const mz = -0.46;
    livery.add(
      loft(
        [
          { z: mz - 0.05, cx: 0.52, w: 0.07, y0: 0.737, y1: 0.75, p: 2.2 },
          { z: mz - 0.02, cx: 0.52, w: 0.1, y0: 0.722, y1: 0.765, p: 3 },
          { z: mz + 0.02, cx: 0.52, w: 0.1, y0: 0.72, y1: 0.768, p: 4 },
        ],
        { n: Math.max(8, RING / 2), sub: 1, mirror: sx },
      ),
      W,
      S,
    );
    livery.add(new PlaneGeometry(0.19, 0.04), "#2a3a48", F, m4(sx * 0.52, 0.744, mz + 0.021));
    carbon.add(strut(new Vector3(sx * 0.49, 0.53, mz + 0.01), new Vector3(sx * 0.51, 0.725, mz), 0.012, ROD), C.carbon);
  }

  /* ───── Floor, edge wings, diffuser ───── */
  const fs = new Shape();
  const outline: [number, number][] = [
    [0.28, -1.25],
    [0.62, -0.88],
    [0.82, -0.5],
    [0.86, 0.6],
    [0.8, 1.05],
    [0.58, 1.38],
    [0.54, 2.42],
  ];
  fs.moveTo(-outline[0][0], outline[0][1]);
  for (const [x, z] of outline) fs.lineTo(x, z);
  for (const [x, z] of [...outline].reverse()) fs.lineTo(-x, z);
  const floor = new ExtrudeGeometry(fs, { depth: 0.02, bevelEnabled: false, curveSegments: 2 });
  floor.rotateX(Math.PI / 2);
  floor.translate(0, 0.08, 0);
  carbon.add(floor, "#6d7177");
  // The floor's edge wing, curling up along each side
  for (const sx of [1, -1]) {
    const edge = wing(
      span(-0.55, 0.45, ST, (t) => ({ y: 0.105 + 0.02 * Math.sin(t * Math.PI), z: 0, chord: 0.1, pitch: 0.55 })),
      THIN,
    );
    carbon.add(edge, "#ffffff", F, m4(sx * 0.88, 0, 0, 0, sx * -Math.PI / 2));
  }
  // Diffuser: a ramp up to the rear crash structure, side walls and strakes
  carbon.add(plate([[1.7, 0.08], [2.48, 0.32], [2.48, 0.335], [1.7, 0.095]], 1.04, 0), "#ffffff");
  for (const sx of [1, -1]) carbon.add(plate([[1.55, 0.08], [2.48, 0.08], [2.48, 0.3], [2.1, 0.19]], 0.012, sx * 0.53), "#ffffff");
  if (mid)
    for (const x of [-0.34, -0.12, 0.12, 0.34]) carbon.add(plate([[1.95, 0.09], [2.47, 0.1], [2.47, 0.27], [1.95, 0.11]], 0.008, x), "#ffffff");
  // The plank under the car (it sparks over bumps)
  metal.add(new PlaneGeometry(0.3, 2.6).rotateX(Math.PI / 2), "#6b6f76", F, m4(0, 0.059, 0.3));

  /* ───── Front wing: carbon main plane, three flaps in the trim colour, endplates ───── */
  carbon.add(
    wing(
      span(-0.93, 0.93, ST * 2, (t) => {
        const c = Math.abs(t - 0.5) * 2; // 0 at the nose, 1 at the tips
        return { y: 0.075 + 0.105 * Math.max(0, 1 - c / 0.26) ** 2, z: -3.04 + 0.03 * c, chord: 0.3 - 0.04 * c, pitch: 0.06 };
      }),
      PROF,
    ),
    "#ffffff",
  );
  for (const sx of [1, -1])
    for (let k = 1; k <= (hi ? 3 : 2); k++) {
      const el = wing(
        span(sx * 0.13, sx * 0.93, ST, (t) => ({
          y: 0.09 + k * 0.045 + 0.07 * (1 - t) ** 3,
          z: -3.04 + 0.2 + k * 0.08 + 0.04 * t,
          chord: 0.17 - k * 0.022,
          pitch: 0.25 + k * 0.18,
        })),
        THIN,
      );
      livery.add(el, W, S);
    }
  for (const sx of [1, -1]) {
    livery.add(
      plate(
        [
          [-3.1, 0.05],
          [-2.62, 0.05],
          [-2.56, 0.12],
          [-2.62, 0.31],
          [-2.86, 0.33],
          [-3.04, 0.26],
          [-3.1, 0.15],
        ],
        0.016,
        sx * 0.94,
      ),
      W,
      P,
    );
    livery.add(plate([[-3.04, 0.26], [-2.86, 0.33], [-2.62, 0.31], [-2.62, 0.335], [-2.86, 0.355], [-3.05, 0.28]], 0.018, sx * 0.94), W, A);
  }

  /* ───── Rear wing: endplates, carbon main plane, beam wing, swan neck, crash structure ───── */
  for (const sx of [1, -1]) {
    livery.add(
      plate(
        [
          [2.14, 0.42],
          [2.8, 0.42],
          [2.8, 1.02],
          [2.6, 1.07],
          [2.3, 1.03],
          [2.16, 0.92],
          [2.2, 0.62],
        ],
        0.02,
        sx * 0.52,
      ),
      W,
      S,
    );
    livery.add(plate([[2.6, 1.07], [2.8, 1.02], [2.8, 1.045], [2.6, 1.095], [2.3, 1.055], [2.3, 1.03]], 0.022, sx * 0.52), W, A);
  }
  carbon.add(
    wing(
      span(-0.51, 0.51, ST, (t) => ({ y: 0.8 + 0.04 * (2 * t - 1) ** 2, z: 2.2, chord: 0.32, pitch: 0.14 })),
      PROF,
    ),
    "#ffffff",
  );
  if (mid) {
    carbon.add(wing(span(-0.46, 0.46, ST, () => ({ y: 0.47, z: 2.25, chord: 0.15, pitch: 0.18 })), THIN), "#ffffff");
    carbon.add(wing(span(-0.46, 0.46, ST, () => ({ y: 0.53, z: 2.42, chord: 0.12, pitch: 0.5 })), THIN), "#ffffff");
  }
  for (const sx of [1, -1]) carbon.add(plate([[2.28, 0.36], [2.44, 0.36], [2.4, 0.84], [2.3, 0.86], [2.34, 0.6]], 0.016, sx * 0.075), "#ffffff");
  carbon.add(
    loft(
      [
        { z: 2.3, w: 0.08, y0: 0.22, y1: 0.4, p: 3 },
        { z: 2.62, w: 0.06, y0: 0.25, y1: 0.37, p: 3 },
      ],
      { n: Math.max(8, RING / 2), sub: 1 },
    ),
    "#ffffff",
  );
  // Exhaust: one tailpipe above the crash structure
  metal.add(new CylinderGeometry(0.046, 0.04, 0.2, hi ? 16 : 8, 1, true).rotateX(Math.PI / 2), "#4a4540", F, m4(0, 0.415, 2.53));
  metal.add(new CylinderGeometry(0.04, 0.04, 0.005, hi ? 16 : 8).rotateX(Math.PI / 2), "#120d0a", F, m4(0, 0.415, 2.6));

  /* ───── Suspension: wishbones, push rods at the front, pull rods at the rear ───── */
  const rod = (a: [number, number, number], b: [number, number, number], r = 0.016) => carbon.add(strut(new Vector3(...a), new Vector3(...b), r, ROD), "#ffffff");
  for (const sx of [1, -1]) {
    const fz = CAR.frontZ;
    const rz = CAR.rearZ;
    // Front: upper and lower wishbones, push rod, track rod
    rod([sx * 0.17, 0.48, fz - 0.2], [sx * 0.63, 0.5, fz]);
    rod([sx * 0.19, 0.47, fz + 0.28], [sx * 0.63, 0.5, fz]);
    rod([sx * 0.15, 0.24, fz - 0.26], [sx * 0.66, 0.2, fz]);
    rod([sx * 0.17, 0.22, fz + 0.3], [sx * 0.66, 0.2, fz]);
    rod([sx * 0.63, 0.23, fz - 0.02], [sx * 0.16, 0.5, fz + 0.04], 0.013);
    if (mid) rod([sx * 0.16, 0.32, fz - 0.12], [sx * 0.64, 0.32, fz - 0.12], 0.01);
    // Rear: upper and lower wishbones, pull rod, toe link
    rod([sx * 0.13, 0.44, rz - 0.3], [sx * 0.6, 0.52, rz]);
    rod([sx * 0.11, 0.44, rz + 0.2], [sx * 0.6, 0.52, rz]);
    rod([sx * 0.1, 0.18, rz - 0.35], [sx * 0.62, 0.18, rz]);
    rod([sx * 0.1, 0.2, rz + 0.25], [sx * 0.62, 0.18, rz]);
    rod([sx * 0.6, 0.48, rz + 0.04], [sx * 0.13, 0.2, rz - 0.08], 0.013);
    if (mid) rod([sx * 0.12, 0.3, rz + 0.18], [sx * 0.6, 0.3, rz + 0.16], 0.01);
    // Uprights with the brake ducts, seen through the wheels
    for (const [z, x] of [
      [fz, 0.6],
      [rz, 0.56],
    ] as const)
      carbon.add(new CylinderGeometry(0.15, 0.16, 0.12, hi ? 18 : 10).rotateZ(Math.PI / 2), "#ffffff", F, m4(sx * x, CAR.wheelR, z));
  }

  /* ───── Decals: the number on the nose and the fin, initials on the rear wing endplates ───── */
  const tex = textures();
  const decalTex = tex.decal;
  const decals = new Parts("keep");
  decals.add(decal(0.15, 0.15, 0, 0.5), W, F, m4(0, 0.418, -2.05, -Math.PI / 2 - 0.15, 0, Math.PI));
  for (const sx of [1, -1]) {
    decals.add(decal(0.17, 0.17, 0, 0.5), W, F, m4(sx * 0.0085, 0.765, 1.72, 0, (sx * Math.PI) / 2));
    decals.add(decal(0.42, 0.21, 0.5, 1), W, F, m4(sx * 0.534, 0.74, 2.47, 0, (sx * Math.PI) / 2));
  }
  const decalMat = new MeshStandardMaterial({ map: decalTex, transparent: true, alphaTest: 0.4, roughness: 0.35, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });

  /* ───── Materials ───── */
  const rich = D >= 0.5;
  const paintMat = rich
    ? new MeshPhysicalMaterial({ vertexColors: true, roughness: 0.32, metalness: 0.25, clearcoat: 1, clearcoatRoughness: 0.05 })
    : new MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.25 });
  const carbonTex = tex.carbon;
  const carbonMat = rich
    ? new MeshPhysicalMaterial({ map: carbonTex, vertexColors: true, roughness: 0.5, metalness: 0.2, clearcoat: 0.45, clearcoatRoughness: 0.2 })
    : new MeshStandardMaterial({ map: carbonTex, vertexColors: true, roughness: 0.45, metalness: 0.15 });
  const metalMat = new MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.55 });

  const paintBuilt = livery.build();
  const carbonBuilt = carbon.build();
  const metalBuilt = metal.build();
  const decalBuilt = decals.build();

  // DRS flap: its own mesh on a pivot at its trailing edge; the leading edge lifts to open the slot
  const flapParts = new Parts();
  flapParts.add(wing(span(-0.505, 0.505, ST, (t) => ({ y: 0.03 * (2 * t - 1) ** 2, z: -0.22, chord: 0.22, pitch: 0 })), PROF), W, S);
  const flapBuilt = flapParts.build();
  const flap = new Group();
  flap.position.set(0, 1.0, 2.7);
  const FLAP_SHUT = -0.72;
  const FLAP_OPEN = -0.14;
  flap.rotation.x = FLAP_SHUT;
  const flapMesh = new Mesh(flapBuilt.geometry, paintMat);
  flap.add(flapMesh);
  body.add(flap);

  // Lights: the rain light at the back of the crash structure, LED strips on the endplates
  const lightParts = new Parts();
  lightParts.add(new PlaneGeometry(0.1, 0.07), W, F, m4(0, 0.31, 2.625));
  for (const sx of [1, -1]) lightParts.add(new PlaneGeometry(0.02, 0.5), W, F, m4(sx * 0.52, 0.72, 2.805));
  const lightMat = new MeshBasicMaterial({ color: "#3a0505", side: DoubleSide, toneMapped: false });
  const lights = new Mesh(lightParts.build().geometry, lightMat);
  body.add(lights);

  const meshes = [new Mesh(paintBuilt.geometry, paintMat), new Mesh(carbonBuilt.geometry, carbonMat), new Mesh(metalBuilt.geometry, metalMat), new Mesh(decalBuilt.geometry, decalMat)];
  for (const m of [...meshes, flapMesh]) {
    m.castShadow = opts.shadows && m.material !== decalMat;
    m.receiveShadow = opts.shadows && m.material !== decalMat;
    if (m !== flapMesh) body.add(m);
  }

  /* ───── Wheels ───── */
  const maps = { sharp: tex.sharp, blur: tex.blur };
  const { surface, glow } = tex;
  const wheelMat = (front: boolean) =>
    new MeshStandardMaterial({
      map: maps.sharp,
      vertexColors: true,
      roughness: 1,
      metalness: 1,
      roughnessMap: surface,
      metalnessMap: surface,
      emissive: new Color(front ? "#ff4a08" : "#ff3c06"),
      emissiveMap: glow,
      emissiveIntensity: 0,
    });
  const wheelMats = [wheelMat(true), wheelMat(false)];
  const SEG = hi ? 44 : mid ? 30 : 16;
  const wheelGeo = (width: number) => {
    const R = CAR.wheelR;
    const rim = 0.232;
    const h = width / 2;
    const parts: BufferGeometry[] = [];
    // Tyre profile from the outer rim bead round to the inner one (lathe y = -h is the outer face)
    const pts: [number, number, number][] = []; // r, y, atlas row (px)
    const sideN = hi ? 6 : mid ? 4 : 2;
    const sh = hi ? 5 : mid ? 3 : 2;
    const shoulder = 0.045;
    for (let i = 0; i <= sideN; i++) {
      const t = i / sideN;
      const r = rim + (R - shoulder - rim) * t;
      pts.push([r, -h + 0.012 - 0.014 * Math.sin(t * Math.PI), 4 + t * 190]);
    }
    for (let i = 1; i <= sh; i++) {
      const a = (i / sh) * (Math.PI / 2);
      pts.push([R - shoulder + Math.sin(a) * shoulder, -h + shoulder - Math.cos(a) * shoulder, 196 + (i / sh) * 10]);
    }
    for (let i = 1; i < sh; i++) {
      const a = Math.PI / 2 + (i / sh) * (Math.PI / 2);
      pts.push([R - shoulder + Math.sin(a) * shoulder, h - shoulder - Math.cos(a) * shoulder, 290 + (i / sh) * 10]);
    }
    pts.push([R - shoulder, h - 0.002, 300]);
    for (let i = 1; i <= sideN; i++) {
      const t = i / sideN;
      pts.push([R - shoulder - (R - shoulder - rim) * t, h - 0.012 + 0.014 * Math.sin(t * Math.PI), 300 + t * 98]);
    }
    const lathe = new LatheGeometry(
      pts.map(([r, y]) => new Vector2(r, y)),
      SEG,
    );
    const uv = lathe.attributes.uv as BufferAttribute;
    // Lathe UVs: u round the wheel, v down the profile; v is replaced by the atlas row
    for (let i = 0; i < uv.count; i++) {
      const j = i % pts.length;
      uv.setXY(i, 1 - uv.getX(i), row(pts[j][2]));
    }
    lathe.rotateZ(Math.PI / 2);
    const atlas = (g: BufferGeometry, at: [number, number]) => {
      const n = g.attributes.position.count;
      const a = new Float32Array(n * 2);
      for (let i = 0; i < n; i++) a.set([at[0], at[1]], i * 2);
      g.setAttribute("uv", new BufferAttribute(a, 2));
      return g;
    };
    const colour = (g: BufferGeometry, hex: string) => {
      const c = new Color(hex);
      const n = g.attributes.position.count;
      const a = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3);
      g.setAttribute("color", new BufferAttribute(a, 3));
      return g;
    };
    parts.push(colour(lathe, "#ffffff"));
    // Rim: the lip and a dished barrel, gunmetal with a bright machined lip
    const lipPts = [
      [rim - 0.02, h - 0.03],
      [rim - 0.022, -h + 0.07],
      [rim - 0.02, -h + 0.03],
      [rim - 0.012, -h + 0.008],
      [rim + 0.002, -h + 0.012],
    ];
    const lip = new LatheGeometry(
      lipPts.map(([r, y]) => new Vector2(r, y)),
      SEG,
    ).rotateZ(Math.PI / 2);
    colour(atlas(lip, ATLAS.rim), "#3b3f46");
    {
      const col = lip.attributes.color as BufferAttribute;
      const bright = new Color("#c9ccd1");
      for (let i = 0; i < col.count; i++) if (i % lipPts.length >= 3) col.setXYZ(i, bright.r, bright.g, bright.b);
    }
    parts.push(lip);
    // Spokes, hub, centre-lock nut and its retaining clip
    const spokes = hi ? 10 : mid ? 7 : 5;
    for (let i = 0; i < spokes; i++) {
      const a = (i / spokes) * Math.PI * 2;
      const len = rim - 0.075;
      const sp = new CylinderGeometry(0.009, 0.013, len, 4).scale(1.6, 1, 0.8);
      sp.translate(0, 0.06 + len / 2, 0);
      sp.applyMatrix4(new Matrix4().makeRotationX(a));
      sp.translate(h - 0.05, 0, 0);
      parts.push(colour(atlas(sp, ATLAS.rim), "#2c3036"));
    }
    parts.push(colour(atlas(new CylinderGeometry(0.068, 0.075, 0.05, hi ? 20 : 10).rotateZ(Math.PI / 2).translate(h - 0.055, 0, 0), ATLAS.rim), "#2c3036"));
    parts.push(colour(atlas(new CylinderGeometry(0.036, 0.042, 0.04, 6).rotateZ(Math.PI / 2).translate(h - 0.022, 0, 0), ATLAS.rim), "#d8dbe0"));
    if (mid) parts.push(colour(atlas(new CylinderGeometry(0.047, 0.047, 0.006, 16, 1, true).rotateZ(Math.PI / 2).translate(h - 0.03, 0, 0), ATLAS.rim), C.ember));
    // Brake disc behind the spokes (it glows), on its bell
    const disc = new LatheGeometry(
      [
        [0.085, -0.016],
        [0.17, -0.016],
        [0.17, 0.016],
        [0.085, 0.016],
        [0.085, -0.016],
      ].map(([r, y]) => new Vector2(r, y)),
      SEG,
    ).rotateZ(Math.PI / 2);
    disc.translate(h - 0.13, 0, 0);
    parts.push(colour(atlas(disc, ATLAS.disc), "#ffffff"));
    const merged = mergeGeometries(
      parts.map((p) => {
        const g = p.index ? p.toNonIndexed() : p;
        for (const k of Object.keys(g.attributes)) if (!["position", "normal", "uv", "color"].includes(k)) g.deleteAttribute(k);
        return g;
      }),
      false,
    )!;
    merged.computeBoundingSphere();
    return merged;
  };
  const frontGeo = wheelGeo(0.3);
  const rearGeo = wheelGeo(0.4);
  const wheels: Group[] = [];
  const steerers: Group[] = [];
  const pivots: Group[] = [];
  for (const [x, z, front] of [
    [-0.8, CAR.frontZ, true],
    [0.8, CAR.frontZ, true],
    [-0.78, CAR.rearZ, false],
    [0.78, CAR.rearZ, false],
  ] as const) {
    const pivot = new Group();
    pivot.position.set(x, CAR.wheelR, z);
    const spin = new Group();
    const w = new Mesh(front ? frontGeo : rearGeo, wheelMats[front ? 0 : 1]);
    // The geometry's outer face is +x: turn the left wheels round so their lettering faces out too
    if (x < 0) w.rotation.y = Math.PI;
    w.castShadow = opts.shadows;
    spin.add(w);
    pivot.add(spin);
    car.add(pivot);
    wheels.push(spin);
    pivots.push(pivot);
    if (front) steerers.push(pivot);
  }

  /* ───── The ghost: every solid as one geometry ───── */
  const ghostParts: BufferGeometry[] = [positionsOnly(paintBuilt.geometry), positionsOnly(carbonBuilt.geometry), positionsOnly(metalBuilt.geometry)];
  const flapGhost = positionsOnly(flapBuilt.geometry);
  flapGhost.applyMatrix4(new Matrix4().makeRotationX(FLAP_SHUT).setPosition(0, 1.0, 2.7));
  ghostParts.push(flapGhost);
  for (const [x, z, wd] of [
    [-0.8, CAR.frontZ, 0.3],
    [0.8, CAR.frontZ, 0.3],
    [-0.78, CAR.rearZ, 0.4],
    [0.78, CAR.rearZ, 0.4],
  ] as const)
    ghostParts.push(positionsOnly(new CylinderGeometry(CAR.wheelR, CAR.wheelR, wd, 16).rotateZ(Math.PI / 2).translate(x, CAR.wheelR, z).toNonIndexed()));
  const ghostGeometry = mergeGeometries(ghostParts, false)!;

  /* ───── Paint ───── */
  const paintInto = (built: { geometry: BufferGeometry; slots: Float32Array; base: Float32Array }, colours: Color[]) => {
    const col = built.geometry.attributes.color as BufferAttribute;
    const arr = col.array as Float32Array;
    for (let i = 0; i < built.slots.length; i++) {
      const s = built.slots[i];
      if (s === DARK) {
        arr[i * 3] = arr[i * 3 + 1] = arr[i * 3 + 2] = 0.004;
      } else if (s === F) {
        arr[i * 3] = built.base[i * 3];
        arr[i * 3 + 1] = built.base[i * 3 + 1];
        arr[i * 3 + 2] = built.base[i * 3 + 2];
      } else {
        const c = colours[s];
        arr[i * 3] = c.r;
        arr[i * 3 + 1] = c.g;
        arr[i * 3 + 2] = c.b;
      }
    }
    col.needsUpdate = true;
  };
  const tmp = [new Color(), new Color(), new Color()];
  const paint = (id: PaintId) => {
    const p = PAINTS[id] ?? PAINTS.ember;
    tmp[P].set(p.primary);
    tmp[S].set(p.secondary);
    tmp[A].set(p.accent);
    paintInto(paintBuilt, tmp);
    paintInto(flapBuilt, tmp);
    paintMat.metalness = p.metal;
    decalMat.color.set(p.accent);
  };
  paint("ember");

  // Brake heat when the caller doesn't track it (remote cars): from the braking flag
  let lastT = -1;
  let heat = 0;
  let blurred = false;
  const red = new Color();

  return {
    car,
    body,
    /** The spinning part of each wheel (FL, FR, RL, RR). */
    wheels,
    /** The front wheels' steering pivots. */
    steerers,
    /** Every wheel's hub, for suspension travel (FL, FR, RL, RR). */
    pivots,
    /** One merged geometry of the whole car, for the ghost. */
    ghostGeometry,
    paint,
    /** Per-frame details: the DRS flap, the lights, brake glow and the tyres' blur at speed. */
    animate(t: number, s: { drs: number; flash: boolean; braking: boolean; night: number; heat?: number; speed?: number }) {
      const dt = lastT < 0 ? 0 : Math.min(0.1, Math.max(0, t - lastT));
      lastT = t;
      flap.rotation.x = FLAP_SHUT + (FLAP_OPEN - FLAP_SHUT) * s.drs;
      const on = s.flash && Math.floor(t * 8) % 2 === 0;
      // HDR reds, so the post chain's bloom picks the bright ones up
      if (on) red.setRGB(4, 0.25, 0.18);
      else if (s.braking) red.setRGB(1.6, 0.08, 0.06);
      else red.setRGB(0.35 + 0.5 * s.night, 0.02, 0.02);
      lightMat.color.copy(red);
      if (s.heat !== undefined) heat = s.heat;
      else heat += ((s.braking ? 0.75 : 0) - heat) * Math.min(1, dt * (s.braking ? 1.2 : 0.5));
      const glowF = Math.max(0, heat - 0.3) / 0.7;
      wheelMats[0].emissiveIntensity = glowF * glowF * 2.6;
      wheelMats[1].emissiveIntensity = glowF * glowF * 2;
      const blur = Math.abs(s.speed ?? 0) > 24;
      if (blur !== blurred) {
        blurred = blur;
        for (const m of wheelMats) m.map = blur ? maps.blur : maps.sharp;
      }
    },
    /** Frees this car's materials (the textures are shared between cars and stay). */
    dispose() {
      for (const m of [paintMat, carbonMat, metalMat, decalMat, lightMat, ...wheelMats] as Material[]) m.dispose();
    },
  };
}
export type Car = ReturnType<typeof buildCar>;
