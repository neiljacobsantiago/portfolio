import { certificates, gear } from "@/content/about";
import { projectBySlug } from "@/content/work";
import { seriesList } from "@/content/series";
import { services } from "@/content/sessions";
import { site } from "@/lib/site";

// Everything NeilAI can point at beyond the content files' own fields: short
// names people would actually type, the games in /play, and one-line facts
// for outside places and things (each drawn from the content files, so the
// offline brain never says anything the site doesn't).

/** How people say each collection in a sentence. New collections fall back to their title. */
const COLLECTION_SAYS: Record<string, string> = {
  events: "school event photos",
  portraits: "fashion portraits",
  landscapes: "landscape shots",
  concerts: "concert shots",
  everyday: "everyday photos",
  astro: "night-sky shots",
  "photo-mode": "Photo Mode shots",
};
export const collectionSays = (slug: string) => COLLECTION_SAYS[slug] ?? seriesList.find((s) => s.slug === slug)?.title.toLowerCase() ?? slug;

/** Words in a question that point at a collection. */
export const COLLECTION_WORDS: Record<string, RegExp> = {
  "photo-mode": /\b(photo ?mode|forza|virtual photography|in-game photo\w*)\b/i,
  events: /\b(school events?|event photos|campus events?)\b/i,
  portraits: /\b(fashion portraits?|portrait photos|portraits)\b/i,
  landscapes: /\b(landscapes?|sunsets?|coastlines?|scenery)\b/i,
  concerts: /\b(concerts?|gigs?|live music|opm|bands?)\b/i,
  everyday: /\b(everyday|still life|cats?)\b/i,
  astro: /\b(astro\w*|night[- ]sky|stars|andromeda|moon|eclipse|galaxy|galaxies)\b/i,
};

/** How people say each photo service ("How much is ___?"). */
const SERVICE_SAYS: Record<string, string> = {
  private: "a private photoshoot",
  id_portrait: "an ID photo",
  graduation: "a grad shoot",
  studio: "a studio portrait",
  funshoot: "an outdoor funshoot",
  pre_event: "a pre-debut shoot",
  event: "full event coverage",
};
export const serviceSays = (id: string) => SERVICE_SAYS[id] ?? services.find((s) => s.id === id)?.name ?? id;

export interface Game {
  id: string;
  title: string;
  blurb: string;
  /** Matches the game's name in a question. */
  test: RegExp;
}

/** The games in /play. */
export const GAMES: Game[] = [
  {
    id: "bay-street-circuit",
    title: "Bay Street Circuit",
    blurb: "Bay Street Circuit is a night street race in 3D: set hot laps through three sectors against your own ghost, or free-roam the paddock, where each pavilion opens one of Neil's projects and six trophies are hidden.",
    test: /\b(bay street( circuit)?|street circuit|circuit|street race|night race|hot laps?|f1 game|island drive|drive|driving game)\b/i,
  },
  {
    id: "shutter",
    title: "Shutter",
    blurb: "Shutter is a concert-photo timing game: wait for the light, then fire at the right moment.",
    test: /\bshutter\b(?! speed)/i,
  },
  {
    id: "packet-check",
    title: "Packet Check",
    blurb: "Packet Check is a beginner-friendly quiz on networking and security awareness: twelve questions, three lives, and a short explanation after every answer.",
    test: /\bpacket check\b|\bsubnet sprint\b|\bquiz\b/i,
  },
  {
    id: "contact-sheet",
    title: "Contact Sheet",
    blurb: "Contact Sheet is a memory game: flip tiles of Neil's own photographs and match the pairs in as few moves as you can.",
    test: /\bcontact sheet\b|\bmemory (game|tiles?)\b|\bpairs\b/i,
  },
];

const cert = (title: string) => certificates.find((c) => c.title === title);
const ciscoCert = certificates.find((c) => /cisco/i.test(c.issuer));
const dictCert = certificates.find((c) => /dict/i.test(c.issuer));
const agileCert = cert("Google Agile Essentials");
const aurora = projectBySlug("aurora-fest-2026");
/** "Kitchie Nadal, Parokya ni Edgar, …" straight from the Aurora Fest write-up. */
const auroraLineup = aurora?.body.join(" ").match(/lineup ran ([^.]+)\./)?.[1] ?? "";
const nikonUse = gear.find((g) => g.brand === "Nikon")?.items[0];

export interface Trivia {
  /** Matches the vetted outside link of the same label in sources.ts. */
  label: string;
  /** What visitors type. */
  names: RegExp;
  /** Kind for learn_more, and the suggestion that asks about it. */
  kind: "place" | "person" | "band" | "organization" | "thing" | "event";
  prompt: string;
  /** How it connects to Neil — drawn from the content files. */
  line: string;
  /** The site topic it belongs with, for follow-up suggestions. */
  near: string;
}

const onAurora = (band: string) => `${band} performed on Day 2 of Aurora Music Festival 2026 at Clark Global City — Neil shot the set from the front barrier.`;

/** Outside places, people and things NeilAI can explain in a line, with a vetted link chip. */
export const TRIVIA: Trivia[] = [
  {
    label: "Central Luzon State University",
    names: /\b(central luzon state university|clsu)\b/i,
    kind: "place",
    prompt: "Where is CLSU?",
    line: `CLSU is where Neil studies — ${site.year.toLowerCase()} of ${site.program.replace(" — ", ", majoring in ")}. It's in the Science City of Muñoz, Nueva Ecija.`,
    near: "about:education",
  },
  {
    label: "San Jose City, Nueva Ecija",
    names: /\bsan jose( city)?\b/i,
    kind: "place",
    prompt: "Where's San Jose City?",
    line: `San Jose City is Neil's home base, up in Nueva Ecija, Central Luzon, ${site.country}. Shoots outside the city are quoted by distance.`,
    near: "booking:travel",
  },
  {
    label: "Nueva Ecija",
    names: /\bnueva ecija\b/i,
    kind: "place",
    prompt: "Where is Nueva Ecija?",
    line: "Nueva Ecija is the Central Luzon province where Neil lives (San Jose City) and studies (CLSU, in the Science City of Muñoz).",
    near: "about:education",
  },
  {
    label: "Clark Global City on the map",
    names: /\bclark( global city)?\b/i,
    kind: "place",
    prompt: "Where is Clark Global City?",
    line: "Clark Global City hosted Day 2 of Aurora Music Festival 2026 — Neil covered it from the front barrier for a little over twelve hours.",
    near: "project:aurora-fest-2026",
  },
  {
    label: "Venice Grand Canal Mall on the map",
    names: /\bvenice grand canal\b/i,
    kind: "place",
    prompt: "Where is Venice Grand Canal Mall?",
    line: "Venice Grand Canal Mall is in Taguig — it's the spot behind “Grand Canal After Dark” in Neil's Natural Landscapes collection.",
    near: "collection:landscapes",
  },
  {
    label: "De La Salle University",
    names: /\b(de la salle( university)?|dlsu|yuchengco hall)\b/i,
    kind: "place",
    prompt: "Where's Yuchengco Hall?",
    line: "Yuchengco Hall is at De La Salle University in Manila, and it's one of the frames in Neil's Natural Landscapes collection.",
    near: "collection:landscapes",
  },
  {
    label: "DA PhilMech",
    names: /\b(philmech|phil mech)\b/i,
    kind: "organization",
    prompt: "What's DA PhilMech?",
    line: "DA PhilMech's Laboratory Services Division, in the Science City of Muñoz, is who PathoScan was built for — the team turned it over on September 28, 2026.",
    near: "project:pathoscan",
  },
  {
    label: "Aurora Music Festival",
    names: /\baurora (music )?fest(ival)?\b/i,
    kind: "event",
    prompt: "What's Aurora Music Festival?",
    line: `Aurora Music Festival is where Neil spent Day 2 of 2026 at the front barrier, shooting ${auroraLineup || "six OPM acts"}.`,
    near: "project:aurora-fest-2026",
  },
  { label: "Kamikazee", names: /\bkamikazee\b/i, kind: "band", prompt: "Who are Kamikazee?", line: onAurora("Kamikazee"), near: "collection:concerts" },
  { label: "Parokya ni Edgar", names: /\bparokya( ni edgar)?\b/i, kind: "band", prompt: "Who are Parokya ni Edgar?", line: onAurora("Parokya ni Edgar"), near: "collection:concerts" },
  { label: "IV of Spades", names: /\b(iv of spades|ivos)\b/i, kind: "band", prompt: "Who are IV of Spades?", line: onAurora("IV of Spades"), near: "collection:concerts" },
  { label: "Kitchie Nadal", names: /\bkitchie( nadal)?\b/i, kind: "person", prompt: "Who is Kitchie Nadal?", line: onAurora("Kitchie Nadal"), near: "collection:concerts" },
  { label: "Sexbomb Girls", names: /\bsexbomb\b/i, kind: "band", prompt: "Who are the Sexbomb Girls?", line: onAurora("The Sexbomb Girls"), near: "collection:concerts" },
  {
    label: "Ben&Ben",
    names: /\bben ?& ?ben\b|\bben and ben\b/i,
    kind: "band",
    prompt: "Who are Ben&Ben?",
    line: "Ben&Ben turn up in Neil's Live Concerts & OPM collection, photographed at a street concert.",
    near: "collection:concerts",
  },
  {
    label: "Jillian Ward",
    names: /\bjillian( ward)?\b/i,
    kind: "person",
    prompt: "Who is Jillian Ward?",
    line: "Jillian Ward is in Neil's Live Concerts & OPM collection, photographed at a street concert.",
    near: "collection:concerts",
  },
  {
    label: "OPM",
    names: /\b(opm|original pilipino music)\b/i,
    kind: "thing",
    prompt: "What's OPM?",
    line: "OPM is Original Pilipino Music — and Neil's Live Concerts & OPM collection is full of it, from Aurora Music Festival to street stages.",
    near: "collection:concerts",
  },
  {
    label: "Aspergillus",
    names: /\baspergillus\b/i,
    kind: "thing",
    prompt: "What's Aspergillus?",
    line: "Aspergillus is the mould PathoScan identifies: five mycotoxin-producing species — A. flavus, A. terreus, A. fumigatus, A. tamarii and A. niger — that can contaminate grains, corn and peanuts.",
    near: "project:pathoscan",
  },
  {
    label: "TensorFlow.js",
    names: /\btensorflow(\.js)?\b/i,
    kind: "thing",
    prompt: "What's TensorFlow.js?",
    line: "TensorFlow.js is what runs PathoScan's model, trained in Teachable Machine, right inside the browser, so it works fully offline.",
    near: "project:pathoscan",
  },
  {
    label: "MobileNetV2 paper",
    names: /\bmobilenet(v2)?\b/i,
    kind: "thing",
    prompt: "What's MobileNet?",
    line: "MobileNet is the kind of compact image network that Google's Teachable Machine builds on. Neil trained PathoScan's model there, then exported it to run in the browser.",
    near: "project:pathoscan",
  },
  {
    label: "Andromeda Galaxy",
    names: /\bandromeda\b|\bm31\b|\bmessier 31\b/i,
    kind: "thing",
    prompt: "What's the Andromeda Galaxy?",
    line: `The Andromeda Galaxy (Messier 31) is one of the frames in Neil's Astrophotography collection, shot on the ${nikonUse ? `Nikon ${nikonUse}` : "Nikon"} — many frames stacked into one quiet image.`,
    near: "collection:astro",
  },
  {
    label: "Lunar eclipses",
    names: /\b(lunar eclipse|blood moon|eclipse)\b/i,
    kind: "thing",
    prompt: "Did he shoot the blood moon?",
    line: "Yes — “Blood Moon”, a total lunar eclipse shot on the Canon EOS 1500D, is in Neil's Astrophotography collection.",
    near: "collection:astro",
  },
  {
    label: "Sequator",
    names: /\bsequator\b/i,
    kind: "thing",
    prompt: "What's Sequator?",
    line: "Sequator is the stacking app in Neil's astrophotography kit: many night-sky frames merged into one clean image.",
    near: "collection:astro",
  },
  {
    label: "DICT",
    names: /\bdict\b/i,
    kind: "organization",
    prompt: "What's the DICT?",
    line: dictCert ? `${dictCert.issuer.replace(" — ", " ")} issued Neil's ${dictCert.title} certificate (${dictCert.date}).` : "The DICT issued one of Neil's certificates.",
    near: "about:certificates",
  },
  {
    label: "Cisco Networking Academy",
    names: /\b(cisco networking academy|netacad)\b/i,
    kind: "organization",
    prompt: "What's Cisco NetAcad?",
    line: ciscoCert ? `Neil earned Cisco Networking Academy's ${ciscoCert.title} certificate in ${ciscoCert.date}, and he's working towards CCNA next.` : "Neil studies networking through Cisco Networking Academy.",
    near: "about:certificates",
  },
  {
    label: "CompTIA Security+",
    names: /\bsecurity\+|\bcomptia\b/i,
    kind: "thing",
    prompt: "Is he taking Security+?",
    line: "CompTIA Security+ is on Neil's list — he's working towards it, alongside CCNA.",
    near: "about:certificates",
  },
  {
    label: "Scrum",
    names: /\bscrum\b/i,
    kind: "thing",
    prompt: "Does Neil know Scrum?",
    line: `He does: PathoScan was built Agile-Scrum in sprints${agileCert ? `, and his ${agileCert.title} certificate (${agileCert.date}) covers the Scrum framework` : ""}.`,
    near: "about:certificates",
  },
  {
    label: "Formula 1",
    names: /\b(formula 1|formula one|f1)\b/i,
    kind: "thing",
    prompt: "Is Neil an F1 fan?",
    line: "Big time — he never misses a race weekend, and sim-races in F1 25 and Forza Horizon 5.",
    near: "fun:racing",
  },
  {
    label: "Forza Horizon",
    names: /\bforza( horizon)?\b/i,
    kind: "thing",
    prompt: "What's Forza Horizon?",
    line: "Forza Horizon is the open-world racing game series behind Neil's new Photo Mode collection: virtual photography from Forza Horizon 4 and Forza Horizon 6, framed with the same eye for line and light as his real shoots.",
    near: "collection:photo-mode",
  },
  {
    label: "RStudio",
    names: /\brstudio\b/i,
    kind: "thing",
    prompt: "What's RStudio?",
    line: "RStudio is a workspace for analysing data with the R language. Neil earned a certificate of completion from “The Art of Becoming: RStudio for Data Analysis”, a Central Luzon State University webinar held August 28, 2026 via Google Meet.",
    near: "about:certificates",
  },
  {
    label: "Next.js",
    names: /\bnext\.?js\b|\bsite built\b/i,
    kind: "thing",
    prompt: "What's this site built with?",
    line: "This very site is built with Next.js and React, styled with Tailwind CSS — all in Neil's web toolkit.",
    near: "about:skills",
  },
];

export const triviaByLabel = (label: string) => TRIVIA.find((t) => t.label === label);
