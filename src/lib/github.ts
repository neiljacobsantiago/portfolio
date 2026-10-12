import { site } from "./site";

// The contribution tracker's data, fetched on the server and cached for an
// hour (ISR), so visitors never call GitHub themselves. Three sources, best
// first, each failing soft:
//   1. GraphQL API      — exact, needs GITHUB_TOKEN (read:user is enough)
//   2. github.com HTML  — the public calendar fragment every profile shows
//   3. a public mirror  — github-contributions-api.jogruber.de

const REVALIDATE = 3600;
const USER = site.githubUser;

export interface Day {
  date: string; // YYYY-MM-DD
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface RepoSummary {
  name: string;
  url: string;
  description: string | null;
  language: string | null;
  stars: number;
  pushedAt: string;
}

export interface GitHubActivity {
  total: number;
  /** Sunday-first weeks, oldest first; null pads the first and last week. */
  weeks: (Day | null)[][];
  currentStreak: number;
  longestStreak: number;
  best: Day | null;
  activeDays: number;
  /** Contributions per weekday, Sunday first. */
  byWeekday: number[];
  repos: RepoSummary[];
  publicRepos: number;
  languages: { name: string; count: number }[];
}

const ghHeaders = (): HeadersInit => ({
  Accept: "application/vnd.github+json",
  "User-Agent": `${USER}-portfolio`,
  ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
});

async function get(url: string, init?: RequestInit): Promise<Response | null> {
  try {
    const res = await fetch(url, { ...init, next: { revalidate: REVALIDATE }, signal: AbortSignal.timeout(6000) });
    return res.ok ? res : null;
  } catch {
    return null;
  }
}

/** Today's date in Neil's time zone, as YYYY-MM-DD. */
const localDate = () => new Intl.DateTimeFormat("en-CA", { timeZone: site.timeZone }).format(new Date());

const clampLevel = (n: number) => Math.max(0, Math.min(4, n)) as Day["level"];

async function fromGraphQL(): Promise<Day[] | null> {
  if (!process.env.GITHUB_TOKEN) return null;
  const query = `query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{weeks{contributionDays{date contributionCount contributionLevel}}}}}}`;
  const res = await get("https://api.github.com/graphql", {
    method: "POST",
    headers: { ...ghHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { login: USER } }),
  });
  const json = (await res?.json().catch(() => null)) as {
    data?: { user?: { contributionsCollection: { contributionCalendar: { weeks: { contributionDays: { date: string; contributionCount: number; contributionLevel: string }[] }[] } } } };
  } | null;
  const weeks = json?.data?.user?.contributionsCollection.contributionCalendar.weeks;
  if (!weeks) return null;
  const LEVELS = ["NONE", "FIRST_QUARTILE", "SECOND_QUARTILE", "THIRD_QUARTILE", "FOURTH_QUARTILE"];
  return weeks.flatMap((w) => w.contributionDays.map((d) => ({ date: d.date, count: d.contributionCount, level: clampLevel(LEVELS.indexOf(d.contributionLevel)) })));
}

/** Parses the calendar fragment from github.com/users/<user>/contributions. Exported for testing. */
export function parseCalendarHtml(html: string): Day[] | null {
  const counts = new Map<string, number>();
  // <tool-tip for="contribution-day-component-0-12" …>3 contributions on March 9th.</tool-tip>
  for (const m of html.matchAll(/<tool-tip[^>]*\bfor="([^"]+)"[^>]*>\s*(No|[\d,]+) contributions?/g)) {
    counts.set(m[1], m[2] === "No" ? 0 : Number(m[2].replace(/,/g, "")));
  }
  const days: Day[] = [];
  for (const m of html.matchAll(/<td\b[^>]*>/g)) {
    const tag = m[0];
    const date = /data-date="(\d{4}-\d{2}-\d{2})"/.exec(tag)?.[1];
    const level = /data-level="(\d)"/.exec(tag)?.[1];
    if (!date || level === undefined) continue;
    const id = /\bid="([^"]+)"/.exec(tag)?.[1];
    days.push({ date, level: clampLevel(Number(level)), count: (id ? counts.get(id) : undefined) ?? (Number(level) > 0 ? 1 : 0) });
  }
  return days.length > 0 ? days : null;
}

async function fromHtml(): Promise<Day[] | null> {
  const res = await get(`https://github.com/users/${USER}/contributions`, { headers: { "User-Agent": `${USER}-portfolio` } });
  const html = await res?.text().catch(() => null);
  return html ? parseCalendarHtml(html) : null;
}

async function fromMirror(): Promise<Day[] | null> {
  const res = await get(`https://github-contributions-api.jogruber.de/v4/${USER}?y=last`);
  const json = (await res?.json().catch(() => null)) as { contributions?: { date: string; count: number; level: number }[] } | null;
  return json?.contributions?.length ? json.contributions.map((d) => ({ date: d.date, count: d.count, level: clampLevel(d.level) })) : null;
}

async function getRepos() {
  const res = await get(`https://api.github.com/users/${USER}/repos?per_page=100&sort=pushed`, { headers: ghHeaders() });
  const list = (await res?.json().catch(() => null)) as
    | { name: string; html_url: string; description: string | null; language: string | null; stargazers_count: number; pushed_at: string; fork: boolean }[]
    | null;
  return Array.isArray(list) ? list.filter((r) => !r.fork) : [];
}

/** Turns a flat list of days into the stats and Sunday-first week columns. Exported for testing. */
export function summarize(days: Day[], today = localDate()): Omit<GitHubActivity, "repos" | "publicRepos" | "languages"> | null {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date)).filter((d) => d.date <= today);
  if (sorted.length === 0) return null;

  const weeks: (Day | null)[][] = [];
  let week: (Day | null)[] = Array.from({ length: new Date(`${sorted[0].date}T00:00:00Z`).getUTCDay() }, () => null);
  for (const d of sorted) {
    week.push(d);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length) weeks.push([...week, ...Array.from({ length: 7 - week.length }, () => null)]);

  let longest = 0;
  let run = 0;
  for (const d of sorted) {
    run = d.count > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  // Today not committed yet doesn't break the streak.
  let current = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].count > 0) current++;
    else if (i === sorted.length - 1 && sorted[i].date === today) continue;
    else break;
  }

  const byWeekday = [0, 0, 0, 0, 0, 0, 0];
  for (const d of sorted) byWeekday[new Date(`${d.date}T00:00:00Z`).getUTCDay()] += d.count;

  return {
    total: sorted.reduce((sum, d) => sum + d.count, 0),
    weeks,
    currentStreak: current,
    longestStreak: longest,
    best: sorted.reduce<Day | null>((b, d) => (d.count > (b?.count ?? 0) ? d : b), null),
    activeDays: sorted.filter((d) => d.count > 0).length,
    byWeekday,
  };
}

export async function getGitHubActivity(): Promise<GitHubActivity | null> {
  const [days, repos] = await Promise.all([fromGraphQL().then((d) => d ?? fromHtml()).then((d) => d ?? fromMirror()), getRepos()]);
  const summary = days && summarize(days.slice(-371));
  if (!summary) return null;

  const tally = new Map<string, number>();
  for (const r of repos) if (r.language) tally.set(r.language, (tally.get(r.language) ?? 0) + 1);

  return {
    ...summary,
    repos: repos.slice(0, 4).map((r) => ({ name: r.name, url: r.html_url, description: r.description, language: r.language, stars: r.stargazers_count, pushedAt: r.pushed_at })),
    publicRepos: repos.length,
    languages: [...tally].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5),
  };
}
