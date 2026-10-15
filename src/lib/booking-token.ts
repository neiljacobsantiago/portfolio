import { createHash, createHmac, timingSafeEqual } from "node:crypto";

// Booking links in Neil's email ("Confirm", "Suggest another date", "Decline")
// carry the booking itself, signed with HMAC-SHA256. No database needed, and
// nobody can forge a link to email an arbitrary address from the site.
//
// Secret: BOOKING_SECRET if set, otherwise derived from RESEND_API_KEY
// (rotating either one invalidates old links).

export interface BookingClaim {
  name: string;
  email: string;
  service: string; // service id
  pkg: string; // package id
  date: string; // YYYY-MM-DD
  phone: string;
  message: string;
  /** Issued at (ms since epoch) */
  iat: number;
}

const MAX_AGE_MS = 60 * 24 * 60 * 60 * 1000; // 60 days

function secret(): Buffer | null {
  if (process.env.BOOKING_SECRET) return Buffer.from(process.env.BOOKING_SECRET);
  if (process.env.RESEND_API_KEY) return createHash("sha256").update(`booking-links:${process.env.RESEND_API_KEY}`).digest();
  return null;
}

const b64 = (b: Buffer | string) => Buffer.from(b).toString("base64url");
const sign = (body: string, key: Buffer) => createHmac("sha256", key).update(body).digest();

export function signBooking(claim: Omit<BookingClaim, "iat">): string | null {
  const key = secret();
  if (!key) return null;
  const body = b64(JSON.stringify({ ...claim, message: claim.message.slice(0, 600), iat: Date.now() }));
  return `${body}.${b64(sign(body, key))}`;
}

export function verifyBooking(token: string | null | undefined): BookingClaim | null {
  const key = secret();
  if (!key || !token || token.length > 4000) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = sign(body, key);
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const claim = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as BookingClaim;
    if (typeof claim.email !== "string" || typeof claim.iat !== "number" || Date.now() - claim.iat > MAX_AGE_MS) return null;
    return claim;
  } catch {
    return null;
  }
}
