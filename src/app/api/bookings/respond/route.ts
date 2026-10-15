import { NextResponse } from "next/server";
import { resolveBooking } from "@/lib/booking-claim";
import { verifyBooking } from "@/lib/booking-token";
import { bookingAnswerEmail, mailConfig, sendMail, type AnswerDetails, type BookingAnswer } from "@/lib/mail";
import { clientKey, rateLimit } from "@/lib/rate-limit";

const ACTIONS: BookingAnswer[] = ["confirm", "reschedule", "decline"];
const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/**
 * Sends Neil's answer (confirm / suggest a date / decline) to the client.
 * Only works with a valid signed link from his booking email, and only ever
 * emails the address inside that link.
 */
export async function POST(req: Request) {
  if (!rateLimit(clientKey(req, "booking-answer"), 10, 10 * 60_000)) {
    return NextResponse.json({ error: "Too many sends in a row. Try again in a few minutes." }, { status: 429 });
  }
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const claim = verifyBooking(text(body.t, 4000));
  const booking = claim && resolveBooking(claim);
  if (!booking) return NextResponse.json({ error: "This booking link has expired or isn't valid." }, { status: 403 });
  // Each booking link can send a handful of emails, never an unlimited stream.
  if (!rateLimit(`booking-token:${text(body.t, 4000).slice(-24)}`, 5, 24 * 60 * 60_000)) {
    return NextResponse.json({ error: "This booking has already been answered several times today." }, { status: 429 });
  }

  const action = ACTIONS.find((a) => a === body.action);
  if (!action) return NextResponse.json({ error: "Choose confirm, suggest a date or decline." }, { status: 400 });
  const d = (body.details ?? {}) as Record<string, unknown>;
  const details: AnswerDetails = { time: text(d.time, 80), location: text(d.location, 200), payment: text(d.payment, 600), newDates: text(d.newDates, 200), note: text(d.note, 2000) };

  const { apiKey, to: owner, confirmations } = mailConfig();
  if (!apiKey || !owner || !confirmations) {
    return NextResponse.json({ error: "Sending to clients needs a verified domain in Resend (CONTACT_FROM_EMAIL). Use “Send from Gmail” for now." }, { status: 409 });
  }

  const mail = bookingAnswerEmail(booking, action, details);
  try {
    const ok = await sendMail({ to: booking.email, replyTo: owner, ...mail });
    if (!ok) return NextResponse.json({ error: "The mail service didn't accept that. Try again, or send from Gmail." }, { status: 502 });
    // A copy for Neil's records.
    await sendMail({ to: owner, replyTo: booking.email, subject: `Sent to ${booking.name || booking.email}: ${mail.subject}`, html: mail.html, text: mail.text }).catch(() => false);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[booking-answer] failed", error);
    return NextResponse.json({ error: "Something went wrong sending that." }, { status: 500 });
  }
}
