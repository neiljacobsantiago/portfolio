"use client";

import { useEffect, useRef, useState } from "react";
import { Send, X } from "lucide-react";

interface ChatMessage {
  id: number;
  sender: "ai" | "user";
  text: string;
}

const WELCOME: ChatMessage[] = [
  { id: 1, sender: "ai", text: "Hi there! 👋 Welcome to Neil's portfolio. I'm NeilAI." },
  { id: 2, sender: "ai", text: "I can answer questions about his rates, tech stack, or creative projects. What would you like to know?" },
];

const QUICK_QUESTIONS = ["Who are you?", "What are your rates?", "What is your tech stack?"];

export default function NeilAI({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>(WELCOME);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const nextId = useRef(WELCOME.length + 1);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isTyping, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const push = (sender: ChatMessage["sender"], text: string) =>
    setMessages((prev) => [...prev, { id: nextId.current++, sender, text }]);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || isTyping) return;

    const history = [...messages, { sender: "user" as const, text: message }]
      .slice(-7, -1)
      .map((m) => ({ role: m.sender, text: m.text }));

    push("user", message);
    setInput("");
    setIsTyping(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history }),
      });
      const data = (await res.json()) as { reply?: string };
      push("ai", data.reply || "Packet dropped. Try again.");
    } catch {
      push("ai", "Connection flatlined. Check your network and try again.");
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div
      id="neilai-panel"
      role="dialog"
      aria-label="NeilAI chat"
      hidden={!open}
      className="blur-panel mb-4 flex h-[min(500px,calc(100dvh-8rem))] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-3xl border border-butter/20 bg-marine/95 shadow-[0_10px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl"
    >
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-butter/10 bg-black/40 px-5">
        <div className="flex items-center gap-3">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-accentRed">
            <span className="font-display text-[10px] font-bold text-butter">AI</span>
            <span className="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full border border-marine bg-green-500" />
          </div>
          <span className="text-sm font-bold tracking-wide text-butter">NeilAI</span>
        </div>
        <button type="button" onClick={onClose} aria-label="Close chat" className="interactive -mr-2 p-2 text-butter/60 transition-colors hover:text-accentRed">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div ref={scrollRef} className="custom-scrollbar flex-1 space-y-4 overflow-y-auto overscroll-contain p-4" aria-live="polite">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] px-4 py-2.5 font-sans text-[13px] leading-relaxed whitespace-pre-line ${
                msg.sender === "user"
                  ? "rounded-2xl rounded-br-sm bg-accentRed text-butter"
                  : "rounded-2xl rounded-bl-sm border border-butter/10 bg-black/50 text-butter/90"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start" aria-label="NeilAI is typing">
            <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm border border-butter/10 bg-black/50 px-4 py-3">
              {[0, 150, 300].map((delay) => (
                <span key={delay} className="animate-bounce-dot h-1.5 w-1.5 rounded-full bg-butter/60" style={{ animationDelay: `${delay}ms` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {messages.length <= WELCOME.length && !isTyping && (
        <div className="flex shrink-0 flex-wrap gap-2 px-3 pb-2">
          {QUICK_QUESTIONS.map((q) => (
            <button
              type="button"
              key={q}
              onClick={() => send(q)}
              className="interactive rounded-full bg-butter px-3 py-1.5 text-[11px] font-bold text-marine transition-colors hover:bg-white"
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
        className="flex h-16 shrink-0 items-center gap-2 border-t border-butter/10 bg-marine/50 px-3"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message NeilAI..."
          aria-label="Message NeilAI"
          maxLength={1000}
          enterKeyHint="send"
          className="h-10 min-w-0 flex-1 rounded-full border border-butter/20 bg-black/40 px-4 text-butter outline-none placeholder:text-butter/30 focus:border-accentRed"
        />
        <button
          type="submit"
          disabled={isTyping || !input.trim()}
          aria-label="Send message"
          className="interactive flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accentRed text-butter transition-colors hover:bg-red-500 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
