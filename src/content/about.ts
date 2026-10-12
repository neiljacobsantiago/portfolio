// About-page content. `logo` values are file names in /public/logos (any of
// .png/.svg/.webp/.jpg, any case) — drop a file with that name in and it shows.

export const education = [
  {
    years: "2024 — Present",
    school: "Central Luzon State University",
    level: "BS Information Technology",
    detail: "Third year, majoring in Network Systems & Infrastructure Engineering.",
    logo: "clsu_logo_light",
  },
  {
    years: "2022 — 2024",
    school: "PHINMA Araullo University",
    level: "Senior High School · STEM",
    detail: "Science, Technology, Engineering & Mathematics strand.",
    logo: "au_logo",
  },
  {
    years: "2018 — 2022",
    school: "Bettbien High School",
    level: "Junior High School",
    detail: "Where the curiosity for computers (and cameras) started.",
    logo: "bbhs_logo",
  },
];

export const organizations = [
  { name: "ITSC Media Group", short: "IMG", role: "Production Director", detail: "The media arm of the CLSU IT Student Council (formerly the ITSC Multimedia Group, MMT) — coverage, reels and broadcasts.", logo: "IMG_LOGO_FINAL" },
  { name: "CLSU IT Student Council", short: "ITSC", role: "Officer · Media Group", detail: "Student government of the CLSU IT department.", logo: "ITSC" },
  { name: "Builders of Information Technology Society", short: "BITS", role: "Member", detail: "Student organization for IT builders at CLSU.", logo: "bits_logo" },
  { name: "Department of Information Technology", short: "DIT", role: "Student", detail: "CLSU College of Engineering.", logo: "Dept_Logo" },
  { name: "College of Engineering", short: "CEn", role: "Student", detail: "Central Luzon State University.", logo: "CEn_Logo" },
];

export const certificates = [
  { title: "Network Addressing & Basic Troubleshooting", issuer: "Cisco Networking Academy", date: "Jan 2026", image: "/certs/cisco-netacad.jpg" },
  { title: "Startup 100: Introduction to Startups", issuer: "DICT — Region 3", date: "Jun 2025", image: "/certs/startup-100.jpg" },
  { title: "Introduction to WordPress", issuer: "CLSU ITSC", date: "Feb 2026", image: "/certs/intro-to-wordpress.jpg" },
];

export const inProgress = [
  { title: "CCNA", detail: "Cisco Certified Network Associate" },
  { title: "CompTIA Security+", detail: "Security fundamentals" },
];

export interface Tool {
  name: string;
  logo?: string;
}

export const toolkit: { group: string; tools: Tool[] }[] = [
  { group: "Networks & systems", tools: [{ name: "Cisco Packet Tracer", logo: "cisco-packet-tracer" }, { name: "Routing & switching", logo: "router" }, { name: "Hardware architecture", logo: "cpu" }, { name: "Kali Linux", logo: "kali" }] },
  { group: "Code", tools: [{ name: "C", logo: "c" }, { name: "Java", logo: "java" }, { name: "Python", logo: "python" }, { name: "PHP", logo: "php" }, { name: "JavaScript", logo: "javascript" }, { name: "MySQL", logo: "mysql" }] },
  { group: "Web & design", tools: [{ name: "HTML5", logo: "html" }, { name: "CSS3", logo: "css3" }, { name: "Figma", logo: "figma" }, { name: "Next.js & React" }, { name: "Tailwind CSS" }] },
  { group: "Image & motion", tools: [{ name: "Lightroom", logo: "lightroom" }, { name: "Premiere Pro" }, { name: "After Effects" }, { name: "DaVinci Resolve" }, { name: "OBS Studio" }] },
];

export const gear = [
  { brand: "Canon", logo: "canon", items: ["EOS 1500D + EF 50mm f/1.8", "EOS 80D"] },
  { brand: "Nikon", logo: "nikon", items: ["D780"] },
  { brand: "Apple", logo: "apple", items: ["iPhone 14 Pro Max — ProRAW"] },
  { brand: "DJI", logo: "dji", items: ["Osmo Mobile 7", "Ronin mini gimbal"] },
  { brand: "Studio", logo: "studio", items: ["Studio-style portrait lighting", "Speedlite flash units"] },
];

export const interests = [
  { title: "F1 & sim racing", icon: "/interests/gaming.png", text: "Hitting the apex in F1 25 and Forza Horizon 5, managing traffic in Cities: Skylines, and never missing a race weekend." },
  { title: "In the kitchen", icon: "/interests/cooking.png", text: "Market runs with my dad, and a rich chicken alfredo that I'm still perfecting." },
  { title: "Baseball & outdoors", icon: "/interests/sports.png", text: "I play baseball, follow basketball, and take any excuse to be outside." },
  { title: "Hardware & die-cast", icon: "/interests/hardware.png", text: "PC hardware research, Linux distro-hopping, and a growing shelf of Hot Wheels, Takara Tomy and Matchbox." },
];

/** The profile reel on the About page — a swipeable contact sheet. Add a portrait by adding an object. */
export interface Profile {
  src: string;
  alt: string;
  title: string;
  caption: string;
  /** Camera and exposure, read from the file's EXIF where it has one. */
  exif?: string;
  /** Cut-outs (transparent PNGs) sit on a coloured backdrop. */
  backdrop?: string;
  width: number;
  height: number;
}

export const profiles: Profile[] = [
  {
    src: "/profile/neil-official.jpg",
    alt: "Neil Jacob Santiago in the ITSC Media Group polo, official portrait",
    title: "On duty",
    caption: "The IMG polo. Production Director mode.",
    exif: "Nikon D780 · 50mm f/1.8G · f/5.6 · 1/200 s · ISO 500",
    width: 1050,
    height: 1400,
  },
  {
    src: "/profile/neil-candid.jpg",
    alt: "Neil Jacob Santiago in a car by the window, candid selfie",
    title: "Off duty",
    caption: "Window light on the road, earbuds in.",
    exif: "iPhone 14 Pro Max · front camera · f/1.9 · 1/60 s · ISO 160",
    width: 1050,
    height: 1400,
  },
  {
    src: "/profile/neil-standing.png",
    alt: "Neil Jacob Santiago standing, cut-out portrait",
    title: "Standing",
    caption: "Ready for the next shoot.",
    backdrop: "var(--color-wine)",
    width: 933,
    height: 1400,
  },
  {
    src: "/profile/neil-seated.png",
    alt: "Neil Jacob Santiago seated, cut-out portrait",
    title: "Seated",
    caption: "Between the sets.",
    backdrop: "var(--color-sky)",
    width: 933,
    height: 1400,
  },
];
