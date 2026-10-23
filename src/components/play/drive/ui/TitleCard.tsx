"use client";

import Icon from "@/components/ui/Icon";
import { cn } from "@/lib/utils";
import type { GameMode } from "../engine";
import { landmarks, LENGTH, trophies } from "../track";
import { fmt } from "./format";

export const MODES: { id: GameMode; label: string; line: string }[] = [
  {
    id: "race",
    label: "Hot lap",
    line: "Start lights, three sectors and a best lap to beat, with your ghost alongside.",
  },
  {
    id: "free",
    label: "Free roam",
    line: `No clock. Drive the circuit and the pit lane, open the project pavilions, find ${trophies.length} hidden trophies.`,
  },
];

/**
 * The title card over the attract shots: what this is, which mode, and the
 * way in. Left-aligned like a broadcast title graphic, so the circuit shows
 * on the right; stacked at the bottom on phones.
 */
export default function TitleCard({
  hidden,
  loading,
  mode,
  onMode,
  best,
  touch,
  onStart,
  onFriend,
}: {
  hidden: boolean;
  loading: boolean;
  mode: GameMode;
  onMode: (m: GameMode) => void;
  best: number | null;
  touch: boolean;
  onStart: () => void;
  onFriend: () => void;
}) {
  const facts = [
    { k: "Length", v: `${(LENGTH / 1000).toFixed(2)} km` },
    { k: "Sectors", v: "3" },
    { k: "Pavilions", v: String(landmarks.length) },
    { k: "Trophies", v: String(trophies.length) },
  ];
  return (
    <div
      className={cn(
        "absolute inset-0 flex items-end overflow-clip text-paper transition-opacity duration-700",
        "bg-[linear-gradient(to_top,#04101a_0%,rgb(4_16_26/0.82)_42%,rgb(4_16_26/0.15)_75%)] roomy:items-center roomy:bg-[linear-gradient(to_right,rgb(4_16_26/0.94)_0%,rgb(4_16_26/0.75)_38%,rgb(4_16_26/0)_70%)]",
        "[@media(max-height:560px)]:items-center [@media(max-height:560px)]:bg-[linear-gradient(to_right,rgb(4_16_26/0.94)_0%,rgb(4_16_26/0.8)_55%,rgb(4_16_26/0.2)_100%)]",
        hidden ? "pointer-events-none opacity-0" : "opacity-100",
      )}
    >
      {/* Kerb along the left edge, the only decoration */}
      <span aria-hidden className="kerb absolute inset-y-0 left-0 hidden w-1.5 roomy:block" />
      <div className="w-full px-4 pb-12 roomy:max-w-[44rem] roomy:px-[5.5vw] roomy:pb-0 [@media(max-height:560px)]:grid [@media(max-height:560px)]:max-w-none [@media(max-height:560px)]:grid-cols-[1fr_minmax(0,24rem)] [@media(max-height:560px)]:items-center [@media(max-height:560px)]:gap-x-6 [@media(max-height:560px)]:px-[max(1rem,env(safe-area-inset-left))] [@media(max-height:560px)]:pb-0">
        <div className="min-w-0">
          <p className="race-cap flex items-center gap-2.5 text-[0.75rem] text-paper/85">
            <span aria-hidden className="chequer h-3.5 w-7 [--chq:3.5px]" />
            Play · Bay Street Circuit
          </p>
          <h1 className="race-num mt-3 text-[clamp(2.5rem,min(11vw,8svh),5.75rem)] leading-[0.9] uppercase [@media(max-height:560px)]:mt-2 [@media(max-height:560px)]:text-[clamp(1.9rem,5.2vw,2.8rem)]">
            Skip the reading.
            <span className="block text-[#ff5a4d]">Take a lap.</span>
          </h1>
          <p className="mt-4 max-w-[34rem] text-[1.0625rem] leading-snug text-paper/85 roomy:text-[1.2rem] [@media(max-height:560px)]:hidden">
            A floodlit street circuit on the water, built in three.js. Chase a lap time against your own ghost, or cruise the paddock, where every pavilion opens one of Neil&apos;s projects.
          </p>
          {/* Track facts, like the circuit card before a session */}
          <dl className="mt-5 hidden w-fit grid-cols-4 bg-[#06121c]/80 ring-1 ring-paper/10 min-[400px]:grid [@media(max-height:560px)]:mt-3 [@media(max-height:700px)]:hidden">
            {facts.map((f, i) => (
              <div key={f.k} className={cn("px-3 py-1.5 roomy:px-4", i > 0 && "border-l border-paper/10")}>
                <dt className="race-cap text-[0.6rem] text-paper/55">{f.k}</dt>
                <dd className="race-num mt-0.5 text-[1rem] roomy:text-[1.15rem]">{f.v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="min-w-0">
          <div role="radiogroup" aria-label="Game mode" className="mt-5 grid grid-cols-2 gap-2 [@media(max-height:560px)]:mt-0">
            {MODES.map((m) => {
              const on = mode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => onMode(m.id)}
                  className={cn(
                    "press relative min-w-0 overflow-hidden px-3 py-2.5 text-left ring-1 transition-colors roomy:px-4 roomy:py-3",
                    on ? "bg-paper text-ink ring-paper" : "bg-[#06121c]/75 text-paper ring-paper/25 hover:bg-[#0c2131]",
                  )}
                >
                  <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1", on ? "bg-ember" : "bg-paper/20")} />
                  <span className="race-num block text-[1.25rem] uppercase roomy:text-[1.45rem]">{m.label}</span>
                  <span className={cn("mt-1 block text-[0.8rem] leading-snug roomy:text-[0.875rem] [@media(max-height:560px)]:hidden", on ? "text-ink/75" : "text-paper/70")}>{m.line}</span>
                  {m.id === "race" && best ? (
                    <span className={cn("race-cap mt-1.5 flex items-center gap-1.5", on ? "text-wine" : "text-paper/70")}>
                      Your best <span className="race-num text-[0.85rem] tracking-normal normal-case">{fmt(best)}</span>
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="mt-3 grid grid-cols-[1.35fr_1fr] gap-2 roomy:mt-4">
            <button
              type="button"
              onClick={onStart}
              disabled={loading}
              data-start
              className="press group flex min-h-12 items-center justify-between gap-2 bg-ember px-4 text-paper shadow-[0_16px_30px_-14px_rgb(193_18_31/0.8)] transition-colors hover:bg-[#d8222f] disabled:opacity-60 roomy:min-h-14 roomy:px-5"
            >
              <span className="race-num text-[1.05rem] uppercase roomy:text-[1.25rem]">{loading ? "Building the circuit" : "Start the engine"}</span>
              {loading ? <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-paper/30 border-t-paper" /> : <Icon name="arrow-right" className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />}
            </button>
            <button
              type="button"
              onClick={onFriend}
              disabled={loading}
              data-race-friend
              className="press flex min-h-12 items-center justify-center gap-2 bg-[#06121c]/75 px-3 text-paper ring-1 ring-paper/40 transition-colors hover:bg-paper hover:text-ink disabled:opacity-60 roomy:min-h-14"
            >
              <Icon name="users" className="h-4 w-4" />
              <span className="race-num text-[1.05rem] uppercase roomy:text-[1.25rem]">Race a friend</span>
            </button>
          </div>
          <p className="race-cap mt-3 text-[0.62rem] leading-relaxed text-paper/60 [@media(max-height:700px)]:hidden">
            {touch ? "Best in landscape · steer on the left · throttle, brake and DRS on the right" : "W S or arrows drive · Shift DRS · C camera · N time of day · R restart · P photo · Esc leave · gamepads work too"}
          </p>
        </div>
      </div>
    </div>
  );
}
