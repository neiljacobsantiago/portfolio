"use client";

import { useState } from "react";
import { ALGORITHMS, DEFAULT_BLOCKS, DEFAULT_PROCESSES, allocate, parseSizes, type Algorithm } from "@/lib/tools/memory";
import { cn } from "@/lib/utils";
import { Field, Note, Segmented, Stat, input } from "./ui";

const COLORS = ["bg-ember", "bg-sky", "bg-ink", "bg-wine", "bg-[#d9a441]", "bg-[#5b8c5a]"];
const color = (p: number) => COLORS[(p - 1) % COLORS.length];

/** Dynamic partitioning, step by step — from the CS 2101 Memory Allocation Simulator. */
export default function MemoryTool({
  blocks: initialBlocks = DEFAULT_BLOCKS,
  processes: initialProcesses = DEFAULT_PROCESSES,
  algorithm: initialAlgorithm = "first",
  compact,
}: {
  blocks?: number[];
  processes?: number[];
  algorithm?: Algorithm;
  compact?: boolean;
}) {
  const [blocksText, setBlocksText] = useState(initialBlocks.join(", "));
  const [procText, setProcText] = useState(initialProcesses.join(", "));
  const [algorithm, setAlgorithm] = useState<Algorithm>(initialAlgorithm);
  const blocks = parseSizes(blocksText);
  const processes = parseSizes(procText);
  const [step, setStep] = useState<number | null>(null); // null = show everything
  const shown = step === null ? processes.length : Math.min(step, processes.length);
  const r = allocate(blocks, processes.slice(0, shown), algorithm);
  const biggest = Math.max(1, ...blocks);

  return (
    <div className="space-y-4">
      <div className={cn("grid gap-3", !compact && "sm:grid-cols-2")}>
        <Field label="Memory blocks (KB)">
          <input value={blocksText} onChange={(e) => setBlocksText(e.target.value)} inputMode="numeric" className={input} />
        </Field>
        <Field label="Processes, in arrival order (KB)">
          <input value={procText} onChange={(e) => setProcText(e.target.value)} inputMode="numeric" className={input} />
        </Field>
      </div>

      <Segmented
        label="Algorithm"
        value={algorithm}
        onChange={setAlgorithm}
        options={(Object.keys(ALGORITHMS) as Algorithm[]).map((a) => ({ value: a, label: ALGORITHMS[a].label }))}
      />
      <Note>{ALGORITHMS[algorithm].rule}</Note>

      {processes.length > 0 && (
        <div className="flex items-center gap-3">
          <span className="label w-20 shrink-0 text-[0.55rem] text-ink/50">
            Step {shown}/{processes.length}
          </span>
          <input
            type="range"
            min={0}
            max={processes.length}
            value={shown}
            onChange={(e) => setStep(Number(e.target.value))}
            aria-label="Show allocation up to this process"
            className="h-1.5 flex-1 cursor-pointer accent-[var(--color-ember)]"
          />
        </div>
      )}

      {/* Memory map: each block drawn to scale, processes as coloured slices, holes hatched */}
      <ol className="space-y-2" aria-label="Memory map">
        {r.blocks.map((b, bi) => (
          <li key={bi} className="flex items-center gap-3">
            <span className="w-14 shrink-0 text-right font-mono text-[0.65rem] text-ink/55">{b.size}K</span>
            <div className="flex h-7 overflow-hidden rounded-[2px] ring-1 ring-ink/15" style={{ width: `${(b.size / biggest) * 100}%`, minWidth: "2.5rem" }}>
              {b.segments.map((s, si) => (
                <span
                  key={si}
                  title={s.process ? `P${s.process}: ${s.size} KB` : `Free: ${s.size} KB`}
                  className={cn(
                    "flex items-center justify-center overflow-hidden font-mono text-[0.6rem] whitespace-nowrap transition-[flex-grow] duration-500 ease-[var(--ease-apple)]",
                    s.process ? `${color(s.process)} text-paper` : "bg-[repeating-linear-gradient(135deg,transparent_0_5px,rgb(0_48_73/0.08)_5px_7px)] text-ink/45",
                  )}
                  style={{ flexGrow: s.size, flexBasis: 0 }}
                >
                  {s.process ? `P${s.process}` : s.size >= b.size * 0.25 ? `${s.size}` : ""}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ol>

      <ul className="flex flex-wrap gap-1.5">
        {processes.map((size, i) => {
          const p = r.placements[i];
          return (
            <li
              key={i}
              className={cn(
                "label rounded-full px-2.5 py-1 text-[0.55rem] transition-opacity",
                !p ? "bg-ink/5 text-ink/35" : p.block === null ? "bg-ember/10 text-ember ring-1 ring-ember/40" : "bg-ink/[0.06] text-ink/70",
              )}
            >
              <span className={cn("mr-1.5 inline-block h-2 w-2 rounded-full align-middle", p ? color(i + 1) : "bg-ink/20")} />
              P{i + 1} {size}K {!p ? "· queued" : p.block === null ? "· must wait" : `→ ${r.blocks[p.block].size}K`}
            </li>
          );
        })}
      </ul>

      <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-[2px] bg-ink/10 ring-1 ring-ink/10">
        <Stat compact={compact} label="Used" value={`${Math.round(r.utilization * 100)}%`} tone="ember" />
        <Stat compact={compact} label="Free left" value={`${r.freeLeft}K`} />
        <Stat compact={compact} label="Largest hole" value={`${r.largestHole}K`} />
      </dl>
      {r.externalFragmentation && (
        <p className="rounded-[2px] border-l-2 border-ember bg-ember/[0.06] px-3 py-2 font-serif text-sm text-ink/80">
          External fragmentation: there&apos;s enough free memory in total, but it&apos;s scattered — no single hole fits the waiting process.
        </p>
      )}
    </div>
  );
}
