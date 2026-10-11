"use client";

import { useEffect } from "react";
import { useDeviceProfile } from "@/lib/device";

/**
 * Global progressive enhancements:
 * - tags <html> with `low-power` so CSS can drop ambient animation
 * - desktop-only inertial smooth scrolling (Lenis), loaded on demand
 */
export default function SiteEffects() {
  const { lowPower, finePointer, reducedMotion } = useDeviceProfile();

  useEffect(() => {
    document.documentElement.classList.toggle("low-power", lowPower);
  }, [lowPower]);

  useEffect(() => {
    if (!finePointer || reducedMotion || lowPower) return;
    let lenis: { destroy(): void } | null = null;
    let cancelled = false;
    import("lenis").then(({ default: Lenis }) => {
      if (cancelled) return;
      lenis = new Lenis({ autoRaf: true, lerp: 0.1, anchors: { offset: -80 } });
    });
    return () => {
      cancelled = true;
      lenis?.destroy();
    };
  }, [finePointer, reducedMotion, lowPower]);

  return null;
}
