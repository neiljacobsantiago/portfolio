"use client";

import { useEffect } from "react";

/**
 * While a game is being played it owns the screen: this marks <html> so
 * floating site widgets (like the chat launcher) step aside. Counted, so
 * two games on one page don't fight over it.
 */
export function useImmersive(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const el = document.documentElement;
    el.dataset.immersive = String(Number(el.dataset.immersive || 0) + 1);
    return () => {
      const left = Number(el.dataset.immersive || 1) - 1;
      if (left <= 0) delete el.dataset.immersive;
      else el.dataset.immersive = String(left);
    };
  }, [active]);
}
