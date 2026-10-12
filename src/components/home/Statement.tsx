"use client";

import Image from "next/image";
import { useRef } from "react";
import { useDeviceProfile } from "@/lib/device";
import { useScrollProgress } from "@/lib/scroll";
import { site } from "@/lib/site";

// Preview shots shown in the scene, in order. Landscape frames suit the wide pinned view best.
const FRAMES = [
  { src: "/photography/landscapes/yuchengco-hall.jpg", title: "Yuchengco Hall", place: "De La Salle University, Manila", position: "50% 35%" },
  { src: "/photography/landscapes/venice-grand-canal.jpg", title: "Grand Canal After Dark", place: "Venice Grand Canal Mall, Taguig", position: "50% 62%" },
];

/**
 * Pinned scroll scene (desktop): the two halves of the tagline drift apart
 * while a photograph opens up between them, then dissolves into the next
 * frame. On phones the frames sit in a swipeable strip.
 */
export default function Statement() {
  const { desktop, lowPower } = useDeviceProfile();
  const animate = desktop && !lowPower;
  const sectionRef = useRef<HTMLElement>(null);
  const lineA = useRef<HTMLSpanElement>(null);
  const lineB = useRef<HTMLSpanElement>(null);
  const photo = useRef<HTMLDivElement>(null);
  const second = useRef<HTMLDivElement>(null);
  const captions = useRef<HTMLParagraphElement>(null);
  const copy = useRef<HTMLParagraphElement>(null);

  useScrollProgress(
    sectionRef,
    (p) => {
      lineA.current?.style.setProperty("transform", `translate3d(${-p * 28}%,0,0)`);
      lineB.current?.style.setProperty("transform", `translate3d(${p * 28}%,0,0)`);
      const open = Math.min(1, p * 1.4);
      photo.current?.style.setProperty("clip-path", `inset(${30 - open * 30}% ${38 - open * 38}% round ${8 - open * 8}px)`);
      photo.current?.style.setProperty("--zoom", `${1.25 - open * 0.25}`);
      // The second frame dissolves in through the middle of the scene.
      const swap = Math.min(1, Math.max(0, (p - 0.42) / 0.2));
      second.current?.style.setProperty("opacity", `${swap}`);
      captions.current?.style.setProperty("--swap", `${swap}`);
      copy.current?.style.setProperty("opacity", `${Math.max(0, (p - 0.55) / 0.3)}`);
    },
    animate,
  );

  const [lead, tail] = site.tagline.split(". ");

  return (
    <section id="statement" ref={sectionRef} className={animate ? "relative h-[260vh]" : "relative"}>
      <div className={animate ? "sticky top-0 h-[100svh] overflow-hidden bg-wine" : "relative overflow-hidden bg-wine py-24"}>
        {animate ? (
          <div ref={photo} className="absolute inset-0" style={{ clipPath: "inset(30% 38% round 8px)" }}>
            {FRAMES.map((f, i) => (
              <div key={f.src} ref={i === 1 ? second : undefined} className="absolute inset-0" style={i === 1 ? { opacity: 0 } : undefined}>
                <Image src={f.src} alt={`${f.title}, ${f.place}`} fill sizes="100vw" className="object-cover" style={{ objectPosition: f.position, transform: "scale(var(--zoom, 1.25))" }} />
              </div>
            ))}
            <div className="absolute inset-0 bg-gradient-to-t from-wine/80 via-wine/25 to-wine/45" />
          </div>
        ) : (
          <ul className="no-scrollbar relative flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 sm:justify-center">
            {FRAMES.map((f) => (
              <li key={f.src} className="relative aspect-[4/5] w-[80vw] max-w-sm shrink-0 snap-start overflow-hidden rounded-[2px]">
                <Image src={f.src} alt={`${f.title}, ${f.place}`} fill sizes="(min-width: 640px) 24rem, 80vw" className="object-cover" style={{ objectPosition: f.position }} />
                <div className="absolute inset-0 bg-gradient-to-b from-wine/60 via-transparent to-wine/85" />
                <p className="label absolute top-4 right-4 left-4 text-[0.6rem] text-paper/85">
                  {f.title} <span className="text-paper/55">· {f.place}</span>
                </p>
              </li>
            ))}
          </ul>
        )}

        <h2
          className={
            animate
              ? "pointer-events-none absolute inset-0 flex flex-col justify-center font-display text-[clamp(4rem,12vw,13rem)] leading-[0.9] text-paper"
              : "relative z-10 -mt-20 px-5 font-display text-[clamp(3.25rem,15vw,6rem)] leading-[0.9] text-paper"
          }
        >
          <span ref={lineA} className="block will-change-transform lg:pl-[8vw] lg:whitespace-nowrap">
            {lead}.
          </span>
          <span ref={lineB} className="block text-right font-serif italic text-sky will-change-transform lg:pr-[8vw] lg:whitespace-nowrap">
            {tail}
          </span>
        </h2>

        {animate && (
          <p ref={captions} aria-hidden className="label absolute top-28 left-8 grid rounded-full bg-ink/45 px-4 py-2 text-[0.62rem] text-paper/85 backdrop-blur-md xl:left-12" style={{ "--swap": 0 } as React.CSSProperties}>
            {FRAMES.map((f, i) => (
              <span
                key={f.src}
                className="col-start-1 row-start-1 flex items-center gap-2"
                style={{ opacity: i === 0 ? "calc(1 - var(--swap))" : "var(--swap)", transform: `translateY(calc(${i === 0 ? "var(--swap) * -8px" : "(1 - var(--swap)) * 8px"}))` }}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-ember" /> Frame {String(i + 1).padStart(2, "0")} · {f.title} <span className="text-paper/50">— {f.place}</span>
              </span>
            ))}
          </p>
        )}

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
