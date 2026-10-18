"use client";

import { useState } from "react";
import type { Project } from "@/content/work";
import { haptic } from "@/lib/haptics";
import Icon from "@/components/ui/Icon";

type Item = NonNullable<Project["media"]>[number];

/**
 * Published pieces on Facebook. Videos are click-to-load (no Facebook script
 * or tracking until someone presses play, which keeps budget phones fast);
 * posts open on Facebook, since post embeds need its SDK.
 */
export default function FacebookMedia({ items }: { items: Item[] }) {
  const videos = items.filter((m) => m.kind === "video");
  const posts = items.filter((m) => m.kind === "post");
  const [playing, setPlaying] = useState<number | null>(null);
  const current = playing === null ? null : videos[playing];

  return (
    <div className="space-y-8">
      {videos.length > 0 && (
        <div>
          <div className="relative aspect-video overflow-hidden rounded-[2px] bg-ink text-paper">
            {current ? (
              <iframe
                key={current.href}
                src={`https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(current.href)}&show_text=false&autoplay=true&width=1280`}
                title={current.label}
                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                allowFullScreen
                className="animate-pop-in absolute inset-0 h-full w-full border-0"
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  haptic();
                  setPlaying(0);
                }}
                className="group absolute inset-0 flex flex-col items-center justify-center gap-5 bg-[radial-gradient(circle_at_30%_20%,rgb(193_18_31/0.45),transparent_60%)]"
              >
                <span className="flex h-20 w-20 items-center justify-center rounded-full bg-paper text-ink shadow-xl transition-transform duration-500 ease-[var(--ease-spring)] group-hover:scale-110 group-active:scale-95">
                  <Icon name="play" className="ml-1 h-8 w-8" />
                </span>
                <span className="label text-paper/80">Play {videos[0].label}</span>
                <span className="font-serif text-sm text-paper/50 italic">Loads Facebook&apos;s player only when you press play</span>
              </button>
            )}
          </div>

          {videos.length > 1 && (
            <ol className="no-scrollbar -mx-5 mt-3 flex snap-x gap-2 overflow-x-auto px-5 md:mx-0 md:grid md:grid-cols-6 md:px-0" aria-label="Episodes">
              {videos.map((v, i) => (
                <li key={v.href} className="shrink-0 snap-start">
                  <button
                    type="button"
                    aria-pressed={playing === i}
                    onClick={() => {
                      haptic();
                      setPlaying(i);
                    }}
                    className="press group flex w-28 flex-col gap-1 rounded-[2px] border border-ink/15 p-3 text-left transition-colors hover:border-ink aria-pressed:border-ember aria-pressed:bg-ember aria-pressed:text-paper md:w-full"
                  >
                    <span className="label text-[0.55rem] opacity-60">{playing === i ? "Now playing" : "Episode"}</span>
                    <span className="font-display text-3xl leading-none">{String(i + 1).padStart(2, "0")}</span>
                  </button>
                </li>
              ))}
            </ol>
          )}
          {current && (
            <a href={current.href} target="_blank" rel="noopener noreferrer" className="label ulink mt-4 inline-flex items-center gap-1.5 text-ink/60 hover:text-ink">
              Open {current.label} on Facebook <Icon name="arrow-up-right" />
            </a>
          )}
        </div>
      )}

      {posts.length > 0 && (
        <ul className="divide-y divide-ink/10 border-y border-ink/10">
          {posts.map((p) => (
            <li key={p.href}>
              <a href={p.href} target="_blank" rel="noopener noreferrer" className="group press flex items-center justify-between gap-4 py-5">
                <span className="flex min-w-0 items-center gap-4">
                  <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1877f2] font-display text-xl text-white transition-transform duration-500 ease-[var(--ease-spring)] group-hover:-rotate-12">
                    f
                  </span>
                  <span>
                    <span className="block font-serif text-xl leading-snug transition-colors group-hover:text-ember">{p.label}</span>
                    <span className="label text-[0.58rem] text-ink/50">Published post · facebook.com</span>
                  </span>
                </span>
                <Icon name="arrow-up-right" className="h-5 w-5 transition-transform duration-500 ease-[var(--ease-spring)] group-hover:translate-x-1 group-hover:-translate-y-1" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
