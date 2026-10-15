"use client";

import type { ReactNode } from "react";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

// Shared bits for the Lab tools, sized to work both full-width on /lab and
// squeezed into a NeilAI chat bubble (`compact`).

export const input =
  "w-full rounded-[2px] border border-ink/20 bg-paper/80 px-3 py-2.5 font-mono text-sm text-ink outline-none transition-colors placeholder:text-ink/35 focus:border-ember focus:ring-1 focus:ring-ember";

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="label mb-1.5 block text-[0.58rem] text-ink/55">{label}</span>
      {children}
    </label>
  );
}

export function Stat({ label, value, tone, compact }: { label: string; value: ReactNode; tone?: "ember" | "sky"; compact?: boolean }) {
  return (
    <div className="min-w-0 bg-paper p-3">
      <dt className="label truncate text-[0.52rem] text-ink/50">{label}</dt>
      <dd className={cn("mt-1 truncate font-mono", compact ? "text-xs" : "text-sm", tone === "ember" && "text-ember", tone === "sky" && "text-[#3d7398]")}>{value}</dd>
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="no-scrollbar flex gap-1 overflow-x-auto rounded-full bg-ink/[0.06] p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => {
            haptic();
            onChange(o.value);
          }}
          className="label press shrink-0 rounded-full px-3 py-1.5 text-[0.58rem] whitespace-nowrap text-ink/65 transition-colors hover:text-ink aria-checked:bg-ink aria-checked:text-paper"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return <p className="font-serif text-sm leading-snug text-ink/55 italic">{children}</p>;
}
