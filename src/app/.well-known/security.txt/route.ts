import { siteUrl } from "@/lib/site";

// RFC 9116: tells security researchers how to report a problem.
export const dynamic = "force-static";

export function GET() {
  const base = siteUrl();
  const expires = new Date(Date.UTC(new Date().getUTCFullYear() + 1, 11, 31)).toISOString();
  const body = [`Contact: ${base}/contact`, `Expires: ${expires}`, "Preferred-Languages: en, fil", `Canonical: ${base}/.well-known/security.txt`, `Policy: ${base}/privacy#security`, ""].join("\n");
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
