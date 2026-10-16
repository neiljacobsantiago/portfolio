"use client";

import { useState } from "react";
import { parseNetwork, subnet, vlsm, type SubnetInfo } from "@/lib/tools/subnet";
import { cn } from "@/lib/utils";
import { Field, Note, Segmented, Stat, input } from "./ui";

type Need = { name: string; hosts: number };
const DEFAULT_NEEDS: Need[] = [
  { name: "Computer lab", hosts: 50 },
  { name: "Admin office", hosts: 20 },
  { name: "Faculty", hosts: 10 },
  { name: "Router link", hosts: 2 },
];

/** Subnet calculator + VLSM planner. */
export default function SubnetTool({
  initial = "192.168.10.0/24",
  initialNeeds,
  mode: initialMode = "subnet",
  compact,
}: {
  initial?: string;
  initialNeeds?: Need[];
  mode?: "subnet" | "vlsm";
  compact?: boolean;
}) {
  const [mode, setMode] = useState(initialMode);
  const [value, setValue] = useState(initial);
  const [needs, setNeeds] = useState<Need[]>(initialNeeds?.length ? initialNeeds : DEFAULT_NEEDS);
  const result = subnet(value);
  const parsed = parseNetwork(value);

  // The prefix slider rewrites the "/nn" part of whatever is typed.
  const setPrefix = (p: number) => {
    const ip = value.trim().split(/[\s/]/)[0] || "192.168.10.0";
    setValue(`${ip}/${p}`);
  };

  return (
    <div className="space-y-4">
      <Segmented
        label="Mode"
        value={mode}
        onChange={setMode}
        options={[
          { value: "subnet", label: "One subnet" },
          { value: "vlsm", label: "Plan VLANs (VLSM)" },
        ]}
      />

      <Field label={mode === "subnet" ? "Address / prefix" : "Base network"}>
        <input value={value} onChange={(e) => setValue(e.target.value)} spellCheck={false} inputMode="decimal" className={input} placeholder="192.168.10.0/24" />
      </Field>

      {parsed && (
        <div className="flex items-center gap-3">
          <span className="label text-[0.55rem] text-ink/50">/{parsed.prefix}</span>
          <input
            type="range"
            min={8}
            max={30}
            value={Math.max(8, Math.min(30, parsed.prefix))}
            onChange={(e) => setPrefix(Number(e.target.value))}
            aria-label="Prefix length"
            className="h-1.5 flex-1 cursor-pointer accent-[var(--color-ember)]"
          />
        </div>
      )}

      {"error" in result ? (
        <Note>{result.error}</Note>
      ) : mode === "subnet" ? (
        <SubnetResult r={result} compact={compact} />
      ) : (
        <Vlsm base={result.cidr} needs={needs} setNeeds={setNeeds} compact={compact} />
      )}
    </div>
  );
}

function SubnetResult({ r, compact }: { r: SubnetInfo; compact?: boolean }) {
  return (
    <div className="space-y-3">
      <div role="img" aria-label={`Mask in binary: ${r.binaryMask}`} className="grid grid-cols-4 gap-1.5">
        {r.binaryMask.split(".").map((octet, o) => (
          <div key={o} className="grid grid-cols-8 gap-[2px]">
            {octet.split("").map((bit, i) => (
              <span key={i} className={cn("h-3 rounded-[2px] transition-colors duration-300", bit === "1" ? "bg-ember" : "bg-sky/50")} style={{ transitionDelay: `${(o * 8 + i) * 8}ms` }} />
            ))}
          </div>
        ))}
      </div>
      <p className="label flex justify-between text-[0.52rem] text-ink/45">
        <span className="text-ember">■ network bits {r.prefix}</span>
        <span className="text-[#3d7398]">host bits {32 - r.prefix} ■</span>
      </p>
      <dl className={cn("grid gap-px overflow-hidden rounded-[2px] bg-ink/10 ring-1 ring-ink/10", compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4")}>
        <Stat compact={compact} label="Network" value={r.cidr} tone="ember" />
        <Stat compact={compact} label="Usable hosts" value={r.usableHosts.toLocaleString("en-US")} tone="ember" />
        <Stat compact={compact} label="Subnet mask" value={r.mask} />
        <Stat compact={compact} label="Wildcard" value={r.wildcard} />
        <Stat compact={compact} label="First host" value={r.firstHost} />
        <Stat compact={compact} label="Last host" value={r.lastHost} />
        <Stat compact={compact} label="Broadcast" value={r.broadcast} />
        <Stat compact={compact} label="Class · scope" value={`${r.ipClass} · ${r.scope}`} tone="sky" />
      </dl>
    </div>
  );
}

function Vlsm({ base, needs, setNeeds, compact }: { base: string; needs: Need[]; setNeeds: (n: Need[]) => void; compact?: boolean }) {
  const plan = vlsm(base, needs);
  const update = (i: number, patch: Partial<Need>) => setNeeds(needs.map((n, j) => (j === i ? { ...n, ...patch } : n)));

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {needs.map((n, i) => (
          <li key={i} className="flex gap-2">
            <input value={n.name} onChange={(e) => update(i, { name: e.target.value })} aria-label="Segment name" className={cn(input, "flex-1 font-serif")} />
            <input
              type="number"
              min={1}
              value={n.hosts || ""}
              onChange={(e) => update(i, { hosts: Number(e.target.value) })}
              aria-label={`Hosts needed for ${n.name}`}
              className={cn(input, "w-20 text-right")}
            />
            <button type="button" onClick={() => setNeeds(needs.filter((_, j) => j !== i))} aria-label={`Remove ${n.name}`} className="press w-9 shrink-0 rounded-[2px] text-ink/50 hover:bg-ink/5 hover:text-ember">
              ×
            </button>
          </li>
        ))}
      </ul>
      {needs.length < 12 && (
        <button type="button" onClick={() => setNeeds([...needs, { name: `VLAN ${needs.length + 10}`, hosts: 10 }])} className="label press rounded-full border border-dashed border-ink/30 px-3 py-1.5 text-[0.58rem] text-ink/60 hover:border-ink hover:text-ink">
          + Add segment
        </button>
      )}

      {"error" in plan ? (
        <Note>{plan.error}</Note>
      ) : (
        <div className="overflow-x-auto rounded-[2px] ring-1 ring-ink/10">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-ink text-paper">
              <tr className="label text-[0.52rem]">
                <th className="px-3 py-2 font-normal">Segment</th>
                <th className="px-3 py-2 font-normal">Subnet</th>
                {!compact && <th className="px-3 py-2 font-normal">Hosts</th>}
                {!compact && <th className="px-3 py-2 font-normal">Usable range</th>}
                <th className="px-3 py-2 text-right font-normal">Spare</th>
              </tr>
            </thead>
            <tbody>
              {plan.rows.map((r) => (
                <tr key={r.cidr} className="border-t border-ink/10 bg-paper">
                  <td className="px-3 py-2 font-serif text-sm">{r.name}</td>
                  <td className="px-3 py-2 text-ember">{r.cidr}</td>
                  {!compact && <td className="px-3 py-2">{r.usableHosts}</td>}
                  {!compact && (
                    <td className="px-3 py-2 whitespace-nowrap text-ink/70">
                      {r.firstHost} – {r.lastHost}
                    </td>
                  )}
                  <td className="px-3 py-2 text-right text-ink/60">{r.wasted}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {plan.free && <p className="border-t border-ink/10 bg-paper-deep/50 px-3 py-2 font-mono text-[0.68rem] text-ink/60">Still free: {plan.free}</p>}
        </div>
      )}
      <Note>Largest segment first, smallest subnet that fits — the order VLANs are carved out in a real design.</Note>
    </div>
  );
}
