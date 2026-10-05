"use client";

import { motion } from "framer-motion";
import { Activity, Database } from "lucide-react";

const sysLogs = [
  { time: "09:55:23", status: "OK", process: "SYS_BOOT", detail: "NEIL.OS Kernel Initialized" },
  { time: "09:55:24", status: "OK", process: "NET_CONFIG", detail: "IPv4 & IPv6 Dual-Stack Enabled" },
  { time: "09:55:24", status: "OK", process: "ENV_MOUNT", detail: "Local Variables Loaded" },
  { time: "09:55:25", status: "WARN", process: "API_POLL", detail: "GitHub Telemetry Rate Limit Near" },
  { time: "09:55:25", status: "OK", process: "AI_NODE", detail: "Gemini 3.5-flash-lite Socket Bound" },
  { time: "09:55:28", status: "OK", process: "SEC_AUDIT", detail: "Zero Vulnerabilities Detected" },
  { time: "09:56:01", status: "OK", process: "USR_SESS", detail: "Anonymous Connection Established" },
  { time: "09:56:12", status: "INFO", process: "ROUTING", detail: "Navigated to /Directory/Logs" },
];

export default function LogsPage() {
  return (
    <main className="relative w-full min-h-screen pb-32">
      <section className="relative z-10 w-full pt-40 pb-12 px-6 md:px-16 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12 border-b border-butter/10 pb-8">
          <span className="font-mono text-accentRed tracking-[0.2em] uppercase text-xs mb-4 flex items-center gap-2">
            <Database className="w-4 h-4" /> /Directory/Logs
          </span>
          <h1 className="font-display text-5xl md:text-7xl font-black uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-butter to-butter/40">
            System <br/> Telemetry Logs
          </h1>
        </motion.div>

        <div className="border border-butter/20 bg-black/80 font-mono text-sm p-6 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-30 animate-pulse">
            <Activity className="w-6 h-6 text-accentRed" />
          </div>
          
          <div className="flex flex-col gap-3 h-[60vh] overflow-y-auto custom-scrollbar">
            {sysLogs.map((log, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }} 
                transition={{ delay: i * 0.15 }}
                className="flex items-start md:items-center gap-4 text-butter/80"
              >
                <span className="text-butter/40 shrink-0">[{log.time}]</span>
                <span className={`shrink-0 px-2 py-0.5 text-[10px] uppercase font-bold tracking-widest ${
                  log.status === "OK" ? "bg-green-500/20 text-green-500" : 
                  log.status === "WARN" ? "bg-yellow-500/20 text-yellow-500" : 
                  "bg-butter/20 text-butter"
                }`}>
                  {log.status}
                </span>
                <span className="text-accentRed shrink-0 min-w-[100px]">{log.process}</span>
                <span className="truncate">{log.detail}</span>
              </motion.div>
            ))}
            
            {/* Blinking cursor at the end */}
            <div className="flex items-center gap-2 mt-4">
              <span className="text-accentRed">root@neilos:~#</span>
              <span className="w-2 h-4 bg-butter/80 animate-pulse"></span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}