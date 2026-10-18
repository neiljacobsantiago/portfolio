import CountUp from "@/components/ui/CountUp";
import { getGitHubActivity } from "@/lib/github";
import { reveal } from "@/lib/reveal";
import { site } from "@/lib/site";
import ContributionGraph from "./ContributionGraph";
import Icon from "@/components/ui/Icon";

const LANGUAGE_COLORS = ["bg-ember", "bg-sky", "bg-paper", "bg-wine", "bg-paper/40"];

const shortDate = (iso: string) => new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));

function ago(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months < 12 ? `${months} mo ago` : `${Math.floor(months / 12)} yr ago`;
}

/** A year on GitHub: contribution heatmap, streaks, languages and fresh repos. */
export default async function CommitLog() {
  // An empty calendar means GitHub didn't answer properly; show the quiet version rather than "0 contributions".
  const fetched = await getGitHubActivity();
  const data = fetched && fetched.total > 0 ? fetched : null;
  const profile = `https://github.com/${site.githubUser}`;

  return (
    <section aria-labelledby="commits-title" className="mx-auto max-w-[90rem] px-5 pb-24 md:px-10 md:pb-32">
      <div className="relative overflow-hidden rounded-[2px] bg-ink px-5 py-12 text-paper md:px-10 md:py-16 xl:px-14">
        <div aria-hidden className="pointer-events-none absolute -top-40 -right-32 h-96 w-96 rounded-full bg-[radial-gradient(closest-side,rgb(193_18_31/0.35),transparent)]" />
        <div aria-hidden className="pointer-events-none absolute -bottom-48 -left-24 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(closest-side,rgb(102_155_188/0.25),transparent)]" />

        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="label flex items-center gap-2 text-sky">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ember/60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-ember" />
              </span>
              GitHub · @{site.githubUser}
            </p>
            <h2 id="commits-title" className="mt-5 font-display text-[clamp(2.5rem,6vw,5rem)] leading-[1.02]">
              {data ? (
                <>
                  <CountUp value={data.total} /> contributions <em className="block font-serif text-sky">in the last year.</em>
                </>
              ) : (
                <>
                  The commit <em className="font-serif text-sky">log.</em>
                </>
              )}
            </h2>
          </div>
          <a href={profile} target="_blank" rel="noopener noreferrer" className="btn border border-paper/30 text-paper hover:border-paper hover:bg-paper hover:text-ink">
            Open GitHub <Icon name="arrow-up-right" className="arrow" />
          </a>
        </div>

        {data ? (
          <>
            <div className="relative mt-12 space-y-12">
              <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[2px] bg-paper/10 sm:grid-cols-3 lg:grid-cols-5">
                {[
                  { label: "Current streak", value: data.currentStreak, unit: data.currentStreak === 1 ? "day" : "days" },
                  { label: "Longest streak", value: data.longestStreak, unit: data.longestStreak === 1 ? "day" : "days" },
                  { label: "Active days", value: data.activeDays, unit: "this year" },
                  { label: "Public repos", value: data.publicRepos, unit: "and counting" },
                ].map((s, i) => (
                  <div key={s.label} {...reveal("up", i * 70)} className="group bg-ink p-5 transition-colors hover:bg-paper/[0.04] lg:p-6">
                    <dt className="label text-[0.58rem] text-paper/50">{s.label}</dt>
                    <dd className="mt-1 flex items-baseline gap-2">
                      <span className="font-display text-4xl leading-none transition-colors group-hover:text-sky xl:text-5xl">
                        <CountUp value={s.value} />
                      </span>
                      <span className="font-serif text-sm text-paper/60 italic">{s.unit}</span>
                    </dd>
                  </div>
                ))}
                {data.best && (
                  <div {...reveal("up", 280)} className="group col-span-2 bg-ink p-5 transition-colors hover:bg-paper/[0.04] lg:col-span-1 lg:p-6">
                    <dt className="label text-[0.58rem] text-paper/50">Busiest day</dt>
                    <dd className="mt-1 flex items-baseline gap-2">
                      <span className="font-display text-4xl leading-none text-ember xl:text-5xl">
                        <CountUp value={data.best.count} />
                      </span>
                      <span className="font-serif text-sm text-paper/60 italic">on {shortDate(data.best.date)}</span>
                    </dd>
                  </div>
                )}
              </dl>

              <ContributionGraph weeks={data.weeks} byWeekday={data.byWeekday} />
            </div>

            {(data.repos.length > 0 || data.languages.length > 0) && (
              <div className="relative mt-14 grid gap-10 border-t border-paper/10 pt-10 lg:grid-cols-12 lg:gap-12">
                {data.languages.length > 0 && (
                  <div className="lg:col-span-3">
                    <p className="label mb-4 text-[0.58rem] text-paper/50">Languages by repo</p>
                    <div className="flex h-2.5 overflow-hidden rounded-full">
                      {data.languages.map((l, i) => (
                        <span key={l.name} className={`${LANGUAGE_COLORS[i]} transition-[flex-grow] duration-700 hover:grow-[2]`} style={{ flexGrow: l.count }} title={l.name} />
                      ))}
                    </div>
                    <ul className="mt-4 space-y-1.5">
                      {data.languages.map((l, i) => (
                        <li key={l.name} className="flex items-center justify-between gap-3 font-serif text-base">
                          <span className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${LANGUAGE_COLORS[i]}`} />
                            {l.name}
                          </span>
                          <span className="font-mono text-xs text-paper/50">{l.count}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <ul className="grid gap-3 sm:grid-cols-2 lg:col-span-9 xl:grid-cols-4">
                  {data.repos.map((r, i) => (
                    <li key={r.name} {...reveal("up", i * 80)}>
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group press flex h-full flex-col justify-between gap-6 rounded-[2px] bg-paper/[0.06] p-5 ring-1 ring-paper/10 transition-colors hover:bg-paper hover:text-ink"
                      >
                        <div>
                          <p className="label text-[0.55rem] text-paper/45 transition-colors group-hover:text-ember">Pushed {ago(r.pushedAt)}</p>
                          <p className="mt-2 font-display text-2xl leading-tight break-words">{r.name}</p>
                          {r.description && <p className="mt-2 line-clamp-3 font-serif text-base text-paper/65 transition-colors group-hover:text-ink/70">{r.description}</p>}
                        </div>
                        <p className="flex items-center justify-between font-mono text-xs text-paper/55 transition-colors group-hover:text-ink/60">
                          <span>{r.language ?? "—"}</span>
                          {r.stars > 0 ? (
                            <span className="inline-flex items-center gap-1">
                              <Icon name="star" title="Stars" /> {r.stars}
                            </span>
                          ) : (
                            <Icon name="arrow-up-right" />
                          )}
                        </p>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <p className="relative mt-10 max-w-xl font-serif text-xl text-paper/75 italic">
            GitHub is taking a breather — the live contribution graph will be back shortly. Meanwhile, everything is on{" "}
            <a href={profile} target="_blank" rel="noopener noreferrer" className="ulink text-paper not-italic">
              github.com/{site.githubUser}
            </a>
            .
          </p>
        )}
      </div>
    </section>
  );
}
