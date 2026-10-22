// Where the signalling server is, and which ICE servers to try.
//
// Signalling (finding each other) goes through a PeerJS server: the free
// public one at 0.peerjs.com unless NEXT_PUBLIC_PEER_HOST points at your own.
// The race itself is peer to peer over WebRTC. STUN lets most home and mobile
// connections find a direct path; when both ends are behind strict NAT (common
// on mobile data), only a TURN relay gets through. /api/turn hands out
// short-lived Cloudflare TURN credentials when the site has them configured.

export interface PeerServer {
  host?: string;
  port?: number;
  path?: string;
  secure?: boolean;
}

export function peerServer(): PeerServer {
  const host = process.env.NEXT_PUBLIC_PEER_HOST?.trim();
  if (!host) return {};
  const port = Number(process.env.NEXT_PUBLIC_PEER_PORT);
  const secure = process.env.NEXT_PUBLIC_PEER_SECURE;
  return {
    host,
    port: Number.isInteger(port) && port > 0 ? port : undefined,
    path: process.env.NEXT_PUBLIC_PEER_PATH?.trim() || "/",
    secure: secure ? secure === "true" || secure === "1" : undefined,
  };
}

/** Public STUN, always. */
export const STUN: RTCIceServer[] = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun.cloudflare.com:3478"] }];
/** PeerJS's own free relay, offered with its cloud server: best effort, shared, no guarantees. */
const PEERJS_TURN: RTCIceServer[] = [{ urls: ["turn:eu-0.turn.peerjs.com:3478", "turn:us-0.turn.peerjs.com:3478"], username: "peerjs", credential: "peerjsp" }];

let cached: { at: number; servers: RTCIceServer[]; relay: boolean } | null = null;

/** ICE servers for this session: the site's TURN if it has one, else STUN (plus PeerJS's relay on its cloud). */
export async function iceServers(): Promise<{ servers: RTCIceServer[]; relay: boolean }> {
  if (cached && Date.now() - cached.at < 60 * 60_000) return cached;
  const fallback = [...STUN, ...(peerServer().host ? [] : PEERJS_TURN)];
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3500);
    const res = await fetch("/api/turn", { method: "POST", signal: ctrl.signal, cache: "no-store" });
    clearTimeout(timer);
    if (res.ok) {
      const body = (await res.json()) as { iceServers?: unknown; relay?: unknown };
      const list = Array.isArray(body.iceServers) ? body.iceServers.filter(validServer) : [];
      if (body.relay === true && list.length) {
        cached = { at: Date.now(), servers: list, relay: true };
        return cached;
      }
    }
  } catch {}
  return { servers: fallback, relay: false };
}

function validServer(x: unknown): x is RTCIceServer {
  if (typeof x !== "object" || x === null) return false;
  const s = x as RTCIceServer;
  const urls = Array.isArray(s.urls) ? s.urls : [s.urls];
  return urls.length > 0 && urls.every((u) => typeof u === "string" && /^(stun|turns?):/.test(u));
}
