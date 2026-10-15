import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Certificates from "@/components/about/Certificates";
import ProfileReel from "@/components/about/ProfileReel";
import TimelineRail from "@/components/about/TimelineRail";
import PageHeader, { Container } from "@/components/layout/PageHeader";
import CountUp from "@/components/ui/CountUp";
import Logo from "@/components/ui/Logo";
import Magnetic from "@/components/ui/Magnetic";
import Tilt from "@/components/ui/Tilt";
import { certificates, education, gear, inProgress, interests, organizations, profiles, toolkit } from "@/content/about";
import { projects } from "@/content/work";
import { reveal } from "@/lib/reveal";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "Neil Jacob Santiago — third-year BSIT (Network Systems & Infrastructure Engineering) at CLSU, Production Director of the ITSC Media Group, BITS member and photographer.",
};

function Section({ id, label, title, children }: { id?: string; label: string; title: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} aria-label={label} className="mt-28 scroll-mt-28 border-t border-ink/15 pt-14 md:mt-36">
      <div className="mb-12 grid gap-4 md:grid-cols-12">
        <p className="label text-ember md:col-span-3">{label}</p>
        <h2 className="font-display text-[clamp(2.25rem,5vw,4rem)] leading-none md:col-span-9">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default function AboutPage() {
  const facts = [
    { value: 3, label: "Year in BSIT" },
    { value: projects.length, label: "Projects shipped & shot" },
    { value: certificates.length, label: "Certificates" },
    { value: organizations.length, label: "Orgs & affiliations" },
  ];

  return (
    <>
      <PageHeader eyebrow="About" title={<>Half engineer, <em className="font-serif text-ember">half eye.</em></>} />

      <Container className="pb-24 md:pb-32">
        {/* Intro */}
        <section className="grid items-end gap-12 md:grid-cols-12">
          <div {...reveal("scale")} className="group relative md:col-span-5">
            <div className="absolute inset-x-0 bottom-0 h-[78%] rounded-[2px] bg-wine transition-[height] duration-700 ease-[var(--ease-apple)] group-hover:h-[84%]" />
            <span className="label absolute top-[26%] left-5 z-10 text-paper/70">{site.coordinates}</span>
            <Image
              src="/profile/neil-standing.png"
              alt="Neil Jacob Santiago, standing"
              width={933}
              height={1400}
              preload
              loading="eager"
              sizes="(min-width: 768px) 38vw, 90vw"
              className="relative mx-auto h-auto w-[78%] drop-shadow-[0_30px_40px_rgb(0_0_0/0.25)] transition-transform duration-700 ease-[var(--ease-spring)] group-hover:-translate-y-2"
            />
          </div>
          <div className="space-y-6 font-serif text-xl leading-relaxed text-ink/85 md:col-span-6 md:col-start-7 md:text-2xl">
            <p className="first-letter:float-left first-letter:mr-3 first-letter:font-display first-letter:text-7xl first-letter:leading-[0.8] first-letter:text-ember">
              I&apos;m a third-year BS Information Technology student at Central Luzon State University, majoring in Network Systems & Infrastructure Engineering — and
              the Production Director of the ITSC Media Group, the media arm of our IT Student Council.
            </p>
            <p>
              Most days I&apos;m mapping networks, breaking into my own lab machines, or architecting a web app before the first line is written. The rest of the time
              I&apos;m behind a camera — at the barricade of a festival, running a studio-style shoot, or out past midnight pointing a lens at Andromeda.
            </p>
            <p>Both reward patience, precision and knowing exactly what to look for. I&apos;m also a proud member of BITS, the Builders of Information Technology Society.</p>
            <p className="font-display text-3xl text-ink md:text-4xl">{site.tagline}</p>
          </div>
        </section>

        {/* Facts */}
        <dl className="mt-20 grid grid-cols-2 gap-px overflow-hidden rounded-[2px] border border-ink/10 bg-ink/10 md:grid-cols-4">
          {facts.map((f, i) => (
            <div key={f.label} {...reveal("up", i * 80)} className="bg-paper p-6 md:p-8">
              <dd className="font-display text-6xl leading-none md:text-7xl">
                <CountUp value={f.value} />
                {f.label.startsWith("Year") && <sup className="ml-1 font-serif text-2xl text-ember italic">rd</sup>}
              </dd>
              <dt className="label mt-3 text-[0.62rem] text-ink/55">{f.label}</dt>
            </div>
          ))}
        </dl>

        {/* Profiles */}
        <Section id="profiles" label="Contact sheet" title={<>Same guy, <em className="font-serif text-ember">different light.</em></>}>
          <ProfileReel profiles={profiles} />
        </Section>

        {/* Education */}
        <Section label="Education" title={<>The path <em className="font-serif text-ember">so far.</em></>}>
          <div className="md:ml-[25%]">
            <TimelineRail>
              <ol className="space-y-14">
                {education.map((e, i) => (
                  <li key={e.school} {...reveal("up", i * 100)} tabIndex={0} className="group relative grid items-start gap-6 outline-none sm:grid-cols-[6rem_1fr]">
                    <span aria-hidden className="absolute top-3 -left-10 h-3 w-3 rounded-full border-2 border-ember bg-paper transition-transform duration-500 ease-[var(--ease-spring)] group-hover:scale-150 md:-left-[2.65rem]" />
                    <Logo name={e.logo} label={e.school} className="h-20 w-20 text-ink sm:h-24 sm:w-24" />
                    <div>
                      <p className="label text-ink/50">{e.years}</p>
                      <h3 className="mt-2 font-display text-3xl leading-tight md:text-4xl">{e.school}</h3>
                      <p className="mt-1 font-serif text-xl text-ember italic">{e.level}</p>
                      <p className="mt-2 font-serif text-lg text-ink/75">{e.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </TimelineRail>
          </div>
        </Section>

        {/* Organizations */}
        <Section label="Organizations" title={<>Where I <em className="font-serif text-ember">show up.</em></>}>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {organizations.map((o, i) => (
              <li key={o.name} {...reveal("up", i * 70)}>
                <Tilt max={6} className="h-full rounded-[2px]">
                  <div tabIndex={0} className="group flex h-full flex-col gap-5 rounded-[2px] border border-ink/10 bg-paper/70 p-6 outline-none focus-visible:ring-2 focus-visible:ring-ember">
                    <Logo name={o.logo} label={o.short} className="h-16 w-16 text-ink" />
                    <div>
                      <p className="label text-[0.6rem] text-ember">{o.role}</p>
                      <h3 className="mt-2 font-display text-xl leading-snug">{o.name}</h3>
                      <p className="mt-2 font-serif text-base leading-snug text-ink/70">{o.detail}</p>
                    </div>
                  </div>
                </Tilt>
              </li>
            ))}
          </ul>
        </Section>

        {/* Credentials */}
        <Section id="credentials" label="Credentials" title={<>Earned, and <em className="font-serif text-ember">in progress.</em></>}>
          <Certificates certs={certificates} />
          <div className="mt-12 flex flex-wrap items-center gap-3">
            <span className="label text-ink/50">Working towards</span>
            {inProgress.map((c) => (
              <span key={c.title} className="group press inline-flex items-center gap-2 rounded-full border border-ink/20 px-4 py-2.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ember/50" />
                  <span className="relative h-2 w-2 rounded-full bg-ember" />
                </span>
                <span className="font-display text-lg">{c.title}</span>
                <span className="font-serif text-ink/60 italic">{c.detail}</span>
              </span>
            ))}
          </div>
        </Section>

        {/* Toolkit */}
        <Section label="Toolkit" title={<>Tools of the <em className="font-serif text-ember">trade.</em></>}>
          <div className="grid gap-12 md:grid-cols-2">
            {toolkit.map((g, gi) => (
              <div key={g.group} {...reveal("up", (gi % 2) * 80)}>
                <h3 className="label mb-5 text-ink/50">{g.group}</h3>
                <ul className="flex flex-wrap gap-3">
                  {g.tools.map((t) => (
                    <li key={t.name} tabIndex={0} className="group press flex items-center gap-3 rounded-full border border-ink/15 bg-paper/60 py-2 pr-4 pl-2 outline-none hover:border-ink/40 focus-visible:border-ember">
                      <Logo name={t.logo} label={t.name} className="h-8 w-8 text-[0.7rem] text-ink" />
                      <span className="font-serif text-lg">{t.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        {/* Gear */}
        <Section id="gear" label="In the bag" title={<>Canon, Nikon, Apple <em className="font-serif text-ember">& a gimbal.</em></>}>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {gear.map((g, i) => (
              <li key={g.brand} {...reveal("up", i * 70)}>
                <Tilt max={6} className="h-full rounded-[2px]">
                  <div tabIndex={0} className="group flex h-full flex-col justify-between gap-8 rounded-[2px] bg-ink p-6 text-paper outline-none">
                    <Logo name={g.logo} label={g.brand} className="h-9 w-32 text-paper [&_img]:object-left [&_img]:brightness-0 [&_img]:invert" bloom={false} />
                    <div>
                      <h3 className="font-display text-2xl">{g.brand}</h3>
                      <ul className="mt-2 space-y-1 font-serif text-paper/75">
                        {g.items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Tilt>
              </li>
            ))}
          </ul>
        </Section>

        {/* Interests */}
        <Section label="Off the clock" title={<>When the screens <em className="font-serif text-ember">go dark.</em></>}>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {interests.map((it, i) => (
              <li key={it.title} {...reveal("up", i * 80)} className="[perspective:1000px]">
                <div
                  tabIndex={0}
                  data-cursor="Flip"
                  className="group relative aspect-[4/5] cursor-pointer outline-none [transform-style:preserve-3d] transition-transform duration-700 ease-[var(--ease-spring)] focus:[transform:rotateY(180deg)] pointer-fine:hover:[transform:rotateY(180deg)]"
                >
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 rounded-[2px] bg-paper-deep p-6 [backface-visibility:hidden]">
                    <Image src={it.icon} alt="" width={180} height={180} className="h-auto w-[55%] drop-shadow-[0_20px_25px_rgb(0_48_73/0.25)]" />
                    <h3 className="text-center font-display text-2xl">{it.title}</h3>
                    <span className="label text-[0.6rem] text-ink/45">Tap to flip</span>
                  </div>
                  <div className="absolute inset-0 flex items-center rounded-[2px] bg-ember p-7 text-paper [backface-visibility:hidden] [transform:rotateY(180deg)]">
                    <p className="font-serif text-xl leading-snug italic">{it.text}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Section>

        {/* Closing */}
        <section className="mt-28 grid items-end gap-10 overflow-hidden rounded-[2px] bg-sky/30 p-8 md:mt-36 md:grid-cols-12 md:p-14">
          <div className="md:col-span-7">
            <h2 className="font-display text-[clamp(2.5rem,5vw,4.5rem)] leading-none">
              Got a project, <em className="font-serif text-ember">or a stage?</em>
            </h2>
            <p className="mt-6 max-w-lg font-serif text-xl text-ink/80">Networks, web systems, event coverage or a portrait session — I&apos;d love to hear about it.</p>
            <div className="mt-8">
              <Magnetic>
                <Link href="/contact" className="btn bg-ink text-paper hover:bg-ember">
                  Say hello <span className="arrow">→</span>
                </Link>
              </Magnetic>
            </div>
          </div>
          <div className="relative -mb-14 md:col-span-5">
            <Image src="/profile/neil-seated.png" alt="Neil Jacob Santiago, seated" width={933} height={1400} sizes="(min-width: 768px) 30vw, 70vw" className="mx-auto h-auto w-[70%] md:w-full" />
          </div>
        </section>
      </Container>
    </>
  );
}
