"use client";

import { useEffect, useRef } from "react";
import { useDeviceProfile } from "@/lib/device";

const INTERACTIVE = ".interactive, a, button, input, textarea, select, label, [role='button']";

/** Red dot cursor for mouse users. Never mounts on touch devices. */
export default function CustomCursor() {
  const { finePointer, reducedMotion } = useDeviceProfile();
  if (!finePointer) return null;
  return <Cursor smooth={!reducedMotion} />;
}

function Cursor({ smooth }: { smooth: boolean }) {
  const dotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dot = dotRef.current;
    if (!dot) return;
    document.documentElement.classList.add("has-custom-cursor");

    const target = { x: -100, y: -100 };
    const pos = { x: -100, y: -100 };
    let frame = 0;
    let hovering = false;

    // Direct style writes inside rAF: no React re-render per mouse move.
    const render = () => {
      const ease = smooth ? 0.35 : 1;
      pos.x += (target.x - pos.x) * ease;
      pos.y += (target.y - pos.y) * ease;
      dot.style.transform = `translate3d(${pos.x - 6}px, ${pos.y - 6}px, 0) scale(${hovering ? 2.5 : 1})`;
      frame = Math.abs(target.x - pos.x) + Math.abs(target.y - pos.y) > 0.1 ? requestAnimationFrame(render) : 0;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(render);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      target.x = e.clientX;
      target.y = e.clientY;
      dot.style.opacity = "1";
      schedule();
    };
    const onOver = (e: Event) => {
      const next = !!(e.target as Element | null)?.closest?.(INTERACTIVE);
      if (next !== hovering) {
        hovering = next;
        dot.dataset.hover = next ? "true" : "false";
        schedule();
      }
    };
    const onLeave = () => (dot.style.opacity = "0");

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerover", onOver, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerover", onOver);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      document.documentElement.classList.remove("has-custom-cursor");
    };
  }, [smooth]);

  return (
    <div
      ref={dotRef}
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 z-[1000] h-3 w-3 rounded-full bg-accentRed opacity-0 shadow-[0_0_10px_rgba(229,26,26,0.8)] transition-[opacity,background-color] duration-200 will-change-transform data-[hover=true]:bg-accentRed/50"
    />
  );
}
