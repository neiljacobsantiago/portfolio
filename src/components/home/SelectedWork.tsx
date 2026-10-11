import Link from "next/link";
import { projects } from "@/content/work";

const tones = ["bg-paper text-ink", "bg-ink text-paper", "bg-paper-deep text-ink", "bg-wine text-paper"];

/** Stacking cards: each project pins slightly lower than the last as you scroll. CSS-only. */
export default function SelectedWork() {
  return (
    <section aria-labelledby="work-title" className="mx-auto max-w-[90rem] px-5 py-24 md:px-10 md:py-32">
      <div className="mb-12 grid gap-6 md:mb-16 md:grid-cols-12">
        <p className="label text-ember md:col-span-3">Selected work</p>
        <h2 id="work-title" className="font-display text-[clamp(2.5rem,6vw,5rem)] leading-none md:col-span-9">
          Systems that hold up <em className="font-serif text-ember">under pressure.</em>
        </h2>
      </div>

      <ol className="relative">
        {projects.map((p, i) => (
          <li key={p.slug} className="sticky mb-6" style={{ top: `calc(5.5rem + ${i * 1.25}rem)` }}>
            <Link
              href={`/work#${p.slug}`}
              data-cursor="Read"
              className={`group grid min-h-[22rem] gap-8 rounded-[2px] border border-ink/10 p-7 shadow-[0_-20px_60px_-30px_rgb(0_48_73/0.35)] md:grid-cols-12 md:p-12 ${tones[i % tones.length]}`}
            >
              <span className="font-display text-6xl leading-none opacity-30 md:col-span-2 md:text-8xl">{p.index}</span>
              <div className="md:col-span-7">
                <h3 className="font-display text-3xl leading-tight md:text-5xl">{p.title}</h3>
                <p className="mt-4 font-serif text-xl leading-snug italic opacity-85 md:text-2xl">{p.plain}</p>
                <p className="mt-6 flex flex-wrap gap-2">
                  {p.tools.map((t) => (
                    <span key={t} className="label rounded-full border border-current/25 px-3 py-1.5 text-[0.65rem] opacity-80">
                      {t}
                    </span>
                  ))}
                </p>
              </div>
              <div className="flex items-end justify-between gap-4 md:col-span-3 md:flex-col md:items-end">
                <span className="label opacity-70">{p.outcome}</span>
                <span className="label flex items-center gap-2 transition-transform group-hover:translate-x-1">Case notes →</span>
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
