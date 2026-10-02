"use client";

import NavBar from "@/components/ui/NavBar";
import Footer from "@/components/ui/Footer";
import { Cpu, Camera, Watch } from "lucide-react";
import { motion } from "framer-motion";

const gearList = [
  { category: "Computing", icon: <Cpu />, items: ["Acer Nitro V (i5-13420H, RTX 2050)", "AMD Ryzen 3 3100 Desktop (GTX 1050 Ti)", "Huawei MateBook D14"] },
  { category: "Visual Telemetry", icon: <Camera />, items: ["Nikon D780 DSLR", "Canon EOS 1500D (EF 50mm f/1.8)", "iPhone 14 Pro Max (ProRAW Capture)", "Custom Speedlite Flash Units"] },
  { category: "EDC & Style", icon: <Watch />, items: ["Custom Seiko Mod Yacht-Master (Steel)", "Bvlgari Aqva Pour Homme", "Father & Son Skyfall"] },
];

export default function GearPage() {
  return (
    <main className="relative w-full min-h-screen bg-marine text-butter font-sans selection:bg-accentRed">
      <NavBar />
      <section className="w-full pt-40 pb-20 px-6 md:px-16 max-w-7xl mx-auto">
        <h1 className="font-display text-5xl md:text-7xl font-black uppercase tracking-tighter mb-4 text-transparent bg-clip-text bg-gradient-to-br from-butter to-butter/40">
          Hardware Loadout
        </h1>
        <p className="font-mono text-sm text-accentRed uppercase tracking-widest mb-16 border-l-2 border-accentRed/30 pl-4">Verified Operator Equipment</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {gearList.map((tier, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="border border-butter/10 bg-black/40 p-8 hover:border-accentRed/50 transition-colors group">
              <div className="w-12 h-12 bg-accentRed/10 flex items-center justify-center text-accentRed mb-6">{tier.icon}</div>
              <h3 className="font-display text-2xl font-bold uppercase mb-6 group-hover:text-accentRed transition-colors">{tier.category}</h3>
              <ul className="font-mono text-xs opacity-70 space-y-4">
                {tier.items.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-accentRed mt-0.5">{">"}</span> {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </section>
      <Footer />
    </main>
  );
}