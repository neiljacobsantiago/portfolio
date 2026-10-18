import Image from "next/image";
import type { Project } from "@/content/work";
import { cn } from "@/lib/utils";

/**
 * Cover art for a project: its screenshot/photo when there is one, a bespoke
 * "lab result" illustration for PathoScan (private repo, no public screenshots),
 * and a typographic plate otherwise.
 */
export default function ProjectCover({ project, sizes, className, priority }: { project: Project; sizes: string; className?: string; priority?: boolean }) {
  if (project.slug === "pathoscan") return <PathoScanArt className={className} priority={priority} />;
  if (project.slug === "memory-allocation-simulator") return <MemoryArt className={className} />;
  if (project.slug === "whisper-transcription") return <WhisperArt className={className} />;
  if (project.slug === "student-information-system") return <RegistrarArt className={className} />;

  if (project.cover) {
    return (
      <div className={cn("relative overflow-hidden bg-paper-deep", className)}>
        <Image src={project.cover} alt="" fill sizes={sizes} preload={priority} loading={priority ? "eager" : undefined} className="object-cover transition-transform duration-[1.2s] ease-[var(--ease-apple)] group-hover:scale-[1.04]" />
        {project.logo && <LogoBadge logo={project.logo} />}
      </div>
    );
  }

  if (project.logo) {
    return (
      <div className={cn("relative flex items-center justify-center overflow-hidden", className)} style={{ background: project.logo.bg }} aria-hidden>
        <div className="relative aspect-square w-[34%] max-w-56 transition-transform duration-700 ease-[var(--ease-spring)] group-hover:scale-110 group-hover:-rotate-3">
          <Image src={project.logo.src} alt="" fill sizes="240px" className="object-contain" />
        </div>
      </div>
    );
  }

  if (project.youtube) {
    return (
      <div className={cn("relative overflow-hidden bg-ink", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element -- remote YouTube thumbnail */}
        <img src={`https://i.ytimg.com/vi/${project.youtube}/hqdefault.jpg`} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-80 transition-transform duration-[1.2s] group-hover:scale-[1.04]" />
      </div>
    );
  }

  const tone = { systems: "from-ink to-sky", web: "from-paper-deep to-sky/60", media: "from-wine to-ember" }[project.category];
  return (
    <div className={cn("relative flex items-end overflow-hidden bg-gradient-to-br p-6", tone, className)} aria-hidden>
      <div className="absolute inset-0 bg-[linear-gradient(rgb(253_240_213/0.08)_1px,transparent_1px),linear-gradient(90deg,rgb(253_240_213/0.08)_1px,transparent_1px)] bg-[size:28px_28px]" />
      <span className="relative font-display text-[clamp(2rem,5vw,3.5rem)] leading-none text-paper/90">{project.title}</span>
    </div>
  );
}

/** Memory Allocation Simulator: the same jobs placed by First-, Best- and Worst-Fit. */
function MemoryArt({ className }: { className?: string }) {
  const rows: { label: string; blocks: [number, string | null][] }[] = [
    { label: "First-Fit", blocks: [[18, "P1"], [10, null], [24, "P2"], [8, "P3"], [22, null], [18, "P4"]] },
    { label: "Best-Fit", blocks: [[18, "P1"], [12, "P3"], [24, "P2"], [6, null], [22, "P4"], [18, null]] },
    { label: "Worst-Fit", blocks: [[18, null], [10, "P3"], [24, "P1"], [8, null], [22, "P2"], [18, "P4"]] },
  ];
  const colors: Record<string, string> = { P1: "bg-ember", P2: "bg-sky", P3: "bg-[#ffd27a]", P4: "bg-paper" };
  return (
    <div className={cn("relative flex flex-col justify-center gap-[5%] overflow-hidden bg-ink p-[7%] text-paper", className)} aria-hidden>
      <div className="absolute -right-20 -bottom-24 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,rgb(102_155_188/0.35),transparent)]" />
      <p className="label relative text-3xs text-sky">memsim · 128K · 4 processes</p>
      {rows.map((r, i) => (
        <div key={r.label} className="relative">
          <p className="mb-1.5 font-mono text-2xs text-paper/75">{r.label}</p>
          <div className="flex h-7 gap-[3px] md:h-8">
            {r.blocks.map(([w, pid], j) => (
              <span
                key={j}
                style={{ width: `${w}%`, transitionDelay: `${i * 80 + j * 40}ms` }}
                className={cn(
                  "flex min-w-0 items-center justify-center overflow-hidden rounded-[3px] font-mono text-3xs text-ink transition-transform duration-700 ease-[var(--ease-spring)] group-hover:-translate-y-0.5",
                  pid ? colors[pid] : "border border-dashed border-paper/25 text-paper/30",
                )}
              >
                {pid ?? (w >= 14 ? "free" : null)}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Student Information System: a student file on the React side, the Laravel API answering on the other. */
function RegistrarArt({ className }: { className?: string }) {
  const rows = [
    ["ID126-0001", "Santos, Miguel", "BSIT 1-1"],
    ["ID126-0002", "Reyes, Angela", "BSIT 1-1"],
    ["ID125-0003", "Garcia, Paolo", "BSIT 2-1"],
  ];
  return (
    <div className={cn("relative flex items-center gap-[5%] overflow-hidden bg-[#0f2317] p-[7%] text-paper", className)} aria-hidden>
      <div className="absolute -top-24 -left-16 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,rgb(242_183_5/0.22),transparent)]" />
      {/* The React app: a records list in CLSU green and gold */}
      <div className="relative w-[56%] shrink-0 rounded-lg bg-[#fafaf8] p-[4%] text-[#0f2317] shadow-2xl transition-transform duration-700 ease-[var(--ease-spring)] group-hover:-translate-y-1 group-hover:-rotate-1">
        <p className="font-serif text-[0.8rem] leading-tight md:text-sm">Student records</p>
        <div className="mt-2 h-px bg-[#e4e1d8]" />
        {rows.map(([id, name, sec]) => (
          <div key={id} className="mt-2 flex items-center gap-2 border-t-2 border-[#f2b705] bg-white px-2 py-1.5 shadow-sm">
            <span className="font-mono text-3xs text-[#2e7d32] md:text-3xs">{id}</span>
            <span className="min-w-0 flex-1 truncate text-3xs md:text-2xs">{name}</span>
            <span className="hidden font-mono text-3xs text-[#8b7355] sm:inline">{sec}</span>
          </div>
        ))}
        <span className="mt-2.5 inline-block rounded-full bg-[#1b5e20] px-2.5 py-1 font-mono text-3xs text-white">+ New record</span>
      </div>
      {/* The Laravel API answering */}
      <div className="relative min-w-0 flex-1 space-y-2 font-mono text-3xs leading-relaxed md:text-3xs">
        <p className="truncate text-[#8fcb9b]">POST /api/registrar/students</p>
        <div className="rounded-md bg-black/30 p-2 ring-1 ring-white/10 transition-transform delay-75 duration-700 ease-[var(--ease-spring)] group-hover:translate-x-1">
          <p>
            <span className="rounded bg-[#f2b705] px-1 text-[#0f2317]">422</span> <span className="text-white/60">section_id</span>
          </p>
          <p className="truncate text-white/80">&quot;BSIT 1-1 is at its capacity of 40.&quot;</p>
        </div>
        <div className="rounded-md bg-black/30 p-2 ring-1 ring-white/10 transition-transform delay-150 duration-700 ease-[var(--ease-spring)] group-hover:translate-x-1">
          <p className="truncate">
            <span className="rounded bg-[#c1121f] px-1">403</span> <span className="text-white/60">StudentPolicy@delete</span>
          </p>
        </div>
        <p className="label pt-1 text-3xs text-white/50">laravel · sanctum · mysql</p>
      </div>
    </div>
  );
}

/** Whisper AI Transcription: a waveform becoming timestamped text. */
function WhisperArt({ className }: { className?: string }) {
  const bars = Array.from({ length: 44 }, (_, i) => 18 + Math.abs(Math.sin(i * 0.7) * 50 + Math.sin(i * 0.23) * 30));
  const lines = [
    ["00:04", "Good morning, and welcome to the session."],
    ["00:11", "Today we're looking at the network design…"],
    ["00:19", "…starting with the VLAN plan."],
  ];
  return (
    <div className={cn("relative flex flex-col justify-center gap-[6%] overflow-hidden bg-gradient-to-br from-wine to-ember p-[7%] text-paper", className)} aria-hidden>
      <div className="flex h-[30%] items-center gap-[2px]">
        {bars.map((h, i) => (
          <span key={i} style={{ height: `${Math.min(100, h)}%`, transitionDelay: `${i * 12}ms` }} className="w-full rounded-full bg-paper/80 transition-transform duration-500 group-hover:scale-y-75" />
        ))}
      </div>
      <div className="space-y-1.5 rounded-xl bg-ink/30 p-[4%] ring-1 ring-paper/15">
        {lines.map(([t, text]) => (
          <p key={t} className="truncate font-mono text-2xs md:text-2xs">
            <span className="mr-2 text-[#ffd27a]">{t}</span>
            {text}
          </p>
        ))}
      </div>
      <p className="label text-3xs text-paper/70">whisper · transcribe · en</p>
    </div>
  );
}

function PathoScanArt({ className, priority }: { className?: string; priority?: boolean }) {
  const bars = [
    { label: "A. tamarii", value: 98 },
    { label: "A. flavus", value: 1 },
    { label: "A. terreus", value: 1 },
  ];
  return (
    <div className={cn("@container relative overflow-hidden bg-[#0f3d2e] text-paper", className)} aria-hidden>
      <div className="absolute -top-16 -right-16 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,rgb(102_187_106/0.45),transparent)]" />
      <div className="absolute inset-0 flex items-center justify-center gap-[6%] p-[6%]">
        <div className="relative aspect-square w-[34%] shrink-0">
          <Image src="/projects/pathoscan-logo.png" alt="" fill sizes="200px" loading={priority ? "eager" : undefined} className="object-contain drop-shadow-[0_20px_30px_rgb(0_0_0/0.35)] transition-transform duration-700 ease-[var(--ease-spring)] group-hover:rotate-[8deg]" />
        </div>
        <div className="w-[50%] rounded-xl bg-paper/10 p-[4%] ring-1 ring-paper/15 backdrop-blur-sm">
          <p className="label text-3xs text-paper/70">Top match · on-device</p>
          <p className="mt-1 font-display text-[clamp(0.9rem,2vw,1.6rem)] leading-tight italic">Aspergillus tamarii</p>
          <p className="label mt-1 text-3xs text-[#7bd88f]">Above the 90% bar · screening</p>
          {/* Small covers (phone cards) keep the top match only, so the panel never outgrows its frame */}
          <div className="mt-2 space-y-2 @md:mt-3">
            {bars.map((b, i) => (
              <div key={b.label} className={i > 0 ? "hidden @md:block" : undefined}>
                <div className="flex justify-between font-mono text-3xs text-paper/70">
                  <span>{b.label}</span>
                  <span>{b.value}%</span>
                </div>
                <div className="mt-1 h-1 rounded-full bg-paper/15">
                  <div className="h-1 origin-left rounded-full bg-[#7bd88f] transition-transform duration-1000 ease-[var(--ease-apple)] group-hover:scale-x-100" style={{ width: `${b.value}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 hidden font-mono text-3xs text-paper/70 @md:block">PathoScan · on-device · offline</p>
        </div>
      </div>
    </div>
  );
}

/** The project's mark, tucked into the cover's corner; it lifts and turns when the card is hovered. */
function LogoBadge({ logo }: { logo: NonNullable<Project["logo"]> }) {
  return (
    <span
      aria-hidden
      className="absolute bottom-3 left-3 flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl p-1.5 shadow-[0_12px_30px_-8px_rgb(0_0_0/0.45)] ring-1 ring-black/10 transition-transform duration-500 ease-[var(--ease-spring)] group-hover:-translate-y-1 group-hover:-rotate-6 md:h-16 md:w-16"
      style={{ background: logo.bg === "transparent" ? undefined : logo.bg }}
    >
      <span className="relative h-full w-full">
        <Image src={logo.src} alt="" fill sizes="64px" className="object-contain" />
      </span>
    </span>
  );
}
