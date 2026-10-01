"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Terminal, AlertTriangle, ShieldAlert } from "lucide-react";
import NetworkBackground from "@/components/ui/NetworkBackground";

export default function NotFound() {
  return (
    <main className="relative w-full h-screen bg-marine text-butter font-sans overflow-hidden selection:bg-accentRed flex flex-col items-center justify-center">
      
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
        <NetworkBackground />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
        className="relative z-10 border border-accentRed/40 bg-black/60 backdrop-blur-md p-8 md:p-16 max-w-2xl w-[90%] text-center shadow-[0_0_50px_rgba(229,26,26,0.15)]"
      >
        <motion.div 
          animate={{ y: [0, -10, 0] }} 
          transition={{ repeat: Infinity, duration: 2 }}
          className="flex justify-center mb-6"
        >
          <ShieldAlert className="w-20 h-20 text-accentRed" />
        </motion.div>

        <h1 className="font-display text-5xl md:text-7xl font-black uppercase tracking-tighter text-accentRed mb-2">
          404: Packet Dropped
        </h1>
        
        <div className="font-mono text-xs tracking-[0.3em] uppercase text-butter/60 mb-8 border-b border-butter/10 pb-4">
          Critical Routing Failure
        </div>

        <p className="font-sans text-lg opacity-80 mb-6 leading-relaxed">
          We checked the routing tables. We pinged the DNS. We even asked the AI. 
          This endpoint simply does not exist. You are currently drifting in the digital void.
        </p>

        <div className="bg-marine/50 border border-butter/20 p-4 font-mono text-xs text-left mb-8 rounded-sm">
          <span className="text-accentRed">root@neilos:~$</span> ping {typeof window !== "undefined" ? window.location.pathname : "/unknown"} <br/>
          <span className="opacity-50">Destination Host Unreachable.</span><br/>
          <span className="opacity-50">1 packets transmitted, 0 received, 100% packet loss.</span>
        </div>

        <Link href="/">
          <button className="group relative px-8 py-4 bg-accentRed text-butter font-display font-bold uppercase tracking-widest hover:bg-butter hover:text-marine transition-colors interactive overflow-hidden cursor-none">
            <span className="relative z-10 flex items-center gap-2">
              <Terminal className="w-4 h-4" /> Initialize Reroute
            </span>
          </button>
        </Link>
      </motion.div>
    </main>
  );
}