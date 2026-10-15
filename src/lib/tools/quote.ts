import { services, type Package, type Service } from "@/content/sessions";

// Photoshoot price quotes straight from the package list, with the 30%
// downpayment that secures a date and a pre-filled booking link.

export interface Quote {
  service: Service;
  pkg: Package;
  people: number;
  /** null when the package is quoted case by case. */
  total: number | null;
  downpayment: number | null;
  bookHref: string;
}

export const peso = (n: number) => `₱${n.toLocaleString("en-PH")}`;
const amount = (price: string) => {
  const n = Number(price.replace(/[^\d]/g, ""));
  return n > 0 ? n : null;
};

/** Fuzzy service lookup so "grad", "graduation shoot" or an id all work. */
export function findService(query: string | undefined): Service | undefined {
  if (!query) return undefined;
  const q = query.toLowerCase();
  const alias: Record<string, string> = {
    grad: "graduation",
    toga: "graduation",
    id: "id_portrait",
    headshot: "id_portrait",
    corporate: "id_portrait",
    studio: "studio",
    portrait: "studio",
    fun: "funshoot",
    lifestyle: "funshoot",
    outdoor: "funshoot",
    debut: "pre_event",
    birthday: "pre_event",
    pre: "pre_event",
    event: "event",
    wedding: "event",
    gig: "event",
    seminar: "event",
  };
  return (
    services.find((s) => s.id === q) ??
    services.find((s) => s.name.toLowerCase().includes(q)) ??
    services.find((s) => s.id === Object.entries(alias).find(([k]) => new RegExp(`\\b${k}`).test(q))?.[1])
  );
}

export function quote(serviceQuery: string | undefined, packageQuery?: string, people = 1): Quote | { error: string; services?: string[] } {
  const service = findService(serviceQuery);
  if (!service) return { error: "Which kind of shoot?", services: services.map((s) => s.name) };
  const q = packageQuery?.toLowerCase();
  const pkg =
    (q && (service.packages.find((p) => p.id === q) ?? service.packages.find((p) => p.name.toLowerCase().includes(q)))) || service.packages[0];
  const count = Math.max(1, Math.min(50, Math.round(people) || 1));
  const unit = amount(pkg.price);
  const total = unit === null ? null : pkg.price.includes("/ head") ? unit * count : unit;
  return {
    service,
    pkg,
    people: count,
    total,
    downpayment: total === null ? null : Math.round(total * 0.3),
    bookHref: `/contact?service=${service.id}&package=${pkg.id}`,
  };
}
