import { services } from "@/content/sessions";
import type { BookingClaim } from "@/lib/booking-token";
import { quote } from "@/lib/tools/quote";

/** Turns a verified booking link back into the full booking (names and prices from our own list). */
export function resolveBooking(claim: BookingClaim) {
  const service = services.find((s) => s.id === claim.service);
  const pkg = service?.packages.find((p) => p.id === claim.pkg);
  if (!service || !pkg) return null;
  const q = quote(service.id, pkg.id);
  const perHead = pkg.price.includes("/ head");
  return { ...claim, service, pkg, downpayment: "error" in q || perHead ? null : q.downpayment };
}

export type ResolvedBooking = NonNullable<ReturnType<typeof resolveBooking>>;
