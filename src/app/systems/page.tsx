import type { Metadata } from "next";
import { Activity, Network, Server, Shield, Terminal } from "lucide-react";
import PageHeader, { PageShell } from "@/components/layout/PageHeader";
import { reveal } from "@/lib/reveal";

export const metadata: Metadata = {
  title: "Systems",
  description: "Network architecture, security auditing and machine-learning deployments by Neil Jacob Santiago.",
};

const systemProjects = [
  {
    id: "SYS-01",
    title: "CLIRDEC Network Architecture",
    icon: <Network className="h-6 w-6" />,
    tech: "Cisco Packet Tracer // VLANs // RIP Protocol",
    description:
      "Engineered comprehensive physical and logical network topologies for the CLIRDEC facility at CLSU. Designed inter-VLAN routing, static routes, and compiled a complete hardware Bill of Materials calculated in ₱ for procurement.",
    status: "Deployed // Stable",
  },
  {
    id: "SYS-02",
    title: "Vulnerability & Intrusion Auditing",
    icon: <Shield className="h-6 w-6" />,
    tech: "Kali Linux // Nmap // Snort // Metasploit",
    description:
      "Configured isolated dual-boot Linux environments to execute network vulnerability scans. Implemented custom Snort intrusion detection rules to monitor packet traffic and defend against simulated active payloads.",
    status: "Audit Complete",
  },
  {
    id: "SYS-03",
    title: "Whisper AI Audio Transcription",
    icon: <Terminal className="h-6 w-6" />,
    tech: "Python // Pandas // Google Colab",
    description:
      "Developed and executed Python scripts utilizing machine learning classification models and the Whisper AI framework to process and transcribe audio datasets with high accuracy.",
    status: "Model Trained",
  },
  {
    id: "SYS-04",
    title: "OSINT & Digital Forensics",
    icon: <Activity className="h-6 w-6" />,
    tech: "CLI Database Queries // Decryption Tools",
    description:
      "Extracted location payloads and national insurance identifiers by decoding encrypted data across Mastodon and QR code evidence as part of advanced university coursework challenges.",
    status: "Trace Resolved",
  },
];

export default function SystemsPage() {
  return (
    <PageShell>
      <PageHeader section="Systems" icon={<Server />} title={<>Network Architecture <br /> & Deployments</>} />

      <ol className="flex flex-col gap-6">
        {systemProjects.map((project, idx) => (
          <li
            key={project.id}
            {...reveal("left", idx * 80)}
            className="group interactive flex flex-col items-start gap-6 border border-butter/10 bg-black/40 p-5 transition-colors hover:border-accentRed/50 sm:p-6 md:flex-row md:items-center md:gap-8 md:p-8"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center border border-accentRed/30 bg-accentRed/10 text-accentRed transition-colors group-hover:bg-accentRed group-hover:text-marine md:h-16 md:w-16">
              {project.icon}
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-col md:flex-row md:items-baseline md:justify-between">
                <h2 className="font-display text-xl font-bold tracking-wide text-butter uppercase sm:text-2xl">{project.title}</h2>
                <span className="mt-1 font-mono text-[10px] tracking-widest text-accentRed md:mt-0">[{project.id}]</span>
              </div>
              <p className="mb-4 border-l-2 border-accentRed/50 pl-3 font-mono text-xs tracking-widest text-butter/60 uppercase">{project.tech}</p>
              <p className="max-w-3xl font-sans text-sm leading-relaxed text-butter/80 md:text-base">{project.description}</p>
            </div>

            <div className="shrink-0 self-start border border-green-500/30 bg-green-500/10 px-4 py-2 font-mono text-[10px] tracking-widest text-green-500 uppercase md:self-center">
              {project.status}
            </div>
          </li>
        ))}
      </ol>
    </PageShell>
  );
}
