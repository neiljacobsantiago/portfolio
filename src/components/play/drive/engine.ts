import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  DynamicDrawUsage,
  Euler,
  Fog,
  Group,
  HemisphereLight,
  LatheGeometry,
  type Material,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  PointsMaterial,
  type PointsMaterial as PM,
  Quaternion,
  Scene,
  SRGBColorSpace,
  TorusGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { haptic } from "@/lib/haptics";
import { createAudio, type DriveAudio } from "./audio";
import { buildCar, CAR, type PaintId } from "./car";
import { buildCircuit } from "./circuit";
import { buildCity, buildSky, buildStars, buildWater, REFLECT_LAYER } from "./city";
import { cityEnvironments } from "./env";
import { buildFoliage } from "./foliage";
import { createGlows } from "./glow";
import { RACE_FAMILY, raceFontReady } from "./fonts";
import { clamp, LIGHTS, setKitTier, setRaceFont } from "./kit";
import { type Animated, buildPavilions } from "./landmarks";
import type { RemoteLayer } from "./net/remote-cars";
import { newCarState, stepCar } from "./physics";
import { canPost, createPost } from "./post";
import { buildProps, contactShadowTexture } from "./props";
import { createGovernor, type GraphicsProfile, type Quality, tierSettings } from "./quality";
import { createRace, type Ghost, type RaceEvents } from "./race";
import {
  headingAt,
  type Landmark,
  landmarks,
  LENGTH,
  locate,
  N,
  pit,
  PIT_BOXES,
  places,
  samples,
  trophies,
  wallOffset,
  water,
} from "./track";

// Bay Street Circuit: a night street race in three.js, in the site's palette.
//   · the car runs on an arcade model of an open-wheel racer at a fixed
//     60 Hz step: downforce grip that grows with speed, big brakes, DRS on
//     the straights, an eight-speed gearbox for the sound and the HUD
//   · walls are a signed-distance test against the circuit and pit lane
//   · the world is lit without real-time lights: floodlit vertices, emissive
//     lamp heads and one draw call of glow sprites; real shadows on high only
//   · hot laps with start lights, sectors, track limits and a ghost; a free
//     roam with hidden trophies; project pavilions to open on the way round
//   · quality scales with the device and adapts to the frame rate
//   · parkland, lanterns and the NEIL letters live in foliage.ts and
//     props.ts; bloom and the colour grade in post.ts; tiers in quality.ts

export type CameraMode = "chase" | "diorama" | "onboard" | "map";
export type TimeOfDay = "night" | "golden" | "day";
export type { Quality };
export type GameMode = "race" | "free";
export type DrsState = "off" | "ready" | "open";

export interface Controls {
  throttle: number; // -1 (brake) … 1
  steer: number; // -1 (left) … 1 (right)
  drs: boolean;
}

export interface RaceUpdate extends RaceEvents {
  /** Live state for the HUD: the lap being driven. */
  lapNo: number;
  invalid: boolean;
  best: number | null;
  ghost?: Ghost;
  bestSectors?: (number | null)[];
}

export interface DriveCallbacks {
  onReady: () => void;
  onZone: (landmark: Landmark | null) => void;
  onPlace?: (place: { name: string; line: string } | null) => void;
  onTrophy?: (index: number, found: number, total: number) => void;
  onRace: (u: RaceUpdate) => void;
  onDrs: (s: DrsState) => void;
  onPit: (inPit: boolean) => void;
  onCamera: (mode: CameraMode) => void;
  onTime: (time: TimeOfDay) => void;
}

/** DOM nodes the engine writes to every frame, so React doesn't re-render at 60 Hz. */
export interface HudNodes {
  speed: HTMLElement | null;
  gear: HTMLElement | null;
  timer: HTMLElement | null;
  delta: HTMLElement | null;
  revs: HTMLElement | null;
}

/** This car as the multiplayer code sees it (see ./net). */
export interface NetSelf {
  x: number;
  z: number;
  heading: number;
  speed: number;
  steer: number;
  /** Arc length along the centre line. */
  s: number;
  lap: number;
  braking: boolean;
  drs: boolean;
  inPit: boolean;
  held: boolean;
  driving: boolean;
}

export interface DriveEngine {
  drive: (mode: GameMode) => void;
  /** Back to the title view: the car laps on its own, input off, sound paused. */
  stop: () => void;
  setMode: (mode: GameMode) => void;
  setControls: (c: Partial<Controls>) => void;
  reset: () => void;
  /** Hidden trophies already found (remembered by the page). */
  setTrophies: (found: number[]) => void;
  /** Best lap, its sectors and its ghost, remembered by the page. */
  restore: (best: number | null, sectors: (number | null)[] | null, ghost: Ghost | null) => void;
  setAssist: (a: { brake: boolean; ghost: boolean }) => void;
  cycleCamera: () => void;
  cycleTime: () => void;
  setTime: (t: TimeOfDay) => void;
  setMuted: (muted: boolean) => void;
  look: (dx: number, dy: number) => void;
  setPaint: (id: PaintId) => void;
  capture: () => string | null;
  /** Multiplayer: the other players' cars, drawn and labelled by the layer (null to remove). */
  setRemotes: (layer: RemoteLayer | null) => void;
  getNetState: () => NetSelf;
  /**
   * Multiplayer: start a shared session from a given spot. In a race the lights
   * run on the given times (performance.now() ms), so every player sees lights
   * out together; R puts the car back on track instead of restarting.
   */
  netStart: (o: { game: GameMode; x: number; z: number; heading: number; lightsAt?: number; goAt?: number }) => void;
  dispose: () => void;
}

const CAMERAS: CameraMode[] = ["chase", "diorama", "onboard", "map"];
const TIMES_ORDER: TimeOfDay[] = ["night", "golden", "day"];

interface TimePreset {
  top: string;
  horizon: string;
  glow: string;
  fog: string;
  near: number;
  far: number;
  hemiSky: string;
  hemiGround: string;
  hemiI: number;
  sun: string;
  sunI: number;
  sunDir: [number, number, number];
  flood: number;
  lights: number;
  deep: string;
  stars: number;
  exposure: number;
}
const TIMES: Record<TimeOfDay, TimePreset> = {
  night: { top: "#02050c", horizon: "#161a2e", glow: "#6b3f28", fog: "#121527", near: 180, far: 2100, hemiSky: "#6f7fb0", hemiGround: "#16151a", hemiI: 0.42, sun: "#c9d6ff", sunI: 0.35, sunDir: [0.18, 1, 0.3], flood: 1.45, lights: 1, deep: "#071422", stars: 1, exposure: 1.08 },
  golden: { top: "#35538a", horizon: "#f0a066", glow: "#ff9a5a", fog: "#cf9478", near: 380, far: 2600, hemiSky: "#ffd2a8", hemiGround: "#4a3528", hemiI: 0.85, sun: "#ffb37a", sunI: 2.2, sunDir: [-0.55, 0.22, 0.8], flood: 0.3, lights: 0.45, deep: "#1b3550", stars: 0.08, exposure: 1.0 },
  day: { top: "#6fa7d1", horizon: "#f1e6d0", glow: "#000000", fog: "#e2dccd", near: 500, far: 3000, hemiSky: "#fff6e5", hemiGround: "#8a7d68", hemiI: 1.15, sun: "#fff1d6", sunI: 2.4, sunDir: [0.45, 0.8, 0.35], flood: 0, lights: 0, deep: "#2d6c92", stars: 0, exposure: 1 },
};

const FIXED = 1 / 60;
const angleLerp = (a: number, b: number, k: number) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;
const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const damp = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);

/** Spawn points: the pole slot on the grid, and a pit box for free roam. */
const GRID = (() => {
  const i = (N - 3) % N;
  const p = samples[i];
  return { x: p.x - p.tz * -2.6, z: p.z + p.tx * -2.6, heading: headingAt(i) };
})();
const PIT_SPAWN = { x: PIT_BOXES.x0 + 64, z: PIT_BOXES.z - 2.2, heading: -Math.PI / 2 };

export function createDriveEngine(
  canvas: HTMLCanvasElement,
  opts: { quality: Quality; reducedMotion: boolean; touch: boolean; labels: HTMLElement; minimap: HTMLCanvasElement | null; hud: HudNodes; graphics?: GraphicsProfile },
  cb: DriveCallbacks,
): DriveEngine {
  const tier = ({ low: 0, medium: 1, high: 2 } as const)[opts.quality];
  const gfx: GraphicsProfile = opts.graphics ?? { quality: opts.quality, auto: false, gpu: "", phone: opts.touch, lock: false, calm: opts.reducedMotion, off: [] };
  const T = tierSettings(opts.quality, gfx.phone);
  // Medium and high go through the post chain (its target has the MSAA); low draws straight to an antialiased canvas
  const usePost = T.post && !gfx.off.includes("post") && canPost();
  const shadows = T.shadowMap > 0;
  let pixelRatio = T.ratio;

  const renderer = new WebGLRenderer({ canvas, antialias: !usePost, powerPreference: "high-performance", preserveDrawingBuffer: false });
  renderer.setPixelRatio(pixelRatio);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.shadowMap.enabled = shadows;
  renderer.shadowMap.type = PCFShadowMap;
  renderer.info.autoReset = false;
  const post = usePost ? createPost(renderer, { mips: T.bloomMips }) : null;

  // Physically based world on medium and high, Lambert on budget phones; texture sizes to match
  setKitTier(tier);
  setRaceFont(RACE_FAMILY, raceFontReady);
  const scene = new Scene();
  const fog = new Fog(TIMES.night.fog, TIMES.night.near, TIMES.night.far);
  scene.fog = fog;
  scene.background = new Color(TIMES.night.fog);
  const camera = new PerspectiveCamera(60, 1, 0.3, 3200);

  const hemi = new HemisphereLight(TIMES.night.hemiSky, TIMES.night.hemiGround, TIMES.night.hemiI);
  const sun = new DirectionalLight(TIMES.night.sun, TIMES.night.sunI);
  sun.castShadow = shadows;
  if (shadows) {
    sun.shadow.mapSize.set(T.shadowMap, T.shadowMap);
    // PCF here is a Vogel-disk soft shadow: the radius sets the penumbra
    sun.shadow.radius = tier === 2 ? 4 : 3;
    const sc = sun.shadow.camera;
    sc.left = sc.bottom = -26;
    sc.right = sc.top = 26;
    sc.near = 1;
    sc.far = 160;
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.03;
  }
  scene.add(hemi, sun, sun.target);
  // What glossy things reflect: the city at night (and a daylight version), prefiltered once
  const envs = cityEnvironments(renderer);
  scene.environment = envs.night;

  /* ───────── world ───────── */
  const glows = createGlows([1100, 1600, 2100][tier]);
  const sky = buildSky();
  scene.add(sky.mesh);
  const stars = buildStars([300, 600, 900][tier]);
  scene.add(stars);
  const circuit = buildCircuit({ quality: [0.4, 0.7, 1][tier], tier, glows, shadows });
  scene.add(circuit.group);
  const city = buildCity({ tier, glows, shadows });
  scene.add(city.group);
  // The bay: a mirror of the skyline on high, analytic sky and glints below that
  const bay = buildWater(city.reflected, [6, 12, 10][tier], tier === 2 && !gfx.off.includes("mirror"));
  scene.add(bay.mesh);
  const animated: Animated[] = [];
  const pavilions = buildPavilions(landmarks, glows, animated);
  scene.add(pavilions.staticMesh, pavilions.boards, ...pavilions.extras, ...pavilions.groups);
  const foliage = buildFoliage({ tier: T, calm: gfx.calm || opts.reducedMotion, off: gfx.off });
  scene.add(foliage.group);
  const props = buildProps({ glows, lanterns: T.lanterns, bigGlow: tier > 0 });
  scene.add(props.group);
  scene.add(glows.mesh);
  for (const o of [glows.mesh, sky.mesh]) o.layers.enable(REFLECT_LAYER);

  /* ───────── the car, its ghost, its shadow and sparks ───────── */
  const car = buildCar({ shadows, detail: [0.3, 0.7, 1][tier] });
  scene.add(car.car);
  const ghostMat = new MeshBasicMaterial({ color: "#9fd0ff", transparent: true, opacity: 0.28, depthWrite: false });
  const ghostMesh = new Mesh(car.ghostGeometry, ghostMat);
  ghostMesh.visible = false;
  scene.add(ghostMesh);
  const blob = (() => {
    // Contact shade on every tier; the shadow map adds the cast shadow on medium and high
    const m = new Mesh(new PlaneGeometry(2.7, 6.6), new MeshBasicMaterial({ map: contactShadowTexture(), transparent: true, depthWrite: false, opacity: shadows ? 0.6 : 0.9 }));
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.04;
    m.renderOrder = 1;
    car.car.add(m);
    return m;
  })();
  void blob;

  const SPARKS = [40, 80, 120][tier];
  const sparkPos = new Float32Array(SPARKS * 3).fill(-999);
  const sparkVel = new Float32Array(SPARKS * 3);
  const sparkLife = new Float32Array(SPARKS);
  const sparkGeo = new BufferGeometry();
  sparkGeo.setAttribute("position", new BufferAttribute(sparkPos, 3).setUsage(DynamicDrawUsage));
  const sparks = new Points(sparkGeo, new PointsMaterial({ color: "#ffc27a", size: 0.18, transparent: true, blending: AdditiveBlending, depthWrite: false }));
  sparks.frustumCulled = false;
  scene.add(sparks);
  let sparkIndex = 0;

  /* ───────── trophies (free roam) ───────── */
  const trophyGroup = new Group();
  const trophyMeshes = trophies.map(([x, z]) => {
    const g = new Group();
    const gold = new MeshStandardMaterial({ color: "#ffcf6a", emissive: "#ff9e2c", emissiveIntensity: 0.7, metalness: 0.7, roughness: 0.3 });
    const cup = new LatheGeometry([new Vector2(0.01, 0), new Vector2(0.35, 0), new Vector2(0.12, 0.12), new Vector2(0.1, 0.5), new Vector2(0.42, 0.75), new Vector2(0.5, 1.25), new Vector2(0.45, 1.25)].map((v) => v), 14);
    g.add(new Mesh(cup, gold));
    const ring = new Mesh(new TorusGeometry(1.2, 0.06, 6, 28), new MeshBasicMaterial({ color: "#ffd27a" }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -1;
    g.add(ring);
    g.position.set(x, 1.4, z);
    trophyGroup.add(g);
    return g;
  });
  const trophyGlows = trophies.map(([x, z]) => glows.add(x, 2, z, 4, "#ffcf6a", 0, true));
  scene.add(trophyGroup);
  const trophiesFound = new Set<number>();

  /* ───────── state ───────── */
  // The car's state; its handling lives in physics.ts
  const st = newCarState(GRID.x, GRID.z, GRID.heading);
  const prev = { x: st.x, z: st.z, heading: st.heading };
  const controls: Controls = { throttle: 0, steer: 0, drs: false };
  const keys = new Set<string>();
  const race = createRace();
  let mode: "attract" | "drive" = "attract";
  let game: GameMode = "race";
  let camMode: CameraMode = "chase";
  let timeOfDay: TimeOfDay = "night";
  let assist = { brake: opts.touch, ghost: true };
  let zoneId: string | null = null;
  let placeName: string | null = null;
  let drsState: DrsState = "off";
  let frame = 0;
  let last = performance.now();
  let acc = 0;
  let raf = 0;
  let disposed = false;
  let audio: DriveAudio | null = null;
  let muted = false;
  let input: Controls = { throttle: 0, steer: 0, drs: false };
  let look = { yaw: 0, pitch: 0, idle: 0 };
  const padPrev: boolean[] = [];
  let onScreen = true;
  /** Test hook only: lets the autopilot drive in drive mode. */
  const dev: { auto: boolean; cam?: number[] } = { auto: false };
  /** Multiplayer: other cars, and whether a shared session is on. */
  let remotes: RemoteLayer | null = null;
  let net = false;

  /* ───────── input ───────── */
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
  };
  const onKeyUp = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
  const onBlur = () => keys.clear();
  addEventListener("keydown", onKeyDown);
  addEventListener("keyup", onKeyUp);
  addEventListener("blur", onBlur);

  const readInput = (): Controls => {
    const up = keys.has("w") || keys.has("arrowup");
    const down = keys.has("s") || keys.has("arrowdown") || keys.has(" ");
    const left = keys.has("a") || keys.has("arrowleft");
    const right = keys.has("d") || keys.has("arrowright");
    let throttle = (up ? 1 : 0) - (down ? 1 : 0) + controls.throttle;
    let steer = (right ? 1 : 0) - (left ? 1 : 0) + controls.steer;
    let drs = keys.has("shift") || controls.drs;
    // Gamepads: left stick steers, triggers drive, A opens DRS, Y camera, Start resets
    for (const pad of navigator.getGamepads?.() ?? []) {
      if (!pad) continue;
      const sx = pad.axes[0] ?? 0;
      if (Math.abs(sx) > 0.1) steer += Math.sign(sx) * ((Math.abs(sx) - 0.1) / 0.9) ** 1.4;
      throttle += (pad.buttons[7]?.value ?? 0) - (pad.buttons[6]?.value ?? 0);
      drs ||= !!pad.buttons[0]?.pressed;
      const pressed = (i: number) => {
        const now = !!pad.buttons[i]?.pressed;
        const was = padPrev[i];
        padPrev[i] = now;
        return now && !was;
      };
      if (pressed(3)) cycleCamera();
      if (pressed(9)) reset();
    }
    return { throttle: clamp(throttle, -1, 1), steer: clamp(steer, -1, 1), drs };
  };

  /** The autopilot: follows the centre line at a comfortable fraction of the speed target. */
  const autopilot = (): Controls => {
    const h = locate(st.x, st.z, st.hint);
    const ahead = samples[(h.i + 5 + Math.round(Math.abs(st.v) * 0.22)) % N];
    const want = Math.atan2(-(ahead.x - st.x), -(ahead.z - st.z));
    const diff = wrapAngle(want - st.heading);
    const target = samples[(h.i + 4) % N].vmax * 0.86;
    const throttle = st.v < target ? 1 : st.v > target + 2 ? -Math.min(1, (st.v - target) / 8) : 0.2;
    return { throttle, steer: clamp(-diff * 3 - h.d * 0.04, -1, 1), drs: samples[h.i].drs };
  };

  /* ───────── resize, visibility ───────── */
  let portrait = false;
  const resize = () => {
    const parent = canvas.parentElement;
    if (!parent) return;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    renderer.setSize(w, h, false);
    post?.setSize(w * pixelRatio, h * pixelRatio);
    camera.aspect = w / Math.max(1, h);
    portrait = camera.aspect < 0.8;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  if (canvas.parentElement) ro.observe(canvas.parentElement);
  resize();
  // Scrolled past the hero: stop drawing until it's back
  const io = new IntersectionObserver(([e]) => (onScreen = e.isIntersecting), { threshold: 0 });
  io.observe(canvas);

  /* ───────── labels and minimap ───────── */
  const labelEls = new Map<string, HTMLElement>();
  opts.labels.querySelectorAll<HTMLElement>("[data-landmark]").forEach((el) => labelEls.set(el.dataset.landmark!, el));
  const labelAt = landmarks.map((l) => new Vector3(l.x, 13, l.z));
  const v = new Vector3();
  const placeLabels = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    landmarks.forEach((l, i) => {
      const el = labelEls.get(l.id);
      if (!el) return;
      v.copy(labelAt[i]).project(camera);
      const dist = Math.hypot(camera.position.x - l.x, camera.position.z - l.z);
      const range = camMode === "map" && mode === "drive" ? 400 : 230;
      const visible = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1 && dist < range;
      el.style.opacity = visible ? String(clamp((range - dist) / 60, 0, 1)) : "0";
      el.style.transform = `translate(-50%, -100%) translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px)`;
      el.dataset.active = String(zoneId === l.id);
    });
  };

  const mm = opts.minimap?.getContext("2d") ?? null;
  const mapBase = (() => {
    if (!opts.minimap) return null;
    const size = opts.minimap.width;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const g = c.getContext("2d")!;
    let x0 = Infinity;
    let x1 = -Infinity;
    let z0 = Infinity;
    let z1 = -Infinity;
    for (const p of samples) {
      x0 = Math.min(x0, p.x);
      x1 = Math.max(x1, p.x);
      z0 = Math.min(z0, p.z);
      z1 = Math.max(z1, p.z);
    }
    const s = (size * 0.78) / Math.max(x1 - x0, z1 - z0);
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    const X = (x: number) => size / 2 + (x - cx) * s;
    const Z = (z: number) => size / 2 + (z - cz) * s;
    g.fillStyle = "rgba(102,155,188,0.55)";
    g.beginPath();
    water.forEach(([x, z], k) => (k ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z))));
    g.fill();
    g.lineJoin = g.lineCap = "round";
    g.strokeStyle = "rgba(253,240,213,0.45)";
    g.lineWidth = 2;
    g.beginPath();
    pit.forEach((p, k) => (k ? g.lineTo(X(p.x), Z(p.z)) : g.moveTo(X(p.x), Z(p.z))));
    g.stroke();
    g.strokeStyle = "#fdf0d5";
    g.lineWidth = 4;
    g.beginPath();
    samples.forEach((p, k) => (k ? g.lineTo(X(p.x), Z(p.z)) : g.moveTo(X(p.x), Z(p.z))));
    g.closePath();
    g.stroke();
    // Start line
    const p0 = samples[0];
    g.strokeStyle = "#c1121f";
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(X(p0.x - p0.tz * 14), Z(p0.z + p0.tx * 14));
    g.lineTo(X(p0.x + p0.tz * 14), Z(p0.z - p0.tx * 14));
    g.stroke();
    return { canvas: c, X, Z };
  })();
  const ghostPose = { x: 0, z: 0, heading: 0 };
  let ghostShown = false;
  const drawMinimap = () => {
    if (!mm || !opts.minimap || !mapBase) return;
    const size = opts.minimap.width;
    const { X, Z } = mapBase;
    mm.clearRect(0, 0, size, size);
    mm.drawImage(mapBase.canvas, 0, 0);
    for (const l of landmarks) {
      mm.fillStyle = l.id === zoneId ? "#fdf0d5" : "#c1121f";
      mm.beginPath();
      mm.arc(X(l.x), Z(l.z), 3, 0, Math.PI * 2);
      mm.fill();
    }
    if (game === "free" && mode === "drive")
      trophies.forEach(([x, z], i) => {
        if (trophiesFound.has(i)) return;
        mm.fillStyle = "#ffd27a";
        mm.fillRect(X(x) - 2, Z(z) - 2, 4, 4);
      });
    if (ghostShown) {
      mm.fillStyle = "rgba(159,208,255,0.9)";
      mm.beginPath();
      mm.arc(X(ghostPose.x), Z(ghostPose.z), 3, 0, Math.PI * 2);
      mm.fill();
    }
    remotes?.minimap(mm, X, Z);
    mm.save();
    mm.translate(X(st.x), Z(st.z));
    mm.rotate(-st.heading);
    mm.fillStyle = "#c1121f";
    mm.strokeStyle = "#fdf0d5";
    mm.lineWidth = 1.5;
    mm.beginPath();
    mm.moveTo(0, -7);
    mm.lineTo(5, 5);
    mm.lineTo(-5, 5);
    mm.closePath();
    mm.fill();
    mm.stroke();
    mm.restore();
  };

  /* ───────── modes ───────── */
  function place(x: number, z: number, heading: number) {
    st.x = x;
    st.z = z;
    st.heading = heading;
    st.v = st.vR = st.yawRate = st.steer = st.wheel = st.gas = st.brake = st.accel = st.lateral = st.beta = 0;
    st.gear = 1;
    st.hint = -1;
    const h = locate(x, z);
    st.hint = h.i;
    st.s = h.s;
    Object.assign(prev, { x, z, heading });
    camYaw = dioYaw = heading;
    snapCam = true;
  }
  function reset() {
    if (mode !== "drive") return;
    if (game === "race" && !net) {
      place(GRID.x, GRID.z, GRID.heading);
      race.start(performance.now());
      emitRace({});
    } else {
      // Back onto the circuit, pointing the right way
      const h = locate(st.x, st.z, st.hint);
      const p = samples[h.i];
      place(p.x, p.z, headingAt(h.i));
    }
  }
  function setGame(g: GameMode) {
    game = g;
    trophyGroup.visible = g === "free";
    trophyMeshes.forEach((m, i) => (m.visible = !trophiesFound.has(i)));
    trophies.forEach((_, i) => glows.set(trophyGlows[i], g === "free" && !trophiesFound.has(i) ? 0.7 : 0));
    if (g === "race") {
      place(GRID.x, GRID.z, GRID.heading);
      race.start(performance.now());
    } else {
      race.stop();
      circuit.setStartLights(0);
      place(PIT_SPAWN.x, PIT_SPAWN.z, PIT_SPAWN.heading);
    }
    emitRace({});
  }
  function emitRace(ev: RaceEvents) {
    cb.onRace({ ...ev, lapNo: race.lap, invalid: race.invalid, best: race.bestLap });
  }
  function cycleCamera() {
    camMode = CAMERAS[(CAMERAS.indexOf(camMode) + 1) % CAMERAS.length];
    dioYaw = st.heading;
    look = { yaw: 0, pitch: 0, idle: 0 };
    camera.near = camMode === "onboard" ? 0.08 : camMode === "diorama" ? 1 : 0.3;
    camera.updateProjectionMatrix();
    cb.onCamera(camMode);
  }
  function setTime(t: TimeOfDay) {
    timeOfDay = t;
    cb.onTime(t);
  }
  function cycleTime() {
    setTime(TIMES_ORDER[(TIMES_ORDER.indexOf(timeOfDay) + 1) % TIMES_ORDER.length]);
  }

  /* ───────── time of day: everything eases towards the preset ───────── */
  const cur = {
    top: new Color(TIMES.night.top),
    horizon: new Color(TIMES.night.horizon),
    glow: new Color(TIMES.night.glow),
    fog: new Color(TIMES.night.fog),
    hemiSky: new Color(TIMES.night.hemiSky),
    hemiGround: new Color(TIMES.night.hemiGround),
    sun: new Color(TIMES.night.sun),
    deep: new Color(TIMES.night.deep),
    sunDir: new Vector3(...TIMES.night.sunDir).normalize(),
    near: TIMES.night.near,
    far: TIMES.night.far,
    hemiI: TIMES.night.hemiI,
    sunI: TIMES.night.sunI,
    flood: 1,
    lights: 1,
    stars: 1,
    exposure: TIMES.night.exposure,
  };
  const target = new Color();
  const targetDir = new Vector3();
  const applyTime = (dt: number) => {
    const p = TIMES[timeOfDay];
    const k = damp(2.4, dt);
    for (const key of ["top", "horizon", "glow", "fog", "hemiSky", "hemiGround", "sun", "deep"] as const) cur[key].lerp(target.set(p[key]), k);
    cur.sunDir.lerp(targetDir.set(...p.sunDir).normalize(), k).normalize();
    for (const key of ["near", "far", "hemiI", "sunI", "flood", "lights", "stars", "exposure"] as const) cur[key] += (p[key] - cur[key]) * k;
    sky.uniforms.uTop.value.copy(cur.top);
    sky.uniforms.uHorizon.value.copy(cur.horizon);
    sky.uniforms.uGlow.value.copy(cur.glow);
    sky.uniforms.uSunColor.value.copy(cur.sun);
    sky.uniforms.uSunDir.value.copy(timeOfDay === "night" ? targetDir.set(-0.5, 0.45, 0.7).normalize() : cur.sunDir);
    sky.uniforms.uSunSize.value = 1 + (1 - cur.flood) * 0 + cur.lights * 1.5;
    fog.color.copy(cur.fog);
    fog.near = cur.near;
    fog.far = cur.far;
    (scene.background as Color).copy(cur.fog);
    hemi.color.copy(cur.hemiSky);
    hemi.groundColor.copy(cur.hemiGround);
    hemi.intensity = cur.hemiI;
    sun.color.copy(cur.sun);
    sun.intensity = cur.sunI;
    LIGHTS.uFlood.value = cur.flood;
    glows.uniforms.uNight.value = cur.lights;
    const w = bay.uniforms as unknown as Record<string, { value: Color | Vector3 | number }>;
    (w.uDeep.value as Color).copy(cur.deep);
    (w.uTop.value as Color).copy(cur.top);
    (w.uHorizon.value as Color).copy(cur.horizon);
    (w.uGlow.value as Color).copy(cur.glow);
    (w.uSunColor.value as Color).copy(cur.sun);
    (w.uSunDir.value as Vector3).copy(cur.sunDir);
    w.uNight.value = cur.lights;
    (stars.material as PM).opacity = cur.stars;
    stars.visible = cur.stars > 0.02;
    if (circuit.fenceMaterial) circuit.fenceMaterial.color.setScalar(0.35 + 0.45 * cur.flood + 0.4 * (1 - cur.lights));
    renderer.toneMappingExposure = cur.exposure;
    // The city's night light, or daylight once the lamps are mostly off
    scene.environment = cur.lights > 0.5 ? envs.night : envs.day;
    scene.environmentIntensity = cur.lights > 0.5 ? 0.9 : 0.55 + 0.4 * (1 - cur.lights);
  };

  /* ───────── vehicle physics (one fixed step, see physics.ts) ───────── */
  const carStep = (dt: number) => {
    const ev = stepCar(st, input, { assist: assist.brake && mode === "drive", free: game === "free", auto: mode !== "drive" || dev.auto }, dt);
    if (ev.shift) audio?.shift(ev.shift > 0);
    if (ev.impact > 2.5) bump(ev.impact);
  };

  const bump = (strength: number) => {
    if (!opts.reducedMotion) st.shake = Math.min(1, Math.max(st.shake, strength / 20));
    audio?.impact(strength);
    if (opts.touch) haptic(Math.min(40, Math.round(strength * 2.5)));
    for (let k = 0; k < Math.min(12, strength); k++) spark(1.6);
  };

  const sparkAt = new Vector3();
  function spark(power: number) {
    const i = sparkIndex++ % SPARKS;
    const fx = -Math.sin(st.heading);
    const fz = -Math.cos(st.heading);
    sparkAt.set(st.x - fx * 1.2, 0.06, st.z - fz * 1.2);
    sparkPos.set([sparkAt.x + (Math.random() - 0.5) * 0.4, sparkAt.y, sparkAt.z + (Math.random() - 0.5) * 0.4], i * 3);
    const sp = st.v * 0.55;
    sparkVel.set([fx * sp + (Math.random() - 0.5) * 6 * power, 1 + Math.random() * 3 * power, fz * sp + (Math.random() - 0.5) * 6 * power], i * 3);
    sparkLife[i] = 0.35 + Math.random() * 0.3;
  }

  /* ───────── per-frame ───────── */
  const camPos = new Vector3(-200, 120, -500);
  const camTarget = new Vector3();
  const seat = new Vector3();
  const qBody = new Quaternion();
  const qLook = new Quaternion();
  const eLook = new Euler(0, 0, 0, "YXZ");
  const want = new Vector3();
  let camYaw = st.heading;
  let dioYaw = st.heading;
  /** After a teleport (grid, reset), the chase camera jumps straight to its spot. */
  let snapCam = true;
  let fov = 60;
  /** The chase camera's fore-aft lag (m): out under acceleration, in under braking. */
  let chaseLag = 0;
  /** The chase camera's offset from the car. */
  const chaseOff = new Vector3(0, 2, 7);
  let shot = 0;
  let shotStart = 0;
  let tvSpot = new Vector3();
  let lastGear = "";
  let lastRevs = -1;
  let lastTimerText = "";
  const revs = opts.hud.revs ? Array.from(opts.hud.revs.children) as HTMLElement[] : [];

  const fmt = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms / 1000) % 60)).padStart(2, "0")}.${String(Math.floor(ms % 1000)).padStart(3, "0")}`;

  const frameUpdate = (dt: number, t: number, alpha: number, now: number) => {
    const x = prev.x + (st.x - prev.x) * alpha;
    const z = prev.z + (st.z - prev.z) * alpha;
    const heading = angleLerp(prev.heading, st.heading, alpha);
    const fx = -Math.sin(heading);
    const fz = -Math.cos(heading);
    car.car.position.set(x, 0, z);
    car.car.rotation.set(0, heading, 0);
    // Body on its springs: pitch, roll, the drop under downforce and the kerbs' jolts; wheels follow the road
    const jolt = opts.reducedMotion ? 0 : 1;
    car.body.rotation.set(st.pitch + (st.bump[0] + st.bump[1] - st.bump[2] - st.bump[3]) * 0.04 * jolt, 0, st.roll + (st.bump[1] + st.bump[3] - st.bump[0] - st.bump[2]) * 0.12 * jolt);
    car.body.position.y = -st.heave + (st.bump[0] + st.bump[1] + st.bump[2] + st.bump[3]) * 0.15 * jolt;
    car.pivots.forEach((p, i) => (p.position.y = CAR.wheelR + st.bump[i] * jolt));
    car.wheels.forEach((w) => (w.rotation.x -= (st.v * dt) / CAR.wheelR));
    car.steerers.forEach((s) => (s.rotation.y = -st.wheel));
    car.animate(t, { drs: st.drs, flash: st.inPit || (input.throttle <= 0 && st.v > 30), braking: st.braking, night: cur.lights, heat: st.brakeHeat, speed: st.v });
    const thud = props.update(dt, { x, z, heading, v: st.v });
    if (thud > 4 && mode === "drive") audio?.impact(thud * 0.4);

    // Sparks: the plank kisses the tarmac at speed, more over the kerbs
    if (mode === "drive" || frame % 2 === 0) {
      const sp = Math.abs(st.v);
      if (sp > 52 && Math.random() < (st.kerb ? 0.9 : (sp - 52) / 60)) spark(st.kerb ? 1.2 : 0.6);
    }
    for (let i = 0; i < SPARKS; i++) {
      if (sparkLife[i] <= 0) continue;
      sparkLife[i] -= dt;
      if (sparkLife[i] <= 0) {
        sparkPos[i * 3 + 1] = -999;
        continue;
      }
      sparkVel[i * 3 + 1] -= 18 * dt;
      sparkPos[i * 3] += sparkVel[i * 3] * dt;
      sparkPos[i * 3 + 1] = Math.max(0.02, sparkPos[i * 3 + 1] + sparkVel[i * 3 + 1] * dt);
      sparkPos[i * 3 + 2] += sparkVel[i * 3 + 2] * dt;
    }
    (sparkGeo.attributes.position as BufferAttribute).needsUpdate = true;

    // Race timing
    if (mode === "drive" && game === "race") {
      const ev = race.update(now, dt, { s: st.s, x: st.x, z: st.z, heading: st.heading, speed: st.v, off: st.off });
      st.held = race.phase === "lights";
      if (ev.lights !== undefined) {
        circuit.setStartLights(ev.lights);
        audio?.light(ev.lights);
      }
      if (ev.go && opts.touch) haptic(20);
      if (ev.sector) audio?.chime(ev.sector.best ? "best" : "sector");
      if (ev.lap?.best) audio?.chime("best");
      else if (ev.lap) audio?.chime("lap");
      if (ev.limits || ev.jumpStart) audio?.chime("warn");
      if (Object.keys(ev).length) cb.onRace({ ...ev, lapNo: race.lap, invalid: race.invalid, best: race.bestLap, ghost: ev.lap?.best ? (race.ghost ?? undefined) : undefined, bestSectors: ev.sector ? race.bestSectors.slice() : undefined });
      // Timer and live delta, straight into the DOM
      if (frame % 3 === 0) {
        const el = race.elapsed(now);
        const text = race.phase === "running" ? fmt(el) : race.phase === "lights" ? "Lights" : "--:--.---";
        if (opts.hud.timer && text !== lastTimerText) opts.hud.timer.textContent = lastTimerText = text;
        const d = race.delta(now, st.hint);
        if (opts.hud.delta) {
          opts.hud.delta.textContent = d == null ? "" : `${d > 0 ? "+" : "−"}${(Math.abs(d) / 1000).toFixed(2)}`;
          opts.hud.delta.dataset.sign = d == null ? "" : d > 0 ? "slow" : "fast";
        }
      }
      // Ghost
      ghostShown = assist.ghost && !net && race.phase === "running" && race.ghostAt(race.elapsed(now), ghostPose);
      ghostMesh.visible = ghostShown && Math.hypot(ghostPose.x - x, ghostPose.z - z) > 2.5;
      if (ghostShown) {
        ghostMesh.position.set(ghostPose.x, 0, ghostPose.z);
        ghostMesh.rotation.y = ghostPose.heading;
      }
    } else {
      st.held = false;
      ghostMesh.visible = ghostShown = false;
    }

    // DRS state for the HUD
    if (mode === "drive") {
      const ds: DrsState = st.drs > 0.5 ? "open" : samples[st.hint]?.drs || game === "free" ? "ready" : "off";
      if (ds !== drsState) {
        if ((ds === "open") !== (drsState === "open")) audio?.drs(ds === "open");
        drsState = ds;
        cb.onDrs(ds);
      }
    }

    // Trophies: drive through one to find it
    if (game === "free") {
      trophyMeshes.forEach((m, i) => {
        if (trophiesFound.has(i)) return;
        m.rotation.y = t * 1.8 + i;
        m.position.y = 1.4 + Math.sin(t * 2 + i) * 0.2;
        if (mode === "drive" && Math.hypot(m.position.x - x, m.position.z - z) < 3.4) {
          trophiesFound.add(i);
          m.visible = false;
          glows.set(trophyGlows[i], 0);
          audio?.chime("trophy");
          cb.onTrophy?.(i, trophiesFound.size, trophies.length);
        }
      });
    }

    // Places and the pit lane
    if (mode === "drive" && frame % 10 === 0) {
      const frac = st.s / LENGTH;
      const inPlace = st.inPit ? { name: "Pit lane", line: "limiter on, 80 km/h" } : places.find((p) => (p.from < p.to ? frac >= p.from && frac < p.to : frac >= p.from || frac < p.to)) ?? null;
      if ((inPlace?.name ?? null) !== placeName) {
        placeName = inPlace?.name ?? null;
        if (game === "free" && !st.inPit) cb.onPlace?.(inPlace);
        cb.onPit(st.inPit);
      }
    }

    // Pavilions: offered when you're near (in a hot lap, only when you slow down)
    let near: Landmark | null = null;
    if (mode === "drive" && (game === "free" || Math.abs(st.v) < 25 || race.phase !== "running"))
      for (const l of landmarks) if (Math.hypot(l.x - x, l.z - z) < l.zone) near = l;
    if ((near?.id ?? null) !== zoneId) {
      zoneId = near?.id ?? null;
      cb.onZone(near);
    }

    for (const a of animated) a.update(t, dt);
    city.update(t);
    (bay.uniforms as unknown as { uTime: { value: number } }).uTime.value = t;
    applyTime(dt);

    // HUD numbers
    if (opts.hud.speed && frame % 3 === 0) opts.hud.speed.textContent = String(Math.round(Math.abs(st.v) * 3.6));
    const gearText = st.v < -0.3 ? "R" : Math.abs(st.v) < 0.5 && input.throttle <= 0 ? "N" : String(st.gear);
    if (opts.hud.gear && gearText !== lastGear) opts.hud.gear.textContent = lastGear = gearText;
    const lit = Math.round(clamp((st.rpm - 8200) / 3600, 0, 1) * revs.length);
    if (lit !== lastRevs) {
      lastRevs = lit;
      revs.forEach((el, i) => (el.dataset.on = String(i < lit)));
    }

    /* Cameras */
    look.idle += dt;
    if (look.idle > 1.2) {
      look.yaw *= 1 - damp(3, dt);
      look.pitch *= 1 - damp(3, dt);
    }
    const speed = Math.abs(st.v);
    let fovTarget = 60;
    if (mode !== "drive") {
      // Title view: a short loop of broadcast shots while the car laps on its own
      if (t - shotStart > 7 || shotStart === 0) {
        shotStart = t;
        shot = (shot + 1) % 3;
        // Trackside camera: a little way ahead, beyond the wall on the outside
        const h = locate(x, z, st.hint);
        const i = (h.i + 22) % N;
        const s = samples[i];
        const side = s.curv > 0 ? -1 : 1;
        const o = (wallOffset(i, side) + 6) * side;
        tvSpot = new Vector3(s.x - s.tz * o, 4.5, s.z + s.tx * o);
        camPos.copy(shot === 0 ? tvSpot : camPos);
      }
      if (opts.reducedMotion) {
        camPos.set(-60, 60, -150);
        camTarget.set(140, 40, 600);
        fovTarget = portrait ? 70 : 50;
      } else if (shot === 0) {
        camPos.copy(tvSpot);
        camTarget.set(x, 0.6, z);
        fovTarget = clamp(Math.hypot(tvSpot.x - x, tvSpot.z - z) * 0.6, 14, 50) + (portrait ? 18 : 0);
      } else if (shot === 1) {
        const a = heading + Math.PI * 0.75;
        want.set(x + Math.sin(a) * 7, 1.6, z + Math.cos(a) * 7);
        camPos.lerp(want, damp(4, dt));
        camTarget.set(x + fx * 2, 0.7, z + fz * 2);
        fovTarget = portrait ? 70 : 52;
      } else {
        // High over the car, looking past it across the bay
        want.set(x - 70, 60, z - 110);
        camPos.lerp(want, damp(1.2, dt));
        camTarget.set(x * 0.6 + 70, 10, z * 0.6 + 250);
        fovTarget = portrait ? 75 : 55;
      }
      camera.position.copy(camPos);
      camera.lookAt(camTarget);
    } else if (camMode === "chase") {
      // Follows the car's travel more than its nose, so a slide shows its angle;
      // drops back as the car pulls away and closes in under braking
      const travel = heading - (speed > 4 ? clamp(st.beta, -0.5, 0.5) * 0.55 : 0);
      camYaw = angleLerp(camYaw, travel + look.yaw, damp(5.5, dt));
      chaseLag += (clamp(st.accel * 0.032, -0.55, 0.4) - chaseLag) * damp(3, dt);
      const far = portrait ? 1.35 : 1;
      const dist = (6.2 + speed * 0.018 + (opts.reducedMotion ? 0 : chaseLag)) * far;
      const height = (2.0 + speed * 0.005) * far + look.pitch * 4;
      // Smoothed relative to the car, so the lag is a feel, not a fixed distance that grows with speed
      want.set(Math.sin(camYaw) * dist, height, Math.cos(camYaw) * dist);
      if (snapCam) chaseOff.copy(want);
      else chaseOff.lerp(want, damp(10, dt));
      camPos.set(x + chaseOff.x, chaseOff.y, z + chaseOff.z);
      camera.position.copy(camPos);
      // A little buffeting at speed, more over the kerbs (a smooth wobble, not a jitter)
      if (!opts.reducedMotion) {
        const buffet = ((speed / 90) ** 2 * 0.022 + (st.kerb ? 0.03 : 0)) * far;
        camera.position.x += (Math.sin(t * 23.1) + Math.sin(t * 37.7) * 0.5) * buffet;
        camera.position.y += (Math.sin(t * 29.3) + Math.sin(t * 41.9) * 0.5) * buffet;
      }
      camTarget.set(x + fx * 4, 0.85, z + fz * 4);
      camera.lookAt(camTarget);
      fovTarget = (opts.reducedMotion ? 60 : 57 + Math.min(12, speed * 0.15) + st.drs * 6) + (portrait ? 14 : 0);
    } else if (camMode === "diorama") {
      // High three-quarter view, like a model on a table: it follows the car's turns slowly, never spins with them
      dioYaw = angleLerp(dioYaw, heading + look.yaw, damp(1.3, dt));
      const a = dioYaw + 0.6;
      // Kept above the floodlight heads (16 m), at about 45 degrees
      const back = portrait ? 26 : 21;
      want.set(x + Math.sin(a) * back, (portrait ? 29 : 23.5) + look.pitch * 14, z + Math.cos(a) * back);
      if (snapCam) camPos.copy(want);
      else camPos.lerp(want, damp(4, dt));
      camera.position.copy(camPos);
      camTarget.set(x + fx * 6, 0.4, z + fz * 6);
      camera.lookAt(camTarget);
      fovTarget = portrait ? 50 : 36;
    } else if (camMode === "onboard") {
      car.car.updateMatrixWorld(true);
      car.body.localToWorld(seat.copy(CAR.eye));
      camera.position.copy(seat);
      camPos.copy(seat);
      car.body.getWorldQuaternion(qBody);
      // The camera pod buzzes at speed and jolts over kerbs; the view leans into the corner a touch
      if (!opts.reducedMotion) {
        const buzz = (speed / 90) ** 2 * 0.004 + (st.kerb ? 0.006 : 0);
        camera.position.y += Math.sin(t * 61.3) * buzz + (st.bump[0] + st.bump[1]) * 0.5;
        camera.position.x += Math.sin(t * 47.9) * buzz * 0.6;
      }
      eLook.set(-0.07 + look.pitch, look.yaw - st.steer * 0.08, 0, "YXZ");
      camera.quaternion.copy(qBody).multiply(qLook.setFromEuler(eLook));
      fovTarget = (portrait ? 78 : 70) + (opts.reducedMotion ? 0 : Math.min(8, speed * 0.1) + st.drs * 4);
    } else {
      // Map view: high above, following the car, north up
      want.set(x + fx * 40, 280 + speed, z + fz * 40 + 110);
      camPos.lerp(want, damp(3, dt));
      camera.position.copy(camPos);
      camera.lookAt(camTarget.set(x + fx * 40, 0, z + fz * 40));
      fovTarget = portrait ? 70 : 50;
    }
    // Test hook (development only): a fixed camera for screenshots of the world
    if (dev.cam) {
      camera.position.set(dev.cam[0], dev.cam[1], dev.cam[2]);
      camera.lookAt(dev.cam[3], dev.cam[4], dev.cam[5]);
      fovTarget = dev.cam[6] ?? 50;
      camPos.copy(camera.position);
    }
    if (mode === "drive") snapCam = false;
    st.shake *= 1 - damp(6, dt);
    if (st.shake > 0.01) {
      camera.position.x += (Math.random() - 0.5) * st.shake * 0.4;
      camera.position.y += (Math.random() - 0.5) * st.shake * 0.4;
    }
    fov += (fovTarget - fov) * damp(mode === "drive" ? 4 : 3, dt);
    if (Math.abs(camera.fov - fov) > 0.05) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    sky.mesh.position.copy(camera.position);
    stars.position.copy(camera.position);

    // Pavilions far away aren't drawn
    for (let i = 0; i < pavilions.groups.length; i++) {
      const g = pavilions.groups[i];
      g.visible = Math.hypot(g.position.x - camera.position.x, g.position.z - camera.position.z) < [220, 320, 420][tier];
    }

    // Keep the shadow box on the car (and the light from the right direction on every tier)
    sun.position.set(x + cur.sunDir.x * 60, cur.sunDir.y * 60, z + cur.sunDir.z * 60);
    sun.target.position.set(x, 0, z);
    foliage.update(t, camera, hemi, sun);
    if (post) post.uniforms.uBloom.value = 0.25 + 0.3 * cur.lights;

    if (mode === "drive") audio?.update({ rpm: st.rpm, throttle: st.held ? Math.max(0, input.throttle) : st.gas, slip: st.slip, kerb: st.kerb && speed > 8, speed, brake: st.brake });
  };

  /* Adaptive quality: effects go before pixels, with a floor (see quality.ts) */
  const governor = createGovernor(gfx, T, {
    bloom: (on) => post?.setBloom(on),
    reach: (k) => foliage.setReach(k),
    ratio: (r) => {
      if (Math.abs(r - pixelRatio) < 0.01) return;
      pixelRatio = r;
      renderer.setPixelRatio(r);
      resize();
    },
  });
  const draw = () => {
    renderer.info.reset();
    if (post) post.render(scene, camera);
    else renderer.render(scene, camera);
  };
  const debug = process.env.NODE_ENV === "development" || location.search.includes("gfxdebug");

  const loop = (now: number) => {
    if (disposed) return;
    raf = requestAnimationFrame(loop);
    if (document.hidden || (!onScreen && mode !== "drive")) {
      last = now;
      return;
    }
    const dt = Math.max(0, Math.min(0.1, (now - last) / 1000));
    last = Math.max(last, now);
    frame++;
    input = mode === "drive" && !dev.auto ? readInput() : autopilot();

    acc += dt;
    let steps = 0;
    while (acc >= FIXED && steps < 5) {
      Object.assign(prev, { x: st.x, z: st.z, heading: st.heading });
      carStep(FIXED);
      acc -= FIXED;
      steps++;
    }
    if (steps === 5) acc = 0;
    frameUpdate(dt, now / 1000, acc / FIXED, now);
    remotes?.frame({ dt, t: now / 1000, camera, width: canvas.clientWidth, height: canvas.clientHeight, me: car.car.position, night: cur.lights });
    draw();
    placeLabels();
    if (frame % 3 === 0 && mode === "drive") drawMinimap();
    if (frame === 2) cb.onReady();
    governor.tick(dt);
    if (debug && (frame === 40 || frame % 600 === 0)) {
      const i = renderer.info;
      console.info(`[drive] ${JSON.stringify({ tier: opts.quality, auto: gfx.auto, gpu: gfx.gpu, ratio: pixelRatio, rung: governor.rung, post: !!post, calls: i.render.calls, tris: i.render.triangles, geometries: i.memory.geometries, textures: i.memory.textures, glows: glows.count, ...foliage.counts, lanterns: props.lanternCount })}`);
    }
  };
  // Start the title view mid-lap, on the bay
  {
    const i = Math.round(N * 0.47);
    place(samples[i].x, samples[i].z, headingAt(i));
    st.v = 40;
  }
  raf = requestAnimationFrame(loop);
  // Lets local test scripts drive and measure; compiled out of production builds.
  if (process.env.NODE_ENV === "development")
    (window as unknown as { __bayCircuit?: unknown }).__bayCircuit = {
      dev,
      landmarks,
      trophies,
      samples,
      locate,
      st,
      renderer,
      scene,
      race,
      place,
      setTime,
      get state() {
        return { mode, frame, game, camMode, pixelRatio };
      },
    };

  const onVisibility = () => (document.hidden ? audio?.suspend() : mode === "drive" && audio?.resume());
  document.addEventListener("visibilitychange", onVisibility);

  return {
    drive: (g) => {
      mode = "drive";
      if (!audio) {
        audio = createAudio();
        audio?.setMuted(muted);
      }
      audio?.resume();
      setGame(g);
      cb.onCamera(camMode);
    },
    setMode: (g) => {
      if (mode === "drive") setGame(g);
      else game = g;
    },
    setControls: (c) => Object.assign(controls, c),
    reset,
    setTrophies: (found) => {
      trophiesFound.clear();
      for (const i of found) if (i >= 0 && i < trophies.length) trophiesFound.add(i);
      trophyMeshes.forEach((m, i) => (m.visible = !trophiesFound.has(i)));
    },
    restore: (best, sectors, g) => race.restore(best, sectors, g),
    setAssist: (a) => (assist = a),
    cycleCamera,
    cycleTime,
    setTime,
    stop: () => {
      mode = "attract";
      net = false;
      keys.clear();
      Object.assign(controls, { throttle: 0, steer: 0, drs: false });
      race.stop();
      circuit.setStartLights(0);
      audio?.suspend();
      placeName = null;
      shotStart = 0;
      ghostMesh.visible = ghostShown = false;
      trophyGroup.visible = false;
      if (zoneId) {
        zoneId = null;
        cb.onZone(null);
      }
    },
    setPaint: (id) => car.paint(id),
    capture: () => {
      try {
        // Drawn and read in the same task, so the canvas still holds the frame
        draw();
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
      const max = camMode === "onboard" ? 1.6 : Math.PI;
      look.yaw = clamp(look.yaw - dx * 0.006, -max, max);
      look.pitch = clamp(look.pitch - dy * 0.004, -0.4, 0.45);
    },
    setRemotes: (layer) => {
      remotes?.unmount();
      remotes = layer;
      layer?.mount(scene);
    },
    getNetState: () => ({ x: st.x, z: st.z, heading: st.heading, speed: st.v, steer: st.steer, s: st.s, lap: race.lap, braking: st.braking, drs: st.drs > 0.5, inPit: st.inPit, held: st.held, driving: mode === "drive" }),
    netStart: (o) => {
      if (mode !== "drive") return;
      net = true;
      setGame(o.game);
      place(o.x, o.z, o.heading);
      if (o.game === "race" && o.lightsAt !== undefined && o.goAt !== undefined) {
        race.start(performance.now(), { lightsAt: o.lightsAt, goAt: o.goAt });
        emitRace({});
      }
    },
    dispose: () => {
      disposed = true;
      remotes?.unmount();
      remotes = null;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      removeEventListener("keydown", onKeyDown);
      removeEventListener("keyup", onKeyUp);
      removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
      audio?.dispose();
      scene.traverse((o) => {
        const m = o as Mesh;
        m.geometry?.dispose?.();
        const mat = m.material as Material | Material[] | undefined;
        for (const x of Array.isArray(mat) ? mat : mat ? [mat] : []) {
          (x as MeshStandardMaterial).map?.dispose();
          x.dispose();
        }
      });
      envs.dispose();
      circuit.dispose();
      city.dispose();
      bay.dispose();
      post?.dispose();
      foliage.dispose();
      renderer.dispose();
    },
  };
}

