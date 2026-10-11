import Link from "next/link";
import Magnetic from "@/components/ui/Magnetic";
import { site } from "@/lib/site";
import Darkroom from "./Darkroom";

const lines = ["I build networks,", "audit systems", "& frame light."];

export default function Hero() {
  return (
    <section className="relative mx-auto grid min-h-[100svh] max-w-[90rem] overflow-x-clip items-center gap-14 px-5 pt-28 pb-16 md:px-10 lg:grid-cols-12 lg:gap-10 lg:pt-32">
      {/* Aperture blades, slowly turning behind the type */}
      <svg aria-hidden viewBox="0 0 200 200" className="animate-spin-slow pointer-events-none absolute -top-24 -left-40 -z-10 w-[42rem] max-w-none text-ink/[0.07] md:-left-24">
        {Array.from({ length: 8 }, (_, i) => (
          <path key={i} d="M100 100 L100 8 A92 92 0 0 1 165 35 Z" fill="none" stroke="currentColor" strokeWidth="0.6" transform={`rotate(${i * 45} 100 100)`} />
        ))}
        <circle cx="100" cy="100" r="92" fill="none" stroke="currentColor" strokeWidth="0.6" />
        <circle cx="100" cy="100" r="30" fill="none" stroke="currentColor" strokeWidth="0.6" />
      </svg>

      <div className="lg:col-span-7">
        <p className="label animate-rise-in flex flex-wrap items-center gap-x-3 gap-y-1 text-ink/70">
          <span className="inline-block h-2 w-2 rounded-full bg-ember" />
          {site.location} <span className="text-ink/40">·</span> {site.coordinates}
        </p>

        <h1 className="mt-8 font-display text-[clamp(3rem,11vw,6.75rem)] leading-[0.92] lg:text-[clamp(4rem,6.4vw,7rem)] tracking-[-0.015em]">
          <span className="sr-only">{site.name} — </span>
          {lines.map((line, i) => (
            <span key={line} className="block overflow-hidden pb-[0.06em]">
              <span className="animate-line-up block" style={{ animationDelay: `${120 + i * 110}ms` }}>
                {i === 2 ? (
                  <>
                    &amp; frame <em className="font-serif text-ember">light.</em>
                  </>
                ) : (
                  line
                )}
              </span>
            </span>
          ))}
        </h1>

        <p className="animate-rise-in mt-10 max-w-xl font-serif text-xl leading-relaxed text-ink/80 md:text-[1.4rem]" style={{ animationDelay: "500ms" }}>
          I&apos;m <strong className="font-medium text-ink">Neil Jacob Santiago</strong> — a third-year BSIT student at CLSU who designs networks and builds
          web systems by day, and directs the ITSC Media Group&apos;s cameras at concerts, campus events and the night sky after.
        </p>

        <div className="animate-rise-in mt-10 flex flex-wrap items-center gap-4" style={{ animationDelay: "620ms" }}>
          <Magnetic>
            <Link href="/work" className="btn bg-ink text-paper hover:bg-ember">
              See the work
            </Link>
          </Magnetic>
          <Magnetic>
            <Link href="/photography" className="btn border border-ink/30 hover:border-ink">
              Browse photographs <span className="arrow">→</span>
            </Link>
          </Magnetic>
        </div>
      </div>

      <div className="animate-rise-in lg:col-span-5" style={{ animationDelay: "300ms" }}>
        <Darkroom />
      </div>

      <a href="#statement" className="label absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-ink/50 lg:flex">
        Scroll
        <span className="block h-10 w-px origin-top animate-pulse bg-ink/40" />
      </a>
    </section>
  );
}
