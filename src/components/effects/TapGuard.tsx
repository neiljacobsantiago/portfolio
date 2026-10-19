"use client";

import { useEffect } from "react";

// Things a tap is meant for. Text fields and selects are left alone: they
// focus or open on press, so there is nothing to rescue.
const CLICKABLE =
  "a[href], button:not(:disabled), summary, label, [role=button], [role=tab], [role=switch], [role=checkbox], [role=radio], [role=option], [role=menuitem], input[type=checkbox]:not(:disabled), input[type=radio]:not(:disabled)";

/** Max travel (px) for a press to still count as a tap rather than a drag or scroll. */
const SLOP = 10;

/**
 * Makes every tap and click land on what was pressed.
 *
 * Buttons shrink when pressed, pills lift on hover, and sections slide into
 * place as they scroll in. If the target moves while a finger or cursor is
 * down, the browser sends the click to whatever is under the release point
 * instead: the parent, a neighbour or nothing. The button took focus, but
 * nothing happened.
 *
 * So: a press shrinks toward the point under the pointer (`--tap-x/y`, read by
 * the `press` and `btn` utilities), which keeps that point still. And when a
 * short, still tap releases off its target anyway, the stray click is
 * cancelled and replayed on the element that was pressed. Drags, scrolls,
 * long presses and anything a component cancelled itself stay untouched.
 */
export default function TapGuard() {
  useEffect(() => {
    let down: { el: HTMLElement; x: number; y: number; t: number; id: number } | null = null;
    let armed: { el: HTMLElement; t: number } | null = null;
    let timer = 0;
    let lastScroll = 0;

    const disarm = () => {
      armed = null;
      clearTimeout(timer);
    };

    const onScroll = () => (lastScroll = performance.now());

    const onDown = (e: PointerEvent) => {
      down = null;
      disarm();
      if (!e.isPrimary || e.button !== 0) return;
      const el = (e.target as Element | null)?.closest?.<HTMLElement>(CLICKABLE);
      if (!el) return;
      // Shrink toward the finger, not the centre.
      const press = el.closest<HTMLElement>(".press, .btn");
      if (press) {
        const r = press.getBoundingClientRect();
        if (r.width && r.height) {
          press.style.setProperty("--tap-x", `${((e.clientX - r.left) * press.offsetWidth) / r.width}px`);
          press.style.setProperty("--tap-y", `${((e.clientY - r.top) * press.offsetHeight) / r.height}px`);
        }
      }
      // A touch that stops a moving page is the browser's "stop", not a tap.
      if (performance.now() - lastScroll < 120) return;
      down = { el, x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
    };

    // Bubble phase on window: runs after the page's own handlers, so their
    // preventDefault() is visible here.
    const onUp = (e: PointerEvent) => {
      const d = down;
      down = null;
      if (!d || e.pointerId !== d.id || e.defaultPrevented) return;
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > SLOP || performance.now() - d.t > 800) return;
      if (!d.el.isConnected || d.el.closest("[inert]")) return;
      armed = { el: d.el, t: performance.now() };
      const under = document.elementFromPoint(e.clientX, e.clientY);
      if (under && d.el.contains(under)) return;
      // Released over something that isn't clickable: Safari may send no click at all.
      timer = window.setTimeout(() => {
        if (armed?.el !== d.el) return;
        armed = null;
        d.el.click();
      }, 320);
    };

    // A component that cancels touchend means "no click here".
    const onTouchEnd = (e: TouchEvent) => e.defaultPrevented && disarm();

    const onClick = (e: MouseEvent) => {
      if (!armed || !e.isTrusted) return;
      const a = armed;
      disarm();
      if (performance.now() - a.t > 600 || a.el.contains(e.target as Node)) return;
      // The click strayed: drop it and give it to the element that was pressed.
      e.preventDefault();
      e.stopImmediatePropagation();
      a.el.click();
    };

    const onCancel = () => {
      down = null;
      disarm();
    };

    addEventListener("scroll", onScroll, { capture: true, passive: true });
    addEventListener("pointerdown", onDown, { capture: true, passive: true });
    addEventListener("pointerup", onUp, { passive: true });
    addEventListener("pointercancel", onCancel, { passive: true });
    addEventListener("touchend", onTouchEnd, { passive: true });
    addEventListener("click", onClick, true);
    return () => {
      clearTimeout(timer);
      removeEventListener("scroll", onScroll, { capture: true });
      removeEventListener("pointerdown", onDown, { capture: true });
      removeEventListener("pointerup", onUp);
      removeEventListener("pointercancel", onCancel);
      removeEventListener("touchend", onTouchEnd);
      removeEventListener("click", onClick, true);
    };
  }, []);

  return null;
}
