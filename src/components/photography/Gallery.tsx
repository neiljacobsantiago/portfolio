"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Photo, SeriesWithPhotos } from "@/lib/photos";
import { cn } from "@/lib/utils";
import Plate from "./Plate";

/** Filterable masonry gallery with a keyboard- and swipe-friendly lightbox. */
export default function Gallery({ series }: { series: SeriesWithPhotos[] }) {
  const [filter, setFilter] = useState<string>("all");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // Deep links from the home page: /photography#deep-sky opens that series.
  useEffect(() => {
    const apply = () => {
      const slug = decodeURIComponent(location.hash.slice(1));
      if (series.some((s) => s.slug === slug)) setFilter(slug);
    };
    apply();
    addEventListener("hashchange", apply);
    return () => removeEventListener("hashchange", apply);
  }, [series]);

  const visibleSeries = filter === "all" ? series : series.filter((s) => s.slug === filter);
  const photos = useMemo(() => visibleSeries.flatMap((s) => s.photos), [visibleSeries]);
  const empty = visibleSeries.filter((s) => s.photos.length === 0);
  const bySlug = useMemo(() => Object.fromEntries(series.map((s) => [s.slug, s])), [series]);

  return (
    <div>
      <div role="tablist" aria-label="Filter by series" className="no-scrollbar -mx-5 mb-10 flex gap-2 overflow-x-auto px-5 md:mx-0 md:flex-wrap md:px-0">
        {[{ slug: "all", title: "Everything", count: series.reduce((n, s) => n + s.photos.length, 0) }, ...series.map((s) => ({ slug: s.slug, title: s.title, count: s.photos.length }))].map((tab) => (
          <button
            key={tab.slug}
            role="tab"
            type="button"
            aria-selected={filter === tab.slug}
            onClick={() => setFilter(tab.slug)}
            className={cn(
              "label shrink-0 rounded-full border px-4 py-2.5 transition-colors",
              filter === tab.slug ? "border-ink bg-ink text-paper" : "border-ink/20 hover:border-ink",
            )}
          >
            {tab.title} <span className="opacity-50">{tab.count}</span>
          </button>
        ))}
      </div>

      {photos.length > 0 && (
        <ul className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>li]:mb-4">
          {photos.map((photo, i) => (
            <li key={photo.src} className="break-inside-avoid" {...{ "data-reveal": "up" }}>
              <button
                type="button"
                onClick={() => setOpenIndex(i)}
                data-cursor="View"
                className="group relative block w-full overflow-hidden rounded-[2px] bg-paper-deep"
              >
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  width={photo.width}
                  height={photo.height}
                  sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw"
                  className="h-auto w-full transition-transform duration-[1.2s] ease-out group-hover:scale-[1.03]"
                />
                <span className="label absolute bottom-3 left-3 rounded-full bg-paper/90 px-3 py-1 text-[0.6rem] opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  {bySlug[photo.series]?.title}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {empty.length > 0 && (
        <div className={cn("grid gap-6 sm:grid-cols-2", photos.length > 0 && "mt-16")}>
          {empty.map((s) => (
            <article key={s.slug} className="overflow-hidden rounded-[2px] border border-ink/10 bg-paper/60" {...{ "data-reveal": "up" }}>
              <div className="aspect-[3/2]">
                <Plate index={series.indexOf(s)} title={s.title} />
              </div>
              <div className="p-6">
                <p className="label text-ember">{s.category} · {s.year}</p>
                <h3 className="mt-2 font-display text-3xl">{s.title}</h3>
                <p className="mt-3 font-serif text-lg leading-relaxed text-ink/80">{s.story}</p>
                <p className="label mt-4 text-[0.65rem] text-ink/50">{s.gear}</p>
              </div>
            </article>
          ))}
        </div>
      )}

      {openIndex !== null && photos[openIndex] && (
        <Lightbox
          photos={photos}
          index={openIndex}
          seriesTitle={(p) => bySlug[p.series]?.title ?? ""}
          onIndex={setOpenIndex}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </div>
  );
}

function Lightbox({
  photos,
  index,
  seriesTitle,
  onIndex,
  onClose,
}: {
  photos: Photo[];
  index: number;
  seriesTitle: (p: Photo) => string;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const photo = photos[index];
  const touchX = useRef<number | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const go = useCallback((delta: number) => onIndex((index + delta + photos.length) % photos.length), [index, photos.length, onIndex]);

  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
      prevFocus?.focus();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [go, onClose]);

  // Portal to <body> so no ancestor stacking context can trap it under the header.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${photo.alt} — photo ${index + 1} of ${photos.length}`}
      data-lenis-prevent
      className="fixed inset-0 z-[90] flex flex-col bg-ink text-paper"
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        touchX.current = null;
      }}
    >
      <div className="flex items-center justify-between px-5 py-4 md:px-10">
        <span className="label text-paper/70">
          {String(index + 1).padStart(2, "0")} / {String(photos.length).padStart(2, "0")}
        </span>
        <button ref={closeRef} type="button" onClick={onClose} className="label rounded-full border border-paper/30 px-4 py-2 hover:bg-paper hover:text-ink">
          Close ✕
        </button>
      </div>

      <div className="relative flex-1" onClick={onClose}>
        <Image key={photo.src} src={photo.src} alt={photo.alt} fill sizes="100vw" className="animate-page-in object-contain p-2 md:p-8" onClick={(e) => e.stopPropagation()} />
      </div>

      <div className="flex items-center justify-between gap-4 px-5 py-5 md:px-10">
        <button type="button" onClick={() => go(-1)} className="label h-11 rounded-full border border-paper/30 px-5 hover:bg-paper hover:text-ink" aria-label="Previous photo">
          ←
        </button>
        <p className="min-w-0 text-center">
          <span className="block truncate font-serif text-lg italic">{photo.alt}</span>
          <span className="label text-[0.65rem] text-sky">{seriesTitle(photo)}</span>
        </p>
        <button type="button" onClick={() => go(1)} className="label h-11 rounded-full border border-paper/30 px-5 hover:bg-paper hover:text-ink" aria-label="Next photo">
          →
        </button>
      </div>
    </div>,
    document.body,
  );
}
