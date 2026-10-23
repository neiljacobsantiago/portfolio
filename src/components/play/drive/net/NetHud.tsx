"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/Icon";
import { cn } from "@/lib/utils";
import { PAINTS } from "../car";
import { LENGTH } from "../track";
import { fmt, signed } from "../ui/format";
import { HudButton, PANEL } from "../ui/Hud";
import { QUICK } from "./protocol";
import type { Multiplayer } from "./useMultiplayer";

// What multiplayer adds to the driving screen: the running order inside the
// timing tower (or who's here, in free roam), the horn and quick messages by
// the other tools, messages from the others, and the classification at the end.

/**
 * Gaps the way timing loops measure them: each car's distance is sampled a
 * few times a second, and a car's gap to the leader is how long ago the
 * leader passed the point where that car is now.
 */
function useGaps(mp: Multiplayer, on: boolean) {
  const [gaps, setGaps] = useState<Map<number, number | null>>(() => new Map());
  const trail = useRef(new Map<number, { d: number; t: number }[]>());
  const latest = useRef(mp);
  useEffect(() => {
    latest.current = mp;
  });
  useEffect(() => {
    if (!on) return;
    const history = trail.current;
    history.clear();
    const tick = () => {
      const m = latest.current;
      const now = performance.now();
      const rows = m.table;
      for (const r of rows) {
        const d = m.distOf(r.slot);
        if (d == null) continue;
        const list = history.get(r.slot) ?? [];
        if (!list.length || d > list[list.length - 1].d) list.push({ d, t: now });
        while (list.length > 2 && now - list[0].t > 90_000) list.shift();
        history.set(r.slot, list);
      }
      const leader = rows.find((r) => r.total == null);
      const lead = leader ? history.get(leader.slot) : undefined;
      const next = new Map<number, number | null>();
      for (const r of rows) {
        if (r.total != null || !leader || r.slot === leader.slot || !lead?.length) {
          next.set(r.slot, null);
          continue;
        }
        const d = m.distOf(r.slot);
        if (d == null) {
          next.set(r.slot, null);
          continue;
        }
        // A lap or more down shows as laps, not seconds
        const behind = (m.distOf(leader.slot) ?? d) - d;
        if (behind >= LENGTH) {
          next.set(r.slot, -Math.floor(behind / LENGTH));
          continue;
        }
        let when: number | null = null;
        for (let i = lead.length - 1; i > 0; i--) {
          const a = lead[i - 1];
          const b = lead[i];
          if (a.d <= d && d <= b.d) {
            when = a.t + ((d - a.d) / Math.max(1e-6, b.d - a.d)) * (b.t - a.t);
            break;
          }
        }
        next.set(r.slot, when == null ? null : Math.max(0, now - when));
      }
      setGaps((prev) => {
        for (const [k, v] of next) {
          const p = prev.get(k);
          if (p == null || v == null ? p !== v : Math.abs(p - v) >= 50) return next;
        }
        return prev.size === next.size ? prev : next;
      });
    };
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
  }, [on]);
  return gaps;
}

/** Inside the timing tower: positions, colour, name, and the interval to the car ahead. */
export function NetStandings({ mp }: { mp: Multiplayer }) {
  const s = mp.state;
  const race = s.session?.mode === "race";
  const gaps = useGaps(mp, race && s.status === "playing");
  const rows = mp.table;
  const leaderSlot = rows.find((r) => r.total == null)?.slot ?? null;
  /** Seconds behind the leader on the road (0 for the leader), negative for whole laps down. */
  const gapOf = (r: (typeof rows)[number]) => (r.total != null ? null : r.slot === leaderSlot ? 0 : (gaps.get(r.slot) ?? null));
  return (
    <ol className="border-b border-paper/10 py-1" aria-label={race ? "Race order" : "In the room"} data-standings>
      {!race && <li className="race-cap px-2.5 pt-1 pb-0.5 text-paper/55">In the room · {rows.length}</li>}
      {rows.map((p, i) => {
        const g = gapOf(p);
        const ahead = i > 0 ? gapOf(rows[i - 1]) : null;
        // Interval: to the car directly ahead, as broadcasts show it in a race
        const interval = g != null && g >= 0 && ahead != null && ahead >= 0 && g >= ahead ? g - ahead : null;
        return (
          <li key={p.slot} className={cn("flex h-7 items-center gap-2 pr-2.5 short:h-6", p.me ? "bg-paper text-ink" : "text-paper")} data-slot={p.slot}>
            {race && <span className={cn("race-num flex h-full w-7 shrink-0 items-center justify-center text-[0.95rem]", p.me ? "bg-ember text-paper" : "bg-paper/10")}>{i + 1}</span>}
            <span aria-hidden className={cn("h-4 w-1 shrink-0", !race && "ml-2.5")} style={{ background: PAINTS[p.paint].primary }} />
            <span className="min-w-0 flex-1 truncate text-[0.85rem] font-bold tracking-[0.03em] uppercase">{p.name}</span>
            <span className={cn("race-num shrink-0 text-[0.8rem]", p.me ? "text-ink/75" : "text-paper/75")}>
              {!race ? null : p.total != null ? (
                <span className="flex items-center gap-1" title="Finished">
                  <span aria-hidden className="chequer h-2.5 w-3.5 [--chq:2.5px]" />
                  Fin
                </span>
              ) : p.slot === leaderSlot ? (
                <span className="race-cap not-italic">{i === 0 ? "Leader" : "Racing"}</span>
              ) : g != null && g < 0 ? (
                `+${-g} lap${g < -1 ? "s" : ""}`
              ) : interval != null ? (
                signed(Math.max(100, interval), 1)
              ) : (
                "–"
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Horn and quick messages, next to the other tool buttons. */
export function NetActions({ mp }: { mp: Multiplayer }) {
  const [tray, setTray] = useState(false);
  return (
    <>
      <HudButton onClick={mp.horn} label="Horn" hint="H">
        <Icon name="horn" className="h-[18px] w-[18px]" />
      </HudButton>
      <span className="relative">
        <HudButton onClick={() => setTray((v) => !v)} label="Quick messages" hint="1 to 6" pressed={tray}>
          <Icon name="message" className="h-[18px] w-[18px]" />
        </HudButton>
        {tray && (
          <div className={cn("animate-race-rise absolute top-0 right-full z-10 mr-2 grid w-[min(16rem,60vw)] grid-cols-2 gap-1 p-1.5 shadow-xl ring-1 ring-paper/10 backdrop-blur", PANEL)} role="menu" aria-label="Quick messages">
            {QUICK.map((q, k) => (
              <button
                key={q}
                type="button"
                role="menuitem"
                onClick={() => {
                  mp.quick(k);
                  setTray(false);
                }}
                className="press flex min-h-10 items-center gap-2 bg-paper/10 px-2 py-1.5 text-left text-[0.85rem] leading-tight font-semibold text-paper hover:bg-paper/20"
              >
                <span className="race-num text-[0.75rem] text-paper/50">{k + 1}</span>
                {q}
              </button>
            ))}
          </div>
        )}
      </span>
    </>
  );
}

/** Messages from the others, under the flash banners. */
export function NetToasts({ mp }: { mp: Multiplayer }) {
  if (!mp.toasts.length) return null;
  return (
    <div className="pointer-events-none flex max-w-full flex-col items-center gap-1" role="status" aria-live="polite" data-net-toasts>
      {mp.toasts.map((t) => (
        <p key={t.id} className={cn("animate-race-wipe flex max-w-full items-stretch shadow-xl")}>
          <span aria-hidden className={cn("w-1.5 shrink-0", t.tone === "bad" ? "bg-ember" : t.tone === "good" ? "bg-[#2fd27a]" : "bg-sky")} />
          <span className={cn("truncate px-3 py-1.5 text-[0.9rem] font-semibold text-paper", PANEL)}>{t.text}</span>
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
  const mine = finishers.findIndex((r) => r.slot === s.me);
  const fastest = finishers.reduce<number | null>((m, r) => (r.best != null && (m == null || r.best < m) ? r.best : m), null);

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#020a10]/60 p-3 md:p-6" onClick={() => mp.setPanel(false)}>
      <div
        role="dialog"
        aria-label={race ? "Race results" : "Room"}
        onClick={(e) => e.stopPropagation()}
        data-lenis-prevent
        className="animate-pop-in max-h-full w-full max-w-lg overflow-y-auto overscroll-contain bg-[#06121c] text-paper shadow-2xl ring-1 ring-paper/10"
      >
        {race && finishers.length > 0 && <div aria-hidden className="chequer h-4 [--chq:8px]" />}
        <div className="p-4 md:p-5">
          {mine >= 0 && (
            <p className="race-num mb-2 flex w-fit items-center gap-2 bg-paper px-2.5 py-1 text-[1rem] text-ink uppercase">
              <span aria-hidden className="chequer h-3.5 w-5 [--chq:3.5px]" />
              Chequered flag · you finished P{mine + 1}
            </p>
          )}
          <p className="race-cap flex items-center justify-between gap-3 text-paper/60">
            <span>Room {s.code}</span>
            <span>{race ? `${s.session?.laps} laps` : "Free roam"}</span>
          </p>
          <h2 className="race-num mt-1.5 text-[1.9rem] leading-none uppercase md:text-[2.3rem]">
            {race ? (finishers.length ? (winner ? `${winner.name} wins` : "Classification") : "The race is on") : "Free roam"}
          </h2>

          {race && (
            <table className="mt-4 w-full border-collapse text-left" data-results>
              <caption className="sr-only">Classification</caption>
              <thead>
                <tr className="race-cap text-paper/55">
                  <th scope="col" className="w-9 py-1.5 font-bold">
                    Pos
                  </th>
                  <th scope="col" className="py-1.5 font-bold">
                    Driver
                  </th>
                  <th scope="col" className="hidden py-1.5 text-right font-bold min-[420px]:table-cell">
                    Best lap
                  </th>
                  <th scope="col" className="py-1.5 pl-3 text-right font-bold">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody>
                {finishers.map((r, i) => {
                  const p = names.get(r.slot);
                  const gap = i > 0 ? r.total - finishers[0].total : 0;
                  const purple = r.best != null && r.best === fastest;
                  return (
                    <tr key={r.slot} className={cn("border-t border-paper/10", r.slot === s.me && "bg-paper/[0.07]")}>
                      <td className="py-2">
                        <span className={cn("race-num flex h-7 w-7 items-center justify-center text-[1rem]", i === 0 ? "bg-paper text-ink" : "bg-paper/10")}>{i + 1}</span>
                      </td>
                      <td className="py-2">
                        <span className="flex min-w-0 items-center gap-2">
                          <span aria-hidden className="h-5 w-1 shrink-0" style={{ background: p ? PAINTS[p.paint].primary : undefined }} />
                          <span className="truncate text-[1rem] font-bold uppercase">{p?.name ?? "Left the room"}</span>
                        </span>
                      </td>
                      <td className={cn("race-num hidden py-2 text-right text-[0.9rem] min-[420px]:table-cell", purple ? "text-[#c9a2ff]" : "text-paper/75")}>
                        {r.best != null ? fmt(r.best) : "–"}
                        {purple && <span className="sr-only"> (fastest lap)</span>}
                      </td>
                      <td className="race-num py-2 pl-3 text-right text-[0.95rem]">{i === 0 ? fmt(r.total) : `+${(gap / 1000).toFixed(3)}`}</td>
                    </tr>
                  );
                })}
                {still.map((slot) => {
                  const p = names.get(slot);
                  if (!p) return null;
                  return (
                    <tr key={slot} className="border-t border-paper/10 text-paper/60">
                      <td className="py-2">
                        <span className="race-num flex h-7 w-7 items-center justify-center bg-paper/5 text-[1rem]">–</span>
                      </td>
                      <td className="py-2">
                        <span className="flex min-w-0 items-center gap-2">
                          <span aria-hidden className="h-5 w-1 shrink-0" style={{ background: PAINTS[p.paint].primary }} />
                          <span className="truncate text-[1rem] font-bold uppercase">{p.name}</span>
                        </span>
                      </td>
                      <td className="hidden min-[420px]:table-cell" />
                      <td className="race-cap py-2 pl-3 text-right">{p.away ? "Dropped out" : "Racing"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {fastest != null && (
            <p className="race-cap mt-2 flex items-center gap-2 text-paper/65">
              <span aria-hidden className="h-2 w-2 bg-[#a259ff]" /> Fastest lap {fmt(fastest)}
            </p>
          )}
          {race && finishers.some((r) => r.laps.length) && (
            <details className="mt-3 text-[0.9rem] text-paper/75">
              <summary className="race-cap cursor-pointer py-1">Every lap</summary>
              <ul className="mt-1 space-y-1 text-[0.85rem] tabular-nums">
                {finishers.map((r) => (
                  <li key={r.slot}>
                    <span className="font-bold uppercase">{names.get(r.slot)?.name ?? "?"}</span> <span className="text-paper/65">{r.laps.map(fmt).join(" · ")}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}

          <div className="mt-5 grid gap-2">
            {host && (
              <>
                <button type="button" onClick={mp.start} className="press flex min-h-12 items-center justify-between gap-2 bg-ember px-4 text-paper hover:bg-[#d8222f]">
                  <span className="race-num text-[1.1rem] uppercase">{race ? (finishers.length ? "Rematch" : "Restart the race") : "Restart together"}</span>
                  <Icon name="refresh" className="h-5 w-5" />
                </button>
                <button type="button" onClick={mp.toLobby} className="race-cap press min-h-11 px-4 ring-1 ring-paper/25 hover:bg-paper/5">
                  Everyone back to the lobby
                </button>
              </>
            )}
            {!host && race && finishers.length > 0 && <p className="text-center text-[0.9rem] text-paper/65">The host can start a rematch from here.</p>}
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => mp.setPanel(false)} className="race-cap press min-h-11 px-3 ring-1 ring-paper/25 hover:bg-paper/5">
                Keep driving
              </button>
              <button type="button" onClick={() => mp.leave()} className="race-cap press min-h-11 px-3 text-[#ff8a7a] ring-1 ring-ember/40 hover:bg-ember/10">
                {host ? "Close the room" : "Leave the room"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
