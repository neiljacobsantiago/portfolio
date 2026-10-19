"use client";

import { Archivo_Black } from "next/font/google";
import Link from "next/link";
import { useRef, type CSSProperties } from "react";
import PhotoImage from "@/components/photography/Photo";
import Icon from "@/components/ui/Icon";
import type { Photo } from "@/lib/photos";
import { useSceneFallback } from "@/lib/scene";
import { cn } from "@/lib/utils";

// Heavy lettering for the cover emblem; only this scene loads it.
const heavy = Archivo_Black({ weight: "400", subsets: ["latin"], display: "swap", preload: false, fallback: ["Arial Black", "Impact", "sans-serif"] });

export interface Panel {
  photo: Photo;
  /** Collection slug: the panel links to /photography#<slug>. */
  slug: string;
  title: string;
}

type Pt = [number, number];

/*
 * The cover is cut like a game box-art collage: three columns whose dividers
 * lean, each split by slanted cuts, so every panel is a trapezoid. Points are
 * in percent of the cover (x, y). Panels are clipped to these shapes with no
 * gaps, and one SVG on top draws every cut as a thick ink line, so the
 * gutters stay even whatever the screen shape.
 */
const v1 = (y: number): number => 34 - (3 * y) / 100; // left divider leans in
const v2 = (y: number): number => 67 + (3 * y) / 100; // right divider leans out

const SHAPES: Record<string, Pt[]> = {
  h: [[v1(0), 0], [v2(0), 0], [v2(42), 42], [v1(46), 46]],
  a: [[0, 0], [v1(0), 0], [v1(22), 22], [0, 28]],
  b: [[0, 28], [v1(22), 22], [v1(76), 76], [0, 69]],
  c: [[0, 69], [v1(76), 76], [v1(100), 100], [0, 100]],
  g: [[v1(46), 46], [v2(42), 42], [v2(78), 78], [v1(73), 73]],
  i: [[v1(73), 73], [v2(78), 78], [v2(100), 100], [v1(100), 100]],
  d: [[v2(0), 0], [100, 0], [100, 35], [v2(29), 29]],
  e: [[v2(29), 29], [100, 35], [100, 61], [v2(67), 67]],
  f: [[v2(67), 67], [100, 61], [100, 100], [v2(100), 100]],
};

/** Slots after the hero ("h"), biggest first; "g" sits under the emblem. */
const AREAS = ["b", "d", "i", "e", "a", "c", "f", "g"];
/** Each panel lands from a slight tilt, a different one each, and settles flat. */
const TILTS = [-4, 3.5, -2.5, 5, -3, 2.5, -3.5, 2];

/** Box and clip path of a shape, relative to its own box. */
function frame(shape: Pt[]) {
  const xs = shape.map((p) => p[0]);
  const ys = shape.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const local = shape.map(([x, y]) => `${(((x - x0) / (x1 - x0)) * 100).toFixed(2)}% ${(((y - y0) / (y1 - y0)) * 100).toFixed(2)}%`);
  return {
    left: `${x0}%`,
    top: `${y0}%`,
    width: `${x1 - x0}%`,
    height: `${y1 - y0}%`,
    clipPath: `polygon(${local.join(", ")})`,
  } satisfies CSSProperties;
}

const WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];

/**
 * The photography as a box-art collage: slanted panels behind ink cuts,
 * graded to one palette with a halftone screen, and Neil's own emblem in the
 * middle. The scene opens on the hero frame filling the screen; as you scroll
 * the camera pulls back to the whole cover, the panels drop into their slots
 * and the emblem stamps on last. Compositor-only (transform and opacity).
 * Reduced motion, low-power devices and phones without scroll timelines get
 * the finished cover as a still.
 */
export default function PhotoZoom({ panels, collections }: { panels: Panel[]; collections: number }) {
  const sectionRef = useRef<HTMLElement>(null);
  useSceneFallback(sectionRef);
  const [hero, ...rest] = panels;
  const count = WORDS[collections] ?? String(collections);

  return (
    <section ref={sectionRef} aria-labelledby="sheet-title" className="scene-root relative bg-[#0b0910] text-paper scene:h-[260vh] lg:scene:h-[280vh]">
      <h2 id="sheet-title" className="sr-only">
        Photographs: {count.toLowerCase()} collections, one shutter
      </h2>
      <div className="relative px-3 py-14 sm:px-5 md:px-10 md:py-20 scene:sticky scene:top-0 scene:flex scene:h-[100svh] scene:flex-col scene:overflow-hidden scene:px-2 scene:pt-[calc(4.5rem+env(safe-area-inset-top))] scene:pb-2 md:scene:px-3 md:scene:pt-[calc(5.75rem+env(safe-area-inset-top))] md:scene:pb-3 scene:[contain-intrinsic-size:auto_100svh] scene:[content-visibility:auto]">
        <div className="pz-cover relative mx-auto w-full max-w-[90rem] scene:aspect-auto scene:min-h-0 scene:max-w-none scene:flex-1">
          <div className="sx pz-mosaic absolute inset-0">
            <ul className="absolute inset-0">
              <li className="pz-cell" style={frame(SHAPES.h)}>
                <PanelLink panel={hero} hero sizes="(min-width: 1024px) 100vw, 200vw" />
              </li>
              {rest.slice(0, AREAS.length).map((panel, i) => (
                <li key={`${panel.photo.src}-${i}`} className="sx pz-cell pz-panel" style={{ ...frame(SHAPES[AREAS[i]]), "--i": i, "--pz-rot": `${TILTS[i]}deg` } as CSSProperties}>
                  <PanelLink panel={panel} sizes="(min-width: 1024px) 36vw, 50vw" />
                </li>
              ))}
            </ul>
            {/* Every cut as one ink line, drawn over the panels */}
            <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" className="sx pz-cuts pointer-events-none absolute inset-0 h-full w-full overflow-visible">
              {Object.entries(SHAPES).map(([k, s]) => (
                <polygon key={k} points={s.map((p) => p.join(",")).join(" ")} vectorEffect="non-scaling-stroke" />
              ))}
              <rect x="0" y="0" width="100" height="100" vectorEffect="non-scaling-stroke" className="pz-frame" />
            </svg>
          </div>

          <Emblem />
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

/**
 * Neil's emblem: a tilted ink plate with a white keyline and a hard shadow,
 * "NJS" set huge in heavy slanted capitals with a sunset fill, a camera
 * aperture badge biting into the corner, his name on a ribbon above and a
 * yellow "Photographs" tag below.
 */
function Emblem() {
  return (
    <div aria-hidden className="pz-emblem-wrap pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="sx pz-emblem relative">
        <div className="pz-plate relative">
          <span className="pz-ribbon label block">Neil Jacob Santiago</span>
          <span className={cn(heavy.className, "pz-mono block")}>NJS</span>
          <span className="pz-tag label block">Photographs</span>
        </div>
        <svg viewBox="0 0 100 100" className="pz-iris absolute">
          <circle cx="50" cy="50" r="47" className="pz-iris-ring" />
          {Array.from({ length: 6 }, (_, k) => (
            <path key={k} d="M50 50 L50 10 A40 40 0 0 1 84.6 30 Z" transform={`rotate(${k * 60} 50 50)`} className={k % 2 ? "pz-blade-a" : "pz-blade-b"} />
          ))}
          <circle cx="50" cy="50" r="13" className="pz-iris-hole" />
        </svg>
      </div>
    </div>
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
      {/* One grade and a halftone screen over every frame, so the collage reads as printed art */}
      <span aria-hidden className="pz-grade pointer-events-none absolute inset-0" />
      <span aria-hidden className="pz-dots pointer-events-none absolute inset-0" />
      <span className="label pointer-events-none absolute bottom-[12%] left-1/2 -translate-x-1/2 translate-y-1 bg-black/80 px-2 py-1 text-3xs whitespace-nowrap text-paper opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
        {panel.title}
      </span>
    </Link>
  );
}
