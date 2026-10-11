import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/layout/PageHeader";
import Magnetic from "@/components/ui/Magnetic";
import ProjectCover from "@/components/work/ProjectCover";
import ProjectImages from "@/components/work/ProjectImages";
import YouTube from "@/components/work/YouTube";
import { categories, projectBySlug, projects } from "@/content/work";
import { reveal } from "@/lib/reveal";

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

  return (
    <article>
      <header className="mx-auto max-w-[90rem] px-5 pt-32 md:px-10 md:pt-44">
        <nav aria-label="Breadcrumb" className="label animate-rise-in flex flex-wrap items-center gap-2 text-ink/60">
          <Link href="/work" className="ulink hover:text-ink">Work</Link>
          <span aria-hidden>/</span>
          <Link href={`/work#${project.category}`} className="ulink hover:text-ink">{categories[project.category].label}</Link>
        </nav>
        <p className="label animate-rise-in mt-8 text-ember" style={{ animationDelay: "80ms" }}>{project.context}</p>
        <h1 className="mt-4 overflow-hidden font-display text-[clamp(2.75rem,8vw,7.5rem)] leading-[0.95]">
          <span className="animate-line-up block">{project.title}</span>
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

      <Container className="grid gap-14 py-16 md:grid-cols-12 md:py-24">
        <dl className="grid h-max grid-cols-2 gap-x-6 gap-y-8 md:sticky md:top-28 md:col-span-4 md:grid-cols-1">
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
          {(project.links?.length || project.privateRepo) && (
            <div className="col-span-2 flex flex-wrap gap-3 md:col-span-1">
              {project.links?.map((l) => (
                <Magnetic key={l.href}>
                  <a href={l.href} target="_blank" rel="noopener noreferrer" className="btn bg-ink py-3 text-paper hover:bg-ember">
                    {l.label} <span className="arrow">↗</span>
                  </a>
                </Magnetic>
              ))}
              {project.privateRepo && (
                <span className="label inline-flex items-center gap-2 rounded-full border border-ink/20 px-4 py-3 text-ink/60">
                  <span aria-hidden>🔒</span> Private repository
                </span>
              )}
            </div>
          )}
        </dl>

        <div className="md:col-span-8">
          <div className="space-y-6 font-serif text-xl leading-relaxed text-ink/85 md:text-2xl">
            {project.body.map((para, i) => (
              <p key={i} {...reveal("up", i * 60)}>{para}</p>
            ))}
          </div>

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

          {project.images && project.images.length > 0 && (
            <section className="mt-14">
              <h2 className="label mb-4 text-ink/50">Gallery</h2>
              <ProjectImages images={project.images} />
            </section>
          )}
        </div>
      </Container>

      <nav aria-label="More projects" className="border-t border-ink/15">
        <div className="mx-auto grid max-w-[90rem] md:grid-cols-2">
          <Link href={`/work/${prev.slug}`} className="group press border-b border-ink/15 px-5 py-10 md:border-r md:border-b-0 md:px-10 md:py-14">
            <span className="label text-ink/50">← Previous</span>
            <span className="mt-3 block font-display text-3xl transition-colors group-hover:text-ember md:text-4xl">{prev.title}</span>
          </Link>
          <Link href={`/work/${next.slug}`} className="group press px-5 py-10 text-right md:px-10 md:py-14">
            <span className="label text-ink/50">Next →</span>
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
