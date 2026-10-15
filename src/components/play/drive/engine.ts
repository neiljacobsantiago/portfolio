import {
  ACESFilmicToneMapping,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  DodecahedronGeometry,
  Fog,
  Group,
  HemisphereLight,
  InstancedMesh,
  Line,
  LineBasicMaterial,
  Material,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  OctahedronGeometry,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  RingGeometry,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
  Vector3,
  WebGLRenderer,
} from "three";
import { cones, ISLAND_RADIUS, landmarks, packets, pins, ROAD_RADIUS, type Landmark } from "./world";

// Island Drive: a small three.js world in the site's palette. Arcade physics
// on the ground plane (x, z), a fixed isometric-ish chase camera, HTML labels
// projected from 3D, and a 2D minimap. No physics library — it stays light.

export interface Controls {
  throttle: number; // -1 … 1
  steer: number; // -1 (left) … 1 (right)
  boost: boolean;
  brake: boolean;
}

export interface DriveCallbacks {
  onZone: (landmark: Landmark | null) => void;
  onPackets: (collected: number, total: number) => void;
  onChallenge: (state: { running: boolean; ms: number; finished?: number }) => void;
  onPins: (down: number, total: number) => void;
  onReady: () => void;
}

export interface DriveEngine {
  drive: () => void;
  setControls: (c: Partial<Controls>) => void;
  startChallenge: () => void;
  reset: () => void;
  dispose: () => void;
}

const C = {
  paper: "#fdf0d5",
  sand: "#f1d7a6",
  sandDark: "#e2c18a",
  road: "#e8cf9f",
  ink: "#003049",
  wine: "#780000",
  ember: "#c1121f",
  sky: "#669bbc",
  sea: "#5d93b5",
  leaf: "#8ea866",
  meadow: "#c7cf93",
  grass: "#b3bf7b",
  leafDark: "#6f8b4f",
  trunk: "#8a5a3c",
  silver: "#c9ccd1",
};

const std = (color: string, extra: Partial<ConstructorParameters<typeof MeshStandardMaterial>[0]> = {}) =>
  new MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, metalness: 0, ...extra });

/** Tiny seeded RNG so the island looks the same on every visit. */
function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

function mesh(geometry: BufferGeometry, material: Material, x = 0, y = 0, z = 0, shadow = true) {
  const m = new Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}

interface Animated {
  update: (t: number, dt: number) => void;
}

/* ─────────────────────────── landmarks ─────────────────────────── */

function buildLandmark(l: Landmark, animated: Animated[]): Group {
  const g = new Group();
  const r = rng(l.x * 31 + l.z * 7 + 99);
  switch (l.kind) {
    case "petri": {
      g.add(mesh(new CylinderGeometry(6.2, 6.4, 0.7, 48), std("#dfe9ea", { transparent: true, opacity: 0.85, roughness: 0.2 }), 0, 0.35));
      g.add(mesh(new CylinderGeometry(5.7, 5.7, 0.5, 48), std("#f2d68a"), 0, 0.75));
      g.add(mesh(new TorusGeometry(6.1, 0.16, 8, 64), std("#ffffff", { roughness: 0.1 }), 0, 1.2).rotateX(Math.PI / 2));
      const colonyColors = ["#5d7b3a", "#a8b54a", "#2e2e2e", "#d9c25a", "#7c8f3e"];
      for (let i = 0; i < 9; i++) {
        const a = r() * Math.PI * 2;
        const d = 1 + r() * 3.6;
        const s = 0.6 + r() * 1.1;
        const c = mesh(new SphereGeometry(s, 10, 8), std(colonyColors[i % colonyColors.length]), Math.cos(a) * d, 1, Math.sin(a) * d);
        c.scale.y = 0.35;
        g.add(c);
      }
      // A scanning ring sweeps over the dish.
      const scan = mesh(new TorusGeometry(5.9, 0.08, 6, 64), new MeshStandardMaterial({ color: "#7bd88f", emissive: "#2e8b57", emissiveIntensity: 1.5 }), 0, 1.4, 0, false);
      scan.rotateX(Math.PI / 2);
      g.add(scan);
      animated.push({ update: (t) => (scan.position.y = 1.4 + (Math.sin(t * 1.4) + 1) * 1.2) });
      break;
    }
    case "camera": {
      g.add(mesh(new BoxGeometry(6.4, 4, 3.6), std(C.ink), 0, 2.6));
      g.add(mesh(new BoxGeometry(2.2, 1, 2.4), std(C.ink), -1.6, 5));
      g.add(mesh(new CylinderGeometry(0.5, 0.5, 0.5, 16), std(C.ember), 2, 4.85, 0));
      g.add(mesh(new BoxGeometry(1.4, 0.8, 1), std(C.paper, { emissive: "#fff6e0", emissiveIntensity: 0.4 }), 1.6, 5.1, 0.6));
      const lens = new Group();
      lens.add(mesh(new CylinderGeometry(1.9, 2.1, 2.6, 32), std("#1d1d1d"), 0, 0, 0).rotateX(Math.PI / 2));
      lens.add(mesh(new CylinderGeometry(1.35, 1.35, 0.2, 32), std(C.sky, { roughness: 0.1, metalness: 0.4 }), 0, 0, 1.35).rotateX(Math.PI / 2));
      lens.position.set(0, 2.6, 2.9);
      g.add(lens);
      animated.push({ update: (t) => (lens.position.z = 2.9 + Math.max(0, Math.sin(t * 0.8)) * 0.6) });
      break;
    }
    case "stage": {
      g.add(mesh(new BoxGeometry(14, 1.2, 8), std(C.ink), 0, 0.6));
      g.add(mesh(new BoxGeometry(12, 6, 0.4), std(C.wine, { emissive: C.wine, emissiveIntensity: 0.35 }), 0, 4.2, -3.6));
      for (const x of [-6.6, 6.6]) g.add(mesh(new BoxGeometry(0.4, 8, 0.4), std(C.silver, { metalness: 0.5 }), x, 4, 3.4));
      g.add(mesh(new BoxGeometry(13.6, 0.4, 0.4), std(C.silver, { metalness: 0.5 }), 0, 8, 3.4));
      const beams: Mesh[] = [];
      [C.ember, C.sky, "#ffd27a", C.ember].forEach((color, i) => {
        const beam = mesh(new ConeGeometry(1.2, 7, 16, 1, true), new MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.2, transparent: true, opacity: 0.28, depthWrite: false }), -4.5 + i * 3, 4.4, 3.4, false);
        beams.push(beam);
        g.add(beam);
      });
      animated.push({ update: (t) => beams.forEach((b, i) => (b.rotation.z = Math.sin(t * 1.3 + i) * 0.45)) });
      break;
    }
    case "pc": {
      g.add(mesh(new BoxGeometry(3.4, 7.2, 6.4), std("#1b2740"), 0, 3.6));
      g.add(mesh(new BoxGeometry(0.1, 6.2, 5.4), std("#2f5bd3", { emissive: "#2f5bd3", emissiveIntensity: 0.7, transparent: true, opacity: 0.85 }), 1.72, 3.6, 0));
      const fans: Mesh[] = [];
      [1.8, 3.9, 6].forEach((y) => {
        const fan = mesh(new TorusGeometry(0.9, 0.14, 8, 24), new MeshStandardMaterial({ color: "#7aa2ff", emissive: "#3b6cff", emissiveIntensity: 1.6 }), 0, y, 3.22, false);
        fans.push(fan);
        g.add(fan);
      });
      animated.push({ update: (t) => fans.forEach((f, i) => (f.rotation.z = t * (3 + i))) });
      break;
    }
    case "network": {
      const nodes: [number, number, number][] = [
        [-4, 5, -2],
        [4, 6, -1],
        [0, 4, 4],
      ];
      for (const [x, y, z] of nodes) {
        g.add(mesh(new CylinderGeometry(0.25, 0.35, y, 8), std(C.silver, { metalness: 0.4 }), x, y / 2, z));
        g.add(mesh(new SphereGeometry(0.9, 14, 10), new MeshStandardMaterial({ color: C.ember, emissive: C.ember, emissiveIntensity: 0.8 }), x, y + 0.5, z));
      }
      g.add(mesh(new BoxGeometry(3, 1, 2), std(C.ink), 0, 0.5, 0));
      const pts = [...nodes, nodes[0]].map(([x, y, z]) => new Vector3(x, y + 0.5, z));
      g.add(new Line(new BufferGeometry().setFromPoints(pts), new LineBasicMaterial({ color: C.ink })));
      const pulses = nodes.map(() => mesh(new SphereGeometry(0.28, 8, 6), new MeshStandardMaterial({ color: C.sky, emissive: C.sky, emissiveIntensity: 2 }), 0, 0, 0, false));
      pulses.forEach((p) => g.add(p));
      animated.push({
        update: (t) =>
          pulses.forEach((p, i) => {
            const k = (t * 0.6 + i / 3) % 1;
            p.position.lerpVectors(pts[i], pts[i + 1], k);
          }),
      });
      break;
    }
    case "memory": {
      const widths = [4.6, 3.2, 4, 2.4, 3.6];
      const colors = [C.ember, C.sky, C.ink, C.wine, C.sandDark];
      widths.forEach((w, i) => g.add(mesh(new BoxGeometry(w, 1.2, 3), std(colors[i]), (r() - 0.5) * 0.8, 0.6 + i * 1.25, 0)));
      break;
    }
    case "shield": {
      const lock = new Group();
      lock.add(mesh(new BoxGeometry(4, 3.4, 1.6), std(C.ember), 0, 0, 0));
      lock.add(mesh(new TorusGeometry(1.25, 0.35, 10, 24, Math.PI), std(C.silver, { metalness: 0.6, roughness: 0.3 }), 0, 1.7, 0));
      lock.add(mesh(new CylinderGeometry(0.35, 0.35, 0.3, 12), std(C.ink), 0, 0.2, 0.85).rotateX(Math.PI / 2));
      lock.position.y = 3.2;
      g.add(lock);
      g.add(mesh(new CylinderGeometry(2.4, 2.8, 0.8, 8), std(C.sandDark), 0, 0.4));
      animated.push({ update: (t) => ((lock.rotation.y = t * 0.6), (lock.position.y = 3.2 + Math.sin(t * 1.6) * 0.3)) });
      break;
    }
    case "lab": {
      g.add(mesh(new CylinderGeometry(2.3, 2.6, 0.6, 24), std(C.ink), 0, 0.3));
      g.add(mesh(new CylinderGeometry(2, 2.2, 5, 24, 1, true), std("#dff3ff", { transparent: true, opacity: 0.35, roughness: 0.05 }), 0, 3.1, 0, false));
      g.add(mesh(new CylinderGeometry(1.85, 2.05, 2.6, 24), new MeshStandardMaterial({ color: "#7bd88f", emissive: "#2e8b57", emissiveIntensity: 0.9 }), 0, 1.9, 0, false));
      const bubbles = Array.from({ length: 6 }, (_, i) => mesh(new SphereGeometry(0.22 + (i % 3) * 0.08, 8, 6), new MeshStandardMaterial({ color: "#c8ffd6", emissive: "#7bd88f", emissiveIntensity: 1 }), (r() - 0.5) * 2, 1, (r() - 0.5) * 2, false));
      bubbles.forEach((b) => g.add(b));
      animated.push({ update: (t) => bubbles.forEach((b, i) => (b.position.y = 0.9 + ((t * 0.8 + i * 0.37) % 1) * 4.6)) });
      break;
    }
    case "mailbox": {
      g.add(mesh(new BoxGeometry(0.45, 2.8, 0.45), std(C.trunk), 0, 1.4));
      g.add(mesh(new BoxGeometry(1.8, 1.3, 2.8), std(C.ember), 0, 3.3));
      g.add(mesh(new CylinderGeometry(0.9, 0.9, 2.8, 16, 1, false, 0, Math.PI), std(C.ember), 0, 3.95, 0).rotateZ(Math.PI / 2).rotateY(Math.PI / 2));
      const flag = new Group();
      flag.add(mesh(new BoxGeometry(0.12, 1.6, 0.12), std(C.ink), 0, 0.8, 0));
      flag.add(mesh(new BoxGeometry(0.1, 0.6, 0.8), std(C.ink), 0, 1.3, 0.4));
      flag.position.set(1, 3, 0.6);
      g.add(flag);
      animated.push({ update: (t) => (flag.rotation.x = -0.4 + Math.sin(t * 2.2) * 0.35) });
      break;
    }
    case "monument": {
      g.add(mesh(new BoxGeometry(4.4, 1, 4.4), std(C.sandDark), 0, 0.5));
      g.add(mesh(new BoxGeometry(1.6, 6.4, 1.6), std(C.paper), 0, 4.2));
      const ring = mesh(new TorusGeometry(2.2, 0.22, 10, 40), std(C.ember, { emissive: C.ember, emissiveIntensity: 0.3 }), 0, 8.8, 0);
      g.add(ring);
      animated.push({ update: (t) => ((ring.rotation.y = t * 0.9), (ring.rotation.x = Math.sin(t * 0.7) * 0.4)) });
      break;
    }
    default:
      break;
  }
  g.position.set(l.x, 0, l.z);
  // Face the plaza, so every landmark shows its best side to the road.
  g.lookAt(0, 0, 0);
  return g;
}

/* ─────────────────────────── the jeepney ─────────────────────────── */

/** Text painted onto a canvas, for the jeepney's signboards. */
function signTexture(text: string, bg: string, fg: string, w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.fillStyle = fg;
  g.font = `bold ${Math.round(h * 0.56)}px Georgia, "Times New Roman", serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, w / 2, h / 2 + 2);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function buildJeepney() {
  const car = new Group();
  const body = new Group(); // tilts with the suspension
  car.add(body);
  const red = std(C.ember, { roughness: 0.55 });
  const paper = std(C.paper);
  const ink = std(C.ink);
  const chrome = std(C.silver, { metalness: 0.7, roughness: 0.25 });

  body.add(mesh(new BoxGeometry(2.3, 0.45, 4.9), chrome, 0, 0.75, 0));
  body.add(mesh(new BoxGeometry(2.2, 1.4, 3.2), red, 0, 1.65, 0.65));
  body.add(mesh(new BoxGeometry(2.0, 0.9, 1.4), red, 0, 1.35, -1.6));
  body.add(mesh(new BoxGeometry(2.42, 0.2, 3.7), paper, 0, 2.45, 0.5));
  body.add(mesh(new BoxGeometry(2.24, 0.16, 3.24), ink, 0, 1.25, 0.65));
  body.add(mesh(new BoxGeometry(2.26, 0.5, 2.7), std("#1c2b3a", { roughness: 0.2 }), 0, 1.95, 0.75));
  body.add(mesh(new BoxGeometry(1.9, 0.6, 0.08), std("#1c2b3a", { roughness: 0.2 }), 0, 2.0, -0.97));
  body.add(mesh(new BoxGeometry(1.5, 0.55, 0.12), chrome, 0, 1.25, -2.34));
  body.add(mesh(new BoxGeometry(0.16, 0.5, 0.5), chrome, 0, 1.95, -1.9)); // the hood horse, abstracted
  for (const x of [-0.72, 0.72]) {
    body.add(mesh(new SphereGeometry(0.2, 10, 8), new MeshStandardMaterial({ color: "#fff7df", emissive: "#fff2c4", emissiveIntensity: 1.2 }), x, 1.35, -2.36, false));
  }
  // Route signboard up front and painted names on the sides — every jeepney has them.
  const front = signTexture("SAN JOSE ⇄ CLSU", C.paper, C.ink, 512, 96);
  const plain = std(C.paper);
  // Box faces: +x, -x, +y, -y, +z, -z — the text goes on the front (-z) face.
  const sign = new Mesh(new BoxGeometry(2.1, 0.42, 0.08), [plain, plain, plain, plain, plain, new MeshStandardMaterial({ map: front, roughness: 0.6 })]);
  sign.position.set(0, 2.72, -1.2);
  sign.castShadow = true;
  body.add(sign);
  const side = signTexture("NEIL JACOB", C.ember, C.paper, 512, 96);
  for (const x of [-1.115, 1.115]) {
    const plate = mesh(new PlaneGeometry(2.6, 0.48), new MeshStandardMaterial({ map: side, roughness: 0.6, transparent: true }), x, 1.55, 0.7, false);
    plate.rotation.y = x < 0 ? -Math.PI / 2 : Math.PI / 2;
    body.add(plate);
  }
  for (const [y, color] of [
    [1.05, C.sky],
    [2.36, C.ember],
  ] as const)
    body.add(mesh(new BoxGeometry(2.25, 0.1, 3.26), std(color), 0, y, 0.65));
  // Side mirrors and roof rack
  for (const x of [-1.25, 1.25]) body.add(mesh(new BoxGeometry(0.12, 0.3, 0.3), chrome, x, 1.95, -0.9));
  body.add(mesh(new BoxGeometry(1.8, 0.12, 0.12), chrome, 0, 2.62, -1));

  const wheelGeo = new CylinderGeometry(0.52, 0.52, 0.42, 16);
  const wheelMat = std("#1d1d1d");
  const hubMat = std(C.silver, { metalness: 0.6 });
  const wheels: Group[] = [];
  const steerers: Group[] = [];
  for (const [x, z, front] of [
    [-1.18, -1.55, true],
    [1.18, -1.55, true],
    [-1.18, 1.7, false],
    [1.18, 1.7, false],
  ] as const) {
    const pivot = new Group();
    pivot.position.set(x, 0.52, z);
    const spin = new Group();
    const w = mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    const hub = mesh(new CylinderGeometry(0.24, 0.24, 0.44, 8), hubMat);
    hub.rotation.z = Math.PI / 2;
    spin.add(w, hub);
    pivot.add(spin);
    car.add(pivot);
    wheels.push(spin);
    if (front) steerers.push(pivot);
  }
  return { car, body, wheels, steerers };
}

/* ─────────────────────────── engine ─────────────────────────── */

interface Prop {
  mesh: Object3D;
  x: number;
  z: number;
  vx: number;
  vz: number;
  r: number;
  down: number; // 0 standing → 1 lying
  dirX: number;
  dirZ: number;
  kind: "cone" | "pin";
}

export function createDriveEngine(
  canvas: HTMLCanvasElement,
  opts: { lowPower: boolean; labels: HTMLElement; minimap: HTMLCanvasElement | null },
  cb: DriveCallbacks,
): DriveEngine {
  const renderer = new WebGLRenderer({ canvas, antialias: !opts.lowPower, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, opts.lowPower ? 1 : 1.75));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = !opts.lowPower;
  renderer.shadowMap.type = PCFSoftShadowMap;

  const scene = new Scene();
  scene.background = new Color(C.paper);
  scene.fog = new Fog(C.paper, 110, 260);

  const camera = new PerspectiveCamera(38, 1, 0.5, 400);
  scene.add(new HemisphereLight("#fff6e5", "#c99f66", 1.4));
  const sun = new DirectionalLight("#fff1d6", 2.2);
  sun.position.set(30, 50, 20);
  sun.castShadow = !opts.lowPower;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = sc.bottom = -45;
  sc.right = sc.top = 45;
  sc.far = 140;
  sun.shadow.bias = -0.0008;
  scene.add(sun, sun.target);

  /* Ground */
  const sea = mesh(new PlaneGeometry(900, 900), std(C.sea, { roughness: 0.4 }), 0, -0.9, 0, false);
  sea.rotation.x = -Math.PI / 2;
  sea.receiveShadow = false;
  scene.add(sea);
  const shallows = mesh(new RingGeometry(ISLAND_RADIUS - 2, ISLAND_RADIUS + 9, 96), std("#8fbcd2", { roughness: 0.3 }), 0, -0.85, 0, false);
  shallows.rotation.x = -Math.PI / 2;
  scene.add(shallows);
  scene.add(mesh(new CylinderGeometry(ISLAND_RADIUS, ISLAND_RADIUS + 3, 2, 96), std(C.meadow), 0, -1, 0, false));
  const beach = mesh(new RingGeometry(ISLAND_RADIUS - 8, ISLAND_RADIUS, 96), std(C.sand), 0, 0.01, 0, false);
  beach.rotation.x = -Math.PI / 2;
  scene.add(beach);
  const road = mesh(new RingGeometry(ROAD_RADIUS - 3.2, ROAD_RADIUS + 3.2, 120), std(C.road), 0, 0.02, 0, false);
  road.rotation.x = -Math.PI / 2;
  scene.add(road);
  const plaza = mesh(new CircleGeometry(9, 48), std("#ecd3a2"), 0, 0.03, 0, false);
  plaza.rotation.x = -Math.PI / 2;
  scene.add(plaza);
  const plazaRing = mesh(new RingGeometry(8.6, 9, 64), std(C.ember), 0, 0.04, 0, false);
  plazaRing.rotation.x = -Math.PI / 2;
  scene.add(plazaRing);
  // Dashed centre line
  const dashes = new InstancedMesh(new BoxGeometry(0.3, 0.04, 1.6), std(C.paper), 60);
  const tmp = new Object3D();
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    tmp.position.set(Math.cos(a) * ROAD_RADIUS, 0.05, Math.sin(a) * ROAD_RADIUS);
    tmp.rotation.set(0, -a, 0);
    tmp.updateMatrix();
    dashes.setMatrixAt(i, tmp.matrix);
  }
  scene.add(dashes);

  /* Landmarks */
  const animated: Animated[] = [];
  const statics: { x: number; z: number; r: number }[] = [];
  for (const l of landmarks) {
    scene.add(buildLandmark(l, animated));
    statics.push({ x: l.x, z: l.z, r: l.radius });
  }

  /* Trees and rocks, placed by a seeded RNG away from roads and landmarks */
  const rand = rng(7);
  const treeCount = opts.lowPower ? 45 : 85;
  const trunks = new InstancedMesh(new CylinderGeometry(0.25, 0.35, 1.6, 6), std(C.trunk), treeCount);
  const leaves = new InstancedMesh(new ConeGeometry(1.5, 3.6, 7), std(C.leaf), treeCount);
  const leaves2 = new InstancedMesh(new ConeGeometry(1.1, 2.6, 7), std(C.leafDark), treeCount);
  trunks.castShadow = leaves.castShadow = leaves2.castShadow = !opts.lowPower;
  let placed = 0;
  for (let guard = 0; placed < treeCount && guard < 4000; guard++) {
    const a = rand() * Math.PI * 2;
    const d = 12 + rand() * (ISLAND_RADIUS - 16);
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    if (Math.abs(d - ROAD_RADIUS) < 5.5) continue;
    if (landmarks.some((l) => Math.hypot(l.x - x, l.z - z) < l.zone + 1)) continue;
    if ([...packets, ...cones, ...pins].some(([px, pz]) => Math.hypot(px - x, pz - z) < 4)) continue;
    if (statics.some((s) => Math.hypot(s.x - x, s.z - z) < s.r + 2.5)) continue;
    const s = 0.8 + rand() * 0.6;
    tmp.position.set(x, 0.8 * s, z);
    tmp.rotation.set(0, rand() * Math.PI, 0);
    tmp.scale.set(s, s, s);
    tmp.updateMatrix();
    trunks.setMatrixAt(placed, tmp.matrix);
    tmp.position.y = 3 * s;
    tmp.updateMatrix();
    leaves.setMatrixAt(placed, tmp.matrix);
    tmp.position.y = 4.6 * s;
    tmp.updateMatrix();
    leaves2.setMatrixAt(placed, tmp.matrix);
    statics.push({ x, z, r: 0.9 * s });
    placed++;
  }
  trunks.count = leaves.count = leaves2.count = placed;
  scene.add(trunks, leaves, leaves2);

  const rocks = new InstancedMesh(new DodecahedronGeometry(1, 0), std("#b9a58a"), 40);
  for (let i = 0; i < 40; i++) {
    const a = rand() * Math.PI * 2;
    const d = ISLAND_RADIUS - 1 + rand() * 4;
    const s = 0.6 + rand() * 1.6;
    tmp.position.set(Math.cos(a) * d, -0.4, Math.sin(a) * d);
    tmp.rotation.set(rand() * 3, rand() * 3, rand() * 3);
    tmp.scale.set(s, s * 0.7, s);
    tmp.updateMatrix();
    rocks.setMatrixAt(i, tmp.matrix);
  }
  scene.add(rocks);

  // Darker grass patches and flower clusters give the meadow some texture.
  const patches = new InstancedMesh(new CircleGeometry(1, 9), std(C.grass), 60);
  const bushes = new InstancedMesh(new DodecahedronGeometry(0.7, 0), std("#ffffff"), 110);
  const flowerColors = [new Color(C.ember), new Color(C.paper), new Color(C.leafDark), new Color("#ffd27a"), new Color(C.leafDark)];
  let np = 0;
  let nb = 0;
  for (let guard = 0; guard < 3000 && (np < 60 || nb < 110); guard++) {
    const a = rand() * Math.PI * 2;
    const d = 11 + rand() * (ISLAND_RADIUS - 21);
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    if (Math.abs(d - ROAD_RADIUS) < 4.5 || landmarks.some((l) => Math.hypot(l.x - x, l.z - z) < l.radius + 3)) continue;
    if (np < 60) {
      const s2 = 2 + rand() * 4;
      tmp.position.set(x, 0.015, z);
      tmp.rotation.set(-Math.PI / 2, 0, rand() * 3);
      tmp.scale.set(s2, s2 * (0.6 + rand() * 0.4), 1);
      tmp.updateMatrix();
      patches.setMatrixAt(np++, tmp.matrix);
    }
    if (nb < 110 && !statics.some((s) => Math.hypot(s.x - x, s.z - z) < s.r + 1.2)) {
      const s3 = 0.35 + rand() * 0.5;
      tmp.position.set(x + (rand() - 0.5) * 2, s3 * 0.5, z + (rand() - 0.5) * 2);
      tmp.rotation.set(rand() * 3, rand() * 3, 0);
      tmp.scale.setScalar(s3);
      tmp.updateMatrix();
      bushes.setMatrixAt(nb, tmp.matrix);
      bushes.setColorAt(nb++, flowerColors[Math.floor(rand() * flowerColors.length)]);
    }
  }
  patches.count = np;
  bushes.count = nb;
  patches.receiveShadow = true;
  bushes.castShadow = !opts.lowPower;
  scene.add(patches, bushes);

  /* Pushable props: cones and bowling pins */
  const props: Prop[] = [];
  const coneGeo = new ConeGeometry(0.45, 1.3, 10);
  const coneMat = std("#ff7a2e");
  for (const [x, z] of cones) {
    const g = new Group();
    g.add(mesh(coneGeo, coneMat, 0, 0.65, 0));
    g.add(mesh(new BoxGeometry(1, 0.12, 1), std(C.ink), 0, 0.06, 0));
    g.position.set(x, 0, z);
    scene.add(g);
    props.push({ mesh: g, x, z, vx: 0, vz: 0, r: 0.6, down: 0, dirX: 0, dirZ: 1, kind: "cone" });
  }
  const pinGeo = new CylinderGeometry(0.22, 0.32, 1.5, 10);
  const pinHead = new SphereGeometry(0.26, 10, 8);
  for (const [x, z] of pins) {
    const g = new Group();
    g.add(mesh(pinGeo, std("#fffaf0"), 0, 0.75, 0));
    g.add(mesh(pinHead, std("#fffaf0"), 0, 1.6, 0));
    g.add(mesh(new CylinderGeometry(0.25, 0.25, 0.12, 10), std(C.ember), 0, 1.25, 0));
    g.position.set(x, 0, z);
    scene.add(g);
    props.push({ mesh: g, x, z, vx: 0, vz: 0, r: 0.4, down: 0, dirX: 0, dirZ: 1, kind: "pin" });
  }
  const pinTotal = props.filter((p) => p.kind === "pin").length;
  let pinsDown = 0;

  /* Packets */
  const packetGeo = new OctahedronGeometry(0.75, 0);
  const packetMat = new MeshStandardMaterial({ color: C.sky, emissive: "#3d8fd1", emissiveIntensity: 1.1, flatShading: true });
  const packetMeshes = packets.map(([x, z]) => {
    const m = mesh(packetGeo, packetMat, x, 1.6, z);
    scene.add(m);
    return m;
  });
  const taken = new Set<number>();

  /* Jeepney */
  const { car, body, wheels, steerers } = buildJeepney();
  scene.add(car);

  /* Dust puffs */
  const puffGeo = new SphereGeometry(0.4, 6, 5);
  const puffs = Array.from({ length: opts.lowPower ? 10 : 28 }, () => {
    const m = mesh(puffGeo, new MeshStandardMaterial({ color: "#e9d3ad", transparent: true, opacity: 0, depthWrite: false }), 0, -5, 0, false);
    scene.add(m);
    return { m, life: 0 };
  });
  let puffIndex = 0;
  const puff = (x: number, z: number) => {
    const p = puffs[puffIndex++ % puffs.length];
    p.life = 1;
    p.m.position.set(x + (Math.random() - 0.5) * 0.6, 0.4, z + (Math.random() - 0.5) * 0.6);
    p.m.scale.setScalar(0.6);
  };

  /* State */
  const SPAWN = { x: 0, z: 4, heading: 0 };
  const st = { x: SPAWN.x, z: SPAWN.z, heading: SPAWN.heading, speed: 0, steer: 0, pitch: 0, roll: 0, shake: 0 };
  const controls: Controls = { throttle: 0, steer: 0, boost: false, brake: false };
  const keys = new Set<string>();
  let mode: "attract" | "drive" = "attract";
  let zoneId: string | null = null;
  let challenge: { start: number; running: boolean } | null = null;
  let frame = 0;
  let last = performance.now();
  let raf = 0;
  let disposed = false;

  const camTarget = new Vector3();
  const camPos = new Vector3(40, 50, 60);
  const OFFSET = new Vector3(15.5, 27, 20.5);

  /* Input */
  const typing = () => {
    const el = document.activeElement as HTMLElement | null;
    return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (mode !== "drive" || typing()) return;
    const k = e.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
    keys.add(k);
    if (k === "r") reset();
  };
  const onKeyUp = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
  const onBlur = () => keys.clear();
  addEventListener("keydown", onKeyDown);
  addEventListener("keyup", onKeyUp);
  addEventListener("blur", onBlur);

  const readInput = () => {
    const up = keys.has("w") || keys.has("arrowup");
    const down = keys.has("s") || keys.has("arrowdown");
    const left = keys.has("a") || keys.has("arrowleft");
    const right = keys.has("d") || keys.has("arrowright");
    return {
      throttle: Math.max(-1, Math.min(1, (up ? 1 : 0) - (down ? 1 : 0) + controls.throttle)),
      steer: Math.max(-1, Math.min(1, (right ? 1 : 0) - (left ? 1 : 0) + controls.steer)),
      boost: keys.has("shift") || controls.boost,
      brake: keys.has(" ") || controls.brake,
    };
  };

  /* Resize */
  const resize = () => {
    const parent = canvas.parentElement;
    if (!parent) return;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    // Phones in portrait get a wider view so the island isn't cramped.
    camera.fov = camera.aspect < 0.8 ? 52 : 38;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  if (canvas.parentElement) ro.observe(canvas.parentElement);
  resize();

  /* Labels projected from 3D */
  const labelEls = new Map<string, HTMLElement>();
  opts.labels.querySelectorAll<HTMLElement>("[data-landmark]").forEach((el) => labelEls.set(el.dataset.landmark!, el));
  const v = new Vector3();
  const placeLabels = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    for (const l of landmarks) {
      const el = labelEls.get(l.id);
      if (!el) continue;
      v.set(l.x, l.kind === "stage" ? 10 : 9, l.z).project(camera);
      const dist = mode === "drive" ? Math.hypot(st.x - l.x, st.z - l.z) : 30;
      const visible = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1 && dist < 60;
      el.style.opacity = visible ? String(Math.max(0, Math.min(1, (60 - dist) / 25))) : "0";
      el.style.transform = `translate(-50%, -100%) translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px)`;
      el.dataset.active = String(zoneId === l.id);
    }
  };

  /* Minimap */
  const mm = opts.minimap?.getContext("2d") ?? null;
  const drawMinimap = () => {
    if (!mm || !opts.minimap) return;
    const size = opts.minimap.width;
    const s = size / (ISLAND_RADIUS * 2.3);
    mm.clearRect(0, 0, size, size);
    mm.save();
    mm.translate(size / 2, size / 2);
    mm.fillStyle = "rgba(241,215,166,0.95)";
    mm.beginPath();
    mm.arc(0, 0, ISLAND_RADIUS * s, 0, Math.PI * 2);
    mm.fill();
    mm.strokeStyle = "rgba(0,48,73,0.25)";
    mm.lineWidth = 6 * s;
    mm.beginPath();
    mm.arc(0, 0, ROAD_RADIUS * s, 0, Math.PI * 2);
    mm.stroke();
    for (const l of landmarks) {
      mm.fillStyle = l.id === zoneId ? "#003049" : "#c1121f";
      mm.beginPath();
      mm.arc(l.x * s, l.z * s, 3.2, 0, Math.PI * 2);
      mm.fill();
    }
    mm.fillStyle = "#3d8fd1";
    packets.forEach(([x, z], i) => {
      if (taken.has(i)) return;
      mm.fillRect(x * s - 1.5, z * s - 1.5, 3, 3);
    });
    mm.translate(st.x * s, st.z * s);
    mm.rotate(-st.heading);
    mm.fillStyle = "#003049";
    mm.beginPath();
    mm.moveTo(0, -6);
    mm.lineTo(4.5, 5);
    mm.lineTo(-4.5, 5);
    mm.closePath();
    mm.fill();
    mm.restore();
  };

  function reset() {
    st.x = SPAWN.x;
    st.z = SPAWN.z;
    st.heading = SPAWN.heading;
    st.speed = 0;
  }

  /* Physics step */
  const carCircles = () => {
    const fx = -Math.sin(st.heading);
    const fz = -Math.cos(st.heading);
    return [
      { x: st.x + fx * 1.25, z: st.z + fz * 1.25, r: 1.35 },
      { x: st.x - fx * 1.25, z: st.z - fz * 1.25, r: 1.35 },
    ];
  };

  const step = (dt: number, t: number) => {
    const input = mode === "drive" ? readInput() : { throttle: 0, steer: 0, boost: false, brake: false };
    const max = input.boost ? 30 : 20;
    const accel = input.boost ? 26 : 17;
    const prevSpeed = st.speed;
    if (input.throttle > 0) st.speed += accel * input.throttle * dt * (st.speed < 0 ? 2 : 1);
    else if (input.throttle < 0) st.speed += accel * input.throttle * dt * (st.speed > 0 ? 1.6 : 0.7);
    st.speed *= 1 - (input.throttle === 0 ? 1.6 : 0.35) * dt;
    if (input.brake) st.speed *= 1 - 5 * dt;
    st.speed = Math.max(-9, Math.min(max, st.speed));
    if (Math.abs(st.speed) < 0.02 && input.throttle === 0) st.speed = 0;

    st.steer += (input.steer - st.steer) * Math.min(1, dt * 10);
    const grip = Math.min(1, Math.abs(st.speed) / 6);
    st.heading -= st.steer * 2.1 * dt * grip * Math.sign(st.speed || 1) * (input.brake ? 1.35 : 1);

    const fx = -Math.sin(st.heading);
    const fz = -Math.cos(st.heading);
    st.x += fx * st.speed * dt;
    st.z += fz * st.speed * dt;

    // Static collisions: push both car circles out of trees and landmarks.
    let hit = false;
    for (const c of carCircles()) {
      for (const s of statics) {
        const dx = c.x - s.x;
        const dz = c.z - s.z;
        const d = Math.hypot(dx, dz);
        const min = c.r + s.r;
        if (d < min && d > 0.0001) {
          st.x += (dx / d) * (min - d);
          st.z += (dz / d) * (min - d);
          hit = true;
        }
      }
    }
    // The sea is a wall (a soft one).
    const rr = Math.hypot(st.x, st.z);
    if (rr > ISLAND_RADIUS - 3) {
      st.x *= (ISLAND_RADIUS - 3) / rr;
      st.z *= (ISLAND_RADIUS - 3) / rr;
      hit = true;
    }
    if (hit && Math.abs(st.speed) > 3) {
      st.shake = Math.min(1, Math.abs(st.speed) / 20);
      st.speed *= -0.35;
    } else if (hit) st.speed *= 0.5;

    // Props: the jeepney shoves them, they shove each other.
    const vxCar = fx * st.speed;
    const vzCar = fz * st.speed;
    for (const p of props) {
      for (const c of carCircles()) {
        const dx = p.x - c.x;
        const dz = p.z - c.z;
        const d = Math.hypot(dx, dz);
        const min = c.r + p.r;
        if (d < min && d > 0.0001) {
          const nx = dx / d;
          const nz = dz / d;
          p.x += nx * (min - d);
          p.z += nz * (min - d);
          const impact = Math.abs(st.speed);
          p.vx += vxCar * 0.9 + nx * (2 + impact * 0.4);
          p.vz += vzCar * 0.9 + nz * (2 + impact * 0.4);
          st.speed *= 0.97;
        }
      }
    }
    for (let i = 0; i < props.length; i++)
      for (let j = i + 1; j < props.length; j++) {
        const a = props[i];
        const b = props[j];
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const d = Math.hypot(dx, dz);
        const min = a.r + b.r;
        if (d < min && d > 0.0001) {
          const nx = dx / d;
          const nz = dz / d;
          const push = (min - d) / 2;
          a.x -= nx * push;
          a.z -= nz * push;
          b.x += nx * push;
          b.z += nz * push;
          const rel = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz;
          if (rel > 0) {
            a.vx -= rel * nx * 0.9;
            a.vz -= rel * nz * 0.9;
            b.vx += rel * nx * 0.9;
            b.vz += rel * nz * 0.9;
          }
        }
      }
    let down = 0;
    for (const p of props) {
      const sp = Math.hypot(p.vx, p.vz);
      if (sp > 2.2 && p.down === 0) {
        p.down = 0.001;
        p.dirX = p.vx / sp;
        p.dirZ = p.vz / sp;
      }
      p.x += p.vx * dt;
      p.z += p.vz * dt;
      p.vx *= 1 - 2.4 * dt;
      p.vz *= 1 - 2.4 * dt;
      for (const s of statics) {
        const dx = p.x - s.x;
        const dz = p.z - s.z;
        const d = Math.hypot(dx, dz);
        if (d < s.r + p.r && d > 0.0001) {
          p.x = s.x + (dx / d) * (s.r + p.r);
          p.z = s.z + (dz / d) * (s.r + p.r);
          p.vx *= -0.4;
          p.vz *= -0.4;
        }
      }
      if (p.down > 0) p.down = Math.min(1, p.down + dt * 3.5);
      p.mesh.position.set(p.x, p.down * 0.3, p.z);
      // Topple over in the direction it was hit.
      p.mesh.rotation.set(p.dirZ * p.down * (Math.PI / 2), 0, -p.dirX * p.down * (Math.PI / 2));
      if (p.kind === "pin" && p.down > 0.5) down++;
    }
    if (down !== pinsDown) {
      pinsDown = down;
      cb.onPins(down, pinTotal);
    }

    // Packets
    packetMeshes.forEach((m, i) => {
      if (taken.has(i)) return;
      m.rotation.y = t * 1.6 + i;
      m.position.y = 1.6 + Math.sin(t * 2 + i) * 0.35;
      if (mode === "drive" && Math.hypot(packets[i][0] - st.x, packets[i][1] - st.z) < 2.8) {
        taken.add(i);
        m.visible = false;
        cb.onPackets(taken.size, packets.length);
        if (challenge?.running && taken.size === packets.length) {
          challenge.running = false;
          cb.onChallenge({ running: false, ms: performance.now() - challenge.start, finished: performance.now() - challenge.start });
        }
      }
    });

    // Zones
    let near: Landmark | null = null;
    if (mode === "drive") {
      for (const l of landmarks) if (Math.hypot(l.x - st.x, l.z - st.z) < l.zone) near = l;
    }
    if ((near?.id ?? null) !== zoneId) {
      zoneId = near?.id ?? null;
      cb.onZone(near);
    }

    // Body motion: lean into turns, squat under acceleration, wheels spin and steer.
    const a = (st.speed - prevSpeed) / Math.max(dt, 0.001);
    st.pitch += (Math.max(-0.08, Math.min(0.08, -a * 0.006)) - st.pitch) * Math.min(1, dt * 8);
    st.roll += (st.steer * grip * Math.min(1, Math.abs(st.speed) / 15) * 0.09 - st.roll) * Math.min(1, dt * 8);
    car.position.set(st.x, 0, st.z);
    car.rotation.y = st.heading;
    body.rotation.set(st.pitch, 0, st.roll);
    body.position.y = Math.sin(t * 18) * 0.015 * Math.min(1, Math.abs(st.speed) / 4);
    wheels.forEach((w) => (w.rotation.x -= (st.speed * dt) / 0.52));
    steerers.forEach((s) => (s.rotation.y = -st.steer * 0.5));

    // Dust when accelerating hard or drifting
    if (mode === "drive" && Math.abs(st.speed) > 6 && (Math.abs(a) > 8 || (Math.abs(st.steer) > 0.6 && Math.abs(st.speed) > 12)) && frame % 2 === 0) {
      puff(st.x - fx * 2.2 + fz * 1.1, st.z - fz * 2.2 - fx * 1.1);
      puff(st.x - fx * 2.2 - fz * 1.1, st.z - fz * 2.2 + fx * 1.1);
    }
    for (const p of puffs) {
      if (p.life <= 0) continue;
      p.life -= dt * 1.6;
      p.m.scale.setScalar(0.6 + (1 - p.life) * 1.6);
      p.m.position.y += dt * 0.8;
      (p.m.material as MeshStandardMaterial).opacity = Math.max(0, p.life) * 0.55;
    }

    for (const an of animated) an.update(t, dt);
    if (challenge?.running && frame % 6 === 0) cb.onChallenge({ running: true, ms: performance.now() - challenge.start });

    // Camera
    if (mode === "drive") {
      camTarget.set(st.x + fx * st.speed * 0.25, 0.5, st.z + fz * st.speed * 0.25);
      const want = camTarget.clone().add(OFFSET.clone().multiplyScalar(1 + Math.abs(st.speed) / 80));
      camPos.lerp(want, Math.min(1, dt * 3.2));
    } else {
      const ang = t * 0.08;
      camTarget.set(0, 0, 0);
      camPos.lerp(new Vector3(Math.cos(ang) * 82, 62, Math.sin(ang) * 82), Math.min(1, dt * 1.5));
    }
    st.shake *= 1 - dt * 6;
    camera.position.copy(camPos);
    camera.position.x += (Math.random() - 0.5) * st.shake * 0.6;
    camera.position.y += (Math.random() - 0.5) * st.shake * 0.6;
    camera.lookAt(camTarget);

    // Keep the sun's shadow box around the jeepney.
    sun.position.set(st.x + 30, 50, st.z + 20);
    sun.target.position.set(st.x, 0, st.z);
  };

  const loop = (now: number) => {
    if (disposed) return;
    raf = requestAnimationFrame(loop);
    if (document.hidden) {
      last = now;
      return;
    }
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    frame++;
    step(dt, now / 1000);
    renderer.render(scene, camera);
    placeLabels();
    if (frame % 2 === 0) drawMinimap();
    if (frame === 2) cb.onReady();
  };
  raf = requestAnimationFrame(loop);

  return {
    drive: () => {
      mode = "drive";
      reset();
    },
    setControls: (c) => Object.assign(controls, c),
    startChallenge: () => {
      taken.clear();
      packetMeshes.forEach((m) => (m.visible = true));
      reset();
      challenge = { start: performance.now(), running: true };
      cb.onPackets(0, packets.length);
      cb.onChallenge({ running: true, ms: 0 });
    },
    reset,
    dispose: () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      removeEventListener("keydown", onKeyDown);
      removeEventListener("keyup", onKeyUp);
      removeEventListener("blur", onBlur);
      scene.traverse((o) => {
        const m = o as Mesh;
        m.geometry?.dispose?.();
        const mat = m.material as Material | Material[] | undefined;
        for (const x of Array.isArray(mat) ? mat : mat ? [mat] : []) {
          (x as MeshStandardMaterial).map?.dispose();
          x.dispose();
        }
      });
      renderer.dispose();
    },
  };
}
