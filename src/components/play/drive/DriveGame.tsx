"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/Icon";
import { haptic } from "@/lib/haptics";
import { useImmersive } from "@/lib/immersive";
import { cn } from "@/lib/utils";
import { PAINTS, type PaintId } from "./car";
import type { CameraMode, DriveEngine, DrsState, GameMode, RaceUpdate, TimeOfDay } from "./engine";
import { detectGraphics } from "./quality";
import type { Ghost } from "./race";
import { landmarks, trophies, type Landmark } from "./track";

const SETTINGS_KEY = "bay-circuit-settings";
const BEST_KEY = "bay-circuit-best";
const GHOST_KEY = "bay-circuit-ghost";
const TROPHY_KEY = "bay-circuit-trophies";

const fmt = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms / 1000) % 60)).padStart(2, "0")}.${String(Math.floor(ms % 1000)).padStart(3, "0")}`;
const secs = (ms: number) => (ms / 1000).toFixed(3);
const signed = (ms: number) => `${ms > 0 ? "+" : "−"}${(Math.abs(ms) / 1000).toFixed(3)}`;

const CAMERA_LABEL: Record<CameraMode, string> = {
  chase: "Chase cam",
  diorama: "Diorama",
  onboard: "Onboard",
  map: "Map view",
};
const TIME_LABEL: Record<TimeOfDay, string> = {
  night: "Night race",
  golden: "Golden hour",
  day: "Daytime",
};

const MODES: { id: GameMode; label: string; line: string }[] = [
  {
    id: "race",
    label: "Hot lap",
    line: "Start lights, three sectors and a best lap to beat, with your ghost alongside",
  },
  {
    id: "free",
    label: "Free roam",
    line: `No clock: drive the circuit and pit lane, visit the project pavilions, find ${trophies.length} hidden trophies`,
  },
];

interface Settings {
  mode: GameMode;
  controls: "buttons" | "tilt";
  invertTilt: boolean;
  autoGas: boolean;
  /** Braking assist; null means "on for touch screens, off otherwise". */
  brakeAssist: boolean | null;
  ghost: boolean;
  paint: PaintId;
  muted: boolean;
}
const DEFAULTS: Settings = {
  mode: "race",
  controls: "buttons",
  invertTilt: false,
  autoGas: false,
  brakeAssist: null,
  ghost: true,
  paint: "ember",
  muted: false,
};

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

/** Settings from storage, with anything stale or unknown put back to the defaults. */
function loadSettings(): Settings {
  let s: Partial<Settings> = {};
  try {
    s = JSON.parse(read(SETTINGS_KEY) ?? "{}") as Partial<Settings>;
  } catch {}
  return {
    mode: s.mode === "free" ? "free" : "race",
    controls: s.controls === "tilt" ? "tilt" : "buttons",
    invertTilt: !!s.invertTilt,
    autoGas: !!s.autoGas,
    brakeAssist: typeof s.brakeAssist === "boolean" ? s.brakeAssist : null,
    ghost: s.ghost !== false,
    paint: s.paint && s.paint in PAINTS ? s.paint : "ember",
    muted: !!s.muted,
  };
}

interface Split {
  index: number;
  ms: number;
  delta: number | null;
  best: boolean;
}

/** Bay Street Circuit: a night street race, with Neil's projects in the paddock. */
export default function DriveGame() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null);
  const speedRef = useRef<HTMLSpanElement>(null);
  const gearRef = useRef<HTMLSpanElement>(null);
  const timerRef = useRef<HTMLSpanElement>(null);
  const deltaRef = useRef<HTMLSpanElement>(null);
  const revsRef = useRef<HTMLDivElement>(null);
  const engine = useRef<DriveEngine | null>(null);
  const zoneLink = useRef<HTMLAnchorElement>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "driving" | "unsupported">("loading");
  const [zone, setZone] = useState<Landmark | null>(null);
  const [found, setFound] = useState(0);
  const [toast, setToast] = useState<{
    text: string;
    tone?: "good" | "bad";
  } | null>(null);
  const [touch, setTouch] = useState(false);
  const [portrait, setPortrait] = useState(false);
  const [allowPortrait, setAllowPortrait] = useState(false);
  const [camera, setCamera] = useState<CameraMode>("chase");
  const [time, setTime] = useState<TimeOfDay>("night");
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [sheet, setSheet] = useState(false);
  const [photo, setPhoto] = useState(false);
  const [lights, setLights] = useState(-1);
  const [lapNo, setLapNo] = useState(0);
  const [invalid, setInvalid] = useState(false);
  const [best, setBest] = useState<number | null>(null);
  const [lastLap, setLastLap] = useState<{ ms: number; valid: boolean } | null>(null);
  const [splits, setSplits] = useState<Split[]>([]);
  const [drs, setDrs] = useState<DrsState>("off");
  const [inPit, setInPit] = useState(false);
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

  const say = (text: string, tone?: "good" | "bad") => setToast({ text, tone });

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
    const stored = loadSettings();
    let trophiesFound: number[] = [];
    try {
      const list: unknown = JSON.parse(read(TROPHY_KEY) ?? "[]");
      if (Array.isArray(list)) trophiesFound = list.filter((i): i is number => Number.isInteger(i) && i >= 0 && i < trophies.length);
    } catch {}
    let bestStored: { ms: number | null; sectors: (number | null)[] } | null = null;
    let ghost: Ghost | null = null;
    try {
      const b = JSON.parse(read(BEST_KEY) ?? "null") as {
        ms?: number;
        sectors?: (number | null)[];
      } | null;
      if (b && Array.isArray(b.sectors))
        bestStored = {
          ms: typeof b.ms === "number" && b.ms > 10000 ? b.ms : null,
          sectors: b.sectors.slice(0, 3).map((n) => (typeof n === "number" ? n : null)),
        };
      const g = JSON.parse(read(GHOST_KEY) ?? "null") as Ghost | null;
      if (g && Array.isArray(g.frames) && g.frames.every((n) => typeof n === "number")) ghost = g;
    } catch {}
    queueMicrotask(() => {
      setTouch(coarse);
      setSettings(stored);
      setFound(trophiesFound.length);
      setBest(bestStored?.ms ?? null);
    });

    import("./engine").then(({ createDriveEngine }) => {
      if (cancelled) return;
      try {
        // Graphics tier: the GPU's name, memory and screen, or ?gfx=low|medium|high
        const graphics = detectGraphics(coarse);
        const e = createDriveEngine(
          canvas,
          {
            quality: graphics.quality,
            graphics,
            reducedMotion,
            touch: coarse,
            labels: labelsRef.current!,
            minimap: minimapRef.current,
            hud: {
              speed: speedRef.current,
              gear: gearRef.current,
              timer: timerRef.current,
              delta: deltaRef.current,
              revs: revsRef.current,
            },
          },
          {
            onReady: () => setPhase((p) => (p === "loading" ? "ready" : p)),
            onZone: (l) => {
              setZone(l);
              if (l) haptic(8);
            },
            onPlace: (place) => place && say(`${place.name} · ${place.line}`),
            onTrophy: (index, _n, total) => {
              if (!trophiesFound.includes(index)) trophiesFound = [...trophiesFound, index];
              write(TROPHY_KEY, JSON.stringify(trophiesFound));
              setFound(trophiesFound.length);
              haptic(20);
              say(trophiesFound.length === total ? `Every trophy found · ${total} of ${total}` : `Hidden trophy · ${trophiesFound.length} of ${total}`, "good");
            },
            onRace: (u: RaceUpdate) => onRace(u),
            onDrs: (s) => setDrs(s),
            onPit: (p) => setInPit(p),
            onCamera: (m) => setCamera(m),
            onTime: (t) => setTime(t),
          },
        );
        engine.current = e;
        e.setMuted(stored.muted);
        e.setPaint(stored.paint);
        e.setTrophies(trophiesFound);
        e.setAssist({
          brake: stored.brakeAssist ?? coarse,
          ghost: stored.ghost,
        });
        e.restore(bestStored?.ms ?? null, bestStored?.sectors ?? null, ghost);
      } catch {
        setPhase("unsupported");
      }
    });

    // Timing events: lights, splits, laps, penalties
    let bestSectors: (number | null)[] = bestStored?.sectors ?? [null, null, null];
    let bestMs = bestStored?.ms ?? null;
    function onRace(u: RaceUpdate) {
      setLapNo(u.lapNo);
      setInvalid(u.invalid);
      if (u.bestSectors) bestSectors = u.bestSectors;
      if (u.lights !== undefined) setLights(u.go ? 0 : u.lights);
      if (u.go) {
        haptic(15);
        setSplits([]);
        setTimeout(() => setLights(-1), 900);
      }
      if (u.jumpStart) say("Jump start · 5 s penalty", "bad");
      if (u.limits) say("Track limits · lap deleted", "bad");
      if (u.sector) {
        const s = u.sector;
        setSplits((prev) => (s.index === 0 ? [s] : [...prev.filter((p) => p.index < s.index), s]));
      }
      if (u.lap) {
        const l = u.lap;
        setLastLap({ ms: l.ms, valid: l.valid });
        if (l.best) {
          setBest(l.ms);
          bestMs = Math.round(l.ms);
          write(BEST_KEY, JSON.stringify({ ms: bestMs, sectors: bestSectors }));
          if (u.ghost) write(GHOST_KEY, JSON.stringify(u.ghost));
          say(`Best lap · ${fmt(l.ms)}`, "good");
          haptic(30);
        } else say(l.valid ? `Lap ${l.lap} · ${fmt(l.ms)}` : `Lap ${l.lap} · deleted`, l.valid ? undefined : "bad");
      } else if (u.sector?.best) write(BEST_KEY, JSON.stringify({ ms: bestMs, sectors: bestSectors }));
    }

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
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

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

  const start = () => {
    haptic(10);
    const e = engine.current;
    if (!e) return;
    setSplits([]);
    setLastLap(null);
    e.drive(settings.mode);
    setPhase("driving");
    canvasRef.current?.focus({ preventScroll: true });
    // Phones: go full screen and ask for landscape (Android honours it; iPhone shows the rotate hint)
    if (touch) {
      const el = rootRef.current as (HTMLDivElement & { webkitRequestFullscreen?: () => void }) | null;
      const lock = () =>
        (
          screen.orientation as ScreenOrientation & {
            lock?: (o: string) => Promise<void>;
          }
        )
          ?.lock?.("landscape")
          .catch(() => {});
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
    setLights(-1);
    setInPit(false);
    setDrs("off");
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  };

  const chooseMode = (mode: GameMode) => {
    haptic();
    save({ mode });
    setSplits([]);
    setLastLap(null);
    setLights(-1);
    engine.current?.setMode(mode);
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

  const setAssist = (patch: Partial<Pick<Settings, "brakeAssist" | "ghost">>) => {
    const next = { ...settings, ...patch };
    save(patch);
    engine.current?.setAssist({
      brake: next.brakeAssist ?? touch,
      ghost: next.ghost,
    });
  };

  const chooseControls = async (controls: Settings["controls"]) => {
    if (controls === "tilt") {
      const DOE = (
        window as unknown as {
          DeviceOrientationEvent?: {
            requestPermission?: () => Promise<string>;
          };
        }
      ).DeviceOrientationEvent;
      if (!DOE) return say("This device can't tilt-steer");
      if (DOE.requestPermission) {
        const answer = await DOE.requestPermission().catch(() => "denied");
        if (answer !== "granted") return say("Tilt needs motion access");
      }
    }
    haptic();
    save({ controls });
  };

  // Is the circuit's hero on screen? Before driving, its keys only apply while it is.
  const heroVisible = useRef(true);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => (heroVisible.current = entry.intersectionRatio > 0.35), { threshold: [0, 0.35, 0.6] });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Keyboard: Enter starts / opens, M mute, P photo, Esc leaves
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      const k = e.key.toLowerCase();
      if (e.key === "Enter" && phase === "ready") {
        // Only from the hero itself (or nowhere in particular), never from a button, a link or another game on the page
        const target = e.target instanceof Element ? e.target : null;
        const fromPage = !target || target === document.body || target === document.documentElement;
        const fromHero = !!target && !!rootRef.current?.contains(target) && !target.closest("button, a, input, select, textarea, [role=button], [role=radio]");
        if (heroVisible.current && !e.repeat && (fromPage || fromHero)) {
          e.preventDefault();
          start();
        }
        return;
      }
      // Everything else is for the game while it owns the screen
      if (!driving || e.repeat) return;
      if (e.key === "Escape") {
        if (sheet) setSheet(false);
        else if (photo) setPhoto(false);
        else exit();
      } else if (e.key === "Enter" && zone) zoneLink.current?.click();
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
  const race = settings.mode === "race";

  return (
    <div
      ref={rootRef}
      // Before the race starts the circuit is just a backdrop: phones must be
      // able to swipe past it to the rest of the page.
      className={cn("overflow-hidden select-none", driving ? "fixed inset-0 z-[70] touch-none bg-ink" : "relative h-[86svh] w-full touch-pan-y bg-paper md:h-[100svh]")}
      data-lenis-prevent={driving || undefined}
    >
      {/* The stage: framed under the site's nav on the page, full screen while driving */}
      <div className={cn("absolute inset-x-0 bottom-0 overflow-clip bg-ink", driving ? "top-0" : "top-16 md:top-20")}>
        <canvas
          ref={canvasRef}
          tabIndex={-1}
          aria-label="Bay Street Circuit: a 3D night race past Neil's projects"
          className={cn("block h-full w-full outline-none", driving && "cursor-grab active:cursor-grabbing")}
          onPointerDown={onLookStart}
          onPointerMove={onLookMove}
          onPointerUp={onLookEnd}
          onPointerCancel={onLookEnd}
        />

        {/* Pavilion labels, positioned from 3D every frame (kept off the title card) */}
        <div ref={labelsRef} aria-hidden className={cn("pointer-events-none absolute inset-0 transition-opacity", (photo || !driving) && "opacity-0")}>
          {landmarks.map((l) => (
            <div key={l.id} data-landmark={l.id} className="group absolute top-0 left-0 opacity-0 transition-opacity duration-300 will-change-transform data-[active=true]:z-10">
              <span className="label block rounded-full bg-paper/90 px-3 py-1.5 text-[0.52rem] whitespace-nowrap text-ink shadow-[0_8px_20px_-10px_rgb(0_0_0/0.6)] ring-1 ring-ink/10 transition-[background-color,color,transform] duration-300 group-data-[active=true]:scale-110 group-data-[active=true]:bg-ember group-data-[active=true]:text-paper">
                {l.title}
              </span>
              <span className="mx-auto block h-3 w-px bg-paper/50" />
            </div>
          ))}
        </div>

        {/* HUD: timing on the left, tools and the map on the right */}
        <div
          className={cn("pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 transition-opacity duration-500", showHud ? "opacity-100" : "opacity-0")}
          style={{
            padding: "max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) 0 max(12px, env(safe-area-inset-left))",
          }}
        >
          <div className="flex flex-col items-start gap-2">
            <TimingCard race={race} lapNo={lapNo} invalid={invalid} best={best} lastLap={lastLap} found={found} timerRef={timerRef} deltaRef={deltaRef} speedRef={speedRef} gearRef={gearRef} revsRef={revsRef} drs={drs} />
            {race && splits.length > 0 && <Splits splits={splits} />}
          </div>

          <div className="pointer-events-auto flex flex-col items-end gap-2">
            <div className="flex gap-1.5">
              <HudButton onClick={() => engine.current?.cycleCamera()} label={`View: ${CAMERA_LABEL[camera]}`} hint="C">
                <svg viewBox="0 0 24 24" aria-hidden className="h-[18px] w-[18px] fill-none stroke-current stroke-[1.75] [stroke-linecap:round] [stroke-linejoin:round]">
                  <path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                </svg>
              </HudButton>
              <HudButton onClick={() => engine.current?.cycleTime()} label={TIME_LABEL[time]} hint="N">
                <svg viewBox="0 0 24 24" aria-hidden className="h-[18px] w-[18px] fill-none stroke-current stroke-[1.75] [stroke-linecap:round] [stroke-linejoin:round]">
                  {time === "night" ? (
                    <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" />
                  ) : (
                    <path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                  )}
                </svg>
              </HudButton>
              <HudButton onClick={() => setPhoto(true)} label="Photo mode" hint="P">
                <Icon name="camera" className="h-[18px] w-[18px]" />
              </HudButton>
              <HudButton onClick={() => setSheet(true)} label="Settings" hint="">
                <Icon name="menu" className="h-[18px] w-[18px]" />
              </HudButton>
              <HudButton onClick={exit} label="Leave the circuit" hint="Esc" dark>
                <Icon name="close" className="h-[18px] w-[18px]" />
              </HudButton>
            </div>
            <canvas ref={minimapRef} width={160} height={160} aria-hidden className="h-[84px] w-[84px] rounded-2xl bg-ink/70 shadow-lg ring-1 ring-paper/15 backdrop-blur md:h-[150px] md:w-[150px] [@media(max-height:560px)]:h-[96px] [@media(max-height:560px)]:w-[96px]" />
          </div>
        </div>

        {/* Start lights, mirrored in the HUD while they run */}
        {showHud && race && lights >= 0 && (
          <div aria-live="polite" className="pointer-events-none absolute inset-x-0 flex justify-center" style={{ top: "max(64px, calc(env(safe-area-inset-top) + 52px))" }}>
            <div className="flex gap-2 rounded-2xl bg-[#07090c]/90 px-3 py-2.5 shadow-xl ring-1 ring-paper/10">
              {[0, 1, 2, 3, 4].map((i) => (
                <span key={i} className="flex flex-col gap-1.5">
                  {[0, 1].map((r) => (
                    <span key={r} className={cn("block h-5 w-5 rounded-full transition-colors duration-75 md:h-6 md:w-6", i < lights ? "bg-[#ff2a1f] shadow-[0_0_14px_2px_rgb(255_42_31/0.75)]" : "bg-[#2a0d0d]")} />
                  ))}
                </span>
              ))}
              <span className="sr-only">{lights === 0 ? "Lights out" : `${lights} of 5 lights`}</span>
            </div>
          </div>
        )}

        {/* Where you are: the pit limiter, and a pavilion to open (a small chip, never a popup) */}
        {showHud && (
          <div className="pointer-events-none absolute inset-x-0 flex flex-col items-center gap-2 px-28" style={{ top: "max(14px, env(safe-area-inset-top))" }}>
            {inPit && <span className="label rounded-full bg-[#ffd27a] px-3.5 py-2 text-[0.52rem] text-ink shadow-lg">Pit limiter · 80 km/h</span>}
            {zone && (
              <Link
                key={zone.id}
                ref={zoneLink}
                href={zone.href}
                className="animate-blob-in pointer-events-auto flex max-w-full origin-top items-center gap-2 rounded-full bg-paper/95 py-1.5 pr-1.5 pl-4 text-ink shadow-xl ring-1 ring-ink/10 backdrop-blur"
              >
                <span className="min-w-0">
                  <span className="block truncate font-display text-base leading-none">{zone.title}</span>
                  <span className="hidden truncate font-serif text-xs text-ink/60 italic md:block">{zone.line}</span>
                </span>
                <span className="label flex shrink-0 items-center gap-1.5 rounded-full bg-ember px-3 py-1.5 text-[0.5rem] text-paper">
                  Open <Icon name="arrow-right" />
                </span>
              </Link>
            )}
          </div>
        )}

        {toast && showHud && (
          <p
            key={toast.text}
            role="status"
            className={cn(
              "animate-blob-in label pointer-events-none absolute top-[30%] left-1/2 -translate-x-1/2 rounded-full px-5 py-3 text-[0.6rem] whitespace-nowrap shadow-xl",
              toast.tone === "bad" ? "bg-ember text-paper" : toast.tone === "good" ? "bg-sky text-ink" : "bg-ink/90 text-paper",
            )}
          >
            {toast.text}
          </p>
        )}

        {touch && showHud && <TouchControls engine={engine} settingsRef={settingsRef} tilt={settings.controls === "tilt"} drs={drs} />}

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
            onBrakeAssist={() => setAssist({ brakeAssist: !(settings.brakeAssist ?? touch) })}
            onGhost={() => setAssist({ ghost: !settings.ghost })}
            onPaint={choosePaint}
            onMute={toggleMute}
            onRestart={() => {
              haptic();
              engine.current?.reset();
              setSheet(false);
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
            <p className="max-w-xs font-serif text-lg text-paper/75 italic">The circuit plays best in landscape: more track ahead, and a thumb for each side.</p>
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

        {/* Title card over the broadcast shots */}
        <div
          className={cn(
            "absolute inset-0 flex items-end justify-center overflow-clip bg-gradient-to-t from-ink via-ink/55 to-ink/10 px-5 pb-14 text-paper transition-opacity duration-700 md:items-center md:bg-[radial-gradient(ellipse_at_center,rgb(0_48_73/0.78),rgb(0_48_73/0.25)_70%)] md:pb-0",
            driving ? "pointer-events-none opacity-0" : "opacity-100",
          )}
        >
          <div className="max-w-xl text-center">
            <p className="label text-[#ffb3a8]">Play · Bay Street Circuit</p>
            <h1 className="mt-3 font-display text-[clamp(2.8rem,min(9vw,10svh),7rem)] leading-[0.95] [@media(max-height:560px)]:mt-1 [@media(max-height:560px)]:text-[clamp(2rem,6.5vw,3.2rem)]">
              Skip the reading. <em className="font-serif text-[#ff8a7a]">Take a lap.</em>
            </h1>
            <p className="mx-auto mt-4 max-w-md font-serif text-xl leading-snug text-paper/80 [@media(max-height:560px)]:hidden">
              A floodlit street circuit on the water, built in three.js. Chase a lap time against your own ghost, or cruise the paddock, where every pavilion opens one of Neil&apos;s projects.
            </p>
            <div role="radiogroup" aria-label="Game mode" className="mx-auto mt-6 inline-flex rounded-full bg-paper/10 p-1 ring-1 ring-paper/20 backdrop-blur [@media(max-height:560px)]:mt-3">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={settings.mode === m.id}
                  onClick={() => chooseMode(m.id)}
                  className="label press rounded-full px-4 py-2 text-[0.55rem] text-paper/80 transition-colors aria-checked:bg-paper aria-checked:text-ink"
                >
                  {m.label}
                </button>
              ))}
            </div>
            <p className="mt-2 font-serif text-sm text-paper/65 italic [@media(max-height:560px)]:hidden">{MODES.find((m) => m.id === settings.mode)?.line}</p>
            {best && settings.mode === "race" && <p className="label mt-2 text-[0.52rem] text-paper/55">Your best · {fmt(best)}</p>}
            <button type="button" onClick={start} disabled={phase === "loading"} className="btn mt-6 bg-ember text-paper hover:bg-paper hover:text-ink disabled:opacity-50 [@media(max-height:560px)]:mt-3">
              {phase === "loading" ? "Building the circuit…" : "Start the engine"} <Icon name="arrow-right" className="arrow" />
            </button>
            <p className="label mt-5 text-[0.52rem] leading-relaxed text-paper/50 [@media(max-height:560px)]:hidden">
              {touch ? "Best in landscape · steer on the left · throttle, brake and DRS on the right" : "W S or arrows drive · Shift DRS · C camera · N time of day · R restart · P photo · Esc leave · gamepads work too"}
            </p>
          </div>
        </div>

        {!driving && (
          <a href="#arcade" className="label press absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2 text-[0.52rem] text-paper/60 hover:text-paper md:bottom-5 [@media(max-height:560px)]:hidden">
            More games below <Icon name="arrow-down" className="animate-bounce-dot" />
          </a>
        )}
      </div>
    </div>
  );
}

function TimingCard({
  race,
  lapNo,
  invalid,
  best,
  lastLap,
  found,
  timerRef,
  deltaRef,
  speedRef,
  gearRef,
  revsRef,
  drs,
}: {
  race: boolean;
  lapNo: number;
  invalid: boolean;
  best: number | null;
  lastLap: { ms: number; valid: boolean } | null;
  found: number;
  timerRef: React.RefObject<HTMLSpanElement | null>;
  deltaRef: React.RefObject<HTMLSpanElement | null>;
  speedRef: React.RefObject<HTMLSpanElement | null>;
  gearRef: React.RefObject<HTMLSpanElement | null>;
  revsRef: React.RefObject<HTMLDivElement | null>;
  drs: DrsState;
}) {
  return (
    <div className="pointer-events-auto w-fit rounded-2xl bg-[#0b1018]/85 px-3.5 py-2.5 text-paper shadow-lg ring-1 ring-paper/10 backdrop-blur md:px-4 md:py-3">
      {/* Shift lights */}
      <div ref={revsRef} aria-hidden className="mb-2 flex gap-[3px]">
        {Array.from({ length: 15 }, (_, i) => (
          <span key={i} data-on="false" className={cn("h-1.5 flex-1 rounded-full bg-paper/10 transition-colors duration-75", i < 5 ? "data-[on=true]:bg-sky" : i < 10 ? "data-[on=true]:bg-ember" : "data-[on=true]:bg-[#ffd27a]")} />
        ))}
      </div>
      <div className="flex items-stretch gap-3">
        <div className="min-w-[6.5rem]">
          <p className="label flex items-center gap-1.5 text-[0.48rem] text-paper/55">
            {race ? (
              <>
                {lapNo > 0 ? `Lap ${lapNo}` : "Hot lap"}
                {invalid && <span className="rounded-full bg-ember px-1.5 py-0.5 text-paper">Invalid</span>}
              </>
            ) : (
              "Free roam"
            )}
          </p>
          {race ? (
            <>
              <p className="mt-1 font-display text-xl leading-none tabular-nums md:text-2xl">
                <span ref={timerRef}>--:--.---</span>
              </p>
              <p className="mt-1 flex items-center gap-2 font-mono text-[0.6rem] text-paper/55 tabular-nums">
                <span ref={deltaRef} className="data-[sign=fast]:text-sky data-[sign=slow]:text-[#ff8a7a]" />
                {best ? <span>Best {fmt(best)}</span> : lastLap ? <span>Last {fmt(lastLap.ms)}</span> : <span>No lap yet</span>}
              </p>
            </>
          ) : (
            <p className="mt-1 flex items-center gap-1.5 font-display text-xl leading-none md:text-2xl" title="Hidden trophies found">
              <Icon name="trophy" className="h-5 w-5 text-[#ffd27a]" />
              <span className="tabular-nums">
                {found}/{trophies.length}
              </span>
            </p>
          )}
        </div>
        <div className="border-l border-paper/10 pl-3 text-right">
          <p className="flex items-baseline justify-end gap-2 font-display text-xl leading-none tabular-nums md:text-2xl">
            <span ref={speedRef}>0</span>
            <span ref={gearRef} className="rounded-md bg-paper px-1.5 py-0.5 font-mono text-sm leading-none text-ink">
              N
            </span>
          </p>
          <p className="label mt-1.5 flex items-center justify-end gap-1.5 text-[0.48rem] text-paper/50">
            km/h
            <span className={cn("rounded px-1.5 py-0.5 transition-colors", drs === "open" ? "bg-sky text-ink" : drs === "ready" ? "text-paper ring-1 ring-sky/70" : "text-paper/30 ring-1 ring-paper/15")}>DRS</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function Splits({ splits }: { splits: Split[] }) {
  return (
    <div className="pointer-events-none flex gap-1.5">
      {splits.map((s) => (
        <span key={s.index} className={cn("rounded-lg px-2 py-1.5 font-mono text-[0.6rem] leading-tight tabular-nums shadow", s.best ? "bg-sky text-ink" : "bg-[#0b1018]/85 text-paper ring-1 ring-paper/10")}>
          <span className="label block text-[0.45rem] opacity-60">S{s.index + 1}</span>
          {secs(s.ms)}
          {s.delta != null && <span className={cn("ml-1", s.best ? "text-ink/70" : "text-[#ff8a7a]")}>{signed(s.delta)}</span>}
        </span>
      ))}
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
      className={cn(
        "press flex h-10 w-10 items-center justify-center rounded-full shadow-lg ring-1 md:h-11 md:w-11",
        dark ? "bg-ember text-paper ring-ember hover:bg-paper hover:text-ink" : "bg-[#0b1018]/80 text-paper ring-paper/15 backdrop-blur hover:bg-[#0b1018]",
      )}
    >
      {children}
    </button>
  );
}

/**
 * Phones: steering (buttons or tilt) under the left thumb, throttle, brake and
 * DRS under the right. Every button tracks its own finger, so they combine freely.
 */
function TouchControls({ engine, settingsRef, tilt, drs }: { engine: React.RefObject<DriveEngine | null>; settingsRef: React.RefObject<Settings>; tilt: boolean; drs: DrsState }) {
  const held = useRef({
    left: false,
    right: false,
    gas: false,
    brake: false,
    drs: false,
    tilt: 0,
  });

  const apply = () => {
    const h = held.current;
    const s = settingsRef.current;
    const steer = s.controls === "tilt" ? h.tilt : (h.right ? 1 : 0) - (h.left ? 1 : 0);
    const throttle = h.brake ? -1 : h.gas || s.autoGas ? 1 : 0;
    engine.current?.setControls({ steer, throttle, drs: h.drs });
  };

  useEffect(() => {
    const e = engine.current;
    apply();
    return () => e?.setControls({ steer: 0, throttle: 0, drs: false });
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

  return (
    <>
      {!tilt && (
        <div
          className="absolute flex gap-3"
          style={{
            left: "max(16px, env(safe-area-inset-left))",
            bottom: "max(16px, env(safe-area-inset-bottom))",
          }}
        >
          {(["left", "right"] as const).map((side) => (
            <button
              key={side}
              type="button"
              aria-label={`Steer ${side}`}
              data-key={side}
              {...handlers}
              className="press flex h-[4.75rem] w-[4.75rem] touch-none items-center justify-center rounded-full bg-[#0b1018]/70 text-paper shadow-xl ring-1 ring-paper/20 backdrop-blur active:scale-95 active:bg-[#0b1018]/90"
            >
              <Icon name={side === "left" ? "chevron-left" : "chevron-right"} className="h-9 w-9" strokeWidth={2.5} />
            </button>
          ))}
        </div>
      )}
      {tilt && (
        <p
          className="label pointer-events-none absolute rounded-full bg-[#0b1018]/70 px-3 py-2 text-[0.5rem] text-paper/80"
          style={{
            left: "max(16px, env(safe-area-inset-left))",
            bottom: "max(16px, env(safe-area-inset-bottom))",
          }}
        >
          Tilt to steer
        </p>
      )}

      <div
        className="absolute flex items-end gap-3"
        style={{
          right: "max(16px, env(safe-area-inset-right))",
          bottom: "max(16px, env(safe-area-inset-bottom))",
        }}
      >
        <button
          type="button"
          aria-label="Brake"
          data-key="brake"
          data-buzz="10"
          {...handlers}
          className="label press flex h-20 w-16 touch-none items-end justify-center rounded-2xl bg-[#0b1018]/75 pb-2.5 text-[0.5rem] text-paper shadow-xl ring-1 ring-paper/20 backdrop-blur active:scale-95"
        >
          Brake
        </button>
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            aria-label="DRS"
            data-key="drs"
            {...handlers}
            className={cn(
              "label press h-11 w-[4.75rem] touch-none rounded-full text-[0.5rem] shadow-lg ring-1 active:scale-95",
              drs === "open" ? "bg-sky text-ink ring-sky" : drs === "ready" ? "bg-[#0b1018]/75 text-paper ring-sky" : "bg-[#0b1018]/60 text-paper/40 ring-paper/15",
            )}
          >
            DRS
          </button>
          <button
            type="button"
            aria-label="Throttle"
            data-key="gas"
            data-buzz="8"
            {...handlers}
            className="label press flex h-28 w-[4.75rem] touch-none items-end justify-center rounded-2xl bg-ember pb-3 text-[0.55rem] text-paper shadow-xl active:scale-95"
          >
            Throttle
          </button>
        </div>
      </div>
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
      const file = new File([blob], "bay-street-circuit.jpg", {
        type: "image/jpeg",
      });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: "Bay Street Circuit" });
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
            <img src={shot} alt="Your Bay Street Circuit photo" className="w-full rounded-xl" />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <button type="button" onClick={() => setShot(null)} className="label press rounded-full px-4 py-2.5 text-[0.55rem] text-ink/70">
                Retake
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={share} className="label press flex items-center gap-1.5 rounded-full border border-ink/20 px-4 py-2.5 text-[0.55rem]">
                  <Icon name="share" /> Share
                </button>
                <a href={shot} download="bay-street-circuit.jpg" className="label press flex items-center gap-1.5 rounded-full bg-ink px-4 py-2.5 text-[0.55rem] text-paper">
                  <Icon name="download" /> Save
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
  onBrakeAssist,
  onGhost,
  onPaint,
  onMute,
  onRestart,
}: {
  settings: Settings;
  touch: boolean;
  onClose: () => void;
  onMode: (m: GameMode) => void;
  onControls: (c: Settings["controls"]) => void;
  onInvert: () => void;
  onAutoGas: () => void;
  onBrakeAssist: () => void;
  onGhost: () => void;
  onPaint: (p: PaintId) => void;
  onMute: () => void;
  onRestart: () => void;
}) {
  return (
    <div className="absolute inset-0 z-30 flex justify-end bg-ink/40 backdrop-blur-[2px]" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Circuit settings"
        onClick={(e) => e.stopPropagation()}
        className="animate-pop-in h-full w-full max-w-sm overflow-y-auto bg-paper p-5 shadow-2xl md:p-7"
        style={{
          paddingTop: "max(20px, env(safe-area-inset-top))",
          paddingRight: "max(20px, env(safe-area-inset-right))",
        }}
      >
        <div className="flex items-center justify-between">
          <p className="font-display text-3xl">Settings</p>
          <button type="button" onClick={onClose} aria-label="Close settings" className="press flex h-10 w-10 items-center justify-center rounded-full ring-1 ring-ink/15">
            <Icon name="close" />
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
        <button type="button" onClick={onRestart} className="press mt-2 flex w-full items-center justify-between rounded-xl px-4 py-3 text-left ring-1 ring-ink/15">
          <span>
            <span className="block font-serif text-lg leading-tight">{settings.mode === "race" ? "Back to the grid" : "Back on track"}</span>
            <span className="font-serif text-sm text-ink/60">{settings.mode === "race" ? "Restart from the start lights (R)" : "Put the car back on the racing line (R)"}</span>
          </span>
          <Icon name="refresh" className="h-5 w-5 text-ink/60" />
        </button>

        <p className="label mt-7 mb-2 text-[0.55rem] text-ink/50">Driving aids</p>
        <Toggle on={settings.brakeAssist ?? touch} onClick={onBrakeAssist} label="Braking assist" detail="Brakes for the corner ahead when you arrive too fast" />
        <Toggle on={settings.ghost} onClick={onGhost} label="Ghost of your best lap" detail="Rides along in hot laps, with the live gap in the timer" />

        {touch && (
          <>
            <p className="label mt-7 mb-2 text-[0.55rem] text-ink/50">Steering</p>
            <div className="grid grid-cols-2 gap-2">
              {(["buttons", "tilt"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={settings.controls === c}
                  onClick={() => onControls(c)}
                  className="label press rounded-full px-3 py-2.5 text-[0.55rem] ring-1 ring-ink/15 aria-pressed:bg-ink aria-pressed:text-paper"
                >
                  {c === "buttons" ? "Arrow buttons" : "Tilt the phone"}
                </button>
              ))}
            </div>
            {settings.controls === "tilt" && <Toggle on={settings.invertTilt} onClick={onInvert} label="Invert tilt" />}
            <Toggle on={settings.autoGas} onClick={onAutoGas} label="Auto-throttle" detail="Throttle stays on; hold Brake to slow down" />
          </>
        )}

        <p className="label mt-7 mb-2 text-[0.55rem] text-ink/50">Livery</p>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(PAINTS) as PaintId[]).map((id) => (
            <button key={id} type="button" aria-pressed={settings.paint === id} onClick={() => onPaint(id)} className="press rounded-xl p-2 text-center ring-1 ring-ink/15 aria-pressed:ring-2 aria-pressed:ring-ember">
              <span
                className="mx-auto block h-8 w-12 rounded-md"
                style={{
                  background: `linear-gradient(180deg, ${PAINTS[id].primary} 0 58%, ${PAINTS[id].secondary} 58% 80%, ${PAINTS[id].accent} 80%)`,
                }}
              />
              <span className="label mt-1.5 block text-[0.48rem]">{PAINTS[id].name}</span>
            </button>
          ))}
        </div>

        <p className="label mt-7 mb-2 text-[0.55rem] text-ink/50">Sound</p>
        <Toggle on={!settings.muted} onClick={onMute} label="Engine and effects" />

        {!touch && (
          <p className="mt-7 font-serif text-sm leading-relaxed text-ink/60">
            W and S or the arrows to drive · Shift for DRS on the straights · C camera · N time of day · R restart · P photo · M mute · Esc leave. Gamepads work too: triggers to drive, A for DRS.
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

/** No WebGL 2 (very old phones, some locked-down browsers): the pavilions as a list. */
function Fallback() {
  return (
    <div className="mx-auto max-w-3xl px-5 pt-32 pb-16">
      <p className="label text-ember">Bay Street Circuit</p>
      <h1 className="mt-3 font-display text-5xl leading-tight">This browser can&apos;t draw the circuit.</h1>
      <p className="mt-4 font-serif text-xl text-ink/75">Here&apos;s every pavilion on it instead:</p>
      <ul className="mt-8 divide-y divide-ink/10 border-y border-ink/10">
        {landmarks.map((l) => (
          <li key={l.id}>
            <Link href={l.href} className="group flex items-center justify-between gap-4 py-4">
              <span>
                <span className="block font-display text-2xl group-hover:text-ember">{l.title}</span>
                <span className="font-serif text-ink/65 italic">{l.line}</span>
              </span>
              <Icon name="arrow-right" className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
