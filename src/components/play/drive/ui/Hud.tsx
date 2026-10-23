"use client";

import Link from "next/link";
import Icon from "@/components/ui/Icon";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import type { DrsState } from "../engine";
import { landmarks, trophies, type Landmark } from "../track";
import { fmt, SECTOR_BG, type SectorTone, signed } from "./format";

// The driving screen's graphics, in the style of a race broadcast: a timing
// tower top left, speed and gear low in the middle, start lights, flash
// banners and lower thirds. Numbers that change every frame (timer, delta,
// speed, gear, rev lights) are written straight into these nodes by the
// engine through refs, so React never re-renders at 60 Hz.

/** The panel colour of every race graphic: the site's ink, taken down to near black. */
export const PANEL = "bg-[#06121c]/90";

export interface SectorMark {
  tone: SectorTone;
  ms: number;
  delta: number | null;
}

/**
 * Top left: lap counter, the lap being driven (time, live delta, sectors) and
 * the reference laps. In a room, the running order sits between header and timer.
 */
export function TimingTower({
  race,
  lapNo,
  lapsTotal,
  invalid,
  best,
  lastLap,
  sectors,
  found,
  place,
  timerRef,
  deltaRef,
  children,
}: {
  race: boolean;
  lapNo: number;
  /** Laps in a multiplayer race; null for an open-ended hot lap session. */
  lapsTotal: number | null;
  invalid: boolean;
  best: number | null;
  lastLap: { ms: number; valid: boolean } | null;
  sectors: (SectorMark | null)[];
  found: number;
  place: string | null;
  timerRef: React.RefObject<HTMLSpanElement | null>;
  deltaRef: React.RefObject<HTMLSpanElement | null>;
  children?: React.ReactNode;
}) {
  return (
    <section aria-label={race ? "Timing" : "Free roam"} className={cn("pointer-events-auto w-[12.75rem] text-paper shadow-[0_14px_30px_-12px_rgb(0_0_0/0.7)] roomy:w-[15.5rem] wide:w-[18rem]", PANEL, "backdrop-blur-md")}>
      {/* Header: flag, lap counter, session */}
      <header className="flex h-7 items-stretch roomy:h-8">
        <span aria-hidden className="chequer w-5 shrink-0 [--chq:3.5px] roomy:w-6 roomy:[--chq:4px]" />
        <span className="flex flex-1 items-center justify-between gap-2 bg-wine px-2.5">
          {race ? (
            <span className="flex items-baseline gap-1.5">
              <span className="race-cap text-paper/75">Lap</span>
              <span className="race-num text-[1.05rem] roomy:text-[1.2rem]" data-lap>
                {Math.max(1, lapNo)}
                {lapsTotal ? <span className="text-paper/60">/{lapsTotal}</span> : null}
              </span>
            </span>
          ) : (
            <span className="race-cap">Free roam</span>
          )}
          <span className="race-cap text-paper/70">{race ? (lapsTotal ? "Race" : "Hot lap") : "No clock"}</span>
        </span>
      </header>

      {children}

      {/* The lap being driven. Always in the DOM: the engine holds these nodes. */}
      <div className={cn("px-2.5 pt-2 pb-2.5 roomy:px-3 short:pt-1.5 short:pb-2", !race && "hidden")}>
        <p className="race-cap text-paper/60 short:hidden">Lap time</p>
        <div className="mt-1 flex items-center justify-between gap-2 short:mt-0">
          <span ref={timerRef} className="race-num text-[1.7rem] roomy:text-[2.05rem] wide:text-[2.5rem] short:text-[1.45rem]">
            --:--.---
          </span>
          {invalid && <span className="race-cap shrink-0 bg-ember px-1.5 py-0.5 text-paper">Deleted</span>}
          <span ref={deltaRef} className={cn("race-num shrink-0 px-1.5 py-0.5 text-[0.85rem] empty:hidden data-[sign=fast]:bg-[#2fd27a] data-[sign=fast]:text-ink data-[sign=slow]:bg-ember data-[sign=slow]:text-paper roomy:text-[0.95rem]", invalid && "hidden")} />
        </div>
        <SectorBars sectors={sectors} />
      </div>
      {race && (
        <dl className={cn("grid grid-cols-2 border-t border-paper/10 text-paper/85", children && "short:hidden")}>
          <div className="px-2.5 py-1.5 roomy:px-3">
            <dt className="race-cap text-paper/55">Best</dt>
            <dd className={cn("race-num mt-0.5 text-[0.95rem] roomy:text-[1.05rem] wide:text-[1.2rem]", best && "text-[#c9a2ff]")}>{best ? fmt(best) : <NoTime />}</dd>
          </div>
          <div className="border-l border-paper/10 px-2.5 py-1.5 roomy:px-3">
            <dt className="race-cap text-paper/55">Last</dt>
            <dd className={cn("race-num mt-0.5 text-[0.95rem] roomy:text-[1.05rem] wide:text-[1.2rem]", lastLap && !lastLap.valid && "text-paper/45 line-through")}>{lastLap ? fmt(lastLap.ms) : <NoTime />}</dd>
          </div>
        </dl>
      )}

      {!race && (
        <div className="px-2.5 py-2 roomy:px-3">
          <p className="flex items-center justify-between gap-2" title="Hidden trophies found">
            <span className="race-cap flex items-center gap-1.5 text-paper/70">
              <Icon name="trophy" className="h-4 w-4 text-[#ffd27a]" /> Trophies
            </span>
            <span className="race-num text-[1.35rem]">
              {found}
              <span className="text-paper/50">/{trophies.length}</span>
            </span>
          </p>
          {place && <p className="race-cap mt-1.5 truncate border-t border-paper/10 pt-1.5 text-paper/60">{place}</p>}
        </div>
      )}
    </section>
  );
}

/** No time set yet: a quiet dash, read out as words. */
function NoTime() {
  return (
    <span className="text-paper/40">
      <span aria-hidden>–</span>
      <span className="sr-only">No time yet</span>
    </span>
  );
}

/** Three bars for the three sectors of this lap, coloured as each is completed. */
export function SectorBars({ sectors }: { sectors: (SectorMark | null)[] }) {
  return (
    <ol className="mt-2 grid grid-cols-3 gap-1 short:mt-1.5" aria-label="Sectors">
      {[0, 1, 2].map((i) => {
        const s = sectors[i];
        return (
          <li key={i} className="min-w-0">
            <span className={cn("block h-1.5 transition-colors duration-300", SECTOR_BG[s?.tone ?? "none"])} />
            <span className="race-cap mt-1 flex justify-between gap-1 text-[0.6rem] text-paper/55 short:hidden">
              S{i + 1}
              {s && s.delta != null && <span className="tabular-nums">{signed(s.delta, 1)}</span>}
            </span>
            <span className="sr-only">{s ? `${(s.ms / 1000).toFixed(3)} seconds, ${s.tone === "purple" ? "best ever" : s.tone === "green" ? "best this session" : "slower"}` : "not yet"}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** Low in the middle: rev lights, gear, speed, and DRS or the pit limiter. */
export function SpeedCluster({
  speedRef,
  gearRef,
  revsRef,
  drs,
  inPit,
  race,
}: {
  speedRef: React.RefObject<HTMLSpanElement | null>;
  gearRef: React.RefObject<HTMLSpanElement | null>;
  revsRef: React.RefObject<HTMLDivElement | null>;
  drs: DrsState;
  inPit: boolean;
  race: boolean;
}) {
  return (
    <div className="pointer-events-none flex w-[15.5rem] flex-col gap-1.5 roomy:w-[19rem] wide:w-[22rem]" aria-hidden>
      {/* Rev lights: green, red, then blue for the change-up, like a steering wheel */}
      <div ref={revsRef} className="race-revs flex h-2.5 gap-[3px] roomy:h-3">
        {Array.from({ length: 15 }, (_, i) => (
          <span
            key={i}
            data-on="false"
            className={cn(
              "flex-1 -skew-x-[18deg] bg-[#06121c]/80 ring-1 ring-paper/10 transition-colors duration-75",
              i < 5 ? "data-[on=true]:bg-[#2fd27a] data-[on=true]:shadow-[0_0_10px_rgb(47_210_122/0.8)]" : i < 10 ? "data-[on=true]:bg-[#ff3b30] data-[on=true]:shadow-[0_0_10px_rgb(255_59_48/0.8)]" : "data-[on=true]:bg-[#5aa9ff] data-[on=true]:shadow-[0_0_10px_rgb(90_169_255/0.85)]",
            )}
          />
        ))}
      </div>
      <div className={cn("flex items-stretch text-paper shadow-[0_14px_30px_-12px_rgb(0_0_0/0.7)]", PANEL)}>
        <span className="race-num flex w-12 shrink-0 items-center justify-center bg-paper text-[2.1rem] text-ink roomy:w-14 roomy:text-[2.5rem] wide:w-16 wide:text-[2.9rem]">
          <span ref={gearRef}>N</span>
        </span>
        <span className="flex flex-1 items-baseline justify-end gap-1.5 px-2.5 py-1">
          <span ref={speedRef} className="race-num min-w-[3ch] text-right text-[2.35rem] roomy:text-[2.8rem] wide:text-[3.3rem]">
            0
          </span>
          <span className="race-cap text-paper/60">km/h</span>
        </span>
        {inPit ? (
          <span className="race-cap flex w-14 shrink-0 flex-col items-center justify-center bg-[#ffd23f] text-center leading-tight text-ink roomy:w-16">
            Pit
            <span className="race-num text-[1rem]">80</span>
          </span>
        ) : (
          <span
            className={cn(
              "race-cap flex w-14 shrink-0 flex-col items-center justify-center text-center transition-colors roomy:w-16",
              drs === "open" ? "bg-[#2fd27a] text-ink" : drs === "ready" ? "text-paper ring-2 ring-[#2fd27a] ring-inset" : "text-paper/30",
            )}
          >
            <span className="text-[0.95rem] font-black tracking-[0.04em] italic">DRS</span>
            <span className="text-[0.55rem]">{drs === "open" ? "Open" : drs === "ready" ? (race ? "Zone" : "Ready") : "Off"}</span>
          </span>
        )}
      </div>
    </div>
  );
}

/** The start gantry: five pairs of red lights, then lights out. */
export function StartLights({ lights }: { lights: number }) {
  return (
    <div aria-live="polite" className="flex flex-col items-center gap-1.5">
      <div className={cn("flex gap-1.5 p-2 shadow-2xl ring-1 ring-paper/10 roomy:gap-2.5 roomy:p-3", "bg-[#04080c]/95")}>
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className="flex flex-col gap-1.5 bg-[#10161d] p-1.5 roomy:gap-2 roomy:p-2">
            {[0, 1].map((r) => (
              <span
                key={r}
                className={cn("block h-6 w-6 rounded-full transition-colors duration-75 roomy:h-8 roomy:w-8", i < lights ? "bg-[#ff2a1f] shadow-[0_0_16px_3px_rgb(255_42_31/0.75)]" : "bg-[#2a0d0d] shadow-[inset_0_2px_4px_rgb(0_0_0/0.6)]")}
              />
            ))}
          </span>
        ))}
      </div>
      {lights === 0 && <span className="race-num animate-race-rise bg-paper px-3 py-1 text-[1.1rem] text-ink uppercase">Lights out</span>}
      <span className="sr-only">{lights === 0 ? "Lights out" : `${lights} of 5 lights`}</span>
    </div>
  );
}

export type BannerKind = "best" | "lap" | "bad" | "good" | "info";
export interface Banner {
  id: number;
  kind: BannerKind;
  title: string;
  /** A time, set in race numerals. */
  time?: string;
  /** Against the best, signed; green when faster. */
  delta?: number | null;
  detail?: string;
}
const BANNER_TAG: Record<BannerKind, string> = {
  best: "bg-[#a259ff] text-paper",
  lap: "bg-paper text-ink",
  bad: "bg-ember text-paper",
  good: "bg-[#2fd27a] text-ink",
  info: "bg-sky text-ink",
};

/** Flash banner for laps, bests, penalties and finds: a coloured tag, then the numbers. */
export function FlashBanner({ banner }: { banner: Banner }) {
  return (
    <p role="status" className="animate-race-wipe flex max-w-[calc(100vw-2rem)] items-stretch shadow-[0_18px_40px_-14px_rgb(0_0_0/0.75)]">
      <span className={cn("race-num flex shrink-0 items-center px-3 py-2 text-[1rem] uppercase roomy:px-4 roomy:text-[1.2rem]", BANNER_TAG[banner.kind])}>{banner.title}</span>
      {(banner.time || banner.detail) && (
        <span className={cn("flex min-w-0 items-center gap-2.5 px-3 py-2 text-paper roomy:px-4", PANEL)}>
          {banner.time && <span className="race-num text-[1.15rem] roomy:text-[1.35rem]">{banner.time}</span>}
          {banner.delta != null && <span className={cn("race-num text-[0.95rem]", banner.delta <= 0 ? "text-[#5fe39b]" : "text-[#ff8a7a]")}>{signed(banner.delta)}</span>}
          {banner.detail && <span className="race-cap truncate text-paper/75">{banner.detail}</span>}
        </span>
      )}
    </p>
  );
}

/** A pavilion within reach, as a lower third. Enter (or a tap) opens the project. */
export function PavilionCard({ zone, linkRef, touch }: { zone: Landmark; linkRef: React.RefObject<HTMLAnchorElement | null>; touch: boolean }) {
  const n = landmarks.findIndex((l) => l.id === zone.id) + 1;
  return (
    <div className="animate-race-wipe pointer-events-auto max-w-full">
      <Link ref={linkRef} href={zone.href} onClick={() => haptic(10)} className="group flex items-stretch shadow-[0_18px_40px_-14px_rgb(0_0_0/0.75)]">
        <span className="flex w-11 shrink-0 flex-col items-center justify-center bg-ember text-paper roomy:w-14">
          <span className="race-num text-[1.4rem] roomy:text-[1.8rem]">{String(n).padStart(2, "0")}</span>
          <span className="race-cap text-[0.55rem] text-paper/75">of {landmarks.length}</span>
        </span>
        <span className="min-w-0 flex-1 bg-paper px-3 py-1.5 text-ink roomy:px-4 roomy:py-2">
          <span className="race-cap block text-ember">Pavilion</span>
          <span className="race-num block truncate text-[1.2rem] uppercase not-italic roomy:text-[1.5rem]">{zone.title}</span>
          <span className="block truncate text-[0.8rem] leading-snug text-ink/75 roomy:text-[0.9rem]">{zone.line}</span>
        </span>
        <span className="race-cap flex shrink-0 items-center gap-1.5 bg-ink px-3 text-paper transition-colors group-hover:bg-wine roomy:px-4">
          Open
          {!touch && <kbd className="hidden border border-paper/30 px-1 py-0.5 text-[0.55rem] font-bold roomy:inline">Enter</kbd>}
          <Icon name="arrow-right" className="h-4 w-4" />
        </span>
      </Link>
    </div>
  );
}

/** Small square tool buttons, top right. */
export function HudButton({ onClick, label, hint, tone, pressed, children }: { onClick: () => void; label: string; hint?: string; tone?: "danger"; pressed?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => {
        haptic();
        onClick();
      }}
      aria-label={label}
      aria-pressed={pressed}
      title={hint ? `${label} (${hint})` : label}
      className={cn(
        "press flex h-10 w-10 items-center justify-center shadow-[0_10px_24px_-10px_rgb(0_0_0/0.7)] ring-1 roomy:h-11 roomy:w-11",
        tone === "danger" ? "bg-ember text-paper ring-ember hover:bg-wine" : cn(PANEL, "text-paper ring-paper/15 backdrop-blur hover:bg-[#0c2131] aria-pressed:bg-paper aria-pressed:text-ink"),
      )}
    >
      {children}
    </button>
  );
}
