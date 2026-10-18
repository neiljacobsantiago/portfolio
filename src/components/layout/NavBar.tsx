"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { isActivePath, mainNav, site, socials } from "@/lib/site";
import { haptic } from "@/lib/haptics";
import { openPalette } from "@/components/search/PaletteHost";
import Icon from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

export default function NavBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);

  // Close the menu whenever the route changes (back/forward included).
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    const onScroll = () => setScrolled(scrollY > 24);
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    return () => removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.documentElement.style.overflow = "hidden";
    addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = "";
      removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header
      style={{ paddingTop: "env(safe-area-inset-top)" }}
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-500",
        open ? "border-b border-transparent" : scrolled ? "border-b border-ink/10 bg-paper/95 md:bg-paper/80 md:backdrop-blur-md" : "border-b border-transparent",
      )}
    >
      {/* Phone menu backdrop: a wine blob that grows out of the Menu button and shrinks back into it */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none fixed inset-0 -z-10 bg-wine transition-[clip-path] md:hidden",
          open ? "duration-700 ease-[var(--ease-apple)]" : "duration-[450ms] ease-[cubic-bezier(0.4,0,0.6,1)]",
        )}
        style={{ clipPath: `circle(${open ? "150%" : "0px"} at calc(100% - 2.6rem) calc(env(safe-area-inset-top) + 2rem))` }}
      />
      <span aria-hidden className="scroll-progress pointer-events-none absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-ember" />
      <nav
        aria-label="Primary"
        className="mx-auto flex h-16 max-w-[90rem] items-center justify-between pr-[max(1.25rem,env(safe-area-inset-right))] pl-[max(1.25rem,env(safe-area-inset-left))] md:h-20 md:pr-[max(2.5rem,env(safe-area-inset-right))] md:pl-[max(2.5rem,env(safe-area-inset-left))]"
      >
        <Link href="/" className={cn("group flex items-baseline gap-2 transition-colors duration-300", open && "text-paper delay-150")} aria-label={`${site.name} — home`}>
          <span className="font-display text-2xl leading-none">Neil Jacob</span>
          <span className="font-serif text-lg italic opacity-75 transition-opacity group-hover:opacity-100">Santiago</span>
        </Link>

        <ul className="hidden items-center gap-6 md:flex lg:gap-9">
          {mainNav.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "label relative py-2 transition-colors",
                    "after:absolute after:inset-x-0 after:bottom-0 after:h-px after:origin-right after:scale-x-0 after:bg-ember after:transition-transform after:duration-500 hover:after:origin-left hover:after:scale-x-100",
                    active ? "text-ember after:scale-x-100" : "text-ink/75 hover:text-ink",
                    item.href === "/contact" && "rounded-full border border-ink/25 px-4 after:hidden hover:border-ember hover:bg-ember hover:text-paper",
                    item.href === "/play" && "flex items-center gap-1.5 after:hidden",
                  )}
                >
                  {item.href === "/play" && (
                    <span aria-hidden className="flex h-4 w-4 items-center justify-center rounded-full bg-ember text-paper">
                      <Icon name="play" className="ml-px h-2.5 w-2.5" />
                    </span>
                  )}
                  {item.label}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => {
                haptic();
                openPalette();
              }}
              aria-label="Search the site (Ctrl or Command + K)"
              title="Search · Ctrl/⌘ K"
              className="label press flex items-center gap-2 rounded-full bg-ink/[0.06] px-3 py-2 text-ink/75 hover:bg-ink hover:text-paper"
            >
              <Icon name="search" className="h-3.5 w-3.5" />
              <kbd className="hidden font-mono text-2xs lg:inline">⌘K</kbd>
            </button>
          </li>
        </ul>

        <button
          type="button"
          onClick={() => {
            haptic();
            setOpen((v) => !v);
          }}
          aria-expanded={open}
          aria-controls="site-menu"
          className={cn("label -mr-2 flex h-11 items-center gap-2 px-2 md:hidden", open && "text-paper")}
        >
          {open ? "Close" : "Menu"}
          <span aria-hidden className="relative block h-2.5 w-5">
            <span className={cn("absolute inset-x-0 top-0 h-px bg-current transition-transform duration-300", open && "translate-y-[5px] rotate-45")} />
            <span className={cn("absolute inset-x-0 bottom-0 h-px bg-current transition-transform duration-300", open && "-translate-y-[4px] -rotate-45")} />
          </span>
        </button>
      </nav>

      <div
        id="site-menu"
        hidden={!open}
        className="h-[calc(100dvh-4rem-env(safe-area-inset-top))] overflow-y-auto overscroll-contain px-5 pt-6 pb-[max(2rem,env(safe-area-inset-bottom))] text-paper md:hidden"
      >
        <ul className="border-t border-paper/15">
          {[{ label: "Home", href: "/", description: "Start here" }, ...mainNav].map((item, i) => (
            <li key={item.href} className="animate-slide-in border-b border-paper/15" style={{ animationDelay: `${80 + i * 60}ms` }}>
              <Link
                href={item.href}
                aria-current={isActivePath(pathname, item.href) ? "page" : undefined}
                className="flex items-end justify-between gap-4 py-4 aria-[current=page]:text-sky"
              >
                <span className="font-display text-5xl leading-none">{item.label}</span>
                <span className="label pb-1 text-paper/70">0{i + 1}</span>
              </Link>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            openPalette();
          }}
          className="animate-slide-in label mt-8 flex w-full items-center justify-between rounded-full bg-paper/10 px-5 py-4 text-paper"
          style={{ animationDelay: "400ms" }}
        >
          Search projects, tools & photos <Icon name="search" className="h-4 w-4" />
        </button>
        <div className="animate-slide-in mt-10 flex flex-wrap gap-x-6 gap-y-3" style={{ animationDelay: "420ms" }}>
          {socials.filter((s) => s.url).map((s) => (
            <a key={s.name} href={s.url!} target="_blank" rel="noopener noreferrer" className="label inline-flex items-center gap-1 text-paper/75">
              {s.name} <Icon name="arrow-up-right" />
            </a>
          ))}
        </div>
        <p className="animate-slide-in mt-10 font-serif text-lg text-paper/70 italic" style={{ animationDelay: "480ms" }}>{site.tagline}</p>
      </div>
    </header>
  );
}
