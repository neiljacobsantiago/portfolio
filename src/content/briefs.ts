import { contactPrefs, referralSources } from "@/content/sessions";

// Project briefs for everything that isn't a photoshoot booking (those live in
// sessions.ts). One definition drives the contact form, the server's checks
// and both emails, so Neil and the client always read the same thing.

export type TopicId = "website" | "photography" | "video" | "network" | "security" | "other";

interface Base {
  id: string;
  label: string;
  /** Shown as "(optional)" and never required by the server. */
  optional?: boolean;
  /** Spans both columns of the form grid. */
  wide?: boolean;
  /** Shown on the invitation card at the top of both emails. */
  card?: boolean;
}

export type Field =
  | (Base & { kind: "chips"; options: readonly string[] })
  | (Base & { kind: "multi"; options: readonly string[] })
  | (Base & { kind: "select"; options: readonly string[] })
  | (Base & { kind: "text" | "url" | "tel"; placeholder?: string; max?: number })
  | (Base & { kind: "date" })
  /** A box that must be ticked to send, e.g. permission to test a system. */
  | (Base & { kind: "confirm" });

export interface BriefStep {
  title: string;
  /** Why it's asked, in one line. */
  hint?: string;
  fields: Field[];
}

export interface Brief {
  id: TopicId;
  /** The chip on the form. */
  button: string;
  /** How the emails name it, e.g. "Website project". */
  topic: string;
  emoji: string;
  intro: string;
  steps: BriefStep[];
  message: { label: string; placeholder: string };
  /** What happens after sending, in order. Shown on the form and in both emails. */
  next: string[];
}

const budget = (...ranges: string[]) => [...ranges, "Not sure yet"] as const;

/** Shared by every brief: how to reach the client. */
const keepInTouch: BriefStep = {
  title: "Staying in touch",
  hint: "So the reply reaches you the way you prefer.",
  fields: [
    { id: "phone", kind: "tel", label: "Mobile number", optional: true, placeholder: "09xx xxx xxxx", max: 20 },
    { id: "handle", kind: "text", label: "Messenger / Viber name", optional: true, placeholder: "So Neil can find you", max: 80 },
    { id: "contact", kind: "chips", label: "Best way to reach you", options: contactPrefs, wide: true },
    { id: "referral", kind: "select", label: "How did you find Neil?", optional: true, options: referralSources, wide: true },
  ],
};

const reply = "Neil reads the brief and replies within 24 hours, with questions if anything is unclear.";

export const briefs: Brief[] = [
  {
    id: "website",
    button: "A website",
    topic: "Website project",
    emoji: "🖥️",
    intro: "A few details so Neil can scope the site, suggest the right approach and give you a fair quote on the first reply. Anything optional can wait for the call.",
    steps: [
      {
        title: "The project",
        hint: "Pick the closest; it only sets the starting point.",
        fields: [
          {
            id: "kind",
            kind: "chips",
            label: "What are we building?",
            wide: true,
            card: true,
            options: ["Portfolio or personal site", "Business or shop page", "Online store", "Booking or reservations", "School or organisation site", "Web system or dashboard", "Landing page", "Not sure yet"],
          },
          { id: "stage", kind: "chips", label: "Starting from", wide: true, options: ["Brand new", "Redesign an existing site", "Fix or add to a site"] },
          { id: "org", kind: "text", label: "Business or brand name", optional: true, placeholder: "e.g. Kape ni Lola", max: 100 },
          { id: "current", kind: "url", label: "Current site, if there is one", optional: true, placeholder: "https://…", max: 300 },
        ],
      },
      {
        title: "What it needs",
        hint: "Tick everything that applies; it's how the size of the job is judged.",
        fields: [
          {
            id: "pages",
            kind: "multi",
            label: "Pages",
            wide: true,
            options: ["Home", "About", "Services or menu", "Gallery or portfolio", "Blog or news", "Contact form", "FAQ", "Team", "Events"],
          },
          {
            id: "features",
            kind: "multi",
            label: "Features",
            wide: true,
            options: ["Online booking", "Online payments (GCash, Maya, cards)", "Product catalogue or cart", "Accounts and logins", "Admin dashboard", "Content you can edit yourself", "Search", "Map and directions", "Filipino and English"],
          },
          { id: "content", kind: "chips", label: "Text and photos", wide: true, options: ["Ready to go", "Some of it", "I need help with them"] },
        ],
      },
      {
        title: "Domain & hosting",
        hint: "The address people type, and where the site lives.",
        fields: [
          { id: "domain", kind: "chips", label: "Domain (e.g. yourname.com)", options: ["I have one", "I need one", "Not sure"] },
          { id: "hosting", kind: "chips", label: "Hosting", options: ["I have hosting", "Set it up for me", "Not sure"] },
        ],
      },
      {
        title: "Budget & timing",
        hint: "A range is enough. It decides what's realistic, not what you'll be charged.",
        fields: [
          { id: "budget", kind: "chips", label: "Budget", wide: true, card: true, options: budget("Under ₱10,000", "₱10,000–₱25,000", "₱25,000–₱50,000", "₱50,000+") },
          { id: "deadline", kind: "date", label: "Launch by", optional: true, card: true },
          { id: "care", kind: "chips", label: "After launch", options: ["I'll update it myself", "Monthly care plan", "Just launch it"] },
          { id: "refs", kind: "text", label: "Sites you like the look of", optional: true, wide: true, placeholder: "Links or names, and what you like about them", max: 300 },
        ],
      },
      keepInTouch,
    ],
    message: { label: "Tell me about the site", placeholder: "Who it's for, what visitors should be able to do, anything you've seen elsewhere and want here…" },
    next: [reply, "A short call or chat to agree on pages, features and the timeline.", "You get a written quote and plan; a 30% downpayment starts the work.", "You see progress on a preview link and give feedback as it's built.", "Launch, a walkthrough of how to update it, and 30 days of free fixes."],
  },
  {
    id: "video",
    button: "Video & media",
    topic: "Video project",
    emoji: "🎬",
    intro: "Event highlights, explainers, reels or a short film. These details help Neil plan the crew, the gear and the edit time before quoting.",
    steps: [
      {
        title: "The video",
        fields: [
          {
            id: "kind",
            kind: "chips",
            label: "What kind of video?",
            wide: true,
            card: true,
            options: ["Event highlight reel", "Same-day edit", "Explainer or info series", "Social media reels", "Interview or testimonial", "Short film or music video", "Not sure yet"],
          },
          { id: "org", kind: "text", label: "Organisation or event name", optional: true, placeholder: "e.g. CLSU IT Week 2027", max: 100 },
          { id: "count", kind: "chips", label: "How many videos?", options: ["1", "2–3", "4–6", "A series (7+)"] },
          { id: "length", kind: "chips", label: "Length of each", options: ["Under 1 minute", "1–3 minutes", "3–10 minutes", "Longer"] },
        ],
      },
      {
        title: "The shoot",
        hint: "Where and when the filming happens.",
        fields: [
          { id: "shootDate", kind: "date", label: "Filming date", optional: true, card: true },
          { id: "location", kind: "text", label: "Where", optional: true, placeholder: "Venue or city", max: 160 },
          { id: "duration", kind: "chips", label: "Time on site", options: ["Up to 2 hours", "Half day", "Full day", "Several days"] },
          {
            id: "needs",
            kind: "multi",
            label: "Also needed",
            wide: true,
            options: ["Photos too", "Drone shots", "Clean audio / lapel mics", "Subtitles", "Script or storyboard help", "Vertical cuts for Reels/TikTok", "Raw footage handover"],
          },
        ],
      },
      {
        title: "Budget & delivery",
        fields: [
          { id: "budget", kind: "chips", label: "Budget", wide: true, card: true, options: budget("Under ₱5,000", "₱5,000–₱15,000", "₱15,000–₱30,000", "₱30,000+") },
          { id: "deadline", kind: "date", label: "Final video needed by", optional: true, card: true },
          { id: "platform", kind: "multi", label: "Where it will be shown", wide: true, options: ["Facebook", "Instagram", "TikTok", "YouTube", "Big screen at an event", "Website"] },
          { id: "refs", kind: "url", label: "A video you like (optional)", optional: true, wide: true, placeholder: "https://…", max: 300 },
        ],
      },
      keepInTouch,
    ],
    message: { label: "Tell me about the video", placeholder: "The story or message, the audience, the feeling you're after…" },
    next: [reply, "A call to settle the story, shot list and schedule.", "You get a written quote; a 30% downpayment books the dates.", "Filming, then a first cut for your notes (two rounds of revisions included).", "Final files delivered in the sizes each platform needs."],
  },
  {
    id: "network",
    button: "A network",
    topic: "Network project",
    emoji: "🛜",
    intro: "Whether it's Wi-Fi that won't reach the back room or cabling a new office, these answers let Neil size the job before visiting.",
    steps: [
      {
        title: "The place",
        fields: [
          {
            id: "place",
            kind: "chips",
            label: "Where is it?",
            wide: true,
            card: true,
            options: ["Home", "Small office", "Shop or café", "School or computer lab", "Dorm or boarding house", "Event or venue", "Other"],
          },
          { id: "city", kind: "text", label: "Town or city", card: true, placeholder: "e.g. San Jose City", max: 80 },
          { id: "size", kind: "chips", label: "Area to cover", options: ["One room", "One floor", "A whole building", "Several buildings or outdoors"] },
        ],
      },
      {
        title: "People & devices",
        hint: "How much the network has to carry at its busiest.",
        fields: [
          { id: "users", kind: "chips", label: "People online at once", wide: true, options: ["1–5", "6–20", "21–50", "51–150", "150+"] },
          {
            id: "devices",
            kind: "multi",
            label: "What connects",
            wide: true,
            options: ["Laptops and PCs", "Phones", "Printers", "CCTV cameras", "POS or cashier", "Smart TVs and gadgets", "Servers or NAS"],
          },
        ],
      },
      {
        title: "What's there now",
        fields: [
          { id: "setup", kind: "chips", label: "Current setup", wide: true, options: ["Nothing yet", "Just the ISP's router", "Extra routers or access points", "A managed network"] },
          { id: "isp", kind: "chips", label: "Internet provider", wide: true, options: ["PLDT", "Globe", "Converge", "Starlink", "DITO", "Other", "None yet"] },
          {
            id: "problems",
            kind: "multi",
            label: "Problems right now",
            wide: true,
            options: ["Slow speeds", "Dead spots", "Keeps disconnecting", "Guests share the main Wi-Fi", "Don't know what's connected", "Messy cables", "New setup, no problems yet"],
          },
        ],
      },
      {
        title: "What you need",
        fields: [
          {
            id: "goals",
            kind: "multi",
            label: "Goals",
            wide: true,
            options: ["Wi-Fi everywhere", "Wired cabling", "Separate guest Wi-Fi", "Network for CCTV", "Computer lab setup", "Remote access (VPN)", "Labels and a network map", "Ongoing support"],
          },
          { id: "visit", kind: "chips", label: "Site visit", options: ["Come and see it", "Start remotely"] },
          { id: "budget", kind: "chips", label: "Budget (equipment + work)", wide: true, card: true, options: budget("Under ₱10,000", "₱10,000–₱30,000", "₱30,000–₱80,000", "₱80,000+") },
          { id: "deadline", kind: "date", label: "Needed by", optional: true, card: true },
        ],
      },
      keepInTouch,
    ],
    message: { label: "Tell me about the network", placeholder: "What's frustrating now, the layout of the place, anything already bought…" },
    next: [reply, "A site visit or video call to walk the space and check the signal.", "You get a plan with an equipment list and a quote; nothing is bought without your OK.", "Setup and testing, room by room.", "A network map, the passwords handed over, and a walkthrough."],
  },
  {
    id: "security",
    button: "Security",
    topic: "Security check",
    emoji: "🛡️",
    intro: "A plain-language check of what's exposed and what to fix first, or an awareness talk for your team. Testing only ever happens on systems you own or are allowed to have tested.",
    steps: [
      {
        title: "What to look at",
        fields: [
          {
            id: "scope",
            kind: "multi",
            label: "In scope",
            wide: true,
            card: true,
            options: ["A website or web app", "Office network and Wi-Fi", "Social media and accounts", "Laptops and phones", "A talk or training for staff/students", "Not sure, a general check-up"],
          },
          { id: "who", kind: "chips", label: "For", options: ["Myself", "A small business", "A school or organisation", "A company"] },
          { id: "org", kind: "text", label: "Organisation name", optional: true, max: 100 },
          { id: "target", kind: "url", label: "Website or app address", optional: true, wide: true, placeholder: "https://…", max: 300 },
        ],
      },
      {
        title: "The situation",
        hint: "If something has already happened, Neil prioritises it.",
        fields: [
          {
            id: "incident",
            kind: "chips",
            label: "Anything happened recently?",
            wide: true,
            card: true,
            options: ["No, just being careful", "Suspicious logins or messages", "An account was taken over", "Data may have leaked", "Malware or ransomware"],
          },
          { id: "size", kind: "chips", label: "People / devices involved", wide: true, options: ["1–5", "6–20", "21–100", "100+"] },
        ],
      },
      {
        title: "What you'd like back",
        fields: [
          { id: "format", kind: "multi", label: "Deliverables", wide: true, options: ["A written report", "A walkthrough call", "Help fixing the issues", "A talk or workshop"] },
          { id: "mode", kind: "chips", label: "On site or online", options: ["On site", "Online", "Either"] },
          { id: "budget", kind: "chips", label: "Budget", wide: true, options: budget("Under ₱5,000", "₱5,000–₱15,000", "₱15,000–₱40,000", "₱40,000+") },
          { id: "deadline", kind: "date", label: "Needed by", optional: true, card: true },
          {
            id: "authorised",
            kind: "confirm",
            wide: true,
            label: "I own these systems or have written permission from whoever does. Nothing is tested until that's confirmed in writing.",
          },
        ],
      },
      keepInTouch,
    ],
    message: { label: "Tell me what's worrying you", placeholder: "What happened or what you'd like checked. Please don't send passwords here." },
    next: [reply, "A call to agree on exactly what's in scope, in writing.", "The check runs only within that scope and the agreed hours.", "You get findings in plain language, worst first, with how to fix each one.", "A follow-up check once fixes are in, if you'd like one."],
  },
  {
    id: "other",
    button: "Something else",
    topic: "Something else",
    emoji: "✉️",
    intro: "",
    steps: [
      {
        title: "What's it about?",
        fields: [
          {
            id: "kind",
            kind: "chips",
            label: "Closest match",
            wide: true,
            card: true,
            options: ["A collaboration", "A talk or workshop", "Tech help", "School or org project", "Hiring or internship", "Just saying hi", "Other"],
          },
          { id: "deadline", kind: "date", label: "Any date to keep in mind?", optional: true },
          { id: "org", kind: "text", label: "Organisation", optional: true, max: 100 },
        ],
      },
    ],
    message: { label: "Tell me about it", placeholder: "Dates, places, what you have in mind…" },
    next: ["Neil reads every message himself and replies within 24 hours."],
  },
];

export const briefFor = (id: string | null | undefined) => briefs.find((b) => b.id === id);

/** Answers as the form sends them: one string, or a list for multi-choice. */
export type BriefAnswers = Record<string, string | string[]>;

const fieldsOf = (b: Brief) => b.steps.flatMap((s) => s.fields);
const line = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const URL_RE = /^https?:\/\/[^\s<>"]+$/i;

/** Keeps only valid answers from untrusted input; `missing` lists required questions left blank. */
export function cleanBrief(b: Brief, raw: unknown): { answers: BriefAnswers; missing: string[] } {
  const x = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const answers: BriefAnswers = {};
  const missing: string[] = [];
  for (const f of fieldsOf(b)) {
    const v = x[f.id];
    let value: string | string[] | undefined;
    if (f.kind === "multi") {
      const list = Array.isArray(v) ? v.filter((o): o is string => typeof o === "string" && f.options.includes(o)) : [];
      if (list.length) value = [...new Set(list)];
    } else if (f.kind === "chips" || f.kind === "select") {
      const s = line(v, 80);
      if (f.options.includes(s)) value = s;
    } else if (f.kind === "date") {
      const s = line(v, 10);
      if (DATE_RE.test(s)) value = s;
    } else if (f.kind === "confirm") {
      if (v === true || v === "yes") value = "yes";
    } else if (f.kind === "url") {
      const s = line(v, f.max ?? 300);
      if (URL_RE.test(s)) value = s;
    } else if (f.kind === "tel") {
      const s = line(v, f.max ?? 20);
      if (s.replace(/\D/g, "").length >= 7 && /^[0-9+()\s-]+$/.test(s)) value = s;
    } else {
      const s = line(v, f.max ?? 160);
      if (s) value = s;
    }
    if (value !== undefined) answers[f.id] = value;
    else if (!f.optional && (f.kind === "confirm" || isKey(b, f))) missing.push(f.label);
  }
  return { answers, missing };
}

/** The questions a brief can't be sent without: its first choice and any permission box. */
function isKey(b: Brief, f: Field) {
  return f === b.steps[0].fields[0];
}

export const requiredIn = (b: Brief) => fieldsOf(b).filter((f) => !f.optional && (f.kind === "confirm" || isKey(b, f))).map((f) => f.id);

const shortDate = (iso: string) => new Intl.DateTimeFormat("en-PH", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));

/** One answer as a person reads it. */
function show(f: Field, v: string | string[] | undefined): string {
  if (v === undefined || v.length === 0) return "";
  if (Array.isArray(v)) return v.join(", ");
  if (f.kind === "date") return shortDate(v);
  if (f.kind === "confirm") return "Confirmed";
  return v;
}

const labelOf = (f: Field) => (f.kind === "confirm" ? "Permission to test" : f.label.replace(/\s*\(optional\)$/i, ""));

/** The brief grouped by step, the way both the client and Neil read it. */
export function briefSections(b: Brief, a: BriefAnswers): { title: string; rows: [string, string][] }[] {
  return b.steps
    .map((s) => ({ title: s.title, rows: s.fields.map((f): [string, string] => [labelOf(f), show(f, a[f.id])]).filter(([, v]) => v) }))
    .filter((s) => s.rows.length > 0);
}

/** Title and lines for the invitation card in the emails. */
export function briefCard(b: Brief, a: BriefAnswers) {
  const cards = fieldsOf(b).filter((f) => f.card);
  const first = cards[0];
  const title = (first && show(first, a[first.id])) || b.topic;
  const lines = cards.slice(1).map((f) => {
    const v = show(f, a[f.id]);
    return v && (f.kind === "date" ? `${labelOf(f)}: ${v}` : v);
  });
  return { kicker: b.topic, title, lines: lines.filter(Boolean) as string[] };
}
