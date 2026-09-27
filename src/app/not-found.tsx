"use client";

import Link from "next/link";
import { Terminal, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";
import CustomCursor from "@/components/ui/CustomCursor";

export default function NotFound() {
  return (
    <main className="relative w-full h-screen bg-marine text-butter font-sans selection:bg-accentRed selection:text-marine overflow-hidden cursor-none flex flex-col items-center justify-center">
      <CustomCursor />
      
      {/* CRT Scanline Overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(0,0,0,0)_50%,rgba(0,0,0,0.3)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] z-10" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative z-20 flex flex-col items-center text-center p-10 border border-accentRed/40 bg-black/60 backdrop-blur-md max-w-2xl shadow-[0_0_50px_rgba(229,26,26,0.2)]"
      >
        <ShieldAlert className="w-16 h-16 text-accentRed mb-6 animate-bounce" />
        
        {/* GLITCH EFFECT HEADER */}
        <div className="relative mb-4">
          <h1 className="font-display text-5xl md:text-7xl font-black uppercase tracking-tighter text-accentRed relative z-10">
            Error 404
          </h1>
          <h1 className="font-display text-5xl md:text-7xl font-black uppercase tracking-tighter text-butter absolute top-0 left-0 -translate-x-[2px] translate-y-[2px] opacity-70 mix-blend-screen animate-pulse">
            Error 404
          </h1>
        </div>
        
        <div className="font-mono text-xs md:text-sm tracking-widest uppercase mb-8 opacity-80 leading-relaxed border-y border-butter/10 py-4 w-full">
          <p className="text-accentRed font-bold mb-1">[ALERT]: Target Directory Corrupted or Non-Existent.</p>
          <p className="text-butter/60">The requested routing table packet failed handshake verification.</p>
        </div>

        <Link href="/" className="interactive group relative inline-flex items-center justify-center px-8 py-4 font-mono font-bold uppercase tracking-widest text-marine bg-butter hover:bg-accentRed hover:text-butter transition-colors duration-300">
          <Terminal className="w-5 h-5 mr-3" />
          Reboot to Root Access
          <span className="absolute inset-0 border border-butter scale-105 opacity-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300" />
        </Link>
      </motion.div>
    </main>
  );
}