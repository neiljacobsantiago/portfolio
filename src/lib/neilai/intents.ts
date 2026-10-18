import { projects } from "@/content/work";
import type { ChatCard } from "@/lib/tools";
import type { Algorithm } from "@/lib/tools/memory";
import { findService } from "@/lib/tools/quote";
import { PATHOSCAN_THRESHOLD } from "./facts";

// Reads a visitor's message and decides which Lab tools or project cards
// answer it. Runs in the browser, so NeilAI's tools work even when the AI
// model is offline (no key, rate limit, outage).

const IP_PREFIX = /\b(\d{1,3}(?:\.\d{1,3}){3})(?:\s*\/\s*(\d{1,2})|\s+(255\.\d{1,3}\.\d{1,3}\.\d{1,3}))?/;
const URLISH = /\b((?:https?:\/\/|www\.)[^\s"'<>]+|[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|ph|net|org|xyz|top|ly|io|co|me|app|info|click|link|site|online|shop|tk|ml|gq|zip|mov)(?:\/[^\s"'<>]*)?)/i;

const numbers = (s: string) => (s.match(/\d+/g) ?? []).map(Number).filter((n) => n > 0);

function algorithmIn(q: string): Algorithm | null {
  if (/\bbest[- ]?fit\b/i.test(q)) return "best";
  if (/\bworst[- ]?fit\b/i.test(q)) return "worst";
  if (/\bnext[- ]?fit\b/i.test(q)) return "next";
  if (/\bfirst[- ]?fit\b/i.test(q)) return "first";
  return null;
}

export function detectCards(message: string): ChatCard[] {
  const q = message.trim();
  const lower = q.toLowerCase();
  const cards: ChatCard[] = [];

  // VLSM: "plan subnets for 60, 25 and 12 hosts from 192.168.20.0/24"
  const ip = q.match(IP_PREFIX);
  if (ip && /\b(vlsm|vlan|subnets for|hosts|segments|departments|rooms)\b/i.test(q) && /\bhosts?\b|\bfor\b/i.test(q)) {
    const base = `${ip[1]}/${ip[2] ?? 24}`;
    const rest = q.replace(ip[0], " ");
    const sizes = numbers(rest.replace(/\/\d+/g, "")).filter((n) => n < 100000).slice(0, 8);
    if (sizes.length) cards.push({ kind: "vlsm", base, needs: sizes.map((hosts, i) => ({ name: `Segment ${String.fromCharCode(65 + i)}`, hosts })) });
  }
  if (ip && !cards.length && /\b(subnet|cidr|mask|network|hosts?|broadcast|range|ip|calculate|\/\d)/i.test(q + (ip[2] ? " /" : ""))) {
    cards.push({ kind: "subnet", input: ip[3] ? `${ip[1]} ${ip[3]}` : `${ip[1]}/${ip[2] ?? 24}` });
  } else if (ip && !cards.length && ip[2]) {
    cards.push({ kind: "subnet", input: `${ip[1]}/${ip[2]}` });
  }

  // Memory allocation: "best fit 100 500 200 / 212 417 112"
  const algo = algorithmIn(q);
  if (algo || /\b(memory allocation|fragmentation|first fit|partition)/i.test(lower)) {
    const [blocksPart, procPart] = q.split(/\bprocess(?:es)?\b|\bjobs?\b|\s\/\s|;|\|/i);
    const blocks = numbers(blocksPart ?? "");
    const processes = numbers(procPart ?? "");
    cards.push({
      kind: "memory",
      blocks: blocks.length >= 2 && processes.length ? blocks.slice(0, 10) : [100, 500, 200, 300, 600],
      processes: blocks.length >= 2 && processes.length ? processes.slice(0, 10) : [212, 417, 112, 426],
      algorithm: algo ?? "first",
    });
  }

  // Link safety: a URL plus a "is it safe?"-style question, or just a bare link.
  const url = q.match(URLISH);
  if (url && !ip && (/\b(safe|phish|scam|legit|real|fake|trust|virus|check|suspicious|click)/i.test(lower) || q.replace(url[0], "").trim().length < 4)) {
    cards.push({ kind: "link", url: url[0] });
  } else if (/\b(phishing|scam link|suspicious link|link checker|is (this|it|the) (link |url |site )?safe)\b/i.test(lower)) {
    cards.push({ kind: "link", url: "" });
  }

  // PathoScan decision rule
  if (/\b(pathoscan|aspergillus|flavus|niger|terreus|fumigatus|tamarii)\b/i.test(lower) && /\b(confiden|threshold|pcr|clear|decid|percent|%|result|sure|accura)/i.test(lower)) {
    const pct = Number(q.match(/(\d{1,3}(?:\.\d)?)\s*%/)?.[1] ?? NaN);
    const species = lower.match(/\b(flavus|niger|terreus|fumigatus|tamarii)\b/)?.[1];
    cards.push({ kind: "pathoscan", species: species ? `A. ${species}` : "A. flavus", confidence: Number.isFinite(pct) ? Math.min(100, pct) : 94 });
  }

  // Photoshoot quote
  if (/\b(how much|magkano|price|presyo|rate|cost|quote|budget|package|book)/i.test(lower)) {
    const service = findService(lower.match(/\b(private|custom|exclusive|grad\w*|toga|id|headshot|corporate|studio|portrait|fun\w*|lifestyle|outdoor|debut|birthday|pre\w*|event|wedding|gig|seminar)\b/)?.[1]);
    if (service) {
      const people = Number(lower.match(/\bfor\s+(\d{1,2})\b|\b(\d{1,2})\s+(?:people|persons|friends|of us|pax|heads?)\b/)?.slice(1).find(Boolean) ?? 1);
      const group = people >= 3 && service.id === "graduation";
      cards.push({ kind: "quote", service: service.id, package: group ? "grad_group" : undefined, people: group || (service.custom && people > 1) ? people : undefined });
    }
  }

  // GitHub activity
  if (/\b(github|commits?|contributions?|coding activity|streak|repos?|repositories)\b/i.test(lower)) cards.push({ kind: "github" });

  // Projects mentioned by name
  for (const p of projects) {
    const name = p.title.toLowerCase();
    const short = name.split(/[\s:(]/)[0];
    if (cards.length < 3 && (lower.includes(name) || (short.length > 4 && new RegExp(`\\b${short}\\b`).test(lower))) && !cards.some((c) => c.kind === "pathoscan" && p.slug === "pathoscan")) {
      cards.push({ kind: "project", slug: p.slug });
    }
  }

  return cards.slice(0, 3);
}

const one = (rng: () => number, ...options: string[]) => options[Math.floor(rng() * options.length)];

/** What NeilAI says above a card it opened from the offline brain — in a few different ways, so it never sounds canned. */
export function introFor(card: ChatCard, rng: () => number = Math.random): string {
  switch (card.kind) {
    case "subnet":
      return one(
        rng,
        `Here's ${card.input} broken down 👇 Drag the slider to try other prefix lengths.`,
        `${card.input}, taken apart: network, broadcast and the usable range 👇 Slide to try another prefix.`,
        `Crunched ${card.input} for you 👇 Try a different prefix length with the slider.`,
      );
    case "vlsm":
      return one(
        rng,
        `Planned it largest-first from ${card.base}, biggest segment first, so nothing overlaps 👇`,
        `Here's the VLAN plan carved out of ${card.base} — biggest segment first, no overlaps 👇`,
        `Done: every segment gets its own subnet from ${card.base}, sized to fit 👇`,
      );
    case "memory":
      return one(
        rng,
        "Here's the allocation, drawn to scale 👇 Switch algorithms or step through process by process.",
        "Memory map, to scale 👇 Flip between First, Best, Worst and Next Fit to compare the gaps.",
        "Watch where each process lands 👇 Step through it, or switch algorithms to see fragmentation change.",
      );
    case "link":
      return card.url
        ? one(rng, "Checked the address — here's what stands out 👇 (I never open the link.)", "Here are the red flags I can see in that address 👇 I only read it, never open it.", "Looked it over without clicking 👇 Here's the verdict.")
        : one(rng, "Paste the link here and I'll point out any red flags 👇", "Got a suspicious link? Drop it in 👇 I'll read it without opening it.", "Paste any link below and I'll check it for phishing signs 👇");
    case "pathoscan": {
      const verdict = card.confidence >= 90 ? PATHOSCAN_THRESHOLD.above(card.confidence) : PATHOSCAN_THRESHOLD.below(card.confidence);
      return `**${card.species}** — ${verdict}\n\n${one(
        rng,
        "Slide the confidence below to see where the line falls 👇",
        "Try other values with the slider 👇",
        "Move the slider to test the 90% line yourself 👇",
      )}`;
    }
    case "quote":
      return one(
        rng,
        "Here's the quote, straight from Neil's package list 👇 Tap Book this when you're ready.",
        "Priced from Neil's package list 👇 Switch packages to compare, then tap Book this.",
        "Here's what that shoot costs, with the 30% downpayment worked out 👇",
      );
    case "github":
      return one(rng, "Fresh from GitHub 👇", "Here's Neil's commit log at a glance 👇", "Live from GitHub — streaks and all 👇");
    case "project":
      return one(rng, "Here's that project 👇", "This one 👇", "Here it is 👇");
    case "collection":
      return one(rng, `Here's the ${card.title} collection 👇`, `${card.title}, coming right up 👇`, `A look at ${card.title} 👇`);
  }
}
