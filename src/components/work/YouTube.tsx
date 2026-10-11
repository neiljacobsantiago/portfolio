"use client";

import { useState } from "react";

/**
 * Click-to-play YouTube: shows a poster until tapped, so the heavy player
 * (and its tracking) only loads for people who actually want to watch.
 */
export default function YouTube({ id, title }: { id: string; title: string }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="relative aspect-video overflow-hidden rounded-[2px] bg-ink">
      {playing ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      ) : (
        <button type="button" onClick={() => setPlaying(true)} data-cursor="Play" className="group absolute inset-0" aria-label={`Play ${title}`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- remote YouTube poster */}
          <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" className="h-full w-full object-cover opacity-80 transition-[opacity,transform] duration-700 group-hover:scale-[1.03] group-hover:opacity-95" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-paper/90 text-2xl text-ink shadow-xl transition-transform duration-500 ease-[var(--ease-spring)] group-hover:scale-110 group-active:scale-95">
              ▶
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
