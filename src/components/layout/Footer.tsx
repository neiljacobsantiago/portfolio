import Link from "next/link";
import { Command, ShieldCheck } from "lucide-react";
import { allRoutes, site, socials } from "@/lib/site";

export default function Footer() {
  const linked = socials.filter((s) => s.url);

  return (
    <footer className="relative z-10 mt-20 w-full border-t border-butter/10 bg-black/80 px-4 pt-12 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 md:px-16">
      <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[2fr_1fr_1fr]">
        <div>
          <div className="mb-4 flex items-center gap-2">
            <Command className="h-5 w-5 text-accentRed" />
            <span className="font-display text-xl font-black tracking-tighter text-butter uppercase">Neil.Jacob</span>
          </div>
          <p className="max-w-sm font-mono text-xs leading-relaxed opacity-60">
            Operating at the intersection of rigid server architectures and high-end creative telemetry. {site.location}.
          </p>
        </div>

        <nav aria-label="Footer">
          <p className="mb-3 font-mono text-[10px] tracking-[0.3em] text-accentRed uppercase">Directory</p>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-2 font-mono text-xs uppercase">
            {allRoutes.map((r) => (
              <li key={r.href}>
                <Link href={r.href} className="interactive opacity-60 transition-opacity hover:opacity-100">
                  {r.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className="mb-3 font-mono text-[10px] tracking-[0.3em] text-accentRed uppercase">Channels</p>
          <ul className="space-y-2 font-mono text-xs uppercase">
            {linked.map((s) => (
              <li key={s.name}>
                <a href={s.url!} target="_blank" rel="noopener noreferrer" className="interactive opacity-60 transition-opacity hover:opacity-100">
                  {s.name} ↗
                </a>
              </li>
            ))}
            <li>
              <Link href="/contact" className="interactive opacity-60 transition-opacity hover:opacity-100">
                Secure transmission
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-12 flex max-w-7xl flex-col gap-2 border-t border-butter/5 pt-4 font-mono text-[10px] tracking-widest uppercase md:flex-row md:items-center md:justify-between">
        <span className="flex items-center gap-2 text-xs tracking-normal text-accentRed normal-case">
          root@neilos:~/portfolio/end_of_file$
          <span className="animate-blink inline-block h-3 w-2 bg-accentRed" />
        </span>
        <span className="flex items-center gap-2 text-green-400">
          <ShieldCheck className="h-3 w-3" /> Secure connection established
        </span>
        <span className="opacity-50">© {new Date().getFullYear()} {site.name}</span>
      </div>
    </footer>
  );
}
