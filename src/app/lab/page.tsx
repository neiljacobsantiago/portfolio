import type { Metadata } from "next";
import Link from "next/link";
import AskNeilButton from "@/components/chat/AskNeilButton";
import PageHeader, { Container } from "@/components/layout/PageHeader";
import ToolView from "@/components/tools/ToolView";
import { toolHref, tools } from "@/lib/tools";
import { reveal } from "@/lib/reveal";

export const metadata: Metadata = {
  title: "The Lab",
  description:
    "Small working tools grown from Neil Jacob Santiago's projects: a PathoScan confidence check, a subnet & VLAN planner, a memory allocation visualizer, a phishing link checker, in-browser Whisper speech-to-text transcription and a photoshoot quote.",
};

const ASK: Record<string, string> = {
  pathoscan: "How does PathoScan decide if a result is cleared?",
  subnet: "Plan subnets for 60, 25 and 12 hosts from 192.168.20.0/24",
  memory: "Compare best fit and worst fit for blocks 100, 500, 200, 300, 600 and processes 212, 417, 112, 426",
  link: "Is http://gcash-verify-account.xyz/otp safe?",
  quote: "How much is a graduation shoot for 4 friends?",
};

export default function LabPage() {
  return (
    <>
      <PageHeader
        eyebrow="The Lab"
        title={
          <>
            Small tools, <em className="font-serif text-ember">real projects.</em>
          </>
        }
        lead="Every project leaves something useful behind. These are working pieces of them — play with the maths, the logic and the rules, no sign-up needed. NeilAI can run every one of them for you too."
        aside={
          <nav aria-label="Tools" className="flex flex-wrap gap-2 md:flex-col md:items-start">
            {tools.map((t, i) => (
              <a key={t.id} href={`#${t.id}`} className="label ulink text-[0.62rem] text-ink/65 hover:text-ink">
                {String(i + 1).padStart(2, "0")} · {t.title}
              </a>
            ))}
          </nav>
        }
      />

      <Container className="space-y-24 pb-24 md:space-y-32 md:pb-32">
        {tools.map((t, i) => (
          <section key={t.id} id={t.id} aria-labelledby={`${t.id}-title`} className="grid scroll-mt-28 gap-8 border-t border-ink/15 pt-10 md:grid-cols-12 md:gap-12">
            <div className="min-w-0 md:col-span-4">
              <div className="md:sticky md:top-28">
                <p className="font-display text-6xl leading-none text-ember/30">{String(i + 1).padStart(2, "0")}</p>
                <h2 id={`${t.id}-title`} className="mt-3 font-display text-[clamp(2rem,4vw,3rem)] leading-[1.05]">
                  {t.title}
                </h2>
                <p className="mt-4 font-serif text-xl leading-relaxed text-ink/75">{t.blurb}</p>
                <p className="label mt-6 text-[0.6rem] text-ink/50">
                  From{" "}
                  <Link href={toolHref(t)} className="ulink text-ember hover:text-ink">
                    {t.project.title} →
                  </Link>
                </p>
                {ASK[t.id] && (
                  <AskNeilButton className="mt-6" prompt={ASK[t.id]}>
                    Ask NeilAI to try it
                  </AskNeilButton>
                )}
              </div>
            </div>
            <div {...reveal("up")} className="min-w-0 rounded-[2px] bg-paper/70 p-5 shadow-[0_30px_80px_-40px_rgb(0_48_73/0.45)] ring-1 ring-ink/10 md:col-span-8 md:p-8">
              <ToolView id={t.id} />
            </div>
          </section>
        ))}
      </Container>
    </>
  );
}
