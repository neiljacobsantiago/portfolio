"use client";

import Image from "next/image";
import { useLightbox, type LightboxItem } from "@/components/photography/Lightbox";

/** Screenshot strip for a case study; tap any image to view it full screen. */
export default function ProjectImages({ images }: { images: LightboxItem[] }) {
  const { open, lightbox } = useLightbox(images);
  return (
    <>
      <ul className={`grid gap-4 ${images.length > 1 ? "sm:grid-cols-2" : ""}`}>
        {images.map((img, i) => (
          <li key={img.src} className={images.length > 2 && i === 0 ? "sm:col-span-2" : undefined}>
            <button type="button" onClick={() => open(i)} data-cursor="View" data-lightbox-index={i} className="group press block w-full overflow-hidden rounded-[2px] bg-paper-deep ring-1 ring-ink/10">
              <Image src={img.src} alt={img.alt} width={1600} height={1000} sizes="(min-width: 640px) 45vw, 92vw" className="h-auto w-full transition-transform duration-[1.2s] ease-[var(--ease-apple)] group-hover:scale-[1.03]" />
            </button>
          </li>
        ))}
      </ul>
      {lightbox}
    </>
  );
}
