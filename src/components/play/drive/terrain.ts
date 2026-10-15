import {
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshLambertMaterial,
  MeshStandardMaterial,
  Points,
  PointsMaterial,
  RingGeometry,
  Shape,
  ShaderMaterial,
  SphereGeometry,
  UniformsLib,
  UniformsUtils,
  Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { flatSpots, ISLAND_RADIUS, RAMP, ramps, ROAD_RADIUS } from "./world";

// The island's shape, shared by the renderer and the physics: rolling hills
// that flatten out under the road, the plaza and every landmark, sloping
// down to a beach and into the sea. Plus the sea, sky, stars and clouds.

const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

export const SEA_LEVEL = -0.55;

/** Ground height of the island at (x, z), without ramps. */
export function heightAt(x: number, z: number) {
  const r = Math.hypot(x, z);
  const n = 1.6 * Math.sin(x * 0.09 + 1.3) * Math.cos(z * 0.08 - 0.7) + 0.9 * Math.sin(x * 0.17 - z * 0.13 + 2) + 0.5 * Math.cos(x * 0.23 + z * 0.21);
  let hills = Math.max(0, n + 0.5) * 1.55;
  hills *= smooth(4.6, 10, Math.abs(r - ROAD_RADIUS)); // road
  hills *= smooth(10.5, 17, r); // plaza
  for (const [fx, fz, fr] of flatSpots) hills *= smooth(fr, fr + 6, Math.hypot(x - fx, z - fz));
  hills *= 1 - smooth(ISLAND_RADIUS - 15, ISLAND_RADIUS - 6, r); // fades to the beach
  const beach = -smooth(ISLAND_RADIUS - 5, ISLAND_RADIUS + 7, r) * 2.6;
  return hills + beach;
}

/** Height of a ramp at (x, z), or 0 off every ramp. */
export function rampHeight(x: number, z: number) {
  for (const rp of ramps) {
    const dx = x - rp.x;
    const dz = z - rp.z;
    // u runs along the road (the tangent), w across it.
    const u = -dx * Math.sin(rp.angle) + dz * Math.cos(rp.angle);
    const w = dx * Math.cos(rp.angle) + dz * Math.sin(rp.angle);
    if (Math.abs(w) > RAMP.width / 2) continue;
    const a = Math.abs(u) - RAMP.top / 2;
    if (a <= 0) return RAMP.height;
    if (a < RAMP.slope) return RAMP.height * (1 - a / RAMP.slope);
  }
  return 0;
}

/** What the jeepney's wheels stand on. */
export const groundAt = (x: number, z: number) => Math.max(heightAt(x, z), rampHeight(x, z));

const tint = (geo: BufferGeometry, color: string) => {
  const c = new Color(color);
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) arr.set([c.r, c.g, c.b], i * 3);
  geo.setAttribute("color", new BufferAttribute(arr, 3));
  return geo;
};

/** The island itself: a faceted, vertex-coloured disc that follows heightAt. */
export function buildTerrain(detail: number) {
  const geo = new RingGeometry(0.01, ISLAND_RADIUS + 14, Math.round(140 * detail), Math.round(56 * detail)).toNonIndexed();
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const meadow = new Color("#c7cf93");
  const grass = new Color("#a9b973");
  const hill = new Color("#d6d29a");
  const sand = new Color("#f1d7a6");
  const wet = new Color("#cdb68a");
  const c = new Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = heightAt(x, z);
    pos.setY(i, h);
    const r = Math.hypot(x, z);
    const n = Math.sin(x * 0.7) * Math.cos(z * 0.6) * 0.5 + Math.sin(x * 2.3 + z * 1.7) * 0.25;
    c.copy(meadow).lerp(grass, Math.max(0, Math.min(1, 0.5 + n)));
    c.lerp(hill, Math.min(1, Math.max(0, h - 2.5) / 3));
    const beach = smooth(ISLAND_RADIUS - 11 + n * 2, ISLAND_RADIUS - 7 + n * 2, r);
    c.lerp(sand, beach);
    if (h < SEA_LEVEL + 0.2) c.copy(wet);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute("color", new BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const m = new Mesh(geo, new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 }));
  m.receiveShadow = true;
  return m;
}

/** The two tabletop ramps, in ember with paper chevrons. */
export function buildRamps() {
  const g = new Group();
  const half = RAMP.top / 2 + RAMP.slope;
  const profile = new Shape();
  profile.moveTo(-half, 0);
  profile.lineTo(-RAMP.top / 2, RAMP.height);
  profile.lineTo(RAMP.top / 2, RAMP.height);
  profile.lineTo(half, 0);
  profile.closePath();
  const geo = new ExtrudeGeometry(profile, { depth: RAMP.width, bevelEnabled: false });
  geo.translate(0, 0, -RAMP.width / 2);
  const sides = new MeshStandardMaterial({ color: "#003049", flatShading: true, roughness: 0.8 });
  const top = new MeshStandardMaterial({ color: "#c1121f", flatShading: true, roughness: 0.6 });
  const stripe = new MeshStandardMaterial({ color: "#fdf0d5", roughness: 0.6 });
  const barGeo = new ExtrudeGeometry(new Shape().moveTo(0, 0).lineTo(0.35, 0).lineTo(0.35, 0.03).lineTo(0, 0.03).closePath(), { depth: RAMP.width * 0.8, bevelEnabled: false });
  barGeo.translate(-0.175, 0, -RAMP.width * 0.4);
  for (const rp of ramps) {
    const ramp = new Mesh(geo, [sides, top]);
    ramp.castShadow = ramp.receiveShadow = true;
    const holder = new Group();
    holder.add(ramp);
    // Chevrons on both slopes
    for (const side of [-1, 1])
      for (let i = 0; i < 3; i++) {
        const t = (i + 0.7) / 3.4;
        const u = side * (RAMP.top / 2 + RAMP.slope * t);
        const y = RAMP.height * (1 - t) + 0.03;
        const bar = new Mesh(barGeo, stripe);
        bar.position.set(u, y, 0);
        bar.rotation.z = -side * Math.atan(RAMP.height / RAMP.slope);
        holder.add(bar);
      }
    holder.position.set(rp.x, 0, rp.z);
    // Local x runs along the road tangent.
    holder.rotation.y = -(rp.angle + Math.PI / 2);
    g.add(holder);
  }
  return g;
}

/* ─────────────────────────── sea ─────────────────────────── */

export function buildSea(detail: number) {
  const inner = ISLAND_RADIUS - 10;
  const outer = 460;
  const geo = new RingGeometry(inner, outer, Math.round(150 * detail), Math.round(46 * detail));
  // Pack rings close to the shore, where the waves are seen up close.
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const r = Math.hypot(x, y);
    const t = Math.min(1, Math.max(0, (r - inner) / (outer - inner)));
    const r2 = inner + (outer - inner) * Math.pow(t, 2.6);
    p.setXY(i, (x / r) * r2, (y / r) * r2);
  }
  geo.rotateX(-Math.PI / 2);
  const uniforms = UniformsUtils.merge([
    UniformsLib.fog,
    {
      uTime: { value: 0 },
      uDeep: { value: new Color("#3f7ea6") },
      uShallow: { value: new Color("#8fd0d8") },
      uFoam: { value: new Color("#fffaf0") },
      uSky: { value: new Color("#cfe3ee") },
      uSunColor: { value: new Color("#fff1d6") },
      uSunDir: { value: new Vector3(0.5, 0.7, 0.3).normalize() },
      uIslandR: { value: ISLAND_RADIUS },
    },
  ]);
  const mat = new ShaderMaterial({
    uniforms,
    fog: true,
    vertexShader: /* glsl */ `
      uniform float uTime;
      varying vec3 vWorld;
      #include <fog_pars_vertex>
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        float r = length(wp.xz);
        float amp = 0.07 + 0.2 * smoothstep(70.0, 120.0, r) * (1.0 - smoothstep(220.0, 380.0, r));
        wp.y += (sin(wp.x * 0.13 + uTime * 1.1) + sin(wp.z * 0.16 + wp.x * 0.05 + uTime * 0.85) + 0.5 * sin((wp.x + wp.z) * 0.31 + uTime * 1.7)) * amp;
        vWorld = wp.xyz;
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uIslandR;
      uniform vec3 uDeep, uShallow, uFoam, uSky, uSunColor, uSunDir;
      varying vec3 vWorld;
      #include <common>
      #include <fog_pars_fragment>
      void main() {
        vec3 n = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
        if (n.y < 0.0) n = -n;
        float r = length(vWorld.xz);
        vec3 col = mix(uDeep, uShallow, 1.0 - smoothstep(uIslandR - 4.0, uIslandR + 26.0, r));
        float band = uIslandR - 1.5 + sin(uTime * 0.9 + atan(vWorld.z, vWorld.x) * 7.0) * 0.9;
        col = mix(col, uFoam, smoothstep(2.4, 0.0, abs(r - band)) * 0.8);
        vec3 v = normalize(cameraPosition - vWorld);
        float spec = pow(max(dot(n, normalize(v + uSunDir)), 0.0), 120.0);
        col += uSunColor * spec * 1.2;
        col = mix(col, uSky, pow(1.0 - max(dot(n, v), 0.0), 4.0) * 0.45);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
  const m = new Mesh(geo, mat);
  m.position.y = SEA_LEVEL;
  return { mesh: m, uniforms: mat.uniforms };
}

/* ─────────────────────────── sky ─────────────────────────── */

export function buildSky() {
  const uniforms = {
    uTop: { value: new Color("#7fb3d5") },
    uHorizon: { value: new Color("#fdf0d5") },
    uBottom: { value: new Color("#f1d7a6") },
    uSunColor: { value: new Color("#fff1d6") },
    uSunDir: { value: new Vector3(0.5, 0.7, 0.3).normalize() },
    uSunSize: { value: 1 },
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
      uniform vec3 uTop, uHorizon, uBottom, uSunColor, uSunDir;
      uniform float uSunSize;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        vec3 col = mix(uHorizon, uTop, smoothstep(0.0, 0.5, d.y));
        col = mix(col, uBottom, smoothstep(0.0, -0.25, d.y));
        float s = max(dot(d, uSunDir), 0.0);
        col += uSunColor * (smoothstep(0.9993 - 0.0006 * uSunSize, 0.9997, s) * 2.0 + pow(s, 12.0) * 0.35);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const m = new Mesh(new SphereGeometry(300, 32, 16), mat);
  m.renderOrder = -1;
  m.frustumCulled = false;
  return { mesh: m, uniforms };
}

export function buildStars(count: number) {
  const pos = new Float32Array(count * 3);
  let seed = 4242;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  for (let i = 0; i < count; i++) {
    const a = rand() * Math.PI * 2;
    const y = 0.08 + rand() * 0.92;
    const r = Math.sqrt(1 - y * y);
    pos.set([Math.cos(a) * r * 280, y * 280, Math.sin(a) * r * 280], i * 3);
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(pos, 3));
  const mat = new PointsMaterial({ color: "#fff6e0", size: 1.7, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false });
  const pts = new Points(geo, mat);
  pts.frustumCulled = false;
  return pts;
}

/** Puffy low-poly clouds drifting high over the island. */
export function buildClouds(count: number) {
  const g = new Group();
  let seed = 99;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  // Self-lit enough that their undersides stay cloud-white instead of turning brown
  const mat = new MeshLambertMaterial({ color: "#ffffff", emissive: "#fff3e0", emissiveIntensity: 0.6, flatShading: true, fog: false, vertexColors: true });
  for (let i = 0; i < count; i++) {
    const parts: BufferGeometry[] = [];
    const n = 4 + Math.floor(rand() * 3);
    for (let k = 0; k < n; k++) {
      const s = 3 + rand() * 4;
      const p = new SphereGeometry(s, 7, 5).toNonIndexed();
      p.scale(1, 0.62, 1);
      p.translate((k - n / 2) * 4.2 + rand() * 2, rand() * 2, rand() * 3);
      parts.push(tint(p, k % 2 ? "#ffffff" : "#fff6e8"));
    }
    const cloud = new Mesh(mergeGeometries(parts), mat);
    const a = rand() * Math.PI * 2;
    const d = 70 + rand() * 120;
    cloud.position.set(Math.cos(a) * d, 46 + rand() * 26, Math.sin(a) * d);
    cloud.rotation.y = rand() * Math.PI;
    g.add(cloud);
  }
  g.userData.setNight = (k: number) => {
    mat.emissiveIntensity = 0.6 - k * 0.5;
    mat.color.setScalar(1 - k * 0.65);
  };
  return g;
}

export { tint };
