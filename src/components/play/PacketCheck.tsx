"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/Icon";
import { haptic } from "@/lib/haptics";
import { useImmersive } from "@/lib/immersive";
import { makeRound, ROUND_LENGTH, type QuizMode, type QuizQuestion } from "@/lib/tools/subnet-quiz";
import { cn } from "@/lib/utils";
import { useArcadeSound } from "./arcade-sound";

// Packet Check: a networking and security quiz. You're the router: each
// question arrives as a packet; send it out of the right port (A to D).
// No clock. Three lives, a short explanation after every answer, and a
// streak of four wins a life back. The animated diagram runs on a canvas
// from refs, so React only re-renders when the player answers.

const LIVES = 3;
const BEST_KEY = (mode: QuizMode) => `packet-check-best-${mode}`;
const PORTS = ["A", "B", "C", "D"] as const;
const PORT_COLORS = ["#c1121f", "#669bbc", "#ffd27a", "#b9a0e8"];

const MODES: { id: QuizMode; label: string; line: string }[] = [
  { id: "mixed", label: "Mixed", line: "A bit of both, taking turns. A good place to start." },
  { id: "networks", label: "Networks", line: "IP addresses, routers and switches, Wi-Fi, ports, DNS and DHCP, plus a little subnetting." },
  { id: "security", label: "Security", line: "Phishing, passwords and MFA, public Wi-Fi, scams, updates and backups." },
];

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

export default function PacketCheck() {
  const [state, setState] = useState<"idle" | "playing" | "over">("idle");
  const [mode, setMode] = useState<QuizMode>("mixed");
  const [round, setRound] = useState<QuizQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [stats, setStats] = useState({ right: 0, answered: 0, bestStreak: 0 });
  const [feedback, setFeedback] = useState<{ choice: string; right: boolean; regained: boolean } | null>(null);
  const [best, setBest] = useState<Partial<Record<QuizMode, number>>>({});
  const [newBest, setNewBest] = useState(false);
  const { play, muted, toggleMute } = useArcadeSound();
  const recent = useRef(new Set<string>());
  const nextRef = useRef<HTMLButtonElement>(null);
  const firstOptionRef = useRef<HTMLButtonElement>(null);
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
  const q = state === "playing" ? round[index] : null;
  useImmersive(state === "playing");

  useEffect(() => {
    try {
      const b: Partial<Record<QuizMode, number>> = {};
      for (const m of MODES) {
        const v = Number(localStorage.getItem(BEST_KEY(m.id)));
        if (v) b[m.id] = v;
      }
      queueMicrotask(() => setBest(b));
    } catch {}
  }, []);

  // After an answer, hand keyboard focus to "Next"; on a new question, to the first option
  useEffect(() => {
    if (state !== "playing") return;
    (feedback ? nextRef.current : firstOptionRef.current)?.focus({ preventScroll: true });
  }, [feedback, index, state]);

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
      g.beginPath();
      for (let x = 0; x < W; x += u * 6) {
        g.moveTo(x, 0);
        g.lineTo(x, H);
      }
      for (let y = 0; y < H; y += u * 6) {
        g.moveTo(0, y);
        g.lineTo(W, y);
      }
      g.stroke();

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
        s.flash[i] = Math.max(0, s.flash[i] - dt * 1.2);
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

  const send = (next: QuizQuestion) => Object.assign(scene.current, { phase: "incoming", t: 0, tag: next.tag });

  const start = (m: QuizMode = mode) => {
    haptic();
    play("tick");
    const r = makeRound(m, { recent: recent.current });
    for (const x of r) recent.current.add(x.id);
    // Remember about two rounds' worth, so replays keep dealing fresh cards
    if (recent.current.size > 26) recent.current = new Set([...recent.current].slice(-26));
    setMode(m);
    setRound(r);
    setIndex(0);
    setLives(LIVES);
    setScore(0);
    setStreak(0);
    setStats({ right: 0, answered: 0, bestStreak: 0 });
    setFeedback(null);
    setNewBest(false);
    send(r[0]);
    setState("playing");
  };

  const finish = (finalScore: number) => {
    setState("over");
    scene.current.phase = "idle";
    try {
      if (finalScore > (Number(localStorage.getItem(BEST_KEY(mode))) || 0)) {
        localStorage.setItem(BEST_KEY(mode), String(finalScore));
        setBest((b) => ({ ...b, [mode]: finalScore }));
        setNewBest(true);
      }
    } catch {}
  };

  const answer = (i: number) => {
    if (!q || feedback || state !== "playing") return;
    const choice = q.options[i];
    const right = choice === q.answer;
    const s = scene.current;
    haptic(right ? 8 : 30);
    play(right ? "right" : "wrong");
    const nextStreak = right ? streak + 1 : 0;
    // Forgiving: every four in a row wins back a lost life
    const regained = right && nextStreak % 4 === 0 && lives < LIVES;
    setStats((x) => ({ right: x.right + (right ? 1 : 0), answered: x.answered + 1, bestStreak: Math.max(x.bestStreak, nextStreak) }));
    setStreak(nextStreak);
    setFeedback({ choice, right, regained });
    if (right) {
      const points = 10 + Math.min(streak, 5) * 2;
      setScore((x) => x + points);
      Object.assign(s, { phase: "routing", t: 0, target: i });
      s.floats.push({ x: PORT_X - 0.1, y: PORT_Y(i) - 0.06, text: `+${points}`, life: 1.1, color: "#7bd88f" });
      if (regained) {
        setLives((l) => l + 1);
        s.floats.push({ x: 0.5, y: 0.12, text: "+1 life", life: 1.4, color: "#ffd27a" });
      }
    } else {
      const correct = q.options.indexOf(q.answer);
      s.flash[i] = 1;
      s.flashColor[i] = "#c1121f";
      s.flash[correct] = 1;
      s.flashColor[correct] = "#2e8b57";
      for (let k = 0; k < 12; k++)
        s.pieces.push({ x: s.packetX + (Math.random() - 0.5) * 0.04, y: s.packetY, vx: (Math.random() - 0.5) * 0.5, vy: -Math.random() * 0.4, rot: 0, vr: (Math.random() - 0.5) * 12, life: 1.4, color: k % 2 ? "#c1121f" : "#669bbc" });
      s.phase = "dropped";
      setLives((l) => l - 1);
    }
  };

  const next = () => {
    if (!feedback) return;
    play("tick");
    const out = lives <= 0 || index + 1 >= round.length;
    setFeedback(null);
    if (out) return finish(score);
    setIndex(index + 1);
    send(round[index + 1]);
  };

  // Keys 1–4 or A–D answer; N or Enter moves on (the focused Next button handles Enter itself)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (state !== "playing" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      const box = wrapRef.current?.getBoundingClientRect();
      if (!box || box.bottom < 0 || box.top > innerHeight) return; // only when the game is on screen
      const k = e.key.toLowerCase();
      if (feedback) {
        if (k === "n" || (k === "enter" && el !== nextRef.current)) {
          e.preventDefault();
          next();
        }
        return;
      }
      const i = ["1", "2", "3", "4"].indexOf(k) >= 0 ? Number(k) - 1 : ["a", "b", "c", "d"].indexOf(k);
      if (i >= 0) {
        e.preventDefault();
        answer(i);
      }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  });

  const outOfLives = state === "over" && lives <= 0;
  const accuracy = stats.answered ? Math.round((stats.right / stats.answered) * 100) : 0;
  const modeInfo = MODES.find((m) => m.id === mode)!;

  return (
    // Enter belongs to this game while focus is inside it, not to page-wide shortcuts
    <div className="flex flex-col overflow-hidden rounded-[2px] bg-ink text-paper" onKeyDown={(e) => e.key === "Enter" && e.stopPropagation()}>
      <div className="flex items-center justify-between gap-2 px-4 pt-3 sm:px-5 md:px-7 md:pt-4">
        {/* Narrow phones need the room for the score and lives while a round is on. */}
        <p className={cn("label min-w-0 truncate text-3xs text-sky", state === "playing" && "max-[400px]:hidden")}>
          Packet Check
          {state === "playing" && <span className="hidden text-paper/75 sm:inline"> · {modeInfo.label}</span>}
        </p>
        <div className="ml-auto flex items-center gap-1">
          {state === "playing" ? (
            <>
              <p className="label text-3xs whitespace-nowrap text-paper/70 tabular-nums">
                {Math.min(index + 1, ROUND_LENGTH)}/{ROUND_LENGTH} · {score} pts
              </p>
              <span className="ml-2 flex items-center gap-1" role="img" aria-label={`${lives} of ${LIVES} lives left`}>
                {Array.from({ length: LIVES }, (_, i) => (
                  <span key={i} className={cn("h-2.5 w-2.5 rounded-full transition-colors", i < lives ? "bg-ember shadow-[0_0_8px_#c1121f]" : "bg-paper/15")} />
                ))}
              </span>
            </>
          ) : (
            <p className="label text-3xs text-paper/70">{best[mode] ? `Best ${best[mode]} pts` : "No clock"}</p>
          )}
          <button type="button" onClick={toggleMute} aria-label={muted ? "Turn sound on" : "Turn sound off"} aria-pressed={!muted} className="press -mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-paper/80 hover:text-paper">
            <Icon name={muted ? "mute" : "volume"} className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      <div ref={wrapRef} className="relative mx-4 mt-1 aspect-[2/1] sm:mx-5 sm:aspect-[16/8] md:mx-7">
        <canvas ref={canvasRef} aria-hidden className="absolute inset-0 h-full w-full" />
      </div>

      <div className="flex flex-1 flex-col px-4 pt-3 pb-5 sm:px-5 md:px-7 md:pb-7">
        {state === "playing" && q ? (
          <div key={q.id} className="animate-pop-in flex flex-1 flex-col">
            <p className="label text-3xs text-paper/70">
              {q.kind === "card" ? (q.category === "security" ? "Security" : "Networks") : "Subnetting"} · question {index + 1}
            </p>
            <h4 className="mt-1.5 font-display text-[clamp(1.3rem,3.2vw,1.85rem)] leading-tight text-balance">{q.prompt}</h4>
            {q.hint && !feedback && <p className="mt-1 font-serif text-paper/75 italic">{q.hint}</p>}
            <div className="mt-4 grid gap-2 sm:grid-cols-2" role="group" aria-label="Answers">
              {q.options.map((o, i) => {
                const isAnswer = o === q.answer;
                const picked = feedback?.choice === o;
                return (
                  <button
                    key={o}
                    ref={i === 0 ? firstOptionRef : undefined}
                    type="button"
                    onClick={() => answer(i)}
                    aria-disabled={!!feedback}
                    aria-label={`${PORTS[i]}: ${o}${feedback && isAnswer ? ", correct answer" : feedback && picked ? ", your answer" : ""}`}
                    className={cn(
                      "press flex min-h-12 items-center gap-3 rounded-xl px-3 py-2.5 text-left ring-1 ring-paper/15 transition-colors",
                      q.kind === "card" ? "text-[0.95rem] leading-snug" : "font-mono text-sm",
                      !feedback && "bg-paper/[0.06] pointer-fine:hover:bg-paper pointer-fine:hover:text-ink",
                      feedback && isAnswer && "bg-[#2e8b57] text-paper ring-[#2e8b57]",
                      feedback && picked && !feedback.right && "animate-wiggle bg-ember text-paper ring-ember",
                      feedback && !isAnswer && !picked && "opacity-40",
                    )}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold text-ink" style={{ background: PORT_COLORS[i] }}>
                      {feedback && isAnswer ? <Icon name="check" className="h-4 w-4" /> : feedback && picked ? <Icon name="close" className="h-4 w-4" /> : PORTS[i]}
                    </span>
                    <span className="min-w-0 [overflow-wrap:anywhere]">{o}</span>
                  </button>
                );
              })}
            </div>

            <div aria-live="polite" className="mt-3">
              {feedback && (
                <div className={cn("animate-pop-in rounded-xl p-4 ring-1", feedback.right ? "bg-[#2e8b57]/15 ring-[#2e8b57]/50" : "bg-[#ffd27a]/10 ring-[#ffd27a]/40")}>
                  <p className={cn("label flex items-center gap-1.5 text-3xs", feedback.right ? "text-[#7bd88f]" : "text-[#ffd27a]")}>
                    <Icon name={feedback.right ? "check" : "info"} className="h-3.5 w-3.5" />
                    {feedback.right ? (feedback.regained ? "Correct · four in a row wins a life back" : streak > 2 ? `Correct · ${streak} in a row` : "Correct") : q.kind === "card" ? "Not quite · the right answer is in green" : `Not quite · it's ${q.answer}`}
                  </p>
                  <p className="mt-1.5 font-serif text-[1.02rem] leading-snug text-paper/85">{q.why}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="label text-3xs text-paper/70">{lives <= 0 ? "No lives left" : `${lives} ${lives === 1 ? "life" : "lives"} left`}</p>
                    <button ref={nextRef} type="button" onClick={next} className="btn min-h-11 bg-paper py-2.5 text-ink pointer-fine:hover:bg-sky">
                      {lives <= 0 || index + 1 >= round.length ? "See results" : "Next question"} <Icon name="arrow-right" className="arrow" />
                    </button>
                  </div>
                </div>
              )}
            </div>
            <p className="label mt-3 hidden text-3xs text-paper/70 md:block">Keys 1 to 4 or A to D answer · Enter for the next question</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {state === "over" && (
              <div className="animate-pop-in">
                <p className="label text-3xs text-sky">{outOfLives ? "Connection dropped" : "Round complete"}</p>
                <p className="mt-2 font-display text-5xl leading-none">
                  {score} <span className="font-serif text-2xl text-paper/75">pts</span>
                </p>
                <p className="mt-2 font-serif text-paper/75 italic">
                  {stats.right} of {stats.answered} right · {accuracy}% · best streak {stats.bestStreak}
                </p>
                {newBest && score > 0 && (
                  <p className="label mt-2 flex items-center gap-1.5 text-3xs text-[#ffd27a]">
                    <Icon name="trophy" className="h-3.5 w-3.5" /> New best for {modeInfo.label}
                  </p>
                )}
              </div>
            )}
            {state === "idle" && (
              <p className="max-w-md font-serif text-lg leading-snug text-paper/85">
                You&apos;re the router. Each packet carries a question; send it out of the right port. Twelve questions, three lives, no clock, and a short explanation after every answer.
              </p>
            )}
            <div>
              <p id="packet-mode" className="label text-3xs text-paper/70">
                Pick a deck
              </p>
              <div role="radiogroup" aria-labelledby="packet-mode" className="mt-2 grid grid-cols-3 gap-1.5 rounded-full bg-paper/[0.06] p-1">
                {MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    role="radio"
                    aria-checked={mode === m.id}
                    onClick={() => setMode(m.id)}
                    className={cn("label min-h-11 rounded-full px-2 text-3xs transition-colors", mode === m.id ? "bg-paper text-ink" : "text-paper/75 pointer-fine:hover:text-paper")}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 min-h-[3em] font-serif text-paper/75 italic">
                {modeInfo.line}
                {mode !== "networks" && (
                  <>
                    {" "}
                    The security cards follow Neil&apos;s{" "}
                    <Link href="/work/cyber-awareness-series" className="ulink text-paper not-italic">
                      Cyber Awareness Series
                    </Link>
                    .
                  </>
                )}
              </p>
            </div>
            <button type="button" onClick={() => start()} className="btn self-start bg-paper py-3 text-ink pointer-fine:hover:bg-sky">
              {state === "over" ? "Play again" : "Start the quiz"} <Icon name="arrow-right" className="arrow" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
