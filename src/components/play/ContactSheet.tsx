"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import Icon from "@/components/ui/Icon";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { useArcadeSound } from "./arcade-sound";

// Contact Sheet: a pairs game played on Neil's own photographs. Tiles flip in
// 3D with CSS transforms only (compositor work, no layout), the clock writes
// straight to the DOM instead of re-rendering, and React state changes only
// when a tile is turned. Arrow keys move between tiles; Enter or Space flips.

const PHOTOS = [
  { src: "/photography/concerts/amf-32.jpg", title: "Jay Contreras", note: "Kamikazee, Aurora Music Festival", pos: "50% 12%" },
  { src: "/photography/concerts/amf-15.jpg", title: "Kitchie Nadal", note: "Aurora Music Festival", pos: "50% 25%" },
  { src: "/photography/concerts/amf-18.jpg", title: "Chito Miranda", note: "Parokya ni Edgar, Aurora Music Festival", pos: "50% 25%" },
  { src: "/photography/concerts/amf-48.jpg", title: "Blaster Silonga", note: "IV of Spades, Aurora Music Festival", pos: "50% 25%" },
  { src: "/photography/concerts/amf-37.jpg", title: "Sexbomb Girls", note: "Main stage, Aurora Music Festival", pos: "50% 40%" },
  { src: "/photography/concerts/photography-1.jpg", title: "Stage illumination", note: "Concert lighting", pos: "50% 50%" },
  { src: "/photography/landscapes/photography-12.jpg", title: "Coastal Waves", note: "Landscape", pos: "50% 50%" },
  { src: "/photography/astro/photography-17.jpg", title: "Blood Moon", note: "Total lunar eclipse", pos: "50% 50%" },
  { src: "/photography/landscapes/photography-11.jpg", title: "Sunset Horizon", note: "Landscape", pos: "50% 50%" },
  { src: "/photography/landscapes/yuchengco-hall.jpg", title: "Yuchengco Hall", note: "De La Salle University, Manila", pos: "50% 35%" },
  { src: "/photography/landscapes/venice-grand-canal.jpg", title: "Grand Canal After Dark", note: "Venice Grand Canal Mall, Taguig", pos: "50% 60%" },
  { src: "/photography/events/itfest.jpg", title: "IT Fest", note: "CLSU IT Student Council", pos: "50% 50%" },
] as const;

type Size = "small" | "medium" | "large";
const SIZES: Record<Size, { label: string; cols: number; rows: number; pairs: number }> = {
  small: { label: "Small", cols: 4, rows: 3, pairs: 6 },
  medium: { label: "Medium", cols: 4, rows: 4, pairs: 8 },
  large: { label: "Large", cols: 6, rows: 4, pairs: 12 },
};
const BEST_KEY = (size: Size) => `contact-sheet-best-${size}`;
const MISMATCH_MS = 900;

interface Tile {
  /** Index into PHOTOS: two tiles share each one */
  photo: number;
  /** Frame label on the back, like a film contact sheet: 1A, 2A, ... */
  frame: string;
}
interface Best {
  moves: number;
  ms: number;
}

function shuffle<T>(xs: T[]) {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function deal(size: Size): Tile[] {
  const picks = shuffle(PHOTOS.map((_, i) => i)).slice(0, SIZES[size].pairs);
  return shuffle([...picks, ...picks]).map((photo, i) => ({ photo, frame: `${i + 1}A` }));
}

const clock = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

const better = (a: Best, b: Best | null) => !b || a.moves < b.moves || (a.moves === b.moves && a.ms < b.ms);

export default function ContactSheet() {
  const [size, setSize] = useState<Size>("small");
  const [deck, setDeck] = useState<Tile[]>([]);
  const [up, setUp] = useState<number[]>([]);
  const [matched, setMatched] = useState<boolean[]>([]);
  const [moves, setMoves] = useState(0);
  const [status, setStatus] = useState<"ready" | "playing" | "won">("ready");
  const [result, setResult] = useState<{ ms: number; newBest: boolean } | null>(null);
  const [best, setBest] = useState<Best | null>(null);
  const [focus, setFocus] = useState(0);
  const [announce, setAnnounce] = useState("");
  const { play, muted, toggleMute } = useArcadeSound();
  const startedAt = useRef(0);
  const clockRef = useRef<HTMLSpanElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const tileRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const flipBack = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cfg = SIZES[size];

  const loadBest = useCallback((s: Size) => {
    try {
      const raw = localStorage.getItem(BEST_KEY(s));
      return raw ? (JSON.parse(raw) as Best) : null;
    } catch {
      return null;
    }
  }, []);

  const newGame = useCallback(
    (s: Size) => {
      if (flipBack.current) clearTimeout(flipBack.current);
      const d = deal(s);
      setSize(s);
      setDeck(d);
      setUp([]);
      setMatched(d.map(() => false));
      setMoves(0);
      setStatus("ready");
      setResult(null);
      setFocus(0);
      setAnnounce("");
      setBest(loadBest(s));
      startedAt.current = 0;
      if (clockRef.current) clockRef.current.textContent = "0:00";
    },
    [loadBest],
  );

  // Deal on mount (in the browser, so the shuffle never mismatches the server render)
  useEffect(() => {
    queueMicrotask(() => newGame("small"));
    return () => {
      if (flipBack.current) clearTimeout(flipBack.current);
    };
  }, [newGame]);

  // The clock: written straight into the DOM a few times a second, no re-renders
  useEffect(() => {
    if (status !== "playing") return;
    const id = setInterval(() => {
      if (clockRef.current && startedAt.current) clockRef.current.textContent = clock(performance.now() - startedAt.current);
    }, 250);
    return () => clearInterval(id);
  }, [status]);

  const win = (finalMoves: number) => {
    const ms = performance.now() - startedAt.current;
    if (clockRef.current) clockRef.current.textContent = clock(ms);
    const record = { moves: finalMoves, ms };
    const previous = loadBest(size);
    const newBest = better(record, previous);
    if (newBest) {
      try {
        localStorage.setItem(BEST_KEY(size), JSON.stringify(record));
      } catch {}
      setBest(record);
    }
    setStatus("won");
    setResult({ ms, newBest });
    setAnnounce(`Sheet complete in ${finalMoves} moves and ${clock(ms)}.${newBest ? " New best." : ""}`);
    play("keeper");
    haptic(30);
    // A cheap finish: each print lifts in a wave, transforms only
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
      tileRefs.current.forEach((el, i) => {
        const col = i % cfg.cols;
        const row = Math.floor(i / cfg.cols);
        el?.animate([{ transform: "none" }, { transform: "translateY(-8%) scale(1.06)" }, { transform: "none" }], { duration: 520, delay: (row + col) * 55, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" });
      });
    }
  };

  const flip = (i: number) => {
    if (status === "won" || !deck[i] || matched[i] || up.includes(i)) return;
    if (!startedAt.current) {
      startedAt.current = performance.now();
      setStatus("playing");
    }
    play("tick");
    haptic(6);
    // A pending mismatch flips back straight away, so fast players never wait
    let open = up;
    if (open.length === 2) {
      if (flipBack.current) clearTimeout(flipBack.current);
      open = [];
    }
    const next = [...open, i];
    const photo = PHOTOS[deck[i].photo];
    if (next.length < 2) {
      setUp(next);
      setAnnounce(`${photo.title}. Pick its pair.`);
      return;
    }
    const [a, b] = next;
    const m = moves + 1;
    setMoves(m);
    if (deck[a].photo === deck[b].photo) {
      const nowMatched = matched.map((x, k) => x || k === a || k === b);
      setMatched(nowMatched);
      setUp([]);
      play("right");
      if (nowMatched.every(Boolean)) win(m);
      else setAnnounce(`Pair: ${photo.title}, ${photo.note}.`);
    } else {
      setUp(next);
      setAnnounce(`${photo.title}. Not a pair.`);
      flipBack.current = setTimeout(() => setUp([]), MISMATCH_MS);
    }
  };

  // Arrow keys move between tiles (roving tab stop); Enter and Space flip natively
  const onKeyDown = (e: KeyboardEvent) => {
    const keys: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: 0, ArrowDown: 0, Home: 0, End: 0 };
    if (!(e.key in keys) || !gridRef.current) return;
    e.preventDefault();
    const cols = getComputedStyle(gridRef.current).gridTemplateColumns.split(" ").length || cfg.cols;
    const n = deck.length;
    let to = focus;
    if (e.key === "ArrowLeft") to = Math.max(0, focus - 1);
    else if (e.key === "ArrowRight") to = Math.min(n - 1, focus + 1);
    else if (e.key === "ArrowUp") to = focus - cols >= 0 ? focus - cols : focus;
    else if (e.key === "ArrowDown") to = focus + cols < n ? focus + cols : focus;
    else if (e.key === "Home") to = 0;
    else if (e.key === "End") to = n - 1;
    setFocus(to);
    tileRefs.current[to]?.focus();
  };

  const pairsFound = matched.filter(Boolean).length / 2;
  const tiles = deck.length ? deck : Array.from({ length: cfg.pairs * 2 }, (_, i) => ({ photo: -1, frame: `${i + 1}A` }));

  return (
    // Enter belongs to this game while focus is inside it, not to page-wide shortcuts
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-10" onKeyDown={(e) => e.key === "Enter" && e.stopPropagation()}>
      <div className={cn("relative mx-auto w-full min-w-0 lg:mx-0", size === "large" ? "max-w-[48rem]" : size === "medium" ? "max-w-[34rem]" : "max-w-[36rem]")}>
        <div
          ref={gridRef}
          role="group"
          aria-label={`Contact sheet, ${tiles.length} face-down prints. Arrow keys move between them; Enter or Space turns one over.`}
          onKeyDown={onKeyDown}
          className={cn("grid gap-2 rounded-[2px] bg-ink p-2 sm:gap-2.5 sm:p-3", size === "large" ? "grid-cols-4 sm:grid-cols-6" : "grid-cols-4")}
        >
          {tiles.map((t, i) => {
            const photo = t.photo >= 0 ? PHOTOS[t.photo] : null;
            const faceUp = up.includes(i) || !!matched[i];
            return (
              <button
                key={`${size}-${i}`}
                ref={(el) => {
                  tileRefs.current[i] = el;
                }}
                type="button"
                tabIndex={i === focus ? 0 : -1}
                disabled={!photo}
                onClick={() => {
                  setFocus(i);
                  flip(i);
                }}
                onFocus={() => setFocus(i)}
                aria-label={!photo ? `Print ${t.frame}` : matched[i] ? `${photo.title}, paired` : faceUp ? `${photo.title}, face up` : `Print ${t.frame}, face down`}
                className="group relative aspect-square min-h-11 min-w-11 rounded-[3px] perspective-[700px] focus-visible:outline-offset-2"
              >
                <span
                  className={cn(
                    "absolute inset-0 rounded-[3px] transform-3d transition-transform duration-500 ease-[cubic-bezier(0.3,0.7,0.2,1)] motion-reduce:transition-none",
                    faceUp && "[transform:rotateY(180deg)]",
                  )}
                >
                  {/* Back: a frame of film, numbered like a contact sheet */}
                  <span className="absolute inset-0 flex flex-col justify-between overflow-hidden rounded-[3px] bg-[#0b2234] ring-1 ring-paper/10 backface-hidden pointer-fine:group-hover:ring-sky/60">
                    <span className="h-[9%] bg-[repeating-linear-gradient(90deg,transparent_0_14%,rgba(253,240,213,0.18)_14%_24%)]" />
                    <span className="flex flex-1 items-center justify-center text-sky/70">
                      <Icon name="camera" className="h-[32%] w-[32%]" />
                    </span>
                    <span className="px-1.5 pb-1 text-right font-mono text-[0.55rem] leading-none text-[#ffd27a]/70 sm:text-[0.6rem]">{t.frame}</span>
                  </span>
                  {/* Front: the photograph */}
                  <span className={cn("absolute inset-0 overflow-hidden rounded-[3px] bg-ink [transform:rotateY(180deg)] backface-hidden", matched[i] && "ring-2 ring-[#7bd88f]")}>
                    {photo && <Image src={photo.src} alt="" fill sizes="(min-width: 1024px) 120px, (min-width: 640px) 16vw, 24vw" className="object-cover" style={{ objectPosition: photo.pos }} />}
                    {matched[i] && (
                      <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#2e8b57] text-paper shadow">
                        <Icon name="check" className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {status === "won" && result && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
            <div className="animate-pop-in pointer-events-auto w-full max-w-xs rounded-[2px] bg-paper p-5 text-center text-ink shadow-2xl ring-1 ring-ink/10">
              <p className="label text-[0.55rem] text-ember">Sheet complete</p>
              <p className="mt-2 font-display text-5xl leading-none">
                {moves}
                <span className="font-serif text-2xl text-ink/55"> moves</span>
              </p>
              <p className="mt-2 font-serif text-ink/70 italic">
                {clock(result.ms)} · {moves === cfg.pairs ? "a perfect sheet" : `perfect is ${cfg.pairs}`}
              </p>
              {result.newBest && (
                <p className="label mt-2 flex items-center justify-center gap-1.5 text-[0.55rem] text-[#2e8b57]">
                  <Icon name="trophy" className="h-3.5 w-3.5" /> New best
                </p>
              )}
              <button type="button" onClick={() => newGame(size)} className="btn mt-4 bg-ink py-3 text-paper pointer-fine:hover:bg-wine">
                <Icon name="refresh" className="h-4 w-4" /> Deal again
              </button>
            </div>
          </div>
        )}
      </div>

      <aside className="flex flex-col gap-5">
        <dl className="grid grid-cols-3 gap-2 lg:grid-cols-1 lg:gap-3">
          {[
            ["Moves", <span key="m" className="tabular-nums">{moves}</span>],
            [
              "Time",
              <span key="t" ref={clockRef} className="tabular-nums">
                0:00
              </span>,
            ],
            ["Pairs", <span key="p" className="tabular-nums">{`${pairsFound}/${cfg.pairs}`}</span>],
          ].map(([k, v]) => (
            <div key={k as string} className="rounded-[2px] bg-paper-deep/60 px-3 py-2.5 ring-1 ring-ink/10 lg:flex lg:items-baseline lg:justify-between">
              <dt className="label text-[0.52rem] text-ink/55">{k}</dt>
              <dd className="mt-1 font-display text-2xl leading-none lg:mt-0">{v}</dd>
            </div>
          ))}
        </dl>

        <div>
          <p id="sheet-size" className="label text-[0.52rem] text-ink/55">
            Sheet size
          </p>
          <div role="radiogroup" aria-labelledby="sheet-size" className="mt-2 grid grid-cols-3 gap-1 rounded-full bg-ink/[0.06] p-1">
            {(Object.keys(SIZES) as Size[]).map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={size === s}
                aria-label={`${SIZES[s].label}: ${SIZES[s].pairs * 2} tiles`}
                onClick={() => newGame(s)}
                className={cn("label flex min-h-11 flex-col items-center justify-center rounded-full px-2 text-[0.55rem] leading-tight transition-colors", size === s ? "bg-ink text-paper" : "text-ink/70 pointer-fine:hover:text-ink")}
              >
                {SIZES[s].label}
                <span className="text-[0.48rem] opacity-70">{SIZES[s].pairs * 2} tiles</span>
              </button>
            ))}
          </div>
        </div>

        <p className="font-serif text-ink/70 italic">
          {best ? (
            <>
              Your best on this sheet: <span className="not-italic text-ink">{best.moves} moves</span> in {clock(best.ms)}.
            </>
          ) : (
            "Turn two prints at a time and find the pairs. Fewer moves beats a faster clock."
          )}
        </p>

        <div className="flex gap-2">
          <button type="button" onClick={() => newGame(size)} className="btn min-h-11 flex-1 bg-ink py-3 text-paper pointer-fine:hover:bg-wine">
            <Icon name="refresh" className="h-4 w-4" /> New deal
          </button>
          <button type="button" onClick={toggleMute} aria-label={muted ? "Turn sound on" : "Turn sound off"} aria-pressed={!muted} className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full ring-1 ring-ink/15">
            <Icon name={muted ? "mute" : "volume"} className="h-4.5 w-4.5" />
          </button>
        </div>
        <p className="sr-only" aria-live="polite">
          {announce}
        </p>
      </aside>
    </div>
  );
}
