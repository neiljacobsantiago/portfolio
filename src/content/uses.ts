// The /uses page: gear, software and how this site is built. Only what's
// evidenced elsewhere on the site goes here — cameras come from about.ts and
// the collection gear lines in series.ts, tools from about.ts and the project
// stacks in work.ts, and the colophon from package.json. A backend or CMS can
// later replace getUses() without touching the page (see docs/BACKEND.md).

import { seriesList } from "@/content/series";
import { projects } from "@/content/work";

export interface UseItem {
  name: string;
  /** What it's for, in a few words. */
  note: string;
  /** Collections and projects it shows up in (derived; see `seenIn`). */
  seenIn?: { label: string; href: string }[];
}

export interface UseGroup {
  id: string;
  title: string;
  blurb: string;
  items: UseItem[];
}

/** Every collection and project whose gear line or stack mentions `term`. */
function seenIn(term: string) {
  const escaped = term.replace(/[.*+?^$()|[\]\\{}]/g, "\\$&");
  const re = new RegExp("\\b" + escaped + "\\b", "i");
  return [
    ...seriesList.filter((s) => re.test(s.gear)).map((s) => ({ label: s.title, href: `/photography#${s.slug}` })),
    ...projects.filter((p) => p.stack.some((x) => re.test(x))).map((p) => ({ label: p.title, href: `/work/${p.slug}` })),
  ];
}

const item = (name: string, note: string, match?: string): UseItem => {
  const where = match ? seenIn(match) : [];
  return where.length ? { name, note, seenIn: where } : { name, note };
};

const groups: UseGroup[] = [
  {
    id: "cameras",
    title: "Cameras & capture",
    blurb: "Two systems, a phone that shoots RAW, and something to keep it all steady.",
    items: [
      item("Nikon D780", "Events, concerts, conferences and the night sky.", "Nikon D780"),
      item("Nikon 50mm f/1.8G", "Portraits on the D780."),
      item("Canon EOS 80D", "Landscapes, open roads and coastlines.", "EOS 80D"),
      item("Canon EOS 1500D + EF 50mm f/1.8", "Astro stacks, and portraits on the fast 50mm.", "EOS 1500D"),
      item("iPhone 14 Pro Max", "Quick stills on the move, and footage for short films.", "iPhone 14 Pro Max"),
      item("Studio lighting", "Controlled light for portraits, headshots and in-house sessions.", "studio lighting"),
      item("DJI Osmo Mobile 7", "Phone gimbal for moving shots.", "Osmo Mobile 7"),
      item("DJI Ronin mini gimbal", "Smooth camera moves on shoots and short films."),
    ],
  },
  {
    id: "post",
    title: "Editing & post",
    blurb: "Where the photos are finished and the videos are cut.",
    items: [
      item("Adobe Lightroom", "Every photo edit, from skin tones under LED light to colour grades.", "Lightroom"),
      item("Sequator", "Stacks many night-sky frames into one clean image.", "Sequator"),
      item("Adobe Premiere Pro", "Reels, highlight videos and episodes.", "Premiere Pro"),
      item("Adobe After Effects", "Titles and motion graphics.", "After Effects"),
      item("DaVinci Resolve", "Colour and finishing for film work.", "DaVinci Resolve"),
      item("OBS Studio", "Live broadcasts and screen recording."),
    ],
  },
  {
    id: "build",
    title: "Design & code",
    blurb: "What the web systems and school projects are made with.",
    items: [
      item("Figma", "Every interface is a clickable prototype before it's code.", "Figma"),
      item("Next.js, React & TypeScript", "Web apps and this site.", "React"),
      item("Tailwind CSS", "Styling, straight in the markup."),
      item("TensorFlow.js", "Machine learning that runs in the browser, offline.", "TensorFlow.js"),
      item("Python, Pandas & Google Colab", "Data and AI pipelines.", "Python"),
      item("Java, Swing & JDBC", "Desktop apps and command-line tools.", "Java"),
      item("MySQL", "Relational databases behind the systems.", "MySQL"),
      item("WordPress", "Sites clients can update on their own.", "WordPress"),
      item("C, PHP & JavaScript", "Coursework and where most projects began.", "C"),
    ],
  },
  {
    id: "network",
    title: "Networks & security",
    blurb: "For planning networks and testing my own lab machines.",
    items: [
      item("Cisco Packet Tracer", "Networks are simulated here before any cable is run."),
      item("Routers & switches", "Routing, switching and VLANs, hands on."),
      item("Kali Linux", "Security testing on my own lab machines, never anyone else's."),
    ],
  },
];

export interface ColophonItem {
  name: string;
  role: string;
}

/** How this site is built. Matches package.json; update both together. */
const colophon: ColophonItem[] = [
  { name: "Next.js 16 & React 19", role: "App Router, Server Components and static pages by default" },
  { name: "Tailwind CSS v4", role: "Every style, with the five-colour palette as theme tokens" },
  { name: "Gloock, Newsreader & IBM Plex Mono", role: "Display, text and labels, loaded through next/font" },
  { name: "Cloudinary", role: "Hosts the photo collections and serves signed image sizes" },
  { name: "Transformers.js + Whisper", role: "Speech-to-text in the Lab, running in your browser" },
  { name: "three.js", role: "The floodlit street circuit in Bay Street Circuit" },
  { name: "Gemini", role: "Powers NeilAI, the site's assistant" },
  { name: "Nodemailer", role: "Sends contact and booking emails" },
  { name: "Lenis", role: "Smooth scrolling on desktop only; phones keep native scroll" },
  { name: "Open-Meteo & GitHub", role: "Live weather and code activity, cached on the server" },
  { name: "Vercel", role: "Hosting" },
  { name: "Icons8", role: "Tool icons" },
];

export interface Uses {
  groups: UseGroup[];
  colophon: ColophonItem[];
}

export async function getUses(): Promise<Uses> {
  return { groups, colophon };
}
