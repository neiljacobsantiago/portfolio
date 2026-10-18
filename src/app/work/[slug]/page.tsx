import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/layout/PageHeader";
import Magnetic from "@/components/ui/Magnetic";
import Icon from "@/components/ui/Icon";
import ShareButton from "@/components/ui/ShareButton";
import FacebookMedia from "@/components/work/FacebookMedia";
import ProjectCover from "@/components/work/ProjectCover";
import ProjectImages from "@/components/work/ProjectImages";
import ScrollShot from "@/components/work/ScrollShot";
import ToolView from "@/components/tools/ToolView";
import AskNeilButton from "@/components/chat/AskNeilButton";
import KindWords from "@/components/testimonials/KindWords";
import YouTube from "@/components/work/YouTube";
import { categories, projectBySlug, projects } from "@/content/work";
import { reveal } from "@/lib/reveal";
import { toolById } from "@/lib/tools";

export const dynamicParams = false;

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const project = projectBySlug((await params).slug);
  if (!project) return {};
  return {
    title: project.title,
    description: `${project.plain} ${project.body[0]}`.slice(0, 300),
    openGraph: project.cover ? { images: [{ url: project.cover }] } : undefined,
  };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const project = projectBySlug((await params).slug);
  if (!project) notFound();

  const index = projects.indexOf(project);
  const next = projects[(index + 1) % projects.length];
  const prev = projects[(index - 1 + projects.length) % projects.length];
  // The cover is already shown full width above, so the gallery starts after it.
  const gallery = (project.images ?? []).filter((img) => project.youtube || img.src !== project.cover);

  return (
    <article>
      <header className="mx-auto max-w-[90rem] px-5 pt-32 md:px-10 md:pt-44">
        <nav aria-label="Breadcrumb" className="label animate-rise-in flex flex-wrap items-center gap-2 text-ink/60">
          <Link href="/work" className="ulink hover:text-ink">Work</Link>
          <span aria-hidden>/</span>
          <Link href={`/work#${project.category}`} className="ulink hover:text-ink">{categories[project.category].label}</Link>
        </nav>
        <div className="animate-rise-in mt-8 flex items-center gap-4" style={{ animationDelay: "80ms" }}>
          {project.logo && (
            <span
              className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl p-1 ring-1 ring-ink/10 transition-transform duration-500 ease-[var(--ease-spring)] hover:-rotate-6 hover:scale-110"
              style={{ background: project.logo.bg === "transparent" ? undefined : project.logo.bg }}
            >
              <span className="relative h-full w-full">
                <Image src={project.logo.src} alt={`${project.title} logo`} fill sizes="48px" className="object-contain" />
              </span>
            </span>
          )}
          <p className="label text-ember">{project.context}</p>
        </div>
        <h1 className="mt-4 font-display text-[clamp(2.75rem,8vw,7.5rem)] leading-[1]">
          <span className="line-mask">
            <span className="animate-line-up block">{project.title}</span>
          </span>
        </h1>
        <p className="animate-rise-in mt-6 max-w-3xl font-serif text-2xl leading-snug text-ink/80 italic md:text-3xl" style={{ animationDelay: "200ms" }}>
          {project.plain}
        </p>
      </header>

      <Container className="mt-12 md:mt-16">
        <div className="animate-rise-in overflow-hidden rounded-[2px]" style={{ animationDelay: "300ms" }}>
          {project.youtube ? (
            <YouTube id={project.youtube} title={project.title} />
          ) : (
            <ProjectCover project={project} priority sizes="(min-width: 1440px) 1360px, 100vw" className="aspect-[16/9] md:aspect-[21/9]" />
          )}
        </div>
      </Container>

      <Container className="grid grid-cols-1 gap-14 py-16 md:grid-cols-12 md:py-24">
        <dl className="grid h-max min-w-0 grid-cols-2 gap-x-6 gap-y-8 md:sticky md:top-28 md:col-span-4 md:grid-cols-1">
          <Meta label="Role">{project.role}</Meta>
          <Meta label="Status">{project.status}</Meta>
          <div className="col-span-2 md:col-span-1">
            <dt className="label mb-3 text-ink/50">Built with</dt>
            <dd className="flex flex-wrap gap-2">
              {project.stack.map((t) => (
                <span key={t} className="label rounded-full border border-ink/20 px-3 py-1.5 text-[0.62rem]">{t}</span>
              ))}
            </dd>
          </div>
          <div className="col-span-2 flex flex-wrap items-center gap-3 md:col-span-1">
            {project.links?.map((l) => (
              <Magnetic key={l.href}>
                <a href={l.href} target="_blank" rel="noopener noreferrer" className="btn bg-ink py-3 text-paper hover:bg-ember">
                  {l.label} <Icon name="arrow-up-right" className="arrow" />
                </a>
              </Magnetic>
            ))}
            {project.privateRepo && (
              <span className="label inline-flex items-center gap-2 rounded-full border border-ink/20 px-4 py-3 text-ink/60">
                <Icon name="lock" className="h-4 w-4" /> Private repository
              </span>
            )}
            <ShareButton title={project.title} text={project.plain} />
          </div>
          {project.notice && (
            <p className="col-span-2 flex gap-3 rounded-[2px] border-l-2 border-ember bg-ember/[0.06] px-4 py-3 font-serif text-base leading-snug text-ink/75 italic md:col-span-1">
              <Icon name="info" className="mt-0.5 h-5 w-5 shrink-0 text-ember" />
              {project.notice}
            </p>
          )}
        </dl>

        <div className="min-w-0 md:col-span-8">
          <div className="space-y-6 font-serif text-xl leading-relaxed text-ink/85 md:text-2xl">
            {project.body.map((para, i) => (
              <p key={i} {...reveal("up", i * 60)}>{para}</p>
            ))}
          </div>

          {project.timeline && (
            <section className="mt-14" aria-label="How it evolved">
              <h2 className="label mb-6 text-ink/50">How it evolved</h2>
              <ol className="relative grid gap-4 md:grid-cols-3">
                <span aria-hidden className="absolute top-5 right-[16%] left-[16%] hidden h-px bg-gradient-to-r from-ember via-ember/60 to-ink/30 md:block" />
                {project.timeline.map((step, i) => (
                  <li key={step.course} {...reveal("up", i * 120)} className="group relative">
                    <span className="relative z-10 mx-auto mb-4 hidden h-10 w-10 items-center justify-center rounded-full bg-ember font-display text-lg text-paper ring-4 ring-paper transition-transform duration-500 ease-[var(--ease-spring)] group-hover:scale-110 md:flex">
                      {i + 1}
                    </span>
                    <div className="h-full rounded-[2px] border border-ink/10 bg-paper/70 p-5 transition-[transform,box-shadow] duration-500 ease-[var(--ease-apple)] group-hover:-translate-y-1 group-hover:shadow-[0_20px_40px_-24px_rgb(0_48_73/0.5)]">
                      <p className="label text-[0.6rem] text-ember">
                        <span className="md:hidden">0{i + 1} · </span>
                        {step.course}
                      </p>
                      <p className="mt-2 font-display text-2xl leading-tight">{step.stage}</p>
                      <p className="mt-2 font-serif text-base leading-snug text-ink/70">{step.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {project.quote && (
            <blockquote {...reveal("up")} className="relative mt-12 border-l-2 border-ember pl-6 font-display text-2xl leading-snug text-ink md:pl-8 md:text-3xl">
              <span aria-hidden className="absolute -top-6 -left-1 font-display text-7xl leading-none text-ember/30">“</span>
              {project.quote}
              <footer className="label mt-4 text-[0.62rem] text-ink/50">— Neil, on Day 2</footer>
            </blockquote>
          )}

          {project.media && project.media.length > 0 && (
            <section className="mt-14">
              <h2 className="label mb-4 text-ink/50">{project.media.some((m) => m.kind === "video") ? "Watch the series" : "As published"}</h2>
              <FacebookMedia items={project.media} />
            </section>
          )}

          {project.scrollShot && (
            <section className="mt-14">
              <h2 className="label mb-4 text-ink/50">Scroll through the prototype</h2>
              <ScrollShot
                src={project.scrollShot.src}
                alt={project.scrollShot.alt}
                host={project.links?.[0] ? new URL(project.links[0].href).host : project.title.toLowerCase()}
              />
            </section>
          )}

          {/* The Lab tools are also used full width on /lab; here they sit in a narrow column, so every
              grid cell and range slider inside is allowed to shrink instead of pushing past the box's right edge. */}
          {project.tool && (
            <section className="mt-14 min-w-0 rounded-[2px] bg-paper-deep/50 p-4 ring-1 ring-ink/10 sm:p-5 md:p-8 [&_.grid>*]:min-w-0 [&_input[type=range]]:min-w-0">
              <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="label text-ember">Try it yourself</h2>
                  <p className="mt-2 font-display text-3xl leading-tight">{toolById(project.tool).title}</p>
                  <p className="mt-2 max-w-xl font-serif text-lg text-ink/70">{toolById(project.tool).blurb}</p>
                </div>
                <Link href={`/lab#${project.tool}`} className="label ulink inline-flex items-center gap-1.5 text-[0.6rem] text-ink/60 hover:text-ink">
                  All Lab tools <Icon name="arrow-right" />
                </Link>
              </div>
              <ToolView id={project.tool} />
              <AskNeilButton className="mt-6" prompt={`Explain how ${project.title} works, in simple terms`}>
                Ask NeilAI about {project.title}
              </AskNeilButton>
            </section>
          )}

          {project.team && (
            <section className="mt-14 border-t border-ink/15 pt-8">
              <h2 className="label mb-4 text-ink/50">Team</h2>
              <ul className="grid gap-2 font-serif text-lg sm:grid-cols-2">
                {project.team.map((m) => {
                  const [name, role] = m.split(" — ");
                  return (
                    <li key={m} className={name === "Neil Jacob Santiago" ? "text-ember" : undefined}>
                      {name}
                      {role && <span className="block text-base text-ink/60 italic">{role}</span>}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <KindWords project={project.slug} compact className="mt-14 border-t border-ink/15 pt-8" />

          {gallery.length > 0 && (
            <section className="mt-14">
              <h2 className="label mb-4 text-ink/50">Gallery</h2>
              <ProjectImages images={gallery} />
            </section>
          )}
        </div>
      </Container>

      <nav aria-label="More projects" className="border-t border-ink/15">
        <div className="mx-auto grid max-w-[90rem] md:grid-cols-2">
          <Link href={`/work/${prev.slug}`} className="group press border-b border-ink/15 px-5 py-10 md:border-r md:border-b-0 md:px-10 md:py-14">
            <span className="label inline-flex items-center gap-2 text-ink/50"><Icon name="arrow-left" /> Previous</span>
            <span className="mt-3 block font-display text-3xl transition-colors group-hover:text-ember md:text-4xl">{prev.title}</span>
          </Link>
          <Link href={`/work/${next.slug}`} className="group press px-5 py-10 text-right md:px-10 md:py-14">
            <span className="label inline-flex items-center gap-2 text-ink/50">Next <Icon name="arrow-right" /></span>
            <span className="mt-3 block font-display text-3xl transition-colors group-hover:text-ember md:text-4xl">{next.title}</span>
          </Link>
        </div>
      </nav>
    </article>
  );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="label mb-2 text-ink/50">{label}</dt>
      <dd className="font-serif text-lg leading-snug">{children}</dd>
    </div>
  );
}
