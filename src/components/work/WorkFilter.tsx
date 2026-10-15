"use client";

import { useEffect, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

type Tab = { key: string; label: string; count: number };

/**
 * Category chips for the work grid. Cards carry `data-category`; filtering is
 * a CSS rule on the wrapper, animated with the View Transitions API where
 * supported so cards glide into their new places.
 */
export default function WorkFilter({ tabs, children }: { tabs: Tab[]; children: ReactNode }) {
  const [filter, setFilter] = useState("all");

  // Deep links like /work#web
  useEffect(() => {
    const apply = () => {
      const key = location.hash.slice(1);
      if (tabs.some((t) => t.key === key)) setFilter(key);
    };
    apply();
    addEventListener("hashchange", apply);
    return () => removeEventListener("hashchange", apply);
  }, [tabs]);

  const choose = (key: string, chip?: HTMLElement) => {
    haptic();
    chip?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
    history.replaceState(null, "", key === "all" ? location.pathname : `#${key}`);
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
    if (doc.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      doc.startViewTransition(() => flushSync(() => setFilter(key)));
    } else {
      setFilter(key);
    }
  };

  return (
    <div data-filter={filter} className="group/filter">
      {/* Phones: the chips stay under the header while you scroll, and fade at the edges to show they scroll */}
      <div className="sticky top-[calc(4rem+env(safe-area-inset-top))] z-20 -mx-5 mb-10 bg-paper/92 py-2 backdrop-blur md:static md:mx-0 md:bg-transparent md:py-0 md:backdrop-blur-none">
      <div
        role="tablist"
        aria-label="Filter projects"
        className="no-scrollbar flex snap-x gap-2 overflow-x-auto scroll-px-5 px-5 [mask-image:linear-gradient(90deg,transparent,#000_16px,#000_calc(100%-40px),transparent)] md:px-0 md:[mask-image:none]"
      >
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            type="button"
            aria-selected={filter === t.key}
            onClick={(e) => choose(t.key, e.currentTarget)}
            className={cn(
              "label press shrink-0 snap-start rounded-full border px-4 py-2.5",
              filter === t.key ? "border-ink bg-ink text-paper" : "border-ink/20 hover:border-ink",
            )}
          >
            {t.label} <span className="opacity-50">{t.count}</span>
          </button>
        ))}
      </div>
      </div>
      {children}
    </div>
  );
}
