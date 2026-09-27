"use client";

import { Server, Shield, Code, Camera } from "lucide-react";

export default function TechStackApp() {
  const stack = [
    { icon: <Server />, title: "Network Architecture", items: ["Topology Mapping", "Dynamic Routing (OSPF)", "Cisco Packet Tracer"] },
    { icon: <Shield />, title: "InfoSec & Assurance", items: ["Vulnerability Testing", "Kali Linux", "Cyber Protocols"] },
    { icon: <Code />, title: "Software Systems", items: ["Next.js Architecture", "MySQL Relational", "Python & C"] },
    { icon: <Camera />, title: "Media Production", items: ["Lightroom Classic", "Nikon/Canon", "Event Direction"] }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
      {stack.map((group, i) => (
        <div key={i} className="border border-butter/10 bg-black/20 p-6 flex flex-col hover:border-butter/30 transition-colors">
          <div className="flex items-center text-accentRed mb-4 space-x-3">
            {group.icon}
            <h3 className="font-display font-bold uppercase tracking-widest text-butter">{group.title}</h3>
          </div>
          <ul className="space-y-2">
            {group.items.map((item, idx) => (
              <li key={idx} className="font-mono text-sm opacity-80 before:content-['>'] before:text-accentRed before:mr-2">
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}