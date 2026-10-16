"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { offerIndex } from "@/content/offers";
import { categories, projects } from "@/content/work";
import { seriesList } from "@/content/series";
import { haptic } from "@/lib/haptics";
import { askNeilAI } from "@/lib/neilai-events";
import { allRoutes } from "@/lib/site";
import { chatTools, starterCard, tools } from "@/lib/tools";
import { cn } from "@/lib/utils";

type Item = {
  id: string;
  group: "Ask" | "Pages" | "Services" | "Tools" | "Projects" | "Photography" | "Actions";
  title: string;
  hint: string;
  /** Searchable text beyond the title. */
  keywords: string;
  href?: string;
  run?: () => void;
};

const ICON: Record<Item["group"], string> = { Ask: "✦", Pages: "◎", Services: "✳", Tools: "🧪", Projects: "▣", Photography: "◐", Actions: "→" };

const BASE: Item[] = [
  ...allRoutes.map((r) => ({ id: `page:${r.href}`, group: "Pages" as const, title: r.label, hint: r.description, keywords: r.href, href: r.href })),
  { id: "page:/uses#colophon", group: "Pages", title: "Colophon", hint: "How this site is built", keywords: "built with stack next.js tailwind cloudinary credits fonts", href: "/uses#colophon" },
  ...offerIndex.map((o) => ({
    id: `offer:${o.id}`,
    group: "Services" as const,
    title: o.title,
    hint: o.pitch,
    keywords: `services hire work with me freelance price timeline ${o.short} ${o.topic}`,
    href: `/services#${o.id}`,
  })),
  ...tools.map((t) => ({
    id: `tool:${t.id}`,
    group: "Tools" as const,
    title: t.title,
    hint: "Open in the Lab",
    keywords: t.keywords,
    href: `/lab#${t.id}`,
  })),
  ...chatTools.map((t) => ({
    id: `chat-tool:${t.id}`,
    group: "Actions" as const,
    title: `Run ${t.title.toLowerCase()} in NeilAI`,
    hint: "Opens the chat with the tool",
    keywords: `chat ${t.keywords}`,
    run: () => askNeilAI({ card: starterCard[t.id] }),
  })),
  ...projects.map((p) => ({
    id: `project:${p.slug}`,
    group: "Projects" as const,
    title: p.title,
    hint: `${categories[p.category].label} · ${p.plain}`,
    keywords: `${p.context} ${p.role} ${p.stack.join(" ")}`,
    href: `/work/${p.slug}`,
  })),
  ...seriesList.map((s) => ({ id: `series:${s.slug}`, group: "Photography" as const, title: s.title, hint: s.kicker, keywords: `photos gallery ${s.story}`, href: `/photography#${s.slug}` })),
  { id: "act:book", group: "Actions", title: "Book a photoshoot", hint: "Opens the booking form", keywords: "price quote session graduation studio event", href: "/contact?topic=photography" },
  { id: "act:hello", group: "Actions", title: "Start a project with Neil", hint: "Contact form", keywords: "hire email message freelance web network", href: "/contact" },
  { id: "act:github", group: "Actions", title: "Show GitHub activity", hint: "In NeilAI", keywords: "commits contributions code repos", run: () => askNeilAI({ card: { kind: "github" } }) },
  { id: "act:terminal", group: "Actions", title: "Open the terminal", hint: "For the curious", keywords: "cli shell hacker", href: "/terminal" },
];

/** Title hits beat keyword hits; letters-in-order (fuzzy) hits come last. */
function score(item: Item, q: string) {
  const title = item.title.toLowerCase();
  if (title.startsWith(q)) return 6;
  if (title.includes(q)) return 4;
  const words = q.split(/\s+/).filter(Boolean);
  const hay = `${title} ${item.hint} ${item.keywords}`.toLowerCase();
  if (words.every((w) => hay.includes(w))) return 2;
  let i = 0;
  for (const ch of title) if (ch === q[i]) i++;
  return i === q.length ? 1 : 0;
}

export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const ask: Item[] = q
      ? [{ id: "ask", group: "Ask", title: `Ask NeilAI: “${query.trim()}”`, hint: "Answers, runs tools, shows projects", keywords: "", run: () => askNeilAI({ prompt: query.trim() }) }]
      : [];
    if (!q) return [...BASE.filter((i) => i.group === "Pages" || i.group === "Tools"), ...BASE.filter((i) => i.id === "act:book" || i.id === "act:github")];
    const hits = BASE.map((i) => ({ i, s: score(i, q) }))
      .filter((h) => h.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 12)
      .map((h) => h.i);
    // A specific match goes first; otherwise asking NeilAI is the best bet.
    return hits.length && score(hits[0], q) >= 4 ? [...hits, ...ask] : [...ask, ...hits];
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    document.documentElement.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const choose = (index: number) => {
    const item = results[index];
    if (!item) return;
    haptic();
    if (item.run) {
      onClose();
      item.run();
    } else {
      // Click the real link so page transitions and prefetching behave as usual.
      listRef.current?.querySelector<HTMLAnchorElement>(`[data-index="${index}"] a`)?.click();
      onClose();
    }
  };

  if (!open) return null;

  return createPortal(
    <div className="animate-page-in fixed inset-0 z-[95] flex items-start justify-center bg-ink/40 px-4 pt-[12vh] backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search the site"
        onClick={(e) => e.stopPropagation()}
        className="animate-blob-in flex max-h-[70vh] w-full max-w-xl origin-top flex-col overflow-hidden rounded-[20px] bg-paper shadow-[0_40px_100px_-30px_rgb(0_48_73/0.7)] ring-1 ring-ink/15"
      >
        <div className="flex items-center gap-3 border-b border-ink/10 px-5">
          <span aria-hidden className="font-display text-xl text-ember">⌕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") return onClose();
              if (!["ArrowDown", "ArrowUp", "Enter"].includes(e.key)) return;
              e.preventDefault();
              if (e.key === "Enter") choose(active);
              else setActive((a) => Math.max(0, Math.min(results.length - 1, a + (e.key === "ArrowDown" ? 1 : -1))));
            }}
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-results"
            aria-activedescendant={results[active] ? `palette-${results[active].id}` : undefined}
            placeholder="Search projects, tools, photos — or ask NeilAI…"
            className="h-14 min-w-0 flex-1 bg-transparent font-serif text-lg text-ink outline-none placeholder:text-ink/40"
          />
          <kbd className="label hidden rounded border border-ink/20 px-1.5 py-0.5 text-[0.55rem] text-ink/50 sm:block">Esc</kbd>
        </div>

        <ul ref={listRef} id="palette-results" role="listbox" className="thin-scrollbar overflow-y-auto overscroll-contain p-2" data-lenis-prevent>
          {results.length === 0 && <li className="p-6 text-center font-serif text-ink/55 italic">Nothing here yet — try another word.</li>}
          {results.map((item, index) => {
            const header = index === 0 || results[index - 1].group !== item.group ? item.group : null;
            const body = (
              <>
                <span aria-hidden className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm", item.group === "Ask" ? "bg-ember text-paper" : "bg-ink/[0.06]")}>
                  {ICON[item.group]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-serif text-[1.05rem] leading-tight">{item.title}</span>
                  <span className="block truncate font-serif text-sm text-ink/55 italic">{item.hint}</span>
                </span>
                <span aria-hidden className={cn("label text-[0.55rem] text-ink/40", index !== active && "invisible")}>
                  ↵
                </span>
              </>
            );
            const rowClass = cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors", index === active ? "bg-ink text-paper [&_span]:text-paper/90" : "text-ink");
            return (
              <li key={item.id} data-index={index} id={`palette-${item.id}`} role="option" aria-selected={index === active} onMouseMove={() => setActive(index)}>
                {header && <p className="label px-3 pt-3 pb-1.5 text-[0.55rem] text-ink/45">{header}</p>}
                {item.href ? (
                  <Link href={item.href} onClick={() => onClose()} className={rowClass} tabIndex={-1}>
                    {body}
                  </Link>
                ) : (
                  <button type="button" onClick={() => choose(index)} className={rowClass} tabIndex={-1}>
                    {body}
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        <p className="label flex justify-between border-t border-ink/10 px-5 py-2.5 text-[0.52rem] text-ink/45">
          <span>↑↓ to move · ↵ to open</span>
          <span>{results.length} results</span>
        </p>
      </div>
    </div>,
    document.body,
  );
}
