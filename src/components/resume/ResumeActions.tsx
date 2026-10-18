"use client";

import { useState } from "react";
import Icon from "@/components/ui/Icon";
import { haptic } from "@/lib/haptics";

/**
 * Print / Save as PDF goes through the browser's print dialog, which the
 * résumé is styled for (one sheet, no site chrome). Share opens the phone's
 * share sheet, or copies the link on desktops without one.
 */
export default function ResumeActions() {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    haptic();
    const url = location.href.split("#")[0];
    if (navigator.share) {
      try {
        await navigator.share({ title: "Neil Jacob Santiago — Résumé", text: "BS Information Technology · Network Systems & Web Systems", url });
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
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => {
          haptic();
          print();
        }}
        className="label press inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-paper hover:bg-ember"
      >
        <Icon name="print" className="h-4 w-4" />
        Print / Save as PDF
      </button>
      <button type="button" onClick={share} aria-live="polite" className="label press inline-flex min-h-11 items-center gap-2 rounded-full border border-ink/25 px-4 py-2.5 text-ink hover:border-ink">
        <Icon name={copied ? "check" : "share"} className="h-4 w-4" />
        {copied ? "Link copied" : "Share"}
      </button>
    </div>
  );
}
