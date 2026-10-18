"use client";

import PhotoImage from "@/components/photography/Photo";
import Link from "next/link";
import { useEffect, useRef } from "react";
import type { Photo } from "@/lib/photos";
import Icon from "@/components/ui/Icon";

const WORDS = ["Networks", "Web systems", "Photography", "Security", "Production", "Astrophotography"];

/**
 * Two rows of photographs drifting in opposite directions with an outlined
 * word band between them. Scrolling the page speeds them up and skews them a
 * little, like film running through a gate. Static and swipeable when the
 * visitor prefers reduced motion or is on low-power hardware.
 */
export default function PhotoMarquee({ photos }: { photos: Photo[] }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const tracks = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    root.dataset.animated = "true";
    const offsets = [0, 0, 0];
    const dirs = [-1, 1, -1];
    const speeds = [38, 26, 44]; // px per second
    let velocity = 0;
    let lastY = scrollY;
    let last = performance.now();
    let raf = 0;
    let visible = false;
    let paused = false;

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    });
    io.observe(root);

    function tick(now: number) {
      raf = 0;
      if (!visible) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const dy = scrollY - lastY;
      lastY = scrollY;
      velocity += (Math.max(-60, Math.min(60, dy)) - velocity) * 0.12;
      const boost = 1 + Math.abs(velocity) * 0.18;
      tracks.current.forEach((el, i) => {
        if (!el) return;
        const half = el.scrollWidth / 2;
        offsets[i] += dirs[i] * speeds[i] * (paused ? 0.15 : boost) * dt * (velocity < -2 ? -1 : 1);
        if (offsets[i] <= -half) offsets[i] += half;
        if (offsets[i] > 0) offsets[i] -= half;
        el.style.transform = `translate3d(${offsets[i]}px,0,0) skewX(${(-velocity * 0.12).toFixed(2)}deg)`;
      });
      raf = requestAnimationFrame(tick);
    }

    const enter = () => (paused = true);
    const leave = () => (paused = false);
    root.addEventListener("pointerenter", enter);
    root.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      root.removeEventListener("pointerenter", enter);
      root.removeEventListener("pointerleave", leave);
    };
  }, []);

  const rows = [photos.filter((_, i) => i % 2 === 0), photos.filter((_, i) => i % 2 === 1)];

  return (
    <section ref={rootRef} aria-label="Recent photographs" className="group/marquee relative overflow-hidden bg-ink py-14 text-paper md:py-20">
      <PhotoRow
        photos={rows[0]}
        trackRef={(el) => {
          tracks.current[0] = el;
        }}
      />

      <div aria-hidden className="my-6 overflow-hidden md:my-10">
        <div
          ref={(el) => {
            tracks.current[1] = el;
          }}
          className="flex w-max will-change-transform"
        >
          {[0, 1].map((copy) => (
            <div key={copy} className="flex shrink-0 items-center">
              {WORDS.map((w, i) => (
                <span key={w} className="flex items-center font-display text-[clamp(3rem,9vw,8rem)] leading-none whitespace-nowrap">
                  <span className={i % 2 ? "text-ember" : "text-transparent [-webkit-text-stroke:1.5px_var(--color-paper)]"}>{w}</span>
                  <Icon name="sparkle" className="mx-6 h-[0.4em] w-[0.4em] text-sky md:mx-10" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <PhotoRow
        photos={rows[1]}
        trackRef={(el) => {
          tracks.current[2] = el;
        }}
      />

      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-ink to-transparent md:w-40" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-ink to-transparent md:w-40" />
    </section>
  );
}

function PhotoRow({ photos, trackRef }: { photos: Photo[]; trackRef: (el: HTMLDivElement | null) => void }) {
  return (
    <div className="no-scrollbar overflow-x-auto group-data-[animated=true]/marquee:overflow-hidden">
      <div ref={trackRef} className="flex w-max gap-4 px-4 will-change-transform md:gap-6">
        {[0, 1].map((copy) =>
          photos.map((p) => (
            <Link
              key={`${copy}-${p.src}`}
              href={`/photography#${p.series}`}
              tabIndex={copy ? -1 : undefined}
              aria-hidden={copy ? true : undefined}
              className="group/photo relative block h-44 shrink-0 overflow-hidden rounded-[2px] md:h-64"
              style={{ aspectRatio: `${p.width} / ${p.height}` }}
            >
              <PhotoImage src={p.src} variants={p.variants} alt={copy ? "" : p.alt} fill sizes="(min-width: 768px) 360px, 240px" className="object-cover transition-transform duration-700 ease-[var(--ease-apple)] group-hover/photo:scale-110" />
              <span className="label absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-ink/90 to-transparent px-3 pt-8 pb-2.5 text-3xs text-paper transition-transform duration-500 ease-[var(--ease-apple)] group-hover/photo:translate-y-0">
                {p.alt}
              </span>
            </Link>
          )),
        )}
      </div>
    </div>
  );
}
