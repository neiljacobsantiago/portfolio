import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import styles from "@/components/about/about.module.css";
import Certificates from "@/components/about/Certificates";
import ProfileReel from "@/components/about/ProfileReel";
import TimelineRail from "@/components/about/TimelineRail";
import CountUp from "@/components/ui/CountUp";
import Icon from "@/components/ui/Icon";
import Logo from "@/components/ui/Logo";
import Magnetic from "@/components/ui/Magnetic";
import { certificates, education, gear, inProgress, interests, organizations, profiles, toolkit } from "@/content/about";
import { projectBySlug, projects } from "@/content/work";
import { reveal } from "@/lib/reveal";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "Neil Jacob Santiago: third-year BS Information Technology student at Central Luzon State University (Network Systems & Infrastructure Engineering) and Production Director of the ITSC Media Group. Education, roles, certificates and toolkit.",
};

/* ---------------------------------------------------------------- pieces -- */

function Section({ id, label, title, lead, children, className = "" }: { id?: string; label: string; title: React.ReactNode; lead?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-title` : undefined} className={`mt-24 scroll-mt-28 md:mt-36 ${className}`}>
      <div className="mb-10 grid gap-x-10 gap-y-4 border-t border-ink/15 pt-10 md:mb-14 md:grid-cols-12 md:pt-12">
        <p className="label text-ember md:col-span-3">{label}</p>
        <div className="md:col-span-9">
          <h2 id={id ? `${id}-title` : undefined} {...reveal("up")} className="font-display text-[clamp(2.2rem,5.2vw,4.25rem)] leading-[1.02]">
            {title}
          </h2>
          {lead && (
            <p {...reveal("up", 80)} className="mt-5 max-w-2xl font-serif text-lg leading-relaxed text-ink/80 md:text-xl">
              {lead}
            </p>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

interface Proof {
  title: string;
  line: string;
  href: string;
}

/** A project's page if it exists, otherwise the work index, so a renamed slug never 404s. */
const workHref = (slug: string) => (projectBySlug(slug) ? `/work/${slug}` : "/work");

function SideCard({
  tone,
  kicker,
  title,
  image,
  alt,
  proofs,
  delay,
}: {
  tone: "ink" | "paper";
  kicker: string;
  title: React.ReactNode;
  image: string;
  alt: string;
  proofs: Proof[];
  delay: number;
}) {
  const dark = tone === "ink";
  return (
    <article {...reveal("up", delay)} className={`flex flex-col overflow-hidden rounded-[4px] ${dark ? "bg-ink text-paper" : "bg-paper-deep text-ink ring-1 ring-ink/10"}`}>
      <div className="relative aspect-[5/4] overflow-hidden bg-[#e7e5e1] sm:aspect-[16/11]">
        <Image src={image} alt={alt} fill sizes="(min-width: 1024px) 44vw, 94vw" className={`${styles.parallax} object-cover object-[50%_22%]`} />
        <span className={`label absolute top-4 left-4 rounded-full px-3 py-1.5 text-2xs ${dark ? "bg-ink text-paper" : "bg-paper text-ink"}`}>{kicker}</span>
      </div>
      <div className="flex flex-1 flex-col p-6 sm:p-8 md:p-10">
        <h3 className="font-display text-[clamp(1.8rem,3.2vw,2.6rem)] leading-[1.05]">{title}</h3>
        <ul className={`mt-7 divide-y ${dark ? "divide-paper/15 border-y border-paper/15" : "divide-ink/12 border-y border-ink/12"}`}>
          {proofs.map((p) => (
            <li key={p.title}>
              <Link href={p.href} className="group flex items-start gap-4 py-4 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember">
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-xl leading-tight">{p.title}</span>
                  <span className={`mt-1 block font-serif text-base leading-snug ${dark ? "text-paper/80" : "text-ink/80"}`}>{p.line}</span>
                </span>
                <span
                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-[transform,background-color,color] duration-500 ease-[var(--ease-spring)] group-hover:translate-x-1 ${dark ? "border-paper/30 group-hover:bg-paper group-hover:text-ink" : "border-ink/25 group-hover:bg-ink group-hover:text-paper"}`}
                >
                  <Icon name="arrow-right" className="h-4 w-4" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ page -- */

export default function AboutPage() {
  const sis = projectBySlug("student-information-system");
  const aurora = projectBySlug("aurora-fest-2026");
  const mainOrg = organizations[0];
  const otherOrgs = organizations.slice(1);
  const buildCount = projects.filter((p) => p.category !== "media").length;
  const productionCount = projects.filter((p) => p.category === "media" && p.status !== "Upcoming").length;

  const facts = [
    { value: 3, suffix: "rd", label: "Year of BS Information Technology" },
    { value: buildCount, label: "Web & systems projects" },
    { value: productionCount, label: "Productions & coverage" },
    { value: certificates.length, label: "Certificates earned" },
  ];

  const systems: Proof[] = [
    { title: "PathoScan", line: "Designed the interface and trained the model. Turned over to DA PhilMech, September 2026.", href: workHref("pathoscan") },
    { title: "Student Information System", line: "A Laravel API with sign-in, roles and rules the server enforces.", href: workHref("student-information-system") },
    { title: "BuildIT", line: "One product carried across three courses: C, Figma, then a cloud storefront.", href: workHref("buildit") },
    { title: "Networks", line: "Cisco NetAcad certified in network addressing and troubleshooting; working towards CCNA.", href: "#credentials" },
  ];
  const production: Proof[] = [
    { title: `${mainOrg.role}, ${mainOrg.short}`, line: "Coverage, reels and broadcasts for the CLSU IT Student Council.", href: workHref("it-fest") },
    { title: "Cyber Awareness Series", line: "Six episodes on data privacy, directed and recorded on location.", href: workHref("cyber-awareness-series") },
    { title: "IRCITE 2026", line: "A four-person team across a two-building international conference.", href: workHref("ircite-2026") },
    { title: "Aurora Fest 2026", line: "Six OPM acts from the front barrier, shot in manual.", href: workHref("aurora-fest-2026") },
  ];

  const principles = [
    {
      title: "Plan it before it's built.",
      text: "Every interface starts as a clickable Figma prototype, and every network is simulated in Packet Tracer before a cable is run. Changing a plan is cheap; changing a build is not.",
      source: { label: "BuildIT", href: workHref("buildit") },
    },
    {
      title: "Let the server say no.",
      text: sis?.quote ?? "The interface hides what you can't do. The server is what actually says no.",
      source: { label: "Student Information System", href: workHref("student-information-system") },
      quote: true,
    },
    {
      title: "Stay ahead of the light.",
      text: aurora?.quote ?? "Festival light changes faster than any metering mode. The job is to stay one step ahead of it.",
      source: { label: "Aurora Fest 2026", href: workHref("aurora-fest-2026") },
      quote: true,
    },
  ];

  return (
    <>
      {/* ------------------------------------------------------------ Hero */}
      <section aria-labelledby="about-title" className="relative mx-auto max-w-[90rem] px-5 pt-28 md:px-10 md:pt-40">
        <div className="grid gap-x-12 gap-y-10 lg:grid-cols-12">
          <div className="lg:col-span-7 lg:row-start-1">
            <p className="label animate-rise-in text-ember">About</p>
            <h1 id="about-title" className="mt-5 font-display text-[clamp(2.75rem,9vw,5.75rem)] leading-[0.98] lg:text-[clamp(3.5rem,5.7vw,6.5rem)] tracking-[-0.01em]">
              <span className="line-mask">
                <span className="animate-line-up block">I build systems.</span>
              </span>
              <span className="line-mask">
                <em className="animate-line-up block font-serif text-ember" style={{ animationDelay: "90ms" }}>
                  I direct cameras.
                </em>
              </span>
            </h1>
          </div>

          <figure className={`${styles.heroPhoto} relative mx-auto w-full max-w-[30rem] lg:col-span-5 lg:col-start-8 lg:row-span-2 lg:row-start-1 lg:max-w-none lg:self-end`}>
            <div aria-hidden className={`${styles.heroBlock} absolute top-6 -right-3 -bottom-3 left-6 rounded-[4px] bg-wine sm:top-8 sm:-right-5 sm:-bottom-5 sm:left-8`} />
            <div className={`animate-rise-in relative aspect-[4/5] overflow-hidden rounded-[4px] bg-[#e7e5e1] shadow-[0_40px_80px_-40px_rgb(0_48_73/0.6)]`} style={{ animationDelay: "120ms" }}>
              <Image
                src="/about/neil-studio-arms.jpg"
                alt="Neil Jacob Santiago in a black N. Santiago polo, arms crossed and smiling, in a studio portrait"
                fill
                preload
                sizes="(min-width: 1024px) 38vw, (min-width: 640px) 30rem, 92vw"
                className="object-cover object-[50%_18%]"
              />
              <figcaption className="absolute inset-x-3 bottom-3 flex flex-wrap items-center justify-between gap-2 rounded-[3px] bg-paper/95 px-4 py-3 text-ink shadow-[0_10px_30px_-12px_rgb(0_48_73/0.5)]">
                <span className="label inline-flex items-center gap-1.5 text-2xs">
                  <Icon name="map" className="h-3.5 w-3.5 text-ember" />
                  {site.location}
                </span>
                <span className="label text-2xs text-ink/75">{site.coordinates}</span>
              </figcaption>
            </div>
          </figure>

          <div className="animate-rise-in lg:col-span-6 lg:row-start-2 lg:self-start" style={{ animationDelay: "180ms" }}>
            <p className="font-serif text-xl leading-relaxed text-ink/90 md:text-2xl">
              I&apos;m Neil, a third-year BS Information Technology student at Central Luzon State University, majoring in Network Systems & Infrastructure Engineering, and
              the Production Director of the ITSC Media Group.
            </p>
            <p className="mt-5 font-serif text-lg leading-relaxed text-ink/80 md:text-xl">
              My work sits where two disciplines meet. One side maps networks, prototypes interfaces and builds systems people rely on, like PathoScan, now in use at DA
              PhilMech. The other briefs a crew, keeps a shot list and gets the story out the same day. Both reward the same discipline: prepare properly, sweat the
              details, and finish the job.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/resume" className="btn bg-ink text-paper hover:bg-ember">
                Read the résumé <Icon name="arrow-right" className="arrow h-4 w-4" />
              </Link>
              <Link href="/services" className="btn border border-ink/25 text-ink hover:border-ink">
                Work with me
              </Link>
            </div>
          </div>
        </div>

        {/* Facts */}
        <dl className="mt-16 grid grid-cols-2 gap-px overflow-hidden rounded-[4px] bg-ink/12 ring-1 ring-ink/12 md:mt-24 lg:grid-cols-4">
          {facts.map((f, i) => (
            <div key={f.label} {...reveal("up", i * 80)} className="flex flex-col-reverse justify-end bg-paper p-5 sm:p-7 md:p-8">
              <dt className="label mt-3 text-2xs leading-relaxed text-ink/75">{f.label}</dt>
              <dd className="font-display text-5xl leading-none sm:text-6xl md:text-7xl">
                <CountUp value={f.value} />
                {f.suffix && <sup className="ml-1 font-serif text-xl text-ember italic sm:text-2xl">{f.suffix}</sup>}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="mx-auto max-w-[90rem] px-5 pb-24 md:px-10 md:pb-32">
        {/* ------------------------------------------------- Two sides */}
        <Section
          id="two-sides"
          label="The work"
          title={
            <>
              Two sides of <em className="font-serif text-ember">the same work.</em>
            </>
          }
          lead="Systems work decides how things connect; production decides how they're seen. Either way, the finish line is something people actually use."
        >
          <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
            <SideCard
              tone="ink"
              kicker="Systems & web"
              title={
                <>
                  Networks, interfaces and <em className="font-serif text-sky">the logic underneath.</em>
                </>
              }
              image="/about/neil-studio-seated.jpg"
              alt="Neil Jacob Santiago seated on a stool in a studio, hands on his knees, smiling at the camera"
              proofs={systems}
              delay={0}
            />
            <SideCard
              tone="paper"
              kicker="Camera & production"
              title={
                <>
                  Crews, coverage and <em className="font-serif text-ember">the story in between.</em>
                </>
              }
              image="/about/neil-studio-camera.jpg"
              alt="Neil Jacob Santiago holding a Nikon D780 with a flash, the camera strap across his shoulder"
              proofs={production}
              delay={120}
            />
          </div>
        </Section>

        {/* ------------------------------------------------- How I work */}
        <Section
          id="approach"
          label="How I work"
          title={
            <>
              Three habits, <em className="font-serif text-ember">every project.</em>
            </>
          }
        >
          <ol className="grid gap-px overflow-hidden rounded-[4px] bg-ink/12 ring-1 ring-ink/12 lg:grid-cols-3">
            {principles.map((p, i) => (
              <li key={p.title} {...reveal("up", i * 90)} className="flex flex-col bg-paper p-7 md:p-9">
                <span className="label text-ember">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-5 font-display text-3xl leading-tight">{p.title}</h3>
                {p.quote ? (
                  <blockquote className="mt-4 flex-1 font-serif text-lg leading-relaxed text-ink/85 italic">&ldquo;{p.text}&rdquo;</blockquote>
                ) : (
                  <p className="mt-4 flex-1 font-serif text-lg leading-relaxed text-ink/85">{p.text}</p>
                )}
                <Link href={p.source.href} className="label ulink mt-6 inline-flex items-center gap-1.5 self-start text-2xs text-ink/80 hover:text-ember">
                  From {p.source.label}
                  <Icon name="arrow-right" className="h-3.5 w-3.5" />
                </Link>
              </li>
            ))}
          </ol>
        </Section>

        {/* ------------------------------------------------- Education */}
        <Section
          id="education"
          label="Education"
          title={
            <>
              The classrooms <em className="font-serif text-ember">behind the work.</em>
            </>
          }
        >
          <div className="md:ml-[25%]">
            <TimelineRail>
              <ol className="space-y-12 md:space-y-16">
                {education.map((e, i) => (
                  <li key={e.school} {...reveal("up", i * 100)} className="group relative grid items-start gap-5 sm:grid-cols-[5.5rem_1fr] md:gap-8">
                    <span
                      aria-hidden
                      className="absolute top-2.5 -left-[2.05rem] h-3.5 w-3.5 rounded-full border-2 border-ember bg-paper transition-colors duration-700 group-data-revealed:bg-ember md:-left-[2.85rem]"
                    />
                    <Logo name={e.logo} label={e.school} className="h-16 w-16 text-ink sm:h-[5.5rem] sm:w-[5.5rem]" />
                    <div>
                      <p className="label text-ink/75">{e.years}</p>
                      <h3 className="mt-2 font-display text-3xl leading-tight md:text-4xl">{e.school}</h3>
                      <p className="mt-1 font-serif text-xl text-ember italic">{e.level}</p>
                      <p className="mt-2 max-w-xl font-serif text-lg text-ink/80">{e.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </TimelineRail>
          </div>
        </Section>

        {/* ------------------------------------------------- Organizations */}
        <Section
          id="organizations"
          label="Organizations"
          title={
            <>
              The roles, <em className="font-serif text-ember">and the rooms.</em>
            </>
          }
        >
          <div className="grid gap-5 lg:grid-cols-12">
            <article {...reveal("up")} className="flex flex-col justify-between gap-10 rounded-[4px] bg-ink p-7 text-paper sm:p-10 lg:col-span-5">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <p className="label text-2xs text-sky">{mainOrg.role}</p>
                  <h3 className="mt-3 font-display text-3xl leading-tight md:text-4xl">{mainOrg.name}</h3>
                </div>
                <Logo name="IMG_LOGO_WHITE" label={mainOrg.short} className="h-16 w-16 text-paper md:h-20 md:w-20" bloom={false} />
              </div>
              <div>
                <p className="font-serif text-lg leading-relaxed text-paper/85">{mainOrg.detail}</p>
                <ul className="mt-6 space-y-3 font-serif text-base leading-snug text-paper/85">
                  {[
                    "Turns creative plans into schedules, crew lists and shot lists the team can deliver.",
                    "Leads production for IT Fest, the department's biggest week.",
                    "Preparing IMG Stratcom, a university collaboration under official branding.",
                  ].map((line) => (
                    <li key={line} className="flex gap-3">
                      <Icon name="check" className="mt-1 h-4 w-4 text-sky" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
            <ul className="grid gap-px overflow-hidden rounded-[4px] bg-ink/12 ring-1 ring-ink/12 sm:grid-cols-2 lg:col-span-7">
              {otherOrgs.map((o, i) => (
                <li key={o.name} {...reveal("up", 80 + i * 70)} tabIndex={0} className="group flex gap-5 bg-paper p-6 outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-inset md:p-7">
                  <Logo name={o.logo} label={o.short} className="h-14 w-14 text-ink" />
                  <div className="min-w-0">
                    <p className="label text-2xs text-ember">{o.role}</p>
                    <h3 className="mt-1.5 font-display text-xl leading-snug">{o.name}</h3>
                    <p className="mt-1.5 font-serif text-base leading-snug text-ink/80">{o.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </Section>

        {/* ------------------------------------------------- Credentials */}
        <Section
          id="credentials"
          label="Credentials"
          title={
            <>
              Earned, and <em className="font-serif text-ember">in progress.</em>
            </>
          }
          lead="Short courses and certificates alongside the degree. Tap any one to see it in full."
        >
          <Certificates certs={certificates} />
          <div className="mt-14 flex flex-wrap items-center gap-3">
            <span className="label text-ink/75">Working towards</span>
            {inProgress.map((c) => (
              <span key={c.title} className="inline-flex items-center gap-2.5 rounded-full border border-ink/20 bg-paper/70 px-4 py-2.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ember/50" />
                  <span className="relative h-2 w-2 rounded-full bg-ember" />
                </span>
                <span className="font-display text-lg">{c.title}</span>
                <span className="font-serif text-ink/75 italic">{c.detail}</span>
              </span>
            ))}
          </div>
        </Section>

        {/* ------------------------------------------------- Toolkit */}
        <Section
          id="toolkit"
          label="Toolkit"
          title={
            <>
              What I <em className="font-serif text-ember">work with.</em>
            </>
          }
        >
          <div className="grid gap-5 md:grid-cols-2">
            {toolkit.map((g, gi) => (
              <div key={g.group} {...reveal("up", (gi % 2) * 80)} className="rounded-[4px] bg-paper/70 p-6 ring-1 ring-ink/10 md:p-8">
                <h3 className="label text-ink/75">{g.group}</h3>
                <ul className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-2 xl:grid-cols-3">
                  {g.tools.map((t) => (
                    <li key={t.name} tabIndex={0} className="group press flex items-center gap-3 rounded-[3px] p-2 outline-none hover:bg-paper-deep focus-visible:ring-2 focus-visible:ring-ember">
                      <Logo name={t.logo} label={t.name} className="h-9 w-9 text-[0.7rem] text-ink" />
                      <span className="min-w-0 font-serif text-base leading-tight">{t.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div id="gear" className="mt-16 scroll-mt-28">
            <h3 className="label mb-5 text-ink/75">In the bag</h3>
            <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {gear.map((g, i) => (
                <li key={g.brand} {...reveal("up", i * 70)} className="flex flex-col justify-between gap-6 rounded-[4px] bg-ink p-5 text-paper md:p-6">
                  <Logo name={g.logo} label={g.brand} className="h-7 w-24 text-paper [&_img]:object-left [&_img]:brightness-0 [&_img]:invert" bloom={false} />
                  <div>
                    <p className="font-display text-xl">{g.brand}</p>
                    <ul className="mt-1 space-y-0.5 font-serif text-sm text-paper/85 md:text-base">
                      {g.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </Section>

        {/* ------------------------------------------------- Off the clock */}
        <Section
          id="off-the-clock"
          label="Off the clock"
          title={
            <>
              Same guy, <em className="font-serif text-ember">different light.</em>
            </>
          }
        >
          <ProfileReel profiles={profiles} />
          <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {interests.map((it, i) => (
              <li key={it.title} {...reveal("up", i * 70)} className="flex items-start gap-4 rounded-[4px] bg-paper-deep/70 p-5 ring-1 ring-ink/10">
                <Image src={it.icon} alt="" width={180} height={180} className="h-14 w-14 shrink-0 object-contain" />
                <div>
                  <h3 className="font-display text-xl leading-tight">{it.title}</h3>
                  <p className="mt-1.5 font-serif text-base leading-snug text-ink/80">{it.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </Section>

        {/* ------------------------------------------------- Closing */}
        <section aria-labelledby="about-cta" className="relative mt-24 overflow-hidden rounded-[4px] bg-ink px-6 py-14 text-paper sm:px-10 md:mt-36 md:px-16 md:py-20">
          <div aria-hidden className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-ember/25 blur-3xl" />
          <div className={`${styles.lift} relative max-w-3xl`}>
            <p className="label text-sky">Next</p>
            <h2 id="about-cta" className="mt-4 font-display text-[clamp(2.4rem,6vw,4.75rem)] leading-[1.02]">
              Something to build, <em className="font-serif text-sky">or a day worth covering?</em>
            </h2>
            <p className="mt-6 max-w-xl font-serif text-lg leading-relaxed text-paper/85 md:text-xl">
              Websites and web systems, network setups, event coverage and video. Every project is quoted on its scope after a first conversation.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Magnetic>
                <Link href="/services" className="btn bg-paper text-ink hover:bg-ember hover:text-paper">
                  See services <Icon name="arrow-right" className="arrow h-4 w-4" />
                </Link>
              </Magnetic>
              <Link href="/contact" className="btn border border-paper/35 text-paper hover:border-paper">
                Get in touch
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
