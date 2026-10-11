import type { Metadata } from "next";
import { Mail } from "lucide-react";
import ContactForm from "@/components/contact/ContactForm";
import PageHeader, { PageShell } from "@/components/layout/PageHeader";
import { reveal } from "@/lib/reveal";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `Start a project with ${site.name} — web, networking, security audits and media production.`,
};

export default function ContactPage() {
  return (
    <PageShell narrow>
      <PageHeader
        section="Secure_Comm"
        icon={<Mail />}
        title={<>Secure <br /> Transmission</>}
        lead={`Freelance web & networking projects start at ${site.rate}. Based in ${site.location}; available remotely.`}
      />
      <div {...reveal()} className="relative border border-butter/10 bg-black/40 p-5 sm:p-6 md:p-8">
        <ContactForm />
      </div>
    </PageShell>
  );
}
