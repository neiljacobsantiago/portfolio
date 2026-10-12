import { NextResponse } from "next/server";
import { getGitHubActivity } from "@/lib/github";

// Public, cached summary of Neil's GitHub activity (the same data the home
// page's commit log renders). Regenerated at most once an hour.
export const revalidate = 3600;

export async function GET() {
  const activity = await getGitHubActivity();
  if (!activity) return NextResponse.json({ error: "GitHub is unreachable right now." }, { status: 503 });
  return NextResponse.json(activity, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
}
