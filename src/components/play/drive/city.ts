import {
  BackSide,
  BoxGeometry,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  Float32BufferAttribute,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshLambertMaterial,
  Object3D,
  Points,
  PointsMaterial,
  Shape,
  ShapeGeometry,
  ShaderMaterial,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  UniformsLib,
  UniformsUtils,
  Vector3,
} from "three";
import type { Glows } from "./glow";
import { Batch, LIGHTS, rng, worldMaterial } from "./kit";
import { districts, inWater, landmarks, locate, pitDist, SET, wallOffset, water, WATER_LEVEL } from "./track";

// The city around the circuit: a night sky with the city's glow on the
// horizon, a bay that reflects every light on the skyline, blocks of towers
// with procedurally lit windows (one instanced draw call), and the skyline's
// set pieces: three hotel towers under a sky park, the observation wheel,
// the lotus museum, the domes, the floating platform and the helix
// footbridge. Real names are left out; the shapes do the talking.

/* ───────────── windows ───────────── */

/** Lambert with windows drawn from world position: dark glass by day, a random warm/cool glow at night. */
export function windowMaterial() {
  const mat = new MeshLambertMaterial({ color: "#ffffff" });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uFlood = LIGHTS.uFlood;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vWPos;\nvarying vec3 vWNormal;")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vec4 wPos = vec4(transformed, 1.0);
        vec3 wNrm = objectNormal;
        #ifdef USE_INSTANCING
          wPos = instanceMatrix * wPos;
          wNrm = mat3(instanceMatrix) * wNrm;
        #endif
        vWPos = (modelMatrix * wPos).xyz;
        vWNormal = normalize(mat3(modelMatrix) * wNrm);`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform float uFlood;
        varying vec3 vWPos;
        varying vec3 vWNormal;
        float wHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        if (abs(vWNormal.y) < 0.5 && vWPos.y > 3.0) {
          float h = abs(vWNormal.x) > abs(vWNormal.z) ? vWPos.z : vWPos.x;
          vec2 g = vec2(h / 3.4, vWPos.y / 3.8);
          vec2 id = floor(g);
          vec2 f = fract(g);
          float win = step(0.16, f.x) * step(f.x, 0.84) * step(0.22, f.y) * step(f.y, 0.86);
          float seed = wHash(id + floor(vWPos.xz / 40.0) * 13.7);
          float on = step(0.42, seed);
          vec3 warm = mix(vec3(1.0, 0.76, 0.46), vec3(0.72, 0.86, 1.0), step(0.78, wHash(id * 1.7 + 3.1)));
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.18, 0.23, 0.3), win * 0.65);
          totalEmissiveRadiance += win * on * warm * min(uFlood, 1.0) * (0.55 + 0.45 * seed);
        }`,
      );
  };
  mat.customProgramCacheKey = () => "windows";
  return mat;
}

/* ───────────── sky and stars ───────────── */

export function buildSky() {
  const uniforms = {
    uTop: { value: new Color("#050b18") },
    uHorizon: { value: new Color("#2a2f4a") },
    uGlow: { value: new Color("#6a4434") },
    uSunColor: { value: new Color("#dfe6ff") },
    uSunDir: { value: new Vector3(-0.4, 0.5, 0.6).normalize() },
    uSunSize: { value: 2 },
  };
  const mat = new ShaderMaterial({
    uniforms,
    side: BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = p.xyww;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop, uHorizon, uGlow, uSunColor, uSunDir;
      uniform float uSunSize;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        vec3 col = mix(uHorizon, uTop, smoothstep(0.0, 0.45, d.y));
        // The city's own light, low on the horizon
        col += uGlow * pow(1.0 - clamp(abs(d.y), 0.0, 1.0), 10.0);
        float s = max(dot(d, uSunDir), 0.0);
        col += uSunColor * (smoothstep(0.9993 - 0.0006 * uSunSize, 0.9997, s) * 2.0 + pow(s, 14.0) * 0.3 / uSunSize);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const m = new Mesh(new SphereGeometry(2000, 32, 16), mat);
  m.renderOrder = -1;
  m.frustumCulled = false;
  return { mesh: m, uniforms };
}

export function buildStars(count: number) {
  const pos = new Float32Array(count * 3);
  const rand = rng(4242);
  for (let i = 0; i < count; i++) {
    const a = rand() * Math.PI * 2;
    const y = 0.12 + rand() * 0.88;
    const r = Math.sqrt(1 - y * y);
    pos.set([Math.cos(a) * r * 1800, y * 1800, Math.sin(a) * r * 1800], i * 3);
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(pos, 3));
  const mat = new PointsMaterial({ color: "#fff6e0", size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false });
  const pts = new Points(geo, mat);
  pts.frustumCulled = false;
  return pts;
}

/* ───────────── the bay ───────────── */

/** Lights that the water reflects: [x, y, z, sharpness], colour, strength. */
export interface Reflected {
  pos: Vector3;
  sharp: number;
  color: Color;
}

export function buildWater(lights: Reflected[], maxLights: number) {
  const shape = new Shape();
  water.forEach(([x, z], k) => (k ? shape.lineTo(x, -z) : shape.moveTo(x, -z)));
  shape.closePath();
  const geo = new ShapeGeometry(shape);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, WATER_LEVEL, 0);
  // The brightest lights first: low tiers keep only the top few
  lights = lights.slice().sort((a, b) => b.color.r + b.color.g + b.color.b - (a.color.r + a.color.g + a.color.b));
  const n = Math.max(1, Math.min(maxLights, lights.length));
  const uniforms = UniformsUtils.merge([
    UniformsLib.fog,
    {
      uTime: { value: 0 },
      uDeep: { value: new Color("#06121f") },
      uTop: { value: new Color("#050b18") },
      uHorizon: { value: new Color("#2a2f4a") },
      uGlow: { value: new Color("#6a4434") },
      uNight: { value: 1 },
      uSunColor: { value: new Color("#fff1d6") },
      uSunDir: { value: new Vector3(0.5, 0.7, 0.3).normalize() },
      uLightPos: { value: lights.slice(0, n).map((l) => l.pos.clone()) },
      uLightSharp: { value: lights.slice(0, n).map((l) => l.sharp) },
      uLightCol: { value: lights.slice(0, n).map((l) => l.color.clone()) },
    },
  ]);
  // Fill missing slots so the arrays are the declared length
  while (uniforms.uLightPos.value.length < n) {
    uniforms.uLightPos.value.push(new Vector3(0, -100, 0));
    uniforms.uLightSharp.value.push(100);
    uniforms.uLightCol.value.push(new Color(0));
  }
  const mat = new ShaderMaterial({
    uniforms,
    fog: true,
    defines: { NL: n },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      #include <fog_pars_vertex>
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uNight;
      uniform vec3 uDeep, uTop, uHorizon, uGlow, uSunColor, uSunDir;
      uniform vec3 uLightPos[NL];
      uniform float uLightSharp[NL];
      uniform vec3 uLightCol[NL];
      varying vec3 vWorld;
      #include <common>
      #include <fog_pars_fragment>
      void main() {
        vec2 p = vWorld.xz;
        float t = uTime;
        vec3 n = normalize(vec3(
          sin(p.x * 0.11 + t * 0.9) * 0.45 + sin(p.x * 0.37 + p.y * 0.23 - t * 1.6) * 0.3 + sin(p.y * 1.1 + p.x * 0.4 + t * 2.4) * 0.16,
          5.0,
          cos(p.y * 0.09 - t * 0.7) * 0.45 + sin(p.y * 0.41 + p.x * 0.19 + t * 1.3) * 0.3 + cos(p.x * 0.9 - p.y * 0.5 - t * 2.1) * 0.16));
        vec3 V = normalize(cameraPosition - vWorld);
        vec3 R = reflect(-V, n);
        vec3 sky = mix(uHorizon, uTop, smoothstep(0.0, 0.45, R.y)) + uGlow * pow(1.0 - clamp(R.y, 0.0, 1.0), 10.0);
        float fres = 0.05 + 0.95 * pow(1.0 - max(dot(n, V), 0.0), 5.0);
        vec3 col = mix(uDeep, sky, fres);
        col += uSunColor * pow(max(dot(R, uSunDir), 0.0), 220.0) * (1.0 - uNight) * 1.5;
        for (int i = 0; i < NL; i++) {
          vec3 L = normalize(uLightPos[i] - vWorld);
          col += uLightCol[i] * pow(max(dot(R, L), 0.0), uLightSharp[i]) * uNight;
        }
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
  return { mesh: new Mesh(geo, mat), uniforms: mat.uniforms };
}

/* ───────────── trees ───────────── */

function rainTree() {
  const b = new Batch();
  b.add(new CylinderGeometry(0.3, 0.45, 3.4, 6).translate(0, 1.7, 0), "#5b4434", 0.25);
  for (const [x, y, z, s, c] of [
    [0, 4.6, 0, 2.6, "#3f6a3c"],
    [1.8, 4.0, 0.6, 1.8, "#4f7c45"],
    [-1.6, 4.1, -0.7, 1.9, "#365f36"],
    [0.4, 5.6, -0.4, 1.7, "#4a7742"],
  ] as const)
    b.add(new IcosahedronGeometry(s, 0).scale(1.2, 0.62, 1.2).translate(x, y, z), c, 0.12);
  return b.build();
}
function palm() {
  const b = new Batch();
  for (let i = 0; i < 5; i++) b.add(new CylinderGeometry(0.22 - i * 0.02, 0.26 - i * 0.02, 1.6, 6).translate(i * i * 0.04, 0.8 + i * 1.6, 0), i % 2 ? "#7a5a3c" : "#8a6a48", 0.2);
  for (let k = 0; k < 7; k++) {
    const f = new ConeGeometry(0.5, 4.2, 3).rotateZ(Math.PI / 2 + 0.5).translate(2, 0, 0);
    b.add(f.rotateY((k / 7) * Math.PI * 2).translate(0.64, 8, 0), k % 2 ? "#4e7a3e" : "#5e8a48", 0.12);
  }
  return b.build();
}

/* ───────────── the city ───────────── */

export function buildCity(opts: { tier: 0 | 1 | 2; glows: Glows; shadows: boolean }) {
  const { glows, tier } = opts;
  const group = new Group();
  const rand = rng(77);
  const winMat = windowMaterial();
  const mat = worldMaterial();
  const reflected: Reflected[] = [];
  /** A light the bay reflects (sharp > 0: higher is a tighter glint) and/or a glow sprite. */
  const light = (x: number, y: number, z: number, color: string, sharp = 1200, glowSize = 0, brightness = 1) => {
    if (sharp > 0) reflected.push({ pos: new Vector3(x, y, z), sharp, color: new Color(color).multiplyScalar(brightness) });
    if (glowSize) glows.add(x, y, z, glowSize, color, Math.min(1, brightness));
  };

  /* Set pieces first: the blocks keep clear of them */
  const clear: [number, number, number][] = [
    [SET.towers.x, SET.towers.z, 190],
    [SET.lotus.x, SET.lotus.z, 60],
    [SET.wheel.x, SET.wheel.z, 70],
    [SET.domes.x, SET.domes.z, 70],
    ...landmarks.map((l): [number, number, number] => [l.x, l.z, 30]),
  ];

  /* ── three towers and the sky park ── */
  {
    const b = new Batch();
    const { x, z } = SET.towers;
    const H = 150;
    for (let k = -1; k <= 1; k++) {
      const tx = x + k * 72;
      // Two slabs per tower: one upright, one leaning in to meet it at the top
      b.add(new BoxGeometry(34, H, 18).translate(tx, H / 2, z + 6), "#9aa6b4");
      const lean = new BoxGeometry(34, H + 4, 16).translate(0, (H + 4) / 2, 0);
      lean.applyMatrix4(new Matrix4().makeRotationX(-0.075).setPosition(tx, 0, z - 18));
      b.add(lean, "#8c98a6");
      light(tx, H + 2, z - 14, "#ffe7c2", 2400, 0, 1.2);
    }
    const towers = new Mesh(b.build(), winMat);
    group.add(towers);
    // Sky park: a long deck over all three, cantilevered past the east tower
    const deck = new Batch();
    deck.add(new BoxGeometry(310, 7, 40).translate(x + 34, H + 5, z - 4), "#e8e4dc", 0.5);
    const bow = new CylinderGeometry(20, 20, 7, 20, 1, false, 0, Math.PI).rotateY(Math.PI / 2).translate(x + 189, H + 5, z - 4);
    deck.add(bow, "#e8e4dc", 0.5);
    deck.add(new BoxGeometry(320, 1.2, 42).translate(x + 34, H + 1.2, z - 4), "#5f7c9a", 1.6);
    deck.add(new BoxGeometry(150, 1.0, 6).translate(x - 10, H + 9, z - 18), "#5ec1d9", 1.2);
    for (let i = 0; i < 16; i++) deck.add(new DodecahedronGeometry(3, 0).translate(x - 100 + i * 17, H + 12, z + 10), "#4a7742", 0.3);
    group.add(new Mesh(deck.build(), mat));
    for (let i = 0; i <= 14; i++) light(x - 120 + i * 22, H + 1, z - 26, "#bfe2ff", 0, 3.5, 0.6);
    light(x + 34, H + 2, z - 20, "#9fd4ff", 700, 0, 0.9);
    light(x + 34, H * 0.55, z - 22, "#ffd9a0", 400, 0, 0.5);
    // The base podium along the water
    group.add(new Mesh(new BoxGeometry(300, 14, 70).translate(x, 7, z + 30), winMat));
  }

  /* ── the lotus museum ── */
  {
    const b = new Batch();
    const { x, z } = SET.lotus;
    b.add(new CylinderGeometry(16, 10, 10, 16).translate(x, 6, z), "#ece8df", 0.3);
    b.add(new CylinderGeometry(3, 3, 6, 8).translate(x, 1, z), "#8a8f97", 0.1);
    const petals = 10;
    for (let k = 0; k < petals; k++) {
      const a = (k / petals) * Math.PI * 2;
      const h = 26 + ((k * 7) % 5) * 4;
      const petal = new SphereGeometry(1, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(4.2, h, 3.2);
      petal.applyMatrix4(new Matrix4().makeRotationZ(-0.42 - (k % 3) * 0.06));
      petal.applyMatrix4(new Matrix4().makeRotationY(-a).setPosition(x + Math.cos(a) * 8, 9, z + Math.sin(a) * 8));
      b.add(petal, k % 2 ? "#f3f0e9" : "#e6e1d6", 0.45);
      // Light at the tip of each petal
      const tip = new Vector3(0, h, 0).applyMatrix4(new Matrix4().makeRotationZ(-0.42 - (k % 3) * 0.06)).applyMatrix4(new Matrix4().makeRotationY(-a));
      glows.add(x + Math.cos(a) * 8 + tip.x, 9 + tip.y, z + Math.sin(a) * 8 + tip.z, 2.5, "#ffe6c8", 0.7);
    }
    group.add(new Mesh(b.build(), mat));
    light(x, 30, z, "#ffd2e6", 900, 0, 0.7);
  }

  /* ── the observation wheel ── */
  const wheelRim = new Group();
  {
    const { x, z } = SET.wheel;
    const R = 56;
    const hub = R + 10;
    // Face the circuit: the wheel's plane contains the vertical and points across at the track
    const facing = Math.atan2(-90 - x, -300 - z);
    const base = new Batch();
    for (const s of [-1, 1])
      for (const sz of [-1, 1]) {
        const leg = new BoxGeometry(2.2, hub * 1.15, 2.2).translate(0, (hub * 1.15) / 2, 0);
        leg.applyMatrix4(new Matrix4().makeRotationZ(s * 0.3).multiply(new Matrix4().makeRotationX(sz * 0.12)));
        leg.applyMatrix4(new Matrix4().makeTranslation(s * 18, 0, sz * 8));
        base.add(leg, "#c9ccd1", 0.4);
      }
    base.add(new BoxGeometry(70, 12, 40).translate(0, 6, 0), "#4a5260", 0.6);
    base.add(new CylinderGeometry(3, 3, 22, 10).rotateX(Math.PI / 2).translate(0, hub, 0), "#c9ccd1", 0.5);
    const bm = new Mesh(base.build(), mat);
    bm.position.set(x, 0, z);
    bm.rotation.y = facing;
    group.add(bm);
    const rim = new Batch();
    rim.add(new TorusGeometry(R, 0.9, 6, 72).translate(0, 0, 3), "#dfe3e8", 1.0);
    rim.add(new TorusGeometry(R, 0.9, 6, 72).translate(0, 0, -3), "#dfe3e8", 1.0);
    for (let k = 0; k < 28; k++) {
      const a = (k / 28) * Math.PI * 2;
      rim.add(new BoxGeometry(0.25, R, 0.25).translate(0, R / 2, 0).rotateZ(a).translate(0, 0, k % 2 ? 3 : -3), "#b8bec6", 0.6);
      // Capsules hang outside the rim
      const cap = new SphereGeometry(2.6, 8, 6).scale(1.5, 1, 1.1);
      rim.add(cap.translate(Math.cos(a) * (R + 3), Math.sin(a) * (R + 3), 0), "#cfe8ff", 1.4);
    }
    wheelRim.add(new Mesh(rim.build(), mat));
    wheelRim.position.set(x, hub, z);
    wheelRim.rotation.y = facing;
    group.add(wheelRim);
    // Rim lights: evenly spaced, so they look right while the wheel turns
    const v = new Vector3();
    const m = new Matrix4().makeRotationY(facing).setPosition(x, hub, z);
    const count = tier ? 36 : 20;
    for (let k = 0; k < count; k++) {
      const a = (k / count) * Math.PI * 2;
      v.set(Math.cos(a) * R, Math.sin(a) * R, 0).applyMatrix4(m);
      glows.add(v.x, v.y, v.z, 3.2, k % 3 ? "#9fd0ff" : "#ff7a8a", 0.8);
    }
    light(x, hub + R * 0.6, z, "#a8d8ff", 800, 0, 0.8);
    light(x, hub - R * 0.4, z, "#ff8fa0", 800, 0, 0.6);
  }

  /* ── the domes ── */
  {
    const b = new Batch();
    for (const [dx, r] of [
      [-30, 26],
      [34, 22],
    ] as const) {
      const g = new SphereGeometry(r, 18, 9, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.25, 0.8, 1);
      b.add(g.translate(SET.domes.x + dx, 0, SET.domes.z), "#b9ac93", 0.32);
      // Spikes: little sunshades over the shell
      for (let k = 0; k < 40; k++) {
        const a = rand() * Math.PI * 2;
        const e = 0.15 + rand() * 1.2;
        const p = new Vector3(Math.cos(a) * Math.cos(e) * r * 1.25, Math.sin(e) * r * 0.8, Math.sin(a) * Math.cos(e) * r);
        b.add(new ConeGeometry(0.9, 2.6, 4).translate(0, 1.2, 0).rotateX(Math.PI / 2).lookAt(p.clone().normalize()).translate(SET.domes.x + dx + p.x, p.y, SET.domes.z + p.z), "#a59780", 0.25);
      }
      glows.add(SET.domes.x + dx, r * 0.85, SET.domes.z, 5, "#ffd9a8", 0.35);
    }
    group.add(new Mesh(b.build(), mat));
    light(SET.domes.x, 14, SET.domes.z, "#ffcf9a", 600, 0, 0.5);
  }

  /* ── the floating platform ── */
  {
    const f = SET.float;
    const b = new Batch();
    b.add(new BoxGeometry(f.w, 1.4, f.d).translate(f.x, WATER_LEVEL + 0.9, f.z), "#3e4652", 0.5);
    b.add(new BoxGeometry(f.w - 8, 0.05, 0.4).translate(f.x, WATER_LEVEL + 1.62, f.z), "#ecebe6", 0.9);
    b.add(new BoxGeometry(0.4, 0.05, f.d - 8).translate(f.x, WATER_LEVEL + 1.62, f.z), "#ecebe6", 0.9);
    for (const [sx, sz] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ]) {
      const px = f.x + (sx * f.w) / 2;
      const pz = f.z + (sz * f.d) / 2;
      b.add(new BoxGeometry(0.8, 26, 0.8).translate(px, 13, pz), "#6c7580", 0.2);
      b.add(new BoxGeometry(4, 2, 0.6).translate(px, 26, pz), "#fff3d6", 2.4);
      glows.add(px, 26, pz, 7, "#fff3d6", 0.9);
      light(px, 26, pz, "#fff0d0", 2000, 0, 1);
    }
    group.add(new Mesh(b.build(), mat));
  }

  /* ── the helix footbridge ── */
  {
    const { x, z0, z1 } = SET.bridge;
    const b = new Batch();
    b.add(new BoxGeometry(7, 0.8, z1 - z0).translate(x, 2.2, (z0 + z1) / 2), "#8e98a3", 0.4);
    const turns = (z1 - z0) / 16;
    for (const phase of [0, Math.PI]) {
      const pts: Vector3[] = [];
      for (let k = 0; k <= 160; k++) {
        const t = k / 160;
        const a = phase + t * turns * Math.PI * 2;
        pts.push(new Vector3(x + Math.cos(a) * 4.6, 6 + Math.sin(a) * 4.6, z0 + (z1 - z0) * t));
      }
      b.add(new TubeGeometry(new CatmullRomCurve3(pts), tier ? 360 : 200, 0.35, 5, false), "#dfe3e8", 0.9);
    }
    for (let k = 0; k <= 12; k++) glows.add(x, 9.5, z0 + ((z1 - z0) * k) / 12, 3, k % 2 ? "#ff8fb0" : "#9fe0ff", 0.6);
    group.add(new Mesh(b.build(), mat));
    light(x, 8, (z0 + z1) / 2, "#c7b3ff", 900, 0, 0.6);
  }

  /* ── city blocks: one instanced mesh, windows from the shader ── */
  {
    const max = [170, 300, 440][tier];
    const blockGeo = new BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
    const blocks = new InstancedMesh(blockGeo, winMat, max + 60);
    const o = new Object3D();
    const tones = ["#5a6878", "#46566a", "#7d8794", "#6a6258", "#3e4a5c", "#8b8f96", "#9aa3ad", "#57606b"].map((c) => new Color(c));
    let n = 0;
    const roofs: [number, number, number][] = [];
    const place = (x: number, z: number, w: number, d: number, h: number) => {
      if (n >= blocks.count) return;
      o.position.set(x, 0, z);
      o.rotation.set(0, 0, 0);
      o.scale.set(w, h, d);
      o.updateMatrix();
      blocks.setMatrixAt(n, o.matrix);
      blocks.setColorAt(n, tones[Math.floor(rand() * tones.length)]);
      n++;
      if (h > 60) roofs.push([x, h + 1, z]);
    };
    const free = (x: number, z: number, r: number) => {
      if (clear.some(([cx, cz, cr]) => Math.hypot(cx - x, cz - z) < cr + r)) return false;
      if (inWater(x, z) || inWater(x + r, z) || inWater(x - r, z) || inWater(x, z + r) || inWater(x, z - r)) return false;
      const h = locate(x, z);
      if (h.dist < wallOffset(h.i, h.d >= 0 ? 1 : -1) + 26 + r) return false;
      if (pitDist(x, z).d < 34 + r) return false;
      const g = SET.green;
      if (x > g.x0 - r && x < g.x1 + r && z > g.z0 - r && z < g.z1 + r) return false;
      return true;
    };
    // Shuffle the candidate lots across all districts, so a low cap still spreads out
    const lots: [number, number, number][] = [];
    districts.forEach((d, di) => {
      for (let x = d.x0; x < d.x1; x += 48) for (let z = d.z0; z < d.z1; z += 48) lots.push([x + 24, z + 24, di]);
    });
    for (let i = lots.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [lots[i], lots[j]] = [lots[j], lots[i]];
    }
    for (const [lx, lz, di] of lots) {
      if (n >= max) break;
      const tall = districts[di].tall;
      const w = 16 + rand() * 18;
      const d = 16 + rand() * 18;
      const x = lx + (rand() - 0.5) * 8;
      const z = lz + (rand() - 0.5) * 8;
      if (!free(x, z, Math.max(w, d) * 0.6)) continue;
      const h = 14 + Math.pow(rand(), 1.6) * 150 * tall;
      place(x, z, w, d, h);
      // A slimmer crown on some towers
      if (h > 70 && rand() < 0.5) place(x, z, w * 0.62, d * 0.62, h + 10 + rand() * 30);
    }
    // A far ring of towers: the rest of the city, always on the horizon
    const far = [24, 40, 56][tier];
    for (let k = 0; k < far; k++) {
      const a = (k / far) * Math.PI * 2 + rand() * 0.1;
      const r = 1150 + rand() * 250;
      const x = Math.cos(a) * r + 80;
      const z = Math.sin(a) * r + 150;
      place(x, z, 30 + rand() * 40, 30 + rand() * 40, 60 + rand() * 200);
    }
    blocks.count = n;
    blocks.computeBoundingSphere();
    group.add(blocks);
    // Red aviation lights on the tallest roofs
    roofs.slice(0, tier ? 40 : 18).forEach(([x, y, z]) => glows.add(x, y, z, 2.2, "#ff3b30", 0.8));
  }

  /* ── trees: rain trees in the parks and along the river, palms on the promenade ── */
  {
    const counts = [[50, 24], [110, 50], [190, 80]][tier];
    const trees = new InstancedMesh(rainTree(), mat, counts[0]);
    const palms = new InstancedMesh(palm(), mat, counts[1]);
    const o = new Object3D();
    const ok = (x: number, z: number) => {
      if (inWater(x, z)) return false;
      const h = locate(x, z);
      if (h.dist < wallOffset(h.i, h.d >= 0 ? 1 : -1) + 5) return false;
      if (pitDist(x, z).d < 8) return false;
      return !clear.some(([cx, cz, cr]) => Math.hypot(cx - x, cz - z) < cr * 0.6);
    };
    let n = 0;
    const g = SET.green;
    for (let guard = 0; n < trees.count && guard < 4000; guard++) {
      // Round the green, along the river banks and through the infield
      const pick = rand();
      let x: number;
      let z: number;
      if (pick < 0.5) {
        const t = rand();
        const side = Math.floor(rand() * 4);
        x = side < 2 ? g.x0 + (g.x1 - g.x0) * t : side === 2 ? g.x0 - 4 : g.x1 + 4;
        z = side >= 2 ? g.z0 + (g.z1 - g.z0) * t : side === 0 ? g.z0 - 4 : g.z1 + 4;
      } else {
        const w = water[Math.floor(rand() * water.length)];
        x = w[0] + (rand() - 0.5) * 40;
        z = w[1] + (rand() - 0.5) * 40;
      }
      if (!ok(x, z)) continue;
      o.position.set(x, 0, z);
      o.rotation.set(0, rand() * 6.28, 0);
      o.scale.setScalar(0.9 + rand() * 0.6);
      o.updateMatrix();
      trees.setMatrixAt(n++, o.matrix);
    }
    trees.count = n;
    n = 0;
    for (let guard = 0; n < palms.count && guard < 4000; guard++) {
      const k = Math.floor(rand() * water.length);
      const a = water[k];
      const b = water[(k + 1) % water.length];
      const t = rand();
      // Just inland of the quay
      const x = a[0] + (b[0] - a[0]) * t;
      const z = a[1] + (b[1] - a[1]) * t;
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      for (const side of [1, -1]) {
        const px = x + (-(b[1] - a[1]) / l) * 6 * side;
        const pz = z + ((b[0] - a[0]) / l) * 6 * side;
        if (!ok(px, pz) || n >= palms.count) continue;
        o.position.set(px, 0, pz);
        o.rotation.set(0, rand() * 6.28, 0);
        o.scale.setScalar(0.9 + rand() * 0.4);
        o.updateMatrix();
        palms.setMatrixAt(n++, o.matrix);
      }
    }
    palms.count = n;
    for (const t of [trees, palms]) {
      t.computeBoundingSphere();
      t.castShadow = opts.shadows;
      group.add(t);
    }
  }

  // A few reflections of the floodlit circuit along the waterfront
  light(SET.float.x - 120, 16, SET.float.z - 70, "#fff0d0", 1500, 0, 0.7);
  light(SET.float.x + 120, 16, SET.float.z - 90, "#fff0d0", 1500, 0, 0.7);
  light(SET.domes.x - 160, 16, SET.domes.z - 50, "#fff0d0", 1500, 0, 0.6);

  return {
    group,
    reflected,
    update(t: number) {
      wheelRim.rotation.z = t * 0.02;
    },
  };
}
