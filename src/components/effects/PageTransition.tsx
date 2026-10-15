"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { projectBySlug } from "@/content/work";
import { haptic } from "@/lib/haptics";

// Each destination gets its own ink.
const ROUTES: { match: (p: string) => boolean; color: string; text: string; label: (p: string) => string }[] = [
  { match: (p) => p.startsWith("/work/"), color: "var(--color-ink)", text: "var(--color-paper)", label: (p) => projectBySlug(p.split("/")[2] ?? "")?.title ?? "Project" },
  { match: (p) => p.startsWith("/work"), color: "var(--color-ink)", text: "var(--color-paper)", label: () => "Work" },
  { match: (p) => p.startsWith("/photography"), color: "var(--color-wine)", text: "var(--color-paper)", label: () => "Photography" },
  { match: (p) => p.startsWith("/about"), color: "var(--color-sky)", text: "var(--color-ink)", label: () => "About" },
  { match: (p) => p.startsWith("/play"), color: "var(--color-ember)", text: "var(--color-paper)", label: () => "Let's play" },
  { match: (p) => p.startsWith("/lab"), color: "#0f3d2e", text: "var(--color-paper)", label: () => "The Lab" },
  { match: (p) => p.startsWith("/contact"), color: "var(--color-ember)", text: "var(--color-paper)", label: () => "Say hello" },
  { match: (p) => p.startsWith("/terminal"), color: "#050a12", text: "var(--color-paper)", label: () => "root@neil:~$" },
  { match: () => true, color: "var(--color-paper-deep)", text: "var(--color-ink)", label: () => "Neil Jacob Santiago" },
];

const COVER_MS = 520;
const REVEAL_MS = 560;

/** Melts the covering layer away to reveal the new page, then resets everything. */
function melt(layer: HTMLDivElement, blob: HTMLDivElement | null, label: HTMLSpanElement, done: () => void) {
  label.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(-40%)" }], { duration: 260, easing: "ease-in", fill: "forwards" });
  const anim = layer.animate(
    [
      { clipPath: "circle(150% at 50% 50%)" },
      { clipPath: "circle(0% at 50% 0%)" },
    ],
    { duration: REVEAL_MS, delay: 120, easing: "cubic-bezier(0.65, 0, 0.35, 1)", fill: "forwards" },
  );
  anim.finished.then(() => {
    layer.style.display = "none";
    layer.getAnimations().forEach((a) => a.cancel());
    blob?.getAnimations().forEach((a) => a.cancel());
    label.getAnimations().forEach((a) => a.cancel());
    done();
  });
}

/**
 * Page transitions: clicking an internal link grows an organic ink blob from
 * the click point, labelled with the destination; once the next page is
 * ready the blob melts away. Skipped for reduced motion, modified clicks,
 * new-tab links, hash links and back/forward navigation.
 */
export default function PageTransition() {
  const router = useRouter();
  const pathname = usePathname();
  const layer = useRef<HTMLDivElement>(null);
  const blob = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const pending = useRef<string | null>(null);
  const busy = useRef(false);
  const revealRef = useRef<() => void>(() => {});

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download") || a.dataset.noTransition !== undefined) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname) return; // same page (incl. hash links)
      if (matchMedia("(prefers-reduced-motion: reduce)").matches || busy.current) return;

      const l = layer.current;
      const b = blob.current;
      const t = label.current;
      if (!l || !b || !t) return;

      e.preventDefault();
      busy.current = true;
      haptic(6);
      const dest = url.pathname + url.search + url.hash;
      const route = ROUTES.find((r) => r.match(url.pathname))!;
      const x = e.clientX || innerWidth / 2;
      const y = e.clientY || innerHeight / 2;
      const size = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) * 2.3;

      router.prefetch(dest);
      l.style.display = "block";
      l.style.opacity = "1";
      b.style.background = route.color;
      b.style.width = b.style.height = `${size}px`;
      b.style.left = `${x}px`;
      b.style.top = `${y}px`;
      t.style.color = route.text;
      t.textContent = route.label(url.pathname);

      const grow = b.animate(
        [
          { transform: "translate(-50%,-50%) scale(0) rotate(-40deg)", borderRadius: "38% 62% 63% 37% / 41% 44% 56% 59%" },
          { transform: "translate(-50%,-50%) scale(0.55) rotate(-10deg)", borderRadius: "60% 40% 30% 70% / 60% 30% 70% 40%", offset: 0.55 },
          { transform: "translate(-50%,-50%) scale(1) rotate(0deg)", borderRadius: "50%" },
        ],
        { duration: COVER_MS, easing: "cubic-bezier(0.32, 0.72, 0, 1)", fill: "forwards" },
      );
      t.animate([{ opacity: 0, transform: "translateY(30%)" }, { opacity: 1, transform: "none" }], {
        duration: 380,
        delay: COVER_MS * 0.45,
        easing: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        fill: "forwards",
      });

      grow.finished.then(() => {
        pending.current = url.pathname;
        router.push(dest);
        // Safety net: never leave the screen covered.
        setTimeout(() => pending.current && revealNow(), 2500);
      });
    };

    const revealNow = () => {
      if (!layer.current || !label.current) return;
      pending.current = null;
      melt(layer.current, blob.current, label.current, () => (busy.current = false));
    };
    revealRef.current = revealNow;

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [router]);

  // New route committed → reveal it.
  useEffect(() => {
    if (pending.current && pathname === pending.current) requestAnimationFrame(() => revealRef.current());
  }, [pathname]);

  return (
    <div ref={layer} aria-hidden className="pointer-events-none fixed inset-0 z-[95] hidden overflow-hidden">
      <div ref={blob} className="absolute rounded-full will-change-transform" style={{ transform: "translate(-50%,-50%) scale(0)" }} />
      <span ref={label} className="absolute inset-0 flex items-center justify-center px-6 text-center font-display text-[clamp(2.5rem,8vw,6rem)] leading-[1.05] opacity-0" />
    </div>
  );
}
