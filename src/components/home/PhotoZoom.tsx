"use client";

import { Anton } from "next/font/google";
import Link from "next/link";
import { useRef, type CSSProperties } from "react";
import PhotoImage from "@/components/photography/Photo";
import Icon from "@/components/ui/Icon";
import type { Photo } from "@/lib/photos";
import { useSceneFallback } from "@/lib/scene";
import { cn } from "@/lib/utils";

// A heavy condensed face for the poster lettering; only this scene uses it.
const poster = Anton({ weight: "400", subsets: ["latin"], display: "swap", preload: false, fallback: ["Impact", "Arial Narrow", "sans-serif"] });

export interface Panel {
  photo: Photo;
  /** Collection slug: the panel links to /photography#<slug>. */
  slug: string;
  title: string;
}

/** One line per collection, lettered onto its panel. */
const CAPTIONS: Record<string, string> = {
  concerts: "Front barrier. Full manual.",
  portraits: "Studio light, on cue.",
  "photo-mode": "Virtual roads. Real framing.",
  everyday: "Between assignments.",
  astro: "Long nights, stacked.",
  events: "Campus, on the record.",
  landscapes: "Open road, late light.",
};

/** Grid areas for panels 1–6 (the hero is "h", the title block "t"); see `.pz-mosaic` in globals.css. */
const AREAS = ["a", "b", "c", "d", "e", "f"];
/** Each panel lands from a slight tilt, a different one each, and settles flat. */
const TILTS = [-4, 3.5, -2.5, 5, -3, 2.5];

const WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];

/**
 * Cover-art grid: the photography as a poster of uneven panels with thick
 * paper gutters, a hero panel and a title block. The scene opens on the hero
 * frame filling the screen; as you scroll the camera pulls back into the full
 * poster (one transform on the grid), the other panels drop into their slots
 * with a small tilt that settles, the title block stamps in and the captions
 * slide out from under each frame. Compositor-only (transform and opacity).
 * Reduced motion, low-power devices and phones without scroll timelines get
 * the finished poster as a still.
 */
export default function PhotoZoom({ panels, collections }: { panels: Panel[]; collections: number }) {
  const sectionRef = useRef<HTMLElement>(null);
  useSceneFallback(sectionRef);
  const [hero, ...rest] = panels;
  const count = WORDS[collections] ?? String(collections);

  return (
    <section ref={sectionRef} aria-labelledby="sheet-title" className="scene-root relative bg-ink text-paper scene:h-[260vh] lg:scene:h-[280vh]">
      <div className="relative px-3 py-16 sm:px-5 md:px-10 md:py-24 scene:sticky scene:top-0 scene:h-[100svh] scene:overflow-hidden scene:px-2 scene:pt-[calc(4.5rem+env(safe-area-inset-top))] scene:pb-2 md:scene:px-3 md:scene:pt-[calc(5.75rem+env(safe-area-inset-top))] md:scene:pb-3 scene:[contain-intrinsic-size:auto_100svh] scene:[content-visibility:auto]">
        <ul className="sx pz-mosaic mx-auto max-w-[90rem] scene:aspect-auto scene:h-full scene:max-w-none">
          <li className="pz-cell [grid-area:h]">
            <PanelLink panel={hero} index={0} hero sizes="(min-width: 1024px) 100vw, 200vw" className={poster.className} />
          </li>

          <li className="pz-cell pz-title-cell [grid-area:t]">
            <div className="sx pz-title relative flex h-full flex-col justify-center gap-[0.6em] p-[clamp(0.75rem,3cqmin,2rem)]">
              <p className="label w-max max-w-full truncate bg-ember px-2 py-1 text-[clamp(0.5rem,1.6cqmin,0.68rem)] text-paper">Neil Jacob Santiago · Photographs</p>
              <h2 id="sheet-title" className={cn(poster.className, "text-[clamp(2rem,15cqmin,6.5rem)] leading-[0.92] tracking-[0.005em] uppercase")}>
                <span className="block text-paper">{count} worlds.</span>
                <span className="block text-sky">One shutter.</span>
              </h2>
              <p className="max-w-[34ch] font-serif text-[clamp(0.8rem,2.6cqmin,1.125rem)] leading-snug text-paper/80 italic">
                Concert pits, studio sets, campus stages, open roads, the night sky, and a few virtual ones.
              </p>
            </div>
          </li>

          {rest.map((panel, i) => (
            <li
              key={`${panel.photo.src}-${i}`}
              className={cn("sx pz-cell pz-panel", i >= AREAS.length && "hidden")}
              style={{ gridArea: AREAS[i], "--i": i, "--pz-rot": `${TILTS[i % TILTS.length]}deg` } as CSSProperties}
            >
              <PanelLink panel={panel} index={i + 1} sizes="(min-width: 1024px) 34vw, (min-width: 768px) 50vw, 50vw" className={poster.className} />
            </li>
          ))}
        </ul>

        {/* Scene only: the opening frame's caption and a nudge to scroll */}
        <div aria-hidden className="sx pz-intro pointer-events-none absolute inset-x-0 bottom-0 hidden items-end justify-between gap-4 bg-gradient-to-t from-ink/85 to-transparent px-5 pt-24 pb-6 scene:flex md:px-10 md:pb-10">
          <p className="label min-w-0 truncate text-[0.62rem] text-paper/85">
            <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-ember align-middle" />
            {hero.photo.alt}
            {hero.photo.note && <span className="hidden text-paper/55 sm:inline"> · {hero.photo.note}</span>}
          </p>
          <p className="label inline-flex shrink-0 items-center gap-1.5 text-[0.62rem] text-paper/60">
            Step back <Icon name="arrow-down" />
          </p>
        </div>
      </div>
    </section>
  );
}

function PanelLink({ panel, index, hero, sizes, className }: { panel: Panel; index: number; hero?: boolean; sizes: string; className: string }) {
  const caption = CAPTIONS[panel.slug] ?? panel.title;
  return (
    <Link href={`/photography#${panel.slug}`} aria-label={`${panel.title}: ${caption}`} className="group relative block h-full overflow-hidden">
      {/* Inset by the keyline width so the comic border stays on top of the photo */}
      <span className="absolute inset-[3px] block overflow-hidden">
        <span className={cn("absolute inset-0 block", hero && "sx pz-hero-img")}>
          <PhotoImage
          src={panel.photo.src}
          variants={panel.photo.variants}
          alt={panel.photo.alt}
          fill
          sizes={sizes}
          className="object-cover transition-transform duration-700 ease-[var(--ease-apple)] group-hover:scale-105"
          style={{ objectPosition: panel.photo.focus }}
          />
        </span>
      </span>
      <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/45 to-transparent" />
      <span className="pz-cap-wrap absolute bottom-[clamp(0.35rem,2.5cqmin,1rem)] left-[clamp(0.35rem,2.5cqmin,1rem)] max-w-[calc(100%-0.7rem)]">
        <span className="sx pz-cap block" style={{ "--i": index } as CSSProperties}>
          <span className="label mb-1 hidden w-max bg-paper px-1.5 py-0.5 text-[0.5rem] text-ink sm:block">{panel.title}</span>
          <span className={cn(className, "pz-cap-text block bg-ink px-[0.45em] py-[0.2em] leading-[1] text-paper uppercase", hero && "bg-ember")}>{caption}</span>
        </span>
      </span>
    </Link>
  );
}
