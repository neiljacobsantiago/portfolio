"use client";

import { ArrowUpRight, Terminal } from "lucide-react";

// Highly scalable data structure. Add new projects here without breaking UI.
const systemsData = [
  { id: "01", client: "COMSCI 1201", name: "ParkMate", scope: "Smart Parking Algorithm" },
  { id: "02", client: "INTECH 2201", name: "BuildIT", scope: "C-Language Hardware Config" },
  { id: "03", client: "ACCT 1001", name: "BankoSantiago", scope: "Financial Database Prototype" },
  { id: "04", client: "COMSCI 2110", name: "WorkTayo", scope: "MySQL Relational Matchmaking" },
  { id: "05", client: "Independent", name: "Memory Allocation", scope: "Core Processing CLI" }
];

export default function SystemsPage() {
  return (
    <main className="w-full min-h-screen flex flex-col px-6 md:px-12 max-w-[1600px] mx-auto py-12">
      
      <header className="mb-20 flex items-center space-x-6">
        <Terminal className="w-12 h-12 text-accentRed" />
        <div>
          <h1 className="font-display text-5xl md:text-6xl font-black uppercase tracking-tight">Systems Log</h1>
          <p className="font-mono text-sm tracking-widest uppercase opacity-60 mt-2">Network Infrastructure & UI/UX Deployments</p>
        </div>
      </header>

      {/* Structured Editorial Table */}
      <div className="w-full border-t border-b border-butter/20">
        {/* Table Header */}
        <div className="hidden md:grid grid-cols-12 gap-4 py-4 border-b border-butter/20 font-mono text-xs uppercase tracking-widest opacity-60">
          <div className="col-span-1">ID</div>
          <div className="col-span-3">Target / Client</div>
          <div className="col-span-4">Project Nomenclature</div>
          <div className="col-span-4">Technical Scope</div>
        </div>

        {/* Dynamic Data Rows */}
        {systemsData.map((project) => (
          <div 
            key={project.id} 
            className="group interactive grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 py-8 md:py-10 border-b border-butter/10 last:border-b-0 hover:bg-butter/5 transition-colors duration-300"
          >
            <div className="md:col-span-1 font-mono text-sm opacity-50 group-hover:text-accentRed transition-colors">
              {project.id}
            </div>
            
            <div className="md:col-span-3 font-sans text-lg opacity-80 pt-1 md:pt-0">
              {project.client}
            </div>
            
            <div className="md:col-span-4 font-display text-3xl md:text-4xl font-bold uppercase group-hover:text-butter transition-colors flex items-center">
              {project.name}
            </div>
            
            <div className="md:col-span-4 font-sans text-lg opacity-80 flex justify-between items-center pt-2 md:pt-0">
              <span>{project.scope}</span>
              <ArrowUpRight className="w-6 h-6 text-accentRed opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
            </div>
          </div>
        ))}
      </div>

    </main>
  );
}