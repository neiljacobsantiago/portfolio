"use client";

import { useRef, type ReactNode } from "react";
import { useDeviceProfile } from "@/lib/device";

/**
 * Wraps a button/link so it leans toward the cursor when it gets close,
 * then springs back. Mouse users only; a plain wrapper everywhere else.
 */
export default function Magnetic({ children, strength = 0.25, className = "" }: { children: ReactNode; strength?: number; className?: string }) {
  const { finePointer, reducedMotion } = useDeviceProfile();
  const ref = useRef<HTMLSpanElement>(null);
  const active = finePointer && !reducedMotion;

  const move = (e: React.PointerEvent<HTMLSpanElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - (r.left + r.width / 2)) * strength;
    const y = (e.clientY - (r.top + r.height / 2)) * strength;
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  };
  const reset = () => {
    if (ref.current) ref.current.style.transform = "";
  };

  return (
    <span
      ref={ref}
      onPointerMove={active ? move : undefined}
      onPointerLeave={active ? reset : undefined}
      className={`inline-block transition-transform duration-500 ease-[var(--ease-spring)] ${className}`}
    >
      {children}
    </span>
  );
}
