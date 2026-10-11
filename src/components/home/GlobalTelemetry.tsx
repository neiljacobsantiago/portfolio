import { Activity, BadgeCheck, BookOpen, CloudLightning, Cpu, GitCommit, GitPullRequest, Link as LinkIcon, Star, Terminal } from "lucide-react";
import { reveal } from "@/lib/reveal";
import { site, socials } from "@/lib/site";
import { getContributions, getGithubProfile, getRecentRepos, getWeather, type ContributionDay } from "@/lib/telemetry";
import VisitorTrace from "./VisitorTrace";

const LEVEL_CLASS = ["bg-black/40 border border-butter/5", "bg-[#0e4429]", "bg-[#006d32]", "bg-[#26a641]", "bg-[#39d353]"];

export default async function GlobalTelemetry() {
  const [contributions, profile, repos, weather] = await Promise.all([getContributions(), getGithubProfile(), getRecentRepos(), getWeather()]);
  const githubUrl = `https://github.com/${site.githubUser}`;

  return (
    <section id="telemetry" aria-labelledby="telemetry-title" className="relative z-10 w-full border-y border-butter/10 bg-marine px-4 py-20 sm:px-6 md:px-16 md:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex items-center gap-4 md:mb-16">
          <Activity className="h-7 w-7 text-accentRed md:h-8 md:w-8" />
          <h2 id="telemetry-title" className="font-display text-3xl font-black tracking-tight uppercase sm:text-4xl md:text-6xl">
            Global Telemetry
          </h2>
        </div>

        <div {...reveal()} className="mb-8 w-full border border-butter/20 bg-black/40 p-5 sm:p-6 md:p-8">
          <h3 className="mb-6 flex flex-wrap items-center gap-2 border-b border-butter/10 pb-4 font-mono text-xs tracking-widest text-accentRed uppercase">
            <Terminal className="h-4 w-4" /> 365-Day Contribution Matrix
            {contributions && <span className="ml-auto text-butter/60">{contributions.total} contributions</span>}
          </h3>

          {contributions ? (
            <ContributionMatrix weeks={contributions.weeks} />
          ) : (
            <p className="mb-8 font-mono text-xs opacity-60">
              Matrix uplink offline.{" "}
              <a href={githubUrl} target="_blank" rel="noopener noreferrer" className="interactive text-accentRed hover:underline">
                View activity on GitHub ↗
              </a>
            </p>
          )}

          <div className="grid grid-cols-1 gap-8 border-t border-butter/10 pt-8 md:grid-cols-2">
            <div>
              <h4 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-butter uppercase">
                <BookOpen className="h-4 w-4" /> Recently Pushed
              </h4>
              {repos.length > 0 ? (
                <ul className="space-y-3 font-mono text-xs">
                  {repos.map((repo) => (
                    <li key={repo.id} className="flex items-center justify-between gap-4">
                      <a href={repo.html_url} target="_blank" rel="noopener noreferrer" className="interactive min-w-0 truncate text-accentRed transition-colors hover:text-butter">
                        {repo.full_name}
                      </a>
                      <span className="flex shrink-0 items-center gap-3 opacity-60">
                        {repo.language && <span>{repo.language}</span>}
                        <span className="flex items-center gap-1"><Star className="h-3 w-3" /> {repo.stargazers_count}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <a href={`${githubUrl}?tab=repositories`} target="_blank" rel="noopener noreferrer" className="interactive font-mono text-xs text-accentRed hover:underline">
                  Browse repositories on GitHub ↗
                </a>
              )}
              {profile && (
                <p className="mt-4 border-t border-butter/5 pt-3 font-mono text-xs text-butter/50">
                  {profile.publicRepos} public repositories · {profile.followers} followers
                </p>
              )}
            </div>

            <div className="flex flex-col justify-center gap-6">
              <Meter icon={<GitCommit className="h-4 w-4 text-accentRed" />} label="Commits" value={97} tone="red" />
              <Meter icon={<GitPullRequest className="h-4 w-4 text-butter" />} label="Pull Requests" value={3} tone="butter" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:col-span-8">
            {socials.map((social, i) => {
              const body = (
                <>
                  <div>
                    <p className="flex items-center gap-2 font-display text-sm font-bold uppercase transition-colors group-hover:text-accentRed">
                      {social.name} {social.verified && <BadgeCheck className="h-3 w-3 text-green-500" aria-label="verified" />}
                    </p>
                    <p className="mt-1 font-mono text-[9px] tracking-widest uppercase opacity-50">{social.url ? social.label : "Endpoint pending"}</p>
                  </div>
                  <LinkIcon className="h-4 w-4 opacity-30 transition-all group-hover:text-accentRed group-hover:opacity-100" />
                </>
              );
              const cls = "group flex items-center justify-between border border-butter/10 bg-black/40 p-4";
              return (
                <li key={social.name} {...reveal("scale", i * 50)}>
                  {social.url ? (
                    <a href={social.url} target="_blank" rel="noopener noreferrer" className={`${cls} interactive transition-colors hover:border-butter/50 hover:bg-butter/10`}>
                      {body}
                    </a>
                  ) : (
                    <div className={`${cls} opacity-50`}>{body}</div>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="flex flex-col gap-6 lg:col-span-4">
            <div {...reveal("right")} className="group relative flex-1 overflow-hidden border border-butter/20 bg-black/40 p-6">
              <CloudLightning className="absolute top-2 right-2 h-24 w-24 text-butter opacity-10 transition-opacity group-hover:opacity-20" aria-hidden />
              <h3 className="mb-4 flex items-center gap-2 font-mono text-xs tracking-widest text-accentRed uppercase">
                <Cpu className="h-4 w-4" /> Host Environment
              </h3>
              <p className="mb-1 font-display text-2xl font-bold uppercase">San Jose City, PH</p>
              <p className="mb-4 border-b border-butter/10 pb-4 font-sans text-sm opacity-70">Central Luzon Infrastructure</p>
              {weather ? (
                <div className="grid grid-cols-2 gap-4 font-mono">
                  <div>
                    <span className="mb-1 block text-[10px] tracking-wider uppercase opacity-50">Thermal</span>
                    <span className="text-2xl font-bold text-butter">{Math.round(weather.temperature)}°C</span>
                  </div>
                  <div>
                    <span className="mb-1 block text-[10px] tracking-wider uppercase opacity-50">Velocity</span>
                    <span className="text-2xl font-bold text-butter">
                      {Math.round(weather.windspeed)} <span className="text-xs">km/h</span>
                    </span>
                  </div>
                </div>
              ) : (
                <p className="font-mono text-sm opacity-50">Weather uplink offline.</p>
              )}
            </div>
            <VisitorTrace />
          </div>
        </div>
      </div>
    </section>
  );
}

function ContributionMatrix({ weeks }: { weeks: (ContributionDay | null)[][] }) {
  return (
    // Right-aligned scroller: on phones the most recent weeks are what you see first.
    <div className="custom-scrollbar mb-8 flex w-full flex-row-reverse overflow-x-auto pb-4">
      <div className="flex gap-[3px]" role="img" aria-label="GitHub contribution calendar for the last year">
        {weeks.map((week, w) => (
          <div key={w} className="flex flex-col gap-[3px]">
            {week.map((day, d) =>
              day ? (
                <div key={d} className={`h-2.5 w-2.5 rounded-sm sm:h-3 sm:w-3 ${LEVEL_CLASS[day.level]}`} title={`${day.count} on ${day.date}`} />
              ) : (
                <div key={d} className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              ),
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Meter({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: "red" | "butter" }) {
  return (
    <div>
      <div className="mb-2 flex justify-between font-mono text-xs">
        <span className="flex items-center gap-2 uppercase opacity-80">{icon} {label}</span>
        <span className={`font-bold ${tone === "red" ? "text-accentRed" : "text-butter"}`}>{value}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full border border-butter/10 bg-marine">
        <div
          {...reveal("left", 200)}
          className={`h-full ${tone === "red" ? "bg-accentRed" : "bg-butter"}`}
          style={{ ...reveal("left", 200).style, width: `${value}%` }}
        />
      </div>
    </div>
  );
}
