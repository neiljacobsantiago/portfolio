import Link from "next/link";
import type { CSSProperties } from "react";
import ProjectCover from "@/components/work/ProjectCover";
import Tilt from "@/components/ui/Tilt";
import { categories, featuredProjects } from "@/content/work";

const tones = [
  { card: "bg-paper text-ink", cta: "bg-ink text-paper" },
  { card: "bg-ink text-paper", cta: "bg-paper text-ink" },
  { card: "bg-paper-deep text-ink", cta: "bg-ember text-paper" },
  { card: "bg-wine text-paper", cta: "bg-paper text-wine" },
];

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Stacking cards: each project pins slightly lower than the last as you
 * scroll. Where CSS scroll timelines exist, the card underneath sinks back and
 * dims as the next one slides over it, and each cover drifts inside its frame
 * (`.work-*` in globals.css). Otherwise, and with reduced motion, it is the
 * plain sticky stack. No JavaScript either way.
 */
export default function SelectedWork() {
  const projects = featuredProjects();
  return (
    <section aria-labelledby="work-title" className="mx-auto max-w-[90rem] px-5 py-24 md:px-10 md:py-32">
      <div className="mb-12 grid gap-6 md:mb-16 md:grid-cols-12">
        <p className="label text-ember md:col-span-3">Selected work</p>
        <div className="md:col-span-9">
          <h2 id="work-title" className="font-display text-[clamp(2.5rem,6vw,5rem)] leading-[1.04]">
            Systems that hold up <em className="font-serif text-ember">under pressure.</em>
          </h2>
          <Link href="/work" className="label ulink mt-6 inline-block text-ink/70 hover:text-ink">
            All projects →
          </Link>
        </div>
      </div>

      <ol className="work-stack relative">
        {projects.map((p, i) => {
          const tone = tones[i % tones.length];
          const last = i === projects.length - 1;
          return (
            <li
              key={p.slug}
              className="work-card sticky top-[calc(4.75rem+var(--i)*0.75rem)] mb-6 md:top-[calc(5.5rem+var(--i)*1.25rem)]"
              style={{ "--i": i, "--self": `--c${i + 1}`, "--next": `--c${i + 2}` } as CSSProperties}
            >
              <div className={last ? undefined : "work-depth origin-top"}>
                <Tilt max={3} className="rounded-[2px]">
                  <Link
                    href={`/work/${p.slug}`}
                    aria-label={`${p.title}: view project`}
                    className={`group relative grid overflow-hidden rounded-[2px] border border-ink/10 shadow-[0_-20px_60px_-30px_rgb(0_48_73/0.35)] md:grid-cols-12 ${tone.card}`}
                  >
                    <div className="flex flex-col justify-between gap-5 p-6 md:col-span-7 md:gap-8 md:p-12">
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex items-baseline gap-2">
                          <span className="font-display text-3xl leading-none md:text-4xl">{pad(i + 1)}</span>
                          <span className="label text-[0.6rem] opacity-50">/ {pad(projects.length)}</span>
                        </span>
                        <span className="flex flex-wrap justify-end gap-2">
                          {p.privateRepo && <span className="label hidden rounded-full border border-current/30 px-3 py-1 text-[0.58rem] opacity-70 sm:inline-block">Private repo</span>}
                          <span className="label rounded-full border border-current/30 px-3 py-1 text-[0.58rem]">{categories[p.category].label}</span>
                        </span>
                      </div>
                      <div>
                        <p className="label text-[0.62rem] opacity-60">{p.context}</p>
                        <h3 className="mt-2 font-display text-[1.85rem] leading-[1.1] md:mt-3 md:text-5xl">{p.title}</h3>
                        <p className="mt-2 font-serif text-[1.0625rem] leading-snug italic opacity-85 md:mt-4 md:text-2xl">{p.plain}</p>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
                        <span className={`label inline-flex items-center gap-3 rounded-full py-1.5 pr-1.5 pl-5 text-[0.68rem] ${tone.cta}`}>
                          View project
                          <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-full bg-current/15 transition-transform duration-500 ease-[var(--ease-spring)] group-hover:translate-x-1">
                            →
                          </span>
                        </span>
                        <span className="label text-[0.58rem] opacity-60">{p.role}</span>
                      </div>
                    </div>
                    <div className="relative aspect-[2/1] overflow-hidden md:col-span-5 md:aspect-auto md:min-h-[24rem]">
                      <div className="work-parallax absolute inset-x-0 -top-[8%] -bottom-[8%]">
                        <ProjectCover project={p} sizes="(min-width: 768px) 40vw, 92vw" className="h-full w-full" />
                      </div>
                    </div>
                    {!last && <span aria-hidden className="work-shade pointer-events-none absolute inset-0 bg-ink opacity-0" />}
                  </Link>
                </Tilt>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
