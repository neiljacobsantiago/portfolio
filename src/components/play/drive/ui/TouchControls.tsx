"use client";

import { useEffect, useRef } from "react";
import Icon from "@/components/ui/Icon";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import type { DriveEngine, DrsState } from "../engine";

export interface TouchSettings {
  controls: "buttons" | "tilt";
  invertTilt: boolean;
  autoGas: boolean;
}

/**
 * Phones: steering (buttons or tilt) under the left thumb, throttle, brake and
 * DRS under the right. Every button tracks its own finger, so they combine freely.
 */
export default function TouchControls({ engine, settingsRef, tilt, drs }: { engine: React.RefObject<DriveEngine | null>; settingsRef: React.RefObject<TouchSettings>; tilt: boolean; drs: DrsState }) {
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
    e.currentTarget.dataset.held = String(down);
    apply();
  };
  const handlers = {
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => press(e, true),
    onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => press(e, false),
    onPointerCancel: (e: React.PointerEvent<HTMLButtonElement>) => press(e, false),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  };
  // Pressed state comes from data-held (set above) so a held button shows it without a re-render
  const pad = "flex touch-none flex-col items-center justify-center gap-1 shadow-[0_14px_30px_-12px_rgb(0_0_0/0.75)] ring-1 backdrop-blur transition-[transform,background-color] duration-75 data-[held=true]:scale-95";

  return (
    <>
      {!tilt && (
        <div className="absolute flex gap-2.5" style={{ left: "max(14px, env(safe-area-inset-left))", bottom: "max(14px, env(safe-area-inset-bottom))" }}>
          {(["left", "right"] as const).map((side) => (
            <button
              key={side}
              type="button"
              aria-label={`Steer ${side}`}
              data-key={side}
              {...handlers}
              className={cn(pad, "h-[5.5rem] w-[5.25rem] bg-[#06121c]/75 text-paper ring-paper/25 data-[held=true]:bg-paper data-[held=true]:text-ink")}
            >
              <Icon name={side === "left" ? "chevron-left" : "chevron-right"} className="h-10 w-10" strokeWidth={2.75} />
            </button>
          ))}
        </div>
      )}
      {tilt && (
        <p className="race-cap pointer-events-none absolute bg-[#06121c]/80 px-3 py-2 text-paper/85" style={{ left: "max(14px, env(safe-area-inset-left))", bottom: "max(14px, env(safe-area-inset-bottom))" }}>
          Tilt to steer
        </p>
      )}

      <div className="absolute flex items-end gap-2.5" style={{ right: "max(14px, env(safe-area-inset-right))", bottom: "max(14px, env(safe-area-inset-bottom))" }}>
        <button type="button" aria-label="Brake" data-key="brake" data-buzz="10" {...handlers} className={cn(pad, "h-[5.5rem] w-[4.5rem] bg-[#06121c]/75 text-paper ring-paper/25 data-[held=true]:bg-ember")}>
          <span aria-hidden className="block h-1.5 w-8 bg-ember" />
          <span className="race-cap">Brake</span>
        </button>
        <div className="flex flex-col items-stretch gap-2">
          <button
            type="button"
            aria-label={`DRS${drs === "open" ? ", open" : drs === "ready" ? ", available" : ""}`}
            data-key="drs"
            {...handlers}
            className={cn(
              pad,
              "h-11 w-[5.25rem] flex-row",
              drs === "open" ? "bg-[#2fd27a] text-ink ring-[#2fd27a]" : drs === "ready" ? "bg-[#06121c]/80 text-paper ring-2 ring-[#2fd27a]" : "bg-[#06121c]/60 text-paper/40 ring-paper/15",
            )}
          >
            <span className="text-[0.95rem] font-black tracking-[0.04em] italic">DRS</span>
          </button>
          <button type="button" aria-label="Throttle" data-key="gas" data-buzz="8" {...handlers} className={cn(pad, "h-[7.25rem] w-[5.25rem] bg-[#1d7444]/90 text-paper ring-[#5fe39b]/50 data-[held=true]:bg-[#2fd27a] data-[held=true]:text-ink")}>
            <Icon name="chevron-up" className="h-8 w-8" strokeWidth={2.75} />
            <span className="race-cap">Throttle</span>
          </button>
        </div>
      </div>
    </>
  );
}
