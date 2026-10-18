import { organizations } from "@/content/about";
import { seriesList } from "@/content/series";
import { services } from "@/content/sessions";
import { categories, projectBySlug, projects, type Category } from "@/content/work";
import { chatTools, tools, type ChatCard } from "@/lib/tools";
import { COLLECTION_WORDS, collectionSays, GAMES, serviceSays, TRIVIA } from "./catalog";
import { certificateFacts } from "./facts";
import { hash, mix, seeded, weightedIndex, type Rng } from "./random";

// The chips under NeilAI's replies. A big pool generated from the content
// files (so a new project or collection shows up here on its own), picked
// with a seeded, weighted draw.
//
// Why it's built this way (measured, see suggest.test.ts): chips used to
// repeat in three ways. The same few question templates ("What did Neil do
// on X?") filled most of the pool; follow-ups kept drilling into the topic
// just asked; and nothing was remembered between visits. So now every chip
// belongs to an intent (topic + template) with a few phrasings, themes are
// balanced however many chips they have, the opening chip rotates theme and
// template from one opening to the next, follow-ups lean to related topics,
// and what was shown lately (across visits, with decay) is held back.

export type Theme = "work" | "photo" | "about" | "lab" | "play" | "booking" | "fun" | "local";

export interface Suggestion {
  text: string;
  theme: Theme;
  /** e.g. "project:pathoscan", "collection:astro", "service:graduation", "tool:subnet", "local:Kamikazee". */
  topic: string;
  /** The question's shape, shared across topics: "project.role", "collection.gear"… One-offs use their topic. */
  template: string;
}

/** What a chip asks, whatever the wording: two phrasings of one question share a key. */
export const intentOf = (s: Pick<Suggestion, "topic" | "template">) => `${s.topic}|${s.template}`;

export const THEMES: Theme[] = ["work", "photo", "about", "lab", "play", "booking", "fun", "local"];

const add = (out: Suggestion[], theme: Theme, topic: string, template: string, ...texts: (string | false | undefined)[]) => {
  for (const text of texts) if (text) out.push({ text, theme, topic, template });
};

/** Short, sayable name for a certificate ("The Art of Becoming: RStudio for Data Analysis" → "RStudio for Data Analysis"). */
const certSays = (title: string) => title.split(": ").pop()!;

function buildPool(): Suggestion[] {
  const out: Suggestion[] = [];

  // Work: every project, several questions, each in a few phrasings.
  for (const p of projects) {
    const topic = `project:${p.slug}`;
    const media = p.category === "media";
    const t = p.title;
    add(out, "work", topic, "project.overview", ...(media ? [`What was ${t}?`, `Tell me the story of ${t}`, `Walk me through ${t}`] : [`What's ${t}?`, `Tell me about ${t}`, `Explain ${t} simply`]));
    add(out, "work", topic, "project.role", `What did Neil do on ${t}?`, `What was Neil's part in ${t}?`, `How did Neil contribute to ${t}?`);
    if ((p.team?.length ?? 0) > 2) add(out, "work", topic, "project.team", `Who was on the ${t} team?`, `Who did Neil work with on ${t}?`);
    if (p.stack.length > 1) add(out, "work", topic, "project.stack", ...(media ? [`How was ${t} made?`, `What gear went into ${t}?`] : [`What's ${t} built with?`, `What tech is behind ${t}?`]));
    if (p.timeline) add(out, "work", topic, "project.timeline", `How did ${t} grow across courses?`, `How did ${t} evolve over time?`);
    add(out, "work", topic, "project.status", `Where does ${t} stand now?`, `What's the status of ${t}?`);
  }
  for (const [c, meta] of Object.entries(categories) as [Category, (typeof categories)[Category]][]) {
    add(out, "work", `work:${c}`, "work.category", `Show me his ${meta.label.toLowerCase()} projects`, `What ${meta.label.toLowerCase()} work has he done?`);
  }
  add(out, "work", "work:any", "work.recommend", "Recommend a project to look at", "Which project should I see first?", "Show me something I haven't seen");

  // Photography: every collection.
  for (const s of seriesList) {
    const topic = `collection:${s.slug}`;
    const says = collectionSays(s.slug);
    add(out, "photo", topic, "collection.show", `Show the ${says}`, `Can I see the ${says}?`);
    if (s.story) add(out, "photo", topic, "collection.story", `What's the story behind the ${says}?`, `What are the ${says} about?`);
    if (s.gear && /forza|game/i.test(s.gear)) add(out, "photo", topic, "collection.gear", `Which games are the ${says} from?`);
    else if (s.gear) add(out, "photo", topic, "collection.gear", `What gear did he use for the ${says}?`, `What camera shot the ${says}?`);
  }
  add(out, "photo", "photo:any", "photo.love", "What does Neil love to photograph?", "What kind of photos does Neil take?");
  add(out, "photo", "photo:bands", "photo.bands", "Which bands has he photographed?", "Who has Neil shot live?");
  add(out, "photo", "photo:bag", "photo.bag", "What's in his camera bag?");
  add(out, "photo", "photo:new", "photo.new", "What's new in his photography?");

  // Booking: every service, plus the questions people ask before paying.
  for (const svc of services) add(out, "booking", `service:${svc.id}`, "service.price", `How much is ${serviceSays(svc.id)}?`, `What does ${serviceSays(svc.id)} cost?`);
  add(out, "booking", "service:graduation", "service.group", "Quote a grad shoot for 4");
  add(out, "booking", "service:private", "service.hours", "Quote a 2-hour private shoot");
  add(out, "booking", "booking:how", "booking.how", "How do I book a shoot?", "How does booking a shoot work?");
  add(out, "booking", "booking:terms", "booking.downpayment", "Is there a downpayment?");
  add(out, "booking", "booking:terms", "booking.raw", "Do I get the RAW files?");
  add(out, "booking", "booking:addons", "booking.addons", "What add-ons can I get?", "What extras can I add to a shoot?");
  add(out, "booking", "booking:hmua", "booking.hmua", "Can I add hair & makeup to a shoot?");
  add(out, "booking", "booking:travel", "booking.travel", "Can he shoot outside San Jose City?", "Does Neil travel for shoots?");
  add(out, "booking", "booking:web", "booking.web", "How much for a website?", "How is web work priced?");
  add(out, "booking", "booking:hosting", "booking.hosting", "Who handles hosting for a website?");
  add(out, "booking", "booking:contact", "booking.reply", "How fast does Neil reply?");
  add(out, "booking", "booking:contact", "booking.available", "Is he available for freelance work?", "Can I hire Neil?");

  // About: school, orgs, certificates, skills, gear.
  add(out, "about", "about:who", "about.who", "Who is Neil?", "Give me the 30-second version of Neil", "Introduce Neil to me");
  add(out, "about", "about:education", "about.study", "Where does Neil study?", "What year is Neil in?");
  add(out, "about", "about:education", "about.major", "What's his major?");
  add(out, "about", "about:education", "about.highschool", "Where did he go to high school?", "Where did Neil do senior high?");
  for (const o of organizations.filter((o) => o.role !== "Student")) add(out, "about", "about:orgs", `about.org.${o.short}`, `What's ${o.short}?`);
  add(out, "about", "about:orgs", "about.director", "What does a Production Director do?");
  for (const c of certificateFacts) add(out, "about", "about:certificates", `about.cert.${hash(c.title)}`, `Tell me about his ${certSays(c.title)} certificate`);
  add(out, "about", "about:certificates", "about.certs", "What certificates does he have?", "What's his newest certificate?");
  add(out, "about", "about:certificates", "about.ccna", "Is he working towards CCNA?");
  add(out, "about", "about:skills", "about.code", "What languages does he code in?");
  add(out, "about", "about:skills", "about.editing", "What editing software does he use?");
  add(out, "about", "about:skills", "about.toolkit", "What's in his web toolkit?");
  add(out, "about", "about:gear", "about.camera", "Canon or Nikon — what's his camera?");
  add(out, "about", "about:resume", "about.resume", "Can I see his résumé?", "Where's his résumé?");

  // The Lab: things NeilAI can actually run.
  add(out, "lab", "tool:subnet", "tool.subnet", "Subnet 192.168.1.0/26", "Subnet 10.0.0.0/22", "Break down 172.16.5.0/27");
  add(out, "lab", "tool:subnet", "tool.vlsm", "Plan VLANs for 60, 25 and 12 hosts from 192.168.20.0/24", "Plan VLANs for 120, 50 and 20 hosts from 10.1.0.0/24");
  add(out, "lab", "tool:memory", "tool.memory.compare", "Best fit vs worst fit memory", "Show first fit memory allocation", "Next fit 100 300 200 / 150 90 210");
  add(out, "lab", "tool:memory", "tool.memory.explain", "What is external fragmentation?");
  add(out, "lab", "tool:link", "tool.link.check", "Is gcash-verify-account.xyz safe?", "Is bit.ly/3promo safe?", "Is paypa1-secure-login.com legit?");
  add(out, "lab", "tool:link", "tool.link.tips", "How do I spot a phishing link?");
  add(out, "lab", "tool:pathoscan", "tool.pathoscan", "Is 87% A. niger cleared?", "Would 95% A. flavus pass PathoScan?", "What happens at 89% confidence in PathoScan?");
  add(out, "lab", "tool:pathoscan", "tool.pathoscan.why", "Why does PathoScan use a 90% threshold?");
  add(out, "lab", "tool:github", "tool.github", "Show his GitHub activity", "How's his coding streak?");
  // Lab tools that only run on the Lab page: asked about, not run.
  for (const t of tools.filter((t) => !chatTools.some((c) => c.id === t.id))) add(out, "lab", `tool:${t.id}`, "tool.lab", `What does the ${t.title} in the Lab do?`);
  add(out, "lab", "lab:any", "lab.any", "What tools can you run?", "What can you do in this chat?");

  // Play.
  for (const g of GAMES) add(out, "play", `game:${g.id}`, "game.what", `What's ${g.title}?`, `How do I play ${g.title}?`);
  add(out, "play", "play:any", "play.any", "Let's play a game", "I'm bored — got a game?", "What games are on this site?");

  // Fun & personality.
  add(out, "fun", "fun:hobbies", "fun.hobbies", "What does Neil do for fun?", "What's Neil like off the clock?");
  add(out, "fun", "fun:racing", "fun.racing", "What racing games does he play?");
  add(out, "fun", "fun:cooking", "fun.cooking", "What does he cook?");
  add(out, "fun", "fun:collecting", "fun.collecting", "Does he collect anything?", "What's in Neil's die-cast collection?");
  add(out, "fun", "fun:baseball", "fun.baseball", "Does he play baseball?");
  add(out, "fun", "fun:hardware", "fun.hardware", "Is he into PC hardware?");
  add(out, "fun", "fun:fact", "fun.fact", "Tell me a fun fact about Neil");
  add(out, "fun", "fun:secret", "fun.secret", "Is there a secret page on this site?");

  // Outside places, people and things (answered with vetted learn_more chips).
  for (const t of TRIVIA) add(out, "local", `local:${t.label}`, `local.${t.kind}`, t.prompt);

  // No duplicates, ever.
  return out.filter((s, i) => out.findIndex((x) => norm(x.text) === norm(s.text)) === i);
}

export const norm = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}%./]+/gu, " ").trim();

export const POOL: Suggestion[] = buildPool();

const byText = new Map(POOL.map((s) => [norm(s.text), s]));

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
  ["project:aurora-fest-2026", "photo:bands"],
  ["project:ircite-2026", "collection:events"],
  ["project:it-fest", "collection:events"],
  ["project:it-week", "collection:events"],
  ["project:img-stratcom", "about:orgs"],
  ["project:it-fest", "about:orgs"],
  ["project:pathoscan", "about:certificates"],
  ["project:student-information-system", "about:skills"],
  ["project:eco-fashion", "booking:web"],
  ["booking:web", "booking:hosting"],
  ["tool:subnet", "game:packet-check"],
  ["tool:subnet", "about:certificates"],
  ["collection:concerts", "game:shutter"],
  ["collection:concerts", "photo:bands"],
  ["collection:portraits", "service:studio"],
  ["collection:portraits", "service:private"],
  ["collection:portraits", "booking:hmua"],
  ["collection:events", "service:event"],
  ["collection:photo-mode", "fun:racing"],
  ["collection:photo-mode", "photo:new"],
  ["service:private", "booking:hmua"],
  ["service:private", "booking:addons"],
  ["booking:how", "booking:terms"],
  ["about:gear", "photo:bag"],
  ["photo:bag", "photo:any"],
  ["about:who", "about:education"],
  ["about:who", "fun:hobbies"],
  ["fun:hobbies", "fun:fact"],
  ["fun:racing", "game:bay-street-circuit"],
  ["fun:hardware", "fun:collecting"],
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
      return { themes: ["photo", "booking"], topics: ["photo:any", "photo:new"] };
    case "/about":
      // The About page has his story, school, orgs, kit and portraits: background, fun and photo questions all fit.
      return { themes: ["about", "fun", "photo"], topics: ["about:who", "photo:bag"] };
    case "/resume":
      return { themes: ["about"], topics: ["about:resume", "about:certificates"] };
    case "/lab":
      return { themes: ["lab"], topics: ["lab:any"] };
    case "/play":
      return { themes: ["play", "lab"], topics: ["play:any"] };
    case "/contact":
    case "/bookings":
    case "/services":
      return { themes: ["booking"], topics: ["booking:how", "booking:contact", "booking:web"] };
    case "/terminal":
      return { themes: ["fun", "lab"], topics: ["fun:secret"] };
    case "/":
      return { themes: ["work", "photo", "about"], topics: ["about:who"] };
    default:
      return { themes: [], topics: [] };
  }
}

/** One chip as remembered between deals. */
export type ChipMeta = Pick<Suggestion, "topic" | "theme" | "template">;

/** What was shown before: recent deals (this visit and earlier ones) and how often each intent came up. */
export interface ChipHistory {
  /** Recent deals, oldest first, each in on-screen order (the lead first). */
  deals?: ChipMeta[][];
  /** Intent → times shown, and when last (ms since epoch). */
  shown?: Record<string, { n: number; t: number }>;
  /** "Now", for the decay: passed in so picking stays deterministic. */
  now?: number;
}

export interface PickOptions {
  /** One per chat session (changes on every visit, opening and new chat). */
  seed: number;
  /** Which answer we're on; a new round, a new set. */
  round: number;
  path: string;
  /** Asked or recently shown, as chip texts or intents: never offered again. */
  exclude?: Iterable<string>;
  /** The last answer's topic, for follow-ups. */
  topic?: string | null;
  history?: ChipHistory;
  count?: number;
  pool?: Suggestion[];
}

/** A shown chip's pull halves every 36 hours. */
export const HALF_LIFE_MS = 36 * 3_600_000;

function pageWeight(s: Suggestion, ctx: PageContext) {
  if (ctx.focus === s.topic) return 120;
  if (ctx.topics.includes(s.topic)) return 12;
  if (ctx.themes.includes(s.theme)) return 4;
  return 1;
}

/** The lead chip on a fresh chat: on the page's themes, bar the odd surprise. */
const leadWeight = (s: Suggestion, ctx: PageContext) => (ctx.themes.length || ctx.topics.length ? (pageWeight(s, ctx) > 1 ? pageWeight(s, ctx) : 0.02) : 1);

/** Follow-ups: related topics first, the same topic a little (a different question about it), the same family less. */
function followWeight(s: Suggestion, topic: string) {
  if (relatedTopics(topic).includes(s.topic)) return 9;
  if (s.topic === topic) return 6;
  if (familyOf(s.topic) === familyOf(topic)) return 3;
  return 0;
}

/** Each theme and each intent gets an equal say, however many chips it has. */
function balance(pool: Suggestion[]) {
  const perIntent = new Map<string, number>();
  const intentsPerTheme = new Map<Theme, Set<string>>();
  for (const s of pool) {
    const k = intentOf(s);
    perIntent.set(k, (perIntent.get(k) ?? 0) + 1);
    if (!intentsPerTheme.has(s.theme)) intentsPerTheme.set(s.theme, new Set());
    intentsPerTheme.get(s.theme)!.add(k);
  }
  const avg = [...intentsPerTheme.values()].reduce((n, set) => n + set.size, 0) / Math.max(1, intentsPerTheme.size);
  // Square root: big themes still get a little more room than tiny ones, just not 10x more.
  return (s: Suggestion) => 1 / perIntent.get(intentOf(s))! / Math.sqrt(intentsPerTheme.get(s.theme)!.size / avg);
}

const BALANCE = balance(POOL);

/** How much an intent shown before still holds a chip back: 1 = not at all. */
function decay(s: Suggestion, history: ChipHistory) {
  const seen = history.shown?.[intentOf(s)];
  if (!seen || history.now === undefined) return 1;
  const fade = Math.pow(0.5, Math.max(0, history.now - seen.t) / HALF_LIFE_MS);
  return 1 / (1 + 1.5 * seen.n * fade);
}

/**
 * A fresh set of chips. Deterministic for the same options, so it's safe to
 * call while rendering; pass a new seed (or round) for a new set.
 *
 * Slot 1 leads with a follow-up to the last topic (or, at the start, the
 * page), never on the same topic, theme or template as the last lead; slot
 * 2 favours the page; the last slot explores a theme the others (and the
 * last wanderer) didn't touch. Never two chips on one topic or template,
 * never anything excluded, and recently shown intents fade back in slowly.
 */
export function pickSuggestions(opts: PickOptions): Suggestion[] {
  const { seed, round, path, topic = null, count = 3, pool = POOL, history = {} } = opts;
  const rng: Rng = seeded(mix(seed, round, hash(path), hash(topic ?? "")));
  const ctx = pageContext(path);
  const balanceOf = pool === POOL ? BALANCE : balance(pool);

  // Excluded texts also exclude their intent: a rephrasing of a shown chip is still a repeat.
  const excluded = new Set<string>();
  for (const x of opts.exclude ?? []) {
    excluded.add(x.includes("|") ? x : norm(x));
    const known = byText.get(norm(x));
    if (known) excluded.add(intentOf(known));
  }
  const allowed = (s: Suggestion) => !excluded.has(norm(s.text)) && !excluded.has(intentOf(s));

  let candidates = pool.filter(allowed);
  // Seen nearly everything: start over (minus what's on the last deal) rather than go quiet.
  if (candidates.length < count * 3) {
    const last = new Set((history.deals?.at(-1) ?? []).map(intentOf));
    candidates = pool.filter((s) => !last.has(intentOf(s)));
  }

  const prev = history.deals?.at(-1) ?? [];
  const prevLead = prev[0];
  const prevTemplates = new Set(prev.map((m) => m.template));
  const prevTopics = new Set(prev.map((m) => m.topic));
  const prevWanderer = prev.length > 1 ? prev[prev.length - 1].theme : undefined;
  // Drilled into this topic last time already? Then lean away from it now.
  const drilled = topic && prevLead?.topic === topic;
  // Several page themes to rotate through? Then the lead never repeats the last lead's theme.
  const rotate = ctx.themes.length > 1;

  // How much each question shape has been seen lately (any topic), so no one shape takes over.
  const shapes = new Map<string, number>();
  for (const [key, seen] of Object.entries(history.shown ?? {})) {
    const template = key.slice(key.indexOf("|") + 1);
    const fade = history.now === undefined ? 0 : Math.pow(0.5, Math.max(0, history.now - seen.t) / HALF_LIFE_MS);
    shapes.set(template, (shapes.get(template) ?? 0) + seen.n * fade);
  }

  const chosen: Suggestion[] = [];
  const base = (s: Suggestion) =>
    balanceOf(s) *
    decay(s, history) *
    (1 / (1 + 0.6 * (shapes.get(s.template) ?? 0))) *
    (prevTemplates.has(s.template) ? 0.3 : 1) *
    (prevTopics.has(s.topic) && s.topic !== topic ? 0.35 : 1);
  /** Draws one chip; each weighting is tried in turn until one has anything to offer. */
  const take = (...weightings: ((s: Suggestion) => number)[]) => {
    const open = candidates.filter((s) => !chosen.some((c) => c.topic === s.topic || c.text === s.text || c.template === s.template));
    for (const weightOf of weightings) {
      // Spread themes out: a theme already on screen is much less likely again.
      const weights = open.map((s) => weightOf(s) * base(s) * (chosen.some((c) => c.theme === s.theme) ? 0.15 : 1));
      const i = weightedIndex(weights, rng);
      if (i >= 0) return void chosen.push(open[i]);
    }
    if (open.length) chosen.push(open[Math.floor(rng() * open.length)]);
  };
  const notLikeLastLead = (s: Suggestion) => (!prevLead ? 1 : (s.topic === prevLead.topic ? 0.05 : 1) * (s.template === prevLead.template ? 0.2 : 1));
  /** With several page themes, the opening chip never repeats the last opening's theme. */
  const newTheme = (s: Suggestion) => (prevLead && (s.topic === prevLead.topic || s.template === prevLead.template || (rotate && s.theme === prevLead.theme)) ? 0 : 1);

  for (let slot = 0; slot < count; slot++) {
    const last = slot === count - 1 && count > 1;
    if (last) {
      // The wanderer: a theme nobody's on yet (not the page's, not the last wanderer's), chosen evenly.
      const unused = (t: Theme) => !chosen.some((c) => c.theme === t) && candidates.some((s) => s.theme === t && !chosen.some((c) => c.topic === s.topic));
      const tiers = [THEMES.filter((t) => unused(t) && !ctx.themes.includes(t) && t !== prevWanderer), THEMES.filter((t) => unused(t) && !ctx.themes.includes(t)), THEMES.filter(unused)];
      const themes = tiers.find((t) => t.length) ?? [];
      const theme = themes[Math.floor(rng() * themes.length)];
      take((s) => (s.theme === theme ? 1 : 0));
    } else if (slot === 0 && topic) {
      const follow = (s: Suggestion) => (followWeight(s, topic) || 0.01 * pageWeight(s, ctx)) * (drilled && s.topic === topic ? 0.15 : 1) * notLikeLastLead(s) ** 0.5;
      // Never the same question shape as the last lead, if anything else fits.
      take((s) => (prevLead && s.template === prevLead.template ? 0 : follow(s)), follow);
    } else if (slot === 0) {
      // Page themes first (never the last lead's), then anything on the page, then anything at all.
      take(
        (s) => (pageWeight(s, ctx) > 1 || !(ctx.themes.length || ctx.topics.length) ? leadWeight(s, ctx) * notLikeLastLead(s) * newTheme(s) : 0),
        (s) => leadWeight(s, ctx) * notLikeLastLead(s),
      );
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
  const exact = byText.get(norm(text));
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
