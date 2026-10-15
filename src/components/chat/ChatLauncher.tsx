"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useDeviceProfile } from "@/lib/device";
import { haptic } from "@/lib/haptics";
import { ASK_EVENT, stashAsk, type AskDetail } from "@/lib/neilai-events";
import BlobAvatar from "./BlobAvatar";

// The chat panel is only downloaded the first time someone opens it.
const NeilAI = dynamic(() => import("./NeilAI"), { ssr: false });

const TEASERS = ["Psst — want to see the concert shots? 🎸", "Ask me what PathoScan does 🔬", "Need a photoshoot? I know the rates 📸", "Curious who Neil is? Ask me! 👋"];

export default function ChatLauncher() {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [teaser, setTeaser] = useState<string | null>(null);
  const [wiggle, setWiggle] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { finePointer, reducedMotion } = useDeviceProfile();

  // Eyes follow the cursor around the page.
  useEffect(() => {
    if (!finePointer || reducedMotion) return;
    const el = rootRef.current;
    if (!el) return;
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.right - 28);
        const dy = e.clientY - (r.bottom - 28);
        const d = Math.max(1, Math.hypot(dx, dy));
        el.style.setProperty("--look-x", (dx / d).toFixed(2));
        el.style.setProperty("--look-y", (dy / d).toFixed(2));
      });
    };
    addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("pointermove", onMove);
    };
  }, [finePointer, reducedMotion]);

  // A one-time nudge per visit, a little after arriving.
  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem("neilai-teased") === "1";
    } catch {}
    if (seen) return;
    const id = setTimeout(() => {
      setTeaser(TEASERS[Math.floor(Math.random() * TEASERS.length)]);
      setWiggle(true);
      try {
        sessionStorage.setItem("neilai-teased", "1");
      } catch {}
    }, 9000);
    return () => clearTimeout(id);
  }, []);

  // "Ask NeilAI" buttons, the command palette and Lab pages open the chat with a request.
  const loadedRef = useRef(false);
  useEffect(() => {
    const onAsk = (e: Event) => {
      setTeaser(null);
      if (!loadedRef.current) {
        // The panel isn't mounted yet: park the request for it to pick up.
        stashAsk((e as CustomEvent<AskDetail>).detail);
        loadedRef.current = true;
        setLoaded(true);
        requestAnimationFrame(() => requestAnimationFrame(() => setOpen(true)));
      } else {
        setOpen(true);
      }
    };
    addEventListener(ASK_EVENT, onAsk);
    return () => removeEventListener(ASK_EVENT, onAsk);
  }, []);

  const toggle = () => {
    haptic();
    setTeaser(null);
    loadedRef.current = true;
    setLoaded(true);
    if (!loaded) requestAnimationFrame(() => requestAnimationFrame(() => setOpen(true)));
    else setOpen((v) => !v);
  };

  return (
    <div ref={rootRef} className="fixed right-4 z-40 flex flex-col items-end sm:right-6 [html[data-immersive]_&]:hidden" style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}>
      {loaded && <NeilAI open={open} onClose={() => setOpen(false)} />}

      {teaser && !open && (
        <div className="animate-pop-in mb-3 flex max-w-[16rem] origin-bottom-right items-start gap-2 rounded-2xl rounded-br-sm bg-paper px-4 py-3 shadow-[0_18px_40px_-14px_rgb(0_48_73/0.5)] ring-1 ring-ink/10">
          <button type="button" onClick={toggle} className="text-left font-serif text-base leading-snug text-ink">
            {teaser}
          </button>
          <button type="button" onClick={() => setTeaser(null)} aria-label="Dismiss" className="-mt-1 -mr-1 p-1 text-lg leading-none text-ink/40 hover:text-ink">
            ×
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={toggle}
        onPointerEnter={() => {
          import("./NeilAI");
          setWiggle(true);
        }}
        onAnimationEnd={() => setWiggle(false)}
        aria-expanded={open}
        aria-controls="neilai-panel"
        aria-label={open ? "Close chat" : "Chat with NeilAI"}
        className="label press group flex h-14 items-center gap-3 rounded-full bg-ink py-1.5 pr-5 pl-1.5 text-paper shadow-[0_18px_40px_-14px_rgb(0_48_73/0.7)] hover:bg-[#0a3d5c]"
      >
        <span className={wiggle ? "animate-wiggle" : undefined}>
          <BlobAvatar className="h-11 w-11 text-[0.75rem]" mood={open ? "happy" : "idle"} />
        </span>
        <span className="hidden sm:inline">{open ? "Close" : "Ask about Neil"}</span>
        <span className="sm:hidden">{open ? "Close" : "Ask me"}</span>
      </button>
    </div>
  );
}
