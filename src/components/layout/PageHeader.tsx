import type { ReactNode } from "react";

interface PageHeaderProps {
  /** Path-style breadcrumb, e.g. "Systems" renders "/Directory/Systems". */
  section: string;
  icon: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
}

/** Shared header for every sub-route so they read as one directory. */
export default function PageHeader({ section, icon, title, lead }: PageHeaderProps) {
  return (
    <header className="animate-rise-in mb-10 border-b border-butter/10 pb-8 md:mb-16">
      <p className="mb-4 flex items-center gap-2 font-mono text-xs tracking-[0.2em] text-accentRed uppercase">
        <span className="[&>svg]:h-4 [&>svg]:w-4">{icon}</span> /Directory/{section}
      </p>
      <h1 className="bg-gradient-to-br from-butter to-butter/40 bg-clip-text font-display text-[clamp(2.25rem,9vw,4.5rem)] leading-[0.95] font-black tracking-tighter text-transparent uppercase">
        {title}
      </h1>
      {lead && <p className="mt-6 max-w-2xl font-mono text-sm leading-relaxed text-butter/60">{lead}</p>}
    </header>
  );
}

/** Standard page shell: clears the fixed nav and keeps gutters consistent. */
export function PageShell({ children, narrow = false }: { children: ReactNode; narrow?: boolean }) {
  return (
    <div className={`relative z-10 mx-auto w-full px-4 pt-28 pb-16 sm:px-6 md:px-16 md:pt-40 ${narrow ? "max-w-3xl" : "max-w-7xl"}`}>
      {children}
    </div>
  );
}
