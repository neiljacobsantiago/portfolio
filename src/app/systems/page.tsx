"use client";

import { motion } from "framer-motion";
import { Server, Activity, Shield, Terminal, Network } from "lucide-react";

const systemProjects = [
  {
    id: "SYS-01",
    title: "CLIRDEC Network Architecture",
    icon: <Network className="w-6 h-6" />,
    tech: "Cisco Packet Tracer // VLANs // RIP Protocol",
    description: "Engineered comprehensive physical and logical network topologies for the CLIRDEC facility at CLSU. Designed inter-VLAN routing, static routes, and compiled a complete hardware Bill of Materials calculated in ₱ for procurement.",
    status: "Deployed // Stable"
  },
  {
    id: "SYS-02",
    title: "Vulnerability & Intrusion Auditing",
    icon: <Shield className="w-6 h-6" />,
    tech: "Kali Linux // Nmap // Snort // Metasploit",
    description: "Configured isolated dual-boot Linux environments to execute network vulnerability scans. Implemented custom Snort intrusion detection rules to monitor packet traffic and defend against simulated active payloads.",
    status: "Audit Complete"
  },
  {
    id: "SYS-03",
    title: "Whisper AI Audio Transcription",
    icon: <Terminal className="w-6 h-6" />,
    tech: "Python // Pandas // Google Colab",
    description: "Developed and executed Python scripts utilizing machine learning classification models and the Whisper AI framework to process and transcribe audio datasets with high accuracy.",
    status: "Model Trained"
  },
  {
    id: "SYS-04",
    title: "OSINT & Digital Forensics",
    icon: <Activity className="w-6 h-6" />,
    tech: "CLI Database Queries // Decryption Tools",
    description: "Extracted location payloads and national insurance identifiers by decoding encrypted data across Mastodon and QR code evidence as part of advanced university coursework challenges.",
    status: "Trace Resolved"
  }
];

export default function SystemsPage() {
  return (
    <main className="relative w-full min-h-screen pb-32">
      <section className="relative z-10 w-full pt-40 pb-12 px-6 md:px-16 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-16 border-b border-butter/10 pb-8">
          <span className="font-mono text-accentRed tracking-[0.2em] uppercase text-xs mb-4 flex items-center gap-2">
            <Server className="w-4 h-4" /> /Directory/Systems
          </span>
          <h1 className="font-display text-5xl md:text-7xl font-black uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-butter to-butter/40">
            Network Architecture <br/> & Deployments
          </h1>
        </motion.div>

        <div className="flex flex-col gap-6">
          {systemProjects.map((project, idx) => (
            <motion.div 
              key={project.id} 
              initial={{ opacity: 0, x: -20 }} 
              whileInView={{ opacity: 1, x: 0 }} 
              viewport={{ once: true }} 
              transition={{ delay: idx * 0.1 }}
              className="group border border-butter/10 bg-black/40 p-6 md:p-8 hover:border-accentRed/50 transition-all flex flex-col md:flex-row gap-8 items-start md:items-center interactive"
            >
              <div className="shrink-0 w-16 h-16 bg-accentRed/10 border border-accentRed/30 flex items-center justify-center text-accentRed group-hover:bg-accentRed group-hover:text-marine transition-colors">
                {project.icon}
              </div>
              
              <div className="flex-1">
                <div className="flex flex-col md:flex-row md:justify-between md:items-baseline mb-2">
                  <h3 className="font-display text-2xl font-bold uppercase text-butter tracking-wide">{project.title}</h3>
                  <span className="font-mono text-[10px] text-accentRed tracking-widest mt-2 md:mt-0">[{project.id}]</span>
                </div>
                <p className="font-mono text-xs text-butter/60 uppercase tracking-widest mb-4 border-l-2 border-accentRed/50 pl-3">
                  {project.tech}
                </p>
                <p className="font-sans text-sm md:text-base text-butter/80 leading-relaxed max-w-3xl">
                  {project.description}
                </p>
              </div>

              <div className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-green-500 border border-green-500/30 bg-green-500/10 px-4 py-2 mt-4 md:mt-0 self-start md:self-center">
                {project.status}
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </main>
  );
}