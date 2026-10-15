"use client";

import { useEffect, useRef, useState } from "react";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

// Shutter: concert photography as a timing game. The performer jumps around
// under strobes; press to shoot. A keeper is sharp (caught at the top of a
// jump), well lit (a strobe is firing) and framed (near the centre).

const ROLL = 5;
const BEST_KEY = "shutter-best";

interface Shot {
  score: number;
  verdict: "Keeper" | "Almost" | "Missed";
  why: string;
  thumb: string;
}

const LIGHTS = ["#c1121f", "#669bbc", "#ffd27a", "#b14bd6"];

export default function ShutterGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sim = useRef({ x: 0.5, y: 0, vy: 0, vx: 0.18, t: 0, strobe: 0, strobeColor: LIGHTS[0], flash: 0, nextJump: 0.6, nextStrobe: 0.5 });
  const [shots, setShots] = useState<Shot[]>([]);
  const [best, setBest] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const done = shots.length >= ROLL;
  const total = shots.reduce((s, x) => s + x.score, 0);

  useEffect(() => {
    try {
      const b = Number(localStorage.getItem(BEST_KEY)) || null;
      queueMicrotask(() => setBest(b));
    } catch {}
  }, []);

  // Animation loop: only runs while the game is on screen.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const g = canvas.getContext("2d")!;
    let raf = 0;
    let last = performance.now();
    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(canvas);

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!visible) return;
      const s = sim.current;
      const W = canvas.width;
      const H = canvas.height;
      s.t += dt;

      // Performer: wanders across the stage and jumps at random.
      s.x += s.vx * dt;
      if (s.x < 0.18 || s.x > 0.82) s.vx *= -1;
      if (Math.random() < dt * 0.6) s.vx = (Math.random() < 0.5 ? -1 : 1) * (0.1 + Math.random() * 0.25);
      s.nextJump -= dt;
      if (s.nextJump <= 0 && s.y === 0) {
        s.vy = 2.4 + Math.random() * 1.2;
        s.nextJump = 0.9 + Math.random() * 1.6;
      }
      s.vy -= 7 * dt;
      s.y = Math.max(0, s.y + s.vy * dt);
      if (s.y === 0) s.vy = 0;
      s.nextStrobe -= dt;
      if (s.nextStrobe <= 0) {
        s.strobe = 0.32;
        s.strobeColor = LIGHTS[Math.floor(Math.random() * LIGHTS.length)];
        s.nextStrobe = 0.5 + Math.random() * 1.2;
      }
      s.strobe = Math.max(0, s.strobe - dt);
      s.flash = Math.max(0, s.flash - dt * 3);

      // Stage
      const lit = s.strobe > 0;
      g.fillStyle = lit ? "#1b1030" : "#0a0f1a";
      g.fillRect(0, 0, W, H);
      for (let i = 0; i < 4; i++) {
        const bx = W * (0.15 + i * 0.23);
        const sway = Math.sin(s.t * 1.2 + i) * W * 0.12;
        const grd = g.createLinearGradient(bx, 0, bx + sway, H * 0.8);
        grd.addColorStop(0, `${LIGHTS[i]}${lit ? "aa" : "55"}`);
        grd.addColorStop(1, "transparent");
        g.fillStyle = grd;
        g.beginPath();
        g.moveTo(bx - 6, 0);
        g.lineTo(bx + 6, 0);
        g.lineTo(bx + sway + W * 0.08, H * 0.8);
        g.lineTo(bx + sway - W * 0.08, H * 0.8);
        g.fill();
      }
      if (lit) {
        g.fillStyle = `${s.strobeColor}33`;
        g.fillRect(0, 0, W, H);
      }
      g.fillStyle = "#1d2433";
      g.fillRect(0, H * 0.78, W, H * 0.22);

      // Performer silhouette with a guitar
      const px = s.x * W;
      const py = H * 0.78 - s.y * H * 0.18;
      g.fillStyle = lit ? "#fdf0d5" : "#43506a";
      g.beginPath();
      g.arc(px, py - H * 0.34, H * 0.045, 0, Math.PI * 2);
      g.fill();
      g.fillRect(px - H * 0.04, py - H * 0.29, H * 0.08, H * 0.17);
      g.fillRect(px - H * 0.035, py - H * 0.12, H * 0.025, H * 0.12);
      g.fillRect(px + H * 0.01, py - H * 0.12, H * 0.025, H * 0.12);
      g.save();
      g.translate(px, py - H * 0.2);
      g.rotate(-0.5);
      g.fillStyle = lit ? s.strobeColor : "#5b2a2a";
      g.fillRect(-H * 0.09, -H * 0.012, H * 0.2, H * 0.024);
      g.beginPath();
      g.ellipse(-H * 0.08, 0, H * 0.04, H * 0.03, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();

      // Crowd: hands bobbing at the barricade
      g.fillStyle = "#05070c";
      for (let i = 0; i < 18; i++) {
        const cx = (i / 17) * W;
        const bob = Math.sin(s.t * 6 + i * 1.7) * H * 0.02;
        g.beginPath();
        g.arc(cx, H + H * 0.02, H * 0.09, Math.PI, 0);
        g.fill();
        if (i % 3 === 0) g.fillRect(cx - 3, H * 0.83 + bob, 6, H * 0.12);
      }

      // Viewfinder frame
      g.strokeStyle = "rgba(253,240,213,0.7)";
      g.lineWidth = 2;
      const fw = W * 0.34;
      const fh = H * 0.62;
      const fx = W / 2 - fw / 2;
      const fy = H * 0.12;
      const corner = 18;
      for (const [cx, cy, dx, dy] of [
        [fx, fy, 1, 1],
        [fx + fw, fy, -1, 1],
        [fx, fy + fh, 1, -1],
        [fx + fw, fy + fh, -1, -1],
      ]) {
        g.beginPath();
        g.moveTo(cx + dx * corner, cy);
        g.lineTo(cx, cy);
        g.lineTo(cx, cy + dy * corner);
        g.stroke();
      }
      g.beginPath();
      g.arc(W / 2, fy + fh / 2, 4, 0, Math.PI * 2);
      g.stroke();

      if (s.flash > 0) {
        g.fillStyle = `rgba(255,255,255,${s.flash})`;
        g.fillRect(0, 0, W, H);
      }
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, []);

  const shoot = () => {
    if (!playing || done) return;
    const s = sim.current;
    const canvas = canvasRef.current!;
    haptic(15);

    const sharp = s.y > 0.05 ? Math.max(0, 1 - Math.abs(s.vy) / 2.2) : 0.35; // peak of a jump freezes motion
    const lit = s.strobe > 0 ? 1 : 0.25;
    const framed = Math.max(0, 1 - Math.abs(s.x - 0.5) / 0.17);
    const score = Math.round((sharp * 0.4 + lit * 0.35 + framed * 0.25) * 100);
    const reasons = [sharp < 0.5 ? "motion blur" : null, lit < 1 ? "underexposed" : null, framed < 0.4 ? "out of frame" : null].filter(Boolean);
    const verdict: Shot["verdict"] = score >= 75 ? "Keeper" : score >= 50 ? "Almost" : "Missed";

    // Thumbnail of the frame, before the flash.
    const t = document.createElement("canvas");
    t.width = 120;
    t.height = 160;
    t.getContext("2d")!.drawImage(canvas, canvas.width * 0.33, canvas.height * 0.12, canvas.width * 0.34, canvas.height * 0.62, 0, 0, 120, 160);
    s.flash = 0.9;

    const shot: Shot = { score, verdict, why: verdict === "Keeper" ? "sharp, lit, framed" : reasons.join(" · ") || "close!", thumb: t.toDataURL("image/jpeg", 0.7) };
    const next = [...shots, shot];
    setShots(next);
    if (next.length === ROLL) {
      setPlaying(false);
      const sum = next.reduce((a, x) => a + x.score, 0);
      try {
        if (sum > (Number(localStorage.getItem(BEST_KEY)) || 0)) {
          localStorage.setItem(BEST_KEY, String(sum));
          setBest(sum);
        }
      } catch {}
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!playing || e.key !== " ") return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      e.preventDefault();
      shoot();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  });

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-[2px] bg-ink">
        <canvas
          ref={canvasRef}
          width={720}
          height={420}
          onPointerDown={shoot}
          className={cn("block aspect-[12/7] w-full touch-manipulation", playing && "cursor-crosshair")}
          aria-label="Concert stage — tap or press Space to take a photo"
        />
        {!playing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink/70 p-6 text-center text-paper backdrop-blur-[2px]">
            {done ? (
              <>
                <p className="label text-sky">Roll complete</p>
                <p className="font-display text-5xl">{total}<span className="font-serif text-2xl text-paper/60">/500</span></p>
                <p className="font-serif text-paper/75 italic">{shots.filter((s) => s.verdict === "Keeper").length} keepers{best ? ` · best ${best}` : ""}</p>
              </>
            ) : (
              <>
                <p className="label text-sky">Five frames on the roll</p>
                <p className="max-w-sm font-serif text-lg leading-snug text-paper/85">Shoot when the strobe fires, the performer is at the top of a jump, and inside the frame.</p>
              </>
            )}
            <button
              type="button"
              onClick={() => {
                haptic();
                setShots([]);
                setPlaying(true);
              }}
              className="btn mt-2 bg-paper py-3 text-ink hover:bg-sky"
            >
              {done ? "Shoot another roll" : "Start shooting"}
            </button>
          </div>
        )}
        {playing && <p className="label pointer-events-none absolute top-3 right-3 rounded-full bg-paper/90 px-3 py-1.5 text-[0.55rem] text-ink">{ROLL - shots.length} left · tap or Space</p>}
      </div>

      <ol className="grid grid-cols-5 gap-2" aria-label="Your shots">
        {Array.from({ length: ROLL }, (_, i) => {
          const s = shots[i];
          return (
            <li key={i} className={cn("rounded-[2px] bg-paper p-1.5 pb-2 shadow-sm ring-1 ring-ink/10 transition-transform", s && "animate-pop-in", s && i % 2 ? "rotate-1" : s ? "-rotate-1" : "")}>
              <div className="aspect-[3/4] overflow-hidden bg-ink/10">
                {/* eslint-disable-next-line @next/next/no-img-element -- generated in the browser */}
                {s && <img src={s.thumb} alt={`Shot ${i + 1}: ${s.verdict}`} className="h-full w-full object-cover" />}
              </div>
              <p className={cn("label mt-1.5 truncate text-center text-[0.48rem]", s?.verdict === "Keeper" ? "text-[#2e8b57]" : s?.verdict === "Almost" ? "text-[#b8860b]" : "text-ember")}>{s ? `${s.verdict} ${s.score}` : "—"}</p>
              {s && <p className="truncate text-center font-serif text-[0.6rem] text-ink/55 italic">{s.why}</p>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
