"use client";

import { useState, useRef, useEffect } from "react";
import NavBar from "@/components/ui/NavBar";
import Footer from "@/components/ui/Footer";
import { Terminal as TermIcon } from "lucide-react";

interface CommandHistory { command: string; output: React.ReactNode; }

export default function TerminalPage() {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<CommandHistory[]>([
    { command: "sys_boot", output: "NEIL.OS v2.0 initialized. Type 'help' for available directives." }
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [history]);

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = input.trim().toLowerCase();
    if (!cmd) return;

    let output: React.ReactNode = "Command not recognized. Type 'help'.";

    switch (cmd) {
      case "help":
        output = (
          <ul className="space-y-1 opacity-80 pl-4 mt-2 border-l-2 border-accentRed/30">
            <li><span className="text-accentRed">whoami</span> - Identity metrics</li>
            <li><span className="text-accentRed">rates</span> - Freelance retainer data</li>
            <li><span className="text-accentRed">clear</span> - Purge terminal history</li>
          </ul>
        );
        break;
      case "whoami":
        output = "Neil Jacob Santiago. Production Director, IT Services Center. Network Infrastructure Engineering, CLSU.";
        break;
      case "rates":
        output = <span className="text-butter font-bold">Freelance retainer strictly starts at ₱15,000. Connection refused for lower bids.</span>;
        break;
      case "clear":
        setHistory([]);
        setInput("");
        return;
    }

    setHistory((prev) => [...prev, { command: cmd, output }]);
    setInput("");
  };

  return (
    <main className="relative w-full min-h-screen bg-marine text-butter font-sans selection:bg-accentRed flex flex-col">
      <NavBar />
      <section className="flex-1 w-full pt-32 px-6 md:px-16 max-w-7xl mx-auto flex flex-col">
        <div className="flex items-center gap-3 mb-8">
          <TermIcon className="w-8 h-8 text-accentRed" />
          <h1 className="font-display text-4xl font-black uppercase tracking-tight">Root Terminal</h1>
        </div>
        <div className="flex-1 bg-black/60 border border-butter/20 p-6 font-mono text-sm shadow-[0_0_30px_rgba(0,0,0,0.5)] overflow-y-auto custom-scrollbar flex flex-col h-[60vh] cursor-text" onClick={() => document.getElementById("cli-input")?.focus()}>
          {history.map((h, i) => (
            <div key={i} className="mb-4">
              <div className="text-accentRed">root@neilos:~$ <span className="text-butter">{h.command}</span></div>
              <div className="mt-1 text-butter/80">{h.output}</div>
            </div>
          ))}
          <form onSubmit={handleCommand} className="flex items-center text-accentRed">
            <span>root@neilos:~$</span>
            <input id="cli-input" type="text" value={input} onChange={(e) => setInput(e.target.value)} className="flex-1 bg-transparent border-none outline-none text-butter ml-2" autoFocus autoComplete="off" spellCheck="false" />
          </form>
          <div ref={bottomRef} />
        </div>
      </section>
      <Footer />
    </main>
  );
}