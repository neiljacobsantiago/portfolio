import type { Metadata } from "next";
import Link from "next/link";
import PageHeader, { Container } from "@/components/layout/PageHeader";
import Gallery from "@/components/photography/Gallery";
import { getSeries } from "@/lib/photos";
import { reveal } from "@/lib/reveal";
import { site, socials } from "@/lib/site";

export const metadata: Metadata = {
  title: "Photography",
  description: "Concert, event and astrophotography by Neil Jacob Santiago — Aurora Music Festival, IRCITE 2026, deep-sky work and the ITSC Media Group.",
};

export default async function PhotographyPage() {
  const series = await getSeries();
  const total = series.reduce((n, s) => n + s.photos.length, 0);
  const instagram = socials.find((s) => s.name === "Instagram")?.url;
  const external = site.photographySite.url ?? instagram;

  return (
    <>
      <PageHeader
        eyebrow="Photography"
        title={<>Light, caught <em className="font-serif text-ember">in passing.</em></>}
        lead="Shot on a Nikon D780, a Canon EOS 1500D and — when the moment won't wait — an iPhone in ProRAW. Tap any frame to see it full screen."
        aside={
          <div className="space-y-4">
            <p className="label leading-loose text-ink/60">
              {series.length} series · {total} frames
            </p>
            {external && (
              <a href={external} target="_blank" rel="noopener noreferrer" className="label inline-flex rounded-full bg-ink px-5 py-3 text-paper transition-colors hover:bg-ember">
                {site.photographySite.url ? site.photographySite.label : "More on Instagram"} ↗
              </a>
            )}
          </div>
        }
      />

      <Container className="pb-24 md:pb-32">
        <Gallery series={series} />

        <section aria-labelledby="series-title" className="mt-24 border-t border-ink/15 pt-16">
          <h2 id="series-title" className="label mb-10 text-ember">The series</h2>
          <div className="grid gap-12 md:grid-cols-2">
            {series.map((s, i) => (
              <article key={s.slug} id={s.slug} {...reveal("up", (i % 2) * 80)} className="scroll-mt-28">
                <p className="label text-ink/50">
                  {String(i + 1).padStart(2, "0")} · {s.category} · {s.year}
                </p>
                <h3 className="mt-3 font-display text-4xl">{s.title}</h3>
                <p className="mt-2 font-serif text-lg italic text-ember">{s.role}</p>
                <p className="mt-4 font-serif text-lg leading-relaxed text-ink/80">{s.story}</p>
                <p className="label mt-4 text-[0.65rem] text-ink/50">{s.gear}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-24 overflow-hidden rounded-[2px] bg-wine p-8 text-paper md:p-14">
          <p className="label text-sky">The full archive</p>
          <h2 className="mt-4 max-w-3xl font-display text-4xl leading-tight md:text-6xl">
            This is the shortlist. <em className="font-serif text-paper-deep">The rest lives elsewhere.</em>
          </h2>
          <div className="mt-10 flex flex-wrap gap-4">
            {site.photographySite.url ? (
              <a href={site.photographySite.url} target="_blank" rel="noopener noreferrer" className="label rounded-full bg-paper px-7 py-4 text-wine transition-colors hover:bg-sky hover:text-ink">
                Visit the photography site ↗
              </a>
            ) : (
              <span className="label rounded-full border border-paper/30 px-7 py-4 text-paper/70">Photography site — opening soon</span>
            )}
            <Link href="/contact" className="label rounded-full border border-paper/40 px-7 py-4 transition-colors hover:border-paper">
              Book a shoot
            </Link>
          </div>
        </section>
      </Container>
    </>
  );
}
