"use client";

import { haptic } from "@/lib/haptics";
import { askNeilAI, type AskDetail } from "@/lib/neilai-events";
import { cn } from "@/lib/utils";

/** Opens NeilAI with a question (or a tool card) already on its way. */
export default function AskNeilButton({ children, className, ...detail }: AskDetail & { children: React.ReactNode; className?: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        haptic();
        askNeilAI(detail);
      }}
      className={cn("label press inline-flex items-center gap-2 rounded-full border border-ink/20 px-4 py-2.5 text-2xs hover:border-ink hover:bg-ink hover:text-paper", className)}
    >
      <span aria-hidden className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ember/60" />
        <span className="relative h-2 w-2 rounded-full bg-ember" />
      </span>
      {children}
    </button>
  );
}
