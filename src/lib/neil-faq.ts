// Offline brain for NeilAI: answers common questions locally, so the chat is
// useful (and instant) even when the Gemini API is unavailable. Every answer
// is built from the content files (and the owner's corrections in
// neilai/facts.ts), and most come in a few phrasings, picked at random, so
// the same question doesn't always get the same canned line.
//
// Answers aim to be helpful, not terse: a direct first line, then a few
// specifics (often a short "- " list, **bold** for key names), then a
// natural follow-up. The chat renders that small markdown subset safely.

import { education, inProgress, interests, organizations, toolkit } from "@/content/about";
import { seriesList } from "@/content/series";
import { addOns, bookingSteps, bookingTerms, services } from "@/content/sessions";
import { categories, projectBySlug, projects, type Category, type Project } from "@/content/work";
import { COLLECTION_WORDS, collectionSays, GAMES, TRIVIA } from "@/lib/neilai/catalog";
import { certificateFacts, fixFacts, gearList, HOW_NEIL_WORKS, PATHOSCAN_THRESHOLD, PRICING, THIRD_PARTIES } from "@/lib/neilai/facts";
import { detectCards, introFor } from "@/lib/neilai/intents";
import { pick, sample, shuffle, type Rng } from "@/lib/neilai/random";
import { googleSearch, hostOf, resolveTopic, type Source } from "@/lib/neilai/sources";
import { POOL } from "@/lib/neilai/suggest";
import { site } from "@/lib/site";
import { chatTools, toolById, tools, type ChatCard } from "@/lib/tools";

type Link = { label: string; href: string };

export interface FaqAnswer {
  text: string;
  links?: Link[];
  cards?: ChatCard[];
  sources?: Source[];
}

interface Ctx {
  rng: Rng;
  /** The project page the visitor is on, if any. */
  here?: Project;
}

const one = (ctx: Ctx, ...options: string[]) => pick(options, ctx.rng);
const list = (items: string[]) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`);
const bullets = (items: string[]) => items.map((i) => `- ${i}`).join("\n");
/** "Lead designer" → "lead designer", but "UI/UX" and "CLSU" keep their capitals. */
const lowerFirst = (s: string) => (/^[A-Z][A-Z/&]/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1));
const workLink = (p: Project): Link => ({ label: p.title, href: `/work/${p.slug}` });
const nameOnly = (member: string) => member.split(" — ")[0];
const priceOf = (amount: number) => `₱${amount.toLocaleString("en-US")}`;

/** The first sentence of a project's write-up, if it's in the third person (some are in Neil's own voice). */
function firstLine(p: Project): string | null {
  const s = fixFacts(p.body[0] ?? "").match(/^.+?[.!?](?=\s|$)/)?.[0];
  return s && !/\b(I|my|we|our|us)\b/.test(s) && s.length < 260 ? s : null;
}

/** A different project to recommend, preferring the same kind of work. */
function another(ctx: Ctx, not: Project[], category?: Category): Project | undefined {
  const rest = projects.filter((p) => !not.includes(p));
  const same = rest.filter((p) => p.category === category);
  return pick(same.length && ctx.rng() < 0.7 ? same : rest, ctx.rng);
}

/** A closing question about the project that wasn't just answered. */
function projectFollowUp(p: Project, asked: string, ctx: Ctx): string {
  const options = [
    asked !== "team" && (p.team?.length ?? 0) > 2 && `Want to know who Neil built it with?`,
    asked !== "stack" && p.stack.length > 1 && (p.category === "media" ? "Curious how it was made?" : "Curious what it's built with?"),
    asked !== "role" && "Want the details of Neil's part in it?",
    asked !== "timeline" && p.timeline && "Want to see how it grew over time?",
    p.tool && (chatTools.some((t) => t.id === p.tool) ? `Or try its tool, ${toolById(p.tool).title}, right here in the chat.` : `Or try its tool in the Lab: ${toolById(p.tool).title}.`),
  ].filter((x): x is string => !!x);
  return options.length ? pick(options, ctx.rng) : "Want a similar project next?";
}

/** Questions about one project: overview, team, stack, role, status or how it grew. */
function projectAnswer(p: Project, q: string, ctx: Ctx): FaqAnswer {
  const media = p.category === "media";
  const plain = fixFacts(p.plain);
  const line = firstLine(p);
  let text: string;
  let asked = "overview";
  if (/\b(team|who (else )?(was|worked|built|made)|members?|groupmates?|with whom|work(ed)? with|built? .* with\?)\b/i.test(q) && !/\b(built with|made with)\b(?! on)/i.test(q.replace(/work(ed)? with/i, ""))) {
    asked = "team";
    text = p.team?.length
      ? `${one(ctx, `**${p.title}** was a team effort, ${p.team.length} people in all:`, `Here's the **${p.title}** crew:`)}\n\n${bullets(p.team.map((m) => (/neil jacob santiago/i.test(m) ? `**${m}**` : m)))}\n\nNeil's own part: ${lowerFirst(p.role)}.`
      : `The project page doesn't list a team for **${p.title}**. Neil's role there was ${lowerFirst(p.role)} (${p.context}).`;
  } else if (/\b(grow|grew|evolve|timeline|across courses|stages?|over time)\b/i.test(q) && p.timeline) {
    asked = "timeline";
    text = `**${p.title}** grew across ${p.timeline.length} ${p.timeline.length === 1 ? "stage" : "stages"}:\n\n${p.timeline.map((t, i) => `${i + 1}. **${t.course}** (${t.stage}): ${t.detail}`).join("\n")}`;
  } else if (/\b(stand now|status|turn(ed)? out|where is .* now|outcome)\b/i.test(q)) {
    asked = "status";
    text = `${one(ctx, `Status of **${p.title}**:`, `Where **${p.title}** stands:`)} **${p.status}**. It's from ${p.context}, and Neil's role was ${lowerFirst(p.role)}.\n\nIn short: ${plain}`;
  } else if (/\b(built with|stack|tech|made|gear|languages?|framework|how was|went into)\b/i.test(q)) {
    asked = "stack";
    text = `${one(ctx, `**${p.title}** ${media ? "was made with" : "is built with"}:`, `The toolkit behind **${p.title}**:`)}\n\n${bullets(p.stack)}\n\n${line ?? plain}`;
  } else if (/\b(neil do|did (he|neil) do|his (role|part)|neil's part|part in|role|contribut|responsib)\b/i.test(q)) {
    asked = "role";
    text = `${one(ctx, `On **${p.title}**, Neil's role was **${lowerFirst(p.role)}**.`, `Neil's part in **${p.title}**: **${lowerFirst(p.role)}**.`)} ${plain}\n\n${bullets(
      [
        `**Context:** ${p.context}`,
        (p.team?.length ?? 0) > 1 ? `**Team:** ${p.team!.length} people, including ${list(p.team!.filter((m) => !/neil jacob santiago/i.test(m)).slice(0, 2).map(nameOnly))}` : "",
        `**Status:** ${p.status}`,
      ].filter(Boolean),
    )}`;
  } else {
    text = `${one(ctx, `**${p.title}**: ${plain}`, `${plain} That's **${p.title}**.`, `In one line, **${p.title}** is this: ${plain}`)}${line ? `\n\n${line}` : ""}\n\n${bullets([
      `**Neil's role:** ${p.role}`,
      `**Context:** ${p.context}`,
      p.stack.length ? `**${media ? "Made with" : "Built with"}:** ${p.stack.length > 4 ? `${p.stack.slice(0, 4).join(", ")} and more` : list(p.stack)}` : "",
      `**Status:** ${p.status}`,
    ].filter(Boolean))}`;
  }

  const links: Link[] = [workLink(p)];
  if (p.tool) links.push({ label: `Try ${toolById(p.tool).title}`, href: `/lab#${p.tool}` });
  // "You might also like", rotating through everything rather than the home page's favourites.
  let close = projectFollowUp(p, asked, ctx);
  if (ctx.rng() < 0.5) {
    const next = another(ctx, [p], p.category);
    if (next) {
      close = one(ctx, `If you like it, **${next.title}** is worth a look too.`, `Next up, maybe **${next.title}**?`, `You might also like **${next.title}**.`);
      links.push(workLink(next));
    }
  }
  return { text: `${text}\n\n${close}`, links, cards: [{ kind: "project", slug: p.slug }] };
}

/** Collections that got new frames lately (alongside the brand-new Photo Mode). */
const FRESH = new Set(["astro", "concerts", "events", "everyday", "landscapes", "portraits"]);

/** One collection: its story, gear and where to see it. */
function collectionAnswer(slug: string, q: string, ctx: Ctx): FaqAnswer {
  const s = seriesList.find((x) => x.slug === slug)!;
  const link = { label: s.title, href: `/photography#${s.slug}` };
  const aurora = projectBySlug("aurora-fest-2026");
  const story = s.story ? s.story.replace(/\bmy direction\b/, "Neil's direction").replace(/\bI\b/g, "Neil") : `Neil's ${s.title} collection.`;
  const fresh = slug === "photo-mode" ? " It's the newest collection on the site." : FRESH.has(slug) ? " It's had new frames added recently, too." : "";
  if (/\b(gear|camera|lens|shot on|shot the|equipment|use|games?)\b/i.test(q) && s.gear) {
    const kit = s.gear.split(" · ");
    return {
      text: `${slug === "photo-mode" ? `**${s.title}** is virtual photography, made with:` : one(ctx, `For the ${collectionSays(slug)}, the kit is:`, `The kit behind **${s.title}**:`)}\n\n${bullets(kit)}\n\n${story}${slug === "photo-mode" ? "" : " Want the full list of his cameras?"}`,
      links: [link, { label: "All his gear", href: "/about#gear" }],
    };
  }
  if (slug === "concerts" && aurora) {
    const lineup = aurora.body.join(" ").match(/lineup ran ([^.]+)\./)?.[1];
    return {
      text: `${one(ctx, "Concerts are a favourite.", "Live music is where Neil's camera is happiest.")} ${story}\n\nThe big one so far: **Day 2 of Aurora Music Festival 2026** at Clark Global City, twelve-plus hours at the front barrier${lineup ? `, shooting ${lineup}` : ""}. It's all in manual, through strobes, haze and fast-changing stage light.${fresh}\n\n${one(ctx, "Want the full festival story?", "Curious which camera he uses in the pit?")}`,
      links: [workLink(aurora), link],
    };
  }
  return {
    text: `${one(ctx, `**${s.title}**: ${story}`, `Here's the idea behind **${s.title}**. ${story}`, `${story} That's **${s.title}**.`)}${s.gear ? `\n\nShot with ${list(s.gear.split(" · "))}.` : ""}${fresh}\n\n${one(ctx, "Open it with the button below, or ask me about another collection.", "Want to see another collection next?", "Want to know how he books a shoot like this?")}`,
    links: [link],
  };
}

/** Outside places, people and things: a grounded explanation, plus a vetted link chip. */
function triviaAnswer(q: string, ctx: Ctx): FaqAnswer | null {
  if (!/^(who|what|where|is|does|did|tell me|have|has)\b/i.test(q.trim())) return null;
  const t = TRIVIA.find((x) => x.names.test(q));
  if (!t) return null;
  const src = resolveTopic(t.label, t.kind);
  const [kind, id] = t.near.split(":");
  const near: Link | undefined =
    kind === "project" ? { label: projectBySlug(id)?.title ?? "Work", href: `/work/${id}` } : kind === "collection" ? { label: seriesList.find((s) => s.slug === id)?.title ?? "Photography", href: `/photography#${id}` } : { label: "About Neil", href: "/about" };
  const follow =
    kind === "project"
      ? `Want to hear more about ${near.label}?`
      : kind === "collection"
        ? `Want to see the ${near.label} collection?`
        : kind === "booking"
          ? "Want a quote for a shoot there?"
          : "Want to know more about Neil's side of it?";
  return {
    text: `${t.line}\n\n${src ? one(ctx, "The chip below has the wider story (I'll ask before it opens).", "For the bigger picture, tap the chip below; I'll check before you leave the site.") : ""} ${follow}`.replace(/\n\n /, "\n\n"),
    links: kind === "booking" ? [{ label: "Photo packages", href: "/photography#sessions" }] : [near],
    sources: src ? [src] : undefined,
  };
}

function gameAnswer(q: string, ctx: Ctx): FaqAnswer {
  const named = GAMES.find((g) => g.test.test(q));
  const others = GAMES.filter((g) => g !== named);
  if (named)
    return {
      text: `${named.blurb}\n\nFind it on /play, free to play. ${others.length ? `When you're done, there's also ${list(others.map((g) => `**${g.title}**`))}.` : ""}`,
      links: [{ label: "Let's play", href: "/play" }],
    };
  const [a, b, c, d] = shuffle(GAMES, ctx.rng);
  return {
    text: `${one(ctx, "Up for a game? There are four on /play:", "Four to pick from on /play:")}\n\n${bullets([a, b, c, d].map((g) => `**${g.title}**: ${g.blurb.replace(new RegExp(`^${g.title} is (a |an )?`), "").replace(/\s*\p{Extended_Pictographic}+$/u, "")}`))}\n\n${one(ctx, `I'd start with ${a.title} today.`, `Packet Check is the one that sneaks in some networking and security practice.`)}`,
    links: [{ label: "Let's play", href: "/play" }],
  };
}

function categoryAnswer(c: Category, ctx: Ctx): FaqAnswer {
  const all = projects.filter((p) => p.category === c);
  const picks = sample(all, Math.min(4, all.length), ctx.rng);
  const lead =
    c === "web"
      ? one(ctx, "Neil builds web systems with AI-assisted coding: he decides what they should do and how they're structured, then tests and deploys them.", "He plans the data, pages and rules first, builds with AI-assisted coding, and tests each step himself.")
      : `**${categories[c].label}**: ${categories[c].blurb}.`;
  return {
    text: `${lead} ${one(ctx, "A few to start with:", "Some highlights:", "Worth a look:")}\n\n${bullets(picks.map((p) => `**${p.title}**: ${fixFacts(p.plain)}`))}\n\n${one(ctx, "Want the story behind one of them?", "Ask me about any of these, or what Neil did on it.")}`,
    links: [{ label: categories[c].label, href: `/work#${c}` }],
    cards: picks.slice(0, 2).map((p) => ({ kind: "project", slug: p.slug })),
  };
}

/** Starting prices of the photo services, from the package list. */
const photoFrom = () =>
  services
    .map((s) => {
      const fixed = s.packages.map((p) => Number(p.price.replace(/[^\d]/g, ""))).filter((n) => n > 0);
      return fixed.length ? `**${s.name}** from ${priceOf(Math.min(...fixed))}` : null;
    })
    .filter((x): x is string => !!x);

/** Lab tools that need the full Lab page (no chat card). */
const LAB_ONLY = tools.filter((t) => !chatTools.some((c) => c.id === t.id));

function labToolAnswer(t: (typeof tools)[number], ctx: Ctx): FaqAnswer {
  const from = "slug" in t.project ? projectBySlug(t.project.slug) : undefined;
  return {
    text: `**${t.title}** is one of the working tools in Neil's Lab. ${t.blurb}\n\n${from ? `It grew out of **${from.title}** (${from.context}), where Neil's role was ${lowerFirst(from.role)}. ` : ""}It needs the full Lab page, so it opens there rather than in this chat. ${one(ctx, "Want to hear about the project behind it?", "Want me to run one of the chat tools meanwhile?")}`,
    links: [{ label: `Open ${t.title}`, href: `/lab#${t.id}` }, ...(from ? [workLink(from)] : [])],
  };
}

/** When a question needs the web and there's no AI to search it: say so, and offer the search itself. */
function cannotSearch(q: string, ctx: Ctx): FaqAnswer {
  const query = q.replace(/^(please\s+)?(can you\s+)?(search( the)?( web| internet| online)?( for)?|google|look up)\s*/i, "").replace(/\?+$/, "").trim() || q;
  return {
    text: `${one(ctx, "I can't search the web right now (my AI side is offline), so I can't look that up for you.", "That needs a web search, and I can't search the web right now.")} I'd rather not guess at something outside Neil's site.\n\nThe chip below runs the search on Google instead; I'll check with you before it opens. Meanwhile, I'm happy to help with anything about Neil: his projects, photos, the Lab tools or booking a shoot.`,
    sources: [googleSearch(query)],
  };
}

const CATEGORY_WORDS: [Category, RegExp][] = [
  ["web", /\b(web|website|software|react|next\.?js|coding|code|develop\w*|apps?)\b/i],
  ["media", /\b(media|video|film|productions?|coverage) ?(work|projects?)?\b|\bmedia & production\b/i],
  ["systems", /\b(systems|ai|machine learning|operating systems?)\b/i],
];

type Rule = { test: RegExp; answer: (q: string, ctx: Ctx) => FaqAnswer | null };

const RULES: Rule[] = [
  {
    test: /^(hi|hello|hey|yo|kumusta|musta|good (morning|afternoon|evening))\b/i,
    answer: (_, ctx) => ({
      text: one(
        ctx,
        "Hey there! I'm NeilAI. I can walk you through Neil's projects, show his photo collections, quote a photoshoot, or run one of his Lab tools right here.\n\nWhat would you like to start with?",
        "Hi! Ask me about a project, a photo collection or a shoot quote, or tap Surprise me and I'll pick something.",
        "Hello! I can talk projects, photos and prices, or run one of Neil's tools. Where shall we start?",
      ),
    }),
  },
  {
    test: /\b(secret|easter egg|hidden|terminal|back ?room)\b/i,
    answer: (_, ctx) => ({
      text: `${one(ctx, "There is! **/terminal** is the back room: a small shell where this site started.", "Psst: **/terminal**. It's an interactive shell for the curious.")}\n\nTry typing \`help\`, \`ls\` or \`cd photography\` once you're in.`.replace(/`/g, ""),
      links: [{ label: "Terminal", href: "/terminal" }],
    }),
  },
  {
    test: /\b(what'?s new|anything new|latest (photos|additions|work)|new (photos|on the site|collection)|recently added)\b/i,
    answer: (_, ctx) => {
      const sis = projectBySlug("student-information-system");
      const rstudio = certificateFacts.find((c) => /rstudio/i.test(c.title));
      return {
        text: `${one(ctx, "A few fresh things on the site:", "Here's what's new on the site lately:")}\n\n${bullets(
          [
            "**Photo Mode**, a new photo collection: virtual photography from Forza Horizon 4 and Forza Horizon 6",
            "New frames in other collections too, from the night sky to concerts and portraits",
            rstudio && `A new certificate: **${rstudio.title}** (${rstudio.issuer}, ${rstudio.date})`,
            sis && `**${sis.title}**: ${fixFacts(sis.plain)}`,
          ].filter((x): x is string => !!x),
        )}\n\n${one(ctx, "Want to see the Photo Mode shots?", "Which one should I open?")}`,
        links: [
          { label: "Photo Mode", href: "/photography#photo-mode" },
          ...(sis ? [workLink(sis)] : []),
        ],
      };
    },
  },
  {
    test: /\b(recommend|similar|also like|what else|something (else|new|i haven'?t)|which project|another project|other projects|see first|random project|best project)\b/i,
    answer: (_, ctx) => {
      const first = another(ctx, ctx.here ? [ctx.here] : [], ctx.here?.category);
      const second = first && another(ctx, [first, ...(ctx.here ? [ctx.here] : [])]);
      const picks = [first, second].filter((p): p is Project => !!p);
      return {
        text: `${one(ctx, "Two I'd pick right now:", ctx.here ? `If you liked ${ctx.here.title}, try these next:` : "Here's where I'd go next:")}\n\n${bullets(picks.map((p) => `**${p.title}** (${p.context}): ${fixFacts(p.plain)}`))}\n\n${one(ctx, "Want me to explain either one?", "Tap a card, or ask what Neil did on it.")}`,
        cards: picks.map((p) => ({ kind: "project", slug: p.slug })),
      };
    },
  },
  {
    test: /\b(makeup|hmua|hair &|hair and|venue|third[- ]part\w*|hosting|domain|isp|internet provider|supplier|rental)\b/i,
    answer: (q, ctx) => {
      const hmua = addOns.find((a) => a.id === "hmua");
      if (/\b(makeup|hmua|hair)\b/i.test(q) && hmua)
        return {
          text: `Yes: **${hmua.name}** is an add-on for custom private shoots, ${hmua.amount === null ? "quoted separately" : priceOf(hmua.amount)}.\n\nOne honest note: it's ${lowerFirst(hmua.detail)}. The artist is an independent third party, so if they can't make it you'll hear early, with an alternative; booking ahead helps. ${one(ctx, "Want a quote with it included?", "Shall I price a private shoot with hair & makeup?")}`,
          links: [{ label: "Photo packages", href: "/photography#sessions" }],
        };
      return {
        text: `${THIRD_PARTIES} Neil plans around them, but can't promise a supplier's schedule.\n\n${bullets([
          "**Websites** usually need a hosting provider and a domain name",
          "**Network jobs** can depend on an internet provider or on new hardware arriving",
          "**Shoots** can involve a venue, rented equipment or a hair & makeup artist",
        ])}\n\n${PRICING}`,
        links: [
          { label: "Services", href: "/services" },
          { label: "Contact", href: "/contact" },
        ],
      };
    },
  },
  {
    test: /\b(rate|price|pricing|priced|cost|how much|magkano|presyo|package)/i,
    answer: (q, ctx) =>
      /\b(web|site|website|app|system|network|project|freelance|video)/i.test(q)
        ? {
            text: `${one(ctx, "There's no fixed starting price for web or network work: it depends on what's needed.", "Web and network work is quoted per project, based on what you need.")}\n\n${PRICING}\n\nIt helps to mention the goal, rough size, any deadline, and what you already have (a domain, hosting, existing content). Some jobs also rely on third parties such as hosting or domain providers, ISPs or hardware suppliers, whose availability isn't guaranteed.`,
            links: [
              { label: "Start a project", href: "/contact" },
              { label: "Services", href: "/services" },
            ],
          }
        : {
            text: `${one(ctx, "Photoshoots have set packages; other work is quoted by scope.", "It depends on the kind of work.")} Photo packages start at:\n\n${bullets(photoFrom())}\n\nWeb, network and video projects are priced by what they need, so message Neil through /contact for those. ${one(ctx, "Tell me the kind of shoot and I'll quote it exactly.", "Want an exact quote for one of these?")}`,
            links: [
              { label: "Photo packages", href: "/photography#sessions" },
              { label: "Start a project", href: "/contact" },
            ],
          },
  },
  {
    test: /\b(add-?ons?|extras?)\b/i,
    answer: (_, ctx) => ({
      text: `${one(ctx, "Custom private shoots can add:", "Extras for a private shoot:")}\n\n${bullets(shuffle(addOns, ctx.rng).map((a) => `**${a.name}**: ${a.amount === null ? a.detail.toLowerCase() : `${priceOf(a.amount)} (${lowerFirst(a.detail)})`}`))}\n\nHair & makeup artists, studios and venues are independent partners, so their availability isn't guaranteed. ${one(ctx, "Want a quote with any of these?", "Shall I price one up?")}`,
      links: [{ label: "Photo packages", href: "/photography#sessions" }],
    }),
  },
  {
    test: /\b(travel|outside san jose|out of town|other (city|province)|come to)\b/i,
    answer: (_, ctx) => {
      const travel = addOns.find((a) => a.id === "travel");
      return {
        text: `${one(ctx, `Yes. Neil is based in ${site.location} and travels for shoots.`, "He does travel for shoots.")} ${travel ? `${travel.name} is ${travel.detail.toLowerCase()}, so mention the place when you book.` : "Travel is quoted separately."}\n\nVenue, entrance and permit fees are paid by the client. ${one(ctx, "Want to see the packages?", "Where are you thinking of shooting?")}`,
        links: [{ label: "Book a session", href: "/photography#sessions" }],
      };
    },
  },
  {
    test: /\b(down ?payment|deposit|raw|refund|terms)\b/i,
    answer: (_, ctx) => ({
      text: `${one(ctx, "The ground rules, in short:", "Good to know before booking:")}\n\n${bullets(bookingTerms)}\n\nEvery photo you get is fully edited. ${one(ctx, "Want to know how booking works, step by step?", "Shall I quote a shoot?")}`,
      links: [{ label: "Book a session", href: "/photography#sessions" }],
    }),
  },
  {
    test: /\b(book|shoot|photoshoot|session|hire.*(photo|camera)|grad(uation)? pic|debut|wedding|event coverage)/i,
    answer: (_, ctx) => ({
      text: `${one(ctx, "Booking is simple: pick a service and package on the photography page and the form fills itself in. Then:", "Here's how a booking goes:")}\n\n${bookingSteps.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\nIf your shoot needs a venue, a studio or a hair & makeup artist, those are independent partners whose availability isn't guaranteed, so booking early helps. ${one(ctx, "Want a quote first?", "Which kind of shoot are you planning?")}`,
      links: [{ label: "Book a session", href: "/photography#sessions" }],
    }),
  },
  {
    test: /\b(pathoscan|pathogen|fung|mycotoxin)/i,
    answer: (q, ctx) => {
      if (/\b(threshold|90|confiden|why|accura|false positive)/i.test(q))
        return {
          text: `${PATHOSCAN_THRESHOLD.long}\n\nIn practice that means the 90% line is a judgement aid, not an automatic referral to any particular test. ${one(ctx, "Want to try it with a slider?", "Want to see it on a sample result?")}`,
          links: [{ label: "Try it in the Lab", href: "/lab#pathoscan" }],
          cards: [{ kind: "pathoscan", species: pick(["A. flavus", "A. niger", "A. terreus"], ctx.rng), confidence: pick([86, 88, 92, 95], ctx.rng) }],
        };
      return {
        text: `**PathoScan** is Neil's team project for DA PhilMech's Laboratory Services Division: photograph a fungal culture and an on-device AI names one of five mycotoxin-producing Aspergillus species, or says "Unknown" instead of guessing.\n\n${bullets([
          "**How:** an image model Neil trained in Google's Teachable Machine, exported to TensorFlow.js and running in the browser, fully offline as a PWA (no login, no cloud)",
          `**The 90% threshold:** tells staff whether a result can be taken at face value for preliminary screening, or whether to think twice and look further`,
          "**Neil's role:** UI/UX, plus training the model in Teachable Machine and integrating it, in a team of nine",
          "**Outcome:** turned over to and accepted by PhilMech on September 28, 2026",
        ])}\n\n${one(ctx, "Want to see how the threshold works?", "Curious who else was on the team?")}`,
        links: [{ label: "View the project", href: "/work/pathoscan" }],
      };
    },
  },
  {
    test: /\b(certif\w*|credentials?|ccna|security\+|comptia|netacad|startup 100|agile|wordpress|rstudio|webinar)/i,
    answer: (q, ctx) => {
      const lower = q.toLowerCase();
      const named =
        (/\b(newest|latest|most recent)\b/.test(lower) ? certificateFacts[0] : undefined) ??
        certificateFacts.find((c) => lower.includes(c.title.toLowerCase())) ??
        certificateFacts.find((c) => c.title.toLowerCase().split(/\W+/).some((w) => w.length > 5 && !["introduction", "becoming"].includes(w) && lower.includes(w)));
      const towards = `He's working towards ${list(inProgress.map((c) => c.title))} next.`;
      const cisco = certificateFacts.find((c) => /cisco/i.test(c.issuer));
      if (named)
        return {
          text: `**${named.title}**, from ${named.issuer} (${named.date}).${named.note ? ` ${named.note}.` : ""}${named.verify ? " It's verifiable online: the chip below checks it." : ""}\n\n${towards} ${one(ctx, "Want the full list?", "Want to see the others?")}`,
          links: [{ label: "Credentials", href: "/about#credentials" }],
          sources: named.verify ? [{ label: `Verify: ${named.title}`, href: named.verify, host: hostOf(named.verify) }] : undefined,
        };
      if (/\b(ccna|security\+|comptia|towards|next|working on)/i.test(q))
        return {
          text: `Yes: ${lowerFirst(towards)}\n\n${cisco ? `The groundwork is already there: **${cisco.title}** from ${cisco.issuer} (${cisco.date}), and networking is his major at CLSU.` : "Networking is his major at CLSU."} ${one(ctx, "Want me to subnet something to prove it?", "Want to see his other certificates?")}`,
          links: [{ label: "Credentials", href: "/about#credentials" }],
        };
      return {
        text: `${one(ctx, `Neil has ${certificateFacts.length} certificates so far, newest first:`, "On the wall so far, newest first:")}\n\n${bullets(certificateFacts.map((c) => `**${c.title}** (${c.issuer}, ${c.date})`))}\n\n${towards}`,
        links: [{ label: "Credentials", href: "/about#credentials" }],
      };
    },
  },
  {
    test: /\b(skills?|languages?|toolkit|editing software|software does|lightroom|premiere|davinci|code in|programming)\b/i,
    answer: (q, ctx) => {
      const group = /edit|lightroom|premiere|davinci|video|photo/i.test(q) ? toolkit.find((g) => /image/i.test(g.group)) : /code|language|programming/i.test(q) ? toolkit.find((g) => g.group === "Code") : /web/i.test(q) ? toolkit.find((g) => /web/i.test(g.group)) : undefined;
      if (group)
        return {
          text: `${one(ctx, `His ${group.group.toLowerCase()} toolkit:`, `For ${group.group.toLowerCase()}, Neil works with:`)}\n\n${bullets(group.tools.map((t) => t.name))}${group.group === "Code" || /web/i.test(group.group) ? `\n\n${HOW_NEIL_WORKS.web}` : ""}\n\n${one(ctx, "Want to see a project that uses them?", "Want the rest of his toolkit?")}`,
          links: [{ label: "About", href: "/about" }],
        };
      return {
        text: `${one(ctx, "His toolkit, in short:", "What he works with:")}\n\n${bullets(shuffle(toolkit, ctx.rng).map((g) => `**${g.group}:** ${g.tools.map((t) => t.name).join(", ")}`))}\n\n${one(ctx, "Want a project that shows any of these off?", "Ask me which project uses which.")}`,
        links: [{ label: "About", href: "/about" }],
      };
    },
  },
  {
    test: /\b(gear|camera|lens|canon|nikon|iphone|dji|gimbal|equipment|camera bag|shoot on)/i,
    answer: (_, ctx) => ({
      text: `${one(ctx, "The camera bag:", "What he shoots with:")}\n\n${bullets(gearList.map((g) => `**${g.brand}:** ${g.items.join(", ")}`))}\n\nConcerts are shot on the Nikon and Canon bodies; the iPhone shows up in landscapes and video. ${one(ctx, "Want to see what he shoots with them?", "Curious which collection used which camera?")}`,
      links: [{ label: "See the gear", href: "/about#gear" }],
    }),
  },
  {
    test: /\b(school|study|studies|college|university|clsu|student|year|course|bsit|education|major|high school|senior high|junior high)/i,
    answer: (_, ctx) => {
      const [now, shs, jhs] = education;
      return {
        text: `${one(ctx, `Neil is a **third-year BS Information Technology** student at ${now.school}, majoring in Network Systems & Infrastructure Engineering.`, `Right now he's at **${now.school}** (${now.years}): ${lowerFirst(now.detail)}`)}\n\n${bullets([
          `**College:** ${now.school}, ${now.years}`,
          `**Senior high:** ${shs.school}, ${shs.years} (${shs.level.split(" · ")[1] ?? shs.level})`,
          `**Junior high:** ${jhs.school}, ${jhs.years}: “${jhs.detail}”`,
        ])}\n\n${one(ctx, "Want to know about the orgs he's in at CLSU?", "Curious what he's certified in?")}`,
        links: [{ label: "The full story", href: "/about" }],
      };
    },
  },
  {
    test: /\b(where|location|based|hometown|from|taga|saan)\b/i,
    answer: (_, ctx) => ({
      text: `${one(ctx, `Neil is based in **${site.location}**, in Central Luzon, ${site.country}.`, `Home is **${site.location}** (${site.coordinates}).`)} He studies at Central Luzon State University in the Science City of Muñoz, also in Nueva Ecija, and travels for shoots and concerts.\n\nWeb work can be done from anywhere; shoots outside San Jose City are quoted by distance.`,
      links: [{ label: "About Neil", href: "/about" }],
    }),
  },
  {
    test: /\b(resume|cv|curriculum vitae)\b|résumé/i,
    answer: (_, ctx) => ({
      text: `${one(ctx, "His résumé lives at **/resume**.", "Here's the résumé.")} It covers his education, organisations, certificates, skills and selected projects, and you can share it or save it as a PDF.\n\n${one(ctx, "Want the 30-second version instead?", "Want me to pick a project from it to explain?")}`,
      links: [{ label: "Résumé", href: "/resume" }],
    }),
  },
  {
    test: /\b(itsc|img|media group|bits|org|organization|council|production director)/i,
    answer: (q, ctx) => {
      const [img] = organizations;
      // "What's BITS?" gets BITS, not the Media Group.
      const named = organizations.find((o) => o !== img && new RegExp(`\\b${o.short}\\b`).test(q));
      if (named)
        return {
          text: `**${named.short}** is the ${named.name}: ${named.detail} Neil's role there: ${named.role}.\n\nHe's also ${img.role} of the ${img.name} (${img.short}). ${one(ctx, "Want to hear what that job involves?", "Curious what IMG produces?")}`,
          links: [{ label: "Organizations", href: "/about" }],
        };
      return {
        text: `${one(ctx, `Neil is the **${img.role}** of the ${img.name} (${img.short}).`, `As **${img.role}** of ${img.short}, Neil turns creative plans into schedules, crew lists and shot lists.`)} ${img.short} is ${lowerFirst(img.detail)}\n\n${bullets(organizations.filter((o) => o.role !== "Student").map((o) => `**${o.short}** (${o.name}): ${o.role}`))}\n\n${one(ctx, "Want to see the events IMG covered?", "Curious about IMG Stratcom?")}`,
        links: [{ label: "Organizations", href: "/about" }],
      };
    },
  },
  {
    test: /\b(photo(graph\w*|s)?|pictures?|like to shoot)\b/i,
    answer: (_, ctx) => {
      const picks = shuffle(seriesList, ctx.rng).slice(0, 4);
      return {
        text: `${one(ctx, "He shoots a bit of everything. A few collections to start with:", "Pick a mood:")}\n\n${bullets(picks.map((s) => `**${s.title}**: ${(s.story.split(/(?<=[.!?])\s/)[0] ?? "").replace(/\bmy direction\b/, "Neil's direction")}`))}\n\nThere are ${seriesList.length} collections in all, including the new Photo Mode. ${one(ctx, "Which one should I open?", "Ask me about any of them.")}`,
        links: [{ label: "Photography", href: "/photography" }],
      };
    },
  },
  {
    test: /\b(network|cisco|security|hack|kali|snort|audit|vlan|router|pentest\w*|penetration|forensic\w*|malware|offensive|cabling|topolog\w*|bom\b|bill of materials)/i,
    answer: (q, ctx) => {
      if (/\b(hack\w*|kali|pentest\w*|penetration|offensive|forensic\w*|malware)/i.test(q))
        return {
          text: `${HOW_NEIL_WORKS.hacking}\n\n${HOW_NEIL_WORKS.security}\n\n${one(ctx, "Want to see the Cyber Awareness Series instead?", "Want me to check a suspicious link the way his lessons explain?")}`,
          links: [
            { label: "Cyber Awareness Series", href: "/work/cyber-awareness-series" },
            { label: "Link safety check", href: "/lab#link" },
          ],
        };
      if (/\b(security|audit|snort)/i.test(q) && !/\b(network|cisco|vlan|router)/i.test(q))
        return {
          text: `${HOW_NEIL_WORKS.security}\n\n${bullets([
            "**Made:** the Cyber Awareness Series, six short videos on data privacy for the CLSU Department of IT (he directed and filmed them)",
            "**Offers:** awareness talks and a basic check of accounts, passwords and Wi-Fi settings, not a penetration test",
            `**Next:** ${list(inProgress.map((c) => c.title))}`,
          ])}\n\n${one(ctx, "Want me to check a suspicious link?", "Want to see the series?")}`,
          links: [
            { label: "Cyber Awareness Series", href: "/work/cyber-awareness-series" },
            { label: "Services", href: "/services#security" },
          ],
        };
      return {
        text: `${one(ctx, "Networking is his major: **Network Systems & Infrastructure Engineering** at CLSU.", "Networks are his main field, and his major at CLSU.")}\n\n${HOW_NEIL_WORKS.networks}\n\n${bullets([
          `**Certified:** ${certificateFacts.find((c) => /cisco/i.test(c.issuer))?.title ?? "Cisco NetAcad"} (Cisco Networking Academy)`,
          `**Next:** ${list(inProgress.map((c) => c.title))}`,
          "**Try it:** the subnet and VLAN planner runs right here in the chat",
        ])}\n\n${one(ctx, "Give me a network, like 192.168.1.0/26, and I'll break it down.", "Want me to plan VLANs for a building?")}`,
        links: [{ label: "The Lab", href: "/lab" }],
      };
    },
  },
  {
    test: /\b(write (all )?(the |your |his )?(own )?code|writes? (all )?(the |his )?code|hand-?(code|coded|written)|vibe-?cod\w*|ai[- ]assisted|use[sd]? ai|chatgpt|copilot|full[- ]?stack|web dev\w*)\b/i,
    answer: (_, ctx) => ({
      text: `${one(ctx, "Not in the usual sense, and he's upfront about it.", "Short answer: he builds with AI-assisted coding, and says so himself.")}\n\n${HOW_NEIL_WORKS.web}\n\n${one(ctx, "Want to see one he built that way, like the Student Information System?", "Want to hear how that worked on a real project?")}`,
      links: [
        { label: "Student Information System", href: "/work/student-information-system" },
        { label: "How this site is built", href: "/uses#colophon" },
      ],
    }),
  },
  {
    test: /\b(contact|email|reach|message|talk|collab|hire|available|free|reply|respond|open for)/i,
    answer: (_, ctx) => ({
      text: `${one(ctx, "The best way is the **contact page**: Neil reads every message himself and replies within 24 hours.", "Send a message from **/contact**; Neil answers personally, usually within 24 hours.")}\n\nFor a project, include what you need, rough size and any deadline, since pricing depends on scope. For a shoot, the booking form on the photography page fills in the details for you.`,
      links: [
        { label: "Say hello", href: "/contact" },
        { label: "Services", href: "/services" },
      ],
    }),
  },
  {
    test: /\b(hobb|fun|free time|interest|f1|formula|racing|baseball|cook|pasta|hot ?wheels|die-?cast|collect|hardware|linux|off the clock)/i,
    answer: (q, ctx) => {
      const lower = q.toLowerCase();
      const named = interests.find(
        (i) =>
          i.title
            .toLowerCase()
            .split(/\W+/)
            .some((w) => w.length > 3 && lower.includes(w)) ||
          (/racing|game/.test(lower) && /racing/i.test(i.title)) ||
          (/cook/.test(lower) && /kitchen/i.test(i.title)) ||
          (/collect|hardware|linux/.test(lower) && /die-cast/i.test(i.title)),
      );
      if (named)
        return {
          text: `${one(ctx, `**${named.title}**, in Neil's words:`, `Off the clock: **${named.title}**.`)} “${named.text}”\n\n${one(ctx, "Want another fun fact?", "Curious what else he does off the clock?")}`,
          links: [{ label: "More about Neil", href: "/about" }],
        };
      return {
        text: `${one(ctx, "Off the clock, Neil is into:", "When he's not coding or shooting:")}\n\n${bullets(shuffle(interests, ctx.rng).map((i) => `**${i.title}:** ${i.text}`))}\n\n${one(ctx, "Want to see the Photo Mode shots from his racing games?", "Ask me about any of these.")}`,
        links: [{ label: "More about Neil", href: "/about" }],
      };
    },
  },
  {
    test: /\b(play|game|games|drive|circuit|race|f1|arcade|bored|shutter|sprint|packet check|contact sheet|memory game|quiz)\b/i,
    answer: gameAnswer,
  },
  {
    test: /\b(tools?|lab|calculator|what can you do|help me|features?|in this chat)\b/i,
    answer: (_, ctx) => ({
      text: `${one(ctx, "I can run Neil's project tools right here:", "Try me. In this chat I can:")}\n\n${bullets([
        "**Subnet** any IPv4 network, or plan VLANs for a building",
        "**Visualise memory allocation** (First, Best, Worst and Next Fit)",
        "**Check a suspicious link** for phishing signs, without opening it",
        "**Show PathoScan's 90% confidence threshold** on a sample result",
        "**Quote a photoshoot** and pull up **Neil's GitHub activity**",
      ])}\n\nOpen Tools up top, or just ask, e.g. “subnet 192.168.1.0/26”. The Lab page has ${LAB_ONLY.length} more that need a bigger screen: ${list(LAB_ONLY.map((t) => t.title))}.`,
      links: [{ label: "Open the Lab", href: "/lab" }],
    }),
  },
  {
    test: /\b(who|about|yourself|neil|introduce|sino)/i,
    answer: (_, ctx) => ({
      text: `${one(ctx, `**${site.name}** is a third-year BSIT student at CLSU. He plans networks, builds web systems with AI-assisted coding, and photographs concerts, campus life and the night sky.`, `${site.name} in thirty seconds: networks by major, web systems built with AI's help, concerts and night skies through a lens.`)}\n\n${bullets([
        `**Studies:** BS Information Technology, majoring in Network Systems & Infrastructure Engineering`,
        `**Networks:** topology, network mapping, cabling, bills of materials, subnets and VLANs`,
        `**Builds:** web systems like the Student Information System, planned, built and tested by him with AI-assisted coding`,
        `**Leads:** ${site.role}`,
        `**Shoots:** concerts, events, portraits, landscapes and astrophotography`,
      ])}\n\n${one(ctx, "Want to start with his projects or his photos?", "What would you like to see first?")}`,
      links: [
        { label: "About", href: "/about" },
        { label: "Work", href: "/work" },
      ],
    }),
  },
];

function fallback(ctx: Ctx): FaqAnswer {
  const [a, b] = sample(POOL, 2, ctx.rng);
  return {
    text: one(
      ctx,
      `Hmm, that one's outside what I know offline. I can tell you plenty about Neil, though: try “${a.text}” or “${b.text}”, or send Neil a message directly.`,
      `I don't have that one offline, sorry! I can tell you “${a.text.replace(/\?$/, "")}”, though, or you can ask Neil himself on the contact page.`,
      `That's beyond my offline notes. Maybe ask me “${a.text}” instead, or message Neil from the contact page.`,
    ),
    links: [{ label: "Contact Neil", href: "/contact" }],
  };
}

/** Asking to search, or about something current: that needs the web. */
const WANTS_WEB = /^(please\s+)?(can you\s+)?(search|google|look up)\b|\b(search (the )?(web|internet|online)|on the (web|internet)|latest news|in the news|weather|exchange rate|stock price|who won|score of)\b/i;
/** Words that tie a question to Neil or this site (so it isn't a general web question). */
const ABOUT_HERE = /\b(neil|he|his|him|you|your|this site|the site|santiago|portfolio)\b/i;

export interface AnswerOptions {
  /** The page the visitor is on, so "this project" means something. */
  page?: string;
  rng?: Rng;
}

export function localAnswer(question: string, opts: AnswerOptions = {}): FaqAnswer {
  const slug = opts.page?.match(/^\/work\/([^/?#]+)/)?.[1];
  const ctx: Ctx = { rng: opts.rng ?? Math.random, here: slug ? projectBySlug(slug) : undefined };
  const q = question.trim();

  // "Search the web for …" or something current: the offline brain can't, and says so.
  if (WANTS_WEB.test(q)) return cannotSearch(q, ctx);

  // A Lab tool that only runs on the Lab page, asked about by name.
  const labTool = LAB_ONLY.find((t) => q.toLowerCase().includes(t.title.toLowerCase()) || (t.id === "whisper" && /\bwhisper tool\b/i.test(q)));
  if (labTool) return labToolAnswer(labTool, ctx);

  const cards = detectCards(q);
  const named = cards.find((c): c is Extract<ChatCard, { kind: "project" }> => c.kind === "project");
  // "What's the Memory Allocation Simulator?" is about the project, not a request to run the tool.
  const title = named ? projectBySlug(named.slug)!.title.toLowerCase() : "";
  const byTitle =
    named && q.toLowerCase().includes(title) && !/\d/.test(q.toLowerCase().replace(title, "")) && /^(what|who|tell me|how (was|did)|show|explain|walk me through|where)\b/i.test(q) ? projectBySlug(named.slug) : undefined;

  // "Why the 90% threshold?" is a question about the rule, not a run of the tool.
  const aboutThreshold = /\bpathoscan\b/i.test(q) && /\b(why|what does|mean|false positive)\b/i.test(q);

  // A working tool beats a canned answer.
  if (cards.length && cards[0].kind !== "project" && !byTitle && !aboutThreshold) return { text: introFor(cards[0], ctx.rng), cards };

  // An outside place, person or thing Neil's connected to.
  const trivia = byTitle || /\bcertificate\b/i.test(q) ? null : triviaAnswer(q, ctx);
  if (trivia) return cards.length ? { ...trivia, cards } : trivia;

  // A project by name — or "this project" on a project page.
  const project = byTitle ?? (named ? projectBySlug(named.slug) : /\b(this|the) (project|one)\b|\bhere\b/i.test(q) ? ctx.here : undefined);
  if (project && !aboutThreshold && !/\b(recommend|similar|also like|what else|another)\b/i.test(q)) {
    const answer = projectAnswer(project, q, ctx);
    // Keep any tool card it would have opened, after the project's own.
    const extra = cards.filter((c) => c.kind !== "project");
    return extra.length ? { ...answer, cards: [...(answer.cards ?? []), ...extra].slice(0, 3) } : answer;
  }

  // A photo collection by name.
  const collection = Object.entries(COLLECTION_WORDS).find(([, re]) => re.test(q))?.[0];
  if (collection && !/\b(how much|price|book|quote)\b/i.test(q)) return collectionAnswer(collection, q, ctx);

  // A kind of work ("show me his media projects").
  if (/\b(projects?|work|portfolio|show me)\b/i.test(q)) {
    const category = CATEGORY_WORDS.find(([, re]) => re.test(q))?.[0];
    if (category) return categoryAnswer(category, ctx);
  }

  for (const rule of RULES) {
    if (!rule.test.test(q)) continue;
    const answer = rule.answer(q, ctx);
    if (answer) return answer;
  }
  // Web questions without the word "project" ("does he code?").
  const category = CATEGORY_WORDS.find(([, re]) => re.test(q))?.[0];
  if (category) return categoryAnswer(category, ctx);
  // A real question about the wider world: it needs a search, which can't happen offline.
  if (!ABOUT_HERE.test(q) && /\?$|^(who|what|when|where|why|how|is|are|can|does|do|which)\b/i.test(q) && q.split(/\s+/).length >= 3) return cannotSearch(q, ctx);
  return fallback(ctx);
}

/** Turns site paths mentioned in an AI reply into link chips. */
export function linksIn(text: string) {
  const known: Record<string, string> = {
    ...Object.fromEntries(projects.map((p) => [`/work/${p.slug}`, p.title])),
    "/photography": "Photography",
    "/lab": "The Lab",
    "/play": "Play",
    "/contact": "Contact",
    "/services": "Services",
    "/resume": "Résumé",
    "/about": "About",
    "/work": "Work",
    "/terminal": "Terminal",
  };
  const found = Object.keys(known).filter((path) => new RegExp(`${path.replace("/", "\\/")}(?![\\w-])`).test(text));
  // Prefer the most specific path ("/work/pathoscan" over "/work").
  return found.filter((p) => !found.some((q) => q !== p && q.startsWith(p + "/"))).map((href) => ({ label: known[href], href }));
}
