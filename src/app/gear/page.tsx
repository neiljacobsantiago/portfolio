import type { Metadata } from "next";
import { Camera, Cpu, Watch } from "lucide-react";
import PageHeader, { PageShell } from "@/components/layout/PageHeader";
import { reveal } from "@/lib/reveal";

export const metadata: Metadata = {
  title: "Gear",
  description: "The computing, camera and everyday-carry loadout behind Neil Jacob Santiago's work.",
};

const gearList = [
  { category: "Computing", icon: <Cpu />, items: ["Acer Nitro V (i5-13420H, RTX 2050)", "AMD Ryzen 3 3100 Desktop (GTX 1050 Ti)", "Huawei MateBook D14"] },
  { category: "Visual Telemetry", icon: <Camera />, items: ["Nikon D780 DSLR", "Canon EOS 1500D (EF 50mm f/1.8)", "iPhone 14 Pro Max (ProRAW Capture)", "Custom Speedlite Flash Units"] },
  { category: "EDC & Style", icon: <Watch />, items: ["Custom Seiko Mod Yacht-Master (Steel)", "Bvlgari Aqva Pour Homme", "Father & Son Skyfall"] },
];

export default function GearPage() {
  return (
    <PageShell>
      <PageHeader section="Gear" icon={<Cpu />} title="Hardware Loadout" lead="Verified operator equipment." />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
        {gearList.map((tier, i) => (
          <section key={tier.category} {...reveal("up", i * 100)} className="group border border-butter/10 bg-black/40 p-6 transition-colors hover:border-accentRed/50 md:p-8">
            <div className="mb-6 flex h-12 w-12 items-center justify-center bg-accentRed/10 text-accentRed">{tier.icon}</div>
            <h2 className="mb-6 font-display text-2xl font-bold uppercase transition-colors group-hover:text-accentRed">{tier.category}</h2>
            <ul className="space-y-4 font-mono text-xs opacity-70">
              {tier.items.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-0.5 text-accentRed">{">"}</span> {item}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </PageShell>
  );
}
