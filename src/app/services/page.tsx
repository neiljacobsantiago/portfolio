import type { Metadata } from "next";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import AvailabilityBadge from "@/components/layout/AvailabilityBadge";
import PageHeader, { Container } from "@/components/layout/PageHeader";
import Section, { JumpLinks } from "@/components/layout/Section";
import KindWords from "@/components/testimonials/KindWords";
import Magnetic from "@/components/ui/Magnetic";
import { getAvailability } from "@/content/availability";
import { contactHref, getFaqs, getOffers, getPrinciples, getProcess, type Offer } from "@/content/offers";
import { reveal } from "@/lib/reveal";
import { site, siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Services",
  description: `Work with ${site.name}: websites and web systems, network design and setup, security awareness and basic audits, portrait sessions, event and concert coverage, and video. Based in ${site.location}, available remotely.`,
};

function OfferBlock({ offer, index }: { offer: Offer; index: number }) {
  return (
    <article id={offer.id} aria-labelledby={`${offer.id}-title`} className="grid scroll-mt-28 gap-10 border-t border-ink/15 py-12 md:grid-cols-12 md:py-16">
      <div {...reveal("up")} className="min-w-0 md:col-span-5">
        <p className="label text-[0.62rem] text-ember">{String(index + 1).padStart(2, "0")}</p>
        <h3 id={`${offer.id}-title`} className="mt-3 font-display text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.02]">
          {offer.title}
        </h3>
        <p className="mt-4 font-serif text-xl leading-relaxed text-ink/80">{offer.pitch}</p>
        <p className="mt-4 font-serif text-lg text-ink/60 italic">Usually for {offer.forWho.charAt(0).toLowerCase() + offer.forWho.slice(1)}</p>
        <dl className="mt-8 grid gap-6 sm:grid-cols-2">
          <div>
            <dt className="label text-[0.58rem] text-ink/45">Price</dt>
            <dd className="mt-2 font-display text-2xl">{offer.price.label}</dd>
            {offer.price.note && <dd className="font-serif text-base text-ink/60 italic">{offer.price.note}</dd>}
          </div>
          <div>
            <dt className="label text-[0.58rem] text-ink/45">Typical timeline</dt>
            <dd className="mt-2 font-serif text-lg leading-snug">{offer.timeline}</dd>
          </div>
        </dl>
        {offer.partners && (
          <p className="mt-6 border-l-2 border-sky pl-4 font-serif text-base leading-snug text-ink/75">
            <span className="label mb-1 block text-[0.62rem] text-ink/60">Outside partners</span>
            {offer.partners}
          </p>
        )}
      </div>

      <div {...reveal("up", 100)} className="min-w-0 md:col-span-6 md:col-start-7">
        <p className="label text-[0.58rem] text-ink/45">What you get</p>
        <ul className="mt-4 divide-y divide-ink/10 border-y border-ink/10">
          {offer.deliverables.map((d) => (
            <li key={d} className="flex gap-4 py-3 font-serif text-lg leading-snug">
              <Icon name="check" className="mt-[0.2em] text-ember" />
              {d}
            </li>
          ))}
        </ul>

        <p className="label mt-8 text-[0.58rem] text-ink/45">See it in the work</p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {offer.proof.map((p) => (
            <li key={p.href}>
              <Link href={p.href} className="press inline-flex rounded-full border border-ink/15 bg-paper/60 px-3.5 py-1.5 font-serif text-base hover:border-ember hover:text-ember">
                {p.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href={contactHref(offer.topic)} className="btn bg-ink py-3.5 text-paper hover:bg-ember">
            {offer.cta} <Icon name="arrow-right" className="arrow" />
          </Link>
          {offer.packagesHref && (
            <Link href={offer.packagesHref} className="label ulink px-2 py-3 text-[0.62rem] text-ink/70 hover:text-ink">
              Packages & prices <Icon name="arrow-right" />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

/** Lets search engines read the offers and FAQ (our own static data). */
function StructuredData({ offers, faqs }: { offers: Offer[]; faqs: { q: string; a: string }[] }) {
  const url = siteUrl();
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      ...offers.map((o) => ({
        "@type": "Service",
        "@id": `${url}/services#${o.id}`,
        name: o.title,
        description: o.pitch,
        provider: { "@id": `${url}/#neil` },
        areaServed: { "@type": "Country", name: site.country },
      })),
      {
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      },
    ],
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export default async function ServicesPage() {
  const [offers, steps, principles, faqs, availability] = await Promise.all([getOffers(), getProcess(), getPrinciples(), getFaqs(), getAvailability()]);

  return (
    <>
      <StructuredData offers={offers} faqs={faqs} />
      <PageHeader
        eyebrow="Work with me"
        title={
          <>
            Built right, <em className="font-serif text-ember">shot right.</em>
          </>
        }
        lead="Websites, networks, security, photos and video. Planned before it starts, explained in plain language, and handed over finished."
        aside={
          <div className="space-y-4">
            <AvailabilityBadge availability={availability} tone="ink" />
            <p className="font-serif text-lg text-ink/70">
              Pricing follows the work: photo packages are fixed, everything else is quoted to its scope. Based in {site.location}; web work anywhere.
            </p>
          </div>
        }
      />

      <Container className="pb-24 md:pb-32">
        <JumpLinks items={[...offers.map((o) => ({ label: o.short, href: `#${o.id}` })), { label: "Process", href: "#process" }, { label: "FAQ", href: "#faq" }]} />

        <section aria-label="Services" className="mt-12">
          {offers.map((o, i) => (
            <OfferBlock key={o.id} offer={o} index={i} />
          ))}
        </section>

        <Section id="process" label="Process" title={<>Five steps, <em className="font-serif text-ember">no surprises.</em></>} intro="The same rhythm for a website, a network or a shoot. You always know which step we're on and what comes next.">
          <ol className="grid gap-px overflow-hidden rounded-[2px] border border-ink/10 bg-ink/10 md:grid-cols-5">
            {steps.map((s, i) => (
              <li key={s.title} {...reveal("up", i * 80)} className="flex flex-col bg-paper p-6 md:p-7">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ember font-display text-lg text-paper">{i + 1}</span>
                <h3 className="mt-5 font-display text-2xl leading-tight">{s.title}</h3>
                <p className="mt-3 font-serif text-lg leading-snug text-ink/80">{s.detail}</p>
                <p className="mt-auto pt-5 font-serif text-base leading-snug text-ink/55 italic">
                  <span className="label mr-1.5 align-middle text-[0.52rem] text-ember not-italic">Shoots</span>
                  {s.shoot}
                </p>
              </li>
            ))}
          </ol>
        </Section>

        <section aria-labelledby="principles-title" className="mt-24 rounded-[2px] bg-wine p-7 text-paper md:mt-32 md:p-14">
          <div className="grid gap-4 md:grid-cols-12">
            <p className="label text-paper/60 md:col-span-3">How I work</p>
            <h2 id="principles-title" className="font-display text-[clamp(2.25rem,5vw,4rem)] leading-none md:col-span-9">
              Five things <em className="font-serif text-sky">I won&apos;t skip.</em>
            </h2>
          </div>
          <ul className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-5">
            {principles.map((p, i) => (
              <li key={p.title} {...reveal("up", i * 70)} className="border-t border-paper/20 pt-5">
                <h3 className="font-display text-xl leading-snug">{p.title}</h3>
                <p className="mt-2 font-serif text-lg leading-snug text-paper/75">{p.detail}</p>
              </li>
            ))}
          </ul>
        </section>

        <KindWords className="mt-24 border-t border-ink/15 pt-12 md:mt-32 md:pt-14" />

        <Section id="faq" label="FAQ" title={<>Good <em className="font-serif text-ember">questions.</em></>}>
          <div className="md:ml-[25%]">
            {faqs.map((f) => (
              <details key={f.q} className="group border-b border-ink/15 first:border-t [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 font-display text-xl leading-snug transition-colors hover:text-ember md:text-2xl">
                  {f.q}
                  <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-ink/20 font-serif text-xl transition-transform duration-500 ease-[var(--ease-spring)] group-open:rotate-45">
                    +
                  </span>
                </summary>
                <div className="max-w-2xl pb-6 font-serif text-lg leading-relaxed text-ink/75">
                  <p>{f.a}</p>
                  {f.link && (
                    <Link href={f.link.href} className="label ulink mt-3 inline-block text-[0.62rem] text-ember">
                      {f.link.label} →
                    </Link>
                  )}
                </div>
              </details>
            ))}
          </div>
        </Section>

        <section className="mt-24 grid items-end gap-8 rounded-[2px] bg-sky/30 p-7 md:mt-32 md:grid-cols-12 md:p-14">
          <div className="md:col-span-8">
            <h2 className="font-display text-[clamp(2.25rem,5vw,4rem)] leading-none">
              Not sure which <em className="font-serif text-ember">one fits?</em>
            </h2>
            <p className="mt-5 max-w-xl font-serif text-xl text-ink/80">Tell me what you&apos;re trying to do. I&apos;ll suggest the simplest way there, even if it isn&apos;t me.</p>
          </div>
          <div className="md:col-span-4 md:text-right">
            <Magnetic>
              <Link href={contactHref("other")} className="btn bg-ink text-paper hover:bg-ember">
                Start a conversation <span className="arrow">→</span>
              </Link>
            </Magnetic>
          </div>
        </section>
      </Container>
    </>
  );
}
