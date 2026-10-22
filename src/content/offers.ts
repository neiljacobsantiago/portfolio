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
  /**
   * Outside people or companies the job may rely on (makeup artists, venues,
   * hosting, suppliers). Their availability isn't Neil's to promise, so it's said up front.
   */
  partners?: string;
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
    id: "network",
    topic: "network",
    title: "Network design & setup",
    short: "Networks",
    pitch: "Wired and wireless networks that are mapped, cabled, addressed and written down, so whoever looks after them next isn't guessing.",
    forWho: "Homes, small offices, shops, dorms and org rooms.",
    deliverables: [
      "A site walkthrough, then physical and logical topology diagrams",
      "A cabling plan and a bill of materials (BOM) before anything is bought",
      "An IP addressing and VLAN plan, checked in Packet Tracer first",
      "Router, switch and Wi-Fi setup, with coverage and speed checks",
      "A labelled network map, plain-language notes and the passwords handed over",
    ],
    timeline: "Small office or home: 2–5 days including testing. Bigger sites after a walkthrough.",
    price: { label: "Priced by scope", note: "Quoted after a walkthrough: size, devices and equipment decide it" },
    partners: "Routers, access points and cabling are bought from suppliers, and the internet line is your ISP's. Stock and install dates depend on them, so they're confirmed before work is scheduled.",
    proof: [
      { label: "Subnet & VLAN planner", href: "/lab#subnet" },
      { label: "Cisco NetAcad certificate", href: "/about#credentials" },
    ],
    cta: "Plan a network",
  },
  {
    id: "website",
    topic: "website",
    title: "Websites & web systems",
    short: "Websites",
    pitch: "From a one-page site to a system with logins and a database. I plan it with you, build it with AI-assisted coding, then test and deploy it.",
    forWho: "Small businesses, student organizations, freelancers and research teams.",
    deliverables: [
      "A clickable Figma design you approve before any build",
      "A responsive site, tested on budget phones as well as laptops",
      "Forms, dashboards and databases when the job needs them",
      "Hosting and domain set up in your name",
      "A walkthrough so you can update it yourself",
    ],
    timeline: "Landing page or portfolio: 1–2 weeks. Web system with a database: 4–8 weeks.",
    price: { label: "Priced by scope", note: "A written quote after the first call: pages, features and deadline decide it" },
    partners: "Domains, hosting and paid plugins come from outside providers. Their prices and terms are theirs; I'll tell you what each one costs before you commit.",
    proof: [
      { label: "PathoScan", href: "/work/pathoscan" },
      { label: "BuildIT", href: "/work/buildit" },
      { label: "Eco-Fashion", href: "/work/eco-fashion" },
      { label: "WorkTayo", href: "/work/worktayo" },
    ],
    cta: "Plan a website",
  },
  {
    id: "security",
    topic: "security",
    title: "Security awareness talks & check-ups",
    short: "Security",
    pitch: "Simple lessons on staying safe online, for people who don't work in IT.",
    forWho: "Offices, schools and organizations that handle personal data.",
    deliverables: [
      "An awareness talk, handout or short video for your team",
      "How to spot phishing and suspicious links, with real examples",
      "A walk through accounts, passwords, Wi-Fi and router settings against a basic checklist",
      "A short written list of what to fix first",
    ],
    timeline: "Awareness session: 1–2 weeks to prepare. Basic check-up and notes: about a week.",
    price: { label: "Priced by scope", note: "Awareness and a basic settings check, not a penetration test or incident response" },
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
    partners: "Hair and makeup artists, studio rentals and venues are booked with partners. If one isn't free on your date, you'll hear it early, with alternatives.",
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
    partners: "Second shooters, videographers and drone operators are freelancers too, booked per event. Bigger crews are confirmed once the date is.",
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
    price: { label: "Priced by brief", note: "Length, crew and edit time decide it; reels can join any photo package" },
    partners: "Extra crew, drone operators, voice talent and music licences come from outside. Their availability and fees are confirmed before the quote is final.",
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
    detail: "Everything handed over in your name: files, accounts, passwords and clear handover notes.",
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
  { title: "Drawn before it's built", detail: "A network starts as a topology and a BOM, a website as a prototype, a shoot as a shot list. Rework costs more than a sketch." },
  { title: "No jargon", detail: "You'll always know what's happening and why, without needing to speak IT." },
  { title: "Private by default", detail: "Your photos, data and passwords stay yours. Nothing is posted or shared without a yes." },
  { title: "Tested on real phones", detail: "Sites are checked on budget Androids and mobile data, as well as new laptops." },
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
    a: "It depends on the work. Web, network, security and video jobs are quoted after a short call, once the scope, deadline and any outside costs are clear, and the quote is in writing before anything starts. Photo packages have set prices.",
    link: { label: "Photo packages", href: "/photography#sessions" },
  },
  {
    q: "Do you work outside Nueva Ecija?",
    a: `I'm based in ${site.location} and work remotely on web projects anywhere. Shoots and on-site network work outside San Jose City add travel, quoted by distance.`,
  },
  {
    q: "Do other people work on my project?",
    a: "Sometimes. A shoot may need a hair and makeup artist, an event a second shooter, a network new equipment from a supplier. They're independent, so their availability isn't guaranteed: if someone can't make your date, you'll know early and get an alternative or an adjusted quote.",
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
    q: "Do you write all the code yourself?",
    a: "No, and I'd rather say so up front. I decide what the site or system should do, plan its data, pages and rules, and use AI-assisted coding to write much of it. Then I read it, test it against the plan, fix what's wrong and deploy it. You get a working site and the notes to look after it.",
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
