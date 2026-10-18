"use client";

import Image from "next/image";
import { useLightbox, type LightboxItem } from "@/components/photography/Lightbox";

/** Screenshot strip for a project page; tap any image to view it full screen. */
export default function ProjectImages({ images }: { images: LightboxItem[] }) {
  const { open, lightbox } = useLightbox(images);
  // Long photo stories (concerts) flow as a masonry wall; a few screenshots sit in a grid.
  const wall = images.length > 6;
  return (
    <>
      <ul className={wall ? "columns-2 gap-3 lg:columns-3 [&>li]:mb-3" : `grid gap-4 ${images.length > 1 ? "sm:grid-cols-2" : ""}`}>
        {images.map((img, i) => (
          <li key={img.src} className={!wall && images.length > 2 && i === 0 ? "sm:col-span-2" : "break-inside-avoid"}>
            <button type="button" onClick={() => open(i)} data-lightbox-index={i} className="group press relative block w-full overflow-hidden rounded-[2px] bg-paper-deep ring-1 ring-ink/10">
              <Image src={img.src} alt={img.alt} width={1600} height={1000} sizes={wall ? "(min-width: 1024px) 22vw, 46vw" : "(min-width: 640px) 45vw, 92vw"} className="h-auto w-full transition-transform duration-[1.2s] ease-[var(--ease-apple)] group-hover:scale-[1.03]" />
              {wall && (
                <span className="label pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-ink/80 to-transparent px-3 pt-8 pb-3 text-left text-3xs text-paper transition-transform duration-500 ease-[var(--ease-apple)] group-hover:translate-y-0 group-focus-visible:translate-y-0">
                  {img.alt}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
      {lightbox}
    </>
  );
}
