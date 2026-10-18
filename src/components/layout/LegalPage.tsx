import type { ReactNode } from "react";
import PageHeader, { Container } from "./PageHeader";

export interface LegalSection {
  id: string;
  title: string;
  body: ReactNode;
}

/** Shared layout for Privacy, Terms and Accessibility: contents rail + readable prose. */
export default function LegalPage({ eyebrow, title, lead, updated, sections }: { eyebrow: string; title: ReactNode; lead: ReactNode; updated: string; sections: LegalSection[] }) {
  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title} lead={lead} aside={<p className="label text-2xs text-ink/70">Last updated · {updated}</p>} />
      <Container className="grid gap-12 pb-24 md:grid-cols-12 md:pb-32">
        <nav aria-label="On this page" className="md:col-span-3">
          <div className="md:sticky md:top-28">
            <p className="label mb-4 text-2xs text-ink/70">On this page</p>
            <ol className="space-y-2 font-serif text-lg">
              {sections.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="ulink text-ink/70 hover:text-ink">
                    <span className="label mr-2 text-3xs text-ember">{String(i + 1).padStart(2, "0")}</span>
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </nav>
        <article className="min-w-0 space-y-14 md:col-span-8 md:col-start-5">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="scroll-mt-28">
              <h2 id={`${s.id}-h`} className="font-display text-3xl leading-tight md:text-4xl">
                <span className="label mr-3 align-middle text-2xs text-ember">{String(i + 1).padStart(2, "0")}</span>
                {s.title}
              </h2>
              <div className="mt-5 space-y-4 font-serif text-lg leading-relaxed text-ink/80 [&_a]:text-ember [&_a]:underline [&_a]:underline-offset-4 [&_li]:pl-1 [&_strong]:font-medium [&_strong]:text-ink [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6">
                {s.body}
              </div>
            </section>
          ))}
        </article>
      </Container>
    </>
  );
}
