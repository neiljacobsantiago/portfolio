import type { Metadata } from "next";
import Link from "next/link";
import PageHeader, { Container } from "@/components/layout/PageHeader";
import Collections from "@/components/photography/Collections";
import CountUp from "@/components/ui/CountUp";
import Magnetic from "@/components/ui/Magnetic";
import { addOns, bookingTerms, EXTRA_PERSON, PRIVATE_PEOPLE_INCLUDED, privateTerms, services } from "@/content/sessions";
import { getSeries } from "@/lib/photos";
import { reveal } from "@/lib/reveal";
import { site, socials } from "@/lib/site";

export const metadata: Metadata = {
  title: "Photography",
  description:
    "Freelance photography by Neil Jacob Santiago — school events, fashion portraits, landscapes, live OPM concerts and astrophotography. Custom private shoots from ₱1,999 an hour; sessions from ₱299.",
};

export default async function PhotographyPage() {
  const series = await getSeries();
  const featured = services.find((s) => s.custom);
  const total = series.reduce((n, s) => n + s.photos.length, 0);
  const instagram = socials.find((s) => s.name === "Instagram")?.url;
  const external = site.photographySite.url ?? instagram;

  return (
    <>
      <PageHeader
        eyebrow="Photography"
        title={<>Light, caught <em className="font-serif text-ember">in passing.</em></>}
        lead="Freelance photographer and Production Director of the ITSC Media Group. A modern editorial eye for school events, studio portraits, live OPM and the night sky — tap any frame to see it full screen."
        aside={
          <div className="space-y-5">
            <p className="font-display text-6xl leading-none">
              <CountUp value={total} />
              <span className="label ml-2 align-middle text-ink/50">frames</span>
            </p>
            <div className="flex flex-wrap gap-3">
              <Magnetic>
                <a href="#sessions" className="btn bg-ember py-3 text-paper hover:bg-ink">
                  Book a session <span className="arrow">↓</span>
                </a>
              </Magnetic>
              {external && (
                <a href={external} target="_blank" rel="noopener noreferrer" className="btn border border-ink/25 py-3 hover:border-ink">
                  {site.photographySite.url ? "Photo site" : "Instagram"} <span className="arrow">↗</span>
                </a>
              )}
            </div>
          </div>
        }
      />

      <Collections series={series} />

      <section id="sessions" aria-labelledby="sessions-title" className="scroll-mt-24 bg-wine px-5 py-20 text-paper md:px-10 md:py-28">
        <div className="mx-auto max-w-[90rem]">
          <div className="grid gap-6 md:grid-cols-12">
            <p className="label text-sky md:col-span-3">Commissions & inquiries</p>
            <div className="md:col-span-9">
              <h2 id="sessions-title" className="font-display text-[clamp(2.5rem,6vw,5rem)] leading-[1.02]">
                Book a <em className="font-serif text-paper-deep">session.</em>
              </h2>
              <p className="mt-5 max-w-2xl font-serif text-xl text-paper/80">
                Pick a service and package — the booking form fills itself in. Every request is reviewed personally within 24 hours.
              </p>
            </div>
          </div>

          {featured && (
            <article {...reveal("up")} aria-labelledby="private-title" className="mt-14 grid gap-10 rounded-[2px] bg-paper p-6 text-ink shadow-[0_40px_90px_-50px_rgb(0_0_0/0.6)] md:p-10 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <p className="label text-ember">New · Built around you</p>
                <h3 id="private-title" className="mt-3 font-display text-[clamp(2.25rem,4.5vw,3.5rem)] leading-[1.02]">
                  Custom <em className="font-serif text-ember">private</em> photoshoot
                </h3>
                <p className="mt-4 font-serif text-xl text-ink/70 italic">{featured.blurb}</p>
                <p className="label mt-8 mb-3 text-ink/50">Every private shoot includes</p>
                <ul className="space-y-2 font-serif text-lg">
                  {featured.includes?.map((i) => (
                    <li key={i} className="flex gap-3">
                      <span aria-hidden className="text-ember">✓</span>
                      {i}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="min-w-0 lg:col-span-7">
                <p className="label mb-3 text-ink/50">Choose your time</p>
                <ul className="divide-y divide-ink/10 border-y border-ink/10">
                  {featured.packages.map((p, i) => (
                    <li key={p.id}>
                      <Link href={`/contact?service=${featured.id}&package=${p.id}`} className="group press flex items-baseline justify-between gap-4 py-3.5">
                        <span className="min-w-0">
                          <span className="block font-serif text-xl transition-colors group-hover:text-ember">
                            {p.name}
                            {i === 0 && <span className="label ml-3 rounded-full bg-ember/10 px-2 py-1 align-middle text-[0.5rem] text-ember">Starts here</span>}
                          </span>
                          <span className="label text-[0.58rem] text-ink/55">{p.detail}</span>
                        </span>
                        <span className="shrink-0 font-display text-2xl">{p.price}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <p className="label mt-8 mb-3 text-ink/50">Add-ons</p>
                <ul className="grid gap-x-8 gap-y-2 font-serif text-base sm:grid-cols-2">
                  {addOns.map((a) => (
                    <li key={a.id} className="flex items-baseline justify-between gap-3 border-b border-dotted border-ink/15 pb-2">
                      <span>{a.name}</span>
                      <span className="shrink-0 font-display">{a.amount === null ? "Quote" : `+₱${a.amount.toLocaleString("en-PH")}`}</span>
                    </li>
                  ))}
                  <li className="flex items-baseline justify-between gap-3 border-b border-dotted border-ink/15 pb-2">
                    <span>Each person beyond {PRIVATE_PEOPLE_INCLUDED}</span>
                    <span className="shrink-0 font-display">+₱{EXTRA_PERSON.toLocaleString("en-PH")}</span>
                  </li>
                </ul>
                <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
                  <Link href={`/contact?service=${featured.id}&package=${featured.packages[0].id}`} className="btn bg-ember text-paper hover:bg-ink">
                    Plan your private shoot <span className="arrow">→</span>
                  </Link>
                  <Link href="/lab#quote" className="label ulink text-[0.6rem] text-ink/60 hover:text-ink">
                    Price it with add-ons
                  </Link>
                </div>
                <ul className="mt-6 space-y-1 font-serif text-sm text-ink/60 italic">
                  {privateTerms.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
            </article>
          )}

          <ul className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {services.filter((s) => !s.custom).map((s, i) => (
              <li key={s.id} {...reveal("up", (i % 3) * 80)} className="flex flex-col rounded-[2px] bg-paper/[0.06] p-6 ring-1 ring-paper/15 md:p-8">
                <h3 className="font-display text-3xl leading-tight">{s.name}</h3>
                <p className="mt-2 font-serif text-lg text-paper/70 italic">{s.blurb}</p>
                <ul className="mt-6 flex-1 divide-y divide-paper/10 border-y border-paper/10">
                  {s.packages.map((p) => (
                    <li key={p.id}>
                      <Link href={`/contact?service=${s.id}&package=${p.id}`} className="group press flex items-baseline justify-between gap-4 py-3">
                        <span>
                          <span className="block font-serif text-lg transition-colors group-hover:text-sky">{p.name}</span>
                          <span className="label text-[0.58rem] text-paper/50">{p.detail}</span>
                        </span>
                        <span className="shrink-0 font-display text-xl">{p.price}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>

          <Container className="!px-0 mt-12 grid gap-6 md:grid-cols-12 md:items-end">
            <ul className="space-y-2 font-serif text-paper/75 md:col-span-8">
              {bookingTerms.map((t) => (
                <li key={t} className="flex gap-3">
                  <span aria-hidden className="text-sky">—</span> {t}
                </li>
              ))}
            </ul>
            <div className="md:col-span-4 md:text-right">
              <Magnetic>
                <Link href="/contact?topic=photography" className="btn bg-paper text-wine hover:bg-sky hover:text-ink">
                  Start a booking <span className="arrow">→</span>
                </Link>
              </Magnetic>
            </div>
          </Container>
        </div>
      </section>
    </>
  );
}
