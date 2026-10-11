"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal, flushSync } from "react-dom";
import { haptic } from "@/lib/haptics";

export interface LightboxItem {
  src: string;
  width?: number;
  height?: number;
  alt: string;
  note?: string;
  group?: string;
}

type VTDocument = Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };

const canTransition = () =>
  typeof document !== "undefined" && !!(document as VTDocument).startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Lightbox state + a shared-element zoom: the clicked thumbnail (any element
 * with data-lightbox-index) morphs into the full-screen photo and back.
 */
export function useLightbox(items: LightboxItem[]) {
  const [index, setIndex] = useState<number | null>(null);

  const thumb = (i: number) => document.querySelector<HTMLElement>(`[data-lightbox-index="${i}"]`);

  const open = useCallback((i: number) => {
    haptic();
    const el = thumb(i);
    if (!canTransition() || !el) return setIndex(i);
    el.style.viewTransitionName = "photo";
    (document as VTDocument).startViewTransition!(() => {
      el.style.viewTransitionName = "";
      flushSync(() => setIndex(i));
    });
  }, []);

  const close = useCallback(() => {
    const current = index;
    const el = current === null ? null : thumb(current);
    if (!canTransition() || !el) return setIndex(null);
    const t = (document as VTDocument).startViewTransition!(() => {
      flushSync(() => setIndex(null));
      el.style.viewTransitionName = "photo";
    });
    t.finished.finally(() => (el.style.viewTransitionName = ""));
  }, [index]);

  const lightbox = index !== null && items[index] ? <Lightbox items={items} index={index} onIndex={setIndex} onClose={close} /> : null;
  return { open, lightbox };
}

function Lightbox({ items, index, onIndex, onClose }: { items: LightboxItem[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const item = items[index];
  const touchX = useRef<number | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const go = useCallback(
    (delta: number) => {
      haptic(5);
      onIndex((index + delta + items.length) % items.length);
    },
    [index, items.length, onIndex],
  );

  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    closeRef.current?.focus({ preventScroll: true });
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
      prevFocus?.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [go, onClose]);

  const many = items.length > 1;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${item.alt}${many ? ` — ${index + 1} of ${items.length}` : ""}`}
      data-lenis-prevent
      className="animate-page-in fixed inset-0 z-[90] flex flex-col bg-ink text-paper"
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null || !many) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        touchX.current = null;
      }}
    >
      <div className="flex items-center justify-between px-5 py-4 md:px-10">
        <span className="label text-paper/70">{many ? `${String(index + 1).padStart(2, "0")} / ${String(items.length).padStart(2, "0")}` : ""}</span>
        <button ref={closeRef} type="button" onClick={onClose} className="label press rounded-full border border-paper/30 px-4 py-2 hover:bg-paper hover:text-ink">
          Close ✕
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center p-2 md:p-8" onClick={onClose}>
        <Image
          key={item.src}
          src={item.src}
          alt={item.alt}
          width={item.width ?? 1600}
          height={item.height ?? 1000}
          sizes="100vw"
          onClick={(e) => e.stopPropagation()}
          style={{ viewTransitionName: "photo" }}
          className="h-auto max-h-full w-auto max-w-full rounded-[2px] object-contain shadow-[0_40px_80px_-30px_rgb(0_0_0/0.6)]"
        />
      </div>

      <div className="flex items-center justify-between gap-4 px-5 py-5 md:px-10">
        {many ? (
          <button type="button" onClick={() => go(-1)} className="press h-11 w-11 rounded-full border border-paper/30 hover:bg-paper hover:text-ink" aria-label="Previous">
            ←
          </button>
        ) : (
          <span />
        )}
        <p className="min-w-0 text-center">
          <span className="block truncate font-serif text-lg italic">{item.alt}</span>
          {(item.note || item.group) && <span className="label text-[0.65rem] text-sky">{[item.group, item.note].filter(Boolean).join(" · ")}</span>}
        </p>
        {many ? (
          <button type="button" onClick={() => go(1)} className="press h-11 w-11 rounded-full border border-paper/30 hover:bg-paper hover:text-ink" aria-label="Next">
            →
          </button>
        ) : (
          <span />
        )}
      </div>
    </div>,
    document.body,
  );
}
