"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/Icon";
import type { Profile } from "@/content/about";
import { haptic } from "@/lib/haptics";

/**
 * A swipeable contact sheet of portraits. Swipe on phones; on desktop drag
 * it, use the arrows or the keyboard. The frame in the middle develops into
 * full colour, the rest sit back like unpicked negatives.
 */
export default function ProfileReel({ profiles }: { profiles: Profile[] }) {
  const scroller = useRef<HTMLOListElement>(null);
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const [active, setActive] = useState(0);

  // The active frame is whichever sits closest to the middle of the strip.
  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const mid = root.scrollLeft + root.clientWidth / 2;
      let best = 0;
      let bestDist = Infinity;
      root.querySelectorAll<HTMLElement>("[data-index]").forEach((el, i) => {
        const dist = Math.abs(el.offsetLeft + el.offsetWidth / 2 - mid);
        if (dist < bestDist) [best, bestDist] = [i, dist];
      });
      setActive(best);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    root.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      root.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  const go = (i: number) => {
    const root = scroller.current;
    const target = root?.querySelector<HTMLElement>(`[data-index="${Math.max(0, Math.min(profiles.length - 1, i))}"]`);
    if (!root || !target) return;
    haptic();
    root.scrollTo({ left: target.offsetLeft - (root.clientWidth - target.clientWidth) / 2, behavior: "smooth" });
  };

  // Mouse drag (touch already scrolls natively).
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || !scroller.current) return;
    drag.current = { x: e.clientX, left: scroller.current.scrollLeft, moved: false };
    scroller.current.style.scrollSnapType = "none";
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || !scroller.current) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > 4) d.moved = true;
    scroller.current.scrollLeft = d.left - dx;
  };
  const endDrag = () => {
    const d = drag.current;
    const root = scroller.current;
    drag.current = null;
    if (!d || !root) return;
    root.style.scrollSnapType = "";
    if (d.moved) go(active);
  };

  return (
    <div className="relative">
      <div className="mb-6 flex items-center justify-between gap-4">
        <p className="label text-ink/75" aria-live="polite">
          <span className="text-ember">{String(active + 1).padStart(2, "0")}</span> / {String(profiles.length).padStart(2, "0")} · {profiles[active]?.title}
        </p>
        <div className="flex gap-2">
          {[
            { label: "Previous portrait", dir: -1, icon: "arrow-left" as const },
            { label: "Next portrait", dir: 1, icon: "arrow-right" as const },
          ].map((b) => (
            <button
              key={b.dir}
              type="button"
              aria-label={b.label}
              disabled={b.dir < 0 ? active === 0 : active === profiles.length - 1}
              onClick={() => go(active + b.dir)}
              className="press flex h-11 w-11 items-center justify-center rounded-full border border-ink/25 text-lg hover:border-ink hover:bg-ink hover:text-paper disabled:pointer-events-none disabled:opacity-30"
            >
              <Icon name={b.icon} className="h-[1.1rem] w-[1.1rem]" />
            </button>
          ))}
        </div>
      </div>

      {/* The film strip */}
      <div className="-mx-5 bg-ink py-3 md:mx-0 md:rounded-[2px]">
        <Sprockets />
        <ol
          ref={scroller}
          tabIndex={0}
          aria-label="Portraits"
          onKeyDown={(e) => {
            const dir = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
            if (!dir) return;
            e.preventDefault();
            go(active + dir);
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
          onClickCapture={(e) => drag.current?.moved && e.preventDefault()}
          className="no-scrollbar relative flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain px-[11vw] py-5 outline-none select-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-inset sm:px-[calc(50%-11rem)] pointer-fine:cursor-grab pointer-fine:active:cursor-grabbing"
        >
          {profiles.map((p, i) => (
            <li
              key={p.src}
              data-index={i}
              data-active={active === i}
              className="group relative w-[78vw] shrink-0 snap-center transition-[transform,opacity,filter] duration-700 ease-[var(--ease-apple)] data-[active=false]:scale-[0.92] data-[active=false]:opacity-55 data-[active=false]:saturate-0 sm:w-[22rem]"
            >
              <figure
                className="relative aspect-[3/4] overflow-hidden rounded-[2px] bg-paper-deep"
                style={p.backdrop ? { background: p.backdrop } : undefined}
                onClick={() => active !== i && go(i)}
              >
                <Image
                  src={p.src}
                  alt={p.alt}
                  width={p.width}
                  height={p.height}
                  draggable={false}
                  sizes="(min-width: 640px) 22rem, 78vw"
                  className={`h-full w-full transition-transform duration-[1.2s] ease-[var(--ease-apple)] group-hover:scale-[1.04] ${p.backdrop ? "object-contain object-bottom pt-6" : "object-cover"}`}
                />
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/85 via-ink/40 to-transparent p-5 pt-16 text-paper">
                  <p className="font-display text-2xl leading-none">{p.title}</p>
                  <p className="mt-1 font-serif text-base text-paper/85 italic">{p.caption}</p>
                  {p.exif && (
                    <p className="mt-3 grid grid-rows-[0fr] font-mono text-[0.62rem] text-sky transition-[grid-template-rows] duration-500 ease-[var(--ease-apple)] group-hover:grid-rows-[1fr] group-data-[active=true]:max-sm:grid-rows-[1fr]">
                      <span className="overflow-hidden">{p.exif}</span>
                    </p>
                  )}
                </figcaption>
              </figure>
              <p aria-hidden className="mt-2 flex justify-between font-mono text-[0.6rem] tracking-[0.2em] text-sky">
                <span>NJS {String(i + 1).padStart(2, "0")}A</span>
                <span>{p.exif ? p.exif.split(" · ")[0].toUpperCase() : "STUDIO"}</span>
              </p>
            </li>
          ))}
        </ol>
        <Sprockets />
      </div>

      <div className="mt-5 flex justify-center gap-2" aria-hidden>
        {profiles.map((p, i) => (
          <span key={p.src} className={`h-1.5 rounded-full transition-all duration-500 ease-[var(--ease-spring)] ${active === i ? "w-8 bg-ember" : "w-1.5 bg-ink/30"}`} />
        ))}
      </div>
    </div>
  );
}

function Sprockets() {
  return (
    <div
      aria-hidden
      className="h-2.5 opacity-80"
      style={{
        backgroundImage: "linear-gradient(90deg, var(--color-paper) 0 14px, transparent 14px)",
        backgroundSize: "26px 100%",
        backgroundPosition: "6px 0",
        maskImage: "linear-gradient(90deg, transparent, #000 4%, #000 96%, transparent)",
      }}
    />
  );
}
