"use client";

import NavBar from "@/components/ui/NavBar";
import Footer from "@/components/ui/Footer";
import { ShieldAlert, CheckCircle2, Lock } from "lucide-react";
import { motion } from "framer-motion";

export default function ClearancePage() {
  return (
    <main className="relative w-full min-h-screen bg-marine text-butter font-sans selection:bg-accentRed">
      <NavBar />
      <section className="w-full pt-40 pb-20 px-6 md:px-16 max-w-7xl mx-auto">
        <h1 className="font-display text-5xl md:text-7xl font-black uppercase tracking-tighter mb-4 text-transparent bg-clip-text bg-gradient-to-br from-butter to-butter/40">
          Security Clearance
        </h1>
        <p className="font-mono text-sm text-accentRed uppercase tracking-widest mb-16 border-l-2 border-accentRed/30 pl-4">Authorization & Certifications</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Acquired Credentials */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="border border-green-500/30 bg-green-950/20 p-8 relative overflow-hidden">
            <h3 className="font-mono text-xs tracking-widest uppercase text-green-500 mb-8 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Verified Protocols</h3>
            <div className="flex flex-col gap-2">
              <span className="font-display text-2xl font-bold uppercase text-butter">Cisco Networking Academy</span>
              <span className="font-mono text-sm opacity-80">Network Addressing and Basic Troubleshooting</span>
              <span className="font-mono text-[10px] text-green-400 mt-4 border border-green-500/30 inline-block px-3 py-1 self-start">Digital Badge Acquired: Jan 2026</span>
            </div>
          </motion.div>

          {/* Pending Objectives */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="border border-butter/20 bg-black/40 p-8">
            <h3 className="font-mono text-xs tracking-widest uppercase text-accentRed mb-8 flex items-center gap-2"><ShieldAlert className="w-4 h-4" /> Pending Objectives</h3>
            <ul className="space-y-6">
              {[
                { title: "CCNA", desc: "Cisco Certified Network Associate" },
                { title: "CEH", desc: "Certified Ethical Hacker" },
                { title: "CISM", desc: "Certified Information Security Manager" }
              ].map((cert, i) => (
                <li key={i} className="flex items-center gap-4 p-4 border border-butter/10 bg-marine/50">
                  <Lock className="w-5 h-5 text-accentRed/50" />
                  <div>
                    <div className="font-display font-bold uppercase">{cert.title}</div>
                    <div className="font-mono text-[10px] opacity-60 uppercase">{cert.desc}</div>
                  </div>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>
      <Footer />
    </main>
  );
}