import type { GoogleGenAI, GroundingMetadata } from "@google/genai";
import { googleSearch, hostOf, isSafeHref, type Source } from "./sources";

// NeilAI's web search (server only). The chat model can't be relied on to mix
// Google Search grounding with its own function tools in one request, so
// `web_search` is an ordinary function tool: it makes a second, separate
// request with only the google_search tool, and hands back a short answer
// plus the pages it was grounded on. Those come back to the visitor as "web
// results" chips, opened only after the leaving-the-site confirmation.

const MAX_WEB_SOURCES = 4;
const REDIRECT_HOST = /(^|\.)vertexaisearch\.cloud\.google\.com$/i;

const SEARCH_INSTRUCTION = `You answer one question for a visitor on a personal portfolio site, using Google Search.
- Be accurate and neutral. 3 to 6 sentences of plain text; no markdown, no URLs.
- For anything time-sensitive (news, results, schedules, prices), give the date the information is from.
- If the sources disagree or don't answer it, say so plainly instead of guessing.
- Today's date is {today}.`;

export interface WebSearchResult {
  /** The grounded answer, for the chat model to put in its own words. */
  answer: string;
  /** Pages the answer was grounded on (web results), plus a Google search for the query. */
  sources: Source[];
  /** What Google was actually asked. */
  queries: string[];
}

/** Grounding links are Google redirects; follow one hop to show the real site (and check it). */
async function resolve(uri: string): Promise<string | null> {
  if (!isSafeHref(uri)) return null;
  if (!REDIRECT_HOST.test(new URL(uri).hostname)) return uri;
  try {
    const res = await fetch(uri, { method: "GET", redirect: "manual", signal: AbortSignal.timeout(2500) });
    const to = res.headers.get("location");
    return to && isSafeHref(to) && !REDIRECT_HOST.test(new URL(to).hostname) ? to : null;
  } catch {
    return null;
  }
}

/** "https://en.wikipedia.org/wiki/Mount_Apo" → "Mount Apo"; null when the path says nothing useful. */
function slugTitle(href: string): string | null {
  try {
    const last = decodeURIComponent(new URL(href).pathname.split("/").filter(Boolean).pop() ?? "");
    const words = last.replace(/\.(html?|php|aspx?)$/i, "").replace(/[-_+]+/g, " ").trim();
    return words.length >= 3 && /[a-z]/i.test(words) && !/^\d+$/.test(words) && words.length <= 70 ? words.charAt(0).toUpperCase() + words.slice(1) : null;
  } catch {
    return null;
  }
}

/** The pages behind a grounded answer, as chips: real destinations only, one per page, safe links only. */
export async function groundingSources(meta: GroundingMetadata | undefined): Promise<Source[]> {
  const chunks = (meta?.groundingChunks ?? []).map((c) => c.web).filter((w): w is { uri: string; title?: string } => !!w?.uri);
  const resolved = await Promise.all(chunks.slice(0, 8).map(async (w) => ({ href: await resolve(w.uri), title: w.title?.trim() ?? "" })));
  const out: Source[] = [];
  for (const { href, title } of resolved) {
    if (!href || out.some((s) => s.href === href)) continue;
    const host = hostOf(href);
    // Grounding titles are often just the domain; then the page's own path names it if it can.
    const label = title && !/^[\w.-]+\.[a-z]{2,}$/i.test(title) ? title.slice(0, 80) : (slugTitle(href) ?? host);
    out.push({ label, href, host, kind: "web" });
    if (out.length >= MAX_WEB_SOURCES) break;
  }
  return out;
}

/** One grounded Google search. Throws if the request fails; the caller decides what to tell the visitor. */
export async function webSearch(client: GoogleGenAI, model: string, query: string): Promise<WebSearchResult> {
  const q = query.replace(/\s+/g, " ").trim().slice(0, 300);
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Manila" });
  const response = await client.models.generateContent({
    model,
    contents: [{ role: "user", parts: [{ text: q }] }],
    config: {
      systemInstruction: SEARCH_INSTRUCTION.replace("{today}", today),
      tools: [{ googleSearch: {} }],
      temperature: 0.2,
      maxOutputTokens: 700,
    },
  });
  const meta = response.candidates?.[0]?.groundingMetadata;
  const queries = (meta?.webSearchQueries ?? []).filter((x) => typeof x === "string" && x.trim()).slice(0, 3);
  const pages = await groundingSources(meta);
  const answer = (response.text ?? "")
    .replace(/\(?https?:\/\/[^\s)]+\)?/g, "")
    .replace(/[ \t]+([.,;:!?])/g, "$1")
    .trim();
  return { answer, sources: [...pages, googleSearch(queries[0] ?? q)], queries };
}
