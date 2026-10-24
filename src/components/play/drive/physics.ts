import { BRAKE, drivable, GRIP, HALF, KERB, locate, N, pitDist, PIT_LIMIT, samples } from "./track";

// The car's handling: one fixed step of an arcade take on a real racing car,
// with no three.js in it so it can be tested on its own.
//   · a bicycle model in the car's frame (forward speed, sideways speed, yaw
//     rate), integrated in small sub-steps so the tyres stay stable
//   · each axle's grip is its load times the tyre's friction: load is weight
//     plus downforce (it grows with v²), shifted forward under braking and
//     rearward on the throttle, so trail-braking turns the car in and too much
//     power in a slow corner lets the rear step out
//   · a tyre curve against slip angle that peaks and then falls away gently,
//     with the front giving up first: overdriven, the car understeers
//   · braking and drive share the same grip (a friction ellipse)
//   · speed-sensitive steering: full lock asks for about the grip there is
//   · per-wheel surfaces: kerbs bump and lose a little grip, run-off a lot
//   · walls are impulses at the contact point with friction: a glancing hit
//     slides along, a big one stops you without sticking you to the wall
//   · an eight-speed gearbox for the sound and the HUD, with a short torque
//     cut on each upshift and rev-matched downshifts under braking
// Lap times stay close to the old model's: grip and braking come from the
// same GRIP and BRAKE figures the circuit's speed targets are built from.

/** Top speed of each gear (m/s); first is a standstill. */
export const GEARS = [0, 19, 29, 38, 47, 56, 65, 75, 92];
export const WHEELBASE = 3.6;
/** CG to the front and rear axles (the car carries a little more on the rear). */
const A = 1.98;
const B = WHEELBASE - A;
/** Yaw inertia over mass (radius of gyration squared, m²). */
const IZ = 1.55;
/** Load transfer: CG height over wheelbase. */
const HCG = 0.085;
const G = 9.81;
/** Tyre friction, from the circuit's grip figure; downforce as an extra load. */
const MU = GRIP.base / G;
const AERO = GRIP.aero / MU;
/** Grip balance front and rear: the front lets go first. */
const MU_F = 0.96;
const MU_R = 1.06;
/** Longitudinal grip relative to lateral (a friction ellipse, a little longer than wide). */
const LONG = 1.22;
/** Peak slip angles (rad): the wide rears are stiffer. */
const PEAK_F = 0.095;
const PEAK_R = 0.08;
/** Tyre curve shape: sin(C·atan(K·x)) peaks at x = 1 and falls to ~0.8 well past it. */
const TC = 1.4;
const TK = Math.tan(Math.PI / (2 * TC));
const tyre = (x: number) => Math.sin(TC * Math.atan(TK * x));
/** Lateral grip left when a share f of the longitudinal grip is in use: a squarish ellipse, so part throttle costs little. */
const ellipse = (f: number) => Math.pow(Math.max(0, 1 - Math.pow(Math.min(1, Math.abs(f)), 2.6)), 1 / 2.6);
/** Wheels as offsets from the CG: right (x) and forward (z). Order FL, FR, RL, RR. */
const WHEELS: [number, number][] = [
  [-0.8, A],
  [0.8, A],
  [-0.78, -B],
  [0.78, -B],
];
const SUBSTEPS = 8;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/** Lateral grip available at speed v (m/s²), as the circuit's speed targets assume. */
export const gripAt = (v: number) => GRIP.base + GRIP.aero * v * v;

/** Road-wheel angle for full lock at speed v: about what the tyres can use, a little more. */
export const lockAt = (v: number) => Math.min(0.42, (WHEELBASE * gripAt(v)) / Math.max(1, v * v) + PEAK_F * 1.3 + 0.015);

export function newCarState(x = 0, z = 0, heading = 0) {
  return {
    x,
    z,
    heading,
    /** Forward speed (m/s), negative in reverse. */
    v: 0,
    /** Sideways speed, positive to the right. */
    vR: 0,
    /** Yaw rate: heading += yawRate·dt (positive turns left). */
    yawRate: 0,
    /** Steering, -1…1 after smoothing; `wheel` is the road-wheel angle (rad, + right). */
    steer: 0,
    wheel: 0,
    /** Pedals after smoothing: throttle 0…1, brake 0…1. */
    gas: 0,
    brake: 0,
    gear: 1,
    rpm: 4000,
    /** Seconds left of an upshift's torque cut. */
    cut: 0,
    drs: 0,
    pitch: 0,
    roll: 0,
    /** Body drop from downforce (m). */
    heave: 0,
    hint: -1,
    s: 0,
    d: 0,
    kerb: false,
    off: false,
    inPit: false,
    /** 0…1: how far past the tyres' limit, for the sound. */
    slip: 0,
    /** Body slip angle (rad): + the car points right of where it's going. */
    beta: 0,
    shake: 0,
    /** Longitudinal and lateral acceleration (m/s²), smoothed. */
    accel: 0,
    lateral: 0,
    braking: false,
    held: false,
    /** 0…1, heat in the brake discs: they glow past about 0.4. */
    brakeHeat: 0,
    /** Per wheel (FL, FR, RL, RR): on a kerb, and the wheel's bump (m, + up). */
    wheelKerb: [false, false, false, false],
    bump: [0, 0, 0, 0],
    /** Distance travelled, for kerb rumble and wheel spin. */
    odo: 0,
  };
}
export type CarState = ReturnType<typeof newCarState>;

export interface StepInput {
  /** -1 (brake) … 1 (throttle). */
  throttle: number;
  /** -1 (left) … 1 (right). */
  steer: number;
  drs: boolean;
}

export interface StepOptions {
  /** Brake assist (and traction control, a calmer rear): the beginner setting. */
  assist: boolean;
  /** Free roam: DRS anywhere. */
  free: boolean;
  /** Nobody's driving (the title view's autopilot): traction control on. */
  auto?: boolean;
}

export interface StepEvents {
  /** Normal speed into a wall (m/s), 0 if none. */
  impact: number;
  /** +1 upshift, -1 downshift, 0 none. */
  shift: number;
}

const events: StepEvents = { impact: 0, shift: 0 };

/** One fixed step of the car. Mutates the state; returns the step's events (a shared object). */
export function stepCar(st: CarState, input: StepInput, o: StepOptions, dt: number): StepEvents {
  events.impact = 0;
  events.shift = 0;
  const before = st.v;

  // Where on the circuit are we?
  const h = locate(st.x, st.z, st.hint);
  st.hint = h.i;
  st.s = h.s;
  st.d = h.d;
  const sample = samples[h.i];
  const edge = Math.abs(h.d);
  const pd = pitDist(st.x, st.z).d;
  st.inPit = pd < -0.5 && edge > HALF + KERB + 1.5;
  st.off = !st.inPit && edge > HALF + KERB + 0.6;

  // Each wheel's surface: tarmac, kerb or run-off
  const sh = Math.sin(st.heading);
  const ch = Math.cos(st.heading);
  // Track's right is (-tz, tx); the car's right is (cos h, -sin h), forward (-sin h, -cos h)
  const trx = -sample.tz;
  const trz = sample.tx;
  const surf = [1, 1, 1, 1];
  let runoffDrag = 0;
  st.kerb = false;
  for (let w = 0; w < 4; w++) {
    const [ox, oz] = WHEELS[w];
    const wx = ch * ox - sh * oz;
    const wz = -sh * ox - ch * oz;
    const d = h.d + wx * trx + wz * trz;
    const ad = Math.abs(d);
    const kerbSide = d > 0 ? sample.kerbR : sample.kerbL;
    const onKerb = !st.inPit && kerbSide && ad > HALF - 0.1 && ad < HALF + KERB + 0.15;
    const runoff = !st.inPit && ad > HALF + (kerbSide ? KERB + 0.15 : 0.6);
    st.wheelKerb[w] = onKerb;
    if (onKerb) {
      st.kerb = true;
      surf[w] = 0.93;
    } else if (runoff) {
      surf[w] = 0.68;
      runoffDrag += 0.25 * (1.5 + 0.0035 * st.v * st.v);
    }
  }
  const surfF = (surf[0] + surf[1]) / 2;
  const surfR = (surf[2] + surf[3]) / 2;

  // Steering: digital inputs ramp in (slower at speed, quicker back to centre),
  // analogue ones (tilt, sticks) are just smoothed
  const av0 = Math.abs(st.v);
  const delta = input.steer - st.steer;
  const back = Math.abs(input.steer) < Math.abs(st.steer) && Math.sign(input.steer) !== -Math.sign(st.steer);
  const rate = back ? 7 : 6.5 - clamp(av0 / 20, 0, 3);
  st.steer += clamp(delta * Math.min(1, dt * 14), -rate * dt, rate * dt);
  // Pedals: throttle squeezes on, lifting is instant; the brake bites quickly
  let throttle = input.throttle;
  // Brake assist: brakes for the corner ahead if you're carrying too much speed
  if (o.assist && !st.inPit) {
    let target = 99;
    for (let k = 1; k <= 8; k++) target = Math.min(target, samples[(h.i + k * 2) % N].vmax * 1.04);
    if (st.v > target + 1) throttle = Math.min(throttle, -clamp((st.v - target) / 6, 0.25, 1));
  }
  if (st.held) throttle = Math.min(throttle, 0);
  const gasWant = Math.max(0, throttle);
  const brakeWant = Math.max(0, -throttle);
  st.gas = gasWant < st.gas ? gasWant : Math.min(gasWant, st.gas + dt * 4.5);
  st.brake = brakeWant < st.brake ? Math.max(brakeWant, st.brake - dt * 10) : Math.min(brakeWant, st.brake + dt * 9);

  // DRS: on a straight, with the boost held and the wheel straight
  const drsZone = sample.drs || o.free;
  const drsWant = input.drs && drsZone && st.v > 22 && Math.abs(st.steer) < 0.3 && throttle > 0.2;
  st.drs += ((drsWant ? 1 : 0) - st.drs) * Math.min(1, dt * (drsWant ? 6 : 12));

  const vTop = st.inPit ? PIT_LIMIT : 82 + 7 * st.drs;
  const tc = o.assist || o.auto ? 0.72 : 0.96;
  const stab = o.assist || o.auto ? 1 : 0.55;
  st.cut = Math.max(0, st.cut - dt);
  st.braking = st.brake > 0.05 && st.v > 0.4;

  // The integration, in sub-steps
  const n = SUBSTEPS;
  const hdt = dt / n;
  let vx = st.v;
  let vy = st.vR;
  let w = -st.yawRate; // + turns right
  let ax = st.accel;
  let slip = 0;
  let latSum = 0;
  for (let k = 0; k < n; k++) {
    const av = Math.abs(vx);
    const delta = st.steer * lockAt(av);
    st.wheel = delta;
    // Loads: weight and downforce, shifted by the last acceleration
    const aero = AERO * vx * vx * (1 - 0.06 * st.drs);
    const load = G + aero;
    const shiftLoad = clamp(ax, -48, 20) * HCG;
    const fzF = Math.max(0.5, load * (B / WHEELBASE) - shiftLoad);
    const fzR = Math.max(0.5, load * (A / WHEELBASE) + shiftLoad);
    const capF = MU * MU_F * fzF * surfF;
    const capR = MU * MU_R * fzR * surfR;

    // Longitudinal forces at each axle (per unit mass)
    let fxF = 0;
    let fxR = 0;
    if (st.gas > 0) {
      if (vx >= -0.3) fxR += 12 * st.gas * (1 - Math.min(1, (vx / vTop) ** 2)) * (st.cut > 0 ? 0.55 : 1);
    } else if (vx > 0.3) {
      // Engine braking through the rear, stronger in the low gears
      fxR -= 0.7 + 1.1 * clamp((st.rpm - 4000) / 8000, 0, 1);
    }
    if (st.brake > 0 && vx > 0.4) {
      const want = (BRAKE.base + BRAKE.aero * vx * vx) * st.brake;
      fxF -= want * 0.6;
      fxR -= want * 0.4;
    }
    // The friction ellipse: drive and braking take from the same grip (with traction control and ABS)
    const longF = capF * LONG;
    const longR = capR * LONG;
    fxF = clamp(fxF, -longF * 0.98, longF * 0.98);
    const spin = fxR > longR * tc ? fxR / (longR * tc) - 1 : 0;
    fxR = clamp(fxR, -longR * 0.98, longR * tc);
    const latF = capF * Math.max(0.35, ellipse(fxF / longF));
    const latR = capR * Math.max(0.3, ellipse(fxR / longR) - spin * 0.6);

    // Slip angles and the tyre curve
    const vxs = Math.max(av, 2);
    const aF = Math.atan2(vy + A * w, vxs) - delta * Math.sign(vx || 1);
    const aR = Math.atan2(vy - B * w, vxs);
    const fyF = -latF * tyre(aF / PEAK_F);
    const fyR = -latR * tyre(aR / PEAK_R);
    if (av > 6) slip = Math.max(slip, (Math.abs(aF) / PEAK_F - 0.95) * 1.5, (Math.abs(aR) / PEAK_R - 0.85) * 1.5, spin * 2);

    const cd = Math.cos(delta);
    const sd = Math.sin(delta);
    // Drag: air (less with DRS open), rolling, the run-off's grass and gravel
    const air = 0.0011 * vx * vx * (1 - 0.35 * st.drs) * (st.gas > 0 ? 0.25 : 1);
    const roll = st.gas > 0 ? 0 : 0.7;
    const drag = (air + roll + runoffDrag) * Math.sign(vx);
    ax = fxF * cd - fyF * sd + fxR - drag;
    const ay = fyF * cd + fxF * sd + fyR;
    const yawAcc = (A * (fyF * cd + fxF * sd) - B * fyR) / IZ;

    let nvx = vx + (ax + vy * w) * hdt;
    // Reverse: the brake backs up from a standstill, the throttle stops a reversing car
    if (st.gas > 0 && vx < -0.3) nvx = Math.min(0, vx + 18 * st.gas * hdt);
    else if (st.brake > 0 && vx <= 0.4) nvx = Math.max(-9, vx - 7 * st.brake * hdt);
    let nvy = vy + (ay - vx * w) * hdt;
    let nw = w + yawAcc * hdt;

    // Slow: the tyres can't slip, the car just follows its wheels
    const kin = clamp((Math.abs(nvx) - 3) / 4, 0, 1);
    if (kin < 1) {
      const wk = (nvx * Math.tan(delta)) / WHEELBASE;
      nvy = nvy * kin + wk * B * (1 - kin);
      nw = nw * kin + wk * (1 - kin);
    }
    // Arcade help, like a gentle stability control: once the car slides past a
    // few degrees, rotation beyond the path it's on is damped, and past the
    // limit the slide is held there, so a slide is something to catch, not a spin
    if (Math.abs(nvx) > 4) {
      const beta = Math.atan2(nvy, Math.abs(nvx));
      const path = ay / Math.abs(nvx);
      const b0 = 0.07 + 0.08 * (1 - stab);
      const over = Math.abs(beta) - b0;
      // Only when the slide is growing: path − ω has the sign of a growing β
      if (over > 0 && (path - nw) * beta > 0) nw += (path - nw) * Math.min(1, over * 60 * stab * hdt * 8);
      const bmax = 0.32 + 0.22 * (1 - stab);
      if (Math.abs(beta) > bmax) nvy = Math.sign(nvy) * Math.tan(bmax) * Math.abs(nvx);
    }
    // Overdriven fronts scrub speed
    if (Math.abs(aF) > PEAK_F && nvx > 0) nvx -= Math.min(nvx, (Math.abs(aF) / PEAK_F - 1) * 2.2 * hdt);
    if (Math.abs(nvx) < 0.05 && st.gas === 0 && st.brake === 0) nvx = 0;
    vx = nvx;
    vy = nvy;
    w = nw;
    latSum += ay;
  }
  if (st.inPit && vx > PIT_LIMIT) vx -= (vx - PIT_LIMIT) * 4 * dt;

  st.v = vx;
  st.vR = vy;
  st.yawRate = -w;
  st.slip = clamp(slip, 0, 1);
  st.heading = wrapAngle(st.heading + st.yawRate * dt);
  const fx = -Math.sin(st.heading);
  const fz = -Math.cos(st.heading);
  const rx = Math.cos(st.heading);
  const rz = -Math.sin(st.heading);
  let wx = fx * vx + rx * vy;
  let wz = fz * vx + rz * vy;
  st.x += wx * dt;
  st.z += wz * dt;
  st.odo += Math.abs(vx) * dt;

  // Walls: three circles along the car against the drivable area, as impulses with friction
  let impact = 0;
  let om = st.yawRate;
  for (const [off, R] of [
    [1.9, 0.95],
    [0, 1.0],
    [-1.75, 1.0],
  ] as const) {
    const cx = st.x + fx * off;
    const cz = st.z + fz * off;
    const sd = drivable(cx, cz, st.hint);
    if (sd <= -R) continue;
    const e = 0.3;
    const gx = drivable(cx + e, cz, st.hint) - drivable(cx - e, cz, st.hint);
    const gz = drivable(cx, cz + e, st.hint) - drivable(cx, cz - e, st.hint);
    const gl = Math.hypot(gx, gz) || 1;
    const nx = gx / gl;
    const nz = gz / gl;
    const pen = sd + R;
    st.x -= nx * pen;
    st.z -= nz * pen;
    // The contact point, on the circle's rim towards the wall
    const px = fx * off + nx * R * 0.6;
    const pz = fz * off + nz * R * 0.6;
    // Velocity there: v + ω × r (ω about +y)
    const cvx = wx + om * pz;
    const cvz = wz - om * px;
    const vn = cvx * nx + cvz * nz;
    if (vn <= 0) continue;
    const rn = pz * nx - px * nz;
    const bounce = 0.08 + Math.min(0.1, vn * 0.004);
    const jn = ((1 + bounce) * vn) / (1 + (rn * rn) / IZ / 4);
    wx -= jn * nx;
    wz -= jn * nz;
    om -= clamp(((rn * jn) / IZ) * 0.25, -1.5, 1.5);
    // Friction along the wall: a light touch keeps its speed, a hard one loses some
    const tvx = cvx - vn * nx;
    const tvz = cvz - vn * nz;
    const tl = Math.hypot(tvx, tvz);
    if (tl > 0.01) {
      const jt = Math.min(0.22 * jn, tl * 0.5);
      wx -= (tvx / tl) * jt;
      wz -= (tvz / tl) * jt;
    }
    impact = Math.max(impact, vn);
  }
  if (impact > 0) {
    // Back into the car's frame; a hit shakes the car's yaw loose a little
    const sp = Math.hypot(wx, wz);
    st.v = wx * fx + wz * fz;
    st.vR = wx * rx + wz * rz;
    // Scraping along at a steep angle turns the nose along the wall
    if (sp > 3) {
      const along = Math.atan2(-wx, -wz);
      const diff = wrapAngle((st.v >= 0 ? along : along + Math.PI) - st.heading);
      if (Math.abs(diff) < 1.2) om += (diff * 3 - om) * Math.min(1, 0.25 + impact * 0.05);
    }
    st.yawRate = clamp(om, -2.5, 2.5);
    st.vR = clamp(st.vR, -12, 12);
    events.impact = impact;
  }

  // Smoothed accelerations for the body, the camera and the next step's load transfer
  const acc = (st.v - before) / dt;
  st.accel += (clamp(acc, -60, 30) - st.accel) * Math.min(1, dt * 12);
  st.lateral += (latSum / n - st.lateral) * Math.min(1, dt * 12);
  st.beta = Math.atan2(st.vR, Math.max(2, Math.abs(st.v)));

  // Body: pitch under braking and acceleration, roll in corners, a drop from downforce
  st.pitch += (clamp(st.accel * 0.00055, -0.022, 0.012) - st.pitch) * Math.min(1, dt * 9);
  st.roll += (clamp(st.lateral * 0.00042, -0.02, 0.02) - st.roll) * Math.min(1, dt * 9);
  st.heave += (Math.min(0.035, AERO * st.v * st.v * 0.0012) - st.heave) * Math.min(1, dt * 6);
  // Kerbs: each wheel on one rides up and down over the stripes
  for (let i = 0; i < 4; i++) {
    const want = st.wheelKerb[i] && av0 > 3 ? 0.012 + 0.012 * Math.abs(Math.sin(st.odo * 2.6 + i)) : 0;
    st.bump[i] += (want - st.bump[i]) * Math.min(1, dt * 30);
  }
  if (st.kerb && av0 > 10) st.shake = Math.max(st.shake, Math.min(0.25, av0 / 300));

  // Brakes heat up under hard braking at speed and cool off slowly
  st.brakeHeat += (st.brake * Math.min(1, st.v / 55) * 1.3 - st.brakeHeat * (0.35 + av0 * 0.004)) * dt;
  st.brakeHeat = clamp(st.brakeHeat, 0, 1);

  // Gearbox (for the sound and the HUD): rev-matched downshifts while braking
  const sp = Math.abs(st.v);
  if (st.gear < 8 && sp > GEARS[st.gear] * 0.97) {
    st.gear++;
    st.cut = 0.07;
    events.shift = 1;
  } else if (st.gear > 1 && sp < GEARS[st.gear - 1] * (st.braking ? 0.9 : 0.78)) {
    st.gear--;
    events.shift = -1;
  }
  const engineRpm = Math.max(4200, (12000 * sp) / GEARS[st.gear]);
  const targetRpm = Math.min(12400, engineRpm + (st.held ? st.gas * 6000 : 0) + (st.gear === 1 && st.gas > 0 ? (1 - Math.min(1, sp / 8)) * 3000 * st.gas : 0));
  st.rpm += (targetRpm - st.rpm) * Math.min(1, dt * (events.shift ? 30 : 16));

  return events;
}
