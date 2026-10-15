import type { Metadata } from "next";
import Link from "next/link";
import PageHeader, { Container } from "@/components/layout/PageHeader";
import CountUp from "@/components/ui/CountUp";
import Magnetic from "@/components/ui/Magnetic";
import Tilt from "@/components/ui/Tilt";
import ProjectCover from "@/components/work/ProjectCover";
import WorkFilter from "@/components/work/WorkFilter";
import WorkViews from "@/components/work/WorkViews";
import { categories, projects, type Category } from "@/content/work";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Work",
  description: "Network, security, web and media projects by Neil Jacob Santiago — from an offline AI pathogen classifier to concert coverage.",
};

export default function WorkPage() {
  const keys = Object.keys(categories) as Category[];
  const tabs = [
    { key: "all", label: "Everything", count: projects.length },
    ...keys.map((k) => ({ key: k, label: categories[k].label, count: projects.filter((p) => p.category === k).length })),
  ];

  return (
    <>
      <PageHeader
        eyebrow="Work"
        title={<>Built, secured, <em className="font-serif text-ember">directed.</em></>}
        lead="Networks you never notice because they simply work, web systems planned before they're coded, and productions shot under pressure. Every project has a one-line version for the non-engineers."
        aside={
          <dl className="grid grid-cols-3 gap-4 md:grid-cols-1">
            {keys.map((k) => (
              <div key={k}>
                <dt className="label text-[0.6rem] text-ink/50">{categories[k].label}</dt>
                <dd className="font-display text-4xl">
                  <CountUp value={projects.filter((p) => p.category === k).length} />
                </dd>
              </div>
            ))}
          </dl>
        }
      />

      <Container className="pb-24 md:pb-32">
        <WorkFilter tabs={tabs}>
          <WorkViews>
            <ul className="grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p, i) => (
                <li key={p.slug} data-category={p.category} style={{ viewTransitionName: `work-${p.slug}` }} className={i === 0 ? "sm:col-span-2" : undefined}>
                  <Tilt max={4} className="rounded-[2px]">
                    <Link href={`/work/${p.slug}`} data-cursor="Open" className="group block">
                      <ProjectCover
                        project={p}
                        priority={i === 0}
                        sizes={i === 0 ? "(min-width: 1024px) 60vw, (min-width: 640px) 92vw, 92vw" : "(min-width: 1024px) 30vw, (min-width: 640px) 46vw, 92vw"}
                        className={`rounded-[2px] ${i === 0 ? "aspect-[16/9]" : "aspect-[4/3]"}`}
                      />
                      <div className="mt-5 flex items-center justify-between gap-3">
                        <span className="label text-[0.62rem] text-ember">{categories[p.category].label}</span>
                        <span className="label text-[0.62rem] text-ink/45">{p.status}</span>
                      </div>
                      <h2 className="mt-2 font-display text-3xl leading-tight transition-colors group-hover:text-ember">{p.title}</h2>
                      <p className="mt-2 font-serif text-lg leading-snug text-ink/75 italic">{p.plain}</p>
                    </Link>
                  </Tilt>
                </li>
              ))}
            </ul>
          </WorkViews>
        </WorkFilter>

        <div className="mt-24 grid gap-8 rounded-[2px] bg-ink p-8 text-paper md:grid-cols-12 md:p-14">
          <h2 className="font-display text-4xl leading-tight md:col-span-7 md:text-5xl">
            Need a network planned, a system built or an event covered? <em className="font-serif text-sky">Let&apos;s scope it.</em>
          </h2>
          <div className="flex flex-col justify-end gap-4 md:col-span-5 md:items-end">
            <p className="font-serif text-lg text-paper/75">Freelance projects start at {site.rate}.</p>
            <Magnetic>
              <Link href="/contact" className="btn bg-paper text-ink hover:bg-sky">
                Start a project <span className="arrow">→</span>
              </Link>
            </Magnetic>
          </div>
        </div>
      </Container>
    </>
  );
}
