"use client";

import { motion } from "framer-motion";
import { Camera, Video, Image as ImageIcon, Crosshair } from "lucide-react";

const mediaDeployments = [
  {
    title: "Aurora Music Festival 2026",
    role: "Live Performance Photography",
    gear: "iPhone 14 Pro Max // ProRAW // Lightroom Mobile",
    description: "Executed rapid mobile media deployment during live music sets. Captured, processed, and color-graded high-contrast performance snapshots directly in the field.",
    type: "photo"
  },
  {
    title: "ITSC Recruitment Directives",
    role: "Production Director",
    gear: "Nikon D780 // Canon EOS 1500D // OBS Studio",
    description: "Formulated comprehensive photo and videography guidelines for the ITSC Media Group. Designed screening tasks, shot lists, and dual-preview OBS broadcast configurations for live university operations.",
    type: "video"
  },
  {
    title: "IRCITE 2026 Live Coverage",
    role: "Media Operator",
    gear: "Custom Speedlite Sync // EF 50mm f/1.8",
    description: "Provided continuous live event documentation. Managed optical performance, flash exposure setups, and tethered data transfers in high-pressure, fast-paced university environments.",
    type: "photo"
  },
  {
    title: "Deep-Sky Astrophotography",
    role: "Post-Processing & Stacking",
    gear: "Sequator // Adobe Lightroom Classic // RAW (.cr2)",
    description: "Captured celestial bodies and the Andromeda Galaxy. Executed complex frame stacking protocols and tone curve adjustments to extract high-fidelity optical data from deep-sky targets.",
    type: "photo"
  }
];

export default function MediaPage() {
  return (
    <main className="relative w-full min-h-screen pb-32">
      <section className="relative z-10 w-full pt-40 pb-12 px-6 md:px-16 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-16 border-b border-butter/10 pb-8">
          <span className="font-mono text-accentRed tracking-[0.2em] uppercase text-xs mb-4 flex items-center gap-2">
            <Camera className="w-4 h-4" /> /Directory/Media
          </span>
          <h1 className="font-display text-5xl md:text-7xl font-black uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-butter to-butter/40">
            Visual Telemetry <br/> & Direction
          </h1>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {mediaDeployments.map((log, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="border border-butter/10 bg-black/40 flex flex-col group interactive hover:border-butter/50 transition-all overflow-hidden"
            >
              {/* Image Placeholder Area */}
              <div className="w-full aspect-video bg-marine/40 border-b border-butter/10 relative flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,250,138,0.02)_50%,transparent_75%,transparent_100%)] bg-[length:20px_20px]" />
                {log.type === "video" ? (
                  <Video className="w-12 h-12 text-butter/20 group-hover:scale-110 transition-transform duration-700" />
                ) : (
                  <ImageIcon className="w-12 h-12 text-butter/20 group-hover:scale-110 transition-transform duration-700" />
                )}
                <div className="absolute top-4 right-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-accentRed animate-pulse" />
                  <span className="font-mono text-[9px] uppercase tracking-widest text-butter/50">REC</span>
                </div>
                <Crosshair className="absolute w-full h-full text-butter/5 opacity-50 scale-150" strokeWidth={0.5} />
              </div>

              {/* Data Overlay */}
              <div className="p-6 md:p-8 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-display text-xl md:text-2xl font-bold uppercase text-butter tracking-tight">
                    {log.title}
                  </h3>
                </div>
                <p className="font-mono text-[10px] text-accentRed uppercase tracking-widest mb-2">
                  Role: {log.role}
                </p>
                <p className="font-mono text-xs text-butter/60 uppercase tracking-widest mb-6 border-l border-butter/20 pl-3">
                  {log.gear}
                </p>
                <p className="font-sans text-sm text-butter/80 leading-relaxed mt-auto">
                  {log.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </main>
  );
}