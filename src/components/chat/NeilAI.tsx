"use client";

import { useEffect, useRef, useState } from "react";

interface ChatMessage {
  id: number;
  sender: "ai" | "user";
  text: string;
}

const WELCOME: ChatMessage[] = [
  { id: 1, sender: "ai", text: "Hi! I'm NeilAI — I know Neil's work inside out." },
  { id: 2, sender: "ai", text: "Ask me about his photography, his projects (like the PhilMech pathogen classifier), school, rates, or how to work with him." },
];

const QUICK_QUESTIONS = ["Who is Neil?", "Can he shoot my event?", "What are his rates?"];

export default function NeilAI({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>(WELCOME);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const nextId = useRef(WELCOME.length + 1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Focus the input when the panel opens (keyboard users and desktop).
  useEffect(() => {
    if (open && matchMedia("(hover: hover) and (pointer: fine)").matches) inputRef.current?.focus({ preventScroll: true });
  }, [open]);

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
      aria-label="Chat about Neil"
      inert={!open}
      aria-hidden={!open}
      data-open={open}
      data-lenis-prevent
      className="mb-3 flex h-[min(520px,calc(100dvh-7rem))] w-[calc(100vw-2rem)] max-w-sm origin-bottom-right flex-col overflow-hidden rounded-[18px] bg-paper shadow-[0_30px_80px_-20px_rgb(0_48_73/0.55)] ring-1 ring-ink/15 transition-[opacity,transform,visibility] duration-500 ease-[var(--ease-spring)] data-[open=false]:invisible data-[open=false]:translate-y-3 data-[open=false]:scale-90 data-[open=false]:opacity-0 data-[open=false]:duration-300 data-[open=false]:ease-[var(--ease-apple)]"
    >
      <div className="flex shrink-0 items-center justify-between bg-ink px-5 py-4 text-paper">
        <div>
          <p className="font-display text-xl leading-none">Ask about Neil</p>
          <p className="label mt-1 text-[0.6rem] text-sky">An AI that knows his work</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close chat" className="-mr-2 p-2 font-display text-2xl leading-none text-paper/70 hover:text-paper">
          ×
        </button>
      </div>

      <div ref={scrollRef} className="thin-scrollbar flex-1 space-y-3 overflow-y-auto overscroll-contain p-4" aria-live="polite">
        {messages.map((msg) => (
          <div key={msg.id} className={`animate-pop-in flex ${msg.sender === "user" ? "justify-end origin-bottom-right" : "justify-start origin-bottom-left"}`}>
            <div
              className={`max-w-[85%] px-4 py-2.5 font-serif text-[1.02rem] leading-snug whitespace-pre-line ${
                msg.sender === "user" ? "rounded-2xl rounded-br-sm bg-ember text-paper" : "rounded-2xl rounded-bl-sm bg-paper-deep text-ink"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start" aria-label="Typing">
            <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-paper-deep px-4 py-3">
              {[0, 150, 300].map((delay) => (
                <span key={delay} className="animate-bounce-dot h-1.5 w-1.5 rounded-full bg-ink/50" style={{ animationDelay: `${delay}ms` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {messages.length <= WELCOME.length && !isTyping && (
        <div className="flex shrink-0 flex-wrap gap-2 px-4 pb-3">
          {QUICK_QUESTIONS.map((q) => (
            <button
              type="button"
              key={q}
              onClick={() => send(q)}
              className="label press rounded-full border border-ink/20 px-3 py-2 text-[0.62rem] hover:border-ink hover:bg-ink hover:text-paper"
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
          className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ember text-paper hover:bg-ink disabled:opacity-40"
        >
          ↑
        </button>
      </form>
    </div>
  );
}
