import Link from "next/link";
import AvailabilityBadge from "@/components/layout/AvailabilityBadge";
import Photo from "@/components/photography/Photo";
import CountUp from "@/components/ui/CountUp";
import Magnetic from "@/components/ui/Magnetic";
import { getAvailability } from "@/content/availability";
import { certificates } from "@/content/about";
import { projects } from "@/content/work";
import type { Photo as PhotoT } from "@/lib/photos";
import { site } from "@/lib/site";
import Darkroom from "./Darkroom";

const lines = ["I build web systems,", "design networks", "& frame light."];

/**
 * The first screen. The headline masks up, two prints fan out from behind the
 * darkroom portrait, and a row of real counts lands underneath. As the page
 * scrolls away the type lifts and the prints settle back (CSS scroll
 * timelines, so it costs nothing on budget phones; static where unsupported).
 */
export default async function Hero({ prints = [], collections }: { prints?: PhotoT[]; collections: number }) {
  const availability = await getAvailability();
  const stats = [
    { value: projects.length, label: "Projects" },
    { value: collections, label: "Photo collections" },
    { value: certificates.length, label: "Certificates" },
  ];
  // The clip sits on a full-width wrapper so the aperture runs to the edge of
  // the screen instead of stopping at the content column on wide displays.
  return (
    <div className="overflow-x-clip">
      <section className="relative mx-auto grid min-h-[100svh] max-w-[90rem] items-center gap-14 px-5 pt-28 pb-16 md:px-10 lg:grid-cols-12 lg:gap-10 lg:pt-32">
        {/* Aperture blades, slowly turning behind the type */}
        <svg aria-hidden viewBox="0 0 200 200" className="animate-spin-slow pointer-events-none absolute -top-24 -left-40 -z-10 w-[42rem] max-w-none text-ink/[0.07] md:-left-24">
          {Array.from({ length: 8 }, (_, i) => (
            <path key={i} d="M100 100 L100 8 A92 92 0 0 1 165 35 Z" fill="none" stroke="currentColor" strokeWidth="0.6" transform={`rotate(${i * 45} 100 100)`} />
          ))}
          <circle cx="100" cy="100" r="92" fill="none" stroke="currentColor" strokeWidth="0.6" />
          <circle cx="100" cy="100" r="30" fill="none" stroke="currentColor" strokeWidth="0.6" />
        </svg>

        <div className="hero-exit lg:col-span-7">
          <div className="animate-rise-in flex flex-wrap items-center gap-x-4 gap-y-3">
            <AvailabilityBadge availability={availability} tone="ink" href="/services" className="text-[0.95rem]" />
            <p className="label text-[0.6rem] text-ink/55">
              {site.location} <span className="text-ink/30">·</span> {site.coordinates}
            </p>
          </div>

          <h1 className="mt-8 font-display text-[clamp(3rem,11vw,6.75rem)] leading-[0.92] tracking-[-0.015em] lg:text-[clamp(4rem,6.4vw,7rem)]">
            <span className="sr-only">{site.name} — </span>
            {lines.map((line, i) => (
              <span key={line} className="line-mask">
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
            I&apos;m <strong className="font-medium text-ink">Neil Jacob Santiago</strong> — a third-year BSIT student at CLSU who builds web systems and designs networks by day, and directs the
            ITSC Media Group&apos;s cameras at concerts, campus events and the night sky after.
          </p>

          {/* Phones: two equal buttons side by side; larger screens: natural widths */}
          <div className="animate-rise-in mt-10 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center sm:gap-4" style={{ animationDelay: "620ms" }}>
            <Magnetic className="!block sm:!inline-block">
              <Link href="/work" className="btn w-full justify-center bg-ink px-4 text-paper hover:bg-ember sm:w-auto sm:px-7">
                See the work
              </Link>
            </Magnetic>
            <Magnetic className="!block sm:!inline-block">
              <Link href="/photography" className="btn w-full justify-center border border-ink/30 px-4 hover:border-ink sm:w-auto sm:px-7">
                <span className="sm:hidden">Photographs</span>
                <span className="hidden sm:inline">Browse photographs</span> <span className="arrow">→</span>
              </Link>
            </Magnetic>
          </div>

          {/* Real counts from the content, not marketing numbers */}
          <dl className="animate-rise-in mt-12 grid max-w-xl grid-cols-3 gap-4 border-t border-ink/15 pt-6" style={{ animationDelay: "760ms" }}>
            {stats.map((s) => (
              <div key={s.label}>
                <dd className="font-display text-[clamp(2rem,7vw,3.25rem)] leading-none tabular-nums">
                  <CountUp value={s.value} />
                </dd>
                <dt className="label mt-2 text-[0.52rem] leading-snug text-ink/55">{s.label}</dt>
              </div>
            ))}
          </dl>
        </div>

        <div className="animate-rise-in relative lg:col-span-5" style={{ animationDelay: "300ms" }}>
          <div className="hero-print-stage relative mx-auto w-[80%] max-w-sm sm:w-full sm:max-w-md lg:w-[84%] lg:max-w-none">
            {/* Two prints from the collections, fanned out behind the portrait */}
            {prints.slice(0, 2).map((p, i) => (
              <Link
                key={p.src}
                href={`/photography#${p.series}`}
                tabIndex={-1}
                aria-hidden
                className={`hero-print absolute top-[6%] aspect-[4/5] w-[62%] overflow-hidden rounded-[2px] bg-ink shadow-[0_30px_60px_-30px_rgb(0_48_73/0.6)] ring-[6px] ring-paper ${i === 0 ? "hero-print-l left-0" : "hero-print-r right-0"}`}
              >
                <Photo src={p.src} variants={p.variants} alt="" fill sizes="(min-width: 1024px) 24vw, 56vw" className="object-cover" style={{ objectPosition: p.focus }} />
              </Link>
            ))}
            <div className="relative">
              <Darkroom />
            </div>
          </div>
        </div>

        <a href="#statement" className="label absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-ink/50 lg:flex">
          Scroll
          <span className="block h-10 w-px origin-top animate-pulse bg-ink/40" />
        </a>
      </section>
    </div>
  );
}
