export interface Project {
  slug: string;
  index: string;
  title: string;
  /** One line a non-technical visitor can follow. */
  plain: string;
  description: string;
  tools: string[];
  outcome: string;
}

export const projects: Project[] = [
  {
    slug: "clirdec-network",
    index: "01",
    title: "CLIRDEC Network Architecture",
    plain: "Planned how an entire research facility's computers talk to each other — and what it would cost.",
    description:
      "Physical and logical topologies for the CLIRDEC facility at CLSU: inter-VLAN routing, static routes and RIP, plus a complete hardware bill of materials priced in pesos for procurement.",
    tools: ["Cisco Packet Tracer", "VLANs", "RIP", "Static routing"],
    outcome: "Deployed & stable",
  },
  {
    slug: "intrusion-auditing",
    index: "02",
    title: "Vulnerability & Intrusion Auditing",
    plain: "Played the attacker on purpose, so the defences could be tested and tightened.",
    description:
      "Isolated dual-boot Linux labs for network vulnerability scans, with custom Snort intrusion-detection rules watching packet traffic and stopping simulated attack payloads.",
    tools: ["Kali Linux", "Nmap", "Snort", "Metasploit"],
    outcome: "Audit complete",
  },
  {
    slug: "whisper-transcription",
    index: "03",
    title: "Whisper AI Transcription",
    plain: "Taught a machine to turn hours of recorded speech into accurate text.",
    description:
      "Python pipelines combining classification models with the Whisper speech framework to process and transcribe audio datasets with high accuracy.",
    tools: ["Python", "Pandas", "Whisper", "Google Colab"],
    outcome: "Model trained",
  },
  {
    slug: "osint-forensics",
    index: "04",
    title: "OSINT & Digital Forensics",
    plain: "Followed digital breadcrumbs — QR codes, social posts, ciphers — to solve the case.",
    description:
      "Recovered location payloads and identifiers by decoding encrypted data across Mastodon posts and QR-code evidence in advanced coursework challenges.",
    tools: ["CLI queries", "Decryption tools", "Open-source intel"],
    outcome: "Trace resolved",
  },
];
