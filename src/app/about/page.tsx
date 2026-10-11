import type { Metadata } from "next";
import Image from "next/image";
import PageHeader, { Container } from "@/components/layout/PageHeader";
import { credentials, gear, timeline, toolkit } from "@/content/about";
import { reveal } from "@/lib/reveal";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: "The story, credentials, toolkit and camera bag of Neil Jacob Santiago — IT student, network engineer and photographer from San Jose City.",
};

export default function AboutPage() {
  return (
    <>
      <PageHeader eyebrow="About" title={<>Half engineer, <em className="font-serif text-ember">half eye.</em></>} />

      <Container className="pb-24 md:pb-32">
        <section className="grid gap-12 md:grid-cols-12">
          <div {...reveal("scale")} className="relative aspect-[4/5] overflow-hidden rounded-[2px] md:col-span-5">
            <Image src="/njs_p.jpg" alt="Portrait of Neil Jacob Santiago" fill sizes="(min-width: 768px) 40vw, 92vw" className="object-cover" />
          </div>
          <div className="space-y-6 font-serif text-xl leading-relaxed text-ink/85 md:col-span-6 md:col-start-7 md:text-2xl">
            <p className="first-letter:float-left first-letter:mr-3 first-letter:font-display first-letter:text-7xl first-letter:leading-[0.8] first-letter:text-ember">
              I&apos;m based in {site.location} and study Information Technology at {site.school}, majoring in Network Systems & Infrastructure Engineering.
            </p>
            <p>
              Most days I&apos;m mapping networks, writing intrusion-detection rules or breaking into my own lab machines to see what gives. The rest of the time
              I&apos;m behind a camera — in concert pits, at university conferences, or out past midnight pointing a lens at Andromeda.
            </p>
            <p>
              Those sound like two different lives. They aren&apos;t. Both reward patience, precision and knowing exactly what to look for. As production director of
              the CLSU ITSC Media Group, I get to do both at once.
            </p>
            <p className="font-display text-3xl text-ink md:text-4xl">{site.tagline}</p>
          </div>
        </section>

        <section aria-labelledby="path-title" className="mt-28 grid gap-10 border-t border-ink/15 pt-14 md:grid-cols-12">
          <h2 id="path-title" className="label text-ember md:col-span-3">The path</h2>
          <ol className="md:col-span-9">
            {timeline.map((t, i) => (
              <li key={t.what} {...reveal("up", i * 80)} className="grid gap-2 border-b border-ink/10 py-6 md:grid-cols-9">
                <span className="label pt-2 text-ink/50 md:col-span-2">{t.when}</span>
                <div className="md:col-span-7">
                  <h3 className="font-display text-3xl">{t.what}</h3>
                  <p className="mt-1 font-serif text-lg italic text-ember">{t.where}</p>
                  <p className="mt-2 font-serif text-lg text-ink/80">{t.note}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section id="credentials" aria-labelledby="cred-title" className="mt-28 grid scroll-mt-28 gap-10 border-t border-ink/15 pt-14 md:grid-cols-12">
          <h2 id="cred-title" className="label text-ember md:col-span-3">Credentials</h2>
          <div className="grid gap-6 md:col-span-9 md:grid-cols-2">
            {credentials.earned.map((c) => (
              <div key={c.title} {...reveal("left")} className="rounded-[2px] bg-ink p-8 text-paper">
                <p className="label text-sky">Earned · {c.date}</p>
                <h3 className="mt-4 font-display text-3xl">{c.title}</h3>
                <p className="mt-2 font-serif text-lg text-paper/80">{c.detail}</p>
              </div>
            ))}
            <div {...reveal("right", 100)} className="rounded-[2px] border border-ink/15 p-8">
              <p className="label text-ink/50">Working towards</p>
              <ul className="mt-4 space-y-4">
                {credentials.next.map((c) => (
                  <li key={c.title} className="flex items-baseline justify-between gap-4 border-b border-ink/10 pb-3">
                    <span className="font-display text-2xl">{c.title}</span>
                    <span className="text-right font-serif text-ink/70 italic">{c.detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section aria-labelledby="toolkit-title" className="mt-28 grid gap-10 border-t border-ink/15 pt-14 md:grid-cols-12">
          <h2 id="toolkit-title" className="label text-ember md:col-span-3">Toolkit</h2>
          <div className="grid gap-10 sm:grid-cols-2 md:col-span-9">
            {toolkit.map((g, i) => (
              <div key={g.group} {...reveal("up", (i % 2) * 80)}>
                <h3 className="font-display text-3xl">{g.group}</h3>
                <p className="mt-3 font-serif text-lg leading-relaxed text-ink/80">{g.items.join(" · ")}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="gear" aria-labelledby="gear-title" className="mt-28 grid scroll-mt-28 gap-10 border-t border-ink/15 pt-14 md:grid-cols-12">
          <h2 id="gear-title" className="label text-ember md:col-span-3">In the bag</h2>
          <div className="grid gap-10 sm:grid-cols-3 md:col-span-9">
            {gear.map((g, i) => (
              <div key={g.group} {...reveal("up", i * 80)}>
                <h3 className="font-display text-3xl">{g.group}</h3>
                <ul className="mt-3 space-y-2 font-serif text-lg text-ink/80">
                  {g.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </Container>
    </>
  );
}
