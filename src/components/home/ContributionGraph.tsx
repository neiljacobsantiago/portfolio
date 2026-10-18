"use client";

import { useEffect, useRef, useState } from "react";
import type { Day } from "@/lib/github";
import { cn } from "@/lib/utils";

const LEVEL_CLASS = ["bg-paper/[0.07]", "bg-sky/40", "bg-sky/80", "bg-paper", "bg-ember"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const fmt = (date: string) =>
  new Intl.DateTimeFormat("en-PH", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));

// Fixed 12px weeks on phones (scrolls sideways); stretched to the full width on large screens.
const COLUMNS = "grid gap-[3px] [grid-template-columns:repeat(var(--n),12px)] lg:[grid-template-columns:repeat(var(--n),minmax(0,1fr))]";

type Tip = { day: Day; x: number; y: number };

/**
 * The year of contributions as a heatmap. On large screens it stretches to
 * the full width with hover read-outs; on phones it scrolls sideways and
 * opens on the most recent weeks. Hovering a legend swatch isolates that level.
 */
export default function ContributionGraph({ weeks, byWeekday }: { weeks: (Day | null)[][]; byWeekday: number[] }) {
  const wrap = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  const [tip, setTip] = useState<Tip | null>(null);
  const [level, setLevel] = useState<number | null>(null);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollLeft = el.scrollWidth; // phones open on "now"
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      setShown(true);
      io.disconnect();
    }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Month labels sit above the first week that starts a new month.
  const months: { col: number; label: string }[] = [];
  weeks.forEach((w, i) => {
    const first = w.find(Boolean);
    if (!first) return;
    const m = Number(first.date.slice(5, 7)) - 1;
    const prev = weeks[i - 1]?.find(Boolean);
    if (!prev || Number(prev.date.slice(5, 7)) - 1 !== m) months.push({ col: i, label: MONTHS[m] });
  });
  if (months.length > 1 && months[1].col - months[0].col < 3) months.shift(); // avoid a cramped partial first month

  const pointAt = (target: EventTarget | null) => {
    const cell = (target as HTMLElement | null)?.closest<HTMLElement>("[data-date]");
    const box = wrap.current?.getBoundingClientRect();
    if (!cell || !box) return; // in a gap between cells: keep the last read-out
    const r = cell.getBoundingClientRect();
    const day = weeks[Number(cell.dataset.w)][Number(cell.dataset.d)];
    if (!day) return;
    // Keep the bubble inside the panel so it never hits an invisible wall.
    const x = Math.min(box.width - 92, Math.max(92, r.left - box.left + r.width / 2));
    setTip({ day, x, y: r.top - box.top });
  };

  const maxWeekday = Math.max(1, ...byWeekday);
  const cols = { "--n": weeks.length } as React.CSSProperties;

  return (
    <div ref={wrap} className="relative">
      <div ref={scroller} data-lenis-prevent-touch className="no-scrollbar -mx-5 overflow-x-auto px-5 pb-1 lg:mx-0 lg:overflow-visible lg:px-0">
        <div className="grid w-max grid-cols-[2rem_auto] gap-x-2 lg:w-full lg:grid-cols-[2.25rem_1fr]">
          {/* Months */}
          <span />
          <div className={`relative h-5 ${COLUMNS}`} style={cols}>
            {months.map((m) => (
              <span key={m.col} className="label text-3xs whitespace-nowrap text-paper/70" style={{ gridColumn: `${m.col + 1} / span 3`, gridRow: 1 }}>
                {m.label}
              </span>
            ))}
          </div>

          {/* Weekday labels */}
          <div className="grid grid-rows-7 gap-[3px] pr-1" aria-hidden>
            {WEEKDAYS.map((d, i) => (
              <span
                key={d}
                className={cn("label flex items-center text-3xs transition-colors", tip && new Date(`${tip.day.date}T00:00:00Z`).getUTCDay() === i ? "text-ember" : "text-paper/70", i % 2 === 0 && "max-lg:invisible")}
              >
                {d}
              </span>
            ))}
          </div>

          {/* Cells */}
          <div
            role="img"
            aria-label={`Contribution heatmap for the last ${weeks.length} weeks`}
            onPointerOver={(e) => pointAt(e.target)}
            onPointerLeave={() => setTip(null)}
            onClick={(e) => pointAt(e.target)}
            className={`grid-rows-7 ${COLUMNS}`}
            style={cols}
          >
            {weeks.map((w, wi) =>
              w.map((d, di) =>
                d ? (
                  <span
                    key={d.date}
                    data-date={d.date}
                    data-w={wi}
                    data-d={di}
                    className={cn(
                      "aspect-square w-full rounded-[3px] transition-[opacity,transform,filter] duration-500 ease-[var(--ease-spring)] hover:scale-[1.6] hover:ring-2 hover:ring-paper",
                      LEVEL_CLASS[d.level],
                      shown ? "scale-100 opacity-100" : "scale-0 opacity-0",
                      level !== null && level !== d.level && "opacity-15",
                      tip?.day.date === d.date && "scale-[1.6] ring-2 ring-paper",
                    )}
                    style={{ transitionDelay: shown && level === null && !tip ? `${wi * 14 + di * 10}ms` : "0ms", gridRow: di + 1, gridColumn: wi + 1 }}
                  />
                ) : (
                  <span key={`pad-${wi}-${di}`} style={{ gridRow: di + 1, gridColumn: wi + 1 }} />
                ),
              ),
            )}
          </div>
        </div>
      </div>

      {tip && (
        <div
          role="status"
          className="animate-blob-in pointer-events-none absolute z-10 origin-bottom -translate-x-1/2 -translate-y-[calc(100%+10px)] rounded-full bg-paper px-4 py-2 text-center whitespace-nowrap text-ink shadow-[0_12px_30px_-10px_rgb(0_0_0/0.6)]"
          style={{ left: tip.x, top: tip.y }}
        >
          <span className="font-display text-lg leading-none">{tip.day.count === 0 ? "No" : tip.day.count}</span>
          <span className="font-serif text-sm text-ink/70 italic"> contribution{tip.day.count === 1 ? "" : "s"} · {fmt(tip.day.date)}</span>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        {/* Legend: hover a level to isolate it */}
        <div className="flex items-center gap-2" onPointerLeave={() => setLevel(null)}>
          <span className="label text-3xs text-paper/70">Less</span>
          {LEVEL_CLASS.map((c, i) => (
            <button
              key={c}
              type="button"
              aria-label={`Highlight level ${i}`}
              aria-pressed={level === i}
              onPointerEnter={() => setLevel(i)}
              onFocus={() => setLevel(i)}
              onBlur={() => setLevel(null)}
              onClick={() => setLevel((l) => (l === i ? null : i))}
              className={cn("press h-3.5 w-3.5 rounded-[3px] transition-transform duration-300 ease-[var(--ease-spring)] hover:scale-125 aria-pressed:scale-125 aria-pressed:ring-2 aria-pressed:ring-paper", c)}
            />
          ))}
          <span className="label text-3xs text-paper/70">More</span>
        </div>

        {/* Weekly rhythm */}
        <div className="flex items-end gap-3" aria-label="Contributions by weekday">
          <span className="label mr-1 self-center text-3xs text-paper/70">Rhythm</span>
          {byWeekday.map((n, i) => (
            <div key={WEEKDAYS[i]} className="group flex flex-col items-center gap-1.5" title={`${n} on ${WEEKDAYS[i]}s`}>
              <div className="flex h-12 w-3 items-end overflow-hidden rounded-full bg-paper/[0.07]">
                <div
                  className="w-full rounded-full bg-sky transition-[height,background-color] duration-1000 ease-[var(--ease-apple)] group-hover:bg-ember"
                  style={{ height: shown ? `${Math.max(8, (n / maxWeekday) * 100)}%` : "0%", transitionDelay: `${300 + i * 60}ms` }}
                />
              </div>
              <span className="label text-3xs text-paper/70">{WEEKDAYS[i][0]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
