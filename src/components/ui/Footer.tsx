"use client";

import { motion } from "framer-motion";
import { Command, ShieldCheck } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative z-10 w-full border-t border-butter/10 bg-black/80 backdrop-blur-md pt-12 pb-6 px-6 md:px-16 mt-20">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Command className="w-5 h-5 text-accentRed" />
            <span className="font-display font-black text-xl tracking-tighter uppercase text-butter">NEIL.JACOB</span>
          </div>
          <p className="font-mono text-xs opacity-60 max-w-sm leading-relaxed">
            Operating at the intersection of rigid server architectures and high-end creative telemetry. San Jose City, PH.
          </p>
        </div>

        <div className="font-mono text-[10px] uppercase tracking-widest text-right flex flex-col gap-2">
          <span className="flex items-center gap-2 text-green-400 justify-end">
            <ShieldCheck className="w-3 h-3" /> Secure Connection Established
          </span>
          <span className="opacity-50">
            © {currentYear} Neil Jacob Santiago. All Rights Reserved.
          </span>
          <span className="opacity-40">
            Powered by Next.js & NeilAI Sys_Logic.
          </span>
        </div>

      </div>

      {/* Blinking Cursor Easter Egg */}
      <div className="max-w-7xl mx-auto mt-12 pt-4 border-t border-butter/5 font-mono text-xs text-accentRed flex items-center">
        <span>root@neilos:~/portfolio/end_of_file$</span>
        <motion.span 
          animate={{ opacity: [1, 0] }} 
          transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
          className="inline-block w-2 h-3 bg-accentRed ml-2"
        />
      </div>
    </footer>
  );
}