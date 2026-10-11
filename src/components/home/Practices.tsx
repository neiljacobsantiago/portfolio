"use client";

import Link from "next/link";
import { useRef } from "react";
import { useDeviceProfile } from "@/lib/device";
import { useScrollProgress } from "@/lib/scroll";
import { cn } from "@/lib/utils";

const practices = [
  {
    n: "01",
    title: "Networks",
    line: "Designing how buildings full of computers talk to each other.",
    detail: "Topologies, VLANs, routing protocols and the bill of materials to build it for real.",
    href: "/work",
    tone: "bg-ink text-paper",
    accent: "text-sky",
  },
  {
    n: "02",
    title: "Security",
    line: "Breaking into my own systems, so nobody else can.",
    detail: "Vulnerability scans, intrusion-detection rules and digital forensics on Kali Linux.",
    href: "/work",
    tone: "bg-paper-deep text-ink",
    accent: "text-ember",
  },
  {
    n: "03",
    title: "Web",
    line: "Vibe-coded, yes — but always architected first.",
    detail: "Planning the data, routes and components before a line is written, then iterating fast with React, Next.js and Tailwind.",
    href: "/work#web",
    tone: "bg-paper text-ink ring-1 ring-ink/10",
    accent: "text-sky",
  },
  {
    n: "04",
    title: "Photography",
    line: "Concert pits, campus stages and the slow light of distant galaxies.",
    detail: "Nikon, Canon, an iPhone in ProRAW and a DJI gimbal — from concert pits to a studio-style backdrop.",
    href: "/photography",
    tone: "bg-ember text-paper",
    accent: "text-paper-deep",
  },
  {
    n: "05",
    title: "Direction",
    line: "Leading the people behind the cameras.",
    detail: "Production Director of the ITSC Media Group: shot lists, team calls, reels and live broadcasts.",
    href: "/about",
    tone: "bg-sky text-ink",
    accent: "text-wine",
  },
];

/**
 * Four disciplines. Desktop: the page pins and the panels slide sideways as
 * you scroll down. Phones: a native swipeable row with snap points.
 */
export default function Practices() {
  const { desktop, lowPower } = useDeviceProfile();
  const pinned = desktop && !lowPower;
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useScrollProgress(
    sectionRef,
    (p) => {
      const track = trackRef.current;
      if (!track) return;
      const distance = track.scrollWidth - innerWidth;
      track.style.transform = `translate3d(${-p * distance}px,0,0)`;
      barRef.current?.style.setProperty("transform", `scaleX(${p})`);
    },
    pinned,
  );

  return (
    <section ref={sectionRef} aria-labelledby="practices-title" className={pinned ? "relative h-[380vh]" : "relative py-24"}>
      <div className={pinned ? "sticky top-0 flex h-[100svh] flex-col justify-center overflow-hidden" : ""}>
        <div className="mx-auto mb-10 flex w-full max-w-[90rem] items-end justify-between gap-6 px-5 md:px-10">
          <h2 id="practices-title" className="font-display text-[clamp(2.5rem,6vw,5rem)] leading-[1.04]">
            Five practices, <em className="font-serif text-ember">one eye.</em>
          </h2>
          <p className="label hidden text-ink/60 md:block">{pinned ? "Keep scrolling →" : "Swipe →"}</p>
        </div>

        <div
          ref={trackRef}
          className={cn(
            "flex gap-5 px-5 md:gap-8 md:px-10",
            pinned ? "w-max will-change-transform" : "no-scrollbar snap-x snap-mandatory scroll-px-5 overflow-x-auto overscroll-x-contain pb-2",
          )}
        >
          {practices.map((p) => (
            <article
              key={p.n}
              className={cn(
                "relative flex shrink-0 snap-start flex-col justify-between rounded-[2px] p-7 md:p-10",
                pinned ? "h-[62svh] w-[min(68vw,56rem)]" : "min-h-[26rem] w-[82vw] max-w-md",
                p.tone,
              )}
            >
              <div className="flex items-start justify-between">
                <span className="label opacity-70">{p.n} / 0{practices.length}</span>
                <Link href={p.href} className="label press rounded-full border border-current px-4 py-2 opacity-80 hover:opacity-100" data-cursor="Open">
                  Explore
                </Link>
              </div>
              <div>
                <h3 className="font-display text-[clamp(3rem,8vw,8rem)] leading-[0.9]">{p.title}</h3>
                <p className={cn("mt-5 max-w-lg font-serif text-2xl leading-snug italic md:text-3xl", p.accent)}>{p.line}</p>
                <p className="mt-4 max-w-md font-serif text-base leading-relaxed opacity-80 md:text-lg">{p.detail}</p>
              </div>
            </article>
          ))}
          {pinned && <div className="w-[10vw] shrink-0" aria-hidden />}
        </div>

        {pinned && (
          <div className="mx-auto mt-10 h-px w-full max-w-[90rem] px-10">
            <div className="h-px w-full bg-ink/15">
              <div ref={barRef} className="h-px w-full origin-left scale-x-0 bg-ember" />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
