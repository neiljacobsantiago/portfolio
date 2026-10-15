"use client";

import ShareButton from "@/components/ui/ShareButton";
import { haptic } from "@/lib/haptics";

/** Save as PDF goes through the browser's print dialog, which the résumé is styled for. */
export default function ResumeActions() {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => {
          haptic();
          print();
        }}
        className="label press inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-paper hover:bg-ember"
      >
        <svg viewBox="0 0 24 24" aria-hidden className="h-3.5 w-3.5 fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]">
          <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
        </svg>
        Save as PDF
      </button>
      <ShareButton title="Neil Jacob Santiago — Résumé" text="Networks, web systems & photography" />
    </div>
  );
}
