import { addOns, contactPrefs, EXTRA_PERSON, locationTypes, paymentMethods, photoUses, PRIVATE_PEOPLE_INCLUDED, referralSources, services, type AddOn, type Package, type PhotoUse, type Service } from "@/content/sessions";

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

/** Everything a booking asks for on top of service, package and date. Add-ons are for custom shoots only. */
export interface ShootExtras {
  time?: string; // HH:MM, 24-hour
  backupDate?: string; // YYYY-MM-DD
  occasion?: string;
  people?: number;
  locationType?: string;
  location?: string;
  contact?: string;
  handle?: string;
  payment?: string;
  deadline?: string; // YYYY-MM-DD
  referral?: string;
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

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const oneOf = <T extends string>(list: readonly T[], v: string) => (list as readonly string[]).includes(v) ? (v as T) : undefined;

/** Keeps only valid booking details from untrusted input. Add-ons count only for custom shoots. */
export function cleanExtras(raw: unknown, custom = true): ShootExtras {
  const x = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const time = line(x.time, 5);
  const backupDate = line(x.backupDate, 10);
  const deadline = line(x.deadline, 10);
  const moodboard = line(x.moodboard, 300);
  const ids = Array.isArray(x.addOns) ? x.addOns : [];
  const use = photoUses.find((u) => u.id === x.use)?.id;
  return {
    time: TIME_RE.test(time) ? time : undefined,
    backupDate: DATE_RE.test(backupDate) ? backupDate : undefined,
    occasion: line(x.occasion, 120) || undefined,
    people: Math.max(1, Math.min(50, Math.round(Number(x.people)) || 1)),
    locationType: oneOf(locationTypes, line(x.locationType, 40)),
    location: line(x.location, 160) || undefined,
    contact: oneOf(contactPrefs, line(x.contact, 20)),
    handle: line(x.handle, 80) || undefined,
    payment: oneOf(paymentMethods, line(x.payment, 20)),
    deadline: DATE_RE.test(deadline) ? deadline : undefined,
    referral: oneOf(referralSources, line(x.referral, 30)),
    moodboard: /^https?:\/\/[^\s<>"]+$/i.test(moodboard) ? moodboard : undefined,
    addOns: custom ? addOns.filter((a) => ids.includes(a.id)).map((a) => a.id) : [],
    use: use ?? "ask",
  };
}

const shortDate = (iso: string) => new Intl.DateTimeFormat("en-PH", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));

/** "15:30" → "3:30 PM" */
export const time12 = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

export type Section = { title: string; rows: [string, string][] };

/** A booking's details grouped the way both the client and Neil read them. */
export function bookingSections(service: Service, pkg: Package, date: string, phone: string, x: ShootExtras | undefined): Section[] {
  const e = x ?? {};
  const q = quote(service.id, pkg.id, e.people ?? 1, e.addOns ?? []);
  const est = "error" in q ? null : q;
  const keep = (rows: ([string, string | undefined | null | false] | null)[]) => rows.filter((r): r is [string, string] => !!r && !!r[1]);
  const where = service.atStudio ? "Neil's in-house studio" : [e.locationType, e.location].filter(Boolean).join(" — ");
  return [
    { title: "The shoot", rows: keep([["Service", service.name], ["Package", `${pkg.name} — ${pkg.price}`], ["Includes", pkg.detail], ["Occasion", e.occasion]]) },
    {
      title: "When & where",
      rows: keep([["Date", shortDate(date)], ["Start time", e.time && time12(e.time)], ["Backup date", e.backupDate && shortDate(e.backupDate)], ["Location", where]]),
    },
    {
      title: "People & photos",
      rows: keep([
        ["People", est && est.extraPeople ? `${est.people} (${est.extraPeople} extra × ${peso(EXTRA_PERSON)})` : String(e.people ?? 1)],
        ["Photo use", e.use && (photoUses.find((u) => u.id === e.use)?.label ?? e.use)],
        ["Photos needed by", e.deadline && shortDate(e.deadline)],
        ["Add-ons", est && est.addOns.length > 0 && est.addOns.map((a) => `${a.name} (${a.amount === null ? "quoted" : peso(a.amount)})`).join(", ")],
        ["Mood board", e.moodboard],
      ]),
    },
    {
      title: "Contact & payment",
      rows: keep([
        ["Phone", phone],
        ["Prefers", e.contact && `${e.contact}${e.handle ? ` (${e.handle})` : ""}`],
        ["Downpayment via", e.payment],
        ["Estimated total", est && est.total !== null && `${peso(est.total)}${est.quoted.length ? ` + ${est.quoted.join(", ")} (quoted)` : ""}`],
        ["Downpayment (30%)", est && est.downpayment !== null && peso(est.downpayment)],
        ["Found Neil via", e.referral],
      ]),
    },
  ].filter((sec) => sec.rows.length > 0);
}

/** The booking details as flat label/value rows (everything after service, package and date). */
export function extrasRows(service: Service, pkg: Package, x: ShootExtras | undefined): [string, string][] {
  if (!x) return [];
  return bookingSections(service, pkg, "2000-01-01", "", x)
    .flatMap((sec) => sec.rows)
    .filter(([k]) => !["Service", "Package", "Includes", "Date"].includes(k));
}
