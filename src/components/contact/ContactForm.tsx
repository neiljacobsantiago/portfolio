"use client";

import { useState } from "react";
import { bookingTerms, services } from "@/content/sessions";
import { haptic } from "@/lib/haptics";

type Status = { state: "idle" | "sending" } | { state: "success"; summary?: string; confirmation?: boolean } | { state: "error"; message: string };

const topics = ["A network", "Security", "A website", "Photography", "Something else"];
const PHOTO = "Photography";

const field =
  "w-full border-0 border-b border-ink/25 bg-transparent px-0 py-3 font-serif text-xl text-ink outline-none transition-colors placeholder:text-ink/35 focus:border-ember disabled:opacity-60";

/** Pre-selection from a deep link such as /contact?service=studio&package=studio_b. */
export interface ContactPreset {
  topic?: string | null;
  service?: string | null;
  package?: string | null;
}

/** Today as YYYY-MM-DD in the visitor's time zone, so past dates can't be picked. */
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default function ContactForm({ preset }: { preset?: ContactPreset }) {
  const presetService = services.find((s) => s.id === preset?.service);
  const presetPackage = presetService?.packages.find((p) => p.id === preset?.package);
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const [topic, setTopic] = useState(presetService || preset?.topic === "photography" ? PHOTO : topics[0]);
  const [serviceId, setServiceId] = useState(presetService?.id ?? "");
  const [packageId, setPackageId] = useState(presetPackage?.id ?? "");
  const sending = status.state === "sending";
  const service = services.find((s) => s.id === serviceId);
  const booking = topic === PHOTO;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
    const pkg = service?.packages.find((p) => p.id === packageId);
    setStatus({ state: "sending" });
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          company: data.company,
          topic,
          message: data.message,
          booking: booking ? { service: serviceId, package: packageId, date: data.date, phone: data.phone } : undefined,
        }),
      });
      if (res.ok) {
        const result = (await res.json().catch(() => ({}))) as { confirmation?: boolean };
        haptic(15);
        form.reset();
        setStatus({
          state: "success",
          confirmation: result.confirmation,
          summary: booking && pkg && service ? `${pkg.name} · ${service.name} · ${new Date(`${data.date}T00:00:00`).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })}` : undefined,
        });
      } else {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setStatus({ state: "error", message: body.error ?? "That didn't send. Please try again." });
      }
    } catch {
      setStatus({ state: "error", message: "You seem to be offline. Check your connection and try again." });
    }
  };

  if (status.state === "success") {
    return (
      <div className="animate-pop-in py-12 text-center" role="status">
        <p className="label text-ember">{booking ? "Booking request received" : "Message received"}</p>
        <p className="mt-4 font-display text-5xl">Thank you.</p>
        {status.summary && <p className="label mx-auto mt-6 inline-block rounded-full bg-paper-deep px-4 py-2 text-ink/70">{status.summary}</p>}
        <p className="mx-auto mt-4 max-w-sm font-serif text-xl text-ink/75 italic">
          {booking ? "I'll confirm availability within 24 hours and send the downpayment details." : "I read every message myself and reply within 24 hours."}
          {status.confirmation && " A copy is on its way to your inbox."}
        </p>
        <button type="button" onClick={() => setStatus({ state: "idle" })} className="label press mt-10 rounded-full border border-ink/25 px-6 py-3 hover:border-ink">
          Send another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-10">
      <fieldset>
        <legend className="label mb-4 text-ink/60">What&apos;s it about?</legend>
        <div className="flex flex-wrap gap-2">
          {topics.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                haptic();
                setTopic(t);
              }}
              aria-pressed={topic === t}
              className="label press rounded-full border border-ink/20 px-4 py-2.5 hover:border-ink aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper"
            >
              {t === PHOTO ? "Book a photoshoot" : t}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-10 sm:grid-cols-2">
        <label className="block">
          <span className="label text-ink/60">Your name</span>
          <input name="name" autoComplete="name" maxLength={80} required={booking} disabled={sending} className={field} placeholder="Juan Dela Cruz" />
        </label>
        <label className="block">
          <span className="label text-ink/60">{booking ? "Your email — your confirmation goes here" : "Email"}</span>
          <input required type="email" name="email" autoComplete="email" inputMode="email" maxLength={254} disabled={sending} className={field} placeholder="you@example.com" />
        </label>
      </div>

      {booking && (
        <div className="animate-pop-in grid gap-10 rounded-[2px] bg-paper-deep/60 p-5 sm:grid-cols-2 sm:p-7">
          <label className="block sm:col-span-2">
            <span className="label text-ink/60">Service</span>
            <select
              required
              value={serviceId}
              onChange={(e) => {
                setServiceId(e.target.value);
                setPackageId("");
              }}
              className={`${field} cursor-pointer`}
            >
              <option value="" disabled>
                Choose a service…
              </option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          {service && (
            <fieldset className="animate-pop-in sm:col-span-2">
              <legend className="label mb-3 text-ink/60">Package</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {service.packages.map((p) => (
                  <label
                    key={p.id}
                    className="press flex cursor-pointer items-start justify-between gap-3 rounded-[2px] border border-ink/15 bg-paper/70 p-4 has-[:checked]:border-ember has-[:checked]:ring-1 has-[:checked]:ring-ember"
                  >
                    <span className="flex items-start gap-3">
                      <input type="radio" name="package" value={p.id} required checked={packageId === p.id} onChange={() => setPackageId(p.id)} className="mt-1.5 accent-[var(--color-ember)]" />
                      <span>
                        <span className="block font-serif text-lg leading-snug">{p.name}</span>
                        <span className="label text-[0.58rem] text-ink/55">{p.detail}</span>
                      </span>
                    </span>
                    <span className="font-display text-lg">{p.price}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <label className="block">
            <span className="label text-ink/60">Target date</span>
            <input type="date" name="date" required min={today()} suppressHydrationWarning className={field} />
          </label>
          <label className="block">
            <span className="label text-ink/60">Phone (optional)</span>
            <input type="tel" name="phone" autoComplete="tel" inputMode="tel" maxLength={20} className={field} placeholder="09xx xxx xxxx" />
          </label>
        </div>
      )}

      <label className="block">
        <span className="label text-ink/60">{booking ? "Creative vision & notes" : "Tell me about it"}</span>
        <textarea
          required
          name="message"
          rows={5}
          minLength={10}
          maxLength={5000}
          disabled={sending}
          className={`${field} resize-y`}
          placeholder={booking ? "The vibe, lighting, outfits, location ideas…" : "Dates, places, what you have in mind…"}
        />
      </label>

      {booking && (
        <fieldset className="animate-pop-in space-y-3">
          <legend className="label mb-2 text-ink/60">Terms</legend>
          {bookingTerms.map((t) => (
            <label key={t} className="flex cursor-pointer items-start gap-3 font-serif text-lg text-ink/80">
              <input type="checkbox" required className="mt-1.5 h-4 w-4 accent-[var(--color-ember)]" />
              <span>{t}</span>
            </label>
          ))}
        </fieldset>
      )}

      {/* Honeypot for bots — hidden from people and assistive tech */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="company">Company</label>
        <input id="company" type="text" name="company" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <button type="submit" disabled={sending} className="btn bg-ember text-paper hover:bg-ink disabled:opacity-60">
          {sending ? "Sending…" : booking ? "Request booking" : "Send message"} <span className="arrow">→</span>
        </button>
        <p aria-live="polite" className="font-serif text-ember italic">
          {status.state === "error" && status.message}
        </p>
      </div>
    </form>
  );
}
