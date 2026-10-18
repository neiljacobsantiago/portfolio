"use client";

import { useState } from "react";
import Icon from "@/components/ui/Icon";
import { haptic } from "@/lib/haptics";
import {
  RATES,
  SLOTS,
  START,
  checkout,
  clock,
  duration,
  editPlate,
  fee,
  freeSlots,
  open,
  park,
  remove,
  sampleLot,
  showPlate,
  type Lot,
  type Receipt,
  type Vehicle,
} from "@/lib/tools/parkmate";
import { cn } from "@/lib/utils";
import { Field, Note, Segmented, input } from "./ui";

const peso = (n: number) => `₱${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
const STEPS = [
  { label: "+15 min", by: 15 },
  { label: "+1 h", by: 60 },
  { label: "+3 h", by: 180 },
];

/** ParkMate's logbook as a desk: allocate, correct, delete, check out — with the fee worked out. */
export default function ParkMateTool({ compact }: { compact?: boolean }) {
  const [lot, setLot] = useState<Lot>(sampleLot);
  const [now, setNow] = useState(START);
  const [plate, setPlate] = useState("");
  const [type, setType] = useState<Vehicle>("car");
  const [selected, setSelected] = useState<number | null>(null);
  const [edit, setEdit] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const inside = open(lot);
  const sel = inside.find((t) => t.no === selected) ?? null;
  const closed = lot.tickets.filter((t) => t.outAt !== undefined);
  const collected = closed.reduce((s, t) => s + (t.fee ?? 0), 0);

  const say = (ok: boolean, text: string) => {
    haptic(ok ? 10 : 20);
    setMsg({ ok, text });
  };
  const pick = (no: number | null) => {
    setSelected(no);
    setEdit(no ? showPlate(lot.tickets.find((t) => t.no === no)!.plate) : "");
  };

  const logIn = () => {
    const r = park(lot, plate, type, now);
    if (!r.ok) return say(false, r.error);
    setLot(r.lot);
    setPlate("");
    setReceipt(null);
    pick(null);
    say(true, `${showPlate(r.ticket.plate)} goes to ${r.ticket.slot}, the nearest free ${type === "car" ? "car" : "motorcycle"} slot. Ticket #${r.ticket.no} at ${clock(now)}.`);
  };

  return (
    <div className="space-y-5">
      {/* Clock */}
      <div className="flex flex-wrap items-center gap-2 rounded-[2px] bg-ink px-3 py-2.5 text-paper">
        <Icon name="clock" className="h-4 w-4 text-sky" />
        <span className="font-display text-2xl leading-none tabular-nums">{clock(now)}</span>
        <span className="label mr-auto text-3xs text-paper/70">Lot clock</span>
        {STEPS.map((s) => (
          <button key={s.by} type="button" onClick={() => setNow((n) => n + s.by)} className="label press rounded-full bg-paper/10 px-2.5 py-1.5 text-3xs hover:bg-paper/20">
            {s.label}
          </button>
        ))}
      </div>

      {/* Lot map */}
      <div className="space-y-2">
        {(["car", "motorcycle"] as const).map((kind) => (
          <div key={kind}>
            <p className="label mb-1.5 flex justify-between text-3xs text-ink/70">
              <span>{kind === "car" ? "Cars" : "Motorcycles"} · entrance on the left</span>
              <span>{freeSlots(lot, kind).length} free</span>
            </p>
            <ul className={cn("grid [&>*]:min-w-0 gap-1.5", kind === "car" ? "grid-cols-4" : "grid-cols-4")}>
              {SLOTS.filter((s) => s.type === kind).map((s) => {
                const t = inside.find((x) => x.slot === s.id);
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      disabled={!t}
                      aria-pressed={!!t && t.no === selected}
                      onClick={() => t && pick(t.no === selected ? null : t.no)}
                      className={cn(
                        "flex w-full flex-col items-start rounded-[2px] border px-2 text-left transition-colors",
                        kind === "car" ? "h-16 py-1.5" : "h-12 py-1",
                        t ? "press border-ink bg-ink text-paper hover:bg-wine aria-pressed:bg-ember aria-pressed:border-ember" : "border-dashed border-ink/25 text-ink/70",
                      )}
                    >
                      <span className="font-mono text-2xs">{s.id}</span>
                      {t ? (
                        <>
                          <span className="w-full truncate font-mono text-[0.7rem] leading-tight font-bold">{showPlate(t.plate)}</span>
                          {kind === "car" && <span className="font-mono text-3xs opacity-80">in {clock(t.inAt)}</span>}
                        </>
                      ) : (
                        <span className="font-serif text-xs italic">free</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Selected vehicle: update, delete, check out */}
      {sel ? (
        <div className="animate-pop-in space-y-3 rounded-[2px] p-3.5 ring-1 ring-ember/40">
          <p className="label flex items-center justify-between text-3xs text-ink/70">
            <span>
              Ticket #{sel.no} · slot {sel.slot}
            </span>
            <button type="button" onClick={() => pick(null)} aria-label="Close" className="press -m-1 p-1 text-ink/70 hover:text-ink">
              <Icon name="close" />
            </button>
          </p>
          <div className="flex gap-2">
            <input value={edit} onChange={(e) => setEdit(e.target.value)} aria-label="Plate number" className={cn(input, "uppercase")} />
            <button
              type="button"
              onClick={() => {
                const r = editPlate(lot, sel.no, edit);
                if (!r.ok) return say(false, r.error);
                setLot(r.lot);
                say(true, `Ticket #${sel.no} corrected to ${showPlate(r.ticket.plate)}. Slot and time in unchanged.`);
              }}
              className="label press shrink-0 rounded-full border border-ink/20 px-3 text-3xs hover:border-ink"
            >
              Save
            </button>
          </div>
          <p className="font-serif text-sm text-ink/70">
            In at {clock(sel.inAt)} · {duration(now - sel.inAt)} so far · {peso(fee(sel.type, now - sel.inAt).total)} if they leave now
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                const r = checkout(lot, sel.no, now);
                if (!r.ok) return say(false, r.error);
                setLot(r.lot);
                setReceipt(r.receipt);
                pick(null);
                say(true, `${showPlate(r.receipt.ticket.plate)} checked out. Slot ${r.receipt.ticket.slot} is free again.`);
              }}
              className="btn bg-ink py-3 text-paper hover:bg-ember"
            >
              Check out <Icon name="arrow-right" className="arrow" />
            </button>
            <button
              type="button"
              onClick={() => {
                const r = remove(lot, sel.no);
                if (!r.ok) return say(false, r.error);
                setLot(r.lot);
                pick(null);
                say(true, `Entry #${sel.no} deleted as a mistake. No fee, no record.`);
              }}
              className="label press text-3xs text-ember hover:text-ink"
            >
              Delete entry
            </button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            logIn();
          }}
          className={cn("grid [&>*]:min-w-0 gap-3", !compact && "sm:grid-cols-[1fr_auto_auto] sm:items-end")}
        >
          <Field label="Plate number">
            <input value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="ABC 1234" autoCapitalize="characters" className={cn(input, "uppercase")} />
          </Field>
          <Segmented
            label="Vehicle"
            value={type}
            onChange={setType}
            options={[
              { value: "car", label: "Car" },
              { value: "motorcycle", label: "Motorcycle" },
            ]}
          />
          <button type="submit" className="btn justify-center bg-ink py-3 text-paper hover:bg-ember">
            Log in <Icon name="arrow-right" className="arrow" />
          </button>
        </form>
      )}

      {msg && (
        <p
          role={msg.ok ? "status" : "alert"}
          className={cn("flex items-start gap-2 rounded-[2px] border-l-2 px-3 py-2 font-serif text-sm leading-snug", msg.ok ? "border-[#2e7d32] bg-[#2e7d32]/[0.07]" : "border-ember bg-ember/[0.06]")}
        >
          <Icon name={msg.ok ? "check" : "warning"} className={cn("mt-[0.15em] h-4 w-4", msg.ok ? "text-[#2e7d32]" : "text-ember")} />
          {msg.text}
        </p>
      )}

      {receipt && (
        <div className="animate-pop-in mx-auto max-w-sm rounded-[2px] bg-paper p-4 font-mono text-[0.7rem] text-ink shadow-[0_18px_40px_-24px_rgb(0_48_73/0.6)] ring-1 ring-ink/10">
          <p className="text-center font-display text-lg tracking-wide">ParkMate</p>
          <p className="text-center text-2xs text-ink/70">Official receipt · PM-{String(receipt.ticket.no).padStart(5, "0")}</p>
          <dl className="mt-3 space-y-0.5 border-y border-dashed border-ink/25 py-2">
            {[
              ["Plate", showPlate(receipt.ticket.plate)],
              ["Slot", receipt.ticket.slot],
              ["In", clock(receipt.ticket.inAt)],
              ["Out", clock(receipt.ticket.outAt!)],
              ["Stay", duration(receipt.minutes)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="text-ink/70">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <ul className="space-y-0.5 py-2">
            {receipt.lines.map((l) => (
              <li key={l.label} className="flex justify-between gap-3">
                <span className="text-ink/70">{l.label}</span>
                <span className="tabular-nums">{l.amount < 0 ? `−${peso(-l.amount)}` : peso(l.amount)}</span>
              </li>
            ))}
          </ul>
          <p className="flex justify-between border-t border-ink/25 pt-2 text-sm font-bold">
            <span>Total</span>
            <span className="tabular-nums">{peso(receipt.total)}</span>
          </p>
        </div>
      )}

      {closed.length > 0 && (
        <div>
          <p className="label mb-1.5 flex justify-between text-3xs text-ink/70">
            <span>Records · checked out</span>
            <span>{peso(collected)} collected</span>
          </p>
          <ul className="divide-y divide-ink/10 rounded-[2px] font-mono text-2xs ring-1 ring-ink/10">
            {closed
              .slice()
              .reverse()
              .map((t) => (
                <li key={t.no} className="grid [&>*]:min-w-0 grid-cols-[auto_1fr_auto] gap-3 px-3 py-2">
                  <span className="text-ink/70">#{t.no}</span>
                  <span className="truncate">
                    {showPlate(t.plate)} · {t.slot} · {clock(t.inAt)}–{clock(t.outAt!)}
                  </span>
                  <span className="tabular-nums">{peso(t.fee ?? 0)}</span>
                </li>
              ))}
          </ul>
        </div>
      )}

      <Note>
        Tap a parked vehicle to correct its plate, delete a mistaken entry or check it out; move the clock to let time pass. Demo rates, not ParkMate&apos;s: first 15 minutes free, then cars ₱{RATES.car.first} for {RATES.car.firstHours} hours and ₱{RATES.car.perHour} per extra hour (motorcycles ₱{RATES.motorcycle.first} and ₱{RATES.motorcycle.perHour}), capped daily.
      </Note>
    </div>
  );
}
