import {
  ACESFilmicToneMapping,
  BoxGeometry,
  CircleGeometry,
  Color,
  DirectionalLight,
  Euler,
  Fog,
  HemisphereLight,
  InstancedMesh,
  type Material,
  type Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  OctahedronGeometry,
  PCFShadowMap,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  type PointsMaterial,
  Quaternion,
  RingGeometry,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from "three";
import { haptic } from "@/lib/haptics";
import { createAudio, type DriveAudio } from "./audio";
import { buildJeepney, C, type PaintId, part, std } from "./jeepney";
import { type Animated, buildLandmark, rng } from "./landmarks";
import { buildNature, type Static } from "./nature";
import { createPasada, type PasadaEvent, type PasadaStatus, stops } from "./pasada";
import { createPhysics, FIXED, type Rack } from "./physics";
import { buildPlaces } from "./places";
import { buildClouds, buildRamps, buildSea, buildSky, buildStars, buildTerrain, groundAt, heightAt, rampHeight } from "./terrain";
import { COVE, HILL, ISLAND_RADIUS, LANE, landmarks, LOOKOUT, packets, PIER, places, props as propSpots, ramps, ROAD_HALF, ROAD_RADIUS, roadDist, secrets, spokes, TOWN, TRAIL_HALF, trailRadius, type Landmark } from "./world";

// Island Drive: a small three.js world in the site's palette.
//   · the jeepney runs on custom arcade vehicle physics (grip, drifting,
//     jumps, suspension) at a fixed 60 Hz step, interpolated for rendering
//   · pins, cones, crates, drums and balls are cannon-es rigid bodies you
//     can knock flying; they tidy themselves back up out of sight
//   · three cameras: chase, first-person cockpit and a map view
//   · day, golden hour and night, with street lamps and headlights
//   · quality scales with the device and adapts to the frame rate

export type CameraMode = "chase" | "cockpit" | "map";
export type TimeOfDay = "day" | "golden" | "night";
export type Quality = "low" | "medium" | "high";

export interface Controls {
  throttle: number; // -1 … 1
  steer: number; // -1 (left) … 1 (right)
  boost: boolean;
  brake: boolean; // handbrake: drift
}

export interface DriveCallbacks {
  onZone: (landmark: Landmark | null) => void;
  onPackets: (collected: number, total: number) => void;
  onChallenge: (state: { running: boolean; ms: number; finished?: number }) => void;
  /** A bowling rack was hit: all down is a strike. */
  onPins: (down: number, total: number, rack: string) => void;
  /** A hidden star was found (its index), and how many of them have been. */
  onSecret?: (index: number, found: number, total: number) => void;
  /** Entered (or left) a named place that isn't a project. */
  onPlace?: (place: { name: string; line: string } | null) => void;
  onAir: (seconds: number) => void;
  onCamera: (mode: CameraMode) => void;
  onTime: (time: TimeOfDay) => void;
  /** Pasada (passenger) mode: where to go next, and what just happened. */
  onMission: (status: PasadaStatus, event?: PasadaEvent) => void;
  onReady: () => void;
}

export interface DriveEngine {
  drive: () => void;
  /** Back to the orbiting title view: input off, sound paused. */
  stop: () => void;
  setControls: (c: Partial<Controls>) => void;
  startChallenge: () => void;
  reset: () => void;
  /** Puts every knocked-over prop back. */
  resetProps: () => void;
  /** Which hidden stars were already found (remembered by the page). */
  setSecrets: (found: number[]) => void;
  cycleCamera: () => void;
  cycleTime: () => void;
  horn: () => void;
  setMuted: (muted: boolean) => void;
  /** Drag-to-look, in pixels. */
  look: (dx: number, dy: number) => void;
  setPasada: (on: boolean) => void;
  setPaint: (id: PaintId) => void;
  /** A JPEG of the current view, for photo mode. */
  capture: () => string | null;
  dispose: () => void;
}

const CAMERAS: CameraMode[] = ["chase", "cockpit", "map"];
const TIMES_ORDER: TimeOfDay[] = ["day", "golden", "night"];

const TIMES: Record<TimeOfDay, { top: string; horizon: string; bottom: string; fog: string; sun: string; sunI: number; sunDir: [number, number, number]; hemiSky: string; hemiGround: string; hemiI: number; deep: string; shallow: string; stars: number; night: number; exposure: number }> = {
  day: { top: "#7fb3d5", horizon: "#fbeacb", bottom: "#f1d7a6", fog: "#f3e3c3", sun: "#fff1d6", sunI: 2.4, sunDir: [0.45, 0.75, 0.35], hemiSky: "#fff6e5", hemiGround: "#c99f66", hemiI: 1.25, deep: "#3f7ea6", shallow: "#8fd0d8", stars: 0, night: 0, exposure: 1 },
  golden: { top: "#4f78a6", horizon: "#f7b27a", bottom: "#c98a5a", fog: "#eeb487", sun: "#ffb37a", sunI: 2.2, sunDir: [0.82, 0.2, -0.45], hemiSky: "#ffd2a8", hemiGround: "#7a5038", hemiI: 0.85, deep: "#2f5d86", shallow: "#6fb0bf", stars: 0.12, night: 0.35, exposure: 1.02 },
  night: { top: "#040a1a", horizon: "#1d2c4c", bottom: "#0a1222", fog: "#131f38", sun: "#b4c6ff", sunI: 0.9, sunDir: [-0.35, 0.75, -0.4], hemiSky: "#5a70a3", hemiGround: "#2a2018", hemiI: 0.95, deep: "#0b1c33", shallow: "#1d3b5a", stars: 1, night: 1, exposure: 1.3 },
};

const GRAVITY = 22;
const WHEELBASE = 3.2;
const SPAWN = { x: 0, z: 4, heading: 0 };

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const damp = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);
const angleLerp = (a: number, b: number, k: number) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;

export function createDriveEngine(
  canvas: HTMLCanvasElement,
  opts: { quality: Quality; reducedMotion: boolean; touch: boolean; labels: HTMLElement; minimap: HTMLCanvasElement | null; speedo: HTMLElement | null },
  cb: DriveCallbacks,
): DriveEngine {
  const Q = { low: 0.25, medium: 0.6, high: 1 }[opts.quality];
  const shadows = opts.quality !== "low";
  const maxPixelRatio = Math.min(devicePixelRatio, { low: 1, medium: 1.5, high: 1.75 }[opts.quality]);
  let pixelRatio = maxPixelRatio;

  const renderer = new WebGLRenderer({ canvas, antialias: opts.quality !== "low", powerPreference: "high-performance" });
  renderer.setPixelRatio(pixelRatio);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.shadowMap.enabled = shadows;
  renderer.shadowMap.type = opts.quality === "high" ? PCFSoftShadowMap : PCFShadowMap;

  const scene = new Scene();
  const fog = new Fog(TIMES.day.fog, 150, 390);
  scene.fog = fog;
  scene.background = new Color(TIMES.day.fog);

  const camera = new PerspectiveCamera(60, 1, 0.5, 760);
  const hemi = new HemisphereLight(TIMES.day.hemiSky, TIMES.day.hemiGround, TIMES.day.hemiI);
  scene.add(hemi);
  const sun = new DirectionalLight(TIMES.day.sun, TIMES.day.sunI);
  sun.castShadow = shadows;
  const shadowSize = opts.quality === "high" ? 2048 : 1024;
  sun.shadow.mapSize.set(shadowSize, shadowSize);
  const sc = sun.shadow.camera;
  sc.left = sc.bottom = opts.quality === "high" ? -42 : -32;
  sc.right = sc.top = opts.quality === "high" ? 42 : 32;
  sc.near = 1;
  sc.far = 200;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);

  /* Sky, sea, island */
  const sky = buildSky();
  scene.add(sky.mesh);
  const stars = buildStars(Math.round(500 + 500 * Q));
  scene.add(stars);
  const clouds = buildClouds(Math.round(5 + 6 * Q));
  scene.add(clouds);
  const sea = buildSea(0.45 + 0.55 * Q);
  scene.add(sea.mesh);
  scene.add(buildTerrain(0.55 + 0.45 * Q));
  scene.add(buildRamps());

  // Road, plaza and centre line sit just above the flattened ground.
  const road = part(new RingGeometry(ROAD_RADIUS - ROAD_HALF, ROAD_RADIUS + ROAD_HALF, 200), std("#e8cf9f", { roughness: 0.9 }), 0, 0.03, 0, false);
  road.rotation.x = -Math.PI / 2;
  const edges = [ROAD_RADIUS - ROAD_HALF + 0.15, ROAD_RADIUS + ROAD_HALF - 0.15].map((r) => {
    const e = part(new RingGeometry(r - 0.1, r + 0.1, 200), std(C.paper), 0, 0.045, 0, false);
    e.rotation.x = -Math.PI / 2;
    return e;
  });
  const plaza = part(new CircleGeometry(9, 48), std("#ecd3a2"), 0, 0.04, 0, false);
  plaza.rotation.x = -Math.PI / 2;
  const plazaRing = part(new RingGeometry(8.6, 9, 64), std(C.ember), 0, 0.05, 0, false);
  plazaRing.rotation.x = -Math.PI / 2;
  scene.add(road, ...edges, plaza, plazaRing);
  const tmp = new Object3D();
  const DASHES = 88;
  const dashes = new InstancedMesh(new BoxGeometry(0.3, 0.04, 1.6), std(C.paper), DASHES);
  for (let i = 0; i < DASHES; i++) {
    const a = (i / DASHES) * Math.PI * 2;
    tmp.position.set(Math.cos(a) * ROAD_RADIUS, 0.05, Math.sin(a) * ROAD_RADIUS);
    tmp.rotation.set(0, -a, 0);
    tmp.updateMatrix();
    dashes.setMatrixAt(i, tmp.matrix);
  }
  dashes.computeBoundingSphere();
  scene.add(dashes);

  /* Landmarks */
  const animated: Animated[] = [];
  const statics: Static[] = [];
  for (const l of landmarks) {
    scene.add(buildLandmark(l, animated));
    statics.push({ x: l.x, z: l.z, r: l.radius });
  }

  /* The trail, Bayan, the bowling lane, the beach and pier, the lookout and the cove */
  const placesBuilt = buildPlaces({ statics, animated, shadows, quality: Q });
  scene.add(placesBuilt.group);

  /* Pasada: stops, passengers and the guide arrow (their sheds are solid, so before the trees and the physics) */
  const pasada = createPasada(scene, statics, rng(11));

  /* Trees, grass, rocks and lamps, kept clear of roads, props, places and landmarks */
  const keepClear: [number, number, number][] = [
    ...landmarks.map((l): [number, number, number] => [l.x, l.z, l.zone + 1]),
    ...packets.map(([x, z]): [number, number, number] => [x, z, 3]),
    ...secrets.map(([x, z]): [number, number, number] => [x, z, 3]),
    ...propSpots.map(({ x, z }): [number, number, number] => [x, z, 3]),
    ...ramps.map((r): [number, number, number] => [r.x, r.z, 10]),
    [TOWN.x, TOWN.z, 20],
    [LOOKOUT.x, LOOKOUT.z, 7],
    [COVE.x, COVE.z, COVE.r + 2],
    [0, 104, 8],
  ];
  const nearLane = (x: number, z: number, r: number) => x > LANE.x0 - 3 - r && x < LANE.x1 + 4 + r && Math.abs(z - LANE.z) < LANE.half + 4 + r;
  const nearPier = (x: number, z: number, r: number) => Math.abs(x - PIER.x) < PIER.half + 3 + r && z > PIER.z0 - 6;
  const wind = { value: 0 };
  const nature = buildNature({
    rand: rng(7),
    quality: Q,
    statics,
    wind,
    blocked: (x, z, r) => Math.hypot(x, z) < 11 || nearLane(x, z, r) || nearPier(x, z, r) || roadDist(x, z) < r - 1.2 || keepClear.some(([cx, cz, cr]) => Math.hypot(cx - x, cz - z) < cr + r),
  });
  scene.add(nature.group);

  /* Physics props: fewer of them, and fewer awake at once, on low-end devices */
  let lastBuzz = 0;
  const physics = createPhysics(
    scene,
    statics,
    placesBuilt.boxes,
    { iterations: Math.round(6 + 4 * Q), shadows, tier: opts.quality === "low" ? 0 : opts.quality === "medium" ? 1 : 2, maxAwake: { low: 18, medium: 32, high: 48 }[opts.quality] },
    (kind, strength, byCar, mass, px, py, pz) => {
      if (!byCar) {
        if (strength > 3) audio?.knock(kind, strength * 0.6);
        return;
      }
      // The jeepney loses a little speed to whatever it hits; the hit is felt and heard
      const k = 1 - Math.min(0.1, mass * 0.018 * Math.min(1, strength / 8));
      st.vx *= k;
      st.vz *= k;
      audio?.knock(kind, strength);
      if (strength > 4 && !opts.reducedMotion) st.shake = Math.max(st.shake, Math.min(0.35, mass * strength * 0.008));
      const now = performance.now();
      if (opts.touch && strength > 3 && now - lastBuzz > 120) {
        lastBuzz = now;
        haptic(Math.min(28, Math.round(6 + strength * mass * 0.6)));
      }
      if (strength > 6) puff(px, py - 0.3, pz, "#e9d3ad", 1.6);
    },
  );
  const carNow = { x: 0, z: 0 };
  const camNow = { x: 0, z: 0, fx: 0, fz: -1 };
  const onRack = (r: Rack) => {
    if (mode !== "drive") return;
    if (r.down === r.total) audio?.strike();
    if (r.down === r.total && opts.touch) haptic(40);
    cb.onPins(r.down, r.total, r.name);
  };

  /* Hidden stars: found once, remembered by the page */
  const starGeo = new OctahedronGeometry(0.62, 0);
  const starMat = new MeshStandardMaterial({ color: "#ffd27a", emissive: "#ffb347", emissiveIntensity: 1.1, flatShading: true, metalness: 0.3, roughness: 0.3 });
  const starPos = secrets.map(([x, z, h]) => new Vector3(x, groundAt(x, z) + h, z));
  const starMeshes = starPos.map((p) => {
    const m = part(starGeo, starMat, p.x, p.y, p.z, shadows);
    m.scale.set(1, 1.5, 1);
    scene.add(m);
    return m;
  });
  const starsFound = new Set<number>();

  /* Packets */
  const packetGeo = new OctahedronGeometry(0.75, 0);
  const packetMat = new MeshStandardMaterial({ color: C.sky, emissive: "#3d8fd1", emissiveIntensity: 1.2, flatShading: true });
  const packetPos = packets.map(([x, z, h]) => new Vector3(x, groundAt(x, z) + h, z));
  const packetMeshes = packetPos.map((p) => {
    const m = part(packetGeo, packetMat, p.x, p.y, p.z, shadows);
    scene.add(m);
    return m;
  });
  const taken = new Set<number>();

  /* Jeepney */
  const jeep = buildJeepney();
  const { car: carMesh, body, wheels, steerers, cockpit } = jeep;
  scene.add(carMesh);

  /* Dust, exhaust and skid marks */
  const puffGeo = new SphereGeometry(0.4, 6, 5);
  const puffs = Array.from({ length: Math.round(14 + 20 * Q) }, () => {
    const m = part(puffGeo, new MeshStandardMaterial({ color: "#e9d3ad", transparent: true, opacity: 0, depthWrite: false }), 0, -50, 0, false);
    scene.add(m);
    return { m, life: 0, rise: 0.8 };
  });
  let puffIndex = 0;
  const puff = (x: number, y: number, z: number, color: string, rise = 0.8) => {
    const p = puffs[puffIndex++ % puffs.length];
    p.life = 1;
    p.rise = rise;
    (p.m.material as MeshStandardMaterial).color.set(color);
    p.m.position.set(x + (Math.random() - 0.5) * 0.6, y + 0.4, z + (Math.random() - 0.5) * 0.6);
    p.m.scale.setScalar(0.6);
  };
  const SKIDS = 220;
  const skids = new InstancedMesh(new PlaneGeometry(0.34, 0.8), new MeshBasicMaterial({ color: "#3a2f28", transparent: true, opacity: 0.32, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), SKIDS);
  skids.count = 0;
  skids.frustumCulled = false;
  scene.add(skids);
  let skidIndex = 0;
  const mark = new Object3D();
  mark.rotation.order = "YXZ";
  const skidAt = (x: number, z: number, heading: number) => {
    // Lie flat, long side along the direction of travel
    mark.position.set(x, groundAt(x, z) + 0.06, z);
    mark.rotation.set(-Math.PI / 2, heading, 0);
    mark.updateMatrix();
    skids.setMatrixAt(skidIndex % SKIDS, mark.matrix);
    skidIndex++;
    skids.count = Math.min(SKIDS, skidIndex);
    skids.instanceMatrix.needsUpdate = true;
  };

  /* State */
  const st = {
    x: SPAWN.x,
    y: groundAt(SPAWN.x, SPAWN.z),
    z: SPAWN.z,
    heading: SPAWN.heading,
    vx: 0,
    vz: 0,
    vy: 0,
    vF: 0,
    yawRate: 0,
    steer: 0,
    air: false,
    airTime: 0,
    pitch: 0,
    roll: 0,
    squat: 0,
    lean: 0,
    susp: 0,
    suspV: 0,
    slip: 0,
    shake: 0,
    skidDist: 0,
    accel: 0,
    lateral: 0,
  };
  const prev = { x: st.x, y: st.y, z: st.z, heading: st.heading, pitch: 0, roll: 0 };
  const controls: Controls = { throttle: 0, steer: 0, boost: false, brake: false };
  const keys = new Set<string>();
  let mode: "attract" | "drive" = "attract";
  let camMode: CameraMode = "chase";
  let timeOfDay: TimeOfDay = "day";
  let zoneId: string | null = null;
  let placeName: string | null = null;
  let challenge: { start: number; running: boolean } | null = null;
  let frame = 0;
  let last = performance.now();
  let acc = 0;
  let raf = 0;
  let disposed = false;
  let audio: DriveAudio | null = null;
  let muted = false;
  let input = { throttle: 0, steer: 0, boost: false, brake: false };
  let look = { yaw: 0, pitch: 0, idle: 0 };
  const padPrev: boolean[] = [];

  /* Input */
  const typing = () => {
    const el = document.activeElement as HTMLElement | null;
    return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (mode !== "drive" || typing() || e.metaKey || e.ctrlKey) return;
    const k = e.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
    if (e.repeat) return;
    keys.add(k);
    if (k === "r") reset();
    else if (k === "c") cycleCamera();
    else if (k === "n") cycleTime();
    else if (k === "h") horn();
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
    let throttle = (up ? 1 : 0) - (down ? 1 : 0) + controls.throttle;
    let steer = (right ? 1 : 0) - (left ? 1 : 0) + controls.steer;
    let boost = keys.has("shift") || controls.boost;
    let brake = keys.has(" ") || controls.brake;
    // Gamepads: left stick steers, triggers drive, A boosts, X drifts, B horn, Y camera
    const pads = navigator.getGamepads?.() ?? [];
    for (const pad of pads) {
      if (!pad) continue;
      const sx = pad.axes[0] ?? 0;
      if (Math.abs(sx) > 0.12) steer += sx;
      throttle += (pad.buttons[7]?.value ?? 0) - (pad.buttons[6]?.value ?? 0);
      const sy = pad.axes[1] ?? 0;
      if (!pad.buttons[7]?.value && !pad.buttons[6]?.value && Math.abs(sy) > 0.3) throttle -= sy;
      boost ||= !!pad.buttons[0]?.pressed;
      brake ||= !!pad.buttons[2]?.pressed;
      const pressed = (i: number) => {
        const now = !!pad.buttons[i]?.pressed;
        const was = padPrev[i];
        padPrev[i] = now;
        return now && !was;
      };
      if (pressed(3)) cycleCamera();
      if (pressed(1)) horn();
      if (pressed(9)) reset();
    }
    return { throttle: clamp(throttle, -1, 1), steer: clamp(steer, -1, 1), boost, brake };
  };

  /* Resize */
  let portrait = false;
  const resize = () => {
    const parent = canvas.parentElement;
    if (!parent) return;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    portrait = camera.aspect < 0.8;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  if (canvas.parentElement) ro.observe(canvas.parentElement);
  resize();

  /* Labels projected from 3D */
  const labelEls = new Map<string, HTMLElement>();
  opts.labels.querySelectorAll<HTMLElement>("[data-landmark]").forEach((el) => labelEls.set(el.dataset.landmark!, el));
  const labelAt = landmarks.map((l) => new Vector3(l.x, heightAt(l.x, l.z) + (l.kind === "stage" ? 10 : 9), l.z));
  const v = new Vector3();
  const placeLabels = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    landmarks.forEach((l, i) => {
      const el = labelEls.get(l.id);
      if (!el) return;
      v.copy(labelAt[i]).project(camera);
      const dist = mode === "drive" ? Math.hypot(st.x - l.x, st.z - l.z) : 30;
      const visible = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1 && dist < 70;
      el.style.opacity = visible ? String(clamp((70 - dist) / 25, 0, 1)) : "0";
      el.style.transform = `translate(-50%, -100%) translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px)`;
      el.dataset.active = String(zoneId === l.id);
    });
  };

  /* Minimap */
  const mm = opts.minimap?.getContext("2d") ?? null;
  const drawMinimap = () => {
    if (!mm || !opts.minimap) return;
    const size = opts.minimap.width;
    const s = size / (ISLAND_RADIUS * 2.15);
    mm.clearRect(0, 0, size, size);
    mm.save();
    mm.translate(size / 2, size / 2);
    mm.fillStyle = "rgba(199,207,147,0.95)";
    mm.beginPath();
    mm.arc(0, 0, ISLAND_RADIUS * s, 0, Math.PI * 2);
    mm.fill();
    mm.strokeStyle = "rgba(241,215,166,1)";
    mm.lineWidth = 4 * s;
    mm.beginPath();
    mm.arc(0, 0, (ISLAND_RADIUS - 3) * s, 0, Math.PI * 2);
    mm.stroke();
    // The hill, the town and the dirt roads, under the paved ring
    mm.fillStyle = "rgba(214,210,154,0.9)";
    mm.beginPath();
    mm.arc(HILL.x * s, HILL.z * s, HILL.r * 0.6 * s, 0, Math.PI * 2);
    mm.fill();
    mm.strokeStyle = "rgba(160,120,70,0.55)";
    mm.lineWidth = Math.max(1.5, TRAIL_HALF * 2 * s);
    mm.beginPath();
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * Math.PI * 2;
      const tr = trailRadius(a) * s;
      if (i === 0) mm.moveTo(Math.cos(a) * tr, Math.sin(a) * tr);
      else mm.lineTo(Math.cos(a) * tr, Math.sin(a) * tr);
    }
    for (const sp of spokes) {
      mm.moveTo(sp.x1 * s, sp.z1 * s);
      mm.lineTo(sp.x2 * s, sp.z2 * s);
    }
    mm.stroke();
    mm.strokeStyle = "rgba(122,79,42,0.85)";
    mm.lineWidth = Math.max(2, PIER.half * 2 * s);
    mm.beginPath();
    mm.moveTo(PIER.x * s, PIER.z0 * s);
    mm.lineTo(PIER.x * s, PIER.z1 * s);
    mm.stroke();
    mm.fillStyle = "rgba(236,211,162,1)";
    mm.beginPath();
    mm.arc(TOWN.x * s, TOWN.z * s, TOWN.r * s, 0, Math.PI * 2);
    mm.fill();
    mm.fillRect(LANE.x0 * s, (LANE.z - LANE.half) * s, (LANE.x1 - LANE.x0) * s, LANE.half * 2 * s);
    mm.strokeStyle = "rgba(0,48,73,0.3)";
    mm.lineWidth = ROAD_HALF * 2 * s;
    mm.beginPath();
    mm.arc(0, 0, ROAD_RADIUS * s, 0, Math.PI * 2);
    mm.stroke();
    mm.fillStyle = "#c1121f";
    for (const r of ramps) mm.fillRect(r.x * s - 2, r.z * s - 2, 4, 4);
    for (const l of landmarks) {
      mm.fillStyle = l.id === zoneId ? "#003049" : "#780000";
      mm.beginPath();
      mm.arc(l.x * s, l.z * s, 3.2, 0, Math.PI * 2);
      mm.fill();
    }
    mm.fillStyle = "#3d8fd1";
    packetPos.forEach((p, i) => {
      if (!taken.has(i)) mm.fillRect(p.x * s - 1.5, p.z * s - 1.5, 3, 3);
    });
    mm.fillStyle = "#fdf0d5";
    for (const b of physics.balls) {
      mm.beginPath();
      mm.arc(b.position.x * s, b.position.z * s, 2.2, 0, Math.PI * 2);
      mm.fill();
    }
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
    st.y = groundAt(st.x, st.z);
    st.heading = SPAWN.heading;
    st.vx = st.vz = st.vy = st.vF = st.yawRate = 0;
    st.air = false;
    Object.assign(prev, { x: st.x, y: st.y, z: st.z, heading: st.heading });
    physics.reset();
  }

  function cycleCamera() {
    camMode = CAMERAS[(CAMERAS.indexOf(camMode) + 1) % CAMERAS.length];
    applyCamera();
    cb.onCamera(camMode);
  }
  function applyCamera() {
    cockpit.visible = camMode === "cockpit";
    camera.near = camMode === "cockpit" ? 0.06 : 0.5;
    camera.updateProjectionMatrix();
    look = { yaw: 0, pitch: 0, idle: 0 };
  }
  function cycleTime() {
    timeOfDay = TIMES_ORDER[(TIMES_ORDER.indexOf(timeOfDay) + 1) % TIMES_ORDER.length];
    cb.onTime(timeOfDay);
  }
  function horn() {
    audio?.horn();
  }

  /* Time of day: everything eases towards the chosen preset */
  const cur = {
    top: new Color(TIMES.day.top),
    horizon: new Color(TIMES.day.horizon),
    bottom: new Color(TIMES.day.bottom),
    fog: new Color(TIMES.day.fog),
    sun: new Color(TIMES.day.sun),
    hemiSky: new Color(TIMES.day.hemiSky),
    hemiGround: new Color(TIMES.day.hemiGround),
    deep: new Color(TIMES.day.deep),
    shallow: new Color(TIMES.day.shallow),
    sunDir: new Vector3(...TIMES.day.sunDir).normalize(),
    sunI: TIMES.day.sunI,
    hemiI: TIMES.day.hemiI,
    stars: 0,
    night: 0,
    exposure: 1,
  };
  const target = new Color();
  const targetDir = new Vector3();
  const applyTime = (dt: number) => {
    const p = TIMES[timeOfDay];
    const k = damp(2.2, dt);
    for (const key of ["top", "horizon", "bottom", "fog", "sun", "hemiSky", "hemiGround", "deep", "shallow"] as const) cur[key].lerp(target.set(p[key]), k);
    cur.sunDir.lerp(targetDir.set(...p.sunDir).normalize(), k).normalize();
    cur.sunI += (p.sunI - cur.sunI) * k;
    cur.hemiI += (p.hemiI - cur.hemiI) * k;
    cur.stars += (p.stars - cur.stars) * k;
    cur.night += (p.night - cur.night) * k;
    cur.exposure += (p.exposure - cur.exposure) * k;
    sky.uniforms.uTop.value.copy(cur.top);
    sky.uniforms.uHorizon.value.copy(cur.horizon);
    sky.uniforms.uBottom.value.copy(cur.bottom);
    sky.uniforms.uSunColor.value.copy(cur.sun);
    sky.uniforms.uSunDir.value.copy(cur.sunDir);
    sky.uniforms.uSunSize.value = 1 + cur.night * 1.5; // a bigger moon
    fog.color.copy(cur.fog);
    (scene.background as Color).copy(cur.fog);
    sun.color.copy(cur.sun);
    sun.intensity = cur.sunI;
    hemi.color.copy(cur.hemiSky);
    hemi.groundColor.copy(cur.hemiGround);
    hemi.intensity = cur.hemiI;
    sea.uniforms.uDeep.value.copy(cur.deep);
    sea.uniforms.uShallow.value.copy(cur.shallow);
    sea.uniforms.uSunColor.value.copy(cur.sun);
    sea.uniforms.uSunDir.value.copy(cur.sunDir);
    sea.uniforms.uSky.value.copy(cur.horizon);
    (stars.material as PointsMaterial).opacity = cur.stars;
    stars.visible = cur.stars > 0.02;
    nature.setNight(cur.night);
    placesBuilt.setNight(cur.night);
    clouds.userData.setNight?.(cur.night);
    renderer.toneMappingExposure = cur.exposure;
  };

  /* ───────── vehicle physics (one fixed step) ───────── */
  const carStep = (dt: number) => {
    const fx = -Math.sin(st.heading);
    const fz = -Math.cos(st.heading);
    const rx = Math.cos(st.heading);
    const rz = -Math.sin(st.heading);
    let vF = st.vx * fx + st.vz * fz;
    let vR = st.vx * rx + st.vz * rz;
    const before = vF;

    st.steer += (input.steer - st.steer) * Math.min(1, dt * 9);

    // Ground under the four corners: slope, pitch and roll
    const hF = groundAt(st.x + fx * 1.6, st.z + fz * 1.6);
    const hB = groundAt(st.x - fx * 1.6, st.z - fz * 1.6);
    const hL = groundAt(st.x - rx * 1.1, st.z - rz * 1.1);
    const hR = groundAt(st.x + rx * 1.1, st.z + rz * 1.1);

    const r = Math.hypot(st.x, st.z);
    const onPier = st.z > PIER.z0 - 0.5 && Math.abs(st.x - PIER.x) < PIER.half + 0.5;
    const paved =
      Math.abs(r - ROAD_RADIUS) < ROAD_HALF + 0.2 ||
      r < 9.3 ||
      rampHeight(st.x, st.z) > 0 ||
      onPier ||
      Math.hypot(st.x - TOWN.x, st.z - TOWN.z) < TOWN.r ||
      (st.x > LANE.x0 && st.x < LANE.x1 && Math.abs(st.z - LANE.z) < LANE.half);
    const dirt = !paved && roadDist(st.x, st.z) < 0.2;
    const onSand = !paved && !dirt && r > ISLAND_RADIUS - 11;
    const surface = paved ? 1 : dirt ? 0.95 : onSand ? 0.72 : 0.88;

    if (!st.air) {
      const maxF = (input.boost ? 34 : 24) * surface;
      const accel = input.boost ? 25 : 16;
      if (input.throttle > 0) vF += vF < -0.5 ? 32 * input.throttle * dt : accel * input.throttle * dt * clamp(1 - vF / maxF, 0, 1);
      else if (input.throttle < 0) vF = vF > 0.5 ? vF + 32 * input.throttle * dt : Math.max(-10, vF + 12 * input.throttle * dt);
      const resist = (input.throttle === 0 ? 2.4 + Math.abs(vF) * 0.06 : Math.abs(vF) * 0.015) * (2 - surface);
      vF -= Math.sign(vF) * Math.min(Math.abs(vF), resist * dt);
      if (vF > maxF) vF -= (vF - maxF) * 1.5 * dt;
      if (input.brake) vF -= Math.sign(vF) * Math.min(Math.abs(vF), 6 * dt);
      vF -= GRAVITY * 0.6 * ((hF - hB) / WHEELBASE) * dt; // rolls downhill
      if (Math.abs(vF) < 0.05 && input.throttle === 0) vF = 0;

      // Tyres pull the sideways slide back to zero, up to their grip
      const grip = (input.brake ? 6.5 : 34) * (onSand ? 0.7 : 1);
      vR += clamp(-vR * 12 * dt, -grip * dt, grip * dt);
      st.slip = Math.abs(vR);

      const angle = st.steer * (0.62 - 0.4 * Math.min(1, Math.abs(vF) / 30));
      const yawTarget = -(vF / WHEELBASE) * Math.tan(angle) * (input.brake ? 1.45 : 1);
      st.yawRate += (yawTarget - st.yawRate) * Math.min(1, dt * 10);
    } else {
      st.vy -= GRAVITY * dt;
      st.yawRate += -st.steer * 0.8 * dt - st.yawRate * 0.6 * dt;
      st.slip = 0;
    }

    st.vx = fx * vF + rx * vR;
    st.vz = fz * vF + rz * vR;
    st.heading += st.yawRate * dt;
    st.x += st.vx * dt;
    st.z += st.vz * dt;
    st.vF = vF;
    st.accel = (vF - before) / dt;
    st.lateral = vF * st.yawRate;

    // Static collisions: two circles along the jeepney against trees, lamps and landmarks
    let impact = 0;
    for (const off of [1.25, -1.25]) {
      const cx = st.x + fx * off;
      const cz = st.z + fz * off;
      for (const s of statics) {
        const dx = cx - s.x;
        const dz = cz - s.z;
        const min = 1.35 + s.r;
        if (Math.abs(dx) > min || Math.abs(dz) > min) continue;
        const d = Math.hypot(dx, dz);
        if (d >= min || d < 1e-4) continue;
        const nx = dx / d;
        const nz = dz / d;
        st.x += nx * (min - d);
        st.z += nz * (min - d);
        const vn = st.vx * nx + st.vz * nz;
        if (vn < 0) {
          st.vx -= 1.3 * vn * nx;
          st.vz -= 1.3 * vn * nz;
          impact = Math.max(impact, -vn);
        }
      }
    }
    // The pier keeps the jeepney between its rails and stops it at the end
    const rr = Math.hypot(st.x, st.z);
    const pierLane = st.z > PIER.z0 - 2 && Math.abs(st.x - PIER.x) < PIER.half + 0.6;
    if (pierLane && rr > ISLAND_RADIUS - 4) {
      const lim = PIER.half - 1.2;
      const dx = st.x - PIER.x;
      if (Math.abs(dx) > lim) {
        st.x = PIER.x + Math.sign(dx) * lim;
        if (st.vx * Math.sign(dx) > 0) {
          impact = Math.max(impact, Math.abs(st.vx));
          st.vx *= -0.3;
        }
      }
      if (st.z > PIER.z1 - 2.7) {
        st.z = PIER.z1 - 2.7;
        if (st.vz > 0) {
          impact = Math.max(impact, st.vz);
          st.vz *= -0.3;
        }
      }
    } else if (rr > ISLAND_RADIUS - 3) {
      // The sea is a soft wall
      const nx = st.x / rr;
      const nz = st.z / rr;
      st.x = nx * (ISLAND_RADIUS - 3);
      st.z = nz * (ISLAND_RADIUS - 3);
      const vn = st.vx * nx + st.vz * nz;
      if (vn > 0) {
        st.vx -= 1.3 * vn * nx;
        st.vz -= 1.3 * vn * nz;
        impact = Math.max(impact, vn);
      }
    }
    if (impact > 2) {
      st.yawRate += (Math.random() - 0.5) * impact * 0.05;
      bump(impact);
    }

    // Vertical: follow the ground, or fly off a crest and land with a bounce
    const g = groundAt(st.x, st.z);
    if (st.air) {
      st.y += st.vy * dt;
      st.airTime += dt;
      if (st.y <= g) {
        const hit = -st.vy;
        st.y = g;
        st.vy = 0;
        st.air = false;
        st.suspV -= Math.min(8, hit * 0.35);
        if (hit > 5) bump(hit * 0.6);
        if (st.airTime > 0.45) cb.onAir(st.airTime);
        for (let i = 0; i < 4; i++) puff(st.x, st.y, st.z, "#e9d3ad", 1.2);
      }
    } else {
      const climb = (g - st.y) / dt;
      if (st.vy > 2.6 && climb < st.vy - GRAVITY * dt * 2 - 1) {
        st.air = true;
        st.airTime = 0;
        st.y += st.vy * dt;
      } else {
        st.vy = climb;
        st.y = g;
      }
    }

    const pitchTarget = st.air ? clamp(Math.atan2(st.vy, Math.max(4, Math.abs(vF))) * 0.6, -0.5, 0.5) : Math.atan2(hF - hB, WHEELBASE);
    const rollTarget = st.air ? 0 : Math.atan2(hR - hL, 2.2);
    st.pitch += (pitchTarget - st.pitch) * Math.min(1, dt * (st.air ? 3 : 14));
    st.roll += (rollTarget - st.roll) * Math.min(1, dt * (st.air ? 3 : 14));

    // Suspension spring, squat under acceleration, lean in the turns
    st.suspV += (-st.susp * 170 - st.suspV * 12) * dt;
    st.susp = clamp(st.susp + st.suspV * dt, -0.35, 0.3);
    st.squat += (clamp(-st.accel * 0.005, -0.08, 0.08) - st.squat) * Math.min(1, dt * 8);
    st.lean += (clamp(-st.lateral * 0.004, -0.1, 0.1) - st.lean) * Math.min(1, dt * 8);
  };

  const bump = (strength: number) => {
    if (!opts.reducedMotion) st.shake = Math.min(1, Math.max(st.shake, strength / 18));
    audio?.impact(strength);
    if (opts.touch) navigator.vibrate?.(Math.min(40, Math.round(strength * 3)));
  };

  /* ───────── per-frame world update ───────── */
  const camPos = new Vector3(60, 60, 80);
  const camTarget = new Vector3();
  const seat = new Vector3();
  const qBody = new Quaternion();
  const qLook = new Quaternion();
  const eLook = new Euler(0, 0, 0, "YXZ");
  const want = new Vector3();
  let camYaw = 0;
  let fov = 60;

  const frameUpdate = (dt: number, t: number, alpha: number) => {
    // Interpolated jeepney pose
    const x = prev.x + (st.x - prev.x) * alpha;
    const y = prev.y + (st.y - prev.y) * alpha;
    const z = prev.z + (st.z - prev.z) * alpha;
    const heading = angleLerp(prev.heading, st.heading, alpha);
    const fx = -Math.sin(heading);
    const fz = -Math.cos(heading);
    carMesh.position.set(x, y, z);
    carMesh.rotation.set(st.pitch, heading, st.roll, "YXZ");
    body.rotation.set(st.squat, 0, st.lean);
    body.position.y = st.susp + Math.sin(t * 18) * 0.012 * Math.min(1, Math.abs(st.vF) / 4);
    wheels.forEach((w) => (w.rotation.x -= (st.vF * dt) / 0.52));
    steerers.forEach((s) => (s.rotation.y = -st.steer * 0.5));
    jeep.animate(t, dt, { speed: st.vF, steer: st.steer, lateral: st.lateral, accel: st.accel, braking: input.brake || (input.throttle < 0 && st.vF > 1), night: cur.night });

    // Dust when drifting, smoke when flooring it, skid marks on hard slides
    const rx = Math.cos(heading);
    const rz = -Math.sin(heading);
    if (mode === "drive" && !st.air && frame % 2 === 0) {
      if (st.slip > 4 && Math.abs(st.vF) > 6) {
        puff(x - fx * 2.2 + rx * 1.1, y, z - fz * 2.2 + rz * 1.1, "#e9d3ad");
        puff(x - fx * 2.2 - rx * 1.1, y, z - fz * 2.2 - rz * 1.1, "#e9d3ad");
      } else if (input.throttle > 0.5 && Math.abs(st.vF) < 10 && frame % 6 === 0) {
        puff(x - fx * 2.7 + rx * 0.7, y + 0.3, z - fz * 2.7 + rz * 0.7, "#b8bcc2", 1.4);
      }
    }
    if (st.slip > 4.5 && !st.air) {
      st.skidDist += Math.hypot(st.vx, st.vz) * dt;
      if (st.skidDist > 0.7) {
        st.skidDist = 0;
        skidAt(x - fx * 1.7 + rx * 1.18, z - fz * 1.7 + rz * 1.18, heading);
        skidAt(x - fx * 1.7 - rx * 1.18, z - fz * 1.7 - rz * 1.18, heading);
      }
    }
    for (const p of puffs) {
      if (p.life <= 0) continue;
      p.life -= dt * 1.5;
      p.m.scale.setScalar(0.5 + (1 - p.life) * 1.3);
      p.m.position.y += dt * p.rise;
      (p.m.material as MeshStandardMaterial).opacity = Math.max(0, p.life) * 0.35;
    }

    // Packets spin; driving (or flying) through one collects it
    packetMeshes.forEach((m, i) => {
      if (taken.has(i)) return;
      m.rotation.y = t * 1.6 + i;
      m.position.y = packetPos[i].y + Math.sin(t * 2 + i) * 0.3;
      if (mode !== "drive") return;
      const p = packetPos[i];
      if (Math.hypot(p.x - x, p.z - z) < 2.8 && Math.abs(p.y - (y + 1.2)) < 2.6) {
        taken.add(i);
        m.visible = false;
        audio?.chime(taken.size === packets.length);
        cb.onPackets(taken.size, packets.length);
        if (challenge?.running && taken.size === packets.length) {
          challenge.running = false;
          const ms = performance.now() - challenge.start;
          cb.onChallenge({ running: false, ms, finished: ms });
        }
      }
    });

    // Hidden stars: anyone driving through one finds it, in any mode
    starMeshes.forEach((m, i) => {
      if (starsFound.has(i)) return;
      m.rotation.y = -t * 2.2 + i;
      m.position.y = starPos[i].y + Math.sin(t * 2.6 + i) * 0.25;
      if (mode !== "drive") return;
      const p = starPos[i];
      if (Math.hypot(p.x - x, p.z - z) < 2.8 && Math.abs(p.y - (y + 1.2)) < 2.6) {
        starsFound.add(i);
        m.visible = false;
        audio?.chime(true);
        cb.onSecret?.(i, starsFound.size, secrets.length);
      }
    });

    // Named places
    if (mode === "drive" && frame % 10 === 0) {
      let inPlace: (typeof places)[number] | null = null;
      for (const pl of places) if (Math.hypot(pl.x - x, pl.z - z) < pl.r) inPlace = pl;
      if ((inPlace?.name ?? null) !== placeName) {
        placeName = inPlace?.name ?? null;
        cb.onPlace?.(inPlace);
      }
    }

    // Landmark zones
    let near: Landmark | null = null;
    if (mode === "drive") for (const l of landmarks) if (Math.hypot(l.x - x, l.z - z) < l.zone) near = l;
    if ((near?.id ?? null) !== zoneId) {
      zoneId = near?.id ?? null;
      cb.onZone(near);
    }

    // Pasada: pick-ups, drop-offs and the way to the next one
    if (mode === "drive") {
      const event = pasada.update(t, { x, y, z, heading, speed: st.vF, air: st.air });
      if (event?.boarded) audio?.chime();
      if (event?.delivered) audio?.chime(true);
      if (event || frame % 8 === 0) {
        const status = pasada.status({ x, z, heading });
        if (status.phase !== "off") cb.onMission(status, event ?? undefined);
      }
    }

    for (const a of animated) a.update(t, dt);
    wind.value = t;
    sea.uniforms.uTime.value = t;
    clouds.rotation.y = t * 0.004;
    if (challenge?.running && frame % 6 === 0) cb.onChallenge({ running: true, ms: performance.now() - challenge.start });
    applyTime(dt);

    // Cameras
    look.idle += dt;
    if (look.idle > 1.2) {
      look.yaw *= 1 - damp(3, dt);
      look.pitch *= 1 - damp(3, dt);
    }
    const speed = Math.abs(st.vF);
    let fovTarget = 60;
    if (mode !== "drive") {
      const ang = t * 0.07;
      camTarget.set(0, 0, 0);
      camPos.lerp(want.set(Math.cos(ang) * 150, 92, Math.sin(ang) * 150), damp(1.5, dt));
      camera.position.copy(camPos);
      camera.lookAt(camTarget);
      fovTarget = portrait ? 60 : 42;
    } else if (camMode === "chase") {
      camYaw = angleLerp(camYaw, heading + look.yaw, damp(st.air ? 2 : 4.5, dt));
      // Portrait phones: pull back and up so the jeepney doesn't fill the screen
      const far = portrait ? 1.45 : 1;
      const dist = (8.6 + speed * 0.07) * far;
      const height = (3.3 + speed * 0.035) * far + look.pitch * 4;
      want.set(x + Math.sin(camYaw) * dist, y + height, z + Math.cos(camYaw) * dist);
      // Don't let trees, lamps or landmarks get between the camera and the jeepney
      let reach = 1;
      const lx = want.x - x;
      const lz = want.z - z;
      const len2 = lx * lx + lz * lz;
      for (const o of statics) {
        const ox = o.x - x;
        const oz = o.z - z;
        if (Math.abs(ox) > dist + o.r + 2 || Math.abs(oz) > dist + o.r + 2) continue;
        const k = Math.max(0, Math.min(1, (ox * lx + oz * lz) / len2));
        const r = o.r + 0.9;
        if (k > 0.2 && (ox - lx * k) ** 2 + (oz - lz * k) ** 2 < r * r) reach = Math.min(reach, Math.max(0.55, k - r / Math.sqrt(len2)));
      }
      // Pull in a little and rise, so the camera looks down over whatever is in the way
      if (reach < 1) want.set(x + lx * reach, want.y + (1 - reach) * 5, z + lz * reach);
      want.y = Math.max(want.y, groundAt(want.x, want.z) + 1.2);
      camPos.lerp(want, damp(st.air ? 4 : 7, dt));
      camera.position.copy(camPos);
      camTarget.set(x + fx * 3, y + 1.5, z + fz * 3);
      camera.lookAt(camTarget);
      fovTarget = 56 + Math.min(18, speed * 0.55) + (input.boost && speed > 10 ? 5 : 0) + (portrait ? 10 : 0);
    } else if (camMode === "cockpit") {
      carMesh.updateMatrixWorld(true);
      body.localToWorld(seat.set(-0.5, 2.05, 0));
      if (!opts.reducedMotion) seat.y += Math.sin(t * 11) * 0.012 * Math.min(1, speed / 6);
      camera.position.copy(seat);
      camPos.copy(seat);
      body.getWorldQuaternion(qBody);
      // Portrait screens are tall: look almost level, with a narrower view, so the road fills them
      eLook.set((portrait ? -0.02 : -0.05) + look.pitch, look.yaw + st.steer * 0.14, 0, "YXZ");
      camera.quaternion.copy(qBody).multiply(qLook.setFromEuler(eLook));
      fovTarget = (portrait ? 66 : 72) + Math.min(8, speed * 0.25);
    } else {
      const s = 1 + speed / 90;
      want.set(15.5 * s, 27 * s, 20.5 * s).applyAxisAngle(camera.up, look.yaw);
      want.add(camTarget.set(x + fx * st.vF * 0.25, y + 0.5, z + fz * st.vF * 0.25));
      camPos.lerp(want, damp(3.2, dt));
      camera.position.copy(camPos);
      camera.lookAt(camTarget);
      fovTarget = portrait ? 52 : 38;
    }
    st.shake *= 1 - damp(6, dt);
    if (st.shake > 0.01) {
      camera.position.x += (Math.random() - 0.5) * st.shake * 0.5;
      camera.position.y += (Math.random() - 0.5) * st.shake * 0.5;
    }
    fov += (fovTarget - fov) * damp(4, dt);
    if (Math.abs(camera.fov - fov) > 0.05) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    sky.mesh.position.copy(camera.position);
    stars.position.copy(camera.position);

    // Keep the sun's shadow box around the jeepney
    sun.position.set(x + cur.sunDir.x * 80, y + cur.sunDir.y * 80, z + cur.sunDir.z * 80);
    sun.target.position.set(x, y, z);

    if (opts.speedo && frame % 4 === 0) opts.speedo.textContent = String(Math.round(speed * 3.6));
    if (mode === "drive") audio?.update({ speed: st.vF, throttle: input.throttle, slip: st.slip, boost: input.boost });
  };

  /* Adaptive resolution: drop pixels before frames */
  let frameTimes = 0;
  let frameCount = 0;
  const adapt = (dt: number) => {
    frameTimes += dt;
    frameCount++;
    if (frameCount < 90) return;
    const avg = frameTimes / frameCount;
    frameTimes = 0;
    frameCount = 0;
    if (avg > 1 / 42 && pixelRatio > 0.7) pixelRatio = Math.max(0.7, pixelRatio - 0.15);
    else if (avg < 1 / 57 && pixelRatio < maxPixelRatio) pixelRatio = Math.min(maxPixelRatio, pixelRatio + 0.1);
    else return;
    renderer.setPixelRatio(pixelRatio);
    resize();
  };

  const camDir = new Vector3();
  const loop = (now: number) => {
    if (disposed) return;
    raf = requestAnimationFrame(loop);
    if (document.hidden) {
      last = now;
      return;
    }
    // rAF timestamps can predate the end of a long task (like building this world): never step backwards
    const dt = Math.max(0, Math.min(0.1, (now - last) / 1000));
    last = Math.max(last, now);
    frame++;
    input = mode === "drive" ? readInput() : { throttle: 0, steer: 0, boost: false, brake: false };

    acc += dt;
    let steps = 0;
    while (acc >= FIXED && steps < 5) {
      Object.assign(prev, { x: st.x, y: st.y, z: st.z, heading: st.heading });
      carStep(FIXED);
      physics.setCar(st.x, st.y, st.z, st.heading, st.pitch, st.roll, st.vx, st.vy, st.vz);
      physics.step();
      acc -= FIXED;
      steps++;
    }
    if (steps === 5) acc = 0;
    physics.sync(acc / FIXED);
    frameUpdate(dt, now / 1000, acc / FIXED);
    // Props tidy themselves up based on where the jeepney and the camera are
    carNow.x = st.x;
    carNow.z = st.z;
    camera.getWorldDirection(camDir);
    const cl = Math.hypot(camDir.x, camDir.z) || 1;
    camNow.x = camera.position.x;
    camNow.z = camera.position.z;
    camNow.fx = camDir.x / cl;
    camNow.fz = camDir.z / cl;
    physics.update(dt, now / 1000, carNow, camNow, onRack);
    renderer.render(scene, camera);
    placeLabels();
    if (frame % 3 === 0) drawMinimap();
    if (frame === 2) cb.onReady();
    adapt(dt);
  };
  raf = requestAnimationFrame(loop);
  // Lets local test scripts place the jeepney; compiled out of production builds.
  if (process.env.NODE_ENV === "development") (window as unknown as { __islandDrive?: unknown }).__islandDrive = {
      st,
      prev,
      groundAt,
      pasada,
      stops,
      physics,
      get state() {
        return { mode, frame, disposed, hidden: document.hidden, acc };
      },
    };

  const onVisibility = () => (document.hidden ? audio?.suspend() : audio?.resume());
  document.addEventListener("visibilitychange", onVisibility);

  return {
    drive: () => {
      mode = "drive";
      if (!audio) {
        audio = createAudio();
        audio?.setMuted(muted);
      }
      audio?.resume();
      camYaw = st.heading;
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
    resetProps: () => physics.reset(),
    setSecrets: (found) => {
      starsFound.clear();
      for (const i of found) if (i >= 0 && i < starMeshes.length) starsFound.add(i);
      starMeshes.forEach((m, i) => (m.visible = !starsFound.has(i)));
    },
    cycleCamera,
    cycleTime,
    horn,
    stop: () => {
      mode = "attract";
      keys.clear();
      Object.assign(controls, { throttle: 0, steer: 0, boost: false, brake: false });
      pasada.setActive(false);
      audio?.suspend();
      placeName = null;
      if (zoneId) {
        zoneId = null;
        cb.onZone(null);
      }
    },
    setPasada: (on) => {
      pasada.setActive(on);
      cb.onMission(pasada.status({ x: st.x, z: st.z, heading: st.heading }));
    },
    setPaint: (id) => jeep.paint(id),
    capture: () => {
      try {
        renderer.render(scene, camera);
        return canvas.toDataURL("image/jpeg", 0.92);
      } catch {
        return null;
      }
    },
    setMuted: (m) => {
      muted = m;
      audio?.setMuted(m);
    },
    look: (dx, dy) => {
      look.idle = 0;
      const max = camMode === "cockpit" ? 1.9 : Math.PI;
      look.yaw = clamp(look.yaw - dx * 0.006, -max, max);
      look.pitch = clamp(look.pitch - dy * 0.004, -0.5, 0.45);
    },
    dispose: () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      removeEventListener("keydown", onKeyDown);
      removeEventListener("keyup", onKeyUp);
      removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
      audio?.dispose();
      physics.dispose();
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
