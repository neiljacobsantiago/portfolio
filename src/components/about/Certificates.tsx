"use client";

import Image from "next/image";
import { useLightbox } from "@/components/photography/Lightbox";
import Icon from "@/components/ui/Icon";
import type { Certificate } from "@/content/about";
import { reveal } from "@/lib/reveal";

/**
 * A wall of certificates, newest first and largest. Tapping one opens it full
 * screen (the card morphs into the lightbox); verifiable ones carry a link.
 */
export default function Certificates({ certs }: { certs: Certificate[] }) {
  const { open, lightbox } = useLightbox(certs.map((c) => ({ src: c.image, alt: c.title, note: `${c.issuer} · ${c.date}`, width: c.width, height: c.height })));
  return (
    <>
      <ul className="grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {certs.map((c, i) => {
          const lead = i === 0;
          return (
            <li key={c.title} {...reveal("up", (i % 4) * 70)} className={lead ? "sm:col-span-2 lg:row-span-2" : undefined}>
              <button type="button" onClick={() => open(i)} className="group press block w-full text-left" aria-label={`View certificate: ${c.title}`}>
                <span
                  data-lightbox-index={i}
                  className="relative block aspect-[1.414] overflow-hidden rounded-[3px] bg-white shadow-[0_24px_44px_-26px_rgb(0_48_73/0.55)] ring-1 ring-ink/10 transition-transform duration-700 ease-[var(--ease-spring)] pointer-fine:group-hover:-translate-y-1 pointer-fine:group-hover:-rotate-[0.6deg]"
                >
                  <Image src={c.image} alt="" fill sizes={lead ? "(min-width: 1024px) 46vw, (min-width: 640px) 90vw, 92vw" : "(min-width: 1024px) 22vw, (min-width: 640px) 45vw, 92vw"} className="object-cover" />
                  <span className="label absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-full bg-ink/85 px-3 py-1.5 text-[0.6rem] text-paper opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
                    <Icon name="search" className="h-3.5 w-3.5" />
                    View
                  </span>
                </span>
                <span className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1">
                  {lead && <span className="label rounded-full bg-ember px-2.5 py-1 text-[0.58rem] text-paper">Newest</span>}
                  <span className="label text-[0.64rem] text-ember">
                    {c.issuer} · {c.date}
                  </span>
                </span>
                <span className={`mt-1.5 block font-display leading-snug ${lead ? "text-2xl md:text-3xl" : "text-xl"}`}>{c.title}</span>
                {c.note && <span className="mt-1 block font-serif text-base leading-snug text-ink/75 italic">{c.note}</span>}
              </button>
              {c.verify && (
                <a href={c.verify} target="_blank" rel="noopener noreferrer" className="label ulink mt-3 inline-flex items-center gap-1.5 text-[0.62rem] text-ink/80 hover:text-ember">
                  Verify certificate
                  <Icon name="arrow-up-right" className="h-3.5 w-3.5" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              )}
            </li>
          );
        })}
      </ul>
      {lightbox}
    </>
  );
}
