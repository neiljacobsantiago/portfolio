"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import type { DriveEngine } from "./engine";
import { landmarks, packets, type Landmark } from "./world";

const BEST_KEY = "island-drive-best";
const fmt = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms / 1000) % 60)).padStart(2, "0")}.${String(Math.floor((ms % 1000) / 10)).padStart(2, "0")}`;

function readBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || null;
  } catch {
    return null;
  }
}

/** Island Drive: drive a jeepney around an island of Neil's projects. */
export default function DriveGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null);
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

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const probe = document.createElement("canvas");
    if (!(probe.getContext("webgl2") || probe.getContext("webgl"))) {
      queueMicrotask(() => setPhase("unsupported"));
      return;
    }
    const coarse = !matchMedia("(hover: hover) and (pointer: fine)").matches;
    const weak = (navigator.hardwareConcurrency ?? 8) <= 4 || matchMedia("(prefers-reduced-motion: reduce)").matches;
    queueMicrotask(() => {
      setTouch(coarse);
      setBest(readBest());
    });

    import("./engine").then(({ createDriveEngine }) => {
      if (cancelled) return;
      try {
        engine.current = createDriveEngine(
          canvas,
          { lowPower: coarse || weak, labels: labelsRef.current!, minimap: minimapRef.current },
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
            onChallenge: (s) => {
              setTrial(s);
              if (s.finished) {
                const prev = readBest();
                if (!prev || s.finished < prev) {
                  try {
                    localStorage.setItem(BEST_KEY, String(Math.round(s.finished)));
                  } catch {}
                  setBest(Math.round(s.finished));
                  setToast(`New best: ${fmt(s.finished)} 🏁`);
                }
              }
            },
          },
        );
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

  // Enter starts the drive, then opens whatever landmark you're parked at.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      if (e.key === "Enter" && phase === "ready") start();
      else if (e.key === "Enter" && phase === "driving" && zone) zoneLink.current?.click();
      else if (e.key.toLowerCase() === "t" && phase === "driving") engine.current?.startChallenge();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  });

  if (phase === "unsupported") return <Fallback />;

  return (
    <div className="relative h-[100svh] w-full touch-none overflow-hidden bg-paper select-none" data-lenis-prevent>
      <canvas ref={canvasRef} tabIndex={-1} aria-label="Island Drive — a 3D island of Neil's projects" className="block h-full w-full outline-none" />

      {/* Landmark labels, positioned from 3D every frame */}
      <div ref={labelsRef} aria-hidden className="pointer-events-none absolute inset-0">
        {landmarks.map((l) => (
          <div
            key={l.id}
            data-landmark={l.id}
            className="group absolute top-0 left-0 opacity-0 transition-opacity duration-300 will-change-transform data-[active=true]:z-10"
          >
            <span className="label block rounded-full bg-paper/90 px-3 py-1.5 text-[0.55rem] whitespace-nowrap text-ink shadow-[0_8px_20px_-10px_rgb(0_48_73/0.6)] ring-1 ring-ink/10 transition-[background-color,color,transform] duration-300 group-data-[active=true]:scale-110 group-data-[active=true]:bg-ember group-data-[active=true]:text-paper">
              {l.title}
            </span>
            <span className="mx-auto block h-3 w-px bg-ink/40" />
          </div>
        ))}
      </div>

      {/* HUD */}
      <div className={cn("pointer-events-none absolute inset-x-0 top-20 flex items-start justify-between gap-3 px-4 transition-opacity duration-500 md:top-24 md:px-8", phase === "driving" ? "opacity-100" : "opacity-0")}>
        <div className="pointer-events-auto space-y-2">
          <div className="rounded-2xl bg-paper/90 px-4 py-3 shadow-lg ring-1 ring-ink/10 backdrop-blur">
            <p className="label text-[0.55rem] text-ember">Island Drive</p>
            <p className="mt-1 font-display text-2xl leading-none tabular-nums">
              {trial ? fmt(trial.finished ?? trial.ms) : `${found}/${packets.length}`}
              <span className="ml-2 font-serif text-sm text-ink/55 italic">{trial ? (trial.running ? `${found}/${packets.length} packets` : "finished!") : "packets"}</span>
            </p>
            {best && <p className="label mt-1 text-[0.5rem] text-ink/50">Best {fmt(best)}</p>}
            {pins > 0 && <p className="label mt-1 text-[0.5rem] text-ink/50">🎳 {pins} pins down</p>}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={() => engine.current?.startChallenge()} className="label press rounded-full bg-ink px-3 py-2 text-[0.55rem] text-paper hover:bg-ember">
              {trial?.running ? "Restart trial" : "Time trial"} <span className="hidden opacity-60 md:inline">· T</span>
            </button>
            <button type="button" onClick={() => engine.current?.reset()} className="label press rounded-full bg-paper/90 px-3 py-2 text-[0.55rem] ring-1 ring-ink/15 hover:bg-paper">
              Reset <span className="hidden opacity-60 md:inline">· R</span>
            </button>
          </div>
        </div>
        <canvas ref={minimapRef} width={150} height={150} aria-hidden className="h-[110px] w-[110px] rounded-full bg-sky/40 shadow-lg ring-4 ring-paper/80 md:h-[150px] md:w-[150px]" />
      </div>

      {/* Landmark card */}
      <div className={cn("absolute inset-x-0 top-56 flex justify-center px-4 transition-[opacity,transform] duration-500 ease-[var(--ease-spring)] md:top-auto md:bottom-10", zone && phase === "driving" ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0")}>
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
        <p key={toast} className="animate-pop-in label pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 rounded-full bg-ink px-5 py-3 text-[0.65rem] whitespace-nowrap text-paper shadow-xl">
          {toast}
        </p>
      )}

      {touch && phase === "driving" && <TouchControls engine={engine} />}

      {/* Title screen over the orbiting island */}
      <div className={cn("absolute inset-0 flex items-end justify-center bg-gradient-to-t from-paper via-paper/40 to-transparent px-5 pb-16 transition-opacity duration-700 md:items-center md:pb-0", phase === "driving" ? "pointer-events-none opacity-0" : "opacity-100")}>
        <div className="max-w-xl text-center">
          <p className="label text-ember">Play · Island Drive</p>
          <h1 className="mt-3 font-display text-[clamp(3rem,9vw,7rem)] leading-[0.95]">
            Skip the reading. <em className="font-serif text-ember">Drive it.</em>
          </h1>
          <p className="mx-auto mt-5 max-w-md font-serif text-xl leading-snug text-ink/75">
            Take the jeepney around an island of Neil&apos;s projects. Park at a landmark to open it, knock down the pins, and race the clock for all twelve packets.
          </p>
          <button
            type="button"
            onClick={start}
            disabled={phase === "loading"}
            className="btn mt-8 bg-ink text-paper hover:bg-ember disabled:opacity-50"
          >
            {phase === "loading" ? "Building the island…" : "Start driving"} <span className="arrow">→</span>
          </button>
          <p className="label mt-6 text-[0.58rem] text-ink/50">{touch ? "Joystick to drive · tap a card to open it" : "WASD / arrows to drive · Shift boost · Space brake · ↵ open · R reset · T time trial"}</p>
        </div>
      </div>
    </div>
  );
}

/** A thumb joystick (drive) and a boost button for phones and tablets. */
function TouchControls({ engine }: { engine: React.RefObject<DriveEngine | null> }) {
  const padRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLSpanElement>(null);

  const move = (e: React.PointerEvent) => {
    const pad = padRef.current;
    if (!pad || !(e.buttons || e.pointerType === "touch")) return;
    const r = pad.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const max = r.width / 2 - 18;
    const d = Math.hypot(dx, dy);
    if (d > max) {
      dx = (dx / d) * max;
      dy = (dy / d) * max;
    }
    if (knobRef.current) knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
    engine.current?.setControls({ throttle: -dy / max, steer: dx / max });
  };
  const release = () => {
    if (knobRef.current) knobRef.current.style.transform = "";
    engine.current?.setControls({ throttle: 0, steer: 0 });
  };

  return (
    <>
      <div
        ref={padRef}
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          move(e);
        }}
        onPointerMove={move}
        onPointerUp={release}
        onPointerCancel={release}
        className="absolute bottom-8 left-6 flex h-36 w-36 touch-none items-center justify-center rounded-full bg-ink/15 ring-2 ring-paper/70 backdrop-blur-sm"
        aria-label="Drive joystick"
      >
        <span ref={knobRef} className="h-14 w-14 rounded-full bg-ink shadow-lg ring-4 ring-paper/80 transition-transform duration-75" />
      </div>
      <button
        type="button"
        onPointerDown={() => engine.current?.setControls({ boost: true })}
        onPointerUp={() => engine.current?.setControls({ boost: false })}
        onPointerLeave={() => engine.current?.setControls({ boost: false })}
        className="label absolute right-6 bottom-28 flex h-20 w-20 touch-none items-center justify-center rounded-full bg-ember text-[0.6rem] text-paper shadow-xl ring-4 ring-paper/70 active:scale-95"
      >
        Boost
      </button>
    </>
  );
}

/** No WebGL (very old phones, some locked-down browsers): the island as a list. */
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
