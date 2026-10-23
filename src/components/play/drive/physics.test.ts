// Run: npx tsx --tsconfig tsconfig.json src/components/play/drive/physics.test.ts
import assert from "node:assert/strict";
import { newCarState, stepCar, type CarState, type StepInput } from "./physics";
import { drivable, headingAt, locate, N, samples } from "./track";

const DT = 1 / 60;
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
let passed = 0;
const test = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log(`ok - ${name}`);
};

/** The title view's autopilot (engine.ts), at a fraction of the speed targets. */
const autopilot =
  (frac: number) =>
  (st: CarState): StepInput => {
    const h = locate(st.x, st.z, st.hint);
    const ahead = samples[(h.i + 5 + Math.round(Math.abs(st.v) * 0.22)) % N];
    const diff = wrap(Math.atan2(-(ahead.x - st.x), -(ahead.z - st.z)) - st.heading);
    const target = samples[(h.i + 4) % N].vmax * frac;
    const throttle = st.v < target ? 1 : st.v > target + 2 ? -Math.min(1, (st.v - target) / 8) : 0.2;
    return { throttle, steer: Math.max(-1, Math.min(1, -diff * 3 - h.d * 0.04)), drs: samples[h.i].drs };
  };

/** A long straight: the middle of the longest run of DRS samples. */
const straight = (() => {
  let best = 0;
  let bestAt = 0;
  for (let i = 0; i < N; i++) {
    let n = 0;
    while (n < N && samples[(i + n) % N].drs) n++;
    if (n > best) {
      best = n;
      bestAt = i;
    }
  }
  return { i: (bestAt + Math.floor(best / 2)) % N, length: best * 3 };
})();

const onStraight = (back: number, lateral = 0, angle = 0, v = 0) => {
  const i = (straight.i - Math.round(back / 3) + N) % N;
  const p = samples[i];
  const st = newCarState(p.x - p.tz * lateral, p.z + p.tx * lateral, headingAt(i) + angle);
  st.v = v;
  st.hint = i;
  return st;
};

/** The car's centre and its front and rear stay inside the walls (with a little slack for a step's travel). */
const inside = (st: CarState) => {
  const fx = -Math.sin(st.heading);
  const fz = -Math.cos(st.heading);
  for (const o of [0, 1.5, -1.5]) {
    const sd = drivable(st.x + fx * o, st.z + fz * o, st.hint);
    if (!(sd < 0.35)) return false;
  }
  return Number.isFinite(st.x) && Number.isFinite(st.z) && Number.isFinite(st.v);
};

test("a flying lap with the autopilot: sane top speed and lap time, no walls", () => {
  const i0 = (N - 3) % N;
  const st = newCarState(samples[i0].x, samples[i0].z, headingAt(i0));
  const drive = autopilot(0.95);
  let t = 0;
  let lastS = 0;
  let laps = 0;
  let lapStart = 0;
  let lap = 0;
  let top = 0;
  let hits = 0;
  while (laps < 2 && t < 300) {
    if (stepCar(st, drive(st), { assist: false, free: false }, DT).impact > 2) hits++;
    t += DT;
    top = Math.max(top, st.v);
    assert.ok(inside(st), `left the drivable area at t=${t.toFixed(2)}`);
    if (st.s < lastS - 1000) {
      laps++;
      if (laps === 2) lap = t - lapStart;
      lapStart = t;
    }
    lastS = st.s;
  }
  assert.equal(laps, 2, "completes a lap");
  const kmh = top * 3.6;
  assert.ok(kmh > 240 && kmh < 320, `top speed ${kmh.toFixed(0)} km/h`);
  assert.ok(lap > 40 && lap < 70, `lap ${lap.toFixed(2)} s`);
  assert.equal(hits, 0, "no wall hits");
});

test("accelerates hard from a standstill, then tops out on the straight", () => {
  const st = onStraight(straight.length / 2 - 3);
  const steer = autopilot(1);
  let t = 0;
  let t100 = 0;
  let beta = 0;
  while (st.v < 200 / 3.6 && t < 20) {
    stepCar(st, { throttle: 1, steer: steer(st).steer, drs: false }, { assist: false, free: false }, DT);
    t += DT;
    if (!t100 && st.v > 100 / 3.6) t100 = t;
    beta = Math.max(beta, Math.abs(st.beta));
  }
  assert.ok(t100 > 1.8 && t100 < 4, `0–100 km/h in ${t100.toFixed(2)} s`);
  assert.ok(t > 4 && t < 9, `0–200 km/h in ${t.toFixed(2)} s`);
  assert.ok(st.gear >= 5, `gear ${st.gear} at 200 km/h`);
  assert.ok(beta < 0.05, "no wheelspin slide in a straight line");
});

test("stops from 250 km/h in a sane distance, in a straight line", () => {
  const st = onStraight(straight.length / 2 - 20, 0, 0, 250 / 3.6);
  const x0 = st.x;
  const z0 = st.z;
  const h0 = st.heading;
  let t = 0;
  while (st.v > 0.5 && t < 10) {
    stepCar(st, { throttle: -1, steer: 0, drs: false }, { assist: false, free: false }, DT);
    t += DT;
  }
  const dist = Math.hypot(st.x - x0, st.z - z0);
  assert.ok(dist > 60 && dist < 190, `stopping distance ${dist.toFixed(1)} m`);
  assert.ok(Math.abs(wrap(st.heading - h0)) < 0.05, "stays straight under braking");
  assert.ok(st.brakeHeat > 0.4, `brakes glow (${st.brakeHeat.toFixed(2)})`);
});

test("a glancing hit slides along the wall and keeps most of its speed", () => {
  const st = onStraight(straight.length / 2 - 10, 3, -0.2, 60);
  let first = -1;
  let maxImpact = 0;
  for (let k = 0; k < 120; k++) {
    const ev = stepCar(st, { throttle: 1, steer: 0, drs: false }, { assist: false, free: false }, DT);
    if (ev.impact > 0 && first < 0) first = k;
    maxImpact = Math.max(maxImpact, ev.impact);
    assert.ok(inside(st), `inside the walls at step ${k}`);
  }
  assert.ok(first >= 0, "reaches the wall");
  assert.ok(st.v > 40, `keeps its speed: ${st.v.toFixed(1)} m/s`);
  assert.ok(maxImpact < 15, `a glancing blow (${maxImpact.toFixed(1)} m/s)`);
});

test("a big hit slows the car without sticking it to the wall", () => {
  const st = onStraight(straight.length / 2 - 10, 0, -1.25, 35);
  let hit = 0;
  for (let k = 0; k < 90; k++) {
    hit = Math.max(hit, stepCar(st, { throttle: 0, steer: 0, drs: false }, { assist: false, free: false }, DT).impact);
    assert.ok(inside(st), `inside the walls at step ${k}`);
  }
  assert.ok(hit > 15, `a hard hit (${hit.toFixed(1)} m/s)`);
  assert.ok(Math.hypot(st.v, st.vR) < 18, `slowed down: ${Math.hypot(st.v, st.vR).toFixed(1)} m/s`);
  // Reverse out, then drive away, steering for the middle of the road
  for (let k = 0; k < 90; k++) stepCar(st, { throttle: -1, steer: 0, drs: false }, { assist: false, free: false }, DT);
  for (let k = 0; k < 120; k++) {
    stepCar(st, { throttle: 1, steer: -Math.sign(st.d), drs: false }, { assist: false, free: false }, DT);
    assert.ok(inside(st), `inside the walls driving away, step ${k}`);
  }
  assert.ok(st.v > 5, `drives away (${st.v.toFixed(1)} m/s)`);
});

test("random driving never leaves the drivable area or produces NaN", () => {
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const i0 = Math.floor(N * 0.3);
  const st = newCarState(samples[i0].x, samples[i0].z, headingAt(i0));
  let input: StepInput = { throttle: 1, steer: 0, drs: false };
  for (let k = 0; k < 60 * 90; k++) {
    if (k % 20 === 0) input = { throttle: rnd() < 0.7 ? 1 : rnd() < 0.5 ? -1 : 0, steer: rnd() < 0.4 ? 0 : rnd() * 2 - 1, drs: rnd() < 0.3 };
    stepCar(st, input, { assist: rnd() < 0.5, free: false }, DT);
    assert.ok(inside(st), `inside at step ${k}: ${JSON.stringify({ x: st.x, z: st.z, v: st.v })}`);
  }
});

test("full lock at speed understeers rather than spins", () => {
  const st = onStraight(straight.length / 2, -6, 0, 55);
  let maxBeta = 0;
  for (let k = 0; k < 50; k++) {
    stepCar(st, { throttle: 0.3, steer: 1, drs: false }, { assist: false, free: false }, DT);
    maxBeta = Math.max(maxBeta, Math.abs(st.beta));
  }
  assert.ok(maxBeta < 0.2, `body slip ${(maxBeta * 57.3).toFixed(1)}°`);
});

console.log(`${passed} passed`);
