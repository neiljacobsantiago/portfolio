import { getLatestRepo, getWeather } from "@/lib/now";
import { reveal } from "@/lib/reveal";
import { site } from "@/lib/site";
import LocalClock from "./LocalClock";

/** A friendly "live" panel: local time, weather and what's being built. */
export default async function RightNow() {
  const [weather, repo] = await Promise.all([getWeather(), getLatestRepo()]);

  return (
    <section aria-labelledby="now-title" className="mx-auto max-w-[90rem] px-5 py-24 md:px-10 md:py-32">
      <div className="mb-12 flex items-end justify-between gap-6">
        <h2 id="now-title" className="font-display text-[clamp(2.5rem,6vw,5rem)] leading-[1.04]">
          Right <em className="font-serif text-ember">now.</em>
        </h2>
        <span className="label flex items-center gap-2 text-ink/60">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ember/60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-ember" />
          </span>
          Live
        </span>
      </div>

      <div className="grid gap-px overflow-hidden rounded-[2px] border border-ink/10 bg-ink/10 md:grid-cols-3">
        <div {...reveal("up")} className="bg-paper p-7 md:col-span-2 md:p-10">
          <p className="label mb-6 text-ember">Local time · {site.location}</p>
          <LocalClock />
        </div>

        <div {...reveal("up", 100)} className="bg-sky/25 p-7 md:p-10">
          <p className="label mb-6 text-ink/70">Outside the window</p>
          {weather ? (
            <>
              <span className="font-display text-[clamp(3.5rem,9vw,7rem)] leading-none">{weather.temperature}°</span>
              <span className="mt-3 block font-serif text-xl italic text-ink/75">
                {weather.sky}
                {weather.isDay ? " — good light for shooting." : " — a night for the stars."}
              </span>
            </>
          ) : (
            <span className="block font-serif text-xl italic text-ink/75">The weather station is quiet right now.</span>
          )}
        </div>

        <div {...reveal("up", 150)} className="bg-paper p-7 md:p-10">
          <p className="label mb-4 text-ink/70">Currently</p>
          <p className="font-serif text-xl leading-snug">{site.role}.</p>
        </div>

        <div {...reveal("up", 200)} className="bg-paper p-7 md:col-span-2 md:p-10">
          <p className="label mb-4 text-ink/70">Latest code pushed</p>
          {repo ? (
            <a href={repo.html_url} target="_blank" rel="noopener noreferrer" className="group block">
              <span className="font-display text-3xl group-hover:text-ember">{repo.name} ↗</span>
              {repo.description && <span className="mt-2 block font-serif text-lg text-ink/75">{repo.description}</span>}
              <span className="label mt-3 block text-[0.65rem] text-ink/50">
                {new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: site.timeZone }).format(new Date(repo.pushed_at))}
              </span>
            </a>
          ) : (
            <a href={`https://github.com/${site.githubUser}`} target="_blank" rel="noopener noreferrer" className="font-display text-3xl hover:text-ember">
              github.com/{site.githubUser} ↗
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
