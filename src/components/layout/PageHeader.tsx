import type { ReactNode } from "react";

interface PageHeaderProps {
  /** Small label above the title, e.g. "Selected work". */
  eyebrow: string;
  title: ReactNode;
  lead?: ReactNode;
  /** Optional right-hand detail (stats, links). */
  aside?: ReactNode;
}

/** Shared editorial header for every inner page. */
export default function PageHeader({ eyebrow, title, lead, aside }: PageHeaderProps) {
  return (
    <header className="mx-auto grid max-w-[90rem] gap-10 px-5 pt-32 pb-14 md:grid-cols-12 md:px-10 md:pt-44 md:pb-20">
      <div className="md:col-span-9">
        <p className="label animate-rise-in text-ember">{eyebrow}</p>
        <h1 className="mt-5 font-display text-[clamp(2.9rem,9vw,8rem)] leading-[1] tracking-[-0.01em]">
          <span className="line-mask">
            <span className="animate-line-up block">{title}</span>
          </span>
        </h1>
        {lead && (
          <p className="animate-rise-in mt-8 max-w-2xl font-serif text-xl leading-relaxed text-ink/80 md:text-2xl" style={{ animationDelay: "150ms" }}>
            {lead}
          </p>
        )}
      </div>
      {aside && (
        <div className="animate-rise-in self-end md:col-span-3" style={{ animationDelay: "250ms" }}>
          {aside}
        </div>
      )}
    </header>
  );
}

/** Standard content width & gutters for inner pages. */
export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto max-w-[90rem] px-5 md:px-10 ${className}`}>{children}</div>;
}
