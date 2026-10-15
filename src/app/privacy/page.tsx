import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/layout/LegalPage";
import { LEGAL_UPDATED, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy",
  description: `What ${site.name}'s website collects, why, who processes it, and your rights under the Philippine Data Privacy Act.`,
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacy"
      title={
        <>
          Your data, <em className="font-serif text-ember">plainly.</em>
        </>
      }
      lead="This site has no ads, no analytics and no tracking cookies. Here's exactly what it does collect, why, and what you can ask for."
      updated={LEGAL_UPDATED}
      sections={[
        {
          id: "who",
          title: "Who's responsible",
          body: (
            <p>
              This is the personal portfolio of <strong>{site.name}</strong>, based in {site.location}, {site.country}. He is the personal information controller for anything you send
              through it. Questions about your data go through the <Link href="/contact">contact page</Link>.
            </p>
          ),
        },
        {
          id: "collect",
          title: "What's collected, and why",
          body: (
            <>
              <p>
                <strong>Messages and booking requests.</strong> When you use the contact form you send your name, email, the topic and your message — and for photoshoots, the service,
                package, target date and (optionally) your phone number. It&apos;s used only to reply to you and to arrange the shoot. It is never added to a mailing list, sold or shared
                for marketing.
              </p>
              <p>
                <strong>NeilAI chats.</strong> When the AI assistant is switched on, what you type — with the last few messages and the page you&apos;re on — is sent to Google&apos;s
                Gemini API to write a reply. Please don&apos;t share passwords, IDs or other sensitive details in the chat. The conversation itself stays in your browser tab and is
                cleared when you close it or press ↺.
              </p>
              <p>
                <strong>Server logs.</strong> Like every website, the hosting provider receives your IP address and basic request details to deliver pages and keep the site secure. The
                forms use your IP address briefly, in memory, to stop spam floods.
              </p>
            </>
          ),
        },
        {
          id: "storage",
          title: "Cookies & browser storage",
          body: (
            <>
              <p>No tracking or advertising cookies are used. A few conveniences are saved only in your own browser (local or session storage), never sent to a server:</p>
              <ul>
                <li>your NeilAI conversation for the current tab,</li>
                <li>your preferred layout on the Work page,</li>
                <li>best times and scores in the games,</li>
                <li>whether NeilAI has already said hello this visit.</li>
              </ul>
              <p>Clearing your browser&apos;s site data removes all of it.</p>
            </>
          ),
        },
        {
          id: "processors",
          title: "Services that process data",
          body: (
            <ul>
              <li>
                <strong>Vercel</strong> — hosts the website.
              </li>
              <li>
                <strong>Resend</strong> — delivers contact and booking emails to Neil&apos;s inbox, and booking confirmations to you.
              </li>
              <li>
                <strong>Google (Gemini API)</strong> — writes NeilAI&apos;s replies when the AI is on.
              </li>
              <li>
                <strong>YouTube and Facebook</strong> — video players load only after you press play, using YouTube&apos;s privacy-enhanced mode. Once loaded, their own policies apply.
              </li>
              <li>
                <strong>GitHub</strong> — public contribution data is read on the server for the activity graph; your browser never contacts GitHub for it.
              </li>
            </ul>
          ),
        },
        {
          id: "retention",
          title: "How long it's kept",
          body: (
            <p>
              Messages and booking details stay in Neil&apos;s email for as long as they&apos;re needed to answer you, carry out a booking and keep a reasonable record of it. Ask any time
              and they&apos;ll be deleted, unless a record has to be kept for an unfinished booking or payment.
            </p>
          ),
        },
        {
          id: "rights",
          title: "Your rights",
          body: (
            <>
              <p>
                Under the <strong>Data Privacy Act of 2012 (Republic Act No. 10173)</strong> you have the right to be informed, to access your data, to object, to have it corrected,
                erased or blocked, to data portability, and to be compensated for damages from inaccurate or unlawfully obtained data.
              </p>
              <p>
                To use any of these, write through the <Link href="/contact">contact page</Link>. If you&apos;re not satisfied with the response, you can complain to the{" "}
                <a href="https://privacy.gov.ph" target="_blank" rel="noopener noreferrer">
                  National Privacy Commission
                </a>
                .
              </p>
            </>
          ),
        },
        {
          id: "security",
          title: "Security",
          body: (
            <p>
              The site is served only over HTTPS with security headers that block clickjacking and content sniffing. Forms are validated on the server, rate-limited and protected against bots, and booking links sent to Neil
              are cryptographically signed so they can&apos;t be forged. Found a security issue? Please report it through the <Link href="/contact">contact page</Link>.
            </p>
          ),
        },
        {
          id: "changes",
          title: "Changes to this policy",
          body: <p>If what the site collects changes, this page is updated first and the date at the top changes with it.</p>,
        },
      ]}
    />
  );
}
