import Image from "next/image";
import Link from "next/link";
import Plate from "@/components/photography/Plate";
import Magnetic from "@/components/ui/Magnetic";
import type { SeriesWithPhotos } from "@/lib/photos";
import { reveal } from "@/lib/reveal";
import { site } from "@/lib/site";

/** Home-page window into the photography: one card per series, swipeable on phones. */
export default function PhotoTeaser({ series }: { series: SeriesWithPhotos[] }) {
  return (
    <section aria-labelledby="photo-title" className="overflow-hidden bg-ink py-24 text-paper md:py-32">
      <div className="mx-auto grid max-w-[90rem] gap-8 px-5 md:grid-cols-12 md:px-10">
        <p className="label text-sky md:col-span-3">Photography</p>
        <div className="md:col-span-9">
          <h2 id="photo-title" className="font-display text-[clamp(2.5rem,6vw,5rem)] leading-none">
            Light, caught <em className="font-serif text-ember">in passing.</em>
          </h2>
          <p className="mt-6 max-w-xl font-serif text-xl leading-relaxed text-paper/80">
            Concert barricades, studio portraits, campus events and long nights under Andromeda — shot on Canon, Nikon and iPhone.
          </p>
        </div>
      </div>

      <ul className="no-scrollbar mt-14 flex snap-x snap-mandatory scroll-px-5 gap-5 overflow-x-auto px-5 pb-4 md:scroll-px-10 md:gap-8 md:px-10">
        {series.map((s, i) => {
          const cover = s.photos[0];
          return (
            <li key={s.slug} {...reveal("up", i * 90)} className="w-[78vw] max-w-sm shrink-0 snap-start md:w-[24rem]">
              <Link href={`/photography#${s.slug}`} data-cursor="View" className="group press block">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[2px]">
                  {cover ? (
                    <Image src={cover.src} alt={cover.alt} fill sizes="(min-width: 768px) 24rem, 78vw" className="object-cover transition-transform duration-[1.2s] group-hover:scale-105" />
                  ) : (
                    <Plate index={i} title={s.title} className="transition-transform duration-[1.2s] group-hover:scale-105" />
                  )}
                </div>
                <div className="mt-4 flex items-baseline justify-between gap-4">
                  <h3 className="font-display text-2xl">{s.title}</h3>
                  <span className="label text-[0.65rem] text-paper/60">{s.photos.length} frames</span>
                </div>
                <p className="mt-1 line-clamp-2 font-serif italic text-paper/70">{s.story}</p>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mx-auto mt-12 flex max-w-[90rem] flex-wrap gap-4 px-5 md:px-10">
        <Magnetic>
          <Link href="/photography" className="btn bg-paper text-ink hover:bg-sky">
            Open the gallery <span className="arrow">→</span>
          </Link>
        </Magnetic>
        {site.photographySite.url && (
          <a href={site.photographySite.url} target="_blank" rel="noopener noreferrer" className="label rounded-full border border-paper/30 px-7 py-4 transition-colors hover:border-paper">
            {site.photographySite.label} ↗
          </a>
        )}
      </div>
    </section>
  );
}
