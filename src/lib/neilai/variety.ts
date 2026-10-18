import { education, interests, organizations, toolkit } from "@/content/about";
import { seriesList } from "@/content/series";
import { services } from "@/content/sessions";
import { projectBySlug, projects, type Project } from "@/content/work";
import { site } from "@/lib/site";
import { chatTools, type ChatCard, type ChatToolId } from "@/lib/tools";
import { collectionSays, GAMES, TRIVIA } from "./catalog";
import { certificateFacts, fixFacts, gearList } from "./facts";
import { pick, sample, seeded, shuffle, type Rng } from "./random";
import { resolveTopic, type Source } from "./sources";

// Variety for NeilAI: greetings that know the page and the hour, tool cards
// that open on a different example each time, the "Surprise me" picker, and
// the per-conversation spotlight that nudges the AI off its favourite project.
// Every fact here comes from the content files.

type Link = { label: string; href: string };

const CONFIDENCES = [68, 76, 84, 88, 89, 91, 93, 96, 98];
const SPECIES = ["A. flavus", "A. terreus", "A. fumigatus", "A. tamarii", "A. niger"];
const NETWORKS = ["192.168.10.0/24", "192.168.1.0/26", "10.0.0.0/22", "172.16.5.0/27", "10.10.0.0/20", "192.168.50.128/25", "172.20.0.0/23"];
const MEMORY_SETS: { blocks: number[]; processes: number[] }[] = [
  { blocks: [100, 500, 200, 300, 600], processes: [212, 417, 112, 426] },
  { blocks: [300, 600, 350, 200, 750, 125], processes: [115, 500, 358, 200, 375] },
  { blocks: [200, 400, 600, 500, 300, 250], processes: [357, 210, 468, 491] },
  { blocks: [50, 150, 300, 350, 600], processes: [300, 25, 125, 50] },
  { blocks: [120, 480, 260, 90, 700], processes: [250, 90, 400, 110, 300] },
];
const SAMPLE_LINKS = ["", "", "gcash-verify-account.xyz", "bit.ly/3promo", "paypa1-secure-login.com", "lazada-promo-freebies.top/claim"];
const ALGOS = ["first", "best", "worst", "next"] as const;

/** A tool card on a different example every time it's opened from the Tools drawer. */
export function starterFor(id: ChatToolId, rng: Rng = Math.random): ChatCard {
  switch (id) {
    case "subnet":
      return { kind: "subnet", input: pick(NETWORKS, rng) };
    case "memory":
      return { kind: "memory", ...pick(MEMORY_SETS, rng), algorithm: pick(ALGOS, rng) };
    case "link":
      return { kind: "link", url: pick(SAMPLE_LINKS, rng) };
    case "pathoscan":
      return { kind: "pathoscan", species: pick(SPECIES, rng), confidence: pick(CONFIDENCES, rng) };
    case "quote":
      return { kind: "quote", service: pick(services, rng).id };
  }
}

/* ------------------------------------------------------------------ */
/* Greetings                                                           */
/* ------------------------------------------------------------------ */

function hello(hour: number, rng: Rng) {
  if (hour >= 5 && hour < 12) return pick(["Good morning! ☀️", "Morning! ☕", "Hi, early bird! 🌤️"], rng);
  if (hour >= 12 && hour < 18) return pick(["Good afternoon! 👋", "Hey there! 👋", "Hi! 👋"], rng);
  if (hour >= 18 && hour < 22) return pick(["Good evening! 🌆", "Evening! 🌇", "Hey, good evening! 👋"], rng);
  return pick(["Up late? 🌙", "Hello, night owl! 🦉", "Hi from the night shift! 🌌"], rng);
}

const INTROS = [
  "I'm NeilAI — I know Neil's work inside out, and I can run his project tools right here.",
  "I'm NeilAI, Neil's site assistant. Ask me about his work, his photos or a shoot.",
  "NeilAI here — your tour guide to Neil's projects, photos and tools.",
  "I'm NeilAI. I know every project on this site, and I can run the Lab tools in this chat.",
];

/** The opening two messages: hour-aware hello, then a line about the page the visitor is on. */
export function greeting(path: string, hour: number, rng: Rng = Math.random): [string, string] {
  const first = `${hello(hour, rng)} ${pick(INTROS, rng)}`;
  const slug = path.match(/^\/work\/([^/?#]+)/)?.[1];
  const project = slug ? projectBySlug(slug) : undefined;
  const others = sample(projects.filter((p) => p !== project), 2, rng).map((p) => p.title);
  const shots = collectionSays(pick(seriesList, rng).slug);
  const dice = rng() < 0.5 ? " Or tap Surprise me and I'll pick something for you." : "";
  const page = `/${path.split(/[/?#]/)[1] ?? ""}`;

  let second: string;
  if (project) {
    second = pick(
      [
        `Reading about ${project.title}? Ask what Neil did on it, how it was made — or what to see next.`,
        `Curious about ${project.title}? I can explain it simply, or point you to something like ${others[0]}.`,
      ],
      rng,
    );
  } else if (page === "/photography") {
    second = pick([`Ask about any collection — the ${shots} are a good start — or get a quote for a shoot. 📸`, `Want a price for a shoot, or the story behind the ${shots}? Just ask.`], rng);
  } else if (page === "/lab") {
    second = pick(["Every tool here also runs inside this chat — open Tools up top, or just paste a link or an IP. 🧪", "Paste a suspicious link, an IP or a memory layout and I'll run the right tool. 🧪"], rng);
  } else if (page === "/play") {
    second = pick([`Between rounds, ask me about ${others[0]} — or let me plan a subnet for you. 🕹️`, "Ask me how the games came about, or let me do the subnetting for you. 🕹️"], rng);
  } else if (page === "/about" || page === "/resume") {
    second = pick(["Ask about his school, orgs or certificates — or what he does off the clock.", `Ask me about his time at CLSU, his gear, or the ${shots}.`], rng);
  } else if (page === "/contact" || page === "/bookings") {
    second = pick(["Not sure what to book? I can quote a shoot first, or tell you how fast Neil replies.", "Want a price before you message? Ask me for a quote on any shoot. 💬"], rng);
  } else {
    second = pick(
      [
        `Ask about ${others[0]}, the ${shots} or a shoot quote — or open Tools up top to run his tools.`,
        `Try asking about ${others[0]} or ${others[1]}, or what's in his camera bag.`,
        `I can show you the ${shots}, explain ${others[0]}, or quote a photoshoot.`,
      ],
      rng,
    );
  }
  return [first, second + dice];
}

/* ------------------------------------------------------------------ */
/* Surprise me                                                         */
/* ------------------------------------------------------------------ */

export interface Surprise {
  text: string;
  topic: string;
  links?: Link[];
  cards?: ChatCard[];
  sources?: Source[];
}

const lead = (rng: Rng) => pick(["Here's one:", "Rolled the dice —", "Ooh, good pick:", "How about this:", "Random draw:", "You might not have seen this:", "Fresh from the pile:", "Picked just for you:"], rng);

const projectSurprise = (p: Project, rng: Rng): Surprise => ({
  text: `${lead(rng)} ${p.title}. ${fixFacts(p.plain)} ${pick([`Neil's role: ${p.role}.`, `(${p.context} · ${p.status})`], rng)}`,
  topic: `project:${p.slug}`,
  cards: [{ kind: "project", slug: p.slug }],
});

function buildSurprises(rng: Rng): Surprise[][] {
  const facts: Surprise[] = [
    ...interests.map((i) => ({ text: `${lead(rng)} off the clock — ${i.title}. In Neil's words: “${i.text}”`, topic: "fun:hobbies", links: [{ label: "More about Neil", href: "/about" }] })),
    ...certificateFacts.map((c) => ({
      text: `${lead(rng)} Neil earned “${c.title}” from ${c.issuer} in ${c.date}.${c.note ? ` ${c.note}.` : ""}`,
      topic: "about:certificates",
      links: [{ label: "Credentials", href: "/about#credentials" }],
    })),
    ...organizations
      .filter((o) => o.role !== "Student")
      .map((o) => ({ text: `${lead(rng)} Neil is part of the ${o.name} (${o.short}) — role: ${o.role}. ${o.detail}`, topic: "about:orgs", links: [{ label: "Organizations", href: "/about" }] })),
    ...education.map((e) => ({ text: `${lead(rng)} ${e.school}, ${e.years}: ${e.level}. ${e.detail}`, topic: "about:education", links: [{ label: "The full story", href: "/about" }] })),
    ...gearList.map((g) => ({ text: `${lead(rng)} from Neil's camera bag — ${g.brand}: ${g.items.join(", ")}. 📸`, topic: "about:gear", links: [{ label: "See the gear", href: "/about#gear" }] })),
    ...toolkit.map((g) => ({ text: `${lead(rng)} Neil's ${g.group.toLowerCase()} toolkit: ${g.tools.map((t) => t.name).join(", ")}.`, topic: "about:skills", links: [{ label: "About", href: "/about" }] })),
    { text: `${lead(rng)} this site's motto is “${site.tagline}”`, topic: "about:who", links: [{ label: "About", href: "/about" }] },
    { text: `${lead(rng)} there's a back room. /terminal is a small shell where this site started — type help, ls, or cd photography. ⌨️`, topic: "fun:secret", links: [{ label: "Terminal", href: "/terminal" }] },
  ];
  const trivia: Surprise[] = TRIVIA.map((t) => {
    const src = resolveTopic(t.label, t.kind);
    return { text: `${lead(rng)} ${t.line}`, topic: `local:${t.label}`, sources: src ? [src] : undefined };
  });
  return [
    projects.map((p) => projectSurprise(p, rng)),
    seriesList.map((s) => ({
      text: `${lead(rng)} the ${s.title} collection. ${s.story ? `“${s.story}”` : ""}${s.gear ? ` Gear: ${s.gear}.` : ""}`.trim(),
      topic: `collection:${s.slug}`,
      links: [{ label: s.title, href: `/photography#${s.slug}` }],
    })),
    chatTools.map((t) => ({
      text: `${lead(rng)} try ${t.title}. ${fixFacts(t.blurb)}`,
      topic: t.id === "quote" ? "booking:how" : `tool:${t.id}`,
      cards: [starterFor(t.id, rng)],
    })),
    GAMES.map((g) => ({ text: `${lead(rng)} ${g.blurb}`, topic: `game:${g.id}`, links: [{ label: "Let's play", href: "/play" }] })),
    facts,
    trivia,
  ];
}

/**
 * Something interesting, picked at random: a project, a photo collection, a
 * Lab tool, a game, a fact about Neil, or an outside thing he's connected to.
 * Kinds are chosen evenly (so 15 projects don't drown out 3 games), and
 * recently visited topics are skipped.
 */
export function surprise(rng: Rng = Math.random, avoid: Iterable<string> = []): Surprise {
  const skip = new Set(avoid);
  const kinds = shuffle(buildSurprises(rng), rng);
  for (const kind of kinds) {
    const fresh = kind.filter((s) => !skip.has(s.topic));
    if (fresh.length) return pick(fresh, rng);
  }
  return pick(kinds[0], rng);
}

/* ------------------------------------------------------------------ */
/* Server spotlight                                                    */
/* ------------------------------------------------------------------ */

/**
 * A few items for the AI to favour in one conversation, so it doesn't open
 * with the same project every time. Seeded per conversation: steady within a
 * chat, different across chats.
 */
export function spotlight(seed: number): string[] {
  const rng = seeded(seed);
  const ps = sample(projects, 3, rng);
  const s = pick(seriesList, rng);
  const t = pick(chatTools, rng);
  const g = pick(GAMES, rng);
  return [
    ...ps.map((p) => `${p.title} (/work/${p.slug}): ${fixFacts(p.plain)}`),
    `The ${s.title} photo collection (/photography#${s.slug})`,
    `The ${t.title} in /lab`,
    `${g.title} in /play`,
  ];
}
