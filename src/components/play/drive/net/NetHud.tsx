"use client";

import { useState } from "react";
import Icon from "@/components/ui/Icon";
import { cn } from "@/lib/utils";
import { PAINTS } from "../car";
import { QUICK } from "./protocol";
import type { Multiplayer } from "./useMultiplayer";

// What multiplayer adds to the driving screen: the running order (or who's
// here, in free roam) with the horn and quick messages under it, toasts from
// the others, and a panel for results and leaving.

const fmt = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms / 1000) % 60)).padStart(2, "0")}.${String(Math.floor(ms % 1000)).padStart(3, "0")}`;

/** Under the timing card: positions, then horn and messages. */
export function NetBoard({ mp }: { mp: Multiplayer }) {
  const [tray, setTray] = useState(false);
  const s = mp.state;
  const race = s.session?.mode === "race";
  return (
    <div className="pointer-events-auto relative flex flex-col items-start gap-1.5">
      <ol className="min-w-[9.5rem] rounded-xl bg-[#0b1018]/80 px-2.5 py-1.5 text-paper shadow-lg ring-1 ring-paper/10 backdrop-blur" aria-label={race ? "Race order" : "In the room"} data-standings>
        {race && (
          <li className="label mb-0.5 text-[0.45rem] text-paper/50">
            Lap {Math.max(1, mp.lap)}/{s.session?.laps}
          </li>
        )}
        {mp.table.map((p, i) => (
          <li key={p.slot} className={cn("flex items-center gap-1.5 font-mono text-[0.62rem] leading-[1.5] tabular-nums", p.me ? "text-paper" : "text-paper/75")} data-slot={p.slot}>
            {race && <span className="w-3 text-paper/50">{i + 1}</span>}
            <span className="h-2 w-2 shrink-0 rounded-full ring-1 ring-paper/50" style={{ background: PAINTS[p.paint].primary }} aria-hidden />
            <span className={cn("max-w-[7rem] truncate", p.me && "font-semibold")}>{p.name}</span>
            {p.total != null && <Icon name="flag" className="h-3 w-3 text-[#ffd27a]" title="Finished" />}
          </li>
        ))}
      </ol>
      <div className="flex gap-1.5">
        <button type="button" onClick={mp.horn} aria-label="Horn (H)" title="Horn (H)" className="press flex h-10 w-10 items-center justify-center rounded-full bg-[#0b1018]/80 text-paper shadow-lg ring-1 ring-paper/15 backdrop-blur active:bg-ember">
          <Icon name="horn" className="h-[18px] w-[18px]" />
        </button>
        <button
          type="button"
          onClick={() => setTray((v) => !v)}
          aria-label="Quick messages"
          aria-expanded={tray}
          title="Quick messages (1–6)"
          className={cn("press flex h-10 w-10 items-center justify-center rounded-full shadow-lg ring-1 backdrop-blur", tray ? "bg-paper text-ink ring-paper" : "bg-[#0b1018]/80 text-paper ring-paper/15")}
        >
          <Icon name="message" className="h-[18px] w-[18px]" />
        </button>
      </div>
      {tray && (
        <div className="animate-blob-in absolute top-full left-0 z-10 mt-2 grid w-[min(15rem,70vw)] grid-cols-2 gap-1.5 rounded-2xl bg-[#0b1018]/90 p-2 shadow-xl ring-1 ring-paper/10 backdrop-blur" role="menu">
          {QUICK.map((q, k) => (
            <button
              key={q}
              type="button"
              role="menuitem"
              onClick={() => {
                mp.quick(k);
                setTray(false);
              }}
              className="press rounded-xl bg-paper/10 px-2.5 py-2 text-left font-serif text-sm leading-tight text-paper hover:bg-paper/20"
            >
              {q}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Messages from the others, low in the middle, between the thumbs. */
export function NetToasts({ mp }: { mp: Multiplayer }) {
  if (!mp.toasts.length) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 z-20 flex flex-col items-center gap-1.5 px-[25%]" style={{ bottom: "max(28px, calc(env(safe-area-inset-bottom) + 20px))" }} role="status" aria-live="polite" data-net-toasts>
      {mp.toasts.map((t) => (
        <p key={t.id} className={cn("animate-blob-in max-w-full truncate rounded-full px-4 py-2 font-serif text-sm shadow-xl", t.tone === "bad" ? "bg-ember text-paper" : t.tone === "good" ? "bg-sky text-ink" : "bg-paper/95 text-ink")}>
          {t.text}
        </p>
      ))}
    </div>
  );
}

/** Results when you finish, and the way out (Esc or the close button opens it too). */
export function SessionPanel({ mp }: { mp: Multiplayer }) {
  const s = mp.state;
  const host = s.role === "host";
  const race = s.session?.mode === "race";
  const finishers = race ? s.results.slice().sort((a, b) => a.total - b.total) : [];
  const names = new Map(s.players.map((p) => [p.slot, p]));
  const still = race ? (s.session?.grid ?? []).filter((slot) => !s.results.some((r) => r.slot === slot)) : [];
  const winner = finishers[0] ? names.get(finishers[0].slot) : null;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-[2px]" onClick={() => mp.setPanel(false)}>
      <div role="dialog" aria-label={race ? "Race results" : "Room"} onClick={(e) => e.stopPropagation()} data-lenis-prevent className="animate-pop-in max-h-full w-full max-w-sm overflow-y-auto rounded-3xl bg-paper p-5 text-ink shadow-2xl">
        <p className="label text-[0.55rem] text-ember">Room {s.code}</p>
        <h2 className="mt-1 font-display text-3xl leading-tight">{race ? (finishers.length ? (winner ? `${winner.name} wins` : "Results") : "The race is on") : "Free roam"}</h2>

        {race && (
          <ol className="mt-4 divide-y divide-ink/10 rounded-2xl ring-1 ring-ink/15" data-results>
            {finishers.map((r, i) => {
              const p = names.get(r.slot);
              const gap = i > 0 ? r.total - finishers[0].total : 0;
              return (
                <li key={r.slot} className="flex items-center gap-3 px-3 py-2.5">
                  <span className="w-5 font-display text-xl">{i + 1}</span>
                  <span className="h-5 w-5 shrink-0 rounded-full ring-1 ring-ink/20" style={{ background: p ? PAINTS[p.paint].primary : undefined }} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-serif text-lg leading-tight">{p?.name ?? "Left the room"}</span>
                    <span className="font-mono text-[0.62rem] text-ink/55 tabular-nums">{r.best != null ? `Best lap ${fmt(r.best)}` : ""}</span>
                  </span>
                  <span className="text-right font-mono text-sm tabular-nums">
                    {fmt(r.total)}
                    {i > 0 && <span className="block text-[0.62rem] text-wine">+{(gap / 1000).toFixed(3)}</span>}
                  </span>
                </li>
              );
            })}
            {still.map((slot) => {
              const p = names.get(slot);
              if (!p) return null;
              return (
                <li key={slot} className="flex items-center gap-3 px-3 py-2.5 text-ink/55">
                  <span className="w-5 font-display text-xl">–</span>
                  <span className="h-5 w-5 shrink-0 rounded-full ring-1 ring-ink/20" style={{ background: PAINTS[p.paint].primary }} aria-hidden />
                  <span className="min-w-0 flex-1 truncate font-serif text-lg">{p.name}</span>
                  <span className="label text-[0.48rem]">{p.away ? "Dropped out" : "Still racing"}</span>
                </li>
              );
            })}
          </ol>
        )}
        {race && finishers.some((r) => r.laps.length) && (
          <details className="mt-3 font-serif text-sm text-ink/70">
            <summary className="cursor-pointer">Lap times</summary>
            <ul className="mt-2 space-y-1 font-mono text-[0.65rem] tabular-nums">
              {finishers.map((r) => (
                <li key={r.slot}>
                  {names.get(r.slot)?.name ?? "?"}: {r.laps.map(fmt).join(" · ")}
                </li>
              ))}
            </ul>
          </details>
        )}

        <div className="mt-5 space-y-2">
          {host && (
            <>
              <button type="button" onClick={mp.start} className="btn w-full justify-center bg-ember text-paper hover:bg-ink">
                {race ? (finishers.length ? "Rematch" : "Restart the race") : "Restart together"} <Icon name="refresh" />
              </button>
              <button type="button" onClick={mp.toLobby} className="label press w-full rounded-full px-4 py-3 text-[0.55rem] ring-1 ring-ink/15">
                Everyone back to the lobby
              </button>
            </>
          )}
          {!host && race && finishers.length > 0 && <p className="text-center font-serif text-sm text-ink/60">The host can start a rematch from here.</p>}
          <button type="button" onClick={() => mp.setPanel(false)} className="label press w-full rounded-full px-4 py-3 text-[0.55rem] ring-1 ring-ink/15">
            Keep driving
          </button>
          <button type="button" onClick={() => mp.leave()} className="label press w-full rounded-full px-4 py-3 text-[0.55rem] text-wine">
            {host ? "Close the room" : "Leave the room"}
          </button>
        </div>
      </div>
    </div>
  );
}
