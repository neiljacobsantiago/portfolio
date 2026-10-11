"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { contactNav, isActivePath, primaryNav, utilityNav } from "@/lib/site";
import { cn } from "@/lib/utils";

export default function NavBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);

  // Close the drawer whenever the route changes (back/forward included).
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

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
    <header className="fixed top-0 left-0 z-50 w-full border-b border-butter/10 bg-marine/95 md:bg-marine/80 md:backdrop-blur-md">
      <nav aria-label="Primary" className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 md:h-20 md:px-16">
        <Link href="/" className="group interactive flex flex-col" aria-label="Neil Jacob Santiago — home">
          <span className="font-display text-xl font-black tracking-tighter text-accentRed uppercase transition-colors group-hover:text-butter md:text-2xl">
            Neil.Jacob
          </span>
          <span className="font-mono text-[8px] tracking-widest text-butter/50 uppercase">Sys_Admin</span>
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-6 lg:flex xl:gap-8">
          {[...primaryNav, ...utilityNav].map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "interactive relative py-2 font-mono text-xs tracking-widest uppercase transition-colors",
                  "after:absolute after:right-0 after:-bottom-0.5 after:left-0 after:h-0.5 after:origin-left after:bg-accentRed after:transition-transform",
                  active ? "text-accentRed after:scale-x-100" : "text-butter/60 after:scale-x-0 hover:text-butter",
                )}
              >
                {item.label}
              </Link>
            );
          })}
          <Link
            href={contactNav.href}
            aria-current={isActivePath(pathname, contactNav.href) ? "page" : undefined}
            className="interactive border border-accentRed bg-accentRed/10 px-4 py-2 font-mono text-xs tracking-widest text-butter uppercase transition-colors hover:bg-accentRed"
          >
            {contactNav.label}
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          className="interactive -mr-2 flex h-11 w-11 items-center justify-center text-butter lg:hidden"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {/* Mobile drawer */}
      <div
        id="mobile-menu"
        hidden={!open}
        className="h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain border-t border-butter/10 bg-marine px-4 pt-6 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6 md:h-[calc(100dvh-5rem)] lg:hidden"
      >
        <MobileGroup title="Directory" items={[{ label: "Root", href: "/", description: "Home" }, ...primaryNav]} pathname={pathname} />
        <MobileGroup title="Utilities" items={utilityNav} pathname={pathname} />
        <Link
          href={contactNav.href}
          className="mt-6 flex items-center justify-center bg-accentRed py-4 font-display text-lg font-bold tracking-widest text-butter uppercase active:bg-butter active:text-marine"
        >
          Open a channel → {contactNav.label}
        </Link>
      </div>
    </header>
  );
}

function MobileGroup({ title, items, pathname }: { title: string; items: { label: string; href: string; description: string }[]; pathname: string }) {
  return (
    <div className="mb-6">
      <p className="mb-2 font-mono text-[10px] tracking-[0.3em] text-butter/40 uppercase">{title}</p>
      <ul className="divide-y divide-butter/10 border-y border-butter/10">
        {items.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn("flex items-baseline justify-between gap-4 py-3.5 active:bg-butter/5", active && "text-accentRed")}
              >
                <span className="font-display text-2xl font-bold uppercase">{item.label}</span>
                <span className="text-right font-mono text-[10px] tracking-widest uppercase opacity-50">{item.description}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
