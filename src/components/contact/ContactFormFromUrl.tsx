"use client";

import { useSearchParams } from "next/navigation";
import ContactForm from "./ContactForm";

/** Reads ?topic / ?service / ?package and hands them to the form as a preset. */
export default function ContactFormFromUrl() {
  const q = useSearchParams();
  const preset = { topic: q.get("topic"), service: q.get("service"), package: q.get("package") };
  return <ContactForm key={`${preset.topic}-${preset.service}-${preset.package}`} preset={preset} />;
}
