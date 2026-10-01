"use client";

import { motion } from "framer-motion";
import NavBar from "@/components/ui/NavBar";
import NetworkBackground from "@/components/ui/NetworkBackground";
import { Server, Activity, Database } from "lucide-react";

export default function SystemsPage() {
  return (
    <main className="relative w-full min-h-screen bg-marine text-butter font-sans overflow-x-hidden selection:bg-accentRed selection:text-marine">
      <div className="fixed inset-0 z-0 pointer-events-none opacity-40">
        <NetworkBackground />
      </div>
      <NavBar />

      <section className="relative z-10 w-full pt-40 pb-20 px-6 md:px-16 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-16">
          <span className="font-mono text-accentRed tracking-[0.2em] uppercase text-xs mb-4 block flex items-center gap-2">
            <Server className="w-4 h-4" /> /Directory/Systems
          </span>
          <h1 className="font-display text-5xl md:text-7xl font-black uppercase tracking-tighter">
            Network Architecture <br/> & Deployments
          </h1>
        </motion.div>

        {/* Blank State Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="border border-butter/10 bg-black/40 h-80 p-8 flex flex-col justify-center items-center text-center group hover:border-accentRed/50 transition-colors cursor-none interactive">
              <Activity className="w-12 h-12 text-butter/20 group-hover:text-accentRed transition-colors mb-4" />
              <h3 className="font-display text-2xl font-bold uppercase opacity-50">Project Slot {item}</h3>
              <p className="font-mono text-xs uppercase tracking-widest text-accentRed mt-2">[ Awaiting Documentation ]</p>
            </div>
          ))}
        </div>
      </section>
      
    </main>
  );
}