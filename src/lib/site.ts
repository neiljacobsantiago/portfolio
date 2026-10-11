// Single source of truth for navigation, identity and outbound links.
// Pages, the footer, the terminal, the sitemap and NeilAI all read from here.

export const site = {
  name: "Neil Jacob Santiago",
  shortName: "NEIL.OS",
  title: "Neil Jacob Santiago — Network Systems & Media",
  description:
    "Portfolio of Neil Jacob Santiago: network systems & infrastructure engineering, security auditing, and multimedia production direction.",
  location: "San Jose City, Nueva Ecija, PH",
  school: "Central Luzon State University (CLSU)",
  rate: "₱15,000",
  githubUser: "neiljacobsantiago",
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

// Ordered by importance: work first, then credentials, then the playful extras.
export const primaryNav: NavItem[] = [
  { label: "Systems", href: "/systems", description: "Network architecture & security deployments" },
  { label: "Media", href: "/media", description: "Photography, video & production direction" },
  { label: "Clearance", href: "/clearance", description: "Certifications & objectives" },
  { label: "Gear", href: "/gear", description: "Hardware loadout" },
];

export const utilityNav: NavItem[] = [
  { label: "Terminal", href: "/terminal", description: "Interactive shell" },
  { label: "Logs", href: "/logs", description: "System telemetry log" },
];

export const contactNav: NavItem = { label: "Contact", href: "/contact", description: "Start a project" };

export const allRoutes: NavItem[] = [
  { label: "Root", href: "/", description: "Home" },
  ...primaryNav,
  ...utilityNav,
  contactNav,
];

export interface Social {
  name: string;
  label: string;
  /** Leave null until the profile exists; it renders as "pending" instead of a dead link. */
  url: string | null;
  verified?: boolean;
}

export const socials: Social[] = [
  { name: "GitHub", label: "@neiljacobsantiago", url: "https://github.com/neiljacobsantiago", verified: true },
  { name: "Credly", label: "Cisco certifications", url: null, verified: true },
  { name: "LinkedIn", label: "Professional intel", url: null },
  { name: "Instagram", label: "Visual telemetry", url: null },
  { name: "X (Twitter)", label: "Micro-logs", url: null },
  { name: "TikTok", label: "Media directives", url: null },
];

export function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
