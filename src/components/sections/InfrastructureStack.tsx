"use client";

import { motion } from "framer-motion";

const technologies = [
  {
    name: "Next.js",
    category: "Web Framework",
    desc: "Server-side rendering, API routing, and Edge networking.",
    icon: (
      <svg viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-butter group-hover:text-accentRed transition-colors">
        <path fillRule="evenodd" clipRule="evenodd" d="M64 128C99.3462 128 128 99.3462 128 64C128 28.6538 99.3462 0 64 0C28.6538 0 0 28.6538 0 64C0 99.3462 28.6538 128 64 128ZM85.5037 83.136L50.218 36.352H38.1171V91.648H47.7816V46.6806L81.0827 91.0772C82.6074 88.636 84.1506 85.9525 85.5037 83.136ZM90.4131 36.352H80.7486V91.648H90.4131V36.352Z" fill="currentColor"/>
      </svg>
    )
  },
  {
    name: "Python",
    category: "Machine Learning & Logic",
    desc: "Pandas, NumPy, scikit-learn, and dataset processing.",
    icon: (
      <svg viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-butter group-hover:text-accentRed transition-colors">
        <path d="M63.791 4.60635C30.3473 4.60635 25.8647 19.349 25.8647 19.349V36.1953H64.2187V40.2319H19.784C19.784 40.2319 3.01633 39.4678 3.01633 63.8741C3.01633 88.2804 18.006 87.6749 18.006 87.6749H26.3159V72.0494C26.3159 72.0494 25.597 49.3486 49.6206 49.3486H76.7115C76.7115 49.3486 96.0963 48.749 96.0963 29.5694C96.0963 10.3897 81.3323 4.60635 63.791 4.60635ZM46.994 13.9877C50.2461 13.9877 52.883 16.6246 52.883 19.8767C52.883 23.1288 50.2461 25.7657 46.994 25.7657C43.742 25.7657 41.1051 23.1288 41.1051 19.8767C41.1051 16.6246 43.742 13.9877 46.994 13.9877ZM64.209 123.394C97.6527 123.394 102.135 108.651 102.135 108.651V91.8047H63.7813V87.7681H108.216C108.216 87.7681 124.984 88.5322 124.984 64.1259C124.984 39.7196 109.994 40.3251 109.994 40.3251H101.684V55.9506C101.684 55.9506 102.403 78.6514 78.3794 78.6514H51.2885C51.2885 78.6514 31.9037 79.251 31.9037 98.4306C31.9037 117.61 46.6677 123.394 64.209 123.394ZM81.006 114.012C77.754 114.012 75.1171 111.375 75.1171 108.123C75.1171 104.871 77.754 102.234 81.006 102.234C84.258 102.234 86.895 104.871 86.895 108.123C86.895 111.375 84.258 114.012 81.006 114.012Z" fill="currentColor"/>
      </svg>
    )
  },
  {
    name: "Cisco Networks",
    category: "Infrastructure",
    desc: "Packet Tracer, OSPF, VLANs, and Subnetting Topologies.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-butter group-hover:text-accentRed transition-colors">
        <path d="M2.5 12V6.5h2V12h-2zm4 4V3.5h2V16h-2zm4 4.5V1.5h2v19h-2zm4-4.5V3.5h2V16h-2zm4-4V6.5h2V12h-2z" fill="currentColor"/>
      </svg>
    )
  },
  {
    name: "Kali Linux",
    category: "InfoSec & Auditing",
    desc: "Nmap, Wireshark, Snort Intrusion Detection, and Pen-testing.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-butter group-hover:text-accentRed transition-colors">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )
  },
  {
    name: "MySQL",
    category: "Database Architectures",
    desc: "Relational database mapping and robust backend querying.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-butter group-hover:text-accentRed transition-colors">
        <ellipse cx="12" cy="5" rx="9" ry="3" stroke="currentColor" strokeWidth="2"/>
        <path d="M3 5V19C3 20.6569 7.02944 22 12 22C16.9706 22 21 20.6569 21 19V5" stroke="currentColor" strokeWidth="2"/>
        <path d="M3 12C3 13.6569 7.02944 15 12 15C16.9706 15 21 13.6569 21 12" stroke="currentColor" strokeWidth="2"/>
      </svg>
    )
  },
  {
    name: "Tailwind CSS",
    category: "Frontend Styling",
    desc: "Utility-first design, fluid layouts, and component architecture.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-butter group-hover:text-accentRed transition-colors">
        <path d="M12 6.5C14.5 3.5 17.5 3.5 19.5 5.5C21.5 7.5 21.5 10.5 19 13.5C16.5 16.5 13.5 16.5 11.5 14.5C9.5 12.5 9.5 9.5 12 6.5ZM5 10.5C7.5 7.5 10.5 7.5 12.5 9.5C14.5 11.5 14.5 14.5 12 17.5C9.5 20.5 6.5 20.5 4.5 18.5C2.5 16.5 2.5 13.5 5 10.5Z" fill="currentColor"/>
      </svg>
    )
  }
];

export default function InfrastructureStack() {
  return (
    <section id="systems" className="relative z-10 w-full min-h-[70vh] px-6 md:px-16 py-32 bg-black/40 border-y border-butter/10">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between md:items-end mb-16 gap-6">
          <div>
            <span className="font-mono text-accentRed tracking-[0.2em] uppercase text-sm mb-2 block">Sys_Config //</span>
            <h2 className="font-display text-4xl md:text-6xl font-black uppercase tracking-tight">
              Infrastructure Stack
            </h2>
          </div>
          <p className="font-mono text-xs opacity-60 uppercase max-w-xs text-right hidden md:block">
            Verified protocols and frameworks governing host operations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {technologies.map((tech, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 30 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true }} 
              transition={{ duration: 0.5, delay: i * 0.1 }} 
              className="border border-butter/10 bg-marine/60 p-8 hover:bg-butter/5 hover:border-accentRed/50 transition-all group flex flex-col interactive"
            >
              <div className="mb-6">{tech.icon}</div>
              <h3 className="font-display text-2xl font-bold uppercase mb-1 group-hover:text-accentRed transition-colors">{tech.name}</h3>
              <p className="font-mono text-[10px] text-accentRed tracking-widest uppercase mb-4 opacity-80">{tech.category}</p>
              <p className="font-sans opacity-70 leading-relaxed text-sm mt-auto">{tech.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}