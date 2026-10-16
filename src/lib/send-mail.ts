import nodemailer from "nodemailer";
import { site } from "@/lib/site";

// Sending email, server only. Two ways, picked by which variables are set:
//
// 1. Gmail (recommended, free, no domain needed): the site sends from Neil's
//    own Gmail with a Google App Password, so clients get the designed
//    emails straight from his address.
//      GMAIL_USER          the Gmail address, e.g. neil@gmail.com
//      GMAIL_APP_PASSWORD  16-character App Password (Google Account →
//                          Security → 2-Step Verification → App passwords)
//
// 2. Resend (https://resend.com):
//      RESEND_API_KEY      the API key
//      CONTACT_FROM_EMAIL  a sender on a domain verified in Resend; without it
//                          Resend's test sender can only mail Neil himself
//
//    CONTACT_TO_EMAIL      Neil's inbox (defaults to GMAIL_USER)

export function mailConfig() {
  const gmailUser = process.env.GMAIL_USER?.trim();
  const gmailPass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");
  const gmail = gmailUser && gmailPass ? { user: gmailUser, pass: gmailPass } : null;
  const resendKey = process.env.RESEND_API_KEY;
  return {
    gmail,
    resendKey,
    /** Can anything be sent at all? */
    ready: Boolean(gmail || resendKey),
    to: process.env.CONTACT_TO_EMAIL || gmailUser,
    /** Can the site email clients (confirmations, booking answers)? */
    confirmations: Boolean(gmail || (resendKey && process.env.CONTACT_FROM_EMAIL)),
    from: gmail ? `"${site.name}" <${gmail.user}>` : process.env.CONTACT_FROM_EMAIL || "Portfolio <onboarding@resend.dev>",
  };
}

type Message = { to: string; replyTo?: string; subject: string; html: string; text: string };

let transport: ReturnType<typeof nodemailer.createTransport> | null = null;

export async function sendMail(msg: Message) {
  const { gmail, resendKey, from } = mailConfig();
  if (gmail) {
    transport ??= nodemailer.createTransport({ service: "gmail", auth: gmail });
    try {
      await transport.sendMail({ from, to: msg.to, replyTo: msg.replyTo, subject: msg.subject, html: msg.html, text: msg.text });
      return true;
    } catch (error) {
      console.error("[mail] Gmail rejected the message", error);
      return false;
    }
  }
  if (!resendKey) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [msg.to], reply_to: msg.replyTo, subject: msg.subject, html: msg.html, text: msg.text }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) console.error("[mail] Resend rejected the message", res.status, await res.text().catch(() => ""));
  return res.ok;
}
