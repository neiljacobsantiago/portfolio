import type { DataConnection, Peer } from "peerjs";
import type { PaintId } from "../car";
import { iceServers, peerServer } from "./config";
import {
  type CarState,
  createClock,
  decodeState,
  encodeState,
  type GuestMsg,
  type HostMsg,
  makeCode,
  makeToken,
  MAX_PLAYERS,
  parseGuest,
  parseHost,
  peerIdFor,
  type PlayerInfo,
  PROTOCOL,
  QUICK,
  readText,
  type ResultInfo,
  SEND_HZ,
  type SessionInfo,
  type Settings,
  seqNewer,
  stampSlot,
  standings,
} from "./protocol";

// A room: one host, up to three guests, in a star. The host's browser opens a
// peer on the signalling server under an id made from the room code; guests
// connect to it, and the host relays everything between them. Each player
// simulates their own car; the room only carries who's here, the start, and
// where everyone's car is.

export type Status = "idle" | "opening" | "joining" | "lobby" | "playing" | "reconnecting" | "error";

export interface RoomError {
  kind: "server" | "no-room" | "full" | "version" | "timeout" | "lost" | "host-left" | "unsupported";
  title: string;
  detail: string;
  tips?: string[];
}

export interface RoomState {
  status: Status;
  role: "host" | "guest" | null;
  code: string | null;
  /** Your seat (0 is the host), -1 before you have one. */
  me: number;
  players: PlayerInfo[];
  settings: Settings;
  session: SessionInfo | null;
  results: ResultInfo[];
  error: RoomError | null;
  /** True when the site's TURN relay is available for this session. */
  relay: boolean;
  /** What's happening while connecting, in plain words. */
  step: string | null;
}

/** Your own car, for the network. */
export interface SelfState {
  x: number;
  z: number;
  heading: number;
  speed: number;
  steer: number;
  lap: number;
  dist: number;
  flags: number;
}

export interface RoomEvents {
  change: (s: RoomState) => void;
  toast: (text: string, tone?: "good" | "bad") => void;
  /** A session starts: lights times are on this browser's clock (performance.now()). */
  start: (session: SessionInfo, local: { lightsAt: number; goAt: number }) => void;
  /** Back to the lobby (or the room closed): stop driving. */
  lobby: () => void;
  state: (s: CarState) => void;
  horn: (slot: number) => void;
}

const SERVER_TIMEOUT = 12_000;
const CONNECT_TIMEOUT = 16_000;
const WELCOME_TIMEOUT = 8_000;
/** No word from the other side for this long and we assume the link is gone. */
const SILENCE = 10_000;
/** How long a dropped guest keeps their seat. */
const AWAY_GRACE = 30_000;
const STATE_CHANNEL_ID = 9;

const NAT_TIPS = [
  "Try again once: the first attempt sometimes loses the race against a slow network.",
  "Switch one of you to a different network, for example Wi-Fi instead of mobile data, or a phone hotspot.",
  "If it never works between your two networks, the site owner can switch on a relay server, which gets through strict networks.",
];

interface Link {
  conn: DataConnection;
  chan: RTCDataChannel | null;
}

interface Guest extends Link {
  slot: number;
  token: string;
  name: string;
  paint: PaintId;
  ready: boolean;
  ping: number | null;
  seen: number;
  away: boolean;
  awaySince: number;
  lastSeq: number;
  lastSocial: number;
  lastHorn: number;
}

const now = () => performance.now();

/** Opens the unreliable, unordered side channel for car state on a PeerJS connection. */
function stateChannel(conn: DataConnection, onData: (data: unknown) => void): RTCDataChannel | null {
  try {
    const ch = conn.peerConnection.createDataChannel("state", { negotiated: true, id: STATE_CHANNEL_ID, ordered: false, maxRetransmits: 0 });
    ch.binaryType = "arraybuffer";
    ch.onmessage = (e) => onData(e.data);
    return ch;
  } catch {
    return null;
  }
}

export function createRoom(events: RoomEvents, opts: { debug?: boolean } = {}) {
  const state: RoomState = { status: "idle", role: null, code: null, me: -1, players: [], settings: { mode: "race", laps: 3 }, session: null, results: [], error: null, relay: false, step: null };
  let peer: Peer | null = null;
  let maxPlayers = MAX_PLAYERS;
  let profile = { name: "", paint: "ember" as PaintId };
  let self: (() => SelfState | null) | null = null;
  let seq = 0;
  let timers: ReturnType<typeof setInterval>[] = [];
  let pending: ReturnType<typeof setTimeout>[] = [];
  let lastTick = now();
  let sidCounter = 0;
  let disposed = false;
  /** Our own result in the current session, once we've finished. */
  let finished = false;
  /** The order of the last race, for the next grid (last place gets pole). */
  let lastOrder: number[] = [];

  // Host
  const guests = new Map<string, Guest>();
  let rosterAt = 0;
  // Guest
  let link: Link | null = null;
  const clock = createClock();
  const token = makeToken();
  let hostSeen = 0;
  let pingN = 0;
  let pingAt = 0;
  let reconnectTried = false;
  let hostCode = "";
  const remoteSeq = new Map<number, number>();

  const emit = () => events.change({ ...state, players: state.players.map((p) => ({ ...p })), results: state.results.slice() });
  const set = (patch: Partial<RoomState>) => {
    Object.assign(state, patch);
    emit();
  };
  const later = (ms: number, fn: () => void) => {
    const t = setTimeout(() => {
      pending = pending.filter((x) => x !== t);
      if (!disposed) fn();
    }, ms);
    pending.push(t);
    return t;
  };
  const cancel = (t: ReturnType<typeof setTimeout> | null) => {
    if (t) clearTimeout(t);
    pending = pending.filter((x) => x !== t);
  };
  const log = (...a: unknown[]) => {
    if (opts.debug) console.info("[bay-net]", ...a);
  };

  const fail = (error: RoomError) => {
    teardown();
    set({ status: "error", error, step: null });
    events.lobby();
  };

  async function newPeer(id?: string): Promise<Peer> {
    if (typeof RTCPeerConnection === "undefined") throw Object.assign(new Error("no webrtc"), { type: "browser-incompatible" });
    const [{ Peer: PeerCtor }, ice] = await Promise.all([import("peerjs"), iceServers()]);
    state.relay = ice.relay;
    const options = { ...peerServer(), debug: opts.debug ? 2 : 0, config: { iceServers: ice.servers } };
    return id ? new PeerCtor(id, options) : new PeerCtor(options);
  }

  /** Waits for a peer to register with the signalling server. */
  const opened = (p: Peer) =>
    new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(Object.assign(new Error("timeout"), { type: "server-timeout" })), SERVER_TIMEOUT);
      p.once("open", () => {
        clearTimeout(t);
        resolve();
      });
      p.once("error", (e) => {
        clearTimeout(t);
        reject(e);
      });
    });

  const serverError = (e: unknown): RoomError => {
    const type = (e as { type?: string })?.type;
    if (type === "browser-incompatible")
      return { kind: "unsupported", title: "This browser can't do peer-to-peer", detail: "Multiplayer needs WebRTC, which this browser has turned off or doesn't support. A recent Chrome, Safari, Firefox or Edge will work." };
    return {
      kind: "server",
      title: "Couldn't reach the matchmaking server",
      detail: "Players find each other through a small public server (PeerJS) before connecting directly. It didn't answer just now.",
      tips: ["Check that you're online, then try again.", "Some school, office or public Wi-Fi blocks it; mobile data usually works."],
    };
  };

  /* ───────── roster ───────── */

  const hostPlayers = (): PlayerInfo[] => {
    const list: PlayerInfo[] = [{ slot: 0, name: profile.name, paint: profile.paint, ready: true, ping: null, host: true, away: false }];
    for (const g of guests.values()) list.push({ slot: g.slot, name: g.name, paint: g.paint, ready: g.ready, ping: g.ping, host: false, away: g.away });
    return list.sort((a, b) => a.slot - b.slot);
  };

  /** Toasts for who came and went, from the difference between two rosters. */
  const announce = (before: PlayerInfo[], after: PlayerInfo[]) => {
    for (const p of after) {
      if (p.slot === state.me) continue;
      const was = before.find((b) => b.slot === p.slot);
      if (!was) events.toast(`${p.name} joined`, "good");
      else if (!was.away && p.away) events.toast(`${p.name}'s connection dropped`, "bad");
      else if (was.away && !p.away) events.toast(`${p.name} is back`, "good");
    }
    for (const b of before) if (b.slot !== state.me && !after.some((p) => p.slot === b.slot)) events.toast(`${b.name} left`);
  };

  const setPlayers = (players: PlayerInfo[]) => {
    const before = state.players;
    state.players = players;
    if (before.length || state.role === "host") announce(before, players);
  };

  /* ───────── sending ───────── */

  const sendText = (l: Link | null, msg: HostMsg | GuestMsg) => {
    if (!l?.conn.open) return;
    try {
      void l.conn.send(JSON.stringify(msg));
    } catch {}
  };
  const sendBinary = (l: Link, buf: ArrayBuffer) => {
    try {
      if (l.chan?.readyState === "open") l.chan.send(buf);
      else if (l.conn.open) void l.conn.send(buf);
    } catch {}
  };
  const broadcast = (msg: HostMsg, except?: Guest) => {
    for (const g of guests.values()) if (g !== except && !g.away) sendText(g, msg);
  };
  const pushRoster = () => {
    rosterAt = now();
    setPlayers(hostPlayers());
    broadcast({ t: "roster", players: state.players, settings: state.settings });
    emit();
  };

  /** Our car, ~15 times a second, while a session is on. */
  const sendState = () => {
    if (state.status !== "playing" || !state.session || !self) return;
    const s = self();
    if (!s) return;
    const buf = encodeState({ ...s, slot: state.me, seq: (seq = (seq + 1) & 0xffff), t: hostNow(), sid: state.session.sid });
    if (state.role === "host") {
      for (const g of guests.values()) if (!g.away) sendBinary(g, buf);
    } else if (link) sendBinary(link, buf);
  };

  /** The host's clock, estimated. */
  const hostNow = () => (state.role === "guest" ? now() + clock.offset : now());

  /* ───────── incoming car state ───────── */

  const onState = (data: unknown, from: Guest | null) => {
    if (!state.session) return;
    const s = decodeState(data);
    if (!s || s.sid !== (state.session.sid & 0xff)) return;
    if (from) {
      // Host: the packet speaks for its sender's car only; pass it on
      s.slot = from.slot;
      if (!seqNewer(s.seq, from.lastSeq) && from.lastSeq !== -1) return;
      from.lastSeq = s.seq;
      from.seen = now();
      const buf = stampSlot(data instanceof ArrayBuffer ? data : encodeState(s), from.slot);
      for (const g of guests.values()) if (g !== from && !g.away) sendBinary(g, buf);
    } else {
      if (s.slot === state.me) return;
      const last = remoteSeq.get(s.slot);
      if (last !== undefined && !seqNewer(s.seq, last)) return;
      remoteSeq.set(s.slot, s.seq);
    }
    events.state(s);
  };

  /* ───────── host ───────── */

  async function create(name: string, paint: PaintId) {
    reset();
    profile = { name, paint };
    set({ status: "opening", role: "host", me: 0, step: "Opening a room…", error: null });
    for (let attempt = 0; attempt < 4; attempt++) {
      const code = makeCode();
      let p: Peer;
      try {
        p = await newPeer(peerIdFor(code));
      } catch (e) {
        return fail(serverError(e));
      }
      if (disposed) return p.destroy();
      peer = p;
      try {
        await opened(p);
      } catch (e) {
        p.destroy();
        peer = null;
        if ((e as { type?: string }).type === "unavailable-id") continue;
        return fail(serverError(e));
      }
      log("hosting", code);
      p.on("connection", (conn) => accept(conn));
      p.on("disconnected", () => {
        // Lost the signalling server: racing goes on, but new players can't join until it's back
        later(2000, () => !p.destroyed && p.disconnected && p.reconnect());
      });
      p.on("error", (e) => log("peer error", e.type));
      state.players = [];
      set({ status: "lobby", code, step: null });
      pushRoster();
      startTimers();
      return;
    }
    fail({ kind: "server", title: "Couldn't open a room", detail: "Every code we tried was taken, which is very unlikely. Try again in a moment." });
  }

  function accept(conn: DataConnection) {
    let guest: Guest | null = null;
    // Flood guard: a well-behaved guest sends about 20 messages a second
    const flood = { since: now(), n: 0 };
    const tooMuch = () => {
      const t = now();
      if (t - flood.since > 1000) Object.assign(flood, { since: t, n: 0 });
      return ++flood.n > 80;
    };
    const hello = later(CONNECT_TIMEOUT + WELCOME_TIMEOUT, () => {
      if (!guest) conn.close();
    });
    conn.on("open", () => {
      const l: Link = { conn, chan: null };
      l.chan = stateChannel(conn, (d) => guest && !tooMuch() && onState(d, guest));
      Object.assign(conn, { _bayLink: l });
    });
    conn.on("data", (data) => {
      if (tooMuch()) return;
      if (typeof data !== "string") return guest && onState(data, guest);
      const msg = parseGuest(readText(data));
      if (!msg) return;
      if (!guest) {
        if (msg.t !== "hello") return;
        cancel(hello);
        guest = seat(conn, msg);
        return;
      }
      guest.seen = now();
      onGuest(guest, msg);
    });
    conn.on("close", () => {
      cancel(hello);
      if (guest && guest.conn === conn) drop(guest);
    });
    conn.on("error", (e) => log("conn error", e.type));
  }

  /** A guest said hello: give them a seat, their old one if they're coming back. */
  function seat(conn: DataConnection, msg: Extract<GuestMsg, { t: "hello" }>): Guest | null {
    const l = (conn as unknown as { _bayLink?: Link })._bayLink ?? { conn, chan: null };
    const reply = (m: HostMsg) => sendText(l, m);
    if (msg.v !== PROTOCOL) {
      reply({ t: "reject", why: "version" });
      later(300, () => conn.close());
      return null;
    }
    let g = [...guests.values()].find((x) => x.token === msg.token) ?? null;
    if (g) {
      // Rejoining: swap the old connection for the new one
      guests.delete(g.conn.peer);
      if (g.conn !== conn) g.conn.close();
      Object.assign(g, { conn, chan: l.chan, away: false, seen: now(), lastSeq: -1, name: msg.name, paint: msg.paint });
    } else {
      const taken = new Set([0, ...[...guests.values()].map((x) => x.slot)]);
      const slot = [1, 2, 3].find((s) => !taken.has(s) && s < maxPlayers);
      if (slot === undefined || guests.size + 1 >= maxPlayers) {
        reply({ t: "reject", why: "full" });
        later(400, () => conn.close());
        return null;
      }
      g = { conn, chan: l.chan, slot, token: msg.token, name: msg.name, paint: msg.paint, ready: false, ping: null, seen: now(), away: false, awaySince: 0, lastSeq: -1, lastSocial: 0, lastHorn: 0 };
    }
    guests.set(conn.peer, g);
    setPlayers(hostPlayers());
    reply({ t: "welcome", v: PROTOCOL, you: g.slot, players: state.players, settings: state.settings, session: state.session, results: state.results });
    broadcast({ t: "roster", players: state.players, settings: state.settings }, g);
    emit();
    return g;
  }

  function drop(g: Guest) {
    if (g.away) return;
    g.away = true;
    g.awaySince = now();
    pushRoster();
  }

  function remove(g: Guest) {
    guests.delete(g.conn.peer);
    try {
      g.conn.close();
    } catch {}
    pushRoster();
  }

  function onGuest(g: Guest, msg: GuestMsg) {
    switch (msg.t) {
      case "ready":
        g.ready = msg.on;
        return pushRoster();
      case "paint":
        g.paint = msg.paint;
        return pushRoster();
      case "ping":
        if (msg.rtt != null) g.ping = Math.round(msg.rtt);
        return sendText(g, { t: "pong", n: msg.n, c: msg.c, h: now() });
      case "quick":
        if (now() - g.lastSocial < 600) return;
        g.lastSocial = now();
        events.toast(`${g.name}: ${QUICK[msg.k]}`);
        return broadcast({ t: "quick", from: g.slot, k: msg.k }, g);
      case "horn":
        if (now() - g.lastHorn < 250) return;
        g.lastHorn = now();
        events.horn(g.slot);
        return broadcast({ t: "horn", from: g.slot }, g);
      case "finish": {
        const s = state.session;
        if (!s || s.mode !== "race" || msg.sid !== s.sid || !s.grid.includes(g.slot)) return;
        return record({ slot: g.slot, total: msg.total, best: msg.best, laps: msg.laps });
      }
      case "bye":
        return remove(g);
      case "hello":
        return;
    }
  }

  function record(r: ResultInfo) {
    const s = state.session;
    if (!s || state.results.some((x) => x.slot === r.slot)) return;
    state.results = [...state.results, r];
    broadcast({ t: "result", sid: s.sid, result: r });
    emit();
  }

  /** Host: start a race or a free roam with everyone who's here. */
  function start() {
    if (state.role !== "host" || (state.status !== "lobby" && state.status !== "playing")) return;
    rememberOrder();
    const here = state.players.filter((p) => !p.away).map((p) => p.slot);
    // Last race's order reversed for the grid (last place gets pole), newcomers at the back
    const order = lastOrder.length ? [...lastOrder].reverse().filter((s) => here.includes(s)) : [];
    const grid = [...order, ...here.filter((s) => !order.includes(s))];
    const t = now();
    const lightsAt = t + 2500;
    const session: SessionInfo = { sid: ++sidCounter, mode: state.settings.mode, laps: state.settings.laps, lightsAt, goAt: lightsAt + 5300 + Math.random() * 2200, grid };
    for (const g of guests.values()) g.lastSeq = -1;
    finished = false;
    remoteSeq.clear();
    set({ session, results: [], status: "playing" });
    broadcast({ t: "start", session });
    events.start(session, { lightsAt: session.lightsAt, goAt: session.goAt });
  }

  /** Host: everyone back to the lobby, ready flags cleared. */
  function toLobby() {
    if (state.role !== "host") return;
    rememberOrder();
    for (const g of guests.values()) g.ready = false;
    finished = false;
    set({ session: null, status: "lobby" });
    broadcast({ t: "lobby" });
    pushRoster();
    events.lobby();
  }

  function rememberOrder() {
    const s = state.session;
    if (!s || s.mode !== "race") return;
    lastOrder = standings(s.grid.map((slot) => ({ slot, dist: 0, total: state.results.find((r) => r.slot === slot)?.total ?? null })));
  }

  function setSettings(patch: Partial<Settings>) {
    if (state.role !== "host") return;
    state.settings = { ...state.settings, ...patch };
    pushRoster();
  }

  /* ───────── guest ───────── */

  async function join(code: string, name: string, paint: PaintId) {
    reset();
    profile = { name, paint };
    hostCode = code;
    reconnectTried = false;
    set({ status: "joining", role: "guest", code, step: "Finding the room…", error: null });
    await connect(false);
  }

  async function connect(rejoin: boolean) {
    let p: Peer;
    try {
      p = await newPeer();
    } catch (e) {
      return rejoin ? lost() : fail(serverError(e));
    }
    if (disposed) return p.destroy();
    peer = p;
    try {
      await opened(p);
    } catch (e) {
      return rejoin ? lost() : fail(serverError(e));
    }
    if (peer !== p) return;
    if (!rejoin) set({ step: "Connecting to the host…" });
    const conn = p.connect(peerIdFor(hostCode), { serialization: "raw", reliable: true, metadata: { v: PROTOCOL } });
    const l: Link = { conn, chan: null };
    let welcomed = false;
    const timeout = later(CONNECT_TIMEOUT, () => {
      if (conn.open || link === l) return;
      conn.close();
      if (rejoin) return lost();
      fail({
        kind: "timeout",
        title: "Found the room, but couldn't connect to it",
        detail: "The host's device answered, but your two networks wouldn't let a direct connection through. This happens most on mobile data and on some home internet plans that share one public address between many customers.",
        tips: NAT_TIPS,
      });
    });
    p.on("error", (e) => {
      log("peer error", e.type);
      if (e.type === "peer-unavailable") {
        cancel(timeout);
        if (rejoin) return lost(true);
        fail({ kind: "no-room", title: `No room called ${hostCode}`, detail: "Check the code with whoever made the room. Rooms close when the host leaves the page, so they may need to make a new one." });
      } else if (!conn.open && (e.type === "network" || e.type === "server-error" || e.type === "socket-error" || e.type === "socket-closed") && link !== l) {
        cancel(timeout);
        if (rejoin) return lost();
        fail(serverError(e));
      }
    });
    conn.on("open", () => {
      cancel(timeout);
      link = l;
      l.chan = stateChannel(conn, (d) => onState(d, null));
      hostSeen = now();
      if (!rejoin) set({ step: "Saying hello…" });
      sendText(l, { t: "hello", v: PROTOCOL, token, name: profile.name, paint: profile.paint });
      later(WELCOME_TIMEOUT, () => {
        if (welcomed || link !== l) return;
        if (rejoin) return lost();
        fail({ kind: "timeout", title: "The host didn't answer", detail: "We connected, but the room never let us in. The host may be on an older copy of the page.", tips: ["Both of you reload the page, then try again."] });
      });
    });
    conn.on("data", (data) => {
      if (link !== l) return;
      hostSeen = now();
      if (typeof data !== "string") return onState(data, null);
      const msg = parseHost(readText(data));
      if (!msg) return;
      if (msg.t === "welcome") welcomed = true;
      onHost(msg, rejoin);
    });
    conn.on("close", () => {
      if (link !== l || disposed) return;
      link = null;
      if (state.status === "error" || state.status === "idle") return;
      reconnect();
    });
  }

  /** The link to the host went quiet or closed: one attempt to get it back. */
  function reconnect() {
    if (state.role !== "guest" || state.status === "error" || state.status === "idle") return;
    if (reconnectTried) return lost();
    reconnectTried = true;
    const was = state.status;
    set({ status: "reconnecting", step: "Connection dropped. Trying to reconnect…" });
    events.toast("Connection dropped, reconnecting…", "bad");
    const old = peer;
    link = null;
    peer = null;
    old?.destroy();
    resumeTo = was === "playing" ? "playing" : "lobby";
    void connect(true);
  }
  let resumeTo: Status = "lobby";

  function lost(gone = false) {
    fail(
      gone
        ? { kind: "host-left", title: "The host has left", detail: "The room closed when the host's page did. One of you can make a new room to race again." }
        : {
            kind: "lost",
            title: "Lost the connection to the host",
            detail: "We tried to reconnect once and couldn't. Either the host closed the page, or one of your connections dropped out.",
            tips: ["If you're on mobile data, check the signal, then make or join a new room.", NAT_TIPS[2]],
          },
    );
  }

  function onHost(msg: HostMsg, rejoin: boolean) {
    switch (msg.t) {
      case "welcome": {
        state.me = msg.you;
        state.settings = msg.settings;
        state.results = msg.results;
        if (!rejoin) state.players = [];
        setPlayers(msg.players);
        // Sync the clock straight away: four quick pings
        for (let i = 0; i < 4; i++) later(i * 150, ping);
        const resumed = rejoin && resumeTo === "playing" && msg.session && state.session && msg.session.sid === state.session.sid;
        if (rejoin) events.toast("Reconnected", "good");
        reconnectTried = false;
        if (resumed) return set({ status: "playing", step: null, session: msg.session });
        set({ status: "lobby", step: null, session: msg.session });
        if (!rejoin) startTimers();
        // A free roam already going: drive straight in
        if (msg.session?.mode === "free") later(700, () => state.session?.sid === msg.session?.sid && begin(msg.session!));
        else if (rejoin && resumeTo === "playing") events.lobby();
        return;
      }
      case "reject":
        if (msg.why === "full") return fail({ kind: "full", title: "That room is full", detail: "Every seat is taken: a room holds up to four drivers. Ask the host to make another room, or wait for someone to leave." });
        if (msg.why === "version") return fail({ kind: "version", title: "Different versions of the game", detail: "You and the host have different copies of this page. Both of you reload it, then try again." });
        return fail({ kind: "host-left", title: "The room is closed", detail: "The host has closed this room." });
      case "roster":
        state.settings = msg.settings;
        setPlayers(msg.players);
        emit();
        return;
      case "pong":
        clock.sample(msg.c, msg.h, now());
        return emit();
      case "start":
        // Wait for at least one clock sample so the lights line up
        if (!clock.synced) {
          ping();
          later(400, () => begin(msg.session));
        } else begin(msg.session);
        return;
      case "quick": {
        const p = state.players.find((x) => x.slot === msg.from);
        if (p) events.toast(`${p.name}: ${QUICK[msg.k]}`);
        return;
      }
      case "horn":
        return events.horn(msg.from);
      case "result":
        if (state.session?.sid === msg.sid && !state.results.some((r) => r.slot === msg.result.slot)) {
          state.results = [...state.results, msg.result];
          emit();
        }
        return;
      case "lobby":
        finished = false;
        set({ session: null, status: "lobby" });
        events.lobby();
        return;
      case "end":
        return fail({ kind: "host-left", title: "The host closed the room", detail: "Thanks for racing. Make a new room to go again." });
    }
  }

  function begin(session: SessionInfo) {
    finished = false;
    remoteSeq.clear();
    state.results = state.session?.sid === session.sid ? state.results : [];
    set({ session, status: "playing" });
    const offset = clock.offset;
    events.start(session, { lightsAt: session.lightsAt - offset, goAt: session.goAt - offset });
  }

  function ping() {
    if (!link) return;
    pingAt = now();
    sendText(link, { t: "ping", n: ++pingN, c: now(), rtt: clock.rtt });
  }

  /* ───────── shared ───────── */

  function startTimers() {
    stopTimers();
    lastTick = now();
    timers.push(setInterval(sendState, 1000 / SEND_HZ));
    timers.push(
      setInterval(() => {
        const t = now();
        // The tab was frozen (phone screen off, app switched): give everyone a fresh window
        const frozen = t - lastTick > 3000;
        lastTick = t;
        if (state.role === "host") {
          let changed = false;
          for (const g of [...guests.values()]) {
            if (frozen) g.seen = t;
            if (!g.away && t - g.seen > SILENCE) {
              g.away = true;
              g.awaySince = t;
              changed = true;
            } else if (g.away && t - g.awaySince > AWAY_GRACE) {
              guests.delete(g.conn.peer);
              g.conn.close();
              changed = true;
            }
          }
          if (changed || t - rosterAt > 3000) pushRoster();
        } else if (state.role === "guest" && link) {
          if (frozen) hostSeen = t;
          if (t - pingAt > (clock.synced ? 2000 : 500)) ping();
          if (t - hostSeen > SILENCE) {
            const l = link;
            link = null;
            l.conn.close();
            reconnect();
          }
        }
      }, 250),
    );
  }
  function stopTimers() {
    timers.forEach(clearInterval);
    timers = [];
  }

  function teardown() {
    stopTimers();
    pending.forEach(clearTimeout);
    pending = [];
    for (const g of guests.values()) {
      try {
        g.conn.close();
      } catch {}
    }
    guests.clear();
    link = null;
    peer?.destroy();
    peer = null;
  }

  function reset() {
    teardown();
    remoteSeq.clear();
    lastOrder = [];
    finished = false;
    Object.assign(state, { status: "idle", role: null, code: null, me: -1, players: [], session: null, results: [], error: null, step: null });
  }

  /** Leave on purpose: tell the others first. */
  function leave() {
    if (state.role === "host") broadcast({ t: "end" });
    else if (link) sendText(link, { t: "bye" });
    const wasOn = state.status === "playing";
    // Give the goodbye a moment to go out before the connections close
    const p = peer;
    const gs = [...guests.values()];
    const l = link;
    stopTimers();
    pending.forEach(clearTimeout);
    pending = [];
    guests.clear();
    link = null;
    peer = null;
    setTimeout(() => {
      gs.forEach((g) => g.conn.close());
      l?.conn.close();
      p?.destroy();
    }, 250);
    Object.assign(state, { status: "idle", role: null, code: null, me: -1, players: [], session: null, results: [], error: null, step: null });
    emit();
    if (wasOn) events.lobby();
  }

  // Closing the tab: a last goodbye
  const onPageHide = () => {
    if (state.role === "host") broadcast({ t: "end" });
    else if (link) sendText(link, { t: "bye" });
  };
  addEventListener("pagehide", onPageHide);

  return {
    get state() {
      return state;
    },
    create,
    join,
    leave,
    start,
    toLobby,
    setSettings,
    hostNow,
    get clockOffset() {
      return state.role === "guest" ? clock.offset : 0;
    },
    /** Who's driving which car, for the network. */
    setSelf(fn: (() => SelfState | null) | null) {
      self = fn;
    },
    setReady(on: boolean) {
      if (state.role === "guest") {
        sendText(link, { t: "ready", on });
        // Show it straight away; the host's roster confirms it
        const p = state.players.find((x) => x.slot === state.me);
        if (p) p.ready = on;
        emit();
      }
    },
    setPaint(paint: PaintId) {
      profile.paint = paint;
      if (state.role === "host") pushRoster();
      else if (state.role === "guest") sendText(link, { t: "paint", paint });
    },
    quick(k: number) {
      if (!(k >= 0 && k < QUICK.length) || state.me < 0) return;
      if (state.role === "host") broadcast({ t: "quick", from: 0, k });
      else sendText(link, { t: "quick", k });
    },
    horn() {
      if (state.role === "host") broadcast({ t: "horn", from: 0 });
      else sendText(link, { t: "horn" });
    },
    /** We crossed the line for the last time. */
    finish(r: Omit<ResultInfo, "slot">) {
      const s = state.session;
      if (!s || s.mode !== "race" || finished) return;
      finished = true;
      if (state.role === "host") record({ slot: 0, ...r });
      else {
        sendText(link, { t: "finish", sid: s.sid, ...r });
        if (!state.results.some((x) => x.slot === state.me)) {
          state.results = [...state.results, { slot: state.me, ...r }];
          emit();
        }
      }
    },
    /** Clears an error so the lobby can be used again. */
    dismiss() {
      reset();
      emit();
    },
    /** Test hook: a smaller room, to check what a full room looks like without four browsers. */
    setMaxPlayers(n: number) {
      maxPlayers = Math.max(2, Math.min(MAX_PLAYERS, Math.round(n)));
    },
    dispose() {
      disposed = true;
      if (state.status !== "idle" && state.status !== "error") leave();
      teardown();
      removeEventListener("pagehide", onPageHide);
    },
  };
}
export type Room = ReturnType<typeof createRoom>;
