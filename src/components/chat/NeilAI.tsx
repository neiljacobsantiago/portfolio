"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { haptic } from "@/lib/haptics";
import { linksIn, localAnswer } from "@/lib/neil-faq";
import { introFor } from "@/lib/neilai/intents";
import { ASK_EVENT, takeAsk, type AskDetail } from "@/lib/neilai-events";
import { starterCard, tools, type ChatCard } from "@/lib/tools";
import BlobAvatar from "./BlobAvatar";
import ChatCards from "./ChatCards";

interface ChatMessage {
  id: number;
  sender: "ai" | "user";
  text: string;
  links?: { label: string; href: string }[];
  /** Live widgets shown under an AI reply. */
  cards?: ChatCard[];
  /** Characters revealed so far (typewriter effect for AI replies). */
  shown?: number;
}

const WELCOME: ChatMessage[] = [
  { id: 1, sender: "ai", text: "Hi! I'm NeilAI 👋 — I know Neil's work inside out, and I can run his project tools right here." },
  { id: 2, sender: "ai", text: "Ask about PathoScan, his photos or a shoot quote — or tap 🧰 to plan a subnet, check a sketchy link and more." },
];

// Suggestions rotate after every answer, so there's always something to tap.
const SUGGESTIONS = [
  ["Who is Neil?", "Quote a grad shoot for 4", "Show his GitHub activity"],
  ["Is gcash-verify-account.xyz safe?", "What's PathoScan?", "Show the concert shots"],
  ["Plan VLANs for 50, 20, 10 hosts from 192.168.10.0/24", "Which concerts has he shot?", "What camera gear?"],
  ["Best fit vs worst fit memory", "Show me his web projects", "Can he cover my event?"],
];

/** The first suggestions match the page the visitor is on. */
function suggestionsFor(path: string, round: number) {
  if (round === 0) {
    if (path.startsWith("/work/pathoscan")) return ["How does PathoScan decide?", "Is 87% A. niger cleared?", "Who was on the team?"];
    if (path.startsWith("/work/")) return ["Explain this project simply", "What was Neil's role here?", "Show similar projects"];
    if (path.startsWith("/lab")) return ["Subnet 192.168.1.0/26", "Is bit.ly/3promo safe?", "Best fit vs worst fit memory"];
    if (path.startsWith("/photography")) return ["Show the concert shots", "How much is a grad shoot?", "What camera gear?"];
    if (path.startsWith("/about")) return ["Where does he study?", "What's the ITSC Media Group?", "What does he do for fun?"];
    if (path.startsWith("/contact")) return ["How much is a studio shoot?", "How fast does he reply?", "Is he open for projects?"];
  }
  return SUGGESTIONS[round % SUGGESTIONS.length];
}

const TOOL_ICONS: Record<string, string> = { pathoscan: "🔬", subnet: "🌐", memory: "🧠", link: "🛡️", quote: "📸" };
const STORE = "neilai-chat-v2";
const TYPE_MS = 14;

function restore(): { messages: ChatMessage[]; round: number } | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORE) ?? "null") as { messages: ChatMessage[]; round: number } | null;
    return saved?.messages?.length ? saved : null;
  } catch {
    return null;
  }
}

export default function NeilAI({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const [saved] = useState(restore);
  const [messages, setMessages] = useState<ChatMessage[]>(saved?.messages ?? WELCOME);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [round, setRound] = useState(saved?.round ?? 0);
  const [drawer, setDrawer] = useState(false);
  const nextId = useRef(Math.max(0, ...(saved?.messages ?? WELCOME).map((m) => m.id)) + 1);
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

  // Keep the conversation for this browser tab, so a refresh doesn't wipe it.
  useEffect(() => {
    try {
      sessionStorage.setItem(STORE, JSON.stringify({ messages: messages.slice(-30).map((m) => ({ ...m, shown: undefined })), round }));
    } catch {}
  }, [messages, round]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length, isTyping, open, typing]);

  useEffect(() => {
    if (!open) return;
    if (matchMedia("(hover: hover) and (pointer: fine)").matches) inputRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const push = (msg: Omit<ChatMessage, "id">) => setMessages((prev) => [...prev, { ...msg, id: nextId.current++ }]);

  const finishTyping = () => setMessages((prev) => prev.map((m) => (m.shown !== undefined ? { ...m, shown: m.text.length } : m)));

  const showCard = (card: ChatCard, intro?: string) => {
    haptic(5);
    finishTyping();
    setDrawer(false);
    push({ sender: "ai", text: intro ?? introFor(card), cards: [card], shown: 0 });
  };

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || isTyping) return;
    haptic(5);
    finishTyping();
    setDrawer(false);

    const history = messages.slice(-8).map((m) => ({ role: m.sender, text: m.text }));
    push({ sender: "user", text: message });
    setInput("");
    setIsTyping(true);

    let reply: { text: string; links?: { label: string; href: string }[]; cards?: ChatCard[] };
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history, page: pathname }),
      });
      const data = (await res.json()) as { reply?: string; cards?: ChatCard[] };
      // AI unavailable (no key, rate limit, outage) → the offline brain, which can still run every tool.
      reply = res.ok && data.reply ? { text: data.reply, links: linksIn(data.reply), cards: data.cards } : localAnswer(message);
    } catch {
      reply = localAnswer(message);
    }

    setIsTyping(false);
    push({ sender: "ai", text: reply.text, links: reply.links, cards: reply.cards?.length ? reply.cards : undefined, shown: 0 });
    setRound((r) => r + 1);
  };

  // Requests from elsewhere on the site ("Ask NeilAI" buttons, the command palette).
  const handleAsk = useRef<(d: AskDetail) => void>(() => {});
  useEffect(() => {
    handleAsk.current = (d) => {
      if (d.card) showCard(d.card, d.intro);
      else if (d.prompt) send(d.prompt);
    };
  });
  useEffect(() => {
    const onAsk = (e: Event) => handleAsk.current((e as CustomEvent<AskDetail>).detail);
    addEventListener(ASK_EVENT, onAsk);
    // One may have arrived before this panel finished loading.
    const pending = takeAsk();
    const t = pending ? setTimeout(() => handleAsk.current(pending), 400) : undefined;
    return () => {
      removeEventListener(ASK_EVENT, onAsk);
      clearTimeout(t);
    };
  }, []);

  const reset = () => {
    haptic();
    setDrawer(false);
    setRound(0);
    setMessages(WELCOME.map((m) => ({ ...m })));
    nextId.current = WELCOME.length + 1;
  };

  const suggestions = suggestionsFor(pathname, round);

  return (
    <div
      id="neilai-panel"
      role="dialog"
      aria-label="Chat about Neil"
      inert={!open}
      aria-hidden={!open}
      data-open={open}
      data-lenis-prevent
      className="mb-3 flex h-[min(640px,calc(100dvh-7rem))] w-[calc(100vw-2rem)] max-w-sm origin-bottom-right flex-col overflow-hidden rounded-[22px] bg-paper shadow-[0_30px_80px_-20px_rgb(0_48_73/0.55)] ring-1 ring-ink/15 transition-[opacity,translate,scale,filter,visibility] duration-300 ease-[var(--ease-apple)] data-[open=false]:invisible data-[open=false]:translate-y-3 data-[open=false]:scale-x-[0.7] data-[open=false]:scale-y-[0.35] data-[open=false]:opacity-0 data-[open=false]:blur-sm data-[open=true]:animate-blob-in sm:max-w-md"
    >
      <div className="flex shrink-0 items-center justify-between gap-3 bg-ink px-4 py-3 text-paper">
        <div className="flex min-w-0 items-center gap-3">
          <BlobAvatar className="h-10 w-10" mood={isTyping ? "thinking" : "idle"} />
          <div className="min-w-0">
            <p className="font-display text-xl leading-none">NeilAI</p>
            <p className="label mt-1 flex items-center gap-1.5 truncate text-[0.58rem] text-sky">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#7bd88f]" /> {isTyping ? "thinking…" : "online · runs Neil's tools"}
            </p>
          </div>
        </div>
        <div className="-mr-1 flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => {
              haptic();
              setDrawer((d) => !d);
            }}
            aria-expanded={drawer}
            aria-label="Tools"
            title="Tools"
            className="press flex h-9 w-9 items-center justify-center rounded-full text-lg hover:bg-paper/10 aria-expanded:bg-paper aria-expanded:text-ink"
          >
            🧰
          </button>
          <button type="button" onClick={reset} aria-label="New chat" title="New chat" className="press flex h-9 w-9 items-center justify-center rounded-full text-lg text-paper/70 hover:bg-paper/10 hover:text-paper">
            ↺
          </button>
          <button type="button" onClick={onClose} aria-label="Close chat" className="press flex h-9 w-9 items-center justify-center rounded-full font-display text-2xl leading-none text-paper/70 hover:bg-paper/10 hover:text-paper">
            ×
          </button>
        </div>
      </div>

      {/* Tool drawer */}
      <div className="grid shrink-0 bg-ink transition-[grid-template-rows] duration-500 ease-[var(--ease-apple)]" style={{ gridTemplateRows: drawer ? "1fr" : "0fr" }}>
        <div className="overflow-hidden">
          <div className="grid grid-cols-2 gap-1.5 px-3 pb-3">
            {tools.map((t, i) => (
              <button
                key={t.id}
                type="button"
                tabIndex={drawer ? 0 : -1}
                onClick={() => showCard(starterCard[t.id])}
                className="press flex items-center gap-2 rounded-xl bg-paper/[0.07] px-3 py-2.5 text-left text-paper transition-colors hover:bg-paper hover:text-ink"
                style={{ transitionDelay: drawer ? `${i * 30}ms` : "0ms" }}
              >
                <span aria-hidden className="text-lg">{TOOL_ICONS[t.id]}</span>
                <span className="font-serif text-sm leading-tight">{t.title}</span>
              </button>
            ))}
            <button
              type="button"
              tabIndex={drawer ? 0 : -1}
              onClick={() => showCard({ kind: "github" })}
              className="press flex items-center gap-2 rounded-xl bg-paper/[0.07] px-3 py-2.5 text-left text-paper transition-colors hover:bg-paper hover:text-ink"
            >
              <span aria-hidden className="text-lg">📈</span>
              <span className="font-serif text-sm leading-tight">GitHub activity</span>
            </button>
          </div>
        </div>
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
              {done && msg.cards && msg.cards.length > 0 && <ChatCards cards={msg.cards} onNavigate={onClose} />}
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
        <div key={`${round}-${pathname}`} className="no-scrollbar flex shrink-0 gap-2 overflow-x-auto px-4 pb-3">
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
          placeholder="Ask anything, or paste a link / IP…"
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
