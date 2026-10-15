import type { Metadata } from "next";
import Link from "next/link";
import ResumeActions from "@/components/resume/ResumeActions";
import { certificates, education, inProgress, interests, organizations, toolkit } from "@/content/about";
import { featuredProjects, projectBySlug } from "@/content/work";
import { site, siteUrl, socials } from "@/lib/site";

export const metadata: Metadata = {
  title: "Résumé",
  description: `${site.name}'s résumé: education, leadership, certificates, skills and selected projects in networks, web systems and photography.`,
};

// Everything here comes from the same content as the rest of the site, so the
// résumé never drifts out of date.
const MORE = ["cyber-awareness-series", "intrusion-auditing", "memory-allocation-simulator", "img-stratcom"];

function Block({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={className}>
      <h2 className="label mb-4 flex items-center gap-3 text-[0.62rem] text-ember after:h-px after:flex-1 after:bg-ink/15">{title}</h2>
      {children}
    </section>
  );
}

export default function ResumePage() {
  const work = [...featuredProjects(), ...MORE.map(projectBySlug)].filter((p, i, all): p is NonNullable<typeof p> => !!p && all.indexOf(p) === i).slice(0, 7);
  const leadership = organizations.filter((o) => o.role !== "Student");
  const host = new URL(siteUrl()).host;
  const updated = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: site.timeZone });
  const github = socials.find((s) => s.name === "GitHub")?.url;
  const instagram = socials.find((s) => s.name === "Instagram")?.url;

  return (
    <div className="px-5 pt-28 pb-24 md:px-10 md:pt-40 print:p-0">
      <div className="mx-auto max-w-[58rem]">
        <div className="animate-rise-in mb-6 flex flex-wrap items-end justify-between gap-4 print:hidden">
          <div>
            <p className="label text-ember">Résumé</p>
            <p className="mt-2 font-serif text-ink/60 italic">Updated {updated} · ready to print or save as PDF</p>
          </div>
          <ResumeActions />
        </div>

        <article
          className="animate-rise-in rounded-[3px] bg-[#fffaf1] p-6 text-ink shadow-[0_50px_100px_-50px_rgb(0_48_73/0.45)] ring-1 ring-ink/10 [print-color-adjust:exact] sm:p-10 md:p-14 print:rounded-none print:bg-white print:p-0 print:shadow-none print:ring-0"
          style={{ animationDelay: "120ms" }}
        >
          <header className="grid gap-6 border-b-2 border-ink pb-8 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <h1 className="font-display text-[clamp(2.5rem,6.5vw,4.4rem)] leading-[0.92]">{site.name}</h1>
              <p className="mt-3 font-serif text-xl text-ink/75 italic">Networks, web systems & photography</p>
            </div>
            <ul className="label space-y-1.5 text-[0.6rem] text-ink/70 md:text-right">
              <li>
                {site.location}, {site.country}
              </li>
              <li>
                <a href={`${siteUrl()}/contact`} className="ulink">{host}/contact</a>
              </li>
              {github && (
                <li>
                  <a href={github} className="ulink">{github.replace("https://", "")}</a>
                </li>
              )}
              {instagram && (
                <li>
                  <a href={instagram} className="ulink">{instagram.replace("https://", "")}</a>
                </li>
              )}
            </ul>
          </header>

          <p className="mt-8 max-w-3xl font-serif text-[1.15rem] leading-relaxed text-ink/85">
            Third-year BS Information Technology student at Central Luzon State University, majoring in Network Systems & Infrastructure Engineering. Designs networks, builds web systems
            and leads photo and video coverage as Production Director of the ITSC Media Group: comfortable from the network diagram to the interface to the camera.
          </p>

          <div className="mt-10 grid gap-10 md:grid-cols-[1.55fr_1fr] md:gap-12 print:grid-cols-[1.55fr_1fr]">
            <div className="space-y-10">
              <Block title="Selected projects">
                <ul className="space-y-5">
                  {work.map((p) => (
                    <li key={p.slug} className="break-inside-avoid">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <Link href={`/work/${p.slug}`} className="ulink font-display text-xl leading-tight">{p.title}</Link>
                        <span className="label text-[0.52rem] text-ink/50">{p.status}</span>
                      </div>
                      <p className="label mt-1 text-[0.55rem] text-ink/55">{p.context} · {p.role}</p>
                      <p className="mt-1.5 font-serif leading-snug text-ink/80">{p.plain}</p>
                    </li>
                  ))}
                </ul>
              </Block>

              <Block title="Leadership">
                <ul className="space-y-4">
                  {leadership.map((o) => (
                    <li key={o.short} className="break-inside-avoid">
                      <p className="font-display text-lg leading-tight">{o.name}</p>
                      <p className="label mt-1 text-[0.55rem] text-ink/55">{o.role}</p>
                      <p className="mt-1 font-serif leading-snug text-ink/75">{o.detail}</p>
                    </li>
                  ))}
                </ul>
              </Block>

              <Block title="Photography">
                <p className="font-serif leading-snug text-ink/80">
                  Freelance and organisational photographer: school events, fashion and studio portraits, live concerts (Aurora Music Festival 2026, shot from the front barrier in
                  manual) and astrophotography. Custom private shoots, graduation, event coverage and headshots.
                </p>
              </Block>
            </div>

            <aside className="space-y-10">
              <Block title="Education">
                <ul className="space-y-4">
                  {education.map((e) => (
                    <li key={e.school} className="break-inside-avoid">
                      <p className="label text-[0.52rem] text-ink/50">{e.years}</p>
                      <p className="mt-1 font-display text-lg leading-tight">{e.school}</p>
                      <p className="font-serif text-ink/75 italic">{e.level}</p>
                    </li>
                  ))}
                </ul>
              </Block>

              <Block title="Certificates">
                <ul className="space-y-3">
                  {certificates.map((c) => (
                    <li key={c.title} className="break-inside-avoid">
                      <p className="font-serif leading-snug font-medium">{c.title}</p>
                      <p className="label mt-0.5 text-[0.52rem] text-ink/55">
                        {c.issuer} · {c.date}
                        {c.verify && (
                          <>
                            {" · "}
                            <a href={c.verify} target="_blank" rel="noopener noreferrer" className="ulink text-ember">Verify</a>
                          </>
                        )}
                      </p>
                    </li>
                  ))}
                  {inProgress.map((c) => (
                    <li key={c.title}>
                      <p className="font-serif leading-snug text-ink/70 italic">{c.title} · in progress</p>
                    </li>
                  ))}
                </ul>
              </Block>

              <Block title="Skills & tools">
                <dl className="space-y-3">
                  {toolkit.map((g) => (
                    <div key={g.group} className="break-inside-avoid">
                      <dt className="label text-[0.52rem] text-ink/50">{g.group}</dt>
                      <dd className="mt-0.5 font-serif leading-snug text-ink/80">{g.tools.map((t) => t.name).join(" · ")}</dd>
                    </div>
                  ))}
                </dl>
              </Block>

              <Block title="Outside work">
                <p className="font-serif leading-snug text-ink/75">{interests.map((i) => i.title).join(" · ")}</p>
              </Block>
            </aside>
          </div>

          <p className="label mt-12 border-t border-ink/15 pt-5 text-[0.5rem] text-ink/45">
            Full projects, photographs and working tools at {host}
          </p>
        </article>
      </div>
    </div>
  );
}
