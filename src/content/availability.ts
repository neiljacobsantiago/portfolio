// Whether Neil is taking on work right now. The footer badge, /now and
// /services all read this through getAvailability(), so one edit here updates
// every page. A backend or CMS can later replace the body of getAvailability()
// without touching any component (see docs/BACKEND.md).

export type AvailabilityStatus = "open" | "limited" | "closed";

export interface Availability {
  status: AvailabilityStatus;
  /** Short line for the badge, e.g. "Taking bookings for November". */
  headline: string;
  /** One sentence of detail for /now and /services. */
  detail: string;
  /**
   * Optional last day (YYYY-MM-DD) the headline holds. After it, the site falls
   * back to `fallback` so a stale month never shows. Checked when the page is
   * built, so redeploy (or let a backend serve this) to refresh it.
   */
  until?: string;
  fallback: { status: AvailabilityStatus; headline: string };
}

/** Edit me. */
const availability: Availability = {
  status: "open",
  headline: "Taking bookings for November",
  detail: "Photo sessions, event coverage, websites and network projects. Replies within 24 hours.",
  until: "2026-11-30",
  fallback: { status: "open", headline: "Booking shoots and taking on projects" },
};

export interface ResolvedAvailability {
  status: AvailabilityStatus;
  headline: string;
  detail: string;
}

export async function getAvailability(now = new Date()): Promise<ResolvedAvailability> {
  const { until, fallback, detail } = availability;
  // `until` is inclusive: the headline holds through the end of that day in Manila.
  const expired = until ? now.getTime() > new Date(`${until}T23:59:59+08:00`).getTime() : false;
  return expired ? { ...fallback, detail } : { status: availability.status, headline: availability.headline, detail };
}

/** Badge colours by status, shared by every place that shows it. */
export const availabilityDot: Record<AvailabilityStatus, string> = {
  open: "bg-[#7bd88f]",
  limited: "bg-[#f2c14e]",
  closed: "bg-sky",
};
