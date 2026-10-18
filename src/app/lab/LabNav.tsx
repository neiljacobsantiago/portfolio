"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface LabGroup {
  anchor: string;
  label: string;
  count: number;
}

/** The Lab's sticky group index: one tap to a kind of tool, and it shows where you are. */
export default function LabNav({ groups }: { groups: LabGroup[] }) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const seen = new Map<string, boolean>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) seen.set(e.target.id, e.isIntersecting);
        setActive(groups.find((g) => seen.get(g.anchor))?.anchor ?? null);
      },
      // A band across the upper part of the screen: the group crossing it is "current".
      { rootMargin: "-30% 0px -60% 0px" },
    );
    for (const g of groups) {
      const el = document.getElementById(g.anchor);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [groups]);

  return (
    <nav aria-label="Tool groups" className="sticky top-[calc(4rem+env(safe-area-inset-top))] z-30 -mx-5 border-b border-ink/10 bg-paper/95 px-5 md:top-[calc(5rem+env(safe-area-inset-top))] md:-mx-10 md:px-10 md:backdrop-blur-md">
      <ul className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1 py-2.5">
        {groups.map((g) => (
          <li key={g.anchor} className="shrink-0">
            <a
              href={`#${g.anchor}`}
              aria-current={active === g.anchor ? "location" : undefined}
              className={cn(
                "label press flex items-center gap-2 rounded-full px-3.5 py-2 text-3xs whitespace-nowrap transition-colors",
                active === g.anchor ? "bg-ink text-paper" : "text-ink/75 hover:bg-ink/[0.06] hover:text-ink",
              )}
            >
              {g.label}
              <span className={cn("font-mono text-3xs tabular-nums", active === g.anchor ? "text-paper/75" : "text-ink/70")}>{g.count}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
