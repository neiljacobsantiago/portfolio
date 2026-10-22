// Run: npx tsx --tsconfig tsconfig.json src/components/play/drive/net/protocol.test.ts
import assert from "node:assert/strict";
import { PAINTS } from "../car";
import { HALF, LENGTH, locate, samples } from "../track";
import { createBuffer, EXTRAPOLATE_MS, type Pose } from "./interp";
import {
  CODE_ALPHABET,
  createClock,
  decodeState,
  encodeState,
  FLAG,
  makeCode,
  MAX_TEXT,
  normalizeCode,
  PAINT_IDS,
  parseGuest,
  parseHost,
  peerIdFor,
  QUICK,
  readText,
  roomLink,
  sanitizeName,
  seqNewer,
  stampSlot,
  STATE_BYTES,
  standings,
  WORLD,
  type CarState,
} from "./protocol";
import { createProgress, gridSlot, pitSlot } from "./spawn";

let passed = 0;
const test = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log(`✓ ${name}`);
};
const seeded = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const near = (a: number, b: number, eps: number, msg?: string) => assert.ok(Math.abs(a - b) <= eps, `${msg ?? ""} ${a} vs ${b}`);

/* ───────── codes ───────── */

test("room codes look like BAY-7KQ2 and use only the unambiguous alphabet", () => {
  const rand = seeded(7);
  const seen = new Set<string>();
  for (let i = 0; i < 2000; i++) {
    const c = makeCode(rand);
    assert.match(c, /^BAY-[23456789ABCDEFGHJKMNPQRSTVWXYZ]{4}$/);
    seen.add(c);
  }
  assert.ok(seen.size > 1990, `only ${seen.size} distinct codes in 2000`);
  for (const ch of "01ILOU") assert.ok(!CODE_ALPHABET.includes(ch), ch);
  // Even a random source that returns 1 stays in range
  assert.match(
    makeCode(() => 0.9999999),
    /^BAY-[A-Z0-9]{4}$/,
  );
});

test("codes typed or pasted any reasonable way normalise; anything else is refused", () => {
  for (const s of ["BAY-7KQ2", "bay-7kq2", "bay 7kq2", " BAY7KQ2 ", "7kq2", "7-K-Q-2", "https://x.dev/play?room=BAY-7KQ2", "/play?room=bay7kq2&x=1"]) assert.equal(normalizeCode(s), "BAY-7KQ2", s);
  for (const s of ["BAY-7KO2", "BAY-7KQ", "BAY-7KQ22", "", "BAY-", "<b>", "BAY-7KQ!", "x".repeat(400)]) assert.equal(normalizeCode(s), null, s);
  for (const s of [null, undefined, 42, {}, ["BAY-7KQ2"]]) assert.equal(normalizeCode(s), null);
});

test("the host's peer id is namespaced and lower case; links carry the code", () => {
  assert.equal(peerIdFor("BAY-7KQ2"), "njs-bay-7kq2");
  // PeerJS ids: alphanumeric at both ends, dashes allowed inside
  assert.match(peerIdFor(makeCode(seeded(3))), /^[a-z0-9][a-z0-9-]*[a-z0-9]$/);
  assert.equal(roomLink("https://neil.dev", "BAY-7KQ2"), "https://neil.dev/play?room=BAY-7KQ2");
  assert.equal(normalizeCode(roomLink("https://neil.dev", "BAY-7KQ2")), "BAY-7KQ2");
});

/* ───────── names and paints ───────── */

test("nicknames are trimmed, tidied, stripped of control characters and cut to 16", () => {
  assert.equal(sanitizeName("  Neil  "), "Neil");
  assert.equal(sanitizeName("Neil   Jacob\t\nS"), "Neil Jacob S");
  assert.equal(sanitizeName("Ne\u0000il​‮"), "Neil");
  assert.equal(sanitizeName("abcdefghijklmnopqrstuvwxyz"), "abcdefghijklmnop");
  assert.equal(Array.from(sanitizeName("🏎️🏎️🏎️🏎️🏎️🏎️🏎️🏎️🏎️🏎️") ?? "").length <= 16, true);
  assert.equal(sanitizeName("Mahal ko 💛"), "Mahal ko 💛");
  assert.equal(sanitizeName("Ñiño"), "Ñiño");
  // Markup survives as plain characters: it's only ever rendered as text
  assert.equal(sanitizeName("<img src=x>"), "<img src=x>");
  for (const bad of ["", "   ", "​​", null, 5, {}, ["Neil"]]) assert.equal(sanitizeName(bad), null);
});

test("the paint list matches the car's liveries", () => {
  assert.deepEqual([...PAINT_IDS].sort(), Object.keys(PAINTS).sort());
});

/* ───────── control messages ───────── */

test("a guest's hello is accepted only when every field checks out", () => {
  const hello = { t: "hello", v: 1, token: "abcdefgh12345678", name: "  Ana ", paint: "sky" };
  assert.deepEqual(parseGuest(hello), { t: "hello", v: 1, token: "abcdefgh12345678", name: "Ana", paint: "sky" });
  assert.equal(parseGuest({ ...hello, paint: "gold" })?.t === "hello" && (parseGuest({ ...hello, paint: "gold" }) as { paint: string }).paint, "ember");
  assert.equal(parseGuest({ ...hello, name: "   " }), null);
  assert.equal(parseGuest({ ...hello, token: "short" }), null);
  assert.equal(parseGuest({ ...hello, token: "has spaces in it!" }), null);
  assert.equal(parseGuest({ ...hello, v: "1" }), null);
  assert.equal(parseGuest({ ...hello, v: 1.5 }), null);
});

test("unknown, malformed and out-of-range guest messages are dropped", () => {
  for (const m of [
    null,
    1,
    "hello",
    [],
    { t: "admin" },
    { t: "ready" },
    { t: "ready", on: "yes" },
    { t: "paint", paint: "<b>" },
    { t: "quick", k: QUICK.length },
    { t: "quick", k: -1 },
    { t: "quick", k: 0.5 },
    { t: "ping", n: -1, c: 0 },
    { t: "ping", n: 1, c: Infinity },
    { t: "finish", sid: 0, total: 100 },
    { t: "finish", sid: 1, total: "fast" },
    { notT: "horn" },
  ])
    assert.equal(parseGuest(m), null, JSON.stringify(m));
  assert.deepEqual(parseGuest({ t: "horn", extra: "<script>" }), { t: "horn" });
  assert.deepEqual(parseGuest({ t: "quick", k: 3 }), { t: "quick", k: 3 });
});

test("numbers in guest messages are clamped", () => {
  assert.deepEqual(parseGuest({ t: "ping", n: 4, c: 123.5, rtt: 99999 }), { t: "ping", n: 4, c: 123.5, rtt: 9999 });
  assert.deepEqual(parseGuest({ t: "ping", n: 4, c: 1, rtt: "x" }), { t: "ping", n: 4, c: 1, rtt: null });
  const f = parseGuest({ t: "finish", sid: 2, total: 9e12, best: -5, laps: [61000.4, "x", -1, ...Array(20).fill(60000)] });
  assert.ok(f && f.t === "finish");
  assert.equal(f.total, 3_600_000);
  assert.equal(f.best, 0);
  assert.equal(f.laps.length, 9);
  assert.equal(f.laps[0], 61000);
});

test("host messages: the roster is checked player by player", () => {
  const p = (slot: number, extra = {}) => ({ slot, name: `P${slot}`, paint: "wine", ready: true, ping: 40, host: slot === 0, away: false, ...extra });
  const r = parseHost({ t: "roster", players: [p(2), p(0), p(2), { ...p(1), name: "\u0000" }], settings: { mode: "free", laps: 99 } });
  assert.ok(r && r.t === "roster");
  assert.deepEqual(
    r.players.map((x) => x.slot),
    [0, 2],
    "sorted, duplicates and nameless dropped",
  );
  const r1 = parseHost({ t: "roster", players: [p(7), p(-1), p(1.5), p(1)] });
  assert.ok(r1 && r1.t === "roster");
  assert.deepEqual(
    r1.players.map((x) => x.slot),
    [1],
    "slots out of range dropped",
  );
  assert.deepEqual(r.settings, { mode: "free", laps: 3 });
  assert.equal(parseHost({ t: "roster", players: [p(0), p(1), p(2), p(3), p(1)] }), null, "more than four players");
  const r2 = parseHost({ t: "roster", players: [p(3, { ping: 1e9, paint: "nope" })], settings: { mode: "race", laps: 5 } });
  assert.ok(r2 && r2.t === "roster");
  assert.equal(r2.players[0].ping, 9999);
  assert.equal(r2.players[0].paint, "ember");
  assert.equal(r2.settings.laps, 5);
});

test("host messages: the start, welcome, results and the rest", () => {
  const s = parseHost({ t: "start", session: { sid: 3, mode: "race", laps: 5, lightsAt: 1000, goAt: 999999, grid: [2, 0, 2, 9, 1] } });
  assert.ok(s && s.t === "start");
  assert.equal(s.session.goAt, 10000, "lights out no later than 9 s after the first light");
  assert.deepEqual(s.session.grid, [2, 0, 1]);
  const s2 = parseHost({ t: "start", session: { sid: 3, mode: "race", laps: 3, lightsAt: 1000, goAt: 1200, grid: [0] } });
  assert.ok(s2 && s2.t === "start" && s2.session.goAt === 6000, "and no sooner than 5 s");
  assert.equal(parseHost({ t: "start", session: { sid: 0, lightsAt: 1, goAt: 2 } }), null);
  const w = parseHost({
    t: "welcome",
    v: 1,
    you: 1,
    players: [{ slot: 0, name: "Neil", paint: "ember" }],
    settings: {},
    session: null,
    results: [
      { slot: 0, total: 200000, best: 60000, laps: [1, 2] },
      { slot: 8, total: 1 },
    ],
  });
  assert.ok(w && w.t === "welcome");
  assert.equal(w.you, 1);
  assert.equal(w.results.length, 1);
  assert.equal(parseHost({ t: "welcome", v: 1, you: 4, players: [] }), null);
  assert.deepEqual(parseHost({ t: "pong", n: 1, c: 2, h: 3 }), { t: "pong", n: 1, c: 2, h: 3 });
  assert.equal(parseHost({ t: "pong", n: 1, c: 2 }), null);
  assert.deepEqual(parseHost({ t: "reject", why: "full" }), { t: "reject", why: "full" });
  assert.equal(parseHost({ t: "reject", why: "because" }), null);
  assert.deepEqual(parseHost({ t: "quick", from: 2, k: 0 }), { t: "quick", from: 2, k: 0 });
  assert.equal(parseHost({ t: "quick", from: 4, k: 0 }), null);
  assert.equal(parseHost({ t: "result", sid: 1, result: { slot: 1, total: "x" } }), null);
  const res = parseHost({ t: "result", sid: 1, result: { slot: 1, total: 180000.7, best: null, laps: [60000, 60000, 60000] } });
  assert.ok(res && res.t === "result" && res.result.total === 180001 && res.result.best === null);
  assert.equal(parseHost({ t: "hello", v: 1 }), null, "a guest message isn't a host message");
});

test("control text: size limit and broken JSON", () => {
  assert.deepEqual(readText('{"t":"horn"}'), { t: "horn" });
  assert.equal(readText("{nope"), null);
  assert.equal(readText(42), null);
  assert.equal(readText(`{"t":"horn","pad":"${"x".repeat(MAX_TEXT)}"}`), null);
});

/* ───────── car state ───────── */

const sample: CarState = { slot: 2, seq: 65535, t: 123456.789, x: -812.25, z: 1033.5, heading: 2.5, speed: 71.23, steer: -0.5, lap: 3, dist: 12345.5, flags: FLAG.braking | FLAG.driving, sid: 7 };

test("state packets are 32 bytes and round-trip within rounding", () => {
  const buf = encodeState(sample);
  assert.equal(buf.byteLength, STATE_BYTES);
  const d = decodeState(buf);
  assert.ok(d);
  assert.equal(d.slot, 2);
  assert.equal(d.seq, 65535);
  assert.equal(d.t, sample.t);
  near(d.x, sample.x, 1e-3);
  near(d.z, sample.z, 1e-3);
  near(d.heading, 2.5, 1e-4);
  near(d.speed, 71.23, 0.01);
  near(d.steer, -0.5, 0.01);
  assert.equal(d.lap, 3);
  near(d.dist, 12345.5, 0.01);
  assert.equal(d.flags, FLAG.braking | FLAG.driving);
  assert.equal(d.sid, 7);
  // A view on a bigger buffer works too
  const big = new Uint8Array(40);
  big.set(new Uint8Array(buf), 4);
  assert.ok(decodeState(big.subarray(4, 36)));
});

test("state values are clamped on the way out and on the way in", () => {
  const d = decodeState(encodeState({ ...sample, x: 1e9, z: -1e9, speed: 500, steer: 9, lap: 300, heading: 7, dist: Infinity, flags: 0xff, seq: 70000, sid: 300 }));
  assert.ok(d);
  assert.equal(d.x, WORLD);
  assert.equal(d.z, -WORLD);
  assert.equal(d.speed, 120);
  near(d.steer, 1, 1e-9);
  assert.equal(d.lap, 99);
  near(d.heading, 7 - 2 * Math.PI, 1e-3);
  assert.equal(d.dist, 0);
  assert.equal(d.flags, 0x3f);
  assert.equal(d.seq, 70000 & 0xffff);
  assert.equal(d.sid, 300 & 0xff);
  const nan = decodeState(encodeState({ ...sample, x: NaN, t: NaN }));
  assert.ok(nan && nan.x === 0 && nan.t === 0);
});

test("anything that isn't a state packet is refused", () => {
  const good = encodeState(sample);
  const wrongKind = good.slice(0);
  new DataView(wrongKind).setUint8(0, 1);
  const badSlot = good.slice(0);
  new DataView(badSlot).setUint8(1, 4);
  const nanX = good.slice(0);
  new DataView(nanX).setFloat32(12, NaN, true);
  const infT = good.slice(0);
  new DataView(infT).setFloat64(4, Infinity, true);
  for (const b of [wrongKind, badSlot, nanX, infT, good.slice(0, 31), new ArrayBuffer(64), "S".repeat(32), null, {}, [1, 2, 3]]) assert.equal(decodeState(b), null);
  // A huge but finite position is pulled back onto the map
  const far = good.slice(0);
  new DataView(far).setFloat32(16, 3e38, true);
  assert.equal(decodeState(far)?.z, WORLD);
});

test("the host stamps the sender's slot on relayed packets without touching the original", () => {
  const buf = encodeState({ ...sample, slot: 0 });
  const out = stampSlot(buf, 3);
  assert.equal(decodeState(out)?.slot, 3);
  assert.equal(decodeState(buf)?.slot, 0);
});

test("sequence numbers compare across the wrap", () => {
  assert.ok(seqNewer(5, 3));
  assert.ok(!seqNewer(3, 5));
  assert.ok(seqNewer(2, 65530));
  assert.ok(!seqNewer(65530, 2));
  assert.ok(!seqNewer(9, 9));
});

/* ───────── clock, order, smoothing ───────── */

test("the clock offset comes from the quickest round trip", () => {
  const c = createClock();
  assert.equal(c.synced, false);
  // Host is 5000 ms ahead; one way takes 40 ms, so the pong lands 80 ms after the ping
  c.sample(1000, 6040, 1080);
  near(c.offset, 5000, 0.001);
  assert.equal(c.rtt, 80);
  // A slow, lopsided sample doesn't move it
  c.sample(2000, 7300, 2400);
  near(c.offset, 5000, 0.001);
  // A quicker one does
  c.sample(3000, 8011, 3020);
  near(c.offset, 5001, 0.001);
  // Nonsense is ignored
  c.sample(5000, 1, 4000);
  c.sample(0, 0, 1e9);
  near(c.offset, 5001, 0.001);
});

test("race order: finishers by time, then by distance", () => {
  assert.deepEqual(
    standings([
      { slot: 0, dist: 900, total: null },
      { slot: 1, dist: 5000, total: 200000 },
      { slot: 2, dist: 1200, total: null },
      { slot: 3, dist: 5000, total: 190000 },
    ]),
    [3, 1, 2, 0],
  );
  assert.deepEqual(
    standings([
      { slot: 1, dist: 10, total: null },
      { slot: 0, dist: 10, total: null },
    ]),
    [0, 1],
  );
});

test("remote cars interpolate between snapshots and stop guessing after a moment", () => {
  const b = createBuffer();
  const out: Pose = { x: 0, z: 0, heading: 0, speed: 0, steer: 0 };
  assert.equal(b.sample(0, out), false);
  // Heading 0 drives towards -z
  b.push({ t: 1000, x: 0, z: 0, heading: 0, speed: 30, steer: 0 });
  b.push({ t: 1066, x: 0, z: -2, heading: 0, speed: 30, steer: 0.2 });
  b.push({ t: 1033, x: 0, z: -1, heading: 0, speed: 30, steer: 0.1 }); // late, slotted in
  b.push({ t: 1033, x: 0, z: -9, heading: 0, speed: 30, steer: 0 }); // duplicate, dropped
  assert.equal(b.size, 3);
  b.sample(1016.5, out);
  near(out.z, -0.5, 1e-6);
  b.sample(1049.5, out);
  near(out.z, -1.5, 1e-6);
  // Past the newest: dead reckoning, capped
  b.sample(1066 + 100, out);
  near(out.z, -2 - 3, 1e-6);
  b.sample(1066 + 5000, out);
  near(out.z, -2 - 30 * (EXTRAPOLATE_MS / 1000), 1e-6);
  // Heading wraps the short way round
  const h = createBuffer();
  h.push({ t: 0, x: 0, z: 0, heading: 3.1, speed: 0, steer: 0 });
  h.push({ t: 100, x: 0, z: 0, heading: -3.1, speed: 0, steer: 0 });
  h.sample(50, out);
  assert.ok(Math.abs(Math.abs(out.heading) - Math.PI) < 0.01, `heading ${out.heading}`);
  // A respawn jumps instead of sliding across the map
  const j = createBuffer();
  j.push({ t: 0, x: 0, z: 0, heading: 0, speed: 0, steer: 0 });
  j.push({ t: 66, x: 500, z: 0, heading: 0, speed: 0, steer: 0 });
  j.sample(40, out);
  assert.equal(out.x, 500);
});

/* ───────── grid and race distance ───────── */

test("grid slots are on the track, behind the line, a car apart", () => {
  const slots = [0, 1, 2, 3].map(gridSlot);
  for (const [k, p] of slots.entries()) {
    const h = locate(p.x, p.z);
    assert.ok(Math.abs(h.d) < HALF, `slot ${k} is ${h.d} m off centre`);
    assert.ok(h.s > LENGTH - 60, `slot ${k} sits ${LENGTH - h.s} m behind the line`);
  }
  for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) assert.ok(Math.hypot(slots[a].x - slots[b].x, slots[a].z - slots[b].z) > 5, `${a}/${b}`);
  // Pole is the single-player grid spot
  const i = samples.length - 3;
  near(slots[0].x, samples[i].x + samples[i].tz * 2.6, 1e-9);
  const pits = [0, 1, 2, 3].map(pitSlot);
  assert.equal(new Set(pits.map((p) => p.x)).size, 4);
});

test("race distance starts below zero on the grid and counts across laps", () => {
  const p = createProgress();
  const g = locate(gridSlot(3).x, gridSlot(3).z);
  p.reset(g.s);
  assert.ok(p.dist < 0 && p.dist > -60, `${p.dist}`);
  // Drive forwards in 20 m steps for two and a bit laps
  let s = g.s;
  for (let k = 0; k < Math.ceil((LENGTH * 2.2) / 20); k++) {
    s = (s + 20) % LENGTH;
    p.update(s);
  }
  near(p.dist, Math.ceil((LENGTH * 2.2) / 20) * 20 - (LENGTH - g.s), 1e-6);
  // Backwards takes it down again
  const before = p.dist;
  p.update((s - 50 + LENGTH) % LENGTH);
  near(p.dist, before - 50, 1e-6);
});

console.log(`\n${passed} passed`);
