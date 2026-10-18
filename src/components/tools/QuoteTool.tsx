"use client";

import Link from "next/link";
import { useState } from "react";
import { addOns, bookingTerms, PRIVATE_PEOPLE_INCLUDED, services } from "@/content/sessions";
import { haptic } from "@/lib/haptics";
import { findService, peso, quote } from "@/lib/tools/quote";
import { cn } from "@/lib/utils";
import { Note } from "./ui";
import Icon from "@/components/ui/Icon";

/** Price, downpayment and a pre-filled booking link for any photoshoot package. */
export default function QuoteTool({
  service: s0 = "graduation",
  package: p0,
  people: n0 = 1,
  addOns: a0 = [],
  compact,
}: {
  service?: string;
  package?: string;
  people?: number;
  addOns?: string[];
  compact?: boolean;
}) {
  const start = findService(s0) ?? services[0];
  const [serviceId, setServiceId] = useState(start.id);
  const [packageId, setPackageId] = useState(() => (quote(start.id, p0) as Exclude<ReturnType<typeof quote>, { error: string }>).pkg.id);
  const [people, setPeople] = useState(n0);
  const [picked, setPicked] = useState<string[]>(a0);
  const base = quote(serviceId, packageId);
  if ("error" in base) return null;
  // Group packages are priced per head (3 or more); custom shoots include 2 people and take add-ons.
  const perHead = base.pkg.price.includes("/ head");
  const custom = Boolean(base.service.custom);
  const min = perHead ? 3 : 1;
  const count = Math.max(min, people);
  const q = perHead || custom ? (quote(serviceId, packageId, count, picked) as typeof base) : base;

  return (
    <div className="space-y-4">
      <div className="no-scrollbar flex gap-1 overflow-x-auto">
        {services.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-pressed={serviceId === s.id}
            onClick={() => {
              haptic();
              setServiceId(s.id);
              setPackageId(s.packages[0].id);
            }}
            className="label press shrink-0 rounded-full border border-ink/15 px-3 py-1.5 text-3xs whitespace-nowrap aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper"
          >
            {s.name.replace(" Photoshoot", "").replace("In-House ", "")}
          </button>
        ))}
      </div>

      <ul className={cn("grid [&>*]:min-w-0 gap-2", !compact && "sm:grid-cols-2")}>
        {q.service.packages.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              aria-pressed={q.pkg.id === p.id}
              onClick={() => setPackageId(p.id)}
              className="press flex w-full items-start justify-between gap-3 rounded-[2px] border border-ink/15 bg-paper/70 p-3 text-left aria-pressed:border-ember aria-pressed:ring-1 aria-pressed:ring-ember"
            >
              <span>
                <span className="block font-serif text-base leading-snug">{p.name}</span>
                <span className="label text-3xs text-ink/70">{p.detail}</span>
              </span>
              <span className="shrink-0 font-display text-base">{p.price}</span>
            </button>
          </li>
        ))}
      </ul>

      {(perHead || custom) && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="label text-3xs text-ink/70">People</span>
          <button type="button" onClick={() => setPeople(Math.max(min, count - 1))} aria-label="Fewer people" className="press h-8 w-8 rounded-full border border-ink/20">
            −
          </button>
          <span className="w-8 text-center font-display text-xl tabular-nums">{count}</span>
          <button type="button" onClick={() => setPeople(Math.min(custom ? 20 : 50, count + 1))} aria-label="More people" className="press h-8 w-8 rounded-full border border-ink/20">
            +
          </button>
          {custom && <span className="font-serif text-sm text-ink/70 italic">{PRIVATE_PEOPLE_INCLUDED} included</span>}
        </div>
      )}

      {custom && (
        <div>
          <p className="label mb-2 text-3xs text-ink/70">Add-ons</p>
          <div className="flex flex-wrap gap-1.5">
            {addOns.map((a) => (
              <button
                key={a.id}
                type="button"
                aria-pressed={picked.includes(a.id)}
                onClick={() => {
                  haptic();
                  setPicked((ids) => (ids.includes(a.id) ? ids.filter((id) => id !== a.id) : [...ids, a.id]));
                }}
                className="press rounded-full border border-ink/15 px-3 py-1.5 text-left font-serif text-sm aria-pressed:border-ember aria-pressed:bg-ember aria-pressed:text-paper"
              >
                {a.name} <span className="opacity-80">{a.amount === null ? "· quote" : `+${peso(a.amount)}`}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4 rounded-[2px] bg-ink p-4 text-paper">
        <div>
          <p className="label text-3xs text-sky">{q.total === null ? "Price" : "Total"}</p>
          <p className="font-display text-4xl leading-none">{q.total === null ? "By quote" : peso(q.total)}</p>
          {q.downpayment !== null && <p className="mt-2 font-serif text-sm text-paper/75">{peso(q.downpayment)} downpayment secures the date</p>}
          {q.quoted.length > 0 && <p className="font-serif text-sm text-paper/75">+ {q.quoted.join(", ")}, quoted separately</p>}
        </div>
        <Link href={q.bookHref} className="btn bg-paper py-3 text-ink hover:bg-sky">
          Book this <Icon name="arrow-right" className="arrow" />
        </Link>
      </div>
      {!compact && <Note>{bookingTerms.join(" ")}</Note>}
    </div>
  );
}
