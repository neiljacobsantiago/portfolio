"use client";

import { useEffect, useRef } from "react";

/** Counts from 0 to `value` with an ease-out when it scrolls into view. */
export default function CountUp({ value, duration = 1400 }: { value: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.textContent = "0";
    let frame = 0;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        el.textContent = Math.round(value * (1 - Math.pow(1 - t, 4))).toLocaleString("en-US");
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, duration]);

  // Server HTML shows the real number, so it's correct without JS.
  return (
    <span ref={ref} className="tabular-nums">
      {value.toLocaleString("en-US")}
    </span>
  );
}
