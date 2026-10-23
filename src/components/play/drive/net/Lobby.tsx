"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/ui/Icon";
import { cn } from "@/lib/utils";
import { PAINTS, type PaintId } from "../car";
import { CODE_PREFIX, MAX_PLAYERS, NAME_MAX, normalizeCode, PAINT_IDS, type PlayerInfo, quality, roomLink, sanitizeName } from "./protocol";
import type { Multiplayer } from "./useMultiplayer";

// The lobby: pick a name and a paint, make a room or join one, then wait for
// everyone to be ready. A dark race-control sheet over the title card,
// readable on a 390px phone.

const QUALITY = {
  good: { label: "Good", dot: "bg-[#2fd27a]" },
  fair: { label: "Fair", dot: "bg-[#ffd23f]" },
  poor: { label: "Weak", dot: "bg-ember" },
  unknown: { label: "Checking", dot: "bg-paper/30" },
} as const;

const FIELD = "bg-paper/[0.06] ring-1 ring-paper/20 focus-within:ring-2 focus-within:ring-ember";
const PRIMARY = "press flex min-h-12 w-full items-center justify-between gap-2 bg-ember px-4 text-paper transition-colors hover:bg-[#d8222f] disabled:opacity-50 disabled:hover:bg-ember";
const SECONDARY = "race-cap press min-h-11 w-full px-4 ring-1 ring-paper/25 transition-colors hover:bg-paper/5";

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
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[#020a10]/70 backdrop-blur-sm md:items-center md:p-6" onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lobby-title"
        data-lenis-prevent
        onClick={(e) => e.stopPropagation()}
        className={cn("animate-pop-in max-h-[100svh] w-full max-w-md overflow-y-auto overscroll-contain bg-[#06121c] text-paper shadow-2xl ring-1 ring-paper/10 md:max-h-[92svh]", mp.inRoom && "md:max-w-3xl")}
      >
        <div aria-hidden className="chequer sticky top-0 z-10 h-2.5 [--chq:5px]" />
        <div
          style={{
            paddingTop: "max(16px, env(safe-area-inset-top))",
            paddingBottom: "max(20px, env(safe-area-inset-bottom))",
            paddingLeft: "max(18px, env(safe-area-inset-left))",
            paddingRight: "max(18px, env(safe-area-inset-right))",
          }}
        >
          {mp.inRoom ? <Room mp={mp} paint={paint} onPaint={onPaint} /> : busy ? <Connecting mp={mp} /> : <Start mp={mp} paint={paint} onPaint={onPaint} onClose={close} />}
        </div>
      </div>
    </div>
  );
}

function Header({ title, onClose }: { title: string; onClose?: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="race-cap text-[#ff8a7a]">Bay Street Circuit · together</p>
        <h2 id="lobby-title" className="race-num mt-1.5 text-[2rem] leading-none uppercase">
          {title}
        </h2>
      </div>
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Close" className="press flex h-10 w-10 shrink-0 items-center justify-center ring-1 ring-paper/20 hover:bg-paper/10">
          <Icon name="close" />
        </button>
      )}
    </div>
  );
}

function Caption({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("race-cap mb-2 flex items-center gap-2 text-paper/60", className)}>{children}</p>;
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
          className="press flex aspect-[4/3] items-center justify-center ring-1 ring-paper/15 hover:bg-paper/5 aria-checked:ring-2 aria-checked:ring-ember"
        >
          <span className="block h-5 w-9 -skew-x-12" style={{ background: `linear-gradient(180deg, ${PAINTS[id].primary} 0 58%, ${PAINTS[id].secondary} 58% 80%, ${PAINTS[id].accent} 80%)` }} />
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
      <p className="mt-3 text-[1rem] leading-snug text-paper/80">Up to four players, each on their own phone or computer. No sign-up: pick a name and a colour, then share the room code.</p>

      {err && (
        <div role="alert" className="mt-5 border-l-4 border-ember bg-ember/15 p-4">
          <p className="text-[1.05rem] leading-tight font-bold">{err.title}</p>
          <p className="mt-1.5 text-[0.95rem] leading-snug text-paper/85">{err.detail}</p>
          {err.tips && (
            <ul className="mt-2 space-y-1.5 text-[0.9rem] leading-snug text-paper/80">
              {err.tips.map((t) => (
                <li key={t} className="flex gap-2">
                  <Icon name="chevron-right" className="mt-0.5 h-3.5 w-3.5 text-[#ff8a7a]" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <label className="mt-6 block">
        <span className="race-cap text-paper/60">Your nickname</span>
        <span className={cn("mt-1.5 block", FIELD)}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (linked ? join(linked) : create())}
            maxLength={NAME_MAX * 2}
            autoComplete="nickname"
            enterKeyHint="go"
            placeholder="What your friends call you"
            className="block w-full bg-transparent px-4 py-3 text-[1.1rem] font-semibold text-paper outline-none placeholder:font-normal placeholder:text-paper/40"
          />
        </span>
      </label>
      <Caption className="mt-5">Your paint · {PAINTS[paint].name}</Caption>
      <Paints value={paint} onChange={onPaint} />

      {problem && (
        <p role="alert" className="mt-4 text-[0.95rem] font-semibold text-[#ff8a7a]">
          {problem}
        </p>
      )}

      {linked ? (
        <>
          <button type="button" onClick={() => join(linked)} className={cn(PRIMARY, "mt-6")}>
            <span className="race-num text-[1.15rem] uppercase">Join {linked}</span> <Icon name="arrow-right" className="h-5 w-5" />
          </button>
          <button type="button" onClick={create} className={cn(SECONDARY, "mt-2.5")}>
            Make a new room instead
          </button>
        </>
      ) : (
        <>
          <button type="button" onClick={create} className={cn(PRIMARY, "mt-6")}>
            <span className="race-num text-[1.15rem] uppercase">Create a room</span> <Icon name="arrow-right" className="h-5 w-5" />
          </button>
          <p className="race-cap mt-6 mb-2 flex items-center gap-3 text-paper/50">
            <span className="h-px flex-1 bg-paper/15" /> or join with a code <span className="h-px flex-1 bg-paper/15" />
          </p>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              join(code);
            }}
          >
            <label className={cn("flex min-w-0 flex-1 items-center", FIELD)}>
              <span className="race-num pl-4 text-[1.2rem] text-paper/50" aria-hidden>
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
                className="race-num w-full min-w-0 bg-transparent py-3 pr-3 text-[1.2rem] tracking-[0.15em] text-paper uppercase outline-none placeholder:text-paper/30"
              />
            </label>
            <button type="submit" className="race-cap press shrink-0 bg-paper px-5 text-ink hover:bg-white">
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
        <span className="h-8 w-8 shrink-0 animate-spin rounded-full border-2 border-paper/15 border-t-ember" aria-hidden />
        <p className="text-[1.05rem] font-semibold text-paper/85">{mp.state.step ?? "Connecting…"}</p>
      </div>
      <p className="mt-4 text-[0.9rem] leading-snug text-paper/65">This usually takes a few seconds. On mobile data it can take up to fifteen.</p>
      <button type="button" onClick={() => mp.leave(true)} className={cn(SECONDARY, "mt-8")}>
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
      <div className="md:mt-5 md:grid md:grid-cols-2 md:gap-7">
        <div className="min-w-0">
          <div className="mt-4 bg-paper p-4 text-ink md:mt-0">
            <p className="race-cap text-ink/60">Room code</p>
            <p className="race-num mt-1 text-[2.4rem] tracking-[0.06em]" data-room-code>
              {code}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={share} className="race-cap press flex min-h-11 items-center justify-center gap-1.5 bg-ember px-3 text-paper hover:bg-wine">
                <Icon name="share" /> {copied === "link" ? "Link copied" : "Share link"}
              </button>
              <button type="button" onClick={() => copy(code, "code")} className="race-cap press flex min-h-11 items-center justify-center gap-1.5 px-3 ring-1 ring-ink/25 hover:bg-ink/5">
                <Icon name={copied === "code" ? "check" : "copy"} /> {copied === "code" ? "Copied" : "Copy code"}
              </button>
            </div>
            <p className="mt-3 text-[0.875rem] leading-snug text-ink/75">Send the code or the link. Everyone needs this page open, on any network.</p>
          </div>

          {s.status === "reconnecting" && (
            <p role="status" className="mt-4 border-l-4 border-[#ffd23f] bg-[#ffd23f]/15 px-4 py-3 text-[0.95rem]">
              {s.step}
            </p>
          )}

          <Caption className="mt-6">
            <Icon name="users" className="h-3.5 w-3.5" /> Starting grid · {s.players.length} of {MAX_PLAYERS}
          </Caption>
          <ul className="divide-y divide-paper/10 ring-1 ring-paper/15" data-players>
            {Array.from({ length: MAX_PLAYERS }, (_, i) => s.players[i] ?? null).map((p, i) => (p ? <Row key={p.slot} p={p} n={i + 1} me={p.slot === s.me} /> : <EmptyRow key={`empty-${i}`} n={i + 1} />))}
          </ul>
        </div>

        <div className="min-w-0">
          <Caption className="mt-6 md:mt-0">Your paint · {PAINTS[meP?.paint ?? paint].name}</Caption>
          <Paints value={meP?.paint ?? paint} onChange={choosePaint} />

          <Caption className="mt-6">What we&apos;re playing</Caption>
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
                    className="press relative px-3 py-2.5 text-left ring-1 ring-paper/20 hover:bg-paper/5 aria-checked:bg-paper aria-checked:text-ink aria-checked:ring-paper"
                  >
                    <span className="race-num block text-[1.15rem] uppercase">{m === "race" ? "Race" : "Free roam"}</span>
                    <span className="mt-0.5 block text-[0.85rem] leading-snug opacity-75">{m === "race" ? "Start lights, positions, a winner" : "Drive around together, no clock"}</span>
                  </button>
                ))}
              </div>
              {s.settings.mode === "race" && (
                <div role="radiogroup" aria-label="Laps" className="flex items-center gap-2">
                  <span className="race-cap text-paper/70">Laps</span>
                  {[3, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={s.settings.laps === n}
                      onClick={() => mp.setSettings({ laps: n })}
                      className="race-num press h-10 w-12 text-[1.1rem] ring-1 ring-paper/20 hover:bg-paper/5 aria-checked:bg-paper aria-checked:text-ink"
                    >
                      {n}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-[1.05rem] font-semibold" data-settings>
              {s.settings.mode === "race" ? `A race, ${s.settings.laps} laps` : "Free roam, no clock"} <span className="font-normal text-paper/60">· the host picks</span>
            </p>
          )}

          {raceOn && <p className="mt-4 border-l-4 border-sky bg-sky/15 px-4 py-3 text-[0.95rem]">A race is on right now. You&apos;ll be on the grid for the next one.</p>}

          {host ? (
            <>
              <button type="button" onClick={mp.start} disabled={waiting.length > 0} className={cn(PRIMARY, "mt-6")}>
                <span className="race-num text-[1.15rem] uppercase">{s.settings.mode === "race" ? "Start the race" : "Start free roam"}</span> <Icon name="flag" className="h-5 w-5" />
              </button>
              <p className="mt-2 text-center text-[0.875rem] text-paper/65" aria-live="polite">
                {guests.length === 0 ? "Nobody else yet. You can start alone, or wait for someone to join." : waiting.length ? `Waiting for ${waiting.map((p) => p.name).join(", ")} to get ready.` : "Everyone's ready."}
              </p>
            </>
          ) : (
            !raceOn && (
              <>
                <button
                  type="button"
                  aria-pressed={!!meP?.ready}
                  onClick={() => mp.setReady(!meP?.ready)}
                  className={cn("press mt-6 flex min-h-12 w-full items-center justify-center gap-2 px-4 transition-colors", meP?.ready ? "bg-[#2fd27a] text-ink" : "bg-ember text-paper hover:bg-[#d8222f]")}
                >
                  {meP?.ready && <Icon name="check" className="h-5 w-5" />}
                  <span className="race-num text-[1.15rem] uppercase">{meP?.ready ? "Ready" : "I'm ready"}</span>
                </button>
                <p className="mt-2 text-center text-[0.875rem] text-paper/65" aria-live="polite">
                  {meP?.ready ? "Waiting for the host to start. Tap again if you need a minute." : "The host starts once everyone's ready."}
                </p>
              </>
            )
          )}

          <button type="button" onClick={() => mp.leave(true)} className={cn(SECONDARY, "mt-4 text-paper/80")}>
            {host ? "Close the room" : "Leave the room"}
          </button>
          <Fineprint relay={s.relay} />
        </div>
      </div>
    </>
  );
}

function Row({ p, n, me }: { p: PlayerInfo; n: number; me: boolean }) {
  const q = QUALITY[quality(p.ping)];
  return (
    <li className={cn("flex items-center gap-3 pr-3", me && "bg-paper/[0.06]")} data-slot={p.slot}>
      <span className="race-num flex h-12 w-9 shrink-0 items-center justify-center bg-paper/10 text-[1.1rem]">{n}</span>
      <span aria-hidden className="h-7 w-1.5 shrink-0" style={{ background: PAINTS[p.paint].primary }} />
      <span className="min-w-0 flex-1 py-1.5">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[1.05rem] leading-tight font-bold uppercase" data-name>
            {p.name}
          </span>
          {me && <span className="race-cap shrink-0 bg-paper/15 px-1.5 py-0.5 text-[0.6rem]">You</span>}
          {p.host && <span className="race-cap shrink-0 bg-ember px-1.5 py-0.5 text-[0.6rem] text-paper">Host</span>}
        </span>
        <span className="race-cap mt-0.5 flex items-center gap-1.5 text-[0.625rem] text-paper/60">
          {p.away ? (
            <span className="text-[#ff8a7a]">Reconnecting…</span>
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
        <span className={cn("race-cap shrink-0 px-2 py-1 text-[0.625rem]", p.ready ? "bg-[#2fd27a] text-ink" : "text-paper/55 ring-1 ring-paper/20")} data-ready={p.ready}>
          {p.ready ? "Ready" : "Not ready"}
        </span>
      )}
    </li>
  );
}

function EmptyRow({ n }: { n: number }) {
  return (
    <li className="flex items-center gap-3 text-paper/40">
      <span className="race-num flex h-12 w-9 shrink-0 items-center justify-center bg-paper/[0.04] text-[1.1rem]">{n}</span>
      <span aria-hidden className="h-7 w-1.5 shrink-0 border border-dashed border-paper/25" />
      <span className="race-cap">Open seat</span>
    </li>
  );
}

function Fineprint({ relay }: { relay?: boolean }) {
  return (
    <p className="mt-6 text-[0.8rem] leading-relaxed text-paper/55">
      Your cars talk to each other directly (WebRTC). A public matchmaking server only introduces you; nothing is stored and there are no accounts.
      {relay ? " A relay server is on for this site, for networks that block direct connections." : ""}
    </p>
  );
}
