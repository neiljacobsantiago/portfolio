import type { CSSProperties } from "react";

type RevealVariant = "up" | "left" | "right" | "scale";

/**
 * Spread onto any element to fade it in when it scrolls into view.
 * Works in Server Components: it is just a data attribute plus a CSS variable.
 *
 *   <div {...reveal()} />            // slide up
 *   <li {...reveal("left", i * 80)} /> // staggered
 */
export function reveal(variant: RevealVariant = "up", delayMs = 0) {
  return {
    "data-reveal": variant,
    style: { "--reveal-delay": `${Math.min(delayMs, 600)}ms` } as CSSProperties,
  };
}
