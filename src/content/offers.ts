// "Work with me": what Neil offers, how a project runs, and the FAQ, read by
// /services (and the command palette, footer and site map). Photo prices are
// NOT repeated here: they're derived from content/sessions.ts, the single
// source the booking form and quote tool also use.
//
// Timelines are typical estimates — adjust them to how projects actually run.
// A backend or CMS can later replace the getters at the bottom without
// touching any component (see docs/BACKEND.md).

import { services as photoServices } from "@/content/sessions";
import { site } from "@/lib/site";

/** The `?topic=` values the contact form understands. */
export type ContactTopic = "website" | "photography" | "video" | "network" | "security" | "other";

export const contactHref = (topic: ContactTopic) => `/contact?topic=${topic}`;

export type OfferId = "website" | "network" | "security" | "photoshoots" | "events" | "video";

export interface Offer {
  id: OfferId;
  topic: ContactTopic;
  title: string;
  /** One or two words for jump links and menus. */
  short: string;
  /** One line under the title. */
  pitch: string;
  /** Who it's usually for. */
  forWho: string;
  /** What you walk away with. */
  deliverables: string[];
  timeline: string;
  price: { label: string; note?: string };
  /** Real work that shows it, from this site. */
  proof: { label: string; href: string }[];
  /** For photo offers: where the packages and prices live. */
  packagesHref?: string;
  cta: string;
}

/** Lowest fixed price across some photo services, straight from content/sessions.ts. */
function photoFrom(ids: string[]) {
  const prices = photoServices
    .filter((s) => ids.includes(s.id))
    .flatMap((s) => s.packages)
    .filter((p) => p.price.startsWith("₱") && !p.price.includes("/"))
    .map((p) => Number(p.price.replace(/[^\d]/g, "")))
    .filter((n) => n > 0);
  return prices.length ? `From ₱${Math.min(...prices).toLocaleString("en-PH")}` : "See packages";
}

const offers: Offer[] = [
  {
    id: "website",
    topic: "website",
    title: "Websites & web systems",
    short: "Websites",
    pitch: "From a one-page site to a system with logins and a database, planned before the first line is written.",
    forWho: "Small businesses, student organizations, freelancers and research teams.",
    deliverables: [
      "A clickable Figma design you approve before any build",
      "A fast, responsive site that works on budget phones",
      "Forms, dashboards and databases when the job needs them",
      "Hosting and domain set up in your name",
      "A walkthrough so you can update it yourself",
    ],
    timeline: "Landing page or portfolio: 1–2 weeks. Web system with a database: 4–8 weeks.",
    price: { label: `From ${site.rate}`, note: "Quoted after the first call" },
    proof: [
      { label: "PathoScan", href: "/work/pathoscan" },
      { label: "BuildIT", href: "/work/buildit" },
      { label: "Eco-Fashion", href: "/work/eco-fashion" },
      { label: "WorkTayo", href: "/work/worktayo" },
    ],
    cta: "Plan a website",
  },
  {
    id: "network",
    topic: "network",
    title: "Network design & setup",
    short: "Networks",
    pitch: "Wired and wireless networks that are mapped, addressed and documented, not just plugged in.",
    forWho: "Homes, small offices, shops, dorms and org rooms.",
    deliverables: [
      "A site walkthrough and a topology diagram",
      "An IP addressing and VLAN plan, simulated in Packet Tracer first",
      "Router, switch and Wi-Fi configuration",
      "Coverage and speed checks once it's running",
      "Plain-language documentation and passwords handed over",
    ],
    timeline: "Small office or home: 2–5 days including testing. Bigger sites after a walkthrough.",
    price: { label: `From ${site.rate}`, note: "Quoted after a walkthrough" },
    proof: [
      { label: "Subnet & VLAN planner", href: "/lab#subnet" },
      { label: "Cisco NetAcad certificate", href: "/about#credentials" },
    ],
    cta: "Plan a network",
  },
  {
    id: "security",
    topic: "security",
    title: "Security awareness & basic audits",
    short: "Security",
    pitch: "Make your people harder to fool and your setup harder to break into, explained without the jargon.",
    forWho: "Offices, schools and organizations that handle personal data.",
    deliverables: [
      "An awareness talk or short video series for your team",
      "A basic check of accounts, passwords, Wi-Fi and router settings",
      "Phishing and suspicious-link spotting, with real examples",
      "A short written report with fixes ranked by urgency",
    ],
    timeline: "Awareness session: 1–2 weeks to prepare. Basic audit and report: about a week.",
    price: { label: "Quoted per scope", note: "A basic review, not a penetration test" },
    proof: [
      { label: "Cyber Awareness Series", href: "/work/cyber-awareness-series" },
      { label: "Link safety check", href: "/lab#link" },
    ],
    cta: "Ask about security",
  },
  {
    id: "photoshoots",
    topic: "photography",
    title: "Portraits & photoshoots",
    short: "Portraits",
    pitch: "Graduation, studio, headshots, pre-debut and custom private shoots, with posing directed the whole time.",
    forWho: "Graduates, professionals, couples, barkadas and anyone with an idea.",
    deliverables: [
      "A concept chat before the shoot",
      "Direction on set, no experience needed",
      "Every usable frame colour-graded, plus retouches",
      "A private online gallery",
    ],
    timeline: "Gallery in 7–10 days, or 3 days with rush delivery.",
    price: { label: photoFrom(["private", "id_portrait", "graduation", "studio", "funshoot", "pre_event"]), note: "Every package and add-on is listed" },
    proof: [
      { label: "Fashion portraits", href: "/photography#portraits" },
      { label: "Get a quote", href: "/lab#quote" },
    ],
    packagesHref: "/photography#sessions",
    cta: "Book a shoot",
  },
  {
    id: "events",
    topic: "photography",
    title: "Event & concert coverage",
    short: "Events",
    pitch: "Seminars, conferences, debuts, weddings and live gigs, covered by someone who has run a media team.",
    forWho: "Organizers, schools, companies and families.",
    deliverables: [
      "A shot list agreed before the day",
      "Unlimited captures across the event",
      "Same-day highlights when you need them up fast",
      "A second shooter or full team for big events",
      "Highlight video and same-day edits in the bigger packages",
    ],
    timeline: "Same-day highlights on request; the full gallery in 7–10 days.",
    price: { label: photoFrom(["event"]), note: "Live gigs and corporate events are quoted" },
    proof: [
      { label: "Aurora Fest 2026", href: "/work/aurora-fest-2026" },
      { label: "IRCITE 2026", href: "/work/ircite-2026" },
      { label: "IT Week", href: "/work/it-week" },
    ],
    packagesHref: "/photography#sessions",
    cta: "Cover an event",
  },
  {
    id: "video",
    topic: "video",
    title: "Video & media",
    short: "Video",
    pitch: "Highlight reels, event videos, explainers and short films, directed, shot and edited end to end.",
    forWho: "Departments, organizations, brands and creators.",
    deliverables: [
      "A treatment or script outline before filming",
      "Direction, filming and clean audio on location",
      "Editing, colour and titles in Premiere Pro or DaVinci Resolve",
      "Vertical cuts for Reels and TikTok",
      "Episodes or series planned as a set",
    ],
    timeline: "Reels in about a week; series and short films scoped together.",
    price: { label: "Quoted per brief", note: "Reels can be added to any photo package" },
    proof: [
      { label: "Cyber Awareness Series", href: "/work/cyber-awareness-series" },
      { label: "Mundane", href: "/work/mundane" },
      { label: "IT Fest", href: "/work/it-fest" },
    ],
    cta: "Plan a video",
  },
];

export interface ProcessStep {
  title: string;
  detail: string;
  /** How the same step goes for a photoshoot. */
  shoot: string;
}

const processSteps: ProcessStep[] = [
  {
    title: "Discover",
    detail: "A short call or chat about what you need, who it's for and the deadline that matters.",
    shoot: "You pick a package and date; I check the date and reply within 24 hours.",
  },
  {
    title: "Plan",
    detail: "A written scope with the quote and timeline, plus a design or network plan you approve.",
    shoot: "A 30% downpayment locks the date, then we plan outfits, places and the shot list.",
  },
  {
    title: "Build or shoot",
    detail: "Work happens in short rounds with a preview at each, so there are no surprises at the end.",
    shoot: "Shoot day: arrive ready, the posing is directed for you.",
  },
  {
    title: "Deliver",
    detail: "Everything handed over in your name: files, accounts, passwords and plain-language notes.",
    shoot: "Your edited photos arrive in a private online gallery.",
  },
  {
    title: "Support",
    detail: "Anything that doesn't work as agreed gets fixed, and I stay a message away for changes later on.",
    shoot: "Need more retouches or prints later? Just ask.",
  },
];

export interface Principle {
  title: string;
  detail: string;
}

const principles: Principle[] = [
  { title: "Plan before building", detail: "Every system starts as a diagram, a prototype or a shot list. Planning is cheaper than rework." },
  { title: "Plain language", detail: "You'll always know what's happening and why, without needing to speak IT." },
  { title: "Private by default", detail: "Your photos, data and passwords stay yours. Nothing is posted or shared without a yes." },
  { title: "Fast on any phone", detail: "Sites are built and tested for budget Androids on mobile data, not just new laptops." },
  { title: "Finished, not raw", detail: "Photos are delivered edited and code is delivered documented. No loose ends to tidy up yourself." },
];

export interface Faq {
  q: string;
  a: string;
  /** Optional link shown after the answer. */
  link?: { label: string; href: string };
}

const faqs: Faq[] = [
  {
    q: "How much does a project cost?",
    a: `Freelance web and network projects start at ${site.rate}. After the first call you get a written quote for the agreed scope. Photo packages have set prices.`,
    link: { label: "Photo packages", href: "/photography#sessions" },
  },
  {
    q: "Do you work outside Nueva Ecija?",
    a: `I'm based in ${site.location} and work remotely on web projects anywhere. Shoots and on-site network work outside San Jose City add travel, quoted by distance.`,
  },
  {
    q: "How do I pay?",
    a: "GCash, Maya, bank transfer or cash on meet-up. Photo bookings take a 30% non-refundable downpayment to lock the date; projects follow the schedule in your quote.",
  },
  {
    q: "Do I get the RAW photo files?",
    a: "No. Every delivered photo is edited to a finished standard, which is part of what you're paying for. You can add more retouches to any package.",
  },
  {
    q: "Will you post my photos or project?",
    a: "Only if you say yes. Private shoots stay private unless you choose otherwise, and client work only goes on this site with permission.",
  },
  {
    q: "You're still a student. How do you fit projects in?",
    a: "I plan work around the semester and tell you up front if a date or deadline won't work. The availability note at the bottom of every page says what's open right now.",
    link: { label: "What I'm up to now", href: "/now" },
  },
  {
    q: "How fast will you reply?",
    a: "Within 24 hours, usually sooner. If it's urgent, say so in your message.",
  },
];

// ---- Accessors: the only way components read this file. ----

export async function getOffers(): Promise<Offer[]> {
  return offers;
}
export async function getProcess(): Promise<ProcessStep[]> {
  return processSteps;
}
export async function getPrinciples(): Promise<Principle[]> {
  return principles;
}
export async function getFaqs(): Promise<Faq[]> {
  return faqs;
}

/** Synchronous list for client components (command palette) that can't await. */
export const offerIndex = offers.map(({ id, title, short, pitch, topic }) => ({ id, title, short, pitch, topic }));
