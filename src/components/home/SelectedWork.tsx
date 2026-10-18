import Link from "next/link";
import type { CSSProperties } from "react";
import Icon from "@/components/ui/Icon";
import Tilt from "@/components/ui/Tilt";
import ProjectCover from "@/components/work/ProjectCover";
import { categories, featuredProjects } from "@/content/work";
import { cn } from "@/lib/utils";

const tones = [
  { card: "bg-paper text-ink", cta: "bg-ink text-paper" },
  { card: "bg-ink text-paper", cta: "bg-paper text-ink" },
  { card: "bg-paper-deep text-ink", cta: "bg-ember text-paper" },
  { card: "bg-wine text-paper", cta: "bg-paper text-wine" },
];

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Stacking cards, like the iOS app switcher turned on its side: every project
 * pins a little lower than the last, so the ones underneath peek out above it.
 * Where CSS scroll timelines exist, a card that is being covered eases back,
 * lifts and dims while the next one slides over it, and again (less) when the
 * one after that arrives, so the pile reads as depth (`.ws-*` in globals.css;
 * transform and opacity only). Without them, with reduced motion or on
 * low-power devices it is the same pile, held still. No JavaScript.
 */
export default function SelectedWork() {
  const projects = featuredProjects();
  return (
    <section aria-labelledby="work-title" className="mx-auto max-w-[90rem] px-5 py-24 md:px-10 md:py-32">
      <div className="mb-10 grid gap-6 md:mb-16 md:grid-cols-12">
        <p className="label text-ember md:col-span-3">Selected work</p>
        <div className="md:col-span-9">
          <h2 id="work-title" className="font-display text-[clamp(2.5rem,6vw,5rem)] leading-[1.04]">
            Systems that hold up <em className="font-serif text-ember">under pressure.</em>
          </h2>
          <Link href="/work" className="label ulink mt-6 inline-flex items-center gap-2 text-ink/70 hover:text-ink">
            All projects <Icon name="arrow-right" />
          </Link>
        </div>
      </div>

      <ol className="ws-stack relative grid grid-cols-1">
        {projects.map((p, i) => {
          const tone = tones[i % tones.length];
          const covered = i < projects.length - 1;
          const deep = i < projects.length - 2;
          return (
            <li
              key={p.slug}
              className="ws-card sticky mb-5 min-w-0 md:mb-8"
              style={{ "--i": i, "--self": `--ws${i + 1}`, "--next": `--ws${i + 2}`, "--next2": `--ws${i + 3}` } as CSSProperties}
            >
              <div className="ws-arrive">
                <div className={cn(covered && "ws-recede")}>
                  <div className={cn(deep && "ws-recede-2")}>
                    <Tilt max={2.5} className="ws-radius">
                      <Link
                        href={`/work/${p.slug}`}
                        aria-label={`${p.title}: view project`}
                        className={cn("ws-tile group relative isolate grid grid-cols-1 overflow-hidden md:grid-cols-12", tone.card)}
                      >
                        <div className="relative aspect-[16/9] overflow-hidden md:order-2 md:col-span-5 md:aspect-auto md:min-h-[26rem]">
                          <div className="work-parallax absolute inset-x-0 -top-[8%] -bottom-[8%]">
                            <ProjectCover project={p} sizes="(min-width: 768px) 40vw, 92vw" className="h-full w-full" />
                          </div>
                        </div>

                        <div className="flex min-w-0 flex-col justify-between gap-4 p-5 sm:p-7 md:order-1 md:col-span-7 md:gap-8 md:p-12">
                          <div className="flex items-center justify-between gap-3">
                            <span className="flex items-baseline gap-2">
                              <span className="font-display text-3xl leading-none md:text-4xl">{pad(i + 1)}</span>
                              <span className="label text-[0.6rem] opacity-50">/ {pad(projects.length)}</span>
                            </span>
                            <span className="flex min-w-0 flex-wrap justify-end gap-2">
                              {p.privateRepo && <span className="label hidden rounded-full border border-current/30 px-3 py-1 text-[0.58rem] opacity-70 sm:inline-block">Private repo</span>}
                              <span className="label rounded-full border border-current/30 px-3 py-1 text-[0.58rem]">{categories[p.category].label}</span>
                            </span>
                          </div>
                          <div>
                            <p className="label text-[0.6rem] opacity-60">{p.context}</p>
                            <h3 className="mt-2 font-display text-[clamp(1.7rem,6.4vw,3rem)] leading-[1.08] md:mt-3">{p.title}</h3>
                            <p className="mt-2 line-clamp-3 font-serif text-[1.0625rem] leading-snug italic opacity-85 md:mt-4 md:line-clamp-none md:text-2xl">{p.plain}</p>
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
                            <span className={cn("label inline-flex items-center gap-3 rounded-full py-1.5 pr-1.5 pl-5 text-[0.68rem]", tone.cta)}>
                              View project
                              <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-full bg-current/15 transition-transform duration-500 ease-[var(--ease-spring)] group-hover:translate-x-1">
                                <Icon name="arrow-right" className="h-4 w-4" />
                              </span>
                            </span>
                            <span className="label text-[0.58rem] opacity-60">{p.role}</span>
                          </div>
                        </div>

                        {covered && <span aria-hidden className="ws-shade pointer-events-none absolute inset-0 z-10 bg-[#001521] opacity-0" />}
                        {deep && <span aria-hidden className="ws-shade-2 pointer-events-none absolute inset-0 z-10 bg-[#001521] opacity-0" />}
                      </Link>
                    </Tilt>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
