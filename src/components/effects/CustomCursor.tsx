"use client";

import { useEffect, useRef } from "react";
import { useDeviceProfile } from "@/lib/device";

const INTERACTIVE = "a, button, input, textarea, select, label, [role='button'], [data-cursor]";

/**
 * Ink-dot cursor for mouse users. Elements with `data-cursor="View"` (etc.)
 * expand it into a labelled disc. Never mounts on touch devices.
 */
export default function CustomCursor() {
  const { finePointer, reducedMotion } = useDeviceProfile();
  if (!finePointer) return null;
  return <Cursor smooth={!reducedMotion} />;
}

function Cursor({ smooth }: { smooth: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    const labelEl = labelRef.current;
    if (!el || !labelEl) return;
    document.documentElement.classList.add("has-custom-cursor");

    const target = { x: -100, y: -100 };
    const pos = { x: -100, y: -100 };
    let frame = 0;

    const render = () => {
      const ease = smooth ? 0.22 : 1;
      pos.x += (target.x - pos.x) * ease;
      pos.y += (target.y - pos.y) * ease;
      el.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
      frame = Math.abs(target.x - pos.x) + Math.abs(target.y - pos.y) > 0.1 ? requestAnimationFrame(render) : 0;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(render);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      target.x = e.clientX;
      target.y = e.clientY;
      el.style.opacity = "1";
      schedule();
    };
    const onOver = (e: Event) => {
      const hit = (e.target as Element | null)?.closest?.(INTERACTIVE);
      const label = hit?.getAttribute("data-cursor") ?? "";
      el.dataset.state = label ? "label" : hit ? "hover" : "idle";
      labelEl.textContent = label;
    };
    const onLeave = () => (el.style.opacity = "0");

    addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerover", onOver, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerover", onOver);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      document.documentElement.classList.remove("has-custom-cursor");
    };
  }, [smooth]);

  return (
    <div ref={ref} aria-hidden data-state="idle" className="group pointer-events-none fixed top-0 left-0 z-[1000] opacity-0 transition-opacity duration-300">
      <div className="flex h-3 w-3 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-ember transition-[width,height,background-color] duration-300 ease-out group-data-[state=hover]:h-10 group-data-[state=hover]:w-10 group-data-[state=hover]:bg-ember/25 group-data-[state=label]:h-20 group-data-[state=label]:w-20 group-data-[state=label]:bg-ink">
        <span ref={labelRef} className="label text-[0.65rem] text-paper opacity-0 transition-opacity group-data-[state=label]:opacity-100" />
      </div>
    </div>
  );
}
