// Single source of truth for identity, navigation and outbound links.
// The header, footer, terminal, sitemap and NeilAI all read from here.

export const site = {
  name: "Neil Jacob Santiago",
  firstName: "Neil",
  title: "Neil Jacob Santiago — Networks, Web & Photography",
  description:
    "Neil Jacob Santiago is a third-year BSIT student at Central Luzon State University who designs networks, builds web systems and photographs concerts, campus life and the night sky. Production Director of the ITSC Media Group.",
  tagline: "Structural logic. Editorial vision.",
  location: "San Jose City, Nueva Ecija",
  country: "Philippines",
  coordinates: "15.79° N, 120.99° E",
  timeZone: "Asia/Manila",
  school: "Central Luzon State University (CLSU)",
  program: "BS Information Technology — Network Systems & Infrastructure Engineering",
  year: "Third year",
  role: "Production Director, ITSC Media Group (IMG)",
  rate: "₱15,000",
  githubUser: "neiljacobsantiago",
  /**
   * The dedicated photography website. Set the URL when it's live and the
   * gallery, home page and footer will link to it automatically.
   */
  photographySite: { url: null as string | null, label: "Full photography archive" },
} as const;

/** Absolute origin for metadata and the sitemap (server-only usage). */
export function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}

export interface NavItem {
  label: string;
  href: string;
  description: string;
}

export const mainNav: NavItem[] = [
  { label: "Work", href: "/work", description: "Systems, web & productions" },
  { label: "Photography", href: "/photography", description: "Concerts, people & the night sky" },
  { label: "About", href: "/about", description: "Story, school & kit" },
  { label: "Lab", href: "/lab", description: "Tools from real projects" },
  { label: "Play", href: "/play", description: "Drive the island, play the arcade" },
  { label: "Contact", href: "/contact", description: "Start a project" },
];

/** Legal and reference pages, linked from the footer and the HTML site map. */
export const legalRoutes: NavItem[] = [
  { label: "Privacy", href: "/privacy", description: "What's collected and your rights" },
  { label: "Terms", href: "/terms", description: "Using the site, bookings and photos" },
  { label: "Accessibility", href: "/accessibility", description: "How the site works for everyone" },
  { label: "Site map", href: "/site-map", description: "Every page in one place" },
];

/** Shown at the top of each legal page. */
export const LEGAL_UPDATED = "October 15, 2026";

/**
 * Pages kept out of the top nav so it stays short: linked from the footer,
 * the command palette, the shortcuts overlay and the site map.
 */
export const moreRoutes: NavItem[] = [
  { label: "Services", href: "/services", description: "Work with me: websites, networks, shoots & video" },
  { label: "Now", href: "/now", description: "What I'm focused on this season" },
  { label: "Uses", href: "/uses", description: "Gear, software & how this site is built" },
];

export const allRoutes: NavItem[] = [
  { label: "Home", href: "/", description: "Start here" },
  ...mainNav,
  ...moreRoutes,
  { label: "Résumé", href: "/resume", description: "Ready to print or save as PDF" },
  { label: "Terminal", href: "/terminal", description: "For the curious" },
];

export interface Social {
  name: string;
  handle: string;
  /** Leave null until the profile exists; it renders as "soon" instead of a dead link. */
  url: string | null;
}

export const socials: Social[] = [
  { name: "Instagram", handle: "@neilllll.jacob", url: "https://instagram.com/neilllll.jacob" },
  { name: "GitHub", handle: "@neiljacobsantiago", url: "https://github.com/neiljacobsantiago" },
  { name: "TikTok", handle: "@neill.jacob", url: "https://tiktok.com/@neill.jacob" },
  { name: "Facebook", handle: "neiljacobsantiago24", url: "https://facebook.com/neiljacobsantiago24" },
  { name: "X", handle: "@neiljacob24", url: "https://x.com/neiljacob24" },
  { name: "LinkedIn", handle: "Professional", url: null },
];

export function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
