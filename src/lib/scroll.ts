"use client";

import { useEffect, type RefObject } from "react";

/**
 * Calls `onProgress(p)` with 0→1 as `ref` travels through its scroll range:
 * 0 when its top reaches the viewport top, 1 when its bottom reaches the
 * viewport bottom (i.e. the classic "pinned section" range). Runs inside rAF,
 * so callbacks should write styles directly rather than set React state.
 */
export function useScrollProgress(ref: RefObject<HTMLElement | null>, onProgress: (p: number) => void, enabled = true) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const range = rect.height - innerHeight;
      const p = range > 0 ? Math.min(1, Math.max(0, -rect.top / range)) : rect.top < 0 ? 1 : 0;
      onProgress(p);
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
    // onProgress is intentionally excluded: callers pass inline closures that only touch refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, enabled]);
}
