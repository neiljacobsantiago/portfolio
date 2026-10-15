import { addOns, EXTRA_PERSON, locationTypes, photoUses, PRIVATE_PEOPLE_INCLUDED, services, type AddOn, type Package, type PhotoUse, type Service } from "@/content/sessions";

// Photoshoot price quotes straight from the package list, with the 30%
// downpayment that secures a date and a pre-filled booking link.

export interface Quote {
  service: Service;
  pkg: Package;
  people: number;
  /** Custom shoots only: chosen add-ons and people beyond the ones included. */
  addOns: AddOn[];
  extraPeople: number;
  /** Add-ons priced case by case (travel), not in the total. */
  quoted: string[];
  /** null when the package is quoted case by case. */
  total: number | null;
  downpayment: number | null;
  bookHref: string;
}

/** What a custom private shoot booking adds on top of service, package and date. */
export interface ShootExtras {
  time?: string; // HH:MM, 24-hour
  people?: number;
  locationType?: string;
  location?: string;
  moodboard?: string;
  addOns?: string[];
  use?: PhotoUse;
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
    private: "private",
    custom: "private",
    exclusive: "private",
  };
  return (
    services.find((s) => s.id === q) ??
    services.find((s) => s.name.toLowerCase().includes(q)) ??
    services.find((s) => s.id === Object.entries(alias).find(([k]) => new RegExp(`\\b${k}`).test(q))?.[1])
  );
}

export function quote(serviceQuery: string | undefined, packageQuery?: string, people = 1, addOnIds: string[] = []): Quote | { error: string; services?: string[] } {
  const service = findService(serviceQuery);
  if (!service) return { error: "Which kind of shoot?", services: services.map((s) => s.name) };
  const q = packageQuery?.toLowerCase();
  const pkg =
    (q && (service.packages.find((p) => p.id === q) ?? service.packages.find((p) => p.name.toLowerCase().includes(q)))) || service.packages[0];
  const count = Math.max(1, Math.min(50, Math.round(people) || 1));
  const unit = amount(pkg.price);
  const chosen = service.custom ? addOns.filter((a) => addOnIds.includes(a.id)) : [];
  const extraPeople = service.custom ? Math.max(0, count - PRIVATE_PEOPLE_INCLUDED) : 0;
  const extras = extraPeople * EXTRA_PERSON + chosen.reduce((sum, a) => sum + (a.amount ?? 0), 0);
  const total = unit === null ? null : pkg.price.includes("/ head") ? unit * count : unit + extras;
  const params = new URLSearchParams({ service: service.id, package: pkg.id });
  if (chosen.length) params.set("addons", chosen.map((a) => a.id).join(","));
  if (service.custom && count > 1) params.set("people", String(count));
  return {
    service,
    pkg,
    people: count,
    addOns: chosen,
    extraPeople,
    quoted: chosen.filter((a) => a.amount === null).map((a) => a.name),
    total,
    downpayment: total === null ? null : Math.round(total * 0.3),
    bookHref: `/contact?${params}`,
  };
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const line = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

/** Keeps only valid private-shoot details from untrusted input. */
export function cleanExtras(raw: unknown): ShootExtras {
  const x = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const time = line(x.time, 5);
  const locationType = line(x.locationType, 40);
  const moodboard = line(x.moodboard, 300);
  const ids = Array.isArray(x.addOns) ? x.addOns : [];
  const use = photoUses.find((u) => u.id === x.use)?.id;
  return {
    time: TIME_RE.test(time) ? time : undefined,
    people: Math.max(1, Math.min(20, Math.round(Number(x.people)) || 1)),
    locationType: locationTypes.includes(locationType) ? locationType : undefined,
    location: line(x.location, 120) || undefined,
    moodboard: /^https?:\/\/[^\s<>"]+$/i.test(moodboard) ? moodboard : undefined,
    addOns: addOns.filter((a) => ids.includes(a.id)).map((a) => a.id),
    use: use ?? "ask",
  };
}

/** "15:30" → "3:30 PM" */
export const time12 = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

/** Private-shoot details as label/value rows for emails and summaries. */
export function extrasRows(service: Service, pkg: Package, x: ShootExtras | undefined): [string, string][] {
  if (!service.custom || !x) return [];
  const q = quote(service.id, pkg.id, x.people, x.addOns);
  if ("error" in q) return [];
  const rows: [string, string][] = [];
  if (x.time) rows.push(["Start time", time12(x.time)]);
  rows.push(["People", q.extraPeople ? `${q.people} (${q.extraPeople} extra × ${peso(EXTRA_PERSON)})` : String(q.people)]);
  if (x.locationType || x.location) rows.push(["Location", [x.locationType, x.location].filter(Boolean).join(" — ")]);
  if (q.addOns.length) rows.push(["Add-ons", q.addOns.map((a) => `${a.name} (${a.amount === null ? "quoted" : peso(a.amount)})`).join(", ")]);
  if (x.use) rows.push(["Photo use", photoUses.find((u) => u.id === x.use)?.label ?? x.use]);
  if (x.moodboard) rows.push(["Mood board", x.moodboard]);
  if (q.total !== null) rows.push(["Estimated total", `${peso(q.total)}${q.quoted.length ? ` + ${q.quoted.join(", ")} (quoted)` : ""}`]);
  return rows;
}
