"use client";

import { useEffect, useRef, useState } from "react";
import { haptic } from "@/lib/haptics";
import { useImmersive } from "@/lib/immersive";
import { cn } from "@/lib/utils";
import { useArcadeSound } from "./arcade-sound";

// Shutter: concert photography as a timing game. The band plays to a beat;
// strobes hit on the beat, the performer jumps on the downbeat, and pyro goes
// off at the drop. Pan the viewfinder to follow them and shoot. A keeper is
// sharp (top of a jump), lit (a strobe is firing) and framed (centred).

const ROLL = 6;
const BEST_KEY = "shutter-best-v2";
const BPM = 124;
const BEAT = 60 / BPM;

type Lens = "35" | "85";

interface Shot {
  score: number;
  verdict: "Keeper" | "Almost" | "Missed";
  why: string;
  thumb: string;
  parts: { sharp: number; lit: number; framed: number };
  pyro: boolean;
}

const LIGHTS = ["#c1121f", "#669bbc", "#ffd27a", "#b14bd6", "#fdf0d5"];

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

export default function ShutterGame() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sim = useRef({
    x: 0.5,
    y: 0,
    vy: 0,
    vx: 0.16,
    t: 0,
    beat: 0,
    strobe: 0,
    strobeColor: LIGHTS[0],
    flash: 0,
    frameX: 0.5,
    frameTarget: 0.5,
    lens: "35" as Lens,
    speed: 1,
    pyro: 0,
    nextDrop: 9,
    sparks: [] as Spark[],
    /** Set by a shot: the next frame copies the scene (without the viewfinder) to this callback. */
    capture: null as ((url: string) => void) | null,
    // Drifting haze, spread evenly (no randomness during render)
    haze: Array.from({ length: 7 }, (_, i) => ({ x: (i * 0.37) % 1, y: 0.25 + ((i * 0.53) % 1) * 0.45, r: 0.25 + ((i * 0.29) % 1) * 0.25, v: (i % 2 ? 1 : -1) * (0.01 + ((i * 0.41) % 1) * 0.02) })),
  });
  const [shots, setShots] = useState<Shot[]>([]);
  const [best, setBest] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [lens, setLens] = useState<Lens>("35");
  const { play, muted, toggleMute } = useArcadeSound();
  const done = shots.length >= ROLL;
  const total = shots.reduce((s, x) => s + x.score, 0);
  const bestShot = shots.reduce<Shot | null>((b, s) => (!b || s.score > b.score ? s : b), null);
  useImmersive(playing);

  useEffect(() => {
    try {
      const b = Number(localStorage.getItem(BEST_KEY)) || null;
      queueMicrotask(() => setBest(b));
    } catch {}
  }, []);

  useEffect(() => {
    sim.current.lens = lens;
  }, [lens]);

  // Animation loop: only runs while the game is on screen. Drawn at the
  // device's pixel density so it stays crisp on phones.
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

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
      last = now;
      if (!visible) return;
      const s = sim.current;
      const W = canvas.width;
      const H = canvas.height;
      s.t += dt;

      // The beat drives everything: strobes on beats, jumps on downbeats.
      const prevBeat = Math.floor(s.beat);
      s.beat += dt / BEAT;
      const onBeat = Math.floor(s.beat) !== prevBeat;
      const beatPhase = s.beat % 1;
      if (onBeat) {
        const n = Math.floor(s.beat);
        if (Math.random() < 0.45) {
          s.strobe = 0.22;
          s.strobeColor = LIGHTS[Math.floor(Math.random() * LIGHTS.length)];
        }
        if (n % 4 === 0 && s.y === 0 && Math.random() < 0.8) s.vy = (2.3 + Math.random() * 1.1) * Math.sqrt(s.speed);
      }

      // Performer wanders the stage, faster as the roll goes on.
      s.x += s.vx * s.speed * dt;
      if (s.x < 0.14 || s.x > 0.86) {
        s.vx *= -1;
        s.x = Math.max(0.14, Math.min(0.86, s.x));
      }
      if (Math.random() < dt * 0.7) s.vx = (Math.random() < 0.5 ? -1 : 1) * (0.08 + Math.random() * 0.24);
      s.vy -= 7 * s.speed * dt;
      s.y = Math.max(0, s.y + s.vy * dt);
      if (s.y === 0) s.vy = 0;
      s.strobe = Math.max(0, s.strobe - dt);
      s.flash = Math.max(0, s.flash - dt * 3);

      // The drop: pyro fountains at the front of the stage
      s.nextDrop -= dt;
      if (s.nextDrop <= 0) {
        s.pyro = 1.6;
        s.nextDrop = 9 + Math.random() * 6;
        s.strobe = 0.4;
        s.strobeColor = "#ffd27a";
      }
      if (s.pyro > 0) {
        s.pyro -= dt;
        for (const fx of [0.2, 0.8]) for (let i = 0; i < 4; i++) s.sparks.push({ x: fx + (Math.random() - 0.5) * 0.02, y: 0.78, vx: (Math.random() - 0.5) * 0.25, vy: -(0.9 + Math.random() * 0.7), life: 1 });
      }
      for (const p of s.sparks) {
        p.vy += 1.4 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt * 0.9;
      }
      s.sparks = s.sparks.filter((p) => p.life > 0 && p.y < 1).slice(-260);

      // Viewfinder eases towards where you're pointing
      s.frameX += (s.frameTarget - s.frameX) * Math.min(1, dt * 12);

      const lit = s.strobe > 0 || s.pyro > 0;
      const floor = H * 0.78;

      /* Backdrop */
      g.globalCompositeOperation = "source-over";
      g.fillStyle = lit ? "#170d26" : "#080c16";
      g.fillRect(0, 0, W, H);
      // LED wall: an equaliser in the band's colours
      const cols = Math.max(14, Math.round(W / (H * 0.05)));
      const cw = W / cols;
      for (let i = 0; i < cols; i++) {
        const level = 0.25 + 0.55 * Math.abs(Math.sin(s.t * 2.1 + i * 0.55)) * (0.6 + 0.4 * Math.sin(s.beat * Math.PI));
        const rows = 9;
        for (let r = 0; r < rows; r++) {
          const on = r / rows < level;
          g.fillStyle = on ? (r > rows * 0.7 ? "#c1121f44" : "#669bbc30") : "#ffffff06";
          g.fillRect(i * cw + 1, H * 0.48 - (r + 1) * H * 0.045, cw - 2, H * 0.04);
        }
      }
      // Truss
      g.fillStyle = "#1f2737";
      g.fillRect(0, H * 0.03, W, H * 0.035);

      /* Light beams through the haze */
      g.globalCompositeOperation = "lighter";
      for (let i = 0; i < 5; i++) {
        const bx = W * (0.1 + i * 0.2);
        const sway = Math.sin(s.t * (0.9 + i * 0.13) + i * 1.7) * W * 0.16;
        const color = LIGHTS[i % LIGHTS.length];
        const grd = g.createLinearGradient(bx, H * 0.05, bx + sway, floor);
        grd.addColorStop(0, `${color}${lit ? "99" : "55"}`);
        grd.addColorStop(1, `${color}00`);
        g.fillStyle = grd;
        g.beginPath();
        g.moveTo(bx - W * 0.008, H * 0.065);
        g.lineTo(bx + W * 0.008, H * 0.065);
        g.lineTo(bx + sway + W * 0.07, floor);
        g.lineTo(bx + sway - W * 0.07, floor);
        g.fill();
        g.fillStyle = `${color}cc`;
        g.beginPath();
        g.arc(bx, H * 0.065, H * 0.012, 0, Math.PI * 2);
        g.fill();
      }
      for (const h of s.haze) {
        h.x += h.v * dt;
        if (h.x < -0.3) h.x = 1.3;
        if (h.x > 1.3) h.x = -0.3;
        const grd = g.createRadialGradient(h.x * W, h.y * H, 0, h.x * W, h.y * H, h.r * W);
        grd.addColorStop(0, lit ? "rgba(255,240,220,0.07)" : "rgba(160,180,220,0.04)");
        grd.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = grd;
        g.fillRect(0, 0, W, H);
      }
      if (lit) {
        g.fillStyle = `${s.strobeColor}2a`;
        g.fillRect(0, 0, W, H);
      }
      g.globalCompositeOperation = "source-over";

      /* Stage floor, monitors and mic stand */
      g.fillStyle = "#151b28";
      g.fillRect(0, floor, W, H - floor);
      g.fillStyle = "#0d121c";
      for (const mx of [0.3, 0.7]) {
        g.beginPath();
        g.moveTo(W * mx - H * 0.06, floor + H * 0.05);
        g.lineTo(W * mx + H * 0.06, floor + H * 0.05);
        g.lineTo(W * mx + H * 0.045, floor);
        g.lineTo(W * mx - H * 0.045, floor);
        g.fill();
      }

      /* Performer: a rim-lit silhouette with a guitar */
      const px = s.x * W;
      const py = floor - s.y * H * 0.17;
      const u = H * 0.01; // body unit
      const peak = s.y > 0 && Math.abs(s.vy) < 0.9;
      const bob = Math.sin(beatPhase * Math.PI * 2) * u * 0.6;
      const body = lit ? "#fdf0d5" : "#3b4760";
      g.strokeStyle = body;
      g.fillStyle = body;
      g.lineCap = "round";
      g.lineJoin = "round";
      // legs
      g.lineWidth = u * 2.6;
      const hip = { x: px, y: py - u * 12 + bob };
      const spread = s.y > 0 ? u * 5 : u * 3;
      g.beginPath();
      g.moveTo(hip.x, hip.y);
      g.lineTo(px - spread, py - (s.y > 0 ? u * 3 : 0));
      g.moveTo(hip.x, hip.y);
      g.lineTo(px + spread, py - (s.y > 0 ? u * 4 : 0));
      g.stroke();
      // torso and head
      const neck = { x: px + Math.sin(s.t * 3) * u * 0.6, y: hip.y - u * 15 };
      g.lineWidth = u * 4.6;
      g.beginPath();
      g.moveTo(hip.x, hip.y);
      g.lineTo(neck.x, neck.y);
      g.stroke();
      g.beginPath();
      g.arc(neck.x, neck.y - u * 4.2, u * 3.6, 0, Math.PI * 2);
      g.fill();
      // hair flick
      g.beginPath();
      g.ellipse(neck.x - Math.sign(s.vx) * u * 2.5, neck.y - u * 5.5, u * 3.6, u * 2.2, -Math.sign(s.vx) * 0.5, 0, Math.PI * 2);
      g.fill();
      // arms: up at the top of a jump, on the guitar otherwise
      g.lineWidth = u * 2.2;
      g.beginPath();
      if (peak) {
        g.moveTo(neck.x, neck.y + u * 2);
        g.lineTo(neck.x - u * 7, neck.y - u * 10);
        g.moveTo(neck.x, neck.y + u * 2);
        g.lineTo(neck.x + u * 8, neck.y - u * 9);
      } else {
        g.moveTo(neck.x, neck.y + u * 2);
        g.lineTo(px - u * 7, hip.y - u * 5);
        g.moveTo(neck.x, neck.y + u * 2);
        g.lineTo(px + u * 6, hip.y - u * 2 + Math.sin(s.t * 14) * u);
      }
      g.stroke();
      // guitar
      g.save();
      g.translate(px, hip.y - u * 4);
      g.rotate(peak ? -0.9 : -0.45);
      g.fillStyle = lit ? s.strobeColor : "#5b2a2a";
      g.fillRect(-u * 2, -u * 0.9, u * 20, u * 1.8);
      g.beginPath();
      g.ellipse(-u * 3, 0, u * 5, u * 3.8, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();

      /* Pyro sparks */
      g.globalCompositeOperation = "lighter";
      g.lineWidth = Math.max(1, u * 0.5);
      for (const p of s.sparks) {
        g.strokeStyle = `rgba(255,${Math.round(180 + p.life * 70)},${Math.round(90 * p.life)},${p.life})`;
        g.beginPath();
        g.moveTo(p.x * W, p.y * H);
        g.lineTo((p.x - p.vx * 0.04) * W, (p.y - p.vy * 0.04) * H);
        g.stroke();
      }
      g.globalCompositeOperation = "source-over";

      /* Crowd at the barricade: heads, raised hands, phone screens */
      for (let i = 0; i < 22; i++) {
        const cx = ((i + 0.5) / 22) * W;
        const jump = Math.max(0, Math.sin(s.beat * Math.PI * 2 + i * 1.3)) * H * 0.015;
        g.fillStyle = "#03050a";
        g.beginPath();
        g.arc(cx, H * 1.02 - jump, H * 0.085, Math.PI, 0);
        g.fill();
        if (i % 3 === 0) {
          g.fillRect(cx + H * 0.03, H * 0.82 - jump, H * 0.016, H * 0.14);
          g.fillStyle = i % 2 ? "#cfe6ff" : "#fff1d6";
          g.fillRect(cx + H * 0.022, H * 0.79 - jump, H * 0.032, H * 0.05);
        }
      }

      /* Viewfinder */
      const fh = (s.lens === "85" ? 0.44 : 0.66) * H;
      const fw = fh * 0.75;
      const fcx = s.frameX * W;
      const fcy = s.lens === "85" ? H * 0.47 : H * 0.48;
      const fx = fcx - fw / 2;
      const fy = fcy - fh / 2;
      if (s.capture) {
        // The photo itself: what's inside the frame, with none of the viewfinder's marks
        const t = document.createElement("canvas");
        t.width = 150;
        t.height = 200;
        t.getContext("2d")!.drawImage(canvas, fx, fy, fw, fh, 0, 0, 150, 200);
        s.capture(t.toDataURL("image/jpeg", 0.75));
        s.capture = null;
        s.flash = 0.85;
      }
      g.fillStyle = "rgba(0,0,0,0.32)";
      g.fillRect(0, 0, W, fy);
      g.fillRect(0, fy + fh, W, H - fy - fh);
      g.fillRect(0, fy, fx, fh);
      g.fillRect(fx + fw, fy, W - fx - fw, fh);
      g.strokeStyle = "rgba(253,240,213,0.85)";
      g.lineWidth = Math.max(1.5, u * 0.3);
      const corner = fh * 0.08;
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
      // Focus point turns green when it's on the performer
      const onTarget = Math.abs(px - fcx) < fw * 0.18;
      g.strokeStyle = onTarget ? "#7bd88f" : "rgba(253,240,213,0.8)";
      g.strokeRect(fcx - u * 1.6, fcy - u * 1.6, u * 3.2, u * 3.2);
      // Exposure meter under the frame
      g.fillStyle = "rgba(253,240,213,0.85)";
      g.font = `${Math.round(u * 2.4)}px ui-monospace, monospace`;
      g.textAlign = "center";
      g.fillText(`${s.lens}mm  f/2.8  1/500  ISO 3200  ${lit ? "●" : "○"}`, fcx, Math.min(H - u, fy + fh + u * 3.2));

      if (s.flash > 0) {
        g.fillStyle = `rgba(255,255,255,${s.flash})`;
        g.fillRect(0, 0, W, H);
      }
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
    };
  }, []);

  const shoot = () => {
    if (!playing || done) return;
    const s = sim.current;
    const canvas = canvasRef.current!;
    const W = canvas.width;
    const H = canvas.height;
    haptic(15);
    play("shutter");

    const sharp = s.y > 0.05 ? Math.max(0, 1 - Math.abs(s.vy) / 2.2) : 0.3; // the top of a jump freezes motion
    const lit = s.strobe > 0 || s.pyro > 0 ? 1 : 0.2;
    const fh = (s.lens === "85" ? 0.44 : 0.66) * H;
    const fw = fh * 0.75;
    const framed = Math.max(0, 1 - Math.abs(s.x * W - s.frameX * W) / (fw * 0.42));
    const tele = s.lens === "85" ? 1.15 : 1;
    const pyro = s.pyro > 0 && lit === 1;
    const score = Math.min(100, Math.round((sharp * 0.4 + lit * 0.35 + framed * 0.25) * 100 * tele + (pyro ? 8 : 0)));
    const reasons = [sharp < 0.5 ? "motion blur" : null, lit < 1 ? "underexposed" : null, framed < 0.4 ? "out of frame" : null].filter(Boolean);
    const verdict: Shot["verdict"] = score >= 75 ? "Keeper" : score >= 50 ? "Almost" : "Missed";
    if (verdict === "Keeper") play("keeper");

    // The next drawn frame hands back the photo (the scene without the viewfinder)
    const index = shots.length;
    s.capture = (url) => setShots((all) => all.map((x, i) => (i === index ? { ...x, thumb: url } : x)));
    s.speed = 1 + (shots.length + 1) * 0.12;

    const shot: Shot = {
      score,
      verdict,
      why: verdict === "Keeper" ? (pyro ? "pyro moment!" : "sharp, lit, framed") : reasons.join(" · ") || "close!",
      thumb: "",
      parts: { sharp, lit, framed },
      pyro,
    };
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

  // Pan with the mouse or a drag; a quick tap shoots
  const press = useRef<{ x: number; t: number; id: number } | null>(null);
  const aim = (clientX: number) => {
    const r = canvasRef.current?.getBoundingClientRect();
    if (r) sim.current.frameTarget = Math.max(0.1, Math.min(0.9, (clientX - r.left) / r.width));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!playing) return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      const s = sim.current;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (!e.repeat) shoot();
      } else if (e.key === "ArrowLeft" || e.key === "a") {
        e.preventDefault();
        s.frameTarget = Math.max(0.1, s.frameTarget - 0.08);
      } else if (e.key === "ArrowRight" || e.key === "d") {
        e.preventDefault();
        s.frameTarget = Math.min(0.9, s.frameTarget + 0.08);
      } else if (e.key === "z") setLens((l) => (l === "35" ? "85" : "35"));
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  });

  const startRoll = () => {
    haptic();
    play("tick");
    Object.assign(sim.current, { speed: 1, nextDrop: 6 + Math.random() * 4, frameTarget: 0.5 });
    setShots([]);
    setPlaying(true);
  };

  return (
    <div className="space-y-4">
      <div ref={wrapRef} className="relative aspect-[4/5] overflow-hidden rounded-[2px] bg-ink sm:aspect-[12/8]">
        <canvas
          ref={canvasRef}
          onPointerMove={(e) => {
            if (!playing) return;
            if (e.pointerType === "mouse" || press.current) aim(e.clientX);
          }}
          onPointerDown={(e) => {
            if (!playing) return;
            if (e.pointerType === "mouse") return shoot();
            press.current = { x: e.clientX, t: performance.now(), id: e.pointerId };
          }}
          onPointerUp={(e) => {
            const p = press.current;
            press.current = null;
            if (p && p.id === e.pointerId && Math.abs(e.clientX - p.x) < 10 && performance.now() - p.t < 280) shoot();
          }}
          onPointerCancel={() => (press.current = null)}
          className={cn("absolute inset-0 block h-full w-full touch-none", playing && "cursor-crosshair")}
          aria-label="Concert stage. Move or drag to aim the viewfinder; tap, click or press Space to take a photo."
        />

        {playing && (
          <>
            <div className="pointer-events-none absolute inset-x-3 top-3 flex items-center justify-between gap-2">
              <p className="label rounded-full bg-paper/90 px-3 py-1.5 text-[0.52rem] text-ink">
                {ROLL - shots.length} left<span className="hidden sm:inline"> · aim, then click or Space</span>
              </p>
              <div className="pointer-events-auto flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setLens((l) => (l === "35" ? "85" : "35"))}
                  aria-label={`Lens: ${lens}mm. Switch lens`}
                  className="label press rounded-full bg-paper/90 px-3 py-1.5 text-[0.52rem] text-ink"
                >
                  {lens}mm{lens === "85" ? " ×1.15" : ""}
                </button>
                <button type="button" onClick={toggleMute} aria-label={muted ? "Sound off" : "Sound on"} className="label press rounded-full bg-paper/90 px-3 py-1.5 text-[0.52rem] text-ink">
                  {muted ? "🔇" : "🔊"}
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={shoot}
              aria-label="Take the photo"
              className="press absolute right-4 bottom-4 flex h-16 w-16 items-center justify-center rounded-full bg-paper/90 shadow-xl ring-4 ring-ember/80 sm:hidden"
            >
              <span className="h-11 w-11 rounded-full bg-ember" />
            </button>
          </>
        )}

        {!playing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink/75 p-6 text-center text-paper backdrop-blur-[2px]">
            {done ? (
              <>
                <p className="label text-sky">Roll complete</p>
                <p className="font-display text-5xl leading-none">
                  {total}
                  <span className="font-serif text-2xl text-paper/60">/{ROLL * 100}</span>
                </p>
                <p className="font-serif text-paper/75 italic">
                  {shots.filter((s) => s.verdict === "Keeper").length} keepers{best ? ` · best ${best}` : ""}
                </p>
                {bestShot?.thumb && (
                  <div className="mt-1 flex items-center gap-3 rounded-xl bg-paper/10 p-2 pr-4 text-left">
                    {/* eslint-disable-next-line @next/next/no-img-element -- generated in the browser */}
                    <img src={bestShot.thumb} alt="Your best frame" className="h-20 w-15 rounded-sm object-cover" />
                    <div className="space-y-1">
                      <p className="label text-[0.5rem] text-sky">Best frame · {bestShot.score}</p>
                      {(["sharp", "lit", "framed"] as const).map((k) => (
                        <div key={k} className="flex items-center gap-2">
                          <span className="label w-12 text-[0.48rem] text-paper/60">{k}</span>
                          <span className="h-1.5 w-20 overflow-hidden rounded-full bg-paper/15">
                            <span className="block h-full rounded-full bg-sky" style={{ width: `${Math.round(bestShot.parts[k] * 100)}%` }} />
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="label text-sky">{ROLL} frames on the roll</p>
                <p className="max-w-sm font-serif text-lg leading-snug text-paper/85">
                  Follow the performer with the viewfinder. Shoot on a strobe, at the top of a jump. Catch the pyro for a bonus; the 85mm is harder but scores more.
                </p>
              </>
            )}
            <button type="button" onClick={startRoll} className="btn mt-2 bg-paper py-3 text-ink hover:bg-sky">
              {done ? "Shoot another roll" : "Start shooting"}
            </button>
          </div>
        )}
      </div>

      <ol className="grid grid-cols-6 gap-1.5 sm:gap-2" aria-label="Your shots">
        {Array.from({ length: ROLL }, (_, i) => {
          const s = shots[i];
          return (
            <li key={i} className={cn("min-w-0 rounded-[2px] bg-paper p-1 pb-1.5 shadow-sm ring-1 ring-ink/10 transition-transform", s && "animate-pop-in", s && i % 2 ? "rotate-1" : s ? "-rotate-1" : "")}>
              <div className="aspect-[3/4] overflow-hidden bg-ink/10">
                {/* eslint-disable-next-line @next/next/no-img-element -- generated in the browser */}
                {s?.thumb && <img src={s.thumb} alt={`Shot ${i + 1}: ${s.verdict}`} className="h-full w-full object-cover" />}
              </div>
              <p className={cn("label mt-1 truncate text-center text-[0.44rem]", s?.verdict === "Keeper" ? "text-[#2e8b57]" : s?.verdict === "Almost" ? "text-[#b8860b]" : "text-ember")}>{s ? `${s.verdict} ${s.score}` : "—"}</p>
              {s && <p className="hidden truncate text-center font-serif text-[0.58rem] text-ink/55 italic sm:block">{s.why}</p>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
