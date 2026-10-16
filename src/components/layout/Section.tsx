import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Editorial section: a label rail on the left, a display heading on the right, content below. */
export default function Section({ id, label, title, intro, children, className = "" }: { id?: string; label: string; title: ReactNode; intro?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-title` : undefined} aria-label={id ? undefined : label} className={cn("mt-24 scroll-mt-28 border-t border-ink/15 pt-12 md:mt-32 md:pt-14", className)}>
      <div className="mb-10 grid gap-4 md:mb-12 md:grid-cols-12">
        <p className="label text-ember md:col-span-3">{label}</p>
        <div className="md:col-span-9">
          <h2 id={id ? `${id}-title` : undefined} className="font-display text-[clamp(2.25rem,5vw,4rem)] leading-none">
            {title}
          </h2>
          {intro && <p className="mt-5 max-w-2xl font-serif text-xl leading-relaxed text-ink/75">{intro}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

/** A wrap-friendly row of in-page jump links (never scrolls sideways on phones). */
export function JumpLinks({ items, label = "On this page" }: { items: { label: string; href: string }[]; label?: string }) {
  return (
    <nav aria-label={label} className="flex flex-wrap gap-2">
      {items.map((i) => (
        <a key={i.href} href={i.href} className="label press rounded-full border border-ink/20 px-3.5 py-2 text-[0.6rem] text-ink/70 hover:border-ink hover:bg-ink hover:text-paper">
          {i.label}
        </a>
      ))}
    </nav>
  );
}
