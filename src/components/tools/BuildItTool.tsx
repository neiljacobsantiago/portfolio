"use client";

import { useState } from "react";
import Icon, { type IconName } from "@/components/ui/Icon";
import { haptic } from "@/lib/haptics";
import { BOARDS, CASES, COMFORT, CPUS, DEFAULT_BUILD, GPUS, PSUS, RAMS, check, type Build, type Level } from "@/lib/tools/buildit";
import { cn } from "@/lib/utils";
import { Field, Note, input } from "./ui";

const PRESETS: { label: string; build: Build }[] = [
  { label: "Balanced", build: DEFAULT_BUILD },
  { label: "Small and mighty", build: { cpu: "r7-7800x3d", board: "b650i", ram: "d5-32", gpu: "rtx4060", case: "sff", psu: "750sfx" } },
  { label: "Spot the problems", build: { cpu: "i7-14700k", board: "b650", ram: "d4-32", gpu: "rtx4090", case: "matx", psu: "650" } },
];

const TONE: Record<Level, { icon: IconName; dot: string; box: string; word: string }> = {
  ok: { icon: "check", dot: "bg-[#2e7d32] text-paper", box: "bg-[#0f3d2e] text-paper", word: "Everything fits" },
  warn: { icon: "warning", dot: "bg-[#d9a441] text-ink", box: "bg-[#d9a441] text-ink", word: "Works, with caveats" },
  fail: { icon: "close", dot: "bg-ember text-paper", box: "bg-ember text-paper", word: "Won't work as picked" },
};

const PARTS = [
  { key: "cpu", label: "Processor", list: CPUS, spec: (id: string) => { const c = CPUS.find((x) => x.id === id)!; return `${c.socket} · ${c.memory.join("/")} · ~${c.watts} W${c.igpu ? "" : " · no graphics"}`; } },
  { key: "board", label: "Motherboard", list: BOARDS, spec: (id: string) => { const b = BOARDS.find((x) => x.id === id)!; return `${b.socket} · ${b.memory} · ${b.slots} memory slots`; } },
  { key: "ram", label: "Memory", list: RAMS, spec: (id: string) => { const r = RAMS.find((x) => x.id === id)!; return `${r.type} · ${r.sticks} sticks`; } },
  { key: "gpu", label: "Graphics card", list: GPUS, spec: (id: string) => { const g = GPUS.find((x) => x.id === id)!; return g.length ? `~${g.length} mm long · ~${g.watts} W` : "Uses the processor's graphics"; } },
  { key: "case", label: "Case", list: CASES, spec: (id: string) => { const c = CASES.find((x) => x.id === id)!; return `Cards up to ${c.gpuClearance} mm · ${c.psu.join(" or ")} power`; } },
  { key: "psu", label: "Power supply", list: PSUS, spec: (id: string) => { const p = PSUS.find((x) => x.id === id)!; return `${p.watts} W · ${p.size} size`; } },
] as const;

/** BuildIT's "does it fit?" step, on its own: every pick re-runs the compatibility rules. */
export default function BuildItTool({ compact }: { compact?: boolean }) {
  const [build, setBuild] = useState<Build>(DEFAULT_BUILD);
  const r = check(build);
  const t = TONE[r.verdict];
  const meter = Math.min(1, r.load);

  return (
    <div className="space-y-5">
      <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            aria-pressed={JSON.stringify(p.build) === JSON.stringify(build)}
            onClick={() => {
              haptic();
              setBuild(p.build);
            }}
            className="label press shrink-0 rounded-full border border-ink/15 px-3 py-1.5 text-[0.55rem] whitespace-nowrap text-ink/65 hover:border-ink hover:text-ink aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper"
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className={cn("grid gap-x-4 gap-y-3", !compact && "sm:grid-cols-2")}>
        {PARTS.map((p) => (
          <Field key={p.key} label={p.label}>
            <select value={build[p.key]} onChange={(e) => setBuild((b) => ({ ...b, [p.key]: e.target.value }))} className={cn(input, "cursor-pointer font-serif text-[0.95rem]")}>
              {p.list.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
            <span className="mt-1 block font-mono text-[0.6rem] text-ink/45">{p.spec(build[p.key])}</span>
          </Field>
        ))}
      </div>

      <div className={cn("rounded-[2px] p-4 transition-colors duration-500", t.box)} aria-live="polite">
        <p className="flex items-center gap-2 font-display text-xl leading-tight">
          <Icon name={t.icon} className="h-5 w-5" />
          {t.word}
        </p>
        {/* Power meter: estimated draw against the chosen supply, with the 70% comfort line */}
        <div className="mt-3">
          <div className="relative h-2 overflow-hidden rounded-full bg-current/15">
            <div className="h-full rounded-full bg-current/80 transition-[width] duration-500 ease-[var(--ease-apple)]" style={{ width: `${meter * 100}%` }} />
            <span aria-hidden className="absolute inset-y-0 w-0.5 bg-current" style={{ left: `${COMFORT * 100}%` }} />
          </div>
          <p className="mt-1.5 flex justify-between gap-3 font-mono text-[0.62rem] opacity-80">
            <span>~{r.draw} W of {PSUS.find((p) => p.id === build.psu)!.watts} W</span>
            <span>comfort line {Math.round(COMFORT * 100)}%</span>
          </p>
        </div>
      </div>

      <ol className="space-y-2.5">
        {r.checks.map((c) => (
          <li key={c.id} className="flex gap-3">
            <span aria-hidden className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full", TONE[c.level].dot)}>
              <Icon name={TONE[c.level].icon} className="h-3 w-3" />
            </span>
            <div className="min-w-0">
              <p className="font-serif text-[0.98rem] leading-tight text-ink">
                <span className="sr-only">{c.level === "ok" ? "Pass: " : c.level === "warn" ? "Warning: " : "Problem: "}</span>
                {c.title}
              </p>
              <p className="mt-0.5 font-serif text-sm leading-snug text-ink/60">{c.detail}</p>
            </div>
          </li>
        ))}
      </ol>

      <Note>
        Inspired by BuildIT&apos;s builder. Specs are typical published figures (card lengths vary by brand), the power estimate adds about 60 W for the board, memory, drives and fans, and there are deliberately no prices.
      </Note>
    </div>
  );
}
