import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert, Terminal } from "lucide-react";
import CurrentPath from "@/components/effects/CurrentPath";
import { primaryNav } from "@/lib/site";

export const metadata: Metadata = { title: "404: Packet Dropped" };

export default function NotFound() {
  return (
    <div className="relative flex min-h-[100svh] w-full flex-col items-center justify-center px-4 pt-24 pb-12">
      <div className="animate-rise-in relative z-10 w-full max-w-2xl border border-accentRed/40 bg-black/60 p-6 text-center shadow-[0_0_50px_rgba(229,26,26,0.15)] sm:p-8 md:p-16">
        <div className="animate-float mb-6 flex justify-center">
          <ShieldAlert className="h-16 w-16 text-accentRed md:h-20 md:w-20" />
        </div>

        <h1 className="mb-2 font-display text-[clamp(2.25rem,10vw,4.5rem)] leading-none font-black tracking-tighter text-accentRed uppercase">
          404: Packet Dropped
        </h1>
        <p className="mb-8 border-b border-butter/10 pb-4 font-mono text-xs tracking-[0.3em] text-butter/60 uppercase">Critical Routing Failure</p>

        <p className="mb-6 font-sans text-base leading-relaxed opacity-80 md:text-lg">
          We checked the routing tables. We pinged the DNS. We even asked the AI. This endpoint simply does not exist.
        </p>

        <div className="mb-8 rounded-sm border border-butter/20 bg-marine/50 p-4 text-left font-mono text-xs break-all">
          <span className="text-accentRed">root@neilos:~$</span> ping <CurrentPath />
          <br />
          <span className="opacity-50">Destination Host Unreachable.</span>
          <br />
          <span className="opacity-50">1 packets transmitted, 0 received, 100% packet loss.</span>
        </div>

        <Link
          href="/"
          className="interactive inline-flex items-center gap-2 bg-accentRed px-8 py-4 font-display font-bold tracking-widest text-butter uppercase transition-colors hover:bg-butter hover:text-marine"
        >
          <Terminal className="h-4 w-4" /> Initialize Reroute
        </Link>

        <nav aria-label="Suggested pages" className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 font-mono text-xs uppercase">
          {primaryNav.map((item) => (
            <Link key={item.href} href={item.href} className="interactive text-butter/60 hover:text-accentRed">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
