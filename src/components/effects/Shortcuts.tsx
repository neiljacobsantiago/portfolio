"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { openPalette } from "@/components/search/PaletteHost";
import { haptic } from "@/lib/haptics";

/** "g" then a letter jumps to a page, like Gmail and Linear. */
const JUMPS: { key: string; href: string; label: string }[] = [
  { key: "h", href: "/", label: "Home" },
  { key: "w", href: "/work", label: "Work" },
  { key: "p", href: "/photography", label: "Photography" },
  { key: "a", href: "/about", label: "About" },
  { key: "r", href: "/resume", label: "Résumé" },
  { key: "l", href: "/lab", label: "Lab" },
  { key: "y", href: "/play", label: "Play" },
  { key: "c", href: "/contact", label: "Contact" },
];

const OTHER: [string[], string][] = [
  [["/"], "Search everything"],
  [["Ctrl", "K"], "Search (⌘K on a Mac)"],
  [["?"], "Show or hide this list"],
  [["Esc"], "Close whatever is open"],
];

const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

function Key({ children }: { children: React.ReactNode }) {
  return <kbd className="inline-flex h-7 min-w-7 items-center justify-center rounded-md bg-paper px-2 font-mono text-[0.72rem] text-ink shadow-[inset_0_-2px_0_rgb(0_48_73/0.18)] ring-1 ring-ink/15">{children}</kbd>;
}

/** Keyboard shortcuts for mouse-and-keyboard visitors; "?" lists them. */
export default function Shortcuts() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    // Games and the terminal own the keyboard.
    if (pathname.startsWith("/play") || pathname.startsWith("/terminal")) return;
    let chord = 0;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || typing(e.target) || document.documentElement.hasAttribute("data-immersive")) return;
      if (e.key === "Escape" && open) return setOpen(false);
      if (e.key === "?") {
        e.preventDefault();
        haptic();
        return setOpen((v) => !v);
      }
      if (chord) {
        const jump = JUMPS.find((j) => j.key === e.key.toLowerCase());
        clearTimeout(chord);
        chord = 0;
        setPending(false);
        if (jump) {
          e.preventDefault();
          setOpen(false);
          router.push(jump.href);
        }
        return;
      }
      if (e.key === "g") {
        setPending(true);
        chord = window.setTimeout(() => {
          chord = 0;
          setPending(false);
        }, 1200);
      } else if (e.key === "/") {
        e.preventDefault();
        setOpen(false);
        openPalette();
      }
    };
    addEventListener("keydown", onKey);
    return () => {
      clearTimeout(chord);
      removeEventListener("keydown", onKey);
    };
  }, [pathname, router, open]);

  return (
    <>
      {pending && (
        <p aria-hidden className="animate-blob-in label pointer-events-none fixed bottom-6 left-1/2 z-[96] -translate-x-1/2 rounded-full bg-ink px-4 py-2.5 text-[0.58rem] text-paper shadow-xl">
          g → h w p a r l y c
        </p>
      )}
      {open && (
        <div className="animate-page-in fixed inset-0 z-[96] flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Keyboard shortcuts"
            onClick={(e) => e.stopPropagation()}
            className="animate-blob-in w-full max-w-lg rounded-[22px] bg-paper p-6 shadow-[0_40px_100px_-30px_rgb(0_48_73/0.7)] ring-1 ring-ink/15 md:p-8"
          >
            <div className="flex items-baseline justify-between gap-4">
              <p className="font-display text-3xl">Shortcuts</p>
              <button type="button" onClick={() => setOpen(false)} className="label press rounded-full px-3 py-1.5 text-[0.55rem] text-ink/60 hover:bg-ink/5 hover:text-ink">
                Esc
              </button>
            </div>
            <p className="label mt-6 mb-3 text-[0.55rem] text-ember">Jump to a page: press g, then</p>
            <ul className="grid grid-cols-2 gap-x-6 gap-y-2.5">
              {JUMPS.map((j) => (
                <li key={j.key} className="flex items-center gap-3 font-serif">
                  <Key>{j.key.toUpperCase()}</Key> {j.label}
                </li>
              ))}
            </ul>
            <p className="label mt-7 mb-3 text-[0.55rem] text-ember">Everywhere</p>
            <ul className="space-y-2.5">
              {OTHER.map(([keys, label]) => (
                <li key={label} className="flex items-center gap-3 font-serif">
                  <span className="flex gap-1">
                    {keys.map((k) => (
                      <Key key={k}>{k}</Key>
                    ))}
                  </span>
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
