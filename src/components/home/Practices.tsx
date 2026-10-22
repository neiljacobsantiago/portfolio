"use client";

import Link from "next/link";
import { useRef } from "react";
import { useDeviceProfile } from "@/lib/device";
import { useScrollProgress } from "@/lib/scroll";
import { cn } from "@/lib/utils";
import Icon from "@/components/ui/Icon";

const practices = [
  {
    n: "01",
    title: "Networks",
    line: "Mapping how every computer in a building connects, cable by cable.",
    detail: "Physical and logical topologies, cabling plans, bills of materials, subnets and VLANs. It's my major at CLSU, and the subnet planner in the Lab comes from it.",
    href: "/lab#subnet",
    tone: "bg-ink text-paper",
    accent: "text-sky",
    quiet: "opacity-85",
  },
  {
    n: "02",
    title: "Security",
    line: "Explaining online safety in plain words.",
    detail: "Short lessons on phishing and data privacy, like the Cyber Awareness Series. I'm also starting to learn ethical hacking on my own lab machines, and working towards CompTIA Security+.",
    href: "/work/cyber-awareness-series",
    tone: "bg-paper-deep text-ink",
    accent: "text-ember",
    quiet: "opacity-85",
  },
  {
    n: "03",
    title: "Web",
    line: "I decide what it should do. AI helps me write the code.",
    detail: "I plan the data, the pages and the rules, build with AI-assisted coding in React, Next.js and Tailwind, then test and deploy it myself.",
    href: "/work#web",
    tone: "bg-paper text-ink ring-1 ring-ink/10",
    accent: "text-wine",
    quiet: "opacity-85",
  },
  {
    n: "04",
    title: "Photography",
    line: "Concert pits, campus stages and the night sky.",
    detail: "Nikon and Canon bodies, an iPhone and a DJI gimbal, carried from festival barriers to portrait sessions.",
    href: "/photography",
    tone: "bg-ember text-paper",
    accent: "text-paper-deep",
    quiet: "",
  },
  {
    n: "05",
    title: "Direction",
    line: "Leading the people behind the cameras.",
    detail: "Production Director of the ITSC Media Group: shot lists, team calls, reels and live broadcasts.",
    href: "/about",
    tone: "bg-sky text-ink",
    accent: "text-wine",
    quiet: "",
  },
];

/**
 * Five disciplines. Desktop: the page pins and the panels slide sideways as
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
            Five kinds <em className="font-serif text-ember">of work.</em>
          </h2>
          <p className="label hidden items-center gap-2 text-ink/75 md:flex">
            {pinned ? "Keep scrolling" : "Swipe"} <Icon name="arrow-right" />
          </p>
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
                <span className={cn("label", p.quiet)}>{p.n} / 0{practices.length}</span>
                <Link href={p.href} className={cn("label press rounded-full border border-current px-4 py-2 hover:opacity-100", p.quiet)}>
                  Explore
                </Link>
              </div>
              <div>
                <h3 className="font-display text-[clamp(3rem,8vw,8rem)] leading-[0.9]">{p.title}</h3>
                <p className={cn("mt-5 max-w-lg font-serif text-2xl leading-snug italic md:text-3xl", p.accent)}>{p.line}</p>
                <p className={cn("mt-4 max-w-md font-serif text-base leading-relaxed md:text-lg", p.quiet)}>{p.detail}</p>
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
