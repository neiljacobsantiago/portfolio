// Single source of truth for identity, navigation and outbound links.
// The header, footer, terminal, sitemap and NeilAI all read from here.

export const site = {
  name: "Neil Jacob Santiago",
  firstName: "Neil",
  title: "Neil Jacob Santiago — Networks, Security & Photography",
  description:
    "Neil Jacob Santiago designs networks, audits systems and photographs the moments in between — concerts, campus events and the night sky. Based in San Jose City, Nueva Ecija.",
  tagline: "Structural logic. Editorial vision.",
  location: "San Jose City, Nueva Ecija",
  country: "Philippines",
  coordinates: "15.79° N, 120.99° E",
  timeZone: "Asia/Manila",
  school: "Central Luzon State University (CLSU)",
  role: "Production Director, CLSU IT Services Center Media Group",
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
  { label: "Work", href: "/work", description: "Networks, security & systems" },
  { label: "Photography", href: "/photography", description: "Concerts, events & the night sky" },
  { label: "About", href: "/about", description: "Story, credentials & kit" },
  { label: "Contact", href: "/contact", description: "Start a project" },
];

export const allRoutes: NavItem[] = [{ label: "Home", href: "/", description: "Start here" }, ...mainNav, { label: "Terminal", href: "/terminal", description: "For the curious" }];

export interface Social {
  name: string;
  handle: string;
  /** Leave null until the profile exists; it renders as "soon" instead of a dead link. */
  url: string | null;
}

export const socials: Social[] = [
  { name: "GitHub", handle: "@neiljacobsantiago", url: "https://github.com/neiljacobsantiago" },
  { name: "Instagram", handle: "Photography", url: null },
  { name: "LinkedIn", handle: "Professional", url: null },
  { name: "Credly", handle: "Certifications", url: null },
];

export function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
