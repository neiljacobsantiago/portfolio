"use client";

import { useRef, type ReactNode } from "react";
import { useDeviceProfile } from "@/lib/device";
import { cn } from "@/lib/utils";

/**
 * Gives a card a subtle 3D tilt toward the cursor plus a soft moving sheen,
 * like light catching glass. Mouse users only; static elsewhere.
 */
export default function Tilt({ children, className, max = 6 }: { children: ReactNode; className?: string; max?: number }) {
  const { finePointer, reducedMotion } = useDeviceProfile();
  const ref = useRef<HTMLDivElement>(null);
  const active = finePointer && !reducedMotion;

  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty("--rx", `${(0.5 - py) * max}deg`);
    el.style.setProperty("--ry", `${(px - 0.5) * max}deg`);
    el.style.setProperty("--sx", `${px * 100}%`);
    el.style.setProperty("--sy", `${py * 100}%`);
    el.style.setProperty("--shine", "1");
  };
  const reset = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--shine", "0");
  };

  return (
    <div
      ref={ref}
      onPointerMove={active ? move : undefined}
      onPointerLeave={active ? reset : undefined}
      className={cn("relative [transform:perspective(900px)_rotateX(var(--rx,0))_rotateY(var(--ry,0))] transition-transform duration-500 ease-[var(--ease-apple)] will-change-transform", className)}
    >
      {children}
      {active && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] opacity-[var(--shine,0)] mix-blend-soft-light transition-opacity duration-500"
          style={{ background: "radial-gradient(600px circle at var(--sx,50%) var(--sy,50%), rgb(255 255 255 / 0.35), transparent 40%)" }}
        />
      )}
    </div>
  );
}
