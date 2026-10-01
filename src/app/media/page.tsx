"use client";

import { motion } from "framer-motion";
import NavBar from "@/components/ui/NavBar";
import { Camera, Image as ImageIcon, Video } from "lucide-react";

export default function MediaPage() {
  return (
    <main className="relative w-full min-h-screen bg-marine text-butter font-sans overflow-x-hidden selection:bg-accentRed selection:text-marine">
      <NavBar />

      <section className="relative z-10 w-full pt-40 pb-20 px-6 md:px-16 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-16">
          <span className="font-mono text-accentRed tracking-[0.2em] uppercase text-xs mb-4 block flex items-center gap-2">
            <Camera className="w-4 h-4" /> /Directory/Media
          </span>
          <h1 className="font-display text-5xl md:text-7xl font-black uppercase tracking-tighter">
            Visual Telemetry <br/> & Direction
          </h1>
        </motion.div>

        {/* Blank State Masonry/Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="col-span-1 md:col-span-2 aspect-video border border-butter/10 bg-black/40 flex flex-col items-center justify-center hover:border-butter/50 transition-colors interactive">
            <Video className="w-8 h-8 text-butter/30 mb-2" />
            <p className="font-mono text-xs uppercase tracking-widest text-butter/50">Director's Reel Placeholder</p>
          </div>
          <div className="col-span-1 aspect-square border border-butter/10 bg-black/40 flex flex-col items-center justify-center hover:border-butter/50 transition-colors interactive">
            <ImageIcon className="w-8 h-8 text-butter/30 mb-2" />
            <p className="font-mono text-[10px] uppercase tracking-widest text-butter/50">ProRAW Capture</p>
          </div>
          <div className="col-span-1 aspect-square border border-butter/10 bg-black/40 flex flex-col items-center justify-center hover:border-butter/50 transition-colors interactive">
            <ImageIcon className="w-8 h-8 text-butter/30 mb-2" />
            <p className="font-mono text-[10px] uppercase tracking-widest text-butter/50">Aurora Fest 2026</p>
          </div>
          <div className="col-span-1 md:col-span-2 aspect-video border border-butter/10 bg-black/40 flex flex-col items-center justify-center hover:border-butter/50 transition-colors interactive">
            <Camera className="w-8 h-8 text-butter/30 mb-2" />
            <p className="font-mono text-xs uppercase tracking-widest text-butter/50">ITSC Production Gallery</p>
          </div>
        </div>
      </section>
    </main>
  );
}