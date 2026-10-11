"use client";

import { useState } from "react";

type Status = { state: "idle" | "sending" | "success" } | { state: "error"; message: string };

const topics = ["A network", "Security", "A website", "Photography", "Something else"];

const field =
  "w-full border-0 border-b border-ink/25 bg-transparent px-0 py-3 font-serif text-xl text-ink outline-none transition-colors placeholder:text-ink/35 focus:border-ember disabled:opacity-60";

export default function ContactForm() {
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const [topic, setTopic] = useState(topics[0]);
  const sending = status.state === "sending";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
    setStatus({ state: "sending" });

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, subject: `${topic}${data.name ? ` — ${data.name}` : ""}` }),
      });
      if (res.ok) {
        form.reset();
        setStatus({ state: "success" });
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
      <div className="py-12 text-center" role="status">
        <p className="label text-ember">Message received</p>
        <p className="mt-4 font-display text-5xl">Thank you.</p>
        <p className="mx-auto mt-4 max-w-sm font-serif text-xl text-ink/75 italic">I read every message myself and usually reply within a couple of days.</p>
        <button type="button" onClick={() => setStatus({ state: "idle" })} className="label mt-10 rounded-full border border-ink/25 px-6 py-3 hover:border-ink">
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
              onClick={() => setTopic(t)}
              aria-pressed={topic === t}
              className="label rounded-full border border-ink/20 px-4 py-2.5 transition-colors hover:border-ink aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper"
            >
              {t}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-10 sm:grid-cols-2">
        <label className="block">
          <span className="label text-ink/60">Your name</span>
          <input name="name" autoComplete="name" maxLength={80} disabled={sending} className={field} placeholder="Juan Dela Cruz" />
        </label>
        <label className="block">
          <span className="label text-ink/60">Email</span>
          <input required type="email" name="email" autoComplete="email" inputMode="email" maxLength={254} disabled={sending} className={field} placeholder="you@example.com" />
        </label>
      </div>

      <label className="block">
        <span className="label text-ink/60">Tell me about it</span>
        <textarea required name="message" rows={5} minLength={10} maxLength={5000} disabled={sending} className={`${field} resize-y`} placeholder="Dates, places, what you have in mind…" />
      </label>

      {/* Honeypot for bots — hidden from people and assistive tech */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="company">Company</label>
        <input id="company" type="text" name="company" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <button
          type="submit"
          disabled={sending}
          className="label rounded-full bg-ember px-8 py-4 text-paper transition-colors hover:bg-ink disabled:opacity-60"
        >
          {sending ? "Sending…" : "Send message"}
        </button>
        <p aria-live="polite" className="font-serif text-ember italic">
          {status.state === "error" && status.message}
        </p>
      </div>
    </form>
  );
}
