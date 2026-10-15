import { bookingTerms, type Package, type Service } from "@/content/sessions";
import { site } from "@/lib/site";

// Contact-form email: what Neil receives, and the optional confirmation the
// sender gets. Sent through Resend's HTTP API (https://resend.com).
//
//   RESEND_API_KEY      required to send anything
//   CONTACT_TO_EMAIL    Neil's inbox (with Resend's test sender this must be
//                       the email the Resend account was created with)
//   CONTACT_FROM_EMAIL  optional sender on a domain verified in Resend; when
//                       set, senders also get a confirmation email

export interface Inquiry {
  name: string;
  email: string;
  topic: string;
  message: string;
  booking?: { service: Service; pkg: Package; date: string; phone: string };
}

export const mailConfig = () => ({
  apiKey: process.env.RESEND_API_KEY,
  to: process.env.CONTACT_TO_EMAIL,
  from: process.env.CONTACT_FROM_EMAIL || "Portfolio <onboarding@resend.dev>",
  /** Confirmations need a verified domain; Resend's test sender can only mail the account owner. */
  confirmations: Boolean(process.env.CONTACT_FROM_EMAIL),
});

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const prettyDate = (iso: string) =>
  new Intl.DateTimeFormat("en-PH", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));

function rows(inq: Inquiry): [string, string][] {
  const b = inq.booking;
  return [
    ["Name", inq.name || "—"],
    ["Email", inq.email],
    ...(b
      ? ([
          ["Service", b.service.name],
          ["Package", `${b.pkg.name} — ${b.pkg.price}`],
          ["Includes", b.pkg.detail],
          ["Target date", prettyDate(b.date)],
          ["Phone", b.phone || "—"],
          ["Agreed to", "30% non-refundable downpayment · no RAW files"],
        ] as [string, string][])
      : ([["Topic", inq.topic]] as [string, string][])),
  ];
}

/** Email layout shared by both messages: paper background, ink type, ember accent. */
type Action = { label: string; href: string; tone: "ember" | "ink" | "ghost" };

function buttons(actions: Action[]) {
  if (!actions.length) return "";
  const style = { ember: "background:#c1121f;color:#fdf0d5", ink: "background:#003049;color:#fdf0d5", ghost: "background:transparent;color:#003049;border:1px solid #00304955" };
  // Inline blocks rather than a table row, so the buttons wrap on phone mail apps.
  return `<div style="margin:0 0 16px">${actions
    .map((a) => `<a href="${esc(a.href)}" style="display:inline-block;margin:0 8px 8px 0;padding:12px 18px;border-radius:999px;${style[a.tone]};font:600 12px/1 'Courier New',monospace;letter-spacing:.12em;text-transform:uppercase;text-decoration:none">${esc(a.label)}</a>`)
    .join("")}</div>`;
}

function layout(heading: string, intro: string, table: [string, string][], note: string, footer: string, actions: Action[] = []) {
  const tr = table
    .map(
      ([k, v]) =>
        `<tr><td style="padding:10px 16px 10px 0;color:#669bbc;font:600 11px/1.4 'Courier New',monospace;letter-spacing:.12em;text-transform:uppercase;vertical-align:top;white-space:nowrap">${esc(k)}</td><td style="padding:10px 0;color:#003049;font:17px/1.45 Georgia,serif">${esc(v)}</td></tr>`,
    )
    .join("");
  return `<!doctype html><html><body style="margin:0;background:#fdf0d5;padding:32px 16px">
<div style="max-width:560px;margin:0 auto;background:#fffaf0;border:1px solid #00304922;border-top:4px solid #c1121f;padding:32px">
<p style="margin:0 0 6px;color:#c1121f;font:600 11px/1 'Courier New',monospace;letter-spacing:.16em;text-transform:uppercase">${esc(site.name)}</p>
<h1 style="margin:0 0 12px;color:#003049;font:400 30px/1.15 Georgia,serif">${esc(heading)}</h1>
<p style="margin:0 0 24px;color:#003049cc;font:italic 17px/1.5 Georgia,serif">${esc(intro)}</p>
${buttons(actions)}
<table style="width:100%;border-collapse:collapse;border-top:1px solid #00304922;border-bottom:1px solid #00304922">${tr}</table>
${note ? `<div style="margin:24px 0 0;padding:16px;background:#fdf0d5;color:#003049;font:16px/1.6 Georgia,serif;white-space:pre-wrap">${esc(note)}</div>` : ""}
<p style="margin:24px 0 0;color:#00304999;font:13px/1.5 Georgia,serif">${esc(footer)}</p>
</div></body></html>`;
}

const plain = (heading: string, table: [string, string][], note: string) => `${heading}\n\n${table.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\n${note}\n`;

/** What Neil receives. Bookings come with one-click links to answer the client. */
export function ownerEmail(inq: Inquiry, respond?: { confirm: string; reschedule: string; decline: string }) {
  const b = inq.booking;
  const who = inq.name || inq.email;
  const subject = b ? `📸 Booking request: ${b.pkg.name} (${b.service.name}) — ${who}` : `✉️ ${inq.topic} — ${who}`;
  const heading = b ? "New booking request" : "New message";
  const intro = b ? `${who} wants to book ${b.service.name} for ${prettyDate(b.date)}.` : `${who} wrote in about ${inq.topic.toLowerCase()}.`;
  const table = rows(inq);
  const note = inq.message;
  const actions: Action[] = respond
    ? [
        { label: "✓ Confirm booking", href: respond.confirm, tone: "ember" },
        { label: "Suggest a date", href: respond.reschedule, tone: "ink" },
        { label: "Decline", href: respond.decline, tone: "ghost" },
      ]
    : [];
  const footer = respond
    ? "The buttons open a page where you add details (time, place, payment) and send the client their confirmation. Or just hit reply to write to them directly."
    : "Hit reply to answer them directly. Sent from the contact form on your portfolio.";
  const links = respond ? `\n\nConfirm: ${respond.confirm}\nSuggest a date: ${respond.reschedule}\nDecline: ${respond.decline}\n` : "";
  return { subject, html: layout(heading, intro, table, note, footer, actions), text: plain(heading, table, note) + links };
}

export function senderEmail(inq: Inquiry) {
  const b = inq.booking;
  const first = inq.name.split(" ")[0] || "there";
  const subject = b ? `Your booking request — ${b.pkg.name} (${b.service.name})` : `Thanks for reaching out, ${first}`;
  const heading = b ? `Got it, ${first}!` : `Thanks, ${first}!`;
  const intro = b
    ? "Your booking request is in. I'll confirm availability within 24 hours and send the downpayment details to lock in your date."
    : "Your message is in. I read every one myself and reply within 24 hours.";
  const table = b ? rows(inq).filter(([k]) => k !== "Email" && k !== "Agreed to") : [];
  const note = b ? bookingTerms.join("\n") : inq.message;
  const footer = `— ${site.firstName} · ${site.location}. This is an automatic confirmation; just reply if anything needs changing.`;
  return { subject, html: layout(heading, intro, table, note, footer), text: plain(heading, table, note) };
}

export async function sendMail(msg: { to: string; replyTo?: string; subject: string; html: string; text: string }) {
  const { apiKey, from } = mailConfig();
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [msg.to], reply_to: msg.replyTo, subject: msg.subject, html: msg.html, text: msg.text }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) console.error("[contact] Resend rejected the message", res.status, await res.text().catch(() => ""));
  return res.ok;
}

/* ── Neil's answer to a booking request, sent to the client ── */

export type BookingAnswer = "confirm" | "reschedule" | "decline";

export interface AnswerDetails {
  time?: string;
  location?: string;
  payment?: string;
  newDates?: string;
  note?: string;
}

export function bookingAnswerEmail(
  b: { name: string; service: Service; pkg: Package; date: string; downpayment: number | null },
  action: BookingAnswer,
  d: AnswerDetails,
) {
  const first = b.name.split(" ")[0] || "there";
  const when = prettyDate(b.date);
  const sign = `— ${site.firstName}`;
  const clean = (v?: string) => (v ?? "").trim();

  if (action === "confirm") {
    const table: [string, string][] = [
      ["Service", b.service.name],
      ["Package", `${b.pkg.name} — ${b.pkg.price}`],
      ["Includes", b.pkg.detail],
      ["Date", when],
      ...(clean(d.time) ? ([["Call time", clean(d.time)]] as [string, string][]) : []),
      ...(clean(d.location) ? ([["Location", clean(d.location)]] as [string, string][]) : []),
      ["Downpayment", b.downpayment ? `₱${b.downpayment.toLocaleString("en-PH")} (30%) to lock the date` : "30% of the total to lock the date"],
    ];
    const note = [clean(d.payment) && `How to pay the downpayment:\n${clean(d.payment)}`, clean(d.note), bookingTerms.join("\n")].filter(Boolean).join("\n\n");
    return {
      subject: `✅ Confirmed: your ${b.service.name} on ${when}`,
      html: layout(`You're booked, ${first}!`, `Your ${b.service.name.toLowerCase()} on ${when} is confirmed. Here are the details.`, table, note, `${sign} · Reply to this email if anything needs to change.`),
      text: plain(`You're booked, ${first}!`, table, note) + `\n${sign}\n`,
    };
  }

  if (action === "reschedule") {
    const table: [string, string][] = [
      ["Service", b.service.name],
      ["Package", `${b.pkg.name} — ${b.pkg.price}`],
      ["You asked for", when],
      ...(clean(d.newDates) ? ([["Available instead", clean(d.newDates)]] as [string, string][]) : []),
    ];
    const note = clean(d.note) || `${when} is already taken, but I'd love to do your shoot. Reply with the date that works best and I'll lock it in.`;
    return {
      subject: `📅 About your ${b.service.name} booking — can we pick another date?`,
      html: layout(`Can we move it, ${first}?`, `Thanks for booking! ${when} doesn't work on my side.`, table, note, `${sign} · Just reply to this email to choose a date.`),
      text: plain(`Can we move it, ${first}?`, table, note) + `\n${sign}\n`,
    };
  }

  const table: [string, string][] = [
    ["Service", b.service.name],
    ["Date requested", when],
  ];
  const note = clean(d.note) || "Thank you for thinking of me for your shoot. Unfortunately I can't take this booking, but I hope we get to work together another time.";
  return {
    subject: `About your ${b.service.name} booking request`,
    html: layout(`Thank you, ${first}`, `I'm sorry — I can't take your booking for ${when}.`, table, note, `${sign} · You can always reply to this email.`),
    text: plain(`Thank you, ${first}`, table, note) + `\n${sign}\n`,
  };
}
