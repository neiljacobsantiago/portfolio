import {
  BackSide,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Group,
  HalfFloatType,
  InstancedMesh,
  LinearFilter,
  LinearMipmapLinearFilter,
  Matrix3,
  Matrix4,
  Mesh,
  Object3D,
  PerspectiveCamera,
  Plane,
  Points,
  PointsMaterial,
  Quaternion,
  Shape,
  ShapeGeometry,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
  TubeGeometry,
  UniformsLib,
  UniformsUtils,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderTarget,
} from "three";
import type { Glows } from "./glow";
import { Batch, bevelBox, C, KIT, LIGHTS, litMaterial, rng, worldMaterial } from "./kit";
import { type Building, buildings, farTowers, STREETS } from "./layout";
import { clearance, inWater, locate, pitDist, samples, SET, wallOffset, water, WATER_LEVEL } from "./track";

// The city around the circuit:
//   · a night sky with the city's glow and a lit cloud deck on the horizon,
//     and stars
//   · towers, offices, flats and shophouses on a street grid, built from
//     the plan: podiums, setbacks, crowns, rooftop plant, every facade drawn
//     from one canvas atlas of window bays (glass curtain walls, punched
//     offices, balconies, colonial arches, shopfronts) with lit interiors
//     that vary bay by bay and floor by floor; one draw call for them all
//   · the skyline's set pieces: three hotel towers under a sky park, the
//     observation wheel, the lotus museum, the spiky twin domes, the floating
//     platform, the helix footbridge and the colonial quarter by the river
//   · the ground: streets, pavements and parks painted from the plan, with
//     street lights and the floodlights' spill baked into a glow map
//   · a bay that reflects the skyline (a mirror pass on high, an analytic
//     sky and light glints on every tier)
// Real names are left out; the shapes do the talking.

/* ───────────── the facade atlas ───────────── */

/** Atlas rows: 0 teal glass, 1 bronze glass, 2 ribbon office, 3 punched office, 4 balconies, 5 flats, 6 colonial/shophouse, 7 shopfront. */
const BAY: [number, number][] = [
  [3.0, 3.8],
  [3.0, 3.8],
  [3.4, 3.8],
  [3.2, 3.6],
  [3.6, 3.0],
  [3.2, 3.0],
  [4.0, 4.2],
  [6.0, 5.0],
];
const STYLE_ROUGH = [0.12, 0.16, 0.5, 0.7, 0.75, 0.78, 0.85, 0.35];

/** Window bays: albedo and the light behind each window, 8 lighting variants per style. */
function facadeAtlas(size: number) {
  const cell = size / 8;
  const alb = document.createElement("canvas");
  const glo = document.createElement("canvas");
  alb.width = alb.height = glo.width = glo.height = size;
  const a = alb.getContext("2d")!;
  const g = glo.getContext("2d")!;
  g.fillStyle = "#000";
  g.fillRect(0, 0, size, size);
  const rand = rng(5150);
  const S = (v: number) => (v / 128) * cell;
  for (let row = 0; row < 8; row++)
    for (let v = 0; v < 8; v++) {
      const x0 = v * cell;
      const y0 = row * cell;
      const rect = (ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number) => {
        ctx.fillStyle = color;
        ctx.fillRect(x0 + S(x), y0 + S(y), S(w), S(h));
      };
      // The window opening for this style, and its wall
      let win: [number, number, number, number];
      let wall: string;
      let glass: string;
      switch (row) {
        case 0:
          wall = "#33505f";
          glass = "#2a4b5e";
          win = [3, 12, 122, 112];
          break;
        case 1:
          wall = "#2c2824";
          glass = "#3d352d";
          win = [3, 12, 122, 112];
          break;
        case 2:
          wall = "#bdb6aa";
          glass = "#26313c";
          win = [0, 52, 128, 64];
          break;
        case 3:
          wall = "#d8d2c6";
          glass = "#283340";
          win = [26, 28, 76, 80];
          break;
        case 4:
          wall = "#e6e0d6";
          glass = "#2c3640";
          win = [10, 24, 76, 88];
          break;
        case 5:
          wall = "#cfd6dc";
          glass = "#2a343e";
          win = [22, 34, 84, 66];
          break;
        case 6:
          wall = "#efe8da";
          glass = "#2d3134";
          win = [38, 26, 52, 92];
          break;
        default:
          wall = "#2a2e35";
          glass = "#20262d";
          win = [6, 30, 116, 94];
      }
      rect(a, wall, 0, 0, 128, 128);
      // Light: off, blinds, warm, dim warm, office cool, curtains, dim cool, bright warm with furniture
      const lit = [0, 0.08, 1, 0.55, 0.95, 0.7, 0.5, 1.15][v];
      const cool = v === 4 || v === 6 || (row <= 3 && v === 2 && rand() < 0.6);
      const [wx, wy, ww, wh] = win;
      const arch = row === 6;
      const shape = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
        ctx.beginPath();
        if (arch) {
          const r = w / 2;
          ctx.moveTo(x0 + S(x), y0 + S(y + h));
          ctx.lineTo(x0 + S(x), y0 + S(y + r));
          ctx.arc(x0 + S(x + r), y0 + S(y + r), S(r), Math.PI, 0);
          ctx.lineTo(x0 + S(x + w), y0 + S(y + h));
          ctx.closePath();
        } else ctx.rect(x0 + S(x), y0 + S(y), S(w), S(h));
      };
      a.fillStyle = v === 1 ? "#8d939a" : glass;
      shape(a, wx, wy, ww, wh);
      a.fill();
      if (lit > 0.05) {
        const grad = g.createLinearGradient(0, y0 + S(wy), 0, y0 + S(wy + wh));
        const top = cool ? `rgba(225,240,255,${lit})` : `rgba(255,222,168,${lit})`;
        const bot = cool ? `rgba(150,195,240,${lit * 0.75})` : `rgba(255,170,95,${lit * 0.7})`;
        grad.addColorStop(0, top);
        grad.addColorStop(1, bot);
        g.fillStyle = grad;
        shape(g, wx, wy, ww, wh);
        g.fill();
        // Curtains half drawn, furniture against the light
        if (v === 5) {
          g.fillStyle = "rgba(60,40,30,0.8)";
          g.fillRect(x0 + S(wx), y0 + S(wy), S(ww * 0.3), S(wh));
          g.fillRect(x0 + S(wx + ww * 0.72), y0 + S(wy), S(ww * 0.28), S(wh));
        }
        if (v === 7) {
          g.fillStyle = "rgba(20,14,10,0.85)";
          g.fillRect(x0 + S(wx + ww * 0.1), y0 + S(wy + wh * 0.68), S(ww * 0.35), S(wh * 0.32));
          g.fillRect(x0 + S(wx + ww * 0.62), y0 + S(wy + wh * 0.5), S(ww * 0.08), S(wh * 0.5));
        }
      } else if (v === 1) {
        // Blinds: slats catching a little light
        g.fillStyle = "rgba(255,230,190,0.12)";
        for (let y = wy; y < wy + wh; y += 6) g.fillRect(x0 + S(wx), y0 + S(y), S(ww), S(3));
      }
      // Mullions and transoms
      a.fillStyle = row <= 1 ? "#9fb0bb" : "#5b636c";
      if (row <= 1) {
        rect(a, a.fillStyle as string, 62, 12, 4, 112);
        rect(a, a.fillStyle as string, 0, 8, 128, 4);
        rect(g, "#000", 62, 12, 4, 112);
      } else if (row === 2) {
        for (const x of [0, 42, 85]) rect(a, "#5b636c", x, 52, 3, 64);
        rect(g, "#000", 42, 52, 3, 64);
        rect(g, "#000", 85, 52, 3, 64);
      } else if (row === 4) {
        // Balcony slab and railing
        rect(a, "#f4f0ea", 0, 112, 128, 8);
        rect(a, "#3b4048", 0, 120, 128, 8);
        rect(a, "#8a9097", 0, 90, 128, 2);
        rect(g, "#000", 0, 88, 128, 4);
        rect(a, "#2a343e", 94, 40, 24, 50);
        if (lit > 0.3) rect(g, cool ? "rgba(200,225,255,0.6)" : "rgba(255,200,140,0.6)", 94, 40, 24, 50);
      } else if (row === 6) {
        // Shutters, pilasters, a cornice
        rect(a, "#4f7a5a", 24, 26, 12, 92);
        rect(a, "#4f7a5a", 92, 26, 12, 92);
        rect(a, "#ffffff", 0, 0, 128, 8);
        rect(a, "#e2d9c6", 0, 0, 6, 128);
        rect(a, "#e2d9c6", 122, 0, 6, 128);
        rect(a, "#d9cfba", 0, 120, 128, 8);
      } else if (row === 7) {
        // A signage band over the shopfront
        rect(a, "#16181c", 0, 6, 128, 20);
        const sign = [C.ember, C.paper, "#ffd27a", C.sky, "#7bd88f"][Math.floor(rand() * 5)];
        rect(g, sign, 16 + rand() * 30, 10, 40 + rand() * 40, 12);
        rect(a, "#5b636c", 62, 30, 4, 94);
        rect(g, "#000", 62, 30, 4, 94);
      } else {
        rect(a, "#5b636c", wx + ww / 2 - 1.5, wy, 3, wh);
        rect(g, "#000", wx + ww / 2 - 1.5, wy, 3, wh);
      }
    }
  const tex = (c: HTMLCanvasElement) => {
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    t.minFilter = LinearMipmapLinearFilter;
    t.anisotropy = KIT.tier === 2 ? 8 : 4;
    return t;
  };
  return { albedo: tex(alb), glow: tex(glo) };
}

/** The facade material: atlas bays chosen per window by hash, lit at night, glass smooth and reflective. */
function facadeMaterial(atlas: ReturnType<typeof facadeAtlas>) {
  const mat = litMaterial({ vertexColors: true, roughness: 0.7, metalness: 0, envMapIntensity: 1.0 }, "facade");
  const base = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader, renderer) => {
    base.call(mat, shader, renderer);
    shader.uniforms.uAlbedo = { value: atlas.albedo };
    shader.uniforms.uGlowMap = { value: atlas.glow };
    shader.uniforms.uRough = { value: STYLE_ROUGH };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute vec4 aFacade;\nvarying vec4 vFacade;\nvarying vec2 vFUv;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvFacade = aFacade;\nvFUv = uv;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform sampler2D uAlbedo, uGlowMap;
        uniform float uRough[8];
        varying vec4 vFacade;
        varying vec2 vFUv;
        float fHash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }`,
      )
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
        vec3 facadeGlow = vec3(0.0);
        float facadeRough = -1.0;
        if (vFacade.x > -0.5) {
          vec2 bay = vFUv / vFacade.zw;
          vec2 id = floor(bay);
          vec2 f = fract(bay);
          // Rooms span two to four bays: neighbours share their light
          float shift = floor(fHash(vec2(id.y, vFacade.y)) * 3.0);
          vec2 room = vec2(floor((id.x + shift) / 3.0), id.y);
          float h = fHash(room * 1.13 + vFacade.y);
          float variant = floor(h * 8.0);
          int row = int(vFacade.x + 0.5);
          vec2 auv = (vec2(variant, 7.0 - float(row)) + f) / 8.0;
          vec2 gx = dFdx(bay) / 8.0;
          vec2 gy = dFdy(bay) / 8.0;
          diffuseColor.rgb *= textureGrad(uAlbedo, auv, gx, gy).rgb;
          // Whole floors go dark now and then; each lit window a little brighter or dimmer
          float floorOn = step(0.16, fHash(vec2(id.y * 1.7, vFacade.y)));
          float k = (0.8 + 0.4 * fHash(room * 1.37 + vFacade.y)) * floorOn;
          facadeGlow = textureGrad(uGlowMap, auv, gx, gy).rgb * k;
          facadeRough = uRough[row];
        }`,
      )
      .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance += facadeGlow * uFlood * 1.25;");
    if (KIT.pbr) shader.fragmentShader = shader.fragmentShader.replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nif (facadeRough >= 0.0) roughnessFactor = facadeRough;");
  };
  mat.customProgramCacheKey = () => `facade-${KIT.pbr}`;
  return mat;
}

/** Building geometry with facade coordinates: position, normal, colour, uv (metres), aLit, aFacade. */
class Facades {
  pos: number[] = [];
  nrm: number[] = [];
  col: number[] = [];
  uv: number[] = [];
  lit: number[] = [];
  fac: number[] = [];
  private c = new Color();
  private v = new Vector3();
  private n = new Vector3();
  private nm = new Matrix3();
  /** A quad (corners round it), with its normal, uv per corner and facade (style, seed, bay w, floor h). */
  quad(p: Vector3[], n: Vector3, uv: number[][], color: string | Color, lit: number, fac: [number, number, number, number], m?: Matrix4) {
    const c = typeof color === "string" ? this.c.set(color) : color;
    if (m) this.nm.getNormalMatrix(m);
    for (const k of [0, 1, 2, 0, 2, 3]) {
      this.v.copy(p[k]);
      this.n.copy(n);
      if (m) {
        this.v.applyMatrix4(m);
        this.n.applyMatrix3(this.nm).normalize();
      }
      this.pos.push(this.v.x, this.v.y, this.v.z);
      this.nrm.push(this.n.x, this.n.y, this.n.z);
      this.col.push(c.r, c.g, c.b);
      this.uv.push(uv[k][0], uv[k][1]);
      this.lit.push(lit);
      this.fac.push(...fac);
    }
  }
  /** An upright box: walls with facade bays from y0 to y1, a plain roof cap. */
  prism(cx: number, cz: number, w: number, d: number, y0: number, y1: number, style: number, seed: number, tint: string | Color, roof: string | Color, m?: Matrix4, lit = 0, roofLit = 0.05) {
    const [bw, fh] = style >= 0 ? BAY[style] : [1, 1];
    const corners = [
      [cx - w / 2, cz + d / 2],
      [cx + w / 2, cz + d / 2],
      [cx + w / 2, cz - d / 2],
      [cx - w / 2, cz - d / 2],
    ];
    const normals = [new Vector3(0, 0, 1), new Vector3(1, 0, 0), new Vector3(0, 0, -1), new Vector3(-1, 0, 0)];
    let u = (seed % 97) * bw;
    for (let k = 0; k < 4; k++) {
      const [ax, az] = corners[k];
      const [bx, bz] = corners[(k + 1) % 4];
      const len = Math.hypot(bx - ax, bz - az);
      // Whole bays on each face, so corners don't cut a window in half
      const span = Math.max(1, Math.round(len / bw)) * bw;
      this.quad(
        [new Vector3(ax, y0, az), new Vector3(bx, y0, bz), new Vector3(bx, y1, bz), new Vector3(ax, y1, az)],
        normals[k],
        [
          [u, y0],
          [u + span, y0],
          [u + span, y1],
          [u, y1],
        ],
        tint,
        lit,
        [style, seed % 1000, bw, fh],
        m,
      );
      u += span;
    }
    this.quad(
      [new Vector3(cx - w / 2, y1, cz + d / 2), new Vector3(cx + w / 2, y1, cz + d / 2), new Vector3(cx + w / 2, y1, cz - d / 2), new Vector3(cx - w / 2, y1, cz - d / 2)],
      new Vector3(0, 1, 0),
      [
        [0, 0],
        [w, 0],
        [w, d],
        [0, d],
      ],
      roof,
      roofLit,
      [-1, 0, 1, 1],
      m,
    );
  }
  /** Any geometry (non-indexed or not) as plain, un-windowed surface. */
  add(g: BufferGeometry, color: string | Color, lit = 0, m?: Matrix4) {
    const ng = g.index ? g.toNonIndexed() : g;
    if (m) ng.applyMatrix4(m);
    if (!ng.attributes.normal) ng.computeVertexNormals();
    const p = ng.attributes.position;
    const n = ng.attributes.normal;
    const c = typeof color === "string" ? this.c.set(color) : color;
    for (let i = 0; i < p.count; i++) {
      this.pos.push(p.getX(i), p.getY(i), p.getZ(i));
      this.nrm.push(n.getX(i), n.getY(i), n.getZ(i));
      this.col.push(c.r, c.g, c.b);
      this.uv.push(0, 0);
      this.lit.push(lit);
      this.fac.push(-1, 0, 1, 1);
    }
    g.dispose();
    if (ng !== g) ng.dispose();
  }
  build() {
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(this.pos, 3));
    g.setAttribute("normal", new Float32BufferAttribute(this.nrm, 3));
    g.setAttribute("color", new Float32BufferAttribute(this.col, 3));
    g.setAttribute("uv", new Float32BufferAttribute(this.uv, 2));
    g.setAttribute("aLit", new Float32BufferAttribute(this.lit, 1));
    g.setAttribute("aFacade", new Float32BufferAttribute(this.fac, 4));
    g.computeBoundingSphere();
    return g;
  }
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
    uNight: LIGHTS.uFlood,
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
      uniform float uSunSize, uNight;
      varying vec3 vDir;
      float h2(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
      float vn(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h2(i), h2(i + vec2(1.0, 0.0)), f.x), mix(h2(i + vec2(0.0, 1.0)), h2(i + vec2(1.0, 1.0)), f.x), f.y);
      }
      void main() {
        vec3 d = normalize(vDir);
        vec3 col = mix(uHorizon, uTop, smoothstep(0.0, 0.45, d.y));
        // The city's own light, low on the horizon, and a haze band just above it
        col += uGlow * pow(1.0 - clamp(abs(d.y), 0.0, 1.0), 10.0);
        col += uGlow * 0.35 * smoothstep(0.16, 0.0, abs(d.y - 0.03));
        // A thin cloud deck, lit from below by the city at night
        vec2 q = d.xz / (d.y + 0.18) * 2.2;
        float cl = vn(q) * 0.6 + vn(q * 2.3 + 7.1) * 0.4;
        cl = smoothstep(0.45, 0.85, cl) * smoothstep(0.02, 0.12, d.y) * smoothstep(0.7, 0.2, d.y);
        col = mix(col, mix(uHorizon * 1.15, uGlow * 0.75 + uHorizon * 0.8, uNight), cl * 0.4);
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
    const y = 0.15 + rand() * 0.85;
    const r = Math.sqrt(1 - y * y);
    pos.set([Math.cos(a) * r * 1800, y * 1800, Math.sin(a) * r * 1800], i * 3);
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(pos, 3));
  const mat = new PointsMaterial({ color: "#fff6e0", size: 1.4, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false });
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

/** The layer the bay's mirror pass draws: the skyline, the set pieces, the lights and the sky. */
export const REFLECT_LAYER = 1;

export function buildWater(lights: Reflected[], maxLights: number, mirror = false) {
  const shape = new Shape();
  water.forEach(([x, z], k) => (k ? shape.lineTo(x, -z) : shape.moveTo(x, -z)));
  shape.closePath();
  const geo = new ShapeGeometry(shape);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, WATER_LEVEL, 0);
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
      uMirror: { value: null },
      uMirrorOn: { value: mirror ? 1 : 0 },
      uTexMatrix: { value: new Matrix4() },
    },
  ]);
  while (uniforms.uLightPos.value.length < n) {
    uniforms.uLightPos.value.push(new Vector3(0, -100, 0));
    uniforms.uLightSharp.value.push(100);
    uniforms.uLightCol.value.push(new Color(0));
  }
  const mat = new ShaderMaterial({
    uniforms,
    fog: true,
    defines: { NL: n, MIRROR: mirror ? 1 : 0 },
    vertexShader: /* glsl */ `
      uniform mat4 uTexMatrix;
      varying vec3 vWorld;
      varying vec4 vMirror;
      #include <fog_pars_vertex>
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        vMirror = uTexMatrix * wp;
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
      uniform sampler2D uMirror;
      varying vec3 vWorld;
      varying vec4 vMirror;
      #include <common>
      #include <fog_pars_fragment>
      void main() {
        vec2 p = vWorld.xz;
        float t = uTime;
        vec3 n = normalize(vec3(
          sin(p.x * 0.11 + t * 0.9) * 0.45 + sin(p.x * 0.37 + p.y * 0.23 - t * 1.6) * 0.3 + sin(p.y * 1.1 + p.x * 0.4 + t * 2.4) * 0.16 + sin(p.x * 2.7 - p.y * 1.9 + t * 3.1) * 0.08,
          5.0,
          cos(p.y * 0.09 - t * 0.7) * 0.45 + sin(p.y * 0.41 + p.x * 0.19 + t * 1.3) * 0.3 + cos(p.x * 0.9 - p.y * 0.5 - t * 2.1) * 0.16 + cos(p.y * 2.3 + p.x * 1.7 - t * 2.9) * 0.08));
        vec3 V = normalize(cameraPosition - vWorld);
        vec3 R = reflect(-V, n);
        vec3 sky = mix(uHorizon, uTop, smoothstep(0.0, 0.45, R.y)) + uGlow * pow(1.0 - clamp(R.y, 0.0, 1.0), 10.0);
        float fres = 0.04 + 0.96 * pow(1.0 - max(dot(n, V), 0.0), 5.0);
        vec3 refl = sky;
        #if MIRROR == 1
          // The skyline itself, rippled by the same waves
          vec2 uv = vMirror.xy / vMirror.w + n.xz * 0.035;
          vec3 m = texture2D(uMirror, uv).rgb;
          refl = mix(sky, m, 0.92);
          fres = max(fres, 0.35);
        #endif
        vec3 col = mix(uDeep, refl, fres);
        col += uSunColor * pow(max(dot(R, uSunDir), 0.0), 220.0) * (1.0 - uNight) * 1.5;
        float glint = MIRROR == 1 ? 0.45 : 1.0;
        for (int i = 0; i < NL; i++) {
          vec3 L = normalize(uLightPos[i] - vWorld);
          col += uLightCol[i] * pow(max(dot(R, L), 0.0), uLightSharp[i]) * uNight * glint;
        }
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
  const mesh = new Mesh(geo, mat);
  mesh.name = "bay";
  let target: WebGLRenderTarget | null = null;
  if (mirror) {
    // A planar mirror pass (after three's Reflector): the reflection layer only, at a third of the resolution
    target = new WebGLRenderTarget(16, 16, { type: HalfFloatType, minFilter: LinearFilter, magFilter: LinearFilter, generateMipmaps: false });
    mat.uniforms.uMirror.value = target.texture;
    const cam = new PerspectiveCamera();
    cam.layers.set(REFLECT_LAYER);
    const plane = new Plane();
    const clip = new Vector4();
    const q = new Vector4();
    const camPos = new Vector3();
    const look = new Vector3();
    const tmp = new Vector3();
    const point = new Vector3();
    const buffer = new Vector2();
    const texM = mat.uniforms.uTexMatrix.value as Matrix4;
    mesh.onBeforeRender = (renderer, scene, camera) => {
      if (camera === cam) return;
      const pc = camera as PerspectiveCamera;
      const db = renderer.getDrawingBufferSize(buffer);
      const w = Math.max(64, Math.round(db.x / 3));
      const h = Math.max(64, Math.round(db.y / 3));
      if (target!.width !== w || target!.height !== h) target!.setSize(w, h);
      camPos.setFromMatrixPosition(camera.matrixWorld);
      if (camPos.y < WATER_LEVEL + 0.2) return;
      // Mirror the camera in the water plane
      cam.position.set(camPos.x, 2 * WATER_LEVEL - camPos.y, camPos.z);
      look.set(0, 0, -1).transformDirection(camera.matrixWorld).add(camPos);
      look.y = 2 * WATER_LEVEL - look.y;
      cam.up.set(0, 1, 0).transformDirection(camera.matrixWorld);
      cam.up.y = -cam.up.y;
      cam.lookAt(look);
      cam.far = pc.far;
      cam.updateMatrixWorld();
      cam.projectionMatrix.copy(pc.projectionMatrix);
      texM.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
      texM.multiply(cam.projectionMatrix).multiply(cam.matrixWorldInverse);
      // Oblique near plane at the water, so nothing under it shows in the mirror
      plane.setFromNormalAndCoplanarPoint(tmp.set(0, 1, 0), point.set(0, WATER_LEVEL, 0)).applyMatrix4(cam.matrixWorldInverse);
      clip.set(plane.normal.x, plane.normal.y, plane.normal.z, plane.constant);
      const e = cam.projectionMatrix.elements;
      q.set((Math.sign(clip.x) + e[8]) / e[0], (Math.sign(clip.y) + e[9]) / e[5], -1, (1 + e[10]) / e[14]);
      clip.multiplyScalar(2 / clip.dot(q));
      e[2] = clip.x;
      e[6] = clip.y;
      e[10] = clip.z + 1 - 0.003;
      e[14] = clip.w;
      mesh.visible = false;
      const current = renderer.getRenderTarget();
      const shadowAuto = renderer.shadowMap.autoUpdate;
      renderer.shadowMap.autoUpdate = false;
      renderer.setRenderTarget(target);
      renderer.state.buffers.depth.setMask(true);
      if (renderer.autoClear === false) renderer.clear();
      renderer.render(scene, cam);
      renderer.shadowMap.autoUpdate = shadowAuto;
      renderer.setRenderTarget(current);
      mesh.visible = true;
    };
  }
  return { mesh, uniforms: mat.uniforms, dispose: () => target?.dispose() };
}

/* ───────────── palms ───────────── */

function palm() {
  const b = new Batch();
  for (let i = 0; i < 6; i++) b.add(new CylinderGeometry(0.2 - i * 0.015, 0.24 - i * 0.015, 1.4, 7).translate(i * i * 0.03, 0.7 + i * 1.4, 0), i % 2 ? "#6f5236" : "#7d5e40", 0.2);
  for (let k = 0; k < 9; k++) {
    const f = new ConeGeometry(0.42, 4.4, 3).rotateZ(Math.PI / 2 + 0.45 + (k % 3) * 0.12).translate(2.1, 0, 0);
    b.add(f.rotateY((k / 9) * Math.PI * 2).translate(0.75, 8.3, 0), k % 2 ? "#3f6b33" : "#4c7a3c", 0.12);
  }
  return b.build();
}

/* ───────────── the city ───────────── */

export function buildCity(opts: { tier: 0 | 1 | 2; glows: Glows; shadows: boolean }) {
  const { glows, tier } = opts;
  const group = new Group();
  const rand = rng(77);
  const disposables: { dispose: () => void }[] = [];
  const mat = worldMaterial();
  const atlas = facadeAtlas(tier === 0 ? 512 : 1024);
  disposables.push(atlas.albedo, atlas.glow);
  const facade = facadeMaterial(atlas);
  const fx = new Facades();
  const reflected: Reflected[] = [];
  /** A light the bay reflects (sharp > 0: higher is a tighter glint) and/or a glow sprite. */
  const light = (x: number, y: number, z: number, color: string, sharp = 1200, glowSize = 0, brightness = 1) => {
    if (sharp > 0) reflected.push({ pos: new Vector3(x, y, z), sharp, color: new Color(color).multiplyScalar(brightness) });
    if (glowSize) glows.add(x, y, z, glowSize, color, Math.min(1, brightness));
  };
  const roofGrey = "#4a4f57";

  /* ── city blocks from the plan ── */
  const tints: Record<number, string[]> = {
    0: ["#d6e4ec", "#c6d8e4", "#e0e8ec", "#bcd2df"],
    1: ["#e8ddd0", "#d9cfc4", "#f0e6da"],
    2: ["#e6e0d6", "#d4cfc6", "#c9c3b8"],
    3: ["#ece6da", "#d9d4ca", "#cfc8bb"],
    4: ["#f2ede6", "#e8e2d8", "#ddd6ca"],
    5: ["#d6dee6", "#e8d8cc", "#d4e0d4", "#e6dcc8"],
    6: ["#f6efe2", "#f2d9cc", "#d9e8dc", "#e9e0f0", "#f4e6c4"],
    7: ["#d0d4da"],
  };
  const pick = (style: number) => tints[style][Math.floor(rand() * tints[style].length)];
  const max = [150, 260, 420][tier];
  const roofs: [number, number, number][] = [];
  const crown = (b: Building, x: number, z: number, w: number, d: number, top: number) => {
    switch (b.crown) {
      case "frame": {
        // An open crown frame with a lit edge
        const h = 6 + (b.seed % 5);
        for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) fx.add(bevelBox(0.6, h, 0.6).translate(x + (sx * w) / 2, top + h / 2, z + (sz * d) / 2), "#8e98a3", 0.1);
        for (const s of [-1, 1]) {
          fx.add(bevelBox(w, 0.5, 0.5).translate(x, top + h, z + (s * d) / 2), "#8e98a3", 0.1);
          fx.add(bevelBox(0.5, 0.5, d).translate(x + (s * w) / 2, top + h, z), "#8e98a3", 0.1);
          fx.add(bevelBox(w, 0.12, 0.12).translate(x, top + h + 0.35, z + (s * d) / 2), b.seed % 2 ? C.sky : "#ffd9a0", 2.2);
        }
        break;
      }
      case "spire": {
        fx.add(new CylinderGeometry(0.2, 1.4, 22, 6).translate(x, top + 11, z), "#b9c3cc", 0.2);
        roofs.push([x, top + 22.5, z]);
        break;
      }
      case "heli": {
        fx.add(new CylinderGeometry(Math.min(w, d) * 0.38, Math.min(w, d) * 0.38, 0.6, 20).translate(x, top + 1.2, z), "#3a4048", 0.05);
        fx.add(new TorusGeometry(Math.min(w, d) * 0.3, 0.25, 4, 24).rotateX(Math.PI / 2).translate(x, top + 1.55, z), "#ffd27a", 1.2);
        break;
      }
      case "led": {
        // A glowing band round the top: the night skyline's colour
        const col = [C.sky, C.ember, "#9fe0ff", "#ffb3a8", "#ffd27a"][b.seed % 5];
        fx.add(bevelBox(w + 0.4, 1.4, d + 0.4).translate(x, top - 1.8, z), col, 1.8);
        break;
      }
      case "slope": {
        // A pitched roof in red tiles
        const g = new CylinderGeometry(0.01, Math.hypot(w, d) / 2, 3.2, 4, 1).rotateY(Math.PI / 4).scale(w / Math.hypot(w, d) * 1.414, 1, d / Math.hypot(w, d) * 1.414);
        fx.add(g.translate(x, top + 1.6, z), "#9a4a36", 0.03);
        break;
      }
      default: {
        // Plant on the roof: chillers, a water tank, a lift overrun
        const r = rng(b.seed);
        const k = 2 + Math.floor(r() * 3);
        for (let q = 0; q < k; q++) {
          const pw = 2 + r() * Math.min(6, w * 0.3);
          const pd = 2 + r() * Math.min(6, d * 0.3);
          fx.add(bevelBox(pw, 1.2 + r() * 2, pd).translate(x + (r() - 0.5) * (w - pw), top + 1, z + (r() - 0.5) * (d - pd)), r() < 0.5 ? "#9aa1a9" : "#6f767e", 0.02);
        }
        if (r() < 0.5) fx.add(new CylinderGeometry(1.2, 1.2, 2.4, 10).translate(x + w * 0.25, top + 1.8, z - d * 0.2), "#8a8f97", 0.02);
        fx.add(bevelBox(1.2, 0.9, w).translate(x, top + 0.45, z).rotateY(0), "#5b636c", 0.02);
      }
    }
  };
  let n = 0;
  for (const b of buildings) {
    if (n++ >= max) break;
    const tint = pick(b.style);
    if (b.type === "tower") {
      // Podium of shopfronts, then the tower with its setbacks
      fx.prism(b.x, b.z, b.hw * 2, b.hd * 2, 0, b.podium, 7, b.seed, pick(7), roofGrey);
      let w = b.tw!;
      let d = b.td!;
      let y = b.podium;
      const levels = [...b.steps, 1];
      levels.forEach((f, k) => {
        const top = b.h * f;
        fx.prism(b.x, b.z, w, d, y, top, b.style, b.seed + k * 7, tint, roofGrey);
        y = top;
        w *= 0.78;
        d *= 0.78;
      });
      crown(b, b.x, b.z, w / 0.78, d / 0.78, b.h);
      if (b.h > 110) roofs.push([b.x, b.h + 2, b.z]);
    } else {
      const w = b.hw * 2;
      const d = b.hd * 2;
      if (b.podium > 0) fx.prism(b.x, b.z, w, d, 0, b.podium, 7, b.seed, pick(7), roofGrey);
      let y = b.podium;
      let ww = b.podium > 0 ? w * 0.86 : w;
      let dd = b.podium > 0 ? d * 0.86 : d;
      for (const f of [...b.steps, 1]) {
        const top = b.h * f;
        fx.prism(b.x, b.z, ww, dd, y, top, b.style, b.seed, tint, b.type === "shop" ? "#7a6a5c" : roofGrey);
        y = top;
        ww *= 0.8;
        dd *= 0.8;
      }
      crown(b, b.x, b.z, ww / 0.8, dd / 0.8, b.h);
      if (b.h > 110) roofs.push([b.x, b.h + 2, b.z]);
    }
  }
  // The far ring: plain towers on the horizon
  for (const t of farTowers.slice(0, [30, 50, 70][tier])) fx.prism(t.x, t.z, t.w, t.d, 0, t.h, t.style % 4, t.seed, pick(t.style % 4), roofGrey);

  /* ── three towers and the sky park ── */
  {
    const { x, z } = SET.towers;
    const H = 150;
    for (let k = -1; k <= 1; k++) {
      const tx = x + k * 72;
      // Two slabs per tower: one upright, one leaning in to meet it at the top
      fx.prism(tx, z + 6, 34, 18, 0, H, 0, 300 + k, "#d2e2ea", roofGrey);
      fx.prism(0, 0, 34, 16, 0, H + 4, 0, 310 + k, "#c8dae6", roofGrey, new Matrix4().makeTranslation(tx, 0, z - 18).multiply(new Matrix4().makeRotationX(-0.075)));
      light(tx, H + 2, z - 14, "#ffe7c2", 2400, 0, 1.2);
    }
    // The sky park: a long deck over all three, cantilevered past the east tower
    const deck = new Batch();
    deck.add(bevelBox(310, 7, 40, 0.8).translate(x + 34, H + 5, z - 4), "#e8e4dc", 0.5);
    deck.add(new CylinderGeometry(20, 20, 7, 24, 1, false, 0, Math.PI).rotateY(Math.PI / 2).translate(x + 189, H + 5, z - 4), "#e8e4dc", 0.5);
    deck.add(bevelBox(320, 1.2, 42, 0.3).translate(x + 34, H + 1.2, z - 4), "#5f7c9a", 1.6);
    deck.add(bevelBox(150, 1.0, 6, 0.2).translate(x - 10, H + 9, z - 18), "#5ec1d9", 1.4);
    for (let i = 0; i < 18; i++) deck.add(new DodecahedronGeometry(3, 0).translate(x - 110 + i * 16, H + 12, z + 10), "#4a7742", 0.3);
    // The podium along the water: a long, low mall
    fx.prism(x, z + 30, 300, 70, 0, 16, 7, 333, "#d6dbe2", "#3a4048");
    group.add(new Mesh(deck.build(), mat));
    for (let i = 0; i <= 14; i++) light(x - 120 + i * 22, H + 1, z - 26, "#bfe2ff", 0, 3.5, 0.6);
    light(x + 34, H + 2, z - 20, "#9fd4ff", 700, 0, 0.9);
    light(x + 34, H * 0.55, z - 22, "#ffd9a0", 400, 0, 0.5);
  }

  /* ── the lotus museum ── */
  {
    const b = new Batch();
    const { x, z } = SET.lotus;
    b.add(new CylinderGeometry(16, 10, 10, 24).translate(x, 6, z), "#ece8df", 0.3);
    b.add(new CylinderGeometry(3, 3, 6, 10).translate(x, 1, z), "#8a8f97", 0.1);
    b.add(new CylinderGeometry(30, 30, 0.4, 40).translate(x, WATER_LEVEL + 0.5, z), "#25495e", 0.3);
    const petals = 12;
    for (let k = 0; k < petals; k++) {
      const a = (k / petals) * Math.PI * 2;
      const h = 26 + ((k * 7) % 5) * 4;
      const tilt = -0.42 - (k % 3) * 0.06;
      const petal = new SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(4.2, h, 3.2);
      petal.applyMatrix4(new Matrix4().makeRotationZ(tilt));
      petal.applyMatrix4(new Matrix4().makeRotationY(-a).setPosition(x + Math.cos(a) * 8, 9, z + Math.sin(a) * 8));
      b.add(petal, k % 2 ? "#f3f0e9" : "#e6e1d6", 0.55);
      const tip = new Vector3(0, h, 0).applyMatrix4(new Matrix4().makeRotationZ(tilt)).applyMatrix4(new Matrix4().makeRotationY(-a));
      glows.add(x + Math.cos(a) * 8 + tip.x, 9 + tip.y, z + Math.sin(a) * 8 + tip.z, 2.5, "#ffe6c8", 0.7);
    }
    group.add(new Mesh(b.build(), worldMaterial({ flatShading: false })));
    light(x, 30, z, "#ffd2e6", 900, 0, 0.7);
  }

  /* ── the observation wheel ── */
  const wheelRim = new Group();
  {
    const { x, z } = SET.wheel;
    const R = 56;
    const hub = R + 10;
    const facing = Math.atan2(-90 - x, -300 - z);
    const base = new Batch();
    for (const s of [-1, 1])
      for (const sz of [-1, 1]) {
        const leg = new CylinderGeometry(1.0, 1.4, hub * 1.15, 8).translate(0, (hub * 1.15) / 2, 0);
        leg.applyMatrix4(new Matrix4().makeRotationZ(s * 0.3).multiply(new Matrix4().makeRotationX(sz * 0.12)));
        leg.applyMatrix4(new Matrix4().makeTranslation(s * 18, 0, sz * 8));
        base.add(leg, "#c9ccd1", 0.4);
      }
    base.add(bevelBox(70, 12, 40, 1).translate(0, 6, 0), "#4a5260", 0.6);
    base.add(bevelBox(72, 0.8, 42, 0.2).translate(0, 12.2, 0), C.ember, 1.2);
    base.add(new CylinderGeometry(3, 3, 22, 14).rotateX(Math.PI / 2).translate(0, hub, 0), "#c9ccd1", 0.5);
    const bm = new Mesh(base.build(), mat);
    bm.position.set(x, 0, z);
    bm.rotation.y = facing;
    group.add(bm);
    const rim = new Batch();
    rim.add(new TorusGeometry(R, 0.9, 8, 96).translate(0, 0, 3), "#dfe3e8", 1.0);
    rim.add(new TorusGeometry(R, 0.9, 8, 96).translate(0, 0, -3), "#dfe3e8", 1.0);
    rim.add(new TorusGeometry(R * 0.35, 0.5, 6, 48), "#dfe3e8", 0.8);
    for (let k = 0; k < 28; k++) {
      const a = (k / 28) * Math.PI * 2;
      // Cable spokes from the hub to both rims
      for (const zz of [-3, 3]) rim.add(new CylinderGeometry(0.12, 0.12, R, 4).translate(0, R / 2, 0).rotateZ(a).translate(0, 0, zz * 0.9), "#b8bec6", 0.6);
      const cap = new SphereGeometry(2.6, 10, 8).scale(1.5, 1, 1.1);
      rim.add(cap.translate(Math.cos(a) * (R + 3), Math.sin(a) * (R + 3), 0), "#cfe8ff", 1.6);
    }
    wheelRim.add(new Mesh(rim.build(), mat));
    wheelRim.position.set(x, hub, z);
    wheelRim.rotation.y = facing;
    group.add(wheelRim);
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

  /* ── the twin domes: shells covered in triangular sunshades ── */
  {
    const b = new Batch();
    for (const [dx, r] of [
      [-30, 26],
      [34, 22],
    ] as const) {
      const cx = SET.domes.x + dx;
      const cz = SET.domes.z;
      b.add(new SphereGeometry(r, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.25, 0.8, 1).translate(cx, 0, cz), "#7d7464", 0.35);
      // Spikes on a Fibonacci spiral over the shell, pointing out
      const count = tier === 0 ? 90 : 240;
      const ga = Math.PI * (3 - Math.sqrt(5));
      for (let k = 0; k < count; k++) {
        const yy = 1 - (k / (count - 1)) * 0.92;
        const rr = Math.sqrt(1 - yy * yy);
        const a = k * ga;
        const nrm = new Vector3(Math.cos(a) * rr, yy, Math.sin(a) * rr);
        const p = new Vector3(nrm.x * r * 1.25, nrm.y * r * 0.8, nrm.z * r);
        const out = new Vector3(nrm.x / 1.25, nrm.y / 0.8, nrm.z).normalize();
        const spike = new ConeGeometry(1.0, 2.4, 3).translate(0, 1.1, 0);
        spike.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), out));
        b.add(spike.translate(cx + p.x, p.y, cz + p.z), "#b9ac93", 0.32);
      }
      glows.add(cx, r * 0.85, cz, 5, "#ffd9a8", 0.35);
    }
    group.add(new Mesh(b.build(), mat));
    light(SET.domes.x, 14, SET.domes.z, "#ffcf9a", 600, 0, 0.5);
  }

  /* ── the floating platform and its stand ── */
  {
    const f = SET.float;
    const b = new Batch();
    b.add(bevelBox(f.w, 1.4, f.d, 0.2).translate(f.x, WATER_LEVEL + 0.9, f.z), "#3e4652", 0.5);
    b.add(bevelBox(f.w - 8, 0.05, 0.4).translate(f.x, WATER_LEVEL + 1.62, f.z), "#ecebe6", 0.9);
    b.add(bevelBox(0.4, 0.05, f.d - 8).translate(f.x, WATER_LEVEL + 1.62, f.z), "#ecebe6", 0.9);
    for (let r = 0; r < 9; r++) b.add(bevelBox(f.w * 0.8, 0.6 + r * 0.55, 0.9).translate(f.x, (0.6 + r * 0.55) / 2 + WATER_LEVEL + 1.6, f.z - f.d / 2 + 6 + r * 0.9), r % 2 ? "#5d646e" : "#58606a", 0.4);
    for (const [sx, sz] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ]) {
      const px = f.x + (sx * f.w) / 2;
      const pz = f.z + (sz * f.d) / 2;
      b.add(bevelBox(0.8, 26, 0.8).translate(px, 13, pz), "#6c7580", 0.2);
      b.add(bevelBox(4, 2, 0.6).translate(px, 26, pz), "#fff3d6", 2.4);
      glows.add(px, 26, pz, 7, "#fff3d6", 0.9);
      light(px, 26, pz, "#fff0d0", 2000, 0, 1);
    }
    group.add(new Mesh(b.build(), mat));
  }

  /* ── the helix footbridge ── */
  {
    const { x, z0, z1 } = SET.bridge;
    const b = new Batch();
    b.add(bevelBox(7, 0.8, z1 - z0, 0.2).translate(x, 2.2, (z0 + z1) / 2), "#8e98a3", 0.4);
    const turns = (z1 - z0) / 16;
    for (const phase of [0, Math.PI]) {
      const pts: Vector3[] = [];
      for (let k = 0; k <= 160; k++) {
        const t = k / 160;
        const a = phase + t * turns * Math.PI * 2;
        pts.push(new Vector3(x + Math.cos(a) * 4.6, 6 + Math.sin(a) * 4.6, z0 + (z1 - z0) * t));
      }
      b.add(new TubeGeometry(new CatmullRomCurve3(pts), tier ? 360 : 200, 0.35, 6, false), "#dfe3e8", 0.9);
    }
    for (let k = 0; k <= 20; k++) b.add(new TorusGeometry(4.6, 0.12, 4, 24).translate(x, 6, z0 + ((z1 - z0) * k) / 20), "#cfd5dc", 0.7);
    for (let k = 0; k <= 12; k++) glows.add(x, 9.5, z0 + ((z1 - z0) * k) / 12, 3, k % 2 ? "#ff8fb0" : "#9fe0ff", 0.6);
    group.add(new Mesh(b.build(), mat));
    light(x, 8, (z0 + z1) / 2, "#c7b3ff", 900, 0, 0.6);
  }

  /* ── the colonial quarter by the river: a theatre with a clock tower, a colonnaded block, a lawn ── */
  {
    const { x, z, hw, hd } = SET.colonial;
    const b = new Batch();
    // The lawn in front, facing the river (west)
    b.add(bevelBox(hw * 2, 0.1, hd * 2, 0.02).translate(x, 0.02, z), "#355a33", 0.18);
    // Theatre and concert hall: two white halls joined by the clock tower
    for (const dz of [-18, 18]) fx.prism(x + 14, z + dz, 26, 22, 0, 15, 6, 900 + dz, "#f6f1e6", "#7a3a2e", undefined, 0.15);
    for (const dz of [-18, 18]) {
      const g = new CylinderGeometry(0.01, 18, 5, 4).rotateY(Math.PI / 4).scale(1.02, 1, 0.86);
      fx.add(g.translate(x + 14, 17.5, z + dz), "#8a3d2e", 0.1);
    }
    fx.prism(x + 14, z, 9, 9, 0, 34, 6, 950, "#f6f1e6", "#7a3a2e", undefined, 0.2);
    fx.add(new CylinderGeometry(0.01, 7, 7, 4).rotateY(Math.PI / 4).translate(x + 14, 37.5, z), "#3d5b4a", 0.15);
    for (const s of [-1, 1]) {
      // Clock faces, lit
      fx.add(new CylinderGeometry(2.2, 2.2, 0.2, 24).rotateZ(Math.PI / 2).translate(x + 14 + s * 4.6, 29, z), "#fff6dc", 2.0);
      fx.add(new CylinderGeometry(2.2, 2.2, 0.2, 24).rotateX(Math.PI / 2).translate(x + 14, 29, z + s * 4.6), "#fff6dc", 2.0);
    }
    // A portico of columns along the west front
    for (let k = -6; k <= 6; k++) fx.add(new CylinderGeometry(0.55, 0.6, 10, 10).translate(x + 0.4, 5, z + k * 3.2), "#f4efe4", 0.25);
    fx.add(bevelBox(2.4, 1.4, 42, 0.1).translate(x + 0.4, 10.7, z), "#f4efe4", 0.25);
    {
      const tri = new Shape();
      tri.moveTo(-21, 0);
      tri.lineTo(21, 0);
      tri.lineTo(0, 4.2);
      tri.closePath();
      fx.add(new ExtrudeGeometry(tri, { depth: 2.4, bevelEnabled: false }).rotateY(Math.PI / 2).translate(x - 0.8, 11.4, z), "#f4efe4", 0.25);
    }
    // The colonnaded block along the lawn's south edge
    fx.prism(x - 10, z + hd - 9, 52, 16, 0, 13, 6, 970, "#f2ead8", "#9a4a36", undefined, 0.15);
    fx.add(new CylinderGeometry(0.01, 28, 4, 4).rotateY(Math.PI / 4).scale(1.31, 1, 0.4).translate(x - 10, 15, z + hd - 9), "#9a4a36", 0.1);
    for (let k = -12; k <= 12; k++) fx.add(new CylinderGeometry(0.35, 0.4, 5, 8).translate(x - 10 + k * 2, 2.5, z + hd - 17.6), "#f4efe4", 0.25);
    group.add(new Mesh(b.build(), mat));
    glows.add(x + 14, 30, z, 9, "#ffe7b8", 0.35);
    for (let k = -2; k <= 2; k++) glows.add(x - 4, 3.2, z + k * 14, 1.4, "#ffd08a", 0.8);
  }

  const cityMesh = new Mesh(fx.build(), facade);
  cityMesh.name = "city";
  cityMesh.castShadow = false;
  group.add(cityMesh);
  // Red aviation lights on the tallest roofs
  roofs.slice(0, tier ? 48 : 18).forEach(([x, y, z]) => glows.add(x, y, z, 2.4, "#ff3b30", 0.85));

  /* ── the ground: streets, pavements, parks, and the light that falls on them ── */
  {
    const R = 1500;
    const size = [1024, 2048, 2048][tier];
    const alb = document.createElement("canvas");
    const glo = document.createElement("canvas");
    alb.width = alb.height = glo.width = glo.height = size;
    const a = alb.getContext("2d")!;
    const g = glo.getContext("2d")!;
    const k = size / (2 * R);
    a.setTransform(k, 0, 0, k, R * k, R * k);
    g.setTransform(k, 0, 0, k, R * k, R * k);
    a.fillStyle = "#4b4c4f";
    a.fillRect(-R, -R, 2 * R, 2 * R);
    g.fillStyle = "#000";
    g.fillRect(-R, -R, 2 * R, 2 * R);
    const { pitch, width } = STREETS;
    // Streets on the grid, with pavements either side and a centre line
    for (let v = -R; v <= R; v += pitch) {
      a.fillStyle = "#6c6b67";
      a.fillRect(v - width / 2 - 1, -R, width + 2, 2 * R);
      a.fillRect(-R, v - width / 2 - 1, 2 * R, width + 2);
    }
    for (let v = -R; v <= R; v += pitch) {
      a.fillStyle = "#2c2e33";
      a.fillRect(v - width / 2 + 2.5, -R, width - 5, 2 * R);
      a.fillRect(-R, v - width / 2 + 2.5, 2 * R, width - 5);
    }
    a.fillStyle = "#c9b46a";
    for (let v = -R; v <= R; v += pitch) {
      a.fillRect(v - 0.15, -R, 0.3, 2 * R);
      a.fillRect(-R, v - 0.15, 2 * R, 0.3);
    }
    // The infield park
    const gr = SET.green;
    a.fillStyle = "#2f4a2d";
    a.fillRect(gr.x0, gr.z0, gr.x1 - gr.x0, gr.z1 - gr.z0);
    a.strokeStyle = "#8b8478";
    a.lineWidth = 3;
    a.beginPath();
    a.moveTo(gr.x0, gr.z0);
    a.lineTo(gr.x1, gr.z1);
    a.moveTo(gr.x1, gr.z0);
    a.lineTo(gr.x0, gr.z1);
    a.stroke();
    // Street lights: warm pools every 30 m along the streets near the circuit
    const pools: [number, number][] = [];
    for (let v = -R; v <= R; v += pitch)
      for (let s = -R; s <= R; s += 30)
        for (const [px, pz] of [
          [v - width / 2 + 1, s],
          [s, v - width / 2 + 1],
        ]) {
          if (Math.hypot(px - 0, pz + 50) > 900 || inWater(px, pz)) continue;
          const h = locate(px, pz);
          if (h.dist < wallOffset(h.i, h.d >= 0 ? 1 : -1) + 4 || pitDist(px, pz).d < 3) continue;
          pools.push([px, pz]);
        }
    for (const [px, pz] of pools) {
      const grad = g.createRadialGradient(px, pz, 0, px, pz, 13);
      grad.addColorStop(0, "rgba(255,196,128,0.55)");
      grad.addColorStop(1, "rgba(255,196,128,0)");
      g.fillStyle = grad;
      g.fillRect(px - 13, pz - 13, 26, 26);
    }
    // The floodlights' spill beyond the walls, and the glow of the fan zones
    g.globalCompositeOperation = "lighter";
    g.lineJoin = g.lineCap = "round";
    for (const [w, alpha] of [
      [70, 0.07],
      [46, 0.1],
      [30, 0.14],
    ] as const) {
      g.strokeStyle = `rgba(255,236,206,${alpha})`;
      g.lineWidth = w;
      g.beginPath();
      samples.forEach((p, i) => (i ? g.lineTo(p.x, p.z) : g.moveTo(p.x, p.z)));
      g.closePath();
      g.stroke();
    }
    g.globalCompositeOperation = "source-over";
    const albT = new CanvasTexture(alb);
    albT.colorSpace = SRGBColorSpace;
    albT.anisotropy = 8;
    const gloT = new CanvasTexture(glo);
    gloT.colorSpace = SRGBColorSpace;
    disposables.push(albT, gloT);
    const shape = new Shape();
    shape.moveTo(-R, -R);
    shape.lineTo(R, -R);
    shape.lineTo(R, R);
    shape.lineTo(-R, R);
    shape.closePath();
    const hole = new Shape();
    water.forEach(([x, z], q) => (q ? hole.lineTo(x, -z) : hole.moveTo(x, -z)));
    hole.closePath();
    shape.holes.push(hole);
    const geo = new ShapeGeometry(shape);
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, -0.06, 0);
    // uv from world xz, matching the canvas (flipped in v)
    const p = geo.attributes.position;
    const uv = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++) {
      uv[i * 2] = (p.getX(i) + R) / (2 * R);
      uv[i * 2 + 1] = 1 - (p.getZ(i) + R) / (2 * R);
    }
    geo.setAttribute("uv", new Float32BufferAttribute(uv, 2));
    const gm = litMaterial({ map: albT, emissiveMap: gloT, emissive: new Color("#ffffff"), roughness: 0.92 }, "ground");
    const base = gm.onBeforeCompile;
    gm.onBeforeCompile = (shader, renderer) => {
      base.call(gm, shader, renderer);
      // The baked light is night light: it fades with the floodlights
      shader.fragmentShader = shader.fragmentShader.replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance *= uFlood;");
    };
    gm.customProgramCacheKey = () => `ground-${KIT.pbr}`;
    const ground = new Mesh(geo, gm);
    ground.receiveShadow = opts.shadows;
    ground.name = "ground";
    group.add(ground);
    // The nearest street lights get a glow of their own
    pools
      .map(([x, z]) => ({ x, z, d: locate(x, z).dist }))
      .sort((p1, p2) => p1.d - p2.d)
      .slice(0, [50, 120, 200][tier])
      .forEach((q) => glows.add(q.x, 7, q.z, 2.4, "#ffcf96", 0.75));

    // Quay walls round the water, and a railing on top
    const b = new Batch();
    for (let q = 0; q < water.length; q++) {
      const [ax, az] = water[q];
      const [bx, bz] = water[(q + 1) % water.length];
      const l = Math.hypot(bx - ax, bz - az);
      if (l < 0.5) continue;
      const ry = Math.atan2(bx - ax, bz - az);
      b.place(bevelBox(0.8, 2.2, l + 0.6, 0.06), "#a49e92", 0.25, (ax + bx) / 2, -1.15, (az + bz) / 2, ry);
      // The railing runs in 4 m lengths, and stops where the circuit crosses the water
      for (let t = 0; t < l; t += 4) {
        const t1 = Math.min(l, t + 4);
        const px = ax + ((bx - ax) * (t + t1)) / 2 / l;
        const pz = az + ((bz - az) * (t + t1)) / 2 / l;
        if (clearance(px, pz) < 3) continue;
        b.place(new BoxGeometry(0.08, 0.08, t1 - t), "#c9ccd1", 0.4, px, 1.0, pz, ry);
        if (tier > 0) b.place(new BoxGeometry(0.06, 1.0, 0.06), "#c9ccd1", 0.35, ax + ((bx - ax) * t) / l, 0.5, az + ((bz - az) * t) / l, ry);
      }
    }
    group.add(new Mesh(b.build(), mat));
  }

  /* ── palms on the promenade ── */
  {
    const palms = new InstancedMesh(palm(), mat, [24, 50, 80][tier]);
    const o = new Object3D();
    const ok = (x: number, z: number) => {
      if (inWater(x, z)) return false;
      const h = locate(x, z);
      if (h.dist < wallOffset(h.i, h.d >= 0 ? 1 : -1) + 7) return false;
      if (pitDist(x, z).d < 8) return false;
      return true;
    };
    let count = 0;
    for (let guard = 0; count < palms.count && guard < 4000; guard++) {
      const k = Math.floor(rand() * water.length);
      const a = water[k];
      const b = water[(k + 1) % water.length];
      const t = rand();
      const x = a[0] + (b[0] - a[0]) * t;
      const z = a[1] + (b[1] - a[1]) * t;
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      for (const side of [1, -1]) {
        const px = x + (-(b[1] - a[1]) / l) * 6 * side;
        const pz = z + ((b[0] - a[0]) / l) * 6 * side;
        if (!ok(px, pz) || count >= palms.count) continue;
        o.position.set(px, 0, pz);
        o.rotation.set(0, rand() * 6.28, 0);
        o.scale.setScalar(0.9 + rand() * 0.4);
        o.updateMatrix();
        palms.setMatrixAt(count++, o.matrix);
      }
    }
    palms.count = count;
    palms.computeBoundingSphere();
    palms.castShadow = opts.shadows;
    group.add(palms);
  }

  // A few reflections of the floodlit circuit along the waterfront
  light(SET.float.x - 120, 16, SET.float.z - 70, "#fff0d0", 1500, 0, 0.7);
  light(SET.float.x + 120, 16, SET.float.z - 90, "#fff0d0", 1500, 0, 0.7);
  light(SET.domes.x - 160, 16, SET.domes.z - 50, "#fff0d0", 1500, 0, 0.6);

  // Everything but the ground shows in the bay's mirror
  group.traverse((o) => {
    if (o.name !== "ground") o.layers.enable(REFLECT_LAYER);
  });

  return {
    group,
    reflected,
    update(t: number) {
      wheelRim.rotation.z = t * 0.02;
    },
    dispose() {
      for (const d of disposables) d.dispose();
    },
  };
}
