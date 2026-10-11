"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { MessageSquare, X } from "lucide-react";

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
    <div
      className="fixed right-4 z-40 flex flex-col items-end sm:right-6"
      style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      {loaded && <NeilAI open={open} onClose={() => setOpen(false)} />}
      <button
        type="button"
        onClick={toggle}
        onPointerEnter={() => import("./NeilAI")}
        aria-expanded={open}
        aria-controls="neilai-panel"
        aria-label={open ? "Close NeilAI chat" : "Chat with NeilAI"}
        className="interactive flex h-14 w-14 items-center justify-center rounded-full border-2 border-marine bg-accentRed shadow-[0_10px_25px_rgba(229,26,26,0.4)] transition-transform hover:scale-105 active:scale-95"
      >
        {open ? <X className="h-6 w-6 text-butter" /> : <MessageSquare className="h-6 w-6 text-butter" />}
      </button>
    </div>
  );
}
