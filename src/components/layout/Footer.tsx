import Link from "next/link";
import { mainNav, site, socials } from "@/lib/site";

export default function Footer() {
  return (
    <footer className="relative overflow-hidden bg-ink px-5 pt-20 pb-[max(2rem,env(safe-area-inset-bottom))] text-paper md:px-10 md:pt-28">
      <div className="mx-auto max-w-[90rem]">
        <p className="label text-sky">Have something in mind?</p>
        <Link href="/contact" className="group mt-4 inline-block" data-cursor="Write">
          <span className="font-display text-[clamp(3.25rem,13vw,11rem)] leading-[0.9]">
            Let&apos;s <span className="font-serif italic text-ember transition-colors group-hover:text-sky">talk.</span>
          </span>
        </Link>

        <div className="mt-16 grid gap-10 border-t border-paper/15 pt-10 sm:grid-cols-2 md:mt-24 md:grid-cols-4">
          <div className="md:col-span-2">
            <p className="max-w-sm font-serif text-lg leading-relaxed text-paper/80">
              {site.name} — networks, security and photography from {site.location}, {site.country}.
            </p>
            <p className="label mt-4 text-paper/40">{site.coordinates}</p>
          </div>

          <nav aria-label="Footer">
            <p className="label mb-4 text-paper/40">Pages</p>
            <ul className="space-y-2 font-serif text-lg">
              {mainNav.map((r) => (
                <li key={r.href}>
                  <Link href={r.href} className="transition-colors hover:text-sky">{r.label}</Link>
                </li>
              ))}
              {site.photographySite.url && (
                <li>
                  <a href={site.photographySite.url} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-sky">
                    Photo archive ↗
                  </a>
                </li>
              )}
            </ul>
          </nav>

          <div>
            <p className="label mb-4 text-paper/40">Elsewhere</p>
            <ul className="space-y-2 font-serif text-lg">
              {socials.map((s) => (
                <li key={s.name}>
                  {s.url ? (
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-sky">
                      {s.name} ↗
                    </a>
                  ) : (
                    <span className="text-paper/35">{s.name} <span className="label text-[0.6rem]">soon</span></span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-3 border-t border-paper/15 pt-6 text-paper/45 md:flex-row md:items-center md:justify-between">
          <span className="label">© {new Date().getFullYear()} {site.name}</span>
          <span className="font-serif text-sm italic">Set in Gloock, Newsreader &amp; Courier Prime.</span>
          <Link href="/terminal" className="label transition-colors hover:text-sky">
            root@neil:~$ <span className="animate-blink">_</span>
          </Link>
        </div>
      </div>
    </footer>
  );
}
