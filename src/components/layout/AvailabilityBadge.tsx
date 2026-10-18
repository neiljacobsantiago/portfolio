import Link from "next/link";
import { availabilityDot, type ResolvedAvailability } from "@/content/availability";
import Icon from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

/**
 * "Taking bookings for November" with a live dot. Pass the value from
 * getAvailability() so the source can change without touching this component.
 */
export default function AvailabilityBadge({ availability, href = "/now", tone = "paper", className }: { availability: ResolvedAvailability; href?: string; tone?: "paper" | "ink"; className?: string }) {
  const dot = availabilityDot[availability.status];
  return (
    <Link
      href={href}
      className={cn(
        "group press inline-flex max-w-full items-center gap-2.5 rounded-full py-2 pr-4 pl-3 font-serif italic",
        tone === "paper" ? "bg-paper/10 text-paper/80 hover:bg-paper/15 hover:text-paper" : "bg-ink/[0.06] text-ink/80 hover:bg-ink/10 hover:text-ink",
        className,
      )}
    >
      <span className="relative flex h-2 w-2 shrink-0">
        {availability.status !== "closed" && <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60", dot)} />}
        <span className={cn("relative h-2 w-2 rounded-full", dot)} />
      </span>
      <span className="min-w-0">{availability.headline}</span>
      <Icon name="arrow-right" className="text-[0.85em] opacity-70 transition-transform duration-500 ease-[var(--ease-spring)] group-hover:translate-x-0.5" />
    </Link>
  );
}
