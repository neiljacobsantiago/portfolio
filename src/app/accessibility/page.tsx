import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/layout/LegalPage";
import { LEGAL_UPDATED, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Accessibility",
  description: `How ${site.name}'s website is built to work with keyboards, screen readers, reduced motion and low-power phones.`,
};

export default function AccessibilityPage() {
  return (
    <LegalPage
      eyebrow="Accessibility"
      title={
        <>
          Built for <em className="font-serif text-ember">everyone.</em>
        </>
      }
      lead="The animations are part of the fun, but none of them should stand between anyone and the content."
      updated={LEGAL_UPDATED}
      sections={[
        {
          id: "aim",
          title: "The aim",
          body: <p>The site aims to meet the Web Content Accessibility Guidelines (WCAG) 2.2 at level AA, and is tested on desktop and at small phone sizes.</p>,
        },
        {
          id: "what",
          title: "What's in place",
          body: (
            <ul>
              <li>Every page works with a keyboard alone, with a &ldquo;Skip to content&rdquo; link and visible focus outlines.</li>
              <li>Photographs have descriptive text, and decorative graphics are hidden from screen readers.</li>
              <li>If your device asks for reduced motion, scroll scenes, page transitions and moving strips are switched off or made still.</li>
              <li>On budget phones and slow connections, heavy effects are skipped automatically and images are served in small, modern formats.</li>
              <li>Videos only load when you choose to play them.</li>
              <li>Search everything with Ctrl/⌘ K, and NeilAI can answer questions in everyday language.</li>
            </ul>
          ),
        },
        {
          id: "limits",
          title: "Known limits",
          body: (
            <ul>
              <li>Bay Street Circuit is a 3D game and needs WebGL 2 plus a keyboard, mouse or touch screen. If it can&apos;t run, the project pavilions from its paddock are listed as plain links instead, and all of it is on the regular pages.</li>
              <li>The Shutter game relies on timing and visuals; it&apos;s an extra, not a way to reach any content.</li>
              <li>Videos hosted on YouTube and Facebook use those players&apos; own captions and controls.</li>
            </ul>
          ),
        },
        {
          id: "feedback",
          title: "Tell Neil",
          body: (
            <p>
              Ran into a barrier? Please describe it through the <Link href="/contact">contact page</Link> — what you were trying to do and which device or assistive technology you use — and
              it will be fixed or the content sent to you another way.
            </p>
          ),
        },
      ]}
    />
  );
}
