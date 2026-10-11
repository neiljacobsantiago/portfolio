"use client";

import Image from "next/image";
import { useRef } from "react";
import { useDeviceProfile } from "@/lib/device";
import { useScrollProgress } from "@/lib/scroll";
import { site } from "@/lib/site";

/**
 * Pinned scroll scene (desktop): the two halves of the tagline drift apart
 * while a photograph opens up between them. On phones it is a still layout.
 */
export default function Statement() {
  const { desktop, lowPower } = useDeviceProfile();
  const animate = desktop && !lowPower;
  const sectionRef = useRef<HTMLElement>(null);
  const lineA = useRef<HTMLSpanElement>(null);
  const lineB = useRef<HTMLSpanElement>(null);
  const photo = useRef<HTMLDivElement>(null);
  const copy = useRef<HTMLParagraphElement>(null);

  useScrollProgress(
    sectionRef,
    (p) => {
      lineA.current?.style.setProperty("transform", `translate3d(${-p * 28}%,0,0)`);
      lineB.current?.style.setProperty("transform", `translate3d(${p * 28}%,0,0)`);
      const open = Math.min(1, p * 1.4);
      photo.current?.style.setProperty("clip-path", `inset(${30 - open * 30}% ${38 - open * 38}% round ${8 - open * 8}px)`);
      photo.current?.style.setProperty("--zoom", `${1.25 - open * 0.25}`);
      copy.current?.style.setProperty("opacity", `${Math.max(0, (p - 0.55) / 0.3)}`);
    },
    animate,
  );

  const [first, second] = site.tagline.split(". ");

  return (
    <section id="statement" ref={sectionRef} className={animate ? "relative h-[260vh]" : "relative"}>
      <div className={animate ? "sticky top-0 h-[100svh] overflow-hidden bg-wine" : "relative overflow-hidden bg-wine py-24"}>
        <div
          ref={photo}
          className={animate ? "absolute inset-0" : "relative mx-5 aspect-[4/5] overflow-hidden sm:mx-auto sm:max-w-md"}
          style={animate ? { clipPath: "inset(30% 38% round 8px)" } : undefined}
        >
          <Image
            src="/njs_p1.jpg"
            alt="Neil Jacob Santiago, in colour"
            fill
            sizes="100vw"
            className="object-cover"
            style={animate ? { transform: "scale(var(--zoom, 1.25))" } : undefined}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-wine/80 via-wine/20 to-wine/40" />
        </div>

        <h2
          className={
            animate
              ? "pointer-events-none absolute inset-0 flex flex-col justify-center font-display text-[clamp(4rem,12vw,13rem)] leading-[0.9] text-paper"
              : "relative z-10 -mt-20 px-5 font-display text-[clamp(3.25rem,15vw,6rem)] leading-[0.9] text-paper"
          }
        >
          <span ref={lineA} className="block will-change-transform lg:pl-[8vw] lg:whitespace-nowrap">
            {first}.
          </span>
          <span ref={lineB} className="block text-right font-serif italic text-sky will-change-transform lg:pr-[8vw] lg:whitespace-nowrap">
            {second}
          </span>
        </h2>

        <p
          ref={copy}
          className={
            animate
              ? "absolute bottom-12 left-1/2 w-full max-w-xl -translate-x-1/2 px-5 text-center font-serif text-2xl leading-snug text-paper opacity-0"
              : "relative z-10 mx-auto mt-10 max-w-xl px-5 font-serif text-xl leading-snug text-paper/90"
          }
        >
          The same patience that traces a dropped packet through a network waits for the one frame where the stage light hits just right.
        </p>
      </div>
    </section>
  );
}
