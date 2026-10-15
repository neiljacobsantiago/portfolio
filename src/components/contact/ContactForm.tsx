"use client";

import { useState } from "react";
import { addOns, bookingTerms, EXTRA_PERSON, locationTypes, photoUses, PRIVATE_PEOPLE_INCLUDED, privateTerms, services, type PhotoUse } from "@/content/sessions";
import { haptic } from "@/lib/haptics";
import { peso, quote, time12 } from "@/lib/tools/quote";

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
  /** Custom shoots: comma-separated add-on ids and a head count. */
  addons?: string | null;
  people?: string | null;
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
  // Custom private shoot details
  const [people, setPeople] = useState(() => Math.max(1, Math.min(20, Number(preset?.people) || 1)));
  const [picked, setPicked] = useState<string[]>(() => addOns.filter((a) => preset?.addons?.split(",").includes(a.id)).map((a) => a.id));
  const [locationType, setLocationType] = useState("");
  const [use, setUse] = useState<PhotoUse>("ask");
  const sending = status.state === "sending";
  const service = services.find((s) => s.id === serviceId);
  const booking = topic === PHOTO;
  const custom = booking && service?.custom;
  const estimate = custom && packageId ? quote(serviceId, packageId, people, picked) : null;
  const est = estimate && !("error" in estimate) ? estimate : null;
  const terms = custom ? [...bookingTerms, ...privateTerms] : bookingTerms;

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
          booking: booking
            ? {
                service: serviceId,
                package: packageId,
                date: data.date,
                phone: data.phone,
                extras: custom ? { time: data.time, people, locationType, location: data.location, moodboard: data.moodboard, addOns: picked, use } : undefined,
              }
            : undefined,
        }),
      });
      if (res.ok) {
        const result = (await res.json().catch(() => ({}))) as { confirmation?: boolean };
        haptic(15);
        form.reset();
        setStatus({
          state: "success",
          confirmation: result.confirmation,
          summary:
            booking && pkg && service
              ? `${pkg.name} · ${service.name} · ${new Date(`${data.date}T00:00:00`).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })}${custom && data.time ? ` · ${time12(data.time)}` : ""}`
              : undefined,
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
          {custom && (
            <label className="animate-pop-in block">
              <span className="label text-ink/60">Start time</span>
              <input type="time" name="time" required min="05:00" max="20:00" step={900} className={field} />
            </label>
          )}
          <label className="block">
            <span className="label text-ink/60">Phone (optional)</span>
            <input type="tel" name="phone" autoComplete="tel" inputMode="tel" maxLength={20} className={field} placeholder="09xx xxx xxxx" />
          </label>
          {custom && (
            <div className="animate-pop-in">
              <span className="label block text-ink/60" id="people-label">
                People · {PRIVATE_PEOPLE_INCLUDED} included
              </span>
              <div role="group" aria-labelledby="people-label" className="mt-2 flex items-center gap-3">
                <button type="button" onClick={() => setPeople((n) => Math.max(1, n - 1))} aria-label="Fewer people" className="press h-11 w-11 rounded-full border border-ink/20 text-xl hover:border-ink">
                  −
                </button>
                <span className="w-10 text-center font-display text-3xl tabular-nums" aria-live="polite">
                  {people}
                </span>
                <button type="button" onClick={() => setPeople((n) => Math.min(20, n + 1))} aria-label="More people" className="press h-11 w-11 rounded-full border border-ink/20 text-xl hover:border-ink">
                  +
                </button>
                {people > PRIVATE_PEOPLE_INCLUDED && <span className="font-serif text-sm text-ink/60 italic">+{peso(EXTRA_PERSON)} each beyond {PRIVATE_PEOPLE_INCLUDED}</span>}
              </div>
            </div>
          )}

          {custom && (
            <>
              <fieldset className="animate-pop-in sm:col-span-2">
                <legend className="label mb-3 text-ink/60">Where</legend>
                <div className="flex flex-wrap gap-2">
                  {locationTypes.map((l) => (
                    <button
                      key={l}
                      type="button"
                      aria-pressed={locationType === l}
                      onClick={() => {
                        haptic();
                        setLocationType(l);
                      }}
                      className="label press rounded-full border border-ink/20 bg-paper/60 px-4 py-2.5 text-[0.58rem] hover:border-ink aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper"
                    >
                      {l}
                    </button>
                  ))}
                </div>
                <input name="location" maxLength={120} className={`${field} mt-3`} placeholder="The place, if you have one — e.g. our garden in Muñoz" />
              </fieldset>

              <label className="animate-pop-in block sm:col-span-2">
                <span className="label text-ink/60">Mood board or Pinterest link (optional)</span>
                <input type="url" name="moodboard" inputMode="url" maxLength={300} className={field} placeholder="https://pin.it/…" />
              </label>

              <fieldset className="animate-pop-in sm:col-span-2">
                <legend className="label mb-3 text-ink/60">Add-ons</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {addOns.map((a) => (
                    <label
                      key={a.id}
                      className="press flex cursor-pointer items-start justify-between gap-3 rounded-[2px] border border-ink/15 bg-paper/70 p-3.5 has-[:checked]:border-ember has-[:checked]:ring-1 has-[:checked]:ring-ember"
                    >
                      <span className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={picked.includes(a.id)}
                          onChange={(e) => setPicked((ids) => (e.target.checked ? [...ids, a.id] : ids.filter((id) => id !== a.id)))}
                          className="mt-1.5 h-4 w-4 accent-[var(--color-ember)]"
                        />
                        <span>
                          <span className="block font-serif text-lg leading-snug">{a.name}</span>
                          <span className="font-serif text-sm text-ink/55 italic">{a.detail}</span>
                        </span>
                      </span>
                      <span className="shrink-0 font-display text-base">{a.amount === null ? "Quote" : `+${peso(a.amount)}`}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="animate-pop-in sm:col-span-2">
                <legend className="label mb-3 text-ink/60">Your photos afterwards</legend>
                <div className="grid gap-2 sm:grid-cols-3">
                  {photoUses.map((u) => (
                    <label
                      key={u.id}
                      className="press flex cursor-pointer items-start gap-3 rounded-[2px] border border-ink/15 bg-paper/70 p-3.5 has-[:checked]:border-ember has-[:checked]:ring-1 has-[:checked]:ring-ember"
                    >
                      <input type="radio" name="use" checked={use === u.id} onChange={() => setUse(u.id)} className="mt-1.5 accent-[var(--color-ember)]" />
                      <span>
                        <span className="block font-serif text-lg leading-snug">{u.label}</span>
                        <span className="font-serif text-sm text-ink/55 italic">{u.detail}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </>
          )}

          {est && est.total !== null && (
            <div className="animate-pop-in flex flex-wrap items-end justify-between gap-3 rounded-[2px] bg-ink p-4 text-paper sm:col-span-2" aria-live="polite">
              <div>
                <p className="label text-[0.55rem] text-sky">Estimated total</p>
                <p className="font-display text-4xl leading-none tabular-nums">{peso(est.total)}</p>
              </div>
              <p className="max-w-xs font-serif text-sm text-paper/75 italic">
                {est.downpayment !== null && `${peso(est.downpayment)} downpayment secures the date.`}
                {est.quoted.length > 0 && ` ${est.quoted.join(", ")} is quoted separately.`}
              </p>
            </div>
          )}
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
          placeholder={custom ? "The concept, the feeling, outfits, anything you'd like to avoid…" : booking ? "The vibe, lighting, outfits, location ideas…" : "Dates, places, what you have in mind…"}
        />
      </label>

      {booking && (
        <fieldset className="animate-pop-in space-y-3">
          <legend className="label mb-2 text-ink/60">Terms</legend>
          {terms.map((t) => (
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
