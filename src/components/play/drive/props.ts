import {
  BoxGeometry,
  BufferAttribute,
  CanvasTexture,
  Color,
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Shape,
} from "three";
import { type Footprint, inFootprint } from "./circuit";
import type { Glows } from "./glow";
import { Batch, C, floodlit, rng, worldMaterial } from "./kit";
import { drivable, inWater, landmarks, N, pitDist, sampleAt, samples, wallOffset } from "./track";

// Set dressing with some heft: big extruded letters spelling NEIL in front
// of the main grandstand, which the car can knock flat (a few lines of
// impulse and settling, no physics engine; the marshals stand them back up
// once you've gone), lantern posts with warm heads along the verges and
// round the pavilions, and the soft contact shadow under the car.

const H = 3.2;
const T = 0.9;
const DEPTH = 0.9;
/** Letters are drawn 3.2 m tall and built a quarter bigger. */
const SCALE = 1.25;

/** Block letters as outlines (x right, y up), chunky enough to read at speed. */
const GLYPHS: Record<string, { w: number; pts: [number, number][] }> = {
  N: { w: 2.9, pts: [[0, 0], [T, 0], [T, 1.6], [2.0, 0], [2.9, 0], [2.9, H], [2.0, H], [2.0, 1.6], [T, H], [0, H]] },
  E: { w: 2.3, pts: [[0, 0], [2.3, 0], [2.3, 0.85], [T, 0.85], [T, 1.18], [2.0, 1.18], [2.0, 2.02], [T, 2.02], [T, 2.35], [2.3, 2.35], [2.3, H], [0, H]] },
  I: { w: 0.95, pts: [[0, 0], [0.95, 0], [0.95, H], [0, H]] },
  L: { w: 2.25, pts: [[0, 0], [2.25, 0], [2.25, 0.9], [T, 0.9], [T, H], [0, H]] },
};

function letterGeometry(ch: string, face: Color, side: Color) {
  const glyph = GLYPHS[ch];
  const shape = new Shape();
  glyph.pts.forEach(([x, y], k) => (k ? shape.lineTo(x, y) : shape.moveTo(x, y)));
  shape.closePath();
  const g = new ExtrudeGeometry(shape, { depth: DEPTH / SCALE, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.09, bevelSegments: 2, curveSegments: 1 });
  // Centred across, standing on the ground, its depth either side of z = 0
  g.translate(-glyph.w / 2, 0.09, -DEPTH / SCALE / 2);
  g.scale(SCALE, SCALE, SCALE);
  // Faces and sides coloured by which way each vertex faces
  const n = g.attributes.normal as BufferAttribute;
  const col = new Float32Array(n.count * 3);
  const lit = new Float32Array(n.count);
  for (let i = 0; i < n.count; i++) {
    const front = Math.abs(n.getZ(i)) > 0.7;
    const c = front ? face : side;
    col.set([c.r, c.g, c.b], i * 3);
    lit[i] = front ? 0.5 : 0.35;
  }
  g.setAttribute("color", new BufferAttribute(col, 3));
  g.setAttribute("aLit", new BufferAttribute(lit, 1));
  g.computeBoundingSphere();
  return g;
}

/** A soft, car-shaped pool of shade: darkest between the wheels, fading out past them. */
export function contactShadowTexture() {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 128;
  const g = c.getContext("2d")!;
  const blob = (x: number, y: number, rx: number, ry: number, a: number) => {
    g.save();
    g.translate(x, y);
    g.scale(rx / ry, 1);
    const grad = g.createRadialGradient(0, 0, 0, 0, 0, ry);
    grad.addColorStop(0, `rgba(0,0,0,${a})`);
    grad.addColorStop(0.55, `rgba(0,0,0,${a * 0.55})`);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grad;
    g.beginPath();
    g.arc(0, 0, ry, 0, Math.PI * 2);
    g.fill();
    g.restore();
  };
  blob(32, 64, 22, 60, 0.55);
  blob(32, 66, 14, 40, 0.45);
  // Under the wheels the shade is deepest
  for (const [x, y] of [
    [12, 30],
    [52, 30],
    [12, 98],
    [52, 98],
  ])
    blob(x, y, 9, 15, 0.5);
  return new CanvasTexture(c);
}

interface Letter {
  outer: Group;
  inner: Mesh;
  home: { x: number; z: number; yaw: number };
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  spin: number;
  /** Lean from upright (0) to flat (π/2), which way (±1 along its own z) and how fast. */
  tip: number;
  tipRate: number;
  dir: 1 | -1;
  w: number;
  rest: number;
  /** 0…1 while the marshals are standing it back up. */
  tidy: number;
  from?: { x: number; z: number; yaw: number; tip: number };
}

export function buildProps(opts: { glows: Glows; footprints: Footprint[]; poles: [number, number][]; lanterns: number; bigGlow: boolean }) {
  const { glows } = opts;
  const group = new Group();
  const rand = rng(515);

  /* ── NEIL, in the run-off across from the grid, facing the track ── */
  const letterMat = floodlit(new MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.05, envMapIntensity: 0.6 }), "letters");
  // Ember faces and wine sides: they stand out against the cream walls and stands behind
  const face = new Color(C.ember);
  const side = new Color(C.wine);
  const letters: Letter[] = [];
  {
    // About 35 m past the start line, right side, backs to the wall, each
    // turned to face the cars coming down the straight
    const i = 12;
    const p = samples[i];
    const turn = 0.7;
    // Facing: towards the track (−right), swung towards oncoming traffic (−tangent)
    const facing = { x: p.tz * Math.cos(turn) - p.tx * Math.sin(turn), z: -p.tx * Math.cos(turn) - p.tz * Math.sin(turn) };
    const yaw = Math.atan2(facing.x, facing.z);
    const word = "NEIL";
    const gap = 0.7;
    const span = (w: number) => w * SCALE * Math.cos(turn) + DEPTH * Math.sin(turn);
    const total = [...word].reduce((s, ch) => s + span(GLYPHS[ch].w), 0) + gap * (word.length - 1);
    let along = -total / 2;
    for (const ch of word) {
      const w = GLYPHS[ch].w * SCALE;
      // Text reads left to right for someone on the track: N furthest along the lap
      const a = -(along + span(GLYPHS[ch].w) / 2);
      along += span(GLYPHS[ch].w) + gap;
      // Back corner a hand's width off the wall
      const d = wallOffset(i, 1) - 0.3 - ((w / 2) * Math.sin(turn) + (DEPTH / 2) * Math.cos(turn));
      const x = p.x - p.tz * d + p.tx * a;
      const z = p.z + p.tx * d + p.tz * a;
      const inner = new Mesh(letterGeometry(ch, face, side), letterMat);
      inner.castShadow = true;
      inner.receiveShadow = true;
      const outer = new Group();
      outer.add(inner);
      outer.position.set(x, 0, z);
      outer.rotation.y = yaw;
      group.add(outer);
      letters.push({ outer, inner, home: { x, z, yaw }, x, y: 0, z, vx: 0, vy: 0, vz: 0, yaw, spin: 0, tip: 0, tipRate: 0, dir: 1, w, rest: 0, tidy: 0 });
    }
    const d = wallOffset(i, 1) - 2.2;
    // A warm pool of light at their feet
    const mid = { x: p.x - p.tz * d, z: p.z + p.tx * d };
    glows.add(mid.x, 0.4, mid.z, 7, "#ffcf9a", 0.22);
  }

  /* ── lantern posts: verges, then the pavilions ── */
  const lanternGeo = (() => {
    const b = new Batch();
    const iron = "#262a31";
    b.add(new BoxGeometry(0.42, 0.3, 0.42).translate(0, 0.15, 0), iron, 0.3);
    b.add(new CylinderGeometry(0.06, 0.08, 3.1, 6).translate(0, 1.7, 0), iron, 0.25);
    b.add(new BoxGeometry(0.62, 0.07, 0.07).translate(0.25, 3.18, 0), iron, 0.25);
    // The lantern hangs off the arm: frame, warm glass, a little roof
    b.add(new BoxGeometry(0.36, 0.06, 0.36).translate(0.5, 2.62, 0), iron, 0.3);
    b.add(new BoxGeometry(0.3, 0.42, 0.3).translate(0.5, 2.86, 0), "#ffcf86", 3.2);
    b.add(new ConeGeometry(0.3, 0.24, 4).rotateY(Math.PI / 4).translate(0.5, 3.18, 0), iron, 0.3);
    b.add(new CylinderGeometry(0.012, 0.012, 0.12, 4).translate(0.5, 3.06, 0), iron, 0.2);
    return b.build();
  })();
  const spots: [number, number, number][] = [];
  const free = (x: number, z: number) => {
    if (inWater(x, z) || drivable(x, z) < 1.2 || pitDist(x, z).d < 1.5) return false;
    for (const f of opts.footprints) if (inFootprint(f, x, z, 0.8)) return false;
    for (const [px, pz] of opts.poles) if (Math.hypot(px - x, pz - z) < 3) return false;
    return !spots.some(([sx, sz]) => Math.hypot(sx - x, sz - z) < 8);
  };
  // Two flanking each pavilion's board, facing the track
  for (const l of landmarks) {
    const c = Math.cos(l.heading);
    const s = Math.sin(l.heading);
    for (const lx of [-10.5, 10.5]) {
      const lz = 7.5;
      const x = l.x + c * lx + s * lz;
      const z = l.z - s * lx + c * lz;
      if (free(x, z)) spots.push([x, z, l.heading + (lx > 0 ? Math.PI : 0)]);
    }
  }
  // Along the verges, just behind the wall, every 40 m or so on alternating sides
  for (let i = 6, k = 0; i < N && spots.length < opts.lanterns; i += 13 + Math.floor(rand() * 4), k++) {
    const side = k % 2 ? 1 : -1;
    const p = sampleAt(i);
    const o = (wallOffset(i, side) + 1.6) * side;
    const x = p.x - p.tz * o;
    const z = p.z + p.tx * o;
    // The arm reaches back towards the track
    if (free(x, z)) spots.push([x, z, Math.atan2(p.tx * side, p.tz * side)]);
  }
  const lanterns = new InstancedMesh(lanternGeo, worldMaterial(), spots.length);
  const m = new Matrix4();
  spots.forEach(([x, z, ry], k) => {
    lanterns.setMatrixAt(k, m.makeRotationY(ry).setPosition(x, 0, z));
    const hx = x + Math.cos(ry) * 0.5;
    const hz = z - Math.sin(ry) * 0.5;
    glows.add(hx, 2.86, hz, 1.7, "#ffc070", 0.95);
    if (opts.bigGlow) glows.add(hx, 2.6, hz, 6.5, "#ff9f4a", 0.13);
  });
  lanterns.computeBoundingSphere();
  lanterns.name = "lanterns";
  group.add(lanterns);

  /* ── knocking letters about ── */
  const R = 1.05;
  const knock = (L: Letter, carX: number, carZ: number, vx: number, vz: number) => {
    const fx = Math.sin(L.yaw);
    const fz = Math.cos(L.yaw);
    // Where the letter's mass is now: its foot, shifted along its fall
    const reach = Math.sin(L.tip) * H * SCALE * 0.45 * L.dir;
    const cx = L.x + fx * reach;
    const cz = L.z + fz * reach;
    const dx = cx - carX;
    const dz = cz - carZ;
    const dist = Math.hypot(dx, dz);
    const r = R + Math.max(0.55, L.w * 0.42);
    if (dist > r || dist < 1e-3) return 0;
    const nx = dx / dist;
    const nz = dz / dist;
    const rel = (vx - L.vx) * nx + (vz - L.vz) * nz;
    // Out of the car's way regardless, and a shove if it was moving
    L.x += nx * (r - dist) * 0.5;
    L.z += nz * (r - dist) * 0.5;
    if (rel < 0.8) return 0;
    const speed = Math.hypot(vx, vz);
    L.vx += nx * rel * 1.1 + vx * 0.25;
    L.vz += nz * rel * 1.1 + vz * 0.25;
    L.vy += Math.min(5.5, rel * 0.18 + 0.6);
    // Topples the way it was pushed
    const along = nx * fx + nz * fz;
    if (L.tip < 0.05) L.dir = along >= 0 ? 1 : -1;
    L.tipRate += Math.min(7, rel * 0.22) * (Math.sign(along) === L.dir || Math.abs(along) < 0.2 ? 1 : -0.4);
    L.spin += (rand() - 0.5) * Math.min(6, speed * 0.12);
    L.rest = 0;
    L.tidy = 0;
    return rel;
  };

  const step = (L: Letter, dt: number) => {
    if (L.tidy > 0 && L.from) {
      // The marshals: ease back home, upright
      L.tidy = Math.min(1, L.tidy + dt / 1.4);
      const k = L.tidy * L.tidy * (3 - 2 * L.tidy);
      L.x = L.from.x + (L.home.x - L.from.x) * k;
      L.z = L.from.z + (L.home.z - L.from.z) * k;
      L.yaw = L.from.yaw + Math.atan2(Math.sin(L.home.yaw - L.from.yaw), Math.cos(L.home.yaw - L.from.yaw)) * k;
      L.tip = L.from.tip * (1 - k);
      L.y = Math.sin(Math.PI * k) * 0.6;
      if (L.tidy >= 1) {
        L.tidy = 0;
        L.rest = 0;
        L.from = undefined;
        Object.assign(L, { x: L.home.x, z: L.home.z, yaw: L.home.yaw, tip: 0, y: 0 });
      }
      return;
    }
    const ground = L.y <= 0.001;
    L.vy -= 18 * dt;
    L.y = Math.max(0, L.y + L.vy * dt);
    if (L.y === 0 && L.vy < 0) L.vy = -L.vy * 0.22 < 0.4 ? 0 : -L.vy * 0.22;
    L.x += L.vx * dt;
    L.z += L.vz * dt;
    L.yaw += L.spin * dt;
    // Ground friction, much more once it's lying down
    const fr = ground ? (L.tip > 1.2 ? 7 : 3) : 0.2;
    L.vx *= Math.exp(-fr * dt);
    L.vz *= Math.exp(-fr * dt);
    L.spin *= Math.exp(-(ground ? 5 : 0.5) * dt);
    // Toppling: gravity pulls it over past its balance point, or back up short of it
    const balance = Math.atan(DEPTH / (H * SCALE));
    L.tipRate += (L.tip > balance ? 9 * Math.sin(L.tip) : -14 * (L.tip - 0)) * dt;
    L.tipRate *= Math.exp(-1.2 * dt);
    L.tip += L.tipRate * dt;
    if (L.tip < 0) {
      L.tip = 0;
      L.tipRate = Math.max(0, -L.tipRate * 0.2);
    }
    if (L.tip > Math.PI / 2) {
      L.tip = Math.PI / 2;
      L.tipRate = -Math.abs(L.tipRate) * 0.18;
    }
    // Walls hold it in like they hold the car
    const sd = drivable(L.x, L.z);
    if (sd > -0.5) {
      const e = 0.3;
      const gx = drivable(L.x + e, L.z) - drivable(L.x - e, L.z);
      const gz = drivable(L.x, L.z + e) - drivable(L.x, L.z - e);
      const gl = Math.hypot(gx, gz) || 1;
      L.x -= (gx / gl) * (sd + 0.5);
      L.z -= (gz / gl) * (sd + 0.5);
      const vn = (L.vx * gx + L.vz * gz) / gl;
      if (vn > 0) {
        L.vx -= (1.4 * vn * gx) / gl;
        L.vz -= (1.4 * vn * gz) / gl;
      }
    }
    const moving = Math.abs(L.vx) + Math.abs(L.vz) + Math.abs(L.vy) + Math.abs(L.tipRate) + Math.abs(L.spin) > 0.15;
    const displaced = Math.hypot(L.x - L.home.x, L.z - L.home.z) > 0.2 || L.tip > 0.05;
    L.rest = moving || !displaced ? 0 : L.rest + dt;
  };

  const pose = (L: Letter) => {
    L.outer.position.set(L.x, L.y, L.z);
    L.outer.rotation.y = L.yaw;
    // Pivot on the bottom edge it's falling over
    const hd = DEPTH / 2 + 0.14;
    L.inner.position.set(0, hd * Math.sin(L.tip), L.dir * hd * (1 - Math.cos(L.tip)));
    L.inner.rotation.x = L.dir * L.tip;
  };

  let awake = false;
  return {
    group,
    /** Lantern count, for the dev log. */
    lanternCount: spots.length,
    /** Moves the letters; returns the hardest hit this frame (for a thud), or 0. */
    update(dt: number, car: { x: number; z: number; heading: number; v: number }) {
      const near = letters.some((L) => Math.hypot(L.x - car.x, L.z - car.z) < 12);
      if (!near && !awake) return 0;
      const fx = -Math.sin(car.heading);
      const fz = -Math.cos(car.heading);
      let hit = 0;
      let any = false;
      for (const L of letters) {
        if (near && L.tidy === 0) for (const o of [1.6, -1.4]) hit = Math.max(hit, knock(L, car.x + fx * o, car.z + fz * o, fx * car.v, fz * car.v));
        step(L, Math.min(dt, 1 / 30));
        // Lying about for a while with the car gone: stand it back up
        if (L.rest > 5 && Math.hypot(L.x - car.x, L.z - car.z) > 28) {
          L.from = { x: L.x, z: L.z, yaw: L.yaw, tip: L.tip };
          L.tidy = 0.001;
          L.rest = 0;
        }
        pose(L);
        if (L.tidy > 0 || L.rest > 0 || Math.abs(L.vx) + Math.abs(L.vz) + Math.abs(L.tipRate) > 0.01 || L.tip > 0.001) any = true;
      }
      awake = any;
      return hit;
    },
  };
}
export type Props = ReturnType<typeof buildProps>;
