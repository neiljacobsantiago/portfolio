// Kind words from clients and collaborators, shown by <KindWords /> on
// /services and on the matching /work/<slug> page. While this list is empty,
// nothing renders anywhere.
//
// Rules: only real words, from a real person, with their written OK to
// publish their name next to it. Never paraphrase into something they didn't
// say; trim with "…" instead.
//
// Example (copy, uncomment and fill in):
//
//   {
//     id: "philmech-2026",
//     quote: "Exactly what they said, word for word.",
//     name: "Full Name",
//     role: "Position, Organization",
//     project: "pathoscan",          // optional: a slug from content/work.ts
//     offer: "website",              // optional: an offer id from content/offers.ts
//     date: "2026-09",
//     consent: true,
//   },

import type { OfferId } from "./offers";

export interface Testimonial {
  id: string;
  quote: string;
  name: string;
  /** "Position, Organization", or how they'd like to be described. */
  role?: string;
  /** A project slug from content/work.ts — the quote also shows on that project's page. */
  project?: string;
  /** Which kind of work it was, so /services can group it. */
  offer?: OfferId;
  /** YYYY-MM */
  date: string;
  /** Written permission to publish this with their name. Entries without it never render. */
  consent: boolean;
}

const testimonials: Testimonial[] = [];

/** Published testimonials, newest first, optionally only those about one project or offer. */
export async function getTestimonials(filter: { project?: string; offer?: OfferId } = {}): Promise<Testimonial[]> {
  return testimonials
    .filter((t) => t.consent && t.quote.trim() && t.name.trim())
    .filter((t) => (filter.project ? t.project === filter.project : true))
    .filter((t) => (filter.offer ? t.offer === filter.offer : true))
    .sort((a, b) => b.date.localeCompare(a.date));
}
