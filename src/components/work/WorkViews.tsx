"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { categories, projects } from "@/content/work";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import ProjectCover from "./ProjectCover";

const KEY = "work-view";

/**
 * Grid (the server-rendered cards) or an editorial list whose rows reveal
 * a floating preview that follows the cursor. The choice is remembered.
 */
export default function WorkViews({ children }: { children: ReactNode }) {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [hover, setHover] = useState<string | null>(null);
  const preview = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) === "list") queueMicrotask(() => setView("list"));
    } catch {}
  }, []);

  // The preview eases towards the pointer instead of snapping to it.
  useEffect(() => {
    if (view !== "list" || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      pos.current.tx = e.clientX;
      pos.current.ty = e.clientY;
    };
    const tick = () => {
      const p = pos.current;
      p.x += (p.tx - p.x) * 0.16;
      p.y += (p.ty - p.y) * 0.16;
      if (preview.current) preview.current.style.transform = `translate3d(${p.x + 24}px, ${p.y - 120}px, 0) rotate(${Math.max(-6, Math.min(6, (p.tx - p.x) * 0.05))}deg)`;
      raf = requestAnimationFrame(tick);
    };
    addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [view]);

  const choose = (v: "grid" | "list") => {
    if (v === view) return;
    haptic();
    try {
      localStorage.setItem(KEY, v);
    } catch {}
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
    if (doc.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) doc.startViewTransition(() => flushSync(() => setView(v)));
    else setView(v);
  };

  const hovered = projects.find((p) => p.slug === hover);

  return (
    <>
      <div className="-mt-4 mb-8 flex justify-end">
        <div role="radiogroup" aria-label="Layout" className="flex gap-1 rounded-full bg-ink/[0.06] p-1">
          {(["grid", "list"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={view === v}
              onClick={() => choose(v)}
              className="label press flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[0.58rem] text-ink/60 aria-checked:bg-ink aria-checked:text-paper"
            >
              <span aria-hidden>{v === "grid" ? "▦" : "☰"}</span>
              {v === "grid" ? "Grid" : "List"}
            </button>
          ))}
        </div>
      </div>

      {view === "grid" ? (
        children
      ) : (
        <ol className="border-t border-ink/15" onPointerLeave={() => setHover(null)}>
          {projects.map((p, i) => (
            <li key={p.slug} data-category={p.category} className="border-b border-ink/15">
              <Link
                href={`/work/${p.slug}`}
                onPointerEnter={() => setHover(p.slug)}
                onFocus={() => setHover(p.slug)}
                onBlur={() => setHover(null)}
                className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 py-5 transition-colors hover:bg-paper-deep/40 md:grid-cols-[4rem_1fr_16rem_2rem] md:gap-6 md:px-3 md:py-7"
              >
                <span className="label hidden text-[0.6rem] text-ink/40 md:block">{String(i + 1).padStart(2, "0")}</span>
                {/* Phones and tablets get a thumbnail instead of the floating preview. */}
                <span className="relative block h-14 w-20 overflow-hidden rounded-[2px] pointer-fine:hidden md:hidden">
                  <ProjectCover project={p} sizes="80px" className="absolute inset-0" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-display text-[clamp(1.6rem,4.5vw,4rem)] leading-[1.05] transition-[color,transform] duration-500 ease-[var(--ease-apple)] group-hover:translate-x-3 group-hover:text-ember">
                    {p.title}
                  </span>
                  <span className="mt-1 block truncate font-serif text-base text-ink/60 italic md:hidden">{p.context}</span>
                </span>
                <span className="hidden md:block">
                  <span className="label block text-[0.58rem] text-ember">{categories[p.category].label}</span>
                  <span className="mt-1 block truncate font-serif text-ink/60 italic">{p.context}</span>
                </span>
                <span aria-hidden className="text-xl transition-transform duration-500 ease-[var(--ease-spring)] group-hover:translate-x-1 group-hover:-rotate-45">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}

      {/* Floating preview (mouse and trackpad only) */}
      {view === "list" && (
        <div
          ref={preview}
          aria-hidden
          className={cn(
            "pointer-events-none fixed top-0 left-0 z-30 hidden w-[22rem] overflow-hidden rounded-[6px] shadow-[0_40px_80px_-30px_rgb(0_48_73/0.6)] transition-[opacity,scale] duration-300 ease-[var(--ease-spring)] pointer-fine:block",
            hovered ? "scale-100 opacity-100" : "scale-75 opacity-0",
          )}
        >
          {hovered && (
            <>
              <ProjectCover key={hovered.slug} project={hovered} sizes="352px" className="aspect-[4/3]" />
              <p className="label bg-ink px-3 py-2 text-[0.55rem] text-paper">{hovered.status}</p>
            </>
          )}
        </div>
      )}
    </>
  );
}
