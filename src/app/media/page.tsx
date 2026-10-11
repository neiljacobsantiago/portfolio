import type { Metadata } from "next";
import { Camera, Crosshair, Image as ImageIcon, Video } from "lucide-react";
import PageHeader, { PageShell } from "@/components/layout/PageHeader";
import { reveal } from "@/lib/reveal";

export const metadata: Metadata = {
  title: "Media",
  description: "Event photography, live coverage, astrophotography and production direction by Neil Jacob Santiago.",
};

const mediaDeployments = [
  {
    title: "Aurora Music Festival 2026",
    role: "Live Performance Photography",
    gear: "iPhone 14 Pro Max // ProRAW // Lightroom Mobile",
    description:
      "Executed rapid mobile media deployment during live music sets. Captured, processed, and color-graded high-contrast performance snapshots directly in the field.",
    type: "photo",
  },
  {
    title: "ITSC Recruitment Directives",
    role: "Production Director",
    gear: "Nikon D780 // Canon EOS 1500D // OBS Studio",
    description:
      "Formulated comprehensive photo and videography guidelines for the ITSC Media Group. Designed screening tasks, shot lists, and dual-preview OBS broadcast configurations for live university operations.",
    type: "video",
  },
  {
    title: "IRCITE 2026 Live Coverage",
    role: "Media Operator",
    gear: "Custom Speedlite Sync // EF 50mm f/1.8",
    description:
      "Provided continuous live event documentation. Managed optical performance, flash exposure setups, and tethered data transfers in high-pressure, fast-paced university environments.",
    type: "photo",
  },
  {
    title: "Deep-Sky Astrophotography",
    role: "Post-Processing & Stacking",
    gear: "Sequator // Adobe Lightroom Classic // RAW (.cr2)",
    description:
      "Captured celestial bodies and the Andromeda Galaxy. Executed complex frame stacking protocols and tone curve adjustments to extract high-fidelity optical data from deep-sky targets.",
    type: "photo",
  },
] as const;

export default function MediaPage() {
  return (
    <PageShell>
      <PageHeader
        section="Media"
        icon={<Camera />}
        title={<>Visual Telemetry <br /> & Direction</>}
        lead="Nikon D780 / Canon EOS 1500D / iPhone 14 Pro Max"
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {mediaDeployments.map((item, idx) => {
          const Icon = item.type === "video" ? Video : ImageIcon;
          return (
            <article
              key={item.title}
              {...reveal("up", (idx % 2) * 100)}
              className="group interactive flex flex-col overflow-hidden border border-butter/10 bg-black/40 transition-colors hover:border-butter/50"
            >
              <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden border-b border-butter/10 bg-marine/40" aria-hidden>
                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,250,138,0.02)_50%,transparent_75%,transparent_100%)] bg-[length:20px_20px]" />
                <Icon className="h-12 w-12 text-butter/20 transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute top-4 right-4 flex items-center gap-2">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-accentRed" />
                  <span className="font-mono text-[9px] tracking-widest text-butter/50 uppercase">REC</span>
                </div>
                <Crosshair className="absolute h-full w-full scale-150 text-butter/5 opacity-50" strokeWidth={0.5} />
              </div>

              <div className="flex flex-1 flex-col p-5 sm:p-6 md:p-8">
                <h2 className="mb-4 font-display text-xl font-bold tracking-tight text-butter uppercase md:text-2xl">{item.title}</h2>
                <p className="mb-2 font-mono text-[10px] tracking-widest text-accentRed uppercase">Role: {item.role}</p>
                <p className="mb-6 border-l border-butter/20 pl-3 font-mono text-xs tracking-widest text-butter/60 uppercase">{item.gear}</p>
                <p className="mt-auto font-sans text-sm leading-relaxed text-butter/80">{item.description}</p>
              </div>
            </article>
          );
        })}
      </div>

      <p className="mt-12 text-center font-mono text-xs tracking-widest text-accentRed uppercase">[ Awaiting ProRAW dataset uploads ]</p>
    </PageShell>
  );
}
