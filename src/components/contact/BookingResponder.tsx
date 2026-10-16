"use client";

import { useEffect, useMemo, useState } from "react";
import type { ResolvedBooking } from "@/lib/booking-claim";
import { haptic } from "@/lib/haptics";
import { bookingAnswerEmail, type AnswerDetails, type BookingAnswer } from "@/lib/mail";
import { extrasRows, time12 } from "@/lib/tools/quote";
import { cn } from "@/lib/utils";

const FIELD = "w-full rounded-[2px] border border-ink/20 bg-paper/80 px-3 py-2.5 font-serif text-lg text-ink outline-none placeholder:text-ink/35 focus:border-ember focus:ring-1 focus:ring-ember";
const SAVED = "booking-answer-defaults";

const ACTIONS: { id: BookingAnswer; label: string; hint: string }[] = [
  { id: "confirm", label: "Confirm", hint: "Lock in the date and send payment details" },
  { id: "reschedule", label: "Suggest a date", hint: "Offer other dates that work" },
  { id: "decline", label: "Decline", hint: "Say no, kindly" },
];

/** Neil's side of a booking: review it, add details, preview and send the client's email. */
export default function BookingResponder({ token, booking, initialAction, canSend }: { token: string; booking: ResolvedBooking; initialAction: BookingAnswer; canSend: boolean }) {
  const [action, setAction] = useState<BookingAnswer>(initialAction);
  // Custom shoots arrive with a start time and place; start from those.
  const [d, setD] = useState<AnswerDetails>(() => {
    const x = booking.extras;
    const start: AnswerDetails = {};
    if (x?.time) start.time = time12(x.time);
    const place = x?.location || (x?.locationType !== "Help me choose" ? x?.locationType : "");
    if (place) start.location = place;
    return start;
  });
  const [status, setStatus] = useState<{ state: "idle" | "sending" | "sent" } | { state: "error"; message: string }>({ state: "idle" });
  const [copied, setCopied] = useState(false);

  // Payment instructions and usual location are remembered on this device.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVED) ?? "{}") as AnswerDetails;
      if (saved.payment || saved.location) queueMicrotask(() => setD((x) => ({ payment: saved.payment, location: saved.location, ...x })));
    } catch {}
  }, []);

  const set = (k: keyof AnswerDetails) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setD((x) => ({ ...x, [k]: e.target.value }));
  const mail = useMemo(() => bookingAnswerEmail(booking, action, d), [booking, action, d]);
  const first = booking.name.split(" ")[0] || "the client";

  const remember = () => {
    try {
      localStorage.setItem(SAVED, JSON.stringify({ payment: d.payment, location: d.location }));
    } catch {}
  };

  const send = async () => {
    haptic(10);
    remember();
    setStatus({ state: "sending" });
    try {
      const res = await fetch("/api/bookings/respond", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t: token, action, details: d }) });
      if (res.ok) return setStatus({ state: "sent" });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setStatus({ state: "error", message: body.error ?? "That didn't send." });
    } catch {
      setStatus({ state: "error", message: "You seem to be offline." });
    }
  };

  // A compose link can only carry plain text, so the designed email travels by clipboard: copy it, open Gmail, paste.
  const copyStyled = async () => {
    haptic(10);
    remember();
    try {
      await navigator.clipboard.write([new ClipboardItem({ "text/html": new Blob([mail.html], { type: "text/html" }), "text/plain": new Blob([mail.text], { type: "text/plain" }) })]);
      setCopied(true);
    } catch {
      setStatus({ state: "error", message: "This browser blocked copying. Try Chrome or Edge, or use the plain-text version." });
    }
  };
  const compose = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(booking.email)}&su=${encodeURIComponent(mail.subject)}`;
  const gmail = `${compose}&body=${encodeURIComponent(mail.text)}`;
  const mailto = `mailto:${booking.email}?subject=${encodeURIComponent(mail.subject)}&body=${encodeURIComponent(mail.text)}`;

  if (status.state === "sent") {
    return (
      <div className="animate-pop-in mx-auto max-w-xl py-16 text-center" role="status">
        <p className="label text-ember">Sent</p>
        <h1 className="mt-4 font-display text-5xl leading-tight">{first} will have it in a minute.</h1>
        <p className="mt-4 font-serif text-xl text-ink/70 italic">A copy went to your inbox too. Their reply comes straight back to you.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-12 lg:grid-cols-12">
      <div className="space-y-8 lg:col-span-5">
        <div>
          <p className="label text-ember">Booking request</p>
          <h1 className="mt-3 font-display text-[clamp(2.5rem,5vw,4rem)] leading-[1.02]">
            {booking.name || booking.email} <em className="block font-serif text-2xl text-ink/60">wants {booking.service.name.toLowerCase()}</em>
          </h1>
        </div>
        <dl className="divide-y divide-ink/10 border-y border-ink/10 font-serif text-lg">
          {[
            ["Package", `${booking.pkg.name} — ${booking.pkg.price}`],
            ["Includes", booking.pkg.detail],
            ["Date", new Date(`${booking.date}T00:00:00`).toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric", year: "numeric" })],
            ["Email", booking.email],
            ["Phone", booking.phone || "—"],
            ...extrasRows(booking.service, booking.pkg, booking.extras),
          ].map(([k, v]) => (
            <div key={k} className="flex gap-4 py-3">
              <dt className="label w-24 shrink-0 pt-1.5 text-[0.58rem] text-ink/50">{k}</dt>
              <dd className="min-w-0 break-words">
                {k === "Mood board" ? (
                  <a href={v} target="_blank" rel="noopener noreferrer nofollow" className="ulink text-ember">
                    {v.replace(/^https?:\/\//, "")}
                  </a>
                ) : (
                  v
                )}
              </dd>
            </div>
          ))}
        </dl>
        {booking.message && <p className="rounded-[2px] bg-paper-deep/60 p-4 font-serif text-lg whitespace-pre-line text-ink/80 italic">&ldquo;{booking.message}&rdquo;</p>}
        <div className="flex flex-wrap gap-2">
          <a href={`mailto:${booking.email}`} className="label press rounded-full border border-ink/20 px-4 py-2.5 text-[0.58rem] hover:border-ink">Email</a>
          {booking.phone && (
            <>
              <a href={`tel:${booking.phone.replace(/\s+/g, "")}`} className="label press rounded-full border border-ink/20 px-4 py-2.5 text-[0.58rem] hover:border-ink">Call</a>
              <a href={`sms:${booking.phone.replace(/\s+/g, "")}`} className="label press rounded-full border border-ink/20 px-4 py-2.5 text-[0.58rem] hover:border-ink">Text</a>
            </>
          )}
        </div>
      </div>

      <div className="space-y-6 lg:col-span-7">
        <div role="radiogroup" aria-label="Your answer" className="grid gap-2 sm:grid-cols-3">
          {ACTIONS.map((a) => (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={action === a.id}
              onClick={() => {
                haptic();
                setAction(a.id);
              }}
              className="press rounded-xl border border-ink/15 p-4 text-left transition-colors aria-checked:border-ink aria-checked:bg-ink aria-checked:text-paper"
            >
              <span className="block font-display text-xl">{a.label}</span>
              <span className="mt-1 block font-serif text-sm opacity-70">{a.hint}</span>
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {action === "confirm" && (
            <>
              <label className="block">
                <span className="label mb-1.5 block text-[0.58rem] text-ink/55">Call time</span>
                <input value={d.time ?? ""} onChange={set("time")} placeholder="e.g. 3:30 PM" className={FIELD} />
              </label>
              <label className="block">
                <span className="label mb-1.5 block text-[0.58rem] text-ink/55">Location</span>
                <input value={d.location ?? ""} onChange={set("location")} placeholder="e.g. CLSU Oval" className={FIELD} />
              </label>
              <label className="block sm:col-span-2">
                <span className="label mb-1.5 block text-[0.58rem] text-ink/55">How to pay the downpayment</span>
                <textarea value={d.payment ?? ""} onChange={set("payment")} rows={2} placeholder="e.g. GCash 09xx xxx xxxx — Neil Jacob S. Send a screenshot by reply." className={FIELD} />
              </label>
            </>
          )}
          {action === "reschedule" && (
            <label className="block sm:col-span-2">
              <span className="label mb-1.5 block text-[0.58rem] text-ink/55">Dates you can do instead</span>
              <input value={d.newDates ?? ""} onChange={set("newDates")} placeholder="e.g. Sat Nov 21 or Sun Nov 22" className={FIELD} />
            </label>
          )}
          <label className="block sm:col-span-2">
            <span className="label mb-1.5 block text-[0.58rem] text-ink/55">{action === "decline" ? "A kind word (optional)" : "Anything else (optional)"}</span>
            <textarea value={d.note ?? ""} onChange={set("note")} rows={3} placeholder={action === "confirm" ? "What to bring, outfits, parking…" : ""} className={FIELD} />
          </label>
        </div>

        <div>
          <p className="label mb-2 text-[0.58rem] text-ink/50">
            Preview · to {booking.email} · <span className="text-ink/70 normal-case">{mail.subject}</span>
          </p>
          <iframe title="Email preview" srcDoc={mail.html} sandbox="" className="h-[30rem] w-full rounded-[2px] bg-paper ring-1 ring-ink/10" />
        </div>

        {canSend ? (
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={send} disabled={status.state === "sending"} className="btn bg-ember text-paper hover:bg-ink disabled:opacity-60">
              {status.state === "sending" ? "Sending…" : `Send to ${first}`} <span className="arrow">→</span>
            </button>
            <button type="button" onClick={copyStyled} className="label ulink text-[0.6rem] text-ink/60 hover:text-ink">
              {copied ? "Copied ✓" : "Copy styled email"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={copyStyled} className="btn bg-ember text-paper hover:bg-ink">
                {copied ? "Copied ✓" : "1 · Copy styled email"}
              </button>
              <a href={compose} target="_blank" rel="noopener noreferrer" onClick={remember} className={cn("btn border border-ink/25 hover:border-ink", copied && "bg-ink text-paper")}>
                2 · Open Gmail &amp; paste <span className="arrow">↗</span>
              </a>
            </div>
            <p className="font-serif text-ink/65 italic">
              In Gmail, click into the message body and paste (Ctrl+V, or ⌘V on a Mac): the designed email drops in, ready to send.{" "}
              <a href={gmail} target="_blank" rel="noopener noreferrer" onClick={remember} className="ulink not-italic">
                Plain-text version
              </a>{" "}
              ·{" "}
              <a href={mailto} onClick={remember} className="ulink not-italic">
                Other mail app
              </a>
            </p>
          </div>
        )}
        {status.state === "error" && <p className="font-serif text-ember italic">{status.message}</p>}
        {!canSend && (
          <p className="rounded-[2px] border-l-2 border-sky bg-sky/10 px-4 py-3 font-serif text-base text-ink/75">
            Want one click instead? Add <code className="font-mono text-sm">GMAIL_USER</code> and a Google App Password as <code className="font-mono text-sm">GMAIL_APP_PASSWORD</code> in Vercel, and the site sends this exact designed email from your Gmail.
          </p>
        )}
      </div>
    </div>
  );
}
