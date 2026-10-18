"use client";

import { Archivo_Black, Titan_One } from "next/font/google";
import Link from "next/link";
import { useRef, type CSSProperties } from "react";
import PhotoImage from "@/components/photography/Photo";
import Icon from "@/components/ui/Icon";
import type { Photo } from "@/lib/photos";
import { useSceneFallback } from "@/lib/scene";
import { cn } from "@/lib/utils";

// Lettering for the cover's logo block; only this scene loads these.
const wordmark = Titan_One({ weight: "400", subsets: ["latin"], display: "swap", preload: false, fallback: ["Arial Rounded MT Bold", "Arial Black", "sans-serif"] });
const numeral = Archivo_Black({ weight: "400", subsets: ["latin"], display: "swap", preload: false, fallback: ["Arial Black", "Impact", "sans-serif"] });

export interface Panel {
  photo: Photo;
  /** Collection slug: the panel links to /photography#<slug>. */
  slug: string;
  title: string;
}

/**
 * Grid areas for the panels after the hero ("h"), biggest slots first.
 * Layout per screen shape lives in `.pz-mosaic` in globals.css: three staggered
 * columns, like a game's cover-art collage, with "g" sitting under the logo.
 */
const AREAS = ["b", "d", "i", "a", "e", "c", "f", "g"];
/** Each panel lands from a slight tilt, a different one each, and settles flat. */
const TILTS = [-4, 3.5, -2.5, 5, -3, 2.5, -3.5, 2];

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
const WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];

/**
 * The photography as a cover-art collage: staggered panels behind thick dark
 * keylines, colour-graded towards a sunset palette, with a logo block in the
 * middle — the collection count as a big gradient numeral and Neil's name
 * stacked over it. The scene opens on the hero frame filling the screen; as
 * you scroll the camera pulls back to the whole cover, the other panels drop
 * into their slots and the logo stamps on last. Compositor-only (transform
 * and opacity). Reduced motion, low-power devices and phones without scroll
 * timelines get the finished cover as a still.
 */
export default function PhotoZoom({ panels, collections }: { panels: Panel[]; collections: number }) {
  const sectionRef = useRef<HTMLElement>(null);
  useSceneFallback(sectionRef);
  const [hero, ...rest] = panels;
  const roman = ROMAN[collections] ?? String(collections);
  const count = WORDS[collections] ?? String(collections);

  return (
    <section ref={sectionRef} aria-labelledby="sheet-title" className="scene-root relative bg-[#0b0910] text-paper scene:h-[260vh] lg:scene:h-[280vh]">
      <h2 id="sheet-title" className="sr-only">
        Photographs: {count.toLowerCase()} collections, one shutter
      </h2>
      <div className="relative px-3 py-14 sm:px-5 md:px-10 md:py-20 scene:sticky scene:top-0 scene:flex scene:h-[100svh] scene:flex-col scene:overflow-hidden scene:px-2 scene:pt-[calc(4.5rem+env(safe-area-inset-top))] scene:pb-2 md:scene:px-3 md:scene:pt-[calc(5.75rem+env(safe-area-inset-top))] md:scene:pb-3 scene:[contain-intrinsic-size:auto_100svh] scene:[content-visibility:auto]">
        <div className="pz-cover relative mx-auto w-full max-w-[90rem] scene:aspect-auto scene:min-h-0 scene:max-w-none scene:flex-1">
          <ul className="sx pz-mosaic h-full">
            <li className="pz-cell [grid-area:h]">
              <PanelLink panel={hero} hero sizes="(min-width: 1024px) 100vw, 200vw" />
            </li>
            {rest.slice(0, AREAS.length).map((panel, i) => (
              <li
                key={`${panel.photo.src}-${i}`}
                className="sx pz-cell pz-panel"
                style={{ gridArea: AREAS[i], "--i": i, "--pz-rot": `${TILTS[i]}deg` } as CSSProperties}
              >
                <PanelLink panel={panel} sizes="(min-width: 1024px) 36vw, 50vw" />
              </li>
            ))}
          </ul>

          {/* The logo block: big gradient numeral, the name stacked over it */}
          <div aria-hidden className="pz-logo-wrap pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="sx pz-logo relative">
              <span className={cn(numeral.className, "pz-numeral block leading-[0.8]")}>{roman}</span>
              <span className={cn(wordmark.className, "pz-words absolute inset-0 flex flex-col items-center justify-center leading-[0.86] lowercase")}>
                <span>neil</span>
                <span>jacob</span>
                <span>santiago</span>
              </span>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-4 flex w-full max-w-[90rem] items-center justify-between gap-4 scene:hidden">
          <p className="font-serif text-lg text-paper/85">
            {count} collections, one shutter. <span className="text-paper/70">Tap any panel to open it.</span>
          </p>
          <Link href="/photography" className="label inline-flex shrink-0 items-center gap-1.5 text-2xs text-paper/85 hover:text-paper">
            All photographs <Icon name="arrow-right" />
          </Link>
        </div>

        {/* Scene only: the opening frame's caption and a nudge to scroll */}
        <div aria-hidden className="sx pz-intro pointer-events-none absolute inset-x-0 bottom-0 hidden items-end justify-between gap-4 bg-gradient-to-t from-black/80 to-transparent px-5 pt-24 pb-6 scene:flex md:px-10 md:pb-10">
          <p className="label min-w-0 truncate text-2xs text-paper/85">
            <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-ember align-middle" />
            {hero.photo.alt}
            {hero.photo.note && <span className="hidden text-paper/70 sm:inline"> · {hero.photo.note}</span>}
          </p>
          <p className="label inline-flex shrink-0 items-center gap-1.5 text-2xs text-paper/75">
            Step back <Icon name="arrow-down" />
          </p>
        </div>
      </div>
    </section>
  );
}

function PanelLink({ panel, hero, sizes }: { panel: Panel; hero?: boolean; sizes: string }) {
  return (
    <Link href={`/photography#${panel.slug}`} aria-label={`${panel.title}: ${panel.photo.alt}`} className="group relative block h-full overflow-hidden">
      <span className={cn("absolute inset-0 block", hero && "sx pz-hero-img")}>
        <PhotoImage
          src={panel.photo.src}
          variants={panel.photo.variants}
          alt={panel.photo.alt}
          fill
          sizes={sizes}
          className="pz-img object-cover transition-transform duration-700 ease-[var(--ease-apple)] group-hover:scale-105"
          style={{ objectPosition: panel.photo.focus }}
        />
      </span>
      {/* Sunset grade over every frame, so the collage reads as one piece of art */}
      <span aria-hidden className="pz-grade pointer-events-none absolute inset-0" />
      {/* The collection name shows on hover or keyboard focus only, like a cover with no captions */}
      <span className="label pointer-events-none absolute bottom-2 left-2 translate-y-1 bg-black/75 px-2 py-1 text-3xs text-paper opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
        {panel.title}
      </span>
    </Link>
  );
}
