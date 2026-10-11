"use client";

import { useState } from "react";
import { Send, TerminalSquare } from "lucide-react";

type Status = { state: "idle" | "sending" | "success" } | { state: "error"; message: string };

const inputClass =
  "interactive border border-butter/20 bg-marine/50 p-3 font-mono text-butter outline-none transition-colors placeholder:text-butter/30 focus:border-accentRed disabled:opacity-60";
const labelClass = "font-mono text-xs tracking-widest text-butter/60 uppercase";

export default function ContactForm() {
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const sending = status.state === "sending";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setStatus({ state: "sending" });

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      if (res.ok) {
        form.reset();
        setStatus({ state: "success" });
      } else {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setStatus({ state: "error", message: data.error ?? "Transmission failed. Please try again." });
      }
    } catch {
      setStatus({ state: "error", message: "Network unreachable. Check your connection and retry." });
    }
  };

  if (status.state === "success") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center" role="status">
        <TerminalSquare className="mb-4 h-12 w-12 text-green-500" />
        <h2 className="mb-2 font-mono text-xl tracking-widest text-green-500 uppercase">Payload Delivered</h2>
        <p className="font-mono text-xs text-butter/60 uppercase">The operator will review your transmission shortly.</p>
        <button
          type="button"
          onClick={() => setStatus({ state: "idle" })}
          className="interactive mt-8 border border-butter/30 px-6 py-3 font-mono text-xs tracking-widest text-butter uppercase transition-colors hover:bg-butter/10"
        >
          Send Another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className={labelClass}>Origin Entity (Email)</label>
        <input id="email" required type="email" name="email" autoComplete="email" inputMode="email" maxLength={254} disabled={sending} className={inputClass} placeholder="operator@domain.com" />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="subject" className={labelClass}>Subject Header</label>
        <input id="subject" required type="text" name="subject" maxLength={150} disabled={sending} className={inputClass} placeholder="Project Inquiry / Network Audit" />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="message" className={labelClass}>Encrypted Payload (Message)</label>
        <textarea id="message" required name="message" rows={6} minLength={10} maxLength={5000} disabled={sending} className={`${inputClass} resize-y`} placeholder="Enter parameters here..." />
      </div>

      {/* Honeypot for bots — hidden from people and assistive tech */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="company">Company</label>
        <input id="company" type="text" name="company" tabIndex={-1} autoComplete="off" />
      </div>

      <button
        type="submit"
        disabled={sending}
        className="interactive mt-2 flex items-center justify-center gap-2 bg-accentRed py-4 font-display text-lg font-bold text-marine uppercase transition-colors hover:bg-butter disabled:opacity-50 md:text-xl"
      >
        {sending ? "Encrypting & Sending..." : "Transmit Payload"} <Send className="h-5 w-5" />
      </button>
      <p aria-live="polite" className="min-h-4 text-center font-mono text-xs text-accentRed uppercase">
        {status.state === "error" && status.message}
      </p>
    </form>
  );
}
