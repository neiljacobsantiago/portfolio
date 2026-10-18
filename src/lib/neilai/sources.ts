import { certificates } from "@/content/about";

// Outside links NeilAI can hand out. The model never writes URLs itself: it
// names a topic, and the link comes from this vetted list, or else from a
// search URL that always works (Wikipedia, Google Maps, Google). Every one of
// them opens behind a "you're leaving the site" confirmation in the chat.

export type SourceKind = "place" | "person" | "band" | "organization" | "thing" | "event";

export interface Source {
  label: string;
  href: string;
  /** Shown on the chip and in the confirmation, e.g. "en.wikipedia.org". */
  host: string;
  /**
   * "vetted" (the default): from the list below, picked for what Neil's site
   * mentions. "web": a live web search result that nobody here has checked.
   */
  kind?: "vetted" | "web";
}

interface Entry {
  label: string;
  href: string;
  /** Names as they appear in prose (matched case-sensitively, whole words). */
  names: string[];
}

const wiki = (title: string) => `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;
const maps = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
const agile = certificates.find((c) => c.title === "Google Agile Essentials")?.verify;

const ENTRIES: Entry[] = [
  // Schools, offices and places
  { label: "Central Luzon State University", href: "https://clsu.edu.ph", names: ["Central Luzon State University", "CLSU"] },
  { label: "PHINMA Araullo University", href: `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent("PHINMA Araullo University")}`, names: ["PHINMA Araullo University", "Araullo University"] },
  { label: "De La Salle University", href: "https://www.dlsu.edu.ph", names: ["De La Salle University", "DLSU"] },
  { label: "DA PhilMech", href: "https://www.philmech.gov.ph", names: ["PhilMech", "Philippine Center for Postharvest Development and Mechanization"] },
  { label: "DICT", href: "https://dict.gov.ph", names: ["DICT", "Department of Information and Communications Technology"] },
  { label: "San Jose City, Nueva Ecija", href: wiki("San Jose, Nueva Ecija"), names: ["San Jose City, Nueva Ecija", "San Jose City", "San Jose, Nueva Ecija"] },
  { label: "Nueva Ecija", href: wiki("Nueva Ecija"), names: ["Nueva Ecija"] },
  { label: "Clark Global City on the map", href: maps("Clark Global City, Pampanga"), names: ["Clark Global City"] },
  { label: "Venice Grand Canal Mall on the map", href: maps("Venice Grand Canal Mall, Taguig"), names: ["Venice Grand Canal"] },
  // Music
  { label: "Aurora Music Festival", href: `https://www.google.com/search?q=${encodeURIComponent("Aurora Music Festival")}`, names: ["Aurora Music Festival", "Aurora Fest"] },
  { label: "Kamikazee", href: wiki("Kamikazee"), names: ["Kamikazee"] },
  { label: "Parokya ni Edgar", href: wiki("Parokya ni Edgar"), names: ["Parokya ni Edgar"] },
  { label: "IV of Spades", href: wiki("IV of Spades"), names: ["IV of Spades"] },
  { label: "Ben&Ben", href: wiki("Ben&Ben"), names: ["Ben&Ben", "Ben & Ben"] },
  { label: "Kitchie Nadal", href: wiki("Kitchie Nadal"), names: ["Kitchie Nadal"] },
  { label: "Rico Blanco", href: wiki("Rico Blanco"), names: ["Rico Blanco"] },
  { label: "Chito Miranda", href: wiki("Chito Miranda"), names: ["Chito Miranda"] },
  { label: "Sexbomb Girls", href: wiki("Sexbomb Girls"), names: ["Sexbomb Girls"] },
  { label: "Jillian Ward", href: wiki("Jillian Ward"), names: ["Jillian Ward"] },
  { label: "OPM", href: wiki("Original Pilipino Music"), names: ["OPM", "Original Pilipino Music"] },
  // Science behind the projects and photos
  { label: "Aspergillus", href: wiki("Aspergillus"), names: ["Aspergillus"] },
  { label: "Mycotoxins", href: wiki("Mycotoxin"), names: ["mycotoxin", "mycotoxins", "Mycotoxin"] },
  { label: "MobileNetV2 paper", href: "https://arxiv.org/abs/1801.04381", names: ["MobileNetV2"] },
  { label: "TensorFlow.js", href: "https://www.tensorflow.org/js", names: ["TensorFlow.js"] },
  { label: "Progressive web apps", href: wiki("Progressive web app"), names: ["PWA", "progressive web app"] },
  { label: "Andromeda Galaxy", href: wiki("Andromeda Galaxy"), names: ["Andromeda"] },
  { label: "Lunar eclipses", href: wiki("Lunar eclipse"), names: ["lunar eclipse", "blood moon", "Blood Moon"] },
  { label: "Subnetting", href: wiki("Subnet"), names: ["subnetting", "VLSM"] },
  { label: "VLANs", href: wiki("VLAN"), names: ["VLAN", "VLANs"] },
  { label: "Scrum", href: wiki("Scrum (software development)"), names: ["Scrum", "Agile-Scrum"] },
  // Certificates and tools
  ...(agile ? [{ label: "Verify: Google Agile Essentials", href: agile, names: ["Google Agile Essentials"] }] : []),
  { label: "Cisco Networking Academy", href: "https://www.netacad.com", names: ["Cisco Networking Academy", "NetAcad"] },
  { label: "Cisco Packet Tracer", href: "https://www.netacad.com/cisco-packet-tracer", names: ["Packet Tracer"] },
  { label: "Cisco certifications (CCNA)", href: wiki("Cisco certifications"), names: ["CCNA"] },
  { label: "CompTIA Security+", href: "https://www.comptia.org/certifications/security", names: ["Security+"] },
  { label: "Kali Linux", href: "https://www.kali.org", names: ["Kali Linux"] },
  { label: "Next.js", href: "https://nextjs.org", names: ["Next.js"] },
  { label: "Tailwind CSS", href: "https://tailwindcss.com", names: ["Tailwind"] },
  { label: "WordPress", href: "https://wordpress.org", names: ["WordPress"] },
  { label: "Figma", href: "https://www.figma.com", names: ["Figma"] },
  { label: "Sequator", href: "https://sites.google.com/view/sequator", names: ["Sequator"] },
  // Cameras and hobbies
  { label: "Nikon D780", href: wiki("Nikon D780"), names: ["Nikon D780", "D780"] },
  { label: "Canon EOS 80D", href: wiki("Canon EOS 80D"), names: ["EOS 80D"] },
  { label: "Canon EOS 1500D", href: wiki("Canon EOS 2000D"), names: ["EOS 1500D"] },
  { label: "Formula 1", href: "https://www.formula1.com", names: ["Formula 1", "F1"] },
  { label: "Forza Horizon", href: wiki("Forza Horizon"), names: ["Forza Horizon"] },
  { label: "RStudio", href: "https://posit.co/products/open-source/rstudio/", names: ["RStudio"] },
];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Whole-word match that also works for names ending in symbols ("Security+", "Next.js").
const pattern = (name: string) => new RegExp(`(?<![\\w&])${escape(name)}(?![\\w&])`);
const PATTERNS = ENTRIES.map((e) => ({ entry: e, res: e.names.map(pattern) }));

export const hostOf = (href: string) => {
  try {
    return new URL(href).host.replace(/^www\./, "");
  } catch {
    return "";
  }
};

const toSource = (e: { label: string; href: string }): Source => ({ label: e.label, href: e.href, host: hostOf(e.href) });

/** Known places and things mentioned in a reply, in the order they appear. */
export function sourcesIn(text: string, max = 3): Source[] {
  const hits = PATTERNS.flatMap(({ entry, res }) => {
    const found = res.map((re) => re.exec(text)).filter((m): m is RegExpExecArray => m !== null);
    if (!found.length) return [];
    const first = found.reduce((a, b) => (b.index < a.index || (b.index === a.index && b[0].length > a[0].length) ? b : a));
    return [{ entry, at: first.index, end: first.index + first[0].length }];
  }).sort((a, b) => a.at - b.at || b.end - a.end);
  // A name inside a longer one ("Nueva Ecija" in "San Jose City, Nueva Ecija") counts once.
  const kept: typeof hits = [];
  for (const h of hits) if (!kept.some((k) => h.at < k.end && h.end > k.at)) kept.push(h);
  return kept.slice(0, max).map((h) => toSource(h.entry));
}

/** A link for any topic: the vetted one if we have it, otherwise a search that always resolves. */
export function resolveTopic(topic: string, kind: SourceKind = "thing"): Source | null {
  const name = topic.replace(/\s+/g, " ").trim().slice(0, 80);
  if (name.length < 2) return null;
  const lower = name.toLowerCase();
  const known = ENTRIES.find((e) => e.label.toLowerCase() === lower || e.names.some((n) => n.toLowerCase() === lower));
  if (known) return toSource(known);
  if (kind === "place") return toSource({ label: `${name} on the map`, href: maps(name) });
  if (kind === "event") return toSource({ label: name, href: `https://www.google.com/search?q=${encodeURIComponent(name)}` });
  return toSource({ label: name, href: `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(name)}` });
}

/** Only ever open https links from the chat: never a bare IP, a local name or a URL carrying credentials. */
export function isSafeHref(href: string): boolean {
  if (!/^https:\/\//i.test(href) || href.length > 2000) return false;
  try {
    const url = new URL(href);
    if (url.username || url.password) return false;
    const host = url.hostname;
    if (!host.includes(".") || /^[\d.]+$/.test(host) || host.includes(":") || /(^|\.)(localhost|local|internal)$/i.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}

/** A Google search for the visitor's own question: the way out when NeilAI can't search for them. */
export function googleSearch(query: string): Source {
  const q = query.replace(/\s+/g, " ").trim().slice(0, 120);
  const short = q.length > 48 ? `${q.slice(0, 46).trimEnd()}…` : q;
  return { label: `Search Google: “${short}”`, href: `https://www.google.com/search?q=${encodeURIComponent(q)}`, host: "google.com", kind: "web" };
}
