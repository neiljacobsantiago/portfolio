import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/PageHeader";
import BookingResponder from "@/components/contact/BookingResponder";
import { resolveBooking } from "@/lib/booking-claim";
import { verifyBooking } from "@/lib/booking-token";
import { mailConfig } from "@/lib/mail";

export const metadata: Metadata = {
  title: "Answer a booking",
  robots: { index: false, follow: false },
};

type Search = Promise<{ t?: string; a?: string }>;

/** Opened from the buttons in Neil's booking email. */
export default async function RespondPage({ searchParams }: { searchParams: Search }) {
  const { t, a } = await searchParams;
  const claim = verifyBooking(t);
  const booking = claim && resolveBooking(claim);

  if (!booking || !t) {
    return (
      <Container className="flex min-h-[80svh] flex-col justify-center pt-32 pb-16">
        <p className="label text-ember">Booking link</p>
        <h1 className="mt-4 font-display text-5xl leading-tight">This link has expired or isn&apos;t valid.</h1>
        <p className="mt-4 max-w-lg font-serif text-xl text-ink/70">Booking links work for 60 days. You can still reply to the client straight from the booking email.</p>
        <Link href="/" className="btn mt-8 w-max bg-ink text-paper hover:bg-ember">
          Back home
        </Link>
      </Container>
    );
  }

  const { apiKey, to, confirmations } = mailConfig();
  const action = a === "reschedule" || a === "decline" ? a : "confirm";

  return (
    <Container className="pt-28 pb-24 md:pt-36">
      <BookingResponder token={t} booking={booking} initialAction={action} canSend={Boolean(apiKey && to && confirmations)} />
    </Container>
  );
}
