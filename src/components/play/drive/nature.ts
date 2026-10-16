import {
  AdditiveBlending,
  BufferGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DodecahedronGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  type Material,
  MeshBasicMaterial,
  MeshLambertMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  SphereGeometry,
  BoxGeometry,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { heightAt, tint } from "./terrain";
import { ISLAND_RADIUS, lamps, roadDist } from "./world";

// Trees, grass, rocks and street lamps. Everything is instanced (one draw
// call per kind) and sways in a shared wind uniform.

export type Rand = () => number;
export interface Static {
  x: number;
  z: number;
  r: number;
}

/** Adds a gentle sway to any material: the higher a vertex, the more it moves. */
export function sway<M extends Material>(mat: M, wind: { value: number }, strength: number, height: number): M {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uWind = wind;
    shader.vertexShader = shader.vertexShader.replace("#include <common>", "#include <common>\nuniform float uWind;").replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      #ifdef USE_INSTANCING
        float ph = instanceMatrix[3].x * 0.21 + instanceMatrix[3].z * 0.17;
      #else
        float ph = 0.0;
      #endif
      float k = pow(max(position.y, 0.0) / ${height.toFixed(2)}, 2.0) * ${strength.toFixed(3)};
      transformed.x += sin(uWind * 1.7 + ph) * k;
      transformed.z += cos(uWind * 1.3 + ph * 1.3) * k * 0.6;`,
    );
  };
  mat.customProgramCacheKey = () => `sway-${strength}-${height}`;
  return mat;
}

function palmGeometry(rand: Rand) {
  const parts: BufferGeometry[] = [];
  const lean = (y: number) => y * y * 0.035;
  const segs = 6;
  for (let i = 0; i < segs; i++) {
    const seg = new CylinderGeometry(0.3 - (i + 1) * 0.025, 0.3 - i * 0.025, 1.05, 7).toNonIndexed();
    seg.translate(lean(i + 0.5), i + 0.52, 0);
    parts.push(tint(seg, i % 2 ? "#8a5a3c" : "#a0714b"));
  }
  const topX = lean(segs);
  const topY = segs;
  for (let k = 0; k < 7; k++) {
    const f = new PlaneGeometry(0.95, 3.4, 1, 5).toNonIndexed();
    const p = f.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const t = (p.getY(i) + 1.7) / 3.4;
      p.setXYZ(i, p.getX(i) * (1 - t * 0.75), t * 0.9 - t * t * 2.1, t * 3.4);
    }
    f.rotateY((k / 7) * Math.PI * 2 + rand() * 0.4);
    f.translate(topX, topY, 0);
    parts.push(tint(f, k % 2 ? "#6f8b4f" : "#8aa85c"));
  }
  for (let k = 0; k < 3; k++) {
    const c = new SphereGeometry(0.2, 6, 4).toNonIndexed();
    const a = (k / 3) * Math.PI * 2;
    c.translate(topX + Math.cos(a) * 0.28, topY - 0.25, Math.sin(a) * 0.28);
    parts.push(tint(c, "#6b4a2b"));
  }
  return mergeGeometries(parts);
}

function broadleafGeometry(leaf: string, leaf2: string) {
  const parts: BufferGeometry[] = [];
  parts.push(tint(new CylinderGeometry(0.22, 0.34, 2.4, 7).toNonIndexed().translate(0, 1.2, 0), "#8a5a3c"));
  const blobs: [number, number, number, number][] = [
    [0, 3.5, 0, 1.7],
    [0.95, 3.0, 0.4, 1.2],
    [-0.8, 3.1, -0.45, 1.25],
    [0.2, 4.4, -0.3, 1.05],
  ];
  blobs.forEach(([x, y, z, s], i) => parts.push(tint(new SphereGeometry(s, 7, 5).toNonIndexed().translate(x, y, z), i % 2 ? leaf2 : leaf)));
  return mergeGeometries(parts);
}

/** A soft radial glow, for lamp light on the ground and the headlights. */
export function glowTexture(inner = "rgba(255,214,150,0.9)") {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, inner);
  grad.addColorStop(1, "rgba(255,214,150,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new CanvasTexture(c);
}

export function buildNature(opts: { rand: Rand; quality: number; blocked: (x: number, z: number, r: number) => boolean; statics: Static[]; wind: { value: number } }) {
  const { rand, quality, blocked, statics, wind } = opts;
  const g = new Group();
  const tmp = new Object3D();
  const shadows = quality > 0.4;

  // Palms near the beach and scattered inland; leafy and flame trees on the hills.
  // (the island is about 2.8x the area it used to be, so there are more of everything)
  const palms = new InstancedMesh(palmGeometry(rand), sway(new MeshStandardMaterial({ vertexColors: true, flatShading: true, side: DoubleSide, roughness: 0.9 }), wind, 0.35, 6), Math.round(48 + 40 * quality));
  const leafy = new InstancedMesh(broadleafGeometry("#8ea866", "#6f8b4f"), sway(new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 }), wind, 0.18, 5), Math.round(50 + 50 * quality));
  const flame = new InstancedMesh(broadleafGeometry("#c1121f", "#e2483a"), sway(new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 }), wind, 0.18, 5), Math.round(12 + 14 * quality));
  for (const [mesh, coastal] of [
    [palms, true],
    [leafy, false],
    [flame, false],
  ] as const) {
    let n = 0;
    for (let guard = 0; n < mesh.count && guard < 5000; guard++) {
      const a = rand() * Math.PI * 2;
      const d = coastal && rand() < 0.7 ? ISLAND_RADIUS - 14 + rand() * 7 : 12 + rand() * (ISLAND_RADIUS - 24);
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d;
      if (roadDist(x, z) < 3 || blocked(x, z, 3)) continue;
      if (statics.some((s) => Math.hypot(s.x - x, s.z - z) < s.r + 2.6)) continue;
      const s = 0.8 + rand() * 0.55;
      tmp.position.set(x, heightAt(x, z) - 0.1, z);
      tmp.rotation.set(0, rand() * Math.PI * 2, 0);
      tmp.scale.setScalar(s);
      tmp.updateMatrix();
      mesh.setMatrixAt(n++, tmp.matrix);
      statics.push({ x, z, r: 0.45 * s });
    }
    mesh.count = n;
    mesh.castShadow = shadows;
    mesh.receiveShadow = true;
    mesh.computeBoundingSphere();
    g.add(mesh);
  }

  // Grass blades in clumps across the meadow
  const blade = new BufferGeometry();
  blade.setAttribute("position", new Float32BufferAttribute([-0.07, 0, 0, 0.07, 0, 0, 0, 0.8, 0], 3));
  blade.setAttribute("normal", new Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
  const base = new Color("#7f9450");
  const tip = new Color("#d8dc96");
  blade.setAttribute("color", new Float32BufferAttribute([base.r, base.g, base.b, base.r, base.g, base.b, tip.r, tip.g, tip.b], 3));
  const bladeCount = Math.round(2400 + 14000 * quality * quality);
  const grass = new InstancedMesh(blade, sway(new MeshLambertMaterial({ vertexColors: true, side: DoubleSide }), wind, 0.16, 0.8), bladeCount);
  const shade = new Color();
  let nb = 0;
  for (let guard = 0; nb < bladeCount && guard < bladeCount * 3; guard++) {
    // Clump centre, then a handful of blades around it
    const a = rand() * Math.PI * 2;
    const d = 11 + rand() * (ISLAND_RADIUS - 22);
    const cx = Math.cos(a) * d;
    const cz = Math.sin(a) * d;
    if (roadDist(cx, cz) < 1.3 || blocked(cx, cz, 1.5)) continue;
    const k = 6 + Math.floor(rand() * 10);
    for (let i = 0; i < k && nb < bladeCount; i++) {
      const x = cx + (rand() - 0.5) * 2.6;
      const z = cz + (rand() - 0.5) * 2.6;
      tmp.position.set(x, heightAt(x, z) - 0.02, z);
      tmp.rotation.set((rand() - 0.5) * 0.4, rand() * Math.PI, (rand() - 0.5) * 0.4);
      tmp.scale.set(1, 0.6 + rand() * 0.9, 1);
      tmp.updateMatrix();
      grass.setMatrixAt(nb, tmp.matrix);
      grass.setColorAt(nb++, shade.setHSL(0.18 + rand() * 0.06, 0.35, 0.75 + rand() * 0.25));
    }
  }
  grass.count = nb;
  grass.receiveShadow = shadows;
  grass.computeBoundingSphere();
  g.add(grass);

  // Flowers and shrubs
  const bushes = new InstancedMesh(new DodecahedronGeometry(0.7, 0), new MeshStandardMaterial({ flatShading: true, roughness: 0.9 }), 220);
  const flowerColors = ["#c1121f", "#fdf0d5", "#6f8b4f", "#ffd27a", "#6f8b4f"].map((c) => new Color(c));
  let nf = 0;
  for (let guard = 0; nf < 220 && guard < 5000; guard++) {
    const a = rand() * Math.PI * 2;
    const d = 11 + rand() * (ISLAND_RADIUS - 21);
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    if (roadDist(x, z) < 1.4 || blocked(x, z, 1.5) || statics.some((s) => Math.hypot(s.x - x, s.z - z) < s.r + 1.2)) continue;
    const s = 0.35 + rand() * 0.5;
    tmp.position.set(x, heightAt(x, z) + s * 0.4, z);
    tmp.rotation.set(rand() * 3, rand() * 3, 0);
    tmp.scale.setScalar(s);
    tmp.updateMatrix();
    bushes.setMatrixAt(nf, tmp.matrix);
    bushes.setColorAt(nf++, flowerColors[Math.floor(rand() * flowerColors.length)]);
  }
  bushes.count = nf;
  bushes.castShadow = shadows;
  bushes.computeBoundingSphere();
  g.add(bushes);

  // Rocks along the shoreline
  const rocks = new InstancedMesh(new DodecahedronGeometry(1, 0), new MeshStandardMaterial({ color: "#b9a58a", flatShading: true, roughness: 1 }), 72);
  let nr = 0;
  for (let guard = 0; nr < 72 && guard < 400; guard++) {
    const a = rand() * Math.PI * 2;
    const d = ISLAND_RADIUS - 2 + rand() * 6;
    const s = 0.6 + rand() * 1.7;
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    if (blocked(x, z, s)) continue; // the pier
    tmp.position.set(x, heightAt(x, z) - 0.2, z);
    tmp.rotation.set(rand() * 3, rand() * 3, rand() * 3);
    tmp.scale.set(s, s * 0.7, s);
    tmp.updateMatrix();
    rocks.setMatrixAt(nr++, tmp.matrix);
  }
  rocks.count = nr;
  rocks.castShadow = shadows;
  rocks.receiveShadow = true;
  rocks.computeBoundingSphere();
  g.add(rocks);

  // Street lamps: pole + arm, a bulb, and a pool of light on the road at night
  const poleGeo = mergeGeometries([
    tint(new CylinderGeometry(0.1, 0.16, 4.6, 6).toNonIndexed().translate(0, 2.3, 0), "#003049"),
    tint(new BoxGeometry(1.5, 0.12, 0.12).toNonIndexed().translate(-0.7, 4.5, 0), "#003049"),
  ]);
  const poles = new InstancedMesh(poleGeo, new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.6 }), lamps.length);
  const bulbMat = new MeshBasicMaterial({ color: "#8a8f99" });
  const bulbs = new InstancedMesh(new SphereGeometry(0.26, 10, 8), bulbMat, lamps.length);
  const poolMat = new MeshBasicMaterial({ map: glowTexture(), transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false });
  const pools = new InstancedMesh(new CircleGeometry(4.6, 24), poolMat, lamps.length);
  lamps.forEach(({ x, z, a, y: base }, i) => {
    const y = base ?? heightAt(x, z);
    tmp.position.set(x, y, z);
    tmp.rotation.set(0, -a, 0); // arm points back towards the road
    tmp.scale.setScalar(1);
    tmp.updateMatrix();
    poles.setMatrixAt(i, tmp.matrix);
    const bx = x - Math.cos(a) * 1.4;
    const bz = z - Math.sin(a) * 1.4;
    tmp.position.set(bx, y + 4.35, bz);
    tmp.updateMatrix();
    bulbs.setMatrixAt(i, tmp.matrix);
    tmp.position.set(bx, (base ?? heightAt(bx, bz)) + 0.06, bz);
    tmp.rotation.set(-Math.PI / 2, 0, 0);
    tmp.updateMatrix();
    pools.setMatrixAt(i, tmp.matrix);
    statics.push({ x, z, r: 0.3 });
  });
  poles.castShadow = shadows;
  pools.renderOrder = 2;
  for (const m of [poles, bulbs, pools]) m.computeBoundingSphere();
  g.add(poles, bulbs, pools);

  const dim = new Color("#8a8f99");
  const lit = new Color("#ffe2a8");
  return {
    group: g,
    /** 0 = daylight, 1 = full night */
    setNight(k: number) {
      bulbMat.color.copy(dim).lerp(lit, Math.min(1, k * 1.5));
      poolMat.opacity = k * 0.55;
    },
  };
}
