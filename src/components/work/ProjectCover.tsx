import Image from "next/image";
import type { Project } from "@/content/work";
import { cn } from "@/lib/utils";

/**
 * Cover art for a project: its screenshot/photo when there is one, a bespoke
 * "lab result" illustration for PhilMech (private repo, no public screenshots),
 * and a typographic plate otherwise.
 */
export default function ProjectCover({ project, sizes, className, priority }: { project: Project; sizes: string; className?: string; priority?: boolean }) {
  if (project.slug === "philmech-pathogen-classifier") return <PhilMechArt className={className} />;

  if (project.cover) {
    return (
      <div className={cn("relative overflow-hidden bg-paper-deep", className)}>
        <Image src={project.cover} alt="" fill sizes={sizes} preload={priority} className="object-cover transition-transform duration-[1.2s] ease-[var(--ease-apple)] group-hover:scale-[1.04]" />
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
      <span className="font-display text-[clamp(2rem,5vw,3.5rem)] leading-none text-paper/90 mix-blend-overlay">{project.title}</span>
    </div>
  );
}

function PhilMechArt({ className }: { className?: string }) {
  const bars = [
    { label: "A. flavus", value: 94 },
    { label: "A. niger", value: 4 },
    { label: "A. tamarii", value: 2 },
  ];
  return (
    <div className={cn("relative overflow-hidden bg-[#0f3d2e] text-paper", className)} aria-hidden>
      <div className="absolute -top-16 -right-16 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,rgb(102_187_106/0.45),transparent)]" />
      <div className="absolute inset-0 flex items-center justify-center gap-[6%] p-[6%]">
        <div className="relative aspect-square w-[34%] shrink-0">
          <Image src="/projects/philmech-logo.png" alt="" fill sizes="200px" className="object-contain drop-shadow-[0_20px_30px_rgb(0_0_0/0.35)] transition-transform duration-700 ease-[var(--ease-spring)] group-hover:rotate-[8deg]" />
        </div>
        <div className="w-[50%] rounded-xl bg-paper/10 p-[4%] ring-1 ring-paper/15 backdrop-blur-sm">
          <p className="label text-[0.55rem] text-paper/70">Top match · on-device</p>
          <p className="mt-1 font-display text-[clamp(0.9rem,2vw,1.6rem)] leading-tight italic">Aspergillus flavus</p>
          <div className="mt-3 space-y-2">
            {bars.map((b) => (
              <div key={b.label}>
                <div className="flex justify-between font-mono text-[0.55rem] text-paper/70">
                  <span>{b.label}</span>
                  <span>{b.value}%</span>
                </div>
                <div className="mt-1 h-1 rounded-full bg-paper/15">
                  <div className="h-1 origin-left rounded-full bg-[#7bd88f] transition-transform duration-1000 ease-[var(--ease-apple)] group-hover:scale-x-100" style={{ width: `${b.value}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 font-mono text-[0.5rem] text-paper/50">Illustrative result · offline · 90% threshold</p>
        </div>
      </div>
    </div>
  );
}
