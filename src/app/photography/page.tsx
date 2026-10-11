import type { Metadata } from "next";
import Link from "next/link";
import PageHeader, { Container } from "@/components/layout/PageHeader";
import Gallery from "@/components/photography/Gallery";
import CountUp from "@/components/ui/CountUp";
import Magnetic from "@/components/ui/Magnetic";
import { getSeries } from "@/lib/photos";
import { reveal } from "@/lib/reveal";
import { site, socials } from "@/lib/site";

export const metadata: Metadata = {
  title: "Photography",
  description: "Concert, portrait, astro and event photography by Neil Jacob Santiago — Aurora Music Festival, studio sessions, Andromeda and CLSU campus life.",
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
        lead="Canon and Nikon bodies, an iPhone in ProRAW, a DJI gimbal and a studio-style backdrop. Tap any frame to see it full screen — swipe or use the arrow keys to move through."
        aside={
          <div className="space-y-5">
            <p className="font-display text-6xl leading-none">
              <CountUp value={total} />
              <span className="label ml-2 align-middle text-ink/50">frames</span>
            </p>
            {external && (
              <Magnetic>
                <a href={external} target="_blank" rel="noopener noreferrer" className="btn bg-ink py-3 text-paper hover:bg-ember">
                  {site.photographySite.url ? site.photographySite.label : "More on Instagram"} <span className="arrow">↗</span>
                </a>
              </Magnetic>
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
                  {String(i + 1).padStart(2, "0")} · {s.year} · {s.photos.length} frames
                </p>
                <h3 className="mt-3 font-display text-4xl">{s.title}</h3>
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
              <a href={site.photographySite.url} target="_blank" rel="noopener noreferrer" className="btn bg-paper text-wine hover:bg-sky hover:text-ink">
                Visit the photography site <span className="arrow">↗</span>
              </a>
            ) : (
              <span className="label rounded-full border border-paper/30 px-7 py-4 text-paper/70">Photography site — opening soon</span>
            )}
            <Link href="/contact" className="btn border border-paper/40 hover:border-paper">
              Book a shoot <span className="arrow">→</span>
            </Link>
          </div>
        </section>
      </Container>
    </>
  );
}
