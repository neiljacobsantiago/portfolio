"use client";

import { useEffect } from "react";
import { useDeviceProfile } from "@/lib/device";

/**
 * Global progressive enhancements:
 * - tags <html> with `low-power` so CSS can drop ambient animation
 * - desktop-only inertial smooth scrolling (Lenis), loaded on demand
 * - a hello in the browser console
 */
let greeted = false;

export default function SiteEffects() {
  const { lowPower, finePointer, reducedMotion } = useDeviceProfile();

  // A hello for anyone who opens the developer tools.
  useEffect(() => {
    if (greeted) return;
    greeted = true;
    console.log(
      "%cNeil Jacob Santiago%c\nNetworks, web systems & photography.\n\nCurious how this was built? Try /terminal, or press ? for keyboard shortcuts.\nThe photographs are © Neil Jacob Santiago. Ask before using them: /contact",
      "font: 28px Georgia, serif; color: #780000; padding: 4px 0;",
      "font: 12px/1.6 ui-monospace, monospace; color: #003049;",
    );
  }, []);

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

  // Background colour fields lean gently toward the cursor.
  useEffect(() => {
    if (!finePointer || reducedMotion || lowPower) return;
    const field = document.querySelector<HTMLElement>(".paper-field");
    if (!field) return;
    let frame = 0;
    let mx = 0;
    let my = 0;
    const onMove = (e: PointerEvent) => {
      mx = e.clientX / innerWidth - 0.5;
      my = e.clientY / innerHeight - 0.5;
      if (!frame)
        frame = requestAnimationFrame(() => {
          frame = 0;
          field.style.setProperty("--mx", mx.toFixed(3));
          field.style.setProperty("--my", my.toFixed(3));
        });
    };
    addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("pointermove", onMove);
    };
  }, [finePointer, reducedMotion, lowPower]);

  return null;
}
