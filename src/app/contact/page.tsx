"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Send, TerminalSquare } from "lucide-react";

export default function ContactPage() {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("sending");

    const formData = new FormData(e.currentTarget);
    const payload = {
      email: formData.get("email"),
      subject: formData.get("subject"),
      message: formData.get("message"),
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) setStatus("success");
      else setStatus("error");
    } catch (err) {
      setStatus("error");
    }
  };

  return (
    <main className="relative w-full min-h-screen pb-32">
      <section className="relative z-10 w-full pt-40 pb-12 px-6 md:px-16 max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12 border-b border-butter/10 pb-8">
          <span className="font-mono text-accentRed tracking-[0.2em] uppercase text-xs mb-4 flex items-center gap-2">
            <Mail className="w-4 h-4" /> /Directory/Secure_Comm
          </span>
          <h1 className="font-display text-5xl md:text-7xl font-black uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-butter to-butter/40">
            Secure <br/> Transmission
          </h1>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="border border-butter/10 bg-black/40 p-6 md:p-8">
          {status === "success" ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <TerminalSquare className="w-12 h-12 text-green-500 mb-4" />
              <h3 className="font-mono text-xl uppercase tracking-widest text-green-500 mb-2">Payload Delivered</h3>
              <p className="font-mono text-xs text-butter/60 uppercase">The operator will review your transmission shortly.</p>
              <button onClick={() => setStatus("idle")} className="mt-8 font-mono text-xs text-butter uppercase tracking-widest border border-butter/30 px-6 py-2 hover:bg-butter/10 transition-colors interactive">
                Send Another
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="font-mono text-xs uppercase tracking-widest text-butter/60">Origin Entity (Email)</label>
                <input required type="email" name="email" disabled={status === "sending"} className="bg-marine/50 border border-butter/20 p-3 font-mono text-sm text-butter outline-none focus:border-accentRed transition-colors interactive" placeholder="operator@domain.com" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-mono text-xs uppercase tracking-widest text-butter/60">Subject Header</label>
                <input required type="text" name="subject" disabled={status === "sending"} className="bg-marine/50 border border-butter/20 p-3 font-mono text-sm text-butter outline-none focus:border-accentRed transition-colors interactive" placeholder="Project Inquiry / Network Audit" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-mono text-xs uppercase tracking-widest text-butter/60">Encrypted Payload (Message)</label>
                <textarea required name="message" rows={6} disabled={status === "sending"} className="bg-marine/50 border border-butter/20 p-3 font-mono text-sm text-butter outline-none focus:border-accentRed transition-colors resize-none interactive" placeholder="Enter parameters here..."></textarea>
              </div>
              <button type="submit" disabled={status === "sending"} className="mt-4 flex items-center justify-center gap-2 bg-accentRed text-marine font-display font-bold text-xl uppercase py-4 hover:bg-butter transition-colors interactive disabled:opacity-50">
                {status === "sending" ? "Encrypting & Sending..." : "Transmit Payload"} <Send className="w-5 h-5" />
              </button>
              {status === "error" && <p className="font-mono text-xs text-accentRed uppercase text-center mt-2">Transmission failed. Please verify network integrity.</p>}
            </form>
          )}
        </motion.div>
      </section>
    </main>
  );
}