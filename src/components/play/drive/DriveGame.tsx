"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import type { CameraMode, DriveEngine, Quality, TimeOfDay } from "./engine";
import { landmarks, packets, type Landmark } from "./world";

const BEST_KEY = "island-drive-best";
const MUTE_KEY = "island-drive-muted";
const fmt = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms / 1000) % 60)).padStart(2, "0")}.${String(Math.floor((ms % 1000) / 10)).padStart(2, "0")}`;

const CAMERA_LABEL: Record<CameraMode, string> = { chase: "Chase cam", cockpit: "Driver's seat", map: "Map view" };
const TIME_LABEL: Record<TimeOfDay, string> = { day: "Daytime", golden: "Golden hour", night: "Night" };

function read(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

/** Picks a graphics tier from what the device tells us. */
function detectQuality(coarse: boolean): Quality {
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 4;
  if (cores <= 4 || memory <= 2 || nav.connection?.saveData) return "low";
  return coarse || cores <= 6 ? "medium" : "high";
}

/** Island Drive: drive a jeepney around an island of Neil's projects. */
export default function DriveGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null);
  const speedRef = useRef<HTMLSpanElement>(null);
  const engine = useRef<DriveEngine | null>(null);
  const zoneLink = useRef<HTMLAnchorElement>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "driving" | "unsupported">("loading");
  const [zone, setZone] = useState<Landmark | null>(null);
  const [found, setFound] = useState(0);
  const [trial, setTrial] = useState<{ running: boolean; ms: number; finished?: number } | null>(null);
  const [best, setBest] = useState<number | null>(null);
  const [pins, setPins] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [touch, setTouch] = useState(false);
  const [camera, setCamera] = useState<CameraMode>("chase");
  const [time, setTime] = useState<TimeOfDay>("day");
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    // three.js needs WebGL 2
    if (!document.createElement("canvas").getContext("webgl2")) {
      queueMicrotask(() => setPhase("unsupported"));
      return;
    }
    const coarse = !matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const startMuted = read(MUTE_KEY) === "1";
    queueMicrotask(() => {
      setTouch(coarse);
      setBest(Number(read(BEST_KEY)) || null);
      setMuted(startMuted);
    });

    import("./engine").then(({ createDriveEngine }) => {
      if (cancelled) return;
      try {
        engine.current = createDriveEngine(
          canvas,
          { quality: detectQuality(coarse), reducedMotion, touch: coarse, labels: labelsRef.current!, minimap: minimapRef.current, speedo: speedRef.current },
          {
            onReady: () => setPhase((p) => (p === "loading" ? "ready" : p)),
            onZone: (l) => {
              setZone(l);
              if (l) haptic(8);
            },
            onPackets: (n, total) => {
              setFound(n);
              if (n > 0) setToast(n === total ? "All packets delivered! 📦" : `Packet ${n}/${total}`);
            },
            onPins: (down, total) => {
              setPins(down);
              if (down === total) setToast("STRIKE! 🎳");
            },
            onAir: (s) => setToast(`Airborne ${s.toFixed(1)}s ✈️`),
            onCamera: (m) => {
              setCamera(m);
              setToast(CAMERA_LABEL[m]);
            },
            onTime: (t) => {
              setTime(t);
              setToast(TIME_LABEL[t]);
            },
            onChallenge: (s) => {
              setTrial(s);
              if (s.finished) {
                const prev = Number(read(BEST_KEY)) || null;
                if (!prev || s.finished < prev) {
                  write(BEST_KEY, String(Math.round(s.finished)));
                  setBest(Math.round(s.finished));
                  setToast(`New best: ${fmt(s.finished)} 🏁`);
                }
              }
            },
          },
        );
        engine.current.setMuted(startMuted);
      } catch {
        setPhase("unsupported");
      }
    });
    return () => {
      cancelled = true;
      engine.current?.dispose();
      engine.current = null;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  const start = () => {
    haptic(10);
    engine.current?.drive();
    setPhase("driving");
    canvasRef.current?.focus({ preventScroll: true });
  };

  // While driving, the game owns the screen: tuck away floating site widgets (the chat launcher).
  useEffect(() => {
    if (phase !== "driving") return;
    document.documentElement.dataset.immersive = "";
    return () => {
      delete document.documentElement.dataset.immersive;
    };
  }, [phase]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    write(MUTE_KEY, next ? "1" : "0");
    engine.current?.setMuted(next);
  };

  // Enter starts the drive, then opens whatever landmark you're parked at.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      if (e.key === "Enter" && phase === "ready") start();
      else if (e.key === "Enter" && phase === "driving" && zone) zoneLink.current?.click();
      else if (phase === "driving" && !e.repeat && e.key.toLowerCase() === "t") engine.current?.startChallenge();
      else if (phase === "driving" && !e.repeat && e.key.toLowerCase() === "m") toggleMute();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  });

  // Drag on the scene to look around (mouse or a free finger)
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const onLookStart = (e: React.PointerEvent) => {
    if (phase !== "driving" || (e.pointerType === "mouse" && e.button !== 0)) return;
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
  };
  const onLookMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    engine.current?.look(e.clientX - d.x, e.clientY - d.y);
    d.x = e.clientX;
    d.y = e.clientY;
  };
  const onLookEnd = (e: React.PointerEvent) => {
    if (drag.current?.id === e.pointerId) drag.current = null;
  };

  if (phase === "unsupported") return <Fallback />;
  const driving = phase === "driving";

  return (
    <div className="relative h-[100svh] w-full touch-none overflow-hidden bg-paper select-none" data-lenis-prevent>
      <canvas
        ref={canvasRef}
        tabIndex={-1}
        aria-label="Island Drive — a 3D island of Neil's projects"
        className={cn("block h-full w-full outline-none", driving && "cursor-grab active:cursor-grabbing")}
        onPointerDown={onLookStart}
        onPointerMove={onLookMove}
        onPointerUp={onLookEnd}
        onPointerCancel={onLookEnd}
      />

      {/* Landmark labels, positioned from 3D every frame */}
      <div ref={labelsRef} aria-hidden className="pointer-events-none absolute inset-0">
        {landmarks.map((l) => (
          <div key={l.id} data-landmark={l.id} className="group absolute top-0 left-0 opacity-0 transition-opacity duration-300 will-change-transform data-[active=true]:z-10">
            <span className="label block rounded-full bg-paper/90 px-3 py-1.5 text-[0.55rem] whitespace-nowrap text-ink shadow-[0_8px_20px_-10px_rgb(0_48_73/0.6)] ring-1 ring-ink/10 transition-[background-color,color,transform] duration-300 group-data-[active=true]:scale-110 group-data-[active=true]:bg-ember group-data-[active=true]:text-paper">
              {l.title}
            </span>
            <span className="mx-auto block h-3 w-px bg-ink/40" />
          </div>
        ))}
      </div>

      {/* HUD */}
      <div className={cn("pointer-events-none absolute inset-x-0 top-20 flex items-start justify-between gap-3 px-3 transition-opacity duration-500 sm:px-4 md:top-24 md:px-8", driving ? "opacity-100" : "opacity-0")}>
        <div className="pointer-events-auto min-w-0 space-y-2">
          <div className="flex w-fit items-stretch gap-3 rounded-2xl bg-paper/90 px-4 py-3 shadow-lg ring-1 ring-ink/10 backdrop-blur">
            <div>
              <p className="label text-[0.55rem] text-ember">Island Drive</p>
              <p className="mt-1 font-display text-2xl leading-none tabular-nums">
                {trial ? fmt(trial.finished ?? trial.ms) : `${found}/${packets.length}`}
                <span className="ml-1.5 font-serif text-sm text-ink/55 italic">{trial ? (trial.running ? `${found}/${packets.length}` : "done!") : "packets"}</span>
              </p>
              {(best || pins > 0) && (
                <p className="label mt-1 text-[0.5rem] text-ink/50">
                  {best && `Best ${fmt(best)}`}
                  {best && pins > 0 && " · "}
                  {pins > 0 && `🎳 ${pins}`}
                </p>
              )}
            </div>
            <div className="border-l border-ink/10 pl-3 text-right">
              <p className="font-display text-2xl leading-none tabular-nums">
                <span ref={speedRef}>0</span>
              </p>
              <p className="label mt-1 text-[0.5rem] text-ink/50">km/h</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <HudButton onClick={() => engine.current?.startChallenge()} label={trial?.running ? "Restart trial" : "Time trial"} hint="T" dark>
              <path d="M12 8v5l3 2M9 2h6M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" />
            </HudButton>
            <HudButton onClick={() => engine.current?.cycleCamera()} label={CAMERA_LABEL[camera]} hint="C">
              <path d="M3 8h3l2-3h8l2 3h3v11H3V8Z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
            </HudButton>
            <HudButton onClick={() => engine.current?.cycleTime()} label={TIME_LABEL[time]} hint="N">
              {time === "night" ? <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" /> : <path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />}
            </HudButton>
            <HudButton onClick={toggleMute} label={muted ? "Sound off" : "Sound on"} hint="M">
              {muted ? <path d="M11 5 6 9H2v6h4l5 4V5ZM22 9l-6 6M16 9l6 6" /> : <path d="M11 5 6 9H2v6h4l5 4V5ZM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />}
            </HudButton>
            <HudButton onClick={() => engine.current?.reset()} label="Reset" hint="R">
              <path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" />
            </HudButton>
          </div>
        </div>
        <canvas ref={minimapRef} width={150} height={150} aria-hidden className="h-[92px] w-[92px] shrink-0 rounded-full bg-sky/60 shadow-lg ring-4 ring-paper/80 sm:h-[120px] sm:w-[120px] md:h-[150px] md:w-[150px]" />
      </div>

      {/* Landmark card */}
      <div className={cn("absolute inset-x-0 top-60 flex justify-center px-4 transition-[opacity,transform] duration-500 ease-[var(--ease-spring)] md:top-auto md:bottom-10", zone && driving ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0")}>
        {zone && (
          <div key={zone.id} className="animate-pop-in w-full max-w-md rounded-[20px] bg-paper p-5 shadow-[0_30px_60px_-20px_rgb(0_48_73/0.6)] ring-1 ring-ink/10">
            <p className="label text-[0.55rem] text-ember">You&apos;ve arrived</p>
            <p className="mt-1 font-display text-3xl leading-tight">{zone.title}</p>
            <p className="mt-1 font-serif text-lg leading-snug text-ink/75 italic">{zone.line}</p>
            <div className="mt-4 flex items-center justify-between gap-3">
              <Link ref={zoneLink} href={zone.href} className="btn bg-ink py-3 text-paper hover:bg-ember">
                {zone.cta} <span className="arrow">→</span>
              </Link>
              <span className="label hidden text-[0.55rem] text-ink/45 md:inline">Press ↵</span>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <p key={toast} className="animate-pop-in label pointer-events-none absolute top-[30%] left-1/2 -translate-x-1/2 rounded-full bg-ink px-5 py-3 text-[0.65rem] whitespace-nowrap text-paper shadow-xl">
          {toast}
        </p>
      )}

      {touch && driving && <TouchControls engine={engine} />}

      {/* Title screen over the orbiting island */}
      <div className={cn("absolute inset-0 flex items-end justify-center bg-gradient-to-t from-paper via-paper/50 to-transparent px-5 pb-14 transition-opacity duration-700 md:items-center md:pb-0", driving ? "pointer-events-none opacity-0" : "opacity-100")}>
        <div className="max-w-xl text-center">
          <p className="label text-ember">Play · Island Drive</p>
          <h1 className="mt-3 font-display text-[clamp(3rem,9vw,7rem)] leading-[0.95]">
            Skip the reading. <em className="font-serif text-ember">Drive it.</em>
          </h1>
          <p className="mx-auto mt-5 max-w-md font-serif text-xl leading-snug text-ink/75">
            Take the jeepney around an island of Neil&apos;s projects. Drift the ring road, jump the ramps, smash the crates — then climb into the driver&apos;s seat and drive it after dark.
          </p>
          <ul className="mx-auto mt-5 flex max-w-md flex-wrap justify-center gap-1.5">
            {["Real physics", "First-person cockpit", "Day to night", "Time trial"].map((f) => (
              <li key={f} className="label rounded-full bg-paper/80 px-3 py-1.5 text-[0.52rem] text-ink/70 ring-1 ring-ink/10">
                {f}
              </li>
            ))}
          </ul>
          <button type="button" onClick={start} disabled={phase === "loading"} className="btn mt-7 bg-ink text-paper hover:bg-ember disabled:opacity-50">
            {phase === "loading" ? "Building the island…" : "Start driving"} <span className="arrow">→</span>
          </button>
          <p className="label mt-6 text-[0.55rem] leading-relaxed text-ink/50">
            {touch
              ? "Left thumb drives · hold Drift to slide · drag to look · camera button for the driver's seat"
              : "WASD drive · Shift boost · Space drift · C camera · N night · H horn · drag to look · ↵ open · T time trial · gamepads work too"}
          </p>
        </div>
      </div>
    </div>
  );
}

function HudButton({ onClick, label, hint, dark, children }: { onClick: () => void; label: string; hint: string; dark?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => {
        haptic();
        onClick();
      }}
      aria-label={label}
      title={`${label} (${hint})`}
      className={cn("label press flex h-9 items-center gap-1.5 rounded-full px-2.5 text-[0.52rem] ring-1 sm:px-3", dark ? "bg-ink text-paper ring-ink hover:bg-ember" : "bg-paper/90 text-ink ring-ink/15 hover:bg-paper")}
    >
      <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 shrink-0 fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]">
        {children}
      </svg>
      <span className="hidden lg:inline">{label}</span>
      <span className="hidden opacity-50 lg:inline">· {hint}</span>
    </button>
  );
}

/** Phones and tablets: a floating joystick under the left thumb, pedals under the right. */
function TouchControls({ engine }: { engine: React.RefObject<DriveEngine | null> }) {
  const zoneRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLSpanElement>(null);
  const origin = useRef<{ id: number; x: number; y: number } | null>(null);
  const RADIUS = 56;

  const place = (x: number, y: number) => {
    const zone = zoneRef.current?.getBoundingClientRect();
    if (!zone || !baseRef.current) return;
    baseRef.current.style.left = `${x - zone.left}px`;
    baseRef.current.style.top = `${y - zone.top}px`;
  };
  const move = (e: React.PointerEvent) => {
    const o = origin.current;
    if (!o || o.id !== e.pointerId) return;
    let dx = e.clientX - o.x;
    let dy = e.clientY - o.y;
    const d = Math.hypot(dx, dy);
    if (d > RADIUS) {
      dx = (dx / d) * RADIUS;
      dy = (dy / d) * RADIUS;
    }
    if (knobRef.current) knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
    // A small dead zone, then a gentle curve for fine steering
    const shape = (v: number) => (Math.abs(v) < 0.08 ? 0 : Math.sign(v) * Math.pow(Math.abs(v), 1.3));
    engine.current?.setControls({ throttle: shape(-dy / RADIUS), steer: shape(dx / RADIUS) });
  };
  const release = (e: React.PointerEvent) => {
    if (origin.current?.id !== e.pointerId) return;
    origin.current = null;
    if (knobRef.current) knobRef.current.style.transform = "";
    const base = baseRef.current;
    if (base) {
      base.removeAttribute("data-active");
      base.style.left = base.style.top = "";
    }
    engine.current?.setControls({ throttle: 0, steer: 0 });
  };

  const hold = (key: "boost" | "brake") => ({
    onPointerDown: (e: React.PointerEvent) => {
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      haptic(6);
      engine.current?.setControls({ [key]: true });
    },
    onPointerUp: () => engine.current?.setControls({ [key]: false }),
    onPointerCancel: () => engine.current?.setControls({ [key]: false }),
  });

  return (
    <>
      <div
        ref={zoneRef}
        aria-label="Drive: drag anywhere here"
        className="absolute bottom-0 left-0 h-[52%] w-[55%] touch-none"
        onPointerDown={(e) => {
          if (origin.current) return;
          (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
          origin.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
          place(e.clientX, e.clientY);
          baseRef.current?.setAttribute("data-active", "");
        }}
        onPointerMove={move}
        onPointerUp={release}
        onPointerCancel={release}
      >
        <div
          ref={baseRef}
          className="pointer-events-none absolute bottom-10 left-20 flex h-32 w-32 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full bg-ink/15 opacity-60 ring-2 ring-paper/70 backdrop-blur-sm transition-opacity data-[active]:bottom-auto data-[active]:-translate-y-1/2 data-[active]:opacity-100"
        >
          <span ref={knobRef} className="h-14 w-14 rounded-full bg-ink shadow-lg ring-4 ring-paper/80" />
        </div>
      </div>
      <button
        type="button"
        {...hold("brake")}
        aria-label="Drift"
        className="label absolute right-5 bottom-8 flex h-20 w-20 touch-none items-center justify-center rounded-full bg-paper/90 text-[0.6rem] text-ink shadow-xl ring-4 ring-ink/20 active:scale-95"
      >
        Drift
      </button>
      <button
        type="button"
        {...hold("boost")}
        aria-label="Boost"
        className="label absolute right-28 bottom-12 flex h-16 w-16 touch-none items-center justify-center rounded-full bg-ember text-[0.55rem] text-paper shadow-xl ring-4 ring-paper/70 active:scale-95"
      >
        Boost
      </button>
      <button
        type="button"
        onPointerDown={() => {
          haptic(12);
          engine.current?.horn();
        }}
        aria-label="Horn"
        className="label absolute right-7 bottom-32 flex h-12 w-12 touch-none items-center justify-center rounded-full bg-ink text-[0.5rem] text-paper shadow-xl ring-4 ring-paper/70 active:scale-95"
      >
        Beep
      </button>
    </>
  );
}

/** No WebGL 2 (very old phones, some locked-down browsers): the island as a list. */
function Fallback() {
  return (
    <div className="mx-auto max-w-3xl px-5 pt-32 pb-16">
      <p className="label text-ember">Island Drive</p>
      <h1 className="mt-3 font-display text-5xl leading-tight">This browser can&apos;t draw the island.</h1>
      <p className="mt-4 font-serif text-xl text-ink/75">Here&apos;s every stop on it instead:</p>
      <ul className="mt-8 divide-y divide-ink/10 border-y border-ink/10">
        {landmarks.map((l) => (
          <li key={l.id}>
            <Link href={l.href} className="group flex items-center justify-between gap-4 py-4">
              <span>
                <span className="block font-display text-2xl group-hover:text-ember">{l.title}</span>
                <span className="font-serif text-ink/65 italic">{l.line}</span>
              </span>
              <span aria-hidden>→</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
