"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

// The chat panel is only downloaded the first time someone opens it.
const NeilAI = dynamic(() => import("./NeilAI"), { ssr: false });

export default function ChatLauncher() {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const toggle = () => {
    setLoaded(true);
    setOpen((v) => !v);
  };

  return (
    <div className="fixed right-4 z-40 flex flex-col items-end sm:right-6" style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}>
      {loaded && <NeilAI open={open} onClose={() => setOpen(false)} />}
      <button
        type="button"
        onClick={toggle}
        onPointerEnter={() => import("./NeilAI")}
        aria-expanded={open}
        aria-controls="neilai-panel"
        className="label group flex h-12 items-center gap-3 rounded-full bg-ink pr-5 pl-2 text-paper shadow-[0_18px_40px_-14px_rgb(0_48_73/0.7)] transition-colors hover:bg-ember"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-paper font-display text-base text-ink normal-case">{open ? "×" : "N"}</span>
        {open ? "Close" : "Ask about Neil"}
      </button>
    </div>
  );
}
