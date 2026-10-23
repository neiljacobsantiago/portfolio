"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/Icon";
import { haptic } from "@/lib/haptics";
import { useImmersive } from "@/lib/immersive";
import { cn } from "@/lib/utils";
import { PAINTS, type PaintId } from "./car";
import type { CameraMode, DriveEngine, DrsState, GameMode, RaceUpdate, TimeOfDay } from "./engine";
import { raceFont } from "./fonts";
import Lobby from "./net/Lobby";
import { NetActions, NetStandings, NetToasts, SessionPanel } from "./net/NetHud";
import { useMultiplayer } from "./net/useMultiplayer";
import { detectGraphics } from "./quality";
import type { Ghost } from "./race";
import { landmarks, trophies, type Landmark } from "./track";
import { fmt } from "./ui/format";
import { type Banner, FlashBanner, HudButton, PavilionCard, type SectorMark, SpeedCluster, StartLights, TimingTower } from "./ui/Hud";
import { PhotoMode, RotateHint, SettingsSheet } from "./ui/Panels";
import TitleCard from "./ui/TitleCard";
import TouchControls from "./ui/TouchControls";

const SETTINGS_KEY = "bay-circuit-settings";
const BEST_KEY = "bay-circuit-best";
const GHOST_KEY = "bay-circuit-ghost";
const TROPHY_KEY = "bay-circuit-trophies";

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

const NO_SECTORS: (SectorMark | null)[] = [null, null, null];

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
  const [banner, setBanner] = useState<Banner | null>(null);
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
  const [sectors, setSectors] = useState<(SectorMark | null)[]>(NO_SECTORS);
  const [place, setPlace] = useState<string | null>(null);
  const [drs, setDrs] = useState<DrsState>("off");
  const [inPit, setInPit] = useState(false);
  const settingsRef = useRef(settings);
  /** Best time for each sector in this sitting (green on the timing screen). */
  const sessionSectors = useRef<(number | null)[]>([null, null, null]);
  /** Multiplayer's lap counter, fed the same race events as the HUD. */
  const netRace = useRef<((u: RaceUpdate) => void) | null>(null);
  const tagsRef = useRef<HTMLDivElement>(null);
  const bannerId = useRef(0);
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

  const flash = (b: Omit<Banner, "id">) => setBanner({ ...b, id: ++bannerId.current });

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
            onPlace: (p) => {
              setPlace(p?.name ?? null);
              if (p) flash({ kind: "info", title: p.name, detail: p.line });
            },
            onTrophy: (index, _n, total) => {
              if (!trophiesFound.includes(index)) trophiesFound = [...trophiesFound, index];
              write(TROPHY_KEY, JSON.stringify(trophiesFound));
              setFound(trophiesFound.length);
              haptic(20);
              flash({ kind: "good", title: trophiesFound.length === total ? "Every trophy" : "Trophy", detail: `${trophiesFound.length} of ${total} found` });
            },
            onRace: (u: RaceUpdate) => {
              onRace(u);
              netRace.current?.(u);
            },
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
    let clearSectors: ReturnType<typeof setTimeout> | undefined;
    function onRace(u: RaceUpdate) {
      setLapNo(u.lapNo);
      setInvalid(u.invalid);
      if (u.bestSectors) bestSectors = u.bestSectors;
      if (u.lights !== undefined) setLights(u.go ? 0 : u.lights);
      if (u.go) {
        haptic(15);
        setSectors(NO_SECTORS);
        setTimeout(() => setLights(-1), 1100);
      }
      if (u.jumpStart) flash({ kind: "bad", title: "Jump start", detail: "5 second penalty" });
      if (u.limits) flash({ kind: "bad", title: "Track limits", detail: "Lap deleted" });
      if (u.sector) {
        const s = u.sector;
        // Purple: best ever. Green: best this sitting. Yellow: slower.
        const session = sessionSectors.current;
        const prev = session[s.index];
        const counts = !u.invalid;
        const tone = !counts ? "yellow" : s.best ? "purple" : prev == null || s.ms < prev ? "green" : "yellow";
        if (counts && (prev == null || s.ms < prev)) session[s.index] = s.ms;
        const mark: SectorMark = { tone, ms: s.ms, delta: s.delta };
        clearTimeout(clearSectors);
        setSectors((p) => (s.index === 0 ? [mark, null, null] : p.map((m, i) => (i === s.index ? mark : i < s.index ? m : null))));
      }
      if (u.lap) {
        const l = u.lap;
        setLastLap({ ms: l.ms, valid: l.valid });
        const before = bestMs;
        if (l.best) {
          setBest(l.ms);
          bestMs = Math.round(l.ms);
          write(BEST_KEY, JSON.stringify({ ms: bestMs, sectors: bestSectors }));
          if (u.ghost) write(GHOST_KEY, JSON.stringify(u.ghost));
          flash({ kind: "best", title: before ? "Personal best" : "First timed lap", time: fmt(l.ms), delta: before ? l.ms - before : null });
          haptic(30);
        } else if (l.valid) flash({ kind: "lap", title: `Lap ${l.lap}`, time: fmt(l.ms), delta: before ? l.ms - before : null });
        else flash({ kind: "bad", title: `Lap ${l.lap}`, time: fmt(l.ms), detail: "Deleted" });
        // The sector bars belong to the next lap once this one has been read
        clearTimeout(clearSectors);
        clearSectors = setTimeout(() => setSectors((p) => (p[2] ? NO_SECTORS : p)), 4000);
      } else if (u.sector?.best) write(BEST_KEY, JSON.stringify({ ms: bestMs, sectors: bestSectors }));
    }

    return () => {
      cancelled = true;
      clearTimeout(clearSectors);
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
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), banner.kind === "best" ? 3600 : 2600);
    return () => clearTimeout(t);
  }, [banner]);

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

  const start = () => begin((e) => e.drive(settings.mode));
  /** Into the car: `go` starts the engine (a hot lap, a free roam, or a shared session). */
  const begin = (go: (e: DriveEngine) => void) => {
    haptic(10);
    const e = engine.current;
    if (!e) return;
    setSectors(NO_SECTORS);
    sessionSectors.current = [null, null, null];
    setLastLap(null);
    setLights(-1);
    setBanner(null);
    go(e);
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

  // In a room, leaving opens the room's panel (results, rematch, leave) instead
  const exit = () => (mp.driving ? mp.setPanel(!mp.panel) : leave());
  const leave = () => {
    haptic();
    engine.current?.stop();
    setPhase("ready");
    setPhoto(false);
    setSheet(false);
    setLights(-1);
    setInPit(false);
    setDrs("off");
    setBanner(null);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  };

  const mp = useMultiplayer({ engine, tags: tagsRef, muted: settings.muted, begin, end: leave });
  useEffect(() => {
    netRace.current = mp.onRace;
  });

  const chooseMode = (mode: GameMode) => {
    if (mp.driving) return;
    haptic();
    save({ mode });
    setSectors(NO_SECTORS);
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
      if (!DOE) return flash({ kind: "bad", title: "No tilt", detail: "This device can't tilt-steer" });
      if (DOE.requestPermission) {
        const answer = await DOE.requestPermission().catch(() => "denied");
        if (answer !== "granted") return flash({ kind: "bad", title: "No tilt", detail: "Tilt needs motion access" });
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
      if (e.key === "Enter" && phase === "ready" && !mp.open && !mp.inRoom) {
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
  const race = mp.driving ? mp.state.session?.mode === "race" : settings.mode === "race";
  const netRaceOn = mp.driving && race;
  const upright = touch && portrait;
  const touchPads = touch && showHud;
  // Low in the middle: between the thumbs in landscape, above them when upright
  const bottomStack = touchPads ? (upright ? "calc(max(14px, env(safe-area-inset-bottom)) + 11.5rem)" : "max(14px, env(safe-area-inset-bottom))") : "max(20px, env(safe-area-inset-bottom))";

  return (
    <div
      ref={rootRef}
      // Before the race starts the circuit is just a backdrop: phones must be
      // able to swipe past it to the rest of the page.
      className={cn(raceFont.variable, "font-race overflow-hidden select-none", driving ? "fixed inset-0 z-[70] touch-none bg-ink" : "relative h-[86svh] w-full touch-pan-y bg-paper md:h-[100svh]")}
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
              <span className="race-cap block bg-paper/95 px-2.5 py-1.5 whitespace-nowrap text-ink shadow-[0_8px_20px_-10px_rgb(0_0_0/0.6)] transition-[background-color,color,transform] duration-300 group-data-[active=true]:scale-110 group-data-[active=true]:bg-ember group-data-[active=true]:text-paper">
                {l.title}
              </span>
              <span className="mx-auto block h-3 w-px bg-paper/60" />
            </div>
          ))}
        </div>
        {/* Other players' name tags (multiplayer), positioned by the engine's remote-car layer */}
        <div ref={tagsRef} aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", photo && "opacity-0")} />

        {/* HUD: the timing tower on the left, tools and the map on the right. Always
            mounted (the engine holds its nodes), faded out when not driving. */}
        <div
          aria-hidden={!showHud || undefined}
          className={cn("pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 transition-opacity duration-500", showHud ? "opacity-100" : "invisible opacity-0")}
          style={{
            padding: "max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) 0 max(12px, env(safe-area-inset-left))",
          }}
        >
          <TimingTower
            race={race}
            lapNo={netRaceOn ? mp.lap : lapNo}
            lapsTotal={netRaceOn ? (mp.state.session?.laps ?? null) : null}
            invalid={invalid}
            best={best}
            lastLap={lastLap}
            sectors={sectors}
            found={found}
            place={place}
            timerRef={timerRef}
            deltaRef={deltaRef}
          >
            {mp.driving && <NetStandings mp={mp} />}
          </TimingTower>

          <div className="pointer-events-auto flex flex-col items-end gap-2 max-[520px]:flex-row-reverse max-[520px]:items-start">
            <div className="flex gap-1.5 max-[520px]:flex-col">
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
              {mp.driving && <NetActions mp={mp} />}
              <HudButton onClick={() => setSheet(true)} label="Settings">
                <Icon name="menu" className="h-[18px] w-[18px]" />
              </HudButton>
              <HudButton onClick={exit} label={mp.driving ? "Room and results" : "Leave the circuit"} hint="Esc" tone="danger">
                <Icon name="close" className="h-[18px] w-[18px]" />
              </HudButton>
            </div>
            <div className="relative shadow-[0_14px_30px_-12px_rgb(0_0_0/0.7)]">
              <span aria-hidden className="absolute inset-x-0 top-0 z-10 h-[3px] bg-ember" />
              <canvas ref={minimapRef} width={160} height={160} aria-hidden className="block h-[84px] w-[84px] bg-[#06121c]/80 ring-1 ring-paper/15 backdrop-blur md:h-[150px] md:w-[150px] [@media(max-height:560px)]:h-[96px] [@media(max-height:560px)]:w-[96px]" />
            </div>
          </div>
        </div>

        {/* Top middle: start lights, then flash banners and messages from the others */}
        {showHud && (
          <div className="pointer-events-none absolute inset-x-0 z-10 flex flex-col items-center gap-2 px-4" style={{ top: upright ? "34%" : "max(14px, env(safe-area-inset-top))" }}>
            {race && lights >= 0 && <StartLights lights={lights} />}
            <div className={cn("flex flex-col items-center gap-1.5", !upright && "mt-[8vh] md:mt-[14vh]", race && lights >= 0 && "mt-0 md:mt-0")}>
              {banner && <FlashBanner key={banner.id} banner={banner} />}
              {mp.inRoom && <NetToasts mp={mp} />}
            </div>
          </div>
        )}

        {/* Low in the middle: a pavilion within reach (lower third), then speed and gear */}
        <div
          aria-hidden={!showHud || undefined}
          className={cn("pointer-events-none absolute left-1/2 flex w-[min(30rem,calc(100%-1.5rem))] -translate-x-1/2 flex-col items-center gap-2 transition-opacity duration-500", touchPads && !upright && "w-[min(28rem,calc(100%-24rem))]", showHud ? "opacity-100" : "invisible opacity-0")}
          style={{ bottom: bottomStack }}
        >
          {showHud && zone && <PavilionCard key={zone.id} zone={zone} linkRef={zoneLink} touch={touch} />}
          <SpeedCluster speedRef={speedRef} gearRef={gearRef} revsRef={revsRef} drs={drs} inPit={inPit} race={race} />
        </div>

        {touchPads && <TouchControls engine={engine} settingsRef={settingsRef} tilt={settings.controls === "tilt"} drs={drs} />}

        {photo && <PhotoMode engine={engine} onClose={() => setPhoto(false)} />}

        {mp.inRoom && driving && mp.panel && <SessionPanel mp={mp} />}

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
            net={mp.driving}
            onMute={toggleMute}
            onRestart={() => {
              haptic();
              engine.current?.reset();
              setSheet(false);
            }}
          />
        )}

        {rotate && <RotateHint onAnyway={() => setAllowPortrait(true)} onLeave={exit} />}

        {/* Title card over the broadcast shots */}
        <TitleCard hidden={driving} loading={phase === "loading"} mode={settings.mode} onMode={chooseMode} best={best} touch={touch} onStart={start} onFriend={() => mp.setOpen(true)} />

        {!driving && (
          <a href="#arcade" className="race-cap press absolute right-4 bottom-3 flex items-center gap-2 px-2 py-2 text-paper/70 hover:text-paper md:right-6 md:bottom-5 [@media(max-height:560px)]:hidden">
            More games below <Icon name="arrow-down" className="animate-bounce-dot" />
          </a>
        )}
      </div>

      {/* Multiplayer lobby: make or join a room, wait for everyone */}
      {mp.open && !driving && <Lobby mp={mp} paint={settings.paint} onPaint={choosePaint} />}
    </div>
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
