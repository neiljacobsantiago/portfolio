"use client";

import { useState } from "react";
import {
  addOns,
  bookingSteps,
  bookingTerms,
  contactPrefs,
  EXTRA_PERSON,
  locationTypes,
  paymentMethods,
  photoUses,
  PRIVATE_PEOPLE_INCLUDED,
  privateTerms,
  referralSources,
  services,
  type PhotoUse,
} from "@/content/sessions";
import { briefFor, briefs, briefSections, requiredIn, type Brief, type BriefAnswers, type Field, type TopicId } from "@/content/briefs";
import { haptic } from "@/lib/haptics";
import { site } from "@/lib/site";
import { bookingSections, peso, quote, time12 } from "@/lib/tools/quote";
import { cn } from "@/lib/utils";

type Status = { state: "idle" | "sending" } | { state: "success"; summary?: string; brief?: string; confirmation?: boolean } | { state: "error"; message: string };

// The chips at the top: photo bookings plus every project brief.
const topics: { id: TopicId; label: string }[] = [
  { id: "website", label: "A website" },
  { id: "photography", label: "Book a photoshoot" },
  ...briefs.filter((b) => b.id !== "website").map((b) => ({ id: b.id, label: b.button })),
];

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

const EMPTY = { date: "", time: "", backupDate: "", occasion: "", location: "", phone: "", handle: "", deadline: "", moodboard: "", referral: "" };

/** Today as YYYY-MM-DD in the visitor's time zone, so past dates can't be picked. */
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default function ContactForm({ preset }: { preset?: ContactPreset }) {
  const presetService = services.find((s) => s.id === preset?.service);
  const presetPackage = presetService?.packages.find((p) => p.id === preset?.package);
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const [topic, setTopic] = useState<TopicId>(presetService || preset?.topic === "photography" ? "photography" : (briefFor(preset?.topic)?.id ?? "website"));
  // Project brief answers. Kept across topic switches so shared ones (phone, handle) carry over.
  const [answers, setAnswers] = useState<BriefAnswers>({});
  const [serviceId, setServiceId] = useState(presetService?.id ?? "");
  const [packageId, setPackageId] = useState(presetPackage?.id ?? "");
  // Custom private shoot details
  const [people, setPeople] = useState(() => Math.max(1, Math.min(20, Number(preset?.people) || 1)));
  const [picked, setPicked] = useState<string[]>(() => addOns.filter((a) => preset?.addons?.split(",").includes(a.id)).map((a) => a.id));
  const [locationType, setLocationType] = useState("");
  const [use, setUse] = useState<PhotoUse>("ask");
  const [contact, setContact] = useState("");
  const [payment, setPayment] = useState("");
  // Booking fields live in state so the summary can mirror them as they're typed
  const [d, setD] = useState(EMPTY);
  const bind = (k: keyof typeof EMPTY) => ({ name: k, value: d[k], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setD((v) => ({ ...v, [k]: e.target.value })) });
  const sending = status.state === "sending";
  const service = services.find((s) => s.id === serviceId);
  const booking = topic === "photography";
  const brief = booking ? undefined : briefFor(topic);
  const briefSummary = brief ? briefSections(brief, answers) : [];
  const custom = booking && service?.custom;
  const pkg = service?.packages.find((p) => p.id === packageId);
  const estimate = booking && service && pkg ? quote(serviceId, packageId, people, custom ? picked : []) : null;
  const est = estimate && !("error" in estimate) ? estimate : null;
  const terms = custom ? [...bookingTerms, ...privateTerms] : bookingTerms;
  const extras = {
    time: d.time || undefined,
    backupDate: d.backupDate || undefined,
    occasion: d.occasion.trim() || undefined,
    people,
    locationType: locationType || undefined,
    location: d.location.trim() || undefined,
    contact: contact || undefined,
    handle: d.handle.trim() || undefined,
    payment: payment || undefined,
    deadline: d.deadline || undefined,
    referral: d.referral || undefined,
    moodboard: d.moodboard.trim() || undefined,
    addOns: custom ? picked : [],
    use,
  };
  const summary = booking && service && pkg && d.date ? bookingSections(service, pkg, d.date, d.phone, extras) : null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
    // Chip questions can't use the browser's own "required", so check them here.
    const unanswered = brief?.steps.flatMap((st) => st.fields).find((f) => requiredIn(brief).includes(f.id) && f.kind !== "confirm" && !answers[f.id]?.length);
    if (unanswered) {
      setStatus({ state: "error", message: `Please answer “${unanswered.label}”.` });
      document.getElementById(`q-${unanswered.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setStatus({ state: "sending" });
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          company: data.company,
          topic: brief?.topic ?? "Photography",
          message: data.message,
          brief: brief ? { id: brief.id, answers: Object.fromEntries(Object.entries(answers).filter(([k]) => brief.steps.some((st) => st.fields.some((f) => f.id === k)))) } : undefined,
          booking: booking
            ? {
                service: serviceId,
                package: packageId,
                date: d.date,
                phone: d.phone,
                extras,
              }
            : undefined,
        }),
      });
      if (res.ok) {
        const result = (await res.json().catch(() => ({}))) as { confirmation?: boolean };
        haptic(15);
        form.reset();
        const sent = d;
        setD(EMPTY);
        setAnswers({});
        setStatus({
          state: "success",
          confirmation: result.confirmation,
          brief: brief && brief.id !== "other" ? brief.topic : undefined,
          summary:
            booking && pkg && service
              ? `${pkg.name} · ${service.name} · ${new Date(`${sent.date}T00:00:00`).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })}${sent.time ? ` · ${time12(sent.time)}` : ""}`
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
        <p className="label text-ember">{booking ? "Booking request received" : status.brief ? `${status.brief} received` : "Message received"}</p>
        <p className="mt-4 font-display text-5xl">Thank you.</p>
        {status.summary && <p className="label mx-auto mt-6 inline-block rounded-full bg-paper-deep px-4 py-2 text-ink/70">{status.summary}</p>}
        <p className="mx-auto mt-4 max-w-sm font-serif text-xl text-ink/75 italic">
          {booking ? "I'll confirm availability within 24 hours and send the downpayment details." : status.brief ? "I'll read it and reply within 24 hours, with questions if anything is unclear." : "I read every message myself and reply within 24 hours."}
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
              key={t.id}
              type="button"
              onClick={() => {
                haptic();
                setTopic(t.id);
                if (status.state === "error") setStatus({ state: "idle" });
              }}
              aria-pressed={topic === t.id}
              className="label press rounded-full border border-ink/20 px-4 py-2.5 hover:border-ink aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper"
            >
              {t.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-10 sm:grid-cols-2">
        <label className="block">
          <span className="label text-ink/60">Your name</span>
          <input name="name" autoComplete="name" maxLength={80} required={booking || (brief && brief.id !== "other")} disabled={sending} className={field} placeholder="Juan Dela Cruz" />
        </label>
        <label className="block">
          <span className="label text-ink/60">{booking || (brief && brief.id !== "other") ? "Your email — your copy goes here" : "Email"}</span>
          <input required type="email" name="email" autoComplete="email" inputMode="email" maxLength={254} disabled={sending} className={field} placeholder="you@example.com" />
        </label>
      </div>

      {booking && (
        <div className="animate-pop-in space-y-12 rounded-[2px] bg-paper-deep/60 p-5 sm:p-8">
          <p className="max-w-xl font-serif text-lg leading-snug text-ink/75 italic">
            A few details so Neil can check the date, plan the shoot and quote it right the first time. Anything marked optional can wait for the planning chat.
          </p>

          <Step n={1} title="The shoot" hint="Not sure which one? Pick the closest; Neil will suggest the right package.">
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

            <label className="block sm:col-span-2">
              <span className="label text-ink/60">What&apos;s the occasion?</span>
              <input {...bind("occasion")} maxLength={120} className={field} placeholder={service?.occasion ?? "e.g. graduation, 18th birthday, company event"} />
            </label>
          </Step>

          <Step n={2} title="When" hint="A backup date helps if your first choice is already taken.">
            <label className="block">
              <span className="label text-ink/60">Preferred date</span>
              <input type="date" {...bind("date")} required min={today()} suppressHydrationWarning className={field} />
            </label>
            <label className="block">
              <span className="label text-ink/60">Start time</span>
              <input type="time" {...bind("time")} required min="05:00" max="21:00" step={900} className={field} />
            </label>
            <label className="block">
              <span className="label text-ink/60">Backup date (optional)</span>
              <input type="date" {...bind("backupDate")} min={today()} suppressHydrationWarning className={field} />
            </label>
          </Step>

          <Step n={3} title="Where" hint={service?.atStudio ? undefined : "Outdoor spots work best early morning or late afternoon; Neil can suggest places."}>
            {service?.atStudio ? (
              <p className="font-serif text-lg text-ink/75 sm:col-span-2">
                At Neil&apos;s in-house studio in {site.location}. The exact address comes with your confirmation.
              </p>
            ) : (
              <div className="space-y-4 sm:col-span-2">
                <Chips label="Kind of place" options={locationTypes} value={locationType} onChange={setLocationType} />
                <input {...bind("location")} maxLength={160} className={field} placeholder="Address or place, if you have one — e.g. CLSU Oval, Muñoz" />
              </div>
            )}
          </Step>

          <Step n={4} title="Who's in it" hint="Helps Neil plan the lighting, the poses and how long it takes.">
            <div className="sm:col-span-2">
              <span className="label block text-ink/60" id="people-label">
                People in the photos{custom ? ` · ${PRIVATE_PEOPLE_INCLUDED} included` : ""}
              </span>
              <div role="group" aria-labelledby="people-label" className="mt-2 flex flex-wrap items-center gap-3">
                <button type="button" onClick={() => setPeople((n) => Math.max(1, n - 1))} aria-label="Fewer people" className="press h-11 w-11 rounded-full border border-ink/20 text-xl hover:border-ink">
                  −
                </button>
                <span className="w-10 text-center font-display text-3xl tabular-nums" aria-live="polite">
                  {people}
                </span>
                <button type="button" onClick={() => setPeople((n) => Math.min(50, n + 1))} aria-label="More people" className="press h-11 w-11 rounded-full border border-ink/20 text-xl hover:border-ink">
                  +
                </button>
                {custom && people > PRIVATE_PEOPLE_INCLUDED && <span className="font-serif text-sm text-ink/60 italic">+{peso(EXTRA_PERSON)} each beyond {PRIVATE_PEOPLE_INCLUDED}</span>}
                {pkg?.price.includes("/ head") && <span className="font-serif text-sm text-ink/60 italic">{pkg.price}, so this sets the total</span>}
              </div>
            </div>
          </Step>

          <Step n={5} title="Your photos" hint="How they'll be used, and anything that helps Neil picture the shoot.">
            <fieldset className="sm:col-span-2">
              <legend className="label mb-3 text-ink/60">After the shoot</legend>
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
            <label className="block">
              <span className="label text-ink/60">Need them by (optional)</span>
              <input type="date" {...bind("deadline")} min={today()} suppressHydrationWarning className={field} />
            </label>
            <label className="block">
              <span className="label text-ink/60">Mood board or Pinterest link (optional)</span>
              <input type="url" {...bind("moodboard")} inputMode="url" maxLength={300} className={field} placeholder="https://pin.it/…" />
            </label>

            {custom && (
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
            )}
          </Step>

          <Step n={6} title="Staying in touch" hint="For confirming the booking and coordinating on the day.">
            <label className="block">
              <span className="label text-ink/60">Mobile number</span>
              <input type="tel" {...bind("phone")} required autoComplete="tel" inputMode="tel" maxLength={20} pattern="[0-9+()\s-]{7,20}" className={field} placeholder="09xx xxx xxxx" />
            </label>
            <label className="block">
              <span className="label text-ink/60">Messenger / Viber name (optional)</span>
              <input {...bind("handle")} maxLength={80} className={field} placeholder="So Neil can find you" />
            </label>
            <div className="sm:col-span-2">
              <span className="label mb-3 block text-ink/60">Best way to reach you</span>
              <Chips label="Best way to reach you" options={contactPrefs} value={contact} onChange={setContact} />
            </div>
            <div className="sm:col-span-2">
              <span className="label mb-3 block text-ink/60">Downpayment via</span>
              <Chips label="Downpayment via" options={paymentMethods} value={payment} onChange={setPayment} />
            </div>
            <label className="block sm:col-span-2">
              <span className="label text-ink/60">How did you find Neil? (optional)</span>
              <select {...bind("referral")} className={`${field} cursor-pointer`}>
                <option value="">Choose…</option>
                {referralSources.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
          </Step>

          {summary && service && (
            <aside className="animate-pop-in rounded-[2px] bg-ink p-5 text-paper sm:p-7" aria-live="polite" aria-label="Your booking summary">
              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-paper/15 pb-5">
                <div>
                  <p className="label text-[0.55rem] text-sky">Your request, exactly as Neil will see it</p>
                  <p className="mt-2 font-display text-3xl leading-tight">{service.name}</p>
                </div>
                {est && est.total !== null && (
                  <div className="sm:text-right">
                    <p className="label text-[0.55rem] text-sky">Estimated total</p>
                    <p className="font-display text-4xl leading-none tabular-nums">{peso(est.total)}</p>
                    {est.downpayment !== null && <p className="mt-1 font-serif text-sm text-paper/70 italic">{peso(est.downpayment)} downpayment locks the date</p>}
                  </div>
                )}
              </div>
              <dl className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
                {summary.map((sec) => (
                  <div key={sec.title}>
                    <dt className="label mb-2 text-[0.52rem] text-sky">{sec.title}</dt>
                    <dd>
                      <ul className="space-y-1 font-serif text-[0.98rem] leading-snug">
                        {sec.rows
                          .filter(([k]) => k !== "Estimated total" && k !== "Downpayment (30%)")
                          .map(([k, v]) => (
                            <li key={k} className="break-words">
                              <span className="text-paper/55">{k}:</span> {v}
                            </li>
                          ))}
                      </ul>
                    </dd>
                  </div>
                ))}
              </dl>
              {est && est.quoted.length > 0 && <p className="mt-4 font-serif text-sm text-paper/70 italic">{est.quoted.join(", ")} is quoted separately.</p>}
              <div className="mt-6 border-t border-paper/15 pt-5">
                <p className="label text-[0.55rem] text-sky">What happens next</p>
                <ol className="mt-3 space-y-2">
                  {bookingSteps.map((step, i) => (
                    <li key={step} className="flex gap-3 font-serif text-paper/85">
                      <span className={cn("font-display", i === 0 ? "text-ember" : "text-sky")}>{i + 1}</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </aside>
          )}
        </div>
      )}

      {brief && <BriefForm key={brief.id} brief={brief} answers={answers} onChange={setAnswers} summary={briefSummary} />}

      <label className="block">
        <span className="label text-ink/60">{booking ? "Creative vision & notes" : (brief?.message.label ?? "Tell me about it")}</span>
        <textarea
          required
          name="message"
          rows={5}
          minLength={10}
          maxLength={5000}
          disabled={sending}
          className={`${field} resize-y`}
          placeholder={custom ? "The concept, the feeling, outfits, anything you'd like to avoid…" : booking ? "The vibe, lighting, outfits, location ideas…" : (brief?.message.placeholder ?? "Dates, places, what you have in mind…")}
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
          {sending ? "Sending…" : booking ? "Request booking" : brief && brief.id !== "other" ? "Send brief" : "Send message"} <span className="arrow">→</span>
        </button>
        <p aria-live="polite" className="font-serif text-ember italic">
          {status.state === "error" && status.message}
        </p>
      </div>
    </form>
  );
}

/** A numbered section of the booking form, with a line on why it's asked. */
function Step({ n, title, hint, id = String(n), children }: { n: number; title: string; hint?: string; id?: string; children: React.ReactNode }) {
  return (
    <section className="animate-pop-in" aria-labelledby={`step-${id}`}>
      <div className="mb-6 flex items-start gap-4 border-b border-ink/10 pb-4">
        <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink font-display text-lg text-paper">
          {n}
        </span>
        <div>
          <h3 id={`step-${id}`} className="font-display text-2xl leading-tight">
            {title}
          </h3>
          {hint && <p className="mt-1 font-serif text-ink/60 italic">{hint}</p>}
        </div>
      </div>
      <div className="grid gap-8 sm:grid-cols-2">{children}</div>
    </section>
  );
}

/** Single-choice chips; tapping the chosen one again clears it. */
function Chips({ label, options, value, onChange }: { label: string; options: readonly string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={value === o}
          onClick={() => {
            haptic();
            onChange(value === o ? "" : o);
          }}
          className="label press rounded-full border border-ink/20 bg-paper/60 px-4 py-2.5 text-[0.58rem] hover:border-ink aria-checked:border-ink aria-checked:bg-ink aria-checked:text-paper"
        >
          {o}
        </button>
      ))}
    </div>
  );
}

/** A project brief: its steps, a live summary and what happens next. */
function BriefForm({ brief, answers, onChange, summary }: { brief: Brief; answers: BriefAnswers; onChange: React.Dispatch<React.SetStateAction<BriefAnswers>>; summary: ReturnType<typeof briefSections> }) {
  const set = (id: string, v: string | string[]) => onChange((a) => ({ ...a, [id]: v }));
  const light = brief.id === "other";
  const required = requiredIn(brief);
  return (
    <div className={cn("animate-pop-in space-y-12", !light && "rounded-[2px] bg-paper-deep/60 p-5 sm:p-8")}>
      {brief.intro && <p className="max-w-xl font-serif text-lg leading-snug text-ink/75 italic">{brief.intro}</p>}
      {brief.partners && (
        <p className="max-w-xl border-l-2 border-sky pl-4 font-serif text-base leading-snug text-ink/75">
          <span className="label mb-1 block text-[0.62rem] text-ink/60">Outside partners</span>
          {brief.partners}
        </p>
      )}
      {brief.steps.map((st, i) => (
        <Step key={st.title} n={i + 1} title={st.title} hint={st.hint} id={`${brief.id}-${i}`}>
          {st.fields.map((f) => (
            <BriefField key={f.id} f={f} value={answers[f.id]} required={required.includes(f.id)} onChange={(v) => set(f.id, v)} />
          ))}
        </Step>
      ))}
      {!light && summary.length > 0 && (
        <aside className="animate-pop-in rounded-[2px] bg-ink p-5 text-paper sm:p-7" aria-live="polite" aria-label="Your brief summary">
          <p className="label text-[0.55rem] text-sky">Your brief, exactly as Neil will see it</p>
          <p className="mt-2 font-display text-3xl leading-tight">{brief.topic}</p>
          <dl className="mt-5 grid gap-x-8 gap-y-5 border-t border-paper/15 pt-5 sm:grid-cols-2">
            {summary.map((sec) => (
              <div key={sec.title}>
                <dt className="label mb-2 text-[0.52rem] text-sky">{sec.title}</dt>
                <dd>
                  <ul className="space-y-1 font-serif text-[0.98rem] leading-snug">
                    {sec.rows.map(([k, v]) => (
                      <li key={k} className="break-words">
                        <span className="text-paper/55">{k}:</span> {v}
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 border-t border-paper/15 pt-5">
            <p className="label text-[0.55rem] text-sky">What happens next</p>
            <ol className="mt-3 space-y-2">
              {brief.next.map((step, i) => (
                <li key={step} className="flex gap-3 font-serif text-paper/85">
                  <span className={cn("font-display", i === 0 ? "text-ember" : "text-sky")}>{i + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </aside>
      )}
    </div>
  );
}

function BriefField({ f, value, required, onChange }: { f: Field; value: string | string[] | undefined; required: boolean; onChange: (v: string | string[]) => void }) {
  const wide = f.wide && "sm:col-span-2";
  const caption = (
    <>
      {f.label}
      {f.optional && " (optional)"}
    </>
  );
  const one = typeof value === "string" ? value : "";
  switch (f.kind) {
    case "chips":
      return (
        <div id={`q-${f.id}`} className={cn("scroll-mt-28", wide)}>
          <span className="label mb-3 block text-ink/60">
            {caption}
            {required && <span className="text-ember"> *</span>}
          </span>
          <Chips label={f.label} options={f.options} value={one} onChange={onChange} />
        </div>
      );
    case "multi": {
      const list = Array.isArray(value) ? value : [];
      return (
        <div className={cn(wide)}>
          <span className="label mb-3 block text-ink/60">
            {caption} <span className="normal-case tracking-normal text-ink/40 italic">· pick any</span>
          </span>
          <div role="group" aria-label={f.label} className="flex flex-wrap gap-2">
            {f.options.map((o) => (
              <button
                key={o}
                type="button"
                aria-pressed={list.includes(o)}
                onClick={() => {
                  haptic();
                  onChange(list.includes(o) ? list.filter((x) => x !== o) : [...list, o]);
                }}
                className="label press flex items-center gap-1.5 rounded-full border border-ink/20 bg-paper/60 px-4 py-2.5 text-[0.58rem] hover:border-ink aria-pressed:border-ember aria-pressed:bg-ember aria-pressed:text-paper"
              >
                <span aria-hidden className="text-[0.7rem] leading-none">
                  {list.includes(o) ? "✓" : "+"}
                </span>
                {o}
              </button>
            ))}
          </div>
        </div>
      );
    }
    case "select":
      return (
        <label className={cn("block", wide)}>
          <span className="label text-ink/60">{caption}</span>
          <select name={`brief-${f.id}`} value={one} onChange={(e) => onChange(e.target.value)} className={`${field} cursor-pointer`}>
            <option value="">Choose…</option>
            {f.options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
      );
    case "date":
      return (
        <label className={cn("block", wide)}>
          <span className="label text-ink/60">{caption}</span>
          <input type="date" name={`brief-${f.id}`} value={one} onChange={(e) => onChange(e.target.value)} min={today()} suppressHydrationWarning className={field} />
        </label>
      );
    case "confirm":
      return (
        <label className={cn("flex cursor-pointer items-start gap-3 rounded-[2px] border border-ember/40 bg-paper/70 p-4 font-serif text-lg text-ink/85", wide)}>
          <input type="checkbox" required checked={one === "yes"} onChange={(e) => onChange(e.target.checked ? "yes" : "")} className="mt-1.5 h-4 w-4 shrink-0 accent-[var(--color-ember)]" />
          <span>{f.label}</span>
        </label>
      );
    default:
      return (
        <label className={cn("block", wide)}>
          <span className="label text-ink/60">{caption}</span>
          <input
            name={`brief-${f.id}`}
            type={f.kind}
            value={one}
            onChange={(e) => onChange(e.target.value)}
            maxLength={f.max}
            inputMode={f.kind === "tel" ? "tel" : f.kind === "url" ? "url" : undefined}
            autoComplete={f.kind === "tel" ? "tel" : undefined}
            pattern={f.kind === "tel" ? "[0-9+()\\s-]{7,20}" : undefined}
            className={field}
            placeholder={f.placeholder}
          />
        </label>
      );
  }
}
