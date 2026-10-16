"use client";

import { useEffect, type RefObject } from "react";
import { useDeviceProfile } from "@/lib/device";
import { useScrollProgress } from "@/lib/scroll";

/** True where the browser can run CSS scroll-driven animations (they run off the main thread). */
const supportsScrollTimelines = () => typeof CSS !== "undefined" && CSS.supports("animation-timeline: view()");

/**
 * Pinned scroll scenes (`.scene-root`, see globals.css) are pure CSS where
 * scroll-driven animations exist: each `.sx` element plays its keyframes
 * (`--kf`) over its slice (`--a` → `--b`) of the scene's scroll range.
 *
 * Desktop browsers without them get this fallback: one rAF loop writes the
 * scene's progress to `--p`, and the very same keyframes are scrubbed with a
 * paused animation and a negative delay. Phones without support, reduced
 * motion and low-power devices keep the static layout.
 */
export function useSceneFallback(ref: RefObject<HTMLElement | null>) {
  const { desktop, lowPower } = useDeviceProfile();
  const enabled = desktop && !lowPower && !supportsScrollTimelines();

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    el.setAttribute("data-scene-js", "");
    return () => {
      el.removeAttribute("data-scene-js");
      el.style.removeProperty("--p");
    };
  }, [ref, enabled]);

  useScrollProgress(ref, (p) => ref.current?.style.setProperty("--p", p.toFixed(4)), enabled);
}
