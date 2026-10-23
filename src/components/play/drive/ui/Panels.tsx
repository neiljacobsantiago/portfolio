"use client";

import { useState } from "react";
import Icon from "@/components/ui/Icon";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { PAINTS, type PaintId } from "../car";
import type { DriveEngine, GameMode } from "../engine";
import { MODES } from "./TitleCard";

// Sheets over the driving screen: settings, photo mode and the rotate hint,
// in the same dark broadcast panels as the HUD.

/** A small capitals heading inside a sheet. */
export function SheetHeading({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("race-cap mt-6 mb-2 flex items-center gap-2 text-paper/60", className)}>{children}</p>;
}

/** Card-like option row (a radio or a toggle) inside a sheet. */
const OPTION = "press w-full px-3.5 py-2.5 text-left ring-1 ring-paper/15 transition-colors hover:bg-paper/5";

export interface SheetSettings {
  mode: GameMode;
  controls: "buttons" | "tilt";
  invertTilt: boolean;
  autoGas: boolean;
  brakeAssist: boolean | null;
  ghost: boolean;
  paint: PaintId;
  muted: boolean;
}

export function SettingsSheet({
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
  net,
  onMute,
  onRestart,
}: {
  settings: SheetSettings;
  touch: boolean;
  onClose: () => void;
  onMode: (m: GameMode) => void;
  onControls: (c: SheetSettings["controls"]) => void;
  onInvert: () => void;
  onAutoGas: () => void;
  onBrakeAssist: () => void;
  onGhost: () => void;
  onPaint: (p: PaintId) => void;
  /** In a multiplayer session: the host picks the mode, and R only puts you back on track. */
  net?: boolean;
  onMute: () => void;
  onRestart: () => void;
}) {
  const grid = settings.mode === "race" && !net;
  return (
    <div className="absolute inset-0 z-30 flex justify-end bg-[#020a10]/50" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Circuit settings"
        onClick={(e) => e.stopPropagation()}
        data-lenis-prevent
        className="animate-pop-in h-full w-full max-w-sm overflow-y-auto overscroll-contain bg-[#06121c] text-paper shadow-2xl"
        style={{
          paddingTop: "max(16px, env(safe-area-inset-top))",
          paddingRight: "max(18px, env(safe-area-inset-right))",
          paddingBottom: "max(20px, env(safe-area-inset-bottom))",
          paddingLeft: "18px",
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="race-num flex items-center gap-2.5 text-[1.6rem] uppercase">
            <span aria-hidden className="chequer h-4 w-6 [--chq:4px]" />
            Settings
          </p>
          <button type="button" onClick={onClose} aria-label="Close settings" className="press flex h-10 w-10 items-center justify-center ring-1 ring-paper/20 hover:bg-paper/10">
            <Icon name="close" />
          </button>
        </div>

        {!net && (
          <>
            <SheetHeading>Mode</SheetHeading>
            <div className="space-y-1.5">
              {MODES.map((m) => (
                <button key={m.id} type="button" aria-pressed={settings.mode === m.id} onClick={() => onMode(m.id)} className={cn(OPTION, "relative aria-pressed:bg-paper aria-pressed:text-ink aria-pressed:ring-paper")}>
                  <span className="race-num block text-[1.15rem] uppercase">{m.label}</span>
                  <span className="mt-0.5 block text-[0.85rem] leading-snug opacity-75">{m.line}</span>
                </button>
              ))}
            </div>
          </>
        )}
        <button type="button" onClick={onRestart} className={cn(OPTION, "mt-1.5 flex items-center justify-between gap-3")}>
          <span>
            <span className="block text-[1rem] font-bold">{grid ? "Back to the grid" : "Back on track"}</span>
            <span className="block text-[0.85rem] text-paper/65">{grid ? "Restart from the start lights (R)" : "Put the car back on the racing line (R)"}</span>
          </span>
          <Icon name="refresh" className="h-5 w-5 text-paper/60" />
        </button>

        <SheetHeading>Driving aids</SheetHeading>
        <Toggle on={settings.brakeAssist ?? touch} onClick={onBrakeAssist} label="Braking assist" detail="Brakes for the corner ahead when you arrive too fast" />
        <Toggle on={settings.ghost} onClick={onGhost} label="Ghost of your best lap" detail="Rides along in hot laps, with the live gap in the timer" />

        {touch && (
          <>
            <SheetHeading>Steering</SheetHeading>
            <div role="radiogroup" aria-label="Steering" className="grid grid-cols-2 gap-1.5">
              {(["buttons", "tilt"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={settings.controls === c}
                  onClick={() => onControls(c)}
                  className="race-cap press px-3 py-3 ring-1 ring-paper/15 aria-checked:bg-paper aria-checked:text-ink aria-checked:ring-paper"
                >
                  {c === "buttons" ? "Arrow buttons" : "Tilt the phone"}
                </button>
              ))}
            </div>
            {settings.controls === "tilt" && <Toggle on={settings.invertTilt} onClick={onInvert} label="Invert tilt" />}
            <Toggle on={settings.autoGas} onClick={onAutoGas} label="Auto-throttle" detail="Throttle stays on; hold Brake to slow down" />
          </>
        )}

        <SheetHeading>Livery · {PAINTS[settings.paint].name}</SheetHeading>
        <PaintPicker value={settings.paint} onChange={onPaint} />

        <SheetHeading>Sound</SheetHeading>
        <Toggle on={!settings.muted} onClick={onMute} label="Engine and effects" detail="M" />

        {!touch && (
          <p className="mt-6 border-t border-paper/10 pt-4 text-[0.85rem] leading-relaxed text-paper/65">
            W and S or the arrows to drive · Shift for DRS on the straights · C camera · N time of day · R restart · P photo · M mute · Esc leave. Gamepads work too: triggers to drive, A for DRS.
          </p>
        )}
      </div>
    </div>
  );
}

/** Six liveries as small car-side swatches. */
export function PaintPicker({ value, onChange, light }: { value: PaintId; onChange: (p: PaintId) => void; light?: boolean }) {
  return (
    <div role="radiogroup" aria-label="Livery" className="grid grid-cols-6 gap-1.5">
      {(Object.keys(PAINTS) as PaintId[]).map((id) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={value === id}
          aria-label={PAINTS[id].name}
          title={PAINTS[id].name}
          onClick={() => onChange(id)}
          className={cn("press flex aspect-[4/3] items-center justify-center ring-1 aria-checked:ring-2 aria-checked:ring-ember", light ? "ring-ink/15" : "ring-paper/15 hover:bg-paper/5")}
        >
          <span aria-hidden className="block h-5 w-9 -skew-x-12" style={{ background: `linear-gradient(180deg, ${PAINTS[id].primary} 0 58%, ${PAINTS[id].secondary} 58% 80%, ${PAINTS[id].accent} 80%)` }} />
        </button>
      ))}
    </div>
  );
}

export function Toggle({ on, onClick, label, detail }: { on: boolean; onClick: () => void; label: string; detail?: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={onClick} className={cn(OPTION, "mt-1.5 flex items-center justify-between gap-3")}>
      <span>
        <span className="block text-[1rem] font-bold">{label}</span>
        {detail && <span className="block text-[0.85rem] leading-snug text-paper/65">{detail}</span>}
      </span>
      <span aria-hidden className={cn("race-cap flex h-7 w-12 shrink-0 items-center justify-center transition-colors", on ? "bg-[#2fd27a] text-ink" : "bg-paper/10 text-paper/55")}>
        {on ? "On" : "Off"}
      </span>
    </button>
  );
}

/** Photo mode: the HUD steps aside, drag to frame, then take the shot. */
export function PhotoMode({ engine, onClose }: { engine: React.RefObject<DriveEngine | null>; onClose: () => void }) {
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
      const file = new File([blob], "bay-street-circuit.jpg", { type: "image/jpeg" });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: "Bay Street Circuit" });
    } catch {}
  };
  return (
    <>
      {flash && <div className="pointer-events-none absolute inset-0 bg-white/80" />}
      {/* Viewfinder corners */}
      <div aria-hidden className="pointer-events-none absolute inset-5 md:inset-8">
        {["top-0 left-0 border-t-2 border-l-2", "top-0 right-0 border-t-2 border-r-2", "bottom-0 left-0 border-b-2 border-l-2", "right-0 bottom-0 border-r-2 border-b-2"].map((c) => (
          <span key={c} className={cn("absolute h-8 w-8 border-paper/80", c)} />
        ))}
      </div>
      <p className="race-cap pointer-events-none absolute left-1/2 -translate-x-1/2 bg-[#06121c]/85 px-3 py-1.5 text-paper" style={{ top: "max(20px, env(safe-area-inset-top))" }}>
        Photo mode · drag to frame
      </p>
      <div className="absolute inset-x-0 flex items-center justify-center gap-5" style={{ bottom: "max(20px, env(safe-area-inset-bottom))" }}>
        <button type="button" onClick={onClose} className="race-cap press min-h-11 bg-paper px-4 text-ink shadow-lg">
          Done
        </button>
        <button type="button" onClick={take} aria-label="Take the photo" className="press flex h-16 w-16 items-center justify-center rounded-full bg-paper/90 shadow-xl ring-4 ring-ember/80">
          <span className="h-11 w-11 rounded-full bg-ember" />
        </button>
        <span className="w-16" />
      </div>
      {shot && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#020a10]/75 p-6" onClick={() => setShot(null)}>
          <div className="animate-pop-in w-full max-w-lg bg-[#06121c] p-3 text-paper shadow-2xl ring-1 ring-paper/15" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element -- generated in the browser */}
            <img src={shot} alt="Your Bay Street Circuit photo" className="w-full" />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <button type="button" onClick={() => setShot(null)} className="race-cap press min-h-10 px-3 text-paper/75">
                Retake
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={share} className="race-cap press flex min-h-10 items-center gap-1.5 px-4 ring-1 ring-paper/25">
                  <Icon name="share" /> Share
                </button>
                <a href={shot} download="bay-street-circuit.jpg" className="race-cap press flex min-h-10 items-center gap-1.5 bg-ember px-4 text-paper">
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

/** Phones held upright: ask for landscape, but let them play anyway. */
export function RotateHint({ onAnyway, onLeave }: { onAnyway: () => void; onLeave: () => void }) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 bg-[#04101a]/95 px-8 text-center text-paper">
      <svg viewBox="0 0 64 64" aria-hidden className="animate-phone-turn h-16 w-16 fill-none stroke-paper stroke-2">
        <rect x="20" y="8" width="24" height="48" rx="4" />
        <path d="M29 50h6" />
      </svg>
      <p className="race-num text-[2rem] leading-none uppercase">Turn your phone sideways</p>
      <p className="max-w-xs text-[1.05rem] leading-snug text-paper/80">The circuit plays best in landscape: more track ahead, and a thumb for each side.</p>
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" onClick={onAnyway} className="race-cap press min-h-11 px-4 ring-1 ring-paper/40">
          Play upright anyway
        </button>
        <button type="button" onClick={onLeave} className="race-cap press min-h-11 px-4 text-paper/75">
          Leave
        </button>
      </div>
    </div>
  );
}
