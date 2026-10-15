import Link from "next/link";
import ProjectCover from "@/components/work/ProjectCover";
import Tilt from "@/components/ui/Tilt";
import { categories, featuredProjects } from "@/content/work";

const tones = ["bg-paper text-ink", "bg-ink text-paper", "bg-paper-deep text-ink", "bg-wine text-paper"];

/** Stacking cards: each project pins slightly lower than the last as you scroll. CSS-only. */
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

      <ol className="relative">
        {projects.map((p, i) => (
          <li key={p.slug} className="sticky mb-6" style={{ top: `calc(5.5rem + ${i * 1.25}rem)` }}>
            <Tilt max={3} className="rounded-[2px]">
              <Link
                href={`/work/${p.slug}`}
                className={`group grid overflow-hidden rounded-[2px] border border-ink/10 shadow-[0_-20px_60px_-30px_rgb(0_48_73/0.35)] md:grid-cols-12 ${tones[i % tones.length]}`}
              >
                <div className="flex flex-col justify-between gap-8 p-7 md:col-span-7 md:p-12">
                  <div className="flex items-center justify-between gap-4">
                    <span className="label opacity-70">
                      0{i + 1} · {categories[p.category].label}
                    </span>
                    {p.privateRepo && <span className="label rounded-full border border-current/30 px-3 py-1 text-[0.6rem] opacity-70">Private repo</span>}
                  </div>
                  <div>
                    <p className="label text-[0.65rem] opacity-60">{p.context}</p>
                    <h3 className="mt-3 font-display text-3xl leading-tight md:text-5xl">{p.title}</h3>
                    <p className="mt-4 font-serif text-xl leading-snug italic opacity-85 md:text-2xl">{p.plain}</p>
                  </div>
                  <span className="label flex items-center gap-2">
                    View project <span className="transition-transform duration-500 ease-[var(--ease-spring)] group-hover:translate-x-1.5">→</span>
                  </span>
                </div>
                <ProjectCover project={p} sizes="(min-width: 768px) 40vw, 92vw" className="aspect-[4/3] md:col-span-5 md:aspect-auto md:min-h-[24rem]" />
              </Link>
            </Tilt>
          </li>
        ))}
      </ol>
    </section>
  );
}
