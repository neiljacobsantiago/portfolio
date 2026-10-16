import Link from "next/link";
import { projectBySlug } from "@/content/work";
import type { OfferId } from "@/content/offers";
import { getTestimonials } from "@/content/testimonials";
import { reveal } from "@/lib/reveal";

const month = (ym: string) => {
  const d = new Date(`${ym}-01T00:00:00+08:00`);
  return Number.isNaN(d.getTime()) ? ym : new Intl.DateTimeFormat("en-PH", { month: "short", year: "numeric", timeZone: "Asia/Manila" }).format(d);
};

/**
 * Quotes from clients and collaborators (content/testimonials.ts).
 * Renders nothing at all until there's at least one published quote.
 */
export default async function KindWords({ project, offer, compact = false, className = "" }: { project?: string; offer?: OfferId; compact?: boolean; className?: string }) {
  const items = await getTestimonials({ project, offer });
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="kind-words-title" className={className}>
      {compact ? (
        <h2 id="kind-words-title" className="label mb-4 text-ink/50">
          Kind words
        </h2>
      ) : (
        <div className="mb-10 grid gap-4 md:grid-cols-12">
          <p className="label text-ember md:col-span-3">Kind words</p>
          <h2 id="kind-words-title" className="font-display text-[clamp(2.25rem,5vw,4rem)] leading-none md:col-span-9">
            In their <em className="font-serif text-ember">own words.</em>
          </h2>
        </div>
      )}
      <ul className={compact ? "space-y-6" : "grid gap-5 md:grid-cols-2"}>
        {items.map((t, i) => {
          const work = t.project ? projectBySlug(t.project) : undefined;
          return (
            <li key={t.id} {...reveal("up", i * 80)}>
              <figure className="relative h-full rounded-[2px] border border-ink/10 bg-paper/70 p-6 md:p-8">
                <span aria-hidden className="absolute top-2 left-4 font-display text-6xl leading-none text-ember/25">
                  “
                </span>
                <blockquote className="relative font-serif text-xl leading-relaxed text-ink/85 md:text-2xl">{t.quote}</blockquote>
                <figcaption className="mt-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <span>
                    <span className="block font-display text-lg">{t.name}</span>
                    {t.role && <span className="block font-serif text-base text-ink/60 italic">{t.role}</span>}
                  </span>
                  <span className="label text-[0.58rem] text-ink/45">
                    {work && !project && (
                      <>
                        <Link href={`/work/${work.slug}`} className="ulink hover:text-ink">
                          {work.title}
                        </Link>
                        {" · "}
                      </>
                    )}
                    {month(t.date)}
                  </span>
                </figcaption>
              </figure>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
