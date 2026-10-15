import type { ToolId } from "@/lib/tools";

// Every project on the site. Pages, cards, the sitemap and NeilAI read from here.
// Images live in /public (paths below). Add a project by adding an object.

export type Category = "systems" | "web" | "media";

export const categories: Record<Category, { label: string; blurb: string }> = {
  systems: { label: "Systems & Security", blurb: "Networks, auditing and applied AI" },
  web: { label: "Web & Software", blurb: "Planned architecture, built fast" },
  media: { label: "Media & Production", blurb: "Directing, filming and coverage" },
};

export interface Project {
  slug: string;
  title: string;
  category: Category;
  /** Shown on the home page, in this order. */
  featured?: number;
  /** One line a non-technical visitor can follow. */
  plain: string;
  /** Short label above the title, e.g. a course code or client. */
  context: string;
  role: string;
  status: string;
  body: string[];
  stack: string[];
  team?: string[];
  links?: { label: string; href: string }[];
  /** Repository exists but is private — shown as a badge instead of a link. */
  privateRepo?: boolean;
  cover?: string;
  /** Project mark, shown as a badge on the cover and beside the title. */
  logo?: { src: string; bg: string };
  images?: { src: string; alt: string }[];
  /** YouTube video id, played with a click-to-load embed. */
  youtube?: string;
  /** Published pieces on Facebook: videos play in a click-to-load embed, posts open on Facebook. */
  media?: { label: string; href: string; kind: "video" | "post" }[];
  /** A full-length page capture, browsed inside a scrollable "browser window". */
  scrollShot?: { src: string; alt: string };
  /** A small heads-up shown under the links (hosting caveats, pending coverage). */
  notice?: string;
  /** A pull quote in the project's own words. */
  quote?: string;
  /** A Lab tool built from this project, embedded on its page as "Try it". */
  tool?: ToolId;
  /** How the project grew across courses, shown as a stepper. */
  timeline?: { course: string; stage: string; detail: string }[];
}

const fbVideo = (id: string) => `https://www.facebook.com/clsudit/videos/${id}/`;
const itscPost = (id: string) => `https://www.facebook.com/CLSU.ITSC/posts/${id}`;

export const projects: Project[] = [
  {
    slug: "pathoscan",
    tool: "pathoscan",
    title: "PathoScan",
    category: "systems",
    featured: 1,
    plain: "Point a phone at a fungal culture and it names the species in seconds — no internet needed.",
    context: "COMSCI 3100 · for DA PhilMech",
    role: "UI/UX & model training",
    status: "Turned over to PhilMech · Sep 2026",
    body: [
      "PathoScan is a web-based plant pathogen image classification system with a localized architecture, built for the Laboratory Services Division of DA PhilMech in the Science City of Muñoz. Several Aspergillus species produce mycotoxins that contaminate grains, corn and peanuts; identifying them by eye takes trained staff, printed references and often 10 to 14 days.",
      "Lab staff photograph a Potato Dextrose Agar plate (or upload one) and a MobileNetV2 convolutional neural network, running in the browser through TensorFlow.js, names one of five mycotoxin-producing species — A. flavus, A. terreus, A. fumigatus, A. tamarii or A. niger — or answers \"Unknown\" instead of forcing a guess. It shows the confidence, a probability matrix for every class, and the species' known colony traits to compare against the plate.",
      "Results at 90% confidence or higher are cleared for preliminary screening; anything lower is flagged for PCR confirmation. Everything runs on the device inside PhilMech's local network: no login, no cloud, no stored history beyond the most recent scan for crash recovery, and it installs and works offline as a Progressive Web App.",
      "We built it as our COMSCI 3100 project using an Agile-Scrum approach, working in sprints as a team of nine, and I designed the interface and trained the classification model. On September 28, 2026, the team formally turned the system over to PhilMech, where it was accepted for operational use.",
    ],
    stack: ["React", "TypeScript", "Vite", "TensorFlow.js", "MobileNetV2", "Teachable Machine", "IndexedDB", "PWA", "Agile-Scrum"],
    team: [
      "Mark James Mangalino — Project Leader",
      "Aleinna Cassandra Calulot — Technical Lead",
      "Johanna Alexa Arboleda — Technical Lead",
      "Neil Jacob Santiago — UI/UX & Model Training",
      "Riza Mae Carbonel — Programmer",
      "Ma. Victoria Tamundong — Programmer",
      "Julius Bantolino — Quality Assurance",
      "Alpha Agbuis — Documentation Lead",
      "Frauline Marisse Alvendia — Documentation Lead",
    ],
    privateRepo: true,
    images: [
      { src: "/projects/pathoscan-turnover.jpg", alt: "Team TBD turning PathoScan over to the PhilMech Laboratory Services Division" },
      { src: "/projects/pathoscan-architecture.jpg", alt: "PathoScan system architecture: PWA client, on-device AI, IndexedDB and result output" },
      { src: "/projects/pathoscan-flow.jpg", alt: "PathoScan user flow from capture to clearance or further testing" },
    ],
  },
  {
    slug: "buildit",
    title: "BuildIT",
    category: "web",
    featured: 2,
    plain: "Pick PC parts, check they fit together, and check out — all in one place.",
    context: "COMSCI 1200 → INTECH 2100 → INTECH 2201",
    role: "Lead UI/UX designer",
    status: "Shipped",
    body: [
      "A custom PC builder and storefront inspired by PCPartPicker. Traditional tech retail sites overwhelm buyers with incompatible parts and disjointed checkouts; BuildIT puts drafting a build, checking compatibility and paying into one calm flow.",
      "It's the project that grew up with us across three courses: a C command-line program in COMSCI 1200, a high-fidelity Figma prototype in INTECH 2100, and finally a cloud-hosted storefront built on WordPress for INTECH 2201.",
    ],
    timeline: [
      { course: "COMSCI 1200", stage: "Command line", detail: "The first BuildIT: a C program for logging in, browsing an inventory and building a PC from the terminal." },
      { course: "INTECH 2100", stage: "Figma prototype", detail: "The same flow redesigned as a high-fidelity, clickable Figma prototype — the full home page and storefront." },
      { course: "INTECH 2201", stage: "Cloud site", detail: "A live storefront built on WordPress and hosted in the cloud, with the e-commerce database behind it." },
    ],
    stack: ["C", "Figma", "WordPress", "Cloud hosting (Azure)", "E-commerce database"],
    team: ["Neil Jacob Santiago — Lead UI/UX Designer", "Rion Bustos — Lead Developer & original C developer", "Anne Margaret Tablanza — Designer & content layouts", "Vinze Norbert Siega — Database, Azure hosting & docs", "Justine Rey Garcia — Content developer"],
    links: [
      { label: "Live site", href: "https://buildits.app" },
      { label: "GitHub (C version)", href: "https://github.com/neiljacobsantiago/BuildIT" },
    ],
    notice: "The live deployment is hosted temporarily for INTECH 2201 evaluation and may go offline.",
    cover: "/projects/buildit-1.jpg",
    logo: { src: "/projects/logos/buildit.png", bg: "transparent" },
    scrollShot: { src: "/projects/buildit-home.jpg", alt: "The full BuildIT home page prototype, top to bottom" },
    images: [
      { src: "/projects/buildit-1.jpg", alt: "BuildIT web storefront" },
      { src: "/projects/buildit-journal.jpg", alt: "The BuildIT wordmark" },
      { src: "/projects/buildit-4.jpg", alt: "The original C version: login" },
      { src: "/projects/buildit-3.jpg", alt: "The original C version: user menu" },
      { src: "/projects/buildit-2.jpg", alt: "The original C version: parts inventory" },
    ],
  },
  {
    slug: "clirdec-network",
    tool: "subnet",
    title: "CLIRDEC Network Architecture",
    category: "systems",
    featured: 3,
    plain: "Planned how an entire research facility's computers talk to each other — and what it would cost.",
    context: "Network design · CLSU",
    role: "Network designer",
    status: "Deployed & stable",
    body: [
      "Physical and logical topologies for the CLIRDEC facility at CLSU: inter-VLAN routing, static routes and RIP, plus a complete hardware bill of materials priced in pesos for procurement.",
    ],
    stack: ["Cisco Packet Tracer", "VLANs", "RIP", "Static routing", "Subnetting"],
    cover: "/projects/thumb-server.jpg",
  },
  {
    slug: "cyber-awareness-series",
    tool: "link",
    title: "Cyber Awareness Series",
    category: "media",
    plain: "Six short videos that make data privacy make sense to everyone.",
    context: "CLSU Department of Information Technology",
    role: "Videographer & on-site director",
    status: "Published",
    body: [
      "A six-part video campaign shot with the CLSU Department of Information Technology, translating data privacy concepts and network security threats into short, digestible episodes.",
      "On-location filming, audio capture and visual direction for every episode.",
    ],
    stack: ["Direction", "Videography", "Audio capture"],
    cover: "/projects/cybersec.jpg",
    media: ["1429432154804620", "779992074508160", "623204870570221", "2993131330861807", "1519370719229369", "2283184825446569"].map((id, i) => ({
      label: `Episode ${String(i + 1).padStart(2, "0")}`,
      href: fbVideo(id),
      kind: "video" as const,
    })),
  },
  {
    slug: "aurora-fest-2026",
    title: "Aurora Fest 2026",
    category: "media",
    featured: 4,
    plain: "Twelve hours at the barricade for six OPM acts — shot fully manual under strobes.",
    context: "Concert media · Clark Global City · Day 2",
    role: "Concert photographer",
    status: "Published · May 3, 2026",
    body: [
      "Documenting a music festival takes pure endurance. We reached Clark Global City at 10:40 AM, queued by 11, and by 1 PM had a spot close to the platinum barricade. Then the heat — until dusk.",
      "The lineup ran Kitchie Nadal, Parokya Ni Edgar, Kamikazee, Sexbomb Girls, IV Of Spades and SB19. Stage lighting swung from deep purples to blinding strobes, so everything was shot in manual with split-second exposure changes, waiting out the high-energy moments across more than twelve hours of standing.",
      "We left the grounds at 1:50 AM and got home at 4:10 AM, completely spent. The Lightroom sessions afterwards are where the magic happens: pulling clarity out of harsh neon washes.",
    ],
    quote:
      "Pumunta talaga ako para sa IVOS, pero I didn't expect na sobrang mapapa-wild ako sa set ng PNE at KMKZ — the raw energy of the crowd and live OPM just pushes you through the exhaustion.",
    stack: ["Manual exposure", "Live OPM", "Lightroom"],
    cover: "/projects/aurora-fest/amf-bg4.jpg",
    images: [
      { src: "/projects/aurora-fest/amf-bg4.jpg", alt: "The main stage during Kitchie Nadal's set" },
      { src: "/projects/aurora-fest/amf-bg3.jpg", alt: "The SVIP and platinum queues at noon" },
      { src: "/projects/aurora-fest/amf-14.jpg", alt: "Kitchie Nadal, solo" },
      { src: "/projects/aurora-fest/amf-16.jpg", alt: "Kitchie Nadal" },
      { src: "/projects/aurora-fest/amf-21.jpg", alt: "Chito Miranda · Parokya Ni Edgar" },
      { src: "/projects/aurora-fest/amf-19.jpg", alt: "Chito Miranda · Parokya Ni Edgar" },
      { src: "/projects/aurora-fest/amf-25.jpg", alt: "Jomal Linao · Kamikazee" },
      { src: "/projects/aurora-fest/amf-32.jpg", alt: "Jay Contreras · Kamikazee" },
      { src: "/projects/aurora-fest/amf-29.jpg", alt: "Jay Contreras · Kamikazee" },
      { src: "/projects/aurora-fest/amf-37.jpg", alt: "Sexbomb Girls" },
      { src: "/projects/aurora-fest/amf-42.jpg", alt: "Sexbomb Girls" },
      { src: "/projects/aurora-fest/amf-48.jpg", alt: "Blaster Silonga · IV Of Spades" },
      { src: "/projects/aurora-fest/amf-52.jpg", alt: "Zild Benitez · IV Of Spades" },
      { src: "/projects/aurora-fest/amf-50.jpg", alt: "Badjao de Castro · IV Of Spades" },
      { src: "/projects/aurora-fest/amf-55.jpg", alt: "SB19" },
      { src: "/projects/aurora-fest/amf-58.jpg", alt: "Stell · SB19" },
      { src: "/projects/aurora-fest/amf-bg9.jpg", alt: "The SB19 stage" },
      { src: "/projects/aurora-fest/amf-bg2.jpg", alt: "Neil at Aurora Fest" },
    ],
  },
  {
    slug: "intrusion-auditing",
    title: "Vulnerability & Intrusion Auditing",
    category: "systems",
    plain: "Played the attacker on purpose, so the defences could be tested and tightened.",
    context: "Security lab",
    role: "Security auditor",
    status: "Audit complete",
    body: [
      "Isolated dual-boot Linux labs for network vulnerability scans, with custom Snort intrusion-detection rules watching packet traffic and stopping simulated attack payloads.",
    ],
    stack: ["Kali Linux", "Nmap", "Snort", "Metasploit", "Wireshark"],
    cover: "/projects/thumb-network.jpg",
  },
  {
    slug: "parkmate",
    title: "ParkMate",
    category: "web",
    plain: "Replaced a parking lot's paper logbook with a desktop app.",
    context: "COMSCI 1201 · Final project · CRUD",
    role: "UI/UX designer & frontend developer",
    status: "Shipped",
    body: [
      "A Java desktop application for smart parking management. Java Swing powers the interface and JDBC connects to MySQL, with full create, read, update and delete for vehicle entries, slot allocation and parking records.",
    ],
    stack: ["Java", "Swing", "JDBC", "MySQL"],
    team: ["Rion Fauszt Bustos — Lead Developer", "Neil Jacob Santiago — UI/UX Designer & Frontend", "Justine Rey Garcia — Developer & core logic", "Jake Brandon Galapon — Developer & systems integrator"],
    links: [{ label: "GitHub", href: "https://github.com/neiljacobsantiago/ParkMate" }],
    cover: "/projects/parkmate1.jpg",
    logo: { src: "/projects/logos/parkmate.png", bg: "#000000" },
    images: [{ src: "/projects/parkmate1.jpg", alt: "ParkMate interface" }],
  },
  {
    slug: "worktayo",
    title: "WorkTayo",
    category: "web",
    plain: "One place to register and track every attendee at a big conference.",
    context: "COMSCI 2110 · Final project",
    role: "UI/UX designer & frontend developer",
    status: "Shipped",
    body: [
      "A conference registration monitoring system. Instead of scattered spreadsheets, coordinators register participants, manage conference records and track attendance in real time from one hub backed by a relational MySQL database.",
    ],
    stack: ["Web app", "MySQL", "Relational database design"],
    team: ["Rion Fauszt Bustos — Lead Developer", "Neil Jacob Santiago — UI/UX Designer & Frontend", "Vinze Norbert Siega — UI/UX Designer & Backend"],
    links: [{ label: "GitHub", href: "https://github.com/neiljacobsantiago/WorkTayo" }],
    cover: "/projects/worktayo-2.jpg",
    logo: { src: "/projects/logos/worktayo.png", bg: "#ffffff" },
    images: [
      { src: "/projects/worktayo-2.jpg", alt: "WorkTayo dashboard" },
      { src: "/projects/worktayo-3.jpg", alt: "WorkTayo records" },
    ],
  },
  {
    slug: "bankosantiago",
    title: "BankoSantiago",
    category: "web",
    plain: "A banking dashboard that does the essentials, fast, and nothing else.",
    context: "ACCT 1001 · Final project",
    role: "UI/UX designer & frontend developer",
    status: "Shipped",
    body: [
      "A localized digital banking prototype that cuts the feature bloat of modern banking apps down to a fast dashboard: secure fund transfers, real-time balances and accessible transaction logs, with careful UI/UX and secure data handling.",
      "Built as the final project for ACCT 1001, it puts the course's core accounting logic — balances, transfers and a running transaction ledger — behind secure account management.",
    ],
    stack: ["Web app", "UI/UX", "Secure data handling"],
    team: ["Rion Fauszt Bustos — Lead Developer", "Neil Jacob Santiago — UI/UX Designer & Frontend", "Vinze Norbert Siega — UI/UX Designer & Backend"],
    links: [{ label: "GitHub", href: "https://github.com/neiljacobsantiago/BankoSantiago" }],
    cover: "/projects/banko-1.jpg",
    logo: { src: "/projects/logos/bankosantiago.png", bg: "#0b1b3f" },
    images: [{ src: "/projects/banko-1.jpg", alt: "BankoSantiago dashboard" }],
  },
  {
    slug: "eco-fashion",
    title: "Eco-Fashion",
    category: "web",
    plain: "A storefront for sustainable clothing, built clean and responsive.",
    context: "Commissioned web project",
    role: "Frontend developer & UI/UX designer",
    status: "Live",
    body: [
      "An e-commerce prototype for sustainable clothing retail, focused on responsive layouts, clean product displays and an intuitive shopping flow. Live on Kingston University's KUNet.",
    ],
    stack: ["HTML", "CSS", "Responsive design"],
    links: [
      { label: "Live site", href: "https://kunet.kingston.ac.uk/~K2515380/" },
      { label: "GitHub", href: "https://github.com/eco-fashion/eco-fashion.github.io" },
    ],
    cover: "/projects/eco-fashion-interface.jpg",
    images: [{ src: "/projects/eco-fashion-interface.jpg", alt: "Eco-Fashion storefront" }],
  },
  {
    slug: "memory-allocation-simulator",
    tool: "memory",
    title: "Memory Allocation Simulator",
    category: "web",
    plain: "Shows, step by step, how a computer decides where to put things in memory.",
    context: "COMSCI 2101 · Operating Systems final project",
    role: "Front-end CLI & user interface",
    status: "Shipped",
    body: [
      "A Java command-line tool that makes memory management visible: dynamic partitioning in real time and the fragmentation behind First-Fit, Best-Fit and Worst-Fit.",
    ],
    stack: ["Java", "CLI"],
    team: ["Rion Fauszt Bustos — Lead Developer", "Neil Jacob Santiago — Front-end CLI / UI", "Justine Rey Garcia — Developer", "Anne Margaret Tablanza — Developer", "Vinze Norbert Siega — Documentation"],
    links: [{ label: "GitHub", href: "https://github.com/neiljacobsantiago/Memory-Allocation-CLI-Simulator" }],
  },
  {
    slug: "whisper-transcription",
    title: "Whisper AI Transcription",
    category: "systems",
    plain: "Taught a machine to turn hours of recorded speech into accurate text.",
    context: "Applied AI",
    role: "Developer",
    status: "Model trained",
    body: ["Python pipelines combining classification models with the Whisper speech framework to process and transcribe audio datasets with high accuracy."],
    stack: ["Python", "Pandas", "Whisper", "Google Colab"],
  },
  {
    slug: "osint-forensics",
    title: "OSINT & Digital Forensics",
    category: "systems",
    plain: "Followed digital breadcrumbs — QR codes, social posts, ciphers — to solve the case.",
    context: "Security coursework",
    role: "Investigator",
    status: "Trace resolved",
    body: ["Recovered location payloads and identifiers by decoding encrypted data across Mastodon posts and QR-code evidence in advanced coursework challenges."],
    stack: ["Open-source intelligence", "Decryption tools", "CLI queries"],
  },
  {
    slug: "ircite-2026",
    title: "IRCITE 2026",
    category: "media",
    plain: "Led a four-person photo team across a two-building international conference.",
    context: "International Research Conference on IT Education · CLSU",
    role: "Lead photographer & team lead",
    status: "Covered",
    body: [
      "Lead photographer for the International Research Conference on Information Technology Education, coordinating a media team of four across campus for complete coverage.",
      "Mostly on a Nikon D780: hauling gear between two far-apart buildings in the heat, and switching constantly between harsh sunlight and mixed convention lighting.",
      "On the side, filmed and produced a recruitment vlog for BITS, the Builders of Information Technology Society.",
    ],
    stack: ["Nikon D780", "Team direction", "Event photography"],
    links: [{ label: "BITS recruitment vlog", href: "https://www.facebook.com/reel/1579079186697441/" }],
    media: [{ label: "IRCITE coverage on CLSU ITSC", href: itscPost("pfbid02A6TrkHHfgHJPAdgVdV1isbRQhSmrpC785N8oTrKxwaH6s9LmC8SNsetGNGh2Qyhsl"), kind: "post" }],
    cover: "/projects/ircite-team.jpg",
    images: [
      { src: "/projects/ircite-team.jpg", alt: "IRCITE 2026 delegates in the convention hall" },
      { src: "/photography/events/ircite.jpg", alt: "IRCITE 2026 coverage" },
    ],
  },
  {
    slug: "it-fest",
    title: "IT Fest",
    category: "media",
    plain: "Highlight reels, photos and same-day posts for the department's biggest week.",
    context: "CLSU IT Student Council",
    role: "Production director",
    status: "Published",
    body: ["Full multimedia production for IT Fest: cinematic highlight reels, event photography and rapid social media deliverables for the CLSU IT Student Council."],
    stack: ["Production management", "Photography", "Video editing"],
    team: ["Neil Jacob Santiago — Production Director", "CLSU IT Student Council — Partner organization"],
    media: [{ label: "IT Fest on CLSU ITSC", href: itscPost("pfbid02pA3JEtcnTY7bEXdgD9rq7WHLVVVhnQs5bSLAJJsQW7yQ6ZC4KL7ZAKJdDbBahUx6l"), kind: "post" }],
    cover: "/photography/events/itfest.jpg",
    images: [
      { src: "/photography/events/itfest-1.jpg", alt: "IT Fest coverage" },
      { src: "/photography/events/itfest-2.jpg", alt: "IT Fest coverage" },
    ],
  },
  {
    slug: "it-week",
    title: "IT Week Celebration",
    category: "media",
    plain: "Candid, fast photography of a week of games and student life.",
    context: "CLSU IT Student Council",
    role: "Event photographer",
    status: "Published",
    body: ["Candid documentation and high-speed photography of IT Week's activities and parlor games, with same-day edits published on the ITSC page."],
    stack: ["Event photography", "Same-day edits"],
    media: [
      { label: "IT Week on CLSU ITSC · Part 1", href: itscPost("pfbid0337qp2paDWhxbpzyPcJeskUC23cWJRMHjs3Qe1iGJPNrfQkTrpeJhDtgq7ZmQHkJ4l"), kind: "post" },
      { label: "IT Week on CLSU ITSC · Part 2", href: itscPost("pfbid02QEk73AabYBV8dLaVSkeKXwHbYApe19MJvsHqcPiLfWaLinVULBs6wp3yXLyz9a5Nl"), kind: "post" },
    ],
    cover: "/photography/events/itweek.jpg",
  },
  {
    slug: "img-stratcom",
    title: "IMG Stratcom",
    category: "media",
    plain: "A campus-wide campaign where IMG's creative minds and production crew finally work as one.",
    context: "ITSC Media Group · University collaboration",
    role: "Production Director, IMG",
    status: "Upcoming",
    body: [
      "An upcoming large-scale multimedia deployment that merges the analytical force of IMG's Creative Division with the execution capabilities of its Production Division, developing engaging campaigns under official university branding.",
    ],
    stack: ["Creative Division", "Production Division", "Strategic communications"],
    notice: "Coverage pending — the gallery, behind-the-scenes footage and cinematic deliverables will be published here once the collaboration kicks off.",
    logo: { src: "/projects/logos/clsu-white.png", bg: "#000000" },
  },
  {
    slug: "mundane",
    title: "Mundane",
    category: "media",
    plain: "An experimental short film about the overlooked rhythm of everyday life.",
    context: "ARTS 1100 · Final project",
    role: "Director, producer & director of photography",
    status: "Released",
    body: [
      "An experimental short film that breaks from traditional narrative, using unconventional visuals and atmospheric pacing to turn abstract ideas into a raw, cinematic experience.",
      "A visceral dissection of the overlooked, where the repetitive rhythm of the everyday is fractured into a symphony of light and dissonant shadow. Conceptualization, on-location filming and post-production were all done in-house.",
    ],
    stack: ["Nikon D780", "iPhone 14 Pro Max", "DJI Osmo Mobile 7", "Premiere Pro", "After Effects", "DaVinci Resolve"],
    cover: "/projects/mundane.jpg",
    team: ["Neil Jacob Santiago", "Alfredo Nama III", "Kurt Russel Garcia", "Ryan Biola", "Christian Lagleva", "Frauline Alvendia", "Trisha Claro"],
    youtube: "zY-_ieieI3Y",
  },
];

export const projectBySlug = (slug: string) => projects.find((p) => p.slug === slug);
export const featuredProjects = () => projects.filter((p) => p.featured).sort((a, b) => a.featured! - b.featured!);
