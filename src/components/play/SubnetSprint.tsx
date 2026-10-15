"use client";

import { useEffect, useRef, useState } from "react";
import { haptic } from "@/lib/haptics";
import { subnet, type SubnetInfo } from "@/lib/tools/subnet";
import { cn } from "@/lib/utils";

// Subnet Sprint: 60 seconds of subnetting, multiple choice so it works on a
// phone. Answers come from the same maths as the Lab's subnet planner.

const ROUND_MS = 60_000;
const BEST_KEY = "subnet-sprint-best";

interface Question {
  prompt: string;
  detail: string;
  options: string[];
  answer: string;
}

const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
const shuffle = <T,>(xs: T[]) => [...xs].sort(() => Math.random() - 0.5);

function randomNetwork() {
  const prefix = 18 + Math.floor(Math.random() * 12); // /18 – /29
  const base = pick(["192.168", "10.10", "172.16", "10.0"]);
  return `${base}.${Math.floor(Math.random() * 64)}.${1 + Math.floor(Math.random() * 254)}/${prefix}`;
}

function makeQuestion(): Question {
  const cidr = randomNetwork();
  const r = subnet(cidr) as SubnetInfo;
  const kind = pick(["hosts", "network", "broadcast", "mask"] as const);
  const near = (n: number) => [n, n + 2, Math.max(2, n / 2 - 2), n * 2 + 2].map(String);
  switch (kind) {
    case "hosts":
      return { prompt: `How many usable hosts in a /${r.prefix}?`, detail: "Total addresses minus network and broadcast.", answer: String(r.usableHosts), options: shuffle([...new Set(near(r.usableHosts))]).slice(0, 4) };
    case "network": {
      const wrong = [subnet(`${r.address}/${Math.min(30, r.prefix + 1)}`), subnet(`${r.address}/${Math.max(8, r.prefix - 1)}`)].map((x) => ("error" in x ? r.firstHost : x.network));
      return { prompt: `Network address of ${r.address}/${r.prefix}?`, detail: "AND the address with the mask.", answer: r.network, options: shuffle([...new Set([r.network, ...wrong, r.firstHost])]).slice(0, 4) };
    }
    case "broadcast": {
      const wrong = [subnet(`${r.address}/${Math.min(30, r.prefix + 1)}`), subnet(`${r.address}/${Math.max(8, r.prefix - 1)}`)].map((x) => ("error" in x ? r.lastHost : x.broadcast));
      return { prompt: `Broadcast address of ${r.address}/${r.prefix}?`, detail: "Last address in the block.", answer: r.broadcast, options: shuffle([...new Set([r.broadcast, ...wrong, r.lastHost])]).slice(0, 4) };
    }
    case "mask": {
      const masks = [r.prefix - 1, r.prefix + 1, r.prefix + 2].map((p) => (subnet(`10.0.0.0/${Math.max(8, Math.min(30, p))}`) as SubnetInfo).mask);
      return { prompt: `Which subnet mask is /${r.prefix}?`, detail: `${r.prefix} ones, then zeros.`, answer: r.mask, options: shuffle([...new Set([r.mask, ...masks])]).slice(0, 4) };
    }
  }
}

export default function SubnetSprint() {
  const [state, setState] = useState<"idle" | "playing" | "over">("idle");
  const [q, setQ] = useState<Question | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [left, setLeft] = useState(ROUND_MS);
  const [feedback, setFeedback] = useState<{ choice: string; right: boolean } | null>(null);
  const [best, setBest] = useState<number | null>(null);
  const endsAt = useRef(0);
  const scoreRef = useRef(0);

  useEffect(() => {
    try {
      const b = Number(localStorage.getItem(BEST_KEY)) || null;
      queueMicrotask(() => setBest(b));
    } catch {}
  }, []);

  useEffect(() => {
    if (state !== "playing") return;
    const id = setInterval(() => {
      const remaining = Math.max(0, endsAt.current - Date.now());
      setLeft(remaining);
      if (remaining === 0) {
        setState("over");
        const final = scoreRef.current;
        try {
          if (final > (Number(localStorage.getItem(BEST_KEY)) || 0)) {
            localStorage.setItem(BEST_KEY, String(final));
            setBest(final);
          }
        } catch {}
      }
    }, 100);
    return () => clearInterval(id);
  }, [state]);

  const start = () => {
    haptic();
    endsAt.current = Date.now() + ROUND_MS;
    setScore(0);
    scoreRef.current = 0;
    setStreak(0);
    setLeft(ROUND_MS);
    setFeedback(null);
    setQ(makeQuestion());
    setState("playing");
  };

  const answer = (choice: string) => {
    if (!q || feedback || state !== "playing") return;
    const right = choice === q.answer;
    haptic(right ? 8 : 30);
    setFeedback({ choice, right });
    if (right) {
      scoreRef.current += 10 + Math.min(streak, 5) * 2;
      setScore(scoreRef.current);
      setStreak(streak + 1);
    } else setStreak(0);
    setTimeout(() => {
      setFeedback(null);
      setQ(makeQuestion());
    }, right ? 450 : 1100);
  };

  return (
    <div className="flex min-h-[26rem] flex-col rounded-[2px] bg-ink p-5 text-paper md:p-7">
      <div className="flex items-center justify-between gap-3">
        <p className="label text-[0.58rem] text-sky">Subnet Sprint</p>
        <p className="label text-[0.58rem] text-paper/60">
          {state === "playing" ? `${Math.ceil(left / 1000)}s · ${score} pts${streak > 1 ? ` · 🔥${streak}` : ""}` : best ? `Best ${best} pts` : "60 seconds"}
        </p>
      </div>
      {state === "playing" && (
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-paper/10">
          <div className="h-full rounded-full bg-ember transition-[width] duration-100 ease-linear" style={{ width: `${(left / ROUND_MS) * 100}%` }} />
        </div>
      )}

      {state === "playing" && q ? (
        <div key={q.prompt} className={cn("animate-pop-in mt-6 flex flex-1 flex-col", feedback && !feedback.right && "animate-wiggle")}>
          <p className="font-display text-[clamp(1.6rem,4vw,2.4rem)] leading-tight">{q.prompt}</p>
          <p className="mt-2 font-serif text-paper/55 italic">{q.detail}</p>
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            {q.options.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => answer(o)}
                className={cn(
                  "press rounded-xl px-4 py-3.5 text-left font-mono text-sm ring-1 ring-paper/15 transition-colors",
                  !feedback && "bg-paper/[0.06] hover:bg-paper hover:text-ink",
                  feedback && o === q.answer && "bg-[#2e8b57] text-paper ring-[#2e8b57]",
                  feedback && feedback.choice === o && !feedback.right && "bg-ember text-paper ring-ember",
                  feedback && o !== q.answer && feedback.choice !== o && "opacity-40",
                )}
              >
                {o}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-start justify-center gap-4 py-6">
          {state === "over" ? (
            <>
              <p className="font-display text-6xl leading-none">{score} <span className="font-serif text-2xl text-paper/60">pts</span></p>
              <p className="font-serif text-lg text-paper/70 italic">{best === score && score > 0 ? "New personal best! 🎉" : "Not bad — the CCNA is calling."}</p>
            </>
          ) : (
            <p className="max-w-sm font-serif text-xl leading-snug text-paper/80">Hosts, network and broadcast addresses, masks — answer as many as you can in a minute. Streaks score extra.</p>
          )}
          <button type="button" onClick={start} className="btn bg-paper py-3 text-ink hover:bg-sky">
            {state === "over" ? "Run it again" : "Start the clock"} <span className="arrow">→</span>
          </button>
        </div>
      )}
    </div>
  );
}
