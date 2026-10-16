import { certificates, organizations } from "@/content/about";
import { seriesList } from "@/content/series";
import { services } from "@/content/sessions";
import { categories, projectBySlug, projects, type Category } from "@/content/work";
import type { ChatCard } from "@/lib/tools";
import { COLLECTION_WORDS, collectionSays, GAMES, serviceSays, TRIVIA } from "./catalog";
import { hash, mix, seeded, weightedIndex, type Rng } from "./random";

// The chips under NeilAI's replies. A big pool generated from the content
// files (so a new project or collection shows up here on its own), picked
// with a seeded shuffle: the page the visitor is on leads, the last answer's
// topic gets follow-ups, and one chip always wanders somewhere else.

export type Theme = "work" | "photo" | "about" | "lab" | "play" | "booking" | "fun" | "local";

export interface Suggestion {
  text: string;
  theme: Theme;
  /** e.g. "project:pathoscan", "collection:astro", "service:graduation", "tool:subnet", "local:Kamikazee". */
  topic: string;
}

export const THEMES: Theme[] = ["work", "photo", "about", "lab", "play", "booking", "fun", "local"];

const add = (out: Suggestion[], theme: Theme, topic: string, ...texts: (string | false | undefined)[]) => {
  for (const text of texts) if (text) out.push({ text, theme, topic });
};

function buildPool(): Suggestion[] {
  const out: Suggestion[] = [];

  // Work: every project, a few ways in.
  projects.forEach((p, i) => {
    const topic = `project:${p.slug}`;
    const media = p.category === "media";
    add(
      out,
      "work",
      topic,
      media ? (i % 2 ? `Tell me the story of ${p.title}` : `What was ${p.title}?`) : i % 2 ? `Tell me about ${p.title}` : `What's ${p.title}?`,
      `What did Neil do on ${p.title}?`,
      (p.team?.length ?? 0) > 2 && `Who was on the ${p.title} team?`,
      p.stack.length > 1 && (media ? `How was ${p.title} made?` : `What's ${p.title} built with?`),
      p.timeline && `How did ${p.title} grow across courses?`,
    );
  });
  for (const [c, meta] of Object.entries(categories) as [Category, (typeof categories)[Category]][]) {
    add(out, "work", `work:${c}`, `Show me his ${meta.label.toLowerCase()} projects`);
  }
  add(out, "work", "work:any", "Recommend a project to look at", "Which project should I see first?", "Show me something I haven't seen");

  // Photography: every collection.
  for (const s of seriesList) {
    const says = collectionSays(s.slug);
    add(out, "photo", `collection:${s.slug}`, `Show the ${says}`, s.story && `What's the story behind the ${says}?`, s.gear && `What gear did he use for the ${says}?`);
  }
  add(out, "photo", "photo:any", "What does Neil love to photograph?", "Which bands has he photographed?", "What's in his camera bag?");

  // Booking: every service, plus the questions people ask before paying.
  for (const svc of services) add(out, "booking", `service:${svc.id}`, `How much is ${serviceSays(svc.id)}?`);
  add(out, "booking", "service:graduation", "Quote a grad shoot for 4");
  add(out, "booking", "service:private", "Quote a 2-hour private shoot");
  add(out, "booking", "booking:how", "How do I book a shoot?");
  add(out, "booking", "booking:terms", "Is there a downpayment?", "Do I get the RAW files?");
  add(out, "booking", "booking:addons", "What add-ons can I get?");
  add(out, "booking", "booking:travel", "Can he shoot outside San Jose City?");
  add(out, "booking", "booking:web", "How much for a website?");
  add(out, "booking", "booking:contact", "How fast does Neil reply?", "Is he available for freelance work?");

  // About: school, orgs, certificates, skills, gear.
  add(out, "about", "about:who", "Who is Neil?", "Give me the 30-second version of Neil");
  add(out, "about", "about:education", "Where does Neil study?", "What's his major?", "Where did he go to high school?");
  for (const o of organizations.filter((o) => o.role !== "Student")) add(out, "about", "about:orgs", `What's ${o.short}?`);
  add(out, "about", "about:orgs", "What does a Production Director do?");
  for (const c of certificates) add(out, "about", "about:certificates", `Tell me about his ${c.title} certificate`);
  add(out, "about", "about:certificates", "What certificates does he have?", "Is he working towards CCNA?");
  add(out, "about", "about:skills", "What languages does he code in?", "What editing software does he use?");
  add(out, "about", "about:gear", "Canon or Nikon — what's his camera?");
  add(out, "about", "about:resume", "Can I see his résumé?");

  // The Lab: things NeilAI can actually run.
  add(out, "lab", "tool:subnet", "Subnet 192.168.1.0/26", "Subnet 10.0.0.0/22", "Break down 172.16.5.0/27", "Plan VLANs for 60, 25 and 12 hosts from 192.168.20.0/24", "Plan VLANs for 120, 50 and 20 hosts from 10.1.0.0/24");
  add(out, "lab", "tool:memory", "Best fit vs worst fit memory", "Show first fit memory allocation", "Next fit 100 300 200 / 150 90 210", "What is external fragmentation?");
  add(out, "lab", "tool:link", "Is gcash-verify-account.xyz safe?", "Is bit.ly/3promo safe?", "Is paypa1-secure-login.com legit?", "How do I spot a phishing link?");
  add(out, "lab", "tool:pathoscan", "Is 87% A. niger cleared?", "Would 95% A. flavus pass PathoScan?", "What happens at 89% confidence in PathoScan?");
  add(out, "lab", "tool:github", "Show his GitHub activity", "How's his coding streak?");
  add(out, "lab", "tool:whisper", "What's the Whisper tool?");
  add(out, "lab", "lab:any", "What tools can you run?");

  // Play.
  for (const g of GAMES) add(out, "play", `game:${g.id}`, `What's ${g.title}?`);
  add(out, "play", "play:any", "Let's play a game", "I'm bored — got a game?");

  // Fun & personality.
  add(out, "fun", "fun:hobbies", "What does Neil do for fun?", "What racing games does he play?", "What does he cook?", "Does he collect anything?", "Does he play baseball?", "Is he into PC hardware?");
  add(out, "fun", "fun:fact", "Tell me a fun fact about Neil");
  add(out, "fun", "fun:secret", "Is there a secret page on this site?");

  // Outside places, people and things (answered with learn_more chips).
  for (const t of TRIVIA) add(out, "local", `local:${t.label}`, t.prompt);

  // No duplicates, ever.
  return out.filter((s, i) => out.findIndex((x) => norm(x.text) === norm(s.text)) === i);
}

export const norm = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}%./]+/gu, " ").trim();

export const POOL: Suggestion[] = buildPool();

/** "project:pathoscan" → "work:web"; everything else groups by its prefix. */
export function familyOf(topic: string): string {
  const [kind, id] = topic.split(":");
  if (kind === "project") return `work:${projectBySlug(id)?.category ?? "any"}`;
  if (kind === "work") return `work:${id}`;
  if (kind === "collection" || kind === "photo") return "photo";
  if (kind === "service" || kind === "booking") return "booking";
  if (kind === "tool" || kind === "lab") return "lab";
  if (kind === "game" || kind === "play") return "play";
  return kind;
}

const LINKS: [string, string][] = [
  ["project:aurora-fest-2026", "collection:concerts"],
  ["project:ircite-2026", "collection:events"],
  ["project:it-fest", "collection:events"],
  ["project:it-week", "collection:events"],
  ["project:img-stratcom", "about:orgs"],
  ["project:it-fest", "about:orgs"],
  ["project:pathoscan", "about:certificates"],
  ["tool:subnet", "game:subnet-sprint"],
  ["tool:subnet", "about:certificates"],
  ["collection:concerts", "game:shutter"],
  ["collection:portraits", "service:studio"],
  ["collection:portraits", "service:private"],
  ["collection:events", "service:event"],
  ["about:gear", "photo:any"],
  ["about:who", "about:education"],
  ["fun:hobbies", "fun:fact"],
  ...projects.filter((p) => p.tool).map((p): [string, string] => [`project:${p.slug}`, `tool:${p.tool}`]),
  ...TRIVIA.map((t): [string, string] => [`local:${t.label}`, t.near]),
];

/** Topics directly connected to this one (a project and its Lab tool, a band and the concert shots…). */
export function relatedTopics(topic: string): string[] {
  return LINKS.flatMap(([a, b]) => (a === topic ? [b] : b === topic ? [a] : []));
}

export interface PageContext {
  themes: Theme[];
  topics: string[];
  /** The page's own subject (a project page's project): strongly favoured. */
  focus?: string;
}

/** What the visitor is looking at, as themes and topics to favour. */
export function pageContext(path: string): PageContext {
  const slug = path.match(/^\/work\/([^/?#]+)/)?.[1];
  if (slug && projectBySlug(slug)) {
    const topic = `project:${slug}`;
    return { themes: ["work"], topics: [topic, ...relatedTopics(topic)], focus: topic };
  }
  const first = `/${path.split(/[/?#]/)[1] ?? ""}`;
  switch (first) {
    case "/work":
      return { themes: ["work"], topics: ["work:any"] };
    case "/photography":
      return { themes: ["photo", "booking"], topics: ["photo:any"] };
    case "/about":
      return { themes: ["about", "fun"], topics: ["about:who"] };
    case "/resume":
      return { themes: ["about"], topics: ["about:resume", "about:certificates"] };
    case "/lab":
      return { themes: ["lab"], topics: ["lab:any"] };
    case "/play":
      return { themes: ["play", "lab"], topics: ["play:any"] };
    case "/contact":
    case "/bookings":
      return { themes: ["booking"], topics: ["booking:how", "booking:contact"] };
    case "/terminal":
      return { themes: ["fun", "lab"], topics: ["fun:secret"] };
    case "/":
      return { themes: ["work", "photo", "about"], topics: ["about:who"] };
    default:
      return { themes: [], topics: [] };
  }
}

export interface PickOptions {
  /** One per chat session (changes on every visit, opening and new chat). */
  seed: number;
  /** Which answer we're on; a new round, a new set. */
  round: number;
  path: string;
  /** Asked or recently shown: never offered again. */
  exclude?: Iterable<string>;
  /** The last answer's topic, for follow-ups. */
  topic?: string | null;
  count?: number;
  pool?: Suggestion[];
}

function pageWeight(s: Suggestion, ctx: PageContext) {
  if (ctx.focus === s.topic) return 120;
  if (ctx.topics.includes(s.topic)) return 12;
  if (ctx.themes.includes(s.theme)) return 4;
  return 1;
}

/** The lead chip on a fresh chat: on the page's themes, bar the odd surprise. */
const leadWeight = (s: Suggestion, ctx: PageContext) => (ctx.themes.length || ctx.topics.length ? (pageWeight(s, ctx) > 1 ? pageWeight(s, ctx) : 0.02) : 1);

function followWeight(s: Suggestion, topic: string) {
  if (s.topic === topic) return 14;
  if (relatedTopics(topic).includes(s.topic)) return 7;
  if (familyOf(s.topic) === familyOf(topic)) return 4;
  return 0;
}

/**
 * A fresh set of chips. Deterministic for the same options, so it's safe to
 * call while rendering; pass a new seed (or round) for a new set.
 *
 * Slot 1 leads with a follow-up to the last topic (or, at the start, the
 * page); slot 2 favours the page; the last slot explores a theme the others
 * didn't touch. Never two chips on one topic, never anything excluded.
 */
export function pickSuggestions(opts: PickOptions): Suggestion[] {
  const { seed, round, path, topic = null, count = 3, pool = POOL } = opts;
  const rng: Rng = seeded(mix(seed, round, hash(path), hash(topic ?? "")));
  const ctx = pageContext(path);
  const excluded = new Set([...(opts.exclude ?? [])].map(norm));

  let candidates = pool.filter((s) => !excluded.has(norm(s.text)));
  if (candidates.length < count * 3) candidates = pool; // Seen nearly everything: start over rather than go quiet.

  const chosen: Suggestion[] = [];
  const take = (weightOf: (s: Suggestion) => number) => {
    const open = candidates.filter((s) => !chosen.some((c) => c.topic === s.topic || c.text === s.text));
    // Spread themes out: a theme already on screen is much less likely again.
    const weights = open.map((s) => weightOf(s) * (chosen.some((c) => c.theme === s.theme) ? 0.15 : 1));
    const i = weightedIndex(weights, rng);
    if (i >= 0) chosen.push(open[i]);
    else if (open.length) chosen.push(open[Math.floor(rng() * open.length)]);
  };

  for (let slot = 0; slot < count; slot++) {
    const last = slot === count - 1 && count > 1;
    if (last) {
      // The wanderer: a theme nobody's on yet (and not the page's), chosen evenly.
      const unused = (t: Theme) => !chosen.some((c) => c.theme === t) && candidates.some((s) => s.theme === t && !chosen.some((c) => c.topic === s.topic));
      const fresh = THEMES.filter((t) => unused(t) && !ctx.themes.includes(t));
      const themes = fresh.length ? fresh : THEMES.filter(unused);
      const theme = themes[Math.floor(rng() * themes.length)];
      take((s) => (s.theme === theme ? 1 : 0));
    } else if (slot === 0 && topic) {
      take((s) => followWeight(s, topic) || 0.01 * pageWeight(s, ctx));
    } else if (slot === 0) {
      take((s) => leadWeight(s, ctx));
    } else {
      take((s) => pageWeight(s, ctx) * (topic ? 1 + followWeight(s, topic) / 7 : 1));
    }
  }
  return chosen;
}

const CARD_TOPIC: Partial<Record<ChatCard["kind"], string>> = {
  subnet: "tool:subnet",
  vlsm: "tool:subnet",
  memory: "tool:memory",
  link: "tool:link",
  pathoscan: "tool:pathoscan",
  github: "tool:github",
};

/** What a question (or an answer's cards) was about, so the next chips can follow up. */
export function topicOf(text: string, cards: ChatCard[] = []): string | null {
  const exact = POOL.find((s) => norm(s.text) === norm(text));
  if (exact) return exact.topic;

  for (const card of cards) {
    if (card.kind === "project") return `project:${card.slug}`;
    if (card.kind === "collection") return `collection:${card.slug}`;
    if (card.kind === "quote") return `service:${card.service}`;
    const t = CARD_TOPIC[card.kind];
    if (t) return t;
  }

  const lower = text.toLowerCase();
  const project = projects.find((p) => lower.includes(p.title.toLowerCase()));
  if (project) return `project:${project.slug}`;
  const trivia = TRIVIA.find((t) => t.names.test(text));
  if (trivia) return `local:${trivia.label}`;
  const game = GAMES.find((g) => g.test.test(text));
  if (game) return `game:${game.id}`;
  const collection = Object.entries(COLLECTION_WORDS).find(([, re]) => re.test(text));
  if (collection) return `collection:${collection[0]}`;
  if (/\b(how much|price|rate|book|shoot|package|downpayment)\b/i.test(text)) return "booking:how";
  if (/\b(certif|ccna|security\+)/i.test(text)) return "about:certificates";
  if (/\b(school|study|clsu|major|course)\b/i.test(text)) return "about:education";
  if (/\b(hobb|fun|f1|cook|baseball|die-?cast)/i.test(text)) return "fun:hobbies";
  return null;
}
