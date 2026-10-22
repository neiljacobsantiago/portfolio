import type { Metadata } from "next";
import { Suspense } from "react";
import ContactForm from "@/components/contact/ContactForm";
import ContactFormFromUrl from "@/components/contact/ContactFormFromUrl";
import PageHeader, { Container } from "@/components/layout/PageHeader";
import Icon from "@/components/ui/Icon";
import { reveal } from "@/lib/reveal";
import { site, socials } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `Start a project with ${site.name}: network planning, websites, photography, video and security awareness talks.`,
};

const services = ["Network planning & setup", "Websites & web systems", "Photoshoots & event coverage", "Video & media production", "Security awareness talks"];

export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title={<>Say <em className="font-serif text-ember">hello.</em></>}
        lead="A network to plan, a website to build, a shoot to book or a video to make. Pick one, answer a few questions, and I'll reply personally within a day."
      />
      <Container className="grid gap-14 pb-24 md:grid-cols-12 md:pb-32">
        <aside className="space-y-10 md:col-span-4">
          <div>
            <p className="label mb-3 text-ink/70">I can help with</p>
            <ul className="space-y-1 font-serif text-xl">
              {services.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="label mb-3 text-ink/70">Rates</p>
            <p className="font-serif text-xl">Photo packages have set prices. Everything else is quoted to the work it needs, in writing, before anything starts.</p>
          </div>
          <div>
            <p className="label mb-3 text-ink/70">Based in</p>
            <p className="font-serif text-xl">
              {site.location}, {site.country}
              <br />
              <span className="italic text-ink/70">Available remotely.</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {socials.filter((s) => s.url).map((s) => (
              <a key={s.name} href={s.url!} target="_blank" rel="noopener noreferrer" className="label inline-flex items-center gap-1 text-ember hover:text-ink">
                {s.name} <Icon name="arrow-up-right" />
              </a>
            ))}
          </div>
        </aside>
        <div {...reveal()} className="relative rounded-[2px] bg-paper/70 p-6 shadow-[0_30px_80px_-40px_rgb(0_48_73/0.45)] ring-1 ring-ink/10 md:col-span-8 md:p-12">
          <Suspense fallback={<ContactForm />}>
            <ContactFormFromUrl />
          </Suspense>
        </div>
      </Container>
    </>
  );
}
