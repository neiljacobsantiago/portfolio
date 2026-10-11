"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { allRoutes, site, socials } from "@/lib/site";

interface Entry {
  id: number;
  command: string;
  output: ReactNode;
}

const COMMANDS: { name: string; desc: string }[] = [
  { name: "help", desc: "List available directives" },
  { name: "whoami", desc: "Identity metrics" },
  { name: "skills", desc: "Capability matrix" },
  { name: "rates", desc: "Freelance retainer data" },
  { name: "ls", desc: "List site directories" },
  { name: "cd <dir>", desc: "Navigate, e.g. cd systems" },
  { name: "socials", desc: "External endpoints" },
  { name: "contact", desc: "Open a secure channel" },
  { name: "clear", desc: "Purge terminal history" },
];

const routeFor = (arg: string) => {
  const target = arg.replace(/^[~./]+/, "").toLowerCase();
  if (!target || target === "root" || target === "home") return "/";
  return allRoutes.find((r) => r.href.slice(1) === target || r.label.toLowerCase() === target)?.href;
};

export default function Terminal() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [entries, setEntries] = useState<Entry[]>([
    { id: 0, command: "sys_boot", output: "NEIL.OS v2.4 initialized. Type 'help' for available directives." },
  ]);
  const [recall, setRecall] = useState<string[]>([]);
  const [recallIndex, setRecallIndex] = useState(-1);
  const nextId = useRef(1);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries]);

  // Autofocus only with a physical keyboard; on phones it would pop the keyboard over the page.
  useEffect(() => {
    if (matchMedia("(hover: hover) and (pointer: fine)").matches) inputRef.current?.focus({ preventScroll: true });
  }, []);

  const run = (raw: string): ReactNode | null => {
    const [cmd, ...args] = raw.split(/\s+/);
    const arg = args.join(" ");
    switch (cmd) {
      case "help":
        return (
          <ul className="mt-2 space-y-1 border-l-2 border-accentRed/30 pl-4 opacity-80">
            {COMMANDS.map((c) => (
              <li key={c.name}>
                <span className="text-accentRed">{c.name}</span> — {c.desc}
              </li>
            ))}
          </ul>
        );
      case "whoami":
        return `${site.name}. Production Director, IT Services Center. Network Systems & Infrastructure Engineering, CLSU.`;
      case "skills":
        return "Infrastructure auditing, OSPF/RIP routing, InfoSec (Kali, Nmap, Snort), Next.js, Python, multimedia direction.";
      case "rates":
        return <span className="font-bold text-butter">Freelance retainer starts at {site.rate}. Connection refused for lower bids.</span>;
      case "ls":
        return (
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            {allRoutes.filter((r) => r.href !== "/").map((r) => (
              <Link key={r.href} href={r.href} className="interactive text-accentRed underline-offset-4 hover:underline">
                {r.href.slice(1)}/
              </Link>
            ))}
          </div>
        );
      case "cd":
      case "open": {
        const href = routeFor(arg);
        if (!href) return `cd: ${arg || "(none)"}: No such directory. Try 'ls'.`;
        router.push(href);
        return `Routing to ${href} ...`;
      }
      case "socials":
        return (
          <ul className="space-y-1">
            {socials.map((s) => (
              <li key={s.name}>
                {s.name}:{" "}
                {s.url ? (
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="interactive text-accentRed hover:underline">{s.url}</a>
                ) : (
                  <span className="opacity-50">pending</span>
                )}
              </li>
            ))}
          </ul>
        );
      case "contact":
        router.push("/contact");
        return `Location: ${site.location}. Opening secure channel ...`;
      case "sudo":
        return <span className="text-accentRed">Permission denied. This incident will be reported.</span>;
      case "clear":
        return null;
      default:
        return <span className="text-accentRed">Command not recognized: {cmd}. Type &apos;help&apos;.</span>;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const command = input.trim().toLowerCase();
    if (!command) return;
    setInput("");
    setRecall((prev) => [...prev, command]);
    setRecallIndex(-1);

    const output = run(command);
    if (output === null) {
      setEntries([]);
      return;
    }
    setEntries((prev) => [...prev, { id: nextId.current++, command, output }]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();
    if (!recall.length) return;
    const index =
      e.key === "ArrowUp"
        ? recallIndex === -1 ? recall.length - 1 : Math.max(0, recallIndex - 1)
        : recallIndex === -1 ? -1 : recallIndex + 1 >= recall.length ? -1 : recallIndex + 1;
    setRecallIndex(index);
    setInput(index === -1 ? "" : recall[index]);
  };

  return (
    <div
      ref={scrollRef}
      onClick={() => {
        if (!getSelection()?.toString()) inputRef.current?.focus({ preventScroll: true });
      }}
      className="custom-scrollbar flex h-[60dvh] min-h-80 cursor-text flex-col overflow-y-auto overscroll-contain border border-butter/20 bg-black/60 p-4 font-mono text-sm shadow-[0_0_30px_rgba(0,0,0,0.5)] sm:p-6"
    >
      {entries.map((entry) => (
        <div key={entry.id} className="mb-4 break-words">
          <div className="text-accentRed">
            root@neilos:~$ <span className="text-butter">{entry.command}</span>
          </div>
          <div className="mt-1 text-butter/80">{entry.output}</div>
        </div>
      ))}
      <form onSubmit={handleSubmit} className="flex items-center text-accentRed">
        <label htmlFor="cli-input" className="shrink-0">root@neilos:~$</label>
        <input
          ref={inputRef}
          id="cli-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
          className="ml-2 min-w-0 flex-1 border-none bg-transparent text-butter outline-none"
        />
      </form>
    </div>
  );
}
