"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// The palette's code is only downloaded the first time it's opened.
const CommandPalette = dynamic(() => import("./CommandPalette"), { ssr: false });

export const PALETTE_EVENT = "palette:open";
export const openPalette = () => dispatchEvent(new Event(PALETTE_EVENT));

/** Listens for ⌘K / Ctrl+K (or a "Search" button) anywhere on the site. */
export default function PaletteHost() {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const show = () => {
      setLoaded(true);
      setOpen(true);
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setLoaded(true);
        setOpen((v) => !v);
      }
    };
    addEventListener("keydown", onKey);
    addEventListener(PALETTE_EVENT, show);
    return () => {
      removeEventListener("keydown", onKey);
      removeEventListener(PALETTE_EVENT, show);
    };
  }, []);

  return loaded ? <CommandPalette open={open} onClose={() => setOpen(false)} /> : null;
}
