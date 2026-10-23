"use client";

import { useEffect, useRef, useState } from "react";
import { haptic } from "@/lib/haptics";
import type { PaintId } from "../car";
import type { DriveEngine, RaceUpdate } from "../engine";
import { disposeHorn, hornVolume, playHorn } from "./horn";
import { FLAG, normalizeCode, QUICK, type SessionInfo, standings } from "./protocol";
import { createRemoteCars, type RemoteCars } from "./remote-cars";
import { createRoom, type Room, type RoomState } from "./room";
import { createProgress, gridSlot, pitSlot } from "./spawn";

// The glue between the room (network), the engine (your car and the others')
// and the page (lobby, HUD, results). DriveGame keeps its single-player flow;
// this hook only takes over while you're in a room.

export interface NetToast {
  id: number;
  text: string;
  tone?: "good" | "bad";
}

export interface Standing {
  slot: number;
  name: string;
  paint: PaintId;
  total: number | null;
  me: boolean;
}

const NICK_KEY = "bay-circuit-nick";
const IDLE: RoomState = { status: "idle", role: null, code: null, me: -1, players: [], settings: { mode: "race", laps: 3 }, session: null, results: [], error: null, relay: false, step: null };
const DEBUG = process.env.NEXT_PUBLIC_NET_DEBUG === "1";

export function useMultiplayer(o: {
  engine: React.RefObject<DriveEngine | null>;
  /** Where the other players' name tags go (over the canvas). */
  tags: React.RefObject<HTMLDivElement | null>;
  muted: boolean;
  /** Starts driving (the page's own start, with the engine call swapped in). */
  begin: (go: (e: DriveEngine) => void) => void;
  /** Stops driving, back to the title view. */
  end: () => void;
}) {
  const [state, setState] = useState<RoomState>(IDLE);
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState(false);
  const [toasts, setToasts] = useState<NetToast[]>([]);
  const [order, setOrder] = useState<number[]>([]);
  const [lap, setLap] = useState(0);
  const [initialCode, setInitialCode] = useState<string | null>(null);
  const [nick, setNick] = useState("");
  const room = useRef<Room | null>(null);
  const remotes = useRef<RemoteCars | null>(null);
  const latest = useRef(o);
  const session = useRef<SessionInfo | null>(null);
  const me = useRef(-1);
  const dists = useRef(new Map<number, number>());
  const race = useRef({ laps: [] as number[], penalty: 0, done: false, progress: createProgress() });
  const throttle = useRef({ horn: 0, quick: 0, heard: new Map<number, number>() });
  const toastId = useRef(0);
  const attached = useRef<DriveEngine | null>(null);

  useEffect(() => {
    latest.current = o;
  });

  const toast = (text: string, tone?: "good" | "bad") => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-2), { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  };

  /** Makes the room and the remote-car layer on first use. */
  const ensure = () => {
    if (room.current) return room.current;
    const tags = latest.current.tags.current;
    if (tags && !remotes.current) remotes.current = createRemoteCars({ labels: tags, clock: () => room.current?.hostNow() ?? performance.now() });
    attach(latest.current.engine.current);
    const r = createRoom(
      {
        change: (s) => {
          me.current = s.me;
          session.current = s.session;
          // Remote cars follow the roster
          const rc = remotes.current;
          if (rc) {
            const others = s.players.filter((p) => p.slot !== s.me && s.status !== "idle" && s.status !== "error");
            for (const p of others) rc.set(p.slot, p.name, p.paint);
            for (const slot of rc.slots()) if (!others.some((p) => p.slot === slot)) rc.remove(slot);
          }
          // A room that's gone (or never was) isn't worth offering again; a full or unreachable one is
          if (s.error && (s.error.kind === "host-left" || s.error.kind === "lost" || s.error.kind === "no-room" || s.error.kind === "version")) setInitialCode(null);
          setState(s);
        },
        toast,
        start: (sess, local) => onStart(sess, local),
        lobby: () => {
          setPanel(false);
          remotes.current?.reset();
          dists.current.clear();
          latest.current.end();
          setOpen(true);
        },
        state: (s) => {
          remotes.current?.push(s);
          dists.current.set(s.slot, s.dist);
        },
        horn: (slot) => {
          const t = performance.now();
          if (t - (throttle.current.heard.get(slot) ?? 0) < 300) return;
          throttle.current.heard.set(slot, t);
          remotes.current?.honk(slot);
          const pose = remotes.current?.pose(slot);
          const mine = latest.current.engine.current?.getNetState();
          const dist = pose && mine?.driving ? Math.hypot(pose.x - mine.x, pose.z - mine.z) : null;
          if (!latest.current.muted) playHorn(hornVolume(dist));
        },
      },
      { debug: DEBUG },
    );
    r.setSelf(() => {
      const e = latest.current.engine.current;
      const n = e?.getNetState();
      if (!n?.driving) return null;
      const dist = race.current.progress.update(n.s);
      const flags = (n.braking ? FLAG.braking : 0) | (n.drs ? FLAG.drs : 0) | (n.inPit ? FLAG.pit : 0) | (n.held ? FLAG.held : 0) | (race.current.done ? FLAG.finished : 0) | FLAG.driving;
      return { x: n.x, z: n.z, heading: n.heading, speed: n.speed, steer: n.steer, lap: n.lap, dist, flags };
    });
    room.current = r;
    return r;
  };

  /** Puts the other cars into the engine's scene (once it exists). */
  function attach(e: DriveEngine | null) {
    if (!e || !remotes.current || attached.current === e) return;
    e.setRemotes(remotes.current.layer);
    attached.current = e;
  }

  function onStart(sess: SessionInfo, local: { lightsAt: number; goAt: number }) {
    const slot = me.current;
    const idx = sess.grid.indexOf(slot);
    // Joined while a race was on: watch this one, drive the next
    if (sess.mode === "race" && idx < 0) return;
    const pose = sess.mode === "race" ? gridSlot(idx) : pitSlot(slot);
    race.current.laps = [];
    race.current.penalty = 0;
    race.current.done = false;
    dists.current.clear();
    remotes.current?.reset();
    setLap(sess.mode === "race" ? 1 : 0);
    setPanel(false);
    setOpen(false);
    latest.current.begin((e) => {
      attach(e);
      e.drive(sess.mode);
      e.netStart({ game: sess.mode, ...pose, lightsAt: local.lightsAt, goAt: local.goAt });
      race.current.progress.reset(e.getNetState().s);
    });
  }

  /** Race events from the engine (lights, laps): count laps and report the finish. */
  const onRace = (u: RaceUpdate) => {
    const sess = session.current;
    const r = room.current;
    if (!sess || sess.mode !== "race" || !r || (r.state.status !== "playing" && r.state.status !== "reconnecting")) return;
    if (u.jumpStart) race.current.penalty = 5000;
    if (u.lap && !race.current.done) {
      race.current.laps.push(Math.round(u.lap.ms));
      setLap(Math.min(sess.laps, race.current.laps.length + 1));
      if (race.current.laps.length >= sess.laps) {
        race.current.done = true;
        const total = Math.max(0, Math.round(r.hostNow() - sess.goAt + race.current.penalty));
        const laps = race.current.laps.slice();
        r.finish({ total, best: Math.min(...laps), laps });
        haptic(40);
        setPanel(true);
      } else if (race.current.laps.length === sess.laps - 1) toast("Final lap", "good");
    }
  };

  // Live order, a few times a second
  useEffect(() => {
    if (state.status !== "playing" || state.session?.mode !== "race") return;
    const t = setInterval(() => {
      const sess = session.current;
      if (!sess) return;
      const results = room.current?.state.results ?? [];
      const next = standings(
        sess.grid.map((slot) => ({
          slot,
          dist: slot === me.current ? race.current.progress.dist : (dists.current.get(slot) ?? -1e5),
          total: results.find((x) => x.slot === slot)?.total ?? null,
        })),
      );
      setOrder((prev) => (prev.join() === next.join() ? prev : next));
    }, 250);
    return () => clearInterval(t);
  }, [state.status, state.session]);

  // A ?room=CODE link opens the lobby ready to join; the nickname is remembered
  useEffect(() => {
    let code: string | null = null;
    let saved = "";
    try {
      code = normalizeCode(new URLSearchParams(location.search).get("room") ?? "");
      saved = localStorage.getItem(NICK_KEY) ?? "";
    } catch {}
    queueMicrotask(() => {
      setNick(saved);
      if (code) {
        setInitialCode(code);
        setOpen(true);
      }
    });
  }, []);

  // Keys while racing together: H horn, 1–6 quick messages
  useEffect(() => {
    if (state.status !== "playing") return;
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey || (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable))) return;
      if (e.key.toLowerCase() === "h") horn();
      const k = Number(e.key) - 1;
      if (Number.isInteger(k) && k >= 0 && k < QUICK.length) quick(k);
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  });

  // Everything goes when the page does
  useEffect(() => {
    const engine = o.engine;
    return () => {
      room.current?.dispose();
      room.current = null;
      engine.current?.setRemotes(null);
      remotes.current?.dispose();
      remotes.current = null;
      disposeHorn();
    };
  }, [o.engine]);

  // Test hook for the end-to-end script; only in builds made with NEXT_PUBLIC_NET_DEBUG=1
  useEffect(() => {
    if (!DEBUG) return;
    (window as unknown as { __bayNet?: unknown }).__bayNet = {
      get state() {
        return room.current?.state ?? null;
      },
      remotes: () => Object.fromEntries((remotes.current?.slots() ?? []).map((s) => [s, remotes.current?.pose(s) ?? null])),
      self: () => latest.current.engine.current?.getNetState() ?? null,
      gas: (throttle: number, steer = 0) => latest.current.engine.current?.setControls({ throttle, steer }),
      setMaxPlayers: (n: number) => ensure().setMaxPlayers(n),
      offset: () => room.current?.clockOffset ?? 0,
      /** Pretend a lap was completed (a real one takes minutes in a software-rendered browser). */
      lap: (ms: number) => onRace({ lap: { lap: race.current.laps.length + 1, ms, valid: true, best: false, sectors: [] }, lapNo: 0, invalid: false, best: null }),
    };
  });

  /* ───────── actions (from the UI) ───────── */

  const remember = (name: string) => {
    setNick(name);
    try {
      localStorage.setItem(NICK_KEY, name);
    } catch {}
  };
  function create(name: string, paint: PaintId) {
    remember(name);
    haptic();
    void ensure().create(name, paint);
  }
  function join(code: string, name: string, paint: PaintId) {
    remember(name);
    haptic();
    void ensure().join(code, name, paint);
  }
  /** Leave the room; from the lobby the sheet stays open to make or join another. */
  function leave(keepOpen = false) {
    haptic();
    const wasDriving = room.current?.state.status === "playing";
    room.current?.leave();
    setPanel(false);
    setInitialCode(null);
    setOpen(keepOpen);
    if (wasDriving) latest.current.end();
  }
  function horn() {
    const t = performance.now();
    if (t - throttle.current.horn < 400) return;
    throttle.current.horn = t;
    haptic(12);
    room.current?.horn();
    if (!latest.current.muted) playHorn(1);
  }
  function quick(k: number) {
    const t = performance.now();
    if (t - throttle.current.quick < 900) return;
    throttle.current.quick = t;
    haptic();
    room.current?.quick(k);
    toast(`You: ${QUICK[k]}`);
  }

  const inRoom = state.status === "lobby" || state.status === "playing" || state.status === "reconnecting";
  // Still driving through a short reconnect; the room catches up when it's back
  const driving = (state.status === "playing" || state.status === "reconnecting") && !!state.session && (state.session.mode === "free" || state.session.grid.includes(state.me));
  const names = new Map(state.players.map((p) => [p.slot, p]));
  const table: Standing[] = (state.session?.mode === "race" ? (order.length ? order : state.session.grid) : state.players.map((p) => p.slot))
    .map((slot) => {
      const p = names.get(slot);
      return p ? { slot, name: p.name, paint: p.paint, total: state.results.find((r) => r.slot === slot)?.total ?? null, me: slot === state.me } : null;
    })
    .filter((s): s is Standing => !!s);

  return {
    state,
    /** In a room (lobby or racing). */
    inRoom,
    /** Driving in a shared session right now. */
    driving,
    open,
    setOpen,
    panel,
    setPanel,
    toasts,
    table,
    lap,
    /** Race distance (metres since the start line) of a car in the session, for the gaps on the timing tower. */
    distOf: (slot: number): number | null => (slot === me.current ? race.current.progress.dist : (dists.current.get(slot) ?? null)),
    nick,
    initialCode,
    onRace,
    create,
    join,
    leave,
    horn,
    quick,
    setReady: (on: boolean) => {
      haptic();
      room.current?.setReady(on);
    },
    setPaint: (p: PaintId) => room.current?.setPaint(p),
    setSettings: (s: Partial<RoomState["settings"]>) => {
      haptic();
      room.current?.setSettings(s);
    },
    start: () => {
      haptic(15);
      room.current?.start();
    },
    toLobby: () => {
      haptic();
      room.current?.toLobby();
    },
    dismiss: () => room.current?.dismiss(),
  };
}
export type Multiplayer = ReturnType<typeof useMultiplayer>;
