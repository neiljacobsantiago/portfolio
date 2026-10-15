"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useDeviceProfile } from "@/lib/device";
import { haptic } from "@/lib/haptics";

/**
 * Interactive portrait: a duotone "negative" with a second, full-colour
 * exposure that develops wherever you point (mouse), drag (touch), or tap
 * (fully develops). When idle it slowly develops itself so phones see it alive.
 */
export default function Darkroom() {
  const { lowPower, finePointer } = useDeviceProfile();
  const frameRef = useRef<HTMLDivElement>(null);
  const [developed, setDeveloped] = useState(false);
  const interacting = useRef(false);

  const setSpot = (x: number, y: number, r?: number) => {
    const el = frameRef.current;
    if (!el) return;
    el.style.setProperty("--x", `${x}%`);
    el.style.setProperty("--y", `${y}%`);
    if (r !== undefined) el.style.setProperty("--r", `${r}%`);
  };

  // Idle wander: a slow Lissajous path so the print feels alive (only while on screen).
  useEffect(() => {
    const el = frameRef.current;
    if (lowPower || developed || !el) return;
    let frame = 0;
    let visible = true;
    const io = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting));
    io.observe(el);
    const start = performance.now();
    const tick = (now: number) => {
      if (visible && !interacting.current) {
        const t = (now - start) / 1000;
        setSpot(50 + Math.sin(t * 0.45) * 22, 42 + Math.cos(t * 0.31) * 20, 26);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      io.disconnect();
    };
  }, [lowPower, developed]);

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (developed) return;
    if (e.pointerType !== "mouse" && e.buttons === 0) return;
    interacting.current = true;
    const rect = e.currentTarget.getBoundingClientRect();
    setSpot(((e.clientX - rect.left) / rect.width) * 100, ((e.clientY - rect.top) / rect.height) * 100, 30);
  };

  return (
    <figure className="relative mx-auto w-full max-w-md lg:max-w-none">
      <div
        ref={frameRef}
        onPointerMove={onPointerMove}
        onPointerLeave={() => (interacting.current = false)}
        onClick={() => {
          haptic(12);
          setDeveloped((v) => !v);
        }}
        role="button"
        tabIndex={0}
        aria-pressed={developed}
        aria-label={developed ? "Return the portrait to its negative" : "Develop the full-colour portrait"}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setDeveloped((v) => !v))}
        className="group relative aspect-[4/5] touch-pan-y overflow-hidden rounded-[2px] bg-ink shadow-[0_40px_80px_-30px_rgb(0_48_73/0.55)] select-none"
        style={{ "--x": "50%", "--y": "40%", "--r": lowPower ? "0%" : "26%" } as React.CSSProperties}
      >
        {/* Negative: grayscale print toned with the palette */}
        <Image
          src="/njs_p.jpg"
          alt="Portrait of Neil Jacob Santiago"
          fill
          preload
          loading="eager"
          sizes="(min-width: 1024px) 40vw, (min-width: 640px) 28rem, 90vw"
          className="object-cover grayscale contrast-125"
        />
        <div className="absolute inset-0 bg-ember mix-blend-multiply" aria-hidden />
        <div className="absolute inset-0 bg-ink mix-blend-lighten" aria-hidden />

        {/* Developed exposure, revealed through a soft circular mask */}
        <div
          className="absolute inset-0"
          style={{
            maskImage: developed
              ? "none"
              : "radial-gradient(circle at var(--x) var(--y), #000 calc(var(--r) * 0.55), transparent var(--r))",
            WebkitMaskImage: developed
              ? "none"
              : "radial-gradient(circle at var(--x) var(--y), #000 calc(var(--r) * 0.55), transparent var(--r))",
          }}
        >
          <Image src="/njs_p1.jpg" alt="" fill loading="eager" sizes="(min-width: 1024px) 40vw, (min-width: 640px) 28rem, 90vw" className="object-cover" />
        </div>

        {/* Darkroom chrome */}
        <div className="pointer-events-none absolute inset-3 border border-paper/30" aria-hidden />
        <span className="label pointer-events-none absolute top-5 left-5 text-paper/85">Plate No. 01</span>
        <span className="label pointer-events-none absolute right-5 bottom-5 text-paper/85">{developed ? "Developed" : "Negative"}</span>
      </div>
      <figcaption className="mt-4 flex items-center justify-between gap-4 font-serif text-sm text-ink/70 italic">
        <span>{finePointer ? "Move across the print to develop it — click to see it whole." : "Drag across the print to develop it — tap to see it whole."}</span>
        <span className="label not-italic text-ember">Two exposures</span>
      </figcaption>
    </figure>
  );
}
