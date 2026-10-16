"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { haptic } from "@/lib/haptics";
import { useImmersive } from "@/lib/immersive";
import { cn } from "@/lib/utils";
import type { CameraMode, DriveEngine, Quality, TimeOfDay } from "./engine";
import { PAINTS, type PaintId } from "./jeepney";
import type { PasadaEvent, PasadaStatus } from "./pasada";
import { landmarks, packets, secrets, type Landmark } from "./world";

const BEST_KEY = "island-drive-best";
const SETTINGS_KEY = "island-drive-settings";
const SECRETS_KEY = "island-drive-secrets";
const fmt = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms / 1000) % 60)).padStart(2, "0")}.${String(Math.floor((ms % 1000) / 10)).padStart(2, "0")}`;
const peso = (n: number) => `₱${n.toLocaleString("en-PH")}`;

const CAMERA_LABEL: Record<CameraMode, string> = { chase: "Chase cam", cockpit: "Driver's seat", map: "Map view" };
const TIME_LABEL: Record<TimeOfDay, string> = { day: "Daytime", golden: "Golden hour", night: "Night" };

type GameMode = "pasada" | "free" | "trial";
const MODES: { id: GameMode; label: string; line: string }[] = [
  { id: "pasada", label: "Pasada", line: "Pick up passengers and drop them at Neil's projects" },
  { id: "free", label: "Free roam", line: `No goals — explore the town, the pier and the lookout, and find ${secrets.length} hidden stars` },
  { id: "trial", label: "Time trial", line: `Collect all ${packets.length} packets against the clock` },
];

interface Settings {
  mode: GameMode;
  controls: "buttons" | "tilt";
  invertTilt: boolean;
  autoGas: boolean;
  paint: PaintId;
  muted: boolean;
}
const DEFAULTS: Settings = { mode: "pasada", controls: "buttons", invertTilt: false, autoGas: false, paint: "ember", muted: false };

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
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null);
  const speedRef = useRef<HTMLSpanElement>(null);
  const engine = useRef<DriveEngine | null>(null);
  const zoneLink = useRef<HTMLAnchorElement>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "driving" | "unsupported">("loading");
  const [zone, setZone] = useState<Landmark | null>(null);
  const [found, setFound] = useState(0);
  const [stars, setStars] = useState(0);
  const [trial, setTrial] = useState<{ running: boolean; ms: number; finished?: number } | null>(null);
  const [best, setBest] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [touch, setTouch] = useState(false);
  const [portrait, setPortrait] = useState(false);
  const [allowPortrait, setAllowPortrait] = useState(false);
  const [camera, setCamera] = useState<CameraMode>("chase");
  const [time, setTime] = useState<TimeOfDay>("day");
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [sheet, setSheet] = useState(false);
  const [photo, setPhoto] = useState(false);
  const [mission, setMission] = useState<PasadaStatus | null>(null);
  const [dropped, setDropped] = useState<Landmark | null>(null);
  const settingsRef = useRef(settings);
  const driving = phase === "driving";

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const save = (patch: Partial<Settings>) =>
    setSettings((s) => {
      const next = { ...s, ...patch };
      write(SETTINGS_KEY, JSON.stringify(next));
      return next;
    });

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
    let stored: Settings = DEFAULTS;
    try {
      stored = { ...DEFAULTS, ...(JSON.parse(read(SETTINGS_KEY) ?? "{}") as Partial<Settings>) };
    } catch {}
    let starsFound: number[] = [];
    try {
      const list: unknown = JSON.parse(read(SECRETS_KEY) ?? "[]");
      if (Array.isArray(list)) starsFound = list.filter((i): i is number => Number.isInteger(i) && i >= 0 && i < secrets.length);
    } catch {}
    queueMicrotask(() => {
      setTouch(coarse);
      setBest(Number(read(BEST_KEY)) || null);
      setSettings(stored);
      setStars(starsFound.length);
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
              if (down === total) {
                haptic(30);
                setToast("STRIKE! 🎳");
              } else setToast(`${down} of ${total} pins 🎳`);
            },
            onSecret: (index, _n, total) => {
              if (!starsFound.includes(index)) starsFound = [...starsFound, index];
              write(SECRETS_KEY, JSON.stringify(starsFound));
              setStars(starsFound.length);
              haptic(20);
              setToast(starsFound.length === total ? `Every hidden star found! ★ ${total}/${total}` : `Hidden star ★ ${starsFound.length}/${total}`);
            },
            onPlace: (place) => {
              if (place) setToast(`${place.name} · ${place.line}`);
            },
            onAir: (s) => setToast(`Airborne ${s.toFixed(1)}s ✈️`),
            onCamera: (m) => setCamera(m),
            onTime: (t) => setTime(t),
            onMission: (status: PasadaStatus, event?: PasadaEvent) => {
              setMission(status.phase === "off" ? null : status);
              if (event?.boarded) {
                haptic(12);
                setToast(`Sakay! Going to ${status.destination?.title ?? "town"}`);
              }
              if (event?.delivered) {
                haptic(30);
                setToast(`Para po! +${peso(event.delivered.fare)}`);
                setDropped(event.delivered.landmark);
              }
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
        engine.current.setMuted(stored.muted);
        engine.current.setPaint(stored.paint);
        engine.current.setSecrets(starsFound);
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

  // Orientation, live
  useEffect(() => {
    const mq = matchMedia("(orientation: portrait)");
    const update = () => setPortrait(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1900);
    return () => clearTimeout(t);
  }, [toast]);

  // The landmark a passenger was just dropped at stays offered for a few seconds
  useEffect(() => {
    if (!dropped) return;
    const t = setTimeout(() => setDropped(null), 7000);
    return () => clearTimeout(t);
  }, [dropped]);

  // While driving the game takes over the screen
  useImmersive(driving);
  useEffect(() => {
    if (!driving) return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = prev;
    };
  }, [driving]);

  const applyMode = (mode: GameMode) => {
    const e = engine.current;
    if (!e) return;
    e.setPasada(mode === "pasada");
    if (mode === "trial") e.startChallenge();
    else setTrial(null);
  };

  const start = () => {
    haptic(10);
    const e = engine.current;
    if (!e) return;
    e.drive();
    applyMode(settings.mode);
    setPhase("driving");
    canvasRef.current?.focus({ preventScroll: true });
    // Phones: go full screen and ask for landscape (Android honours it; iPhone shows the rotate hint)
    if (touch) {
      const el = rootRef.current as (HTMLDivElement & { webkitRequestFullscreen?: () => void }) | null;
      const lock = () => (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> })?.lock?.("landscape").catch(() => {});
      if (el?.requestFullscreen) el.requestFullscreen({ navigationUI: "hide" }).then(lock, () => {});
      else el?.webkitRequestFullscreen?.();
    }
  };

  const exit = () => {
    haptic();
    engine.current?.stop();
    setPhase("ready");
    setPhoto(false);
    setSheet(false);
    setMission(null);
    setTrial(null);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  };

  const chooseMode = (mode: GameMode) => {
    haptic();
    save({ mode });
    if (driving) applyMode(mode);
  };

  const toggleMute = () => {
    const muted = !settings.muted;
    save({ muted });
    engine.current?.setMuted(muted);
  };

  const choosePaint = (paint: PaintId) => {
    haptic();
    save({ paint });
    engine.current?.setPaint(paint);
  };

  const chooseControls = async (controls: Settings["controls"]) => {
    if (controls === "tilt") {
      const DOE = (window as unknown as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } }).DeviceOrientationEvent;
      if (!DOE) return setToast("This device can't tilt-steer");
      if (DOE.requestPermission) {
        const answer = await DOE.requestPermission().catch(() => "denied");
        if (answer !== "granted") return setToast("Tilt needs motion access");
      }
    }
    haptic();
    save({ controls });
  };

  // Keyboard: Enter starts / opens, T trial, M mute, P photo, Esc leaves
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      const k = e.key.toLowerCase();
      if (e.key === "Enter" && phase === "ready") start();
      else if (!driving || e.repeat) return;
      else if (e.key === "Escape") {
        if (sheet) setSheet(false);
        else if (photo) setPhoto(false);
        else exit();
      } else if (e.key === "Enter" && (zone || dropped)) zoneLink.current?.click();
      else if (k === "t") chooseMode("trial");
      else if (k === "m") toggleMute();
      else if (k === "p") setPhoto((v) => !v);
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  });

  // Drag on the scene to look around (mouse or a free finger)
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const onLookStart = (e: React.PointerEvent) => {
    if (!driving || (e.pointerType === "mouse" && e.button !== 0)) return;
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
  const rotate = touch && portrait && driving && !allowPortrait && !photo;
  const showHud = driving && !photo && !rotate;
  const arrival = dropped ?? zone;

  return (
    <div
      ref={rootRef}
      className={cn("touch-none overflow-hidden bg-paper select-none", driving ? "fixed inset-0 z-[70]" : "relative h-[100svh] w-full")}
      data-lenis-prevent
    >
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

      {/* Landmark labels, positioned from 3D every frame (kept off the title card on phones) */}
      <div ref={labelsRef} aria-hidden className={cn("pointer-events-none absolute inset-0 transition-opacity", photo && "opacity-0", !driving && "max-md:opacity-0")}>
        {landmarks.map((l) => (
          <div key={l.id} data-landmark={l.id} className="group absolute top-0 left-0 opacity-0 transition-opacity duration-300 will-change-transform data-[active=true]:z-10">
            <span className="label block rounded-full bg-paper/90 px-3 py-1.5 text-[0.52rem] whitespace-nowrap text-ink shadow-[0_8px_20px_-10px_rgb(0_48_73/0.6)] ring-1 ring-ink/10 transition-[background-color,color,transform] duration-300 group-data-[active=true]:scale-110 group-data-[active=true]:bg-ember group-data-[active=true]:text-paper">
              {l.title}
            </span>
            <span className="mx-auto block h-3 w-px bg-ink/40" />
          </div>
        ))}
      </div>

      {/* HUD: status on the left, tools and minimap on the right */}
      <div
        className={cn("pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 transition-opacity duration-500", showHud ? "opacity-100" : "opacity-0")}
        style={{ padding: "max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) 0 max(12px, env(safe-area-inset-left))" }}
      >
        <StatusCard settings={settings} found={found} stars={stars} trial={trial} best={best} mission={mission} speedRef={speedRef} />

        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <div className="flex gap-1.5">
            <HudButton onClick={() => engine.current?.cycleCamera()} label={`View: ${CAMERA_LABEL[camera]}`} hint="C">
              <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
            </HudButton>
            <HudButton onClick={() => engine.current?.cycleTime()} label={TIME_LABEL[time]} hint="N">
              {time === "night" ? <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" /> : <path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />}
            </HudButton>
            <HudButton onClick={() => setPhoto(true)} label="Photo mode" hint="P">
              <path d="M14.5 4h-5L7 7H3v12h18V7h-4l-2.5-3Z M12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
            </HudButton>
            <HudButton onClick={() => setSheet(true)} label="Settings" hint="">
              <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
            </HudButton>
            <HudButton onClick={exit} label="Leave the island" hint="Esc" dark>
              <path d="M6 6l12 12M18 6 6 18" />
            </HudButton>
          </div>
          <canvas ref={minimapRef} width={150} height={150} aria-hidden className="h-[76px] w-[76px] rounded-full bg-sky/60 shadow-lg ring-[3px] ring-paper/80 md:h-[132px] md:w-[132px]" />
        </div>
      </div>

      {/* Where to next (Pasada) and where you are (a small chip, never a popup) */}
      {showHud && (
        <div className="pointer-events-none absolute inset-x-0 flex flex-col items-center gap-2 px-28" style={{ top: "max(14px, env(safe-area-inset-top))" }}>
          {mission && <MissionChip mission={mission} />}
          {arrival && (
            <Link
              key={arrival.id}
              ref={zoneLink}
              href={arrival.href}
              className="animate-blob-in pointer-events-auto origin-top flex max-w-full items-center gap-2 rounded-full bg-ink/90 py-1.5 pr-1.5 pl-4 text-paper shadow-xl ring-1 ring-paper/15 backdrop-blur"
            >
              <span className="truncate font-display text-base leading-none">{arrival.title}</span>
              <span className="label shrink-0 rounded-full bg-ember px-3 py-1.5 text-[0.5rem]">
                {touch ? "Open" : "↵ Open"} <span aria-hidden>→</span>
              </span>
            </Link>
          )}
        </div>
      )}

      {toast && showHud && (
        <p key={toast} className="animate-blob-in label pointer-events-none absolute top-[34%] left-1/2 -translate-x-1/2 rounded-full bg-ink/90 px-5 py-3 text-[0.62rem] whitespace-nowrap text-paper shadow-xl">
          {toast}
        </p>
      )}

      {touch && showHud && <TouchControls engine={engine} settingsRef={settingsRef} tilt={settings.controls === "tilt"} />}

      {photo && <PhotoMode engine={engine} onClose={() => setPhoto(false)} />}

      {sheet && driving && (
        <SettingsSheet
          settings={settings}
          touch={touch}
          onClose={() => setSheet(false)}
          onMode={chooseMode}
          onControls={chooseControls}
          onInvert={() => save({ invertTilt: !settings.invertTilt })}
          onAutoGas={() => save({ autoGas: !settings.autoGas })}
          onPaint={choosePaint}
          onMute={toggleMute}
          onTidy={() => {
            haptic();
            engine.current?.resetProps();
            setSheet(false);
            setToast("Pins set, crates stacked 🧹");
          }}
        />
      )}

      {rotate && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 bg-ink/92 px-8 text-center text-paper backdrop-blur-sm">
          <svg viewBox="0 0 64 64" aria-hidden className="animate-phone-turn h-16 w-16 fill-none stroke-paper stroke-2">
            <rect x="20" y="8" width="24" height="48" rx="4" />
            <path d="M29 50h6" />
          </svg>
          <p className="font-display text-3xl leading-tight">Turn your phone sideways</p>
          <p className="max-w-xs font-serif text-lg text-paper/75 italic">Island Drive plays best in landscape — more road, and a thumb for each side.</p>
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => setAllowPortrait(true)} className="label press rounded-full border border-paper/30 px-4 py-2.5 text-[0.58rem]">
              Play upright anyway
            </button>
            <button type="button" onClick={exit} className="label press rounded-full px-4 py-2.5 text-[0.58rem] text-paper/70">
              Leave
            </button>
          </div>
        </div>
      )}

      {/* Title screen over the orbiting island */}
      <div className={cn("absolute inset-0 flex items-end justify-center bg-gradient-to-t from-paper via-paper/50 to-transparent px-5 pb-14 transition-opacity duration-700 md:items-center md:pb-0", driving ? "pointer-events-none opacity-0" : "opacity-100")}>
        <div className="max-w-xl text-center">
          <p className="label text-ember">Play · Island Drive</p>
          <h1 className="mt-3 font-display text-[clamp(2.8rem,9vw,7rem)] leading-[0.95]">
            Skip the reading. <em className="font-serif text-ember">Drive it.</em>
          </h1>
          <p className="mx-auto mt-4 max-w-md font-serif text-xl leading-snug text-ink/75">
            Take the jeepney around an island of Neil&apos;s projects — pick up passengers, drift the ring road, bowl a strike in town and drive it after dark.
          </p>
          <div role="radiogroup" aria-label="Game mode" className="mx-auto mt-6 inline-flex rounded-full bg-paper/80 p-1 ring-1 ring-ink/10">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={settings.mode === m.id}
                onClick={() => chooseMode(m.id)}
                className="label press rounded-full px-3.5 py-2 text-[0.55rem] transition-colors aria-checked:bg-ink aria-checked:text-paper sm:px-4"
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="mt-2 font-serif text-sm text-ink/60 italic">{MODES.find((m) => m.id === settings.mode)?.line}</p>
          <button type="button" onClick={start} disabled={phase === "loading"} className="btn mt-6 bg-ink text-paper hover:bg-ember disabled:opacity-50">
            {phase === "loading" ? "Building the island…" : "Start driving"} <span className="arrow">→</span>
          </button>
          <p className="label mt-5 text-[0.52rem] leading-relaxed text-ink/50">
            {touch
              ? "Best in landscape · steer with the arrows or tilt · gas and brake on the right"
              : "WASD drive · Shift boost · Space drift · C camera · N night · H horn · P photo · Esc leave · gamepads work too"}
          </p>
        </div>
      </div>
    </div>
  );
}

function StatusCard({
  settings,
  found,
  stars,
  trial,
  best,
  mission,
  speedRef,
}: {
  settings: Settings;
  found: number;
  stars: number;
  trial: { running: boolean; ms: number; finished?: number } | null;
  best: number | null;
  mission: PasadaStatus | null;
  speedRef: React.RefObject<HTMLSpanElement | null>;
}) {
  return (
    <div className="pointer-events-auto flex w-fit items-stretch gap-3 rounded-2xl bg-paper/90 px-3.5 py-2.5 shadow-lg ring-1 ring-ink/10 backdrop-blur md:px-4 md:py-3">
      <div>
        <p className="label text-[0.5rem] text-ember">{MODES.find((m) => m.id === settings.mode)?.label}</p>
        <p className="mt-1 font-display text-xl leading-none tabular-nums md:text-2xl">
          {settings.mode === "trial" && trial ? (
            <>
              {fmt(trial.finished ?? trial.ms)}
              <span className="ml-1.5 font-serif text-sm text-ink/55 italic">
                {found}/{packets.length}
              </span>
            </>
          ) : settings.mode === "pasada" ? (
            <>
              {peso(mission?.fares ?? 0)}
              <span className="ml-1.5 font-serif text-sm text-ink/55 italic">
                {mission?.delivered ?? 0} {mission?.delivered === 1 ? "ride" : "rides"}
              </span>
            </>
          ) : (
            <>
              <span className="font-serif text-base text-ink/70 italic">Explore</span>
              <span className="ml-1.5 font-serif text-sm text-ink/55 italic" title="Hidden stars found">
                ★ {stars}/{secrets.length}
              </span>
            </>
          )}
        </p>
        {settings.mode === "trial" && best && <p className="label mt-1 text-[0.48rem] text-ink/50">Best {fmt(best)}</p>}
      </div>
      <div className="border-l border-ink/10 pl-3 text-right">
        <p className="font-display text-xl leading-none tabular-nums md:text-2xl">
          <span ref={speedRef}>0</span>
        </p>
        <p className="label mt-1 text-[0.48rem] text-ink/50">km/h</p>
      </div>
    </div>
  );
}

function MissionChip({ mission }: { mission: PasadaStatus }) {
  const ride = mission.phase === "ride";
  return (
    <div className="flex max-w-full items-center gap-2.5 rounded-full bg-paper/92 py-1.5 pr-4 pl-1.5 shadow-lg ring-1 ring-ink/10 backdrop-blur">
      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-paper", ride ? "bg-ember" : "bg-sky")}>
        <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 fill-current transition-transform duration-200" style={{ transform: `rotate(${mission.bearing}rad)` }}>
          <path d="M12 3 19 20l-7-4-7 4 7-17Z" />
        </svg>
      </span>
      <span className="min-w-0 truncate font-serif text-[0.95rem] leading-tight text-ink">
        <span className="label mr-1.5 text-[0.48rem] text-ink/50">{ride ? "Drop at" : "Pick up at"}</span>
        {mission.target}
      </span>
      <span className="label shrink-0 text-[0.5rem] text-ink/50 tabular-nums">{Math.round(mission.distance)} m</span>
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
      title={hint ? `${label} (${hint})` : label}
      className={cn("press flex h-10 w-10 items-center justify-center rounded-full shadow-lg ring-1 md:h-11 md:w-11", dark ? "bg-ink text-paper ring-ink hover:bg-ember" : "bg-paper/90 text-ink ring-ink/15 hover:bg-paper")}
    >
      <svg viewBox="0 0 24 24" aria-hidden className="h-[18px] w-[18px] fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]">
        {children}
      </svg>
    </button>
  );
}

/**
 * Phones: steering arrows (or tilt) under the left thumb, gas and brake pedals
 * under the right. Every button tracks its own finger, so they combine freely.
 */
function TouchControls({ engine, settingsRef, tilt }: { engine: React.RefObject<DriveEngine | null>; settingsRef: React.RefObject<Settings>; tilt: boolean }) {
  const held = useRef({ left: false, right: false, gas: false, brake: false, boost: false, drift: false, tilt: 0 });

  const apply = () => {
    const h = held.current;
    const s = settingsRef.current;
    const steer = s.controls === "tilt" ? h.tilt : (h.right ? 1 : 0) - (h.left ? 1 : 0);
    const throttle = h.brake ? -1 : h.gas || s.autoGas ? 1 : 0;
    engine.current?.setControls({ steer, throttle, boost: h.boost, brake: h.drift });
  };

  useEffect(() => {
    const e = engine.current;
    apply();
    return () => e?.setControls({ steer: 0, throttle: 0, boost: false, brake: false });
  });

  // Tilt steering: in landscape, rolling the phone left/right reads as beta
  useEffect(() => {
    if (!tilt) return;
    const onTilt = (e: DeviceOrientationEvent) => {
      const angle = screen.orientation?.angle ?? 0;
      const sign = (angle === 270 || angle === -90 ? -1 : 1) * (settingsRef.current.invertTilt ? -1 : 1);
      const raw = angle === 0 || angle === 180 ? (e.gamma ?? 0) : (e.beta ?? 0);
      const v = Math.max(-1, Math.min(1, (raw * sign) / 24));
      held.current.tilt = Math.abs(v) < 0.06 ? 0 : v;
      apply();
    };
    addEventListener("deviceorientation", onTilt);
    return () => removeEventListener("deviceorientation", onTilt);
  });

  // Each control names its input in data-key; one set of handlers serves them all.
  const press = (e: React.PointerEvent<HTMLButtonElement>, down: boolean) => {
    const key = e.currentTarget.dataset.key as Exclude<keyof typeof held.current, "tilt">;
    if (down) {
      e.preventDefault();
      e.currentTarget.setPointerCapture?.(e.pointerId);
      haptic(Number(e.currentTarget.dataset.buzz) || 6);
    }
    held.current[key] = down;
    apply();
  };
  const handlers = {
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => press(e, true),
    onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => press(e, false),
    onPointerCancel: (e: React.PointerEvent<HTMLButtonElement>) => press(e, false),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  };

  const pad = "env(safe-area-inset-left)";
  return (
    <>
      {!tilt && (
        <div className="absolute flex gap-3" style={{ left: `max(16px, ${pad})`, bottom: "max(16px, env(safe-area-inset-bottom))" }}>
          {(["left", "right"] as const).map((side) => (
            <button
              key={side}
              type="button"
              aria-label={`Steer ${side}`}
              data-key={side}
              {...handlers}
              className="press flex h-[4.5rem] w-[4.5rem] touch-none items-center justify-center rounded-full bg-paper/85 text-ink shadow-xl ring-1 ring-ink/15 backdrop-blur active:scale-95 active:bg-paper"
            >
              <svg viewBox="0 0 24 24" aria-hidden className={cn("h-8 w-8 fill-current", side === "left" && "rotate-180")}>
                <path d="M8 4l10 8-10 8V4Z" />
              </svg>
            </button>
          ))}
        </div>
      )}
      {tilt && (
        <p className="label pointer-events-none absolute rounded-full bg-paper/80 px-3 py-2 text-[0.5rem] text-ink/70" style={{ left: "max(16px, env(safe-area-inset-left))", bottom: "max(16px, env(safe-area-inset-bottom))" }}>
          Tilt to steer
        </p>
      )}

      <div className="absolute flex items-end gap-3" style={{ right: "max(16px, env(safe-area-inset-right))", bottom: "max(16px, env(safe-area-inset-bottom))" }}>
        <div className="flex flex-col items-center gap-2">
          <button type="button" aria-label="Drift" data-key="drift" {...handlers} className="label press h-11 w-16 touch-none rounded-full bg-paper/85 text-[0.5rem] text-ink shadow-lg ring-1 ring-ink/15 active:scale-95">
            Drift
          </button>
          <button type="button" aria-label="Brake and reverse" data-key="brake" data-buzz="10" {...handlers} className="label press flex h-20 w-16 touch-none items-end justify-center rounded-2xl bg-ink/85 pb-2 text-[0.5rem] text-paper shadow-xl ring-1 ring-paper/20 active:scale-95">
            Brake
          </button>
        </div>
        <div className="flex flex-col items-center gap-2">
          <button type="button" aria-label="Boost" data-key="boost" {...handlers} className="label press h-11 w-[4.5rem] touch-none rounded-full bg-ember text-[0.5rem] text-paper shadow-lg active:scale-95">
            Boost
          </button>
          <button type="button" aria-label="Gas" data-key="gas" data-buzz="8" {...handlers} className="label press flex h-28 w-[4.5rem] touch-none items-end justify-center rounded-2xl bg-paper/90 pb-3 text-[0.55rem] text-ink shadow-xl ring-1 ring-ink/15 active:scale-95 active:bg-paper">
            Gas
          </button>
        </div>
      </div>
      <button
        type="button"
        onPointerDown={() => {
          haptic(12);
          engine.current?.horn();
        }}
        aria-label="Horn"
        className="label press absolute h-10 rounded-full bg-paper/80 px-4 text-[0.5rem] text-ink shadow ring-1 ring-ink/10"
        style={{ left: "50%", transform: "translateX(-50%)", bottom: "max(16px, env(safe-area-inset-bottom))" }}
      >
        Beep beep
      </button>
    </>
  );
}

/** Photo mode: the HUD steps aside, drag to frame, then take the shot. */
function PhotoMode({ engine, onClose }: { engine: React.RefObject<DriveEngine | null>; onClose: () => void }) {
  const [shot, setShot] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const take = () => {
    haptic(15);
    const url = engine.current?.capture() ?? null;
    setFlash(true);
    setTimeout(() => setFlash(false), 180);
    if (url) setShot(url);
  };
  const share = async () => {
    if (!shot) return;
    try {
      const blob = await (await fetch(shot)).blob();
      const file = new File([blob], "island-drive.jpg", { type: "image/jpeg" });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: "Island Drive" });
    } catch {}
  };
  return (
    <>
      {flash && <div className="pointer-events-none absolute inset-0 bg-white/80" />}
      <div className="pointer-events-none absolute inset-6 rounded-sm border border-paper/40">
        <span className="label absolute top-3 left-3 rounded-full bg-ink/70 px-3 py-1.5 text-[0.5rem] text-paper">Photo mode · drag to frame</span>
      </div>
      <div className="absolute inset-x-0 flex items-center justify-center gap-5" style={{ bottom: "max(20px, env(safe-area-inset-bottom))" }}>
        <button type="button" onClick={onClose} className="label press rounded-full bg-paper/90 px-4 py-3 text-[0.55rem] text-ink shadow-lg">
          Done
        </button>
        <button type="button" onClick={take} aria-label="Take the photo" className="press flex h-16 w-16 items-center justify-center rounded-full bg-paper/90 shadow-xl ring-4 ring-ember/80">
          <span className="h-11 w-11 rounded-full bg-ember" />
        </button>
        <span className="w-16" />
      </div>
      {shot && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-ink/70 p-6 backdrop-blur-sm" onClick={() => setShot(null)}>
          <div className="animate-blob-in w-full max-w-lg rounded-2xl bg-paper p-3 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element -- generated in the browser */}
            <img src={shot} alt="Your Island Drive photo" className="w-full rounded-xl" />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <button type="button" onClick={() => setShot(null)} className="label press rounded-full px-4 py-2.5 text-[0.55rem] text-ink/70">
                Retake
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={share} className="label press rounded-full border border-ink/20 px-4 py-2.5 text-[0.55rem]">
                  Share
                </button>
                <a href={shot} download="island-drive.jpg" className="label press rounded-full bg-ink px-4 py-2.5 text-[0.55rem] text-paper">
                  Save
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SettingsSheet({
  settings,
  touch,
  onClose,
  onMode,
  onControls,
  onInvert,
  onAutoGas,
  onPaint,
  onMute,
  onTidy,
}: {
  settings: Settings;
  touch: boolean;
  onClose: () => void;
  onMode: (m: GameMode) => void;
  onControls: (c: Settings["controls"]) => void;
  onInvert: () => void;
  onAutoGas: () => void;
  onPaint: (p: PaintId) => void;
  onMute: () => void;
  onTidy: () => void;
}) {
  return (
    <div className="absolute inset-0 z-30 flex justify-end bg-ink/40 backdrop-blur-[2px]" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Island Drive settings"
        onClick={(e) => e.stopPropagation()}
        className="animate-pop-in h-full w-full max-w-sm overflow-y-auto bg-paper p-5 shadow-2xl md:p-7"
        style={{ paddingTop: "max(20px, env(safe-area-inset-top))", paddingRight: "max(20px, env(safe-area-inset-right))" }}
      >
        <div className="flex items-center justify-between">
          <p className="font-display text-3xl">Settings</p>
          <button type="button" onClick={onClose} aria-label="Close settings" className="press flex h-10 w-10 items-center justify-center rounded-full ring-1 ring-ink/15">
            ✕
          </button>
        </div>

        <p className="label mt-7 mb-2 text-[0.55rem] text-ink/50">Mode</p>
        <div className="space-y-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={settings.mode === m.id}
              onClick={() => onMode(m.id)}
              className="press block w-full rounded-xl px-4 py-3 text-left ring-1 ring-ink/15 aria-pressed:bg-ink aria-pressed:text-paper aria-pressed:ring-ink"
            >
              <span className="block font-display text-lg leading-tight">{m.label}</span>
              <span className="font-serif text-sm opacity-70">{m.line}</span>
            </button>
          ))}
        </div>

        {touch && (
          <>
            <p className="label mt-7 mb-2 text-[0.55rem] text-ink/50">Steering</p>
            <div className="grid grid-cols-2 gap-2">
              {(["buttons", "tilt"] as const).map((c) => (
                <button key={c} type="button" aria-pressed={settings.controls === c} onClick={() => onControls(c)} className="label press rounded-full px-3 py-2.5 text-[0.55rem] ring-1 ring-ink/15 aria-pressed:bg-ink aria-pressed:text-paper">
                  {c === "buttons" ? "Arrow buttons" : "Tilt the phone"}
                </button>
              ))}
            </div>
            {settings.controls === "tilt" && <Toggle on={settings.invertTilt} onClick={onInvert} label="Invert tilt" />}
            <Toggle on={settings.autoGas} onClick={onAutoGas} label="Auto-accelerate" detail="Gas stays on; hold Brake to slow down" />
          </>
        )}

        <p className="label mt-7 mb-2 text-[0.55rem] text-ink/50">Paint job</p>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(PAINTS) as PaintId[]).map((id) => (
            <button key={id} type="button" aria-pressed={settings.paint === id} onClick={() => onPaint(id)} className="press rounded-xl p-2 text-center ring-1 ring-ink/15 aria-pressed:ring-2 aria-pressed:ring-ember">
              <span className="mx-auto block h-8 w-12 rounded-md" style={{ background: `linear-gradient(180deg, ${PAINTS[id].bands[1]} 0 18%, ${PAINTS[id].body} 18% 72%, ${PAINTS[id].bands[0]} 72% 86%, #c9ccd1 86%)` }} />
              <span className="label mt-1.5 block text-[0.48rem]">{PAINTS[id].name}</span>
            </button>
          ))}
        </div>

        <p className="label mt-7 mb-2 text-[0.55rem] text-ink/50">Sound</p>
        <Toggle on={!settings.muted} onClick={onMute} label="Engine, horn and effects" />

        <p className="label mt-7 mb-2 text-[0.55rem] text-ink/50">The island</p>
        <button type="button" onClick={onTidy} className="press block w-full rounded-xl px-4 py-3 text-left ring-1 ring-ink/15">
          <span className="block font-serif text-lg leading-tight">Tidy up</span>
          <span className="font-serif text-sm text-ink/60">Set the pins, restack the crates, stand the cones back up</span>
        </button>

        {!touch && (
          <p className="mt-7 font-serif text-sm leading-relaxed text-ink/60">
            WASD or arrows to drive · Shift boost · Space drift · C camera · N time of day · H horn · P photo · R reset · Esc leave. Gamepads work too.
          </p>
        )}
      </div>
    </div>
  );
}

function Toggle({ on, onClick, label, detail }: { on: boolean; onClick: () => void; label: string; detail?: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={onClick} className="press mt-2 flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left ring-1 ring-ink/15">
      <span>
        <span className="block font-serif text-lg leading-tight">{label}</span>
        {detail && <span className="font-serif text-sm text-ink/60">{detail}</span>}
      </span>
      <span className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", on ? "bg-ember" : "bg-ink/20")}>
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-paper shadow transition-transform", on ? "translate-x-[22px]" : "translate-x-0.5")} />
      </span>
    </button>
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
