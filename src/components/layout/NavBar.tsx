"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { isActivePath, mainNav, site, socials } from "@/lib/site";
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
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-500",
        open ? "bg-wine" : scrolled ? "border-b border-ink/10 bg-paper/95 md:bg-paper/80 md:backdrop-blur-md" : "border-b border-transparent",
      )}
    >
      <nav aria-label="Primary" className="mx-auto flex h-16 max-w-[90rem] items-center justify-between px-5 md:h-20 md:px-10">
        <Link href="/" className={cn("group flex items-baseline gap-2", open && "text-paper")} aria-label={`${site.name} — home`}>
          <span className="font-display text-2xl leading-none">Neil Jacob</span>
          <span className="font-serif text-lg italic opacity-60 transition-opacity group-hover:opacity-100">Santiago</span>
        </Link>

        <ul className="hidden items-center gap-9 md:flex">
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
                  )}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
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
        className="h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain bg-wine px-5 pt-6 pb-[max(2rem,env(safe-area-inset-bottom))] text-paper md:hidden"
      >
        <ul className="border-t border-paper/15">
          {[{ label: "Home", href: "/", description: "Start here" }, ...mainNav].map((item, i) => (
            <li key={item.href} className="border-b border-paper/15">
              <Link
                href={item.href}
                aria-current={isActivePath(pathname, item.href) ? "page" : undefined}
                className="flex items-end justify-between gap-4 py-4 aria-[current=page]:text-sky"
              >
                <span className="font-display text-5xl leading-none">{item.label}</span>
                <span className="label pb-1 text-paper/50">0{i + 1}</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3">
          {socials.filter((s) => s.url).map((s) => (
            <a key={s.name} href={s.url!} target="_blank" rel="noopener noreferrer" className="label text-paper/70">
              {s.name} ↗
            </a>
          ))}
        </div>
        <p className="mt-10 font-serif text-lg text-paper/70 italic">{site.tagline}</p>
      </div>
    </header>
  );
}
