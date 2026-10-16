import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/layout/LegalPage";
import { bookingTerms, privateTerms } from "@/content/sessions";
import { LEGAL_UPDATED, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms",
  description: `Terms for using ${site.name}'s website, its tools and games, photography bookings, and the reuse of his photographs.`,
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Terms"
      title={
        <>
          The fine print, <em className="font-serif text-ember">kept short.</em>
        </>
      }
      lead="By using this site or booking a shoot through it, you agree to the terms below."
      updated={LEGAL_UPDATED}
      sections={[
        {
          id: "content",
          title: "Photos, writing & design",
          body: (
            <>
              <p>
                Unless stated otherwise, the photographs, text and design of this site are © {new Date().getFullYear()} {site.name}. All rights reserved. Please don&apos;t copy,
                repost, edit or use them commercially without written permission — just <Link href="/contact">ask</Link>, sharing a link to the page is always fine.
              </p>
              <p>
                Are you in one of the photos and want it taken down? Say so through the <Link href="/contact">contact page</Link> and it will be removed.
              </p>
            </>
          ),
        },
        {
          id: "projects",
          title: "Projects & credits",
          body: (
            <p>
              Many projects here were built by teams; Neil&apos;s role is stated on each page and teammates are credited by name. Names and logos of schools, organizations and agencies
              (such as CLSU, the ITSC and DA PhilMech) belong to their owners and appear only to describe the work. Private repositories stay private.
            </p>
          ),
        },
        {
          id: "tools",
          title: "Lab tools, games & NeilAI",
          body: (
            <ul>
              <li>The Lab tools and games are for learning and fun, provided as they are. Double-check subnet plans before using them on a real network.</li>
              <li>The link safety check only reads the address. It can miss a dangerous link and can&apos;t guarantee any link is safe.</li>
              <li>The PathoScan tool illustrates the system&apos;s decision rule with example numbers. It is not the trained model and not a diagnostic tool.</li>
              <li>NeilAI is an AI assistant and can be wrong. Treat its answers as a starting point, not professional advice; the project pages and Neil himself have the final word.</li>
            </ul>
          ),
        },
        {
          id: "bookings",
          title: "Photography bookings",
          body: (
            <>
              <ul>
                <li>Sending the booking form is a request, not a confirmed booking. A booking is confirmed only when Neil confirms it by email.</li>
                {bookingTerms.map((t) => (
                  <li key={t}>{t}</li>
                ))}
                <li>Prices are those listed on the site when you book. Packages marked &ldquo;Quote&rdquo; are priced case by case and agreed in writing before the shoot.</li>
              </ul>
              <p>
                <strong>Custom private shoots</strong> also come with these rules. The estimated total on the booking form includes the add-ons and extra people you choose; travel outside San
                Jose City is quoted separately.
              </p>
              <ul>
                {privateTerms.map((t) => (
                  <li key={t}>{t}</li>
                ))}
                <li>Your choice under &ldquo;After the shoot&rdquo; is respected. Photos marked private are never posted, and you can change your mind later by email.</li>
              </ul>
              <p>
                Anything not covered here — dates, locations, schedules and delivery — is agreed with Neil by email before the shoot. See the packages on the{" "}
                <Link href="/photography#sessions">photography page</Link>.
              </p>
            </>
          ),
        },
        {
          id: "freelance",
          title: "Web & network projects",
          body: (
            <p>
              Freelance web and network projects start at {site.rate}. Scope, timeline and price are agreed in writing before work begins; nothing on this site is a binding quote on its
              own.
            </p>
          ),
        },
        {
          id: "liability",
          title: "No warranties",
          body: (
            <p>
              The site and everything on it are provided &ldquo;as is&rdquo;. To the extent the law allows, {site.firstName} isn&apos;t liable for losses from using the site, its tools or
              linked third-party sites, which have their own terms.
            </p>
          ),
        },
        {
          id: "law",
          title: "Governing law & contact",
          body: (
            <p>
              These terms are governed by the laws of the Republic of the Philippines. Questions about them go through the <Link href="/contact">contact page</Link>. See also the{" "}
              <Link href="/privacy">privacy policy</Link>.
            </p>
          ),
        },
      ]}
    />
  );
}
