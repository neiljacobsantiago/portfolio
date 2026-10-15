import {
  AdditiveBlending,
  BoxGeometry,
  CanvasTexture,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
  type BufferGeometry,
  type Material,
} from "three";

// The jeepney: chrome, a hood horse, a route signboard, banderitas on the
// roof, and a cockpit for the first-person view (wheel, dashboard plaque and
// a rosary that swings with the turns).

export const C = {
  paper: "#fdf0d5",
  ink: "#003049",
  wine: "#780000",
  ember: "#c1121f",
  sky: "#669bbc",
  silver: "#c9ccd1",
};

export const std = (color: string, extra: Partial<ConstructorParameters<typeof MeshStandardMaterial>[0]> = {}) =>
  new MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, metalness: 0, ...extra });

export function part(geometry: BufferGeometry, material: Material | Material[], x = 0, y = 0, z = 0, shadow = true) {
  const m = new Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}

/** Text painted onto a canvas, for signboards. */
export function signTexture(text: string, bg: string, fg: string, w: number, h: number, font = "Georgia, 'Times New Roman', serif") {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.fillStyle = fg;
  g.font = `bold ${Math.round(h * 0.56)}px ${font}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, w / 2, h / 2 + 2);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Headlight spill on the road: brightest at the bumper, fanning out and fading ahead. */
function beamTexture() {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 256;
  const g = c.getContext("2d")!;
  // Canvas bottom = the end nearest the jeepney
  const grad = g.createRadialGradient(64, 262, 4, 64, 262, 250);
  grad.addColorStop(0, "rgba(255,236,190,0.95)");
  grad.addColorStop(0.45, "rgba(255,230,180,0.45)");
  grad.addColorStop(1, "rgba(255,230,180,0)");
  g.fillStyle = grad;
  g.beginPath();
  g.moveTo(44, 256);
  g.lineTo(84, 256);
  g.lineTo(128, 0);
  g.lineTo(0, 0);
  g.closePath();
  g.fill();
  return new CanvasTexture(c);
}

export function buildJeepney() {
  const car = new Group(); // follows the ground: position, heading, terrain pitch and roll
  const body = new Group(); // leans, squats and bounces on the suspension
  car.add(body);
  const red = std(C.ember, { roughness: 0.4, metalness: 0.1 });
  const paper = std(C.paper);
  const ink = std(C.ink);
  const chrome = std(C.silver, { metalness: 0.75, roughness: 0.22 });
  const glass = new MeshStandardMaterial({ color: "#9fc3d8", roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.16, depthWrite: false });

  body.add(part(new BoxGeometry(2.3, 0.45, 4.9), chrome, 0, 0.75, 0));
  body.add(part(new BoxGeometry(2.2, 1.4, 3.2), red, 0, 1.65, 0.65));
  body.add(part(new BoxGeometry(2.0, 0.9, 1.4), red, 0, 1.35, -1.6)); // hood
  body.add(part(new BoxGeometry(2.42, 0.2, 3.7), paper, 0, 2.45, 0.5)); // roof
  body.add(part(new BoxGeometry(2.24, 0.16, 3.24), ink, 0, 1.25, 0.65));
  body.add(part(new BoxGeometry(2.26, 0.5, 2.7), std("#1c2b3a", { roughness: 0.2 }), 0, 1.95, 0.75));
  body.add(part(new BoxGeometry(1.9, 0.62, 0.06), glass, 0, 2.02, -0.97, false)); // windshield
  body.add(part(new BoxGeometry(1.5, 0.55, 0.12), chrome, 0, 1.25, -2.34)); // grille
  for (const x of [-0.97, 0.97]) body.add(part(new BoxGeometry(0.06, 0.66, 0.06), ink, x, 2.02, -0.97)); // A-pillars
  // Two chrome horses on the hood, abstracted
  for (const x of [-0.62, 0.62]) {
    const horse = new Group();
    horse.add(part(new BoxGeometry(0.07, 0.16, 0.3), chrome, 0, 0.08, 0));
    horse.add(part(new BoxGeometry(0.07, 0.14, 0.1), chrome, 0, 0.2, -0.14));
    horse.position.set(x, 1.8, -2.15);
    body.add(horse);
  }
  const headMat = new MeshStandardMaterial({ color: "#fff7df", emissive: "#fff2c4", emissiveIntensity: 1.2 });
  for (const x of [-0.72, 0.72]) body.add(part(new SphereGeometry(0.2, 12, 8), headMat, x, 1.35, -2.36, false));
  const brakeMat = new MeshStandardMaterial({ color: "#5a0000", emissive: "#ff2a2a", emissiveIntensity: 0.25 });
  for (const x of [-0.85, 0.85]) body.add(part(new BoxGeometry(0.3, 0.22, 0.06), brakeMat, x, 1.2, 2.47, false));
  // Rear step and grab rail
  body.add(part(new BoxGeometry(1.1, 0.1, 0.5), chrome, 0, 0.62, 2.6));
  for (const x of [-0.5, 0.5]) body.add(part(new BoxGeometry(0.06, 1.2, 0.06), chrome, x, 1.65, 2.3));

  // Route signboard up front and painted names on the sides
  const front = signTexture("SAN JOSE ⇄ CLSU", C.paper, C.ink, 512, 96);
  const plain = std(C.paper);
  const sign = new Mesh(new BoxGeometry(2.1, 0.42, 0.08), [plain, plain, plain, plain, plain, new MeshStandardMaterial({ map: front, roughness: 0.6 })]);
  sign.position.set(0, 2.72, -1.2);
  sign.castShadow = true;
  body.add(sign);
  const side = signTexture("NEIL JACOB", C.ember, C.paper, 512, 96);
  for (const x of [-1.115, 1.115]) {
    const plate = part(new PlaneGeometry(2.6, 0.48), new MeshStandardMaterial({ map: side, roughness: 0.6, transparent: true }), x, 1.55, 0.7, false);
    plate.rotation.y = x < 0 ? -Math.PI / 2 : Math.PI / 2;
    body.add(plate);
  }
  // Painted bands around the body: open frames, so the cab's ceiling stays clear from inside
  for (const [y, color] of [
    [1.05, C.sky],
    [2.36, C.ember],
  ] as const) {
    const band = std(color);
    for (const x of [-1.11, 1.11]) body.add(part(new BoxGeometry(0.05, 0.1, 3.26), band, x, y, 0.65));
    for (const z of [-0.96, 2.26]) body.add(part(new BoxGeometry(2.25, 0.1, 0.05), band, 0, y, z));
  }
  // Side mirrors on the front fenders
  for (const x of [-1.08, 1.08]) {
    body.add(part(new BoxGeometry(0.03, 0.42, 0.03), chrome, x, 1.98, -1.85));
    body.add(part(new BoxGeometry(0.06, 0.2, 0.16), chrome, x + Math.sign(x) * 0.06, 2.2, -1.85));
  }
  body.add(part(new BoxGeometry(1.8, 0.12, 0.12), chrome, 0, 2.62, -1));

  // Banderitas: little flags along the roof that flutter with speed
  const flagColors = [C.ember, C.paper, C.sky, "#ffd27a"];
  const flags: Mesh[] = [];
  const flagGeo = new PlaneGeometry(0.22, 0.26).translate(0, -0.13, 0);
  for (const x of [-1.2, 1.2])
    for (let i = 0; i < 7; i++) {
      const f = part(flagGeo, new MeshStandardMaterial({ color: flagColors[i % 4], side: DoubleSide, roughness: 0.8 }), x, 2.56, -1.05 + i * 0.55, false);
      f.rotation.y = Math.PI / 2;
      flags.push(f);
      body.add(f);
    }

  // Cockpit, seen in the first-person view (the driver sits on the left)
  const cockpit = new Group();
  const dashMat = std("#4a3f38", { roughness: 0.7 });
  const trimMat = std(C.wine, { roughness: 0.6 });
  cockpit.add(part(new BoxGeometry(2.0, 0.3, 0.4), dashMat, 0, 1.63, -0.95, false));
  cockpit.add(part(new BoxGeometry(2.0, 0.04, 0.06), trimMat, 0, 1.79, -0.76, false));
  const plaque = signTexture("GOD BLESS OUR TRIP", "#fff6e0", C.wine, 512, 72);
  const plaqueMat = new MeshStandardMaterial({ map: plaque, emissiveMap: plaque, emissive: "#ffffff", emissiveIntensity: 0, roughness: 0.5 });
  cockpit.add(part(new PlaneGeometry(0.46, 0.065), plaqueMat, 0.36, 1.8, -1.02, false).rotateX(-0.6));
  // Two gauges that glow at night
  const gaugeMat = new MeshStandardMaterial({ color: "#1f2a33", emissive: "#ffb347", emissiveIntensity: 0.1, roughness: 0.3 });
  for (const x of [-0.6, -0.4]) cockpit.add(part(new CylinderGeometry(0.04, 0.04, 0.02, 16), gaugeMat, x, 1.79, -0.84, false).rotateX(Math.PI / 2 - 0.5));
  // A cream ceiling with a red trim, softly lit so it never reads as a dark slab
  const ceilingMat = std(C.paper, { emissive: C.paper, emissiveIntensity: 0.45 });
  cockpit.add(part(new PlaneGeometry(2.15, 3.15).rotateX(Math.PI / 2), ceilingMat, 0, 2.33, 0.65, false));
  const wheel = new Group();
  const rimMat = std("#1a1a1a", { roughness: 0.5 });
  wheel.add(part(new TorusGeometry(0.18, 0.02, 8, 28), rimMat, 0, 0, 0, false));
  wheel.add(part(new BoxGeometry(0.34, 0.03, 0.025), rimMat, 0, 0, 0, false));
  wheel.add(part(new BoxGeometry(0.03, 0.17, 0.025), rimMat, 0, -0.085, 0, false));
  wheel.add(part(new CylinderGeometry(0.045, 0.045, 0.04, 12), chrome, 0, 0, 0.01, false).rotateX(Math.PI / 2));
  wheel.position.set(-0.5, 1.7, -0.6);
  wheel.rotation.x = -0.85;
  cockpit.add(wheel);
  cockpit.add(part(new CylinderGeometry(0.03, 0.03, 0.3, 8), dashMat, -0.5, 1.59, -0.7, false).rotateX(0.72)); // steering column
  // Rosary hanging from the top of the windshield, swings like a pendulum
  const rosary = new Group();
  const beads = std("#5a3b2a", { roughness: 0.4 });
  const bead = new SphereGeometry(0.009, 6, 4);
  for (let i = 0; i < 11; i++) {
    const t = i / 10;
    rosary.add(part(bead, beads, Math.sin(t * Math.PI) * 0.035, -t * 0.18, 0, false));
  }
  rosary.add(part(new BoxGeometry(0.008, 0.05, 0.008), chrome, 0, -0.21, 0, false));
  rosary.add(part(new BoxGeometry(0.03, 0.008, 0.008), chrome, 0, -0.2, 0, false));
  rosary.position.set(0.05, 2.3, -0.93);
  cockpit.add(rosary);
  cockpit.visible = false;
  body.add(cockpit);
  const cabinMats = [dashMat, trimMat, rimMat];

  // Headlight beams on the ground, for night driving
  const beamMat = new MeshBasicMaterial({ map: beamTexture(), transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false });
  const beam = new Mesh(new PlaneGeometry(9, 16), beamMat);
  beam.rotation.x = -Math.PI / 2;
  beam.position.set(0, 0.08, -10.2);
  beam.renderOrder = 2;
  car.add(beam);

  const wheelGeo = new CylinderGeometry(0.52, 0.52, 0.42, 18);
  const wheelMat = std("#1d1d1d");
  const hubMat = std(C.silver, { metalness: 0.6 });
  const wheels: Group[] = [];
  const steerers: Group[] = [];
  for (const [x, z, isFront] of [
    [-1.18, -1.55, true],
    [1.18, -1.55, true],
    [-1.18, 1.7, false],
    [1.18, 1.7, false],
  ] as const) {
    const pivot = new Group();
    pivot.position.set(x, 0.52, z);
    const spin = new Group();
    const w = part(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    const hub = part(new CylinderGeometry(0.24, 0.24, 0.44, 8), hubMat);
    hub.rotation.z = Math.PI / 2;
    spin.add(w, hub);
    pivot.add(spin);
    car.add(pivot);
    wheels.push(spin);
    if (isFront) steerers.push(pivot);
  }

  let swing = 0;
  let swingV = 0;
  return {
    car,
    body,
    wheels,
    steerers,
    cockpit,
    /** Per-frame details: flags flutter, the wheel turns, the rosary swings, lights follow the pedals. */
    animate(t: number, dt: number, s: { speed: number; steer: number; lateral: number; accel: number; braking: boolean; night: number }) {
      const flutter = Math.min(1, Math.abs(s.speed) / 18);
      flags.forEach((f, i) => (f.rotation.x = Math.sin(t * (6 + flutter * 10) + i * 0.9) * (0.15 + flutter * 0.55) - flutter * 0.6));
      wheel.rotation.z = -s.steer * 1.6;
      // Pendulum: pushed by sideways and forward acceleration
      swingV += (-swing * 40 - swingV * 2.2 + s.lateral * 0.9) * dt;
      swing += swingV * dt;
      rosary.rotation.z = Math.max(-0.9, Math.min(0.9, swing));
      rosary.rotation.x = Math.max(-0.5, Math.min(0.5, s.accel * -0.02));
      brakeMat.emissiveIntensity = s.braking ? 2.2 : 0.25 + s.night * 0.6;
      // A little cab light at night, so the dashboard doesn't vanish
      gaugeMat.emissiveIntensity = 0.15 + s.night * 1.6;
      if (cockpit.visible) {
        for (const m of cabinMats) m.emissive.copy(m.color).multiplyScalar(0.35 + s.night * 0.3);
        plaqueMat.emissiveIntensity = s.night * 0.45;
      }
      headMat.emissiveIntensity = 1.2 + s.night * 2.5;
      beamMat.opacity = s.night * 0.6;
    },
  };
}
