"use client";

import { motion } from "framer-motion";
import NetworkBackground from "@/components/ui/NetworkBackground";
import NeilAI from "@/components/os/NeilAI";
import NavBar from "@/components/ui/NavBar";
import TechStack from "@/components/sections/TechStack";
import GlobalTelemetry from "@/components/sections/GlobalTelemetry";

export default function ExtravagantPortfolio() {
  return (
    <main className="relative w-full min-h-screen bg-marine text-butter font-sans overflow-x-hidden selection:bg-accentRed selection:text-marine">
      
      <div className="fixed inset-0 z-0 pointer-events-none opacity-40">
        <NetworkBackground />
      </div>

      <NavBar />

      <section className="relative z-10 w-full h-screen flex flex-col justify-center px-6 md:px-16 pt-20 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: "easeOut" }}>
          <p className="font-mono text-sm md:text-base tracking-[0.3em] text-accentRed mb-4 uppercase">
            Network Systems & Infrastructure Engineering
          </p>
          <h1 className="font-display text-[12vw] md:text-[8vw] font-black leading-[0.85] tracking-tighter uppercase text-transparent bg-clip-text bg-gradient-to-br from-butter to-butter/40">
            Neil Jacob <br /> Santiago
          </h1>
        </motion.div>
      </section>

      <section id="about" className="relative z-10 w-full min-h-screen px-6 md:px-16 py-32 flex flex-col md:flex-row items-center justify-between max-w-7xl mx-auto border-t border-butter/10">
        <motion.div initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.8 }} className="w-full md:w-1/2 mb-16 md:mb-0">
          <h2 className="font-display text-5xl md:text-7xl font-bold leading-none mb-8">
            STRUCTURAL <span className="text-accentRed italic">LOGIC.</span><br />
            EDITORIAL <span className="text-accentRed italic">VISION.</span>
          </h2>
          <div className="w-24 h-1 bg-accentRed mb-8" />
          <p className="text-lg md:text-xl font-light leading-relaxed max-w-xl opacity-80 mb-6">
            I balance the uncompromising logic of dynamic routing and vulnerability auditing with the fluid dynamics of multimedia direction.
          </p>
          <p className="text-base md:text-lg font-mono text-accentRed leading-relaxed max-w-xl pl-6 border-l-2 border-accentRed/30">
            Operating at the intersection of rigid server architectures and high-end creative telemetry.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 1 }} className="w-full md:w-1/3 aspect-square border border-butter/20 bg-black/30 backdrop-blur-sm relative flex items-center justify-center p-8 overflow-hidden group">
          <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,250,138,0.03)_10px,rgba(255,250,138,0.03)_20px)]" />
          <div className="text-center relative z-10 group-hover:scale-105 transition-transform duration-700">
            <span className="block font-mono text-[10px] tracking-widest text-accentRed mb-2 uppercase">Sys_Admin_Profile</span>
            <span className="block font-display text-6xl font-black">N.J.S</span>
          </div>
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-accentRed" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-accentRed" />
        </motion.div>
      </section>

      <TechStack />

      <section id="media" className="relative z-10 w-full min-h-[40vh] px-6 md:px-16 py-24 flex flex-col items-center justify-center text-center max-w-7xl mx-auto">
        <h2 className="font-display text-4xl md:text-6xl font-black uppercase mb-6 tracking-tight opacity-30">
          Visual Telemetry
        </h2>
        <div className="font-mono text-sm max-w-lg mx-auto opacity-70 mb-4">
          Nikon D780 / Canon EOS 1500D / iPhone 14 Pro Max
        </div>
        <div className="font-mono text-accentRed uppercase tracking-widest text-xs border border-accentRed/30 bg-accentRed/5 px-6 py-3 rounded-full cursor-none">
          [ Awaiting ProRAW Dataset Uploads ]
        </div>
      </section>

      <GlobalTelemetry />

      <NeilAI />
    </main>
  );
}