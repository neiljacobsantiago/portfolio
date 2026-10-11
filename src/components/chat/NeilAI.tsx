"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { haptic } from "@/lib/haptics";
import { linksIn, localAnswer } from "@/lib/neil-faq";
import BlobAvatar from "./BlobAvatar";

interface ChatMessage {
  id: number;
  sender: "ai" | "user";
  text: string;
  links?: { label: string; href: string }[];
  /** Characters revealed so far (typewriter effect for AI replies). */
  shown?: number;
}

const WELCOME: ChatMessage[] = [
  { id: 1, sender: "ai", text: "Hi! I'm NeilAI 👋 — I know Neil's work inside out." },
  { id: 2, sender: "ai", text: "Ask me about PathoScan, his photography, booking a shoot, school, or what he does for fun." },
];

// Suggestions rotate after every answer, so there's always something to tap.
const SUGGESTIONS = [
  ["Who is Neil?", "What's PathoScan?", "How much is a photoshoot?"],
  ["What camera gear?", "Which concerts has he shot?", "Is he open for projects?"],
  ["What does he do for fun?", "Where does he study?", "What's the ITSC Media Group?"],
  ["Show me his web projects", "Can he cover my event?", "Network & security work?"],
];

const TYPE_MS = 14;

export default function NeilAI({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>(WELCOME);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [round, setRound] = useState(0);
  const nextId = useRef(WELCOME.length + 1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const typing = messages.some((m) => m.shown !== undefined && m.shown < m.text.length);

  // Typewriter: reveal the newest AI message a couple of characters per tick.
  useEffect(() => {
    if (!typing) return;
    const id = setInterval(() => {
      setMessages((prev) =>
        prev.map((m) => (m.shown !== undefined && m.shown < m.text.length ? { ...m, shown: Math.min(m.text.length, m.shown + 2) } : m)),
      );
    }, TYPE_MS);
    return () => clearInterval(id);
  }, [typing]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isTyping, open]);

  useEffect(() => {
    if (!open) return;
    if (matchMedia("(hover: hover) and (pointer: fine)").matches) inputRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const push = (msg: Omit<ChatMessage, "id">) => setMessages((prev) => [...prev, { ...msg, id: nextId.current++ }]);

  const finishTyping = () => setMessages((prev) => prev.map((m) => (m.shown !== undefined ? { ...m, shown: m.text.length } : m)));

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || isTyping) return;
    haptic(5);
    finishTyping();

    const history = messages.slice(-6).map((m) => ({ role: m.sender, text: m.text }));
    push({ sender: "user", text: message });
    setInput("");
    setIsTyping(true);

    let reply: { text: string; links?: { label: string; href: string }[] };
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history }),
      });
      const data = (await res.json()) as { reply?: string };
      // AI unavailable (no key, rate limit, outage) → answer from the offline brain.
      reply = res.ok && data.reply ? { text: data.reply, links: linksIn(data.reply) } : localAnswer(message);
    } catch {
      reply = localAnswer(message);
    }

    setIsTyping(false);
    push({ sender: "ai", text: reply.text, links: reply.links, shown: 0 });
    setRound((r) => r + 1);
  };

  const suggestions = SUGGESTIONS[round % SUGGESTIONS.length];

  return (
    <div
      id="neilai-panel"
      role="dialog"
      aria-label="Chat about Neil"
      inert={!open}
      aria-hidden={!open}
      data-open={open}
      data-lenis-prevent
      className="mb-3 flex h-[min(560px,calc(100dvh-7rem))] w-[calc(100vw-2rem)] max-w-sm origin-bottom-right flex-col overflow-hidden rounded-[22px] bg-paper shadow-[0_30px_80px_-20px_rgb(0_48_73/0.55)] ring-1 ring-ink/15 transition-[opacity,transform,visibility] duration-500 ease-[var(--ease-spring)] data-[open=false]:invisible data-[open=false]:translate-y-3 data-[open=false]:scale-90 data-[open=false]:opacity-0 data-[open=false]:duration-300 data-[open=false]:ease-[var(--ease-apple)]"
    >
      <div className="flex shrink-0 items-center justify-between gap-3 bg-ink px-4 py-3 text-paper">
        <div className="flex items-center gap-3">
          <BlobAvatar className="h-10 w-10" mood={isTyping ? "thinking" : "idle"} />
          <div>
            <p className="font-display text-xl leading-none">NeilAI</p>
            <p className="label mt-1 flex items-center gap-1.5 text-[0.58rem] text-sky">
              <span className="h-1.5 w-1.5 rounded-full bg-[#7bd88f]" /> {isTyping ? "thinking…" : "online · replies instantly"}
            </p>
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Close chat" className="press -mr-1 flex h-9 w-9 items-center justify-center rounded-full font-display text-2xl leading-none text-paper/70 hover:bg-paper/10 hover:text-paper">
          ×
        </button>
      </div>

      <div ref={scrollRef} onClick={finishTyping} className="thin-scrollbar flex-1 space-y-3 overflow-y-auto overscroll-contain p-4" aria-live="polite">
        {messages.map((msg) => {
          const text = msg.shown !== undefined ? msg.text.slice(0, msg.shown) : msg.text;
          const done = msg.shown === undefined || msg.shown >= msg.text.length;
          return (
            <div key={msg.id} className={`animate-pop-in flex flex-col ${msg.sender === "user" ? "origin-bottom-right items-end" : "origin-bottom-left items-start"}`}>
              <div
                className={`max-w-[85%] px-4 py-2.5 font-serif text-[1.02rem] leading-snug whitespace-pre-line ${
                  msg.sender === "user" ? "rounded-[20px] rounded-br-md bg-ember text-paper" : "rounded-[20px] rounded-bl-md bg-paper-deep text-ink"
                }`}
              >
                {text}
                {!done && <span className="animate-blink ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 bg-ink/60" />}
              </div>
              {done && msg.links && msg.links.length > 0 && (
                <div className="animate-pop-in mt-2 flex flex-wrap gap-1.5">
                  {msg.links.map((l) => (
                    <Link key={l.href} href={l.href} onClick={onClose} className="label press rounded-full bg-ink px-3 py-1.5 text-[0.6rem] text-paper hover:bg-ember">
                      {l.label} →
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {isTyping && (
          <div className="animate-pop-in flex origin-bottom-left justify-start" aria-label="NeilAI is typing">
            <div className="flex items-center gap-1.5 rounded-[20px] rounded-bl-md bg-paper-deep px-4 py-3.5">
              {[0, 150, 300].map((delay) => (
                <span key={delay} className="animate-bounce-dot h-1.5 w-1.5 rounded-full bg-ink/50" style={{ animationDelay: `${delay}ms` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {!isTyping && !typing && (
        <div key={round} className="no-scrollbar flex shrink-0 gap-2 overflow-x-auto px-4 pb-3">
          {suggestions.map((q, i) => (
            <button
              type="button"
              key={q}
              onClick={() => send(q)}
              className="animate-pop-in label press shrink-0 rounded-full border border-ink/20 px-3 py-2 text-[0.6rem] hover:border-ink hover:bg-ink hover:text-paper"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex shrink-0 items-center gap-2 border-t border-ink/10 p-3"
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything…"
          aria-label="Your question"
          maxLength={1000}
          enterKeyHint="send"
          className="h-11 min-w-0 flex-1 rounded-full bg-paper-deep/70 px-4 font-serif text-ink outline-none placeholder:text-ink/40 focus:ring-1 focus:ring-ember"
        />
        <button
          type="submit"
          disabled={isTyping || !input.trim()}
          aria-label="Send"
          className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ember text-lg text-paper hover:bg-ink disabled:opacity-40"
        >
          ↑
        </button>
      </form>
    </div>
  );
}
