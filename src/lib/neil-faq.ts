// Offline brain for NeilAI: answers common questions locally, so the chat is
// useful (and instant) even when the Gemini API is unavailable. Every answer
// is built from the content files, and most come in a few phrasings, picked
// at random, so the same question doesn't always get the same canned line.

import { certificates, education, gear, inProgress, interests, organizations, toolkit } from "@/content/about";
import { seriesList } from "@/content/series";
import { addOns, bookingSteps, bookingTerms } from "@/content/sessions";
import { categories, projectBySlug, projects, type Category, type Project } from "@/content/work";
import { COLLECTION_WORDS, collectionSays, GAMES, TRIVIA } from "@/lib/neilai/catalog";
import { detectCards, introFor } from "@/lib/neilai/intents";
import { pick, sample, shuffle, type Rng } from "@/lib/neilai/random";
import { hostOf, resolveTopic, type Source } from "@/lib/neilai/sources";
import { POOL } from "@/lib/neilai/suggest";
import { site } from "@/lib/site";
import { toolById, type ChatCard } from "@/lib/tools";

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
const workLink = (p: Project): Link => ({ label: p.title, href: `/work/${p.slug}` });
const nameOnly = (member: string) => member.split(" — ")[0];

/** A different project to recommend, preferring the same kind of work. */
function another(ctx: Ctx, not: Project[], category?: Category): Project | undefined {
  const rest = projects.filter((p) => !not.includes(p));
  const same = rest.filter((p) => p.category === category);
  return pick(same.length && ctx.rng() < 0.7 ? same : rest, ctx.rng);
}

/** Questions about one project: overview, team, stack, role or how it grew. */
function projectAnswer(p: Project, q: string, ctx: Ctx): FaqAnswer {
  const media = p.category === "media";
  let text: string;
  if (/\b(team|who (else )?(was|worked|built|made)|members?|groupmates?|with whom)\b/i.test(q)) {
    text = p.team?.length
      ? one(ctx, `${p.title} was a team effort: ${p.team.join("; ")}.`, `The ${p.title} crew: ${list(p.team.map(nameOnly))}. Neil's part: ${p.role}.`)
      : `The project page doesn't list a team for ${p.title} — Neil's role there: ${p.role}.`;
  } else if (/\b(grow|grew|evolve|timeline|across courses|stages?)\b/i.test(q) && p.timeline) {
    text = `${p.title} grew up across ${p.timeline.length} courses: ${p.timeline.map((t) => `${t.course} (${t.stage.toLowerCase()})`).join(" → ")}. ${p.timeline[p.timeline.length - 1].detail}`;
  } else if (/\b(built with|stack|tech|made|gear|languages?|framework|how was)\b/i.test(q)) {
    text = one(ctx, `${p.title} ${media ? "was made with" : "is built with"} ${list(p.stack)}.`, `The toolkit behind ${p.title}: ${list(p.stack)}.`);
  } else if (/\b(neil do|did (he|neil) do|his (role|part)|role|contribut|responsib)\b/i.test(q)) {
    text = one(ctx, `On ${p.title}, Neil's role was ${p.role}. ${p.plain}`, `Neil's part in ${p.title}: ${p.role}. In short — ${p.plain.charAt(0).toLowerCase()}${p.plain.slice(1)}`, `${p.role} — that was Neil on ${p.title} (${p.context}).`);
  } else {
    text = one(
      ctx,
      `${p.title}: ${p.plain} Neil's role — ${p.role}. (${p.context} · ${p.status})`,
      `${p.plain} That's ${p.title}, from ${p.context}. Neil was ${p.role.charAt(0).toLowerCase()}${p.role.slice(1)}.`,
      `In one line, ${p.title} is this: ${p.plain} Status: ${p.status}.`,
    );
  }

  const links: Link[] = [];
  if (p.tool) {
    text += one(ctx, " You can try its tool in the Lab too. 🧪", " There's a working tool from it in the Lab. 🧪");
    links.push({ label: `Try ${toolById(p.tool).title}`, href: `/lab#${p.tool}` });
  }
  // "You might also like", rotating through everything rather than the home page's favourites.
  if (ctx.rng() < 0.6) {
    const next = another(ctx, [p], p.category);
    if (next) {
      text += one(ctx, ` If you like it, ${next.title} is worth a look too.`, ` Next up, maybe ${next.title}?`, ` You might also like ${next.title}.`);
      links.push(workLink(next));
    }
  }
  return { text, links, cards: [{ kind: "project", slug: p.slug }] };
}

/** One collection: its story, gear and where to see it. */
function collectionAnswer(slug: string, q: string, ctx: Ctx): FaqAnswer {
  const s = seriesList.find((x) => x.slug === slug)!;
  const link = { label: s.title, href: `/photography#${s.slug}` };
  const aurora = projectBySlug("aurora-fest-2026");
  if (/\b(gear|camera|lens|shot on|equipment|use)\b/i.test(q) && s.gear) {
    return { text: one(ctx, `For the ${collectionSays(slug)}: ${s.gear}. 📸`, `The kit behind ${s.title} — ${s.gear}.`), links: [link, { label: "All his gear", href: "/about#gear" }] };
  }
  if (slug === "concerts" && aurora) {
    const lineup = aurora.body.join(" ").match(/lineup ran ([^.]+)\./)?.[1];
    return {
      text: one(
        ctx,
        `Concerts are a favourite: Aurora Music Festival 2026 meant twelve-plus hours at the front barrier${lineup ? ` shooting ${lineup}` : ""} — all in manual through strobes and haze. 🎸`,
        `${s.story} The big one: Day 2 of Aurora Music Festival 2026${lineup ? `, with ${lineup}` : ""}. 🎶`,
      ),
      links: [workLink(aurora), link],
    };
  }
  const story = s.story ? s.story.replace(/\bmy direction\b/, "Neil's direction").replace(/\bI\b/g, "Neil") : `Neil's ${s.title} collection.`;
  return {
    text: one(ctx, `${s.title}: ${story}`, `Here's the idea behind ${s.title}. ${story}`, `${story} That's ${s.title} — open it below. 📷`),
    links: [link],
  };
}

/** Outside places, people and things: one grounded line, plus a vetted link chip. */
function triviaAnswer(q: string, ctx: Ctx): FaqAnswer | null {
  if (!/^(who|what|where|is|does|did|tell me|have|has)\b/i.test(q.trim())) return null;
  const t = TRIVIA.find((x) => x.names.test(q));
  if (!t) return null;
  const src = resolveTopic(t.label, t.kind);
  const [kind, id] = t.near.split(":");
  const near: Link | undefined =
    kind === "project" ? { label: projectBySlug(id)?.title ?? "Work", href: `/work/${id}` } : kind === "collection" ? { label: seriesList.find((s) => s.slug === id)?.title ?? "Photography", href: `/photography#${id}` } : { label: "About Neil", href: "/about" };
  return {
    text: `${t.line}${src ? one(ctx, "", " The chip below has more — I'll ask before it opens.", " Want more? Tap the chip below.") : ""}`,
    links: kind === "booking" ? [{ label: "Photo packages", href: "/photography#sessions" }] : [near],
    sources: src ? [src] : undefined,
  };
}

function gameAnswer(q: string, ctx: Ctx): FaqAnswer {
  const named = GAMES.find((g) => g.test.test(q));
  if (named) return { text: `${named.blurb} ${one(ctx, "It's on /play.", "Give it a spin at /play.", "Find it at /play.")}`, links: [{ label: "Let's play", href: "/play" }] };
  const [a, b, c] = shuffle(GAMES, ctx.rng);
  return {
    text: one(
      ctx,
      `Oh, you want to play? 🕹️ Start with ${a.title}, then try ${b.title} and ${c.title}.`,
      `${a.blurb} And when you're done, ${b.title} and ${c.title} are waiting.`,
      `Three to pick from: ${a.title}, ${b.title} and ${c.title}. I'd start with ${a.title} today. 🎮`,
    ),
    links: [{ label: "Let's play", href: "/play" }],
  };
}

function categoryAnswer(c: Category, ctx: Ctx): FaqAnswer {
  const all = projects.filter((p) => p.category === c);
  const picks = sample(all, Math.min(4, all.length), ctx.rng);
  const lead = c === "web" ? one(ctx, "Web development is a big part of what he does — architecture first, then fast, careful iteration.", "He plans the architecture first, then builds fast.") : `${categories[c].label} — ${categories[c].blurb}.`;
  return {
    text: `${lead} ${one(ctx, "A few to start with:", "Some highlights:", "Worth a look:")} ${list(picks.map((p) => p.title))}.`,
    links: [{ label: categories[c].label, href: `/work#${c}` }],
    cards: picks.slice(0, 2).map((p) => ({ kind: "project", slug: p.slug })),
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
    answer: (_, ctx) => ({ text: one(ctx, "Hey there! 👋 Ask me about Neil's projects, his photography, booking a shoot, or what he's up to.", "Hi! 👋 Want a project, a photo collection, or a shoot quote? Or tap 🎲 for a surprise.", "Hello! 😊 I can talk projects, photos, prices — or run one of Neil's tools.") }),
  },
  {
    test: /\b(secret|easter egg|hidden|terminal|back ?room)\b/i,
    answer: (_, ctx) => ({ text: one(ctx, "There is! /terminal is the back room — a small shell where this site started. Type help, ls, or cd photography. ⌨️", "Psst: /terminal. It's an interactive shell for the curious — try help or ls. 🤫"), links: [{ label: "Terminal", href: "/terminal" }] }),
  },
  {
    test: /\b(recommend|similar|also like|what else|something (else|new|i haven'?t)|which project|another project|other projects|see first|random project|best project)\b/i,
    answer: (_, ctx) => {
      const first = another(ctx, ctx.here ? [ctx.here] : [], ctx.here?.category);
      const second = first && another(ctx, [first, ...(ctx.here ? [ctx.here] : [])]);
      const picks = [first, second].filter((p): p is Project => !!p);
      return {
        text: one(
          ctx,
          `Try ${picks[0].title} — ${picks[0].plain.charAt(0).toLowerCase()}${picks[0].plain.slice(1)} Then ${picks[1]?.title ?? "the rest of /work"}.`,
          `Two I'd pick right now: ${list(picks.map((p) => p.title))}. 👇`,
          `${ctx.here ? `If you liked ${ctx.here.title}, ` : ""}${picks[0].title} is a good next stop${picks[1] ? `, and ${picks[1].title} after that` : ""}.`,
        ),
        cards: picks.map((p) => ({ kind: "project", slug: p.slug })),
      };
    },
  },
  {
    test: /\b(rate|price|pricing|cost|how much|magkano|presyo|package)/i,
    answer: (q, ctx) =>
      /\b(web|site|website|app|system|network|project)/i.test(q)
        ? {
            text: one(ctx, `Freelance web and networking projects start at ${site.rate}. The exact quote depends on scope — tell Neil about it on the contact page.`, `Web and networking work starts at ${site.rate}; send the details through /contact for a proper quote. 💻`),
            links: [{ label: "Start a project", href: "/contact" }],
          }
        : {
            text: one(
              ctx,
              `Freelance web and networking projects start at ${site.rate}. Photo sessions start at ₱299 for an express ID shoot — graduation, studio, lifestyle and full event packages are all on the photography page.`,
              `Photos start at ₱299 (an express ID shoot); web and networking projects start at ${site.rate}. Tell me the kind of shoot and I'll quote it exactly.`,
            ),
            links: [
              { label: "Photo packages", href: "/photography#sessions" },
              { label: "Start a project", href: "/contact" },
            ],
          },
  },
  {
    test: /\b(add-?ons?|extras?)\b/i,
    answer: (_, ctx) => ({
      text: `${one(ctx, "Custom private shoots can add:", "Extras for a private shoot:")} ${list(shuffle(addOns, ctx.rng).map((a) => `${a.name} (${a.amount === null ? a.detail.toLowerCase() : `₱${a.amount.toLocaleString("en-US")}`})`))}.`,
      links: [{ label: "Photo packages", href: "/photography#sessions" }],
    }),
  },
  {
    test: /\b(travel|outside san jose|out of town|other (city|province)|come to)\b/i,
    answer: (_, ctx) => {
      const travel = addOns.find((a) => a.id === "travel");
      return {
        text: one(ctx, `Yes — Neil is based in ${site.location} and travels for shoots. ${travel ? `${travel.name} is ${travel.detail.toLowerCase()}.` : ""}`, `He does travel. Shoots outside San Jose City are ${travel?.detail.toLowerCase() ?? "quoted separately"} — mention the place when you book.`),
        links: [{ label: "Book a session", href: "/photography#sessions" }],
      };
    },
  },
  {
    test: /\b(down ?payment|deposit|raw|refund|terms)\b/i,
    answer: (_, ctx) => ({ text: `${one(ctx, "The ground rules:", "Good to know before booking:")} ${bookingTerms.join(" ")}`, links: [{ label: "Book a session", href: "/photography#sessions" }] }),
  },
  {
    test: /\b(book|shoot|photoshoot|session|hire.*(photo|camera)|grad(uation)? pic|debut|wedding|event coverage)/i,
    answer: (_, ctx) => ({
      text: one(
        ctx,
        "Yes! Pick a service and package and the booking form fills itself in. A 30% downpayment locks the date, and every photo you get is fully edited (no RAW files).",
        `Here's how it goes: ${bookingSteps.slice(0, 3).map((s) => s.charAt(0).toLowerCase() + s.slice(1).replace(/\.$/, "")).join("; then ")}.`,
      ),
      links: [{ label: "Book a session", href: "/photography#sessions" }],
    }),
  },
  {
    test: /\b(pathoscan|pathogen|fung|mycotoxin)/i,
    answer: () => ({
      text: "PathoScan is Neil's team project for DA PhilMech's Laboratory Services Division: snap a photo of a fungal culture and an on-device AI names one of five mycotoxin-producing Aspergillus species — fully offline. Neil did the UI/UX and trained the model. It was turned over to PhilMech in September 2026. 🔬",
      links: [{ label: "View the project", href: "/work/pathoscan" }],
    }),
  },
  {
    test: /\b(certif\w*|credentials?|ccna|security\+|comptia|netacad|startup 100|agile|wordpress)/i,
    answer: (q, ctx) => {
      const lower = q.toLowerCase();
      const named =
        certificates.find((c) => lower.includes(c.title.toLowerCase())) ??
        certificates.find((c) => c.title.toLowerCase().split(/\W+/).some((w) => w.length > 5 && w !== "introduction" && lower.includes(w)));
      const towards = `He's working towards ${list(inProgress.map((c) => c.title))} next.`;
      const cisco = certificates.find((c) => /cisco/i.test(c.issuer));
      const ciscoLine = cisco ? `The groundwork: ${cisco.title} from ${cisco.issuer} (${cisco.date}).` : "";
      if (named)
        return {
          text: `${named.title}, from ${named.issuer} (${named.date}).${named.note ? ` ${named.note}.` : ""}${named.verify ? " It's verifiable online — the chip below checks it." : ""}`,
          links: [{ label: "Credentials", href: "/about#credentials" }],
          sources: named.verify ? [{ label: `Verify: ${named.title}`, href: named.verify, host: hostOf(named.verify) }] : undefined,
        };
      if (/\b(ccna|security\+|comptia|towards|next|working on)/i.test(q))
        return { text: `Yes — ${towards.charAt(0).toLowerCase()}${towards.slice(1)} ${ciscoLine}`, links: [{ label: "Credentials", href: "/about#credentials" }] };
      return {
        text: `${one(ctx, "His certificates:", "On the wall so far:")} ${list(shuffle(certificates, ctx.rng).map((c) => `${c.title} (${c.issuer}, ${c.date})`))}. ${towards}`,
        links: [{ label: "Credentials", href: "/about#credentials" }],
      };
    },
  },
  {
    test: /\b(skills?|languages?|toolkit|editing software|software does|lightroom|premiere|davinci|code in|programming)\b/i,
    answer: (q, ctx) => {
      const group = /edit|lightroom|premiere|davinci|video|photo/i.test(q) ? toolkit.find((g) => /image/i.test(g.group)) : /code|language|programming/i.test(q) ? toolkit.find((g) => g.group === "Code") : undefined;
      if (group) return { text: `${group.group}: ${list(group.tools.map((t) => t.name))}.`, links: [{ label: "About", href: "/about" }] };
      return { text: `${one(ctx, "His toolkit, in short —", "What he works with —")} ${shuffle(toolkit, ctx.rng).map((g) => `${g.group.toLowerCase()}: ${g.tools.map((t) => t.name).join(", ")}`).join("; ")}.`, links: [{ label: "About", href: "/about" }] };
    },
  },
  {
    test: /\b(gear|camera|lens|canon|nikon|iphone|dji|gimbal|equipment|camera bag|shoot on)/i,
    answer: (_, ctx) => ({
      text: `${one(ctx, "The bag:", "In the camera bag:", "What he shoots with:")} ${shuffle(gear, ctx.rng)
        .map((g) => `${g.brand} (${g.items.join(", ")})`)
        .join("; ")}. 📸`,
      links: [{ label: "See the gear", href: "/about#gear" }],
    }),
  },
  {
    test: /\b(school|study|studies|college|university|clsu|student|year|course|bsit|education|major|high school|senior high|junior high)/i,
    answer: (_, ctx) => {
      const [now, shs, jhs] = education;
      return {
        text: one(
          ctx,
          `Neil is a third-year BS Information Technology student at ${now.school}, majoring in Network Systems & Infrastructure Engineering. Before that: ${shs.level.split(" · ")[1] ?? shs.level} at ${shs.school} and junior high at ${jhs.school}.`,
          `Right now: ${now.school} (${now.years}) — ${now.detail.charAt(0).toLowerCase()}${now.detail.slice(1)} Senior high was ${shs.school} (${shs.detail.replace(/\.$/, "")}), and junior high ${jhs.school}: “${jhs.detail}”`,
        ),
        links: [{ label: "The full story", href: "/about" }],
      };
    },
  },
  {
    test: /\b(where|location|based|hometown|from|taga|saan)\b/i,
    answer: (_, ctx) => ({
      text: one(
        ctx,
        `Neil is based in ${site.location}, in Central Luzon, ${site.country}. He studies at Central Luzon State University in the Science City of Muñoz, also in Nueva Ecija, and travels for shoots and concerts. 📍`,
        `Home is ${site.location} (${site.coordinates}); school is Central Luzon State University in Muñoz. Shoots take him further. 📍`,
      ),
      links: [{ label: "About Neil", href: "/about" }],
    }),
  },
  {
    test: /\b(resume|cv|curriculum vitae)\b|résumé/i,
    answer: (_, ctx) => ({ text: one(ctx, "His résumé lives at /resume: education, organisations, certificates, skills and selected projects. You can share it or save it as a PDF. 📄", "Here's the résumé — print it, share it, or save it as a PDF. 📄"), links: [{ label: "Résumé", href: "/resume" }] }),
  },
  {
    test: /\b(itsc|img|media group|bits|org|organization|council|production director)/i,
    answer: (q, ctx) => {
      const [img, , bits] = organizations;
      // "What's BITS?" gets BITS, not the Media Group.
      const named = organizations.find((o) => o !== img && new RegExp(`\\b${o.short}\\b`).test(q));
      if (named)
        return {
          text: one(ctx, `${named.short} is the ${named.name}: ${named.detail} Neil's role — ${named.role}.`, `The ${named.name} (${named.short}) — ${named.detail.charAt(0).toLowerCase()}${named.detail.slice(1)} Neil is ${/^[AEIOU]/.test(named.role) ? "an" : "a"} ${named.role.split(" · ")[0].toLowerCase()} there.`),
          links: [{ label: "Organizations", href: "/about" }],
        };
      return {
        text: one(
          ctx,
          `He's the ${img.role} of the ${img.name} (${img.short}) — ${img.detail.charAt(0).toLowerCase()}${img.detail.slice(1)} He's also a member of ${bits.short}, the ${bits.name}.`,
          `As ${img.role} of ${img.short}, Neil turns creative plans into schedules, crew lists and shot lists. ${img.short} is ${img.detail.split(" — ")[0].replace(/^The/, "the")}; he's in ${bits.short} too.`,
        ),
        links: [{ label: "Organizations", href: "/about" }],
      };
    },
  },
  {
    test: /\b(photo(graph\w*|s)?|pictures?|like to shoot)\b/i,
    answer: (_, ctx) => {
      const [a, b, c] = shuffle(seriesList, ctx.rng);
      return { text: one(ctx, `He shoots a bit of everything: the ${collectionSays(a.slug)}, ${collectionSays(b.slug)} and ${collectionSays(c.slug)}, to start. 📷`, `Pick a mood: ${a.title}, ${b.title} or ${c.title}? Ask me about any of them.`), links: [{ label: "Photography", href: "/photography" }] };
    },
  },
  {
    test: /\b(network|cisco|security|hack|kali|snort|audit|vlan|router)/i,
    answer: (_, ctx) => ({
      text: one(
        ctx,
        "Networking is his major: Network Systems & Infrastructure Engineering at CLSU. He holds a Cisco NetAcad certificate in network addressing and troubleshooting, is working towards CCNA and CompTIA Security+, and you can try his subnet and VLAN planner in the Lab. 🛡️",
        "It's what he's majoring in at CLSU. Want proof? Ask me to subnet any network, or plan VLANs for a building — the Lab tools run right here. 🌐",
      ),
      links: [{ label: "The Lab", href: "/lab" }],
    }),
  },
  {
    test: /\b(contact|email|reach|message|talk|collab|hire|available|free|reply|respond|open for)/i,
    answer: (_, ctx) => ({ text: one(ctx, "The fastest way is the contact page — he reads every message himself and replies within 24 hours.", "Send a message from /contact — Neil answers personally, usually within 24 hours. ✉️"), links: [{ label: "Say hello", href: "/contact" }] }),
  },
  {
    test: /\b(hobb|fun|free time|interest|f1|formula|racing|baseball|cook|pasta|hot ?wheels|die-?cast|collect|hardware|linux)/i,
    answer: (q, ctx) => {
      const lower = q.toLowerCase();
      const named = interests.find((i) => i.title.toLowerCase().split(/\W+/).some((w) => w.length > 3 && lower.includes(w)) || (/racing|game/.test(lower) && /racing/i.test(i.title)) || (/cook/.test(lower) && /kitchen/i.test(i.title)) || (/collect|hardware|linux/.test(lower) && /die-cast/i.test(i.title)));
      const i = named ?? pick(interests, ctx.rng);
      return { text: `${one(ctx, `${i.title}, in Neil's words:`, `Off the clock — ${i.title}:`, `Fun fact (${i.title}):`)} “${i.text}”`, links: [{ label: "More about Neil", href: "/about" }] };
    },
  },
  {
    test: /\b(play|game|games|drive|jeepney|arcade|bored|shutter|sprint)\b/i,
    answer: gameAnswer,
  },
  {
    test: /\b(tools?|lab|calculator|what can you do|help me|features?)\b/i,
    answer: (_, ctx) => ({
      text: one(
        ctx,
        "I can run Neil's project tools right here: plan subnets and VLANs, visualize memory allocation, check a suspicious link, show how PathoScan decides, quote a photoshoot, or pull up his GitHub activity. Tap 🧰 above, or just ask — e.g. “subnet 192.168.1.0/26”. 🧪",
        "Try me: paste a link and I'll check it, give me an IP and I'll subnet it, or ask for a shoot quote. Everything in 🧰 runs right in this chat. 🧪",
      ),
      links: [{ label: "Open the Lab", href: "/lab" }],
    }),
  },
  {
    test: /\b(who|about|yourself|neil|introduce|sino)/i,
    answer: (_, ctx) => ({
      text: one(
        ctx,
        "Neil Jacob Santiago — a third-year BSIT student at CLSU who designs networks, builds web systems and photographs concerts, campus life and the night sky. He's also the Production Director of the ITSC Media Group. 👋",
        `${site.name} in thirty seconds: networks by major, web systems by habit, concerts and night skies through a lens — and ${site.role}. 👋`,
      ),
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
      `Hmm, that one's outside what I know offline. Try “${a.text}” or “${b.text}” — or send Neil a message directly!`,
      `I don't have that one offline, sorry! I can tell you “${a.text.replace(/\?$/, "")}”, though — or you can ask Neil himself.`,
      `That's beyond my offline notes. Maybe ask me “${a.text}” instead, or message Neil from the contact page.`,
    ),
    links: [{ label: "Contact Neil", href: "/contact" }],
  };
}

export interface AnswerOptions {
  /** The page the visitor is on, so "this project" means something. */
  page?: string;
  rng?: Rng;
}

export function localAnswer(question: string, opts: AnswerOptions = {}): FaqAnswer {
  const slug = opts.page?.match(/^\/work\/([^/?#]+)/)?.[1];
  const ctx: Ctx = { rng: opts.rng ?? Math.random, here: slug ? projectBySlug(slug) : undefined };
  const q = question.trim();
  const cards = detectCards(q);
  const named = cards.find((c): c is Extract<ChatCard, { kind: "project" }> => c.kind === "project");
  // "What's the Memory Allocation Simulator?" is about the project, not a request to run the tool.
  const title = named ? projectBySlug(named.slug)!.title.toLowerCase() : "";
  const byTitle =
    named && q.toLowerCase().includes(title) && !/\d/.test(q.toLowerCase().replace(title, "")) && /^(what|who|tell me|how (was|did)|show)\b/i.test(q) ? projectBySlug(named.slug) : undefined;

  // A working tool beats a canned answer.
  if (cards.length && cards[0].kind !== "project" && !byTitle) return { text: introFor(cards[0], ctx.rng), cards };

  // An outside place, person or thing Neil's connected to.
  const trivia = byTitle ? null : triviaAnswer(q, ctx);
  if (trivia) return cards.length ? { ...trivia, cards } : trivia;

  // A project by name — or "this project" on a project page.
  const project = byTitle ?? (named ? projectBySlug(named.slug) : /\b(this|the) (project|one)\b|\bhere\b/i.test(q) ? ctx.here : undefined);
  if (project && !/\b(recommend|similar|also like|what else|another)\b/i.test(q)) {
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
    "/resume": "Résumé",
    "/about": "About",
    "/work": "Work",
    "/terminal": "Terminal",
  };
  const found = Object.keys(known).filter((path) => new RegExp(`${path.replace("/", "\\/")}(?![\\w-])`).test(text));
  // Prefer the most specific path ("/work/pathoscan" over "/work").
  return found.filter((p) => !found.some((q) => q !== p && q.startsWith(p + "/"))).map((href) => ({ label: known[href], href }));
}
