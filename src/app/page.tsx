import Image from "next/image";
import Link from "next/link";
import NetworkBackground from "@/components/effects/NetworkBackground";
import Sentinel from "@/components/effects/Sentinel";
import Directory from "@/components/home/Directory";
import GlobalTelemetry from "@/components/home/GlobalTelemetry";
import TechStack from "@/components/home/TechStack";
import { reveal } from "@/lib/reveal";

// Re-generate the page (and its cached GitHub/weather telemetry) at most every 30 minutes.
export const revalidate = 1800;

export default function HomePage() {
  return (
    <div className="relative w-full overflow-x-clip">
      <NetworkBackground className="opacity-40" />

      {/* Hero */}
      <section
        id="top"
        className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-7xl flex-col items-center justify-center gap-10 px-4 pt-24 pb-12 sm:px-6 md:flex-row md:justify-between md:gap-12 md:px-16"
      >
        <div className="animate-rise-in z-10 w-full md:w-3/5">
          <p className="mb-4 font-mono text-xs tracking-[0.25em] text-accentRed uppercase sm:text-sm md:text-base md:tracking-[0.3em]">
            Network Systems & Infrastructure Engineering
          </p>
          <h1 className="bg-gradient-to-br from-butter to-butter/40 bg-clip-text font-display text-[clamp(2.75rem,14vw,6rem)] leading-[0.95] font-black tracking-tighter text-transparent uppercase lg:text-[5.5vw]">
            Neil Jacob <br /> Santiago
          </h1>
          <p className="mt-6 max-w-lg font-mono text-sm leading-relaxed text-butter/70">
            Production Director · Network Engineer · Security Auditor. Building resilient systems and directing the media that documents them.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/systems"
              className="interactive bg-accentRed px-6 py-3.5 font-display text-sm font-bold tracking-widest text-butter uppercase transition-colors hover:bg-butter hover:text-marine"
            >
              View Systems
            </Link>
            <Link
              href="/contact"
              className="interactive border border-butter/30 px-6 py-3.5 font-display text-sm font-bold tracking-widest text-butter uppercase transition-colors hover:border-butter hover:bg-butter/10"
            >
              Open a Channel
            </Link>
          </div>
        </div>

        <div className="z-10 hidden w-full justify-center sm:flex md:w-2/5 md:justify-end">
          <Sentinel />
        </div>
      </section>

      {/* Operator bio */}
      <section
        id="about"
        aria-labelledby="about-title"
        className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-12 border-t border-butter/10 px-4 py-20 sm:px-6 md:flex-row md:px-16 md:py-32"
      >
        <div {...reveal("left")} className="w-full md:w-1/2">
          <h2 id="about-title" className="mb-8 font-display text-[clamp(2.25rem,10vw,4.5rem)] leading-none font-bold">
            STRUCTURAL <span className="text-accentRed italic">LOGIC.</span>
            <br />
            EDITORIAL <span className="text-accentRed italic">VISION.</span>
          </h2>
          <div className="mb-8 h-1 w-24 bg-accentRed" />
          <p className="mb-6 max-w-xl text-lg leading-relaxed font-light opacity-80 md:text-xl">
            I balance the uncompromising logic of dynamic routing and vulnerability auditing with the fluid dynamics of multimedia direction.
          </p>
          <p className="max-w-xl border-l-2 border-accentRed/30 pl-6 font-mono text-base leading-relaxed text-accentRed md:text-lg">
            Operating at the intersection of rigid server architectures and high-end creative telemetry.
          </p>
        </div>

        <div
          {...reveal("scale")}
          className="group interactive relative flex aspect-square w-full max-w-sm items-center justify-center overflow-hidden border border-butter/20 bg-black/30 md:w-1/3"
        >
          <div className="pointer-events-none absolute top-0 left-0 z-30 h-8 w-8 border-t-2 border-l-2 border-accentRed" />
          <div className="pointer-events-none absolute right-0 bottom-0 z-30 h-8 w-8 border-r-2 border-b-2 border-accentRed" />
          <div className="pointer-events-none absolute inset-0 z-20 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,250,138,0.03)_10px,rgba(255,250,138,0.03)_20px)] mix-blend-overlay" />

          <Image
            src="/njs_p.jpg"
            alt="Portrait of Neil Jacob Santiago"
            fill
            sizes="(min-width: 768px) 33vw, (min-width: 640px) 384px, 100vw"
            className="z-0 object-cover transition-transform duration-700 group-hover:scale-105"
          />
          {/* Hover variant: only exists for mouse users, so phones never download it */}
          <Image
            src="/njs_p1.jpg"
            alt=""
            fill
            sizes="(min-width: 768px) 33vw, 384px"
            className="pointer-fine:block z-10 hidden object-cover opacity-0 transition-all duration-700 group-hover:scale-105 group-hover:opacity-100"
          />

          <span className="pointer-events-none absolute bottom-4 left-4 z-30 border border-accentRed/30 bg-marine/90 px-2 py-1 font-mono text-[10px] tracking-widest text-accentRed uppercase">
            Sys_Admin // Active
          </span>
        </div>
      </section>

      <TechStack />
      <Directory />
      <GlobalTelemetry />
    </div>
  );
}
