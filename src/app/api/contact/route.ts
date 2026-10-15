import { NextResponse } from "next/server";
import { services } from "@/content/sessions";
import { mailConfig, ownerEmail, senderEmail, sendMail, type Inquiry } from "@/lib/mail";
import { signBooking } from "@/lib/booking-token";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { siteUrl } from "@/lib/site";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const LIMITS = { name: 80, email: 254, topic: 60, phone: 20, message: 5000 };

/** A single-line field: whitespace (including newlines) collapsed. */
function field(value: unknown, max: number) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

/** Free text that keeps its line breaks. */
function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** Quick self-check for deployments: open /api/contact to see whether email is wired up. */
export function GET() {
  const { apiKey, to, confirmations } = mailConfig();
  return NextResponse.json({ email: Boolean(apiKey && to), confirmations: Boolean(apiKey && to && confirmations) });
}

export async function POST(req: Request) {
  if (!rateLimit(clientKey(req, "contact"), 5, 10 * 60_000)) {
    return NextResponse.json({ error: "Too many messages in a row. Please try again in a few minutes." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  // Honeypot: real visitors never see or fill this field.
  if (field(body.company, 100)) return NextResponse.json({ success: true });

  const inquiry: Inquiry = {
    name: field(body.name, LIMITS.name),
    email: field(body.email, LIMITS.email),
    topic: field(body.topic, LIMITS.topic) || "Project inquiry",
    message: text(body.message, LIMITS.message),
  };

  if (!EMAIL_RE.test(inquiry.email)) {
    return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
  }
  if (inquiry.message.length < 10) {
    return NextResponse.json({ error: "Message is too short (10 characters minimum)." }, { status: 400 });
  }

  // Bookings carry ids; names and prices come from our own list, never the client.
  if (body.booking && typeof body.booking === "object") {
    const b = body.booking as Record<string, unknown>;
    const service = services.find((s) => s.id === b.service);
    const pkg = service?.packages.find((p) => p.id === b.package);
    const date = field(b.date, 10);
    if (!service || !pkg) return NextResponse.json({ error: "Please choose a service and a package." }, { status: 400 });
    if (!DATE_RE.test(date)) return NextResponse.json({ error: "Please pick a target date." }, { status: 400 });
    if (!inquiry.name) return NextResponse.json({ error: "Please add your name so I know who's booking." }, { status: 400 });
    inquiry.booking = { service, pkg, date, phone: field(b.phone, LIMITS.phone) };
  }

  const { apiKey, to, confirmations } = mailConfig();
  if (!apiKey || !to) {
    // Local dev: print the email instead of sending it. A live site must never
    // pretend a message was delivered when nothing is connected.
    if (process.env.NODE_ENV !== "production") {
      const mail = ownerEmail(inquiry);
      console.info(`[contact] email not configured — would send:\n${mail.subject}\n\n${mail.text}`);
      return NextResponse.json({ success: true });
    }
    console.error("[contact] RESEND_API_KEY / CONTACT_TO_EMAIL are not set");
    return NextResponse.json({ error: "The inbox isn't connected yet. Please reach Neil on Instagram or Facebook for now." }, { status: 503 });
  }

  try {
    // Bookings get signed one-click links so Neil can answer the client from the site.
    const b = inquiry.booking;
    const token = b ? signBooking({ name: inquiry.name, email: inquiry.email, service: b.service.id, pkg: b.pkg.id, date: b.date, phone: b.phone, message: inquiry.message }) : null;
    const link = (a: string) => `${siteUrl()}/bookings/respond?a=${a}&t=${token}`;
    const respond = token ? { confirm: link("confirm"), reschedule: link("reschedule"), decline: link("decline") } : undefined;
    const ok = await sendMail({ to, replyTo: inquiry.email, ...ownerEmail(inquiry, respond) });
    if (!ok) return NextResponse.json({ error: "The mail service didn't accept that. Please try again." }, { status: 502 });
    // Confirmation to the sender is a courtesy; its failure never fails the request.
    if (confirmations) await sendMail({ to: inquiry.email, replyTo: to, ...senderEmail(inquiry) }).catch(() => false);
    return NextResponse.json({ success: true, confirmation: confirmations });
  } catch (error) {
    console.error("[contact] delivery failed", error);
    return NextResponse.json({ error: "Something went wrong sending that. Please try again." }, { status: 500 });
  }
}
