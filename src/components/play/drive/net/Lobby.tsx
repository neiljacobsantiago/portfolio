"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/ui/Icon";
import { cn } from "@/lib/utils";
import { PAINTS, type PaintId } from "../car";
import { CODE_PREFIX, MAX_PLAYERS, NAME_MAX, normalizeCode, PAINT_IDS, type PlayerInfo, quality, roomLink, sanitizeName } from "./protocol";
import type { Multiplayer } from "./useMultiplayer";

// The lobby: pick a name and a paint, make a room or join one, then wait for
// everyone to be ready. A sheet over the title card, readable on a 390px phone.

const QUALITY = {
  good: { label: "Good", dot: "bg-sky" },
  fair: { label: "Fair", dot: "bg-[#e0a92e]" },
  poor: { label: "Weak", dot: "bg-ember" },
  unknown: { label: "Checking", dot: "bg-ink/25" },
} as const;

export default function Lobby({ mp, paint, onPaint }: { mp: Multiplayer; paint: PaintId; onPaint: (p: PaintId) => void }) {
  const s = mp.state;
  const busy = s.status === "opening" || s.status === "joining";
  const close = () => {
    if (mp.inRoom || busy) return;
    mp.setOpen(false);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !mp.inRoom && s.status !== "opening" && s.status !== "joining") mp.setOpen(false);
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  });

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-ink/60 backdrop-blur-sm md:items-center md:p-6" onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lobby-title"
        data-lenis-prevent
        onClick={(e) => e.stopPropagation()}
        className={cn("animate-pop-in max-h-[100svh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-3xl bg-paper text-ink shadow-2xl md:max-h-[92svh] md:rounded-3xl", mp.inRoom && "md:max-w-3xl")}
        style={{
          paddingTop: "max(20px, env(safe-area-inset-top))",
          paddingBottom: "max(20px, env(safe-area-inset-bottom))",
          paddingLeft: "max(20px, env(safe-area-inset-left))",
          paddingRight: "max(20px, env(safe-area-inset-right))",
        }}
      >
        {mp.inRoom ? <Room mp={mp} paint={paint} onPaint={onPaint} /> : busy ? <Connecting mp={mp} /> : <Start mp={mp} paint={paint} onPaint={onPaint} onClose={close} />}
      </div>
    </div>
  );
}

function Header({ title, onClose }: { title: string; onClose?: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="label text-[0.55rem] text-ember">Bay Street Circuit · together</p>
        <h2 id="lobby-title" className="mt-1 font-display text-3xl leading-tight">
          {title}
        </h2>
      </div>
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Close" className="press flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-1 ring-ink/15">
          <Icon name="close" />
        </button>
      )}
    </div>
  );
}

function Paints({ value, onChange }: { value: PaintId; onChange: (p: PaintId) => void }) {
  return (
    <div role="radiogroup" aria-label="Your car's paint" className="grid grid-cols-6 gap-1.5">
      {PAINT_IDS.map((id) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={value === id}
          aria-label={PAINTS[id].name}
          title={PAINTS[id].name}
          onClick={() => onChange(id)}
          className="press flex aspect-square items-center justify-center rounded-xl ring-1 ring-ink/15 aria-checked:ring-2 aria-checked:ring-ember"
        >
          <span className="block h-6 w-8 rounded-md" style={{ background: `linear-gradient(180deg, ${PAINTS[id].primary} 0 58%, ${PAINTS[id].secondary} 58% 80%, ${PAINTS[id].accent} 80%)` }} />
        </button>
      ))}
    </div>
  );
}

/** Before a room: who you are, then make one or join one. */
function Start({ mp, paint, onPaint, onClose }: { mp: Multiplayer; paint: PaintId; onPaint: (p: PaintId) => void; onClose: () => void }) {
  const [name, setName] = useState(mp.nick);
  const [code, setCode] = useState(mp.initialCode ? mp.initialCode.slice(CODE_PREFIX.length) : "");
  const [problem, setProblem] = useState<string | null>(null);
  const err = mp.state.error;
  const linked = mp.initialCode;

  const who = () => {
    const n = sanitizeName(name);
    if (!n) {
      setProblem("Type a nickname first, so the others know who's who.");
      return null;
    }
    setProblem(null);
    return n;
  };
  const create = () => {
    const n = who();
    if (n) mp.create(n, paint);
  };
  const join = (raw: string) => {
    const n = who();
    if (!n) return;
    const c = normalizeCode(raw);
    if (!c) return setProblem("That code doesn't look right. It's four letters and numbers, like BAY-7KQ2.");
    mp.join(c, n, paint);
  };

  return (
    <>
      <Header title={linked ? `Join room ${linked}` : "Race a friend"} onClose={onClose} />
      <p className="mt-2 font-serif text-lg leading-snug text-ink/75">Up to four players, each on their own phone or computer. No sign-up: pick a name and a colour, then share the room code.</p>

      {err && (
        <div role="alert" className="mt-5 rounded-2xl bg-ember/10 p-4 ring-1 ring-ember/30">
          <p className="font-display text-xl leading-tight text-wine">{err.title}</p>
          <p className="mt-1.5 font-serif text-base leading-snug text-ink/80">{err.detail}</p>
          {err.tips && (
            <ul className="mt-2 space-y-1.5 font-serif text-sm leading-snug text-ink/75">
              {err.tips.map((t) => (
                <li key={t} className="flex gap-2">
                  <Icon name="chevron-right" className="mt-0.5 h-3.5 w-3.5 text-ember" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <label className="mt-6 block">
        <span className="label text-[0.55rem] text-ink/55">Your nickname</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (linked ? join(linked) : create())}
          maxLength={NAME_MAX * 2}
          autoComplete="nickname"
          enterKeyHint="go"
          placeholder="What your friends call you"
          className="mt-1.5 block w-full rounded-xl bg-white/60 px-4 py-3 font-serif text-lg ring-1 ring-ink/15 outline-none placeholder:text-ink/35 focus:ring-2 focus:ring-ember"
        />
      </label>
      <p className="label mt-5 mb-2 text-[0.55rem] text-ink/55">Your paint · {PAINTS[paint].name}</p>
      <Paints value={paint} onChange={onPaint} />

      {problem && (
        <p role="alert" className="mt-4 font-serif text-base text-wine">
          {problem}
        </p>
      )}

      {linked ? (
        <>
          <button type="button" onClick={() => join(linked)} className="btn mt-6 w-full justify-center bg-ember text-paper hover:bg-ink">
            Join {linked} <Icon name="arrow-right" className="arrow" />
          </button>
          <button type="button" onClick={create} className="label press mt-3 w-full rounded-full px-4 py-3 text-[0.55rem] text-ink/65 ring-1 ring-ink/15">
            Make a new room instead
          </button>
        </>
      ) : (
        <>
          <button type="button" onClick={create} className="btn mt-6 w-full justify-center bg-ember text-paper hover:bg-ink">
            Create a room <Icon name="arrow-right" className="arrow" />
          </button>
          <p className="label mt-6 mb-2 flex items-center gap-3 text-[0.5rem] text-ink/45">
            <span className="h-px flex-1 bg-ink/15" /> or join with a code <span className="h-px flex-1 bg-ink/15" />
          </p>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              join(code);
            }}
          >
            <label className="flex min-w-0 flex-1 items-center rounded-xl bg-white/60 ring-1 ring-ink/15 focus-within:ring-2 focus-within:ring-ember">
              <span className="pl-4 font-mono text-lg text-ink/45" aria-hidden>
                {CODE_PREFIX}
              </span>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 40))}
                aria-label="Room code"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                enterKeyHint="go"
                placeholder="7KQ2"
                className="w-full min-w-0 bg-transparent py-3 pr-3 font-mono text-lg tracking-[0.2em] uppercase outline-none placeholder:text-ink/30"
              />
            </label>
            <button type="submit" className="label press shrink-0 rounded-xl bg-ink px-5 text-[0.55rem] text-paper">
              Join
            </button>
          </form>
        </>
      )}
      <Fineprint />
    </>
  );
}

function Connecting({ mp }: { mp: Multiplayer }) {
  return (
    <>
      <Header title={mp.state.role === "host" ? "Opening a room" : `Joining ${mp.state.code ?? ""}`} />
      <div className="mt-8 flex items-center gap-4" role="status" aria-live="polite">
        <span className="h-8 w-8 shrink-0 animate-spin rounded-full border-2 border-ink/15 border-t-ember" aria-hidden />
        <p className="font-serif text-lg text-ink/80">{mp.state.step ?? "Connecting…"}</p>
      </div>
      <p className="mt-4 font-serif text-sm leading-snug text-ink/60">This usually takes a few seconds. On mobile data it can take up to fifteen.</p>
      <button type="button" onClick={() => mp.leave(true)} className="label press mt-8 w-full rounded-full px-4 py-3 text-[0.55rem] ring-1 ring-ink/15">
        Cancel
      </button>
    </>
  );
}

/** In a room: the code to share, who's here, and the start. */
function Room({ mp, paint, onPaint }: { mp: Multiplayer; paint: PaintId; onPaint: (p: PaintId) => void }) {
  const s = mp.state;
  const host = s.role === "host";
  const code = s.code ?? "";
  const meP = s.players.find((p) => p.slot === s.me);
  const guests = s.players.filter((p) => !p.host && !p.away);
  const waiting = guests.filter((p) => !p.ready);
  const raceOn = !!s.session && s.session.mode === "race" && !s.session.grid.includes(s.me);
  const [copied, setCopied] = useState<"link" | "code" | null>(null);

  const copy = async (text: string, what: "link" | "code") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      window.prompt("Copy this:", text);
    }
  };
  const share = async () => {
    const url = roomLink(location.origin, code);
    if (navigator.share) {
      try {
        await navigator.share({ title: "Bay Street Circuit", text: `Race me on Bay Street Circuit. Room ${code}`, url });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
      }
    }
    void copy(url, "link");
  };
  const choosePaint = (p: PaintId) => {
    onPaint(p);
    mp.setPaint(p);
  };

  return (
    <>
      <Header title="Your room" />
      <div className="md:mt-4 md:grid md:grid-cols-2 md:gap-7">
        <div className="min-w-0">
          <div className="mt-4 rounded-2xl bg-ink p-4 text-paper md:mt-0">
            <p className="label text-[0.5rem] text-paper/55">Room code</p>
            <p className="mt-1 font-mono text-[2rem] leading-none tracking-[0.12em]" data-room-code>
              {code}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={share} className="label press flex items-center justify-center gap-1.5 rounded-full bg-ember px-3 py-2.5 text-[0.52rem] text-paper">
                <Icon name="share" /> {copied === "link" ? "Link copied" : "Share link"}
              </button>
              <button type="button" onClick={() => copy(code, "code")} className="label press flex items-center justify-center gap-1.5 rounded-full px-3 py-2.5 text-[0.52rem] ring-1 ring-paper/30">
                <Icon name={copied === "code" ? "check" : "copy"} /> {copied === "code" ? "Copied" : "Copy code"}
              </button>
            </div>
            <p className="mt-3 font-serif text-sm leading-snug text-paper/70">Send the code or the link. Everyone needs this page open, on any network.</p>
          </div>

          {s.status === "reconnecting" && (
            <p role="status" className="mt-4 rounded-xl bg-[#ffd27a]/40 px-4 py-3 font-serif text-base">
              {s.step}
            </p>
          )}

          <p className="label mt-6 mb-2 flex items-center gap-2 text-[0.55rem] text-ink/55">
            <Icon name="users" className="h-3.5 w-3.5" /> Drivers · {s.players.length} of {MAX_PLAYERS}
          </p>
          <ul className="divide-y divide-ink/10 rounded-2xl ring-1 ring-ink/15" data-players>
            {Array.from({ length: MAX_PLAYERS }, (_, i) => s.players[i] ?? null).map((p, i) => (p ? <Row key={p.slot} p={p} me={p.slot === s.me} /> : <EmptyRow key={`empty-${i}`} />))}
          </ul>
        </div>

        <div className="min-w-0">
          <p className="label mt-5 mb-2 text-[0.55rem] text-ink/55 md:mt-0">Your paint · {PAINTS[meP?.paint ?? paint].name}</p>
          <Paints value={meP?.paint ?? paint} onChange={choosePaint} />

          <p className="label mt-6 mb-2 text-[0.55rem] text-ink/55">What we&apos;re playing</p>
          {host ? (
            <div className="space-y-2">
              <div role="radiogroup" aria-label="Mode" className="grid grid-cols-2 gap-2">
                {(["race", "free"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={s.settings.mode === m}
                    onClick={() => mp.setSettings({ mode: m })}
                    className="press rounded-xl px-3 py-2.5 text-left ring-1 ring-ink/15 aria-checked:bg-ink aria-checked:text-paper aria-checked:ring-ink"
                  >
                    <span className="block font-display text-lg leading-tight">{m === "race" ? "Race" : "Free roam"}</span>
                    <span className="font-serif text-sm opacity-70">{m === "race" ? "Start lights, positions, a winner" : "Drive around together, no clock"}</span>
                  </button>
                ))}
              </div>
              {s.settings.mode === "race" && (
                <div role="radiogroup" aria-label="Laps" className="flex items-center gap-2">
                  <span className="font-serif text-base text-ink/70">Laps</span>
                  {[3, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={s.settings.laps === n}
                      onClick={() => mp.setSettings({ laps: n })}
                      className="label press rounded-full px-4 py-2 text-[0.55rem] ring-1 ring-ink/15 aria-checked:bg-ink aria-checked:text-paper"
                    >
                      {n}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="font-serif text-lg" data-settings>
              {s.settings.mode === "race" ? `A race, ${s.settings.laps} laps` : "Free roam, no clock"} <span className="text-ink/55">· the host picks</span>
            </p>
          )}

          {raceOn && <p className="mt-4 rounded-xl bg-sky/20 px-4 py-3 font-serif text-base">A race is on right now. You&apos;ll be on the grid for the next one.</p>}

          {host ? (
            <>
              <button type="button" onClick={mp.start} disabled={waiting.length > 0} className="btn mt-6 w-full justify-center bg-ember text-paper hover:bg-ink disabled:opacity-45 disabled:hover:bg-ember">
                {s.settings.mode === "race" ? "Start the race" : "Start free roam"} <Icon name="flag" />
              </button>
              <p className="mt-2 text-center font-serif text-sm text-ink/60" aria-live="polite">
                {guests.length === 0 ? "Nobody else yet. You can start alone, or wait for someone to join." : waiting.length ? `Waiting for ${waiting.map((p) => p.name).join(", ")} to get ready.` : "Everyone's ready."}
              </p>
            </>
          ) : (
            !raceOn && (
              <>
                <button type="button" aria-pressed={!!meP?.ready} onClick={() => mp.setReady(!meP?.ready)} className={cn("btn mt-6 w-full justify-center", meP?.ready ? "bg-sky text-ink" : "bg-ember text-paper hover:bg-ink")}>
                  {meP?.ready ? (
                    <>
                      <Icon name="check" /> Ready
                    </>
                  ) : (
                    "I'm ready"
                  )}
                </button>
                <p className="mt-2 text-center font-serif text-sm text-ink/60" aria-live="polite">
                  {meP?.ready ? "Waiting for the host to start. Tap again if you need a minute." : "The host starts once everyone's ready."}
                </p>
              </>
            )
          )}

          <button type="button" onClick={() => mp.leave(true)} className="label press mt-4 w-full rounded-full px-4 py-3 text-[0.55rem] text-ink/70 ring-1 ring-ink/15">
            {host ? "Close the room" : "Leave the room"}
          </button>
          <Fineprint relay={s.relay} />
        </div>
      </div>
    </>
  );
}

function Row({ p, me }: { p: PlayerInfo; me: boolean }) {
  const q = QUALITY[quality(p.ping)];
  return (
    <li className="flex items-center gap-3 px-3 py-2.5" data-slot={p.slot}>
      <span className="h-7 w-7 shrink-0 rounded-full ring-1 ring-ink/20" style={{ background: `linear-gradient(135deg, ${PAINTS[p.paint].primary} 0 60%, ${PAINTS[p.paint].secondary} 60%)` }} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate font-serif text-lg leading-tight" data-name>
            {p.name}
          </span>
          {me && <span className="label shrink-0 rounded-full bg-ink/10 px-1.5 py-0.5 text-[0.45rem]">You</span>}
          {p.host && <span className="label shrink-0 rounded-full bg-ember px-1.5 py-0.5 text-[0.45rem] text-paper">Host</span>}
        </span>
        <span className="label mt-0.5 flex items-center gap-1.5 text-[0.48rem] text-ink/55">
          {p.away ? (
            <span className="text-wine">Reconnecting…</span>
          ) : p.host ? (
            "Hosting"
          ) : (
            <>
              <span className={cn("h-1.5 w-1.5 rounded-full", q.dot)} aria-hidden />
              {q.label}
              {p.ping != null && <span className="tabular-nums">· {p.ping} ms</span>}
            </>
          )}
        </span>
      </span>
      {!p.host && (
        <span className={cn("label shrink-0 rounded-full px-2 py-1 text-[0.48rem]", p.ready ? "bg-sky text-ink" : "text-ink/45 ring-1 ring-ink/15")} data-ready={p.ready}>
          {p.ready ? "Ready" : "Not ready"}
        </span>
      )}
    </li>
  );
}

function EmptyRow() {
  return (
    <li className="flex items-center gap-3 px-3 py-2.5 text-ink/40">
      <span className="h-7 w-7 shrink-0 rounded-full border border-dashed border-ink/25" aria-hidden />
      <span className="font-serif text-base italic">Open seat</span>
    </li>
  );
}

function Fineprint({ relay }: { relay?: boolean }) {
  return (
    <p className="mt-6 font-serif text-xs leading-relaxed text-ink/50">
      Your cars talk to each other directly (WebRTC). A public matchmaking server only introduces you; nothing is stored and there are no accounts.
      {relay ? " A relay server is on for this site, for networks that block direct connections." : ""}
    </p>
  );
}
