"use client";

import { useEffect, useRef, useState } from "react";
import { haptic } from "@/lib/haptics";
import { useImmersive } from "@/lib/immersive";
import { levelFor, makeQuestion, type QuizQuestion } from "@/lib/tools/subnet-quiz";
import { cn } from "@/lib/utils";
import { useArcadeSound } from "./arcade-sound";

// Subnet Sprint: you're the router. Each question arrives as a packet; send
// it out of the right port (A–D) before the clock runs out. Right answers
// fly down the link, wrong ones are dropped. Streaks raise the level and
// earn time back. Answers come from the Lab's subnet maths.

const ROUND_MS = 60_000;
const BEST_KEY = "subnet-sprint-best";
const PORTS = ["A", "B", "C", "D"] as const;
const PORT_COLORS = ["#c1121f", "#669bbc", "#ffd27a", "#b9a0e8"];

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  life: number;
  color: string;
}
interface Float {
  x: number;
  y: number;
  text: string;
  life: number;
  color: string;
}

const PORT_Y = (i: number) => 0.17 + i * 0.22;

/** Rounded rectangle, falling back to square corners on browsers without roundRect. */
function box(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  if (g.roundRect) g.roundRect(x, y, w, h, r);
  else g.rect(x, y, w, h);
}
const ROUTER = { x: 0.4, y: 0.5 };
const PORT_X = 0.86;

export default function SubnetSprint() {
  const [state, setState] = useState<"idle" | "playing" | "over">("idle");
  const [q, setQ] = useState<QuizQuestion | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [stats, setStats] = useState({ answered: 0, right: 0, bestStreak: 0 });
  const [left, setLeft] = useState(ROUND_MS);
  const [feedback, setFeedback] = useState<{ choice: string; right: boolean } | null>(null);
  const [best, setBest] = useState<number | null>(null);
  const { play, muted, toggleMute } = useArcadeSound();
  const endsAt = useRef(0);
  const scoreRef = useRef(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scene = useRef({
    phase: "idle" as "idle" | "incoming" | "waiting" | "routing" | "dropped",
    t: 0,
    tag: "",
    target: 0,
    pieces: [] as Piece[],
    floats: [] as Float[],
    flash: [0, 0, 0, 0],
    flashColor: ["", "", "", ""],
    traffic: Array.from({ length: 10 }, (_, i) => ({ link: i % 4, k: (i * 0.37) % 1, speed: 0.25 + ((i * 0.61) % 1) * 0.4 })),
    packetX: 0,
    packetY: 0,
  });
  const level = levelFor(streak);
  useImmersive(state === "playing");

  useEffect(() => {
    try {
      const b = Number(localStorage.getItem(BEST_KEY)) || null;
      queueMicrotask(() => setBest(b));
    } catch {}
  }, []);

  // Clock
  useEffect(() => {
    if (state !== "playing") return;
    const id = setInterval(() => {
      const remaining = Math.max(0, endsAt.current - Date.now());
      setLeft(remaining);
      if (remaining === 0) {
        setState("over");
        scene.current.phase = "idle";
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

  // The network diagram, animated on a canvas behind the question
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const g = canvas.getContext("2d")!;
    let raf = 0;
    let last = performance.now();
    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(canvas);
    const fit = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(wrap.clientWidth * dpr);
      canvas.height = Math.round(wrap.clientHeight * dpr);
    };
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    fit();

    const linkPoint = (i: number, k: number) => {
      // A gentle curve from the router out to port i
      const x0 = ROUTER.x + 0.05;
      const y0 = ROUTER.y;
      const x1 = PORT_X - 0.05;
      const y1 = PORT_Y(i);
      const cx = (x0 + x1) / 2;
      const x = (1 - k) * (1 - k) * x0 + 2 * (1 - k) * k * cx + k * k * x1;
      const y = (1 - k) * (1 - k) * y0 + 2 * (1 - k) * k * y0 + k * k * y1;
      return [x, y] as const;
    };

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
      last = now;
      if (!visible) return;
      const s = scene.current;
      const W = canvas.width;
      const H = canvas.height;
      const u = Math.min(W, H * 1.6) / 100;
      s.t += dt;

      g.clearRect(0, 0, W, H);
      // Grid
      g.strokeStyle = "rgba(253,240,213,0.05)";
      g.lineWidth = 1;
      for (let x = 0; x < W; x += u * 6) {
        g.beginPath();
        g.moveTo(x, 0);
        g.lineTo(x, H);
        g.stroke();
      }
      for (let y = 0; y < H; y += u * 6) {
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(W, y);
        g.stroke();
      }

      // Uplink from the internet
      g.strokeStyle = "rgba(102,155,188,0.35)";
      g.lineWidth = u * 0.5;
      g.setLineDash([u * 1.2, u * 1.2]);
      g.lineDashOffset = -s.t * u * 6;
      g.beginPath();
      g.moveTo(0.12 * W, 0.5 * H);
      g.lineTo((ROUTER.x - 0.05) * W, ROUTER.y * H);
      g.stroke();
      g.setLineDash([]);

      // Links to the four ports, with background traffic
      for (let i = 0; i < 4; i++) {
        g.strokeStyle = `${PORT_COLORS[i]}55`;
        g.lineWidth = u * 0.45;
        g.beginPath();
        for (let k = 0; k <= 1.001; k += 0.05) {
          const [x, y] = linkPoint(i, k);
          if (k === 0) g.moveTo(x * W, y * H);
          else g.lineTo(x * W, y * H);
        }
        g.stroke();
      }
      for (const p of s.traffic) {
        p.k = (p.k + p.speed * dt) % 1;
        const [x, y] = linkPoint(p.link, p.k);
        g.fillStyle = `${PORT_COLORS[p.link]}aa`;
        g.beginPath();
        g.arc(x * W, y * H, u * 0.55, 0, Math.PI * 2);
        g.fill();
      }

      // Cloud
      g.fillStyle = "rgba(253,240,213,0.12)";
      for (const [dx, dy, r] of [
        [0, 0, 4.2],
        [3.6, 0.8, 3.2],
        [-3.6, 1, 3],
        [1.2, -2.4, 3],
      ] as const) {
        g.beginPath();
        g.arc(0.08 * W + dx * u, 0.5 * H + dy * u, r * u, 0, Math.PI * 2);
        g.fill();
      }

      // Router
      const rw = u * 10;
      const rh = u * 7;
      g.fillStyle = "#0f2b40";
      g.strokeStyle = "rgba(253,240,213,0.4)";
      g.lineWidth = u * 0.3;
      box(g, ROUTER.x * W - rw / 2, ROUTER.y * H - rh / 2, rw, rh, u * 1.4);
      g.fill();
      g.stroke();
      for (let i = 0; i < 4; i++) {
        const on = Math.sin(s.t * 9 + i * 2.1) > 0;
        g.fillStyle = on ? PORT_COLORS[i] : "rgba(253,240,213,0.15)";
        g.beginPath();
        g.arc(ROUTER.x * W - rw * 0.3 + i * rw * 0.2, ROUTER.y * H + rh * 0.28, u * 0.5, 0, Math.PI * 2);
        g.fill();
      }

      // Ports
      for (let i = 0; i < 4; i++) {
        const x = PORT_X * W;
        const y = PORT_Y(i) * H;
        s.flash[i] = Math.max(0, s.flash[i] - dt * 1.6);
        const pw = u * 9;
        const ph = u * 5.4;
        g.fillStyle = "#0f2b40";
        box(g, x - pw / 2, y - ph / 2, pw, ph, u);
        g.fill();
        if (s.flash[i] > 0) {
          g.fillStyle = `${s.flashColor[i]}${Math.round(s.flash[i] * 200)
            .toString(16)
            .padStart(2, "0")}`;
          g.fill();
        }
        g.strokeStyle = PORT_COLORS[i];
        g.lineWidth = u * 0.35;
        g.stroke();
        g.fillStyle = "#fdf0d5";
        g.font = `bold ${Math.round(u * 2.6)}px ui-monospace, monospace`;
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText(PORTS[i], x, y);
      }

      // The packet
      const ease = (k: number) => 1 - Math.pow(1 - Math.min(1, k), 3);
      let px = 0;
      let py = 0;
      let showPacket = true;
      if (s.phase === "incoming") {
        const k = ease(s.t / 0.45);
        px = 0.12 + (ROUTER.x - 0.12) * k;
        py = 0.5;
        if (s.t > 0.45) {
          s.phase = "waiting";
          s.t = 0;
        }
      } else if (s.phase === "waiting") {
        px = ROUTER.x;
        py = ROUTER.y - 0.2 + Math.sin(s.t * 3) * 0.015;
      } else if (s.phase === "routing") {
        const k = ease(s.t / 0.32);
        [px, py] = linkPoint(s.target, k);
        if (s.t > 0.32) {
          s.phase = "idle";
          s.flash[s.target] = 1;
          s.flashColor[s.target] = "#2e8b57";
          for (let i = 0; i < 18; i++) {
            const a = Math.random() * Math.PI * 2;
            s.pieces.push({ x: PORT_X, y: PORT_Y(s.target), vx: Math.cos(a) * 0.35, vy: Math.sin(a) * 0.35 - 0.2, rot: 0, vr: 0, life: 0.8, color: "#7bd88f" });
          }
        }
      } else showPacket = false;
      if (showPacket) {
        s.packetX = px;
        s.packetY = py;
        const label = s.tag;
        g.font = `bold ${Math.round(u * 2.3)}px ui-monospace, monospace`;
        const tw = Math.max(u * 8, g.measureText(label).width + u * 3);
        const th = u * 4.6;
        g.shadowColor = "#669bbc";
        g.shadowBlur = u * 3;
        g.fillStyle = "#669bbc";
        box(g, px * W - tw / 2, py * H - th / 2, tw, th, u * 1.2);
        g.fill();
        g.shadowBlur = 0;
        g.fillStyle = "#003049";
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText(label, px * W, py * H);
      }

      // Dropped packets tumble away; bursts and floating points fade
      for (const p of s.pieces) {
        p.vy += 1.6 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        p.life -= dt;
        g.save();
        g.globalAlpha = Math.max(0, Math.min(1, p.life * 1.4));
        g.translate(p.x * W, p.y * H);
        g.rotate(p.rot);
        g.fillStyle = p.color;
        g.fillRect(-u * 0.8, -u * 0.8, u * 1.6, u * 1.6);
        g.restore();
      }
      s.pieces = s.pieces.filter((p) => p.life > 0 && p.y < 1.3);
      for (const f of s.floats) {
        f.y -= dt * 0.12;
        f.life -= dt;
        g.globalAlpha = Math.max(0, Math.min(1, f.life * 1.5));
        g.fillStyle = f.color;
        g.font = `bold ${Math.round(u * 3)}px ui-monospace, monospace`;
        g.textAlign = "center";
        g.fillText(f.text, f.x * W, f.y * H);
        g.globalAlpha = 1;
      }
      s.floats = s.floats.filter((f) => f.life > 0);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
    };
  }, []);

  const send = (next: QuizQuestion) => {
    setQ(next);
    Object.assign(scene.current, { phase: "incoming", t: 0, tag: next.tag });
  };

  const start = () => {
    haptic();
    play("tick");
    endsAt.current = Date.now() + ROUND_MS;
    setScore(0);
    scoreRef.current = 0;
    setStreak(0);
    setStats({ answered: 0, right: 0, bestStreak: 0 });
    setLeft(ROUND_MS);
    setFeedback(null);
    send(makeQuestion(1));
    setState("playing");
  };

  const answer = (index: number) => {
    if (!q || feedback || state !== "playing") return;
    const choice = q.options[index];
    const right = choice === q.answer;
    const s = scene.current;
    haptic(right ? 8 : 30);
    play(right ? "right" : "wrong");
    setFeedback({ choice, right });
    const nextStreak = right ? streak + 1 : 0;
    setStats((x) => ({ answered: x.answered + 1, right: x.right + (right ? 1 : 0), bestStreak: Math.max(x.bestStreak, nextStreak) }));
    if (right) {
      const points = 10 + Math.min(streak, 6) * 2 + (level - 1) * 5;
      scoreRef.current += points;
      setScore(scoreRef.current);
      Object.assign(s, { phase: "routing", t: 0, target: index });
      s.floats.push({ x: PORT_X - 0.08, y: PORT_Y(index) - 0.06, text: `+${points}`, life: 1, color: "#7bd88f" });
      // Streaks of 3+ earn a second back on the clock
      if (nextStreak >= 3) {
        endsAt.current += 1000;
        s.floats.push({ x: 0.82, y: 0.06, text: "+1s", life: 1, color: "#ffd27a" });
      }
    } else {
      const correct = q.options.indexOf(q.answer);
      s.flash[index] = 1;
      s.flashColor[index] = "#c1121f";
      s.flash[correct] = 1;
      s.flashColor[correct] = "#2e8b57";
      for (let i = 0; i < 12; i++)
        s.pieces.push({ x: s.packetX + (Math.random() - 0.5) * 0.04, y: s.packetY, vx: (Math.random() - 0.5) * 0.5, vy: -Math.random() * 0.4, rot: 0, vr: (Math.random() - 0.5) * 12, life: 1.4, color: i % 2 ? "#c1121f" : "#669bbc" });
      s.phase = "dropped";
    }
    setStreak(nextStreak);
    setTimeout(
      () => {
        setFeedback(null);
        send(makeQuestion(levelFor(nextStreak)));
      },
      right ? 520 : 1900,
    );
  };

  // Keys 1–4 or A–D answer; Enter starts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      const box = wrapRef.current?.getBoundingClientRect();
      if (!box || box.bottom < 0 || box.top > innerHeight) return; // only when the game is on screen
      if (state !== "playing") return;
      const k = e.key.toLowerCase();
      const i = ["1", "2", "3", "4"].indexOf(k) >= 0 ? Number(k) - 1 : ["a", "b", "c", "d"].indexOf(k);
      if (i >= 0) {
        e.preventDefault();
        answer(i);
      }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  });

  const accuracy = stats.answered ? Math.round((stats.right / stats.answered) * 100) : 0;

  return (
    <div className="flex min-h-[30rem] flex-col overflow-hidden rounded-[2px] bg-ink text-paper">
      <div className="flex items-center justify-between gap-3 px-5 pt-5 md:px-7 md:pt-6">
        <p className="label text-[0.58rem] text-sky">Subnet Sprint{state === "playing" ? ` · Level ${level}` : ""}</p>
        <div className="flex items-center gap-2">
          <p className="label text-[0.58rem] text-paper/70 tabular-nums">
            {state === "playing" ? `${Math.ceil(left / 1000)}s · ${score} pts${streak > 1 ? ` · 🔥${streak}` : ""}` : best ? `Best ${best} pts` : "60 seconds"}
          </p>
          <button type="button" onClick={toggleMute} aria-label={muted ? "Sound off" : "Sound on"} className="label press rounded-full bg-paper/10 px-2 py-1 text-[0.55rem]">
            {muted ? "🔇" : "🔊"}
          </button>
        </div>
      </div>
      {state === "playing" && (
        <div className="mx-5 mt-3 h-1 overflow-hidden rounded-full bg-paper/10 md:mx-7">
          <div className="h-full rounded-full bg-ember transition-[width] duration-100 ease-linear" style={{ width: `${Math.min(100, (left / ROUND_MS) * 100)}%` }} />
        </div>
      )}

      <div ref={wrapRef} className="relative mx-5 mt-4 aspect-[16/9] md:mx-7">
        <canvas ref={canvasRef} aria-hidden className="absolute inset-0 h-full w-full" />
        {state !== "playing" && (
          <div className="absolute inset-0 flex flex-col items-start justify-center gap-3 bg-ink/70 p-4 backdrop-blur-[1px]">
            {state === "over" ? (
              <>
                <p className="font-display text-5xl leading-none">
                  {score} <span className="font-serif text-2xl text-paper/60">pts</span>
                </p>
                <p className="font-serif text-paper/75 italic">
                  {stats.right}/{stats.answered} routed · {accuracy}% accuracy · best streak {stats.bestStreak}
                </p>
                <p className="label text-[0.55rem] text-sky">{best === score && score > 0 ? "New personal best 🎉" : best ? `Your best: ${best}` : ""}</p>
              </>
            ) : (
              <p className="max-w-sm font-serif text-lg leading-snug text-paper/85">
                You&apos;re the router. Each packet asks a subnetting question — send it out of the right port before the clock runs out. Streaks level you up and buy time back.
              </p>
            )}
            <button type="button" onClick={start} className="btn bg-paper py-3 text-ink hover:bg-sky">
              {state === "over" ? "Route again" : "Start the clock"} <span className="arrow">→</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col px-5 pt-4 pb-5 md:px-7 md:pb-7">
        {state === "playing" && q ? (
          <div key={q.prompt} className={cn("animate-pop-in flex flex-1 flex-col", feedback && !feedback.right && "animate-wiggle")}>
            <p className="font-display text-[clamp(1.4rem,3.4vw,2.1rem)] leading-tight">{q.prompt}</p>
            <p className="mt-1 min-h-[1.5em] font-serif text-paper/60 italic" aria-live="polite">
              {feedback && !feedback.right ? <span className="text-[#ffd27a] not-italic">{q.why}</span> : q.hint}
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {q.options.map((o, i) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => answer(i)}
                  className={cn(
                    "press flex items-center gap-3 rounded-xl px-3 py-3 text-left font-mono text-sm ring-1 ring-paper/15 transition-colors",
                    !feedback && "bg-paper/[0.06] hover:bg-paper hover:text-ink",
                    feedback && o === q.answer && "bg-[#2e8b57] text-paper ring-[#2e8b57]",
                    feedback && feedback.choice === o && !feedback.right && "bg-ember text-paper ring-ember",
                    feedback && o !== q.answer && feedback.choice !== o && "opacity-40",
                  )}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold text-ink" style={{ background: PORT_COLORS[i] }}>
                    {PORTS[i]}
                  </span>
                  <span className="min-w-0 break-all">{o}</span>
                </button>
              ))}
            </div>
            <p className="label mt-3 hidden text-[0.5rem] text-paper/40 md:block">Keys 1–4 or A–D</p>
          </div>
        ) : (
          <p className="font-serif text-paper/60 italic">Hosts, masks, wildcards, network and broadcast addresses, and which subnet a host lives in — the everyday maths behind Neil&apos;s network designs.</p>
        )}
      </div>
    </div>
  );
}
