import Link from "next/link";
import { getAvailability } from "@/content/availability";
import { seriesList } from "@/content/series";
import { featuredProjects } from "@/content/work";
import { legalRoutes, mainNav, moreRoutes, site, socials } from "@/lib/site";
import AvailabilityBadge from "./AvailabilityBadge";
import BackToTop from "./BackToTop";

function Column({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="label mb-4 text-paper/40">{title}</p>
      <ul className="space-y-2 font-serif text-lg">{children}</ul>
    </div>
  );
}

const item = "ulink transition-colors hover:text-sky";

export default async function Footer() {
  const year = new Date().getFullYear();
  const availability = await getAvailability();
  return (
    <footer className="relative overflow-hidden bg-ink px-5 pt-20 pb-[max(2rem,env(safe-area-inset-bottom))] text-paper md:px-10 md:pt-28">
      <div className="mx-auto max-w-[90rem]">
        <p className="label text-sky">Have something in mind?</p>
        <Link href="/contact" className="group mt-4 inline-block" aria-label="Let's talk — go to the contact page">
          <span aria-hidden className="flex font-display text-[clamp(3.25rem,13vw,11rem)] leading-[0.9]">
            {"Let's".split("").map((ch, i) => (
              <span key={i} className="inline-block transition-transform duration-500 ease-[var(--ease-spring)] group-hover:-translate-y-[0.08em]" style={{ transitionDelay: `${i * 30}ms` }}>
                {ch}
              </span>
            ))}
            <span className="ml-[0.25em] font-serif italic text-ember transition-[color,transform] duration-500 ease-[var(--ease-spring)] group-hover:translate-x-2 group-hover:text-sky">talk.</span>
          </span>
        </Link>

        <div className="mt-16 grid gap-10 border-t border-paper/15 pt-10 sm:grid-cols-2 md:mt-24 lg:grid-cols-12">
          <div className="sm:col-span-2 lg:col-span-4">
            <p className="max-w-sm font-serif text-lg leading-relaxed text-paper/80">
              {site.name} — networks, web systems and photography from {site.location}, {site.country}.
            </p>
            <AvailabilityBadge availability={availability} className="mt-5 -ml-1" />
            <Link href="/contact" className="label mt-6 inline-flex rounded-full border border-paper/25 px-4 py-2.5 text-[0.6rem] transition-colors hover:border-paper hover:bg-paper hover:text-ink">
              Start a conversation →
            </Link>
            <p className="label mt-6 text-paper/40">{site.coordinates}</p>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-10 sm:col-span-2 sm:grid-cols-3 lg:col-span-8 lg:grid-cols-5">
            <div>
              <Column title="Explore">
                {[{ label: "Home", href: "/" }, ...mainNav, { label: "Résumé", href: "/resume" }].map((r) => (
                  <li key={r.href}>
                    <Link href={r.href} className={item}>{r.label}</Link>
                  </li>
                ))}
              </Column>
            </div>
            <div>
              <Column title="Work with me">
                {moreRoutes.map((r) => (
                  <li key={r.href}>
                    <Link href={r.href} className={item}>{r.label}</Link>
                  </li>
                ))}
                <li>
                  <Link href="/uses#colophon" className={item}>Colophon</Link>
                </li>
              </Column>
            </div>
            <div>
              <Column title="Selected work">
                {featuredProjects().map((p) => (
                  <li key={p.slug}>
                    <Link href={`/work/${p.slug}`} className={item}>{p.title}</Link>
                  </li>
                ))}
                <li>
                  <Link href="/work" className={`${item} text-paper/60`}>All projects →</Link>
                </li>
              </Column>
            </div>
            <div>
              <Column title="Photography">
                {seriesList.map((s) => (
                  <li key={s.slug}>
                    <Link href={`/photography#${s.slug}`} className={item}>{s.title}</Link>
                  </li>
                ))}
                {site.photographySite.url && (
                  <li>
                    <a href={site.photographySite.url} target="_blank" rel="noopener noreferrer" className={item}>Photo archive ↗</a>
                  </li>
                )}
              </Column>
            </div>
            <div>
              <Column title="Elsewhere">
                {socials.map((s) => (
                  <li key={s.name}>
                    {s.url ? (
                      <a href={s.url} target="_blank" rel="noopener noreferrer me" className={item}>
                        {s.name} ↗
                      </a>
                    ) : (
                      <span className="text-paper/35">
                        {s.name} <span className="label text-[0.6rem]">soon</span>
                      </span>
                    )}
                  </li>
                ))}
              </Column>
            </div>
          </nav>
        </div>

        <div className="mt-16 grid gap-6 border-t border-paper/15 pt-6 text-paper/50 md:grid-cols-12 md:items-center">
          <div className="space-y-1 md:col-span-5">
            <p className="label">© {year} {site.name}. All rights reserved.</p>
            <p className="font-serif text-sm italic">Photographs may not be reused without permission.</p>
          </div>
          <nav aria-label="Legal" className="flex flex-wrap gap-x-5 gap-y-2 md:col-span-4">
            {legalRoutes.map((r) => (
              <Link key={r.href} href={r.href} className="label transition-colors hover:text-sky">
                {r.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center justify-between gap-6 md:col-span-3 md:justify-end">
            <BackToTop />
            <Link href="/terminal" className="label transition-colors hover:text-sky">
              root@neil:~$ <span className="animate-blink">_</span>
            </Link>
          </div>
        </div>
        <p className="mt-6 font-serif text-sm text-paper/35 italic">Designed and built by {site.firstName} with Next.js · Set in Gloock, Newsreader &amp; Courier Prime · Tool icons by{" "}
          <a href="https://icons8.com" target="_blank" rel="noopener noreferrer" className="underline decoration-paper/20 underline-offset-2 hover:text-paper/70">
            Icons8
          </a>{" "}
          · Hosted on Vercel.
          <span className="hidden pointer-fine:inline">
            {" "}
            · Press <kbd className="rounded bg-paper/10 px-1.5 font-mono text-[0.75rem] not-italic">?</kbd> for keyboard shortcuts.
          </span>
        </p>
      </div>
    </footer>
  );
}
