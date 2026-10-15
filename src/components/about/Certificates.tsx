"use client";

import Image from "next/image";
import { useLightbox } from "@/components/photography/Lightbox";
import type { Certificate } from "@/content/about";

/** Certificate cards; tapping one zooms the certificate full screen. */
export default function Certificates({ certs }: { certs: Certificate[] }) {
  const { open, lightbox } = useLightbox(certs.map((c) => ({ src: c.image, alt: c.title, note: `${c.issuer} · ${c.date}`, width: c.width, height: c.height })));
  return (
    <>
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {certs.map((c, i) => (
          <li key={c.title}>
            <button type="button" onClick={() => open(i)} className="group press block w-full text-left">
              <span data-lightbox-index={i} className="relative block aspect-[1.414] overflow-hidden rounded-[2px] bg-paper-deep shadow-[0_20px_40px_-24px_rgb(0_48_73/0.5)] ring-1 ring-ink/10 transition-transform duration-700 ease-[var(--ease-spring)] group-hover:-rotate-1 group-hover:-translate-y-1">
                <Image src={c.image} alt="" fill sizes="(min-width: 640px) 30vw, 92vw" className="object-cover" />
              </span>
              <span className="label mt-4 block text-[0.62rem] text-ember">{c.issuer} · {c.date}</span>
              <span className="mt-1 block font-display text-xl leading-snug">{c.title}</span>
              {c.note && <span className="mt-1 block font-serif text-base leading-snug text-ink/60 italic">{c.note}</span>}
            </button>
            {c.verify && (
              <a href={c.verify} target="_blank" rel="noopener noreferrer" className="label ulink mt-3 inline-block text-[0.58rem] text-ink/60 hover:text-ember">
                Verify certificate ↗
              </a>
            )}
          </li>
        ))}
      </ul>
      {lightbox}
    </>
  );
}
