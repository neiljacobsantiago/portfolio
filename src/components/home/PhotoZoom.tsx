"use client";

import Link from "next/link";
import { useRef, type CSSProperties } from "react";
import PhotoImage from "@/components/photography/Photo";
import type { Photo } from "@/lib/photos";
import { useSceneFallback } from "@/lib/scene";
import { cn } from "@/lib/utils";

const LINES = [
  "From the front barrier,",
  "to the studio,",
  "to campus stages,",
  <>
    to the <em className="font-serif text-sky">night sky.</em>
  </>,
];

/** Phones show a 3 × 3 sheet, desktops 5 × 3; the lead frame sits in the middle of either. */
const PHONE_CELLS = 9;
const DESKTOP_CELLS = 15;

/**
 * "Contact sheet" scene: it opens on a single photograph filling the screen,
 * then the camera pulls back (one transform on the whole grid) until it is one
 * frame among the collections, and four short lines arrive in turn. Static
 * layout: the lines above the grid.
 */
export default function PhotoZoom({ lead, photos }: { lead: Photo; photos: Photo[] }) {
  const sectionRef = useRef<HTMLElement>(null);
  useSceneFallback(sectionRef);
  if (photos.length < PHONE_CELLS - 1) return null;

  // Repeat frames if a small library can't fill the desktop sheet; repeats are decorative.
  const others = Array.from({ length: DESKTOP_CELLS - 1 }, (_, i) => ({ photo: photos[i % photos.length], repeat: i >= photos.length }));

  return (
    <section ref={sectionRef} aria-labelledby="sheet-title" className="scene-root relative bg-ink text-paper scene:h-[200vh] lg:scene:h-[240vh]">
      <div className="relative overflow-hidden py-24 md:py-32 scene:sticky scene:top-0 scene:flex scene:h-[100svh] scene:items-center scene:justify-center scene:py-0 scene:[contain-intrinsic-size:auto_100svh] scene:[content-visibility:auto]">
        <div className="relative z-10 mx-auto mb-12 max-w-[90rem] px-5 md:mb-16 md:px-10 scene:pointer-events-none scene:absolute scene:inset-0 scene:mb-0 scene:flex scene:max-w-none scene:flex-col scene:items-center scene:justify-center scene:text-center">
          <p className="label text-sky scene:hidden">Photography</p>
          <h2 id="sheet-title" className="mt-5 font-display text-[clamp(2.25rem,8.5vw,6.5rem)] leading-[1.02] scene:mt-0">
            {LINES.map((line, i) => (
              <span key={i} className="sx pz-line block" style={{ "--i": i } as CSSProperties}>
                {line}
              </span>
            ))}
          </h2>
        </div>

        <ul className="sx pz-grid mx-auto grid w-[94vw] grid-cols-3 gap-[2vw] scene:grid-rows-[repeat(3,22.5svh)] lg:w-[96vw] lg:grid-cols-5 lg:gap-x-[1vw] lg:gap-y-[1.5svh] lg:scene:grid-rows-[repeat(3,26svh)]">
          <li className="relative col-start-2 row-start-2 aspect-[3/4] overflow-hidden rounded-[2px] lg:col-start-3 lg:aspect-[4/3] scene:aspect-auto">
            <Link href={`/photography#${lead.series}`} className="group block h-full">
              <PhotoImage src={lead.src} variants={lead.variants} alt={lead.alt} fill sizes="(min-width: 1024px) 100vw, 130vw" className="object-cover" style={{ objectPosition: lead.focus }} />
            </Link>
          </li>
          {others.map(({ photo, repeat }, i) => (
            <li
              key={`${photo.src}-${i}`}
              aria-hidden={repeat || undefined}
              className={cn("sx pz-cell relative aspect-[3/4] overflow-hidden rounded-[2px] lg:aspect-[4/3] scene:aspect-auto", i >= PHONE_CELLS - 1 && "hidden lg:block")}
            >
              <Link href={`/photography#${photo.series}`} tabIndex={repeat ? -1 : undefined} className="group block h-full">
                <PhotoImage
                  src={photo.src}
                  variants={photo.variants}
                  alt={repeat ? "" : photo.alt}
                  fill
                  sizes="(min-width: 1024px) 19vw, 31vw"
                  className="object-cover transition-transform duration-700 ease-[var(--ease-apple)] group-hover:scale-105"
                  style={{ objectPosition: photo.focus }}
                />
              </Link>
            </li>
          ))}
        </ul>

        {/* Scene only: a scrim for the lines, and the opening frame's caption */}
        <div aria-hidden className="sx pz-scrim pointer-events-none absolute inset-0 hidden bg-ink/70 scene:block" />
        <div aria-hidden className="sx pz-intro pointer-events-none absolute inset-x-0 bottom-0 hidden items-end justify-between gap-4 bg-gradient-to-t from-ink/80 to-transparent px-5 pt-24 pb-6 scene:flex md:px-10 md:pb-10">
          <p className="label text-[0.62rem] text-paper/85">
            <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-ember align-middle" />
            {lead.alt}
            {lead.note && <span className="hidden text-paper/55 sm:inline"> — {lead.note}</span>}
          </p>
          <p className="label shrink-0 text-[0.62rem] text-paper/60">Step back ↓</p>
        </div>
      </div>
    </section>
  );
}
