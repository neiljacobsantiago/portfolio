"use client";

import { useState } from "react";
import Icon from "@/components/ui/Icon";
import { haptic } from "@/lib/haptics";
import { board, checkIn, register, seatsTaken, seedDesk, time, undo, type Desk } from "@/lib/tools/worktayo";
import { cn } from "@/lib/utils";
import { Field, Note, Segmented, input } from "./ui";

const short = (title: string) => title.split(" · ")[0].replace("Opening plenary", "Plenary").replace("Closing and certificates", "Closing");

/** WorkTayo's registration desk: check-ins, walk-ins and a live attendance board over three tables. */
export default function WorkTayoTool({ compact }: { compact?: boolean }) {
  const [desk, setDesk] = useState<Desk>(seedDesk);
  const [session, setSession] = useState("ws-a");
  const [query, setQuery] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [walkIn, setWalkIn] = useState({ name: "", email: "", affiliation: "", workshop: "" });
  const [showForm, setShowForm] = useState(false);
  const stats = board(desk);
  const current = stats.find((s) => s.session.id === session)!;
  const recent = desk.attendance.slice(-5).reverse();
  const nameOf = (id: number) => desk.participants.find((p) => p.id === id)!;

  const say = (ok: boolean, text: string) => {
    haptic(ok ? 10 : 20);
    setMsg({ ok, text });
  };
  const doCheckIn = (q: string) => {
    const r = checkIn(desk, q, session);
    if (!r.ok) return say(false, r.error);
    setDesk(r.desk);
    setQuery("");
    say(true, r.note);
  };

  return (
    <div className="space-y-5">
      {/* Desk */}
      <div className="space-y-3">
        <Segmented label="Session" value={session} onChange={(s) => (setSession(s), setMsg(null))} options={desk.sessions.map((s) => ({ value: s.id, label: short(s.title) }))} />
        <p className="font-serif text-sm text-ink/75">
          {current.session.title} · {current.session.time}
          {!current.session.open && ` · ${seatsTaken(desk, session)} of ${current.session.capacity} seats registered`}
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            doCheckIn(query);
          }}
          className="flex gap-2"
        >
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="WT-0002 or a name" aria-label="Registration code or name" className={input} />
          <button type="submit" className="btn shrink-0 bg-ink px-5 py-3 text-paper hover:bg-ember">
            Check in <Icon name="arrow-right" className="arrow" />
          </button>
        </form>
        {current.missing.length > 0 && (
          <div>
            <p className="label mb-1.5 text-3xs text-ink/70">Still expected · tap to check in</p>
            <ul className="flex flex-wrap gap-1.5">
              {current.missing.slice(0, compact ? 4 : 8).map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => doCheckIn(p.code)} className="press rounded-full border border-ink/15 px-3 py-1.5 font-serif text-sm hover:border-ink">
                    {p.name} <span className="font-mono text-2xs text-ink/70">{p.code}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
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
      </div>

      <div className={cn("grid [&>*]:min-w-0 gap-5", !compact && "md:grid-cols-[1.15fr_1fr]")}>
        {/* Live board */}
        <div>
          <p className="label mb-2 text-3xs text-ink/70">Live attendance</p>
          <ul className="space-y-3">
            {stats.map((s) => (
              <li key={s.session.id}>
                <button type="button" onClick={() => setSession(s.session.id)} className="block w-full text-left">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className={cn("truncate font-serif text-[0.95rem]", s.session.id === session ? "text-ink" : "text-ink/75")}>{short(s.session.title)}</span>
                    <span className="shrink-0 font-mono text-2xs text-ink/70 tabular-nums">
                      {s.present}/{s.expected} · {Math.round(s.rate * 100)}%
                    </span>
                  </span>
                  <span className="mt-1 block h-2 overflow-hidden rounded-full bg-ink/[0.07]">
                    <span
                      className={cn("block h-full rounded-full transition-[width] duration-500 ease-[var(--ease-apple)]", s.session.id === session ? "bg-ember" : "bg-sky")}
                      style={{ width: `${s.rate * 100}%` }}
                    />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Recent check-ins */}
        <div>
          <p className="label mb-2 text-3xs text-ink/70">Latest check-ins</p>
          <ol className="divide-y divide-ink/10 rounded-[2px] ring-1 ring-ink/10">
            {recent.map((a) => (
              <li key={`${a.participantId}-${a.sessionId}`} className="flex items-center gap-3 px-3 py-2">
                <span className="font-mono text-2xs text-ink/70 tabular-nums">{time(a.at)}</span>
                <span className="min-w-0 flex-1 truncate font-serif text-sm">
                  {nameOf(a.participantId).name} <span className="text-ink/70">· {short(desk.sessions.find((s) => s.id === a.sessionId)!.title)}</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setDesk(undo(desk, a.participantId, a.sessionId));
                    say(true, `Removed ${nameOf(a.participantId).name}'s check-in. The attendance row is gone; the registration stays.`);
                  }}
                  className="label press shrink-0 text-3xs text-ink/70 hover:text-ember"
                >
                  Undo
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Walk-in registration */}
      <div className="rounded-[2px] ring-1 ring-ink/10">
        <button type="button" aria-expanded={showForm} onClick={() => setShowForm((v) => !v)} className="flex w-full items-center justify-between px-3.5 py-3 text-left">
          <span className="label text-3xs text-ink/70">Register a walk-in</span>
          <Icon name={showForm ? "minus" : "plus"} className="text-ink/70" />
        </button>
        {showForm && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const r = register(desk, { ...walkIn, workshop: walkIn.workshop || null });
              if (!r.ok) return say(false, r.error);
              setDesk(r.desk);
              setWalkIn({ name: "", email: "", affiliation: "", workshop: "" });
              setQuery(r.participant.code);
              say(true, `${r.note} Their code is ready in the check-in box.`);
            }}
            className={cn("grid [&>*]:min-w-0 gap-3 border-t border-ink/10 p-3.5", !compact && "sm:grid-cols-2")}
          >
            <Field label="Full name">
              <input value={walkIn.name} onChange={(e) => setWalkIn((w) => ({ ...w, name: e.target.value }))} className={input} placeholder="Juan Dela Cruz" />
            </Field>
            <Field label="Email">
              <input value={walkIn.email} onChange={(e) => setWalkIn((w) => ({ ...w, email: e.target.value }))} type="email" inputMode="email" className={input} placeholder="juan@example.com" />
            </Field>
            <Field label="Affiliation">
              <input value={walkIn.affiliation} onChange={(e) => setWalkIn((w) => ({ ...w, affiliation: e.target.value }))} className={input} placeholder="Optional" />
            </Field>
            <Field label="Workshop">
              <select value={walkIn.workshop} onChange={(e) => setWalkIn((w) => ({ ...w, workshop: e.target.value }))} className={cn(input, "cursor-pointer")}>
                <option value="">None, plenary sessions only</option>
                {desk.sessions
                  .filter((s) => !s.open)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {short(s.title)} · {s.capacity - seatsTaken(desk, s.id)} seats left
                    </option>
                  ))}
              </select>
            </Field>
            <button type="submit" className="btn justify-center bg-ink py-3 text-paper hover:bg-ember sm:col-span-2">
              Register <Icon name="plus" />
            </button>
          </form>
        )}
      </div>

      <p className="flex flex-wrap gap-1.5 font-mono text-2xs text-ink/70">
        {(
          [
            ["participants", desk.participants.length],
            ["registrations", desk.registrations.length],
            ["attendance", desk.attendance.length],
          ] as const
        ).map(([t, n]) => (
          <span key={t} className="rounded-full bg-ink/[0.06] px-2.5 py-1">
            {t} · {n} rows
          </span>
        ))}
      </p>

      <Note>
        Try checking someone into a workshop they didn&apos;t sign up for, checking the same person in twice, or registering a walk-in with an email that&apos;s taken. Inspired by WorkTayo; the people and sessions are made up.
      </Note>
    </div>
  );
}
