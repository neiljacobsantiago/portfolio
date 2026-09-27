"use client";

import { useState, useEffect } from "react";
import { Terminal, Database, Image as ImageIcon, User, Wifi, Battery, Command } from "lucide-react";
import NetworkBackground from "@/components/ui/NetworkBackground";
import Window from "@/components/os/Window";
import TerminalApp from "@/components/os/apps/TerminalApp";
import TechStackApp from "@/components/os/apps/TechStackApp";
import NeilAI from "@/components/os/NeilAI";

export default function NeilOSDesktop() {
  // --- OS TIME SYNCHRONIZATION ---
  const [time, setTime] = useState<string>("00:00");
  
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // --- WINDOW STATE MANAGEMENT ---
  const [windows, setWindows] = useState({
    about: { isOpen: true, zIndex: 10 },
    stack: { isOpen: false, zIndex: 20 },
    terminal: { isOpen: false, zIndex: 30 },
    gallery: { isOpen: false, zIndex: 40 }
  });

  const [highestZ, setHighestZ] = useState(40);

  const toggleWindow = (key: keyof typeof windows) => {
    setWindows(prev => {
      const isCurrentlyOpen = prev[key].isOpen;
      return {
        ...prev,
        [key]: { isOpen: !isCurrentlyOpen, zIndex: highestZ + 1 }
      };
    });
    setHighestZ(prev => prev + 1);
  };

  const focusWindow = (key: keyof typeof windows) => {
    setWindows(prev => ({
      ...prev,
      [key]: { ...prev[key], zIndex: highestZ + 1 }
    }));
    setHighestZ(prev => prev + 1);
  };

  // --- GALLERY DATA ---
  const galleryProjects = [
    { id: "01", name: "Aurora Fest 2026", type: "Live Stage Coverage" },
    { id: "02", name: "ParkMate", type: "Smart Parking Architecture" },
    { id: "03", name: "Cyber Awareness", type: "Data Privacy Campaign" },
    { id: "04", name: "BankoSantiago", type: "Banking UI Prototype" }
  ];

  return (
    <main className="relative w-full h-screen overflow-hidden text-butter font-sans selection:bg-accentRed selection:text-marine">
      
      {/* GPU-ACCELERATED TOPOLOGY BACKGROUND */}
      <NetworkBackground />
      
      {/* OS TOP STATUS BAR */}
      <div className="absolute top-0 left-0 w-full h-8 bg-marine/90 backdrop-blur-md border-b border-butter/20 z-[100] flex justify-between items-center px-4 font-mono text-[10px] md:text-xs uppercase tracking-widest text-butter shadow-md">
        <div className="flex items-center space-x-6">
          <span className="font-bold text-accentRed flex items-center space-x-2">
            <Command className="w-3 h-3" />
            <span>NeilOS</span>
          </span>
          <span className="hidden md:inline opacity-80 hover:text-butter cursor-pointer transition-colors">File</span>
          <span className="hidden md:inline opacity-80 hover:text-butter cursor-pointer transition-colors">Edit</span>
          <span className="hidden md:inline opacity-80 hover:text-butter cursor-pointer transition-colors">Terminal</span>
        </div>
        <div className="flex items-center space-x-4 opacity-80">
          <span className="hidden md:inline">Loc: San Jose City, PH</span>
          <Wifi className="w-3 h-3 hidden sm:block" />
          <Battery className="w-4 h-4 hidden sm:block" />
          <span className="font-bold">{time}</span>
        </div>
      </div>

      {/* DESKTOP WORKSPACE / WINDOW RENDERER */}
      <div className="absolute inset-0 z-10 pt-10 p-4 md:p-8">
        
        {/* WINDOW 1: ABOUT ME */}
        <Window
          id="about"
          title="SYS_ADMIN_PROFILE.EXE"
          isOpen={windows.about.isOpen}
          isActive={windows.about.zIndex === highestZ}
          zIndex={windows.about.zIndex}
          onClose={() => toggleWindow("about")}
          onFocus={() => focusWindow("about")}
          defaultSize={{ w: 850, h: 500 }}
          defaultPos={{ x: 40, y: 40 }}
        >
          <div className="flex flex-col md:flex-row gap-8 h-full">
            <div className="w-full md:w-1/3 bg-black/40 border border-butter/20 flex flex-col items-center justify-center p-6 text-center group">
              <div className="w-32 h-32 rounded-full border border-accentRed bg-marine mb-6 flex items-center justify-center overflow-hidden relative">
                <div className="absolute inset-0 bg-accentRed/10 group-hover:bg-accentRed/20 transition-colors" />
                <User className="w-12 h-12 opacity-50" />
              </div>
              <h2 className="font-display text-3xl font-black uppercase text-butter tracking-tight">Neil Jacob</h2>
              <h2 className="font-display text-3xl font-black uppercase text-accentRed tracking-tight -mt-2 mb-4">Santiago</h2>
              <p className="font-mono text-xs opacity-70 border-t border-butter/20 pt-4 w-full">Network Engineering Major</p>
            </div>
            
            <div className="w-full md:w-2/3 flex flex-col justify-center">
              <span className="font-mono text-sm tracking-widest uppercase text-accentRed mb-2 block">Operator Bio</span>
              <h3 className="font-display text-3xl md:text-4xl font-bold uppercase mb-6 leading-tight">Structural Logic. <br/> Editorial Vision.</h3>
              <p className="font-sans opacity-80 mb-6 leading-relaxed">
                I am an IT student majoring in Network Systems and Infrastructure Engineering, with a heavy emphasis on Information Security and Assurance. I balance the uncompromising logic of dynamic routing and vulnerability auditing with the fluid dynamics of multimedia direction.
              </p>
              <p className="font-sans opacity-80 leading-relaxed border-l-2 border-accentRed pl-4">
                Operating at the intersection of rigid server architectures and high-end creative telemetry.
              </p>
            </div>
          </div>
        </Window>

        {/* WINDOW 2: TECH STACK */}
        <Window
          id="stack"
          title="INFRASTRUCTURE_STACK.EXE"
          isOpen={windows.stack.isOpen}
          isActive={windows.stack.zIndex === highestZ}
          zIndex={windows.stack.zIndex}
          onClose={() => toggleWindow("stack")}
          onFocus={() => focusWindow("stack")}
          defaultSize={{ w: 900, h: 600 }}
          defaultPos={{ x: 80, y: 80 }}
        >
          <TechStackApp />
        </Window>

        {/* WINDOW 3: MEDIA GALLERY */}
        <Window
          id="gallery"
          title="MEDIA_ROUTING_DIR"
          isOpen={windows.gallery.isOpen}
          isActive={windows.gallery.zIndex === highestZ}
          zIndex={windows.gallery.zIndex}
          onClose={() => toggleWindow("gallery")}
          onFocus={() => focusWindow("gallery")}
          defaultSize={{ w: 950, h: 650 }}
          defaultPos={{ x: 120, y: 120 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
            {galleryProjects.map((proj) => (
              <div key={proj.id} className="border border-butter/20 bg-black/40 p-4 group cursor-none hover:border-butter/50 transition-colors">
                <div className="aspect-video bg-marine border border-butter/10 flex items-center justify-center mb-4 overflow-hidden relative">
                  <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,250,138,0.05)_10px,rgba(255,250,138,0.05)_20px)] opacity-50 group-hover:scale-110 transition-transform duration-700" />
                  <ImageIcon className="w-8 h-8 opacity-30 text-butter group-hover:opacity-100 group-hover:text-accentRed transition-all duration-500" />
                </div>
                <h3 className="font-display text-xl font-bold uppercase text-butter group-hover:text-accentRed transition-colors">{proj.name}</h3>
                <p className="font-mono text-xs opacity-70 mt-1 uppercase tracking-widest">{proj.type}</p>
              </div>
            ))}
          </div>
        </Window>

        {/* WINDOW 4: TERMINAL */}
        <Window
          id="terminal"
          title="NEIL-OS_TERMINAL"
          isOpen={windows.terminal.isOpen}
          isActive={windows.terminal.zIndex === highestZ}
          zIndex={windows.terminal.zIndex}
          onClose={() => toggleWindow("terminal")}
          onFocus={() => focusWindow("terminal")}
          defaultSize={{ w: 700, h: 450 }}
          defaultPos={{ x: 160, y: 160 }}
        >
          <TerminalApp />
        </Window>
        
      </div>

      {/* NEIL AI CHAT WIDGET */}
      <NeilAI />

      {/* OS DOCK */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[90] flex items-center space-x-2 md:space-x-4 bg-marine/80 backdrop-blur-xl border border-butter/20 px-6 py-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        
        <button onClick={() => toggleWindow("about")} className="group relative flex flex-col items-center mx-2">
          <div className="w-14 h-14 flex items-center justify-center bg-black/60 border border-butter/20 rounded-2xl group-hover:bg-butter/10 transition-all group-hover:-translate-y-3 group-hover:border-butter/50 group-hover:shadow-[0_10px_20px_rgba(255,250,138,0.1)]">
            <User className="w-6 h-6 text-butter group-hover:text-accentRed transition-colors" />
          </div>
          {windows.about.isOpen && <span className="absolute -bottom-3 w-1 h-1 rounded-full bg-butter shadow-[0_0_5px_#FFFA8A]" />}
        </button>

        <button onClick={() => toggleWindow("stack")} className="group relative flex flex-col items-center mx-2">
          <div className="w-14 h-14 flex items-center justify-center bg-black/60 border border-butter/20 rounded-2xl group-hover:bg-butter/10 transition-all group-hover:-translate-y-3 group-hover:border-butter/50 group-hover:shadow-[0_10px_20px_rgba(255,250,138,0.1)]">
            <Database className="w-6 h-6 text-butter group-hover:text-accentRed transition-colors" />
          </div>
          {windows.stack.isOpen && <span className="absolute -bottom-3 w-1 h-1 rounded-full bg-butter shadow-[0_0_5px_#FFFA8A]" />}
        </button>

        <button onClick={() => toggleWindow("gallery")} className="group relative flex flex-col items-center mx-2">
          <div className="w-14 h-14 flex items-center justify-center bg-black/60 border border-butter/20 rounded-2xl group-hover:bg-butter/10 transition-all group-hover:-translate-y-3 group-hover:border-butter/50 group-hover:shadow-[0_10px_20px_rgba(255,250,138,0.1)]">
            <ImageIcon className="w-6 h-6 text-butter group-hover:text-accentRed transition-colors" />
          </div>
          {windows.gallery.isOpen && <span className="absolute -bottom-3 w-1 h-1 rounded-full bg-butter shadow-[0_0_5px_#FFFA8A]" />}
        </button>

        <div className="w-px h-10 bg-butter/20 mx-2" /> {/* Dock Divider */}

        <button onClick={() => toggleWindow("terminal")} className="group relative flex flex-col items-center mx-2">
          <div className="w-14 h-14 flex items-center justify-center bg-black/60 border border-butter/20 rounded-2xl group-hover:bg-butter/10 transition-all group-hover:-translate-y-3 group-hover:border-butter/50 group-hover:shadow-[0_10px_20px_rgba(255,250,138,0.1)]">
            <Terminal className="w-6 h-6 text-butter group-hover:text-accentRed transition-colors" />
          </div>
          {windows.terminal.isOpen && <span className="absolute -bottom-3 w-1 h-1 rounded-full bg-butter shadow-[0_0_5px_#FFFA8A]" />}
        </button>

      </div>
    </main>
  );
}