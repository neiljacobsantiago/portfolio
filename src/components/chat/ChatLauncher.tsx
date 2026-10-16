"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useDeviceProfile } from "@/lib/device";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { ASK_EVENT, stashAsk, type AskDetail } from "@/lib/neilai-events";
import { teaserFor } from "@/lib/neilai/teasers";
import BlobAvatar from "./BlobAvatar";

// The chat panel is only downloaded the first time someone opens it.
const NeilAI = dynamic(() => import("./NeilAI"), { ssr: false });

export default function ChatLauncher() {
  const [open, setOpen] = useState(false);
  // Each opening gets its own deal of suggestion chips.
  const [opens, setOpens] = useState(0);
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setOpens((n) => n + 1);
  }
  const [loaded, setLoaded] = useState(false);
  const [teaser, setTeaser] = useState<string | null>(null);
  const [wiggle, setWiggle] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const [tucked, setTucked] = useState(false);
  const { finePointer, reducedMotion } = useDeviceProfile();

  // Phones: step out of the way while reading (scrolling down), come back on the way up.
  useEffect(() => {
    let last = scrollY;
    const onScroll = () => {
      const y = scrollY;
      if (Math.abs(y - last) < 8) return;
      setTucked(y > last && y > 320 && innerWidth < 768);
      last = y;
    };
    addEventListener("scroll", onScroll, { passive: true });
    return () => removeEventListener("scroll", onScroll);
  }, []);

  // While the chat is open, track the visible viewport: when the on-screen keyboard
  // opens it shrinks, so the panel is sized to what's left (--vv-h) and lifted above
  // the keyboard (--kb). Its header then stays below the NavBar and the input stays
  // above the keys. Pinch-zoom is left alone.
  useEffect(() => {
    const el = rootRef.current;
    const vv = window.visualViewport;
    if (!open || !el || !vv) return;
    const clear = () => {
      el.style.removeProperty("--vv-h");
      el.style.removeProperty("--kb");
    };
    const sync = () => {
      if (vv.scale > 1.01) return clear();
      el.style.setProperty("--vv-h", `${Math.round(vv.height)}px`);
      el.style.setProperty("--kb", `${Math.max(0, Math.round(innerHeight - vv.height - vv.offsetTop))}px`);
    };
    sync();
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    return () => {
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
      clear();
    };
  }, [open]);

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
      // Chosen in the browser after arriving (no SSR mismatch), to fit the page and the visitor's hour.
      setTeaser(teaserFor(location.pathname, new Date().getHours()));
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
    <div ref={rootRef} className={cn(
        "fixed right-[max(1rem,env(safe-area-inset-right))] z-40 flex flex-col items-end transition-[transform,opacity] duration-500 ease-[var(--ease-apple)] sm:right-[max(1.5rem,env(safe-area-inset-right))] [html[data-immersive]_&]:hidden",
        tucked && !open && "pointer-events-none translate-y-24 opacity-0",
      )}
      // --kb lifts the launcher (and the open panel) above the on-screen keyboard.
      style={{ bottom: "calc(max(1rem, env(safe-area-inset-bottom)) + var(--kb, 0px))" }}
    >
      {loaded && <NeilAI open={open} opens={opens} onClose={() => setOpen(false)} />}

      {teaser && !open && (
        <div className="animate-blob-in mb-3 hidden max-w-[16rem] origin-bottom-right md:flex items-start gap-2 rounded-2xl rounded-br-sm bg-paper px-4 py-3 shadow-[0_18px_40px_-14px_rgb(0_48_73/0.5)] ring-1 ring-ink/10">
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
        className="label press group flex h-14 items-center gap-3 rounded-full bg-ink p-1.5 text-paper ring-1 ring-paper/15 shadow-[0_18px_40px_-14px_rgb(0_48_73/0.7)] hover:bg-[#0a3d5c] md:pr-5"
      >
        <span className={wiggle ? "animate-wiggle" : undefined}>
          <BlobAvatar className="h-11 w-11 text-[0.75rem]" mood={open ? "happy" : "idle"} />
        </span>
        <span className="hidden md:inline">{open ? "Close" : "Ask about Neil"}</span>
        <span className="sr-only md:hidden">{open ? "Close" : "Ask NeilAI"}</span>
      </button>
    </div>
  );
}
