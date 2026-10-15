"use client";

import { useState } from "react";
import { SPECIES, THRESHOLD, screen, type Species } from "@/lib/tools/pathoscan";
import { cn } from "@/lib/utils";
import { Note } from "./ui";

const DECISION = {
  cleared: "bg-[#0f3d2e] text-paper",
  pcr: "bg-[#d9a441] text-ink",
  unknown: "bg-ink/80 text-paper",
};

/** PathoScan's decision rule, made touchable. Illustrates the rule — it isn't the trained model. */
export default function PathoScanTool({ species = "A. flavus", confidence = 94, compact }: { species?: string; confidence?: number; compact?: boolean }) {
  const [top, setTop] = useState<Species>(screen(species, confidence).top);
  const [value, setValue] = useState(confidence);
  const r = screen(top, value);

  return (
    <div className="space-y-4">
      <div className="no-scrollbar flex gap-1 overflow-x-auto">
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
        <span className="label w-24 shrink-0 text-[0.55rem] text-ink/55">Top match</span>
        <input
          type="range"
          min={20}
          max={100}
          step={0.5}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          aria-label="Confidence of the top match"
          className="h-1.5 flex-1 cursor-pointer accent-[#0f3d2e]"
        />
        <span className="w-14 text-right font-display text-2xl leading-none tabular-nums">{r.confidence}%</span>
      </div>

      {/* Probability matrix with the 90% bar */}
      <div className="space-y-1.5 rounded-[2px] bg-paper-deep/50 p-3">
        <div className="flex gap-2">
          <span className="w-24 shrink-0" />
          <div className="relative h-3 flex-1">
            <span className="label absolute -translate-x-1/2 text-[0.5rem] text-ember" style={{ left: `${THRESHOLD}%` }}>
              {THRESHOLD}% bar
            </span>
          </div>
          {!compact && <span className="w-10" />}
        </div>
        {r.matrix.map((m, i) => (
          <div key={m.label} className="flex items-center gap-2">
            <span className={cn("w-24 shrink-0 truncate font-serif text-sm italic", i === 0 ? "text-ink" : "text-ink/55")}>{m.label}</span>
            <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-ink/[0.07]">
              <span aria-hidden className="absolute inset-y-0 z-10 w-px bg-ember" style={{ left: `${THRESHOLD}%` }} />
              <div
                className={cn("h-full rounded-full transition-[width] duration-500 ease-[var(--ease-apple)]", i === 0 ? (r.decision === "cleared" ? "bg-[#2e8b57]" : "bg-[#d9a441]") : "bg-ink/25")}
                style={{ width: `${m.value}%` }}
              />
            </div>
            {!compact && <span className="w-10 text-right font-mono text-[0.65rem] text-ink/55">{m.value}%</span>}
          </div>
        ))}
      </div>

      <div className={cn("rounded-[2px] p-4 transition-colors duration-500", DECISION[r.decision])}>
        <p className="font-display text-xl leading-tight">{r.headline}</p>
        <p className="mt-1 font-serif text-[0.95rem] leading-snug opacity-85">{r.detail}</p>
      </div>
      <Note>Shows PathoScan&apos;s documented decision rule with example numbers — the real model runs offline inside PhilMech&apos;s lab.</Note>
    </div>
  );
}
