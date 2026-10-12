// Fetched on the server and cached (ISR), so visitors' phones make no
// third-party requests for it. Every fetcher fails soft.

const REVALIDATE = 1800; // 30 minutes

async function getJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, { ...init, next: { revalidate: REVALIDATE }, signal: AbortSignal.timeout(5000) });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

const WEATHER_CODES: [number[], string][] = [
  [[0], "Clear skies"],
  [[1, 2], "A few clouds"],
  [[3], "Overcast"],
  [[45, 48], "Foggy"],
  [[51, 53, 55, 56, 57], "Drizzle"],
  [[61, 63, 65, 66, 67, 80, 81, 82], "Rain"],
  [[95, 96, 99], "Thunderstorms"],
];

export async function getWeather() {
  const data = await getJson<{ current?: { temperature_2m: number; weather_code: number; is_day: number } }>(
    "https://api.open-meteo.com/v1/forecast?latitude=15.79&longitude=120.99&current=temperature_2m,weather_code,is_day&timezone=Asia%2FManila",
  );
  if (!data?.current) return null;
  const { temperature_2m, weather_code, is_day } = data.current;
  const sky = WEATHER_CODES.find(([codes]) => codes.includes(weather_code))?.[1] ?? "Changeable";
  return { temperature: Math.round(temperature_2m), sky, isDay: is_day === 1 };
}
