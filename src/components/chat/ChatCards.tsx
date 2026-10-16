"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import ToolView, { toolOfCard } from "@/components/tools/ToolView";
import ProjectCover from "@/components/work/ProjectCover";
import { projectBySlug } from "@/content/work";
import type { GitHubActivity } from "@/lib/github";
import { toolById, type ChatCard } from "@/lib/tools";

/** Live cards under a NeilAI reply: projects, photo collections, GitHub, and working Lab tools. */
export default function ChatCards({ cards, onNavigate }: { cards: ChatCard[]; onNavigate: () => void }) {
  return (
    <div className="mt-2 w-full space-y-2">
      {cards.map((card, i) => (
        <div key={i} className="animate-pop-in origin-top-left overflow-hidden rounded-[16px] bg-paper ring-1 ring-ink/12 shadow-[0_10px_30px_-18px_rgb(0_48_73/0.5)]" style={{ animationDelay: `${i * 90}ms` }}>
          <Card card={card} onNavigate={onNavigate} />
        </div>
      ))}
    </div>
  );
}

function Card({ card, onNavigate }: { card: ChatCard; onNavigate: () => void }) {
  if (card.kind === "project") {
    const p = projectBySlug(card.slug);
    if (!p) return null;
    return (
      <Link href={`/work/${p.slug}`} onClick={onNavigate} className="group block">
        <ProjectCover project={p} sizes="380px" className="aspect-[16/8]" />
        <div className="p-3.5">
          <p className="label text-[0.52rem] text-ember">{p.context}</p>
          <p className="mt-1 font-display text-xl leading-tight transition-colors group-hover:text-ember">{p.title}</p>
          <p className="mt-1 font-serif text-[0.92rem] leading-snug text-ink/70 italic">{p.plain}</p>
          <p className="label mt-2 text-[0.55rem] text-ink/55">Open project →</p>
        </div>
      </Link>
    );
  }

  if (card.kind === "collection") {
    return (
      <Link href={`/photography#${card.slug}`} onClick={onNavigate} className="group block">
        <div className="relative aspect-[16/9] overflow-hidden bg-ink">
          {card.cover && <Image src={card.cover} alt="" fill sizes="380px" unoptimized={card.cover.startsWith("https://")} className="object-cover transition-transform duration-700 group-hover:scale-105" />}
          <div className="absolute inset-0 bg-gradient-to-t from-ink/80 to-transparent" />
          <p className="absolute bottom-3 left-3.5 font-display text-2xl text-paper">{card.title}</p>
        </div>
        <p className="label flex justify-between p-3.5 text-[0.55rem] text-ink/60">
          <span>{card.count} frames</span>
          <span>Open the collection →</span>
        </p>
      </Link>
    );
  }

  if (card.kind === "github") return <GitHubCard />;

  const tool = toolOfCard(card);
  if (!tool) return null;
  return (
    <div>
      <div className="flex items-center justify-between gap-3 border-b border-ink/10 bg-paper-deep/40 px-3.5 py-2.5">
        <p className="label text-[0.55rem] text-ink/70">🧪 {toolById(tool).title}</p>
        <Link href={`/lab#${tool}`} onClick={onNavigate} className="label shrink-0 text-[0.52rem] text-ember hover:text-ink">
          Open in Lab ↗
        </Link>
      </div>
      <div className="p-3.5">
        <ToolView card={card} compact />
      </div>
    </div>
  );
}

function GitHubCard() {
  const [data, setData] = useState<GitHubActivity | null | "error">(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/github")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: GitHubActivity) => alive && setData(d))
      .catch(() => alive && setData("error"));
    return () => {
      alive = false;
    };
  }, []);

  if (data === null) return <p className="animate-pulse p-4 font-serif text-sm text-ink/55 italic">Reading the commit log…</p>;
  if (data === "error") return <p className="p-4 font-serif text-sm text-ink/60">GitHub is taking a breather — try again in a bit.</p>;

  const recent = data.weeks.slice(-18);
  const LEVEL = ["bg-paper/10", "bg-sky/45", "bg-sky", "bg-paper", "bg-ember"];
  return (
    <div className="bg-ink p-3.5 text-paper">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-display text-3xl leading-none">{data.total.toLocaleString("en-US")}</p>
        <p className="label text-[0.52rem] text-sky">contributions · last year</p>
      </div>
      <div className="mt-3 grid grid-flow-col grid-rows-7 gap-[3px]" style={{ gridTemplateColumns: `repeat(${recent.length}, minmax(0,1fr))` }}>
        {recent.map((w, wi) =>
          w.map((d, di) => (
            <span
              key={`${wi}-${di}`}
              title={d ? `${d.count} on ${d.date}` : undefined}
              className={`aspect-square rounded-[2px] ${d ? LEVEL[d.level] : ""}`}
            />
          )),
        )}
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        {[
          ["Current streak", `${data.currentStreak}d`],
          ["Longest", `${data.longestStreak}d`],
          ["Active days", data.activeDays],
        ].map(([k, v]) => (
          <div key={k} className="rounded-[2px] bg-paper/[0.06] py-2">
            <dd className="font-display text-xl leading-none">{v}</dd>
            <dt className="label mt-1 text-[0.48rem] text-paper/50">{k}</dt>
          </div>
        ))}
      </dl>
      <a href="https://github.com/neiljacobsantiago" target="_blank" rel="noopener noreferrer" className="label mt-3 inline-block text-[0.55rem] text-sky hover:text-paper">
        github.com/neiljacobsantiago ↗
      </a>
    </div>
  );
}
