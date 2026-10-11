import type { Metadata } from "next";
import Link from "next/link";
import PageHeader, { Container } from "@/components/layout/PageHeader";
import { projects } from "@/content/work";
import { reveal } from "@/lib/reveal";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Work",
  description: "Network architecture, security auditing, machine learning and forensics projects by Neil Jacob Santiago.",
};

export default function WorkPage() {
  return (
    <>
      <PageHeader
        eyebrow="Selected work"
        title={<>Systems, <em className="font-serif text-ember">quietly</em> engineered.</>}
        lead="Networks you never notice because they simply work, and the security testing that keeps them that way. Each project comes with a one-line version for the non-engineers."
        aside={
          <p className="label leading-loose text-ink/60">
            {projects.length} projects
            <br />
            Networks · Security · ML · Forensics
          </p>
        }
      />

      <Container className="pb-24 md:pb-32">
        <ol className="border-t border-ink/15">
          {projects.map((p, i) => (
            <li key={p.slug} id={p.slug} {...reveal("up", (i % 2) * 80)} className="scroll-mt-28 border-b border-ink/15 py-12 md:py-16">
              <article className="grid gap-8 md:grid-cols-12">
                <span className="font-display text-5xl leading-none text-ember md:col-span-2 md:text-7xl">{p.index}</span>
                <div className="md:col-span-6">
                  <h2 className="font-display text-3xl leading-tight md:text-5xl">{p.title}</h2>
                  <p className="mt-5 border-l-2 border-ember pl-4 font-serif text-xl leading-snug italic md:text-2xl">{p.plain}</p>
                  <p className="mt-6 max-w-2xl font-serif text-lg leading-relaxed text-ink/80">{p.description}</p>
                </div>
                <dl className="space-y-6 md:col-span-4 md:pl-8">
                  <div>
                    <dt className="label mb-2 text-ink/50">Toolkit</dt>
                    <dd className="flex flex-wrap gap-2">
                      {p.tools.map((t) => (
                        <span key={t} className="label rounded-full border border-ink/20 px-3 py-1.5 text-[0.65rem]">{t}</span>
                      ))}
                    </dd>
                  </div>
                  <div>
                    <dt className="label mb-2 text-ink/50">Status</dt>
                    <dd className="font-serif text-lg">{p.outcome}</dd>
                  </div>
                </dl>
              </article>
            </li>
          ))}
        </ol>

        <div className="mt-20 grid gap-8 rounded-[2px] bg-ink p-8 text-paper md:grid-cols-12 md:p-14">
          <h2 className="font-display text-4xl leading-tight md:col-span-7 md:text-5xl">
            Need a network planned, audited or a site built? <em className="font-serif text-sky">Let&apos;s scope it.</em>
          </h2>
          <div className="flex flex-col justify-end gap-4 md:col-span-5 md:items-end">
            <p className="font-serif text-lg text-paper/75">Freelance projects start at {site.rate}.</p>
            <Link href="/contact" className="label rounded-full bg-paper px-7 py-4 text-ink transition-colors hover:bg-sky">
              Start a project
            </Link>
          </div>
        </div>
      </Container>
    </>
  );
}
