import { NextResponse } from "next/server";
import { clientKey, rateLimit } from "@/lib/rate-limit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const LIMITS = { email: 254, subject: 150, message: 5000 };

function field(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/**
 * Delivers through Resend's HTTP API when RESEND_API_KEY and CONTACT_TO_EMAIL
 * are set. Without them (e.g. local dev) the message is only logged.
 */
async function deliver(email: string, subject: string, message: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  if (!apiKey || !to) {
    console.info(`[contact] (no mail provider configured) from=${email} subject="${subject}" length=${message.length}`);
    return true;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.CONTACT_FROM_EMAIL || "Portfolio <onboarding@resend.dev>",
      to: [to],
      reply_to: email,
      subject: `[Portfolio] ${subject}`,
      text: `From: ${email}\n\n${message}`,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) console.error("[contact] Resend rejected the message", res.status, await res.text().catch(() => ""));
  return res.ok;
}

export async function POST(req: Request) {
  if (!rateLimit(clientKey(req, "contact"), 5, 10 * 60_000)) {
    return NextResponse.json({ error: "Too many transmissions. Try again later." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed payload." }, { status: 400 });
  }

  // Honeypot: real visitors never see or fill this field.
  if (field(body.company, 100)) return NextResponse.json({ success: true });

  const email = field(body.email, LIMITS.email);
  const subject = field(body.subject, LIMITS.subject) || "Project inquiry";
  const message = field(body.message, LIMITS.message);

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
  }
  if (message.length < 10) {
    return NextResponse.json({ error: "Message is too short (10 characters minimum)." }, { status: 400 });
  }

  try {
    const ok = await deliver(email, subject, message);
    if (!ok) return NextResponse.json({ error: "Mail relay rejected the transmission." }, { status: 502 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[contact] delivery failed", error);
    return NextResponse.json({ error: "Transmission failed due to a server error." }, { status: 500 });
  }
}
