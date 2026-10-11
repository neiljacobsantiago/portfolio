import type { Metadata } from "next";
import { CheckCircle2, Lock, ShieldAlert, ShieldCheck } from "lucide-react";
import PageHeader, { PageShell } from "@/components/layout/PageHeader";
import { reveal } from "@/lib/reveal";

export const metadata: Metadata = {
  title: "Clearance",
  description: "Certifications earned and in progress: Cisco Networking Academy, CCNA, CEH and CISM.",
};

const pending = [
  { title: "CCNA", desc: "Cisco Certified Network Associate" },
  { title: "CEH", desc: "Certified Ethical Hacker" },
  { title: "CISM", desc: "Certified Information Security Manager" },
];

export default function ClearancePage() {
  return (
    <PageShell>
      <PageHeader section="Clearance" icon={<ShieldCheck />} title="Security Clearance" lead="Authorization & certifications." />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
        <section {...reveal("left")} className="relative overflow-hidden border border-green-500/30 bg-green-950/20 p-6 md:p-8">
          <h2 className="mb-8 flex items-center gap-2 font-mono text-xs tracking-widest text-green-500 uppercase">
            <CheckCircle2 className="h-4 w-4" /> Verified Protocols
          </h2>
          <div className="flex flex-col gap-2">
            <span className="font-display text-2xl font-bold text-butter uppercase">Cisco Networking Academy</span>
            <span className="font-mono text-sm opacity-80">Network Addressing and Basic Troubleshooting</span>
            <span className="mt-4 self-start border border-green-500/30 px-3 py-1 font-mono text-[10px] text-green-400">Digital Badge Acquired: Jan 2026</span>
          </div>
        </section>

        <section {...reveal("right", 100)} className="border border-butter/20 bg-black/40 p-6 md:p-8">
          <h2 className="mb-8 flex items-center gap-2 font-mono text-xs tracking-widest text-accentRed uppercase">
            <ShieldAlert className="h-4 w-4" /> Pending Objectives
          </h2>
          <ul className="space-y-4">
            {pending.map((cert) => (
              <li key={cert.title} className="flex items-center gap-4 border border-butter/10 bg-marine/50 p-4">
                <Lock className="h-5 w-5 shrink-0 text-accentRed/50" />
                <div>
                  <div className="font-display font-bold uppercase">{cert.title}</div>
                  <div className="font-mono text-[10px] uppercase opacity-60">{cert.desc}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </PageShell>
  );
}
