import Image from "next/image";
import { logoSrc } from "@/lib/logos";
import { cn } from "@/lib/utils";

/**
 * Renders /public/logos/<name>.* if it exists, otherwise a monogram disc —
 * so content can reference logos before the files are added.
 */
export default function Logo({ name, label, className, bloom = true }: { name?: string; label: string; className?: string; bloom?: boolean }) {
  const src = logoSrc(name);
  return (
    <span className={cn("relative block shrink-0", className)}>
      {src ? (
        <Image src={src} alt={`${label} logo`} fill sizes="96px" className={cn("object-contain", bloom && "logo-bloom")} />
      ) : (
        <span
          aria-hidden
          className={cn("flex aspect-square h-full max-w-full items-center justify-center rounded-full border border-current/25 font-display text-[0.9em] leading-none", bloom && "logo-bloom")}
        >
          {label
            .split(/\s+/)
            .map((w) => w[0])
            .join("")
            .slice(0, 3)}
        </span>
      )}
    </span>
  );
}
