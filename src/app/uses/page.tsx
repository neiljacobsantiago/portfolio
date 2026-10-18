import type { Metadata } from "next";
import Link from "next/link";
import PageHeader, { Container } from "@/components/layout/PageHeader";
import Section, { JumpLinks } from "@/components/layout/Section";
import { getUses } from "@/content/uses";
import { reveal } from "@/lib/reveal";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Uses",
  description: `The cameras, editing software, design and code tools ${site.name} works with, plus a colophon on how this website is built.`,
};

export default async function UsesPage() {
  const { groups, colophon } = await getUses();

  return (
    <>
      <PageHeader
        eyebrow="Uses"
        title={
          <>
            The kit, <em className="font-serif text-ember">and the code.</em>
          </>
        }
        lead="What's in the bag, what the photos are finished in, what the systems are built with, and how this site works."
      />

      <Container className="pb-24 md:pb-32">
        <JumpLinks items={[...groups.map((g) => ({ label: g.title, href: `#${g.id}` })), { label: "Colophon", href: "#colophon" }]} />

        {groups.map((g, gi) => (
          <Section key={g.id} id={g.id} label={String(gi + 1).padStart(2, "0")} title={g.title} intro={g.blurb} className={gi === 0 ? "mt-12 md:mt-16" : undefined}>
            <ul className="divide-y divide-ink/10 border-y border-ink/10 md:ml-[25%]">
              {g.items.map((it, i) => (
                <li key={it.name} {...reveal("up", (i % 4) * 50)} className="grid gap-2 py-5 sm:grid-cols-[minmax(0,15rem)_1fr] sm:gap-8">
                  <h3 className="font-display text-xl leading-snug">{it.name}</h3>
                  <div className="min-w-0">
                    <p className="font-serif text-lg leading-snug text-ink/75">{it.note}</p>
                    {it.seenIn && (
                      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="label text-3xs text-ink/70">Seen in</span>
                        {it.seenIn.map((s) => (
                          <Link key={s.href} href={s.href} className="ulink font-serif text-base text-ember hover:text-ink">
                            {s.label}
                          </Link>
                        ))}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        ))}

        <section id="colophon" aria-labelledby="colophon-title" className="mt-24 scroll-mt-28 rounded-[2px] bg-ink p-7 text-paper md:mt-32 md:p-14">
          <div className="grid gap-4 md:grid-cols-12">
            <p className="label text-sky md:col-span-3">Colophon</p>
            <div className="md:col-span-9">
              <h2 id="colophon-title" className="font-display text-[clamp(2.25rem,5vw,4rem)] leading-none">
                How this site <em className="font-serif text-sky">is built.</em>
              </h2>
              <p className="mt-5 max-w-2xl font-serif text-xl leading-relaxed text-paper/75">
                Designed and built by {site.firstName}. Pages are rendered ahead of time and only the interactive parts ship JavaScript, so it stays quick on a budget Android over mobile data.
              </p>
            </div>
          </div>
          <dl className="mt-10 grid gap-x-10 sm:grid-cols-2 md:ml-[25%]">
            {colophon.map((c) => (
              <div key={c.name} className="border-t border-paper/15 py-4">
                <dt className="font-display text-lg">{c.name}</dt>
                <dd className="mt-1 font-serif text-base leading-snug text-paper/75">{c.role}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-10 font-serif text-paper/75 md:ml-[25%]">
            Palette: wine, ember, paper, ink and sky. Type: Gloock, Newsreader and IBM Plex Mono.{" "}
            <Link href="/accessibility" className="ulink text-paper/80 hover:text-paper">
              Accessibility notes
            </Link>{" "}
            ·{" "}
            <Link href="/terminal" className="ulink text-paper/80 hover:text-paper">
              The terminal
            </Link>
          </p>
        </section>
      </Container>
    </>
  );
}
