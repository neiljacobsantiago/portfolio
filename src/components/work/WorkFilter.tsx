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

  const choose = (key: string) => {
    haptic();
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
      <div role="tablist" aria-label="Filter projects" className="no-scrollbar -mx-5 mb-10 flex gap-2 overflow-x-auto px-5 md:mx-0 md:px-0">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            type="button"
            aria-selected={filter === t.key}
            onClick={() => choose(t.key)}
            className={cn(
              "label press shrink-0 rounded-full border px-4 py-2.5",
              filter === t.key ? "border-ink bg-ink text-paper" : "border-ink/20 hover:border-ink",
            )}
          >
            {t.label} <span className="opacity-50">{t.count}</span>
          </button>
        ))}
      </div>
      {children}
    </div>
  );
}
