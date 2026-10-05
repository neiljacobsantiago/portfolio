"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import NetworkBackground from "@/components/ui/NetworkBackground";
import TechStack from "@/components/sections/TechStack";
import GlobalTelemetry from "@/components/sections/GlobalTelemetry";
import SentinelEye from "@/components/ui/SentinelEye";

export default function ExtravagantPortfolio() {
  return (
    <main className="relative w-full min-h-screen overflow-x-hidden">
      
      <div className="fixed inset-0 z-0 pointer-events-none opacity-40">
        <NetworkBackground />
      </div>

      {/* Upgraded Split Hero Section */}
      <section id="top" className="relative z-10 w-full min-h-screen flex flex-col md:flex-row items-center justify-center md:justify-between px-6 md:px-16 pt-20 pb-12 max-w-7xl mx-auto gap-12">
        
        {/* Left Side: Typography */}
        <motion.div 
          initial={{ opacity: 0, y: 50 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 1, ease: "easeOut" }}
          className="w-full md:w-3/5 z-10"
        >
          <p className="font-mono text-sm md:text-base tracking-[0.3em] text-accentRed mb-4 uppercase">
            Network Systems & Infrastructure Engineering
          </p>
          <h1 className="font-display text-6xl md:text-8xl lg:text-[5.5vw] font-black leading-[0.95] tracking-tighter uppercase text-transparent bg-clip-text bg-gradient-to-br from-butter to-butter/40">
            NEIL JACOB <br /> SANTIAGO
          </h1>
        </motion.div>

        {/* Right Side: Cursor Tracker (Hidden on very small mobile screens) */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }} 
          animate={{ opacity: 1, scale: 1 }} 
          transition={{ duration: 1, delay: 0.3 }}
          className="w-full md:w-2/5 hidden sm:flex justify-center md:justify-end z-10"
        >
          <SentinelEye />
        </motion.div>

      </section>

      {/* Operator Bio Section */}
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

        {/* Image Transition Profile Card */}
        <motion.div initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 1 }} className="w-full md:w-1/3 aspect-square border border-butter/20 bg-black/30 backdrop-blur-sm relative flex items-center justify-center overflow-hidden group interactive">
          
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-accentRed z-30 pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-accentRed z-30 pointer-events-none" />
          
          <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,250,138,0.03)_10px,rgba(255,250,138,0.03)_20px)] z-20 pointer-events-none mix-blend-overlay" />

          {/* Default Image: njs_p.jpg */}
          <Image 
            src="/njs_p.jpg" 
            alt="Sys_Admin Profile" 
            fill 
            className="object-cover transition-transform duration-700 group-hover:scale-105 z-0" 
          />

          {/* Hover Image: njs_p1.jpg */}
          <Image 
            src="/njs_p1.jpg" 
            alt="Sys_Admin Profile Active" 
            fill 
            className="object-cover transition-all duration-700 opacity-0 group-hover:opacity-100 group-hover:scale-105 z-10" 
          />

          <div className="absolute bottom-4 left-4 z-30 pointer-events-none">
            <span className="block font-mono text-[10px] tracking-widest text-accentRed bg-marine/90 border border-accentRed/30 px-2 py-1 uppercase shadow-[0_0_10px_rgba(0,0,0,0.8)]">
              Sys_Admin // Active
            </span>
          </div>
          
        </motion.div>
      </section>

      <TechStack />

      <section id="media" className="relative z-10 w-full min-h-[40vh] px-6 md:px-16 py-24 flex flex-col items-center justify-center text-center max-w-7xl mx-auto border-t border-butter/10">
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
      
    </main>
  );
}