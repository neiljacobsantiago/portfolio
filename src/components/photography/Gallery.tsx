"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import type { SeriesWithPhotos } from "@/lib/photos";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { useLightbox } from "./Lightbox";
import Plate from "./Plate";

/** Filterable masonry gallery with a zooming, keyboard- and swipe-friendly lightbox. */
export default function Gallery({ series }: { series: SeriesWithPhotos[] }) {
  const [filter, setFilter] = useState<string>("all");

  // Deep links from the home page: /photography#astro opens that series.
  useEffect(() => {
    const apply = () => {
      const slug = decodeURIComponent(location.hash.slice(1));
      if (series.some((s) => s.slug === slug)) setFilter(slug);
    };
    apply();
    addEventListener("hashchange", apply);
    return () => removeEventListener("hashchange", apply);
  }, [series]);

  const bySlug = useMemo(() => Object.fromEntries(series.map((s) => [s.slug, s])), [series]);
  const visibleSeries = filter === "all" ? series : series.filter((s) => s.slug === filter);
  const photos = useMemo(() => visibleSeries.flatMap((s) => s.photos), [visibleSeries]);
  const empty = visibleSeries.filter((s) => s.photos.length === 0);
  const items = useMemo(() => photos.map((p) => ({ ...p, group: bySlug[p.series]?.title })), [photos, bySlug]);
  const { open, lightbox } = useLightbox(items);

  const choose = (slug: string) => {
    haptic();
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
    if (doc.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) doc.startViewTransition(() => flushSync(() => setFilter(slug)));
    else setFilter(slug);
  };

  const tabs = [{ slug: "all", title: "Everything", count: series.reduce((n, s) => n + s.photos.length, 0) }, ...series.map((s) => ({ slug: s.slug, title: s.title, count: s.photos.length }))];

  return (
    <div>
      <div role="tablist" aria-label="Filter by series" className="no-scrollbar -mx-5 mb-10 flex gap-2 overflow-x-auto px-5 md:mx-0 md:flex-wrap md:px-0">
        {tabs.map((tab) => (
          <button
            key={tab.slug}
            role="tab"
            type="button"
            aria-selected={filter === tab.slug}
            onClick={() => choose(tab.slug)}
            className={cn("label press shrink-0 rounded-full border px-4 py-2.5", filter === tab.slug ? "border-ink bg-ink text-paper" : "border-ink/20 hover:border-ink")}
          >
            {tab.title} <span className="opacity-50">{tab.count}</span>
          </button>
        ))}
      </div>

      {photos.length > 0 && (
        <ul className="columns-2 gap-3 sm:gap-4 lg:columns-3 [&>li]:mb-3 sm:[&>li]:mb-4">
          {photos.map((photo, i) => (
            <li key={photo.src} className="break-inside-avoid" style={{ viewTransitionName: `g-${i}` }}>
              <button type="button" onClick={() => open(i)} data-cursor="View" data-lightbox-index={i} className="group press relative block w-full overflow-hidden rounded-[2px] bg-paper-deep active:scale-[0.98]">
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  width={photo.width}
                  height={photo.height}
                  sizes="(min-width: 1024px) 30vw, 46vw"
                  className="h-auto w-full transition-transform duration-[1.2s] ease-[var(--ease-apple)] group-hover:scale-[1.04]"
                />
                <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/70 to-transparent p-3 text-left text-paper opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-visible:opacity-100">
                  <span className="block font-serif text-sm italic">{photo.alt}</span>
                  {photo.note && <span className="label text-[0.55rem] text-paper/75">{photo.note}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {empty.length > 0 && (
        <div className={cn("grid gap-6 sm:grid-cols-2", photos.length > 0 && "mt-16")}>
          {empty.map((s) => (
            <article key={s.slug} className="overflow-hidden rounded-[2px] border border-ink/10 bg-paper/60">
              <div className="aspect-[3/2]">
                <Plate index={series.indexOf(s)} title={s.title} />
              </div>
              <div className="p-6">
                <p className="label text-ember">{s.year}</p>
                <h3 className="mt-2 font-display text-3xl">{s.title}</h3>
                <p className="mt-3 font-serif text-lg leading-relaxed text-ink/80">{s.story}</p>
              </div>
            </article>
          ))}
        </div>
      )}

      {lightbox}
    </div>
  );
}
