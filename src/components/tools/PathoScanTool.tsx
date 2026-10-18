"use client";

import { useState } from "react";
import Icon from "@/components/ui/Icon";
import { SPECIES, THRESHOLD, TRAITS, screen, type Decision, type Species } from "@/lib/tools/pathoscan";
import { cn } from "@/lib/utils";
import { Note } from "./ui";

const DECISION: Record<Decision, { box: string; icon: "check" | "search" | "info" }> = {
  confident: { box: "bg-[#0f3d2e] text-paper", icon: "check" },
  "look-twice": { box: "bg-[#d9a441] text-ink", icon: "search" },
  unknown: { box: "bg-ink/85 text-paper", icon: "info" },
};

/** PathoScan's confidence threshold, made touchable. Illustrates the rule; it isn't the trained model. */
export default function PathoScanTool({ species = "A. flavus", confidence = 94, compact }: { species?: string; confidence?: number; compact?: boolean }) {
  const [top, setTop] = useState<Species>(screen(species, confidence).top);
  const [value, setValue] = useState(confidence);
  const r = screen(top, value);
  const traits = r.top !== "Unknown" ? TRAITS[r.top] : null;
  const d = DECISION[r.decision];

  return (
    <div className="space-y-4">
      <div className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1">
        {SPECIES.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={top === s}
            onClick={() => setTop(s)}
            className="press shrink-0 rounded-full border border-ink/15 px-3 py-1.5 font-serif text-sm whitespace-nowrap italic aria-pressed:border-[#0f3d2e] aria-pressed:bg-[#0f3d2e] aria-pressed:text-paper aria-pressed:not-italic"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <span className="label w-20 shrink-0 text-3xs text-ink/70 sm:w-24">Top match</span>
        <input
          type="range"
          min={20}
          max={100}
          step={0.5}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          aria-label="Confidence of the top match"
          className="h-1.5 min-w-0 flex-1 cursor-pointer accent-[#0f3d2e]"
        />
        <span className="w-16 text-right font-display text-2xl leading-none tabular-nums">{r.confidence}%</span>
      </div>

      {/* Probability matrix with the 90% bar */}
      <div className="space-y-1.5 rounded-[2px] bg-paper-deep/50 p-3">
        <div className="flex gap-2">
          <span className="w-24 shrink-0" />
          <div className="relative h-3 flex-1">
            <span className="label absolute -translate-x-1/2 text-3xs whitespace-nowrap text-ember" style={{ left: `${THRESHOLD}%` }}>
              {THRESHOLD}% bar
            </span>
          </div>
          {!compact && <span className="w-10" />}
        </div>
        {r.matrix.map((m, i) => (
          <div key={m.label} className="flex items-center gap-2">
            <span className={cn("w-24 shrink-0 truncate font-serif text-sm italic", i === 0 ? "text-ink" : "text-ink/70")}>{m.label}</span>
            <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-ink/[0.07]">
              <span aria-hidden className="absolute inset-y-0 z-10 w-px bg-ember" style={{ left: `${THRESHOLD}%` }} />
              <div
                className={cn("h-full rounded-full transition-[width] duration-500 ease-[var(--ease-apple)]", i === 0 ? (r.decision === "confident" ? "bg-[#2e8b57]" : "bg-[#d9a441]") : "bg-ink/25")}
                style={{ width: `${m.value}%` }}
              />
            </div>
            {!compact && <span className="w-10 text-right font-mono text-2xs text-ink/70">{m.value}%</span>}
          </div>
        ))}
      </div>

      <div className={cn("rounded-[2px] p-4 transition-colors duration-500", d.box)} aria-live="polite">
        <p className="flex items-center gap-2 font-display text-xl leading-tight">
          <Icon name={d.icon} className="h-5 w-5" />
          {r.headline}
        </p>
        <p className="mt-1.5 font-serif text-[0.95rem] leading-snug opacity-85">{r.detail}</p>
        <ul className="mt-3 space-y-1">
          {r.next.map((n) => (
            <li key={n} className="flex items-start gap-2 font-serif text-sm leading-snug opacity-90">
              <Icon name="arrow-right" className="mt-[0.2em] h-3.5 w-3.5 opacity-70" />
              {n}
            </li>
          ))}
        </ul>
      </div>

      {traits && (
        <div className="rounded-[2px] ring-1 ring-ink/10">
          <p className="label border-b border-ink/10 px-3 py-2 text-3xs text-ink/70">
            <span className="font-serif text-[0.8rem] tracking-normal normal-case italic">{r.top}</span> on PDA · reference traits
          </p>
          <dl className={cn("grid [&>*]:min-w-0 gap-px bg-ink/10", compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4")}>
            {(
              [
                ["Growth", traits.growth],
                ["Surface", traits.surface],
                ["Reverse", traits.reverse],
                ["Mycelium", traits.texture],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="bg-paper p-2.5">
                <dt className="label text-3xs text-ink/70">{k}</dt>
                <dd className="mt-0.5 font-serif text-sm leading-snug">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <Note>
        Why a bar at all? The error that hurts a lab most is a false positive: the wrong species, reported with confidence. Under 90% simply means look again. Example numbers only; the real model runs offline inside PhilMech&apos;s lab.
      </Note>
    </div>
  );
}
