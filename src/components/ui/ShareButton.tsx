"use client";

import { useState } from "react";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

/** Opens the phone's share sheet; on desktops without one, copies the link. */
export default function ShareButton({ title, text, className }: { title: string; text?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    haptic();
    const url = location.href.split("#")[0];
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };
  return (
    <button type="button" onClick={share} className={cn("label press inline-flex items-center gap-2 rounded-full border border-ink/20 px-4 py-2.5 hover:border-ink", className)} aria-live="polite">
      <svg viewBox="0 0 24 24" aria-hidden className="h-3.5 w-3.5 fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]">
        <path d="M12 15V3M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
      </svg>
      {copied ? "Link copied" : "Share"}
    </button>
  );
}
