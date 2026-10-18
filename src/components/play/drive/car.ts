import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  CircleGeometry,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Group,
  LatheGeometry,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  Shape,
  SphereGeometry,
  SRGBColorSpace,
  TubeGeometry,
  Vector2,
  Vector3,
} from "three";
import { Batch, C } from "./kit";

// The car: a modern open-wheel racer built from lofted cross-sections and
// extrusions. Nose, tub and engine cover are one loft; the sidepods, airbox,
// multi-element wings, halo, helmet and slick tyres are added on top. Parts
// are merged by material (paint, trim, accent, carbon/detail, decals) so the
// whole car is about ten draw calls, and the paint can change without a rebuild.

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

/** Car geometry the engine needs: wheel radius, axle positions, the onboard eye point. */
export const CAR = { wheelR: 0.36, frontZ: -1.8, rearZ: 1.8, eye: new Vector3(0, 1.17, 0.1) };

/* ───────────── lofting ───────────── */

interface Section {
  z: number;
  /** Centre x of the section (sidepods sit off-centre). */
  cx?: number;
  w: number;
  y0: number;
  y1: number;
  /** Width at the top relative to the bottom: < 1 tapers like a nose. */
  top?: number;
  /** Superellipse exponent: 2 is an ellipse, higher is boxier. */
  p?: number;
}

const RING = 14;
function ring(s: Section, mirrorX = 1): [number, number][] {
  const p = s.p ?? 2.6;
  const out: [number, number][] = [];
  const cy = (s.y0 + s.y1) / 2;
  const h = (s.y1 - s.y0) / 2;
  for (let k = 0; k < RING; k++) {
    const a = (k / RING) * Math.PI * 2;
    const c = Math.cos(a);
    const sn = Math.sin(a);
    const y = cy + h * Math.sign(sn) * Math.pow(Math.abs(sn), 2 / p);
    const t = (y - s.y0) / (s.y1 - s.y0 || 1);
    const w = s.w * (1 + ((s.top ?? 1) - 1) * t);
    out.push([(s.cx ?? 0) * mirrorX + w * Math.sign(c) * Math.pow(Math.abs(c), 2 / p), y]);
  }
  return out;
}

/** Joins cross-sections into a closed solid (caps at both ends). */
function loft(sections: Section[], mirrorX = 1) {
  const rings = sections.map((s) => ring(s, mirrorX));
  const pos: number[] = [];
  const tri = (a: number[], b: number[], c: number[]) => pos.push(...a, ...b, ...c);
  for (let i = 0; i < rings.length - 1; i++) {
    const za = sections[i].z;
    const zb = sections[i + 1].z;
    for (let k = 0; k < RING; k++) {
      const k2 = (k + 1) % RING;
      const a = [rings[i][k][0], rings[i][k][1], za];
      const b = [rings[i][k2][0], rings[i][k2][1], za];
      const c = [rings[i + 1][k2][0], rings[i + 1][k2][1], zb];
      const d = [rings[i + 1][k][0], rings[i + 1][k][1], zb];
      if (mirrorX > 0) {
        tri(a, c, b);
        tri(a, d, c);
      } else {
        tri(a, b, c);
        tri(a, c, d);
      }
    }
  }
  // Caps: fans around each end's centre
  for (const [idx, flip] of [
    [0, true],
    [rings.length - 1, false],
  ] as const) {
    const r = rings[idx];
    const z = sections[idx].z;
    const cx = r.reduce((s, q) => s + q[0], 0) / RING;
    const cy = r.reduce((s, q) => s + q[1], 0) / RING;
    for (let k = 0; k < RING; k++) {
      const k2 = (k + 1) % RING;
      const f = flip !== mirrorX < 0;
      if (f) tri([cx, cy, z], [r[k2][0], r[k2][1], z], [r[k][0], r[k][1], z]);
      else tri([cx, cy, z], [r[k][0], r[k][1], z], [r[k2][0], r[k2][1], z]);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

const box = (w: number, h: number, d: number) => new BoxGeometry(w, h, d);
const m4 = (x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) => {
  const m = new Matrix4().makeRotationY(ry).multiply(new Matrix4().makeRotationX(rx)).multiply(new Matrix4().makeRotationZ(rz));
  return m.setPosition(x, y, z);
};

/** A thin wing element: an airfoil-ish extrusion of the given span (along x) and chord. */
function airfoil(span: number, chord: number, thick: number) {
  const s = new Shape();
  s.moveTo(0, 0);
  s.quadraticCurveTo(chord * 0.15, thick * 1.2, chord * 0.45, thick);
  s.quadraticCurveTo(chord * 0.8, thick * 0.7, chord, 0.002);
  s.quadraticCurveTo(chord * 0.5, -thick * 0.25, 0, 0);
  const g = new ExtrudeGeometry(s, { depth: span, bevelEnabled: false, curveSegments: 4 });
  // Shape x = chord (towards the back, +z), shape y = up, extrusion = span (x)
  g.applyMatrix4(new Matrix4().makeRotationY(-Math.PI / 2));
  g.translate(span / 2, 0, 0);
  return g;
}

/* ───────────── textures ───────────── */

/** The wheel's outer face: slick sidewall with a coloured band and lettering, and the wheel cover. */
function wheelTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#121315";
  g.fillRect(0, 0, 256, 256);
  const R = 128;
  g.translate(R, R);
  g.fillStyle = "#1b1c1f";
  g.beginPath();
  g.arc(0, 0, R - 2, 0, Math.PI * 2);
  g.fill();
  // Compound band
  g.strokeStyle = C.ember;
  g.lineWidth = 7;
  g.beginPath();
  g.arc(0, 0, R * 0.86, 0, Math.PI * 2);
  g.stroke();
  // Lettering round the sidewall, twice
  g.fillStyle = "#d9d4c8";
  g.font = "700 15px ui-sans-serif, system-ui, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  const word = "BAY STREET  ·  SOFT";
  for (let rep = 0; rep < 2; rep++)
    for (let i = 0; i < word.length; i++) {
      const a = rep * Math.PI + (i - word.length / 2) * 0.085;
      g.save();
      g.rotate(a);
      g.translate(0, -R * 0.765);
      g.fillText(word[i], 0, 0);
      g.restore();
    }
  // Wheel cover: dark disc, five spokes, an accent ring and the nut
  const inner = R * (0.24 / 0.335);
  g.fillStyle = "#2b2e34";
  g.beginPath();
  g.arc(0, 0, inner, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "#4a4f57";
  g.lineWidth = 9;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    g.beginPath();
    g.moveTo(Math.cos(a) * 14, Math.sin(a) * 14);
    g.lineTo(Math.cos(a) * inner * 0.92, Math.sin(a) * inner * 0.92);
    g.stroke();
  }
  g.strokeStyle = C.ember;
  g.lineWidth = 4;
  g.beginPath();
  g.arc(0, 0, inner * 0.97, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = "#c9ccd1";
  g.beginPath();
  g.arc(0, 0, 11, 0, Math.PI * 2);
  g.fill();
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** White race number and initials on transparent: tinted by the material to the livery's accent. */
function decalTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = "#fff";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = "italic 800 92px ui-sans-serif, system-ui, sans-serif";
  g.fillText("26", 64, 66);
  g.font = "800 60px ui-sans-serif, system-ui, sans-serif";
  g.fillText("NJS", 192, 66);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
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
  const car = new Group(); // follows the track: position and heading
  const body = new Group(); // pitches under braking, rolls in corners
  car.add(body);

  const paint = new Batch();
  const trim = new Batch();
  const accent = new Batch();
  const detail = new Batch(); // carbon, helmet, mirrors, intakes: fixed colours
  const ghost = new Batch(); // every solid, for the ghost car

  const add = (b: Batch, g: BufferGeometry, color: string, m?: Matrix4) => {
    const ng = g.index ? g.toNonIndexed() : g.clone();
    if (m) ng.applyMatrix4(m);
    ghost.add(ng.clone(), "#ffffff");
    b.add(ng, color);
  };
  const W = "#ffffff";

  // Nose, tub and the low part of the engine cover: one loft, tip to tail
  add(
    paint,
    loft([
      { z: -2.94, w: 0.06, y0: 0.2, y1: 0.27, top: 0.9 },
      { z: -2.62, w: 0.115, y0: 0.16, y1: 0.33, top: 0.82 },
      { z: -2.2, w: 0.155, y0: 0.15, y1: 0.41, top: 0.78 },
      { z: -1.75, w: 0.2, y0: 0.14, y1: 0.48, top: 0.76 },
      { z: -1.25, w: 0.25, y0: 0.11, y1: 0.56, top: 0.74 },
      { z: -0.8, w: 0.3, y0: 0.09, y1: 0.62, top: 0.72 },
      { z: -0.3, w: 0.33, y0: 0.08, y1: 0.63, top: 0.82 },
      { z: 0.3, w: 0.34, y0: 0.08, y1: 0.68, top: 0.7 },
      { z: 0.9, w: 0.3, y0: 0.08, y1: 0.7, top: 0.6 },
      { z: 1.5, w: 0.22, y0: 0.1, y1: 0.6, top: 0.6 },
      { z: 2.05, w: 0.13, y0: 0.13, y1: 0.47, top: 0.6 },
      { z: 2.45, w: 0.07, y0: 0.18, y1: 0.38, top: 0.7 },
    ]),
    W,
  );
  // Airbox and the spine of the engine cover, rising behind the driver
  add(
    paint,
    loft([
      { z: 0.14, w: 0.13, y0: 0.55, y1: 0.99, top: 0.72, p: 2.2 },
      { z: 0.5, w: 0.17, y0: 0.55, y1: 0.97, top: 0.62 },
      { z: 1.0, w: 0.17, y0: 0.55, y1: 0.86, top: 0.55 },
      { z: 1.6, w: 0.11, y0: 0.5, y1: 0.7, top: 0.5 },
      { z: 2.15, w: 0.05, y0: 0.42, y1: 0.52, top: 0.6 },
    ]),
    W,
  );
  // The airbox mouth over the driver's head, and the onboard camera pod on top
  add(detail, loft([{ z: 0.12, w: 0.09, y0: 0.82, y1: 0.97, top: 0.75 }, { z: 0.16, w: 0.09, y0: 0.82, y1: 0.97, top: 0.75 }]), "#0b0c0e");
  add(detail, box(0.07, 0.05, 0.12), "#111316", m4(0, 1.01, 0.3));
  add(accent, box(0.072, 0.012, 0.124), W, m4(0, 1.04, 0.3));

  // Sidepods, either side, tapering in towards the gearbox ("coke bottle")
  for (const sx of [1, -1]) {
    const pod: Section[] = [
      { z: -0.5, cx: 0.6, w: 0.19, y0: 0.12, y1: 0.48, p: 3 },
      { z: -0.25, cx: 0.61, w: 0.25, y0: 0.08, y1: 0.54, p: 3 },
      { z: 0.4, cx: 0.6, w: 0.27, y0: 0.08, y1: 0.52, top: 0.9, p: 3 },
      { z: 1.0, cx: 0.5, w: 0.22, y0: 0.08, y1: 0.43, top: 0.85, p: 2.8 },
      { z: 1.6, cx: 0.36, w: 0.13, y0: 0.1, y1: 0.31, top: 0.8 },
      { z: 2.0, cx: 0.25, w: 0.05, y0: 0.12, y1: 0.22 },
    ];
    add(paint, loft(pod, sx), W);
    // Inlet mouth, dark, just inside the front of the pod
    add(detail, loft([{ z: -0.505, cx: 0.6, w: 0.165, y0: 0.15, y1: 0.45, p: 3 }, { z: -0.49, cx: 0.6, w: 0.165, y0: 0.15, y1: 0.45, p: 3 }], sx), "#08090b");
    // A stripe along the top of the pod
    add(accent, box(0.05, 0.012, 1.25), W, m4(sx * 0.62, 0.545, 0.25, 0, sx * 0.03));
    // Mirrors on stalks
    add(detail, box(0.025, 0.12, 0.025), C.carbon, m4(sx * 0.4, 0.66, -0.5, 0, 0, sx * 0.4));
    add(trim, box(0.16, 0.06, 0.06), W, m4(sx * 0.46, 0.72, -0.5));
    add(detail, box(0.14, 0.045, 0.005), "#9fb6c8", m4(sx * 0.46, 0.72, -0.47));
  }
  // Cockpit opening: a dark padded rim
  add(detail, loft([{ z: -0.62, w: 0.24, y0: 0.6, y1: 0.66, top: 0.95, p: 3 }, { z: 0.16, w: 0.26, y0: 0.6, y1: 0.67, top: 0.95, p: 3 }]), "#0d0e10");

  // Floor, with the edges flicking up, and the diffuser
  const floorShape = new Shape();
  floorShape.moveTo(-0.3, -1.2);
  floorShape.lineTo(0.3, -1.2);
  floorShape.lineTo(0.78, -0.62);
  floorShape.lineTo(0.84, 1.2);
  floorShape.lineTo(0.6, 1.6);
  floorShape.lineTo(0.55, 2.35);
  floorShape.lineTo(-0.55, 2.35);
  floorShape.lineTo(-0.6, 1.6);
  floorShape.lineTo(-0.84, 1.2);
  floorShape.lineTo(-0.78, -0.62);
  floorShape.closePath();
  const floor = new ExtrudeGeometry(floorShape, { depth: 0.03, bevelEnabled: false });
  floor.rotateX(Math.PI / 2);
  floor.translate(0, 0.075, 0);
  add(detail, floor, C.carbon);
  for (const sx of [1, -1]) add(detail, box(0.012, 0.06, 1.7), C.carbon, m4(sx * 0.82, 0.1, 0.3));
  for (let i = 0; i < 5; i++) add(detail, box(0.012, 0.2, 0.42), "#1d2026", m4(-0.44 + i * 0.22, 0.17, 2.2, -0.35));
  add(detail, box(0.98, 0.012, 0.44), "#1d2026", m4(0, 0.22, 2.2, -0.42));
  // Plank (the titanium skid blocks spark at night)
  add(detail, box(0.3, 0.01, 2.6), "#5a5f68", m4(0, 0.057, 0.3));

  // Front wing: main plane, two flaps outboard, endplates, nose pylons
  add(detail, airfoil(1.88, 0.36, 0.035), C.carbon, m4(0, 0.075, -2.98, -0.04));
  for (const sx of [1, -1]) {
    for (let k = 0; k < 2; k++) add(trim, airfoil(0.66, 0.2 - k * 0.03, 0.022), W, m4(sx * 0.6, 0.12 + k * 0.055, -2.72 + k * 0.13, -0.28 - k * 0.22));
    add(paint, box(0.022, 0.22, 0.56), W, m4(sx * 0.945, 0.17, -2.78));
    add(accent, box(0.024, 0.03, 0.56), W, m4(sx * 0.945, 0.28, -2.78));
    add(detail, box(0.02, 0.12, 0.2), C.carbon, m4(sx * 0.07, 0.15, -2.82));
  }
  // Rear wing: endplates, main plane, the DRS flap on its own pivot, beam wing, swan neck
  for (const sx of [1, -1]) {
    add(trim, box(0.025, 0.58, 0.64), W, m4(sx * 0.52, 0.72, 2.47));
    add(accent, box(0.027, 0.04, 0.64), W, m4(sx * 0.52, 0.99, 2.47));
  }
  add(detail, airfoil(1.02, 0.32, 0.03), C.carbon, m4(0, 0.84, 2.3, -0.18));
  add(detail, airfoil(0.9, 0.18, 0.02), C.carbon, m4(0, 0.42, 2.34, -0.25));
  add(detail, box(0.03, 0.4, 0.06), C.carbon, m4(0, 0.66, 2.36));
  // Crash structure and the rain light
  add(detail, box(0.12, 0.1, 0.3), C.carbon, m4(0, 0.31, 2.48));

  // Shark fin along the engine cover
  // (drawn in the car's side view: shape x is z, shape y is height)
  const fin = new Shape();
  fin.moveTo(0.55, 0.93);
  fin.lineTo(1.0, 0.84);
  fin.lineTo(1.6, 0.68);
  fin.lineTo(2.2, 0.5);
  fin.lineTo(2.3, 0.62);
  fin.lineTo(2.33, 0.97);
  fin.quadraticCurveTo(1.5, 1.0, 0.55, 0.985);
  fin.closePath();
  const finGeo = new ExtrudeGeometry(fin, { depth: 0.012, bevelEnabled: false });
  finGeo.rotateY(-Math.PI / 2);
  add(paint, finGeo, W, m4(0.006, 0, 0));

  // Halo: a titanium hoop round the cockpit with a centre pillar
  const haloCurve = new CatmullRomCurve3([
    new Vector3(-0.36, 0.64, 0.3),
    new Vector3(-0.38, 0.8, 0.08),
    new Vector3(-0.32, 0.86, -0.22),
    new Vector3(-0.15, 0.88, -0.46),
    new Vector3(0, 0.885, -0.52),
    new Vector3(0.15, 0.88, -0.46),
    new Vector3(0.32, 0.86, -0.22),
    new Vector3(0.38, 0.8, 0.08),
    new Vector3(0.36, 0.64, 0.3),
  ]);
  add(trim, new TubeGeometry(haloCurve, Math.round(18 + 10 * opts.detail), 0.03, 6, false), W);
  add(trim, new TubeGeometry(new CatmullRomCurve3([new Vector3(0, 0.88, -0.5), new Vector3(0, 0.8, -0.66), new Vector3(0, 0.62, -0.78)]), 8, 0.032, 6, false), W);

  // Driver: helmet in paper with an accent crown stripe, dark visor, and the steering wheel
  const helmet = new SphereGeometry(0.135, 14, 10);
  helmet.scale(1, 0.95, 1.1);
  add(detail, helmet, C.paper, m4(0, 0.76, 0.02));
  const crown = new SphereGeometry(0.138, 14, 4, 0, Math.PI * 2, 0, 0.55);
  crown.scale(1, 0.95, 1.1);
  add(accent, crown, W, m4(0, 0.76, 0.02));
  const visor = new SphereGeometry(0.139, 12, 3, Math.PI * 0.62, Math.PI * 0.76, 1.15, 0.36);
  visor.scale(1, 0.95, 1.1);
  add(detail, visor, "#15212c", m4(0, 0.76, 0.02));
  add(detail, box(0.27, 0.12, 0.03), "#15171a", m4(0, 0.66, -0.36, -0.5));
  add(detail, box(0.09, 0.05, 0.005), "#2e7d6b", m4(0, 0.67, -0.38, -0.5));
  for (const sx of [1, -1]) add(detail, box(0.045, 0.13, 0.05), "#24272c", m4(sx * 0.15, 0.66, -0.355, -0.5));

  // Suspension: wishbones and push/pull rods from the tub to each upright
  const rod = (ax: number, ay: number, az: number, bx: number, by: number, bz: number) => {
    const a = new Vector3(ax, ay, az);
    const dir = new Vector3(bx, by, bz).sub(a);
    const g = new CylinderGeometry(0.014, 0.014, dir.length(), 5);
    g.translate(0, dir.length() / 2, 0);
    g.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir.normalize()));
    g.translate(a.x, a.y, a.z);
    add(detail, g, "#2a2e35");
  };
  for (const sx of [1, -1])
    for (const [z, tw] of [
      [CAR.frontZ, 0.64],
      [CAR.rearZ, 0.6],
    ] as const) {
      rod(sx * 0.2, 0.42, z - 0.22, sx * tw, 0.46, z);
      rod(sx * 0.2, 0.42, z + 0.22, sx * tw, 0.46, z);
      rod(sx * 0.18, 0.2, z - 0.25, sx * tw, 0.24, z);
      rod(sx * 0.18, 0.2, z + 0.25, sx * tw, 0.24, z);
      rod(sx * 0.22, 0.55, z + 0.05, sx * (tw - 0.05), 0.27, z);
    }

  // Decals: the number on the nose and the fin, initials on the engine cover
  const decalTex = decalTexture();
  const decals = new Batch(true);
  const noseNum = decal(0.2, 0.2, 0, 0.5);
  noseNum.applyMatrix4(m4(0, 0.487, -1.8, -Math.PI / 2 - 0.17));
  decals.add(noseNum, W);
  for (const sx of [1, -1]) {
    const finNum = decal(0.26, 0.26, 0, 0.5);
    finNum.applyMatrix4(m4(sx * 0.013, 0.84, 1.62, 0, sx * Math.PI / 2));
    decals.add(finNum, W);
    const side = decal(0.42, 0.21, 0.5, 1);
    side.applyMatrix4(m4(sx * 0.878, 0.31, 0.38, 0, sx * Math.PI / 2 - sx * 0.04));
    decals.add(side, W);
  }
  const decalMat = new MeshStandardMaterial({ map: decalTex, transparent: true, alphaTest: 0.4, roughness: 0.4, side: DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 });

  // Materials: glossy paint, satin trim, carbon and details from vertex colours
  const paintMat = new MeshStandardMaterial({ color: C.ember, roughness: 0.32, metalness: 0.25 });
  const trimMat = new MeshStandardMaterial({ color: C.ink, roughness: 0.4, metalness: 0.2 });
  const accentMat = new MeshStandardMaterial({ color: C.paper, roughness: 0.4, metalness: 0.1 });
  const detailMat = new MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.15 });
  const meshes = [new Mesh(paint.build(), paintMat), new Mesh(trim.build(), trimMat), new Mesh(accent.build(), accentMat), new Mesh(detail.build(), detailMat), new Mesh(decals.build(), decalMat)];
  for (const m of meshes) {
    m.castShadow = opts.shadows;
    body.add(m);
  }
  meshes[4].castShadow = false;

  // DRS flap: its own pivot, so it can open on the straights
  const flap = new Group();
  flap.position.set(0, 0.95, 2.47);
  const flapMesh = new Mesh(airfoil(1.0, 0.22, 0.025), trimMat);
  flapMesh.castShadow = opts.shadows;
  flap.add(flapMesh);
  body.add(flap);
  ghost.add(airfoil(1.0, 0.22, 0.025).applyMatrix4(m4(0, 0.95, 2.47, -0.55)), W);

  // Rain light: flashes when harvesting energy and in the pit lane
  const rainMat = new MeshBasicMaterial({ color: "#3a0505" });
  const rain = new Mesh(box(0.08, 0.05, 0.01), rainMat);
  rain.position.set(0, 0.33, 2.635);
  body.add(rain);
  for (const sx of [1, -1]) {
    const endLight = new Mesh(box(0.012, 0.18, 0.03), rainMat);
    endLight.position.set(sx * 0.535, 0.62, 2.78);
    body.add(endLight);
  }

  // Wheels: slick tyres with textured faces, steering on the front pivots
  const wheelTex = wheelTexture();
  const wheelMat = new MeshStandardMaterial({ map: wheelTex, roughness: 0.82, metalness: 0.05 });
  const wheelGeo = (width: number) => {
    const r = CAR.wheelR;
    const h = width / 2;
    const prof = [
      [0.24, -h],
      [0.33, -h],
      [0.352, -h + 0.025],
      [r, -h + 0.06],
      [r, h - 0.06],
      [0.352, h - 0.025],
      [0.33, h],
      [0.24, h],
    ].map(([a, b]) => new Vector2(a, b));
    const tyre = new LatheGeometry(prof, Math.round(18 + 10 * opts.detail));
    const uv = tyre.attributes.uv as BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.01, 0.01);
    tyre.rotateZ(Math.PI / 2);
    const parts: BufferGeometry[] = [tyre.toNonIndexed()];
    for (const sx of [1, -1]) {
      const face = new CircleGeometry(0.335, Math.round(18 + 10 * opts.detail));
      face.rotateY(sx * Math.PI / 2);
      face.translate(sx * (h + 0.002), 0, 0);
      parts.push(face.toNonIndexed());
    }
    const b = new Batch(true);
    for (const p of parts) b.add(p, W);
    return b.build();
  };
  const frontGeo = wheelGeo(0.3);
  const rearGeo = wheelGeo(0.4);
  const wheels: Group[] = [];
  const steerers: Group[] = [];
  for (const [x, z, front] of [
    [-0.8, CAR.frontZ, true],
    [0.8, CAR.frontZ, true],
    [-0.78, CAR.rearZ, false],
    [0.78, CAR.rearZ, false],
  ] as const) {
    const pivot = new Group();
    pivot.position.set(x, CAR.wheelR, z);
    const spin = new Group();
    const w = new Mesh(front ? frontGeo : rearGeo, wheelMat);
    w.castShadow = opts.shadows;
    spin.add(w);
    pivot.add(spin);
    car.add(pivot);
    wheels.push(spin);
    if (front) steerers.push(pivot);
    const cyl = new CylinderGeometry(CAR.wheelR, CAR.wheelR, front ? 0.3 : 0.4, 12).rotateZ(Math.PI / 2);
    ghost.add(cyl.translate(x, CAR.wheelR, z), W);
  }

  const ghostGeometry = ghost.build();

  return {
    car,
    body,
    wheels,
    steerers,
    /** One merged geometry of the whole car, for the ghost. */
    ghostGeometry,
    paint(id: PaintId) {
      const p = PAINTS[id] ?? PAINTS.ember;
      paintMat.color.set(p.primary);
      paintMat.metalness = p.metal;
      trimMat.color.set(p.secondary);
      accentMat.color.set(p.accent);
      decalMat.color.set(p.accent);
    },
    /** Per-frame details: the DRS flap and the rain light. */
    animate(t: number, s: { drs: number; flash: boolean; braking: boolean; night: number }) {
      flap.rotation.x = -0.55 + s.drs * 0.5;
      const on = s.flash && Math.floor(t * 8) % 2 === 0;
      rainMat.color.set(on ? "#ff3b30" : s.braking ? "#c0261f" : s.night > 0.5 ? "#6a0d0d" : "#3a0505");
    },
  };
}
export type Car = ReturnType<typeof buildCar>;
