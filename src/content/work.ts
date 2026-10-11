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
  images?: { src: string; alt: string }[];
  /** YouTube video id, played with a click-to-load embed. */
  youtube?: string;
}

export const projects: Project[] = [
  {
    slug: "philmech-pathogen-classifier",
    title: "PhilMech Pathogen Classifier",
    category: "systems",
    featured: 1,
    plain: "Point a phone at a fungal culture and it names the pathogen — no internet needed.",
    context: "PhilMech · Laboratory Services Division",
    role: "Lead — system architecture & UI direction",
    status: "In development",
    body: [
      "An offline-first Progressive Web App for the Laboratory Services Division of PhilMech (Philippine Center for Postharvest Development and Mechanization): a low-cost, serverless Edge AI tool that classifies Aspergillus species — A. clavatus, A. flavus, A. fumigatus, A. niger and A. tamarii — right at the lab bench.",
      "Image classification runs entirely on the device with a quantized TensorFlow.js model, so it works in an air-gapped lab with no server, no latency and no cloud retention. Results land in a primary identification card, confidence bars for the top matches and a list of physical traits to cross-check.",
      "Built to ISO/IEC 25010 quality goals: scans below a 90% confidence threshold trigger a warning and require manual confirmation, the capture-to-result loop is one-handed and mobile-first, and a normalized IndexedDB schema stores the biological reference data without duplication.",
    ],
    stack: ["React 19", "TypeScript", "Vite", "Tailwind CSS", "TensorFlow.js", "Teachable Machine", "IndexedDB", "PWA"],
    team: ["Neil Jacob Santiago", "Cassandra Calulot", "risxeee", "Victoria Tamundong"],
    privateRepo: true,
  },
  {
    slug: "buildit",
    title: "BuildIT",
    category: "web",
    featured: 2,
    plain: "Pick PC parts, check they fit together, and check out — all in one place.",
    context: "INTECH 2201 · Final project",
    role: "Lead UI/UX designer",
    status: "Shipped",
    body: [
      "A custom PC builder and storefront inspired by PCPartPicker. Traditional tech retail sites overwhelm buyers with incompatible parts and disjointed checkouts; BuildIT puts drafting a build, checking compatibility and paying into one calm flow.",
      "It grew out of an earlier C command-line version of the same idea, then became a full web app with e-commerce database management and secure backend routing, hosted on Azure for evaluation.",
    ],
    stack: ["Web app", "E-commerce database", "Azure hosting", "C (original CLI)"],
    team: ["Neil Jacob Santiago — Lead UI/UX Designer", "Rion Bustos — Lead Developer & original C developer", "Anne Margaret Tablanza — Designer & content layouts", "Vinze Norbert Siega — Database, Azure hosting & docs", "Justine Rey Garcia — Content developer"],
    links: [
      { label: "Live site", href: "https://buildits.app" },
      { label: "GitHub (C version)", href: "https://github.com/neiljacobsantiago/BuildIT" },
    ],
    cover: "/projects/buildit-1.jpg",
    images: [
      { src: "/projects/buildit-home.jpg", alt: "BuildIT home page" },
      { src: "/projects/buildit-1.jpg", alt: "BuildIT part picker" },
      { src: "/projects/buildit-2.jpg", alt: "BuildIT interface" },
      { src: "/projects/buildit-3.jpg", alt: "BuildIT interface" },
      { src: "/projects/buildit-4.jpg", alt: "BuildIT interface" },
    ],
  },
  {
    slug: "clirdec-network",
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
    title: "Cyber Awareness Series",
    category: "media",
    featured: 4,
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
    context: "Object-Oriented Programming · Final project",
    role: "UI/UX designer & frontend developer",
    status: "Shipped",
    body: [
      "A Java desktop application for smart parking management. Java Swing powers the interface and JDBC connects to MySQL, with full create, read, update and delete for vehicle entries, slot allocation and parking records.",
    ],
    stack: ["Java", "Swing", "JDBC", "MySQL"],
    team: ["Rion Fauszt Bustos — Lead Developer", "Neil Jacob Santiago — UI/UX Designer & Frontend", "Justine Rey Garcia — Developer & core logic", "Jake Brandon Galapon — Developer & systems integrator"],
    links: [{ label: "GitHub", href: "https://github.com/neiljacobsantiago/ParkMate" }],
    cover: "/projects/parkmate1.jpg",
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
    context: "Web Applications Development · Final project",
    role: "UI/UX designer & frontend developer",
    status: "Shipped",
    body: [
      "A localized digital banking prototype that cuts the feature bloat of modern banking apps down to a fast dashboard: secure fund transfers, real-time balances and accessible transaction logs, with careful UI/UX and secure data handling.",
    ],
    stack: ["Web app", "UI/UX", "Secure data handling"],
    team: ["Rion Fauszt Bustos — Lead Developer", "Neil Jacob Santiago — UI/UX Designer & Frontend", "Vinze Norbert Siega — UI/UX Designer & Backend"],
    links: [{ label: "GitHub", href: "https://github.com/neiljacobsantiago/BankoSantiago" }],
    cover: "/projects/banko-1.jpg",
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
    title: "Memory Allocation Simulator",
    category: "web",
    plain: "Shows, step by step, how a computer decides where to put things in memory.",
    context: "CS 2101 Operating Systems · Final project",
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
    cover: "/photography/events/ircite.jpg",
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
    cover: "/photography/events/itweek.jpg",
  },
  {
    slug: "mundane",
    title: "Mundane",
    category: "media",
    plain: "An experimental short film about the overlooked rhythm of everyday life.",
    context: "ARTS 1100 · Final project",
    role: "Production team",
    status: "Released",
    body: [
      "An experimental short film that breaks from traditional narrative, using unconventional visuals and atmospheric pacing to turn abstract ideas into a raw, cinematic experience.",
    ],
    stack: ["Conceptualization", "On-location filming", "Post-production"],
    team: ["Neil Jacob Santiago", "Alfredo Nama III", "Kurt Russel Garcia", "Ryan Biola", "Christian Lagleva", "Frauline Alvendia", "Trisha Claro"],
    youtube: "zY-_ieieI3Y",
  },
];

export const projectBySlug = (slug: string) => projects.find((p) => p.slug === slug);
export const featuredProjects = () => projects.filter((p) => p.featured).sort((a, b) => a.featured! - b.featured!);
