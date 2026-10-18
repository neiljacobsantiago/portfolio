import { cn } from "@/lib/utils";

const PALETTES = [
  "from-ink via-wine to-ember",
  "from-wine via-ember to-paper-deep",
  "from-ink via-ink to-sky",
  "from-sky via-paper-deep to-ember",
];

/**
 * Stand-in artwork for a series that has no photos yet: an abstract
 * "developing" print in the site palette. Disappears once images are added.
 */
export default function Plate({ index, title, className }: { index: number; title: string; className?: string }) {
  return (
    <div className={cn("relative h-full w-full overflow-hidden bg-gradient-to-br", PALETTES[index % PALETTES.length], className)} aria-hidden>
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full text-paper/25">
        {Array.from({ length: 7 }, (_, i) => (
          <circle key={i} cx={30 + (index % 3) * 20} cy={40 + (index % 2) * 20} r={8 + i * 9} fill="none" stroke="currentColor" strokeWidth="0.3" />
        ))}
      </svg>
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-4">
        <span className="font-display text-lg text-paper/90">{title}</span>
        <span className="label text-2xs text-paper/70">Developing…</span>
      </div>
    </div>
  );
}
