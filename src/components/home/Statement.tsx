"use client";

import Image from "next/image";
import { useRef } from "react";
import { useSceneFallback } from "@/lib/scene";
import { site } from "@/lib/site";

// Preview shots shown in the scene, in order. Landscape frames suit the wide pinned view best.
const FRAMES = [
  { src: "/photography/landscapes/yuchengco-hall.jpg", title: "Yuchengco Hall", place: "De La Salle University, Manila", position: "50% 35%" },
  { src: "/photography/landscapes/venice-grand-canal.jpg", title: "Grand Canal After Dark", place: "Venice Grand Canal Mall, Taguig", position: "50% 62%" },
];

/**
 * Pinned scroll scene: the two halves of the tagline drift apart (sideways on
 * desktops, up and down on tall phone screens) while a photograph opens up
 * between them, then dissolves into the next frame. Pure CSS scroll-driven
 * animation where supported (see `.st-*` in globals.css); desktop browsers
 * without it fall back to a rAF loop. Reduced motion and low-power devices
 * get a swipeable strip of the frames under the tagline.
 */
export default function Statement() {
  const sectionRef = useRef<HTMLElement>(null);
  useSceneFallback(sectionRef);

  const [lead, tail] = site.tagline.split(". ");

  return (
    <section id="statement" ref={sectionRef} aria-label={site.tagline} className="scene-root relative scene:h-[180vh] lg:scene:h-[240vh]">
      <div className="relative overflow-hidden bg-wine py-24 scene:sticky scene:top-0 scene:h-[100svh] scene:py-0">
        {/* Scene: one photograph opening up behind the type */}
        <div className="sx st-photo absolute inset-0 hidden scene:block">
          {FRAMES.map((f, i) => (
            <div key={f.src} className={i === 1 ? "sx st-second absolute inset-0" : "absolute inset-0"}>
              <div className="sx st-zoom absolute inset-0">
                <Image src={f.src} alt={`${f.title}, ${f.place}`} fill sizes="100vw" className="object-cover" style={{ objectPosition: f.position }} />
              </div>
            </div>
          ))}
          <div className="absolute inset-0 bg-gradient-to-t from-wine/80 via-wine/25 to-wine/45" />
          <div className="sx st-scrim absolute inset-0 bg-wine/55" />
        </div>

        {/* Static: the frames in a swipeable strip */}
        <ul className="no-scrollbar relative flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 scene:hidden sm:justify-center">
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

        <h2 className="relative z-10 -mt-20 px-5 font-display text-[clamp(3.25rem,15vw,6rem)] leading-[0.9] text-paper scene:pointer-events-none scene:absolute scene:inset-0 scene:m-0 scene:flex scene:flex-col scene:justify-center lg:scene:px-0 lg:scene:text-[clamp(4rem,12vw,13rem)]">
          <span className="sx st-line-a block lg:pl-[8vw] lg:whitespace-nowrap">{lead}.</span>
          <span className="sx st-line-b block text-right font-serif text-sky italic lg:pr-[8vw] lg:whitespace-nowrap">{tail}</span>
        </h2>

        <p aria-hidden className="label absolute bottom-6 left-5 hidden rounded-full bg-ink/45 px-4 py-2 text-[0.62rem] text-paper/85 backdrop-blur-md scene:grid lg:top-28 lg:bottom-auto lg:left-8 xl:left-12">
          {FRAMES.map((f, i) => (
            <span key={f.src} className={`sx ${i === 0 ? "st-cap-out" : "st-cap-in"} col-start-1 row-start-1 flex items-center gap-2 whitespace-nowrap`}>
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ember" /> Frame {String(i + 1).padStart(2, "0")} · {f.title}
              <span className="hidden text-paper/50 sm:inline">— {f.place}</span>
            </span>
          ))}
        </p>

        <div className="pointer-events-none relative z-10 scene:absolute scene:inset-0 scene:flex scene:items-center scene:justify-center lg:scene:items-end lg:scene:pb-12">
          <p className="sx st-copy mx-auto mt-10 max-w-xl px-5 font-serif text-xl leading-snug text-paper/90 scene:mt-0 scene:text-center scene:text-paper lg:scene:text-2xl">
            The same patience that traces a dropped packet through a network waits for the one frame where the stage light hits just right.
          </p>
        </div>
      </div>
    </section>
  );
}
