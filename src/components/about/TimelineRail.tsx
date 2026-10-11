"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Vertical rail that fills with colour as the timeline scrolls past the middle of the screen. */
export default function TimelineRail({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (innerHeight * 0.6 - r.top) / r.height));
      fill.current?.style.setProperty("transform", `scaleY(${p})`);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("scroll", schedule);
      removeEventListener("resize", schedule);
    };
  }, []);

  return (
    <div ref={ref} className="relative pl-10 md:pl-14">
      <span aria-hidden className="absolute top-2 bottom-2 left-[0.6rem] w-px bg-ink/15 md:left-[1.1rem]">
        <span ref={fill} className="block h-full w-full origin-top scale-y-0 bg-ember" />
      </span>
      {children}
    </div>
  );
}
