"use client";

import { useSearchParams } from "next/navigation";
import ContactForm from "./ContactForm";

/** Reads ?topic / ?service / ?package / ?addons / ?people and hands them to the form as a preset. */
export default function ContactFormFromUrl() {
  const q = useSearchParams();
  const preset = { topic: q.get("topic"), service: q.get("service"), package: q.get("package"), addons: q.get("addons"), people: q.get("people") };
  return <ContactForm key={Object.values(preset).join("-")} preset={preset} />;
}
