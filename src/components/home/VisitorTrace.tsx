"use client";

import { useEffect, useRef, useState } from "react";
import { Crosshair } from "lucide-react";

interface Visitor {
  ip: string;
  city: string;
  org: string;
}

const MASKED: Visitor = { ip: "192.168.1.1 (MASKED)", city: "LOCAL_HOST", org: "SECURE PROXY" };

/** Shows the visitor their own connection. Only fetched once the card is on screen. */
export default function VisitorTrace() {
  const ref = useRef<HTMLDivElement>(null);
  const [visitor, setVisitor] = useState<Visitor | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const controller = new AbortController();
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
      if (saveData) return setVisitor(MASKED);
      fetch("https://ipapi.co/json/", { signal: controller.signal })
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error("rate limited"))))
        .then((d) => setVisitor({ ip: d.ip ?? MASKED.ip, city: d.city ?? MASKED.city, org: d.org ?? MASKED.org }))
        .catch(() => !controller.signal.aborted && setVisitor(MASKED));
    });
    io.observe(el);
    return () => {
      io.disconnect();
      controller.abort();
    };
  }, []);

  return (
    <div ref={ref} className="relative flex-1 border border-accentRed/40 bg-accentRed/5 p-6">
      <h3 className="mb-4 flex items-center gap-2 font-mono text-xs tracking-widest text-accentRed uppercase">
        <Crosshair className="h-4 w-4" /> Incoming Trace
      </h3>
      {visitor ? (
        <dl className="space-y-3 font-mono text-sm">
          <Row label="Origin IP" value={visitor.ip} highlight />
          <Row label="Routing City" value={visitor.city} />
          <Row label="ISP / Org" value={visitor.org} last />
        </dl>
      ) : (
        <p className="animate-pulse font-mono text-sm opacity-50">Bypassing limiters...</p>
      )}
    </div>
  );
}

function Row({ label, value, highlight, last }: { label: string; value: string; highlight?: boolean; last?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${last ? "pb-1" : "border-b border-butter/10 pb-2"}`}>
      <dt className="shrink-0 text-[10px] uppercase opacity-60">{label}</dt>
      <dd className={`min-w-0 truncate text-right ${highlight ? "font-bold text-accentRed" : "text-butter"}`} title={value}>
        {value}
      </dd>
    </div>
  );
}
