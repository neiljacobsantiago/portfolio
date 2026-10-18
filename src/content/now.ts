// The /now page (nownownow.com style): what Neil is focused on at the moment.
// Edit the entries and bump `updated` whenever things change. Facts already
// kept elsewhere (school, certificates, projects) are read from those files so
// they never disagree. A backend or CMS can later replace getNow() without
// touching the page (see docs/BACKEND.md).

import { certificates, inProgress, organizations } from "@/content/about";
import { projectBySlug } from "@/content/work";
import { site } from "@/lib/site";

export interface NowEntry {
  /** Short label, e.g. "Studying". */
  label: string;
  title: string;
  detail: string;
  link?: { label: string; href: string };
}

export interface Now {
  /** YYYY-MM-DD. Shown as "Last updated". */
  updated: string;
  /** Where these lines were written from. */
  place: string;
  intro: string;
  entries: NowEntry[];
}

const org = organizations[0];
// The Learning line is about Agile, so name that certificate rather than whichever is newest.
const latestCert = certificates.find((c) => c.title === "Google Agile Essentials") ?? certificates[0];
const pathoscan = projectBySlug("pathoscan");
const stratcom = projectBySlug("img-stratcom");

/** Edit me. */
const now: Now = {
  updated: "2026-10-16",
  place: `${site.location}, ${site.country}`,
  intro: "What I'm focused on this season. If it isn't here, I'm probably saying no to it for now.",
  entries: [
    {
      label: "Studying",
      title: `${site.year} of BS Information Technology at CLSU`,
      detail: `Majoring in Network Systems & Infrastructure Engineering, and working towards ${inProgress.map((c) => c.title).join(" and ")}.`,
      link: { label: "Credentials", href: "/about#credentials" },
    },
    {
      label: "Leading",
      title: `${org.role}, ${org.name}`,
      detail: stratcom
        ? `Running coverage and reels for the IT Student Council, and getting ${stratcom.title} ready: ${stratcom.plain.charAt(0).toLowerCase()}${stratcom.plain.slice(1)}`
        : "Running coverage, reels and broadcasts for the IT Student Council.",
      link: stratcom ? { label: stratcom.title, href: `/work/${stratcom.slug}` } : undefined,
    },
    {
      label: "Just shipped",
      title: pathoscan ? `${pathoscan.title}, handed over` : "A team project, handed over",
      detail: pathoscan ? `${pathoscan.status}. ${pathoscan.plain}` : "",
      link: pathoscan ? { label: "The project", href: `/work/${pathoscan.slug}` } : undefined,
    },
    {
      label: "Building",
      title: "A backend for this site",
      detail: "Moving inquiries, bookings and kind words into a real database, so nothing lives only in an inbox.",
      link: { label: "How this site is built", href: "/uses#colophon" },
    },
    {
      label: "Learning",
      title: latestCert ? `After ${latestCert.title}` : "Agile and Scrum",
      detail: latestCert ? `Finished in ${latestCert.date} (${latestCert.issuer}); now putting sprints into practice on team projects.` : "",
      link: { label: "Certificates", href: "/about#credentials" },
    },
    {
      label: "Shooting",
      title: "Campus coverage and portrait sessions",
      detail: "Events with the Media Group during the week, graduation and portrait sessions when the calendar allows, and the night sky whenever it's clear.",
      link: { label: "Photography", href: "/photography" },
    },
  ],
};

export async function getNow(): Promise<Now> {
  return now;
}
