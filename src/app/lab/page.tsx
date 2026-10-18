import type { Metadata } from "next";
import Link from "next/link";
import AskNeilButton from "@/components/chat/AskNeilButton";
import PageHeader, { Container } from "@/components/layout/PageHeader";
import ToolView from "@/components/tools/ToolView";
import Icon from "@/components/ui/Icon";
import { TOOL_KINDS, toolHref, tools, type ToolKind } from "@/lib/tools";
import { reveal } from "@/lib/reveal";
import LabNav from "./LabNav";

export const metadata: Metadata = {
  title: "The Lab",
  description:
    "Small working tools grown from Neil Jacob Santiago's projects: a pocket banking ledger, a PC parts compatibility check, a parking desk, a conference check-in desk, a Laravel API playground, PathoScan's confidence threshold, in-browser Whisper transcription, a subnet & VLAN planner, a memory allocation visualizer, a phishing link check and a photoshoot quote.",
};

const ASK: Record<string, string> = {
  pathoscan: "What does PathoScan's 90% threshold mean?",
  subnet: "Plan subnets for 60, 25 and 12 hosts from 192.168.20.0/24",
  memory: "Compare best fit and worst fit for blocks 100, 500, 200, 300, 600 and processes 212, 417, 112, 426",
  link: "Is http://gcash-verify-account.xyz/otp safe?",
  quote: "How much is a graduation shoot for 4 friends?",
};

const ANCHOR: Record<ToolKind, string> = { web: "web-and-data", ai: "applied-ai", systems: "systems-and-security", media: "photography-and-media" };

// Tools in page order (grouped), each with its running number.
const groups = TOOL_KINDS.map((k) => ({ ...k, anchor: ANCHOR[k.id], items: tools.filter((t) => t.kind === k.id) })).filter((g) => g.items.length);
const numbered = new Map(groups.flatMap((g) => g.items).map((t, i) => [t.id, String(i + 1).padStart(2, "0")]));

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
        lead="Every project leaves something useful behind. These are working pieces of them: the rules, the maths and the edge cases, ready to poke at. No sign-up, nothing leaves your browser, and the sample data is made up."
        aside={
          <dl className="grid grid-cols-3 gap-4">
            {[
              [String(tools.length), "working tools"],
              [String(groups.length), "kinds"],
              ["0", "sign-ups"],
            ].map(([n, l]) => (
              <div key={l}>
                <dt className="sr-only">{l}</dt>
                <dd className="font-display text-4xl leading-none md:text-5xl">{n}</dd>
                <dd className="label mt-1.5 text-[0.55rem] text-ink/55">{l}</dd>
              </div>
            ))}
          </dl>
        }
      />

      <Container className="pb-24 md:pb-32">
        {/* Table of contents: every tool at a glance on wider screens */}
        <div className="mb-10 hidden gap-px overflow-hidden rounded-[2px] bg-ink/10 ring-1 ring-ink/10 md:grid md:grid-cols-2 xl:grid-cols-4">
          {groups.map((g) => (
            <div key={g.id} className="bg-paper p-5">
              <a href={`#${g.anchor}`} className="label ulink text-[0.6rem] text-ember">
                {g.label}
              </a>
              <ol className="mt-3 space-y-1.5">
                {g.items.map((t) => (
                  <li key={t.id}>
                    <a href={`#${t.id}`} className="group flex gap-2.5 font-serif text-[0.95rem] leading-snug text-ink/75 hover:text-ink">
                      <span className="font-mono text-[0.62rem] leading-[1.5rem] text-ink/35 group-hover:text-ember">{numbered.get(t.id)}</span>
                      {t.title}
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>

        <LabNav groups={groups.map((g) => ({ anchor: g.anchor, label: g.label, count: g.items.length }))} />

        {groups.map((g) => (
          <section key={g.id} id={g.anchor} aria-labelledby={`${g.anchor}-title`} className="scroll-mt-8 pt-14 md:scroll-mt-12 md:pt-20">
            <header className="mb-2 flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
              <div>
                <h2 id={`${g.anchor}-title`} className="font-display text-[clamp(2.2rem,6vw,4.5rem)] leading-[0.95] text-wine">
                  {g.label}
                </h2>
                <p className="mt-3 max-w-xl font-serif text-lg leading-snug text-ink/65">{g.blurb}</p>
              </div>
              {g.items.length > 1 && (
                <ul className="flex flex-wrap gap-1.5 md:hidden">
                  {g.items.map((t) => (
                    <li key={t.id}>
                      <a href={`#${t.id}`} className="label inline-block rounded-full border border-ink/15 px-3 py-1.5 text-[0.52rem] text-ink/65">
                        {numbered.get(t.id)} · {t.title}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </header>

            {g.items.map((t) => (
              <article
                key={t.id}
                id={t.id}
                aria-labelledby={`${t.id}-title`}
                className="grid scroll-mt-8 gap-6 border-t border-ink/15 pt-8 pb-16 first-of-type:mt-8 md:scroll-mt-12 md:pb-24 lg:grid-cols-12 lg:gap-12 lg:pt-10"
              >
                <div className="min-w-0 lg:col-span-4">
                  <div className="lg:sticky lg:top-40">
                    <p className="font-display text-5xl leading-none text-ember/30 lg:text-6xl">{numbered.get(t.id)}</p>
                    <h3 id={`${t.id}-title`} className="mt-3 font-display text-[clamp(1.9rem,4vw,3rem)] leading-[1.05]">
                      {t.title}
                    </h3>
                    <p className="mt-3 max-w-2xl font-serif text-lg leading-relaxed text-ink/75 lg:mt-4 lg:text-xl">{t.blurb}</p>
                    <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-4 lg:mt-6">
                      <p className="label text-[0.6rem] text-ink/50">
                        From{" "}
                        <Link href={toolHref(t)} className="ulink inline-flex items-center gap-1 text-ember hover:text-ink">
                          {t.project.title} <Icon name="arrow-right" />
                        </Link>
                      </p>
                      {ASK[t.id] && (
                        <AskNeilButton prompt={ASK[t.id]}>
                          Ask NeilAI to try it
                        </AskNeilButton>
                      )}
                    </div>
                  </div>
                </div>
                <div {...reveal("up")} className="min-w-0 rounded-[2px] bg-paper/70 p-4 shadow-[0_30px_80px_-40px_rgb(0_48_73/0.45)] ring-1 ring-ink/10 sm:p-6 lg:col-span-8 lg:p-8">
                  <ToolView id={t.id} />
                </div>
              </article>
            ))}
          </section>
        ))}
      </Container>
    </>
  );
}
