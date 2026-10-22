import type { PaintId } from "../car";

// The multiplayer wire format. Two kinds of traffic between the host and each
// guest:
//   · control: small JSON messages on a reliable, ordered channel (joining,
//     the lobby, the start, quick messages, the horn, results)
//   · state: one 32-byte binary packet per car, ~15 times a second, on an
//     unreliable channel; late packets are dropped, not resent
// Everything that arrives is treated as hostile until checked here: unknown
// types are dropped, numbers are clamped into range, strings are cut to length
// and stripped of control characters. Nicknames are only ever rendered as
// text, never as HTML.

export const PROTOCOL = 1;
export const MAX_PLAYERS = 4;
export const NAME_MAX = 16;
/** Codes avoid 0/O, 1/I/L and U, so they survive being read out over a call. */
export const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
export const CODE_LEN = 4;
export const CODE_PREFIX = "BAY-";
/** Namespaces the host's id on the shared signalling server. */
export const PEER_PREFIX = "njs-bay-";
export const SEND_HZ = 15;
export const MAX_TEXT = 4096;
/** Longest race time we accept (an hour), in ms. */
const MAX_MS = 3_600_000;

export const PAINT_IDS = ["ember", "midnight", "wine", "paper", "sky", "carbon"] as const satisfies readonly PaintId[];
export const QUICK = ["Wait for me", "Nice!", "One more?", "GG", "Ready?", "Oops, sorry"] as const;
export type GameKind = "race" | "free";
export const LAP_CHOICES = [3, 5] as const;

/* ───────── room codes ───────── */

/** A fresh code like "BAY-7KQ2". */
export function makeCode(rand: () => number = Math.random): string {
  let s = "";
  for (let i = 0; i < CODE_LEN; i++) s += CODE_ALPHABET[Math.floor(rand() * CODE_ALPHABET.length) % CODE_ALPHABET.length];
  return CODE_PREFIX + s;
}

/** Whatever someone typed or pasted ("bay 7kq2", "7KQ2", a whole link) as a code, or null. */
export function normalizeCode(input: unknown): string | null {
  if (typeof input !== "string" || input.length > 300) return null;
  let s = input.trim();
  // A pasted link: take its ?room=
  const m = /[?&]room=([^&#\s]+)/i.exec(s);
  if (m) s = decodeURIComponent(m[1]);
  s = s.toUpperCase().replace(/[\s\-_.]/g, "");
  if (s.startsWith("BAY")) s = s.slice(3);
  if (s.length !== CODE_LEN) return null;
  for (const ch of s) if (!CODE_ALPHABET.includes(ch)) return null;
  return CODE_PREFIX + s;
}

/** The host's id on the signalling server for a code: "BAY-7KQ2" → "njs-bay-7kq2". */
export const peerIdFor = (code: string) => PEER_PREFIX + code.slice(CODE_PREFIX.length).toLowerCase();

export const roomLink = (origin: string, code: string) => `${origin}/play?room=${encodeURIComponent(code)}`;

/* ───────── names, paints, tokens ───────── */

// Control characters, zero-width and bidi formatting, private use, unpaired surrogates, line/paragraph separators
const UNSAFE = /[\p{Cc}\p{Cf}\p{Co}\p{Cs}\p{Zl}\p{Zp}]/gu;

/** A nickname as typed: trimmed, one space between words, at most 16 characters; null if nothing is left. */
export function sanitizeName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  let s = raw.slice(0, 200).normalize("NFC").replace(/\s+/g, " ").replace(UNSAFE, "").replace(/ {2,}/g, " ").trim();
  s = Array.from(s).slice(0, NAME_MAX).join("").trim();
  return s.length ? s : null;
}

export const isPaint = (x: unknown): x is PaintId => typeof x === "string" && (PAINT_IDS as readonly string[]).includes(x);

/** A per-tab id a guest presents when it rejoins, so the host gives it back its seat. */
export function makeToken(rand: () => number = Math.random) {
  let s = "";
  for (let i = 0; i < 16; i++) s += "abcdefghijkmnpqrstuvwxyz23456789"[Math.floor(rand() * 32) % 32];
  return s;
}
const isToken = (x: unknown): x is string => typeof x === "string" && /^[a-z0-9]{8,32}$/.test(x);

/* ───────── control messages ───────── */

export interface Settings {
  mode: GameKind;
  laps: number;
}
export interface PlayerInfo {
  slot: number;
  name: string;
  paint: PaintId;
  ready: boolean;
  /** Round trip to the host in ms; null for the host itself or before the first measurement. */
  ping: number | null;
  host: boolean;
  /** Connection dropped; the seat is kept for a few seconds in case they come back. */
  away: boolean;
}
export interface SessionInfo {
  sid: number;
  mode: GameKind;
  laps: number;
  /** On the host's clock (ms): first red light, and lights out. */
  lightsAt: number;
  goAt: number;
  /** Slots in grid order: pole first. */
  grid: number[];
}
export interface ResultInfo {
  slot: number;
  /** Race time in ms, start lights to the flag, with any penalty. */
  total: number;
  best: number | null;
  laps: number[];
}

export type GuestMsg =
  | { t: "hello"; v: number; token: string; name: string; paint: PaintId }
  | { t: "ready"; on: boolean }
  | { t: "paint"; paint: PaintId }
  | { t: "ping"; n: number; c: number; rtt: number | null }
  | { t: "quick"; k: number }
  | { t: "horn" }
  | { t: "finish"; sid: number; total: number; best: number | null; laps: number[] }
  | { t: "bye" };

export type HostMsg =
  | { t: "welcome"; v: number; you: number; players: PlayerInfo[]; settings: Settings; session: SessionInfo | null; results: ResultInfo[] }
  | { t: "reject"; why: "full" | "version" | "closed" }
  | { t: "roster"; players: PlayerInfo[]; settings: Settings }
  | { t: "pong"; n: number; c: number; h: number }
  | { t: "start"; session: SessionInfo }
  | { t: "quick"; from: number; k: number }
  | { t: "horn"; from: number }
  | { t: "result"; sid: number; result: ResultInfo }
  | { t: "lobby" }
  | { t: "end" };

type Obj = Record<string, unknown>;
const isObj = (x: unknown): x is Obj => typeof x === "object" && x !== null && !Array.isArray(x);
const fin = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
/** A finite number clamped into [lo, hi], or null. */
const num = (x: unknown, lo: number, hi: number) => (fin(x) ? clamp(x, lo, hi) : null);
/** An integer in [lo, hi] (out of range is rejected, not clamped: these are ids). */
const int = (x: unknown, lo: number, hi: number) => (fin(x) && Number.isInteger(x) && x >= lo && x <= hi ? x : null);
const ms = (x: unknown) => (fin(x) ? Math.round(clamp(x, 0, MAX_MS)) : null);
const msList = (x: unknown) =>
  Array.isArray(x)
    ? x
        .slice(0, 10)
        .map(ms)
        .filter((n): n is number => n !== null)
    : [];
const laps = (x: unknown) => ((LAP_CHOICES as readonly number[]).includes(x as number) ? (x as number) : 3);

function settingsOf(x: unknown): Settings {
  const o = isObj(x) ? x : {};
  return { mode: o.mode === "free" ? "free" : "race", laps: laps(o.laps) };
}

function playerOf(x: unknown): PlayerInfo | null {
  if (!isObj(x)) return null;
  const slot = int(x.slot, 0, MAX_PLAYERS - 1);
  const name = sanitizeName(x.name);
  if (slot === null || !name) return null;
  return {
    slot,
    name,
    paint: isPaint(x.paint) ? x.paint : "ember",
    ready: x.ready === true,
    ping: x.ping == null ? null : (num(x.ping, 0, 9999) ?? null),
    host: x.host === true,
    away: x.away === true,
  };
}

function playersOf(x: unknown): PlayerInfo[] | null {
  if (!Array.isArray(x) || x.length > MAX_PLAYERS) return null;
  const out: PlayerInfo[] = [];
  for (const p of x) {
    const v = playerOf(p);
    if (v && !out.some((o) => o.slot === v.slot)) out.push(v);
  }
  return out.sort((a, b) => a.slot - b.slot);
}

function sessionOf(x: unknown): SessionInfo | null {
  if (!isObj(x)) return null;
  const sid = int(x.sid, 1, 1e9);
  const lightsAt = num(x.lightsAt, -1e12, 1e12);
  const goAt = num(x.goAt, -1e12, 1e12);
  if (sid === null || lightsAt === null || goAt === null) return null;
  const grid = Array.isArray(x.grid) ? [...new Set(x.grid.slice(0, 16).filter((s): s is number => int(s, 0, MAX_PLAYERS - 1) !== null))].slice(0, MAX_PLAYERS) : [];
  return {
    sid,
    mode: x.mode === "free" ? "free" : "race",
    laps: laps(x.laps),
    lightsAt,
    // Lights out between 5 and 9 seconds after the first light, whatever was sent
    goAt: clamp(goAt, lightsAt + 5000, lightsAt + 9000),
    grid,
  };
}

function resultOf(x: unknown, slot: number): ResultInfo | null {
  if (!isObj(x)) return null;
  const total = ms(x.total);
  if (total === null) return null;
  return { slot, total, best: x.best == null ? null : ms(x.best), laps: msList(x.laps) };
}

/** Text off the control channel, as JSON, if it's small enough to bother with. */
export function readText(raw: unknown): unknown {
  if (typeof raw !== "string" || raw.length > MAX_TEXT) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** A message the host received from a guest, checked; null to drop it. */
export function parseGuest(raw: unknown): GuestMsg | null {
  const m = isObj(raw) ? raw : null;
  if (!m || typeof m.t !== "string") return null;
  switch (m.t) {
    case "hello": {
      const name = sanitizeName(m.name);
      const v = int(m.v, 0, 1000);
      if (!name || v === null || !isToken(m.token)) return null;
      return { t: "hello", v, token: m.token, name, paint: isPaint(m.paint) ? m.paint : "ember" };
    }
    case "ready":
      return typeof m.on === "boolean" ? { t: "ready", on: m.on } : null;
    case "paint":
      return isPaint(m.paint) ? { t: "paint", paint: m.paint } : null;
    case "ping": {
      const n = int(m.n, 0, 1e9);
      const c = num(m.c, -1e12, 1e12);
      if (n === null || c === null) return null;
      return { t: "ping", n, c, rtt: m.rtt == null ? null : num(m.rtt, 0, 9999) };
    }
    case "quick": {
      const k = int(m.k, 0, QUICK.length - 1);
      return k === null ? null : { t: "quick", k };
    }
    case "horn":
      return { t: "horn" };
    case "finish": {
      const sid = int(m.sid, 1, 1e9);
      const total = ms(m.total);
      if (sid === null || total === null) return null;
      return { t: "finish", sid, total, best: m.best == null ? null : ms(m.best), laps: msList(m.laps) };
    }
    case "bye":
      return { t: "bye" };
    default:
      return null;
  }
}

/** A message a guest received from the host, checked; null to drop it. */
export function parseHost(raw: unknown): HostMsg | null {
  const m = isObj(raw) ? raw : null;
  if (!m || typeof m.t !== "string") return null;
  switch (m.t) {
    case "welcome": {
      const v = int(m.v, 0, 1000);
      const you = int(m.you, 0, MAX_PLAYERS - 1);
      const players = playersOf(m.players);
      if (v === null || you === null || !players) return null;
      const results = Array.isArray(m.results)
        ? m.results
            .slice(0, MAX_PLAYERS)
            .map((r) => (isObj(r) ? resultOf(r, int(r.slot, 0, MAX_PLAYERS - 1) ?? -1) : null))
            .filter((r): r is ResultInfo => !!r && r.slot >= 0)
        : [];
      return { t: "welcome", v, you, players, settings: settingsOf(m.settings), session: m.session == null ? null : sessionOf(m.session), results };
    }
    case "reject":
      return m.why === "full" || m.why === "version" || m.why === "closed" ? { t: "reject", why: m.why } : null;
    case "roster": {
      const players = playersOf(m.players);
      return players ? { t: "roster", players, settings: settingsOf(m.settings) } : null;
    }
    case "pong": {
      const n = int(m.n, 0, 1e9);
      const c = num(m.c, -1e12, 1e12);
      const h = num(m.h, -1e12, 1e12);
      return n === null || c === null || h === null ? null : { t: "pong", n, c, h };
    }
    case "start": {
      const session = sessionOf(m.session);
      return session ? { t: "start", session } : null;
    }
    case "quick": {
      const from = int(m.from, 0, MAX_PLAYERS - 1);
      const k = int(m.k, 0, QUICK.length - 1);
      return from === null || k === null ? null : { t: "quick", from, k };
    }
    case "horn": {
      const from = int(m.from, 0, MAX_PLAYERS - 1);
      return from === null ? null : { t: "horn", from };
    }
    case "result": {
      const sid = int(m.sid, 1, 1e9);
      const r = isObj(m.result) ? m.result : null;
      const slot = r ? int(r.slot, 0, MAX_PLAYERS - 1) : null;
      const result = slot === null ? null : resultOf(r, slot);
      return sid === null || !result ? null : { t: "result", sid, result };
    }
    case "lobby":
      return { t: "lobby" };
    case "end":
      return { t: "end" };
    default:
      return null;
  }
}

/* ───────── car state: 32 bytes, little-endian ───────── */

export const STATE_BYTES = 32;
const STATE_KIND = 0x53; // "S"
/** Anything outside this square is not on the map. */
export const WORLD = 4000;

export const FLAG = { braking: 1, drs: 2, pit: 4, finished: 8, held: 16, driving: 32 } as const;

export interface CarState {
  slot: number;
  seq: number;
  /** Sender's estimate of the host's clock (ms) when this was taken. */
  t: number;
  x: number;
  z: number;
  heading: number;
  /** m/s along the car's nose (negative in reverse). */
  speed: number;
  /** -1 … 1 */
  steer: number;
  /** The lap being driven (1-based once the race is on). */
  lap: number;
  /** Race distance in metres from the start line (negative on the grid). */
  dist: number;
  flags: number;
  /** Low byte of the session id, so a late packet from the last race is ignored. */
  sid: number;
}

const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export function encodeState(s: CarState): ArrayBuffer {
  const buf = new ArrayBuffer(STATE_BYTES);
  const d = new DataView(buf);
  const f = (v: number, lo: number, hi: number) => (Number.isFinite(v) ? clamp(v, lo, hi) : 0);
  d.setUint8(0, STATE_KIND);
  d.setUint8(1, clamp(s.slot | 0, 0, MAX_PLAYERS - 1));
  d.setUint16(2, s.seq & 0xffff, true);
  d.setFloat64(4, f(s.t, -1e12, 1e12), true);
  d.setFloat32(12, f(s.x, -WORLD, WORLD), true);
  d.setFloat32(16, f(s.z, -WORLD, WORLD), true);
  d.setInt16(20, Math.round(wrapAngle(f(s.heading, -1e6, 1e6)) * 10000), true);
  d.setInt16(22, Math.round(f(s.speed, -60, 120) * 100), true);
  d.setInt8(24, Math.round(f(s.steer, -1, 1) * 127));
  d.setUint8(25, Math.round(f(s.lap, 0, 99)));
  d.setFloat32(26, f(s.dist, -1e6, 1e6), true);
  d.setUint8(30, s.flags & 0x3f);
  d.setUint8(31, s.sid & 0xff);
  return buf;
}

/** A state packet, checked and clamped; null if it isn't one. */
export function decodeState(raw: unknown): CarState | null {
  let d: DataView;
  if (raw instanceof ArrayBuffer) d = new DataView(raw);
  else if (ArrayBuffer.isView(raw)) d = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  else return null;
  if (d.byteLength !== STATE_BYTES || d.getUint8(0) !== STATE_KIND) return null;
  const slot = d.getUint8(1);
  const t = d.getFloat64(4, true);
  const x = d.getFloat32(12, true);
  const z = d.getFloat32(16, true);
  const dist = d.getFloat32(26, true);
  if (slot >= MAX_PLAYERS || !fin(t) || !fin(x) || !fin(z) || !fin(dist)) return null;
  return {
    slot,
    seq: d.getUint16(2, true),
    t,
    x: clamp(x, -WORLD, WORLD),
    z: clamp(z, -WORLD, WORLD),
    heading: clamp(d.getInt16(20, true) / 10000, -Math.PI, Math.PI),
    speed: clamp(d.getInt16(22, true) / 100, -60, 120),
    steer: clamp(d.getInt8(24) / 127, -1, 1),
    lap: Math.min(99, d.getUint8(25)),
    dist: clamp(dist, -1e6, 1e6),
    flags: d.getUint8(30) & 0x3f,
    sid: d.getUint8(31),
  };
}

/** Rewrites the slot byte of a packet the host is relaying, so a guest can only ever speak for its own car. */
export function stampSlot(buf: ArrayBuffer, slot: number): ArrayBuffer {
  const copy = buf.slice(0);
  new DataView(copy).setUint8(1, slot);
  return copy;
}

/** Newer of two 16-bit sequence numbers, allowing for wrap-around. */
export const seqNewer = (a: number, b: number) => ((a - b + 0x10000) & 0xffff) < 0x8000 && a !== b;

/* ───────── clock and standings ───────── */

/**
 * Estimates the host's clock from ping/pong pairs: offset = host − local,
 * taken from the sample with the shortest round trip among the recent ones.
 */
export function createClock(keep = 8) {
  const samples: { rtt: number; offset: number }[] = [];
  let offset = 0;
  let rtt: number | null = null;
  return {
    /** `c` when the ping left, `h` the host's clock when it answered, `now` when the pong arrived. */
    sample(c: number, h: number, now: number) {
      const r = now - c;
      if (!(r >= 0) || r > 10000) return;
      samples.push({ rtt: r, offset: h + r / 2 - now });
      if (samples.length > keep) samples.shift();
      const best = samples.reduce((a, b) => (b.rtt < a.rtt ? b : a));
      offset = best.offset;
      rtt = Math.round(samples.slice(-3).reduce((a, b) => a + b.rtt, 0) / Math.min(3, samples.length));
    },
    get offset() {
      return offset;
    },
    get rtt() {
      return rtt;
    },
    get synced() {
      return samples.length > 0;
    },
  };
}

export interface Standing {
  slot: number;
  dist: number;
  /** Race time once finished. */
  total: number | null;
}
/** Race order: finishers by time, then everyone else by distance covered. */
export function standings(list: Standing[]): number[] {
  return list
    .slice()
    .sort((a, b) => {
      if (a.total != null && b.total != null) return a.total - b.total || a.slot - b.slot;
      if (a.total != null) return -1;
      if (b.total != null) return 1;
      return b.dist - a.dist || a.slot - b.slot;
    })
    .map((s) => s.slot);
}

/** Ping as a word for the lobby. */
export const quality = (ping: number | null): "good" | "fair" | "poor" | "unknown" => (ping == null ? "unknown" : ping < 150 ? "good" : ping < 300 ? "fair" : "poor");
