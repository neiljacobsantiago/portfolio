import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { reveal } from "@/lib/reveal";
import { contactNav, primaryNav, utilityNav } from "@/lib/site";

/** Home-page index of every route, so the site reads as one connected directory. */
export default function Directory() {
  const items = [...primaryNav, ...utilityNav, contactNav];

  return (
    <section id="directory" aria-labelledby="directory-title" className="relative z-10 mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 md:px-16 md:py-24">
      <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <span className="mb-2 block font-mono text-xs tracking-[0.2em] text-accentRed uppercase">/Directory //</span>
          <h2 id="directory-title" className="font-display text-3xl font-black tracking-tight uppercase sm:text-4xl md:text-5xl">
            Access Points
          </h2>
        </div>
        <p className="max-w-xs font-mono text-xs uppercase opacity-60 md:text-right">Every node on this host, one hop away.</p>
      </div>

      <ul className="grid grid-cols-1 gap-px border border-butter/10 bg-butter/10 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item, i) => (
          <li key={item.href} {...reveal("up", (i % 4) * 60)}>
            <Link
              href={item.href}
              className={`group interactive flex h-full min-h-32 flex-col justify-between gap-6 p-5 transition-colors sm:p-6 ${
                item === contactNav ? "bg-accentRed/90 text-butter hover:bg-accentRed" : "bg-marine hover:bg-butter/5"
              }`}
            >
              <span className="flex items-start justify-between">
                <span className="font-mono text-[10px] tracking-widest uppercase opacity-60">0{i + 1}</span>
                <ArrowUpRight className="h-5 w-5 opacity-40 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
              </span>
              <span>
                <span className="block font-display text-2xl font-bold uppercase">{item.label}</span>
                <span className="mt-1 block font-mono text-[10px] tracking-widest uppercase opacity-60">{item.description}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
