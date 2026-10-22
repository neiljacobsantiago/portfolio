import type { Metadata } from "next";
import { Source_Serif_4 } from "next/font/google";
import Link from "next/link";
import ResumeActions from "@/components/resume/ResumeActions";
import Icon from "@/components/ui/Icon";
import { certificates, education, inProgress } from "@/content/about";
import { site, siteUrl, socials } from "@/lib/site";

// A document face for the résumé alone: Source Serif 4 is built for long
// reading at text sizes, prints crisply at 10pt and has true italics.
const doc = Source_Serif_4({ subsets: ["latin"], style: ["normal", "italic"], axes: ["opsz"], variable: "--font-resume", display: "swap" });

export const metadata: Metadata = {
  title: "Résumé",
  description: `${site.name}'s résumé: BS Information Technology at Central Luzon State University, network planning, web systems built with AI-assisted development, leadership, certifications and skills.`,
};

/* ------------------------------------------------------------------------- */
/* Content. Every line below is drawn from content/work.ts, content/about.ts  */
/* and lib/site.ts; edit those first, then mirror any wording change here.    */
/* ------------------------------------------------------------------------- */

const SUMMARY =
  "Third-year BS Information Technology student at Central Luzon State University, majoring in Network Systems & Infrastructure Engineering. Focused on network planning: physical and logical topology, network mapping, cabling, bills of materials, and IP addressing with subnets and VLANs. Builds web systems with AI-assisted development, owning the requirements, structure, testing and deployment; designed the interface and trained the model for PathoScan, an offline plant-pathogen classifier accepted for operational use by DA PhilMech. Writes plain-language security awareness lessons. Production Director of the ITSC Media Group.";

interface Entry {
  title: string;
  /** Short descriptor after the title. */
  kind?: string;
  /** Right-aligned on the first line. */
  date?: string;
  /** Italic second line. */
  role?: string;
  /** Right-aligned on the second line. */
  where?: string;
  bullets: string[];
  stack?: string;
  href?: string;
}

const PROJECTS: Entry[] = [
  {
    title: "PathoScan",
    kind: "Plant Pathogen Image Classification System",
    date: "Sep 2026",
    role: "UI/UX Designer & Model Trainer",
    where: "COMSCI 3100 · for DA PhilMech",
    href: "/work/pathoscan",
    bullets: [
      "Trained a MobileNetV2 classifier that identifies five mycotoxin-producing Aspergillus species from culture-plate photos, running fully in the browser with TensorFlow.js and answering “Unknown” rather than forcing a guess.",
      "Designed the capture-to-result interface: confidence score, a probability matrix for every class, colony traits for comparison, and a 90% confidence bar that marks a result ready for preliminary screening or prompts a second look.",
      "Delivered with a nine-member Agile-Scrum team as an offline Progressive Web App; formally turned over to the DA PhilMech Laboratory Services Division on September 28, 2026.",
    ],
    stack: "React, TypeScript, Vite, TensorFlow.js, IndexedDB, PWA",
  },
  {
    title: "Student Information System",
    kind: "Registrar Records Platform",
    role: "Developer (AI-assisted development)",
    where: "INTECH 3112 · Final project",
    href: "/work/student-information-system",
    bullets: [
      "Planned the data model and built, with AI-assisted development, a Laravel REST API over a relational MySQL schema (programs, sections, students and saved records), with search, filtering, sorting and pagination run in SQL on the server.",
      "Defined three roles (registrar, staff adviser, student) behind Sanctum token sign-in, enforced by a server-side policy, and tested that unauthorised requests are refused with HTTP 403.",
      "Kept business rules on the server: per-field 422 validation, section capacity limits, program–section consistency and student numbers issued once at creation.",
    ],
    stack: "Laravel, PHP 8.3, MySQL, Eloquent ORM, React, Tailwind CSS",
  },
  {
    title: "BuildIT",
    kind: "Custom PC Builder & Storefront",
    role: "Lead UI/UX Designer",
    where: "COMSCI 1200, INTECH 2100 & 2201",
    href: "/work/buildit",
    bullets: [
      "Led the design of a storefront that brings part selection, compatibility checking and checkout into one flow for a five-person team.",
      "Carried the product across three courses: a C command-line program, a high-fidelity Figma prototype and a cloud-hosted WordPress storefront on Azure.",
    ],
    stack: "C, Figma, WordPress, Azure",
  },
  {
    title: "ParkMate",
    kind: "Parking Management Desktop Application",
    role: "UI/UX Designer & Frontend Developer",
    where: "COMSCI 1201 · Final project",
    href: "/work/parkmate",
    bullets: [
      "Designed and built the Java Swing interface for vehicle entries, slot allocation and parking records, with full create, read, update and delete over JDBC and MySQL, replacing a paper logbook.",
    ],
  },
  {
    title: "WorkTayo",
    kind: "Conference Registration Monitoring System",
    role: "UI/UX Designer & Frontend Developer",
    where: "COMSCI 2110 · Final project",
    href: "/work/worktayo",
    bullets: [
      "Designed the front end of a hub where coordinators register participants, manage conference records and track attendance in real time, replacing scattered spreadsheets with a relational MySQL database.",
    ],
  },
  {
    title: "Memory Allocation Simulator",
    kind: "Operating Systems Tool",
    role: "Front-End CLI & Interface Developer",
    where: "COMSCI 2101 · Operating Systems",
    href: "/work/memory-allocation-simulator",
    bullets: ["Built the command-line interface of a Java simulator that visualises dynamic partitioning and the fragmentation behind First-Fit, Best-Fit and Worst-Fit allocation."],
  },
];

const LEADERSHIP: Entry[] = [
  {
    title: "ITSC Media Group (IMG)",
    kind: "CLSU IT Student Council",
    role: "Production Director",
    where: "Central Luzon State University",
    href: "/work/it-fest",
    bullets: [
      "Lead the production division of the IT Student Council’s media arm, responsible for event coverage, highlight reels and broadcasts.",
      "Planned and delivered IT Fest, the department’s largest week: highlight reels, coverage and same-day social posts.",
      "Directed on location and handled filming and audio for the Cyber Awareness Series, six episodes on data privacy and security threats for the Department of Information Technology.",
      "Coordinated a four-person media team across two buildings at IRCITE 2026, the International Research Conference on IT Education, using a shared shot list and staggered shifts.",
    ],
  },
  {
    title: "Builders of Information Technology Society (BITS)",
    kind: "CLSU",
    role: "Member",
    href: "/work/ircite-2026",
    bullets: ["Filmed and produced the society’s recruitment video."],
  },
];

const SKILLS: { group: string; items: string }[] = [
  { group: "Networking", items: "Physical and logical topology, network mapping, cabling plans, bills of materials (BOM), IP addressing, subnetting & VLAN planning, Cisco Packet Tracer, basic routing & switching, network troubleshooting, hardware architecture" },
  { group: "Web Systems", items: "AI-assisted development: requirements, data modelling, system structure, testing and deployment. React, Next.js, Laravel (Sanctum, Eloquent), Tailwind CSS, Vite, TensorFlow.js, MySQL, WordPress" },
  { group: "Security", items: "Plain-language security awareness lessons and videos (phishing, data privacy)" },
  { group: "Learning", items: "Offensive security and ethical hacking, just starting, on own lab machines only (Kali Linux)" },
  { group: "Languages", items: "C, Java, Python, PHP, JavaScript, TypeScript, SQL, HTML5, CSS3 (coursework and projects)" },
  { group: "Design & Tools", items: "Figma (high-fidelity prototypes), UI/UX design, responsive layouts; Pandas, Google Colab, Java Swing & JDBC; Premiere Pro, After Effects, DaVinci Resolve, OBS Studio; Agile-Scrum" },
];

const LINK = "underline-offset-[0.18em] decoration-1 hover:underline focus-visible:underline print:no-underline";

/* ------------------------------------------------------------------------- */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-[1.25em] first:mt-0">
      <h2 className="break-after-avoid mb-[0.6em] border-b border-ink pb-[0.2em] text-[0.86em] font-semibold tracking-[0.16em] text-ink uppercase">{title}</h2>
      {children}
    </section>
  );
}

function Row({ left, right, className = "" }: { left: React.ReactNode; right?: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-wrap items-baseline justify-between gap-x-4 sm:flex-nowrap print:flex-nowrap ${className}`}>
      <div className="min-w-0 sm:flex-1 print:flex-1">{left}</div>
      {right && <div className="w-full shrink-0 tabular-nums sm:ml-auto sm:w-auto sm:text-right print:ml-auto print:w-auto print:text-right">{right}</div>}
    </div>
  );
}

function EntryBlock({ e }: { e: Entry }) {
  const title = <span className="font-semibold">{e.title}</span>;
  return (
    <div className="mt-[0.85em] break-inside-avoid first:mt-0">
      <Row
        left={
          <>
            {e.href ? (
              <Link href={e.href} className={LINK}>
                {title}
              </Link>
            ) : (
              title
            )}
            {e.kind && <span> — {e.kind}</span>}
          </>
        }
        right={e.date && <span className="font-semibold">{e.date}</span>}
      />
      {(e.role || e.where) && <Row className="text-ink/85 italic" left={e.role} right={e.where} />}
      <ul className="mt-[0.3em] list-disc space-y-[0.18em] pl-[1.15em] marker:text-ink">
        {e.bullets.map((b) => (
          <li key={b} className="pl-[0.15em]">
            {b}
          </li>
        ))}
      </ul>
      {e.stack && (
        <p className="mt-[0.2em] pl-[1.3em] text-ink/85">
          <span className="font-semibold text-ink">Stack:</span> {e.stack}
        </p>
      )}
    </div>
  );
}

export default function ResumePage() {
  const url = siteUrl();
  const host = new URL(url).host;
  const updated = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: site.timeZone });
  const github = socials.find((s) => s.name === "GitHub")?.url;
  const schools = education.filter((e) => !/junior high/i.test(e.level));

  return (
    <div className="px-4 pt-28 pb-24 sm:px-6 md:pt-36 print:p-0">
      <div className="mx-auto w-full max-w-[210mm] print:max-w-none">
        <div className="animate-rise-in mb-5 flex flex-wrap items-end justify-between gap-4 print:hidden">
          <div>
            <p className="label text-ember">Résumé</p>
            <p className="mt-1.5 font-serif text-ink/80 italic">Updated {updated}. Ready to print or save as PDF.</p>
          </div>
          <ResumeActions />
        </div>

        <article
          aria-label={`Résumé of ${site.name}`}
          className={`${doc.variable} resume-sheet animate-rise-in bg-white px-5 py-8 font-[family-name:var(--font-resume)] text-[10.5pt] leading-[1.42] text-ink shadow-[0_1px_2px_rgb(0_48_73/0.08),0_30px_70px_-34px_rgb(0_48_73/0.45)] ring-1 ring-ink/10 [font-optical-sizing:auto] sm:px-[14mm] sm:py-[14mm] md:min-h-[297mm] md:px-[18mm] md:py-[16mm] print:min-h-0 print:p-0 print:text-[10pt] print:shadow-none print:ring-0`}
          style={{ animationDelay: "100ms" }}
        >
          {/* Header */}
          <header className="text-center">
            <h1 className="text-[2.35em] leading-[1.05] font-semibold tracking-[0.01em] text-ink">{site.name}</h1>
            <p className="mt-[0.3em] text-[1.08em] text-ink/90">BS Information Technology · Network Systems & Infrastructure · Web Systems</p>
            <ul className="mt-[0.55em] flex flex-wrap items-center justify-center gap-x-[1.1em] gap-y-1 text-[0.95em] text-ink/90">
              <li className="inline-flex items-center gap-[0.35em]">
                <Icon name="map" className="text-ink/80" />
                {site.location}, {site.country}
              </li>
              <li className="inline-flex items-center gap-[0.35em]">
                <Icon name="globe" className="text-ink/80" />
                <a href={`${url}/contact`} className={LINK}>
                  {host}/contact
                </a>
              </li>
              {github && (
                <li className="inline-flex items-center gap-[0.35em]">
                  <Icon name="github" className="text-ink/80" />
                  <a href={github} className={LINK}>
                    {github.replace("https://", "")}
                  </a>
                </li>
              )}
            </ul>
          </header>

          <div className="mt-[1.4em]">
            <Section title="Summary">
              <p className="text-pretty">{SUMMARY}</p>
            </Section>

            <Section title="Education">
              {schools.map((e) => (
                <div key={e.school} className="mt-[0.6em] break-inside-avoid first:mt-0">
                  <Row left={<span className="font-semibold">{e.school}</span>} right={<span className="font-semibold">{e.years.replace(/\s*—\s*/, " – ")}</span>} />
                  <Row
                    className="text-ink/85 italic"
                    left={/STEM/.test(e.level) ? "Senior High School, Science, Technology, Engineering & Mathematics (STEM) strand" : `${e.level}, major in Network Systems & Infrastructure Engineering`}
                    right={/Present/.test(e.years) ? "Third year" : undefined}
                  />
                </div>
              ))}
            </Section>

            <Section title="Technical Projects">
              {PROJECTS.map((p) => (
                <EntryBlock key={p.title} e={p} />
              ))}
            </Section>

            <Section title="Leadership & Organizations">
              {LEADERSHIP.map((p) => (
                <EntryBlock key={p.title} e={p} />
              ))}
            </Section>

            <Section title="Certifications">
              <ul className="space-y-[0.32em]">
                {certificates.map((c) => {
                  const id = c.verify?.split("/").pop();
                  return (
                    <li key={c.title} className="break-inside-avoid">
                      <Row
                        left={
                          <>
                            <span className="font-semibold">{c.title}</span>
                            <span className="text-ink/90"> — {c.issuer.replace(" · The Art of Becoming", "")}</span>
                            {c.title.startsWith("The Art of Becoming") && <span className="text-ink/85 italic"> (webinar)</span>}
                            {id && (
                              <span className="text-ink/85">
                                {" · "}
                                <a href={c.verify} className={LINK}>
                                  Credential {id}
                                </a>
                              </span>
                            )}
                          </>
                        }
                        right={c.date}
                      />
                    </li>
                  );
                })}
                <li className="break-inside-avoid">
                  <Row left={<span className="text-ink/90 italic">In progress: {inProgress.map((c) => c.title).join(", ")}</span>} />
                </li>
              </ul>
            </Section>

            <Section title="Technical Skills">
              <dl className="grid gap-x-4 gap-y-[0.28em] sm:grid-cols-[10.5em_1fr] print:grid-cols-[10.5em_1fr]">
                {SKILLS.map((s) => (
                  <div key={s.group} className="contents">
                    <dt className="font-semibold">{s.group}</dt>
                    <dd className="mb-[0.3em] sm:mb-0 print:mb-0">{s.items}</dd>
                  </div>
                ))}
              </dl>
            </Section>
          </div>
        </article>

        <p className="mt-6 text-center font-serif text-ink/80 print:hidden">
          The full projects, with code and write-ups, are on the{" "}
          <Link href="/work" className="ulink text-ember">
            work page
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
