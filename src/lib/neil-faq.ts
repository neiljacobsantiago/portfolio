// Offline brain for NeilAI: answers common questions locally, so the chat is
// useful (and instant) even when the Gemini API is unavailable.

import { projects } from "@/content/work";
import { detectCards, introFor } from "@/lib/neilai/intents";
import type { ChatCard } from "@/lib/tools";

export interface FaqAnswer {
  text: string;
  links?: { label: string; href: string }[];
  cards?: ChatCard[];
}

const RULES: { test: RegExp; answer: FaqAnswer }[] = [
  {
    test: /\b(rate|price|pricing|cost|how much|magkano|presyo|package)/i,
    answer: {
      text: "Freelance web and networking projects start at ₱15,000. Photo sessions start at ₱299 for an express ID shoot — graduation, studio, lifestyle and full event packages are all listed on the photography page.",
      links: [
        { label: "Photo packages", href: "/photography#sessions" },
        { label: "Start a project", href: "/contact" },
      ],
    },
  },
  {
    test: /\b(book|shoot|photoshoot|session|hire.*(photo|camera)|grad(uation)? pic|debut|wedding|event coverage)/i,
    answer: {
      text: "Yes! Pick a service and package and the booking form fills itself in. A 30% downpayment locks the date, and every photo you get is fully edited (no RAW files).",
      links: [{ label: "Book a session", href: "/photography#sessions" }],
    },
  },
  {
    test: /\b(pathoscan|philmech|pathogen|aspergillus|fung|mycotoxin)/i,
    answer: {
      text: "PathoScan is Neil's team project for DA PhilMech's Laboratory Services Division: snap a photo of a fungal culture and an on-device AI names one of five mycotoxin-producing Aspergillus species — fully offline. Neil did the UI/UX and trained the model. It was turned over to PhilMech in September 2026. 🔬",
      links: [{ label: "Read the case study", href: "/work/pathoscan" }],
    },
  },
  {
    test: /\b(gear|camera|lens|canon|nikon|iphone|dji|gimbal|equipment)/i,
    answer: {
      text: "The bag: Canon EOS 1500D (with a 50mm f/1.8) and EOS 80D, a Nikon D780, an iPhone 14 Pro Max shooting ProRAW, a DJI Osmo Mobile 7 and a Ronin mini gimbal, plus a studio-style lighting setup. 📸",
      links: [{ label: "See the gear", href: "/about#gear" }],
    },
  },
  {
    test: /\b(school|study|studies|college|university|clsu|student|year|course|bsit|education)/i,
    answer: {
      text: "Neil is a third-year BS Information Technology student at Central Luzon State University, majoring in Network Systems & Infrastructure Engineering. Before that: STEM at PHINMA Araullo University and junior high at Bettbien High School.",
      links: [{ label: "The full story", href: "/about" }],
    },
  },
  {
    test: /\b(itsc|img|media group|bits|org|organization|council|production director)/i,
    answer: {
      text: "He's the Production Director of the ITSC Media Group (IMG) — the media arm of the CLSU IT Student Council, formerly the ITSC Multimedia Group — and a member of BITS, the Builders of Information Technology Society.",
      links: [{ label: "Organizations", href: "/about" }],
    },
  },
  {
    test: /\b(concert|opm|aurora|festival|ben ?& ?ben|kamikazee|parokya|sb19|ivos|iv of spades)/i,
    answer: {
      text: "Concerts are his favourite chaos: Aurora Music Festival 2026 meant 12+ hours at the barricade shooting Kitchie Nadal, Parokya ni Edgar, Kamikazee, Sexbomb Girls, IV of Spades and more — all in manual through strobes and haze. 🎸",
      links: [
        { label: "Aurora Fest story", href: "/work/aurora-fest-2026" },
        { label: "Live concerts", href: "/photography#concerts" },
      ],
    },
  },
  {
    test: /\b(web|website|next|react|code|coding|develop|app|system|build)/i,
    answer: {
      text: "Web dev is a big part of what he does — vibe-coded, yes, but always architected first. Highlights: BuildIT (a PC part picker store), WorkTayo, ParkMate, BankoSantiago, Eco-Fashion and this very site, built with Next.js.",
      links: [{ label: "Web & software work", href: "/work#web" }],
    },
  },
  {
    test: /\b(network|cisco|ccna|security|hack|kali|snort|audit|vlan|router)/i,
    answer: {
      text: "On the network side: the CLIRDEC network design at CLSU, intrusion auditing with Kali, Nmap and Snort, and a Cisco NetAcad certificate — with CCNA and CompTIA Security+ in progress. 🛡️",
      links: [{ label: "Systems & security", href: "/work#systems" }],
    },
  },
  {
    test: /\b(contact|email|reach|message|talk|collab|hire|available|free)/i,
    answer: {
      text: "The fastest way is the contact page — he reads every message himself and replies within 24 hours.",
      links: [{ label: "Say hello", href: "/contact" }],
    },
  },
  {
    test: /\b(hobb|fun|free time|interest|f1|formula|racing|baseball|cook|pasta|hot ?wheels|die-?cast)/i,
    answer: {
      text: "Off the clock: F1 and sim racing (F1 25, Forza Horizon 5), baseball, cooking a rich chicken alfredo, PC hardware, Linux distro-hopping, and a growing shelf of Hot Wheels and Takara Tomy die-casts. 🏎️",
      links: [{ label: "More about Neil", href: "/about" }],
    },
  },
  {
    test: /\b(tools?|lab|calculator|what can you do|help me|features?)\b/i,
    answer: {
      text: "I can run Neil's project tools right here: plan subnets and VLANs, visualize memory allocation, check a suspicious link, show how PathoScan decides, quote a photoshoot, or pull up his GitHub activity. Tap 🧰 above, or just ask — e.g. “subnet 192.168.1.0/26”. 🧪",
      links: [{ label: "Open the Lab", href: "/lab" }],
    },
  },
  {
    test: /\b(who|about|yourself|neil|introduce|sino)/i,
    answer: {
      text: "Neil Jacob Santiago — a third-year BSIT student at CLSU who designs networks, builds web systems and photographs concerts, campus life and the night sky. He's also the Production Director of the ITSC Media Group. 👋",
      links: [
        { label: "About", href: "/about" },
        { label: "Work", href: "/work" },
      ],
    },
  },
  {
    test: /^(hi|hello|hey|yo|kumusta|musta|good (morning|afternoon|evening))\b/i,
    answer: { text: "Hey there! 👋 Ask me about Neil's projects, his photography, booking a shoot, or what he's up to." },
  },
];

const FALLBACK: FaqAnswer = {
  text: "Hmm, that one's outside what I know offline. Try asking about PathoScan, photo packages, his gear, or school — or send Neil a message directly!",
  links: [{ label: "Contact Neil", href: "/contact" }],
};

export function localAnswer(question: string): FaqAnswer {
  const cards = detectCards(question);
  const rule = RULES.find((r) => r.test.test(question))?.answer;
  // A working tool beats a canned answer; a project card rides along with the FAQ text.
  if (cards.length && cards[0].kind !== "project") return { text: introFor(cards[0]), cards };
  if (cards.length) return { ...(rule ?? { text: introFor(cards[0]) }), cards };
  return rule ?? FALLBACK;
}

/** Turns site paths mentioned in an AI reply into link chips. */
export function linksIn(text: string) {
  const known: Record<string, string> = {
    ...Object.fromEntries(projects.map((p) => [`/work/${p.slug}`, p.title])),
    "/photography": "Photography",
    "/lab": "The Lab",
    "/contact": "Contact",
    "/about": "About",
    "/work": "Work",
  };
  const found = Object.keys(known).filter((path) => new RegExp(`${path.replace("/", "\\/")}(?![\\w-])`).test(text));
  // Prefer the most specific path ("/work/pathoscan" over "/work").
  return found.filter((p) => !found.some((q) => q !== p && q.startsWith(p + "/"))).map((href) => ({ label: known[href], href }));
}
