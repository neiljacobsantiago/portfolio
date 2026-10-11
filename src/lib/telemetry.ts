import { site } from "./site";

// All home-page telemetry is fetched on the server and cached (ISR), so visitors'
// phones make no third-party requests for it (only the visitor trace runs in the
// browser, since it has to). Every fetcher fails soft.

const REVALIDATE = 1800; // 30 minutes

async function getJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, { ...init, next: { revalidate: REVALIDATE }, signal: AbortSignal.timeout(5000) });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

const githubHeaders: HeadersInit = {
  Accept: "application/vnd.github+json",
  ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
};

export interface Repo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  fork: boolean;
}

export async function getGithubProfile() {
  const user = await getJson<{ followers: number; public_repos: number }>(`https://api.github.com/users/${site.githubUser}`, { headers: githubHeaders });
  return user ? { followers: user.followers, publicRepos: user.public_repos } : null;
}

export async function getRecentRepos(limit = 4) {
  const repos = await getJson<Repo[]>(`https://api.github.com/users/${site.githubUser}/repos?sort=pushed&per_page=10`, { headers: githubHeaders });
  return Array.isArray(repos) ? repos.filter((r) => !r.fork).slice(0, limit) : [];
}

export interface ContributionDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

/** Last ~12 months of public contributions, grouped into weeks (Sunday-first). */
export async function getContributions() {
  const data = await getJson<{ total?: Record<string, number>; contributions?: ContributionDay[] }>(
    `https://github-contributions-api.jogruber.de/v4/${site.githubUser}?y=last`,
  );
  const days = data?.contributions;
  if (!Array.isArray(days) || days.length === 0) return null;

  const weeks: (ContributionDay | null)[][] = [];
  const firstWeekday = new Date(`${days[0].date}T00:00:00Z`).getUTCDay();
  let week: (ContributionDay | null)[] = Array(firstWeekday).fill(null);
  for (const day of days) {
    week.push(day);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length) weeks.push(week);

  const total = data?.total?.lastYear ?? days.reduce((sum, d) => sum + d.count, 0);
  return { weeks, total };
}

export async function getWeather() {
  const data = await getJson<{ current_weather?: { temperature: number; windspeed: number } }>(
    "https://api.open-meteo.com/v1/forecast?latitude=15.79&longitude=120.99&current_weather=true",
  );
  return data?.current_weather ?? null;
}
