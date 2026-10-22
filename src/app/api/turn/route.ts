import { NextResponse } from "next/server";
import { clientKey, rateLimit } from "@/lib/rate-limit";

// ICE servers for Bay Street Circuit's multiplayer (see docs/BACKEND.md).
// With CLOUDFLARE_TURN_KEY_ID and CLOUDFLARE_TURN_KEY_API_TOKEN set, this mints
// short-lived TURN credentials from Cloudflare Realtime, so two players behind
// strict NAT (mobile data, carrier-grade NAT) can still connect through a
// relay. The API token never leaves the server; the browser only gets
// credentials that expire. Without the keys it answers with public STUN only.

const STUN = [{ urls: ["stun:stun.cloudflare.com:3478", "stun:stun.l.google.com:19302"] }];
/** Credentials live this long (s): long enough for an evening of racing. */
const TTL = 2 * 60 * 60;

interface IceServer {
  urls: string[];
  username?: string;
  credential?: string;
}

/** Cloudflare answers with an array of servers (or, on the older endpoint, one object). */
function normalise(body: unknown): IceServer[] {
  const raw = (body as { iceServers?: unknown } | null)?.iceServers;
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const out: IceServer[] = [];
  for (const s of list) {
    if (typeof s !== "object" || s === null) continue;
    const { urls, username, credential } = s as Record<string, unknown>;
    const all = (Array.isArray(urls) ? urls : [urls]).filter((u): u is string => typeof u === "string" && /^(stun|turns?):/.test(u));
    // Browsers refuse port 53, so those entries only slow gathering down
    const usable = all.filter((u) => !/:53(\?|$)/.test(u));
    if (!usable.length) continue;
    out.push({ urls: usable, ...(typeof username === "string" && typeof credential === "string" ? { username, credential } : {}) });
  }
  return out;
}

export async function POST(req: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (!rateLimit(clientKey(req, "turn"), 20, 10 * 60_000)) return NextResponse.json({ iceServers: STUN, relay: false, error: "Too many requests; try again in a few minutes." }, { status: 429, headers });

  const id = process.env.CLOUDFLARE_TURN_KEY_ID?.trim();
  const token = process.env.CLOUDFLARE_TURN_KEY_API_TOKEN?.trim();
  if (!id || !token) return NextResponse.json({ iceServers: STUN, relay: false }, { headers });

  try {
    const res = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(id)}/credentials/generate-ice-servers`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ttl: TTL }),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`Cloudflare TURN answered ${res.status}`);
    const servers = normalise(await res.json());
    if (!servers.some((s) => s.username)) throw new Error("No TURN credentials in the answer");
    return NextResponse.json({ iceServers: servers, relay: true, ttl: TTL }, { headers });
  } catch (err) {
    console.error("[turn]", err instanceof Error ? err.message : err);
    return NextResponse.json({ iceServers: STUN, relay: false }, { headers });
  }
}

export function GET() {
  return NextResponse.json({ error: "Use POST." }, { status: 405, headers: { Allow: "POST" } });
}
