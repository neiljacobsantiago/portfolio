"use client";

import { useEffect, useState } from "react";
import { site } from "@/lib/site";

const fmt = new Intl.DateTimeFormat("en-PH", { hour: "numeric", minute: "2-digit", timeZone: site.timeZone });
const hourFmt = new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: site.timeZone });

function greeting(hour: number) {
  if (hour < 5) return "probably stacking star photos";
  if (hour < 12) return "likely in class or on shift";
  if (hour < 18) return "out shooting or configuring something";
  if (hour < 22) return "editing the day's frames";
  return "probably stacking star photos";
}

/** Neil's local time, ticking. Renders a neutral placeholder on the server. */
export default function LocalClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 15_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  return (
    <>
      <span className="font-display text-[clamp(3.5rem,9vw,7rem)] leading-none tabular-nums">{now ? fmt.format(now) : "—:—"}</span>
      <span className="mt-3 block font-serif text-xl italic text-ink/75">
        {now ? `Neil is ${greeting(Number(hourFmt.format(now)))}.` : "Checking the time in the Philippines…"}
      </span>
    </>
  );
}
