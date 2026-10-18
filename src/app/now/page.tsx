import type { Metadata } from "next";
import Link from "next/link";
import PageHeader, { Container } from "@/components/layout/PageHeader";
import Icon from "@/components/ui/Icon";
import { getAvailability } from "@/content/availability";
import { getNow } from "@/content/now";
import { getGitHubActivity } from "@/lib/github";
import { getWeather } from "@/lib/now";
import { reveal } from "@/lib/reveal";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Now",
  description: `What ${site.name} is focused on right now: school, the ITSC Media Group, projects in progress, what he's learning and whether he's taking bookings.`,
};

const longDate = (ymd: string) => new Intl.DateTimeFormat("en-PH", { dateStyle: "long", timeZone: site.timeZone }).format(new Date(`${ymd}T12:00:00+08:00`));

export default async function NowPage() {
  const [now, availability, weather, github] = await Promise.all([getNow(), getAvailability(), getWeather(), getGitHubActivity()]);
  const repo = github?.repos[0];

  return (
    <>
      <PageHeader
        eyebrow="Now"
        title={
          <>
            What I&apos;m doing <em className="font-serif text-ember">now.</em>
          </>
        }
        lead={now.intro}
        aside={
          <p className="label text-2xs leading-relaxed text-ink/70">
            Last updated · <time dateTime={now.updated}>{longDate(now.updated)}</time>
            <br />
            From {now.place}
          </p>
        }
      />

      <Container className="pb-24 md:pb-32">
        <div {...reveal("up")} className="grid gap-6 rounded-[2px] bg-ink p-7 text-paper md:grid-cols-12 md:items-center md:p-10">
          <div className="md:col-span-8">
            <p className="label text-2xs text-sky">Availability</p>
            <p className="mt-3 font-display text-[clamp(1.75rem,4vw,2.75rem)] leading-tight">{availability.headline}</p>
            <p className="mt-2 font-serif text-lg text-paper/70">{availability.detail}</p>
          </div>
          <div className="flex flex-wrap gap-3 md:col-span-4 md:justify-end">
            <Link href="/services" className="btn bg-paper py-3 text-ink hover:bg-ember hover:text-paper">
              Services <Icon name="arrow-right" className="arrow" />
            </Link>
            <Link href="/contact" className="btn border border-paper/30 py-3 text-paper hover:border-paper">
              Say hello
            </Link>
          </div>
        </div>

        <ol className="mt-16 md:mt-20">
          {now.entries.map((e, i) => (
            <li key={e.label} {...reveal("up", (i % 3) * 60)} className="grid gap-3 border-t border-ink/15 py-9 md:grid-cols-12 md:gap-8 md:py-12">
              <p className="label pt-1 text-ember md:col-span-3">
                <span className="mr-2 text-ink/70">{String(i + 1).padStart(2, "0")}</span>
                {e.label}
              </p>
              <div className="min-w-0 md:col-span-9">
                <h2 className="font-display text-[clamp(1.75rem,3.5vw,2.75rem)] leading-[1.08]">{e.title}</h2>
                {e.detail && <p className="mt-3 max-w-3xl font-serif text-xl leading-relaxed text-ink/75">{e.detail}</p>}
                {e.link && (
                  <Link href={e.link.href} className="label ulink mt-4 inline-flex items-center gap-1.5 text-2xs text-ink/75 hover:text-ink">
                    {e.link.label} <Icon name="arrow-right" />
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ol>

        <section aria-label="Live from San Jose City" className="grid gap-px overflow-hidden rounded-[2px] border border-ink/10 bg-ink/10 md:grid-cols-2">
          <div className="bg-sky/25 p-7 md:p-9">
            <p className="label mb-3 text-2xs text-ink/80">Outside the window · {site.location}</p>
            {weather ? (
              <p className="font-serif text-xl text-ink/80">
                <span className="mr-2 font-display text-4xl text-ink">{weather.temperature}°</span>
                {weather.sky}.
              </p>
            ) : (
              <p className="font-serif text-xl text-ink/80 italic">No reading from the weather station just now.</p>
            )}
          </div>
          <div className="min-w-0 bg-paper p-7 md:p-9">
            <p className="label mb-3 text-2xs text-ink/75">Latest code pushed</p>
            {repo ? (
              <a href={repo.url} target="_blank" rel="noopener noreferrer" className="group block min-w-0">
                <span className="font-display text-2xl break-words group-hover:text-ember">{repo.name} <Icon name="arrow-up-right" className="h-[0.7em] w-[0.7em] align-baseline" /></span>
                <span className="label mt-2 block text-3xs text-ink/70">
                  {new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: site.timeZone }).format(new Date(repo.pushedAt))}
                </span>
              </a>
            ) : (
              <a href={`https://github.com/${site.githubUser}`} target="_blank" rel="noopener noreferrer" className="font-display text-2xl break-all hover:text-ember">
                github.com/{site.githubUser} <Icon name="arrow-up-right" className="h-[0.7em] w-[0.7em] align-baseline" />
              </a>
            )}
          </div>
        </section>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-6 border-t border-ink/15 pt-8">
          <p className="max-w-xl font-serif text-lg text-ink/75 italic">
            This is a{" "}
            <a href="https://nownownow.com/about" target="_blank" rel="noopener noreferrer" className="ulink text-ink/80 hover:text-ink">
              now page
            </a>
            : a snapshot of this season, not a full history. That lives on the{" "}
            <Link href="/about" className="ulink text-ink/80 hover:text-ink">
              about page
            </Link>
            .
          </p>
          <Link href="/uses" className="label ulink inline-flex items-center gap-1.5 text-2xs text-ink/75 hover:text-ink">
            Gear & tools <Icon name="arrow-right" />
          </Link>
        </div>
      </Container>
    </>
  );
}
