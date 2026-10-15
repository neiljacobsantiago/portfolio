"use client";

import { useState } from "react";
import { checkLink, type FlagLevel } from "@/lib/tools/link-check";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { Note, input } from "./ui";

const SAMPLES = ["gcash-verify-account.xyz/otp", "https://www.facebook.com.secure-login.top/confirm", "bit.ly/3promo", "https://clsu.edu.ph"];

const TONE: Record<FlagLevel, { badge: string; icon: string }> = {
  danger: { badge: "bg-ember text-paper", icon: "✕" },
  warn: { badge: "bg-[#d9a441] text-ink", icon: "!" },
  ok: { badge: "bg-[#5b8c5a] text-paper", icon: "✓" },
};

/** Phishing red flags, explained — from the Cyber Awareness Series. Never opens the link. */
export default function LinkCheckTool({ initial = "", compact }: { initial?: string; compact?: boolean }) {
  const [value, setValue] = useState(initial);
  const [checked, setChecked] = useState(initial);
  const report = checked ? checkLink(checked) : null;

  const run = (url: string) => {
    haptic();
    setValue(url);
    setChecked(url);
  };

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(value);
        }}
        className="flex gap-2"
      >
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Paste a link from a text or chat…"
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          aria-label="Link to check"
          className={cn(input, "min-w-0 flex-1")}
        />
        <button type="submit" className="label press shrink-0 rounded-[2px] bg-ink px-4 text-[0.6rem] text-paper hover:bg-ember">
          Check
        </button>
      </form>

      <div className="flex flex-wrap gap-1.5">
        <span className="label self-center text-[0.52rem] text-ink/45">Try</span>
        {SAMPLES.slice(0, compact ? 3 : 4).map((s) => (
          <button key={s} type="button" onClick={() => run(s)} className="press max-w-full truncate rounded-full bg-ink/[0.06] px-2.5 py-1 font-mono text-[0.62rem] text-ink/70 hover:bg-ink hover:text-paper">
            {s.replace(/^https?:\/\//, "")}
          </button>
        ))}
      </div>

      {report && "error" in report && <Note>{report.error}</Note>}
      {report && !("error" in report) && (
        <div key={report.url} className="animate-pop-in space-y-3">
          <div className={cn("flex items-center gap-3 rounded-[2px] p-3", TONE[report.level].badge)}>
            <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-paper/25 font-display text-lg">
              {TONE[report.level].icon}
            </span>
            <div className="min-w-0">
              <p className="font-display text-xl leading-tight">{report.verdict}</p>
              <p className="truncate font-mono text-[0.65rem] opacity-80">{report.host || report.url}</p>
            </div>
          </div>
          <ul className="space-y-2">
            {report.flags.map((f, i) => (
              <li key={i} className="animate-pop-in flex gap-2.5 font-serif text-[0.95rem] leading-snug text-ink/85" style={{ animationDelay: `${i * 60}ms` }}>
                <span aria-hidden className={cn("mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[0.6rem] font-bold", TONE[f.level].badge)}>
                  {TONE[f.level].icon}
                </span>
                {f.text}
              </li>
            ))}
          </ul>
          <Note>Checks the address only, never opens it. Even a clean-looking link can lead to a fake page — never type an OTP or password from a link you were sent.</Note>
        </div>
      )}
    </div>
  );
}
