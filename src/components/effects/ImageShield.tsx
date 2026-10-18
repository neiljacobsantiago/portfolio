"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Icon from "@/components/ui/Icon";
import { haptic } from "@/lib/haptics";

const isMedia = (t: EventTarget | null) => t instanceof Element && (t.tagName === "IMG" || t.tagName === "VIDEO" || t.tagName === "PICTURE" || !!t.closest("[data-protect]"));

/**
 * Keeps the photographs where they belong:
 * - no "Save image" from right-click or long-press, and no dragging them out
 * - a moment of black-out on screenshot shortcuts (Print Screen, ⌘⇧ on a Mac,
 *   Win+Shift on Windows), whenever the window loses focus to a snipping
 *   tool, and when the page is hidden (app switcher)
 * - nothing prints (see the print rules in globals.css)
 * A browser can't truly stop a determined screenshot; this makes casual
 * copying fail and leaves the © on anything that slips through.
 */
export default function ImageShield() {
  const [notice, setNotice] = useState<{ x: number; y: number; key: number } | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    const reasons = new Set<string>();
    let flashTimer = 0;
    // Only pages that actually show photos get blacked out (and the © badge).
    const sync = () => root.toggleAttribute("data-shield", reasons.size > 0 && !!document.querySelector("img, video"));
    const on = (why: string) => {
      reasons.add(why);
      sync();
    };
    const off = (why: string) => {
      reasons.delete(why);
      sync();
    };
    const flash = () => {
      on("flash");
      clearTimeout(flashTimer);
      flashTimer = window.setTimeout(() => off("flash"), 1600);
      // Print Screen copies to the clipboard: replace it with nothing.
      navigator.clipboard?.writeText("").catch(() => {});
    };

    const onContext = (e: MouseEvent) => {
      if (!isMedia(e.target)) return;
      e.preventDefault();
      haptic(12);
      setNotice({ x: e.clientX, y: e.clientY, key: Date.now() });
    };
    const onDrag = (e: DragEvent) => {
      if (isMedia(e.target)) e.preventDefault();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen") flash();
      // ⌘⇧3/4/5 on macOS, Win+Shift+S on Windows: the modifiers arrive before the OS takes the key.
      else if (e.metaKey && e.shiftKey) on("keys");
      // Save page
      else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        setNotice({ x: innerWidth / 2, y: innerHeight / 2, key: Date.now() });
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen") flash();
      if (!e.metaKey || !e.shiftKey) off("keys");
    };
    // Snipping tools and screen recorders take focus. Iframes (videos) don't count.
    const onBlur = () => setTimeout(() => document.activeElement?.tagName !== "IFRAME" && !document.hasFocus() && on("away"), 0);
    const onFocus = () => {
      off("away");
      off("keys");
    };
    const onVisibility = () => (document.hidden ? on("hidden") : off("hidden"));

    document.addEventListener("contextmenu", onContext);
    document.addEventListener("dragstart", onDrag);
    addEventListener("keydown", onKeyDown, true);
    addEventListener("keyup", onKeyUp, true);
    addEventListener("blur", onBlur);
    addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearTimeout(flashTimer);
      root.removeAttribute("data-shield");
      document.removeEventListener("contextmenu", onContext);
      document.removeEventListener("dragstart", onDrag);
      removeEventListener("keydown", onKeyDown, true);
      removeEventListener("keyup", onKeyUp, true);
      removeEventListener("blur", onBlur);
      removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 3200);
    const close = () => setNotice(null);
    addEventListener("scroll", close, { passive: true, once: true });
    return () => {
      clearTimeout(t);
      removeEventListener("scroll", close);
    };
  }, [notice]);

  return (
    <>
      <p aria-hidden className="shield-badge label pointer-events-none fixed top-1/2 left-1/2 z-[200] -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink/90 px-5 py-3 text-2xs whitespace-nowrap text-paper shadow-2xl">
        © Neil Jacob Santiago · Protected
      </p>
      {notice && (
        <div
          key={notice.key}
          role="status"
          className="animate-blob-in fixed z-[200] w-[min(18rem,calc(100vw-2rem))] origin-top-left rounded-2xl bg-ink p-4 text-paper shadow-[0_24px_60px_-20px_rgb(0_0_0/0.6)] ring-1 ring-paper/10"
          style={{ left: Math.max(16, Math.min(notice.x, innerWidth - 304)), top: Math.max(16, Math.min(notice.y, innerHeight - 170)) }}
        >
          <p className="label text-3xs text-sky">© Neil Jacob Santiago</p>
          <p className="mt-2 font-serif leading-snug">Photos here are protected and can&apos;t be saved. Want a print, a licence or the full file?</p>
          <Link href="/contact" onClick={() => setNotice(null)} className="label press mt-3 inline-flex items-center gap-1.5 rounded-full bg-paper px-4 py-2 text-3xs text-ink hover:bg-sky">
            Ask Neil <Icon name="arrow-right" />
          </Link>
        </div>
      )}
    </>
  );
}
