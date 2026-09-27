"use client";

import { useState, useRef, useEffect } from "react";

export default function TerminalApp() {
  const [history, setHistory] = useState([
    { type: "system", text: "NeilOS Kernel v2.4.1 initialized." },
    { type: "system", text: "Type 'help' for a list of available commands." }
  ]);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => endRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(scrollToBottom, [history]);

  const handleCommand = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && input.trim()) {
      const cmd = input.trim().toLowerCase();
      const newHistory = [...history, { type: "input", text: `guest@neil-os:~$ ${cmd}` }];
      
      switch (cmd) {
        case "help":
          newHistory.push({ type: "output", text: "Available commands: whoami, skills, contact, clear" });
          break;
        case "whoami":
          newHistory.push({ type: "output", text: "Neil Jacob Santiago. Production Director & Network Systems Engineer." });
          break;
        case "skills":
          newHistory.push({ type: "output", text: "Infrastructure Auditing, OSPF/RIP Routing, InfoSec, Next.js, Multimedia Direction." });
          break;
        case "contact":
          newHistory.push({ type: "output", text: "Location: San Jose City, Philippines. Retainer: ₱15,000." });
          break;
        case "clear":
          setHistory([]);
          setInput("");
          return;
        default:
          newHistory.push({ type: "error", text: `Command not found: ${cmd}` });
      }
      
      setHistory(newHistory);
      setInput("");
    }
  };

  return (
    <div className="w-full h-full bg-black/90 font-mono text-sm p-4 text-butter">
      {history.map((line, i) => (
        <div key={i} className={`mb-2 ${line.type === "error" ? "text-accentRed" : "text-butter/80"}`}>
          {line.text}
        </div>
      ))}
      <div className="flex items-center">
        <span className="text-accentRed mr-2">guest@neil-os:~$</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleCommand}
          className="flex-1 bg-transparent outline-none text-butter"
          autoFocus
        />
      </div>
      <div ref={endRef} />
    </div>
  );
}