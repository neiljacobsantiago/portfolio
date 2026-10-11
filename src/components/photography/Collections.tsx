"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { SeriesWithPhotos } from "@/lib/photos";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { useLightbox } from "./Lightbox";
import Plate from "./Plate";

const TONES = {
  paper: { section: "bg-transparent text-ink", head: "bg-ink text-paper", muted: "text-paper/55" },
  ink: { section: "bg-ink text-paper", head: "bg-ink text-paper", muted: "text-paper/55" },
  night: { section: "bg-[#050a12] text-paper", head: "bg-[#050a12] text-paper", muted: "text-paper/55" },
};

/**
 * The photography page body: one section per collection (feature image +
 * masonry), a sticky collection switcher that tracks where you are, and one
 * lightbox across every photo.
 */
export default function Collections({ series }: { series: SeriesWithPhotos[] }) {
  const photos = useMemo(() => series.flatMap((s) => s.photos.map((p) => ({ ...p, group: s.title }))), [series]);
  const { open, lightbox } = useLightbox(photos);
  const [active, setActive] = useState(series[0]?.slug);

  // Highlight the collection currently in view.
  useEffect(() => {
    const els = series.map((s) => document.getElementById(s.slug)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [series]);

  // Each photo's position in the shared lightbox list.
  const offsets = useMemo(() => series.map((_, i) => series.slice(0, i).reduce((n, s) => n + s.photos.length, 0)), [series]);

  return (
    <>
      <nav aria-label="Collections" className="sticky top-16 z-30 border-y border-ink/10 bg-paper/95 md:top-20 md:bg-paper/85 md:backdrop-blur-md">
        <ul className="no-scrollbar mx-auto flex max-w-[90rem] gap-2 overflow-x-auto px-5 py-3 md:px-10">
          {series.map((s) => (
            <li key={s.slug} className="shrink-0">
              <a
                href={`#${s.slug}`}
                onClick={() => haptic()}
                aria-current={active === s.slug ? "true" : undefined}
                className={cn(
                  "label press inline-flex rounded-full border px-4 py-2",
                  active === s.slug ? "border-ink bg-ink text-paper" : "border-ink/20 hover:border-ink",
                )}
              >
                {s.title} <span className="ml-2 opacity-50">{s.photos.length}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {series.map((s, si) => {
        const tone = TONES[s.tone];
        const [feature, ...rest] = s.photos;
        const featureIndex = offsets[si];
        const restStart = featureIndex + 1;

        return (
          <section key={s.slug} id={s.slug} aria-labelledby={`${s.slug}-title`} className="scroll-mt-32 md:scroll-mt-36">
            <header className={cn("px-5 py-14 md:px-10 md:py-20", tone.head)}>
              <div className="mx-auto grid max-w-[90rem] gap-6 md:grid-cols-12" data-reveal="up">
                <p className={cn("label md:col-span-3", tone.muted)}>{s.kicker}</p>
                <div className="md:col-span-9">
                  <h2 id={`${s.slug}-title`} className="font-display text-[clamp(2.5rem,6vw,5rem)] leading-[1.02]">
                    {s.title}
                  </h2>
                  <span aria-hidden className="mt-5 block h-0.5 w-16 bg-ember" />
                  <p className="mt-5 max-w-2xl font-serif text-lg leading-relaxed opacity-75">{s.story}</p>
                  <p className={cn("label mt-4 text-[0.62rem]", tone.muted)}>{s.gear}</p>
                </div>
              </div>
            </header>

            <div className={cn("px-5 py-10 md:px-10 md:py-14", tone.section)}>
              <div className="mx-auto max-w-[90rem]">
                {!feature ? (
                  <div className="aspect-[21/9] overflow-hidden rounded-[2px]">
                    <Plate index={si} title={s.title} />
                  </div>
                ) : (
                  <>
                    <PhotoButton photo={feature} index={featureIndex} onOpen={open} feature sizes="(min-width: 1440px) 1360px, 100vw" />
                    {rest.length > 0 && (
                      <ul className="mt-3 columns-2 gap-3 sm:mt-4 sm:gap-4 lg:columns-3 [&>li]:mb-3 sm:[&>li]:mb-4">
                        {rest.map((photo, i) => (
                          <li key={photo.src} className="break-inside-avoid" data-reveal="up" style={{ "--reveal-delay": `${(i % 3) * 70}ms` } as React.CSSProperties}>
                            <PhotoButton photo={photo} index={restStart + i} onOpen={open} sizes="(min-width: 1024px) 30vw, 46vw" />
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
            </div>
          </section>
        );
      })}

      {lightbox}
    </>
  );
}

function PhotoButton({
  photo,
  index,
  onOpen,
  feature,
  sizes,
}: {
  photo: SeriesWithPhotos["photos"][number];
  index: number;
  onOpen: (i: number) => void;
  feature?: boolean;
  sizes: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(index)}
      data-cursor="View"
      data-lightbox-index={index}
      className="group relative block w-full overflow-hidden rounded-[2px] bg-ink/20 transition-transform duration-500 ease-[var(--ease-spring)] active:scale-[0.985]"
    >
      <Image
        src={photo.src}
        alt={photo.alt}
        width={photo.width}
        height={photo.height}
        sizes={sizes}
        className={cn(
          "w-full transition-transform duration-[1.4s] ease-[var(--ease-apple)] group-hover:scale-[1.04]",
          feature ? "max-h-[78vh] object-cover" : "h-auto",
        )}
      />
      <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end bg-gradient-to-t from-ink/85 via-ink/20 to-transparent p-4 text-left text-paper opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-visible:opacity-100 md:p-6">
        <span>
          <span className={cn("block font-display leading-none", feature ? "text-3xl md:text-5xl" : "text-xl")}>{photo.alt}</span>
          {photo.note && <span className="label mt-2 block text-[0.6rem] text-[#ff6b6b]">{photo.note}</span>}
        </span>
      </span>
    </button>
  );
}
