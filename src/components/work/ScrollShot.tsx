"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { haptic } from "@/lib/haptics";
import Icon from "@/components/ui/Icon";

/**
 * A full-length page capture inside a little browser window. Scroll it like a
 * real page; on desktop it glides down by itself while hovered, and "Expand"
 * opens it full screen.
 */
export default function ScrollShot({ src, alt, host }: { src: string; alt: string; host: string }) {
  const viewport = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLSpanElement>(null);
  const glide = useRef(0);
  const [touched, setTouched] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const stop = () => cancelAnimationFrame(glide.current);

  const onScroll = () => {
    const el = viewport.current;
    if (!el || !rail.current) return;
    const max = el.scrollHeight - el.clientHeight;
    rail.current.style.transform = `scaleY(${max > 0 ? el.scrollTop / max : 0})`;
  };

  const start = () => {
    if (!matchMedia("(hover: hover) and (pointer: fine)").matches || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = viewport.current;
    if (!el) return;
    stop();
    const step = () => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 1) return;
      el.scrollTop += 1.6;
      glide.current = requestAnimationFrame(step);
    };
    glide.current = requestAnimationFrame(step);
  };

  const takeOver = () => {
    stop();
    setTouched(true);
  };

  useEffect(() => stop, []);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setExpanded(false);
    document.documentElement.style.overflow = "hidden";
    addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = "";
      removeEventListener("keydown", onKey);
    };
  }, [expanded]);

  return (
    <>
      <div className="overflow-hidden rounded-xl bg-paper shadow-[0_30px_70px_-30px_rgb(0_48_73/0.55)] ring-1 ring-ink/15">
        <div className="flex items-center gap-3 border-b border-ink/10 bg-paper-deep/70 px-4 py-2.5">
          <span aria-hidden className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-ember/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#e5b84b]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#5bb974]" />
          </span>
          <span className="mx-auto min-w-0 truncate rounded-full bg-paper px-4 py-1 font-mono text-[0.7rem] text-ink/60">{host}</span>
          <button
            type="button"
            onClick={() => {
              haptic();
              setExpanded(true);
            }}
            className="label press inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-[0.58rem] text-ink/60 hover:bg-ink hover:text-paper"
          >
            Expand <Icon name="plus" className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="relative">
          <div
            ref={viewport}
            data-lenis-prevent
            onScroll={onScroll}
            onMouseEnter={start}
            onMouseLeave={stop}
            onWheel={takeOver}
            onPointerDown={takeOver}
            onTouchStart={takeOver}
            tabIndex={0}
            aria-label={`${alt} (scrollable)`}
            className="thin-scrollbar h-[min(68vh,620px)] overflow-y-auto overscroll-contain outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-inset"
          >
            <Image src={src} alt={alt} width={1200} height={3600} sizes="(min-width: 768px) 60vw, 92vw" className="h-auto w-full" />
          </div>
          <span aria-hidden className="pointer-events-none absolute top-2 right-1.5 bottom-2 w-[3px] overflow-hidden rounded-full bg-ink/10">
            <span ref={rail} className="block h-full w-full origin-top scale-y-0 rounded-full bg-ember" />
          </span>
          <span
            aria-hidden
            className={`label pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-ink/85 px-4 py-2 text-[0.58rem] whitespace-nowrap text-paper backdrop-blur transition-opacity duration-500 ${touched ? "opacity-0" : "opacity-100"}`}
          >
            <span className="pointer-fine:hidden">Swipe inside to scroll</span>
            <span className="hidden pointer-fine:inline">Hover to glide · scroll to explore</span>
          </span>
        </div>
      </div>

      {expanded &&
        createPortal(
          <div role="dialog" aria-modal="true" aria-label={alt} className="animate-page-in fixed inset-0 z-[90] flex flex-col bg-ink/95 backdrop-blur-sm" onClick={() => setExpanded(false)}>
            <div className="flex shrink-0 items-center justify-between px-5 py-4 text-paper">
              <span className="font-mono text-sm text-paper/70">{host}</span>
              <button type="button" onClick={() => setExpanded(false)} aria-label="Close" className="press flex h-10 w-10 items-center justify-center rounded-full bg-paper/10 hover:bg-paper/20">
                <Icon name="close" className="h-5 w-5" />
              </button>
            </div>
            <div data-lenis-prevent className="thin-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-10" onClick={(e) => e.stopPropagation()}>
              <Image src={src} alt={alt} width={1200} height={3600} sizes="(min-width: 1024px) 960px, 100vw" className="animate-pop-in mx-auto h-auto w-full max-w-5xl rounded-lg" />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
