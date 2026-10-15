"use client";

import { useEffect } from "react";

/**
 * One IntersectionObserver for the whole app. Any element with `data-reveal`
 * (see `reveal()` in lib/reveal.ts) fades in once it scrolls into view.
 * It also blooms `.logo-bloom` logos on touch screens. A MutationObserver
 * picks up elements added by client navigations.
 */
export default function RevealObserver() {
  useEffect(() => {
    const show = (el: Element) => el.setAttribute("data-revealed", "");

    if (!("IntersectionObserver" in window)) {
      document.querySelectorAll("[data-reveal]").forEach(show);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            show(entry.target);
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );

    // Phones have no hover, so logos bloom into colour while they pass through
    // the middle band of the screen instead (a little staggered, row by row).
    const touch = matchMedia("(hover: none)").matches;
    const bloom = touch
      ? new IntersectionObserver(
          (entries) => {
            let n = 0;
            for (const entry of entries) {
              const el = entry.target as HTMLElement;
              if (entry.isIntersecting) {
                el.style.transitionDelay = `${(n++ % 6) * 60}ms`;
                el.setAttribute("data-inview", "");
              } else {
                el.style.transitionDelay = "";
                el.removeAttribute("data-inview");
              }
            }
          },
          { rootMargin: "-22% 0px -22% 0px" },
        )
      : null;

    const scan = (root: ParentNode) => {
      root.querySelectorAll("[data-reveal]:not([data-revealed])").forEach((el) => io.observe(el));
      if (bloom) root.querySelectorAll(".logo-bloom").forEach((el) => bloom.observe(el));
    };

    scan(document);

    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          if (node.matches("[data-reveal]:not([data-revealed])")) io.observe(node);
          if (bloom && node.matches(".logo-bloom")) bloom.observe(node);
          scan(node);
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      bloom?.disconnect();
      mo.disconnect();
    };
  }, []);

  return null;
}
