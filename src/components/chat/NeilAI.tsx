"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Icon, { type IconName } from "@/components/ui/Icon";
import { haptic } from "@/lib/haptics";
import { linksIn, localAnswer } from "@/lib/neil-faq";
import { introFor } from "@/lib/neilai/intents";
import { historyOf, loadMemory, storeDeal } from "@/lib/neilai/memory";
import { freshSeed, mix } from "@/lib/neilai/random";
import { hostOf, isSafeHref, sourcesIn, type Source } from "@/lib/neilai/sources";
import { pickSuggestions, topicOf, type ChipMeta, type Suggestion } from "@/lib/neilai/suggest";
import { greeting, starterFor, surprise } from "@/lib/neilai/variety";
import { ASK_EVENT, takeAsk, type AskDetail } from "@/lib/neilai-events";
import { chatTools, type ChatCard } from "@/lib/tools";
import BlobAvatar from "./BlobAvatar";
import ChatCards from "./ChatCards";
import RichText from "./RichText";

interface ChatMessage {
  id: number;
  sender: "ai" | "user";
  text: string;
  links?: { label: string; href: string }[];
  /** Outside links (vetted), opened only after the visitor confirms. */
  sources?: Source[];
  /** Live widgets shown under an AI reply. */
  cards?: ChatCard[];
  /** Characters revealed so far (typewriter effect for AI replies). */
  shown?: number;
}

/** The opening messages: they know the hour and the page, and are worded differently each time. */
function welcome(path: string): ChatMessage[] {
  const [hello, offer] = greeting(path, new Date().getHours());
  return [
    { id: 1, sender: "ai", text: hello },
    { id: 2, sender: "ai", text: offer },
  ];
}

const TOOL_ICONS: Record<string, IconName> = { pathoscan: "search", subnet: "globe", memory: "copy", link: "lock", quote: "camera" };
const STORE = "neilai-chat-v5";
const SURPRISE = "Surprise me";
/** How many recent deals this visit keeps, to rotate the opening chip. */
const DEALS_MAX = 6;
const metaOf = (deal: Suggestion[]): ChipMeta[] => deal.map(({ topic, theme, template }) => ({ topic, theme, template }));
/** How many recently shown chips are held back from coming straight back. */
const SEEN_MAX = 60;
const VISITED_MAX = 8;

/** Adds to a most-recent-last list without duplicates, keeping the newest `max`. */
const remember = (prev: string[], add: (string | null | undefined)[], max = SEEN_MAX) => {
  const fresh = add.filter((x): x is string => !!x);
  return [...prev.filter((x) => !fresh.includes(x)), ...fresh].slice(-max);
};

/** Only well-formed, safe outside links from the server make it into a message: up to 4 vetted and 5 web results. */
const cleanSources = (raw: unknown): Source[] => {
  const ok = (Array.isArray(raw) ? raw : [])
    .filter((x): x is Source => !!x && typeof x.href === "string" && typeof x.label === "string" && isSafeHref(x.href))
    .map((x): Source => ({ label: x.label.slice(0, 80), href: x.href, host: hostOf(x.href), kind: x.kind === "web" ? "web" : "vetted" }));
  return [...ok.filter((x) => x.kind === "vetted").slice(0, 4), ...ok.filter((x) => x.kind === "web").slice(0, 5)];
};
const TYPE_MS = 14;

interface Saved {
  messages: ChatMessage[];
  round: number;
  /** Chips shown or asked lately, held back so they don't come straight back. */
  seen?: string[];
  /** Topics of recent answers, newest last: follow-ups, and what "Surprise me" skips. */
  visited?: string[];
  /** This visit's chip deals, oldest first, so the opening chip rotates. */
  deals?: ChipMeta[][];
}

function restore(): Saved | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORE) ?? "null") as Saved | null;
    return saved?.messages?.length ? saved : null;
  } catch {
    return null;
  }
}

/** The offline brain's answer, with outside links for anything it names. */
function offline(question: string, page: string) {
  const answer = localAnswer(question, { page });
  const sources = [...(answer.sources ?? []), ...sourcesIn(answer.text)].filter((x, i, all) => all.findIndex((y) => y.href === x.href) === i).slice(0, 5);
  return sources.length ? { ...answer, sources } : answer;
}

/** `opens` counts how many times the panel has been opened, so each opening deals new chips. */
export default function NeilAI({ open, opens = 0, onClose }: { open: boolean; opens?: number; onClose: () => void }) {
  const pathname = usePathname();
  const [saved] = useState(restore);
  const [messages, setMessages] = useState<ChatMessage[]>(() => saved?.messages ?? welcome(pathname));
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [round, setRound] = useState(saved?.round ?? 0);
  const [drawer, setDrawer] = useState(false);
  const [leaving, setLeaving] = useState<Source | null>(null);
  // This panel only ever renders in the browser (it's loaded with ssr: false), so a
  // random seed here can't cause a hydration mismatch. One per mount and per new chat.
  const [seed, setSeed] = useState(freshSeed);
  const [seen, setSeen] = useState<string[]>(saved?.seen ?? []);
  const [visited, setVisited] = useState<string[]>(saved?.visited ?? []);
  const [dealtFor, setDealtFor] = useState(opens);
  // What earlier visits showed (localStorage), read once: recently shown chips are held
  // back, older ones fade back in. This visit's own deals are tracked alongside.
  const [memory] = useState(() => loadMemory());
  const [deals, setDeals] = useState<ChipMeta[][]>(saved?.deals ?? []);
  const stayRef = useRef<HTMLButtonElement>(null);
  const nextId = useRef(Math.max(0, ...messages.map((m) => m.id)) + 1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const typing = messages.some((m) => m.shown !== undefined && m.shown < m.text.length);

  // Typewriter: reveal the newest AI message a couple of characters per tick.
  useEffect(() => {
    if (!typing) return;
    const id = setInterval(() => {
      setMessages((prev) =>
        // Longer answers type a little faster, so none takes more than a few seconds.
        prev.map((m) => (m.shown !== undefined && m.shown < m.text.length ? { ...m, shown: Math.min(m.text.length, m.shown + Math.max(2, Math.ceil(m.text.length / 220))) } : m)),
      );
    }, TYPE_MS);
    return () => clearInterval(id);
  }, [typing]);

  // Keep the conversation for this browser tab, so a refresh doesn't wipe it.
  useEffect(() => {
    try {
      const keep: Saved = { messages: messages.slice(-30).map((m) => ({ ...m, shown: undefined })), round, seen, visited, deals };
      sessionStorage.setItem(STORE, JSON.stringify(keep));
    } catch {}
  }, [messages, round, seen, visited, deals]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length, isTyping, open, typing]);

  useEffect(() => {
    if (!open) return;
    if (matchMedia("(hover: hover) and (pointer: fine)").matches) inputRef.current?.focus({ preventScroll: true });
    // Escape backs out of the leaving-the-site sheet first, then closes the chat.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (leaving) setLeaving(null);
      else onClose();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [open, onClose, leaving]);

  useEffect(() => {
    if (leaving) stayRef.current?.focus({ preventScroll: true });
  }, [leaving]);

  // The chips: a seeded deal from the whole pool. The page leads, the last
  // answer gets follow-ups, one chip wanders off-theme, the opening chip rotates,
  // and nothing asked or shown lately (this visit or earlier ones) comes back.
  // Deterministic for these inputs, so it's render-safe.
  const topic = visited.at(-1) ?? null;
  const asked = messages.filter((m) => m.sender === "user").map((m) => m.text);
  const suggestions = pickSuggestions({
    seed: mix(seed, dealtFor),
    round,
    path: pathname,
    exclude: [...memory.recent, ...seen, ...asked],
    topic,
    history: historyOf(memory, deals),
  });
  const dealKey = `${round}-${pathname}-${dealtFor}-${seed}`;
  const chipsShown = open && !isTyping && !typing;

  /** The deal on screen is done with: hold its chips back, and remember it for rotating the lead. */
  const retire = (extra: (string | undefined)[] = []) => {
    setSeen((prev) => remember(prev, [...suggestions.map((s) => s.text), ...extra]));
    setDeals((prev) => [...prev, metaOf(suggestions)].slice(-DEALS_MAX));
  };

  // Opened again: the chips that were on screen count as seen, and a new hand is dealt.
  // (Before the first opening the panel is mounted but hidden, so nothing was seen yet.)
  if (opens !== dealtFor) {
    setDealtFor(opens);
    if (dealtFor > 0) retire();
  }

  // Each deal that's actually on screen goes into the browser's chip memory, for later visits.
  const storedKey = useRef<string | null>(null);
  useEffect(() => {
    if (!chipsShown || storedKey.current === dealKey) return;
    storedKey.current = dealKey;
    storeDeal(suggestions);
  });

  const push = (msg: Omit<ChatMessage, "id">) => setMessages((prev) => [...prev, { ...msg, id: nextId.current++ }]);

  /** Marks what's on screen as seen and moves to the next topic and round. */
  const advance = (next: string | null, question?: string) => {
    retire([question]);
    if (next) setVisited((prev) => remember(prev, [next], VISITED_MAX));
    setRound((r) => r + 1);
  };

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

    let reply: { text: string; links?: { label: string; href: string }[]; cards?: ChatCard[]; sources?: Source[] };
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // The seed lets the server spotlight different work in different conversations.
        body: JSON.stringify({ message, history, page: pathname, seed }),
      });
      const data = (await res.json()) as { reply?: string; cards?: ChatCard[]; sources?: unknown };
      // AI unavailable (no key, rate limit, outage) → the offline brain, which can still run every tool.
      reply = res.ok && data.reply ? { text: data.reply, links: linksIn(data.reply), cards: data.cards, sources: cleanSources(data.sources) } : offline(message, pathname);
    } catch {
      reply = offline(message, pathname);
    }

    setIsTyping(false);
    push({ sender: "ai", text: reply.text, links: reply.links, cards: reply.cards?.length ? reply.cards : undefined, sources: reply.sources?.length ? reply.sources : undefined, shown: 0 });
    advance(topicOf(message, reply.cards) ?? topicOf(reply.text), message);
  };

  /** Surprise me: something interesting, picked at random and answered on the spot (works offline too). */
  const surpriseMe = () => {
    if (isTyping) return;
    haptic(5);
    finishTyping();
    setDrawer(false);
    const pickd = surprise(Math.random, visited);
    push({ sender: "user", text: SURPRISE });
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      push({ sender: "ai", text: pickd.text, links: pickd.links, cards: pickd.cards, sources: pickd.sources, shown: 0 });
      advance(pickd.topic);
    }, 350 + Math.random() * 350);
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
    setLeaving(null);
    setRound(0);
    setVisited([]);
    retire();
    setSeed(freshSeed());
    const fresh = welcome(pathname);
    setMessages(fresh);
    nextId.current = fresh.length + 1;
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
      onClickCapture={(e) => {
        // Every outside link in the chat (chips, cards) asks before leaving.
        const a = (e.target as Element).closest?.("a[href]");
        const href = a?.getAttribute("href") ?? "";
        if (!a || a.hasAttribute("data-leave-ok") || !/^https?:\/\//.test(href) || new URL(href).host === location.host) return;
        e.preventDefault();
        haptic(5);
        setLeaving({ label: a.getAttribute("data-label") ?? a.textContent?.trim() ?? hostOf(href), href, host: hostOf(href), kind: a.getAttribute("data-kind") === "web" ? "web" : "vetted" });
      }}
      // Height: whatever's left of the visible viewport (--vv-h, which shrinks with the on-screen
      // keyboard; 100dvh until the launcher measures it) once the NavBar (4rem / 5rem + the top safe
      // area), a gap, and the launcher button below (3.5rem + mb-3 + its bottom offset) are taken out.
      // So the panel's header always sits below the nav, never half under it.
      className="relative mb-3 flex h-[min(640px,calc(var(--vv-h,100dvh)-4rem-env(safe-area-inset-top)-0.75rem-4.25rem-max(1rem,env(safe-area-inset-bottom))))] w-[calc(100vw-2rem)] md:h-[min(640px,calc(var(--vv-h,100dvh)-5rem-env(safe-area-inset-top)-1.25rem-4.25rem-max(1rem,env(safe-area-inset-bottom))))] max-w-sm origin-bottom-right flex-col overflow-hidden rounded-[22px] bg-paper shadow-[0_30px_80px_-20px_rgb(0_48_73/0.55)] ring-1 ring-ink/15 transition-[opacity,translate,scale,filter,visibility] duration-300 ease-[var(--ease-apple)] data-[open=false]:invisible data-[open=false]:translate-y-3 data-[open=false]:scale-x-[0.7] data-[open=false]:scale-y-[0.35] data-[open=false]:opacity-0 data-[open=false]:blur-sm data-[open=true]:animate-blob-in sm:max-w-md"
    >
      <div className="flex shrink-0 items-center justify-between gap-3 bg-ink px-4 py-3 text-paper">
        <div className="flex min-w-0 items-center gap-3">
          <BlobAvatar className="h-10 w-10" mood={isTyping ? "thinking" : "idle"} />
          <div className="min-w-0">
            <p className="font-display text-xl leading-none">NeilAI</p>
            <p className="label mt-1 flex items-center gap-1.5 truncate text-3xs text-sky">
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
            <Icon name="tools" />
          </button>
          <button type="button" onClick={reset} aria-label="New chat" title="New chat" className="press flex h-9 w-9 items-center justify-center rounded-full text-lg text-paper/70 hover:bg-paper/10 hover:text-paper">
            <Icon name="refresh" />
          </button>
          <button type="button" onClick={onClose} aria-label="Close chat" className="press flex h-9 w-9 items-center justify-center rounded-full text-lg text-paper/70 hover:bg-paper/10 hover:text-paper">
            <Icon name="close" />
          </button>
        </div>
      </div>

      {/* Tool drawer */}
      <div className="grid shrink-0 bg-ink transition-[grid-template-rows] duration-500 ease-[var(--ease-apple)]" style={{ gridTemplateRows: drawer ? "1fr" : "0fr" }}>
        <div className="overflow-hidden">
          <div className="grid grid-cols-2 gap-1.5 px-3 pb-3">
            {chatTools.map((t, i) => (
              <button
                key={t.id}
                type="button"
                tabIndex={drawer ? 0 : -1}
                onClick={() => showCard(starterFor(t.id))}
                className="press flex items-center gap-2 rounded-xl bg-paper/[0.07] px-3 py-2.5 text-left text-paper transition-colors hover:bg-paper hover:text-ink"
                style={{ transitionDelay: drawer ? `${i * 30}ms` : "0ms" }}
              >
                <Icon name={TOOL_ICONS[t.id] ?? "tools"} className="text-lg text-sky" />
                <span className="font-serif text-sm leading-tight">{t.title}</span>
              </button>
            ))}
            <button
              type="button"
              tabIndex={drawer ? 0 : -1}
              onClick={() => showCard({ kind: "github" })}
              className="press flex items-center gap-2 rounded-xl bg-paper/[0.07] px-3 py-2.5 text-left text-paper transition-colors hover:bg-paper hover:text-ink"
            >
              <Icon name="github" className="text-lg text-sky" />
              <span className="font-serif text-sm leading-tight">GitHub activity</span>
            </button>
          </div>
        </div>
      </div>

      <div ref={scrollRef} onClick={finishTyping} className="thin-scrollbar flex-1 space-y-3 overflow-y-auto overscroll-contain p-4" aria-live="polite">
        {messages.map((msg) => {
          const text = msg.shown !== undefined ? msg.text.slice(0, msg.shown) : msg.text;
          const done = msg.shown === undefined || msg.shown >= msg.text.length;
          const cursor = !done && <span className="animate-blink ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 bg-ink/60" />;
          const vetted = msg.sources?.filter((s) => s.kind !== "web") ?? [];
          const web = msg.sources?.filter((s) => s.kind === "web") ?? [];
          return (
            <div key={msg.id} className={`animate-pop-in flex flex-col ${msg.sender === "user" ? "origin-bottom-right items-end" : "origin-bottom-left items-start"}`}>
              {msg.sender === "user" ? (
                <div className="max-w-[85%] rounded-[20px] rounded-br-md bg-ember px-4 py-2.5 font-serif text-[1.02rem] leading-snug whitespace-pre-line text-paper">{text}</div>
              ) : (
                // Replies use a tiny, safe markdown subset (paragraphs, lists, bold), parsed into text nodes.
                <div className="max-w-[88%] rounded-[20px] rounded-bl-md bg-paper-deep px-4 py-2.5 font-serif text-[1.02rem] leading-snug text-ink">
                  <RichText text={text} cursor={cursor} />
                </div>
              )}
              {done && msg.cards && msg.cards.length > 0 && <ChatCards cards={msg.cards} onNavigate={onClose} />}
              {done && msg.links && msg.links.length > 0 && (
                <div className="animate-pop-in mt-2 flex flex-wrap gap-1.5">
                  {msg.links.map((l) => (
                    <Link key={l.href} href={l.href} onClick={onClose} className="label press inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-2xs text-paper hover:bg-ember">
                      {l.label} <Icon name="arrow-right" />
                    </Link>
                  ))}
                </div>
              )}
              {done && vetted.length > 0 && <SourceChips sources={vetted} title="Learn more · outside this site" icon="arrow-up-right" />}
              {done && web.length > 0 && (
                <SourceChips
                  sources={web}
                  title={web.every((s) => s.href.startsWith("https://www.google.com/search?")) ? "Search the web · opens Google" : "Web results · from a live search, not checked by Neil"}
                  icon="search"
                />
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
        <div key={dealKey} className="no-scrollbar flex shrink-0 gap-2 overflow-x-auto px-4 pb-3" data-neilai-chips>
          {/* Always first, so it's never scrolled out of sight. */}
          <button
            type="button"
            onClick={surpriseMe}
            aria-label="Surprise me: pick something at random"
            title="Pick something at random"
            className="animate-pop-in label press inline-flex shrink-0 items-center gap-1.5 rounded-full border border-dashed border-ember/60 px-3 py-2 text-2xs text-ember hover:border-ember hover:bg-ember hover:text-paper"
          >
            <Icon name="dice" className="text-[0.85rem]" />
            {SURPRISE}
          </button>
          {suggestions.map((s, i) => (
            <button
              type="button"
              key={s.text}
              onClick={() => send(s.text)}
              data-topic={s.topic}
              data-template={s.template}
              className="animate-pop-in label press shrink-0 rounded-full border border-ink/20 px-3 py-2 text-2xs hover:border-ink hover:bg-ink hover:text-paper"
              style={{ animationDelay: `${(i + 1) * 70}ms` }}
            >
              {s.text}
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
          className="h-11 min-w-0 flex-1 rounded-full bg-paper-deep/70 px-4 font-serif text-ink outline-none placeholder:text-ink/55 focus:ring-1 focus:ring-ember"
        />
        <button
          type="submit"
          disabled={isTyping || !input.trim()}
          aria-label="Send"
          className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ember text-lg text-paper hover:bg-ink disabled:opacity-40"
        >
          <Icon name="arrow-up" />
        </button>
      </form>

      {/* Leaving the site: one more tap, with the destination spelled out */}
      {leaving && (
        <div className="animate-page-in absolute inset-0 z-20 flex items-end bg-ink/40 p-3 backdrop-blur-[2px]" onClick={() => setLeaving(null)}>
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="leave-title"
            aria-describedby="leave-desc"
            onClick={(e) => e.stopPropagation()}
            className="animate-blob-in w-full origin-bottom rounded-[20px] bg-paper p-5 shadow-[0_30px_60px_-20px_rgb(0_48_73/0.6)] ring-1 ring-ink/10"
          >
            <p className="label text-3xs text-ember">Leaving Neil&apos;s site{leaving.kind === "web" && " · web result"}</p>
            <p id="leave-title" className="mt-2 font-display text-[1.7rem] leading-[1.05] break-words text-ink">{leaving.host}</p>
            <p className="mt-1 font-serif text-ink/70 italic">{leaving.label}</p>
            <p className="mt-3 rounded-xl bg-paper-deep/80 px-3 py-2 font-mono text-2xs leading-snug break-all text-ink/70">{leaving.href}</p>
            <p id="leave-desc" className="mt-3 font-serif text-[0.95rem] leading-snug text-ink/75">
              {leaving.kind === "web" && leaving.href.startsWith("https://www.google.com/search?")
                ? "This opens a Google search for your question in a new tab. The results aren't checked by Neil, so browse with the usual care."
                : leaving.kind === "web"
                ? "This came from a live web search, so nobody here has checked it. It opens in a new tab; Neil doesn't run it, so browse with the usual care."
                : "This opens another website in a new tab. Neil doesn't run it, so browse with the usual care."}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button ref={stayRef} type="button" onClick={() => setLeaving(null)} className="label press rounded-full border border-ink/20 py-3 text-3xs hover:border-ink">
                Stay here
              </button>
              <a
                href={leaving.href}
                target="_blank"
                rel="noopener noreferrer"
                data-leave-ok
                onClick={() => {
                  haptic();
                  setLeaving(null);
                }}
                className="label press flex items-center justify-center gap-1.5 rounded-full bg-ink py-3 text-3xs text-paper hover:bg-ember"
              >
                Open link <Icon name="arrow-up-right" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Outside links under a reply. Every one opens through the leaving-the-site sheet (see onClickCapture above). */
function SourceChips({ sources, title, icon }: { sources: Source[]; title: string; icon: IconName }) {
  return (
    <div className="animate-pop-in mt-2 w-full max-w-[88%]" style={{ animationDelay: "90ms" }}>
      <p className="label mb-1.5 text-3xs text-ink/70">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {sources.map((src) => (
          <a
            key={src.href}
            href={src.href}
            data-label={src.label}
            data-kind={src.kind ?? "vetted"}
            target="_blank"
            rel="noopener noreferrer"
            className="press flex max-w-full items-center gap-2 rounded-full bg-paper py-1 pr-3.5 pl-1 ring-1 ring-ink/15 hover:ring-ink"
          >
            <span aria-hidden className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[0.85rem] text-ink ${src.kind === "web" ? "bg-ember/15" : "bg-sky/20"}`}>
              <Icon name={icon} />
            </span>
            <span className="min-w-0 text-left">
              <span className="block truncate font-serif text-[0.92rem] leading-tight text-ink">{src.label}</span>
              <span className="label block truncate text-3xs text-ink/70">{src.host}</span>
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
