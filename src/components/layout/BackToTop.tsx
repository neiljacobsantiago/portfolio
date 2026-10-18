"use client";

import Icon from "@/components/ui/Icon";
import { haptic } from "@/lib/haptics";

export default function BackToTop() {
  return (
    <button
      type="button"
      onClick={() => {
        haptic();
        scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      }}
      className="group label press inline-flex items-center gap-2 transition-colors hover:text-sky"
    >
      Back to top <Icon name="arrow-up" className="transition-transform duration-500 ease-[var(--ease-spring)] group-hover:-translate-y-1" />
    </button>
  );
}
